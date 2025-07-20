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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorunHandleChanges, derived, derivedOpts, observableFromEvent } from '../../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../observableCodeEditor.js';
import { OverviewRulerFeature } from '../features/overviewRulerFeature.js';
import { EditorOptions } from '../../../../common/config/editorOptions.js';
import { Position } from '../../../../common/core/position.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
let DiffEditorEditors = class DiffEditorEditors extends Disposable {
    get onDidContentSizeChange() { return this._onDidContentSizeChange.event; }
    constructor(originalEditorElement, modifiedEditorElement, _options, _argCodeEditorWidgetOptions, _createInnerEditor, _contextKeyService, _instantiationService, _keybindingService) {
        super();
        this.originalEditorElement = originalEditorElement;
        this.modifiedEditorElement = modifiedEditorElement;
        this._options = _options;
        this._argCodeEditorWidgetOptions = _argCodeEditorWidgetOptions;
        this._createInnerEditor = _createInnerEditor;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this.original = this._register(this._createLeftHandSideEditor(this._options.editorOptions.get(), this._argCodeEditorWidgetOptions.originalEditor || {}));
        this.modified = this._register(this._createRightHandSideEditor(this._options.editorOptions.get(), this._argCodeEditorWidgetOptions.modifiedEditor || {}));
        this._onDidContentSizeChange = this._register(new Emitter());
        this.modifiedScrollTop = observableFromEvent(this, this.modified.onDidScrollChange, () => /** @description modified.getScrollTop */ this.modified.getScrollTop());
        this.modifiedScrollHeight = observableFromEvent(this, this.modified.onDidScrollChange, () => /** @description modified.getScrollHeight */ this.modified.getScrollHeight());
        this.modifiedObs = observableCodeEditor(this.modified);
        this.originalObs = observableCodeEditor(this.original);
        this.modifiedModel = this.modifiedObs.model;
        this.modifiedSelections = observableFromEvent(this, this.modified.onDidChangeCursorSelection, () => this.modified.getSelections() ?? []);
        this.modifiedCursor = derivedOpts({ owner: this, equalsFn: Position.equals }, reader => this.modifiedSelections.read(reader)[0]?.getPosition() ?? new Position(1, 1));
        this.originalCursor = observableFromEvent(this, this.original.onDidChangeCursorPosition, () => this.original.getPosition() ?? new Position(1, 1));
        this.isOriginalFocused = observableCodeEditor(this.original).isFocused;
        this.isModifiedFocused = observableCodeEditor(this.modified).isFocused;
        this.isFocused = derived(this, reader => this.isOriginalFocused.read(reader) || this.isModifiedFocused.read(reader));
        this._argCodeEditorWidgetOptions = null;
        this._register(autorunHandleChanges({
            changeTracker: {
                createChangeSummary: () => ({}),
                handleChange: (ctx, changeSummary) => {
                    if (ctx.didChange(_options.editorOptions)) {
                        Object.assign(changeSummary, ctx.change.changedOptions);
                    }
                    return true;
                }
            }
        }, (reader, changeSummary) => {
            /** @description update editor options */
            _options.editorOptions.read(reader);
            this._options.renderSideBySide.read(reader);
            this.modified.updateOptions(this._adjustOptionsForRightHandSide(reader, changeSummary));
            this.original.updateOptions(this._adjustOptionsForLeftHandSide(reader, changeSummary));
        }));
    }
    _createLeftHandSideEditor(options, codeEditorWidgetOptions) {
        const leftHandSideOptions = this._adjustOptionsForLeftHandSide(undefined, options);
        const editor = this._constructInnerEditor(this._instantiationService, this.originalEditorElement, leftHandSideOptions, codeEditorWidgetOptions);
        const isInDiffLeftEditorKey = this._contextKeyService.createKey('isInDiffLeftEditor', editor.hasWidgetFocus());
        this._register(editor.onDidFocusEditorWidget(() => isInDiffLeftEditorKey.set(true)));
        this._register(editor.onDidBlurEditorWidget(() => isInDiffLeftEditorKey.set(false)));
        return editor;
    }
    _createRightHandSideEditor(options, codeEditorWidgetOptions) {
        const rightHandSideOptions = this._adjustOptionsForRightHandSide(undefined, options);
        const editor = this._constructInnerEditor(this._instantiationService, this.modifiedEditorElement, rightHandSideOptions, codeEditorWidgetOptions);
        const isInDiffRightEditorKey = this._contextKeyService.createKey('isInDiffRightEditor', editor.hasWidgetFocus());
        this._register(editor.onDidFocusEditorWidget(() => isInDiffRightEditorKey.set(true)));
        this._register(editor.onDidBlurEditorWidget(() => isInDiffRightEditorKey.set(false)));
        return editor;
    }
    _constructInnerEditor(instantiationService, container, options, editorWidgetOptions) {
        const editor = this._createInnerEditor(instantiationService, container, options, editorWidgetOptions);
        this._register(editor.onDidContentSizeChange(e => {
            const width = this.original.getContentWidth() + this.modified.getContentWidth() + OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH;
            const height = Math.max(this.modified.getContentHeight(), this.original.getContentHeight());
            this._onDidContentSizeChange.fire({
                contentHeight: height,
                contentWidth: width,
                contentHeightChanged: e.contentHeightChanged,
                contentWidthChanged: e.contentWidthChanged
            });
        }));
        return editor;
    }
    _adjustOptionsForLeftHandSide(_reader, changedOptions) {
        const result = this._adjustOptionsForSubEditor(changedOptions);
        if (!this._options.renderSideBySide.get()) {
            // never wrap hidden editor
            result.wordWrapOverride1 = 'off';
            result.wordWrapOverride2 = 'off';
            result.stickyScroll = { enabled: false };
            // Disable unicode highlighting for the original side in inline mode, as they are not shown anyway.
            result.unicodeHighlight = { nonBasicASCII: false, ambiguousCharacters: false, invisibleCharacters: false };
        }
        else {
            result.unicodeHighlight = this._options.editorOptions.get().unicodeHighlight || {};
            result.wordWrapOverride1 = this._options.diffWordWrap.get();
        }
        result.glyphMargin = this._options.renderSideBySide.get();
        if (changedOptions.originalAriaLabel) {
            result.ariaLabel = changedOptions.originalAriaLabel;
        }
        result.ariaLabel = this._updateAriaLabel(result.ariaLabel);
        result.readOnly = !this._options.originalEditable.get();
        result.dropIntoEditor = { enabled: !result.readOnly };
        result.extraEditorClassName = 'original-in-monaco-diff-editor';
        return result;
    }
    _adjustOptionsForRightHandSide(reader, changedOptions) {
        const result = this._adjustOptionsForSubEditor(changedOptions);
        if (changedOptions.modifiedAriaLabel) {
            result.ariaLabel = changedOptions.modifiedAriaLabel;
        }
        result.ariaLabel = this._updateAriaLabel(result.ariaLabel);
        result.wordWrapOverride1 = this._options.diffWordWrap.get();
        result.revealHorizontalRightPadding = EditorOptions.revealHorizontalRightPadding.defaultValue + OverviewRulerFeature.ENTIRE_DIFF_OVERVIEW_WIDTH;
        result.scrollbar.verticalHasArrows = false;
        result.extraEditorClassName = 'modified-in-monaco-diff-editor';
        return result;
    }
    _adjustOptionsForSubEditor(options) {
        const clonedOptions = {
            ...options,
            dimension: {
                height: 0,
                width: 0
            },
        };
        clonedOptions.inDiffEditor = true;
        clonedOptions.automaticLayout = false;
        clonedOptions.allowVariableLineHeights = false;
        clonedOptions.allowVariableFonts = false;
        clonedOptions.allowVariableFontsInAccessibilityMode = false;
        // Clone scrollbar options before changing them
        clonedOptions.scrollbar = { ...(clonedOptions.scrollbar || {}) };
        clonedOptions.folding = false;
        clonedOptions.codeLens = this._options.diffCodeLens.get();
        clonedOptions.fixedOverflowWidgets = true;
        // Clone minimap options before changing them
        clonedOptions.minimap = { ...(clonedOptions.minimap || {}) };
        clonedOptions.minimap.enabled = false;
        if (this._options.hideUnchangedRegions.get()) {
            clonedOptions.stickyScroll = { enabled: false };
        }
        else {
            clonedOptions.stickyScroll = this._options.editorOptions.get().stickyScroll;
        }
        return clonedOptions;
    }
    _updateAriaLabel(ariaLabel) {
        if (!ariaLabel) {
            ariaLabel = '';
        }
        const ariaNavigationTip = localize('diff-aria-navigation-tip', ' use {0} to open the accessibility help.', this._keybindingService.lookupKeybinding('editor.action.accessibilityHelp')?.getAriaLabel());
        if (this._options.accessibilityVerbose.get()) {
            return ariaLabel + ariaNavigationTip;
        }
        else if (ariaLabel) {
            return ariaLabel.replaceAll(ariaNavigationTip, '');
        }
        return '';
    }
};
DiffEditorEditors = __decorate([
    __param(5, IContextKeyService),
    __param(6, IInstantiationService),
    __param(7, IKeybindingService)
], DiffEditorEditors);
export { DiffEditorEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2NvbXBvbmVudHMvZGlmZkVkaXRvckVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQVcsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR3BJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sNENBQTRDLENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUV0RixJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFLaEQsSUFBVyxzQkFBc0IsS0FBSyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBb0JsRixZQUNrQixxQkFB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