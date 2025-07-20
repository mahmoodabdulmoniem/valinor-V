/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from './core/range.js';
/**
 * @internal
 */
export var RawContentChangedType;
(function (RawContentChangedType) {
    RawContentChangedType[RawContentChangedType["Flush"] = 1] = "Flush";
    RawContentChangedType[RawContentChangedType["LineChanged"] = 2] = "LineChanged";
    RawContentChangedType[RawContentChangedType["LinesDeleted"] = 3] = "LinesDeleted";
    RawContentChangedType[RawContentChangedType["LinesInserted"] = 4] = "LinesInserted";
    RawContentChangedType[RawContentChangedType["EOLChanged"] = 5] = "EOLChanged";
})(RawContentChangedType || (RawContentChangedType = {}));
/**
 * An event describing that a model has been reset to a new value.
 * @internal
 */
export class ModelRawFlush {
    constructor() {
        this.changeType = 1 /* RawContentChangedType.Flush */;
    }
}
/**
 * Represents text injected on a line
 * @internal
 */
export class LineInjectedText {
    static applyInjectedText(lineText, injectedTexts) {
        if (!injectedTexts || injectedTexts.length === 0) {
            return lineText;
        }
        let result = '';
        let lastOriginalOffset = 0;
        for (const injectedText of injectedTexts) {
            result += lineText.substring(lastOriginalOffset, injectedText.column - 1);
            lastOriginalOffset = injectedText.column - 1;
            result += injectedText.options.content;
        }
        result += lineText.substring(lastOriginalOffset);
        return result;
    }
    static fromDecorations(decorations) {
        const result = [];
        for (const decoration of decorations) {
            if (decoration.options.before && decoration.options.before.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.startLineNumber, decoration.range.startColumn, decoration.options.before, 0));
            }
            if (decoration.options.after && decoration.options.after.content.length > 0) {
                result.push(new LineInjectedText(decoration.ownerId, decoration.range.endLineNumber, decoration.range.endColumn, decoration.options.after, 1));
            }
        }
        result.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.column === b.column) {
                    return a.order - b.order;
                }
                return a.column - b.column;
            }
            return a.lineNumber - b.lineNumber;
        });
        return result;
    }
    constructor(ownerId, lineNumber, column, options, order) {
        this.ownerId = ownerId;
        this.lineNumber = lineNumber;
        this.column = column;
        this.options = options;
        this.order = order;
    }
    withText(text) {
        return new LineInjectedText(this.ownerId, this.lineNumber, this.column, { ...this.options, content: text }, this.order);
    }
}
/**
 * An event describing that a line has changed in a model.
 * @internal
 */
export class ModelRawLineChanged {
    constructor(lineNumber, detail, injectedText) {
        this.changeType = 2 /* RawContentChangedType.LineChanged */;
        this.lineNumber = lineNumber;
        this.detail = detail;
        this.injectedText = injectedText;
    }
}
/**
 * An event describing that a line height has changed in the model.
 * @internal
 */
export class ModelLineHeightChanged {
    constructor(ownerId, decorationId, lineNumber, lineHeight) {
        this.ownerId = ownerId;
        this.decorationId = decorationId;
        this.lineNumber = lineNumber;
        this.lineHeight = lineHeight;
    }
}
/**
 * An event describing that a line height has changed in the model.
 * @internal
 */
export class ModelFontChanged {
    constructor(ownerId, lineNumber) {
        this.ownerId = ownerId;
        this.lineNumber = lineNumber;
    }
}
/**
 * An event describing that line(s) have been deleted in a model.
 * @internal
 */
export class ModelRawLinesDeleted {
    constructor(fromLineNumber, toLineNumber) {
        this.changeType = 3 /* RawContentChangedType.LinesDeleted */;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
    }
}
/**
 * An event describing that line(s) have been inserted in a model.
 * @internal
 */
export class ModelRawLinesInserted {
    constructor(fromLineNumber, toLineNumber, detail, injectedTexts) {
        this.changeType = 4 /* RawContentChangedType.LinesInserted */;
        this.injectedTexts = injectedTexts;
        this.fromLineNumber = fromLineNumber;
        this.toLineNumber = toLineNumber;
        this.detail = detail;
    }
}
/**
 * An event describing that a model has had its EOL changed.
 * @internal
 */
