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
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorun } from '../../../../../base/common/observable.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane } from '../../../notebook/browser/notebookBrowser.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
import { getPromptsTypeForLanguageId } from '../../common/promptSyntax/promptTypes.js';
import { IChatWidgetService } from '../chat.js';
let ChatImplicitContextContribution = class ChatImplicitContextContribution extends Disposable {
    static { this.ID = 'chat.implicitContext'; }
    constructor(codeEditorService, editorService, chatWidgetService, chatService, chatEditingService, configurationService, ignoredFilesService) {
        super();
        this.codeEditorService = codeEditorService;
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.chatEditingService = chatEditingService;
        this.configurationService = configurationService;
        this.ignoredFilesService = ignoredFilesService;
        this._currentCancelTokenSource = this._register(new MutableDisposable());
        this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
        const activeEditorDisposables = this._register(new DisposableStore());
        this._register(Event.runAndSubscribe(editorService.onDidActiveEditorChange, (() => {
            activeEditorDisposables.clear();
            const codeEditor = this.findActiveCodeEditor();
            if (codeEditor) {
                activeEditorDisposables.add(Event.debounce(Event.any(codeEditor.onDidChangeModel, codeEditor.onDidChangeModelLanguage, codeEditor.onDidChangeCursorSelection, codeEditor.onDidScrollChange), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            const notebookEditor = this.findActiveNotebookEditor();
            if (notebookEditor) {
                const activeCellDisposables = activeEditorDisposables.add(new DisposableStore());
                activeEditorDisposables.add(notebookEditor.onDidChangeActiveCell(() => {
                    activeCellDisposables.clear();
                    const codeEditor = this.codeEditorService.getActiveCodeEditor();
                    if (codeEditor && codeEditor.getModel()?.uri.scheme === Schemas.vscodeNotebookCell) {
                        activeCellDisposables.add(Event.debounce(Event.any(codeEditor.onDidChangeModel, codeEditor.onDidChangeCursorSelection, codeEditor.onDidScrollChange), () => undefined, 500)(() => this.updateImplicitContext()));
                    }
                }));
                activeEditorDisposables.add(Event.debounce(Event.any(notebookEditor.onDidChangeModel, notebookEditor.onDidChangeActiveCell), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            this.updateImplicitContext();
        })));
        this._register(autorun((reader) => {
            this.chatEditingService.editingSessionsObs.read(reader);
            this.updateImplicitContext();
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('chat.implicitContext.enabled')) {
                this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
                this.updateImplicitContext();
            }
        }));
        this._register(this.chatService.onDidSubmitRequest(({ chatSessionId }) => {
            const widget = this.chatWidgetService.getWidgetBySessionId(chatSessionId);
            if (!widget?.input.implicitContext) {
                return;
            }
            if (this._implicitContextEnablement[widget.location] === 'first' && widget.viewModel?.getItems().length !== 0) {
                widget.input.implicitContext.setValue(undefined, false, undefined);
            }
        }));
        this._register(this.chatWidgetService.onDidAddWidget(async (widget) => {
            await this.updateImplicitContext(widget);
        }));
    }
    findActiveCodeEditor() {
        const codeEditor = this.codeEditorService.getActiveCodeEditor();
        if (codeEditor) {
            const model = codeEditor.getModel();
            if (model?.uri.scheme === Schemas.vscodeNotebookCell) {
                return undefined;
            }
            if (model) {
                return codeEditor;
            }
        }
        for (const codeOrDiffEditor of this.editorService.getVisibleTextEditorControls(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            const codeEditor = getCodeEditor(codeOrDiffEditor);
            if (!codeEditor) {
                continue;
            }
            const model = codeEditor.getModel();
            if (model) {
                return codeEditor;
            }
        }
        return undefined;
    }
    findActiveNotebookEditor() {
        return getNotebookEditorFromEditorPane(this.editorService.activeEditorPane);
    }
    async updateImplicitContext(updateWidget) {
        const cancelTokenSource = this._currentCancelTokenSource.value = new CancellationTokenSource();
        const codeEditor = this.findActiveCodeEditor();
        const model = codeEditor?.getModel();
        const selection = codeEditor?.getSelection();
        let newValue;
        let isSelection = false;
        let languageId;
        if (model) {
            languageId = model.getLanguageId();
            if (selection && !selection.isEmpty()) {
                newValue = { uri: model.uri, range: selection };
                isSelection = true;
            }
            else {
                if (this.configurationService.getValue('chat.implicitContext.suggestedContext')) {
                    newValue = model.uri;
                }
                else {
                    const visibleRanges = codeEditor?.getVisibleRanges();
                    if (visibleRanges && visibleRanges.length > 0) {
                        // Merge visible ranges. Maybe the reference value could actually be an array of Locations?
                        // Something like a Location with an array of Ranges?
                        let range = visibleRanges[0];
                        visibleRanges.slice(1).forEach(r => {
                            range = range.plusRange(r);
                        });
                        newValue = { uri: model.uri, range };
                    }
                    else {
                        newValue = model.uri;
                    }
                }
            }
        }
        const notebookEditor = this.findActiveNotebookEditor();
        if (notebookEditor) {
            const activeCell = notebookEditor.getActiveCell();
            if (activeCell) {
                const codeEditor = this.codeEditorService.getActiveCodeEditor();
                const selection = codeEditor?.getSelection();
                const visibleRanges = codeEditor?.getVisibleRanges() || [];
                newValue = activeCell.uri;
                if (isEqual(codeEditor?.getModel()?.uri, activeCell.uri)) {
                    if (selection && !selection.isEmpty()) {
                        newValue = { uri: activeCell.uri, range: selection };
                        isSelection = true;
                    }
                    else if (visibleRanges.length > 0) {
                        // Merge visible ranges. Maybe the reference value could actually be an array of Locations?
                        // Something like a Location with an array of Ranges?
                        let range = visibleRanges[0];
                        visibleRanges.slice(1).forEach(r => {
                            range = range.plusRange(r);
                        });
                        newValue = { uri: activeCell.uri, range };
                    }
                }
            }
            else {
                newValue = notebookEditor.textModel?.uri;
            }
        }
        const uri = newValue instanceof URI ? newValue : newValue?.uri;
        if (uri && (await this.ignoredFilesService.fileIsIgnored(uri, cancelTokenSource.token) ||
            uri.path.endsWith('.copilotmd'))) {
            newValue = undefined;
        }
        if (cancelTokenSource.token.isCancellationRequested) {
            return;
        }
        const isPromptFile = languageId && getPromptsTypeForLanguageId(languageId) !== undefined;
        const widgets = updateWidget ? [updateWidget] : [...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel), ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Editor)];
        for (const widget of widgets) {
            if (!widget.input.implicitContext) {
                continue;
            }
            const setting = this._implicitContextEnablement[widget.location];
            const isFirstInteraction = widget.viewModel?.getItems().length === 0;
            if ((setting === 'always' || setting === 'first' && isFirstInteraction) && !isPromptFile) { // disable implicit context for prompt files
                widget.input.implicitContext.setValue(newValue, isSelection, languageId);
            }
            else {
                widget.input.implicitContext.setValue(undefined, false, undefined);
            }
        }
    }
};
ChatImplicitContextContribution = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IEditorService),
    __param(2, IChatWidgetService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IConfigurationService),
    __param(6, ILanguageModelIgnoredFilesService)
], ChatImplicitContextContribution);
export { ChatImplicitContextContribution };
export class ChatImplicitContext extends Disposable {
    constructor() {
        super(...arguments);
        this.kind = 'implicit';
        this.isFile = true;
        this._isSelection = false;
        this._onDidChangeValue = this._register(new Emitter());
        this.onDidChangeValue = this._onDidChangeValue.event;
        this._enabled = true;
    }
    get id() {
        if (URI.isUri(this.value)) {
            return 'vscode.implicit.file';
        }
        else if (this.value) {
            if (this._isSelection) {
                return 'vscode.implicit.selection';
            }
            else {
                return 'vscode.implicit.viewport';
            }
        }
        else {
            return 'vscode.implicit';
        }
    }
    get name() {
        if (URI.isUri(this.value)) {
            return `file:${basename(this.value)}`;
        }
        else if (this.value) {
            return `file:${basename(this.value.uri)}`;
        }
        else {
            return 'implicit';
        }
    }
    get modelDescription() {
        if (URI.isUri(this.value)) {
            return `User's active file`;
        }
        else if (this._isSelection) {
            return `User's active selection`;
        }
        else {
            return `User's current visible code`;
        }
    }
    get isSelection() {
        return this._isSelection;
    }
    get value() {
        return this._value;
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        this._onDidChangeValue.fire();
    }
    setValue(value, isSelection, languageId) {
        this._value = value;
        this._isSelection = isSelection;
        this._onDidChangeValue.fire();
    }
    toBaseEntries() {
        return [{
                kind: 'file',
                id: this.id,
                name: this.name,
                value: this.value,
                modelDescription: this.modelDescription,
            }];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEltcGxpY2l0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdEltcGxpY2l0Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sZ0RBQWdELENBQUM7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwrQkFBK0IsRUFBbUIsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENB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