var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { TaskQueue } from '../../../../../base/common/async.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableValue, transaction } from '../../../../../base/common/observable.js';
import { setTimeout0 } from '../../../../../base/common/platform.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TextLength } from '../../../core/text/textLength.js';
import { gotoParent, getClosestPreviousNodes, nextSiblingOrParentSibling, gotoNthChild } from './cursorUtils.js';
import { Range } from '../../../core/range.js';
let TreeSitterTree = class TreeSitterTree extends Disposable {
    constructor(languageId, _ranges, 
    // readonly treeSitterLanguage: Language,
    /** Must have the language set! */
    _parser, _parserClass, 
    // private readonly _injectionQuery: TreeSitter.Query,
    textModel, _logService, _telemetryService) {
        super();
        this.languageId = languageId;
        this._ranges = _ranges;
        this._parser = _parser;
        this._parserClass = _parserClass;
        this.textModel = textModel;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._tree = observableValue(this, undefined);
        this.tree = this._tree;
        this._treeLastParsedVersion = observableValue(this, -1);
        this.treeLastParsedVersion = this._treeLastParsedVersion;
        this._onDidChangeContentQueue = new TaskQueue();
        this._tree = observableValue(this, undefined);
        this.tree = this._tree;
        this._register(toDisposable(() => {
            this._tree.get()?.delete();
            this._lastFullyParsed?.delete();
            this._lastFullyParsedWithEdits?.delete();
            this._parser.delete();
        }));
        this.handleContentChange(undefined, this._ranges);
    }
    handleContentChange(e, ranges) {
        const version = this.textModel.getVersionId();
        let newRanges = [];
        if (ranges) {
            newRanges = this._setRanges(ranges);
        }
        if (e) {
            this._applyEdits(e.changes);
        }
        this._onDidChangeContentQueue.clearPending();
        this._onDidChangeContentQueue.schedule(async () => {
            if (this._store.isDisposed) {
                // No need to continue the queue if we are disposed
                return;
            }
            const oldTree = this._lastFullyParsed;
            let changedNodes;
            if (this._lastFullyParsedWithEdits && this._lastFullyParsed) {
                changedNodes = this._findChangedNodes(this._lastFullyParsedWithEdits, this._lastFullyParsed);
            }
            const completed = await this._parseAndUpdateTree(version);
            if (completed) {
                let ranges;
                if (!changedNodes) {
                    if (this._ranges) {
                        ranges = this._ranges.map(r => ({ newRange: new Range(r.startPosition.row + 1, r.startPosition.column + 1, r.endPosition.row + 1, r.endPosition.column + 1), oldRangeLength: r.endIndex - r.startIndex, newRangeStartOffset: r.startIndex, newRangeEndOffset: r.endIndex }));
                    }
                }
                else if (oldTree && changedNodes) {
                    ranges = this._findTreeChanges(completed, changedNodes, newRanges);
                }
                if (!ranges) {
                    ranges = [{ newRange: this.textModel.getFullModelRange(), newRangeStartOffset: 0, newRangeEndOffset: this.textModel.getValueLength() }];
                }
                const previousTree = this._tree.get();
                transaction(tx => {
                    this._tree.set(completed, tx, { ranges, versionId: version });
                    this._treeLastParsedVersion.set(version, tx);
                });
                previousTree?.delete();
            }
        });
    }
    get ranges() {
        return this._ranges;
    }
    getInjectionTrees(startIndex, languageId) {
        // TODO
        return undefined;
    }
    _applyEdits(changes) {
        for (const change of changes) {
            const originalTextLength = TextLength.ofRange(Range.lift(change.range));
            const newTextLength = TextLength.ofText(change.text);
            const summedTextLengths = change.text.length === 0 ? newTextLength : originalTextLength.add(newTextLength);
            const edit = {
                startIndex: change.rangeOffset,
                oldEndIndex: change.rangeOffset + change.rangeLength,
                newEndIndex: change.rangeOffset + change.text.length,
                startPosition: { row: change.range.startLineNumber - 1, column: change.range.startColumn - 1 },
                oldEndPosition: { row: change.range.endLineNumber - 1, column: change.range.endColumn - 1 },
                newEndPosition: { row: change.range.startLineNumber + summedTextLengths.lineCount - 1, column: summedTextLengths.lineCount ? summedTextLengths.columnCount : (change.range.endColumn + summedTextLengths.columnCount) }
            };
            this._tree.get()?.edit(edit);
            this._lastFullyParsedWithEdits?.edit(edit);
        }
    }
    _findChangedNodes(newTree, oldTree) {
        if ((this._ranges && this._ranges.every(range => range.startPosition.row !== newTree.rootNode.startPosition.row)) || newTree.rootNode.startPosition.row !== 0) {
            return [];
        }
        const newCursor = newTree.walk();
        const oldCursor = oldTree.walk();
        const nodes = [];
        let next = true;
        do {
            if (newCursor.currentNode.hasChanges) {
                // Check if only one of the children has changes.
                // If it's only one, then we go to that child.
                // If it's more then, we need to go to each child
                // If it's none, then we've found one of our ranges
                const newChildren = newCursor.currentNode.children;
                const indexChangedChildren = [];
                const changedChildren = newChildren.filter((c, index) => {
                    if (c?.hasChanges || (oldCursor.currentNode.children.length <= index)) {
                        indexChangedChildren.push(index);
                        return true;
                    }
                    return false;
                });
                // If we have changes and we *had* an error, the whole node should be refreshed.
                if ((changedChildren.length === 0) || (newCursor.currentNode.hasError !== oldCursor.currentNode.hasError)) {
                    // walk up again until we get to the first one that's named as unnamed nodes can be too granular
                    while (newCursor.currentNode.parent && next && !newCursor.currentNode.isNamed) {
                        next = gotoParent(newCursor, oldCursor);
                    }
                    // Use the end position of the previous node and the start position of the current node
                    const newNode = newCursor.currentNode;
                    const closestPreviousNode = getClosestPreviousNodes(newCursor, newTree) ?? newNode;
                    nodes.push({
                        startIndex: closestPreviousNode.startIndex,
                        endIndex: newNode.endIndex,
                        startPosition: closestPreviousNode.startPosition,
                        endPosition: newNode.endPosition
                    });
                    next = nextSiblingOrParentSibling(newCursor, oldCursor);
                }
                else if (changedChildren.length >= 1) {
                    next = gotoNthChild(newCursor, oldCursor, indexChangedChildren[0]);
                }
            }
            else {
                next = nextSiblingOrParentSibling(newCursor, oldCursor);
            }
        } while (next);
        newCursor.delete();
        oldCursor.delete();
        return nodes;
    }
    _findTreeChanges(newTree, changedNodes, newRanges) {
        let newRangeIndex = 0;
        const mergedChanges = [];
        // Find the parent in the new tree of the changed node
        for (let nodeIndex = 0; nodeIndex < changedNodes.length; nodeIndex++) {
            const node = changedNodes[nodeIndex];
            if (mergedChanges.length > 0) {
                if ((node.startIndex >= mergedChanges[mergedChanges.length - 1].newRangeStartOffset) && (node.endIndex <= mergedChanges[mergedChanges.length - 1].newRangeEndOffset)) {
                    // This node is within the previous range, skip it
                    continue;
                }
            }
            const cursor = newTree.walk();
            const cursorContainersNode = () => cursor.startIndex < node.startIndex && cursor.endIndex > node.endIndex;
            while (cursorContainersNode()) {
                // See if we can go to a child
                let child = cursor.gotoFirstChild();
                let foundChild = false;
                while (child) {
                    if (cursorContainersNode() && cursor.currentNode.isNamed) {
                        foundChild = true;
                        break;
                    }
                    else {
                        child = cursor.gotoNextSibling();
                    }
                }
                if (!foundChild) {
                    cursor.gotoParent();
                    break;
                }
                if (cursor.currentNode.childCount === 0) {
                    break;
                }
            }
            const startPosition = cursor.currentNode.startPosition;
            const endPosition = cursor.currentNode.endPosition;
            const startIndex = cursor.currentNode.startIndex;
            const endIndex = cursor.currentNode.endIndex;
            const newChange = { newRange: new Range(startPosition.row + 1, startPosition.column + 1, endPosition.row + 1, endPosition.column + 1), newRangeStartOffset: startIndex, newRangeEndOffset: endIndex };
            if ((newRangeIndex < newRanges.length) && rangesIntersect(newRanges[newRangeIndex], { startIndex, endIndex, startPosition, endPosition })) {
                // combine the new change with the range
                if (newRanges[newRangeIndex].startIndex < newChange.newRangeStartOffset) {
                    newChange.newRange = newChange.newRange.setStartPosition(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1);
                    newChange.newRangeStartOffset = newRanges[newRangeIndex].startIndex;
                }
                if (newRanges[newRangeIndex].endIndex > newChange.newRangeEndOffset) {
                    newChange.newRange = newChange.newRange.setEndPosition(newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1);
                    newChange.newRangeEndOffset = newRanges[newRangeIndex].endIndex;
                }
                newRangeIndex++;
            }
            else if (newRangeIndex < newRanges.length && newRanges[newRangeIndex].endIndex < newChange.newRangeStartOffset) {
                // add the full range to the merged changes
                mergedChanges.push({
                    newRange: new Range(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1, newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1),
                    newRangeStartOffset: newRanges[newRangeIndex].startIndex,
                    newRangeEndOffset: newRanges[newRangeIndex].endIndex
                });
            }
            if ((mergedChanges.length > 0) && (mergedChanges[mergedChanges.length - 1].newRangeEndOffset >= newChange.newRangeStartOffset)) {
                // Merge the changes
                mergedChanges[mergedChanges.length - 1].newRange = Range.fromPositions(mergedChanges[mergedChanges.length - 1].newRange.getStartPosition(), newChange.newRange.getEndPosition());
                mergedChanges[mergedChanges.length - 1].newRangeEndOffset = newChange.newRangeEndOffset;
            }
            else {
                mergedChanges.push(newChange);
            }
        }
        return this._constrainRanges(mergedChanges);
    }
    _constrainRanges(changes) {
        if (!this._ranges) {
            return changes;
        }
        const constrainedChanges = [];
        let changesIndex = 0;
        let rangesIndex = 0;
        while (changesIndex < changes.length && rangesIndex < this._ranges.length) {
            const change = changes[changesIndex];
            const range = this._ranges[rangesIndex];
            if (change.newRangeEndOffset < range.startIndex) {
                // Change is before the range, move to the next change
                changesIndex++;
            }
            else if (change.newRangeStartOffset > range.endIndex) {
                // Change is after the range, move to the next range
                rangesIndex++;
            }
            else {
                // Change is within the range, constrain it
                const newRangeStartOffset = Math.max(change.newRangeStartOffset, range.startIndex);
                const newRangeEndOffset = Math.min(change.newRangeEndOffset, range.endIndex);
                const newRange = change.newRange.intersectRanges(new Range(range.startPosition.row + 1, range.startPosition.column + 1, range.endPosition.row + 1, range.endPosition.column + 1));
                constrainedChanges.push({
                    newRange,
                    newRangeEndOffset,
                    newRangeStartOffset
                });
                // Remove the intersected range from the current change
                if (newRangeEndOffset < change.newRangeEndOffset) {
                    change.newRange = Range.fromPositions(newRange.getEndPosition(), change.newRange.getEndPosition());
                    change.newRangeStartOffset = newRangeEndOffset + 1;
                }
                else {
                    // Move to the next change
                    changesIndex++;
                }
            }
        }
        return constrainedChanges;
    }
    async _parseAndUpdateTree(version) {
        const tree = await this._parse();
        if (tree) {
            this._lastFullyParsed?.delete();
            this._lastFullyParsed = tree.copy();
            this._lastFullyParsedWithEdits?.delete();
            this._lastFullyParsedWithEdits = tree.copy();
            return tree;
        }
        else if (!this._tree.get()) {
            // No tree means this is the initial parse and there were edits
            // parse function doesn't handle this well and we can end up with an incorrect tree, so we reset
            this._parser.reset();
        }
        return undefined;
    }
    _parse() {
        let parseType = "fullParse" /* TelemetryParseType.Full */;
        if (this._tree.get()) {
            parseType = "incrementalParse" /* TelemetryParseType.Incremental */;
        }
        return this._parseAndYield(parseType);
    }
    async _parseAndYield(parseType) {
        let time = 0;
        let passes = 0;
        const inProgressVersion = this.textModel.getVersionId();
        let newTree;
        const progressCallback = newTimeOutProgressCallback();
        do {
            const timer = performance.now();
            newTree = this._parser.parse((index, position) => this._parseCallback(index), this._tree.get(), { progressCallback, includedRanges: this._ranges });
            time += performance.now() - timer;
            passes++;
            // So long as this isn't the initial parse, even if the model changes and edits are applied, the tree parsing will continue correctly after the await.
            await new Promise(resolve => setTimeout0(resolve));
        } while (!this._store.isDisposed && !newTree && inProgressVersion === this.textModel.getVersionId());
        this._sendParseTimeTelemetry(parseType, time, passes);
        return (newTree && (inProgressVersion === this.textModel.getVersionId())) ? newTree : undefined;
    }
    _parseCallback(index) {
        try {
            return this.textModel.getTextBuffer().getNearestChunk(index);
        }
        catch (e) {
            this._logService.debug('Error getting chunk for tree-sitter parsing', e);
        }
        return undefined;
    }
    _setRanges(newRanges) {
        const unKnownRanges = [];
        // If we have existing ranges, find the parts of the new ranges that are not included in the existing ones
        if (this._ranges) {
            for (const newRange of newRanges) {
                let isFullyIncluded = false;
                for (let i = 0; i < this._ranges.length; i++) {
                    const existingRange = this._ranges[i];
                    if (rangesEqual(existingRange, newRange) || rangesIntersect(existingRange, newRange)) {
                        isFullyIncluded = true;
                        break;
                    }
                }
                if (!isFullyIncluded) {
                    unKnownRanges.push(newRange);
                }
            }
        }
        else {
            // No existing ranges, all new ranges are unknown
            unKnownRanges.push(...newRanges);
        }
        this._ranges = newRanges;
        return unKnownRanges;
    }
    _sendParseTimeTelemetry(parseType, time, passes) {
        this._logService.debug(`Tree parsing (${parseType}) took ${time} ms and ${passes} passes.`);
        if (parseType === "fullParse" /* TelemetryParseType.Full */) {
            this._telemetryService.publicLog2(`treeSitter.fullParse`, { languageId: this.languageId, time, passes });
        }
        else {
            this._telemetryService.publicLog2(`treeSitter.incrementalParse`, { languageId: this.languageId, time, passes });
        }
    }
    createParsedTreeSync(src) {
        const parser = new this._parserClass();
        parser.setLanguage(this._parser.language);
        const tree = parser.parse(src);
        parser.delete();
        return tree ?? undefined;
    }
};
TreeSitterTree = __decorate([
    __param(5, ILogService),
    __param(6, ITelemetryService)
], TreeSitterTree);
export { TreeSitterTree };
var TelemetryParseType;
(function (TelemetryParseType) {
    TelemetryParseType["Full"] = "fullParse";
    TelemetryParseType["Incremental"] = "incrementalParse";
})(TelemetryParseType || (TelemetryParseType = {}));
function newTimeOutProgressCallback() {
    let lastYieldTime = performance.now();
    return function parseProgressCallback(_state) {
        const now = performance.now();
        if (now - lastYieldTime > 50) {
            lastYieldTime = now;
            return true;
        }
        return false;
    };
}
export function rangesEqual(a, b) {
    return (a.startPosition.row === b.startPosition.row)
        && (a.startPosition.column === b.startPosition.column)
        && (a.endPosition.row === b.endPosition.row)
        && (a.endPosition.column === b.endPosition.column)
        && (a.startIndex === b.startIndex)
        && (a.endIndex === b.endIndex);
}
export function rangesIntersect(a, b) {
    return (a.startIndex <= b.startIndex && a.endIndex >= b.startIndex) ||
        (b.startIndex <= a.startIndex && b.endIndex >= a.startIndex);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5zL3RyZWVTaXR0ZXIvdHJlZVNpdHRlclRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUFlLGVBQWUsRUFBRSxXQUFXLEVBQXlCLE1BQU0sMENBQTBDLENBQUM7QUFDNUgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFeEMsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFhN0MsWUFDaUIsVUFBa0IsRUFDMUIsT0FBdUM7SUFDL0MseUNBQXlDO0lBQ3pDLGtDQUFrQztJQUNqQixPQUEwQixFQUMxQixZQUFzQztJQUN2RCxzREFBc0Q7SUFDdEMsU0FBb0IsRUFDdkIsV0FBeUMsRUFDbkMsaUJBQXFEO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBWFEsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUMxQixZQUFPLEdBQVAs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