export class ModelRawEOLChanged {
    constructor() {
        this.changeType = 5 /* RawContentChangedType.EOLChanged */;
    }
}
/**
 * An event describing a change in the text of a model.
 * @internal
 */
export class ModelRawContentChangedEvent {
    constructor(changes, versionId, isUndoing, isRedoing) {
        this.changes = changes;
        this.versionId = versionId;
        this.isUndoing = isUndoing;
        this.isRedoing = isRedoing;
        this.resultingSelection = null;
    }
    containsEvent(type) {
        for (let i = 0, len = this.changes.length; i < len; i++) {
            const change = this.changes[i];
            if (change.changeType === type) {
                return true;
            }
        }
        return false;
    }
    static merge(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const versionId = b.versionId;
        const isUndoing = (a.isUndoing || b.isUndoing);
        const isRedoing = (a.isRedoing || b.isRedoing);
        return new ModelRawContentChangedEvent(changes, versionId, isUndoing, isRedoing);
    }
}
/**
 * An event describing a change in injected text.
 * @internal
 */
export class ModelInjectedTextChangedEvent {
    constructor(changes) {
        this.changes = changes;
    }
}
/**
 * An event describing a change of a line height.
 * @internal
 */
export class ModelLineHeightChangedEvent {
    constructor(changes) {
        this.changes = changes;
    }
    affects(rangeOrPosition) {
        if (Range.isIRange(rangeOrPosition)) {
            for (const change of this.changes) {
                if (change.lineNumber >= rangeOrPosition.startLineNumber && change.lineNumber <= rangeOrPosition.endLineNumber) {
                    return true;
                }
            }
            return false;
        }
        else {
            for (const change of this.changes) {
                if (change.lineNumber === rangeOrPosition.lineNumber) {
                    return true;
                }
            }
            return false;
        }
    }
}
/**
 * An event describing a change in fonts.
 * @internal
 */
export class ModelFontChangedEvent {
    constructor(changes) {
        this.changes = changes;
    }
}
/**
 * @internal
 */
export class InternalModelContentChangeEvent {
    constructor(rawContentChangedEvent, contentChangedEvent) {
        this.rawContentChangedEvent = rawContentChangedEvent;
        this.contentChangedEvent = contentChangedEvent;
    }
    merge(other) {
        const rawContentChangedEvent = ModelRawContentChangedEvent.merge(this.rawContentChangedEvent, other.rawContentChangedEvent);
        const contentChangedEvent = InternalModelContentChangeEvent._mergeChangeEvents(this.contentChangedEvent, other.contentChangedEvent);
        return new InternalModelContentChangeEvent(rawContentChangedEvent, contentChangedEvent);
    }
    static _mergeChangeEvents(a, b) {
        const changes = [].concat(a.changes).concat(b.changes);
        const eol = b.eol;
        const versionId = b.versionId;
        const isUndoing = (a.isUndoing || b.isUndoing);
        const isRedoing = (a.isRedoing || b.isRedoing);
        const isFlush = (a.isFlush || b.isFlush);
        const isEolChange = a.isEolChange && b.isEolChange; // both must be true to not confuse listeners who skip such edits
        return {
            changes: changes,
            eol: eol,
            isEolChange: isEolChange,
            versionId: versionId,
            isUndoing: isUndoing,
            isRedoing: isRedoing,
            isFlush: isFlush,
            detailedReasons: a.detailedReasons.concat(b.detailedReasons),
            detailedReasonsChangeLengths: a.detailedReasonsChangeLengths.concat(b.detailedReasonsChangeLengths),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRXZlbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3RleHRNb2RlbEV2ZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUEyS2hEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHFCQU1qQjtBQU5ELFdBQWtCLHFCQUFxQjtJQUN0QyxtRUFBUyxDQUFBO0lBQ1QsK0VBQWUsQ0FBQTtJQUNmLGlGQUFnQixDQUFBO0lBQ2hCLG1GQUFpQixDQUFBO0lBQ2pCLDZFQUFjLENBQUE7QUFDZixDQUFDLEVBTmlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFNdEM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQUNpQixlQUFVLHVDQUErQjtJQUMxRCxDQUFDO0NBQUE7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFnQixFQUFFLGFBQXdDO1FBQ3pGLElBQUksQ0FBQyxhQUFhLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBQ0QsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMxRSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsTUFBTSxH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