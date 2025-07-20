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
var AbstractTextEditor_1;
import { localize } from '../../../../nls.js';
import { distinct, deepClone } from '../../../../base/common/objects.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isObject, assertReturnsDefined } from '../../../../base/common/types.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { computeEditorAriaLabel } from '../../editor.js';
import { AbstractEditorWithViewState } from './editorWithViewState.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
/**
 * The base class of editors that leverage any kind of text editor for the editing experience.
 */
let AbstractTextEditor = class AbstractTextEditor extends AbstractEditorWithViewState {
    static { AbstractTextEditor_1 = this; }
    static { this.VIEW_STATE_PREFERENCE_KEY = 'textEditorViewState'; }
    constructor(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService) {
        super(id, group, AbstractTextEditor_1.VIEW_STATE_PREFERENCE_KEY, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.fileService = fileService;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this.inputListener = this._register(new MutableDisposable());
        // Listen to configuration changes
        this._register(this.textResourceConfigurationService.onDidChangeConfiguration(e => this.handleConfigurationChangeEvent(e)));
        // ARIA: if a group is added or removed, update the editor's ARIA
        // label so that it appears in the label for when there are > 1 groups
        this._register(Event.any(this.editorGroupService.onDidAddGroup, this.editorGroupService.onDidRemoveGroup)(() => {
            const ariaLabel = this.computeAriaLabel();
            this.editorContainer?.setAttribute('aria-label', ariaLabel);
            this.updateEditorControlOptions({ ariaLabel });
        }));
        // Listen to file system provider changes
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities(e => this.onDidChangeFileSystemProvider(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations(e => this.onDidChangeFileSystemProvider(e.scheme)));
    }
    handleConfigurationChangeEvent(e) {
        const resource = this.getActiveResource();
        if (!this.shouldHandleConfigurationChangeEvent(e, resource)) {
            return;
        }
        if (this.isVisible()) {
            this.updateEditorConfiguration(resource);
        }
        else {
            this.hasPendingConfigurationChange = true;
        }
    }
    shouldHandleConfigurationChangeEvent(e, resource) {
        return e.affectsConfiguration(resource, 'editor') || e.affectsConfiguration(resource, 'problems.visibility');
    }
    consumePendingConfigurationChangeEvent() {
        if (this.hasPendingConfigurationChange) {
            this.updateEditorConfiguration();
            this.hasPendingConfigurationChange = false;
        }
    }
    computeConfiguration(configuration) {
        // Specific editor options always overwrite user configuration
        const editorConfiguration = isObject(configuration.editor) ? deepClone(configuration.editor) : Object.create(null);
        Object.assign(editorConfiguration, this.getConfigurationOverrides(configuration));
        // ARIA label
        editorConfiguration.ariaLabel = this.computeAriaLabel();
        return editorConfiguration;
    }
    computeAriaLabel() {
        return this.input ? computeEditorAriaLabel(this.input, undefined, this.group, this.editorGroupService.count) : localize('editor', "Editor");
    }
    onDidChangeFileSystemProvider(scheme) {
        if (!this.input) {
            return;
        }
        if (this.getActiveResource()?.scheme === scheme) {
            this.updateReadonly(this.input);
        }
    }
    onDidChangeInputCapabilities(input) {
        if (this.input === input) {
            this.updateReadonly(input);
        }
    }
    updateReadonly(input) {
        this.updateEditorControlOptions({ ...this.getReadonlyConfiguration(input.isReadonly()) });
    }
    getReadonlyConfiguration(isReadonly) {
        return {
            readOnly: !!isReadonly,
            readOnlyMessage: typeof isReadonly !== 'boolean' ? isReadonly : undefined
        };
    }
    getConfigurationOverrides(configuration) {
        return {
            overviewRulerLanes: 3,
            lineNumbersMinChars: 3,
            fixedOverflowWidgets: true,
            ...this.getReadonlyConfiguration(this.input?.isReadonly()),
            renderValidationDecorations: configuration.problems?.visibility !== false ? 'on' : 'off'
        };
    }
    createEditor(parent) {
        // Create editor control
        this.editorContainer = parent;
        this.createEditorControl(parent, this.computeConfiguration(this.textResourceConfigurationService.getValue(this.getActiveResource())));
        // Listeners
        this.registerCodeEditorListeners();
    }
    registerCodeEditorListeners() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            this._register(mainControl.onDidChangeModelLanguage(() => this.updateEditorConfiguration()));
            this._register(mainControl.onDidChangeModel(() => this.updateEditorConfiguration()));
            this._register(mainControl.onDidChangeCursorPosition(e => this._onDidChangeSelection.fire({ reason: this.toEditorPaneSelectionChangeReason(e) })));
            this._register(mainControl.onDidChangeModelContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
            this._register(mainControl.onDidScrollChange(() => this._onDidChangeScroll.fire()));
        }
    }
    toEditorPaneSelectionChangeReason(e) {
        switch (e.source) {
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */: return 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */;
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */: return 4 /* EditorPaneSelectionChangeReason.NAVIGATION */;
            case "code.jump" /* TextEditorSelectionSource.JUMP */: return 5 /* EditorPaneSelectionChangeReason.JUMP */;
            default: return 2 /* EditorPaneSelectionChangeReason.USER */;
        }
    }
    getSelection() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            const selection = mainControl.getSelection();
            if (selection) {
                return new TextEditorPaneSelection(selection);
            }
        }
        return undefined;
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        // Update our listener for input capabilities
        this.inputListener.value = input.onDidChangeCapabilities(() => this.onDidChangeInputCapabilities(input));
        // Update editor options after having set the input. We do this because there can be
        // editor input specific options (e.g. an ARIA label depending on the input showing)
        this.updateEditorConfiguration();
        // Update aria label on editor
        const editorContainer = assertReturnsDefined(this.editorContainer);
        editorContainer.setAttribute('aria-label', this.computeAriaLabel());
    }
    clearInput() {
        // Clear input listener
        this.inputListener.clear();
        super.clearInput();
    }
    getScrollPosition() {
        const editor = this.getMainControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        return {
            // The top position can vary depending on the view zones (find widget for example)
            scrollTop: editor.getScrollTop() - editor.getTopForLineNumber(1),
            scrollLeft: editor.getScrollLeft(),
        };
    }
    setScrollPosition(scrollPosition) {
        const editor = this.getMainControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        editor.setScrollTop(scrollPosition.scrollTop);
        if (scrollPosition.scrollLeft) {
            editor.setScrollLeft(scrollPosition.scrollLeft);
        }
    }
    setEditorVisible(visible) {
        if (visible) {
            this.consumePendingConfigurationChangeEvent();
        }
        super.setEditorVisible(visible);
    }
    toEditorViewStateResource(input) {
        return input.resource;
    }
    updateEditorConfiguration(resource = this.getActiveResource()) {
        let configuration = undefined;
        if (resource) {
            configuration = this.textResourceConfigurationService.getValue(resource);
        }
        if (!configuration) {
            return;
        }
        const editorConfiguration = this.computeConfiguration(configuration);
        // Try to figure out the actual editor options that changed from the last time we updated the editor.
        // We do this so that we are not overwriting some dynamic editor settings (e.g. word wrap) that might
        // have been applied to the editor directly.
        let editorSettingsToApply = editorConfiguration;
        if (this.lastAppliedEditorOptions) {
            editorSettingsToApply = distinct(this.lastAppliedEditorOptions, editorSettingsToApply);
        }
        if (Object.keys(editorSettingsToApply).length > 0) {
            this.lastAppliedEditorOptions = editorConfiguration;
            this.updateEditorControlOptions(editorSettingsToApply);
        }
    }
    getActiveResource() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            const model = mainControl.getModel();
            if (model) {
                return model.uri;
            }
        }
        if (this.input) {
            return this.input.resource;
        }
        return undefined;
    }
    dispose() {
        this.lastAppliedEditorOptions = undefined;
        super.dispose();
    }
};
AbstractTextEditor = AbstractTextEditor_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IThemeService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IFileService)
], AbstractTextEditor);
export { AbstractTextEditor };
export class TextEditorPaneSelection {
    static { this.TEXT_EDITOR_SELECTION_THRESHOLD = 10; } // number of lines to move in editor to justify for significant change
    constructor(textSelection) {
        this.textSelection = textSelection;
    }
    compare(other) {
        if (!(other instanceof TextEditorPaneSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        const thisLineNumber = Math.min(this.textSelection.selectionStartLineNumber, this.textSelection.positionLineNumber);
        const otherLineNumber = Math.min(other.textSelection.selectionStartLineNumber, other.textSelection.positionLineNumber);
        if (thisLineNumber === otherLineNumber) {
            return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
        }
        if (Math.abs(thisLineNumber - otherLineNumber) < TextEditorPaneSelection.TEXT_EDITOR_SELECTION_THRESHOLD) {
            return 2 /* EditorPaneSelectionCompareResult.SIMILAR */; // when in close proximity, treat selection as being similar
        }
        return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
    restore(options) {
        const textEditorOptions = {
            ...options,
            selection: this.textSelection,
            selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */
        };
        return textEditorOptions;
    }
    log() {
        return `line: ${this.textSelection.startLineNumber}-${this.textSelection.endLineNumber}, col:  ${this.textSelection.startColumn}-${this.textSelection.endColumn}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSXpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3pELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUF5QyxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBRTNKLE9BQU8sRUFBZ0Isb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFHbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxN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