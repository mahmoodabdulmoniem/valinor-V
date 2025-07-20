/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Permutation, compareBy } from '../../../../base/common/arrays.js';
import { observableValue, autorun, transaction } from '../../../../base/common/observable.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Position } from '../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../common/core/text/positionToOffset.js';
import { Range } from '../../../common/core/range.js';
import { TextEdit } from '../../../common/core/edits/textEdit.js';
import { getPositionOffsetTransformerFromTextModel } from '../../../common/core/text/getPositionOffsetTransformerFromTextModel.js';
const array = [];
export function getReadonlyEmptyArray() {
    return array;
}
export function addPositions(pos1, pos2) {
    return new Position(pos1.lineNumber + pos2.lineNumber - 1, pos2.lineNumber === 1 ? pos1.column + pos2.column - 1 : pos2.column);
}
export function subtractPositions(pos1, pos2) {
    return new Position(pos1.lineNumber - pos2.lineNumber + 1, pos1.lineNumber - pos2.lineNumber === 0 ? pos1.column - pos2.column + 1 : pos1.column);
}
export function substringPos(text, pos) {
    const transformer = new PositionOffsetTransformer(text);
    const offset = transformer.getOffset(pos);
    return text.substring(offset);
}
export function getEndPositionsAfterApplying(edits) {
    const newRanges = getModifiedRangesAfterApplying(edits);
    return newRanges.map(range => range.getEndPosition());
}
export function getModifiedRangesAfterApplying(edits) {
    const sortPerm = Permutation.createSortPermutation(edits, compareBy(e => e.range, Range.compareRangesUsingStarts));
    const edit = new TextEdit(sortPerm.apply(edits));
    const sortedNewRanges = edit.getNewRanges();
    return sortPerm.inverse().apply(sortedNewRanges);
}
export function removeTextReplacementCommonSuffixPrefix(edits, textModel) {
    const transformer = getPositionOffsetTransformerFromTextModel(textModel);
    const text = textModel.getValue();
    const stringReplacements = edits.map(edit => transformer.getStringReplacement(edit));
    const minimalStringReplacements = stringReplacements.map(replacement => replacement.removeCommonSuffixPrefix(text));
    return minimalStringReplacements.map(replacement => transformer.getTextReplacement(replacement));
}
export function convertItemsToStableObservables(items, store) {
    const result = observableValue('result', []);
    const innerObservables = [];
    store.add(autorun(reader => {
        const itemsValue = items.read(reader);
        transaction(tx => {
            if (itemsValue.length !== innerObservables.length) {
                innerObservables.length = itemsValue.length;
                for (let i = 0; i < innerObservables.length; i++) {
                    if (!innerObservables[i]) {
                        innerObservables[i] = observableValue('item', itemsValue[i]);
                    }
                }
                result.set([...innerObservables], tx);
            }
            innerObservables.forEach((o, i) => o.set(itemsValue[i], tx));
        });
    }));
    return result;
}
export class ObservableContextKeyService {
    constructor(_contextKeyService) {
        this._contextKeyService = _contextKeyService;
    }
    bind(key, obs) {
        return bindContextKey(key, this._contextKeyService, obs instanceof Function ? obs : reader => obs.read(reader));
    }
}
export function wait(ms, cancellationToken) {
    return new Promise(resolve => {
        let d = undefined;
        const handle = setTimeout(() => {
            if (d) {
                d.dispose();
            }
            resolve();
        }, ms);
        if (cancellationToken) {
            d = cancellationToken.onCancellationRequested(() => {
                clearTimeout(handle);
                if (d) {
                    d.dispose();
                }
                resolve();
            });
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUczRSxPQUFPLEVBQWUsZUFBZSxFQUF1QixPQUFPLEVBQUUsV0FBVyxFQUFXLE1BQU0sdUNBQXVDLENBQUM7QUFFekksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRixPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUduSSxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFDO0FBQ3JDLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFjLEVBQUUsSUFBYztJQUMxRCxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUks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