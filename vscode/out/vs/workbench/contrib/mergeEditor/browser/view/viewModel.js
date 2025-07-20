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
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, derivedObservableWithWritableCache, observableValue, transaction } from '../../../../../base/common/observable.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { MergeEditorLineRange } from '../model/lineRange.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeEditorViewModel = class MergeEditorViewModel extends Disposable {
    constructor(model, inputCodeEditorView1, inputCodeEditorView2, resultCodeEditorView, baseCodeEditorView, showNonConflictingChanges, configurationService, notificationService) {
        super();
        this.model = model;
        this.inputCodeEditorView1 = inputCodeEditorView1;
        this.inputCodeEditorView2 = inputCodeEditorView2;
        this.resultCodeEditorView = resultCodeEditorView;
        this.baseCodeEditorView = baseCodeEditorView;
        this.showNonConflictingChanges = showNonConflictingChanges;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.manuallySetActiveModifiedBaseRange = observableValue(this, { range: undefined, counter: 0 });
        this.attachedHistory = this._register(new AttachedHistory(this.model.resultTextModel));
        this.shouldUseAppendInsteadOfAccept = observableConfigValue('mergeEditor.shouldUseAppendInsteadOfAccept', false, this.configurationService);
        this.counter = 0;
        this.lastFocusedEditor = derivedObservableWithWritableCache(this, (reader, lastValue) => {
            const editors = [
                this.inputCodeEditorView1,
                this.inputCodeEditorView2,
                this.resultCodeEditorView,
                this.baseCodeEditorView.read(reader),
            ];
            const view = editors.find((e) => e && e.isFocused.read(reader));
            return view ? { view, counter: this.counter++ } : lastValue || { view: undefined, counter: this.counter++ };
        });
        this.baseShowDiffAgainst = derived(this, reader => {
            const lastFocusedEditor = this.lastFocusedEditor.read(reader);
            if (lastFocusedEditor.view === this.inputCodeEditorView1) {
                return 1;
            }
            else if (lastFocusedEditor.view === this.inputCodeEditorView2) {
                return 2;
            }
            return undefined;
        });
        this.focusedEditorType = derived(this, reader => {
            const lastFocusedEditor = this.lastFocusedEditor.read(reader);
            if (!lastFocusedEditor.view) {
                return undefined;
            }
            if (lastFocusedEditor.view === this.inputCodeEditorView1) {
                return 'input1';
            }
            else if (lastFocusedEditor.view === this.inputCodeEditorView2) {
                return 'input2';
            }
            else if (lastFocusedEditor.view === this.resultCodeEditorView) {
                return 'result';
            }
            else if (lastFocusedEditor.view === this.baseCodeEditorView.read(reader)) {
                return 'base';
            }
            return undefined;
        });
        this.selectionInBase = derived(this, reader => {
            const sourceEditor = this.lastFocusedEditor.read(reader).view;
            if (!sourceEditor) {
                return undefined;
            }
            const selections = sourceEditor.selection.read(reader) || [];
            const rangesInBase = selections.map((selection) => {
                if (sourceEditor === this.inputCodeEditorView1) {
                    return this.model.translateInputRangeToBase(1, selection);
                }
                else if (sourceEditor === this.inputCodeEditorView2) {
                    return this.model.translateInputRangeToBase(2, selection);
                }
                else if (sourceEditor === this.resultCodeEditorView) {
                    return this.model.translateResultRangeToBase(selection);
                }
                else if (sourceEditor === this.baseCodeEditorView.read(reader)) {
                    return selection;
                }
                else {
                    return selection;
                }
            });
            return {
                rangesInBase,
                sourceEditor
            };
        });
        this.activeModifiedBaseRange = derived(this, (reader) => {
            /** @description activeModifiedBaseRange */
            const focusedEditor = this.lastFocusedEditor.read(reader);
            const manualRange = this.manuallySetActiveModifiedBaseRange.read(reader);
            if (manualRange.counter > focusedEditor.counter) {
                return manualRange.range;
            }
            if (!focusedEditor.view) {
                return;
            }
            const cursorLineNumber = focusedEditor.view.cursorLineNumber.read(reader);
            if (!cursorLineNumber) {
                return undefined;
            }
            const modifiedBaseRanges = this.model.modifiedBaseRanges.read(reader);
            return modifiedBaseRanges.find((r) => {
                const range = this.getRangeOfModifiedBaseRange(focusedEditor.view, r, reader);
                return range.isEmpty
                    ? range.startLineNumber === cursorLineNumber
                    : range.contains(cursorLineNumber);
            });
        });
        this._register(resultCodeEditorView.editor.onDidChangeModelContent(e => {
            if (this.model.isApplyingEditInResult || e.isRedoing || e.isUndoing) {
                return;
            }
            const baseRangeStates = [];
            for (const change of e.changes) {
                const rangeInBase = this.model.translateResultRangeToBase(Range.lift(change.range));
                const baseRanges = this.model.findModifiedBaseRangesInRange(MergeEditorLineRange.fromLength(rangeInBase.startLineNumber, rangeInBase.endLineNumber - rangeInBase.startLineNumber));
                if (baseRanges.length === 1) {
                    const isHandled = this.model.isHandled(baseRanges[0]).get();
                    if (!isHandled) {
                        baseRangeStates.push(baseRanges[0]);
                    }
                }
            }
            if (baseRangeStates.length === 0) {
                return;
            }
            const element = {
                model: this.model,
                redo() {
                    transaction(tx => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, true, tx);
                        }
                    });
                },
                undo() {
                    transaction(tx => {
                        /** @description Mark conflicts touched by manual edits as handled */
                        for (const r of baseRangeStates) {
                            this.model.setHandled(r, false, tx);
                        }
                    });
                },
            };
            this.attachedHistory.pushAttachedHistoryElement(element);
            element.redo();
        }));
    }
    getRangeOfModifiedBaseRange(editor, modifiedBaseRange, reader) {
        if (editor === this.resultCodeEditorView) {
            return this.model.getLineRangeInResult(modifiedBaseRange.baseRange, reader);
        }
        else if (editor === this.baseCodeEditorView.get()) {
            return modifiedBaseRange.baseRange;
        }
        else {
            const input = editor === this.inputCodeEditorView1 ? 1 : 2;
            return modifiedBaseRange.getInputRange(input);
        }
    }
    setActiveModifiedBaseRange(range, tx) {
        this.manuallySetActiveModifiedBaseRange.set({ range, counter: this.counter++ }, tx);
    }
    setState(baseRange, state, tx, inputNumber) {
        this.manuallySetActiveModifiedBaseRange.set({ range: baseRange, counter: this.counter++ }, tx);
        this.model.setState(baseRange, state, inputNumber, tx);
        this.lastFocusedEditor.clearCache(tx);
    }
    goToConflict(getModifiedBaseRange) {
        let editor = this.lastFocusedEditor.get().view;
        if (!editor) {
            editor = this.resultCodeEditorView;
        }
        const curLineNumber = editor.editor.getPosition()?.lineNumber;
        if (curLineNumber === undefined) {
            return;
        }
        const modifiedBaseRange = getModifiedBaseRange(editor, curLineNumber);
        if (modifiedBaseRange) {
            const range = this.getRangeOfModifiedBaseRange(editor, modifiedBaseRange, undefined);
            editor.editor.focus();
            let startLineNumber = range.startLineNumber;
            let endLineNumberExclusive = range.endLineNumberExclusive;
            if (range.startLineNumber > editor.editor.getModel().getLineCount()) {
                transaction(tx => {
                    this.setActiveModifiedBaseRange(modifiedBaseRange, tx);
                });
                startLineNumber = endLineNumberExclusive = editor.editor.getModel().getLineCount();
            }
            editor.editor.setPosition({
                lineNumber: startLineNumber,
                column: editor.editor.getModel().getLineFirstNonWhitespaceColumn(startLineNumber),
            });
            editor.editor.revealLinesNearTop(startLineNumber, endLineNumberExclusive, 0 /* ScrollType.Smooth */);
        }
    }
    goToNextModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => this.model.modifiedBaseRanges
            .get()
            .find((r) => predicate(r) &&
            this.getRangeOfModifiedBaseRange(e, r, undefined).startLineNumber > l) ||
            this.model.modifiedBaseRanges
                .get()
                .find((r) => predicate(r)));
    }
    goToPreviousModifiedBaseRange(predicate) {
        this.goToConflict((e, l) => findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r) &&
            this.getRangeOfModifiedBaseRange(e, r, undefined).endLineNumberExclusive < l) ||
            findLast(this.model.modifiedBaseRanges.get(), (r) => predicate(r)));
    }
    toggleActiveConflict(inputNumber) {
        const activeModifiedBaseRange = this.activeModifiedBaseRange.get();
        if (!activeModifiedBaseRange) {
            this.notificationService.error(localize('noConflictMessage', "There is currently no conflict focused that can be toggled."));
            return;
        }
        transaction(tx => {
            /** @description Toggle Active Conflict */
            this.setState(activeModifiedBaseRange, this.model.getState(activeModifiedBaseRange).get().toggle(inputNumber), tx, inputNumber);
        });
    }
    acceptAll(inputNumber) {
        transaction(tx => {
            /** @description Toggle Active Conflict */
            for (const range of this.model.modifiedBaseRanges.get()) {
                this.setState(range, this.model.getState(range).get().withInputValue(inputNumber, true), tx, inputNumber);
            }
        });
    }
};
MergeEditorViewModel = __decorate([
    __param(6, IConfigurationService),
    __param(7, INotificationService)
], MergeEditorViewModel);
export { MergeEditorViewModel };
class AttachedHistory extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this.attachedHistory = [];
        this.previousAltId = this.model.getAlternativeVersionId();
        this._register(model.onDidChangeContent((e) => {
            const currentAltId = model.getAlternativeVersionId();
            if (e.isRedoing) {
                for (const item of this.attachedHistory) {
                    if (this.previousAltId < item.altId && item.altId <= currentAltId) {
                        item.element.redo();
                    }
                }
            }
            else if (e.isUndoing) {
                for (let i = this.attachedHistory.length - 1; i >= 0; i--) {
                    const item = this.attachedHistory[i];
                    if (currentAltId < item.altId && item.altId <= this.previousAltId) {
                        item.element.undo();
                    }
                }
            }
            else {
                // The user destroyed the redo stack by performing a non redo/undo operation.
                // Thus we also need to remove all history elements after the last version id.
                while (this.attachedHistory.length > 0
                    && this.attachedHistory[this.attachedHistory.length - 1].altId > this.previousAltId) {
                    this.attachedHistory.pop();
                }
            }
            this.previousAltId = currentAltId;
        }));
    }
    /**
     * Pushes an history item that is tied to the last text edit (or an extension of it).
     * When the last text edit is undone/redone, so is is this history item.
     */
    pushAttachedHistoryElement(element) {
        this.attachedHistory.push({ altId: this.model.getAlternativeVersionId(), element });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvdmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBc0MsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pLLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUduRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFNdEcsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBS25ELFlBQ2lCLEtBQXVCLEVBQ3ZCLG9CQUF5QyxFQUN6QyxvQkFBeUMsRUFDekMsb0JBQTBDLEVBQzFDLGtCQUErRCxFQUMvRCx5QkFBK0MsRUFDdkIsb0JBQTJDLEVBQzVDLG1CQUF5QztRQUVoRixLQUFLLEVBQUUsQ0FBQztRQVRRLFVBQUssR0FBTCxLQUFLLENBQWtCO1FBQ3ZCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBcUI7UUFDekMs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