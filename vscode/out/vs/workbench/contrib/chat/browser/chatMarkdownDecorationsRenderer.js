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
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { contentRefUrl } from '../common/annotations.js';
import { getFullyQualifiedId, IChatAgentNameService, IChatAgentService } from '../common/chatAgents.js';
import { chatSlashCommandBackground, chatSlashCommandForeground } from '../common/chatColors.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestSlashPromptPart, ChatRequestTextPart, ChatRequestToolPart, chatSubcommandLeader } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from './chatAgentHover.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import { InlineAnchorWidget } from './chatInlineAnchorWidget.js';
import './media/chatInlineAnchorWidget.css';
/** For rendering slash commands, variables */
const decorationRefUrl = `http://_vscodedecoration_`;
/** For rendering agent decorations with hover */
const agentRefUrl = `http://_chatagent_`;
/** For rendering agent decorations with hover */
const agentSlashRefUrl = `http://_chatslash_`;
export function agentToMarkdown(agent, isClickable, accessor) {
    const chatAgentNameService = accessor.get(IChatAgentNameService);
    const chatAgentService = accessor.get(IChatAgentService);
    const isAllowed = chatAgentNameService.getAgentNameRestriction(agent);
    let name = `${isAllowed ? agent.name : getFullyQualifiedId(agent)}`;
    const isDupe = isAllowed && chatAgentService.agentHasDupeName(agent.id);
    if (isDupe) {
        name += ` (${agent.publisherDisplayName})`;
    }
    const args = { agentId: agent.id, name, isClickable };
    return `[${agent.name}](${agentRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
}
export function agentSlashCommandToMarkdown(agent, command) {
    const text = `${chatSubcommandLeader}${command.name}`;
    const args = { agentId: agent.id, command: command.name };
    return `[${text}](${agentSlashRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
}
let ChatMarkdownDecorationsRenderer = class ChatMarkdownDecorationsRenderer {
    constructor(keybindingService, logService, chatAgentService, instantiationService, hoverService, chatService, chatWidgetService, commandService, labelService, toolsService, chatMarkdownAnchorService) {
        this.keybindingService = keybindingService;
        this.logService = logService;
        this.chatAgentService = chatAgentService;
        this.instantiationService = instantiationService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.chatWidgetService = chatWidgetService;
        this.commandService = commandService;
        this.labelService = labelService;
        this.toolsService = toolsService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
    }
    convertParsedRequestToMarkdown(parsedRequest) {
        let result = '';
        for (const part of parsedRequest.parts) {
            if (part instanceof ChatRequestTextPart) {
                result += part.text;
            }
            else if (part instanceof ChatRequestAgentPart) {
                result += this.instantiationService.invokeFunction(accessor => agentToMarkdown(part.agent, false, accessor));
            }
            else {
                result += this.genericDecorationToMarkdown(part);
            }
        }
        return result;
    }
    genericDecorationToMarkdown(part) {
        const uri = part instanceof ChatRequestDynamicVariablePart && part.data instanceof URI ?
            part.data :
            undefined;
        const title = uri ? this.labelService.getUriLabel(uri, { relative: true }) :
            part instanceof ChatRequestSlashCommandPart ? part.slashCommand.detail :
                part instanceof ChatRequestAgentSubcommandPart ? part.command.description :
                    part instanceof ChatRequestSlashPromptPart ? part.slashPromptCommand.command :
                        part instanceof ChatRequestToolPart ? (this.toolsService.getTool(part.toolId)?.userDescription) :
                            '';
        const args = { title };
        const text = part.text;
        return `[${text}](${decorationRefUrl}?${encodeURIComponent(JSON.stringify(args))})`;
    }
    walkTreeAndAnnotateReferenceLinks(content, element) {
        const store = new DisposableStore();
        element.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('data-href');
            if (href) {
                if (href.startsWith(agentRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(agentRefUrl.length + 1)));
                    }
                    catch (e) {
                        this.logService.error('Invalid chat widget render data JSON', toErrorMessage(e));
                    }
                    if (args) {
                        a.parentElement.replaceChild(this.renderAgentWidget(args, store), a);
                    }
                }
                else if (href.startsWith(agentSlashRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(agentRefUrl.length + 1)));
                    }
                    catch (e) {
                        this.logService.error('Invalid chat slash command render data JSON', toErrorMessage(e));
                    }
                    if (args) {
                        a.parentElement.replaceChild(this.renderSlashCommandWidget(a.textContent, args, store), a);
                    }
                }
                else if (href.startsWith(decorationRefUrl)) {
                    let args;
                    try {
                        args = JSON.parse(decodeURIComponent(href.slice(decorationRefUrl.length + 1)));
                    }
                    catch (e) { }
                    a.parentElement.replaceChild(this.renderResourceWidget(a.textContent, args, store), a);
                }
                else if (href.startsWith(contentRefUrl)) {
                    this.renderFileWidget(content, href, a, store);
                }
                else if (href.startsWith('command:')) {
                    this.injectKeybindingHint(a, href, this.keybindingService);
                }
            }
        });
        return store;
    }
    renderAgentWidget(args, store) {
        const nameWithLeader = `${chatAgentLeader}${args.name}`;
        let container;
        if (args.isClickable) {
            container = dom.$('span.chat-agent-widget');
            const button = store.add(new Button(container, {
                buttonBackground: asCssVariable(chatSlashCommandBackground),
                buttonForeground: asCssVariable(chatSlashCommandForeground),
                buttonHoverBackground: undefined
            }));
            button.label = nameWithLeader;
            store.add(button.onDidClick(() => {
                const agent = this.chatAgentService.getAgent(args.agentId);
                const widget = this.chatWidgetService.lastFocusedWidget;
                if (!widget || !agent) {
                    return;
                }
                this.chatService.sendRequest(widget.viewModel.sessionId, agent.metadata.sampleRequest ?? '', {
                    location: widget.location,
                    agentId: agent.id,
                    userSelectedModelId: widget.input.currentLanguageModel,
                    mode: widget.input.currentModeKind
                });
            }));
        }
        else {
            container = this.renderResourceWidget(nameWithLeader, undefined, store);
        }
        const agent = this.chatAgentService.getAgent(args.agentId);
        const hover = new Lazy(() => store.add(this.instantiationService.createInstance(ChatAgentHover)));
        store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), container, () => {
            hover.value.setAgent(args.agentId);
            return hover.value.domNode;
        }, agent && getChatAgentHoverOptions(() => agent, this.commandService)));
        return container;
    }
    renderSlashCommandWidget(name, args, store) {
        const container = dom.$('span.chat-agent-widget.chat-command-widget');
        const agent = this.chatAgentService.getAgent(args.agentId);
        const button = store.add(new Button(container, {
            buttonBackground: asCssVariable(chatSlashCommandBackground),
            buttonForeground: asCssVariable(chatSlashCommandForeground),
            buttonHoverBackground: undefined
        }));
        button.label = name;
        store.add(button.onDidClick(() => {
            const widget = this.chatWidgetService.lastFocusedWidget;
            if (!widget || !agent) {
                return;
            }
            const command = agent.slashCommands.find(c => c.name === args.command);
            this.chatService.sendRequest(widget.viewModel.sessionId, command?.sampleRequest ?? '', {
                location: widget.location,
                agentId: agent.id,
                slashCommand: args.command,
                userSelectedModelId: widget.input.currentLanguageModel,
                mode: widget.input.currentModeKind
            });
        }));
        return container;
    }
    renderFileWidget(content, href, a, store) {
        // TODO this can be a nicer FileLabel widget with an icon. Do a simple link for now.
        const fullUri = URI.parse(href);
        const data = content.inlineReferences?.[fullUri.path.slice(1)];
        if (!data) {
            this.logService.error('Invalid chat widget render data JSON');
            return;
        }
        const inlineAnchor = store.add(this.instantiationService.createInstance(InlineAnchorWidget, a, data));
        store.add(this.chatMarkdownAnchorService.register(inlineAnchor));
    }
    renderResourceWidget(name, args, store) {
        const container = dom.$('span.chat-resource-widget');
        const alias = dom.$('span', undefined, name);
        if (args?.title) {
            store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), container, args.title));
        }
        container.appendChild(alias);
        return container;
    }
    injectKeybindingHint(a, href, keybindingService) {
        const command = href.match(/command:([^\)]+)/)?.[1];
        if (command) {
            const kb = keybindingService.lookupKeybinding(command);
            if (kb) {
                const keybinding = kb.getLabel();
                if (keybinding) {
                    a.textContent = `${a.textContent} (${keybinding})`;
                }
            }
        }
    }
};
ChatMarkdownDecorationsRenderer = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILogService),
    __param(2, IChatAgentService),
    __param(3, IInstantiationService),
    __param(4, IHoverService),
    __param(5, IChatService),
    __param(6, IChatWidgetService),
    __param(7, ICommandService),
    __param(8, ILabelService),
    __param(9, ILanguageModelToolsService),
    __param(10, IChatMarkdownAnchorService)
], ChatMarkdownDecorationsRenderer);
export { ChatMarkdownDecorationsRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duRGVjb3JhdGlvbnNSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRNYXJrZG93bkRlY29yYXRpb25zUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSww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