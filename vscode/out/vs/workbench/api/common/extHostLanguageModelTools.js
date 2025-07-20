/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { isToolInvocationContext } from '../../contrib/chat/common/languageModelToolsService.js';
import { ExtensionEditToolId, InternalEditToolId } from '../../contrib/chat/common/tools/editFileTool.js';
import { InternalFetchWebPageToolId } from '../../contrib/chat/common/tools/tools.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { MainContext } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { SearchExtensionsToolId } from '../../contrib/extensions/common/searchExtensionsTool.js';
import { Lazy } from '../../../base/common/lazy.js';
class Tool {
    constructor(data) {
        this._apiObject = new Lazy(() => {
            const that = this;
            return Object.freeze({
                get name() { return that._data.id; },
                get description() { return that._data.modelDescription; },
                get inputSchema() { return that._data.inputSchema; },
                get tags() { return that._data.tags ?? []; },
                get source() { return undefined; }
            });
        });
        this._apiObjectWithChatParticipantAdditions = new Lazy(() => {
            const that = this;
            const source = typeConvert.LanguageModelToolSource.to(that._data.source);
            return Object.freeze({
                get name() { return that._data.id; },
                get description() { return that._data.modelDescription; },
                get inputSchema() { return that._data.inputSchema; },
                get tags() { return that._data.tags ?? []; },
                get source() { return source; }
            });
        });
        this._data = data;
    }
    update(newData) {
        this._data = newData;
    }
    get data() {
        return this._data;
    }
    get apiObject() {
        return this._apiObject.value;
    }
    get apiObjectWithChatParticipantAdditions() {
        return this._apiObjectWithChatParticipantAdditions.value;
    }
}
export class ExtHostLanguageModelTools {
    constructor(mainContext, _languageModels) {
        this._languageModels = _languageModels;
        /** A map of tools that were registered in this EH */
        this._registeredTools = new Map();
        this._tokenCountFuncs = new Map();
        /** A map of all known tools, from other EHs or registered in vscode core */
        this._allTools = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadLanguageModelTools);
        this._proxy.$getTools().then(tools => {
            for (const tool of tools) {
                this._allTools.set(tool.id, new Tool(revive(tool)));
            }
        });
    }
    async $countTokensForInvocation(callId, input, token) {
        const fn = this._tokenCountFuncs.get(callId);
        if (!fn) {
            throw new Error(`Tool invocation call ${callId} not found`);
        }
        return await fn(input, token);
    }
    async invokeTool(extension, toolId, options, token) {
        const callId = generateUuid();
        if (options.tokenizationOptions) {
            this._tokenCountFuncs.set(callId, options.tokenizationOptions.countTokens);
        }
        try {
            if (options.toolInvocationToken && !isToolInvocationContext(options.toolInvocationToken)) {
                throw new Error(`Invalid tool invocation token`);
            }
            if ((toolId === InternalEditToolId || toolId === ExtensionEditToolId) && !isProposedApiEnabled(extension, 'chatParticipantPrivate')) {
                throw new Error(`Invalid tool: ${toolId}`);
            }
            // Making the round trip here because not all tools were necessarily registered in this EH
            const result = await this._proxy.$invokeTool({
                toolId,
                callId,
                parameters: options.input,
                tokenBudget: options.tokenizationOptions?.tokenBudget,
                context: options.toolInvocationToken,
                chatRequestId: isProposedApiEnabled(extension, 'chatParticipantPrivate') ? options.chatRequestId : undefined,
                chatInteractionId: isProposedApiEnabled(extension, 'chatParticipantPrivate') ? options.chatInteractionId : undefined,
            }, token);
            const dto = result instanceof SerializableObjectWithBuffers ? result.value : result;
            return typeConvert.LanguageModelToolResult2.to(revive(dto));
        }
        finally {
            this._tokenCountFuncs.delete(callId);
        }
    }
    $onDidChangeTools(tools) {
        const oldTools = new Set(this._registeredTools.keys());
        for (const tool of tools) {
            oldTools.delete(tool.id);
            const existing = this._allTools.get(tool.id);
            if (existing) {
                existing.update(tool);
            }
            else {
                this._allTools.set(tool.id, new Tool(revive(tool)));
            }
        }
        for (const id of oldTools) {
            this._allTools.delete(id);
        }
    }
    getTools(extension) {
        const hasParticipantAdditions = isProposedApiEnabled(extension, 'chatParticipantPrivate');
        return Array.from(this._allTools.values())
            .map(tool => hasParticipantAdditions ? tool.apiObjectWithChatParticipantAdditions : tool.apiObject)
            .filter(tool => {
            switch (tool.name) {
                case InternalEditToolId:
                case ExtensionEditToolId:
                case InternalFetchWebPageToolId:
                case SearchExtensionsToolId:
                    return isProposedApiEnabled(extension, 'chatParticipantPrivate');
                default:
                    return true;
            }
        });
    }
    async $invokeTool(dto, token) {
        const item = this._registeredTools.get(dto.toolId);
        if (!item) {
            throw new Error(`Unknown tool ${dto.toolId}`);
        }
        const options = {
            input: dto.parameters,
            toolInvocationToken: dto.context,
        };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate')) {
            options.chatRequestId = dto.chatRequestId;
            options.chatInteractionId = dto.chatInteractionId;
            options.chatSessionId = dto.context?.sessionId;
            if (dto.toolSpecificData?.kind === 'terminal') {
                options.terminalCommand = dto.toolSpecificData.command;
            }
        }
        if (isProposedApiEnabled(item.extension, 'chatParticipantAdditions') && dto.modelId) {
            options.model = await this.getModel(dto.modelId, item.extension);
        }
        if (dto.tokenBudget !== undefined) {
            options.tokenizationOptions = {
                tokenBudget: dto.tokenBudget,
                countTokens: this._tokenCountFuncs.get(dto.callId) || ((value, token = CancellationToken.None) => this._proxy.$countTokensForInvocation(dto.callId, value, token))
            };
        }
        let progress;
        if (isProposedApiEnabled(item.extension, 'toolProgress')) {
            progress = {
                report: value => {
                    this._proxy.$acceptToolProgress(dto.callId, {
                        message: typeConvert.MarkdownString.fromStrict(value.message),
                        increment: value.increment,
                        total: 100,
                    });
                }
            };
        }
        // todo: 'any' cast because TS can't handle the overloads
        const extensionResult = await raceCancellation(Promise.resolve(item.tool.invoke(options, token, progress)), token);
        if (!extensionResult) {
            throw new CancellationError();
        }
        return typeConvert.LanguageModelToolResult2.from(extensionResult, item.extension);
    }
    async getModel(modelId, extension) {
        let model;
        if (modelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, modelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $prepareToolInvocation(toolId, context, token) {
        const item = this._registeredTools.get(toolId);
        if (!item) {
            throw new Error(`Unknown tool ${toolId}`);
        }
        const options = {
            input: context.parameters,
            chatRequestId: context.chatRequestId,
            chatSessionId: context.chatSessionId,
            chatInteractionId: context.chatInteractionId
        };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate') && item.tool.prepareInvocation2) {
            const result = await item.tool.prepareInvocation2(options, token);
            if (!result) {
                return undefined;
            }
            return {
                confirmationMessages: result.confirmationMessages ? {
                    title: typeof result.confirmationMessages.title === 'string' ? result.confirmationMessages.title : typeConvert.MarkdownString.from(result.confirmationMessages.title),
                    message: typeof result.confirmationMessages.message === 'string' ? result.confirmationMessages.message : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                } : undefined,
                toolSpecificData: {
                    kind: 'terminal',
                    language: result.language,
                    command: result.command,
                },
                presentation: result.presentation
            };
        }
        else if (item.tool.prepareInvocation) {
            const result = await item.tool.prepareInvocation(options, token);
            if (!result) {
                return undefined;
            }
            if (result.pastTenseMessage || result.presentation) {
                checkProposedApiEnabled(item.extension, 'chatParticipantPrivate');
            }
            return {
                confirmationMessages: result.confirmationMessages ? {
                    title: typeof result.confirmationMessages.title === 'string' ? result.confirmationMessages.title : typeConvert.MarkdownString.from(result.confirmationMessages.title),
                    message: typeof result.confirmationMessages.message === 'string' ? result.confirmationMessages.message : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                } : undefined,
                invocationMessage: typeConvert.MarkdownString.fromStrict(result.invocationMessage),
                pastTenseMessage: typeConvert.MarkdownString.fromStrict(result.pastTenseMessage),
                presentation: result.presentation
            };
        }
        return undefined;
    }
    registerTool(extension, id, tool) {
        this._registeredTools.set(id, { extension, tool });
        this._proxy.$registerTool(id);
        return toDisposable(() => {
            this._registeredTools.delete(id);
            this._proxy.$unregisterTool(id);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEVBQTJCLHVCQUF1QixFQUEyRixNQUFNLHdEQUF3RCxDQUFDO0FBQ25OLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9HLE9BQU8sRUFBTyw2QkFBNkIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pHLE9BQU8sRUFBOEQsV0FBVyxFQUFxQyxNQUFNLHVCQUF1QixDQUFDO0FBRW5KLE9BQU8sS0FBSyxXQUFXLE1BQU0sNEJBQTRCLENBQUM7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDakcsT0FBTyxFQUFFLElBQUksRUFB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