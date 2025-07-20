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
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { mcpEnabledConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { AUX_WINDOW_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IMcpDevModeDebugging } from './mcpDevMode.js';
import { McpRegistryInputStorage } from './mcpRegistryInputStorage.js';
import { McpServerConnection } from './mcpServerConnection.js';
const createTrustMemento = observableMemento({
    defaultValue: {},
    key: 'mcp.trustedCollections'
});
let McpRegistry = class McpRegistry extends Disposable {
    get delegates() {
        return this._delegates;
    }
    constructor(_instantiationService, _configurationResolverService, _dialogService, _storageService, _productService, _notificationService, _editorService, configurationService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationResolverService = _configurationResolverService;
        this._dialogService = _dialogService;
        this._storageService = _storageService;
        this._productService = _productService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._trustPrompts = new Map();
        this._collections = observableValue('collections', []);
        this._delegates = observableValue('delegates', []);
        this.collections = derived(reader => {
            if (!this._enabled.read(reader)) {
                return [];
            }
            return this._collections.read(reader);
        });
        this._workspaceStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */)));
        this._profileStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)));
        this._trustMemento = new Lazy(() => this._register(createTrustMemento(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */, this._storageService)));
        this._ongoingLazyActivations = observableValue(this, 0);
        this.lazyCollectionState = derived(reader => {
            if (this._enabled.read(reader) === false) {
                return 2 /* LazyCollectionState.AllKnown */;
            }
            if (this._ongoingLazyActivations.read(reader) > 0) {
                return 1 /* LazyCollectionState.LoadingUnknown */;
            }
            const collections = this._collections.read(reader);
            return collections.some(c => c.lazy && c.lazy.isCached === false) ? 0 /* LazyCollectionState.HasUnknown */ : 2 /* LazyCollectionState.AllKnown */;
        });
        this._onDidChangeInputs = this._register(new Emitter());
        this.onDidChangeInputs = this._onDidChangeInputs.event;
        this._enabled = observableConfigValue(mcpEnabledConfig, true, configurationService);
    }
    registerDelegate(delegate) {
        const delegates = this._delegates.get().slice();
        delegates.push(delegate);
        delegates.sort((a, b) => b.priority - a.priority);
        this._delegates.set(delegates, undefined);
        return {
            dispose: () => {
                const delegates = this._delegates.get().filter(d => d !== delegate);
                this._delegates.set(delegates, undefined);
            }
        };
    }
    registerCollection(collection) {
        const currentCollections = this._collections.get();
        const toReplace = currentCollections.find(c => c.lazy && c.id === collection.id);
        // Incoming collections replace the "lazy" versions. See `ExtensionMcpDiscovery` for an example.
        if (toReplace) {
            this._collections.set(currentCollections.map(c => c === toReplace ? collection : c), undefined);
        }
        else {
            this._collections.set([...currentCollections, collection]
                .sort((a, b) => (a.presentation?.order || 0) - (b.presentation?.order || 0)), undefined);
        }
        return {
            dispose: () => {
                const currentCollections = this._collections.get();
                this._collections.set(currentCollections.filter(c => c !== collection), undefined);
            }
        };
    }
    getServerDefinition(collectionRef, definitionRef) {
        const collectionObs = this._collections.map(cols => cols.find(c => c.id === collectionRef.id));
        return collectionObs.map((collection, reader) => {
            const server = collection?.serverDefinitions.read(reader).find(s => s.id === definitionRef.id);
            return { collection, server };
        });
    }
    async discoverCollections() {
        const toDiscover = this._collections.get().filter(c => c.lazy && !c.lazy.isCached);
        this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() + 1, undefined);
        await Promise.all(toDiscover.map(c => c.lazy?.load())).finally(() => {
            this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() - 1, undefined);
        });
        const found = [];
        const current = this._collections.get();
        for (const collection of toDiscover) {
            const rec = current.find(c => c.id === collection.id);
            if (!rec) {
                // ignored
            }
            else if (rec.lazy) {
                rec.lazy.removed?.(); // did not get replaced by the non-lazy version
            }
            else {
                found.push(rec);
            }
        }
        return found;
    }
    _getInputStorage(scope) {
        return scope === 1 /* StorageScope.WORKSPACE */ ? this._workspaceStorage.value : this._profileStorage.value;
    }
    _getInputStorageInConfigTarget(configTarget) {
        return this._getInputStorage(configTarget === 5 /* ConfigurationTarget.WORKSPACE */ || configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
            ? 1 /* StorageScope.WORKSPACE */
            : 0 /* StorageScope.PROFILE */);
    }
    async clearSavedInputs(scope, inputId) {
        const storage = this._getInputStorage(scope);
        if (inputId) {
            await storage.clear(inputId);
        }
        else {
            storage.clearAll();
        }
        this._onDidChangeInputs.fire();
    }
    async editSavedInput(inputId, folderData, configSection, target) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        const stored = await storage.getMap();
        const previous = stored[inputId].value;
        await this._configurationResolverService.resolveWithInteraction(folderData, expr, configSection, previous ? { [inputId.slice(2, -1)]: previous } : {}, target);
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    async setSavedInput(inputId, target, value) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        for (const unresolved of expr.unresolved()) {
            expr.resolve(unresolved, value);
            break;
        }
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    getSavedInputs(scope) {
        return this._getInputStorage(scope).getMap();
    }
    resetTrust() {
        this._trustMemento.value.set({}, undefined);
    }
    getTrust(collectionRef) {
        return derived(reader => {
            const collection = this._collections.read(reader).find(c => c.id === collectionRef.id);
            if (!collection || collection.isTrustedByDefault) {
                return true;
            }
            const memento = this._trustMemento.value.read(reader);
            return memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
        });
    }
    _promptForTrust(collection) {
        // Collect all trust prompts for a single config so that concurrently trying to start N
        // servers in a config don't result in N different dialogs
        let resultPromise = this._trustPrompts.get(collection.id);
        resultPromise ??= this._promptForTrustOpenDialog(collection).finally(() => {
            this._trustPrompts.delete(collection.id);
        });
        this._trustPrompts.set(collection.id, resultPromise);
        return resultPromise;
    }
    async _promptForTrustOpenDialog(collection) {
        const originURI = collection.presentation?.origin;
        const labelWithOrigin = originURI ? `[\`${basename(originURI)}\`](${originURI})` : collection.label;
        const result = await this._dialogService.prompt({
            message: localize('trustTitleWithOrigin', 'Trust MCP servers from {0}?', collection.label),
            custom: {
                icon: Codicon.shield,
                markdownDetails: [{
                        markdown: new MarkdownString(localize('mcp.trust.details', '{0} discovered Model Context Protocol servers from {1} (`{2}`). {0} can use their capabilities in Chat.\n\nDo you want to allow running MCP servers from {3}?', this._productService.nameShort, collection.label, collection.serverDefinitions.get().map(s => s.label).join('`, `'), labelWithOrigin)),
                        actionHandler: () => {
                            const editor = this._editorService.openEditor({ resource: collection.presentation.origin }, AUX_WINDOW_GROUP);
                            return editor.then(Boolean);
                        },
                    }]
            },
            buttons: [
                { label: localize('mcp.trust.yes', 'Trust'), run: () => true },
                { label: localize('mcp.trust.no', 'Do not trust'), run: () => false }
            ],
        });
        return result.result;
    }
    async _updateStorageWithExpressionInputs(inputStorage, expr) {
        const secrets = {};
        const inputs = {};
        for (const [replacement, resolved] of expr.resolved()) {
            if (resolved.input?.type === 'promptString' && resolved.input.password) {
                secrets[replacement.id] = resolved;
            }
            else {
                inputs[replacement.id] = resolved;
            }
        }
        inputStorage.setPlainText(inputs);
        await inputStorage.setSecrets(secrets);
        this._onDidChangeInputs.fire();
    }
    async _replaceVariablesInLaunch(definition, launch) {
        if (!definition.variableReplacement) {
            return launch;
        }
        const { section, target, folder } = definition.variableReplacement;
        const inputStorage = this._getInputStorageInConfigTarget(target);
        const previouslyStored = await inputStorage.getMap();
        // pre-fill the variables we already resolved to avoid extra prompting
        const expr = ConfigurationResolverExpression.parse(launch);
        for (const replacement of expr.unresolved()) {
            if (previouslyStored.hasOwnProperty(replacement.id)) {
                expr.resolve(replacement, previouslyStored[replacement.id]);
            }
        }
        // resolve variables requiring user input
        await this._configurationResolverService.resolveWithInteraction(folder, expr, section, undefined, target);
        await this._updateStorageWithExpressionInputs(inputStorage, expr);
        // resolve other non-interactive variables, returning the final object
        return await this._configurationResolverService.resolveAsync(folder, expr);
    }
    async resolveConnection({ collectionRef, definitionRef, forceTrust, logger, debug }) {
        let collection = this._collections.get().find(c => c.id === collectionRef.id);
        if (collection?.lazy) {
            await collection.lazy.load();
            collection = this._collections.get().find(c => c.id === collectionRef.id);
        }
        const definition = collection?.serverDefinitions.get().find(s => s.id === definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found for ${collectionRef.id} and ${definitionRef.id}`);
        }
        const delegate = this._delegates.get().find(d => d.canStart(collection, definition));
        if (!delegate) {
            throw new Error('No delegate found that can handle the connection');
        }
        if (!collection.isTrustedByDefault) {
            const memento = this._trustMemento.value.get();
            const trusted = memento.hasOwnProperty(collection.id) ? memento[collection.id] : undefined;
            if (trusted) {
                // continue
            }
            else if (trusted === undefined || forceTrust) {
                const trustValue = await this._promptForTrust(collection);
                if (trustValue !== undefined) {
                    this._trustMemento.value.set({ ...memento, [collection.id]: trustValue }, undefined);
                }
                if (!trustValue) {
                    return;
                }
            }
            else /** trusted === false && !forceTrust */ {
                return undefined;
            }
        }
        let launch = definition.launch;
        if (collection.resolveServerLanch) {
            launch = await collection.resolveServerLanch(definition);
            if (!launch) {
                return undefined; // interaction cancelled by user
            }
        }
        try {
            launch = await this._replaceVariablesInLaunch(definition, launch);
            if (definition.devMode && debug) {
                launch = await this._instantiationService.invokeFunction(accessor => accessor.get(IMcpDevModeDebugging).transform(definition, launch));
            }
        }
        catch (e) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('mcp.launchError', 'Error starting {0}: {1}', definition.label, String(e)),
                actions: {
                    primary: collection.presentation?.origin && [
                        {
                            id: 'mcp.launchError.openConfig',
                            class: undefined,
                            enabled: true,
                            tooltip: '',
                            label: localize('mcp.launchError.openConfig', 'Open Configuration'),
                            run: () => this._editorService.openEditor({
                                resource: collection.presentation.origin,
                                options: { selection: definition.presentation?.origin?.range }
                            }),
                        }
                    ]
                }
            });
            return;
        }
        return this._instantiationService.createInstance(McpServerConnection, collection, definition, delegate, launch, logger);
    }
};
McpRegistry = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationResolverService),
    __param(2, IDialogService),
    __param(3, IStorageService),
    __param(4, IProductService),
    __param(5, INotificationService),
    __param(6, IEditorService),
    __param(7, IConfigurationService)
], McpRegistry);
export { McpRegistry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7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