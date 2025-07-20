/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, observableFromEvent } from '../../../../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { rangeIsSingleLine } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/diffEditorViewZones.js';
import { OffsetRange } from '../../../../../../common/core/ranges/offsetRange.js';
import { Range } from '../../../../../../common/core/range.js';
import { InjectedTextCursorStops } from '../../../../../../common/model.js';
import { ModelDecorationOptions } from '../../../../../../common/model/textModel.js';
import { classNames } from '../utils/utils.js';
export class OriginalEditorInlineDiffView extends Disposable {
    static supportsInlineDiffRendering(mapping) {
        return allowsTrueInlineDiffRendering(mapping);
    }
    constructor(_originalEditor, _state, _modifiedTextModel) {
        super();
        this._originalEditor = _originalEditor;
        this._state = _state;
        this._modifiedTextModel = _modifiedTextModel;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.isHovered = observableCodeEditor(this._originalEditor).isTargetHovered(p => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof InlineEditAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this._tokenizationFinished = modelTokenizationFinished(this._modifiedTextModel);
        this._decorations = derived(this, reader => {
            const diff = this._state.read(reader);
            if (!diff) {
                return undefined;
            }
            const modified = diff.modifiedText;
            const showInline = diff.mode === 'insertionInline';
            const hasOneInnerChange = diff.diff.length === 1 && diff.diff[0].innerChanges?.length === 1;
            const showEmptyDecorations = true;
            const originalDecorations = [];
            const modifiedDecorations = [];
            const diffLineAddDecorationBackground = ModelDecorationOptions.register({
                className: 'inlineCompletions-line-insert',
                description: 'line-insert',
                isWholeLine: true,
                marginClassName: 'gutter-insert',
            });
            const diffLineDeleteDecorationBackground = ModelDecorationOptions.register({
                className: 'inlineCompletions-line-delete',
                description: 'line-delete',
                isWholeLine: true,
                marginClassName: 'gutter-delete',
            });
            const diffWholeLineDeleteDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-delete',
                description: 'char-delete',
                isWholeLine: false,
                zIndex: 1, // be on top of diff background decoration
            });
            const diffWholeLineAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                isWholeLine: true,
            });
            const diffAddDecoration = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert',
                description: 'char-insert',
                shouldFillLineOnLineBreak: true,
            });
            const diffAddDecorationEmpty = ModelDecorationOptions.register({
                className: 'inlineCompletions-char-insert diff-range-empty',
                description: 'char-insert diff-range-empty',
            });
            const NESOriginalBackground = ModelDecorationOptions.register({
                className: 'inlineCompletions-original-lines',
                description: 'inlineCompletions-original-lines',
                isWholeLine: false,
                shouldFillLineOnLineBreak: true,
            });
            const showFullLineDecorations = diff.mode !== 'sideBySide' && diff.mode !== 'deletion' && diff.mode !== 'insertionInline' && diff.mode !== 'lineReplacement';
            const hideEmptyInnerDecorations = diff.mode === 'lineReplacement';
            for (const m of diff.diff) {
                if (showFullLineDecorations) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({
                            range: m.original.toInclusiveRange(),
                            options: diffLineDeleteDecorationBackground,
                        });
                    }
                    if (!m.modified.isEmpty) {
                        modifiedDecorations.push({
                            range: m.modified.toInclusiveRange(),
                            options: diffLineAddDecorationBackground,
                        });
                    }
                }
                if (m.modified.isEmpty || m.original.isEmpty) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({ range: m.original.toInclusiveRange(), options: diffWholeLineDeleteDecoration });
                    }
                    if (!m.modified.isEmpty) {
                        modifiedDecorations.push({ range: m.modified.toInclusiveRange(), options: diffWholeLineAddDecoration });
                    }
                }
                else {
                    const useInlineDiff = showInline && allowsTrueInlineDiffRendering(m);
                    for (const i of m.innerChanges || []) {
                        // Don't show empty markers outside the line range
                        if (m.original.contains(i.originalRange.startLineNumber) && !(hideEmptyInnerDecorations && i.originalRange.isEmpty())) {
                            const replacedText = this._originalEditor.getModel()?.getValueInRange(i.originalRange, 1 /* EndOfLinePreference.LF */);
                            originalDecorations.push({
                                range: i.originalRange,
                                options: {
                                    description: 'char-delete',
                                    shouldFillLineOnLineBreak: false,
                                    className: classNames('inlineCompletions-char-delete', i.originalRange.isSingleLine() && diff.mode === 'insertionInline' && 'single-line-inline', i.originalRange.isEmpty() && 'empty', ((i.originalRange.isEmpty() && hasOneInnerChange || diff.mode === 'deletion' && replacedText === '\n') && showEmptyDecorations && !useInlineDiff) && 'diff-range-empty'),
                                    inlineClassName: useInlineDiff ? classNames('strike-through', 'inlineCompletions') : null,
                                    zIndex: 1
                                }
                            });
                        }
                        if (m.modified.contains(i.modifiedRange.startLineNumber)) {
                            modifiedDecorations.push({
                                range: i.modifiedRange,
                                options: (i.modifiedRange.isEmpty() && showEmptyDecorations && !useInlineDiff && hasOneInnerChange)
                                    ? diffAddDecorationEmpty
                                    : diffAddDecoration
                            });
                        }
                        if (useInlineDiff) {
                            const insertedText = modified.getValueOfRange(i.modifiedRange);
                            // when the injected text becomes long, the editor will split it into multiple spans
                            // to be able to get the border around the start and end of the text, we need to split it into multiple segments
                            const textSegments = insertedText.length > 3 ?
                                [
                                    { text: insertedText.slice(0, 1), extraClasses: ['start'], offsetRange: new OffsetRange(i.modifiedRange.startColumn - 1, i.modifiedRange.startColumn) },
                                    { text: insertedText.slice(1, -1), extraClasses: [], offsetRange: new OffsetRange(i.modifiedRange.startColumn, i.modifiedRange.endColumn - 2) },
                                    { text: insertedText.slice(-1), extraClasses: ['end'], offsetRange: new OffsetRange(i.modifiedRange.endColumn - 2, i.modifiedRange.endColumn - 1) }
                                ] :
                                [
                                    { text: insertedText, extraClasses: ['start', 'end'], offsetRange: new OffsetRange(i.modifiedRange.startColumn - 1, i.modifiedRange.endColumn) }
                                ];
                            // Tokenization
                            this._tokenizationFinished.read(reader); // reconsider when tokenization is finished
                            const lineTokens = this._modifiedTextModel.tokenization.getLineTokens(i.modifiedRange.startLineNumber);
                            for (const { text, extraClasses, offsetRange } of textSegments) {
                                originalDecorations.push({
                                    range: Range.fromPositions(i.originalRange.getEndPosition()),
                                    options: {
                                        description: 'inserted-text',
                                        before: {
                                            tokens: lineTokens.getTokensInRange(offsetRange),
                                            content: text,
                                            inlineClassName: classNames('inlineCompletions-char-insert', i.modifiedRange.isSingleLine() && diff.mode === 'insertionInline' && 'single-line-inline', ...extraClasses // include extraClasses for additional styling if provided
                                            ),
                                            cursorStops: InjectedTextCursorStops.None,
                                            attachedData: new InlineEditAttachedData(this),
                                        },
                                        zIndex: 2,
                                        showIfCollapsed: true,
                                    }
                                });
                            }
                        }
                    }
                }
            }
            if (diff.isInDiffEditor) {
                for (const m of diff.diff) {
                    if (!m.original.isEmpty) {
                        originalDecorations.push({
                            range: m.original.toExclusiveRange(),
                            options: NESOriginalBackground,
                        });
                    }
                }
            }
            return { originalDecorations, modifiedDecorations };
        });
        this._register(observableCodeEditor(this._originalEditor).setDecorations(this._decorations.map(d => d?.originalDecorations ?? [])));
        const modifiedCodeEditor = this._state.map(s => s?.modifiedCodeEditor);
        this._register(autorunWithStore((reader, store) => {
            const e = modifiedCodeEditor.read(reader);
            if (e) {
                store.add(observableCodeEditor(e).setDecorations(this._decorations.map(d => d?.modifiedDecorations ?? [])));
            }
        }));
        this._register(this._originalEditor.onMouseUp(e => {
            if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                return;
            }
            const a = e.target.detail.injectedText?.options.attachedData;
            if (a instanceof InlineEditAttachedData && a.owner === this) {
                this._onDidClick.fire(e.event);
            }
        }));
    }
}
class InlineEditAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function allowsTrueInlineDiffRendering(mapping) {
    if (!mapping.innerChanges) {
        return false;
    }
    return mapping.innerChanges.every(c => (rangeIsSingleLine(c.modifiedRange) && rangeIsSingleLine(c.originalRange)));
}
let i = 0;
function modelTokenizationFinished(model) {
    return observableFromEvent(model.onDidChangeTokens, () => i++);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luYWxFZGl0b3JJbmxpbmVEaWZmVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3Mvb3JpZ2luYWxFZGl0b3JJbmxpbmVEaWZmVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU3SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtR0FBbUcsQ0FBQztBQUN0SSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRy9ELE9BQU8sRUFBOEMsdUJBQXVCLEVBQWMsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwSSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVyRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFXL0MsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFVBQVU7SUFDcEQsTUFBTSxDQUFDLDJCQUEyQixDQUFDLE9BQWlDO1FBQzFFLE9BQU8sNkJBQTZCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQVNELFlBQ2tCLGVBQTRCLEVBQzVCLE1BQW1F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