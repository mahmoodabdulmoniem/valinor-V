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
import { coalesce, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { localize, localize2 } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import { showExtensionsWithIdsCommandId } from '../../extensions/browser/extensionsActions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
import { ChatViewId } from './chat.js';
import { CHAT_SIDEBAR_PANEL_ID, ChatViewPane } from './chatViewPane.js';
// --- Chat Container &  View Registration
const chatViewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: CHAT_SIDEBAR_PANEL_ID,
    title: localize2('chat.viewContainer.label', "Chat"),
    icon: Codicon.commentDiscussion,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [CHAT_SIDEBAR_PANEL_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: CHAT_SIDEBAR_PANEL_ID,
    hideIfEmpty: true,
    order: 100,
}, 2 /* ViewContainerLocation.AuxiliaryBar */, { isDefault: true, doNotRegisterOpenCommand: true });
const chatViewDescriptor = [{
        id: ChatViewId,
        containerIcon: chatViewContainer.icon,
        containerTitle: chatViewContainer.title.value,
        singleViewPaneContainerTitle: chatViewContainer.title.value,
        name: localize2('chat.viewContainer.label', "Chat"),
        canToggleVisibility: false,
        canMoveView: true,
        openCommandActionDescriptor: {
            id: CHAT_SIDEBAR_PANEL_ID,
            title: chatViewContainer.title,
            mnemonicTitle: localize({ key: 'miToggleChat', comment: ['&& denotes a mnemonic'] }, "&&Chat"),
            keybindings: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
                }
            },
            order: 1
        },
        ctorDescriptor: new SyncDescriptor(ChatViewPane, [{ location: ChatAgentLocation.Panel }]),
        when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate() // do not pretend a working Chat view if extension is explicitly disabled
        ), ContextKeyExpr.and(ChatContextKeys.Setup.installed, ChatContextKeys.Setup.disabled.negate() // do not pretend a working Chat view if extension is explicitly disabled
        ), ChatContextKeys.panelParticipantRegistered, ChatContextKeys.extensionInvalid)
    }];
