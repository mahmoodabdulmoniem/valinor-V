/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { assertFn } from '../../../../base/common/assert.js';
import { LineRange } from '../../core/ranges/lineRange.js';
import { OffsetRange } from '../../core/ranges/offsetRange.js';
import { Range } from '../../core/range.js';
import { ArrayText } from '../../core/text/abstractText.js';
import { LinesDiff, MovedText } from '../linesDiffComputer.js';
import { DetailedLineRangeMapping, LineRangeMapping, lineRangeMappingFromRangeMappings, RangeMapping } from '../rangeMapping.js';
import { DateTimeout, InfiniteTimeout, SequenceDiff } from './algorithms/diffAlgorithm.js';
import { DynamicProgrammingDiffing } from './algorithms/dynamicProgrammingDiffing.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { computeMovedLines } from './computeMovedLines.js';
import { extendDiffsToEntireWordIfAppropriate, optimizeSequenceDiffs, removeShortMatches, removeVeryShortMatchingLinesBetweenDiffs, removeVeryShortMatchingTextBetweenLongDiffs } from './heuristicSequenceOptimizations.js';
import { LineSequence } from './lineSequence.js';
import { LinesSliceCharSequence } from './linesSliceCharSequence.js';
export class DefaultLinesDiffComputer {
    constructor() {
        this.dynamicProgrammingDiffing = new DynamicProgrammingDiffing();
        this.myersDiffingAlgorithm = new MyersDiffAlgorithm();
    }
    computeDiff(originalLines, modifiedLines, options) {
        if (originalLines.length <= 1 && equals(originalLines, modifiedLines, (a, b) => a === b)) {
            return new LinesDiff([], [], false);
        }
        if (originalLines.length === 1 && originalLines[0].length === 0 || modifiedLines.length === 1 && modifiedLines[0].length === 0) {
            return new LinesDiff([
                new DetailedLineRangeMapping(new LineRange(1, originalLines.length + 1), new LineRange(1, modifiedLines.length + 1), [
                    new RangeMapping(new Range(1, 1, originalLines.length, originalLines[originalLines.length - 1].length + 1), new Range(1, 1, modifiedLines.length, modifiedLines[modifiedLines.length - 1].length + 1))
                ])
            ], [], false);
        }
        const timeout = options.maxComputationTimeMs === 0 ? InfiniteTimeout.instance : new DateTimeout(options.maxComputationTimeMs);
        const considerWhitespaceChanges = !options.ignoreTrimWhitespace;
        const perfectHashes = new Map();
        function getOrCreateHash(text) {
            let hash = perfectHashes.get(text);
            if (hash === undefined) {
                hash = perfectHashes.size;
                perfectHashes.set(text, hash);
            }
            return hash;
        }
        const originalLinesHashes = originalLines.map((l) => getOrCreateHash(l.trim()));
        const modifiedLinesHashes = modifiedLines.map((l) => getOrCreateHash(l.trim()));
        const sequence1 = new LineSequence(originalLinesHashes, originalLines);
        const sequence2 = new LineSequence(modifiedLinesHashes, modifiedLines);
        const lineAlignmentResult = (() => {
            if (sequence1.length + sequence2.length < 1700) {
                // Use the improved algorithm for small files
                return this.dynamicProgrammingDiffing.compute(sequence1, sequence2, timeout, (offset1, offset2) => originalLines[offset1] === modifiedLines[offset2]
                    ? modifiedLines[offset2].length === 0
                        ? 0.1
                        : 1 + Math.log(1 + modifiedLines[offset2].length)
                    : 0.99);
            }
            return this.myersDiffingAlgorithm.compute(sequence1, sequence2, timeout);
        })();
        let lineAlignments = lineAlignmentResult.diffs;
        let hitTimeout = lineAlignmentResult.hitTimeout;
        lineAlignments = optimizeSequenceDiffs(sequence1, sequence2, lineAlignments);
        lineAlignments = removeVeryShortMatchingLinesBetweenDiffs(sequence1, sequence2, lineAlignments);
        const alignments = [];
        const scanForWhitespaceChanges = (equalLinesCount) => {
            if (!considerWhitespaceChanges) {
                return;
            }
            for (let i = 0; i < equalLinesCount; i++) {
                const seq1Offset = seq1LastStart + i;
                const seq2Offset = seq2LastStart + i;
                if (originalLines[seq1Offset] !== modifiedLines[seq2Offset]) {
                    // This is because of whitespace changes, diff these lines
                    const characterDiffs = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(new OffsetRange(seq1Offset, seq1Offset + 1), new OffsetRange(seq2Offset, seq2Offset + 1)), timeout, considerWhitespaceChanges, options);
                    for (const a of characterDiffs.mappings) {
                        alignments.push(a);
                    }
                    if (characterDiffs.hitTimeout) {
                        hitTimeout = true;
                    }
                }
            }
        };
        let seq1LastStart = 0;
        let seq2LastStart = 0;
        for (const diff of lineAlignments) {
            assertFn(() => diff.seq1Range.start - seq1LastStart === diff.seq2Range.start - seq2LastStart);
            const equalLinesCount = diff.seq1Range.start - seq1LastStart;
            scanForWhitespaceChanges(equalLinesCount);
            seq1LastStart = diff.seq1Range.endExclusive;
            seq2LastStart = diff.seq2Range.endExclusive;
            const characterDiffs = this.refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options);
            if (characterDiffs.hitTimeout) {
                hitTimeout = true;
            }
            for (const a of characterDiffs.mappings) {
                alignments.push(a);
            }
        }
        scanForWhitespaceChanges(originalLines.length - seq1LastStart);
        const original = new ArrayText(originalLines);
        const modified = new ArrayText(modifiedLines);
        const changes = lineRangeMappingFromRangeMappings(alignments, original, modified);
        let moves = [];
        if (options.computeMoves) {
            moves = this.computeMoves(changes, originalLines, modifiedLines, originalLinesHashes, modifiedLinesHashes, timeout, considerWhitespaceChanges, options);
        }
        // Make sure all ranges are valid
        assertFn(() => {
            function validatePosition(pos, lines) {
                if (pos.lineNumber < 1 || pos.lineNumber > lines.length) {
                    return false;
                }
                const line = lines[pos.lineNumber - 1];
                if (pos.column < 1 || pos.column > line.length + 1) {
                    return false;
                }
                return true;
            }
            function validateRange(range, lines) {
                if (range.startLineNumber < 1 || range.startLineNumber > lines.length + 1) {
                    return false;
                }
                if (range.endLineNumberExclusive < 1 || range.endLineNumberExclusive > lines.length + 1) {
                    return false;
                }
                return true;
            }
            for (const c of changes) {
                if (!c.innerChanges) {
                    return false;
                }
                for (const ic of c.innerChanges) {
                    const valid = validatePosition(ic.modifiedRange.getStartPosition(), modifiedLines) && validatePosition(ic.modifiedRange.getEndPosition(), modifiedLines) &&
                        validatePosition(ic.originalRange.getStartPosition(), originalLines) && validatePosition(ic.originalRange.getEndPosition(), originalLines);
                    if (!valid) {
                        return false;
                    }
                }
                if (!validateRange(c.modified, modifiedLines) || !validateRange(c.original, originalLines)) {
                    return false;
                }
            }
            return true;
        });
        return new LinesDiff(changes, moves, hitTimeout);
    }
    computeMoves(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout, considerWhitespaceChanges, options) {
        const moves = computeMovedLines(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout);
        const movesWithDiffs = moves.map(m => {
            const moveChanges = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(m.original.toOffsetRange(), m.modified.toOffsetRange()), timeout, considerWhitespaceChanges, options);
            const mappings = lineRangeMappingFromRangeMappings(moveChanges.mappings, new ArrayText(originalLines), new ArrayText(modifiedLines), true);
            return new MovedText(m, mappings);
        });
        return movesWithDiffs;
    }
    refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options) {
        const lineRangeMapping = toLineRangeMapping(diff);
        const rangeMapping = lineRangeMapping.toRangeMapping2(originalLines, modifiedLines);
        const slice1 = new LinesSliceCharSequence(originalLines, rangeMapping.originalRange, considerWhitespaceChanges);
        const slice2 = new LinesSliceCharSequence(modifiedLines, rangeMapping.modifiedRange, considerWhitespaceChanges);
        const diffResult = slice1.length + slice2.length < 500
            ? this.dynamicProgrammingDiffing.compute(slice1, slice2, timeout)
            : this.myersDiffingAlgorithm.compute(slice1, slice2, timeout);
        const check = false;
        let diffs = diffResult.diffs;
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = optimizeSequenceDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findWordContaining(idx));
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        if (options.extendToSubwords) {
            diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findSubWordContaining(idx), true);
            if (check) {
                SequenceDiff.assertSorted(diffs);
            }
        }
        diffs = removeShortMatches(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = removeVeryShortMatchingTextBetweenLongDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        const result = diffs.map((d) => new RangeMapping(slice1.translateRange(d.seq1Range), slice2.translateRange(d.seq2Range)));
        if (check) {
            RangeMapping.assertSorted(result);
        }
        // Assert: result applied on original should be the same as diff applied to original
        return {
            mappings: result,
            hitTimeout: diffResult.hitTimeout,
        };
    }
}
function toLineRangeMapping(sequenceDiff) {
    return new LineRangeMapping(new LineRange(sequenceDiff.seq1Range.start + 1, sequenceDiff.seq1Range.endExclusive + 1), new LineRange(sequenceDiff.seq2Range.start + 1, sequenceDiff.seq2Range.endExclusive + 1));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RCxPQUFPLEVBQWlELFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsaUNBQWlDLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDakksT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQVksWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDM0QsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLHdDQUF3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