/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { MergeEditorLineRange } from '../model/lineRange.js';
import * as nls from '../../../../../nls.js';
export const conflictMarkers = {
    start: '<<<<<<<',
    end: '>>>>>>>',
};
export class MergeMarkersController extends Disposable {
    constructor(editor, mergeEditorViewModel) {
        super();
        this.editor = editor;
        this.mergeEditorViewModel = mergeEditorViewModel;
        this.viewZoneIds = [];
        this.disposableStore = new DisposableStore();
        this._register(editor.onDidChangeModelContent(e => {
            this.updateDecorations();
        }));
        this._register(editor.onDidChangeModel(e => {
            this.updateDecorations();
        }));
        this.updateDecorations();
    }
    updateDecorations() {
        const model = this.editor.getModel();
        const blocks = model ? getBlocks(model, { blockToRemoveStartLinePrefix: conflictMarkers.start, blockToRemoveEndLinePrefix: conflictMarkers.end }) : { blocks: [] };
        this.editor.setHiddenAreas(blocks.blocks.map(b => b.lineRange.deltaEnd(-1).toExclusiveRange()), this);
        this.editor.changeViewZones(c => {
            this.disposableStore.clear();
            for (const id of this.viewZoneIds) {
                c.removeZone(id);
            }
            this.viewZoneIds.length = 0;
            for (const b of blocks.blocks) {
                const startLine = model.getLineContent(b.lineRange.startLineNumber).substring(0, 20);
                const endLine = model.getLineContent(b.lineRange.endLineNumberExclusive - 1).substring(0, 20);
                const conflictingLinesCount = b.lineRange.length - 2;
                const domNode = h('div', [
                    h('div.conflict-zone-root', [
                        h('pre', [startLine]),
                        h('span.dots', ['...']),
                        h('pre', [endLine]),
                        h('span.text', [
                            conflictingLinesCount === 1
                                ? nls.localize('conflictingLine', "1 Conflicting Line")
                                : nls.localize('conflictingLines', "{0} Conflicting Lines", conflictingLinesCount)
                        ]),
                    ]),
                ]).root;
                this.viewZoneIds.push(c.addZone({
                    afterLineNumber: b.lineRange.endLineNumberExclusive - 1,
                    domNode,
                    heightInLines: 1.5,
                }));
                const updateWidth = () => {
                    const layoutInfo = this.editor.getLayoutInfo();
                    domNode.style.width = `${layoutInfo.contentWidth - layoutInfo.verticalScrollbarWidth}px`;
                };
                this.disposableStore.add(this.editor.onDidLayoutChange(() => {
                    updateWidth();
                }));
                updateWidth();
                this.disposableStore.add(autorun(reader => {
                    /** @description update classname */
                    const vm = this.mergeEditorViewModel.read(reader);
                    if (!vm) {
                        return;
                    }
                    const activeRange = vm.activeModifiedBaseRange.read(reader);
                    const classNames = [];
                    classNames.push('conflict-zone');
                    if (activeRange) {
                        const activeRangeInResult = vm.model.getLineRangeInResult(activeRange.baseRange, reader);
                        if (activeRangeInResult.intersectsOrTouches(b.lineRange)) {
                            classNames.push('focused');
                        }
                    }
                    domNode.className = classNames.join(' ');
                }));
            }
        });
    }
}
function getBlocks(document, configuration) {
    const blocks = [];
    const transformedContent = [];
    let inBlock = false;
    let startLineNumber = -1;
    let curLine = 0;
    for (const line of document.getLinesContent()) {
        curLine++;
        if (!inBlock) {
            if (line.startsWith(configuration.blockToRemoveStartLinePrefix)) {
                inBlock = true;
                startLineNumber = curLine;
            }
            else {
                transformedContent.push(line);
            }
        }
        else {
            if (line.startsWith(configuration.blockToRemoveEndLinePrefix)) {
                inBlock = false;
                blocks.push(new Block(MergeEditorLineRange.fromLength(startLineNumber, curLine - startLineNumber + 1)));
                transformedContent.push('');
            }
        }
    }
    return {
        blocks,
        transformedContent: transformedContent.join('\n')
    };
}
class Block {
    constructor(lineRange) {
        this.lineRange = lineRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VNYXJrZXJzQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZU1hcmtlcnMvbWVyZ2VNYXJrZXJzQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFHaEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUU3QyxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUc7SUFDOUIsS0FBSyxFQUFFLFNBQVM7SUFDaEIsR0FBRyxFQUFFLFNBQVM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7SUFJckQsWUFDaUIsTUFBbUIsRUFDbkIsb0JBQW1FO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBSFEsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQStDO1FBTG5FLGdCQUFXLEdBQWEsRUFBRSxDQUFDO1FBQzNCLG9CQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQVF4RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxD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