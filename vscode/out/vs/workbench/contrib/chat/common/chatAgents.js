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
var ChatAgentNameService_1;
import { findLast } from '../../../../base/common/arraysFind.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { observableValue } from '../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from './constants.js';
export const IChatAgentService = createDecorator('chatAgentService');
let ChatAgentService = class ChatAgentService extends Disposable {
    static { this.AGENT_LEADER = '@'; }
    constructor(contextKeyService, configurationService) {
        super();
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this._agents = new Map();
        this._onDidChangeAgents = new Emitter();
        this.onDidChangeAgents = this._onDidChangeAgents.event;
        this._agentsContextKeys = new Set();
        this._hasToolsAgent = false;
        this._chatParticipantDetectionProviders = new Map();
        this._agentCompletionProviders = new Map();
        this._hasDefaultAgent = ChatContextKeys.enabled.bindTo(this.contextKeyService);
        this._extensionAgentRegistered = ChatContextKeys.extensionParticipantRegistered.bindTo(this.contextKeyService);
        this._defaultAgentRegistered = ChatContextKeys.panelParticipantRegistered.bindTo(this.contextKeyService);
        this._register(contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(this._agentsContextKeys)) {
                this._updateContextKeys();
            }
        }));
    }
    registerAgent(id, data) {
        const existingAgent = this.getAgent(id);
        if (existingAgent) {
            throw new Error(`Agent already registered: ${JSON.stringify(id)}`);
        }
        const that = this;
        const commands = data.slashCommands;
        data = {
            ...data,
            get slashCommands() {
                return commands.filter(c => !c.when || that.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(c.when)));
            }
        };
        const entry = { data };
        this._agents.set(id, entry);
        this._updateAgentsContextKeys();
        this._updateContextKeys();
        this._onDidChangeAgents.fire(undefined);
        return toDisposable(() => {
            this._agents.delete(id);
            this._updateAgentsContextKeys();
            this._updateContextKeys();
            this._onDidChangeAgents.fire(undefined);
        });
    }
    _updateAgentsContextKeys() {
        // Update the set of context keys used by all agents
        this._agentsContextKeys.clear();
        for (const agent of this._agents.values()) {
            if (agent.data.when) {
                const expr = ContextKeyExpr.deserialize(agent.data.when);
                for (const key of expr?.keys() || []) {
                    this._agentsContextKeys.add(key);
                }
            }
        }
    }
    _updateContextKeys() {
        let extensionAgentRegistered = false;
        let defaultAgentRegistered = false;
        let toolsAgentRegistered = false;
        for (const agent of this.getAgents()) {
            if (agent.isDefault) {
                if (!agent.isCore) {
                    extensionAgentRegistered = true;
                }
                if (agent.id === 'chat.setup' || agent.id === 'github.copilot.editsAgent') {
                    // TODO@roblourens firing the event below probably isn't necessary but leave it alone for now
                    toolsAgentRegistered = true;
                }
                else {
                    defaultAgentRegistered = true;
                }
            }
        }
        this._defaultAgentRegistered.set(defaultAgentRegistered);
        this._extensionAgentRegistered.set(extensionAgentRegistered);
        if (toolsAgentRegistered !== this._hasToolsAgent) {
            this._hasToolsAgent = toolsAgentRegistered;
            this._onDidChangeAgents.fire(this.getDefaultAgent(ChatAgentLocation.Panel, ChatModeKind.Agent));
        }
    }
    registerAgentImplementation(id, agentImpl) {
        const entry = this._agents.get(id);
        if (!entry) {
            throw new Error(`Unknown agent: ${JSON.stringify(id)}`);
        }
        if (entry.impl) {
            throw new Error(`Agent already has implementation: ${JSON.stringify(id)}`);
        }
        if (entry.data.isDefault) {
            this._hasDefaultAgent.set(true);
        }
        entry.impl = agentImpl;
        this._onDidChangeAgents.fire(new MergedChatAgent(entry.data, agentImpl));
        return toDisposable(() => {
            entry.impl = undefined;
            this._onDidChangeAgents.fire(undefined);
            if (entry.data.isDefault) {
                this._hasDefaultAgent.set(Iterable.some(this._agents.values(), agent => agent.data.isDefault));
            }
        });
    }
    registerDynamicAgent(data, agentImpl) {
        data.isDynamic = true;
        const agent = { data, impl: agentImpl };
        this._agents.set(data.id, agent);
        this._onDidChangeAgents.fire(new MergedChatAgent(data, agentImpl));
        return toDisposable(() => {
            this._agents.delete(data.id);
            this._onDidChangeAgents.fire(undefined);
        });
    }
    registerAgentCompletionProvider(id, provider) {
        this._agentCompletionProviders.set(id, provider);
        return {
            dispose: () => { this._agentCompletionProviders.delete(id); }
        };
    }
    async getAgentCompletionItems(id, query, token) {
        return await this._agentCompletionProviders.get(id)?.(query, token) ?? [];
    }
    updateAgent(id, updateMetadata) {
        const agent = this._agents.get(id);
        if (!agent?.impl) {
            throw new Error(`No activated agent with id ${JSON.stringify(id)} registered`);
        }
        agent.data.metadata = { ...agent.data.metadata, ...updateMetadata };
        this._onDidChangeAgents.fire(new MergedChatAgent(agent.data, agent.impl));
    }
    getDefaultAgent(location, mode = ChatModeKind.Ask) {
        return this._preferExtensionAgent(this.getActivatedAgents().filter(a => {
            if (mode && !a.modes.includes(mode)) {
                return false;
            }
            return !!a.isDefault && a.locations.includes(location);
        }));
    }
    get hasToolsAgent() {
        // The chat participant enablement is just based on this setting. Don't wait for the extension to be loaded.
        return !!this.configurationService.getValue(ChatConfiguration.AgentEnabled);
    }
    getContributedDefaultAgent(location) {
        return this._preferExtensionAgent(this.getAgents().filter(a => !!a.isDefault && a.locations.includes(location)));
    }
    _preferExtensionAgent(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the last extensions provided agent
        // falling back to the last core agent if no extension agent is found.
        return findLast(agents, agent => !agent.isCore) ?? agents.at(-1);
    }
    getAgent(id, includeDisabled = false) {
        if (!this._agentIsEnabled(id) && !includeDisabled) {
            return;
        }
        return this._agents.get(id)?.data;
    }
    _agentIsEnabled(idOrAgent) {
        const entry = typeof idOrAgent === 'string' ? this._agents.get(idOrAgent) : idOrAgent;
        return !entry?.data.when || this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(entry.data.when));
    }
    getAgentByFullyQualifiedId(id) {
        const agent = Iterable.find(this._agents.values(), a => getFullyQualifiedId(a.data) === id)?.data;
        if (agent && !this._agentIsEnabled(agent.id)) {
            return;
        }
        return agent;
    }
    /**
     * Returns all agent datas that exist- static registered and dynamic ones.
     */
    getAgents() {
        return Array.from(this._agents.values())
            .map(entry => entry.data)
            .filter(a => this._agentIsEnabled(a.id));
    }
    getActivatedAgents() {
        return Array.from(this._agents.values())
            .filter(a => !!a.impl)
            .filter(a => this._agentIsEnabled(a.data.id))
            .map(a => new MergedChatAgent(a.data, a.impl));
    }
    getAgentsByName(name) {
        return this._preferExtensionAgents(this.getAgents().filter(a => a.name === name));
    }
    _preferExtensionAgents(agents) {
        // We potentially have multiple agents on the same location,
        // contributed from core and from extensions.
        // This method will prefer the extensions provided agents
        // falling back to the original agents array extension agent is found.
        const extensionAgents = agents.filter(a => !a.isCore);
        return extensionAgents.length > 0 ? extensionAgents : agents;
    }
    agentHasDupeName(id) {
        const agent = this.getAgent(id);
        if (!agent) {
            return false;
        }
        return this.getAgentsByName(agent.name)
            .filter(a => a.extensionId.value !== agent.extensionId.value).length > 0;
    }
    async invokeAgent(id, request, progress, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        return await data.impl.invoke(request, progress, history, token);
    }
    setRequestTools(id, requestId, tools) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        data.impl.setRequestTools?.(requestId, tools);
    }
    setRequestPaused(id, requestId, isPaused) {
        const data = this._agents.get(id);
        if (!data?.impl) {
            throw new Error(`No activated agent with id "${id}"`);
        }
        data.impl.setRequestPaused?.(requestId, isPaused);
    }
    async getFollowups(id, request, result, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl?.provideFollowups) {
            return [];
        }
        return data.impl.provideFollowups(request, result, history, token);
    }
    async getChatTitle(id, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl?.provideChatTitle) {
            return undefined;
        }
        return data.impl.provideChatTitle(history, token);
    }
    async getChatSummary(id, history, token) {
        const data = this._agents.get(id);
        if (!data?.impl?.provideChatSummary) {
            return undefined;
        }
        return data.impl.provideChatSummary(history, token);
    }
    registerChatParticipantDetectionProvider(handle, provider) {
        this._chatParticipantDetectionProviders.set(handle, provider);
        return toDisposable(() => {
            this._chatParticipantDetectionProviders.delete(handle);
        });
    }
    hasChatParticipantDetectionProviders() {
        return this._chatParticipantDetectionProviders.size > 0;
    }
    async detectAgentOrCommand(request, history, options, token) {
        // TODO@joyceerhl should we have a selector to be able to narrow down which provider to use
        const provider = Iterable.first(this._chatParticipantDetectionProviders.values());
        if (!provider) {
            return;
        }
        const participants = this.getAgents().reduce((acc, a) => {
            if (a.locations.includes(options.location)) {
                acc.push({ participant: a.id, disambiguation: a.disambiguation ?? [] });
                for (const command of a.slashCommands) {
                    acc.push({ participant: a.id, command: command.name, disambiguation: command.disambiguation ?? [] });
                }
            }
            return acc;
        }, []);
        const result = await provider.provideParticipantDetection(request, history, { ...options, participants }, token);
        if (!result) {
            return;
        }
        const agent = this.getAgent(result.participant);
        if (!agent) {
            // Couldn't find a participant matching the participant detection result
            return;
        }
        if (!result.command) {
            return { agent };
        }
        const command = agent?.slashCommands.find(c => c.name === result.command);
        if (!command) {
            // Couldn't find a slash command matching the participant detection result
            return;
        }
        return { agent, command };
    }
};
ChatAgentService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService)
], ChatAgentService);
export { ChatAgentService };
export class MergedChatAgent {
    constructor(data, impl) {
        this.data = data;
        this.impl = impl;
    }
    get id() { return this.data.id; }
    get name() { return this.data.name ?? ''; }
    get fullName() { return this.data.fullName ?? ''; }
    get description() { return this.data.description ?? ''; }
    get extensionId() { return this.data.extensionId; }
    get extensionPublisherId() { return this.data.extensionPublisherId; }
    get extensionPublisherDisplayName() { return this.data.publisherDisplayName; }
    get extensionDisplayName() { return this.data.extensionDisplayName; }
    get isDefault() { return this.data.isDefault; }
    get isCore() { return this.data.isCore; }
    get metadata() { return this.data.metadata; }
    get slashCommands() { return this.data.slashCommands; }
    get locations() { return this.data.locations; }
    get modes() { return this.data.modes; }
    get disambiguation() { return this.data.disambiguation; }
    async invoke(request, progress, history, token) {
        return this.impl.invoke(request, progress, history, token);
    }
    setRequestTools(requestId, tools) {
        this.impl.setRequestTools?.(requestId, tools);
    }
    setRequestPaused(requestId, isPaused) {
        this.impl.setRequestPaused?.(requestId, isPaused);
    }
    async provideFollowups(request, result, history, token) {
        if (this.impl.provideFollowups) {
            return this.impl.provideFollowups(request, result, history, token);
        }
        return [];
    }
    toJSON() {
        return this.data;
    }
}
export const IChatAgentNameService = createDecorator('chatAgentNameService');
let ChatAgentNameService = class ChatAgentNameService {
    static { ChatAgentNameService_1 = this; }
    static { this.StorageKey = 'chat.participantNameRegistry'; }
    constructor(productService, requestService, logService, storageService) {
        this.requestService = requestService;
        this.logService = logService;
        this.storageService = storageService;
        this.registry = observableValue(this, Object.create(null));
        this.disposed = false;
        if (!productService.chatParticipantRegistry) {
            return;
        }
        this.url = productService.chatParticipantRegistry;
        const raw = storageService.get(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        try {
            this.registry.set(JSON.parse(raw ?? '{}'), undefined);
        }
        catch (err) {
            storageService.remove(ChatAgentNameService_1.StorageKey, -1 /* StorageScope.APPLICATION */);
        }
        this.refresh();
    }
    refresh() {
        if (this.disposed) {
            return;
        }
        this.update()
            .catch(err => this.logService.warn('Failed to fetch chat participant registry', err))
            .then(() => timeout(5 * 60 * 1000)) // every 5 minutes
            .then(() => this.refresh());
    }
    async update() {
        const context = await this.requestService.request({ type: 'GET', url: this.url }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        if (!result || result.version !== 1) {
            throw new Error('Unexpected chat participant registry response.');
        }
        const registry = result.restrictedChatParticipants;
        this.registry.set(registry, undefined);
        this.storageService.store(ChatAgentNameService_1.StorageKey, JSON.stringify(registry), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    /**
     * Returns true if the agent is allowed to use this name
     */
    getAgentNameRestriction(chatAgentData) {
        if (chatAgentData.isCore) {
            return true; // core agents are always allowed to use any name
        }
        // TODO would like to use observables here but nothing uses it downstream and I'm not sure how to combine these two
        const nameAllowed = this.checkAgentNameRestriction(chatAgentData.name, chatAgentData).get();
        const fullNameAllowed = !chatAgentData.fullName || this.checkAgentNameRestriction(chatAgentData.fullName.replace(/\s/g, ''), chatAgentData).get();
        return nameAllowed && fullNameAllowed;
    }
    checkAgentNameRestriction(name, chatAgentData) {
        // Registry is a map of name to an array of extension publisher IDs or extension IDs that are allowed to use it.
        // Look up the list of extensions that are allowed to use this name
        const allowList = this.registry.map(registry => registry[name.toLowerCase()]);
        return allowList.map(allowList => {
            if (!allowList) {
                return true;
            }
            return allowList.some(id => equalsIgnoreCase(id, id.includes('.') ? chatAgentData.extensionId.value : chatAgentData.extensionPublisherId));
        });
    }
    dispose() {
        this.disposed = true;
    }
};
ChatAgentNameService = ChatAgentNameService_1 = __decorate([
    __param(0, IProductService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IStorageService)
], ChatAgentNameService);
export { ChatAgentNameService };
export function getFullyQualifiedId(chatAgentData) {
    return `${chatAgentData.extensionId.value}.${chatAgentData.id}`;
}
export function reviveSerializedAgent(raw) {
    const agent = 'name' in raw ?
        raw :
        {
            ...raw,
            name: raw.id,
        };
    // Fill in required fields that may be missing from old data
    if (!('extensionPublisherId' in agent)) {
        agent.extensionPublisherId = agent.extensionPublisher ?? '';
    }
    if (!('extensionDisplayName' in agent)) {
        agent.extensionDisplayName = '';
    }
    if (!('extensionId' in agent)) {
        agent.extensionId = new ExtensionIdentifier('');
    }
    return revive(agent);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEFnZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUl0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFD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