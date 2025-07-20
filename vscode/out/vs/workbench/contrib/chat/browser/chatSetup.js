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
var SetupAgent_1, ChatSetup_1;
import './media/chatSetup.css';
import { $ } from '../../../../base/browser/dom.js';
import { Dialog, DialogContentsAlignment } from '../../../../base/browser/ui/dialog/dialog.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, markAsSingleton, MutableDisposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { ExtensionUrlHandlerOverrideRegistry } from '../../../services/extensions/browser/extensionUrlHandler.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, ChatEntitlementRequests, IChatEntitlementService, isProUser } from '../common/chatEntitlementService.js';
import { ChatRequestModel } from '../common/chatModel.js';
import { ChatRequestAgentPart, ChatRequestToolPart } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind, validateChatMode } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { CHAT_CATEGORY, CHAT_OPEN_ACTION_ID, CHAT_SETUP_ACTION_ID } from './actions/chatActions.js';
import { ChatViewId, IChatWidgetService, showCopilotView } from './chat.js';
import { CHAT_SIDEBAR_PANEL_ID } from './chatViewPane.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { ChatMode } from '../common/chatModes.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    skusDocumentationUrl: product.defaultChatAgent?.skusDocumentationUrl ?? '',
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    manageOveragesUrl: product.defaultChatAgent?.manageOverageUrl ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { id: '', name: '' }, enterprise: { id: '', name: '' }, apple: { id: '', name: '' }, google: { id: '', name: '' } },
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    walkthroughCommand: product.defaultChatAgent?.walkthroughCommand ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
};
//#region Contribution
const ToolsAgentContextKey = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${ChatConfiguration.AgentEnabled}`, true), ContextKeyExpr.not(`previewFeaturesDisabled`) // Set by extension
);
let SetupAgent = class SetupAgent extends Disposable {
    static { SetupAgent_1 = this; }
    static registerDefaultAgents(instantiationService, location, mode, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const chatAgentService = accessor.get(IChatAgentService);
            let id;
            let description = ChatMode.Ask.description.get();
            switch (location) {
                case ChatAgentLocation.Panel:
                    if (mode === ChatModeKind.Ask) {
                        id = 'setup.chat';
                    }
                    else if (mode === ChatModeKind.Edit) {
                        id = 'setup.edits';
                        description = ChatMode.Edit.description.get();
                    }
                    else {
                        id = 'setup.agent';
                        description = ChatMode.Agent.description.get();
                    }
                    break;
                case ChatAgentLocation.Terminal:
                    id = 'setup.terminal';
                    break;
                case ChatAgentLocation.Editor:
                    id = 'setup.editor';
                    break;
                case ChatAgentLocation.Notebook:
                    id = 'setup.notebook';
                    break;
            }
            return SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, id, `${defaultChat.provider.default.name} Copilot`, true, description, location, mode, context, controller);
        });
    }
    static registerVSCodeAgent(instantiationService, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const chatAgentService = accessor.get(IChatAgentService);
            const disposables = new DisposableStore();
            const { agent, disposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.vscode', 'vscode', false, localize2('vscodeAgentDescription', "Ask questions about VS Code").value, ChatAgentLocation.Panel, undefined, context, controller);
            disposables.add(disposable);
            disposables.add(SetupTool.registerTool(instantiationService, {
                id: 'setup.tools.createNewWorkspace',
                source: ToolDataSource.Internal,
                icon: Codicon.newFolder,
                displayName: localize('setupToolDisplayName', "New Workspace"),
                modelDescription: localize('setupToolsDescription', "Scaffold a new workspace in VS Code"),
                userDescription: localize('setupToolsDescription', "Scaffold a new workspace in VS Code"),
                canBeReferencedInPrompt: true,
                toolReferenceName: 'new',
                when: ContextKeyExpr.true(),
            }).disposable);
            return { agent, disposable: disposables };
        });
    }
    static doRegisterAgent(instantiationService, chatAgentService, id, name, isDefault, description, location, mode, context, controller) {
        const disposables = new DisposableStore();
        disposables.add(chatAgentService.registerAgent(id, {
            id,
            name,
            isDefault,
            isCore: true,
            modes: mode ? [mode] : [ChatModeKind.Ask],
            when: mode === ChatModeKind.Agent ? ToolsAgentContextKey?.serialize() : undefined,
            slashCommands: [],
            disambiguation: [],
            locations: [location],
            metadata: { helpTextPrefix: SetupAgent_1.SETUP_NEEDED_MESSAGE },
            description,
            extensionId: nullExtensionDescription.identifier,
            extensionDisplayName: nullExtensionDescription.name,
            extensionPublisherId: nullExtensionDescription.publisher
        }));
        const agent = disposables.add(instantiationService.createInstance(SetupAgent_1, context, controller, location));
        disposables.add(chatAgentService.registerAgentImplementation(id, agent));
        if (mode === ChatModeKind.Agent) {
            chatAgentService.updateAgent(id, { themeIcon: Codicon.tools });
        }
        return { agent, disposable: disposables };
    }
    static { this.SETUP_NEEDED_MESSAGE = new MarkdownString(localize('settingUpCopilotNeeded', "You need to set up Copilot and be signed in to use Chat.")); }
    static { this.TRUST_NEEDED_MESSAGE = new MarkdownString(localize('trustNeeded', "You need to trust this workspace to use Chat.")); }
    constructor(context, controller, location, instantiationService, logService, configurationService, telemetryService, environmentService, workspaceTrustManagementService) {
        super();
        this.context = context;
        this.controller = controller;
        this.location = location;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this._onUnresolvableError = this._register(new Emitter());
        this.onUnresolvableError = this._onUnresolvableError.event;
        this.pendingForwardedRequests = new Map();
    }
    async invoke(request, progress) {
        return this.instantiationService.invokeFunction(async (accessor /* using accessor for lazy loading */) => {
            const chatService = accessor.get(IChatService);
            const languageModelsService = accessor.get(ILanguageModelsService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            const languageModelToolsService = accessor.get(ILanguageModelToolsService);
            return this.doInvoke(request, part => progress([part]), chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
        });
    }
    async doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        if (!this.context.state.installed || this.context.state.disabled || this.context.state.untrusted || this.context.state.entitlement === ChatEntitlement.Available || this.context.state.entitlement === ChatEntitlement.Unknown) {
            return this.doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
        }
        return this.doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
    }
    async doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        const requestModel = chatWidgetService.getWidgetBySessionId(request.sessionId)?.viewModel?.model.getRequests().at(-1);
        if (!requestModel) {
            this.logService.error('[chat setup] Request model not found, cannot redispatch request.');
            return {}; // this should not happen
        }
        progress({
            kind: 'progressMessage',
            content: new MarkdownString(localize('waitingCopilot', "Getting Copilot ready")),
        });
        await this.forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        return {};
    }
    async forwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        try {
            await this.doForwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        }
        catch (error) {
            progress({
                kind: 'warning',
                content: new MarkdownString(localize('copilotUnavailableWarning', "Copilot failed to get a response. Please try again."))
            });
        }
    }
    async doForwardRequestToCopilot(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        if (this.pendingForwardedRequests.has(requestModel.session.sessionId)) {
            throw new Error('Request already in progress');
        }
        const forwardRequest = this.doForwardRequestToCopilotWhenReady(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        this.pendingForwardedRequests.set(requestModel.session.sessionId, forwardRequest);
        try {
            await forwardRequest;
        }
        finally {
            this.pendingForwardedRequests.delete(requestModel.session.sessionId);
        }
    }
    async doForwardRequestToCopilotWhenReady(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        const widget = chatWidgetService.getWidgetBySessionId(requestModel.session.sessionId);
        const mode = widget?.input.currentModeKind;
        const languageModel = widget?.input.currentLanguageModel;
        // We need a signal to know when we can resend the request to
        // Copilot. Waiting for the registration of the agent is not
        // enough, we also need a language/tools model to be available.
        const whenAgentReady = this.whenAgentReady(chatAgentService, mode);
        const whenLanguageModelReady = this.whenLanguageModelReady(languageModelsService);
        const whenToolsModelReady = this.whenToolsModelReady(languageModelToolsService, requestModel);
        if (whenLanguageModelReady instanceof Promise || whenAgentReady instanceof Promise || whenToolsModelReady instanceof Promise) {
            const timeoutHandle = setTimeout(() => {
                progress({
                    kind: 'progressMessage',
                    content: new MarkdownString(localize('waitingCopilot2', "Copilot is almost ready")),
                });
            }, 10000);
            try {
                const ready = await Promise.race([
                    timeout(this.environmentService.remoteAuthority ? 60000 /* increase for remote scenarios */ : 20000).then(() => 'timedout'),
                    this.whenDefaultAgentFailed(chatService).then(() => 'error'),
                    Promise.allSettled([whenLanguageModelReady, whenAgentReady, whenToolsModelReady])
                ]);
                if (ready === 'error' || ready === 'timedout') {
                    let warningMessage;
                    if (ready === 'timedout') {
                        warningMessage = localize('copilotTookLongWarning', "Copilot took too long to get ready. Please ensure you are signed in to {0} and that the extension `{1}` is installed and enabled.", defaultChat.provider.default.name, defaultChat.chatExtensionId);
                    }
                    else {
                        warningMessage = localize('copilotFailedWarning', "Copilot failed to get ready. Please ensure you are signed in to {0} and that the extension `{1}` is installed and enabled.", defaultChat.provider.default.name, defaultChat.chatExtensionId);
                    }
                    progress({
                        kind: 'warning',
                        content: new MarkdownString(warningMessage)
                    });
                    // This means Copilot is unhealthy and we cannot retry the
                    // request. Signal this to the outside via an event.
                    this._onUnresolvableError.fire();
                    return;
                }
            }
            finally {
                clearTimeout(timeoutHandle);
            }
        }
        await chatService.resendRequest(requestModel, {
            ...widget?.getModeRequestOptions(),
            mode,
            userSelectedModelId: languageModel,
        });
    }
    whenLanguageModelReady(languageModelsService) {
        for (const id of languageModelsService.getLanguageModelIds()) {
            const model = languageModelsService.lookupLanguageModel(id);
            if (model && model.isDefault) {
                return; // we have language models!
            }
        }
        return Event.toPromise(Event.filter(languageModelsService.onDidChangeLanguageModels, e => e.added?.some(added => added.metadata.isDefault) ?? false));
    }
    whenToolsModelReady(languageModelToolsService, requestModel) {
        const needsToolsModel = requestModel.message.parts.some(part => part instanceof ChatRequestToolPart);
        if (!needsToolsModel) {
            return; // No tools in this request, no need to check
        }
        // check that tools other than setup. and internal tools are registered.
        for (const tool of languageModelToolsService.getTools()) {
            if (tool.id.startsWith('copilot_')) {
                return; // we have tools!
            }
        }
        return Event.toPromise(Event.filter(languageModelToolsService.onDidChangeTools, () => {
            for (const tool of languageModelToolsService.getTools()) {
                if (tool.id.startsWith('copilot_')) {
                    return true; // we have tools!
                }
            }
            return false; // no external tools found
        }));
    }
    whenAgentReady(chatAgentService, mode) {
        const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
        if (defaultAgent && !defaultAgent.isCore) {
            return; // we have a default agent from an extension!
        }
        return Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
            return Boolean(defaultAgent && !defaultAgent.isCore);
        }));
    }
    async whenDefaultAgentFailed(chatService) {
        return new Promise(resolve => {
            chatService.activateDefaultAgent(this.location).catch(() => resolve());
        });
    }
    async doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'chat' });
        const widget = chatWidgetService.getWidgetBySessionId(request.sessionId);
        const requestModel = widget?.viewModel?.model.getRequests().at(-1);
        const setupListener = Event.runAndSubscribe(this.controller.value.onDidChange, (() => {
            switch (this.controller.value.step) {
                case ChatSetupStep.SigningIn:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('setupChatSignIn2', "Signing in to {0}.", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name)),
                    });
                    break;
                case ChatSetupStep.Installing:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('installingCopilot', "Getting Copilot ready")),
                    });
                    break;
            }
        }));
        let result = undefined;
        try {
            result = await ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run({ disableChatViewReveal: true /* we are already in a chat context */ });
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
        }
        finally {
            setupListener.dispose();
        }
        // User has agreed to run the setup
        if (typeof result?.success === 'boolean') {
            if (result.success) {
                if (result.dialogSkipped) {
                    widget?.clear(); // make room for the Chat welcome experience
                }
                else if (requestModel) {
                    let newRequest = this.replaceAgentInRequestModel(requestModel, chatAgentService); // Replace agent part with the actual Copilot agent...
                    newRequest = this.replaceToolInRequestModel(newRequest); // ...then replace any tool parts with the actual Copilot tools
                    await this.forwardRequestToCopilot(newRequest, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
                }
            }
            else {
                progress({
                    kind: 'warning',
                    content: new MarkdownString(localize('copilotSetupError', "Copilot setup failed."))
                });
            }
        }
        // User has cancelled the setup
        else {
            progress({
                kind: 'markdownContent',
                content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent_1.SETUP_NEEDED_MESSAGE : SetupAgent_1.TRUST_NEEDED_MESSAGE
            });
        }
        return {};
    }
    replaceAgentInRequestModel(requestModel, chatAgentService) {
        const agentPart = requestModel.message.parts.find((r) => r instanceof ChatRequestAgentPart);
        if (!agentPart) {
            return requestModel;
        }
        const agentId = agentPart.agent.id.replace(/setup\./, `${defaultChat.extensionId}.`.toLowerCase());
        const githubAgent = chatAgentService.getAgent(agentId);
        if (!githubAgent) {
            return requestModel;
        }
        const newAgentPart = new ChatRequestAgentPart(agentPart.range, agentPart.editorRange, githubAgent);
        return new ChatRequestModel({
            session: requestModel.session,
            message: {
                parts: requestModel.message.parts.map(part => {
                    if (part instanceof ChatRequestAgentPart) {
                        return newAgentPart;
                    }
                    return part;
                }),
                text: requestModel.message.text
            },
            variableData: requestModel.variableData,
            timestamp: Date.now(),
            attempt: requestModel.attempt,
            confirmation: requestModel.confirmation,
            locationData: requestModel.locationData,
            attachedContext: requestModel.attachedContext,
            isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
        });
    }
    replaceToolInRequestModel(requestModel) {
        const toolPart = requestModel.message.parts.find((r) => r instanceof ChatRequestToolPart);
        if (!toolPart) {
            return requestModel;
        }
        const toolId = toolPart.toolId.replace(/setup.tools\./, `copilot_`.toLowerCase());
        const newToolPart = new ChatRequestToolPart(toolPart.range, toolPart.editorRange, toolPart.toolName, toolId, toolPart.displayName, toolPart.icon);
        const chatRequestToolEntry = {
            id: toolId,
            name: 'new',
            range: toolPart.range,
            kind: 'tool',
            value: undefined
        };
        const variableData = {
            variables: [chatRequestToolEntry]
        };
        return new ChatRequestModel({
            session: requestModel.session,
            message: {
                parts: requestModel.message.parts.map(part => {
                    if (part instanceof ChatRequestToolPart) {
                        return newToolPart;
                    }
                    return part;
                }),
                text: requestModel.message.text
            },
            variableData: variableData,
            timestamp: Date.now(),
            attempt: requestModel.attempt,
            confirmation: requestModel.confirmation,
            locationData: requestModel.locationData,
            attachedContext: [chatRequestToolEntry],
            isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
        });
    }
};
SetupAgent = SetupAgent_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IWorkspaceTrustManagementService)
], SetupAgent);
class SetupTool extends Disposable {
    static registerTool(instantiationService, toolData) {
        return instantiationService.invokeFunction(accessor => {
            const toolService = accessor.get(ILanguageModelToolsService);
            const disposables = new DisposableStore();
            disposables.add(toolService.registerToolData(toolData));
            const tool = instantiationService.createInstance(SetupTool);
            disposables.add(toolService.registerToolImplementation(toolData.id, tool));
            return { tool, disposable: disposables };
        });
    }
    async invoke(invocation, countTokens, progress, token) {
        const result = {
            content: [
                {
                    kind: 'text',
                    value: ''
                }
            ]
        };
        return result;
    }
    async prepareToolInvocation(parameters, token) {
        return undefined;
    }
}
var ChatSetupStrategy;
(function (ChatSetupStrategy) {
    ChatSetupStrategy[ChatSetupStrategy["Canceled"] = 0] = "Canceled";
    ChatSetupStrategy[ChatSetupStrategy["DefaultSetup"] = 1] = "DefaultSetup";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithoutEnterpriseProvider"] = 2] = "SetupWithoutEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithEnterpriseProvider"] = 3] = "SetupWithEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithGoogleProvider"] = 4] = "SetupWithGoogleProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithAppleProvider"] = 5] = "SetupWithAppleProvider";
})(ChatSetupStrategy || (ChatSetupStrategy = {}));
let ChatSetup = class ChatSetup {
    static { ChatSetup_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService, context, controller) {
        let instance = ChatSetup_1.instance;
        if (!instance) {
            instance = ChatSetup_1.instance = instantiationService.invokeFunction(accessor => {
                return new ChatSetup_1(context, controller, instantiationService, accessor.get(ITelemetryService), accessor.get(IWorkbenchLayoutService), accessor.get(IKeybindingService), accessor.get(IChatEntitlementService), accessor.get(ILogService), accessor.get(IConfigurationService), accessor.get(IViewsService), accessor.get(IWorkspaceTrustRequestService));
            });
        }
        return instance;
    }
    constructor(context, controller, instantiationService, telemetryService, layoutService, keybindingService, chatEntitlementService, logService, configurationService, viewsService, workspaceTrustRequestService) {
        this.context = context;
        this.controller = controller;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.chatEntitlementService = chatEntitlementService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.pendingRun = undefined;
        this.skipDialogOnce = false;
    }
    skipDialog() {
        this.skipDialogOnce = true;
    }
    async run(options) {
        if (this.pendingRun) {
            return this.pendingRun;
        }
        this.pendingRun = this.doRun(options);
        try {
            return await this.pendingRun;
        }
        finally {
            this.pendingRun = undefined;
        }
    }
    async doRun(options) {
        this.context.update({ later: false });
        const dialogSkipped = this.skipDialogOnce;
        this.skipDialogOnce = false;
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize('copilotWorkspaceTrust', "Copilot is currently only supported in trusted workspaces.")
        });
        if (!trusted) {
            this.context.update({ later: true });
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotTrusted', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
            return { dialogSkipped, success: undefined /* canceled */ };
        }
        let setupStrategy;
        if (!options?.forceSignInDialog && (dialogSkipped || isProUser(this.chatEntitlementService.entitlement) || this.chatEntitlementService.entitlement === ChatEntitlement.Free)) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // existing pro/free users setup without a dialog
        }
        else {
            setupStrategy = await this.showDialog(options);
        }
        if (setupStrategy === ChatSetupStrategy.DefaultSetup && ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id) {
            setupStrategy = ChatSetupStrategy.SetupWithEnterpriseProvider; // users with a configured provider go through provider setup
        }
        if (setupStrategy !== ChatSetupStrategy.Canceled && !options?.disableChatViewReveal) {
            // Show the chat view now to better indicate progress
            // while installing the extension or returning from sign in
            showCopilotView(this.viewsService, this.layoutService);
        }
        let success = undefined;
        try {
            switch (setupStrategy) {
                case ChatSetupStrategy.SetupWithEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: true, useSocialProvider: undefined });
                    break;
                case ChatSetupStrategy.SetupWithoutEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: undefined });
                    break;
                case ChatSetupStrategy.SetupWithAppleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'apple' });
                    break;
                case ChatSetupStrategy.SetupWithGoogleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'google' });
                    break;
                case ChatSetupStrategy.DefaultSetup:
                    success = await this.controller.value.setup();
                    break;
                case ChatSetupStrategy.Canceled:
                    this.context.update({ later: true });
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedMaybeLater', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
                    break;
            }
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
            success = false;
        }
        return { success, dialogSkipped };
    }
    async showDialog(options) {
        const disposables = new DisposableStore();
        const dialogVariant = this.configurationService.getValue('chat.setup.signInDialogVariant');
        const buttons = this.getButtons(dialogVariant, options);
        const dialog = disposables.add(new Dialog(this.layoutService.activeContainer, this.getDialogTitle(options), buttons.map(button => button[0]), createWorkbenchDialogOptions({
            type: 'none',
            extraClasses: ['chat-setup-dialog'],
            detail: ' ', // workaround allowing us to render the message in large
            icon: Codicon.copilotLarge,
            alignment: DialogContentsAlignment.Vertical,
            cancelId: buttons.length - 1,
            disableCloseButton: true,
            renderFooter: this.telemetryService.telemetryLevel !== 0 /* TelemetryLevel.NONE */ ? footer => footer.appendChild(this.createDialogFooter(disposables)) : undefined,
            buttonOptions: buttons.map(button => button[2])
        }, this.keybindingService, this.layoutService)));
        const { button } = await dialog.show();
        disposables.dispose();
        return buttons[button]?.[1] ?? ChatSetupStrategy.Canceled;
    }
    getButtons(variant, options) {
        const styleButton = (...classes) => ({ styleButton: (button) => button.element.classList.add(...classes) });
        let buttons;
        if (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog) {
            const defaultProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.default.name), ChatSetupStrategy.SetupWithoutEnterpriseProvider, styleButton('continue-button', 'default')];
            const defaultProviderLink = [defaultProviderButton[0], defaultProviderButton[1], styleButton('link-button')];
            const enterpriseProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.enterprise.name), ChatSetupStrategy.SetupWithEnterpriseProvider, styleButton('continue-button', 'default')];
            const enterpriseProviderLink = [enterpriseProviderButton[0], enterpriseProviderButton[1], styleButton('link-button')];
            const googleProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.google.name), ChatSetupStrategy.SetupWithGoogleProvider, styleButton('continue-button', 'google')];
            const appleProviderButton = [localize('continueWith', "Continue with {0}", defaultChat.provider.apple.name), ChatSetupStrategy.SetupWithAppleProvider, styleButton('continue-button', 'apple')];
            if (ChatEntitlementRequests.providerId(this.configurationService) !== defaultChat.provider.enterprise.id) {
                buttons = coalesce([
                    defaultProviderButton,
                    googleProviderButton,
                    variant === 'apple' ? appleProviderButton : undefined,
                    enterpriseProviderLink
                ]);
            }
            else {
                buttons = coalesce([
                    enterpriseProviderButton,
                    googleProviderButton,
                    variant === 'apple' ? appleProviderButton : undefined,
                    defaultProviderLink
                ]);
            }
        }
        else {
            buttons = [[localize('setupCopilotButton', "Set up Copilot"), ChatSetupStrategy.DefaultSetup, undefined]];
        }
        buttons.push([localize('skipForNow', "Skip for now"), ChatSetupStrategy.Canceled, styleButton('link-button', 'skip-button')]);
        return buttons;
    }
    getDialogTitle(options) {
        if (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog) {
            return localize('signIn', "Sign in to use Copilot");
        }
        return localize('startUsing', "Start using Copilot");
    }
    createDialogFooter(disposables) {
        const element = $('.chat-setup-dialog-footer');
        const markdown = this.instantiationService.createInstance(MarkdownRenderer, {});
        // SKU Settings
        const settings = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "{0} Copilot Free, Pro and Pro+ may show [public code]({1}) suggestions and we may use your data for product improvement. You can change these [settings]({2}) at any time.", defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
        element.appendChild($('p', undefined, disposables.add(markdown.render(new MarkdownString(settings, { isTrusted: true }))).element));
        return element;
    }
};
ChatSetup = ChatSetup_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ITelemetryService),
    __param(4, ILayoutService),
    __param(5, IKeybindingService),
    __param(6, IChatEntitlementService),
    __param(7, ILogService),
    __param(8, IConfigurationService),
    __param(9, IViewsService),
    __param(10, IWorkspaceTrustRequestService)
], ChatSetup);
let ChatSetupContribution = class ChatSetupContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSetup'; }
    constructor(productService, instantiationService, commandService, telemetryService, chatEntitlementService, logService) {
        super();
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        const context = chatEntitlementService.context?.value;
        const requests = chatEntitlementService.requests?.value;
        if (!context || !requests) {
            return; // disabled
        }
        const controller = new Lazy(() => this._register(this.instantiationService.createInstance(ChatSetupController, context, requests)));
        this.registerSetupAgents(context, controller);
        this.registerActions(context, requests, controller);
        this.registerUrlLinkHandler();
    }
    registerSetupAgents(context, controller) {
        const defaultAgentDisposables = markAsSingleton(new MutableDisposable()); // prevents flicker on window reload
        const vscodeAgentDisposables = markAsSingleton(new MutableDisposable());
        const updateRegistration = () => {
            if (!context.state.hidden && !context.state.disabled) {
                // Default Agents (always, even if installed to allow for speedy requests right on startup)
                if (!defaultAgentDisposables.value) {
                    const disposables = defaultAgentDisposables.value = new DisposableStore();
                    // Panel Agents
                    const panelAgentDisposables = disposables.add(new DisposableStore());
                    for (const mode of [ChatModeKind.Ask, ChatModeKind.Edit, ChatModeKind.Agent]) {
                        const { agent, disposable } = SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Panel, mode, context, controller);
                        panelAgentDisposables.add(disposable);
                        panelAgentDisposables.add(agent.onUnresolvableError(() => {
                            // An unresolvable error from our agent registrations means that
                            // Copilot is unhealthy for some reason. We clear our panel
                            // registration to give Copilot a chance to show a custom message
                            // to the user from the views and stop pretending as if there was
                            // a functional agent.
                            this.logService.error('[chat setup] Unresolvable error from Copilot agent registration, clearing registration.');
                            panelAgentDisposables.dispose();
                        }));
                    }
                    // Inline Agents
                    disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Terminal, undefined, context, controller).disposable);
                    disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Notebook, undefined, context, controller).disposable);
                    disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Editor, undefined, context, controller).disposable);
                }
                // VSCode Agent + Tool (unless installed and enabled)
                if (!(context.state.installed && !context.state.disabled) && !vscodeAgentDisposables.value) {
                    const disposables = vscodeAgentDisposables.value = new DisposableStore();
                    disposables.add(SetupAgent.registerVSCodeAgent(this.instantiationService, context, controller).disposable);
                }
            }
            else {
                defaultAgentDisposables.clear();
                vscodeAgentDisposables.clear();
            }
            if (context.state.installed && !context.state.disabled) {
                vscodeAgentDisposables.clear(); // we need to do this to prevent showing duplicate agent/tool entries in the list
            }
        };
        this._register(Event.runAndSubscribe(context.onDidChange, () => updateRegistration()));
    }
    registerActions(context, requests, controller) {
        const chatSetupTriggerContext = ContextKeyExpr.or(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp);
        const CHAT_SETUP_ACTION_LABEL = localize2('triggerChatSetup', "Use AI Features with Copilot for free...");
        class ChatSetupTriggerAction extends Action2 {
            constructor() {
                super({
                    id: CHAT_SETUP_ACTION_ID,
                    title: CHAT_SETUP_ACTION_LABEL,
                    category: CHAT_CATEGORY,
                    f1: true,
                    precondition: chatSetupTriggerContext
                });
            }
            async run(accessor, mode, options) {
                const viewsService = accessor.get(IViewsService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const instantiationService = accessor.get(IInstantiationService);
                const dialogService = accessor.get(IDialogService);
                const commandService = accessor.get(ICommandService);
                const lifecycleService = accessor.get(ILifecycleService);
                await context.update({ hidden: false });
                if (mode) {
                    const chatWidget = await showCopilotView(viewsService, layoutService);
                    chatWidget?.input.setChatMode(mode);
                }
                const setup = ChatSetup.getInstance(instantiationService, context, controller);
                const { success } = await setup.run(options);
                if (success === false && !lifecycleService.willShutdown) {
                    const { confirmed } = await dialogService.confirm({
                        type: Severity.Error,
                        message: localize('setupErrorDialog', "Copilot setup failed. Would you like to try again?"),
                        primaryButton: localize('retry', "Retry"),
                    });
                    if (confirmed) {
                        return Boolean(await commandService.executeCommand(CHAT_SETUP_ACTION_ID, mode, options));
                    }
                }
                return Boolean(success);
            }
        }
        class ChatSetupTriggerForceSignInDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupForceSignIn',
                    title: localize2('forceSignIn', "Sign in to use Copilot")
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true });
            }
        }
        class ChatSetupTriggerWithoutDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupWithoutDialog',
                    title: CHAT_SETUP_ACTION_LABEL,
                    precondition: chatSetupTriggerContext
                });
            }
            async run(accessor) {
                const viewsService = accessor.get(IViewsService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const instantiationService = accessor.get(IInstantiationService);
                await context.update({ hidden: false });
                const chatWidget = await showCopilotView(viewsService, layoutService);
                ChatSetup.getInstance(instantiationService, context, controller).skipDialog();
                chatWidget?.acceptInput(localize('setupCopilot', "Set up Copilot."));
            }
        }
        class ChatSetupFromAccountsAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupFromAccounts',
                    title: localize2('triggerChatSetupFromAccounts', "Sign in to use Copilot..."),
                    menu: {
                        id: MenuId.AccountsContext,
                        group: '2_copilot',
                        when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.signedOut)
                    }
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'accounts' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            }
        }
        class ChatSetupHideAction extends Action2 {
            static { this.ID = 'workbench.action.chat.hideSetup'; }
            static { this.TITLE = localize2('hideChatSetup', "Hide Copilot"); }
            constructor() {
                super({
                    id: ChatSetupHideAction.ID,
                    title: ChatSetupHideAction.TITLE,
                    f1: true,
                    category: CHAT_CATEGORY,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Setup.hidden.negate()),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'z_hide',
                        order: 1,
                        when: ChatContextKeys.Setup.installed.negate()
                    }
                });
            }
            async run(accessor) {
                const viewsDescriptorService = accessor.get(IViewDescriptorService);
                const layoutService = accessor.get(IWorkbenchLayoutService);
                const dialogService = accessor.get(IDialogService);
                const { confirmed } = await dialogService.confirm({
                    message: localize('hideChatSetupConfirm', "Are you sure you want to hide Copilot?"),
                    detail: localize('hideChatSetupDetail', "You can restore Copilot by running the '{0}' command.", CHAT_SETUP_ACTION_LABEL.value),
                    primaryButton: localize('hideChatSetupButton', "Hide Copilot")
                });
                if (!confirmed) {
                    return;
                }
                const location = viewsDescriptorService.getViewLocationById(ChatViewId);
                await context.update({ hidden: true });
                if (location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                    const activeContainers = viewsDescriptorService.getViewContainersByLocation(location).filter(container => viewsDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
                    if (activeContainers.length === 0) {
                        layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */); // hide if there are no views in the secondary sidebar
                    }
                }
            }
        }
        const windowFocusListener = this._register(new MutableDisposable());
        class UpgradePlanAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.upgradePlan',
                    title: localize2('managePlan', "Upgrade to Copilot Pro"),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Entitlement.free),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.Entitlement.free, ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor, from) {
                const openerService = accessor.get(IOpenerService);
                const hostService = accessor.get(IHostService);
                const commandService = accessor.get(ICommandService);
                openerService.open(URI.parse(defaultChat.upgradePlanUrl));
                const entitlement = context.state.entitlement;
                if (!isProUser(entitlement)) {
                    // If the user is not yet Pro, we listen to window focus to refresh the token
                    // when the user has come back to the window assuming the user signed up.
                    windowFocusListener.value = hostService.onDidChangeFocus(focus => this.onWindowFocus(focus, commandService));
                }
            }
            async onWindowFocus(focus, commandService) {
                if (focus) {
                    windowFocusListener.clear();
                    const entitlements = await requests.forceResolveEntitlement(undefined);
                    if (entitlements?.entitlement && isProUser(entitlements?.entitlement)) {
                        refreshTokens(commandService);
                    }
                }
            }
        }
        class EnableOveragesAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.manageOverages',
                    title: localize2('manageOverages', "Manage Copilot Overages"),
                    category: localize2('chat.category', 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Entitlement.pro, ChatContextKeys.Entitlement.proPlus),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.pro, ChatContextKeys.Entitlement.proPlus), ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor, from) {
                const openerService = accessor.get(IOpenerService);
                openerService.open(URI.parse(defaultChat.manageOveragesUrl));
            }
        }
        registerAction2(ChatSetupTriggerAction);
        registerAction2(ChatSetupTriggerForceSignInDialogAction);
        registerAction2(ChatSetupFromAccountsAction);
        registerAction2(ChatSetupTriggerWithoutDialogAction);
        registerAction2(ChatSetupHideAction);
        registerAction2(UpgradePlanAction);
        registerAction2(EnableOveragesAction);
    }
    registerUrlLinkHandler() {
        this._register(ExtensionUrlHandlerOverrideRegistry.registerHandler({
            canHandleURL: url => {
                return url.scheme === this.productService.urlProtocol && equalsIgnoreCase(url.authority, defaultChat.chatExtensionId);
            },
            handleURL: async (url) => {
                const params = new URLSearchParams(url.query);
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'url', detail: params.get('referrer') ?? undefined });
                await this.commandService.executeCommand(CHAT_SETUP_ACTION_ID, validateChatMode(params.get('mode')));
                return true;
            }
        }));
    }
};
ChatSetupContribution = __decorate([
    __param(0, IProductService),
    __param(1, IInstantiationService),
    __param(2, ICommandService),
    __param(3, ITelemetryService),
    __param(4, IChatEntitlementService),
    __param(5, ILogService)
], ChatSetupContribution);
export { ChatSetupContribution };
var ChatSetupStep;
(function (ChatSetupStep) {
    ChatSetupStep[ChatSetupStep["Initial"] = 1] = "Initial";
    ChatSetupStep[ChatSetupStep["SigningIn"] = 2] = "SigningIn";
    ChatSetupStep[ChatSetupStep["Installing"] = 3] = "Installing";
})(ChatSetupStep || (ChatSetupStep = {}));
let ChatSetupController = class ChatSetupController extends Disposable {
    get step() { return this._step; }
    constructor(context, requests, telemetryService, authenticationService, extensionsWorkbenchService, productService, logService, progressService, activityService, commandService, dialogService, configurationService, lifecycleService, quickInputService) {
        super();
        this.context = context;
        this.requests = requests;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.productService = productService;
        this.logService = logService;
        this.progressService = progressService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.lifecycleService = lifecycleService;
        this.quickInputService = quickInputService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._step = ChatSetupStep.Initial;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.context.onDidChange(() => this._onDidChange.fire()));
    }
    setStep(step) {
        if (this._step === step) {
            return;
        }
        this._step = step;
        this._onDidChange.fire();
    }
    async setup(options) {
        const watch = new StopWatch(false);
        const title = localize('setupChatProgress', "Getting Copilot ready...");
        const badge = this.activityService.showViewContainerActivity(CHAT_SIDEBAR_PANEL_ID, {
            badge: new ProgressBadge(() => title),
        });
        try {
            return await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                command: CHAT_OPEN_ACTION_ID,
                title,
            }, () => this.doSetup(options ?? {}, watch));
        }
        finally {
            badge.dispose();
        }
    }
    async doSetup(options, watch) {
        this.context.suspend(); // reduces flicker
        let success = false;
        try {
            const providerId = ChatEntitlementRequests.providerId(this.configurationService);
            let session;
            let entitlement;
            // Entitlement Unknown or `forceSignIn`: we need to sign-in user
            if (this.context.state.entitlement === ChatEntitlement.Unknown || options.forceSignIn) {
                this.setStep(ChatSetupStep.SigningIn);
                const result = await this.signIn(options);
                if (!result.session) {
                    this.doInstall(); // still install the extension in the background to remind the user to sign-in eventually
                    const provider = options.useSocialProvider ?? options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id;
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotSignedIn', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                    return undefined; // treat as cancelled because signing in already triggers an error dialog
                }
                session = result.session;
                entitlement = result.entitlement;
            }
            // Await Install
            this.setStep(ChatSetupStep.Installing);
            success = await this.install(session, entitlement ?? this.context.state.entitlement, providerId, watch, options);
        }
        finally {
            this.setStep(ChatSetupStep.Initial);
            this.context.resume();
        }
        return success;
    }
    async signIn(options) {
        let session;
        let entitlements;
        try {
            ({ session, entitlements } = await this.requests.signIn(options));
        }
        catch (e) {
            this.logService.error(`[chat setup] signIn: error ${e}`);
        }
        if (!session && !this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignInError', "Failed to sign in to {0}. Would you like to try again?", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name),
                detail: localize('unknownSignInErrorDetail', "You must be signed in to use Copilot."),
                primaryButton: localize('retry', "Retry")
            });
            if (confirmed) {
                return this.signIn(options);
            }
        }
        return { session, entitlement: entitlements?.entitlement };
    }
    async install(session, entitlement, providerId, watch, options) {
        const wasRunning = this.context.state.installed && !this.context.state.disabled;
        let signUpResult = undefined;
        const provider = options.useSocialProvider ?? options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id;
        try {
            if (entitlement !== ChatEntitlement.Free && // User is not signed up to Copilot Free
                !isProUser(entitlement) && // User is not signed up for a Copilot subscription
                entitlement !== ChatEntitlement.Unavailable // User is eligible for Copilot Free
            ) {
                if (!session) {
                    try {
                        session = (await this.authenticationService.getSessions(providerId)).at(0);
                    }
                    catch (error) {
                        // ignore - errors can throw if a provider is not registered
                    }
                    if (!session) {
                        this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNoSession', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                        return false; // unexpected
                    }
                }
                signUpResult = await this.requests.signUpFree(session);
                if (typeof signUpResult !== 'boolean' /* error */) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedSignUp', installDuration: watch.elapsed(), signUpErrorCode: signUpResult.errorCode, provider });
                }
            }
            await this.doInstallWithRetry();
        }
        catch (error) {
            this.logService.error(`[chat setup] install: error ${error}`);
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: isCancellationError(error) ? 'cancelled' : 'failedInstall', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
            return false;
        }
        if (typeof signUpResult === 'boolean') {
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: wasRunning && !signUpResult ? 'alreadyInstalled' : 'installed', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
        }
        if (wasRunning) {
            // We always trigger refresh of tokens to help the user
            // get out of authentication issues that can happen when
            // for example the sign-up ran after the extension tried
            // to use the authentication information to mint a token
            refreshTokens(this.commandService);
        }
        return true;
    }
    async doInstallWithRetry() {
        let error;
        try {
            await this.doInstall();
        }
        catch (e) {
            this.logService.error(`[chat setup] install: error ${error}`);
            error = e;
        }
        if (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: localize('unknownSetupError', "An error occurred while setting up Copilot. Would you like to try again?"),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize('retry', "Retry")
                });
                if (confirmed) {
                    return this.doInstallWithRetry();
                }
            }
            throw error;
        }
    }
    async doInstall() {
        await this.extensionsWorkbenchService.install(defaultChat.extensionId, {
            enable: true,
            isApplicationScoped: true, // install into all profiles
            isMachineScoped: false, // do not ask to sync
            installEverywhere: true, // install in local and remote
            installPreReleaseVersion: this.productService.quality !== 'stable'
        }, ChatViewId);
    }
    async setupWithProvider(options) {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            'id': 'copilot.setup',
            'type': 'object',
            'properties': {
                [defaultChat.completionsAdvancedSetting]: {
                    'type': 'object',
                    'properties': {
                        'authProvider': {
                            'type': 'string'
                        }
                    }
                },
                [defaultChat.providerUriSetting]: {
                    'type': 'string'
                }
            }
        });
        if (options.useEnterpriseProvider) {
            const success = await this.handleEnterpriseInstance();
            if (!success) {
                return success; // not properly configured, abort
            }
        }
        let existingAdvancedSetting = this.configurationService.inspect(defaultChat.completionsAdvancedSetting).user?.value;
        if (!isObject(existingAdvancedSetting)) {
            existingAdvancedSetting = {};
        }
        if (options.useEnterpriseProvider) {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, {
                ...existingAdvancedSetting,
                'authProvider': defaultChat.provider.enterprise.id
            }, 2 /* ConfigurationTarget.USER */);
        }
        else {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, Object.keys(existingAdvancedSetting).length > 0 ? {
                ...existingAdvancedSetting,
                'authProvider': undefined
            } : undefined, 2 /* ConfigurationTarget.USER */);
        }
        return this.setup({ ...options, forceSignIn: true });
    }
    async handleEnterpriseInstance() {
        const domainRegEx = /^[a-zA-Z\-_]+$/;
        const fullUriRegEx = /^(https:\/\/)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.ghe\.com\/?$/;
        const uri = this.configurationService.getValue(defaultChat.providerUriSetting);
        if (typeof uri === 'string' && fullUriRegEx.test(uri)) {
            return true; // already setup with a valid URI
        }
        let isSingleWord = false;
        const result = await this.quickInputService.input({
            prompt: localize('enterpriseInstance', "What is your {0} instance?", defaultChat.provider.enterprise.name),
            placeHolder: localize('enterpriseInstancePlaceholder', 'i.e. "octocat" or "https://octocat.ghe.com"...'),
            ignoreFocusLost: true,
            value: uri,
            validateInput: async (value) => {
                isSingleWord = false;
                if (!value) {
                    return undefined;
                }
                if (domainRegEx.test(value)) {
                    isSingleWord = true;
                    return {
                        content: localize('willResolveTo', "Will resolve to {0}", `https://${value}.ghe.com`),
                        severity: Severity.Info
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize('invalidEnterpriseInstance', 'You must enter a valid {0} instance (i.e. "octocat" or "https://octocat.ghe.com")', defaultChat.provider.enterprise.name),
                        severity: Severity.Error
                    };
                }
                return undefined;
            }
        });
        if (!result) {
            return undefined; // canceled
        }
        let resolvedUri = result;
        if (isSingleWord) {
            resolvedUri = `https://${resolvedUri}.ghe.com`;
        }
        else {
            const normalizedUri = result.toLowerCase();
            const hasHttps = normalizedUri.startsWith('https://');
            if (!hasHttps) {
                resolvedUri = `https://${result}`;
            }
        }
        await this.configurationService.updateValue(defaultChat.providerUriSetting, resolvedUri, 2 /* ConfigurationTarget.USER */);
        return true;
    }
};
ChatSetupController = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IProductService),
    __param(6, ILogService),
    __param(7, IProgressService),
    __param(8, IActivityService),
    __param(9, ICommandService),
    __param(10, IDialogService),
    __param(11, IConfigurationService),
    __param(12, ILifecycleService),
    __param(13, IQuickInputService)
], ChatSetupController);
//#endregion
function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BJLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2xILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQ25KLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTFJLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEcsT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxtREFBbUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUF1QiwwQkFBMEIsRUFBK0UsY0FBYyxFQUFnQixNQUFNLGdEQUFnRCxDQUFDO0FBQzVOLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBaUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBMEIsdUJBQXVCLEVBQTBCLHVCQUF1QixFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ25MLE9BQU8sRUFBYSxnQkFBZ0IsRUFBK0MsTUFBTSx3QkFBd0IsQ0FBQztBQUVsSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RixPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM5RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUxRyxNQUFNLFdBQVcsR0FBRztJQUNuQixXQUFXLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsSUFBSSxFQUFFO0lBQ3hELGVBQWUsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxJQUFJLEVBQUU7SUFDaEUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixJQUFJLEVBQUU7SUFDbEUsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixJQUFJLEVBQUU7SUFDMUUsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixJQUFJLEVBQUU7SUFDMUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixJQUFJLEVBQUU7SUFDbkUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLElBQUksRUFBRTtJQUM5RCxRQUFRLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzlLLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsSUFBSSxFQUFFO0lBQ3RFLGNBQWMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2hFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsSUFBSSxFQUFFO0lBQ3BFLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSwwQkFBMEIsSUFBSSxFQUFFO0lBQ3RGLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsSUFBSSxFQUFFO0lBQ3RFLDhCQUE4QixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSw4QkFBOEIsSUFBSSxFQUFFO0lBQzlGLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsSUFBSSxFQUFFO0NBQ2hGLENBQUM7QUFFRixzQkFBc0I7QUFFdEIsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUM5QyxjQUFjLENBQUMsTUFBTSxDQUFDLFVBQVUsaUJBQWlCLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQ3ZFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQyxtQkFBbUI7Q0FDakUsQ0FBQztBQUVGLElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxVQUFVOztJQUVsQyxNQUFNLENBQUMscUJBQXFCLENBQUMsb0JBQTJDLEVBQUUsUUFBMkIsRUFBRSxJQUE4QixFQUFFLE9BQStCLEVBQUUsVUFBcUM7UUFDNU0sT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFekQsSUFBSSxFQUFVLENBQUM7WUFDZixJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNqRCxRQUFRLFFBQVEsRUFBRSxDQUFDO2dCQUNsQixLQUFLLGlCQUFpQixDQUFDLEtBQUs7b0JBQzNCLElBQUksSUFBSSxLQUFLLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDL0IsRUFBRSxHQUFHLFlBQVksQ0FBQztvQkFDbkIsQ0FBQzt5QkFBTSxJQUFJLElBQUksS0FBSyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ3ZDLEVBQUUsR0FBRyxhQUFhLENBQUM7d0JBQ25CLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDL0MsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLEVBQUUsR0FBRyxhQUFhLENBQUM7d0JBQ25CLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDaEQsQ0FBQztvQkFDRCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsUUFBUTtvQkFDOUIsRUFBRSxHQUFHLGdCQUFnQixDQUFDO29CQUN0QixNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsTUFBTTtvQkFDNUIsRUFBRSxHQUFHLGNBQWMsQ0FBQztvQkFDcEIsTUFBTTtnQkFDUCxLQUFLLGlCQUFpQixDQUFDLFFBQVE7b0JBQzlCLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQztvQkFDdEIsTUFBTTtZQUNSLENBQUM7WUFFRCxPQUFPLFlBQVUsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN2TCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLENBQUMsbUJBQW1CLENBQUMsb0JBQTJDLEVBQUUsT0FBK0IsRUFBRSxVQUFxQztRQUM3SSxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNyRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBRTFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsWUFBVSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDclEsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUU1QixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUU7Z0JBQzVELEVBQUUsRUFBRSxnQ0FBZ0M7Z0JBQ3BDLE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUTtnQkFDL0IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxTQUFTO2dCQUN2QixXQUFXLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGVBQWUsQ0FBQztnQkFDOUQsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHFDQUFxQyxDQUFDO2dCQUMxRixlQUFlLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHFDQUFxQyxDQUFDO2dCQUN6Rix1QkFBdUIsRUFBRSxJQUFJO2dCQUM3QixpQkFBaUIsRUFBRSxLQUFLO2dCQUN4QixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRTthQUMzQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFZixPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUEyQyxFQUFFLGdCQUFtQyxFQUFFLEVBQVUsRUFBRSxJQUFZLEVBQUUsU0FBa0IsRUFBRSxXQUFtQixFQUFFLFFBQTJCLEVBQUUsSUFBOEIsRUFBRSxPQUErQixFQUFFLFVBQXFDO1FBQ3RULE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFO1lBQ2xELEVBQUU7WUFDRixJQUFJO1lBQ0osU0FBUztZQUNULE1BQU0sRUFBRSxJQUFJO1lBQ1osS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDO1lBQ3pDLElBQUksRUFBRSxJQUFJLEtBQUssWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDakYsYUFBYSxFQUFFLEVBQUU7WUFDakIsY0FBYyxFQUFFLEVBQUU7WUFDbEIsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ3JCLFFBQVEsRUFBRSxFQUFFLGNBQWMsRUFBRSxZQUFVLENBQUMsb0JBQW9CLEVBQUU7WUFDN0QsV0FBVztZQUNYLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxVQUFVO1lBQ2hELG9CQUFvQixFQUFFLHdCQUF3QixDQUFDLElBQUk7WUFDbkQsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsU0FBUztTQUN4RCxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFlBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDOUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RSxJQUFJLElBQUksS0FBSyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDM0MsQ0FBQzthQUV1Qix5QkFBb0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMERBQTBELENBQUMsQ0FBQyxBQUFySCxDQUFzSDthQUMxSSx5QkFBb0IsR0FBRyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLCtDQUErQyxDQUFDLENBQUMsQUFBL0YsQ0FBZ0c7SUFPNUksWUFDa0IsT0FBK0IsRUFDL0IsVUFBcUMsRUFDckMsUUFBMkIsRUFDckIsb0JBQTRELEVBQ3RFLFVBQXdDLEVBQzlCLG9CQUE0RCxFQUNoRSxnQkFBb0QsRUFDekMsa0JBQWlFLEVBQzdELCtCQUFrRjtRQUVwSCxLQUFLLEVBQUUsQ0FBQztRQVZTLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLGVBQVUsR0FBVixVQUFVLENBQTJCO1FBQ3JDLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQ0oseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMvQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3hCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBOEI7UUFDNUMsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQWRwRyx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNuRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBRTlDLDZCQUF3QixHQUFHLElBQUksR0FBRyxFQUF5QixDQUFDO0lBYzdFLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQTBCLEVBQUUsUUFBMEM7UUFDbEYsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBQyxRQUFRLENBQUMscUNBQXFDLEVBQUMsRUFBRTtZQUN0RyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzNELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBRTNFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBMEIsRUFBRSxRQUF1QyxFQUFFLFdBQXlCLEVBQUUscUJBQTZDLEVBQUUsaUJBQXFDLEVBQUUsZ0JBQW1DLEVBQUUseUJBQXFEO1FBQ3RTLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hPLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDdEosQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFDekosQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUEwQixFQUFFLFFBQXVDLEVBQUUsV0FBeUIsRUFBRSxxQkFBNkMsRUFBRSxpQkFBcUMsRUFBRSxnQkFBbUMsRUFBRSx5QkFBcUQ7UUFDbFQsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUM7WUFDMUYsT0FBTyxFQUFFLENBQUMsQ0FBQyx5QkFBeUI7UUFDckMsQ0FBQztRQUVELFFBQVEsQ0FBQztZQUNSLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1NBQ2hGLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFFL0osT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLFlBQStCLEVBQUUsUUFBdUMsRUFBRSxXQUF5QixFQUFFLHFCQUE2QyxFQUFFLGdCQUFtQyxFQUFFLGlCQUFxQyxFQUFFLHlCQUFxRDtRQUMxVCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2xLLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLHFEQUFxRCxDQUFDLENBQUM7YUFDekgsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMseUJBQXlCLENBQUMsWUFBK0IsRUFBRSxRQUF1QyxFQUFFLFdBQXlCLEVBQUUscUJBQTZDLEVBQUUsZ0JBQW1DLEVBQUUsaUJBQXFDLEVBQUUseUJBQXFEO1FBQzVULElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDdkUsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0NBQWtDLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUMzTCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRWxGLElBQUksQ0FBQztZQUNKLE1BQU0sY0FBYyxDQUFDO1FBQ3RCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxZQUErQixFQUFFLFFBQXVDLEVBQUUsV0FBeUIsRUFBRSxxQkFBNkMsRUFBRSxnQkFBbUMsRUFBRSxpQkFBcUMsRUFBRSx5QkFBcUQ7UUFDclUsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RixNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFDLGVBQWUsQ0FBQztRQUMzQyxNQUFNLGFBQWEsR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDO1FBRXpELDZEQUE2RDtRQUM3RCw0REFBNEQ7UUFDNUQsK0RBQStEO1FBRS9ELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkUsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNsRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx5QkFBeUIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUU5RixJQUFJLHNCQUFzQixZQUFZLE9BQU8sSUFBSSxjQUFjLFlBQVksT0FBTyxJQUFJLG1CQUFtQixZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQzlILE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3JDLFFBQVEsQ0FBQztvQkFDUixJQUFJLEVBQUUsaUJBQWlCO29CQUN2QixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUM7aUJBQ25GLENBQUMsQ0FBQztZQUNKLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUVWLElBQUksQ0FBQztnQkFDSixNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUM7b0JBQzNILElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO29CQUM1RCxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUM7aUJBQ2pGLENBQUMsQ0FBQztnQkFFSCxJQUFJLEtBQUssS0FBSyxPQUFPLElBQUksS0FBSyxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUMvQyxJQUFJLGNBQXNCLENBQUM7b0JBQzNCLElBQUksS0FBSyxLQUFLLFVBQVUsRUFBRSxDQUFDO3dCQUMxQixjQUFjLEdBQUcsUUFBUSxDQUFDLHdCQUF3QixFQUFFLG1JQUFtSSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQzFQLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxjQUFjLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDRIQUE0SCxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ2pQLENBQUM7b0JBRUQsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxTQUFTO3dCQUNmLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUM7cUJBQzNDLENBQUMsQ0FBQztvQkFFSCwwREFBMEQ7b0JBQzFELG9EQUFvRDtvQkFDcEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDO29CQUNqQyxPQUFPO2dCQUNSLENBQUM7WUFDRixDQUFDO29CQUFTLENBQUM7Z0JBQ1YsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRTtZQUM3QyxHQUFHLE1BQU0sRUFBRSxxQkFBcUIsRUFBRTtZQUNsQyxJQUFJO1lBQ0osbUJBQW1CLEVBQUUsYUFBYTtTQUNsQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sc0JBQXNCLENBQUMscUJBQTZDO1FBQzNFLEtBQUssTUFBTSxFQUFFLElBQUkscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1lBQzlELE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVELElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxDQUFDLDJCQUEyQjtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDdkosQ0FBQztJQUVPLG1CQUFtQixDQUFDLHlCQUFxRCxFQUFFLFlBQStCO1FBQ2pILE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3JHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsNkNBQTZDO1FBQ3RELENBQUM7UUFFRCx3RUFBd0U7UUFDeEUsS0FBSyxNQUFNLElBQUksSUFBSSx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3pELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsT0FBTyxDQUFDLGlCQUFpQjtZQUMxQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtZQUNwRixLQUFLLE1BQU0sSUFBSSxJQUFJLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3pELElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxJQUFJLENBQUMsQ0FBQyxpQkFBaUI7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUMsQ0FBQywwQkFBMEI7UUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxjQUFjLENBQUMsZ0JBQW1DLEVBQUUsSUFBOEI7UUFDekYsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0UsSUFBSSxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTyxDQUFDLDZDQUE2QztRQUN0RCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQzVFLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNFLE9BQU8sT0FBTyxDQUFDLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxXQUF5QjtRQUM3RCxPQUFPLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO1lBQ2xDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLE9BQTBCLEVBQUUsUUFBdUMsRUFBRSxXQUF5QixFQUFFLHFCQUE2QyxFQUFFLGlCQUFxQyxFQUFFLGdCQUFtQyxFQUFFLHlCQUFxRDtRQUMvUyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUU3SyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDekUsTUFBTSxZQUFZLEdBQUcsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUU7WUFDcEYsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxhQUFhLENBQUMsU0FBUztvQkFDM0IsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxpQkFBaUI7d0JBQ3ZCLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDaFEsQ0FBQyxDQUFDO29CQUNILE1BQU07Z0JBQ1AsS0FBSyxhQUFhLENBQUMsVUFBVTtvQkFDNUIsUUFBUSxDQUFDO3dCQUNSLElBQUksRUFBRSxpQkFBaUI7d0JBQ3ZCLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztxQkFDbkYsQ0FBQyxDQUFDO29CQUNILE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksTUFBTSxHQUFpQyxTQUFTLENBQUM7UUFDckQsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLENBQUMsQ0FBQztRQUM1SyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwRixDQUFDO2dCQUFTLENBQUM7WUFDVixhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLE9BQU8sTUFBTSxFQUFFLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQzFCLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLDRDQUE0QztnQkFDOUQsQ0FBQztxQkFBTSxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUN6QixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBRSxzREFBc0Q7b0JBQ3pJLFVBQVUsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBUSwrREFBK0Q7b0JBRS9ILE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUM7Z0JBQzlKLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxDQUFDO29CQUNSLElBQUksRUFBRSxTQUFTO29CQUNmLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztpQkFDbkYsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFFRCwrQkFBK0I7YUFDMUIsQ0FBQztZQUNMLFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixPQUFPLEVBQUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsWUFBVSxDQUFDLG9CQUFvQjthQUN0SSxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU8sMEJBQTBCLENBQUMsWUFBK0IsRUFBRSxnQkFBbUM7UUFDdEcsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUE2QixFQUFFLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLENBQUM7UUFDdkgsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sWUFBWSxDQUFDO1FBQ3JCLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsV0FBVyxDQUFDLFdBQVcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDbkcsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFbkcsT0FBTyxJQUFJLGdCQUFnQixDQUFDO1lBQzNCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBb0I7WUFDMUMsT0FBTyxFQUFFO2dCQUNSLEtBQUssRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQzVDLElBQUksSUFBSSxZQUFZLG9CQUFvQixFQUFFLENBQUM7d0JBQzFDLE9BQU8sWUFBWSxDQUFDO29CQUNyQixDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUMsQ0FBQztnQkFDRixJQUFJLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJO2FBQy9CO1lBQ0QsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3JCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztZQUM3QixZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLGVBQWUsRUFBRSxZQUFZLENBQUMsZUFBZTtZQUM3QyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1NBQzNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxZQUErQjtRQUNoRSxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQTRCLEVBQUUsQ0FBQyxDQUFDLFlBQVksbUJBQW1CLENBQUMsQ0FBQztRQUNwSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFlBQVksQ0FBQztRQUNyQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sV0FBVyxHQUFHLElBQUksbUJBQW1CLENBQzFDLFFBQVEsQ0FBQyxLQUFLLEVBQ2QsUUFBUSxDQUFDLFdBQVcsRUFDcEIsUUFBUSxDQUFDLFFBQVEsRUFDakIsTUFBTSxFQUNOLFFBQVEsQ0FBQyxXQUFXLEVBQ3BCLFFBQVEsQ0FBQyxJQUFJLENBQ2IsQ0FBQztRQUVGLE1BQU0sb0JBQW9CLEdBQTBCO1lBQ25ELEVBQUUsRUFBRSxNQUFNO1lBQ1YsSUFBSSxFQUFFLEtBQUs7WUFDWCxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsU0FBUztTQUNoQixDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQTZCO1lBQzlDLFNBQVMsRUFBRSxDQUFDLG9CQUFvQixDQUFDO1NBQ2pDLENBQUM7UUFFRixPQUFPLElBQUksZ0JBQWdCLENBQUM7WUFDM0IsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFvQjtZQUMxQyxPQUFPLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDNUMsSUFBSSxJQUFJLFlBQVksbUJBQW1CLEVBQUUsQ0FBQzt3QkFDekMsT0FBTyxXQUFXLENBQUM7b0JBQ3BCLENBQUM7b0JBQ0QsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDO2dCQUNGLElBQUksRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUk7YUFDL0I7WUFDRCxZQUFZLEVBQUUsWUFBWTtZQUMxQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNyQixPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU87WUFDN0IsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZO1lBQ3ZDLFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2QyxlQUFlLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztZQUN2QyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsc0JBQXNCO1NBQzNELENBQUMsQ0FBQztJQUNKLENBQUM7O0FBNWFJLFVBQVU7SUFvR2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsZ0NBQWdDLENBQUE7R0F6RzdCLFVBQVUsQ0E2YWY7QUFHRCxNQUFNLFNBQVUsU0FBUSxVQUFVO0lBRWpDLE1BQU0sQ0FBQyxZQUFZLENBQUMsb0JBQTJDLEVBQUUsUUFBbUI7UUFDbkYsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBRTdELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFFMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUV4RCxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRTNFLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxXQUFnQyxFQUFFLFFBQXNCLEVBQUUsS0FBd0I7UUFDM0gsTUFBTSxNQUFNLEdBQWdCO1lBQzNCLE9BQU8sRUFBRTtnQkFDUjtvQkFDQyxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsRUFBRTtpQkFDVDthQUNEO1NBQ0QsQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSxVQUFlLEVBQUUsS0FBd0I7UUFDckUsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQsSUFBSyxpQkFPSjtBQVBELFdBQUssaUJBQWlCO0lBQ3JCLGlFQUFZLENBQUE7SUFDWix5RUFBZ0IsQ0FBQTtJQUNoQiw2R0FBa0MsQ0FBQTtJQUNsQyx1R0FBK0IsQ0FBQTtJQUMvQiwrRkFBMkIsQ0FBQTtJQUMzQiw2RkFBMEIsQ0FBQTtBQUMzQixDQUFDLEVBUEksaUJBQWlCLEtBQWpCLGlCQUFpQixRQU9yQjtBQVNELElBQU0sU0FBUyxHQUFmLE1BQU0sU0FBUzs7YUFFQyxhQUFRLEdBQTBCLFNBQVMsQUFBbkMsQ0FBb0M7SUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxvQkFBMkMsRUFBRSxPQUErQixFQUFFLFVBQXFDO1FBQ3JJLElBQUksUUFBUSxHQUFHLFdBQVMsQ0FBQyxRQUFRLENBQUM7UUFDbEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsUUFBUSxHQUFHLFdBQVMsQ0FBQyxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM5RSxPQUFPLElBQUksV0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBMkIsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDO1lBQ3RYLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFNRCxZQUNrQixPQUErQixFQUMvQixVQUFxQyxFQUMvQixvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ3ZELGFBQXVELEVBQ25ELGlCQUFzRCxFQUNqRCxzQkFBK0QsRUFDM0UsVUFBd0MsRUFDOUIsb0JBQTRELEVBQ3BFLFlBQTRDLEVBQzVCLDRCQUE0RTtRQVYxRixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUMvQixlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQUNkLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN0QyxrQkFBYSxHQUFiLGFBQWEsQ0FBeUI7UUFDbEMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNoQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQzFELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDYix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ1gsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQWZwRyxlQUFVLEdBQTBDLFNBQVMsQ0FBQztRQUU5RCxtQkFBYyxHQUFHLEtBQUssQ0FBQztJQWMzQixDQUFDO0lBRUwsVUFBVTtRQUNULElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQTBFO1FBQ25GLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQzlCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUEwRTtRQUM3RixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFFNUIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLENBQUM7WUFDN0UsT0FBTyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSw0REFBNEQsQ0FBQztTQUN4RyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUV2TixPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDN0QsQ0FBQztRQUVELElBQUksYUFBZ0MsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxFQUFFLGlCQUFpQixJQUFJLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM5SyxhQUFhLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsaURBQWlEO1FBQ2xHLENBQUM7YUFBTSxDQUFDO1lBQ1AsYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBRUQsSUFBSSxhQUFhLEtBQUssaUJBQWlCLENBQUMsWUFBWSxJQUFJLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5SixhQUFhLEdBQUcsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsQ0FBQyw2REFBNkQ7UUFDN0gsQ0FBQztRQUVELElBQUksYUFBYSxLQUFLLGlCQUFpQixDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1lBQ3JGLHFEQUFxRDtZQUNyRCwyREFBMkQ7WUFDM0QsZUFBZSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBeUIsU0FBUyxDQUFDO1FBQzlDLElBQUksQ0FBQztZQUNKLFFBQVEsYUFBYSxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssaUJBQWlCLENBQUMsMkJBQTJCO29CQUNqRCxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUN2SCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsOEJBQThCO29CQUNwRCxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO29CQUN4SCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsc0JBQXNCO29CQUM1QyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO29CQUN0SCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsdUJBQXVCO29CQUM3QyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUN2SCxNQUFNO2dCQUNQLEtBQUssaUJBQWlCLENBQUMsWUFBWTtvQkFDbEMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzlDLE1BQU07Z0JBQ1AsS0FBSyxpQkFBaUIsQ0FBQyxRQUFRO29CQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE4QywyQkFBMkIsRUFBRSxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7b0JBQ3ZOLE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0NBQW9DLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbkYsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUF5QztRQUNqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBRTFDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQWdDLGdDQUFnQyxDQUFDLENBQUM7UUFDMUgsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFeEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FDeEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDaEMsNEJBQTRCLENBQUM7WUFDNUIsSUFBSSxFQUFFLE1BQU07WUFDWixZQUFZLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztZQUNuQyxNQUFNLEVBQUUsR0FBRyxFQUFFLHdEQUF3RDtZQUNyRSxJQUFJLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDMUIsU0FBUyxFQUFFLHVCQUF1QixDQUFDLFFBQVE7WUFDM0MsUUFBUSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM1QixrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLFlBQVksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxnQ0FBd0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQzNKLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQy9DLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FDOUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV0QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztJQUMzRCxDQUFDO0lBRU8sVUFBVSxDQUFDLE9BQXNDLEVBQUUsT0FBeUM7UUFFbkcsTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHLE9BQWlCLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxNQUFlLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUvSCxJQUFJLE9BQWtDLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sSUFBSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQztZQUM5RixNQUFNLHFCQUFxQixHQUF1QixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsOEJBQThCLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDbE8sTUFBTSxtQkFBbUIsR0FBdUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUVqSSxNQUFNLHdCQUF3QixHQUF1QixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsMkJBQTJCLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDck8sTUFBTSxzQkFBc0IsR0FBdUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUUxSSxNQUFNLG9CQUFvQixHQUF1QixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDeE4sTUFBTSxtQkFBbUIsR0FBdUIsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBRXBOLElBQUksdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxRyxPQUFPLEdBQUcsUUFBUSxDQUFDO29CQUNsQixxQkFBcUI7b0JBQ3JCLG9CQUFvQjtvQkFDcEIsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQ3JELHNCQUFzQjtpQkFDdEIsQ0FBQyxDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxRQUFRLENBQUM7b0JBQ2xCLHdCQUF3QjtvQkFDeEIsb0JBQW9CO29CQUNwQixPQUFPLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDckQsbUJBQW1CO2lCQUNuQixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzNHLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUgsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxPQUF5QztRQUMvRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxJQUFJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1lBQzlGLE9BQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsV0FBNEI7UUFDdEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFFL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVoRixlQUFlO1FBQ2YsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxFQUFFLDRLQUE0SyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdFksT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFcEksT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQzs7QUF4TUksU0FBUztJQXFCWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsWUFBQSw2QkFBNkIsQ0FBQTtHQTdCMUIsU0FBUyxDQXlNZDtBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTthQUVwQyxPQUFFLEdBQUcsNkJBQTZCLEFBQWhDLENBQWlDO0lBRW5ELFlBQ21DLGNBQStCLEVBQ3pCLG9CQUEyQyxFQUNqRCxjQUErQixFQUM3QixnQkFBbUMsRUFDOUMsc0JBQThDLEVBQ3pDLFVBQXVCO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBUDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2pELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBRXpDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFJckQsTUFBTSxPQUFPLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDO1FBQ3hELElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsV0FBVztRQUNwQixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEksSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE9BQStCLEVBQUUsVUFBcUM7UUFDakcsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQ0FBb0M7UUFDOUcsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFFeEUsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFFdEQsMkZBQTJGO2dCQUMzRixJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3BDLE1BQU0sV0FBVyxHQUFHLHVCQUF1QixDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUUxRSxlQUFlO29CQUNmLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7b0JBQ3JFLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQzlFLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQzt3QkFDOUkscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN0QyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRTs0QkFDeEQsZ0VBQWdFOzRCQUNoRSwyREFBMkQ7NEJBQzNELGlFQUFpRTs0QkFDakUsaUVBQWlFOzRCQUNqRSxzQkFBc0I7NEJBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHlGQUF5RixDQUFDLENBQUM7NEJBQ2pILHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUM7b0JBRUQsZ0JBQWdCO29CQUNoQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3BKLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDcEosV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNuSixDQUFDO2dCQUVELHFEQUFxRDtnQkFDckQsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzVGLE1BQU0sV0FBVyxHQUFHLHNCQUFzQixDQUFDLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUV6RSxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1RyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHVCQUF1QixDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNoQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQyxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3hELHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsaUZBQWlGO1lBQ2xILENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO0lBRU8sZUFBZSxDQUFDLE9BQStCLEVBQUUsUUFBaUMsRUFBRSxVQUFxQztRQUNoSSxNQUFNLHVCQUF1QixHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQ2hELGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUN4QyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FDckMsQ0FBQztRQUVGLE1BQU0sdUJBQXVCLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFFMUcsTUFBTSxzQkFBdUIsU0FBUSxPQUFPO1lBRTNDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsb0JBQW9CO29CQUN4QixLQUFLLEVBQUUsdUJBQXVCO29CQUM5QixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsRUFBRSxFQUFFLElBQUk7b0JBQ1IsWUFBWSxFQUFFLHVCQUF1QjtpQkFDckMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUFtQixFQUFFLE9BQXlDO2dCQUM1RyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQzVELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFFekQsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBRXhDLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsTUFBTSxVQUFVLEdBQUcsTUFBTSxlQUFlLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUN0RSxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDckMsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDL0UsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDN0MsSUFBSSxPQUFPLEtBQUssS0FBSyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3pELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7d0JBQ2pELElBQUksRUFBRSxRQUFRLENBQUMsS0FBSzt3QkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvREFBb0QsQ0FBQzt3QkFDM0YsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO3FCQUN6QyxDQUFDLENBQUM7b0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixPQUFPLE9BQU8sQ0FBQyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQzFGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QixDQUFDO1NBQ0Q7UUFFRCxNQUFNLHVDQUF3QyxTQUFRLE9BQU87WUFFNUQ7Z0JBQ0MsS0FBSyxDQUFDO29CQUNMLEVBQUUsRUFBRSwrQ0FBK0M7b0JBQ25ELEtBQUssRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLHdCQUF3QixDQUFDO2lCQUN6RCxDQUFDLENBQUM7WUFDSixDQUFDO1lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDNUMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBRXpELGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBRXZLLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BHLENBQUM7U0FDRDtRQUVELE1BQU0sbUNBQW9DLFNBQVEsT0FBTztZQUV4RDtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLGlEQUFpRDtvQkFDckQsS0FBSyxFQUFFLHVCQUF1QjtvQkFDOUIsWUFBWSxFQUFFLHVCQUF1QjtpQkFDckMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7Z0JBQzVDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ2pELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBRWpFLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUV4QyxNQUFNLFVBQVUsR0FBRyxNQUFNLGVBQWUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3RFLFNBQVMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM5RSxVQUFVLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLENBQUM7U0FDRDtRQUVELE1BQU0sMkJBQTRCLFNBQVEsT0FBTztZQUVoRDtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLGdEQUFnRDtvQkFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSwyQkFBMkIsQ0FBQztvQkFDN0UsSUFBSSxFQUFFO3dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTt3QkFDMUIsS0FBSyxFQUFFLFdBQVc7d0JBQ2xCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixlQUFlLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFDckMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQ3hDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUNyQztxQkFDRDtpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtnQkFDNUMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBRXpELGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBRTVLLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQzVELENBQUM7U0FDRDtRQUVELE1BQU0sbUJBQW9CLFNBQVEsT0FBTztxQkFFeEIsT0FBRSxHQUFHLGlDQUFpQyxDQUFDO3FCQUN2QyxVQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUVuRTtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7b0JBQzFCLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxLQUFLO29CQUNoQyxFQUFFLEVBQUUsSUFBSTtvQkFDUixRQUFRLEVBQUUsYUFBYTtvQkFDdkIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2pILElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjt3QkFDM0IsS0FBSyxFQUFFLFFBQVE7d0JBQ2YsS0FBSyxFQUFFLENBQUM7d0JBQ1IsSUFBSSxFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtxQkFDOUM7aUJBQ0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7Z0JBQzVDLE1BQU0sc0JBQXNCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2dCQUNwRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7Z0JBQzVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBRW5ELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7b0JBQ2pELE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsd0NBQXdDLENBQUM7b0JBQ25GLE1BQU0sRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsdURBQXVELEVBQUUsdUJBQXVCLENBQUMsS0FBSyxDQUFDO29CQUMvSCxhQUFhLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQztpQkFDOUQsQ0FBQyxDQUFDO2dCQUVILElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDaEIsT0FBTztnQkFDUixDQUFDO2dCQUVELE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUV4RSxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFFdkMsSUFBSSxRQUFRLCtDQUF1QyxFQUFFLENBQUM7b0JBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLENBQUMscUJBQXFCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNwTSxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDbkMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLCtEQUEwQixDQUFDLENBQUMsc0RBQXNEO29CQUNuSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDOztRQUdGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNwRSxNQUFNLGlCQUFrQixTQUFRLE9BQU87WUFDdEM7Z0JBQ0MsS0FBSyxDQUFDO29CQUNMLEVBQUUsRUFBRSxtQ0FBbUM7b0JBQ3ZDLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLHdCQUF3QixDQUFDO29CQUN4RCxRQUFRLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUM7b0JBQzVDLEVBQUUsRUFBRSxJQUFJO29CQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUM5QixlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFDckMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQ2hDO29CQUNELElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjt3QkFDM0IsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksRUFDaEMsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsZUFBZSxDQUFDLGlCQUFpQixFQUNqQyxlQUFlLENBQUMsd0JBQXdCLENBQ3hDLENBQ0Q7cUJBQ0Q7aUJBQ0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUFhO2dCQUMzRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUVyRCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBRTFELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQzdCLDZFQUE2RTtvQkFDN0UseUVBQXlFO29CQUN6RSxtQkFBbUIsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDOUcsQ0FBQztZQUNGLENBQUM7WUFFTyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQWMsRUFBRSxjQUErQjtnQkFDMUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFFNUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxRQUFRLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3ZFLElBQUksWUFBWSxFQUFFLFdBQVcsSUFBSSxTQUFTLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7d0JBQ3ZFLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDL0IsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNEO1FBRUQsTUFBTSxvQkFBcUIsU0FBUSxPQUFPO1lBQ3pDO2dCQUNDLEtBQUssQ0FBQztvQkFDTCxFQUFFLEVBQUUsc0NBQXNDO29CQUMxQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixDQUFDO29CQUM3RCxRQUFRLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUM7b0JBQzVDLEVBQUUsRUFBRSxJQUFJO29CQUNSLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUM5QixlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDL0IsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQ25DO29CQUNELElBQUksRUFBRTt3QkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjt3QkFDM0IsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLEtBQUssRUFBRSxDQUFDO3dCQUNSLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsRUFBRSxDQUNoQixlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDL0IsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQ25DLEVBQ0QsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsZUFBZSxDQUFDLGlCQUFpQixFQUNqQyxlQUFlLENBQUMsd0JBQXdCLENBQ3hDLENBQ0Q7cUJBQ0Q7aUJBQ0QsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUVRLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxJQUFhO2dCQUMzRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUNuRCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUM5RCxDQUFDO1NBQ0Q7UUFFRCxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN4QyxlQUFlLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUN6RCxlQUFlLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3QyxlQUFlLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNyRCxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUNyQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsZUFBZSxDQUFDO1lBQ2xFLFlBQVksRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3ZILENBQUM7WUFDRCxTQUFTLEVBQUUsS0FBSyxFQUFDLEdBQUcsRUFBQyxFQUFFO2dCQUN0QixNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXNFLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQztnQkFFek4sTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFckcsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQTNXVyxxQkFBcUI7SUFLL0IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsV0FBVyxDQUFBO0dBVkQscUJBQXFCLENBNFdqQzs7QUFxQkQsSUFBSyxhQUlKO0FBSkQsV0FBSyxhQUFhO0lBQ2pCLHVEQUFXLENBQUE7SUFDWCwyREFBUyxDQUFBO0lBQ1QsNkRBQVUsQ0FBQTtBQUNYLENBQUMsRUFKSSxhQUFhLEtBQWIsYUFBYSxRQUlqQjtBQUVELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU0zQyxJQUFJLElBQUksS0FBb0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVoRCxZQUNrQixPQUErQixFQUMvQixRQUFpQyxFQUMvQixnQkFBb0QsRUFDL0MscUJBQThELEVBQ3pELDBCQUF3RSxFQUNwRixjQUFnRCxFQUNwRCxVQUF3QyxFQUNuQyxlQUFrRCxFQUNsRCxlQUFrRCxFQUNuRCxjQUFnRCxFQUNqRCxhQUE4QyxFQUN2QyxvQkFBNEQsRUFDaEUsZ0JBQW9ELEVBQ25ELGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQWZTLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLGFBQVEsR0FBUixRQUFRLENBQXlCO1FBQ2QscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUM5QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3hDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFDbkUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ25DLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2pDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNsQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3RCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBcEIxRCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzNELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFdkMsVUFBSyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFxQnJDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU8sT0FBTyxDQUFDLElBQW1CO1FBQ2xDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBZ0c7UUFDM0csTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsRUFBRTtZQUNuRixLQUFLLEVBQUUsSUFBSSxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO1NBQ3JDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQztnQkFDOUMsUUFBUSxrQ0FBeUI7Z0JBQ2pDLE9BQU8sRUFBRSxtQkFBbUI7Z0JBQzVCLEtBQUs7YUFDTCxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBK0YsRUFBRSxLQUFnQjtRQUN0SSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUUsa0JBQWtCO1FBRTNDLElBQUksT0FBTyxHQUF5QixLQUFLLENBQUM7UUFDMUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ2pGLElBQUksT0FBMEMsQ0FBQztZQUMvQyxJQUFJLFdBQXdDLENBQUM7WUFFN0MsZ0VBQWdFO1lBQ2hFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN2RixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyx5RkFBeUY7b0JBRTNHLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNuSixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUE4QywyQkFBMkIsRUFBRSxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDM04sT0FBTyxTQUFTLENBQUMsQ0FBQyx5RUFBeUU7Z0JBQzVGLENBQUM7Z0JBRUQsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7Z0JBQ3pCLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQ2xDLENBQUM7WUFFRCxnQkFBZ0I7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkMsT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xILENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQXVDO1FBQzNELElBQUksT0FBMEMsQ0FBQztRQUMvQyxJQUFJLFlBQVksQ0FBQztRQUNqQixJQUFJLENBQUM7WUFDSixDQUFDLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3JELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDO2dCQUN0RCxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3BCLE9BQU8sRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsd0RBQXdELEVBQUUsdUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ2xSLE1BQU0sRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsdUNBQXVDLENBQUM7Z0JBQ3JGLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQzthQUN6QyxDQUFDLENBQUM7WUFFSCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUM1RCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUEwQyxFQUFFLFdBQTRCLEVBQUUsVUFBa0IsRUFBRSxLQUFnQixFQUFFLE9BQXdFO1FBQzdNLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUNoRixJQUFJLFlBQVksR0FBZ0QsU0FBUyxDQUFDO1FBRTFFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBRW5KLElBQUksQ0FBQztZQUVKLElBQ0MsV0FBVyxLQUFLLGVBQWUsQ0FBQyxJQUFJLElBQUssd0NBQXdDO2dCQUNqRixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBUSxtREFBbUQ7Z0JBQ2xGLFdBQVcsS0FBSyxlQUFlLENBQUMsV0FBVyxDQUFDLG9DQUFvQztjQUMvRSxDQUFDO2dCQUNGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxJQUFJLENBQUM7d0JBQ0osT0FBTyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1RSxDQUFDO29CQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7d0JBQ2hCLDREQUE0RDtvQkFDN0QsQ0FBQztvQkFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ2QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBOEMsMkJBQTJCLEVBQUUsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7d0JBQ3pOLE9BQU8sS0FBSyxDQUFDLENBQUMsYUFBYTtvQkFDNUIsQ0FBQztnQkFDRixDQUFDO2dCQUVELFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUV2RCxJQUFJLE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBOEMsMkJBQTJCLEVBQUUsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxFQUFFLFlBQVksQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDcE8sQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ2pDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLCtCQUErQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzlELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNsUSxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLE9BQU8sWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLDJCQUEyQixFQUFFLEVBQUUsYUFBYSxFQUFFLFVBQVUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN2USxDQUFDO1FBRUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQix1REFBdUQ7WUFDdkQsd0RBQXdEO1lBQ3hELHdEQUF3RDtZQUN4RCx3REFBd0Q7WUFDeEQsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQjtRQUMvQixJQUFJLEtBQXdCLENBQUM7UUFDN0IsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDeEIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM5RCxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsQ0FBQztRQUVELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUN6QyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztvQkFDdEQsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO29CQUNwQixPQUFPLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDBFQUEwRSxDQUFDO29CQUNsSCxNQUFNLEVBQUUsS0FBSyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDaEYsYUFBYSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2lCQUN6QyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZixPQUFPLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sS0FBSyxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUztRQUN0QixNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRTtZQUN0RSxNQUFNLEVBQUUsSUFBSTtZQUNaLG1CQUFtQixFQUFFLElBQUksRUFBRyw0QkFBNEI7WUFDeEQsZUFBZSxFQUFFLEtBQUssRUFBRyxxQkFBcUI7WUFDOUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLDhCQUE4QjtZQUN2RCx3QkFBd0IsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sS0FBSyxRQUFRO1NBQ2xFLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFrRjtRQUN6RyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1RixRQUFRLENBQUMscUJBQXFCLENBQUM7WUFDOUIsSUFBSSxFQUFFLGVBQWU7WUFDckIsTUFBTSxFQUFFLFFBQVE7WUFDaEIsWUFBWSxFQUFFO2dCQUNiLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLEVBQUU7b0JBQ3pDLE1BQU0sRUFBRSxRQUFRO29CQUNoQixZQUFZLEVBQUU7d0JBQ2IsY0FBYyxFQUFFOzRCQUNmLE1BQU0sRUFBRSxRQUFRO3lCQUNoQjtxQkFDRDtpQkFDRDtnQkFDRCxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO29CQUNqQyxNQUFNLEVBQUUsUUFBUTtpQkFDaEI7YUFDRDtTQUNELENBQUMsQ0FBQztRQUVILElBQUksT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDbkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxPQUFPLENBQUMsQ0FBQyxpQ0FBaUM7WUFDbEQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLHVCQUF1QixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztRQUNwSCxJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztZQUN4Qyx1QkFBdUIsR0FBRyxFQUFFLENBQUM7UUFDOUIsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVyxDQUFDLDBCQUEwQixFQUFFLEVBQUU7Z0JBQ3hGLEdBQUcsdUJBQXVCO2dCQUMxQixjQUFjLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRTthQUNsRCxtQ0FBMkIsQ0FBQztRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxHQUFHLFdBQVcsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUksR0FBRyx1QkFBdUI7Z0JBQzFCLGNBQWMsRUFBRSxTQUFTO2FBQ3pCLENBQUMsQ0FBQyxDQUFDLFNBQVMsbUNBQTJCLENBQUM7UUFDMUMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLGdCQUFnQixDQUFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLDZEQUE2RCxDQUFDO1FBRW5GLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdkYsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sSUFBSSxDQUFDLENBQUMsaUNBQWlDO1FBQy9DLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1lBQ2pELE1BQU0sRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsNEJBQTRCLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQzFHLFdBQVcsRUFBRSxRQUFRLENBQUMsK0JBQStCLEVBQUUsZ0RBQWdELENBQUM7WUFDeEcsZUFBZSxFQUFFLElBQUk7WUFDckIsS0FBSyxFQUFFLEdBQUc7WUFDVixhQUFhLEVBQUUsS0FBSyxFQUFDLEtBQUssRUFBQyxFQUFFO2dCQUM1QixZQUFZLEdBQUcsS0FBSyxDQUFDO2dCQUNyQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osT0FBTyxTQUFTLENBQUM7Z0JBQ2xCLENBQUM7Z0JBRUQsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzdCLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQ3BCLE9BQU87d0JBQ04sT0FBTyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxLQUFLLFVBQVUsQ0FBQzt3QkFDckYsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO3FCQUN2QixDQUFDO2dCQUNILENBQUM7Z0JBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDakMsT0FBTzt3QkFDTixPQUFPLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLG1GQUFtRixFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQzt3QkFDekssUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLO3FCQUN4QixDQUFDO2dCQUNILENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sU0FBUyxDQUFDLENBQUMsV0FBVztRQUM5QixDQUFDO1FBRUQsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDO1FBQ3pCLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsV0FBVyxHQUFHLFdBQVcsV0FBVyxVQUFVLENBQUM7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsV0FBVyxHQUFHLFdBQVcsTUFBTSxFQUFFLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFdBQVcsbUNBQTJCLENBQUM7UUFFbkgsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQTdUSyxtQkFBbUI7SUFXdEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsMkJBQTJCLENBQUE7SUFDM0IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsa0JBQWtCLENBQUE7R0F0QmYsbUJBQW1CLENBNlR4QjtBQUVELFlBQVk7QUFFWixTQUFTLGFBQWEsQ0FBQyxjQUErQjtJQUNyRCx5RUFBeUU7SUFDekUsY0FBYyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUMxRSxjQUFjLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3BFLENBQUMifQ==