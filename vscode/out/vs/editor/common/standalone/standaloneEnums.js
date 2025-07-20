/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
export var AccessibilitySupport;
(function (AccessibilitySupport) {
    /**
     * This should be the browser case where it is not known if a screen reader is attached or no.
     */
    AccessibilitySupport[AccessibilitySupport["Unknown"] = 0] = "Unknown";
    AccessibilitySupport[AccessibilitySupport["Disabled"] = 1] = "Disabled";
    AccessibilitySupport[AccessibilitySupport["Enabled"] = 2] = "Enabled";
})(AccessibilitySupport || (AccessibilitySupport = {}));
export var CodeActionTriggerType;
(function (CodeActionTriggerType) {
    CodeActionTriggerType[CodeActionTriggerType["Invoke"] = 1] = "Invoke";
    CodeActionTriggerType[CodeActionTriggerType["Auto"] = 2] = "Auto";
})(CodeActionTriggerType || (CodeActionTriggerType = {}));
export var CompletionItemInsertTextRule;
(function (CompletionItemInsertTextRule) {
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["None"] = 0] = "None";
    /**
     * Adjust whitespace/indentation of multiline insert texts to
     * match the current line indentation.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["KeepWhitespace"] = 1] = "KeepWhitespace";
    /**
     * `insertText` is a snippet.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["InsertAsSnippet"] = 4] = "InsertAsSnippet";
})(CompletionItemInsertTextRule || (CompletionItemInsertTextRule = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Method"] = 0] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 1] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 2] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 3] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 4] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 5] = "Class";
    CompletionItemKind[CompletionItemKind["Struct"] = 6] = "Struct";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Event"] = 10] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 11] = "Operator";
    CompletionItemKind[CompletionItemKind["Unit"] = 12] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 13] = "Value";
    CompletionItemKind[CompletionItemKind["Constant"] = 14] = "Constant";
    CompletionItemKind[CompletionItemKind["Enum"] = 15] = "Enum";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 16] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Keyword"] = 17] = "Keyword";
    CompletionItemKind[CompletionItemKind["Text"] = 18] = "Text";
    CompletionItemKind[CompletionItemKind["Color"] = 19] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 20] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 21] = "Reference";
    CompletionItemKind[CompletionItemKind["Customcolor"] = 22] = "Customcolor";
    CompletionItemKind[CompletionItemKind["Folder"] = 23] = "Folder";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
    CompletionItemKind[CompletionItemKind["Tool"] = 27] = "Tool";
    CompletionItemKind[CompletionItemKind["Snippet"] = 28] = "Snippet";
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
/**
 * How a suggest provider was triggered.
 */
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
/**
 * A positioning preference for rendering content widgets.
 */
export var ContentWidgetPositionPreference;
(function (ContentWidgetPositionPreference) {
    /**
     * Place the content widget exactly at a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["EXACT"] = 0] = "EXACT";
    /**
     * Place the content widget above a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["ABOVE"] = 1] = "ABOVE";
    /**
     * Place the content widget below a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["BELOW"] = 2] = "BELOW";
})(ContentWidgetPositionPreference || (ContentWidgetPositionPreference = {}));
/**
 * Describes the reason the cursor has changed its position.
 */
export var CursorChangeReason;
(function (CursorChangeReason) {
    /**
     * Unknown or not set.
     */
    CursorChangeReason[CursorChangeReason["NotSet"] = 0] = "NotSet";
    /**
     * A `model.setValue()` was called.
     */
    CursorChangeReason[CursorChangeReason["ContentFlush"] = 1] = "ContentFlush";
    /**
     * The `model` has been changed outside of this cursor and the cursor recovers its position from associated markers.
     */
    CursorChangeReason[CursorChangeReason["RecoverFromMarkers"] = 2] = "RecoverFromMarkers";
    /**
     * There was an explicit user gesture.
     */
    CursorChangeReason[CursorChangeReason["Explicit"] = 3] = "Explicit";
    /**
     * There was a Paste.
     */
    CursorChangeReason[CursorChangeReason["Paste"] = 4] = "Paste";
    /**
     * There was an Undo.
     */
    CursorChangeReason[CursorChangeReason["Undo"] = 5] = "Undo";
    /**
     * There was a Redo.
     */
    CursorChangeReason[CursorChangeReason["Redo"] = 6] = "Redo";
})(CursorChangeReason || (CursorChangeReason = {}));
/**
 * The default end of line to use when instantiating models.
 */
export var DefaultEndOfLine;
(function (DefaultEndOfLine) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    DefaultEndOfLine[DefaultEndOfLine["CRLF"] = 2] = "CRLF";
})(DefaultEndOfLine || (DefaultEndOfLine = {}));
/**
 * A document highlight kind.
 */
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    /**
     * A textual occurrence.
     */
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    /**
     * Read-access of a symbol, like reading a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    /**
     * Write-access of a symbol, like writing to a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
/**
 * Configuration options for auto indentation in the editor
 */
export var EditorAutoIndentStrategy;
(function (EditorAutoIndentStrategy) {
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["None"] = 0] = "None";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Keep"] = 1] = "Keep";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Brackets"] = 2] = "Brackets";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Advanced"] = 3] = "Advanced";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Full"] = 4] = "Full";
})(EditorAutoIndentStrategy || (EditorAutoIndentStrategy = {}));
export var EditorOption;
(function (EditorOption) {
    EditorOption[EditorOption["acceptSuggestionOnCommitCharacter"] = 0] = "acceptSuggestionOnCommitCharacter";
    EditorOption[EditorOption["acceptSuggestionOnEnter"] = 1] = "acceptSuggestionOnEnter";
    EditorOption[EditorOption["accessibilitySupport"] = 2] = "accessibilitySupport";
    EditorOption[EditorOption["accessibilityPageSize"] = 3] = "accessibilityPageSize";
    EditorOption[EditorOption["allowOverflow"] = 4] = "allowOverflow";
    EditorOption[EditorOption["allowVariableLineHeights"] = 5] = "allowVariableLineHeights";
    EditorOption[EditorOption["allowVariableFonts"] = 6] = "allowVariableFonts";
    EditorOption[EditorOption["allowVariableFontsInAccessibilityMode"] = 7] = "allowVariableFontsInAccessibilityMode";
    EditorOption[EditorOption["ariaLabel"] = 8] = "ariaLabel";
    EditorOption[EditorOption["ariaRequired"] = 9] = "ariaRequired";
    EditorOption[EditorOption["autoClosingBrackets"] = 10] = "autoClosingBrackets";
    EditorOption[EditorOption["autoClosingComments"] = 11] = "autoClosingComments";
    EditorOption[EditorOption["screenReaderAnnounceInlineSuggestion"] = 12] = "screenReaderAnnounceInlineSuggestion";
    EditorOption[EditorOption["autoClosingDelete"] = 13] = "autoClosingDelete";
    EditorOption[EditorOption["autoClosingOvertype"] = 14] = "autoClosingOvertype";
    EditorOption[EditorOption["autoClosingQuotes"] = 15] = "autoClosingQuotes";
    EditorOption[EditorOption["autoIndent"] = 16] = "autoIndent";
    EditorOption[EditorOption["autoIndentOnPaste"] = 17] = "autoIndentOnPaste";
    EditorOption[EditorOption["autoIndentOnPasteWithinString"] = 18] = "autoIndentOnPasteWithinString";
    EditorOption[EditorOption["automaticLayout"] = 19] = "automaticLayout";
    EditorOption[EditorOption["autoSurround"] = 20] = "autoSurround";
    EditorOption[EditorOption["bracketPairColorization"] = 21] = "bracketPairColorization";
    EditorOption[EditorOption["guides"] = 22] = "guides";
    EditorOption[EditorOption["codeLens"] = 23] = "codeLens";
    EditorOption[EditorOption["codeLensFontFamily"] = 24] = "codeLensFontFamily";
    EditorOption[EditorOption["codeLensFontSize"] = 25] = "codeLensFontSize";
    EditorOption[EditorOption["colorDecorators"] = 26] = "colorDecorators";
    EditorOption[EditorOption["colorDecoratorsLimit"] = 27] = "colorDecoratorsLimit";
    EditorOption[EditorOption["columnSelection"] = 28] = "columnSelection";
    EditorOption[EditorOption["comments"] = 29] = "comments";
    EditorOption[EditorOption["contextmenu"] = 30] = "contextmenu";
    EditorOption[EditorOption["copyWithSyntaxHighlighting"] = 31] = "copyWithSyntaxHighlighting";
    EditorOption[EditorOption["cursorBlinking"] = 32] = "cursorBlinking";
    EditorOption[EditorOption["cursorSmoothCaretAnimation"] = 33] = "cursorSmoothCaretAnimation";
    EditorOption[EditorOption["cursorStyle"] = 34] = "cursorStyle";
    EditorOption[EditorOption["cursorSurroundingLines"] = 35] = "cursorSurroundingLines";
    EditorOption[EditorOption["cursorSurroundingLinesStyle"] = 36] = "cursorSurroundingLinesStyle";
    EditorOption[EditorOption["cursorWidth"] = 37] = "cursorWidth";
    EditorOption[EditorOption["cursorHeight"] = 38] = "cursorHeight";
    EditorOption[EditorOption["disableLayerHinting"] = 39] = "disableLayerHinting";
    EditorOption[EditorOption["disableMonospaceOptimizations"] = 40] = "disableMonospaceOptimizations";
    EditorOption[EditorOption["domReadOnly"] = 41] = "domReadOnly";
    EditorOption[EditorOption["dragAndDrop"] = 42] = "dragAndDrop";
    EditorOption[EditorOption["dropIntoEditor"] = 43] = "dropIntoEditor";
    EditorOption[EditorOption["editContext"] = 44] = "editContext";
    EditorOption[EditorOption["emptySelectionClipboard"] = 45] = "emptySelectionClipboard";
    EditorOption[EditorOption["experimentalGpuAcceleration"] = 46] = "experimentalGpuAcceleration";
    EditorOption[EditorOption["experimentalWhitespaceRendering"] = 47] = "experimentalWhitespaceRendering";
    EditorOption[EditorOption["extraEditorClassName"] = 48] = "extraEditorClassName";
    EditorOption[EditorOption["fastScrollSensitivity"] = 49] = "fastScrollSensitivity";
    EditorOption[EditorOption["find"] = 50] = "find";
    EditorOption[EditorOption["fixedOverflowWidgets"] = 51] = "fixedOverflowWidgets";
    EditorOption[EditorOption["folding"] = 52] = "folding";
    EditorOption[EditorOption["foldingStrategy"] = 53] = "foldingStrategy";
    EditorOption[EditorOption["foldingHighlight"] = 54] = "foldingHighlight";
    EditorOption[EditorOption["foldingImportsByDefault"] = 55] = "foldingImportsByDefault";
    EditorOption[EditorOption["foldingMaximumRegions"] = 56] = "foldingMaximumRegions";
    EditorOption[EditorOption["unfoldOnClickAfterEndOfLine"] = 57] = "unfoldOnClickAfterEndOfLine";
    EditorOption[EditorOption["fontFamily"] = 58] = "fontFamily";
    EditorOption[EditorOption["fontInfo"] = 59] = "fontInfo";
    EditorOption[EditorOption["fontLigatures"] = 60] = "fontLigatures";
    EditorOption[EditorOption["fontSize"] = 61] = "fontSize";
    EditorOption[EditorOption["fontWeight"] = 62] = "fontWeight";
    EditorOption[EditorOption["fontVariations"] = 63] = "fontVariations";
    EditorOption[EditorOption["formatOnPaste"] = 64] = "formatOnPaste";
    EditorOption[EditorOption["formatOnType"] = 65] = "formatOnType";
    EditorOption[EditorOption["glyphMargin"] = 66] = "glyphMargin";
    EditorOption[EditorOption["gotoLocation"] = 67] = "gotoLocation";
    EditorOption[EditorOption["hideCursorInOverviewRuler"] = 68] = "hideCursorInOverviewRuler";
    EditorOption[EditorOption["hover"] = 69] = "hover";
    EditorOption[EditorOption["inDiffEditor"] = 70] = "inDiffEditor";
    EditorOption[EditorOption["inlineSuggest"] = 71] = "inlineSuggest";
    EditorOption[EditorOption["letterSpacing"] = 72] = "letterSpacing";
    EditorOption[EditorOption["lightbulb"] = 73] = "lightbulb";
    EditorOption[EditorOption["lineDecorationsWidth"] = 74] = "lineDecorationsWidth";
    EditorOption[EditorOption["lineHeight"] = 75] = "lineHeight";
    EditorOption[EditorOption["lineNumbers"] = 76] = "lineNumbers";
    EditorOption[EditorOption["lineNumbersMinChars"] = 77] = "lineNumbersMinChars";
    EditorOption[EditorOption["linkedEditing"] = 78] = "linkedEditing";
    EditorOption[EditorOption["links"] = 79] = "links";
    EditorOption[EditorOption["matchBrackets"] = 80] = "matchBrackets";
    EditorOption[EditorOption["minimap"] = 81] = "minimap";
    EditorOption[EditorOption["mouseStyle"] = 82] = "mouseStyle";
    EditorOption[EditorOption["mouseWheelScrollSensitivity"] = 83] = "mouseWheelScrollSensitivity";
    EditorOption[EditorOption["mouseWheelZoom"] = 84] = "mouseWheelZoom";
    EditorOption[EditorOption["multiCursorMergeOverlapping"] = 85] = "multiCursorMergeOverlapping";
    EditorOption[EditorOption["multiCursorModifier"] = 86] = "multiCursorModifier";
    EditorOption[EditorOption["multiCursorPaste"] = 87] = "multiCursorPaste";
    EditorOption[EditorOption["multiCursorLimit"] = 88] = "multiCursorLimit";
    EditorOption[EditorOption["occurrencesHighlight"] = 89] = "occurrencesHighlight";
    EditorOption[EditorOption["occurrencesHighlightDelay"] = 90] = "occurrencesHighlightDelay";
    EditorOption[EditorOption["overtypeCursorStyle"] = 91] = "overtypeCursorStyle";
    EditorOption[EditorOption["overtypeOnPaste"] = 92] = "overtypeOnPaste";
    EditorOption[EditorOption["overviewRulerBorder"] = 93] = "overviewRulerBorder";
    EditorOption[EditorOption["overviewRulerLanes"] = 94] = "overviewRulerLanes";
    EditorOption[EditorOption["padding"] = 95] = "padding";
    EditorOption[EditorOption["pasteAs"] = 96] = "pasteAs";
    EditorOption[EditorOption["parameterHints"] = 97] = "parameterHints";
    EditorOption[EditorOption["peekWidgetDefaultFocus"] = 98] = "peekWidgetDefaultFocus";
    EditorOption[EditorOption["placeholder"] = 99] = "placeholder";
    EditorOption[EditorOption["definitionLinkOpensInPeek"] = 100] = "definitionLinkOpensInPeek";
    EditorOption[EditorOption["quickSuggestions"] = 101] = "quickSuggestions";
    EditorOption[EditorOption["quickSuggestionsDelay"] = 102] = "quickSuggestionsDelay";
    EditorOption[EditorOption["readOnly"] = 103] = "readOnly";
    EditorOption[EditorOption["readOnlyMessage"] = 104] = "readOnlyMessage";
    EditorOption[EditorOption["renameOnType"] = 105] = "renameOnType";
    EditorOption[EditorOption["renderRichScreenReaderContent"] = 106] = "renderRichScreenReaderContent";
    EditorOption[EditorOption["renderControlCharacters"] = 107] = "renderControlCharacters";
    EditorOption[EditorOption["renderFinalNewline"] = 108] = "renderFinalNewline";
    EditorOption[EditorOption["renderLineHighlight"] = 109] = "renderLineHighlight";
    EditorOption[EditorOption["renderLineHighlightOnlyWhenFocus"] = 110] = "renderLineHighlightOnlyWhenFocus";
    EditorOption[EditorOption["renderValidationDecorations"] = 111] = "renderValidationDecorations";
    EditorOption[EditorOption["renderWhitespace"] = 112] = "renderWhitespace";
    EditorOption[EditorOption["revealHorizontalRightPadding"] = 113] = "revealHorizontalRightPadding";
    EditorOption[EditorOption["roundedSelection"] = 114] = "roundedSelection";
    EditorOption[EditorOption["rulers"] = 115] = "rulers";
    EditorOption[EditorOption["scrollbar"] = 116] = "scrollbar";
    EditorOption[EditorOption["scrollBeyondLastColumn"] = 117] = "scrollBeyondLastColumn";
    EditorOption[EditorOption["scrollBeyondLastLine"] = 118] = "scrollBeyondLastLine";
    EditorOption[EditorOption["scrollPredominantAxis"] = 119] = "scrollPredominantAxis";
    EditorOption[EditorOption["selectionClipboard"] = 120] = "selectionClipboard";
    EditorOption[EditorOption["selectionHighlight"] = 121] = "selectionHighlight";
    EditorOption[EditorOption["selectionHighlightMaxLength"] = 122] = "selectionHighlightMaxLength";
    EditorOption[EditorOption["selectionHighlightMultiline"] = 123] = "selectionHighlightMultiline";
    EditorOption[EditorOption["selectOnLineNumbers"] = 124] = "selectOnLineNumbers";
    EditorOption[EditorOption["showFoldingControls"] = 125] = "showFoldingControls";
    EditorOption[EditorOption["showUnused"] = 126] = "showUnused";
    EditorOption[EditorOption["snippetSuggestions"] = 127] = "snippetSuggestions";
    EditorOption[EditorOption["smartSelect"] = 128] = "smartSelect";
    EditorOption[EditorOption["smoothScrolling"] = 129] = "smoothScrolling";
    EditorOption[EditorOption["stickyScroll"] = 130] = "stickyScroll";
    EditorOption[EditorOption["stickyTabStops"] = 131] = "stickyTabStops";
    EditorOption[EditorOption["stopRenderingLineAfter"] = 132] = "stopRenderingLineAfter";
    EditorOption[EditorOption["suggest"] = 133] = "suggest";
    EditorOption[EditorOption["suggestFontSize"] = 134] = "suggestFontSize";
    EditorOption[EditorOption["suggestLineHeight"] = 135] = "suggestLineHeight";
    EditorOption[EditorOption["suggestOnTriggerCharacters"] = 136] = "suggestOnTriggerCharacters";
    EditorOption[EditorOption["suggestSelection"] = 137] = "suggestSelection";
    EditorOption[EditorOption["tabCompletion"] = 138] = "tabCompletion";
    EditorOption[EditorOption["tabIndex"] = 139] = "tabIndex";
    EditorOption[EditorOption["trimWhitespaceOnDelete"] = 140] = "trimWhitespaceOnDelete";
    EditorOption[EditorOption["unicodeHighlighting"] = 141] = "unicodeHighlighting";
    EditorOption[EditorOption["unusualLineTerminators"] = 142] = "unusualLineTerminators";
    EditorOption[EditorOption["useShadowDOM"] = 143] = "useShadowDOM";
    EditorOption[EditorOption["useTabStops"] = 144] = "useTabStops";
    EditorOption[EditorOption["wordBreak"] = 145] = "wordBreak";
    EditorOption[EditorOption["wordSegmenterLocales"] = 146] = "wordSegmenterLocales";
    EditorOption[EditorOption["wordSeparators"] = 147] = "wordSeparators";
    EditorOption[EditorOption["wordWrap"] = 148] = "wordWrap";
    EditorOption[EditorOption["wordWrapBreakAfterCharacters"] = 149] = "wordWrapBreakAfterCharacters";
    EditorOption[EditorOption["wordWrapBreakBeforeCharacters"] = 150] = "wordWrapBreakBeforeCharacters";
    EditorOption[EditorOption["wordWrapColumn"] = 151] = "wordWrapColumn";
    EditorOption[EditorOption["wordWrapOverride1"] = 152] = "wordWrapOverride1";
    EditorOption[EditorOption["wordWrapOverride2"] = 153] = "wordWrapOverride2";
    EditorOption[EditorOption["wrappingIndent"] = 154] = "wrappingIndent";
    EditorOption[EditorOption["wrappingStrategy"] = 155] = "wrappingStrategy";
    EditorOption[EditorOption["showDeprecated"] = 156] = "showDeprecated";
    EditorOption[EditorOption["inertialScroll"] = 157] = "inertialScroll";
    EditorOption[EditorOption["inlayHints"] = 158] = "inlayHints";
    EditorOption[EditorOption["wrapOnEscapedLineFeeds"] = 159] = "wrapOnEscapedLineFeeds";
    EditorOption[EditorOption["effectiveCursorStyle"] = 160] = "effectiveCursorStyle";
    EditorOption[EditorOption["editorClassName"] = 161] = "editorClassName";
    EditorOption[EditorOption["pixelRatio"] = 162] = "pixelRatio";
    EditorOption[EditorOption["tabFocusMode"] = 163] = "tabFocusMode";
    EditorOption[EditorOption["layoutInfo"] = 164] = "layoutInfo";
    EditorOption[EditorOption["wrappingInfo"] = 165] = "wrappingInfo";
    EditorOption[EditorOption["defaultColorDecorators"] = 166] = "defaultColorDecorators";
    EditorOption[EditorOption["colorDecoratorsActivatedOn"] = 167] = "colorDecoratorsActivatedOn";
    EditorOption[EditorOption["inlineCompletionsAccessibilityVerbose"] = 168] = "inlineCompletionsAccessibilityVerbose";
    EditorOption[EditorOption["effectiveEditContext"] = 169] = "effectiveEditContext";
    EditorOption[EditorOption["scrollOnMiddleClick"] = 170] = "scrollOnMiddleClick";
    EditorOption[EditorOption["effectiveAllowVariableFonts"] = 171] = "effectiveAllowVariableFonts";
})(EditorOption || (EditorOption = {}));
/**
 * End of line character preference.
 */
