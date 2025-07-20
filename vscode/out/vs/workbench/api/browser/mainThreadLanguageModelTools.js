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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { ILanguageModelToolsService, toolResultHasBuffers } from '../../contrib/chat/common/languageModelToolsService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadLanguageModelTools = class MainThreadLanguageModelTools extends Disposable {
    constructor(extHostContext, _languageModelToolsService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._tools = this._register(new DisposableMap());
        this._runningToolCalls = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostLanguageModelTools);
        this._register(this._languageModelToolsService.onDidChangeTools(e => this._proxy.$onDidChangeTools(this.getToolDtos())));
    }
    getToolDtos() {
        return Array.from(this._languageModelToolsService.getTools())
            .map(tool => ({
            id: tool.id,
            displayName: tool.displayName,
            toolReferenceName: tool.toolReferenceName,
            tags: tool.tags,
            userDescription: tool.userDescription,
            modelDescription: tool.modelDescription,
            inputSchema: tool.inputSchema,
            source: tool.source,
        }));
    }
    async $getTools() {
        return this.getToolDtos();
    }
    async $invokeTool(dto, token) {
        const result = await this._languageModelToolsService.invokeTool(dto, (input, token) => this._proxy.$countTokensForInvocation(dto.callId, input, token), token ?? CancellationToken.None);
        // Don't return extra metadata to EH
        const out = { content: result.content };
        return toolResultHasBuffers(result) ? new SerializableObjectWithBuffers(out) : out;
    }
    $acceptToolProgress(callId, progress) {
        this._runningToolCalls.get(callId)?.progress.report(progress);
    }
    $countTokensForInvocation(callId, input, token) {
        const fn = this._runningToolCalls.get(callId);
        if (!fn) {
            throw new Error(`Tool invocation call ${callId} not found`);
        }
        return fn.countTokens(input, token);
    }
    $registerTool(id) {
        const disposable = this._languageModelToolsService.registerToolImplementation(id, {
            invoke: async (dto, countTokens, progress, token) => {
                try {
                    this._runningToolCalls.set(dto.callId, { countTokens, progress });
                    const resultSerialized = await this._proxy.$invokeTool(dto, token);
                    const resultDto = resultSerialized instanceof SerializableObjectWithBuffers ? resultSerialized.value : resultSerialized;
                    return revive(resultDto);
                }
                finally {
                    this._runningToolCalls.delete(dto.callId);
                }
            },
            prepareToolInvocation: (context, token) => this._proxy.$prepareToolInvocation(id, context, token),
        });
        this._tools.set(id, disposable);
    }
    $unregisterTool(name) {
        this._tools.deleteAndDispose(name);
    }
};
MainThreadLanguageModelTools = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageModelTools),
    __param(1, ILanguageModelToolsService)
], MainThreadLanguageModelTools);
export { MainThreadLanguageModelTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRMYW5ndWFnZU1vZGVsVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUF1QiwwQkFBMEIsRUFBaUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5TSxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFPLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBZ0QsV0FBVyxFQUFxQyxNQUFNLCtCQUErQixDQUFDO0FBR3RKLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTtJQVMzRCxZQUNDLGNBQStCLEVBQ0gsMEJBQXVFO1FBRW5HLEtBQUssRUFBRSxDQUFDO1FBRnFDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNEI7UUFSbkYsV0FBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFDO1FBQ3JELHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUd4QyxDQUFDO1FBT0osSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBRWhG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