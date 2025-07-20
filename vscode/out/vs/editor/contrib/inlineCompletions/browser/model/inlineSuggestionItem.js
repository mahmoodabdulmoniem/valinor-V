/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { matchesSubString } from '../../../../../base/common/filters.js';
import { observableSignal } from '../../../../../base/common/observable.js';
import { commonPrefixLength, commonSuffixLength, splitLines } from '../../../../../base/common/strings.js';
import { applyEditsToRanges, StringEdit, StringReplacement } from '../../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
import { Range } from '../../../../common/core/range.js';
import { TextEdit } from '../../../../common/core/edits/textEdit.js';
import { StringText } from '../../../../common/core/text/abstractText.js';
import { TextLength } from '../../../../common/core/text/textLength.js';
import { linesDiffComputers } from '../../../../common/diff/linesDiffComputers.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { TextModelText } from '../../../../common/model/textModelText.js';
import { singleTextRemoveCommonPrefix } from './singleTextEditHelpers.js';
import { getPositionOffsetTransformerFromTextModel } from '../../../../common/core/text/getPositionOffsetTransformerFromTextModel.js';
export var InlineSuggestionItem;
(function (InlineSuggestionItem) {
    function create(data, textModel) {
        if (!data.isInlineEdit) {
            return InlineCompletionItem.create(data, textModel);
        }
        else {
            return InlineEditItem.create(data, textModel);
        }
    }
    InlineSuggestionItem.create = create;
})(InlineSuggestionItem || (InlineSuggestionItem = {}));
class InlineSuggestionItemBase {
    constructor(_data, identity, displayLocation) {
        this._data = _data;
        this.identity = identity;
        this.displayLocation = displayLocation;
    }
    /**
     * A reference to the original inline completion list this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    get source() { return this._data.source; }
    get isFromExplicitRequest() { return this._data.context.triggerKind === InlineCompletionTriggerKind.Explicit; }
    get forwardStable() { return this.source.inlineSuggestions.enableForwardStability ?? false; }
    get editRange() { return this.getSingleTextEdit().range; }
    get targetRange() { return this.displayLocation?.range ?? this.editRange; }
    get insertText() { return this.getSingleTextEdit().text; }
    get semanticId() { return this.hash; }
    get action() { return this._sourceInlineCompletion.action; }
    get command() { return this._sourceInlineCompletion.command; }
    get warning() { return this._sourceInlineCompletion.warning; }
    get showInlineEditMenu() { return !!this._sourceInlineCompletion.showInlineEditMenu; }
    get hash() {
        return JSON.stringify([
            this.getSingleTextEdit().text,
            this.getSingleTextEdit().range.getStartPosition().toString()
        ]);
    }
    /** @deprecated */
    get shownCommand() { return this._sourceInlineCompletion.shownCommand; }
    get requestUuid() { return this._data.context.requestUuid; }
    /**
     * A reference to the original inline completion this inline completion has been constructed from.
     * Used for event data to ensure referential equality.
    */
    get _sourceInlineCompletion() { return this._data.sourceInlineCompletion; }
    addRef() {
        this.identity.addRef();
        this.source.addRef();
    }
    removeRef() {
        this.identity.removeRef();
        this.source.removeRef();
    }
    reportInlineEditShown(commandService, viewKind, viewData) {
        this._data.reportInlineEditShown(commandService, this.insertText, viewKind, viewData);
    }
    reportPartialAccept(acceptedCharacters, info) {
        this._data.reportPartialAccept(acceptedCharacters, info);
    }
    reportEndOfLife(reason) {
        this._data.reportEndOfLife(reason);
    }
    setEndOfLifeReason(reason) {
        this._data.setEndOfLifeReason(reason);
    }
    reportInlineEditError(reason) {
        this._data.reportInlineEditError(reason);
    }
    setIsPreceeded() {
        this._data.setIsPreceeded();
    }
    /**
     * Avoid using this method. Instead introduce getters for the needed properties.
    */
    getSourceCompletion() {
        return this._sourceInlineCompletion;
    }
}
export class InlineSuggestionIdentity {
    constructor() {
        this._onDispose = observableSignal(this);
        this.onDispose = this._onDispose;
        this._refCount = 1;
        this.id = 'InlineCompletionIdentity' + InlineSuggestionIdentity.idCounter++;
    }
    static { this.idCounter = 0; }
    addRef() {
        this._refCount++;
    }
    removeRef() {
        this._refCount--;
        if (this._refCount === 0) {
            this._onDispose.trigger(undefined);
        }
    }
}
class InlineSuggestDisplayLocation {
    static create(displayLocation) {
        return new InlineSuggestDisplayLocation(displayLocation.range, displayLocation.label);
    }
    constructor(range, label) {
        this.range = range;
        this.label = label;
    }
    withEdit(edit, positionOffsetTransformer) {
        const offsetRange = new OffsetRange(positionOffsetTransformer.getOffset(this.range.getStartPosition()), positionOffsetTransformer.getOffset(this.range.getEndPosition()));
        const newOffsetRange = applyEditsToRanges([offsetRange], edit)[0];
        if (!newOffsetRange) {
            return undefined;
        }
        const newRange = positionOffsetTransformer.getRange(newOffsetRange);
        return new InlineSuggestDisplayLocation(newRange, this.label);
    }
}
export class InlineCompletionItem extends InlineSuggestionItemBase {
    static create(data, textModel) {
        const identity = new InlineSuggestionIdentity();
        const transformer = getPositionOffsetTransformerFromTextModel(textModel);
        const insertText = data.insertText.replace(/\r\n|\r|\n/g, textModel.getEOL());
        const edit = reshapeInlineCompletion(new StringReplacement(transformer.getOffsetRange(data.range), insertText), textModel);
        const trimmedEdit = edit.removeCommonSuffixAndPrefix(textModel.getValue());
        const textEdit = transformer.getTextReplacement(edit);
        const displayLocation = data.displayLocation ? InlineSuggestDisplayLocation.create(data.displayLocation) : undefined;
        return new InlineCompletionItem(edit, trimmedEdit, textEdit, textEdit.range, data.snippetInfo, data.additionalTextEdits, data, identity, displayLocation);
    }
    constructor(_edit, _trimmedEdit, _textEdit, _originalRange, snippetInfo, additionalTextEdits, data, identity, displayLocation) {
        super(data, identity, displayLocation);
        this._edit = _edit;
        this._trimmedEdit = _trimmedEdit;
        this._textEdit = _textEdit;
        this._originalRange = _originalRange;
        this.snippetInfo = snippetInfo;
        this.additionalTextEdits = additionalTextEdits;
        this.isInlineEdit = false;
    }
    get hash() {
        return JSON.stringify(this._trimmedEdit.toJson());
    }
    getSingleTextEdit() { return this._textEdit; }
    withIdentity(identity) {
        return new InlineCompletionItem(this._edit, this._trimmedEdit, this._textEdit, this._originalRange, this.snippetInfo, this.additionalTextEdits, this._data, identity, this.displayLocation);
    }
    withEdit(textModelEdit, textModel) {
        const newEditRange = applyEditsToRanges([this._edit.replaceRange], textModelEdit);
        if (newEditRange.length === 0) {
            return undefined;
        }
        const newEdit = new StringReplacement(newEditRange[0], this._textEdit.text);
        const positionOffsetTransformer = getPositionOffsetTransformerFromTextModel(textModel);
        const newTextEdit = positionOffsetTransformer.getTextReplacement(newEdit);
        let newDisplayLocation = this.displayLocation;
        if (newDisplayLocation) {
            newDisplayLocation = newDisplayLocation.withEdit(textModelEdit, positionOffsetTransformer);
            if (!newDisplayLocation) {
                return undefined;
            }
        }
        const trimmedEdit = newEdit.removeCommonSuffixAndPrefix(textModel.getValue());
        return new InlineCompletionItem(newEdit, trimmedEdit, newTextEdit, this._originalRange, this.snippetInfo, this.additionalTextEdits, this._data, this.identity, newDisplayLocation);
    }
    canBeReused(model, position) {
        // TODO@hediet I believe this can be simplified to `return true;`, as applying an edit should kick out this suggestion.
        const updatedRange = this._textEdit.range;
        const result = !!updatedRange
            && updatedRange.containsPosition(position)
            && this.isVisible(model, position)
            && TextLength.ofRange(updatedRange).isGreaterThanOrEqualTo(TextLength.ofRange(this._originalRange));
        return result;
    }
    isVisible(model, cursorPosition) {
        const singleTextEdit = this.getSingleTextEdit();
        return inlineCompletionIsVisible(singleTextEdit, this._originalRange, model, cursorPosition);
    }
}
export function inlineCompletionIsVisible(singleTextEdit, originalRange, model, cursorPosition) {
    const minimizedReplacement = singleTextRemoveCommonPrefix(singleTextEdit, model);
    const editRange = singleTextEdit.range;
    if (!editRange
        || (originalRange && !originalRange.getStartPosition().equals(editRange.getStartPosition()))
        || cursorPosition.lineNumber !== minimizedReplacement.range.startLineNumber
        || minimizedReplacement.isEmpty // if the completion is empty after removing the common prefix of the completion and the model, the completion item would not be visible
    ) {
        return false;
    }
    // We might consider comparing by .toLowerText, but this requires GhostTextReplacement
    const originalValue = model.getValueInRange(minimizedReplacement.range, 1 /* EndOfLinePreference.LF */);
    const filterText = minimizedReplacement.text;
    const cursorPosIndex = Math.max(0, cursorPosition.column - minimizedReplacement.range.startColumn);
    let filterTextBefore = filterText.substring(0, cursorPosIndex);
    let filterTextAfter = filterText.substring(cursorPosIndex);
    let originalValueBefore = originalValue.substring(0, cursorPosIndex);
    let originalValueAfter = originalValue.substring(cursorPosIndex);
    const originalValueIndent = model.getLineIndentColumn(minimizedReplacement.range.startLineNumber);
    if (minimizedReplacement.range.startColumn <= originalValueIndent) {
        // Remove indentation
        originalValueBefore = originalValueBefore.trimStart();
        if (originalValueBefore.length === 0) {
            originalValueAfter = originalValueAfter.trimStart();
        }
        filterTextBefore = filterTextBefore.trimStart();
        if (filterTextBefore.length === 0) {
            filterTextAfter = filterTextAfter.trimStart();
        }
    }
    return filterTextBefore.startsWith(originalValueBefore)
        && !!matchesSubString(originalValueAfter, filterTextAfter);
}
export class InlineEditItem extends InlineSuggestionItemBase {
    static create(data, textModel) {
        const offsetEdit = getStringEdit(textModel, data.range, data.insertText);
        const text = new TextModelText(textModel);
        const textEdit = TextEdit.fromStringEdit(offsetEdit, text);
        const singleTextEdit = textEdit.toReplacement(text);
        const identity = new InlineSuggestionIdentity();
        const edits = offsetEdit.replacements.map(edit => {
            const replacedRange = Range.fromPositions(textModel.getPositionAt(edit.replaceRange.start), textModel.getPositionAt(edit.replaceRange.endExclusive));
            const replacedText = textModel.getValueInRange(replacedRange);
            return SingleUpdatedNextEdit.create(edit, replacedText);
        });
        const displayLocation = data.displayLocation ? InlineSuggestDisplayLocation.create(data.displayLocation) : undefined;
        return new InlineEditItem(offsetEdit, singleTextEdit, data, identity, edits, displayLocation, false, textModel.getVersionId());
    }
    constructor(_edit, _textEdit, data, identity, _edits, displayLocation, _lastChangePartOfInlineEdit = false, _inlineEditModelVersion) {
        super(data, identity, displayLocation);
        this._edit = _edit;
        this._textEdit = _textEdit;
        this._edits = _edits;
        this._lastChangePartOfInlineEdit = _lastChangePartOfInlineEdit;
        this._inlineEditModelVersion = _inlineEditModelVersion;
        this.snippetInfo = undefined;
        this.additionalTextEdits = [];
        this.isInlineEdit = true;
    }
    get updatedEditModelVersion() { return this._inlineEditModelVersion; }
    get updatedEdit() { return this._edit; }
    getSingleTextEdit() {
        return this._textEdit;
    }
    withIdentity(identity) {
        return new InlineEditItem(this._edit, this._textEdit, this._data, identity, this._edits, this.displayLocation, this._lastChangePartOfInlineEdit, this._inlineEditModelVersion);
    }
    canBeReused(model, position) {
        // TODO@hediet I believe this can be simplified to `return true;`, as applying an edit should kick out this suggestion.
        return this._lastChangePartOfInlineEdit && this.updatedEditModelVersion === model.getVersionId();
    }
    withEdit(textModelChanges, textModel) {
        const edit = this._applyTextModelChanges(textModelChanges, this._edits, textModel);
        return edit;
    }
    _applyTextModelChanges(textModelChanges, edits, textModel) {
        edits = edits.map(innerEdit => innerEdit.applyTextModelChanges(textModelChanges));
        if (edits.some(edit => edit.edit === undefined)) {
            return undefined; // change is invalid, so we will have to drop the completion
        }
        const newTextModelVersion = textModel.getVersionId();
        let inlineEditModelVersion = this._inlineEditModelVersion;
        const lastChangePartOfInlineEdit = edits.some(edit => edit.lastChangeUpdatedEdit);
        if (lastChangePartOfInlineEdit) {
            inlineEditModelVersion = newTextModelVersion ?? -1;
        }
        if (newTextModelVersion === null || inlineEditModelVersion + 20 < newTextModelVersion) {
            return undefined; // the completion has been ignored for a while, remove it
        }
        edits = edits.filter(innerEdit => !innerEdit.edit.isEmpty);
        if (edits.length === 0) {
            return undefined; // the completion has been typed by the user
        }
        const newEdit = new StringEdit(edits.map(edit => edit.edit));
        const positionOffsetTransformer = getPositionOffsetTransformerFromTextModel(textModel);
        const newTextEdit = positionOffsetTransformer.getTextEdit(newEdit).toReplacement(new TextModelText(textModel));
        let newDisplayLocation = this.displayLocation;
        if (newDisplayLocation) {
            newDisplayLocation = newDisplayLocation.withEdit(textModelChanges, positionOffsetTransformer);
            if (!newDisplayLocation) {
                return undefined;
            }
        }
        return new InlineEditItem(newEdit, newTextEdit, this._data, this.identity, edits, newDisplayLocation, lastChangePartOfInlineEdit, inlineEditModelVersion);
    }
}
function getStringEdit(textModel, editRange, replaceText) {
    const eol = textModel.getEOL();
    const editOriginalText = textModel.getValueInRange(editRange);
    const editReplaceText = replaceText.replace(/\r\n|\r|\n/g, eol);
    const diffAlgorithm = linesDiffComputers.getDefault();
    const lineDiffs = diffAlgorithm.computeDiff(splitLines(editOriginalText), splitLines(editReplaceText), {
        ignoreTrimWhitespace: false,
        computeMoves: false,
        extendToSubwords: true,
        maxComputationTimeMs: 500,
    });
    const innerChanges = lineDiffs.changes.flatMap(c => c.innerChanges ?? []);
    function addRangeToPos(pos, range) {
        const start = TextLength.fromPosition(range.getStartPosition());
        return TextLength.ofRange(range).createRange(start.addToPosition(pos));
    }
    const modifiedText = new StringText(editReplaceText);
    const offsetEdit = new StringEdit(innerChanges.map(c => {
        const rangeInModel = addRangeToPos(editRange.getStartPosition(), c.originalRange);
        const originalRange = getPositionOffsetTransformerFromTextModel(textModel).getOffsetRange(rangeInModel);
        const replaceText = modifiedText.getValueOfRange(c.modifiedRange);
        const edit = new StringReplacement(originalRange, replaceText);
        const originalText = textModel.getValueInRange(rangeInModel);
        return reshapeInlineEdit(edit, originalText, innerChanges.length, textModel);
    }));
    return offsetEdit;
}
class SingleUpdatedNextEdit {
    static create(edit, replacedText) {
        const prefixLength = commonPrefixLength(edit.newText, replacedText);
        const suffixLength = commonSuffixLength(edit.newText, replacedText);
        const trimmedNewText = edit.newText.substring(prefixLength, edit.newText.length - suffixLength);
        return new SingleUpdatedNextEdit(edit, trimmedNewText, prefixLength, suffixLength);
    }
    get edit() { return this._edit; }
    get lastChangeUpdatedEdit() { return this._lastChangeUpdatedEdit; }
    constructor(_edit, _trimmedNewText, _prefixLength, _suffixLength, _lastChangeUpdatedEdit = false) {
        this._edit = _edit;
        this._trimmedNewText = _trimmedNewText;
        this._prefixLength = _prefixLength;
        this._suffixLength = _suffixLength;
        this._lastChangeUpdatedEdit = _lastChangeUpdatedEdit;
    }
    applyTextModelChanges(textModelChanges) {
        const c = this._clone();
        c._applyTextModelChanges(textModelChanges);
        return c;
    }
    _clone() {
        return new SingleUpdatedNextEdit(this._edit, this._trimmedNewText, this._prefixLength, this._suffixLength, this._lastChangeUpdatedEdit);
    }
    _applyTextModelChanges(textModelChanges) {
        this._lastChangeUpdatedEdit = false;
        if (!this._edit) {
            throw new BugIndicatingError('UpdatedInnerEdits: No edit to apply changes to');
        }
        const result = this._applyChanges(this._edit, textModelChanges);
        if (!result) {
            this._edit = undefined;
            return;
        }
        this._edit = result.edit;
        this._lastChangeUpdatedEdit = result.editHasChanged;
    }
    _applyChanges(edit, textModelChanges) {
        let editStart = edit.replaceRange.start;
        let editEnd = edit.replaceRange.endExclusive;
        let editReplaceText = edit.newText;
        let editHasChanged = false;
        const shouldPreserveEditShape = this._prefixLength > 0 || this._suffixLength > 0;
        for (let i = textModelChanges.replacements.length - 1; i >= 0; i--) {
            const change = textModelChanges.replacements[i];
            // INSERTIONS (only support inserting at start of edit)
            const isInsertion = change.newText.length > 0 && change.replaceRange.isEmpty;
            if (isInsertion && !shouldPreserveEditShape && change.replaceRange.start === editStart && editReplaceText.startsWith(change.newText)) {
                editStart += change.newText.length;
                editReplaceText = editReplaceText.substring(change.newText.length);
                editEnd = Math.max(editStart, editEnd);
                editHasChanged = true;
                continue;
            }
            if (isInsertion && shouldPreserveEditShape && change.replaceRange.start === editStart + this._prefixLength && this._trimmedNewText.startsWith(change.newText)) {
                editEnd += change.newText.length;
                editHasChanged = true;
                this._prefixLength += change.newText.length;
                this._trimmedNewText = this._trimmedNewText.substring(change.newText.length);
                continue;
            }
            // DELETIONS
            const isDeletion = change.newText.length === 0 && change.replaceRange.length > 0;
            if (isDeletion && change.replaceRange.start >= editStart + this._prefixLength && change.replaceRange.endExclusive <= editEnd - this._suffixLength) {
                // user deleted text IN-BETWEEN the deletion range
                editEnd -= change.replaceRange.length;
                editHasChanged = true;
                continue;
            }
            // user did exactly the edit
            if (change.equals(edit)) {
                editHasChanged = true;
                editStart = change.replaceRange.endExclusive;
                editReplaceText = '';
                continue;
            }
            // MOVE EDIT
            if (change.replaceRange.start > editEnd) {
                // the change happens after the completion range
                continue;
            }
            if (change.replaceRange.endExclusive < editStart) {
                // the change happens before the completion range
                editStart += change.newText.length - change.replaceRange.length;
                editEnd += change.newText.length - change.replaceRange.length;
                continue;
            }
            // The change intersects the completion, so we will have to drop the completion
            return undefined;
        }
        // the resulting edit is a noop as the original and new text are the same
        if (this._trimmedNewText.length === 0 && editStart + this._prefixLength === editEnd - this._suffixLength) {
            return { edit: new StringReplacement(new OffsetRange(editStart + this._prefixLength, editStart + this._prefixLength), ''), editHasChanged: true };
        }
        return { edit: new StringReplacement(new OffsetRange(editStart, editEnd), editReplaceText), editHasChanged };
    }
}
function reshapeInlineCompletion(edit, textModel) {
    // If the insertion is a multi line insertion starting on the next line
    // Move it forwards so that the multi line insertion starts on the current line
    const eol = textModel.getEOL();
    if (edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        edit = reshapeMultiLineInsertion(edit, textModel);
    }
    return edit;
}
function reshapeInlineEdit(edit, originalText, totalInnerEdits, textModel) {
    // TODO: EOL are not properly trimmed by the diffAlgorithm #12680
    const eol = textModel.getEOL();
    if (edit.newText.endsWith(eol) && originalText.endsWith(eol)) {
        edit = new StringReplacement(edit.replaceRange.deltaEnd(-eol.length), edit.newText.slice(0, -eol.length));
    }
    // INSERTION
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (totalInnerEdits === 1 && edit.replaceRange.isEmpty && edit.newText.includes(eol)) {
        const startPosition = textModel.getPositionAt(edit.replaceRange.start);
        const hasTextOnInsertionLine = textModel.getLineLength(startPosition.lineNumber) !== 0;
        if (hasTextOnInsertionLine) {
            edit = reshapeMultiLineInsertion(edit, textModel);
        }
    }
    // The diff algorithm extended a simple edit to the entire word
    // shrink it back to a simple edit if it is deletion/insertion only
    if (totalInnerEdits === 1) {
        const prefixLength = commonPrefixLength(originalText, edit.newText);
        const suffixLength = commonSuffixLength(originalText.slice(prefixLength), edit.newText.slice(prefixLength));
        // reshape it back to an insertion
        if (prefixLength + suffixLength === originalText.length) {
            return new StringReplacement(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), edit.newText.substring(prefixLength, edit.newText.length - suffixLength));
        }
        // reshape it back to a deletion
        if (prefixLength + suffixLength === edit.newText.length) {
            return new StringReplacement(edit.replaceRange.deltaStart(prefixLength).deltaEnd(-suffixLength), '');
        }
    }
    return edit;
}
function reshapeMultiLineInsertion(edit, textModel) {
    if (!edit.replaceRange.isEmpty) {
        throw new BugIndicatingError('Unexpected original range');
    }
    if (edit.replaceRange.start === 0) {
        return edit;
    }
    const eol = textModel.getEOL();
    const startPosition = textModel.getPositionAt(edit.replaceRange.start);
    const startColumn = startPosition.column;
    const startLineNumber = startPosition.lineNumber;
    // If the insertion ends with a new line and is inserted at the start of a line which has text,
    // we move the insertion to the end of the previous line if possible
    if (startColumn === 1 && startLineNumber > 1 && edit.newText.endsWith(eol) && !edit.newText.startsWith(eol)) {
        return new StringReplacement(edit.replaceRange.delta(-1), eol + edit.newText.slice(0, -eol.length));
    }
    return edit;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lU3VnZ2VzdGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvaW5saW5lU3VnZ2VzdGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRzNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNoSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNuRixPQUFPLEVBQW9CLDJCQUEyQixFQUF3RixNQUFNLGlDQUFpQyxDQUFDO0FBRXRMLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFB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