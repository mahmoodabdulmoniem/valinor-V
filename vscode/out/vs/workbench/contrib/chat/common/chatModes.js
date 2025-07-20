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
var ChatModeService_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue, transaction } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { ChatModeKind } from './constants.js';
import { IPromptsService } from './promptSyntax/service/promptsService.js';
export const IChatModeService = createDecorator('chatModeService');
let ChatModeService = class ChatModeService extends Disposable {
    static { ChatModeService_1 = this; }
    static { this.CUSTOM_MODES_STORAGE_KEY = 'chat.customModes'; }
    constructor(promptsService, chatAgentService, contextKeyService, logService, storageService) {
        super();
        this.promptsService = promptsService;
        this.chatAgentService = chatAgentService;
        this.logService = logService;
        this.storageService = storageService;
        this._customModeInstances = new Map();
        this._onDidChangeChatModes = new Emitter();
        this.onDidChangeChatModes = this._onDidChangeChatModes.event;
        this.hasCustomModes = ChatContextKeys.Modes.hasCustomChatModes.bindTo(contextKeyService);
        // Load cached modes from storage first
        this.loadCachedModes();
        void this.refreshCustomPromptModes(true);
        this._register(this.promptsService.onDidChangeCustomChatModes(() => {
            void this.refreshCustomPromptModes(true);
        }));
        this._register(this.storageService.onWillSaveState(() => this.saveCachedModes()));
        // Ideally we can get rid of the setting to disable agent mode?
        let didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
        this._register(this.chatAgentService.onDidChangeAgents(() => {
            if (didHaveToolsAgent !== this.chatAgentService.hasToolsAgent) {
                didHaveToolsAgent = this.chatAgentService.hasToolsAgent;
                this._onDidChangeChatModes.fire();
            }
        }));
    }
    loadCachedModes() {
        try {
            const cachedCustomModes = this.storageService.getObject(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (cachedCustomModes) {
                this.deserializeCachedModes(cachedCustomModes);
            }
        }
        catch (error) {
            this.logService.error(error, 'Failed to load cached custom chat modes');
        }
    }
    deserializeCachedModes(cachedCustomModes) {
        if (!Array.isArray(cachedCustomModes)) {
            this.logService.error('Invalid cached custom modes data: expected array');
            return;
        }
        for (const cachedMode of cachedCustomModes) {
            if (isCachedChatModeData(cachedMode) && cachedMode.uri) {
                try {
                    const uri = URI.revive(cachedMode.uri);
                    const customChatMode = {
                        uri,
                        name: cachedMode.name,
                        description: cachedMode.description,
                        tools: cachedMode.customTools,
                        model: cachedMode.model,
                        body: cachedMode.body || ''
                    };
                    const instance = new CustomChatMode(customChatMode);
                    this._customModeInstances.set(uri.toString(), instance);
                }
                catch (error) {
                    this.logService.error(error, 'Failed to create custom chat mode instance from cached data');
                }
            }
        }
        this.hasCustomModes.set(this._customModeInstances.size > 0);
    }
    saveCachedModes() {
        try {
            const modesToCache = Array.from(this._customModeInstances.values());
            this.storageService.store(ChatModeService_1.CUSTOM_MODES_STORAGE_KEY, modesToCache, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        catch (error) {
            this.logService.warn('Failed to save cached custom chat modes', error);
        }
    }
    async refreshCustomPromptModes(fireChangeEvent) {
        try {
            const customModes = await this.promptsService.getCustomChatModes(CancellationToken.None);
            // Create a new set of mode instances, reusing existing ones where possible
            const seenUris = new Set();
            for (const customMode of customModes) {
                const uriString = customMode.uri.toString();
                seenUris.add(uriString);
                let modeInstance = this._customModeInstances.get(uriString);
                if (modeInstance) {
                    // Update existing instance with new data
                    modeInstance.updateData(customMode);
                }
                else {
                    // Create new instance
                    modeInstance = new CustomChatMode(customMode);
                    this._customModeInstances.set(uriString, modeInstance);
                }
            }
            // Clean up instances for modes that no longer exist
            for (const [uriString] of this._customModeInstances.entries()) {
                if (!seenUris.has(uriString)) {
                    this._customModeInstances.delete(uriString);
                }
            }
            this.hasCustomModes.set(this._customModeInstances.size > 0);
        }
        catch (error) {
            this.logService.error(error, 'Failed to load custom chat modes');
            this._customModeInstances.clear();
            this.hasCustomModes.set(false);
        }
        if (fireChangeEvent) {
            this._onDidChangeChatModes.fire();
        }
    }
    getModes() {
        return { builtin: this.getBuiltinModes(), custom: Array.from(this._customModeInstances.values()) };
    }
    getFlatModes() {
        const allModes = this.getModes();
        return [...allModes.builtin, ...allModes.custom];
    }
    findModeById(id) {
        const allModes = this.getFlatModes();
        return allModes.find(mode => mode.id === id);
    }
    findModeByName(name) {
        const allModes = this.getFlatModes();
        return allModes.find(mode => mode.name === name);
    }
    getBuiltinModes() {
        const builtinModes = [
            ChatMode.Ask,
        ];
        if (this.chatAgentService.hasToolsAgent) {
            builtinModes.unshift(ChatMode.Agent);
        }
        builtinModes.push(ChatMode.Edit);
        return builtinModes;
    }
};
ChatModeService = ChatModeService_1 = __decorate([
    __param(0, IPromptsService),
    __param(1, IChatAgentService),
    __param(2, IContextKeyService),
    __param(3, ILogService),
    __param(4, IStorageService)
], ChatModeService);
export { ChatModeService };
function isCachedChatModeData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const mode = data;
    return typeof mode.id === 'string' &&
        typeof mode.name === 'string' &&
        typeof mode.kind === 'string' &&
        (mode.description === undefined || typeof mode.description === 'string') &&
        (mode.customTools === undefined || Array.isArray(mode.customTools)) &&
        (mode.body === undefined || typeof mode.body === 'string') &&
        (mode.model === undefined || typeof mode.model === 'string') &&
        (mode.uri === undefined || (typeof mode.uri === 'object' && mode.uri !== null));
}
export class CustomChatMode {
    get description() {
        return this._descriptionObservable;
    }
    get customTools() {
        return this._customToolsObservable;
    }
    get model() {
        return this._modelObservable;
    }
    get body() {
        return this._bodyObservable;
    }
    get uri() {
        return this._uriObservable;
    }
    constructor(customChatMode) {
        this.kind = ChatModeKind.Agent;
        this.id = customChatMode.uri.toString();
        this.name = customChatMode.name;
        this._descriptionObservable = observableValue('description', customChatMode.description);
        this._customToolsObservable = observableValue('customTools', customChatMode.tools);
        this._modelObservable = observableValue('model', customChatMode.model);
        this._bodyObservable = observableValue('body', customChatMode.body);
        this._uriObservable = observableValue('uri', customChatMode.uri);
    }
    /**
     * Updates the underlying data and triggers observable changes
     */
    updateData(newData) {
        transaction(tx => {
            // Note- name is derived from ID, it can't change
            this._descriptionObservable.set(newData.description, tx);
            this._customToolsObservable.set(newData.tools, tx);
            this._modelObservable.set(newData.model, tx);
            this._bodyObservable.set(newData.body, tx);
            this._uriObservable.set(newData.uri, tx);
        });
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description.get(),
            kind: this.kind,
            customTools: this.customTools.get(),
            model: this.model.get(),
            body: this.body.get(),
            uri: this.uri.get()
        };
    }
}
export class BuiltinChatMode {
    constructor(kind, name, description) {
        this.kind = kind;
        this.name = name;
        this.description = observableValue('description', description);
    }
    get id() {
        // Need a differentiator?
        return this.kind;
    }
    /**
     * Getters are not json-stringified
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description.get(),
            kind: this.kind
        };
    }
}
export var ChatMode;
(function (ChatMode) {
    ChatMode.Ask = new BuiltinChatMode(ChatModeKind.Ask, 'Ask', localize('chatDescription', "Ask a question."));
    ChatMode.Edit = new BuiltinChatMode(ChatModeKind.Edit, 'Edit', localize('editsDescription', "Edit files."));
    ChatMode.Agent = new BuiltinChatMode(ChatModeKind.Agent, 'Agent', localize('agentDescription', "Build autonomously."));
})(ChatMode || (ChatMode = {}));
export function isBuiltinChatMode(mode) {
    return mode.id === ChatMode.Ask.id ||
        mode.id === ChatMode.Edit.id ||
        mode.id === ChatMode.Agent.id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0TW9kZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFvQyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQW1CLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FB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