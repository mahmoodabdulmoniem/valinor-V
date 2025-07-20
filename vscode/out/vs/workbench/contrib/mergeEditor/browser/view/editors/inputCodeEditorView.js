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
import { addDisposableListener, EventType, h, reset } from '../../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Toggle } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { Action, Separator } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { autorun, autorunOpts, derived, derivedOpts, observableValue, transaction } from '../../../../../../base/common/observable.js';
import { noBreakWhitespace } from '../../../../../../base/common/strings.js';
import { isDefined } from '../../../../../../base/common/types.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { localize } from '../../../../../../nls.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { defaultToggleStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { applyObservableDecorations, setFields } from '../../utils.js';
import { handledConflictMinimapOverViewRulerColor, unhandledConflictMinimapOverViewRulerColor } from '../colors.js';
import { EditorGutter } from '../editorGutter.js';
import { CodeEditorView, createSelectionsAutorun, TitleMenu } from './codeEditorView.js';
let InputCodeEditorView = class InputCodeEditorView extends CodeEditorView {
    constructor(inputNumber, viewModel, instantiationService, contextMenuService, configurationService) {
        super(instantiationService, viewModel, configurationService);
        this.inputNumber = inputNumber;
        this.otherInputNumber = this.inputNumber === 1 ? 2 : 1;
        this.modifiedBaseRangeGutterItemInfos = derivedOpts({ debugName: `input${this.inputNumber}.modifiedBaseRangeGutterItemInfos` }, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const inputNumber = this.inputNumber;
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            return model.modifiedBaseRanges.read(reader)
                .filter((r) => r.getInputDiffs(this.inputNumber).length > 0 && (showNonConflictingChanges || r.isConflicting || !model.isHandled(r).read(reader)))
                .map((baseRange, idx) => new ModifiedBaseRangeGutterItemModel(idx.toString(), baseRange, inputNumber, viewModel));
        });
        this.decorations = derivedOpts({ debugName: `input${this.inputNumber}.decorations` }, reader => {
            const viewModel = this.viewModel.read(reader);
            if (!viewModel) {
                return [];
            }
            const model = viewModel.model;
            const textModel = (this.inputNumber === 1 ? model.input1 : model.input2).textModel;
            const activeModifiedBaseRange = viewModel.activeModifiedBaseRange.read(reader);
            const result = new Array();
            const showNonConflictingChanges = viewModel.showNonConflictingChanges.read(reader);
            const showDeletionMarkers = this.showDeletionMarkers.read(reader);
            const diffWithThis = viewModel.baseCodeEditorView.read(reader) !== undefined && viewModel.baseShowDiffAgainst.read(reader) === this.inputNumber;
            const useSimplifiedDecorations = !diffWithThis && this.useSimplifiedDecorations.read(reader);
            for (const modifiedBaseRange of model.modifiedBaseRanges.read(reader)) {
                const range = modifiedBaseRange.getInputRange(this.inputNumber);
                if (!range) {
                    continue;
                }
                const blockClassNames = ['merge-editor-block'];
                let blockPadding = [0, 0, 0, 0];
                const isHandled = model.isInputHandled(modifiedBaseRange, this.inputNumber).read(reader);
                if (isHandled) {
                    blockClassNames.push('handled');
                }
                if (modifiedBaseRange === activeModifiedBaseRange) {
                    blockClassNames.push('focused');
                    blockPadding = [0, 2, 0, 2];
                }
                if (modifiedBaseRange.isConflicting) {
                    blockClassNames.push('conflicting');
                }
                const inputClassName = this.inputNumber === 1 ? 'input i1' : 'input i2';
                blockClassNames.push(inputClassName);
                if (!modifiedBaseRange.isConflicting && !showNonConflictingChanges && isHandled) {
                    continue;
                }
                if (useSimplifiedDecorations && !isHandled) {
                    blockClassNames.push('use-simplified-decorations');
                }
                result.push({
                    range: range.toInclusiveRangeOrEmpty(),
                    options: {
                        showIfCollapsed: true,
                        blockClassName: blockClassNames.join(' '),
                        blockPadding,
                        blockIsAfterEnd: range.startLineNumber > textModel.getLineCount(),
                        description: 'Merge Editor',
                        minimap: {
                            position: 2 /* MinimapPosition.Gutter */,
                            color: { id: isHandled ? handledConflictMinimapOverViewRulerColor : unhandledConflictMinimapOverViewRulerColor },
                        },
                        overviewRuler: modifiedBaseRange.isConflicting ? {
                            position: OverviewRulerLane.Center,
                            color: { id: isHandled ? handledConflictMinimapOverViewRulerColor : unhandledConflictMinimapOverViewRulerColor },
                        } : undefined
                    }
                });
                if (!useSimplifiedDecorations && (modifiedBaseRange.isConflicting || !model.isHandled(modifiedBaseRange).read(reader))) {
                    const inputDiffs = modifiedBaseRange.getInputDiffs(this.inputNumber);
                    for (const diff of inputDiffs) {
                        const range = diff.outputRange.toInclusiveRange();
                        if (range) {
                            result.push({
                                range,
                                options: {
                                    className: `merge-editor-diff ${inputClassName}`,
                                    description: 'Merge Editor',
                                    isWholeLine: true,
                                }
                            });
                        }
                        if (diff.rangeMappings) {
                            for (const d of diff.rangeMappings) {
                                if (showDeletionMarkers || !d.outputRange.isEmpty()) {
                                    result.push({
                                        range: d.outputRange,
                                        options: {
                                            className: d.outputRange.isEmpty() ? `merge-editor-diff-empty-word ${inputClassName}` : `merge-editor-diff-word ${inputClassName}`,
                                            description: 'Merge Editor',
                                            showIfCollapsed: true,
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return result;
        });
        this.htmlElements.root.classList.add(`input`);
        this._register(new EditorGutter(this.editor, this.htmlElements.gutterDiv, {
            getIntersectingGutterItems: (range, reader) => {
                if (this.checkboxesVisible.read(reader)) {
                    return this.modifiedBaseRangeGutterItemInfos.read(reader);
                }
                else {
                    return [];
                }
            },
            createView: (item, target) => new MergeConflictGutterItemView(item, target, contextMenuService),
        }));
        this._register(createSelectionsAutorun(this, (baseRange, viewModel) => viewModel.model.translateBaseRangeToInput(this.inputNumber, baseRange)));
        this._register(instantiationService.createInstance(TitleMenu, inputNumber === 1 ? MenuId.MergeInput1Toolbar : MenuId.MergeInput2Toolbar, this.htmlElements.toolbar));
        this._register(autorunOpts({ debugName: `input${this.inputNumber}: update labels & text model` }, reader => {
            const vm = this.viewModel.read(reader);
            if (!vm) {
                return;
            }
            this.editor.setModel(this.inputNumber === 1 ? vm.model.input1.textModel : vm.model.input2.textModel);
            const title = this.inputNumber === 1
                ? vm.model.input1.title || localize('input1', 'Input 1')
                : vm.model.input2.title || localize('input2', 'Input 2');
            const description = this.inputNumber === 1
                ? vm.model.input1.description
                : vm.model.input2.description;
            const detail = this.inputNumber === 1
                ? vm.model.input1.detail
                : vm.model.input2.detail;
            reset(this.htmlElements.title, ...renderLabelWithIcons(title));
            reset(this.htmlElements.description, ...(description ? renderLabelWithIcons(description) : []));
            reset(this.htmlElements.detail, ...(detail ? renderLabelWithIcons(detail) : []));
        }));
        this._register(applyObservableDecorations(this.editor, this.decorations));
    }
};
InputCodeEditorView = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService)
], InputCodeEditorView);
export { InputCodeEditorView };
export class ModifiedBaseRangeGutterItemModel {
    constructor(id, baseRange, inputNumber, viewModel) {
        this.id = id;
        this.baseRange = baseRange;
        this.inputNumber = inputNumber;
        this.viewModel = viewModel;
        this.model = this.viewModel.model;
        this.range = this.baseRange.getInputRange(this.inputNumber);
        this.enabled = this.model.isUpToDate;
        this.toggleState = derived(this, reader => {
            const input = this.model
                .getState(this.baseRange)
                .read(reader)
                .getInput(this.inputNumber);
            return input === 2 /* InputState.second */ && !this.baseRange.isOrderRelevant
                ? 1 /* InputState.first */
                : input;
        });
        this.state = derived(this, reader => {
            const active = this.viewModel.activeModifiedBaseRange.read(reader);
            if (!this.model.hasBaseRange(this.baseRange)) {
                return { handled: false, focused: false }; // Invalid state, should only be observed temporarily
            }
            return {
                handled: this.model.isHandled(this.baseRange).read(reader),
                focused: this.baseRange === active,
            };
        });
    }
    setState(value, tx) {
        this.viewModel.setState(this.baseRange, this.model
            .getState(this.baseRange)
            .get()
            .withInputValue(this.inputNumber, value), tx, this.inputNumber);
    }
    toggleBothSides() {
        transaction(tx => {
            /** @description Context Menu: toggle both sides */
            const state = this.model
                .getState(this.baseRange)
                .get();
            this.model.setState(this.baseRange, state
                .toggle(this.inputNumber)
                .toggle(this.inputNumber === 1 ? 2 : 1), true, tx);
        });
    }
    getContextMenuActions() {
        const state = this.model.getState(this.baseRange).get();
        const handled = this.model.isHandled(this.baseRange).get();
        const update = (newState) => {
            transaction(tx => {
                /** @description Context Menu: Update Base Range State */
                return this.viewModel.setState(this.baseRange, newState, tx, this.inputNumber);
            });
        };
        function action(id, label, targetState, checked) {
            const action = new Action(id, label, undefined, true, () => {
                update(targetState);
            });
            action.checked = checked;
            return action;
        }
        const both = state.includesInput1 && state.includesInput2;
        return [
            this.baseRange.input1Diffs.length > 0
                ? action('mergeEditor.acceptInput1', localize('mergeEditor.accept', 'Accept {0}', this.model.input1.title), state.toggle(1), state.includesInput1)
                : undefined,
            this.baseRange.input2Diffs.length > 0
                ? action('mergeEditor.acceptInput2', localize('mergeEditor.accept', 'Accept {0}', this.model.input2.title), state.toggle(2), state.includesInput2)
                : undefined,
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.acceptBoth', localize('mergeEditor.acceptBoth', 'Accept Both'), state.withInputValue(1, !both).withInputValue(2, !both), both), { enabled: this.baseRange.canBeCombined })
                : undefined,
            new Separator(),
            this.baseRange.isConflicting
                ? setFields(action('mergeEditor.swap', localize('mergeEditor.swap', 'Swap'), state.swap(), false), { enabled: !state.kind && (!both || this.baseRange.isOrderRelevant) })
                : undefined,
            setFields(new Action('mergeEditor.markAsHandled', localize('mergeEditor.markAsHandled', 'Mark as Handled'), undefined, true, () => {
                transaction((tx) => {
                    /** @description Context Menu: Mark as handled */
                    this.model.setHandled(this.baseRange, !handled, tx);
                });
            }), { checked: handled }),
        ].filter(isDefined);
    }
}
export class MergeConflictGutterItemView extends Disposable {
    constructor(item, target, contextMenuService) {
        super();
        this.isMultiLine = observableValue(this, false);
        this.item = observableValue(this, item);
        const checkBox = new Toggle({
            isChecked: false,
            title: '',
            icon: Codicon.check,
            ...defaultToggleStyles
        });
        checkBox.domNode.classList.add('accept-conflict-group');
        this._register(addDisposableListener(checkBox.domNode, EventType.MOUSE_DOWN, (e) => {
            const item = this.item.get();
            if (!item) {
                return;
            }
            if (e.button === /* Right */ 2) {
                e.stopPropagation();
                e.preventDefault();
                contextMenuService.showContextMenu({
                    getAnchor: () => checkBox.domNode,
                    getActions: () => item.getContextMenuActions(),
                });
            }
            else if (e.button === /* Middle */ 1) {
                e.stopPropagation();
                e.preventDefault();
                item.toggleBothSides();
            }
        }));
        this._register(autorun(reader => {
            /** @description Update Checkbox */
            const item = this.item.read(reader);
            const value = item.toggleState.read(reader);
            const iconMap = {
                [0 /* InputState.excluded */]: { icon: undefined, checked: false, title: localize('accept.excluded', "Accept") },
                [3 /* InputState.unrecognized */]: { icon: Codicon.circleFilled, checked: false, title: localize('accept.conflicting', "Accept (result is dirty)") },
                [1 /* InputState.first */]: { icon: Codicon.check, checked: true, title: localize('accept.first', "Undo accept") },
                [2 /* InputState.second */]: { icon: Codicon.checkAll, checked: true, title: localize('accept.second', "Undo accept (currently second)") },
            };
            const state = iconMap[value];
            checkBox.setIcon(state.icon);
            checkBox.checked = state.checked;
            checkBox.setTitle(state.title);
            if (!item.enabled.read(reader)) {
                checkBox.disable();
            }
            else {
                checkBox.enable();
            }
        }));
        this._register(autorun(reader => {
            /** @description Update Checkbox CSS ClassNames */
            const state = this.item.read(reader).state.read(reader);
            const classNames = [
                'merge-accept-gutter-marker',
                state.handled && 'handled',
                state.focused && 'focused',
                this.isMultiLine.read(reader) ? 'multi-line' : 'single-line',
            ];
            target.className = classNames.filter(c => typeof c === 'string').join(' ');
        }));
        this._register(checkBox.onChange(() => {
            transaction(tx => {
                /** @description Handle Checkbox Change */
                this.item.get().setState(checkBox.checked, tx);
            });
        }));
        target.appendChild(h('div.background', [noBreakWhitespace]).root);
        target.appendChild(this.checkboxDiv = h('div.checkbox', [h('div.checkbox-background', [checkBox.domNode])]).root);
    }
    layout(top, height, viewTop, viewHeight) {
        const checkboxHeight = this.checkboxDiv.clientHeight;
        const middleHeight = height / 2 - checkboxHeight / 2;
        const margin = checkboxHeight;
        let effectiveCheckboxTop = top + middleHeight;
        const preferredViewPortRange = [
            margin,
            viewTop + viewHeight - margin - checkboxHeight
        ];
        const preferredParentRange = [
            top + margin,
            top + height - checkboxHeight - margin
        ];
        if (preferredParentRange[0] < preferredParentRange[1]) {
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredViewPortRange[0], preferredViewPortRange[1]);
            effectiveCheckboxTop = clamp(effectiveCheckboxTop, preferredParentRange[0], preferredParentRange[1]);
        }
        this.checkboxDiv.style.top = `${effectiveCheckboxTop - top}px`;
        transaction((tx) => {
            /** @description MergeConflictGutterItemView: Update Is Multi Line */
            this.isMultiLine.set(height > 30, tx);
        });
    }
    update(baseRange) {
        transaction(tx => {
            /** @description MergeConflictGutterItemView: Updating new base range */
            this.item.set(baseRange, tx);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRDb2RlRWRpdG9yVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2VkaXRvcnMvaW5wdXRDb2RlRWRpdG9yVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFrRCxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdkwsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBMEMsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE1BQU0sRUFB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