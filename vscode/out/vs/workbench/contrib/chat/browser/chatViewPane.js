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
import { $, getWindow } from '../../../../base/browser/dom.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { SIDE_BAR_FOREGROUND } from '../../../common/theme.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { CHAT_PROVIDER_ID } from '../common/chatParticipantContribTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { ChatWidget } from './chatWidget.js';
import { ChatViewWelcomeController } from './viewsWelcome/chatViewWelcomeController.js';
export const CHAT_SIDEBAR_OLD_VIEW_PANEL_ID = 'workbench.panel.chatSidebar';
export const CHAT_SIDEBAR_PANEL_ID = 'workbench.panel.chat';
let ChatViewPane = class ChatViewPane extends ViewPane {
    get widget() { return this._widget; }
    constructor(chatOptions, options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, storageService, chatService, chatAgentService, logService, layoutService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.chatOptions = chatOptions;
        this.storageService = storageService;
        this.chatService = chatService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.layoutService = layoutService;
        this.modelDisposables = this._register(new DisposableStore());
        // View state for the ViewPane is currently global per-provider basically, but some other strictly per-model state will require a separate memento.
        this.memento = new Memento('interactive-session-view-' + CHAT_PROVIDER_ID, this.storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        if (this.chatOptions.location === ChatAgentLocation.Panel && !this.viewState.hasMigratedCurrentSession) {
            const editsMemento = new Memento('interactive-session-view-' + CHAT_PROVIDER_ID + `-edits`, this.storageService);
            const lastEditsState = editsMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            if (lastEditsState.sessionId) {
                this.logService.trace(`ChatViewPane: last edits session was ${lastEditsState.sessionId}`);
                if (!this.chatService.isPersistedSessionEmpty(lastEditsState.sessionId)) {
                    this.logService.info(`ChatViewPane: migrating ${lastEditsState.sessionId} to unified view`);
                    this.viewState.sessionId = lastEditsState.sessionId;
                    this.viewState.inputValue = lastEditsState.inputValue;
                    this.viewState.inputState = {
                        ...lastEditsState.inputState,
                        chatMode: lastEditsState.inputState?.chatMode ?? ChatModeKind.Edit
                    };
                    this.viewState.hasMigratedCurrentSession = true;
                }
            }
        }
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (this.chatAgentService.getDefaultAgent(this.chatOptions?.location)) {
                if (!this._widget?.viewModel && !this._restoringSession) {
                    const info = this.getTransferredOrPersistedSessionInfo();
                    this._restoringSession =
                        (info.sessionId ? this.chatService.getOrRestoreSession(info.sessionId) : Promise.resolve(undefined)).then(async (model) => {
                            if (!this._widget) {
                                // renderBody has not been called yet
                                return;
                            }
                            // The widget may be hidden at this point, because welcome views were allowed. Use setVisible to
                            // avoid doing a render while the widget is hidden. This is changing the condition in `shouldShowWelcome`
                            // so it should fire onDidChangeViewWelcomeState.
                            const wasVisible = this._widget.visible;
                            try {
                                this._widget.setVisible(false);
                                await this.updateModel(model, info.inputValue || info.mode ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue } : undefined);
                            }
                            finally {
                                this.widget.setVisible(wasVisible);
                            }
                        });
                    this._restoringSession.finally(() => this._restoringSession = undefined);
                }
            }
            this._onDidChangeViewWelcomeState.fire();
        }));
        // Location context key
        ChatContextKeys.panelLocation.bindTo(contextKeyService).set(viewDescriptorService.getViewLocationById(options.id) ?? 2 /* ViewContainerLocation.AuxiliaryBar */);
    }
    getActionsContext() {
        return this.widget?.viewModel ? {
            sessionId: this.widget.viewModel.sessionId,
            $mid: 19 /* MarshalledId.ChatViewContext */
        } : undefined;
    }
    async updateModel(model, viewState) {
        this.modelDisposables.clear();
        model = model ?? (this.chatService.transferredSessionData?.sessionId && this.chatService.transferredSessionData?.location === this.chatOptions.location
            ? await this.chatService.getOrRestoreSession(this.chatService.transferredSessionData.sessionId)
            : this.chatService.startSession(this.chatOptions.location, CancellationToken.None));
        if (!model) {
            throw new Error('Could not start chat session');
        }
        if (viewState) {
            this.updateViewState(viewState);
        }
        this.viewState.sessionId = model.sessionId;
        this._widget.setModel(model, { ...this.viewState });
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    shouldShowWelcome() {
        const noPersistedSessions = !this.chatService.hasSessions();
        const hasCoreAgent = this.chatAgentService.getAgents().some(agent => agent.isCore && agent.locations.includes(this.chatOptions.location));
        const hasDefaultAgent = this.chatAgentService.getDefaultAgent(this.chatOptions.location) !== undefined; // only false when Hide Copilot has run and unregistered the setup agents
        const shouldShow = !hasCoreAgent && (!hasDefaultAgent || !this._widget?.viewModel && noPersistedSessions);
        this.logService.trace(`ChatViewPane#shouldShowWelcome(${this.chatOptions.location}) = ${shouldShow}: hasCoreAgent=${hasCoreAgent} hasDefaultAgent=${hasDefaultAgent} || noViewModel=${!this._widget?.viewModel} && noPersistedSessions=${noPersistedSessions}`);
        return !!shouldShow;
    }
    getTransferredOrPersistedSessionInfo() {
        if (this.chatService.transferredSessionData?.location === this.chatOptions.location) {
            const sessionId = this.chatService.transferredSessionData.sessionId;
            return {
                sessionId,
                inputValue: this.chatService.transferredSessionData.inputValue,
                mode: this.chatService.transferredSessionData.mode
            };
        }
        else {
            return { sessionId: this.viewState.sessionId };
        }
    }
    async renderBody(parent) {
        try {
            super.renderBody(parent);
            this._register(this.instantiationService.createInstance(ChatViewWelcomeController, parent, this, this.chatOptions.location));
            const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
            const locationBasedColors = this.getLocationBasedColors();
            const editorOverflowNode = this.layoutService.getContainer(getWindow(parent)).appendChild($('.chat-editor-overflow.monaco-editor'));
            this._register({ dispose: () => editorOverflowNode.remove() });
            this._widget = this._register(scopedInstantiationService.createInstance(ChatWidget, this.chatOptions.location, { viewId: this.id }, {
                autoScroll: mode => mode !== ChatModeKind.Ask,
                renderFollowups: this.chatOptions.location === ChatAgentLocation.Panel,
                supportsFileReferences: true,
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        return true;
                    },
                    referencesExpandedWhenEmptyResponse: false,
                    progressMessageAtBottomOfResponse: mode => mode !== ChatModeKind.Ask,
                },
                editorOverflowWidgetsDomNode: editorOverflowNode,
                enableImplicitContext: this.chatOptions.location === ChatAgentLocation.Panel,
                enableWorkingSet: 'explicit',
                supportsChangingModes: true,
            }, {
                listForeground: SIDE_BAR_FOREGROUND,
                listBackground: locationBasedColors.background,
                overlayBackground: locationBasedColors.overlayBackground,
                inputEditorBackground: locationBasedColors.background,
                resultEditorBackground: editorBackground,
            }));
            this._register(this.onDidChangeBodyVisibility(visible => {
                this._widget.setVisible(visible);
            }));
            this._register(this._widget.onDidClear(() => this.clear()));
            this._widget.render(parent);
            const info = this.getTransferredOrPersistedSessionInfo();
            const model = info.sessionId ? await this.chatService.getOrRestoreSession(info.sessionId) : undefined;
            await this.updateModel(model, info.inputValue || info.mode ? { inputState: { chatMode: info.mode }, inputValue: info.inputValue } : undefined);
        }
        catch (e) {
            this.logService.error(e);
            throw e;
        }
    }
    acceptInput(query) {
        this._widget.acceptInput(query);
    }
    async clear() {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        // Grab the widget's latest view state because it will be loaded back into the widget
        this.updateViewState();
        await this.updateModel(undefined);
        // Update the toolbar context with new sessionId
        this.updateActions();
    }
    async loadSession(sessionId, viewState) {
        if (this.widget.viewModel) {
            await this.chatService.clearSession(this.widget.viewModel.sessionId);
        }
        const newModel = await this.chatService.getOrRestoreSession(sessionId);
        await this.updateModel(newModel, viewState);
    }
    focusInput() {
        this._widget.focusInput();
    }
    focus() {
        super.focus();
        this._widget.focusInput();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._widget.layout(height, width);
    }
    saveState() {
        if (this._widget) {
            // Since input history is per-provider, this is handled by a separate service and not the memento here.
            // TODO multiple chat views will overwrite each other
            this._widget.saveState();
            this.updateViewState();
            this.memento.saveMemento();
        }
        super.saveState();
    }
    updateViewState(viewState) {
        const newViewState = viewState ?? this._widget.getViewState();
        for (const [key, value] of Object.entries(newViewState)) {
            // Assign all props to the memento so they get saved
            this.viewState[key] = value;
        }
    }
};
ChatViewPane = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IStorageService),
    __param(12, IChatService),
    __param(13, IChatAgentService),
    __param(14, ILogService),
    __param(15, ILayoutService)
], ChatViewPane);
export { ChatViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FB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