export var EndOfLinePreference;
(function (EndOfLinePreference) {
    /**
     * Use the end of line character identified in the text buffer.
     */
    EndOfLinePreference[EndOfLinePreference["TextDefined"] = 0] = "TextDefined";
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["LF"] = 1] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLinePreference[EndOfLinePreference["CRLF"] = 2] = "CRLF";
})(EndOfLinePreference || (EndOfLinePreference = {}));
/**
 * End of line character preference.
 */
export var EndOfLineSequence;
(function (EndOfLineSequence) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["LF"] = 0] = "LF";
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLineSequence[EndOfLineSequence["CRLF"] = 1] = "CRLF";
})(EndOfLineSequence || (EndOfLineSequence = {}));
/**
 * Vertical Lane in the glyph margin of the editor.
 */
export var GlyphMarginLane;
(function (GlyphMarginLane) {
    GlyphMarginLane[GlyphMarginLane["Left"] = 1] = "Left";
    GlyphMarginLane[GlyphMarginLane["Center"] = 2] = "Center";
    GlyphMarginLane[GlyphMarginLane["Right"] = 3] = "Right";
})(GlyphMarginLane || (GlyphMarginLane = {}));
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    /**
     * Increase the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    /**
     * Decrease the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
/**
 * Describes what to do with the indentation when pressing Enter.
 */
