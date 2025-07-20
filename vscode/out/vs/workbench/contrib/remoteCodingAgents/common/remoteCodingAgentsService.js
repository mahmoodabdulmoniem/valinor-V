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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
export const IRemoteCodingAgentsService = createDecorator('remoteCodingAgentsService');
let RemoteCodingAgentsService = class RemoteCodingAgentsService extends Disposable {
    constructor(contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this.agents = [];
        this.contextKeys = new Set();
        this._ctxHasRemoteCodingAgent = ChatContextKeys.hasRemoteCodingAgent.bindTo(this.contextKeyService);
        // Listen for context changes and re-evaluate agent availability
        this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => {
            this.updateContextKeys();
        }));
    }
    getRegisteredAgents() {
        return [...this.agents];
    }
    getAvailableAgents() {
        return this.agents.filter(agent => this.isAgentAvailable(agent));
    }
    registerAgent(agent) {
        // Check if agent already exists
        const existingIndex = this.agents.findIndex(a => a.id === agent.id);
        if (existingIndex >= 0) {
            // Update existing agent
            this.agents[existingIndex] = agent;
        }
        else {
            // Add new agent
            this.agents.push(agent);
        }
        // Track context keys from the when condition
        if (agent.when) {
            const whenExpr = ContextKeyExpr.deserialize(agent.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this.contextKeys.add(key);
                }
            }
        }
        this.updateContextKeys();
    }
    isAgentAvailable(agent) {
        if (!agent.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(agent.when);
        return !whenExpr || this.contextKeyService.contextMatchesRules(whenExpr);
    }
    updateContextKeys() {
        const hasAvailableAgent = this.getAvailableAgents().length > 0;
        this._ctxHasRemoteCodingAgent.set(hasAvailableAgent);
    }
};
RemoteCodingAgentsService = __decorate([
    __param(0, IContextKeyService)
], RemoteCodingAgentsService);
export { RemoteCodingAgentsService };
registerSingleton(IRemoteCodingAgentsService, RemoteCodingAgentsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29kaW5nQWdlbnRzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlQ29kaW5nQWdlbnRzL2NvbW1vbi9yZW1vdGVDb2RpbmdBZ2VudHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZILE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBa0J2RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDJCQUEyQixDQUFDLENBQUM7QUFFNUcsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBTXhELFlBQ3FCLGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQUY2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBSjFELFdBQU0sR0FBeUIsRUFBRSxDQUFDO1FBQ2xDLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQU1oRCxJQUFJLENBQUMsd0JBQXdCLEdBQUcsZUFBZSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVwRyxnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLFNB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