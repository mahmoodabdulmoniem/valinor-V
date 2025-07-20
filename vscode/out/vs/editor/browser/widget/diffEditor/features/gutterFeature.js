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
import { EventType, addDisposableListener, h } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedDisposable, derivedWithSetter, observableFromEvent, observableValue } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { WorkbenchHoverDelegate } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LineRange, LineRangeSet } from '../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextEdit } from '../../../../common/core/edits/textEdit.js';
import { DetailedLineRangeMapping } from '../../../../common/diff/rangeMapping.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { ActionRunnerWithContext } from '../../multiDiffEditor/utils.js';
import { DiffEditorSash } from '../components/diffEditorSash.js';
import { appendRemoveOnDispose, applyStyle, prependRemoveOnDispose } from '../utils.js';
import { EditorGutter } from '../utils/editorGutter.js';
const emptyArr = [];
const width = 35;
let DiffEditorGutter = class DiffEditorGutter extends Disposable {
    constructor(diffEditorRoot, _diffModel, _editors, _options, _sashLayout, _boundarySashes, _instantiationService, _contextKeyService, _menuService) {
        super();
        this._diffModel = _diffModel;
        this._editors = _editors;
        this._options = _options;
        this._sashLayout = _sashLayout;
        this._boundarySashes = _boundarySashes;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this._menu = this._register(this._menuService.createMenu(MenuId.DiffEditorHunkToolbar, this._contextKeyService));
        this._actions = observableFromEvent(this, this._menu.onDidChange, () => this._menu.getActions());
        this._hasActions = this._actions.map(a => a.length > 0);
        this._showSash = derived(this, reader => this._options.renderSideBySide.read(reader) && this._hasActions.read(reader));
        this.width = derived(this, reader => this._hasActions.read(reader) ? width : 0);
        this.elements = h('div.gutter@gutter', { style: { position: 'absolute', height: '100%', width: width + 'px' } }, []);
        this._currentDiff = derived(this, (reader) => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return undefined;
            }
            const mappings = model.diff.read(reader)?.mappings;
            const cursorPosition = this._editors.modifiedCursor.read(reader);
            if (!cursorPosition) {
                return undefined;
            }
            return mappings?.find(m => m.lineRangeMapping.modified.contains(cursorPosition.lineNumber));
        });
        this._selectedDiffs = derived(this, (reader) => {
            /** @description selectedDiffs */
            const model = this._diffModel.read(reader);
            const diff = model?.diff.read(reader);
            // Return `emptyArr` because it is a constant. [] is always a new array and would trigger a change.
            if (!diff) {
                return emptyArr;
            }
            const selections = this._editors.modifiedSelections.read(reader);
            if (selections.every(s => s.isEmpty())) {
                return emptyArr;
            }
            const selectedLineNumbers = new LineRangeSet(selections.map(s => LineRange.fromRangeInclusive(s)));
            const selectedMappings = diff.mappings.filter(m => m.lineRangeMapping.innerChanges && selectedLineNumbers.intersects(m.lineRangeMapping.modified));
            const result = selectedMappings.map(mapping => ({
                mapping,
                rangeMappings: mapping.lineRangeMapping.innerChanges.filter(c => selections.some(s => Range.areIntersecting(c.modifiedRange, s)))
            }));
            if (result.length === 0 || result.every(r => r.rangeMappings.length === 0)) {
                return emptyArr;
            }
            return result;
        });
        this._register(prependRemoveOnDispose(diffEditorRoot, this.elements.root));
        this._register(addDisposableListener(this.elements.root, 'click', () => {
            this._editors.modified.focus();
        }));
        this._register(applyStyle(this.elements.root, { display: this._hasActions.map(a => a ? 'block' : 'none') }));
        derivedDisposable(this, reader => {
            const showSash = this._showSash.read(reader);
            return !showSash ? undefined : new DiffEditorSash(diffEditorRoot, this._sashLayout.dimensions, this._options.enableSplitViewResizing, this._boundarySashes, derivedWithSetter(this, reader => this._sashLayout.sashLeft.read(reader) - width, (v, tx) => this._sashLayout.sashLeft.set(v + width, tx)), () => this._sashLayout.resetSash());
        }).recomputeInitiallyAndOnChange(this._store);
        const gutterItems = derived(this, reader => {
            const model = this._diffModel.read(reader);
            if (!model) {
                return [];
            }
            const diffs = model.diff.read(reader);
            if (!diffs) {
                return [];
            }
            const selection = this._selectedDiffs.read(reader);
            if (selection.length > 0) {
                const m = DetailedLineRangeMapping.fromRangeMappings(selection.flatMap(s => s.rangeMappings));
                return [
                    new DiffGutterItem(m, true, MenuId.DiffEditorSelectionToolbar, undefined, model.model.original.uri, model.model.modified.uri)
                ];
            }
            const currentDiff = this._currentDiff.read(reader);
            return diffs.mappings.map(m => new DiffGutterItem(m.lineRangeMapping.withInnerChangesFromLineRanges(), m.lineRangeMapping === currentDiff?.lineRangeMapping, MenuId.DiffEditorHunkToolbar, undefined, model.model.original.uri, model.model.modified.uri));
        });
        this._register(new EditorGutter(this._editors.modified, this.elements.root, {
            getIntersectingGutterItems: (range, reader) => gutterItems.read(reader),
            createView: (item, target) => {
                return this._instantiationService.createInstance(DiffToolBar, item, target, this);
            },
        }));
        this._register(addDisposableListener(this.elements.gutter, EventType.MOUSE_WHEEL, (e) => {
            if (this._editors.modified.getOption(116 /* EditorOption.scrollbar */).handleMouseWheel) {
                this._editors.modified.delegateScrollFromMouseWheelEvent(e);
            }
        }, { passive: false }));
    }
    computeStagedValue(mapping) {
        const c = mapping.innerChanges ?? [];
        const modified = new TextModelText(this._editors.modifiedModel.get());
        const original = new TextModelText(this._editors.original.getModel());
        const edit = new TextEdit(c.map(c => c.toTextEdit(modified)));
        const value = edit.apply(original);
        return value;
    }
    layout(left) {
        this.elements.gutter.style.left = left + 'px';
    }
};
DiffEditorGutter = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IMenuService)
], DiffEditorGutter);
export { DiffEditorGutter };
class DiffGutterItem {
    constructor(mapping, showAlways, menuId, rangeOverride, originalUri, modifiedUri) {
        this.mapping = mapping;
        this.showAlways = showAlways;
        this.menuId = menuId;
        this.rangeOverride = rangeOverride;
        this.originalUri = originalUri;
        this.modifiedUri = modifiedUri;
    }
    get id() { return this.mapping.modified.toString(); }
    get range() { return this.rangeOverride ?? this.mapping.modified; }
}
let DiffToolBar = class DiffToolBar extends Disposable {
    constructor(_item, target, gutter, instantiationService) {
        super();
        this._item = _item;
        this._elements = h('div.gutterItem', { style: { height: '20px', width: '34px' } }, [
            h('div.background@background', {}, []),
            h('div.buttons@buttons', {}, []),
        ]);
        this._showAlways = this._item.map(this, item => item.showAlways);
        this._menuId = this._item.map(this, item => item.menuId);
        this._isSmall = observableValue(this, false);
        this._lastItemRange = undefined;
        this._lastViewRange = undefined;
        const hoverDelegate = this._register(instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, { position: { hoverPosition: 1 /* HoverPosition.RIGHT */ } }));
        this._register(appendRemoveOnDispose(target, this._elements.root));
        this._register(autorun(reader => {
            /** @description update showAlways */
            const showAlways = this._showAlways.read(reader);
            this._elements.root.classList.toggle('noTransition', true);
            this._elements.root.classList.toggle('showAlways', showAlways);
            setTimeout(() => {
                this._elements.root.classList.toggle('noTransition', false);
            }, 0);
        }));
        this._register(autorunWithStore((reader, store) => {
            this._elements.buttons.replaceChildren();
            const i = store.add(instantiationService.createInstance(MenuWorkbenchToolBar, this._elements.buttons, this._menuId.read(reader), {
                orientation: 1 /* ActionsOrientation.VERTICAL */,
                hoverDelegate,
                toolbarOptions: {
                    primaryGroup: g => g.startsWith('primary'),
                },
                overflowBehavior: { maxItems: this._isSmall.read(reader) ? 1 : 3 },
                hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
                actionRunner: store.add(new ActionRunnerWithContext(() => {
                    const item = this._item.get();
                    const mapping = item.mapping;
                    return {
                        mapping,
                        originalWithModifiedChanges: gutter.computeStagedValue(mapping),
                        originalUri: item.originalUri,
                        modifiedUri: item.modifiedUri,
                    };
                })),
                menuOptions: {
                    shouldForwardArgs: true,
                },
            }));
            store.add(i.onDidChangeMenuItems(() => {
                if (this._lastItemRange) {
                    this.layout(this._lastItemRange, this._lastViewRange);
                }
            }));
        }));
    }
    layout(itemRange, viewRange) {
        this._lastItemRange = itemRange;
        this._lastViewRange = viewRange;
        let itemHeight = this._elements.buttons.clientHeight;
        this._isSmall.set(this._item.get().mapping.original.startLineNumber === 1 && itemRange.length < 30, undefined);
        // Item might have changed
        itemHeight = this._elements.buttons.clientHeight;
        const middleHeight = itemRange.length / 2 - itemHeight / 2;
        const margin = itemHeight;
        let effectiveCheckboxTop = itemRange.start + middleHeight;
        const preferredViewPortRange = OffsetRange.tryCreate(margin, viewRange.endExclusive - margin - itemHeight);
        const preferredParentRange = OffsetRange.tryCreate(itemRange.start + margin, itemRange.endExclusive - itemHeight - margin);
        if (preferredParentRange && preferredViewPortRange && preferredParentRange.start < preferredParentRange.endExclusive) {
            effectiveCheckboxTop = preferredViewPortRange.clip(effectiveCheckboxTop);
            effectiveCheckboxTop = preferredParentRange.clip(effectiveCheckboxTop);
        }
        this._elements.buttons.style.top = `${effectiveCheckboxTop - itemRange.start}px`;
    }
};
DiffToolBar = __decorate([
    __param(3, IInstantiationService)
], DiffToolBar);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVyRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZmVhdHVyZXMvZ3V0dGVyRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBS3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQWUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV2TCxPQUFPLEVBQXNCLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsY0FBYyxFQUFjLE1BQU0saUNBQWlDLENBQUM7QUFHN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN4RixPQUFPLEVBQUUsWUFBWSxFQUFvQyxNQUFNLDBCQUEwQixDQUFDO0FBRTFGLE1BQU0sUUFBUSxHQUFZLEVBQUUsQ0FBQztBQUM3QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7QUFFVixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFVL0MsWUFDQyxjQUE4QixFQUNiLFVBQXdELEVBQ3hELFFBQTJCLEVBQzNCLFFBQTJCLEVBQzNCLFdBQXVCLEVBQ3ZCLGVBQXlELEVBQ2xDLHFCQUE0QyxFQUMvQyxrQkFBc0MsRUFDNUMsWUFBMEI7UUFFekQsS0FBSyxFQUFFLENBQUM7UUFUUyxlQUFVLEdBQVYsVUFBVSxDQUE4QztRQUN4RCxhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUMzQixhQUFRLEdBQVIsUUFBUSxDQUFtQjtRQUMzQixnQkFBVyxHQUFYLFdBQVcsQ0FBWTtRQUN2QixvQkFBZSxHQUFmLGVBQWUsQ0FBMEM7UUFDbEMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUMvQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQzVDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBR3pELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNqSCxJQUFJLENBQUMsUUFBUSxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDakcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN2SCxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckgsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUM7WUFFbkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFFMUMsT0FBTyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM5QyxpQ0FBaUM7WUFDakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsTUFBTSxJQUFJLEdBQUcsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEMsbUdBQW1HO1lBQ25HLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFFBQVEsQ0FBQztZQUFDLENBQUM7WUFFL0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFFBQVEsQ0FBQztZQUFDLENBQUM7WUFFNUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVuRyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2pELENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLElBQUksbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FDOUYsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQy9DLE9BQU87Z0JBQ1AsYUFBYSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFhLENBQUMsTUFBTSxDQUMzRCxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDcEU7YUFDRCxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxRQUFRLENBQUM7WUFBQyxDQUFDO1lBQ2hHLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFM0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0MsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FDaEQsY0FBYyxFQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUMzQixJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUNyQyxJQUFJLENBQUMsZUFBZSxFQUNwQixpQkFBaUIsQ0FDaEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssRUFDOUQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FDdkQsRUFDRCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUNsQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFBQyxPQUFPLEVBQUUsQ0FBQztZQUFDLENBQUM7WUFFMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbkQsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlGLE9BQU87b0JBQ04sSUFBSSxjQUFjLENBQ2pCLENBQUMsRUFDRCxJQUFJLEVBQ0osTUFBTSxDQUFDLDBCQUEwQixFQUNqQyxTQUFTLEVBQ1QsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ3hCO2lCQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbkQsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksY0FBYyxDQUNoRCxDQUFDLENBQUMsZ0JBQWdCLENBQUMsOEJBQThCLEVBQUUsRUFDbkQsQ0FBQyxDQUFDLGdCQUFnQixLQUFLLFdBQVcsRUFBRSxnQkFBZ0IsRUFDcEQsTUFBTSxDQUFDLHFCQUFxQixFQUM1QixTQUFTLEVBQ1QsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ3hCLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFlBQVksQ0FBaUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7WUFDM0YsMEJBQTBCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUN2RSxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuRixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFtQixFQUFFLEVBQUU7WUFDekcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLGtDQUF3QixDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQy9FLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7UUFDRixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxPQUFpQztRQUMxRCxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUcsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sUUFBUSxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRyxDQUFDLENBQUM7UUFFdkUsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBTUQsTUFBTSxDQUFDLElBQVk7UUFDbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQy9DLENBQUM7Q0FDRCxDQUFBO0FBekpZLGdCQUFnQjtJQWlCMUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0dBbkJGLGdCQUFnQixDQXlKNUI7O0FBRUQsTUFBTSxjQUFjO0lBQ25CLFlBQ2lCLE9BQWlDLEVBQ2pDLFVBQW1CLEVBQ25CLE1BQWMsRUFDZCxhQUFvQyxFQUNwQyxXQUFnQixFQUNoQixXQUFnQjtRQUxoQixZQUFPLEdBQVAsT0FBTyxDQUEwQjtRQUNqQyxlQUFVLEdBQVYsVUFBVSxDQUFTO1FBQ25CLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDcEMsZ0JBQVcsR0FBWCxXQUFXLENBQUs7UUFDaEIsZ0JBQVcsR0FBWCxXQUFXLENBQUs7SUFFakMsQ0FBQztJQUNELElBQUksRUFBRSxLQUFhLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdELElBQUksS0FBSyxLQUFnQixPQUFPLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0NBQzlFO0FBR0QsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBWSxTQUFRLFVBQVU7SUFRbkMsWUFDa0IsS0FBa0MsRUFDbkQsTUFBbUIsRUFDbkIsTUFBd0IsRUFDRCxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFMUyxVQUFLLEdBQUwsS0FBSyxDQUE2QjtRQU1uRCxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDbEYsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLFFBQVEsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFDO1FBRWhDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2RSxzQkFBc0IsRUFDdEIsU0FBUyxFQUNULEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxFQUN0QixFQUFFLFFBQVEsRUFBRSxFQUFFLGFBQWEsNkJBQXFCLEVBQUUsRUFBRSxDQUNwRCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IscUNBQXFDO1lBQ3JDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9ELFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0QsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUdKLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ2hJLFdBQVcscUNBQTZCO2dCQUN4QyxhQUFhO2dCQUNiLGNBQWMsRUFBRTtvQkFDZixZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztpQkFDMUM7Z0JBQ0QsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNsRSxrQkFBa0IsbUNBQTJCO2dCQUM3QyxZQUFZLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtvQkFDeEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztvQkFDN0IsT0FBTzt3QkFDTixPQUFPO3dCQUNQLDJCQUEyQixFQUFFLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7d0JBQy9ELFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVzt3QkFDN0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO3FCQUNtQixDQUFDO2dCQUNuRCxDQUFDLENBQUMsQ0FBQztnQkFDSCxXQUFXLEVBQUU7b0JBQ1osaUJBQWlCLEVBQUUsSUFBSTtpQkFDdkI7YUFDRCxDQUFDLENBQUMsQ0FBQztZQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRTtnQkFDckMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBZSxDQUFDLENBQUM7Z0JBQ3hELENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFLRCxNQUFNLENBQUMsU0FBc0IsRUFBRSxTQUFzQjtRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUVoQyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGVBQWUsS0FBSyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDL0csMEJBQTBCO1FBQzFCLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFFakQsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUUzRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUM7UUFFMUIsSUFBSSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUUxRCxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQ25ELE1BQU0sRUFDTixTQUFTLENBQUMsWUFBWSxHQUFHLE1BQU0sR0FBRyxVQUFVLENBQzVDLENBQUM7UUFFRixNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQ2pELFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxFQUN4QixTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQzVDLENBQUM7UUFFRixJQUFJLG9CQUFvQixJQUFJLHNCQUFzQixJQUFJLG9CQUFvQixDQUFDLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN0SCxvQkFBb0IsR0FBRyxzQkFBdUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUMxRSxvQkFBb0IsR0FBRyxvQkFBcUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN6RSxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxLQUFLLElBQUksQ0FBQztJQUNsRixDQUFDO0NBQ0QsQ0FBQTtBQWhISyxXQUFXO0lBWWQsV0FBQSxxQkFBcUIsQ0FBQTtHQVpsQixXQUFXLENBZ0hoQiJ9