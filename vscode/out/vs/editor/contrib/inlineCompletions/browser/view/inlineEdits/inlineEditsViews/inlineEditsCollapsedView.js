var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived } from '../../../../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Point } from '../../../../../../common/core/2d/point.js';
import { singleTextRemoveCommonPrefix } from '../../../model/singleTextEditHelpers.js';
import { inlineEditIndicatorPrimaryBorder } from '../theme.js';
import { getEditorValidOverlayRect, PathBuilder, rectToProps } from '../utils/utils.js';
let InlineEditsCollapsedView = class InlineEditsCollapsedView extends Disposable {
    constructor(_editor, _edit, _accessibilityService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._accessibilityService = _accessibilityService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._iconRef = n.ref();
        this.isHovered = constObservable(false);
        this._editorObs = observableCodeEditor(this._editor);
        const firstEdit = this._edit.map(inlineEdit => inlineEdit?.edit.replacements[0] ?? null);
        const startPosition = firstEdit.map(edit => edit ? singleTextRemoveCommonPrefix(edit, this._editor.getModel()).range.getStartPosition() : null);
        const observedStartPoint = this._editorObs.observePosition(startPosition, this._store);
        const startPoint = derived(reader => {
            const point = observedStartPoint.read(reader);
            if (!point) {
                return null;
            }
            const contentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
            const scrollLeft = this._editorObs.scrollLeft.read(reader);
            return new Point(contentLeft + point.x - scrollLeft, point.y);
        });
        const overlayElement = n.div({
            class: 'inline-edits-collapsed-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                display: 'block',
            },
        }, [
            [this.getCollapsedIndicator(startPoint)],
        ]).keepUpdated(this._store).element;
        this._register(this._editorObs.createOverlayWidget({
            domNode: overlayElement,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: constObservable(0),
        }));
        this.isVisible = this._edit.map((inlineEdit, reader) => !!inlineEdit && startPoint.read(reader) !== null);
    }
    triggerAnimation() {
        if (this._accessibilityService.isMotionReduced()) {
            return new Animation(null, null).finished;
        }
        // PULSE ANIMATION:
        const animation = this._iconRef.element.animate([
            { offset: 0.00, transform: 'translateY(-3px)', },
            { offset: 0.20, transform: 'translateY(1px)', },
            { offset: 0.36, transform: 'translateY(-1px)', },
            { offset: 0.52, transform: 'translateY(1px)', },
            { offset: 0.68, transform: 'translateY(-1px)', },
            { offset: 0.84, transform: 'translateY(1px)', },
            { offset: 1.00, transform: 'translateY(0px)', },
        ], { duration: 2000 });
        return animation.finished;
    }
    getCollapsedIndicator(startPoint) {
        const contentLeft = this._editorObs.layoutInfoContentLeft;
        const startPointTranslated = startPoint.map((p, reader) => p ? p.deltaX(-contentLeft.read(reader)) : null);
        const iconPath = this.createIconPath(startPointTranslated);
        return n.svg({
            class: 'collapsedView',
            ref: this._iconRef,
            style: {
                position: 'absolute',
                ...rectToProps((r) => getEditorValidOverlayRect(this._editorObs).read(r)),
                overflow: 'hidden',
                pointerEvents: 'none',
            }
        }, [
            n.svgElem('path', {
                class: 'collapsedViewPath',
                d: iconPath,
                fill: asCssVariable(inlineEditIndicatorPrimaryBorder),
            }),
        ]);
    }
    createIconPath(indicatorPoint) {
        const width = 6;
        const triangleHeight = 3;
        const baseHeight = 1;
        return indicatorPoint.map(point => {
            if (!point) {
                return new PathBuilder().build();
            }
            const baseTopLeft = point.deltaX(-width / 2).deltaY(-baseHeight);
            const baseTopRight = baseTopLeft.deltaX(width);
            const baseBottomLeft = baseTopLeft.deltaY(baseHeight);
            const baseBottomRight = baseTopRight.deltaY(baseHeight);
            const triangleBottomCenter = baseBottomLeft.deltaX(width / 2).deltaY(triangleHeight);
            return new PathBuilder()
                .moveTo(baseTopLeft)
                .lineTo(baseTopRight)
                .lineTo(baseBottomRight)
                .lineTo(triangleBottomCenter)
                .lineTo(baseBottomLeft)
                .lineTo(baseTopLeft)
                .build();
        });
    }
};
InlineEditsCollapsedView = __decorate([
    __param(2, IAccessibilityService)
], InlineEditsCollapsedView);
export { InlineEditsCollapsedView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNDb2xsYXBzZWRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvaW5saW5lRWRpdHMvaW5saW5lRWRpdHNWaWV3cy9pbmxpbmVFZGl0c0NvbGxhcHNlZFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekYsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd2RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDL0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVqRixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFVdkQsWUFDa0IsT0FBb0IsRUFDcEIsS0FBcUQsRUFDL0MscUJBQTZEO1FBRXBG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