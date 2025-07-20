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
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { MergeEditorLineRange } from './lineRange.js';
import { DetailedLineRangeMapping, RangeMapping } from './mapping.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
let MergeDiffComputer = class MergeDiffComputer {
    constructor(editorWorkerService, configurationService) {
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this.mergeAlgorithm = observableConfigValue('mergeEditor.diffAlgorithm', 'advanced', this.configurationService)
            .map(v => v === 'smart' ? 'legacy' : v === 'experimental' ? 'advanced' : v);
    }
    async computeDiff(textModel1, textModel2, reader) {
        const diffAlgorithm = this.mergeAlgorithm.read(reader);
        const inputVersion = textModel1.getVersionId();
        const outputVersion = textModel2.getVersionId();
        const result = await this.editorWorkerService.computeDiff(textModel1.uri, textModel2.uri, {
            ignoreTrimWhitespace: false,
            maxComputationTimeMs: 0,
            computeMoves: false,
        }, diffAlgorithm);
        if (!result) {
            throw new Error('Diff computation failed');
        }
        if (textModel1.isDisposed() || textModel2.isDisposed()) {
            return { diffs: null };
        }
        const changes = result.changes.map(c => new DetailedLineRangeMapping(toLineRange(c.original), textModel1, toLineRange(c.modified), textModel2, c.innerChanges?.map(ic => toRangeMapping(ic))));
        const newInputVersion = textModel1.getVersionId();
        const newOutputVersion = textModel2.getVersionId();
        if (inputVersion !== newInputVersion || outputVersion !== newOutputVersion) {
            return { diffs: null };
        }
        assertFn(() => {
            /*
            // This does not hold (see https://github.com/microsoft/vscode-copilot/issues/10610)
            // TODO@hediet the diff algorithm should just use compute a string edit that transforms the input to the output, nothing else

            for (const c of changes) {
                const inputRange = c.inputRange;
                const outputRange = c.outputRange;
                const inputTextModel = c.inputTextModel;
                const outputTextModel = c.outputTextModel;

                for (const map of c.rangeMappings) {
                    let inputRangesValid = inputRange.startLineNumber - 1 <= map.inputRange.startLineNumber
                        && map.inputRange.endLineNumber <= inputRange.endLineNumberExclusive;
                    if (inputRangesValid && map.inputRange.startLineNumber === inputRange.startLineNumber - 1) {
                        inputRangesValid = map.inputRange.endColumn >= inputTextModel.getLineMaxColumn(map.inputRange.startLineNumber);
                    }
                    if (inputRangesValid && map.inputRange.endLineNumber === inputRange.endLineNumberExclusive) {
                        inputRangesValid = map.inputRange.endColumn === 1;
                    }

                    let outputRangesValid = outputRange.startLineNumber - 1 <= map.outputRange.startLineNumber
                        && map.outputRange.endLineNumber <= outputRange.endLineNumberExclusive;
                    if (outputRangesValid && map.outputRange.startLineNumber === outputRange.startLineNumber - 1) {
                        outputRangesValid = map.outputRange.endColumn >= outputTextModel.getLineMaxColumn(map.outputRange.endLineNumber);
                    }
                    if (outputRangesValid && map.outputRange.endLineNumber === outputRange.endLineNumberExclusive) {
                        outputRangesValid = map.outputRange.endColumn === 1;
                    }

                    if (!inputRangesValid || !outputRangesValid) {
                        return false;
                    }
                }
            }*/
            return changes.length === 0 || (changes[0].inputRange.startLineNumber === changes[0].outputRange.startLineNumber &&
                checkAdjacentItems(changes, (m1, m2) => m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive === m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive &&
                    // There has to be an unchanged line in between (otherwise both diffs should have been joined)
                    m1.inputRange.endLineNumberExclusive < m2.inputRange.startLineNumber &&
                    m1.outputRange.endLineNumberExclusive < m2.outputRange.startLineNumber));
        });
        return {
            diffs: changes
        };
    }
};
MergeDiffComputer = __decorate([
    __param(0, IEditorWorkerService),
    __param(1, IConfigurationService)
], MergeDiffComputer);
export { MergeDiffComputer };
export function toLineRange(range) {
    return MergeEditorLineRange.fromLength(range.startLineNumber, range.length);
}
export function toRangeMapping(mapping) {
    return new RangeMapping(mapping.originalRange, mapping.modifiedRange);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL2RpZmZDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQVd0RyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjtJQUc3QixZQUN3QyxtQkFBeUMsRUFDeEMsb0JBQTJDO1FBRDVDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDeEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUVuRixJQUFJLENBQUMsY0FBYyxHQUFHLHFCQUFxQixDQUMxQywyQkFBMkIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDO2FBQ2xFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM5RSxD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