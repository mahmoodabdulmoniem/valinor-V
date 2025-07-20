/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PostEditWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IActionWidgetService } from '../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { EditorStateCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { createCombinedWorkspaceEdit } from './edit.js';
import './postEditWidget.css';
let PostEditWidget = class PostEditWidget extends Disposable {
    static { PostEditWidget_1 = this; }
    static { this.baseId = 'editor.widget.postEditWidget'; }
    constructor(typeId, editor, visibleContext, showCommand, range, edits, onSelectNewEdit, additionalActions, contextKeyService, _keybindingService, _actionWidgetService) {
        super();
        this.typeId = typeId;
        this.editor = editor;
        this.showCommand = showCommand;
        this.range = range;
        this.edits = edits;
        this.onSelectNewEdit = onSelectNewEdit;
        this.additionalActions = additionalActions;
        this._keybindingService = _keybindingService;
        this._actionWidgetService = _actionWidgetService;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = true;
        this.create();
        this.visibleContext = visibleContext.bindTo(contextKeyService);
        this.visibleContext.set(true);
        this._register(toDisposable(() => this.visibleContext.reset()));
        this.editor.addContentWidget(this);
        this.editor.layoutContentWidget(this);
        this._register(toDisposable((() => this.editor.removeContentWidget(this))));
        this._register(this.editor.onDidChangeCursorPosition(e => {
            this.dispose();
        }));
        this._register(Event.runAndSubscribe(_keybindingService.onDidUpdateKeybindings, () => {
            this._updateButtonTitle();
        }));
    }
    _updateButtonTitle() {
        const binding = this._keybindingService.lookupKeybinding(this.showCommand.id)?.getLabel();
        this.button.element.title = this.showCommand.label + (binding ? ` (${binding})` : '');
    }
    create() {
        this.domNode = dom.$('.post-edit-widget');
        this.button = this._register(new Button(this.domNode, {
            supportIcons: true,
        }));
        this.button.label = '$(insert)';
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.CLICK, () => this.showSelector()));
    }
    getId() {
        return PostEditWidget_1.baseId + '.' + this.typeId;
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        return {
            position: this.range.getEndPosition(),
            preference: [2 /* ContentWidgetPositionPreference.BELOW */]
        };
    }
    showSelector() {
        const pos = dom.getDomNodePagePosition(this.button.element);
        const anchor = { x: pos.left + pos.width, y: pos.top + pos.height };
        this._actionWidgetService.show('postEditWidget', false, this.edits.allEdits.map((edit, i) => {
            return {
                kind: "action" /* ActionListItemKind.Action */,
                item: edit,
                label: edit.title,
                disabled: false,
                canPreview: false,
                group: { title: '', icon: ThemeIcon.fromId(i === this.edits.activeEditIndex ? Codicon.check.id : Codicon.blank.id) },
            };
        }), {
            onHide: () => {
                this.editor.focus();
            },
            onSelect: (item) => {
                this._actionWidgetService.hide(false);
                const i = this.edits.allEdits.findIndex(edit => edit === item);
                if (i !== this.edits.activeEditIndex) {
                    return this.onSelectNewEdit(i);
                }
            },
        }, anchor, this.editor.getDomNode() ?? undefined, this.additionalActions);
    }
};
PostEditWidget = PostEditWidget_1 = __decorate([
    __param(8, IContextKeyService),
    __param(9, IKeybindingService),
    __param(10, IActionWidgetService)
], PostEditWidget);
let PostEditWidgetManager = class PostEditWidgetManager extends Disposable {
    constructor(_id, _editor, _visibleContext, _showCommand, _getAdditionalActions, _instantiationService, _bulkEditService, _notificationService) {
        super();
        this._id = _id;
        this._editor = _editor;
        this._visibleContext = _visibleContext;
        this._showCommand = _showCommand;
        this._getAdditionalActions = _getAdditionalActions;
        this._instantiationService = _instantiationService;
        this._bulkEditService = _bulkEditService;
        this._notificationService = _notificationService;
        this._currentWidget = this._register(new MutableDisposable());
        this._register(Event.any(_editor.onDidChangeModel, _editor.onDidChangeModelContent)(() => this.clear()));
    }
    async applyEditAndShowIfNeeded(ranges, edits, canShowWidget, resolve, token) {
        if (!ranges.length || !this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const edit = edits.allEdits.at(edits.activeEditIndex);
        if (!edit) {
            return;
        }
        const onDidSelectEdit = async (newEditIndex) => {
            const model = this._editor.getModel();
            if (!model) {
                return;
            }
            await model.undo();
            this.applyEditAndShowIfNeeded(ranges, { activeEditIndex: newEditIndex, allEdits: edits.allEdits }, canShowWidget, resolve, token);
        };
        const handleError = (e, message) => {
            if (isCancellationError(e)) {
                return;
            }
            this._notificationService.error(message);
            if (canShowWidget) {
                this.show(ranges[0], edits, onDidSelectEdit);
            }
        };
        const editorStateCts = new EditorStateCancellationTokenSource(this._editor, 1 /* CodeEditorStateFlag.Value */ | 2 /* CodeEditorStateFlag.Selection */, undefined, token);
        let resolvedEdit;
        try {
            resolvedEdit = await raceCancellationError(resolve(edit, editorStateCts.token), editorStateCts.token);
        }
        catch (e) {
            return handleError(e, localize('resolveError', "Error resolving edit '{0}':\n{1}", edit.title, toErrorMessage(e)));
        }
        finally {
            editorStateCts.dispose();
        }
        if (token.isCancellationRequested) {
            return;
        }
        const combinedWorkspaceEdit = createCombinedWorkspaceEdit(model.uri, ranges, resolvedEdit);
        // Use a decoration to track edits around the trigger range
        const primaryRange = ranges[0];
        const editTrackingDecoration = model.deltaDecorations([], [{
                range: primaryRange,
                options: { description: 'paste-line-suffix', stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */ }
            }]);
        this._editor.focus();
        let editResult;
        let editRange;
        try {
            editResult = await this._bulkEditService.apply(combinedWorkspaceEdit, { editor: this._editor, token });
            editRange = model.getDecorationRange(editTrackingDecoration[0]);
        }
        catch (e) {
            return handleError(e, localize('applyError', "Error applying edit '{0}':\n{1}", edit.title, toErrorMessage(e)));
        }
        finally {
            model.deltaDecorations(editTrackingDecoration, []);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (canShowWidget && editResult.isApplied && edits.allEdits.length > 1) {
            this.show(editRange ?? primaryRange, edits, onDidSelectEdit);
        }
    }
    show(range, edits, onDidSelectEdit) {
        this.clear();
        if (this._editor.hasModel()) {
            this._currentWidget.value = this._instantiationService.createInstance((PostEditWidget), this._id, this._editor, this._visibleContext, this._showCommand, range, edits, onDidSelectEdit, this._getAdditionalActions());
        }
    }
    clear() {
        this._currentWidget.clear();
    }
    tryShowSelector() {
        this._currentWidget.value?.showSelector();
    }
};
PostEditWidgetManager = __decorate([
    __param(5, IInstantiationService),
    __param(6, IBulkEditService),
    __param(7, INotificationService)
], PostEditWidgetManager);
export { PostEditWidgetManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zdEVkaXRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL3Bvc3RFZGl0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFlLGtCQUFrQixFQUFpQixNQUFNLHNEQUFzRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWhHLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUlqRyxPQUFPLEVBQXVCLGtDQUFrQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQ3hELE9BQU8sc0JBQXNCLENBQUM7QUFhOUIsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBK0QsU0FBUSxVQUFVOzthQUM5RCxXQUFNLEdBQUcsOEJBQThCLEFBQWpDLENBQWtDO0lBVWhFLFlBQ2tCLE1BQWMsRUFDZCxNQUFtQixFQUNwQyxjQUFzQyxFQUNyQixXQUF3QixFQUN4QixLQUFZLEVBQ1osS0FBaUIsRUFDakIsZUFBNEMsRUFDNUMsaUJBQXFDLEVBQ2xDLGlCQUFxQyxFQUNyQyxrQkFBdUQsRUFDckQsb0JBQTJEO1FBRWpGLEtBQUssRUFBRSxDQUFDO1FBWlMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFbkIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFVBQUssR0FBTCxLQUFLLENBQVk7UUFDakIsb0JBQWUsR0FBZixlQUFlLENBQTZCO1FBQzVDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFFakIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNwQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBbkJ6RSx3QkFBbUIsR0FBRyxJQUFJLENBQUM7UUFDM0Isc0JBQWlCLEdBQUcsSUFBSSxDQUFDO1FBc0JqQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFZCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTVFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDcEYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7UUFDMUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2RixDQUFDO0lBRU8sTUFBTTtRQUNiLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRTFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3JELFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBRWhDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RyxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sZ0JBQWMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDbEQsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPO1lBQ04sUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFO1lBQ3JDLFVBQVUsRUFBRSwrQ0FBdUM7U0FDbkQsQ0FBQztJQUNILENBQUM7SUFFRCxZQUFZO1FBQ1gsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVwRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEtBQUssRUFDckQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBc0IsRUFBRTtZQUN2RCxPQUFPO2dCQUNOLElBQUksMENBQTJCO2dCQUMvQixJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUU7YUFDcEgsQ0FBQztRQUNILENBQUMsQ0FBQyxFQUFFO1lBQ0osTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3JCLENBQUM7WUFDRCxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN0QyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1NBQ0QsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsSUFBSSxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDM0UsQ0FBQzs7QUF4R0ksY0FBYztJQW9CakIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsb0JBQW9CLENBQUE7R0F0QmpCLGNBQWMsQ0F5R25CO0FBRU0sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0UsU0FBUSxVQUFVO0lBSXBHLFlBQ2tCLEdBQVcsRUFDWCxPQUFvQixFQUNwQixlQUF1QyxFQUN2QyxZQUF5QixFQUN6QixxQkFBK0MsRUFDekMscUJBQTZELEVBQ2xFLGdCQUFtRCxFQUMvQyxvQkFBMkQ7UUFFakYsS0FBSyxFQUFFLENBQUM7UUFUUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNwQixvQkFBZSxHQUFmLGVBQWUsQ0FBd0I7UUFDdkMsaUJBQVksR0FBWixZQUFZLENBQWE7UUFDekIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUEwQjtRQUN4QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ2pELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDOUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQVZqRSxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBcUIsQ0FBQyxDQUFDO1FBYzVGLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FDdkIsT0FBTyxDQUFDLGdCQUFnQixFQUN4QixPQUFPLENBQUMsdUJBQXVCLENBQy9CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRU0sS0FBSyxDQUFDLHdCQUF3QixDQUFDLE1BQXdCLEVBQUUsS0FBaUIsRUFBRSxhQUFzQixFQUFFLE9BQTBELEVBQUUsS0FBd0I7UUFDOUwsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDaEQsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUN0RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLEtBQUssRUFBRSxZQUFvQixFQUFFLEVBQUU7WUFDdEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkksQ0FBQyxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFRLEVBQUUsT0FBZSxFQUFFLEVBQUU7WUFDakQsSUFBSSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1QixPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekMsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQzlDLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUseUVBQXlELEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pKLElBQUksWUFBZSxDQUFDO1FBQ3BCLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxNQUFNLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sV0FBVyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGtDQUFrQyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwSCxDQUFDO2dCQUFTLENBQUM7WUFDVixjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLHFCQUFxQixHQUFHLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRTNGLDJEQUEyRDtRQUMzRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzFELEtBQUssRUFBRSxZQUFZO2dCQUNuQixPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSw2REFBcUQsRUFBRTthQUM5RyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsSUFBSSxVQUEyQixDQUFDO1FBQ2hDLElBQUksU0FBdUIsQ0FBQztRQUM1QixJQUFJLENBQUM7WUFDSixVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN2RyxTQUFTLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLFdBQVcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakgsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsS0FBSyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxhQUFhLElBQUksVUFBVSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4RSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxZQUFZLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0lBRU0sSUFBSSxDQUFDLEtBQVksRUFBRSxLQUFpQixFQUFFLGVBQTJDO1FBQ3ZGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUViLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQSxjQUFpQixDQUFBLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hOLENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVNLGVBQWU7UUFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUM7SUFDM0MsQ0FBQztDQUNELENBQUE7QUFqSFkscUJBQXFCO0lBVS9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLG9CQUFvQixDQUFBO0dBWlYscUJBQXFCLENBaUhqQyJ9