export var IndentAction;
(function (IndentAction) {
    /**
     * Insert new line and copy the previous line's indentation.
     */
    IndentAction[IndentAction["None"] = 0] = "None";
    /**
     * Insert new line and indent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Indent"] = 1] = "Indent";
    /**
     * Insert two new lines:
     *  - the first one indented which will hold the cursor
     *  - the second one at the same indentation level
     */
    IndentAction[IndentAction["IndentOutdent"] = 2] = "IndentOutdent";
    /**
     * Insert new line and outdent once (relative to the previous line's indentation).
     */
    IndentAction[IndentAction["Outdent"] = 3] = "Outdent";
})(IndentAction || (IndentAction = {}));
export var InjectedTextCursorStops;
(function (InjectedTextCursorStops) {
    InjectedTextCursorStops[InjectedTextCursorStops["Both"] = 0] = "Both";
    InjectedTextCursorStops[InjectedTextCursorStops["Right"] = 1] = "Right";
    InjectedTextCursorStops[InjectedTextCursorStops["Left"] = 2] = "Left";
    InjectedTextCursorStops[InjectedTextCursorStops["None"] = 3] = "None";
})(InjectedTextCursorStops || (InjectedTextCursorStops = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
export var InlineCompletionEndOfLifeReasonKind;
(function (InlineCompletionEndOfLifeReasonKind) {
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Accepted"] = 0] = "Accepted";
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Rejected"] = 1] = "Rejected";
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Ignored"] = 2] = "Ignored";
})(InlineCompletionEndOfLifeReasonKind || (InlineCompletionEndOfLifeReasonKind = {}));
/**
 * How an {@link InlineCompletionsProvider inline completion provider} was triggered.
 */
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    /**
     * Completion was triggered automatically while editing.
     * It is sufficient to return a single completion item in this case.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 0] = "Automatic";
    /**
     * Completion was triggered explicitly by a user gesture.
     * Return multiple completion items to enable cycling through them.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Explicit"] = 1] = "Explicit";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
/**
 * Virtual Key Codes, the value does not hold any inherent meaning.
 * Inspired somewhat from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
 * But these are "more general", as they should work across browsers & OS`s.
 */
export var KeyCode;
(function (KeyCode) {
    KeyCode[KeyCode["DependsOnKbLayout"] = -1] = "DependsOnKbLayout";
    /**
     * Placed first to cover the 0 value of the enum.
     */
    KeyCode[KeyCode["Unknown"] = 0] = "Unknown";
    KeyCode[KeyCode["Backspace"] = 1] = "Backspace";
    KeyCode[KeyCode["Tab"] = 2] = "Tab";
    KeyCode[KeyCode["Enter"] = 3] = "Enter";
    KeyCode[KeyCode["Shift"] = 4] = "Shift";
    KeyCode[KeyCode["Ctrl"] = 5] = "Ctrl";
    KeyCode[KeyCode["Alt"] = 6] = "Alt";
    KeyCode[KeyCode["PauseBreak"] = 7] = "PauseBreak";
    KeyCode[KeyCode["CapsLock"] = 8] = "CapsLock";
    KeyCode[KeyCode["Escape"] = 9] = "Escape";
    KeyCode[KeyCode["Space"] = 10] = "Space";
    KeyCode[KeyCode["PageUp"] = 11] = "PageUp";
    KeyCode[KeyCode["PageDown"] = 12] = "PageDown";
    KeyCode[KeyCode["End"] = 13] = "End";
    KeyCode[KeyCode["Home"] = 14] = "Home";
    KeyCode[KeyCode["LeftArrow"] = 15] = "LeftArrow";
    KeyCode[KeyCode["UpArrow"] = 16] = "UpArrow";
    KeyCode[KeyCode["RightArrow"] = 17] = "RightArrow";
    KeyCode[KeyCode["DownArrow"] = 18] = "DownArrow";
    KeyCode[KeyCode["Insert"] = 19] = "Insert";
    KeyCode[KeyCode["Delete"] = 20] = "Delete";
    KeyCode[KeyCode["Digit0"] = 21] = "Digit0";
    KeyCode[KeyCode["Digit1"] = 22] = "Digit1";
    KeyCode[KeyCode["Digit2"] = 23] = "Digit2";
    KeyCode[KeyCode["Digit3"] = 24] = "Digit3";
    KeyCode[KeyCode["Digit4"] = 25] = "Digit4";
    KeyCode[KeyCode["Digit5"] = 26] = "Digit5";
    KeyCode[KeyCode["Digit6"] = 27] = "Digit6";
    KeyCode[KeyCode["Digit7"] = 28] = "Digit7";
    KeyCode[KeyCode["Digit8"] = 29] = "Digit8";
    KeyCode[KeyCode["Digit9"] = 30] = "Digit9";
    KeyCode[KeyCode["KeyA"] = 31] = "KeyA";
    KeyCode[KeyCode["KeyB"] = 32] = "KeyB";
    KeyCode[KeyCode["KeyC"] = 33] = "KeyC";
    KeyCode[KeyCode["KeyD"] = 34] = "KeyD";
    KeyCode[KeyCode["KeyE"] = 35] = "KeyE";
    KeyCode[KeyCode["KeyF"] = 36] = "KeyF";
    KeyCode[KeyCode["KeyG"] = 37] = "KeyG";
    KeyCode[KeyCode["KeyH"] = 38] = "KeyH";
    KeyCode[KeyCode["KeyI"] = 39] = "KeyI";
    KeyCode[KeyCode["KeyJ"] = 40] = "KeyJ";
    KeyCode[KeyCode["KeyK"] = 41] = "KeyK";
    KeyCode[KeyCode["KeyL"] = 42] = "KeyL";
    KeyCode[KeyCode["KeyM"] = 43] = "KeyM";
    KeyCode[KeyCode["KeyN"] = 44] = "KeyN";
    KeyCode[KeyCode["KeyO"] = 45] = "KeyO";
    KeyCode[KeyCode["KeyP"] = 46] = "KeyP";
    KeyCode[KeyCode["KeyQ"] = 47] = "KeyQ";
    KeyCode[KeyCode["KeyR"] = 48] = "KeyR";
    KeyCode[KeyCode["KeyS"] = 49] = "KeyS";
    KeyCode[KeyCode["KeyT"] = 50] = "KeyT";
    KeyCode[KeyCode["KeyU"] = 51] = "KeyU";
    KeyCode[KeyCode["KeyV"] = 52] = "KeyV";
    KeyCode[KeyCode["KeyW"] = 53] = "KeyW";
    KeyCode[KeyCode["KeyX"] = 54] = "KeyX";
    KeyCode[KeyCode["KeyY"] = 55] = "KeyY";
    KeyCode[KeyCode["KeyZ"] = 56] = "KeyZ";
    KeyCode[KeyCode["Meta"] = 57] = "Meta";
    KeyCode[KeyCode["ContextMenu"] = 58] = "ContextMenu";
    KeyCode[KeyCode["F1"] = 59] = "F1";
    KeyCode[KeyCode["F2"] = 60] = "F2";
    KeyCode[KeyCode["F3"] = 61] = "F3";
    KeyCode[KeyCode["F4"] = 62] = "F4";
    KeyCode[KeyCode["F5"] = 63] = "F5";
    KeyCode[KeyCode["F6"] = 64] = "F6";
    KeyCode[KeyCode["F7"] = 65] = "F7";
    KeyCode[KeyCode["F8"] = 66] = "F8";
    KeyCode[KeyCode["F9"] = 67] = "F9";
    KeyCode[KeyCode["F10"] = 68] = "F10";
    KeyCode[KeyCode["F11"] = 69] = "F11";
    KeyCode[KeyCode["F12"] = 70] = "F12";
    KeyCode[KeyCode["F13"] = 71] = "F13";
    KeyCode[KeyCode["F14"] = 72] = "F14";
    KeyCode[KeyCode["F15"] = 73] = "F15";
    KeyCode[KeyCode["F16"] = 74] = "F16";
    KeyCode[KeyCode["F17"] = 75] = "F17";
    KeyCode[KeyCode["F18"] = 76] = "F18";
    KeyCode[KeyCode["F19"] = 77] = "F19";
    KeyCode[KeyCode["F20"] = 78] = "F20";
    KeyCode[KeyCode["F21"] = 79] = "F21";
    KeyCode[KeyCode["F22"] = 80] = "F22";
    KeyCode[KeyCode["F23"] = 81] = "F23";
    KeyCode[KeyCode["F24"] = 82] = "F24";
    KeyCode[KeyCode["NumLock"] = 83] = "NumLock";
    KeyCode[KeyCode["ScrollLock"] = 84] = "ScrollLock";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ';:' key
     */
    KeyCode[KeyCode["Semicolon"] = 85] = "Semicolon";
    /**
     * For any country/region, the '+' key
     * For the US standard keyboard, the '=+' key
     */
    KeyCode[KeyCode["Equal"] = 86] = "Equal";
    /**
     * For any country/region, the ',' key
     * For the US standard keyboard, the ',<' key
     */
    KeyCode[KeyCode["Comma"] = 87] = "Comma";
    /**
     * For any country/region, the '-' key
     * For the US standard keyboard, the '-_' key
     */
    KeyCode[KeyCode["Minus"] = 88] = "Minus";
    /**
     * For any country/region, the '.' key
     * For the US standard keyboard, the '.>' key
     */
    KeyCode[KeyCode["Period"] = 89] = "Period";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '/?' key
     */
    KeyCode[KeyCode["Slash"] = 90] = "Slash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '`~' key
     */
    KeyCode[KeyCode["Backquote"] = 91] = "Backquote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '[{' key
     */
    KeyCode[KeyCode["BracketLeft"] = 92] = "BracketLeft";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '\|' key
     */
    KeyCode[KeyCode["Backslash"] = 93] = "Backslash";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ']}' key
     */
    KeyCode[KeyCode["BracketRight"] = 94] = "BracketRight";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ''"' key
     */
    KeyCode[KeyCode["Quote"] = 95] = "Quote";
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     */
    KeyCode[KeyCode["OEM_8"] = 96] = "OEM_8";
    /**
     * Either the angle bracket key or the backslash key on the RT 102-key keyboard.
     */
    KeyCode[KeyCode["IntlBackslash"] = 97] = "IntlBackslash";
    KeyCode[KeyCode["Numpad0"] = 98] = "Numpad0";
    KeyCode[KeyCode["Numpad1"] = 99] = "Numpad1";
    KeyCode[KeyCode["Numpad2"] = 100] = "Numpad2";
    KeyCode[KeyCode["Numpad3"] = 101] = "Numpad3";
    KeyCode[KeyCode["Numpad4"] = 102] = "Numpad4";
    KeyCode[KeyCode["Numpad5"] = 103] = "Numpad5";
    KeyCode[KeyCode["Numpad6"] = 104] = "Numpad6";
    KeyCode[KeyCode["Numpad7"] = 105] = "Numpad7";
    KeyCode[KeyCode["Numpad8"] = 106] = "Numpad8";
    KeyCode[KeyCode["Numpad9"] = 107] = "Numpad9";
    KeyCode[KeyCode["NumpadMultiply"] = 108] = "NumpadMultiply";
    KeyCode[KeyCode["NumpadAdd"] = 109] = "NumpadAdd";
    KeyCode[KeyCode["NUMPAD_SEPARATOR"] = 110] = "NUMPAD_SEPARATOR";
    KeyCode[KeyCode["NumpadSubtract"] = 111] = "NumpadSubtract";
    KeyCode[KeyCode["NumpadDecimal"] = 112] = "NumpadDecimal";
    KeyCode[KeyCode["NumpadDivide"] = 113] = "NumpadDivide";
    /**
     * Cover all key codes when IME is processing input.
     */
    KeyCode[KeyCode["KEY_IN_COMPOSITION"] = 114] = "KEY_IN_COMPOSITION";
    KeyCode[KeyCode["ABNT_C1"] = 115] = "ABNT_C1";
    KeyCode[KeyCode["ABNT_C2"] = 116] = "ABNT_C2";
    KeyCode[KeyCode["AudioVolumeMute"] = 117] = "AudioVolumeMute";
    KeyCode[KeyCode["AudioVolumeUp"] = 118] = "AudioVolumeUp";
    KeyCode[KeyCode["AudioVolumeDown"] = 119] = "AudioVolumeDown";
    KeyCode[KeyCode["BrowserSearch"] = 120] = "BrowserSearch";
    KeyCode[KeyCode["BrowserHome"] = 121] = "BrowserHome";
    KeyCode[KeyCode["BrowserBack"] = 122] = "BrowserBack";
    KeyCode[KeyCode["BrowserForward"] = 123] = "BrowserForward";
    KeyCode[KeyCode["MediaTrackNext"] = 124] = "MediaTrackNext";
    KeyCode[KeyCode["MediaTrackPrevious"] = 125] = "MediaTrackPrevious";
    KeyCode[KeyCode["MediaStop"] = 126] = "MediaStop";
    KeyCode[KeyCode["MediaPlayPause"] = 127] = "MediaPlayPause";
    KeyCode[KeyCode["LaunchMediaPlayer"] = 128] = "LaunchMediaPlayer";
    KeyCode[KeyCode["LaunchMail"] = 129] = "LaunchMail";
    KeyCode[KeyCode["LaunchApp2"] = 130] = "LaunchApp2";
    /**
     * VK_CLEAR, 0x0C, CLEAR key
     */
    KeyCode[KeyCode["Clear"] = 131] = "Clear";
    /**
     * Placed last to cover the length of the enum.
     * Please do not depend on this value!
     */
    KeyCode[KeyCode["MAX_VALUE"] = 132] = "MAX_VALUE";
})(KeyCode || (KeyCode = {}));
export var MarkerSeverity;
(function (MarkerSeverity) {
    MarkerSeverity[MarkerSeverity["Hint"] = 1] = "Hint";
    MarkerSeverity[MarkerSeverity["Info"] = 2] = "Info";
    MarkerSeverity[MarkerSeverity["Warning"] = 4] = "Warning";
    MarkerSeverity[MarkerSeverity["Error"] = 8] = "Error";
})(MarkerSeverity || (MarkerSeverity = {}));
export var MarkerTag;
(function (MarkerTag) {
    MarkerTag[MarkerTag["Unnecessary"] = 1] = "Unnecessary";
    MarkerTag[MarkerTag["Deprecated"] = 2] = "Deprecated";
})(MarkerTag || (MarkerTag = {}));
/**
 * Position in the minimap to render the decoration.
 */
export var MinimapPosition;
(function (MinimapPosition) {
    MinimapPosition[MinimapPosition["Inline"] = 1] = "Inline";
    MinimapPosition[MinimapPosition["Gutter"] = 2] = "Gutter";
})(MinimapPosition || (MinimapPosition = {}));
/**
 * Section header style.
 */
export var MinimapSectionHeaderStyle;
(function (MinimapSectionHeaderStyle) {
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Normal"] = 1] = "Normal";
    MinimapSectionHeaderStyle[MinimapSectionHeaderStyle["Underlined"] = 2] = "Underlined";
})(MinimapSectionHeaderStyle || (MinimapSectionHeaderStyle = {}));
/**
 * Type of hit element with the mouse in the editor.
 */
export var MouseTargetType;
(function (MouseTargetType) {
    /**
     * Mouse is on top of an unknown element.
     */
    MouseTargetType[MouseTargetType["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * Mouse is on top of the textarea used for input.
     */
    MouseTargetType[MouseTargetType["TEXTAREA"] = 1] = "TEXTAREA";
    /**
     * Mouse is on top of the glyph margin
     */
    MouseTargetType[MouseTargetType["GUTTER_GLYPH_MARGIN"] = 2] = "GUTTER_GLYPH_MARGIN";
    /**
     * Mouse is on top of the line numbers
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_NUMBERS"] = 3] = "GUTTER_LINE_NUMBERS";
    /**
     * Mouse is on top of the line decorations
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_DECORATIONS"] = 4] = "GUTTER_LINE_DECORATIONS";
    /**
     * Mouse is on top of the whitespace left in the gutter by a view zone.
     */
    MouseTargetType[MouseTargetType["GUTTER_VIEW_ZONE"] = 5] = "GUTTER_VIEW_ZONE";
    /**
     * Mouse is on top of text in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_TEXT"] = 6] = "CONTENT_TEXT";
    /**
     * Mouse is on top of empty space in the content (e.g. after line text or below last line)
     */
    MouseTargetType[MouseTargetType["CONTENT_EMPTY"] = 7] = "CONTENT_EMPTY";
    /**
     * Mouse is on top of a view zone in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_VIEW_ZONE"] = 8] = "CONTENT_VIEW_ZONE";
    /**
     * Mouse is on top of a content widget.
     */
    MouseTargetType[MouseTargetType["CONTENT_WIDGET"] = 9] = "CONTENT_WIDGET";
    /**
     * Mouse is on top of the decorations overview ruler.
     */
    MouseTargetType[MouseTargetType["OVERVIEW_RULER"] = 10] = "OVERVIEW_RULER";
    /**
     * Mouse is on top of a scrollbar.
     */
    MouseTargetType[MouseTargetType["SCROLLBAR"] = 11] = "SCROLLBAR";
    /**
     * Mouse is on top of an overlay widget.
     */
    MouseTargetType[MouseTargetType["OVERLAY_WIDGET"] = 12] = "OVERLAY_WIDGET";
    /**
     * Mouse is outside of the editor.
     */
    MouseTargetType[MouseTargetType["OUTSIDE_EDITOR"] = 13] = "OUTSIDE_EDITOR";
})(MouseTargetType || (MouseTargetType = {}));
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
/**
 * A positioning preference for rendering overlay widgets.
 */
export var OverlayWidgetPositionPreference;
(function (OverlayWidgetPositionPreference) {
    /**
     * Position the overlay widget in the top right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_RIGHT_CORNER"] = 0] = "TOP_RIGHT_CORNER";
    /**
     * Position the overlay widget in the bottom right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["BOTTOM_RIGHT_CORNER"] = 1] = "BOTTOM_RIGHT_CORNER";
    /**
     * Position the overlay widget in the top center
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_CENTER"] = 2] = "TOP_CENTER";
})(OverlayWidgetPositionPreference || (OverlayWidgetPositionPreference = {}));
/**
 * Vertical Lane in the overview ruler of the editor.
 */
export var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
/**
 * How a partial acceptance was triggered.
 */
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 0] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 1] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 2] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var PositionAffinity;
(function (PositionAffinity) {
    /**
     * Prefers the left most position.
    */
    PositionAffinity[PositionAffinity["Left"] = 0] = "Left";
    /**
     * Prefers the right most position.
    */
    PositionAffinity[PositionAffinity["Right"] = 1] = "Right";
    /**
     * No preference.
    */
    PositionAffinity[PositionAffinity["None"] = 2] = "None";
    /**
     * If the given position is on injected text, prefers the position left of it.
    */
    PositionAffinity[PositionAffinity["LeftOfInjectedText"] = 3] = "LeftOfInjectedText";
    /**
     * If the given position is on injected text, prefers the position right of it.
    */
    PositionAffinity[PositionAffinity["RightOfInjectedText"] = 4] = "RightOfInjectedText";
})(PositionAffinity || (PositionAffinity = {}));
export var RenderLineNumbersType;
(function (RenderLineNumbersType) {
    RenderLineNumbersType[RenderLineNumbersType["Off"] = 0] = "Off";
    RenderLineNumbersType[RenderLineNumbersType["On"] = 1] = "On";
    RenderLineNumbersType[RenderLineNumbersType["Relative"] = 2] = "Relative";
    RenderLineNumbersType[RenderLineNumbersType["Interval"] = 3] = "Interval";
    RenderLineNumbersType[RenderLineNumbersType["Custom"] = 4] = "Custom";
})(RenderLineNumbersType || (RenderLineNumbersType = {}));
export var RenderMinimap;
(function (RenderMinimap) {
    RenderMinimap[RenderMinimap["None"] = 0] = "None";
    RenderMinimap[RenderMinimap["Text"] = 1] = "Text";
    RenderMinimap[RenderMinimap["Blocks"] = 2] = "Blocks";
})(RenderMinimap || (RenderMinimap = {}));
export var ScrollType;
(function (ScrollType) {
    ScrollType[ScrollType["Smooth"] = 0] = "Smooth";
    ScrollType[ScrollType["Immediate"] = 1] = "Immediate";
})(ScrollType || (ScrollType = {}));
export var ScrollbarVisibility;
(function (ScrollbarVisibility) {
    ScrollbarVisibility[ScrollbarVisibility["Auto"] = 1] = "Auto";
    ScrollbarVisibility[ScrollbarVisibility["Hidden"] = 2] = "Hidden";
    ScrollbarVisibility[ScrollbarVisibility["Visible"] = 3] = "Visible";
})(ScrollbarVisibility || (ScrollbarVisibility = {}));
/**
 * The direction of a selection.
 */
export var SelectionDirection;
(function (SelectionDirection) {
    /**
     * The selection starts above where it ends.
     */
    SelectionDirection[SelectionDirection["LTR"] = 0] = "LTR";
    /**
     * The selection starts below where it ends.
     */
    SelectionDirection[SelectionDirection["RTL"] = 1] = "RTL";
})(SelectionDirection || (SelectionDirection = {}));
export var ShowLightbulbIconMode;
(function (ShowLightbulbIconMode) {
    ShowLightbulbIconMode["Off"] = "off";
    ShowLightbulbIconMode["OnCode"] = "onCode";
    ShowLightbulbIconMode["On"] = "on";
})(ShowLightbulbIconMode || (ShowLightbulbIconMode = {}));
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
/**
 * A symbol kind.
 */
export var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
/**
 * Text Direction for a decoration.
 */
export var TextDirection;
(function (TextDirection) {
    TextDirection[TextDirection["LTR"] = 0] = "LTR";
    TextDirection[TextDirection["RTL"] = 1] = "RTL";
})(TextDirection || (TextDirection = {}));
/**
 * The kind of animation in which the editor's cursor should be rendered.
 */
export var TextEditorCursorBlinkingStyle;
(function (TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Hidden"] = 0] = "Hidden";
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Blink"] = 1] = "Blink";
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Smooth"] = 2] = "Smooth";
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Phase"] = 3] = "Phase";
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Expand"] = 4] = "Expand";
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Solid"] = 5] = "Solid";
})(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
/**
 * The style in which the editor's cursor should be rendered.
 */
export var TextEditorCursorStyle;
(function (TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Line"] = 1] = "Line";
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Block"] = 2] = "Block";
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Underline"] = 3] = "Underline";
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["LineThin"] = 4] = "LineThin";
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["BlockOutline"] = 5] = "BlockOutline";
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["UnderlineThin"] = 6] = "UnderlineThin";
})(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
/**
 * Describes the behavior of decorations when typing/editing near their edges.
 * Note: Please do not edit the values, as they very carefully match `DecorationRangeBehavior`
 */
export var TrackedRangeStickiness;
(function (TrackedRangeStickiness) {
    TrackedRangeStickiness[TrackedRangeStickiness["AlwaysGrowsWhenTypingAtEdges"] = 0] = "AlwaysGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["NeverGrowsWhenTypingAtEdges"] = 1] = "NeverGrowsWhenTypingAtEdges";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingBefore"] = 2] = "GrowsOnlyWhenTypingBefore";
    TrackedRangeStickiness[TrackedRangeStickiness["GrowsOnlyWhenTypingAfter"] = 3] = "GrowsOnlyWhenTypingAfter";
})(TrackedRangeStickiness || (TrackedRangeStickiness = {}));
/**
 * Describes how to indent wrapped lines.
 */
