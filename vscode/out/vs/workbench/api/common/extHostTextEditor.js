/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok } from '../../../base/common/assert.js';
import { ReadonlyError, illegalArgument } from '../../../base/common/errors.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { EndOfLine, Position, Range, Selection, TextEditorRevealType } from './extHostTypes.js';
export class TextEditorDecorationType {
    static { this._Keys = new IdGenerator('TextEditorDecorationType'); }
    constructor(proxy, extension, options) {
        const key = TextEditorDecorationType._Keys.nextId();
        proxy.$registerTextEditorDecorationType(extension.identifier, key, TypeConverters.DecorationRenderOptions.from(options));
        this.value = Object.freeze({
            key,
            dispose() {
                proxy.$removeTextEditorDecorationType(key);
            }
        });
    }
}
class TextEditorEdit {
    constructor(document, options) {
        this._collectedEdits = [];
        this._setEndOfLine = undefined;
        this._finalized = false;
        this._document = document;
        this._documentVersionId = document.version;
        this._undoStopBefore = options.undoStopBefore;
        this._undoStopAfter = options.undoStopAfter;
    }
    finalize() {
        this._finalized = true;
        return {
            documentVersionId: this._documentVersionId,
            edits: this._collectedEdits,
            setEndOfLine: this._setEndOfLine,
            undoStopBefore: this._undoStopBefore,
            undoStopAfter: this._undoStopAfter
        };
    }
    _throwIfFinalized() {
        if (this._finalized) {
            throw new Error('Edit is only valid while callback runs');
        }
    }
    replace(location, value) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Position) {
            range = new Range(location, location);
        }
        else if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, value, false);
    }
    insert(location, value) {
        this._throwIfFinalized();
        this._pushEdit(new Range(location, location), value, true);
    }
    delete(location) {
        this._throwIfFinalized();
        let range = null;
        if (location instanceof Range) {
            range = location;
        }
        else {
            throw new Error('Unrecognized location');
        }
        this._pushEdit(range, null, true);
    }
    _pushEdit(range, text, forceMoveMarkers) {
        const validRange = this._document.validateRange(range);
        this._collectedEdits.push({
            range: validRange,
            text: text,
            forceMoveMarkers: forceMoveMarkers
        });
    }
    setEndOfLine(endOfLine) {
        this._throwIfFinalized();
        if (endOfLine !== EndOfLine.LF && endOfLine !== EndOfLine.CRLF) {
            throw illegalArgument('endOfLine');
        }
        this._setEndOfLine = endOfLine;
    }
}
export class ExtHostTextEditorOptions {
    constructor(proxy, id, source, logService) {
        this._proxy = proxy;
        this._id = id;
        this._accept(source);
        this._logService = logService;
        const that = this;
        this.value = {
            get tabSize() {
                return that._tabSize;
            },
            set tabSize(value) {
                that._setTabSize(value);
            },
            get indentSize() {
                return that._indentSize;
            },
            set indentSize(value) {
                that._setIndentSize(value);
            },
            get insertSpaces() {
                return that._insertSpaces;
            },
            set insertSpaces(value) {
                that._setInsertSpaces(value);
            },
            get cursorStyle() {
                return that._cursorStyle;
            },
            set cursorStyle(value) {
                that._setCursorStyle(value);
            },
            get lineNumbers() {
                return that._lineNumbers;
            },
            set lineNumbers(value) {
                that._setLineNumbers(value);
            }
        };
    }
    _accept(source) {
        this._tabSize = source.tabSize;
        this._indentSize = source.indentSize;
        this._originalIndentSize = source.originalIndentSize;
        this._insertSpaces = source.insertSpaces;
        this._cursorStyle = source.cursorStyle;
        this._lineNumbers = TypeConverters.TextEditorLineNumbersStyle.to(source.lineNumbers);
    }
    // --- internal: tabSize
    _validateTabSize(value) {
        if (value === 'auto') {
            return 'auto';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return (r > 0 ? r : null);
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return (r > 0 ? r : null);
        }
        return null;
    }
    _setTabSize(value) {
        const tabSize = this._validateTabSize(value);
        if (tabSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof tabSize === 'number') {
            if (this._tabSize === tabSize) {
                // nothing to do
                return;
            }
            // reflect the new tabSize value immediately
            this._tabSize = tabSize;
        }
        this._warnOnError('setTabSize', this._proxy.$trySetOptions(this._id, {
            tabSize: tabSize
        }));
    }
    // --- internal: indentSize
    _validateIndentSize(value) {
        if (value === 'tabSize') {
            return 'tabSize';
        }
        if (typeof value === 'number') {
            const r = Math.floor(value);
            return (r > 0 ? r : null);
        }
        if (typeof value === 'string') {
            const r = parseInt(value, 10);
            if (isNaN(r)) {
                return null;
            }
            return (r > 0 ? r : null);
        }
        return null;
    }
    _setIndentSize(value) {
        const indentSize = this._validateIndentSize(value);
        if (indentSize === null) {
            // ignore invalid call
            return;
        }
        if (typeof indentSize === 'number') {
            if (this._originalIndentSize === indentSize) {
                // nothing to do
                return;
            }
            // reflect the new indentSize value immediately
            this._indentSize = indentSize;
            this._originalIndentSize = indentSize;
        }
        this._warnOnError('setIndentSize', this._proxy.$trySetOptions(this._id, {
            indentSize: indentSize
        }));
    }
    // --- internal: insert spaces
    _validateInsertSpaces(value) {
        if (value === 'auto') {
            return 'auto';
        }
        return (value === 'false' ? false : Boolean(value));
    }
    _setInsertSpaces(value) {
        const insertSpaces = this._validateInsertSpaces(value);
        if (typeof insertSpaces === 'boolean') {
            if (this._insertSpaces === insertSpaces) {
                // nothing to do
                return;
            }
            // reflect the new insertSpaces value immediately
            this._insertSpaces = insertSpaces;
        }
        this._warnOnError('setInsertSpaces', this._proxy.$trySetOptions(this._id, {
            insertSpaces: insertSpaces
        }));
    }
    // --- internal: cursor style
    _setCursorStyle(value) {
        if (this._cursorStyle === value) {
            // nothing to do
            return;
        }
        this._cursorStyle = value;
        this._warnOnError('setCursorStyle', this._proxy.$trySetOptions(this._id, {
            cursorStyle: value
        }));
    }
    // --- internal: line number
    _setLineNumbers(value) {
        if (this._lineNumbers === value) {
            // nothing to do
            return;
        }
        this._lineNumbers = value;
        this._warnOnError('setLineNumbers', this._proxy.$trySetOptions(this._id, {
            lineNumbers: TypeConverters.TextEditorLineNumbersStyle.from(value)
        }));
    }
    assign(newOptions) {
        const bulkConfigurationUpdate = {};
        let hasUpdate = false;
        if (typeof newOptions.tabSize !== 'undefined') {
            const tabSize = this._validateTabSize(newOptions.tabSize);
            if (tabSize === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
            else if (typeof tabSize === 'number' && this._tabSize !== tabSize) {
                // reflect the new tabSize value immediately
                this._tabSize = tabSize;
                hasUpdate = true;
                bulkConfigurationUpdate.tabSize = tabSize;
            }
        }
        if (typeof newOptions.indentSize !== 'undefined') {
            const indentSize = this._validateIndentSize(newOptions.indentSize);
            if (indentSize === 'tabSize') {
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
            else if (typeof indentSize === 'number' && this._originalIndentSize !== indentSize) {
                // reflect the new indentSize value immediately
                this._indentSize = indentSize;
                this._originalIndentSize = indentSize;
                hasUpdate = true;
                bulkConfigurationUpdate.indentSize = indentSize;
            }
        }
        if (typeof newOptions.insertSpaces !== 'undefined') {
            const insertSpaces = this._validateInsertSpaces(newOptions.insertSpaces);
            if (insertSpaces === 'auto') {
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
            else if (this._insertSpaces !== insertSpaces) {
                // reflect the new insertSpaces value immediately
                this._insertSpaces = insertSpaces;
                hasUpdate = true;
                bulkConfigurationUpdate.insertSpaces = insertSpaces;
            }
        }
        if (typeof newOptions.cursorStyle !== 'undefined') {
            if (this._cursorStyle !== newOptions.cursorStyle) {
                this._cursorStyle = newOptions.cursorStyle;
                hasUpdate = true;
                bulkConfigurationUpdate.cursorStyle = newOptions.cursorStyle;
            }
        }
        if (typeof newOptions.lineNumbers !== 'undefined') {
            if (this._lineNumbers !== newOptions.lineNumbers) {
                this._lineNumbers = newOptions.lineNumbers;
                hasUpdate = true;
                bulkConfigurationUpdate.lineNumbers = TypeConverters.TextEditorLineNumbersStyle.from(newOptions.lineNumbers);
            }
        }
        if (hasUpdate) {
            this._warnOnError('setOptions', this._proxy.$trySetOptions(this._id, bulkConfigurationUpdate));
        }
    }
    _warnOnError(action, promise) {
        promise.catch(err => {
            this._logService.warn(`ExtHostTextEditorOptions '${action}' failed:'`);
            this._logService.warn(err);
        });
    }
}
export class ExtHostTextEditor {
    constructor(id, _proxy, _logService, document, selections, options, visibleRanges, viewColumn) {
        this.id = id;
        this._proxy = _proxy;
        this._logService = _logService;
        this._disposed = false;
        this._hasDecorationsForKey = new Set();
        this._selections = selections;
        this._options = new ExtHostTextEditorOptions(this._proxy, this.id, options, _logService);
        this._visibleRanges = visibleRanges;
        this._viewColumn = viewColumn;
        const that = this;
        this.value = Object.freeze({
            get document() {
                return document.value;
            },
            set document(_value) {
                throw new ReadonlyError('document');
            },
            // --- selection
            get selection() {
                return that._selections && that._selections[0];
            },
            set selection(value) {
                if (!(value instanceof Selection)) {
                    throw illegalArgument('selection');
                }
                that._selections = [value];
                that._trySetSelection();
            },
            get selections() {
                return that._selections;
            },
            set selections(value) {
                if (!Array.isArray(value) || value.some(a => !(a instanceof Selection))) {
                    throw illegalArgument('selections');
                }
                if (value.length === 0) {
                    value = [new Selection(0, 0, 0, 0)];
                }
                that._selections = value;
                that._trySetSelection();
            },
            // --- visible ranges
            get visibleRanges() {
                return that._visibleRanges;
            },
            set visibleRanges(_value) {
                throw new ReadonlyError('visibleRanges');
            },
            get diffInformation() {
                return that._diffInformation;
            },
            // --- options
            get options() {
                return that._options.value;
            },
            set options(value) {
                if (!that._disposed) {
                    that._options.assign(value);
                }
            },
            // --- view column
            get viewColumn() {
                return that._viewColumn;
            },
            set viewColumn(_value) {
                throw new ReadonlyError('viewColumn');
            },
            // --- edit
            edit(callback, options = { undoStopBefore: true, undoStopAfter: true }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#edit not possible on closed editors'));
                }
                const edit = new TextEditorEdit(document.value, options);
                callback(edit);
                return that._applyEdit(edit);
            },
            // --- snippet edit
            insertSnippet(snippet, where, options = { undoStopBefore: true, undoStopAfter: true }) {
                if (that._disposed) {
                    return Promise.reject(new Error('TextEditor#insertSnippet not possible on closed editors'));
                }
                let ranges;
                if (!where || (Array.isArray(where) && where.length === 0)) {
                    ranges = that._selections.map(range => TypeConverters.Range.from(range));
                }
                else if (where instanceof Position) {
                    const { lineNumber, column } = TypeConverters.Position.from(where);
                    ranges = [{ startLineNumber: lineNumber, startColumn: column, endLineNumber: lineNumber, endColumn: column }];
                }
                else if (where instanceof Range) {
                    ranges = [TypeConverters.Range.from(where)];
                }
                else {
                    ranges = [];
                    for (const posOrRange of where) {
                        if (posOrRange instanceof Range) {
                            ranges.push(TypeConverters.Range.from(posOrRange));
                        }
                        else {
                            const { lineNumber, column } = TypeConverters.Position.from(posOrRange);
                            ranges.push({ startLineNumber: lineNumber, startColumn: column, endLineNumber: lineNumber, endColumn: column });
                        }
                    }
                }
                if (options.keepWhitespace === undefined) {
                    options.keepWhitespace = false;
                }
                return _proxy.$tryInsertSnippet(id, document.value.version, snippet.value, ranges, options);
            },
            setDecorations(decorationType, ranges) {
                const willBeEmpty = (ranges.length === 0);
                if (willBeEmpty && !that._hasDecorationsForKey.has(decorationType.key)) {
                    // avoid no-op call to the renderer
                    return;
                }
                if (willBeEmpty) {
                    that._hasDecorationsForKey.delete(decorationType.key);
                }
                else {
                    that._hasDecorationsForKey.add(decorationType.key);
                }
                that._runOnProxy(() => {
                    if (TypeConverters.isDecorationOptionsArr(ranges)) {
                        return _proxy.$trySetDecorations(id, decorationType.key, TypeConverters.fromRangeOrRangeWithMessage(ranges));
                    }
                    else {
                        const _ranges = new Array(4 * ranges.length);
                        for (let i = 0, len = ranges.length; i < len; i++) {
                            const range = ranges[i];
                            _ranges[4 * i] = range.start.line + 1;
                            _ranges[4 * i + 1] = range.start.character + 1;
                            _ranges[4 * i + 2] = range.end.line + 1;
                            _ranges[4 * i + 3] = range.end.character + 1;
                        }
                        return _proxy.$trySetDecorationsFast(id, decorationType.key, _ranges);
                    }
                });
            },
            revealRange(range, revealType) {
                that._runOnProxy(() => _proxy.$tryRevealRange(id, TypeConverters.Range.from(range), (revealType || TextEditorRevealType.Default)));
            },
            show(column) {
                _proxy.$tryShowEditor(id, TypeConverters.ViewColumn.from(column));
            },
            hide() {
                _proxy.$tryHideEditor(id);
            },
            [Symbol.for('debug.description')]() {
                return `TextEditor(${this.document.uri.toString()})`;
            }
        });
    }
    dispose() {
        ok(!this._disposed);
        this._disposed = true;
    }
    // --- incoming: extension host MUST accept what the renderer says
    _acceptOptions(options) {
        ok(!this._disposed);
        this._options._accept(options);
    }
    _acceptVisibleRanges(value) {
        ok(!this._disposed);
        this._visibleRanges = value;
    }
    _acceptViewColumn(value) {
        ok(!this._disposed);
        this._viewColumn = value;
    }
    _acceptSelections(selections) {
        ok(!this._disposed);
        this._selections = selections;
    }
    _acceptDiffInformation(diffInformation) {
        ok(!this._disposed);
        this._diffInformation = diffInformation;
    }
    async _trySetSelection() {
        const selection = this._selections.map(TypeConverters.Selection.from);
        await this._runOnProxy(() => this._proxy.$trySetSelections(this.id, selection));
        return this.value;
    }
    _applyEdit(editBuilder) {
        const editData = editBuilder.finalize();
        // return when there is nothing to do
        if (editData.edits.length === 0 && !editData.setEndOfLine) {
            return Promise.resolve(true);
        }
        // check that the edits are not overlapping (i.e. illegal)
        const editRanges = editData.edits.map(edit => edit.range);
        // sort ascending (by end and then by start)
        editRanges.sort((a, b) => {
            if (a.end.line === b.end.line) {
                if (a.end.character === b.end.character) {
                    if (a.start.line === b.start.line) {
                        return a.start.character - b.start.character;
                    }
                    return a.start.line - b.start.line;
                }
                return a.end.character - b.end.character;
            }
            return a.end.line - b.end.line;
        });
        // check that no edits are overlapping
        for (let i = 0, count = editRanges.length - 1; i < count; i++) {
            const rangeEnd = editRanges[i].end;
            const nextRangeStart = editRanges[i + 1].start;
            if (nextRangeStart.isBefore(rangeEnd)) {
                // overlapping ranges
                return Promise.reject(new Error('Overlapping ranges are not allowed!'));
            }
        }
        // prepare data for serialization
        const edits = editData.edits.map((edit) => {
            return {
                range: TypeConverters.Range.from(edit.range),
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers
            };
        });
        return this._proxy.$tryApplyEdits(this.id, editData.documentVersionId, edits, {
            setEndOfLine: typeof editData.setEndOfLine === 'number' ? TypeConverters.EndOfLine.from(editData.setEndOfLine) : undefined,
            undoStopBefore: editData.undoStopBefore,
            undoStopAfter: editData.undoStopAfter
        });
    }
    _runOnProxy(callback) {
        if (this._disposed) {
            this._logService.warn('TextEditor is closed/disposed');
            return Promise.resolve(undefined);
        }
        return callback().then(() => this, err => {
            if (!(err instanceof Error && err.name === 'DISPOSED')) {
                this._logService.warn(err);
            }
            return null;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZXh0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUtsRSxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQTZDLG9CQUFvQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFNM0ksTUFBTSxPQUFPLHdCQUF3QjthQUVaLFVBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBSTVFLFlBQVksS0FBaUMsRUFBRSxTQUFnQyxFQUFFLE9BQXVDO1FBQ3ZILE1BQU0sR0FBRyxHQUFHLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwRCxLQUFLLENBQUMsaUNBQWlDLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMxQixHQUFHO1lBQ0gsT0FBTztnQkFDTixLQUFLLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENB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