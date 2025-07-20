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
import { computeLevenshteinDistance } from '../../../../base/common/diff/diff.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { findNodeAtLocation, parseTree } from '../../../../base/common/json.js';
import { Disposable, DisposableStore, dispose, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { mcpConfigurationSection } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../common/mcpTypes.js';
const diagnosticOwner = 'vscode.mcp';
let McpLanguageFeatures = class McpLanguageFeatures extends Disposable {
    constructor(languageFeaturesService, _mcpRegistry, _mcpWorkbenchService, _mcpService, _markerService, _configurationResolverService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._mcpWorkbenchService = _mcpWorkbenchService;
        this._mcpService = _mcpService;
        this._markerService = _markerService;
        this._configurationResolverService = _configurationResolverService;
        this._cachedMcpSection = this._register(new MutableDisposable());
        const patterns = [
            { pattern: '**/mcp.json' },
            { pattern: '**/workspace.json' },
        ];
        const onDidChangeCodeLens = this._register(new Emitter());
        const codeLensProvider = {
            onDidChange: onDidChangeCodeLens.event,
            provideCodeLenses: (model, range) => this._provideCodeLenses(model, () => onDidChangeCodeLens.fire(codeLensProvider)),
        };
        this._register(languageFeaturesService.codeLensProvider.register(patterns, codeLensProvider));
        this._register(languageFeaturesService.inlayHintsProvider.register(patterns, {
            onDidChangeInlayHints: _mcpRegistry.onDidChangeInputs,
            provideInlayHints: (model, range) => this._provideInlayHints(model, range),
        }));
    }
    /** Simple mechanism to avoid extra json parsing for hints+lenses */
    async _parseModel(model) {
        if (this._cachedMcpSection.value?.model === model) {
            return this._cachedMcpSection.value;
        }
        const uri = model.uri;
        const inConfig = await this._mcpWorkbenchService.getMcpConfigPath(model.uri);
        if (!inConfig) {
            return undefined;
        }
        const value = model.getValue();
        const tree = parseTree(value);
        const listeners = [
            model.onDidChangeContent(() => this._cachedMcpSection.clear()),
            model.onWillDispose(() => this._cachedMcpSection.clear()),
        ];
        this._addDiagnostics(model, value, tree, inConfig);
        return this._cachedMcpSection.value = {
            model,
            tree,
            inConfig,
            dispose: () => {
                this._markerService.remove(diagnosticOwner, [uri]);
                dispose(listeners);
            }
        };
    }
    _addDiagnostics(tm, value, tree, inConfig) {
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return;
        }
        const getClosestMatchingVariable = (name) => {
            let bestValue = '';
            let bestDistance = Infinity;
            for (const variable of this._configurationResolverService.resolvableVariables) {
                const distance = computeLevenshteinDistance(name, variable);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestValue = variable;
                }
            }
            return bestValue;
        };
        const diagnostics = [];
        forEachPropertyWithReplacement(serversNode, node => {
            const expr = ConfigurationResolverExpression.parse(node.value);
            for (const { id, name, arg } of expr.unresolved()) {
                if (!this._configurationResolverService.resolvableVariables.has(name)) {
                    const position = value.indexOf(id, node.offset);
                    if (position === -1) {
                        continue;
                    } // unreachable?
                    const start = tm.getPositionAt(position);
                    const end = tm.getPositionAt(position + id.length);
                    diagnostics.push({
                        severity: MarkerSeverity.Warning,
                        message: localize('mcp.variableNotFound', 'Variable `{0}` not found, did you mean ${{1}}?', name, getClosestMatchingVariable(name) + (arg ? `:${arg}` : '')),
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        modelVersionId: tm.getVersionId(),
                    });
                }
            }
        });
        if (diagnostics.length) {
            this._markerService.changeOne(diagnosticOwner, tm.uri, diagnostics);
        }
        else {
            this._markerService.remove(diagnosticOwner, [tm.uri]);
        }
    }
    async _provideCodeLenses(model, onDidChangeCodeLens) {
        const parsed = await this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return undefined;
        }
        const store = new DisposableStore();
        const lenses = { lenses: [], dispose: () => store.dispose() };
        const read = (observable) => {
            store.add(Event.fromObservableLight(observable)(onDidChangeCodeLens));
            return observable.get();
        };
        const collection = read(this._mcpRegistry.collections).find(c => isEqual(c.presentation?.origin, model.uri));
        if (!collection) {
            return lenses;
        }
        const mcpServers = read(this._mcpService.servers).filter(s => s.collection.id === collection.id);
        for (const node of serversNode.children || []) {
            if (node.type !== 'property' || node.children?.[0]?.type !== 'string') {
                continue;
            }
            const name = node.children[0].value;
            const server = mcpServers.find(s => s.definition.label === name);
            if (!server) {
                continue;
            }
            const range = Range.fromPositions(model.getPositionAt(node.children[0].offset));
            const canDebug = !!server.readDefinitions().get().server?.devMode?.debug;
            const state = read(server.connectionState).state;
            switch (state) {
                case 3 /* McpConnectionState.Kind.Error */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(error) ' + localize('server.error', 'Error'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                            title: localize('mcp.restart', "Restart"),
                            arguments: [server.definition.id],
                        },
                    });
                    if (canDebug) {
                        lenses.lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                                title: localize('mcp.debug', "Debug"),
                                arguments: [server.definition.id, { debug: true }],
                            },
                        });
                    }
                    break;
                case 1 /* McpConnectionState.Kind.Starting */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(loading~spin) ' + localize('server.starting', 'Starting'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
                            title: localize('cancel', "Cancel"),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 2 /* McpConnectionState.Kind.Running */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
                            title: '$(check) ' + localize('server.running', 'Running'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
                            title: localize('mcp.stop', "Stop"),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                            title: localize('mcp.restart', "Restart"),
                            arguments: [server.definition.id],
                        },
                    });
                    if (canDebug) {
                        lenses.lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
                                title: localize('mcp.debug', "Debug"),
                                arguments: [server.definition.id, { debug: true }],
                            },
                        });
                    }
                    break;
                case 0 /* McpConnectionState.Kind.Stopped */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
                            title: '$(debug-start) ' + localize('mcp.start', "Start"),
                            arguments: [server.definition.id],
                        },
                    });
                    if (canDebug) {
                        lenses.lenses.push({
                            range,
                            command: {
                                id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
                                title: localize('mcp.debug', "Debug"),
                                arguments: [server.definition.id, { debug: true }],
                            },
                        });
                    }
            }
            if (state !== 3 /* McpConnectionState.Kind.Error */) {
                const toolCount = read(server.tools).length;
                if (toolCount) {
                    lenses.lenses.push({
                        range,
                        command: {
                            id: '',
                            title: localize('server.toolCount', '{0} tools', toolCount),
                        }
                    });
                }
                const promptCount = read(server.prompts).length;
                if (promptCount) {
                    lenses.lenses.push({
                        range,
                        command: {
                            id: "workbench.mcp.startPromptForServer" /* McpCommandIds.StartPromptForServer */,
                            title: localize('server.promptcount', '{0} prompts', promptCount),
                            arguments: [server],
                        }
                    });
                }
                lenses.lenses.push({
                    range,
                    command: {
                        id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
                        title: localize('mcp.server.more', 'More...'),
                        arguments: [server.definition.id],
                    }
                });
            }
        }
        return lenses;
    }
    async _provideInlayHints(model, range) {
        const parsed = await this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const mcpSection = inConfig.section ? findNodeAtLocation(tree, [...inConfig.section]) : tree;
        if (!mcpSection) {
            return undefined;
        }
        const inputsNode = findNodeAtLocation(mcpSection, ['inputs']);
        if (!inputsNode) {
            return undefined;
        }
        const inputs = await this._mcpRegistry.getSavedInputs(inConfig.scope);
        const hints = [];
        const serversNode = findNodeAtLocation(mcpSection, ['servers']);
        if (serversNode) {
            annotateServers(serversNode);
        }
        annotateInputs(inputsNode);
        return { hints, dispose: () => { } };
        function annotateServers(servers) {
            forEachPropertyWithReplacement(servers, node => {
                const expr = ConfigurationResolverExpression.parse(node.value);
                for (const { id } of expr.unresolved()) {
                    const saved = inputs[id];
                    if (saved) {
                        pushAnnotation(id, node.offset + node.value.indexOf(id) + id.length, saved);
                    }
                }
            });
        }
        function annotateInputs(node) {
            if (node.type !== 'array' || !node.children) {
                return;
            }
            for (const input of node.children) {
                if (input.type !== 'object' || !input.children) {
                    continue;
                }
                const idProp = input.children.find(c => c.type === 'property' && c.children?.[0].value === 'id');
                if (!idProp) {
                    continue;
                }
                const id = idProp.children[1];
                if (!id || id.type !== 'string' || !id.value) {
                    continue;
                }
                const savedId = '${input:' + id.value + '}';
                const saved = inputs[savedId];
                if (saved) {
                    pushAnnotation(savedId, id.offset + 1 + id.length, saved);
                }
            }
        }
        function pushAnnotation(savedId, offset, saved) {
            const tooltip = new MarkdownString([
                markdownCommandLink({ id: "workbench.mcp.editStoredInput" /* McpCommandIds.EditStoredInput */, title: localize('edit', 'Edit'), arguments: [savedId, model.uri, mcpConfigurationSection, inConfig.target] }),
                markdownCommandLink({ id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */, title: localize('clear', 'Clear'), arguments: [inConfig.scope, savedId] }),
                markdownCommandLink({ id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */, title: localize('clearAll', 'Clear All'), arguments: [inConfig.scope] }),
            ].join(' | '), { isTrusted: true });
            const hint = {
                label: '= ' + (saved.input?.type === 'promptString' && saved.input.password ? '*'.repeat(10) : (saved.value || '')),
                position: model.getPositionAt(offset),
                tooltip,
                paddingLeft: true,
            };
            hints.push(hint);
            return hint;
        }
    }
};
McpLanguageFeatures = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IMcpRegistry),
    __param(2, IMcpWorkbenchService),
    __param(3, IMcpService),
    __param(4, IMarkerService),
    __param(5, IConfigurationResolverService)
], McpLanguageFeatures);
export { McpLanguageFeatures };
function forEachPropertyWithReplacement(node, callback) {
    if (node.type === 'string' && typeof node.value === 'string' && node.value.includes(ConfigurationResolverExpression.VARIABLE_LHS)) {
        callback(node);
    }
    else if (node.type === 'property') {
        // skip the property name
        node.children?.slice(1).forEach(n => forEachPropertyWithReplacement(n, callback));
    }
    else {
        node.children?.forEach(n => forEachPropertyWithReplacement(n, callback));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTGFuZ3VhZ2VGZWF0dXJlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwTGFuZ3VhZ2VGZWF0dXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQVEsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFNUgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFlLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU3RyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUN4SCxPQUFPLEVBQUUsK0JBQStCLEVBQWtCLE1BQU0sbUZBQW1GLENBQUM7QUFFcEosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEUsT0FBTyxFQUFF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