Registry.as(ViewExtensions.ViewsRegistry).registerViews(chatViewDescriptor, chatViewContainer);
const chatParticipantExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatParticipants',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatParticipant', 'Contributes a chat participant'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name', 'id'],
            properties: {
                id: {
                    description: localize('chatParticipantId', "A unique id for this chat participant."),
                    type: 'string'
                },
                name: {
                    description: localize('chatParticipantName', "User-facing name for this chat participant. The user will use '@' with this name to invoke the participant. Name must not contain whitespace."),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                fullName: {
                    markdownDescription: localize('chatParticipantFullName', "The full name of this chat participant, which is shown as the label for responses coming from this participant. If not provided, {0} is used.", '`name`'),
                    type: 'string'
                },
                description: {
                    description: localize('chatParticipantDescription', "A description of this chat participant, shown in the UI."),
                    type: 'string'
                },
                isSticky: {
                    description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                    type: 'boolean'
                },
                sampleRequest: {
                    description: localize('chatSampleRequest', "When the user clicks this participant in `/help`, this text will be submitted to the participant."),
                    type: 'string'
                },
                when: {
                    description: localize('chatParticipantWhen', "A condition which must be true to enable this participant."),
                    type: 'string'
                },
                disambiguation: {
                    description: localize('chatParticipantDisambiguation', "Metadata to help with automatically routing user questions to this chat participant."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                        required: ['category', 'description', 'examples'],
                        properties: {
                            category: {
                                markdownDescription: localize('chatParticipantDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatParticipantDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat participant."),
                                type: 'string'
                            },
                            examples: {
                                description: localize('chatParticipantDisambiguationExamples', "A list of representative example questions that are suitable for this chat participant."),
                                type: 'array'
                            },
                        }
                    }
                },
                commands: {
                    markdownDescription: localize('chatCommandsDescription', "Commands available for this chat participant, which the user can invoke with a `/`."),
                    type: 'array',
                    items: {
                        additionalProperties: false,
                        type: 'object',
                        defaultSnippets: [{ body: { name: '', description: '' } }],
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('chatCommand', "A short name by which this command is referred to in the UI, e.g. `fix` or * `explain` for commands that fix an issue or explain code. The name should be unique among the commands provided by this participant."),
                                type: 'string'
                            },
                            description: {
                                description: localize('chatCommandDescription', "A description of this command."),
                                type: 'string'
                            },
                            when: {
                                description: localize('chatCommandWhen', "A condition which must be true to enable this command."),
                                type: 'string'
                            },
                            sampleRequest: {
                                description: localize('chatCommandSampleRequest', "When the user clicks this command in `/help`, this text will be submitted to the participant."),
                                type: 'string'
                            },
                            isSticky: {
                                description: localize('chatCommandSticky', "Whether invoking the command puts the chat into a persistent mode, where the command is automatically added to the chat input for the next message."),
                                type: 'boolean'
                            },
                            disambiguation: {
                                description: localize('chatCommandDisambiguation', "Metadata to help with automatically routing user questions to this chat command."),
                                type: 'array',
                                items: {
                                    additionalProperties: false,
                                    type: 'object',
                                    defaultSnippets: [{ body: { category: '', description: '', examples: [] } }],
                                    required: ['category', 'description', 'examples'],
                                    properties: {
                                        category: {
                                            markdownDescription: localize('chatCommandDisambiguationCategory', "A detailed name for this category, e.g. `workspace_questions` or `web_questions`."),
                                            type: 'string'
                                        },
                                        description: {
                                            description: localize('chatCommandDisambiguationDescription', "A detailed description of the kinds of questions that are suitable for this chat command."),
                                            type: 'string'
                                        },
                                        examples: {
                                            description: localize('chatCommandDisambiguationExamples', "A list of representative example questions that are suitable for this chat command."),
                                            type: 'array'
                                        },
                                    }
                                }
                            }
                        }
                    }
                },
            }
        }
    },
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onChatParticipant:${contrib.id}`);
        }
    },
});
let ChatExtensionPointHandler = class ChatExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatExtensionPointHandler'; }
    constructor(_chatAgentService) {
        this._chatAgentService = _chatAgentService;
        this._participantRegistrationDisposables = new DisposableMap();
        this.handleAndRegisterChatExtensions();
    }
    handleAndRegisterChatExtensions() {
        chatParticipantExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    if (!providerDescriptor.name?.match(/^[\w-]+$/)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with invalid name: ${providerDescriptor.name}. Name must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (providerDescriptor.fullName && strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter(providerDescriptor.fullName)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains ambiguous characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    // Spaces are allowed but considered "invisible"
                    if (providerDescriptor.fullName && strings.InvisibleCharacters.containsInvisibleCharacter(providerDescriptor.fullName.replace(/ /g, ''))) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant with fullName that contains invisible characters: ${providerDescriptor.fullName}.`);
                        continue;
                    }
                    if ((providerDescriptor.isDefault || providerDescriptor.modes) && !isProposedApiEnabled(extension.description, 'defaultChatParticipant')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: defaultChatParticipant.`);
                        continue;
                    }
                    if (providerDescriptor.locations && !isProposedApiEnabled(extension.description, 'chatParticipantAdditions')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT use API proposal: chatParticipantAdditions.`);
                        continue;
                    }
                    if (!providerDescriptor.id || !providerDescriptor.name) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register participant without both id and name.`);
                        continue;
                    }
                    const participantsDisambiguation = [];
                    if (providerDescriptor.disambiguation?.length) {
                        participantsDisambiguation.push(...providerDescriptor.disambiguation.map((d) => ({
                            ...d, category: d.category ?? d.categoryName
                        })));
                    }
                    try {
                        const store = new DisposableStore();
                        store.add(this._chatAgentService.registerAgent(providerDescriptor.id, {
                            extensionId: extension.description.identifier,
                            publisherDisplayName: extension.description.publisherDisplayName ?? extension.description.publisher, // May not be present in OSS
                            extensionPublisherId: extension.description.publisher,
                            extensionDisplayName: extension.description.displayName ?? extension.description.name,
                            id: providerDescriptor.id,
                            description: providerDescriptor.description,
                            when: providerDescriptor.when,
                            metadata: {
                                isSticky: providerDescriptor.isSticky,
                                sampleRequest: providerDescriptor.sampleRequest,
                            },
                            name: providerDescriptor.name,
                            fullName: providerDescriptor.fullName,
                            isDefault: providerDescriptor.isDefault,
                            locations: isNonEmptyArray(providerDescriptor.locations) ?
                                providerDescriptor.locations.map(ChatAgentLocation.fromRaw) :
                                [ChatAgentLocation.Panel],
                            modes: providerDescriptor.isDefault ? (providerDescriptor.modes ?? [ChatModeKind.Ask]) : [ChatModeKind.Agent, ChatModeKind.Ask, ChatModeKind.Edit],
                            slashCommands: providerDescriptor.commands ?? [],
                            disambiguation: coalesce(participantsDisambiguation.flat()),
                        }));
                        this._participantRegistrationDisposables.set(getParticipantKey(extension.description.identifier, providerDescriptor.id), store);
                    }
                    catch (e) {
                        extension.collector.error(`Failed to register participant ${providerDescriptor.id}: ${toErrorMessage(e, true)}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const providerDescriptor of extension.value) {
                    this._participantRegistrationDisposables.deleteAndDispose(getParticipantKey(extension.description.identifier, providerDescriptor.id));
                }
            }
        });
    }
};
ChatExtensionPointHandler = __decorate([
    __param(0, IChatAgentService)
], ChatExtensionPointHandler);
export { ChatExtensionPointHandler };
function getParticipantKey(extensionId, participantName) {
    return `${extensionId.value}_${participantName}`;
}
let ChatCompatibilityNotifier = class ChatCompatibilityNotifier extends Disposable {
    static { this.ID = 'workbench.contrib.chatCompatNotifier'; }
    constructor(extensionsWorkbenchService, contextKeyService, productService) {
        super();
        this.productService = productService;
        this.registeredWelcomeView = false;
        // It may be better to have some generic UI for this, for any extension that is incompatible,
        // but this is only enabled for Copilot Chat now and it needs to be obvious.
        const isInvalid = ChatContextKeys.extensionInvalid.bindTo(contextKeyService);
        this._register(Event.runAndSubscribe(extensionsWorkbenchService.onDidChangeExtensionsNotification, () => {
            const notification = extensionsWorkbenchService.getExtensionsNotification();
            const chatExtension = notification?.extensions.find(ext => ExtensionIdentifier.equals(ext.identifier.id, this.productService.defaultChatAgent?.chatExtensionId));
            if (chatExtension) {
                isInvalid.set(true);
                this.registerWelcomeView(chatExtension);
            }
            else {
                isInvalid.set(false);
            }
        }));
    }
    registerWelcomeView(chatExtension) {
        if (this.registeredWelcomeView) {
            return;
        }
        this.registeredWelcomeView = true;
        const showExtensionLabel = localize('showExtension', "Show Extension");
        const mainMessage = localize('chatFailErrorMessage', "Chat failed to load because the installed version of the Copilot Chat extension is not compatible with this version of {0}. Please ensure that the Copilot Chat extension is up to date.", this.productService.nameLong);
        const commandButton = `[${showExtensionLabel}](command:${showExtensionsWithIdsCommandId}?${encodeURIComponent(JSON.stringify([[this.productService.defaultChatAgent?.chatExtensionId]]))})`;
        const versionMessage = `Copilot Chat version: ${chatExtension.version}`;
        const viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this._register(viewsRegistry.registerViewWelcomeContent(ChatViewId, {
            content: [mainMessage, commandButton, versionMessage].join('\n\n'),
            when: ChatContextKeys.extensionInvalid,
        }));
    }
};
ChatCompatibilityNotifier = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IContextKeyService),
    __param(2, IProductService)
], ChatCompatibilityNotifier);
export { ChatCompatibilityNotifier };
class ChatParticipantDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.chatParticipants;
    }
    render(manifest) {
        const nonDefaultContributions = manifest.contributes?.chatParticipants?.filter(c => !c.isDefault) ?? [];
        if (!nonDefaultContributions.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('participantName', "Name"),
            localize('participantFullName', "Full Name"),
            localize('participantDescription', "Description"),
            localize('participantCommands', "Commands"),
        ];
        const rows = nonDefaultContributions.map(d => {
            return [
                '@' + d.name,
                d.fullName,
                d.description ?? '-',
                d.commands?.length ? new MarkdownString(d.commands.map(c => `- /` + c.name).join('\n')) : '-'
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'chatParticipants',
    label: localize('chatParticipants', "Chat Participants"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ChatParticipantDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnRpY2lwYW50LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRQYXJ0aWNpcGFudC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXNCLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0s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