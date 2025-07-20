/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { stringifyPromptElementJSON } from './tools/promptTsxTypes.js';
import { derived, ObservableSet } from '../../../../base/common/observable.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { localize } from '../../../../nls.js';
export var ToolDataSource;
(function (ToolDataSource) {
    ToolDataSource.Internal = { type: 'internal', label: 'Built-In' };
    function toKey(source) {
        switch (source.type) {
            case 'extension': return `extension:${source.extensionId.value}`;
            case 'mcp': return `mcp:${source.collectionId}:${source.definitionId}`;
            case 'user': return `user:${source.file.toString()}`;
            case 'internal': return 'internal';
        }
    }
    ToolDataSource.toKey = toKey;
    function equals(a, b) {
        return toKey(a) === toKey(b);
    }
    ToolDataSource.equals = equals;
    function classify(source) {
        if (source.type === 'internal') {
            return { ordinal: 1, label: localize('builtin', 'Built-In') };
        }
        else if (source.type === 'mcp') {
            return { ordinal: 2, label: localize('mcp', 'MCP Server: {0}', source.label) };
        }
        else if (source.type === 'user') {
            return { ordinal: 0, label: localize('user', 'User Defined') };
        }
        else {
            return { ordinal: 3, label: localize('ext', 'Extension: {0}', source.label) };
        }
    }
    ToolDataSource.classify = classify;
})(ToolDataSource || (ToolDataSource = {}));
export function isToolInvocationContext(obj) {
    return typeof obj === 'object' && typeof obj.sessionId === 'string';
}
export function isToolResultInputOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.input === 'string' && (typeof obj?.output === 'string' || Array.isArray(obj?.output));
}
export function toolResultHasBuffers(result) {
    return result.content.some(part => part.kind === 'data');
}
export function stringifyPromptTsxPart(part) {
    return stringifyPromptElementJSON(part.value);
}
export class ToolSet {
    constructor(id, referenceName, icon, source, description) {
        this.id = id;
        this.referenceName = referenceName;
        this.icon = icon;
        this.source = source;
        this.description = description;
        this._tools = new ObservableSet();
        this._toolSets = new ObservableSet();
        this.isHomogenous = derived(r => {
            return !Iterable.some(this._tools.observable.read(r), tool => !ToolDataSource.equals(tool.source, this.source))
                && !Iterable.some(this._toolSets.observable.read(r), toolSet => !ToolDataSource.equals(toolSet.source, this.source));
        });
    }
    addTool(data, tx) {
        this._tools.add(data, tx);
        return toDisposable(() => {
            this._tools.delete(data);
        });
    }
    addToolSet(toolSet, tx) {
        if (toolSet === this) {
            return Disposable.None;
        }
        this._toolSets.add(toolSet, tx);
        return toDisposable(() => {
            this._toolSets.delete(toolSet);
        });
    }
    getTools(r) {
        return Iterable.concat(this._tools.observable.read(r), ...Iterable.map(this._toolSets.observable.read(r), toolSet => toolSet.getTools(r)));
    }
}
export const ILanguageModelToolsService = createDecorator('ILanguageModelToolsService');
export function createToolInputUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.inMemory, path: `/lm/tool/${toolOrId}/tool_input.json` });
}
export function createToolSchemaUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.vscode, authority: 'schemas', path: `/lm/tool/${toolOrId}` });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vbGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzdGLE9BQU8sRUFBcUIsMEJBQTBCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFzQyxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBc0Q5QyxNQUFNLEtBQVcsY0FBYyxDQTRCOUI7QUE1QkQsV0FBaUIsY0FBYztJQUVqQix1QkFBUSxHQUFtQixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBRWhGLFNBQWdCLEtBQUssQ0FBQyxNQUFzQjtRQUMzQyxRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixLQUFLLFdBQVcsQ0FBQyxDQUFDLE9BQU8sYUFBYSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pFLEtBQUssS0FBSyxDQUFDLENBQUMsT0FBTyxPQUFPLE1BQU0s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