export var WrappingIndent;
(function (WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[WrappingIndent["None"] = 0] = "None";
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[WrappingIndent["Same"] = 1] = "Same";
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["Indent"] = 2] = "Indent";
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["DeepIndent"] = 3] = "DeepIndent";
})(WrappingIndent || (WrappingIndent = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVudW1zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3N0YW5kYWxvbmUvc3RhbmRhbG9uZUVudW1zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGtEQUFrRDtBQUdsRCxNQUFNLENBQU4sSUFBWSxvQkFPWDtBQVBELFdBQVksb0JBQW9CO0lBQy9COztPQUVHO0lBQ0gscUVBQVcsQ0FBQTtJQUNYLHVFQUFZLENBQUE7SUFDWixxRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQVBXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFPL0I7QUFFRCxNQUFNLENBQU4sSUFBWSxxQkFHWDtBQUhELFdBQVkscUJBQXFCO0lBQ2hDLHFFQUFVLENBQUE7SUFDVixpRUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHaEM7QUFFRCxNQUFNLENBQU4sSUFBWSw0QkFXWDtBQVhELFdBQVksNEJBQTRCO0lBQ3ZDLCtFQUFRLENBQUE7SUFDUjs7O09BR0c7SUFDSCxtR0FBa0IsQ0FBQTtJQUNsQjs7T0FFRztJQUNILHFHQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFYVyw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBV3ZDO0FBRUQsTUFBTSxDQUFOLElBQVksa0JBOEJYO0FBOUJELFdBQVksa0JBQWtCO0lBQzdCLCtEQUFVLENBQUE7SUFDVixtRUFBWSxDQUFBO0lBQ1oseUVBQWUsQ0FBQTtJQUNmLDZEQUFTLENBQUE7SUFDVCxtRUFBWSxDQUFBO0lBQ1osNkRBQVMsQ0FBQTtJQUNULCtEQUFVLENBQUE7SUFDVixxRUFBYSxDQUFBO0lBQ2IsK0RBQVUsQ0FBQTtJQUNWLG1FQUFZLENBQUE7SUFDWiw4REFBVSxDQUFBO0lBQ1Ysb0VBQWEsQ0FBQTtJQUNiLDREQUFT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