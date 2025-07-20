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
import { PolicyTag } from '../../../../base/common/policy.js';
import './promptSyntax/promptToolsCodeLensProvider.js';
import './promptSyntax/promptCodingAgentActionContribution.js';
import { timeout } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { assertDefined } from '../../../../base/common/types.js';
import { registerEditorFeature } from '../../../../editor/common/editorFeatures.js';
import * as nls from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { mcpEnabledConfig, mcpGalleryServiceUrlConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { PromptsConfig } from '../common/promptSyntax/config/config.js';
import { INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, INSTRUCTION_FILE_EXTENSION, MODE_DEFAULT_SOURCE_FOLDER, MODE_FILE_EXTENSION, PROMPT_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION } from '../common/promptSyntax/config/promptFileLocations.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions } from '../../../common/configuration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { allDiscoverySources, discoverySourceLabel, mcpDiscoverySection, mcpServerSamplingSection } from '../../mcp/common/mcpConfiguration.js';
import { ChatAgentNameService, ChatAgentService, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { CodeMapperService, ICodeMapperService } from '../common/chatCodeMapperService.js';
import '../common/chatColors.js';
import { IChatEditingService } from '../common/chatEditingService.js';
import { ChatEntitlement, ChatEntitlementService, IChatEntitlementService } from '../common/chatEntitlementService.js';
import { chatVariableLeader } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatService } from '../common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../common/chatSlashCommands.js';
import { ChatTransferService, IChatTransferService } from '../common/chatTransferService.js';
import { IChatVariablesService } from '../common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService } from '../common/ignoredFiles.js';
import { ILanguageModelsService, LanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelStatsService, LanguageModelStatsService } from '../common/languageModelStats.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { INSTRUCTIONS_DOCUMENTATION_URL, MODE_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL } from '../common/promptSyntax/promptTypes.js';
import { registerPromptFileContributions } from '../common/promptSyntax/promptFileContributions.js';
import { PromptsService } from '../common/promptSyntax/service/promptsServiceImpl.js';
import { IPromptsService } from '../common/promptSyntax/service/promptsService.js';
import { LanguageModelToolsExtensionPointHandler } from '../common/tools/languageModelToolsContribution.js';
import { BuiltinToolsContribution } from '../common/tools/tools.js';
import { ConfigureToolSets, UserToolSetsContributions } from './tools/toolSetsContribution.js';
import { IVoiceChatService, VoiceChatService } from '../common/voiceChatService.js';
import { AgentChatAccessibilityHelp, EditsChatAccessibilityHelp, PanelChatAccessibilityHelp, QuickChatAccessibilityHelp } from './actions/chatAccessibilityHelp.js';
import { CopilotTitleBarMenuRendering, registerChatActions, ACTION_ID_NEW_CHAT } from './actions/chatActions.js';
import { registerNewChatActions } from './actions/chatClearActions.js';
import { CodeBlockActionRendering, registerChatCodeBlockActions, registerChatCodeCompareBlockActions } from './actions/chatCodeblockActions.js';
import { ChatContextContributions } from './actions/chatContext.js';
import { registerChatContextActions } from './actions/chatContextActions.js';
import { registerChatCopyActions } from './actions/chatCopyActions.js';
import { registerChatDeveloperActions } from './actions/chatDeveloperActions.js';
import { ChatSubmitAction, registerChatExecuteActions } from './actions/chatExecuteActions.js';
import { registerChatFileTreeActions } from './actions/chatFileTreeActions.js';
import { ChatGettingStartedContribution } from './actions/chatGettingStarted.js';
import { registerChatExportActions } from './actions/chatImportExport.js';
import { registerMoveActions } from './actions/chatMoveActions.js';
import { registerQuickChatActions } from './actions/chatQuickInputActions.js';
import { registerChatTitleActions } from './actions/chatTitleActions.js';
import { registerChatToolActions } from './actions/chatToolActions.js';
import { ChatTransferContribution } from './actions/chatTransfer.js';
import { IChatAccessibilityService, IChatCodeBlockContextProviderService, IChatWidgetService, IQuickChatService } from './chat.js';
import { ChatAccessibilityService } from './chatAccessibilityService.js';
import './chatAttachmentModel.js';
import { ChatMarkdownAnchorService, IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { ChatContextPickService, IChatContextPickService } from './chatContextPickService.js';
import { ChatInputBoxContentProvider } from './chatEdinputInputContentProvider.js';
import { ChatEditingEditorAccessibility } from './chatEditing/chatEditingEditorAccessibility.js';
import { registerChatEditorActions } from './chatEditing/chatEditingEditorActions.js';
import { ChatEditingEditorContextKeys } from './chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditingEditorOverlay } from './chatEditing/chatEditingEditorOverlay.js';
import { ChatEditingService } from './chatEditing/chatEditingServiceImpl.js';
import { ChatEditingNotebookFileSystemProviderContrib } from './chatEditing/notebook/chatEditingNotebookFileSystemProvider.js';
import { SimpleBrowserOverlay } from './chatEditing/simpleBrowserEditorOverlay.js';
import { ChatEditor } from './chatEditor.js';
import { ChatEditorInput, ChatEditorInputSerializer } from './chatEditorInput.js';
import { agentSlashCommandToMarkdown, agentToMarkdown } from './chatMarkdownDecorationsRenderer.js';
import { ChatCompatibilityNotifier, ChatExtensionPointHandler } from './chatParticipant.contribution.js';
import { ChatPasteProvidersFeature } from './chatPasteProviders.js';
import { QuickChatService } from './chatQuick.js';
import { ChatResponseAccessibleView } from './chatResponseAccessibleView.js';
import { ChatSetupContribution } from './chatSetup.js';
import { ChatStatusBarEntry } from './chatStatus.js';
import { ChatVariablesService } from './chatVariables.js';
import { ChatWidget, ChatWidgetService } from './chatWidget.js';
import { ChatCodeBlockContextProviderService } from './codeBlockContextProviderService.js';
import { ChatImplicitContextContribution } from './contrib/chatImplicitContext.js';
import './contrib/chatInputCompletions.js';
import './contrib/chatInputEditorContrib.js';
import './contrib/chatInputEditorHover.js';
import { ChatRelatedFilesContribution } from './contrib/chatInputRelatedFilesContrib.js';
import { LanguageModelToolsService } from './languageModelToolsService.js';
import { ChatViewsWelcomeHandler } from './viewsWelcome/chatViewsWelcomeHandler.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ChatModeService, IChatModeService } from '../common/chatModes.js';
import { ChatResponseResourceFileSystemProvider } from '../common/chatResponseResourceFileSystemProvider.js';
import { runSaveToPromptAction, SAVE_TO_PROMPT_SLASH_COMMAND_NAME } from './promptSyntax/saveToPromptAction.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
import { ChatAttachmentResolveService, IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { registerLanguageModelActions } from './actions/chatLanguageModelActions.js';
import { PromptUrlHandler } from './promptSyntax/promptUrlHandler.js';
// Register configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'chatSidebar',
    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
    type: 'object',
    properties: {
        'chat.editor.fontSize': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.fontSize', "Controls the font size in pixels in chat codeblocks."),
            default: isMacintosh ? 12 : 14,
        },
        'chat.editor.fontFamily': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontFamily', "Controls the font family in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.fontWeight': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.fontWeight', "Controls the font weight in chat codeblocks."),
            default: 'default'
        },
        'chat.editor.wordWrap': {
            type: 'string',
            description: nls.localize('interactiveSession.editor.wordWrap', "Controls whether lines should wrap in chat codeblocks."),
            default: 'off',
            enum: ['on', 'off']
        },
        'chat.editor.lineHeight': {
            type: 'number',
            description: nls.localize('interactiveSession.editor.lineHeight', "Controls the line height in pixels in chat codeblocks. Use 0 to compute the line height from the font size."),
            default: 0
        },
        'chat.commandCenter.enabled': {
            type: 'boolean',
            markdownDescription: nls.localize('chat.commandCenter.enabled', "Controls whether the command center shows a menu for actions to control Copilot (requires {0}).", '`#window.commandCenter#`'),
            default: true
        },
        'chat.implicitContext.enabled': {
            type: 'object',
            tags: ['experimental'],
            description: nls.localize('chat.implicitContext.enabled.1', "Enables automatically using the active editor as chat context for specified chat locations."),
            additionalProperties: {
                type: 'string',
                enum: ['never', 'first', 'always'],
                description: nls.localize('chat.implicitContext.value', "The value for the implicit context."),
                enumDescriptions: [
                    nls.localize('chat.implicitContext.value.never', "Implicit context is never enabled."),
                    nls.localize('chat.implicitContext.value.first', "Implicit context is enabled for the first interaction."),
                    nls.localize('chat.implicitContext.value.always', "Implicit context is always enabled.")
                ]
            },
            default: {
                'panel': 'always',
            }
        },
        'chat.implicitContext.suggestedContext': {
            type: 'boolean',
            tags: ['experimental'],
            markdownDescription: nls.localize('chat.implicitContext.suggestedContext', "Controls whether the new implicit context flow is shown. In Ask and Edit modes, the context will automatically be included. In Agent mode context will be suggested as an attachment. Selections are always included as context."),
            default: true,
        },
        'chat.editing.autoAcceptDelay': {
            type: 'number',
            markdownDescription: nls.localize('chat.editing.autoAcceptDelay', "Delay after which changes made by chat are automatically accepted. Values are in seconds, `0` means disabled and `100` seconds is the maximum."),
            default: 0,
            minimum: 0,
            maximum: 100
        },
        'chat.editing.confirmEditRequestRemoval': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRemoval', "Whether to show a confirmation before removing a request and its associated edits."),
            default: true,
        },
        'chat.editing.confirmEditRequestRetry': {
            type: 'boolean',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            markdownDescription: nls.localize('chat.editing.confirmEditRequestRetry', "Whether to show a confirmation before retrying a request and its associated edits."),
            default: true,
        },
        'chat.experimental.detectParticipant.enabled': {
            type: 'boolean',
            deprecationMessage: nls.localize('chat.experimental.detectParticipant.enabled.deprecated', "This setting is deprecated. Please use `chat.detectParticipant.enabled` instead."),
            description: nls.localize('chat.experimental.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: null
        },
        'chat.detectParticipant.enabled': {
            type: 'boolean',
            description: nls.localize('chat.detectParticipant.enabled', "Enables chat participant autodetection for panel chat."),
            default: true
        },
        'chat.renderRelatedFiles': {
            type: 'boolean',
            description: nls.localize('chat.renderRelatedFiles', "Controls whether related files should be rendered in the chat input."),
            default: false
        },
        'chat.notifyWindowOnConfirmation': {
            type: 'boolean',
            description: nls.localize('chat.notifyWindowOnConfirmation', "Controls whether the Copilot window should notify the user when a confirmation is needed while the window is not in focus. This includes a window badge as well as notification toast."),
            default: true,
        },
        'chat.tools.autoApprove': {
            default: false,
            // Description is added in for policy parser. See https://github.com/microsoft/vscode/issues/254526
            description: nls.localize('chat.tools.autoApprove.description', "Controls whether tool use should be automatically approved. Allow all tools to run automatically without user confirmation, overriding any tool-specific settings such as terminal auto-approval. Use with caution: carefully review selected tools and be extra wary of possible sources of prompt injection!"),
            markdownDescription: nls.localize('chat.tools.autoApprove.markdownDescription', "Controls whether tool use should be automatically approved.\n\nAllows _all_ tools to run automatically without user confirmation, overriding any tool-specific settings such as terminal auto-approval.\n\nUse with caution: carefully review selected tools and be extra wary of possible sources of prompt injection!"),
            type: 'boolean',
            tags: ['experimental'],
            policy: {
                name: 'ChatToolsAutoApprove',
                minimumVersion: '1.99',
                defaultValue: false,
                tags: [PolicyTag.Account, PolicyTag.Preview]
            }
        },
        'chat.sendElementsToChat.enabled': {
            default: true,
            description: nls.localize('chat.sendElementsToChat.enabled', "Controls whether elements can be sent to chat from the Simple Browser."),
            type: 'boolean',
            tags: ['experimental']
        },
        'chat.sendElementsToChat.attachCSS': {
            default: true,
            markdownDescription: nls.localize('chat.sendElementsToChat.attachCSS', "Controls whether CSS of the selected element will be added to the chat. {0} must be enabled.", '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['experimental']
        },
        'chat.sendElementsToChat.attachImages': {
            default: true,
            markdownDescription: nls.localize('chat.sendElementsToChat.attachImages', "Controls whether a screenshot of the selected element will be added to the chat. {0} must be enabled.", '`#chat.sendElementsToChat.enabled#`'),
            type: 'boolean',
            tags: ['experimental']
        },
        'chat.undoRequests.restoreInput': {
            default: true,
            markdownDescription: nls.localize('chat.undoRequests.restoreInput', "Controls whether the input of the chat should be restored when an undo request is made. The input will be filled with the text of the request that was restored."),
            type: 'boolean',
            tags: ['experimental']
        },
        'chat.editRequests': {
            markdownDescription: nls.localize('chat.editRequests', "Enables editing of requests in the chat. This allows you to change the request content and resubmit it to the model."),
            type: 'string',
            enum: ['inline', 'hover', 'input', 'none'],
            default: 'inline',
            tags: ['experimental', 'onExp'],
        },
        'chat.emptyChatState.enabled': {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.emptyChatState', "Shows a modified empty chat state with hints in the input placeholder text."),
            tags: ['experimental', 'onExp'],
        },
        'chat.checkpoints.enabled': {
            type: 'boolean',
            default: true,
            description: nls.localize('chat.checkpoints.enabled', "Enables checkpoints in chat. Checkpoints allow you to restore the chat to a previous state."),
            tags: ['experimental'],
        },
        [mcpEnabledConfig]: {
            type: 'boolean',
            description: nls.localize('chat.mcp.enabled', "Enables integration with Model Context Protocol servers to provide additional tools and functionality."),
            default: true,
            policy: {
                name: 'ChatMCP',
                minimumVersion: '1.99',
                tags: [PolicyTag.Account, PolicyTag.MCP]
            }
        },
        [mcpServerSamplingSection]: {
            type: 'object',
            description: nls.localize('chat.mcp.serverSampling', "Configures which models are exposed to MCP servers for sampling (making model requests in the background). This setting can be edited in a graphical way under the `{0}` command.", 'MCP: ' + nls.localize('mcp.list', 'List Servers')),
            scope: 5 /* ConfigurationScope.RESOURCE */,
            additionalProperties: {
                type: 'object',
                properties: {
                    allowedDuringChat: {
                        type: 'boolean',
                        description: nls.localize('chat.mcp.serverSampling.allowedDuringChat', "Whether this server is make sampling requests during its tool calls in a chat session."),
                        default: true,
                    },
                    allowedOutsideChat: {
                        type: 'boolean',
                        description: nls.localize('chat.mcp.serverSampling.allowedOutsideChat', "Whether this server is allowed to make sampling requests outside of a chat session."),
                        default: false,
                    },
                    allowedModels: {
                        type: 'array',
                        items: {
                            type: 'string',
                            description: nls.localize('chat.mcp.serverSampling.model', "A model the MCP server has access to."),
                        },
                    }
                }
            },
        },
        [ChatConfiguration.UseFileStorage]: {
            type: 'boolean',
            description: nls.localize('chat.useFileStorage', "Enables storing chat sessions on disk instead of in the storage service. Enabling this does a one-time per-workspace migration of existing sessions to the new format."),
            default: true,
            tags: ['experimental'],
        },
        [ChatConfiguration.Edits2Enabled]: {
            type: 'boolean',
            description: nls.localize('chat.edits2Enabled', "Enable the new Edits mode that is based on tool-calling. When this is enabled, models that don't support tool-calling are unavailable for Edits mode."),
            default: true,
            tags: ['onExp'],
        },
        [ChatConfiguration.ExtensionToolsEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.extensionToolsEnabled', "Enable using tools contributed by third-party extensions."),
            default: true,
            policy: {
                name: 'ChatAgentExtensionTools',
                minimumVersion: '1.99',
                description: nls.localize('chat.extensionToolsPolicy', "Enable using tools contributed by third-party extensions."),
            }
        },
        [ChatConfiguration.AgentEnabled]: {
            type: 'boolean',
            description: nls.localize('chat.agent.enabled.description', "Enable agent mode for {0}. When this is enabled, agent mode can be activated via the dropdown in the view.", 'Copilot Chat'),
            default: true,
            tags: ['onExp'],
            policy: {
                name: 'ChatAgentMode',
                minimumVersion: '1.99',
            }
        },
        [ChatConfiguration.EnableMath]: {
            type: 'boolean',
            description: nls.localize('chat.mathEnabled.description', "Enable math rendering in chat responses using Katex."),
            default: false,
            tags: ['preview'],
        },
        [mcpDiscoverySection]: {
            oneOf: [
                { type: 'boolean' },
                {
                    type: 'object',
                    default: Object.fromEntries(allDiscoverySources.map(k => [k, true])),
                    properties: Object.fromEntries(allDiscoverySources.map(k => [
                        k,
                        { type: 'boolean', description: nls.localize('mcp.discovery.source', "Enables discovery of {0} servers", discoverySourceLabel[k]) }
                    ])),
                }
            ],
            default: true,
            markdownDescription: nls.localize('mcp.discovery.enabled', "Configures discovery of Model Context Protocol servers on the machine. It may be set to `true` or `false` to disable or enable all sources, and an mapping sources you wish to enable."),
        },
        [mcpGalleryServiceUrlConfig]: {
            type: 'string',
            description: nls.localize('mcp.gallery.serviceUrl', "Configure the MCP Gallery service URL to connect to"),
            default: '',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: ['usesOnlineServices'],
            included: false,
            policy: {
                name: 'McpGalleryServiceUrl',
                minimumVersion: '1.101',
            },
        },
        [PromptsConfig.KEY]: {
            type: 'boolean',
            title: nls.localize('chat.reusablePrompts.config.enabled.title', "Prompt Files"),
            markdownDescription: nls.localize('chat.reusablePrompts.config.enabled.description', "Enable reusable prompt (`*{0}`) and instruction files (`*{1}`) in Chat sessions. [Learn More]({2}).", PROMPT_FILE_EXTENSION, INSTRUCTION_FILE_EXTENSION, PROMPT_DOCUMENTATION_URL),
            default: true,
            restricted: true,
            disallowConfigurationDefault: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            policy: {
                name: 'ChatPromptFiles',
                minimumVersion: '1.99',
                description: nls.localize('chat.promptFiles.policy', "Enables reusable prompt and instruction files in Chat sessions."),
                defaultValue: false,
                tags: [PolicyTag.Account, PolicyTag.Preview]
            }
        },
        [PromptsConfig.INSTRUCTIONS_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize('chat.instructions.config.locations.title', "Instructions File Locations"),
            markdownDescription: nls.localize('chat.instructions.config.locations.description', "Specify location(s) of instructions files (`*{0}`) that can be attached in Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", INSTRUCTION_FILE_EXTENSION, INSTRUCTIONS_DOCUMENTATION_URL),
            default: {
                [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/instructions': true,
                },
            ],
        },
        [PromptsConfig.PROMPT_LOCATIONS_KEY]: {
            type: 'object',
            title: nls.localize('chat.reusablePrompts.config.locations.title', "Prompt File Locations"),
            markdownDescription: nls.localize('chat.reusablePrompts.config.locations.description', "Specify location(s) of reusable prompt files (`*{0}`) that can be run in Chat sessions. [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", PROMPT_FILE_EXTENSION, PROMPT_DOCUMENTATION_URL),
            default: {
                [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [PROMPT_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/prompts': true,
                },
            ],
        },
        [PromptsConfig.MODE_LOCATION_KEY]: {
            type: 'object',
            title: nls.localize('chat.mode.config.locations.title', "Mode File Locations"),
            markdownDescription: nls.localize('chat.mode.config.locations.description', "Specify location(s) of custom chat mode files (`*{0}`). [Learn More]({1}).\n\nRelative paths are resolved from the root folder(s) of your workspace.", MODE_FILE_EXTENSION, MODE_DOCUMENTATION_URL),
            default: {
                [MODE_DEFAULT_SOURCE_FOLDER]: true,
            },
            additionalProperties: { type: 'boolean' },
            unevaluatedProperties: { type: 'boolean' },
            restricted: true,
            tags: ['experimental', 'prompts', 'reusable prompts', 'prompt snippets', 'instructions'],
            examples: [
                {
                    [MODE_DEFAULT_SOURCE_FOLDER]: true,
                },
                {
                    [MODE_DEFAULT_SOURCE_FOLDER]: true,
                    '/Users/vscode/repos/chatmodes': true,
                },
            ],
        },
        'chat.setup.signInDialogVariant': {
            type: 'string',
            enum: ['default', 'apple'],
            description: nls.localize('chat.signInDialogVariant', "Control variations of the sign-in dialog."),
            default: 'default',
            tags: ['onExp', 'experimental']
        }
    }
});
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ChatEditor, ChatEditorInput.EditorID, nls.localize('chat', "Chat")), [
    new SyncDescriptor(ChatEditorInput)
]);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'chat.experimental.detectParticipant.enabled',
        migrateFn: (value, _accessor) => ([
            ['chat.experimental.detectParticipant.enabled', { value: undefined }],
            ['chat.detectParticipant.enabled', { value: value !== false }]
        ])
    }
]);
let ChatResolverContribution = class ChatResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`${Schemas.vscodeChatSesssion}:**/**`, {
            id: ChatEditorInput.EditorID,
            label: nls.localize('chat', "Chat"),
            priority: RegisteredEditorPriority.builtin
        }, {
            singlePerResource: true,
            canSupportResource: resource => resource.scheme === Schemas.vscodeChatSesssion
        }, {
            createEditorInput: ({ resource, options }) => {
                return { editor: instantiationService.createInstance(ChatEditorInput, resource, options), options };
            }
        }));
    }
};
ChatResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], ChatResolverContribution);
let ChatAgentSettingContribution = class ChatAgentSettingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatAgentSetting'; }
    constructor(experimentService, entitlementService) {
        super();
        this.experimentService = experimentService;
        this.entitlementService = entitlementService;
        this.registerMaxRequestsSetting();
    }
    registerMaxRequestsSetting() {
        let lastNode;
        const registerMaxRequestsSetting = () => {
            const treatmentId = this.entitlementService.entitlement === ChatEntitlement.Free ?
                'chatAgentMaxRequestsFree' :
                'chatAgentMaxRequestsPro';
            this.experimentService.getTreatment(treatmentId).then(value => {
                const defaultValue = value ?? (this.entitlementService.entitlement === ChatEntitlement.Free ? 25 : 25);
                const node = {
                    id: 'chatSidebar',
                    title: nls.localize('interactiveSessionConfigurationTitle', "Chat"),
                    type: 'object',
                    properties: {
                        'chat.agent.maxRequests': {
                            type: 'number',
                            markdownDescription: nls.localize('chat.agent.maxRequests', "The maximum number of requests to allow Copilot to use per-turn in agent mode. When the limit is reached, Copilot will ask the user to confirm that it should continue."),
                            default: defaultValue,
                        },
                    }
                };
                configurationRegistry.updateConfigurations({ remove: lastNode ? [lastNode] : [], add: [node] });
                lastNode = node;
            });
        };
        this._register(Event.runAndSubscribe(Event.debounce(this.entitlementService.onDidChangeEntitlement, () => { }, 1000), () => registerMaxRequestsSetting()));
    }
};
ChatAgentSettingContribution = __decorate([
    __param(0, IWorkbenchAssignmentService),
    __param(1, IChatEntitlementService)
], ChatAgentSettingContribution);
AccessibleViewRegistry.register(new ChatResponseAccessibleView());
AccessibleViewRegistry.register(new PanelChatAccessibilityHelp());
AccessibleViewRegistry.register(new QuickChatAccessibilityHelp());
AccessibleViewRegistry.register(new EditsChatAccessibilityHelp());
AccessibleViewRegistry.register(new AgentChatAccessibilityHelp());
registerEditorFeature(ChatInputBoxContentProvider);
let ChatSlashStaticSlashCommandsContribution = class ChatSlashStaticSlashCommandsContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSlashStaticSlashCommands'; }
    constructor(slashCommandService, commandService, chatAgentService, chatWidgetService, instantiationService) {
        super();
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'clear',
            detail: nls.localize('clear', "Start a new chat"),
            sortText: 'z2_clear',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel]
        }, async () => {
            commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: SAVE_TO_PROMPT_SLASH_COMMAND_NAME,
            detail: nls.localize('save-chat-to-prompt-file', "Save chat to a prompt file"),
            sortText: `z3_${SAVE_TO_PROMPT_SLASH_COMMAND_NAME}`,
            executeImmediately: true,
            silent: true,
            locations: [ChatAgentLocation.Panel]
        }, async () => {
            const { lastFocusedWidget } = chatWidgetService;
            assertDefined(lastFocusedWidget, 'No currently active chat widget found.');
            runSaveToPromptAction({ chat: lastFocusedWidget }, commandService);
        }));
        this._store.add(slashCommandService.registerSlashCommand({
            command: 'help',
            detail: '',
            sortText: 'z1_help',
            executeImmediately: true,
            locations: [ChatAgentLocation.Panel],
            modes: [ChatModeKind.Ask]
        }, async (prompt, progress) => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
            const agents = chatAgentService.getAgents();
            // Report prefix
            if (defaultAgent?.metadata.helpTextPrefix) {
                if (isMarkdownString(defaultAgent.metadata.helpTextPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPrefix), kind: 'markdownContent' });
                }
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
            }
            // Report agent list
            const agentText = (await Promise.all(agents
                .filter(a => a.id !== defaultAgent?.id && !a.isCore)
                .filter(a => a.locations.includes(ChatAgentLocation.Panel))
                .map(async (a) => {
                const description = a.description ? `- ${a.description}` : '';
                const agentMarkdown = instantiationService.invokeFunction(accessor => agentToMarkdown(a, true, accessor));
                const agentLine = `- ${agentMarkdown} ${description}`;
                const commandText = a.slashCommands.map(c => {
                    const description = c.description ? `- ${c.description}` : '';
                    return `\t* ${agentSlashCommandToMarkdown(a, c)} ${description}`;
                }).join('\n');
                return (agentLine + '\n' + commandText).trim();
            }))).join('\n');
            progress.report({ content: new MarkdownString(agentText, { isTrusted: { enabledCommands: [ChatSubmitAction.ID] } }), kind: 'markdownContent' });
            // Report variables
            if (defaultAgent?.metadata.helpTextVariablesPrefix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextVariablesPrefix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextVariablesPrefix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextVariablesPrefix), kind: 'markdownContent' });
                }
                const variables = [
                    { name: 'file', description: nls.localize('file', "Choose a file in the workspace") }
                ];
                const variableText = variables
                    .map(v => `* \`${chatVariableLeader}${v.name}\` - ${v.description}`)
                    .join('\n');
                progress.report({ content: new MarkdownString('\n' + variableText), kind: 'markdownContent' });
            }
            // Report help text ending
            if (defaultAgent?.metadata.helpTextPostfix) {
                progress.report({ content: new MarkdownString('\n\n'), kind: 'markdownContent' });
                if (isMarkdownString(defaultAgent.metadata.helpTextPostfix)) {
                    progress.report({ content: defaultAgent.metadata.helpTextPostfix, kind: 'markdownContent' });
                }
                else {
                    progress.report({ content: new MarkdownString(defaultAgent.metadata.helpTextPostfix), kind: 'markdownContent' });
                }
            }
            // Without this, the response will be done before it renders and so it will not stream. This ensures that if the response starts
            // rendering during the next 200ms, then it will be streamed. Once it starts streaming, the whole response streams even after
            // it has received all response data has been received.
            await timeout(200);
        }));
    }
};
ChatSlashStaticSlashCommandsContribution = __decorate([
    __param(0, IChatSlashCommandService),
    __param(1, ICommandService),
    __param(2, IChatAgentService),
    __param(3, IChatWidgetService),
    __param(4, IInstantiationService)
], ChatSlashStaticSlashCommandsContribution);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ChatEditorInput.TypeID, ChatEditorInputSerializer);
registerWorkbenchContribution2(ChatResolverContribution.ID, ChatResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatSlashStaticSlashCommandsContribution.ID, ChatSlashStaticSlashCommandsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatExtensionPointHandler.ID, ChatExtensionPointHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(LanguageModelToolsExtensionPointHandler.ID, LanguageModelToolsExtensionPointHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatCompatibilityNotifier.ID, ChatCompatibilityNotifier, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(CopilotTitleBarMenuRendering.ID, CopilotTitleBarMenuRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(CodeBlockActionRendering.ID, CodeBlockActionRendering, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatImplicitContextContribution.ID, ChatImplicitContextContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatRelatedFilesContribution.ID, ChatRelatedFilesContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatViewsWelcomeHandler.ID, ChatViewsWelcomeHandler, 1 /* WorkbenchPhase.BlockStartup */);
registerWorkbenchContribution2(ChatGettingStartedContribution.ID, ChatGettingStartedContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatSetupContribution.ID, ChatSetupContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatStatusBarEntry.ID, ChatStatusBarEntry, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(BuiltinToolsContribution.ID, BuiltinToolsContribution, 4 /* WorkbenchPhase.Eventually */);
registerWorkbenchContribution2(ChatAgentSettingContribution.ID, ChatAgentSettingContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorAccessibility.ID, ChatEditingEditorAccessibility, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorOverlay.ID, ChatEditingEditorOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(SimpleBrowserOverlay.ID, SimpleBrowserOverlay, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatEditingEditorContextKeys.ID, ChatEditingEditorContextKeys, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatTransferContribution.ID, ChatTransferContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ChatContextContributions.ID, ChatContextContributions, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(ChatResponseResourceFileSystemProvider.ID, ChatResponseResourceFileSystemProvider, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(PromptUrlHandler.ID, PromptUrlHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerChatActions();
registerChatCopyActions();
registerChatCodeBlockActions();
registerChatCodeCompareBlockActions();
registerChatFileTreeActions();
registerChatTitleActions();
registerChatExecuteActions();
registerQuickChatActions();
registerChatExportActions();
registerMoveActions();
registerNewChatActions();
registerChatContextActions();
registerChatDeveloperActions();
registerChatEditorActions();
registerChatToolActions();
registerLanguageModelActions();
registerEditorFeature(ChatPasteProvidersFeature);
registerSingleton(IChatTransferService, ChatTransferService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatService, ChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetService, ChatWidgetService, 1 /* InstantiationType.Delayed */);
registerSingleton(IQuickChatService, QuickChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAccessibilityService, ChatAccessibilityService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatWidgetHistoryService, ChatWidgetHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelsService, LanguageModelsService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelStatsService, LanguageModelStatsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatSlashCommandService, ChatSlashCommandService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentService, ChatAgentService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAgentNameService, ChatAgentNameService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatVariablesService, ChatVariablesService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelToolsService, LanguageModelToolsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IVoiceChatService, VoiceChatService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatCodeBlockContextProviderService, ChatCodeBlockContextProviderService, 1 /* InstantiationType.Delayed */);
registerSingleton(ICodeMapperService, CodeMapperService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEditingService, ChatEditingService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatMarkdownAnchorService, ChatMarkdownAnchorService, 1 /* InstantiationType.Delayed */);
registerSingleton(ILanguageModelIgnoredFilesService, LanguageModelIgnoredFilesService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatEntitlementService, ChatEntitlementService, 1 /* InstantiationType.Delayed */);
registerSingleton(IPromptsService, PromptsService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatContextPickService, ChatContextPickService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatModeService, ChatModeService, 1 /* InstantiationType.Delayed */);
registerSingleton(IChatAttachmentResolveService, ChatAttachmentResolveService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(ChatEditingNotebookFileSystemProviderContrib.ID, ChatEditingNotebookFileSystemProviderContrib, 1 /* WorkbenchPhase.BlockStartup */);
registerPromptFileContributions();
registerWorkbenchContribution2(UserToolSetsContributions.ID, UserToolSetsContributions, 4 /* WorkbenchPhase.Eventually */);
registerAction2(ConfigureToolSets);
ChatWidget.CONTRIBS.push(ChatDynamicVariableModel);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTywrQ0FBK0MsQ0FBQztBQUN2RCxPQUFPLHVEQUF1RCxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUFrRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzNMLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFB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