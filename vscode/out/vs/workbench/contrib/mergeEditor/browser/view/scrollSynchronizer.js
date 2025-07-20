/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived } from '../../../../../base/common/observable.js';
import { DocumentLineRangeMap } from '../model/mapping.js';
import { ReentrancyBarrier } from '../../../../../base/common/controlFlow.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { isDefined } from '../../../../../base/common/types.js';
export class ScrollSynchronizer extends Disposable {
    get model() { return this.viewModel.get()?.model; }
    get lockResultWithInputs() { return this.layout.get().kind === 'columns'; }
    get lockBaseWithInputs() { return this.layout.get().kind === 'mixed' && !this.layout.get().showBaseAtTop; }
    constructor(viewModel, input1View, input2View, baseView, inputResultView, layout) {
        super();
        this.viewModel = viewModel;
        this.input1View = input1View;
        this.input2View = input2View;
        this.baseView = baseView;
        this.inputResultView = inputResultView;
        this.layout = layout;
        this.reentrancyBarrier = new ReentrancyBarrier();
        this._isSyncing = true;
        const s = derived((reader) => {
            const baseView = this.baseView.read(reader);
            const editors = [this.input1View, this.input2View, this.inputResultView, baseView].filter(isDefined);
            const alignScrolling = (source, updateScrollLeft, updateScrollTop) => {
                this.reentrancyBarrier.runExclusivelyOrSkip(() => {
                    if (updateScrollLeft) {
                        const scrollLeft = source.editor.getScrollLeft();
                        for (const editorView of editors) {
                            if (editorView !== source) {
                                editorView.editor.setScrollLeft(scrollLeft, 1 /* ScrollType.Immediate */);
                            }
                        }
                    }
                    if (updateScrollTop) {
                        const scrollTop = source.editor.getScrollTop();
                        for (const editorView of editors) {
                            if (editorView !== source) {
                                if (this._shouldLock(source, editorView)) {
                                    editorView.editor.setScrollTop(scrollTop, 1 /* ScrollType.Immediate */);
                                }
                                else {
                                    const m = this._getMapping(source, editorView);
                                    if (m) {
                                        this._synchronizeScrolling(source.editor, editorView.editor, m);
                                    }
                                }
                            }
                        }
                    }
                });
            };
            for (const editorView of editors) {
                reader.store.add(editorView.editor.onDidScrollChange(e => {
                    if (!this._isSyncing) {
                        return;
                    }
                    alignScrolling(editorView, e.scrollLeftChanged, e.scrollTopChanged);
                }));
            }
            return {
                update: () => {
                    alignScrolling(this.inputResultView, true, true);
                }
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this.updateScrolling = () => {
            s.get().update();
        };
    }
    stopSync() {
        this._isSyncing = false;
    }
    startSync() {
        this._isSyncing = true;
    }
    _shouldLock(editor1, editor2) {
        const isInput = (editor) => editor === this.input1View || editor === this.input2View;
        if (isInput(editor1) && editor2 === this.inputResultView || isInput(editor2) && editor1 === this.inputResultView) {
            return this.lockResultWithInputs;
        }
        if (isInput(editor1) && editor2 === this.baseView.get() || isInput(editor2) && editor1 === this.baseView.get()) {
            return this.lockBaseWithInputs;
        }
        if (isInput(editor1) && isInput(editor2)) {
            return true;
        }
        return false;
    }
    _getMapping(editor1, editor2) {
        if (editor1 === this.input1View) {
            if (editor2 === this.input2View) {
                return undefined;
            }
            else if (editor2 === this.inputResultView) {
                return this.model?.input1ResultMapping.get();
            }
            else if (editor2 === this.baseView.get()) {
                const b = this.model?.baseInput1Diffs.get();
                if (!b) {
                    return undefined;
                }
                return new DocumentLineRangeMap(b, -1).reverse();
            }
        }
        else if (editor1 === this.input2View) {
            if (editor2 === this.input1View) {
                return undefined;
            }
            else if (editor2 === this.inputResultView) {
                return this.model?.input2ResultMapping.get();
            }
            else if (editor2 === this.baseView.get()) {
                const b = this.model?.baseInput2Diffs.get();
                if (!b) {
                    return undefined;
                }
                return new DocumentLineRangeMap(b, -1).reverse();
            }
        }
        else if (editor1 === this.inputResultView) {
            if (editor2 === this.input1View) {
                return this.model?.resultInput1Mapping.get();
            }
            else if (editor2 === this.input2View) {
                return this.model?.resultInput2Mapping.get();
            }
            else if (editor2 === this.baseView.get()) {
                const b = this.model?.resultBaseMapping.get();
                if (!b) {
                    return undefined;
                }
                return b;
            }
        }
        else if (editor1 === this.baseView.get()) {
            if (editor2 === this.input1View) {
                const b = this.model?.baseInput1Diffs.get();
                if (!b) {
                    return undefined;
                }
                return new DocumentLineRangeMap(b, -1);
            }
            else if (editor2 === this.input2View) {
                const b = this.model?.baseInput2Diffs.get();
                if (!b) {
                    return undefined;
                }
                return new DocumentLineRangeMap(b, -1);
            }
            else if (editor2 === this.inputResultView) {
                const b = this.model?.baseResultMapping.get();
                if (!b) {
                    return undefined;
                }
                return b;
            }
        }
        throw new BugIndicatingError();
    }
    _synchronizeScrolling(scrollingEditor, targetEditor, mapping) {
        if (!mapping) {
            return;
        }
        const visibleRanges = scrollingEditor.getVisibleRanges();
        if (visibleRanges.length === 0) {
            return;
        }
        const topLineNumber = visibleRanges[0].startLineNumber - 1;
        const result = mapping.project(topLineNumber);
        const sourceRange = result.inputRange;
        const targetRange = result.outputRange;
        const resultStartTopPx = targetEditor.getTopForLineNumber(targetRange.startLineNumber);
        const resultEndPx = targetEditor.getTopForLineNumber(targetRange.endLineNumberExclusive);
        const sourceStartTopPx = scrollingEditor.getTopForLineNumber(sourceRange.startLineNumber);
        const sourceEndPx = scrollingEditor.getTopForLineNumber(sourceRange.endLineNumberExclusive);
        const factor = Math.min((scrollingEditor.getScrollTop() - sourceStartTopPx) / (sourceEndPx - sourceStartTopPx), 1);
        const resultScrollPosition = resultStartTopPx + (resultEndPx - resultStartTopPx) * factor;
        targetEditor.setScrollTop(resultScrollPosition, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsU3luY2hyb25pemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvc2Nyb2xsU3luY2hyb25pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFHaEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFPOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBQ2pELElBQVksS0FBSyxLQUFLLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBTTNELElBQVksb0JBQW9CLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ25GLElBQVksa0JBQWtCLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFJbkgsWUFDa0IsU0FBd0QsRUFDeEQsVUFBK0IsRUFDL0IsVUFBK0IsRUFD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