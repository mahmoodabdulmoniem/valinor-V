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
var AbstractExtHostExtensionService_1;
/* eslint-disable local/code-no-native-private */
import * as nls from '../../../nls.js';
import * as path from '../../../base/common/path.js';
import * as performance from '../../../base/common/performance.js';
import { originalFSPath, joinPath, extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { asPromise, Barrier, IntervalTimer, timeout } from '../../../base/common/async.js';
import { dispose, toDisposable, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { TernarySearchTree } from '../../../base/common/ternarySearchTree.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ActivatedExtension, EmptyExtension, ExtensionActivationTimes, ExtensionActivationTimesBuilder, ExtensionsActivator, HostExtension } from './extHostExtensionActivator.js';
import { ExtHostStorage, IExtHostStorage } from './extHostStorage.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionDescriptionRegistry } from '../../services/extensions/common/extensionDescriptionRegistry.js';
import * as errors from '../../../base/common/errors.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ExtensionGlobalMemento, ExtensionMemento } from './extHostMemento.js';
import { RemoteAuthorityResolverError, ExtensionKind, ExtensionMode, ManagedResolvedAuthority as ExtHostManagedResolvedAuthority } from './extHostTypes.js';
import { RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix, ManagedRemoteConnection, WebSocketRemoteConnection } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { IInstantiationService, createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { checkActivateWorkspaceContainsExtension } from '../../services/extensions/common/workspaceContains.js';
import { ExtHostSecretState, IExtHostSecretState } from './extHostSecretState.js';
import { ExtensionSecrets } from './extHostSecrets.js';
import { Schemas } from '../../../base/common/network.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { isCI, setTimeout0 } from '../../../base/common/platform.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
export const IHostUtils = createDecorator('IHostUtils');
let AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = class AbstractExtHostExtensionService extends Disposable {
    constructor(instaService, hostUtils, extHostContext, extHostWorkspace, extHostConfiguration, logService, initData, storagePath, extHostTunnelService, extHostTerminalService, extHostLocalizationService, _extHostManagedSockets, _extHostLanguageModels) {
        super();
        this._extHostManagedSockets = _extHostManagedSockets;
        this._extHostLanguageModels = _extHostLanguageModels;
        this._onDidChangeRemoteConnectionData = this._register(new Emitter());
        this.onDidChangeRemoteConnectionData = this._onDidChangeRemoteConnectionData.event;
        this._realPathCache = new Map();
        this._isTerminating = false;
        this._hostUtils = hostUtils;
        this._extHostContext = extHostContext;
        this._initData = initData;
        this._extHostWorkspace = extHostWorkspace;
        this._extHostConfiguration = extHostConfiguration;
        this._logService = logService;
        this._extHostTunnelService = extHostTunnelService;
        this._extHostTerminalService = extHostTerminalService;
        this._extHostLocalizationService = extHostLocalizationService;
        this._mainThreadWorkspaceProxy = this._extHostContext.getProxy(MainContext.MainThreadWorkspace);
        this._mainThreadTelemetryProxy = this._extHostContext.getProxy(MainContext.MainThreadTelemetry);
        this._mainThreadExtensionsProxy = this._extHostContext.getProxy(MainContext.MainThreadExtensionService);
        this._almostReadyToRunExtensions = new Barrier();
        this._readyToStartExtensionHost = new Barrier();
        this._readyToRunExtensions = new Barrier();
        this._eagerExtensionsActivated = new Barrier();
        this._activationEventsReader = new SyncedActivationEventsReader(this._initData.extensions.activationEvents);
        this._globalRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, this._initData.extensions.allExtensions);
        const myExtensionsSet = new ExtensionIdentifierSet(this._initData.extensions.myExtensions);
        this._myRegistry = new ExtensionDescriptionRegistry(this._activationEventsReader, filterExtensions(this._globalRegistry, myExtensionsSet));
        if (isCI) {
            this._logService.info(`Creating extension host with the following global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`Creating extension host with the following local extensions: ${printExtIds(this._myRegistry)}`);
        }
        this._storage = new ExtHostStorage(this._extHostContext, this._logService);
        this._secretState = new ExtHostSecretState(this._extHostContext);
        this._storagePath = storagePath;
        this._instaService = this._store.add(instaService.createChild(new ServiceCollection([IExtHostStorage, this._storage], [IExtHostSecretState, this._secretState])));
        this._activator = this._register(new ExtensionsActivator(this._myRegistry, this._globalRegistry, {
            onExtensionActivationError: (extensionId, error, missingExtensionDependency) => {
                this._mainThreadExtensionsProxy.$onExtensionActivationError(extensionId, errors.transformErrorForSerialization(error), missingExtensionDependency);
            },
            actualActivateExtension: async (extensionId, reason) => {
                if (ExtensionDescriptionRegistry.isHostExtension(extensionId, this._myRegistry, this._globalRegistry)) {
                    await this._mainThreadExtensionsProxy.$activateExtension(extensionId, reason);
                    return new HostExtension();
                }
                const extensionDescription = this._myRegistry.getExtensionDescription(extensionId);
                return this._activateExtension(extensionDescription, reason);
            }
        }, this._logService));
        this._extensionPathIndex = null;
        this._resolvers = Object.create(null);
        this._started = false;
        this._remoteConnectionData = this._initData.remote.connectionData;
    }
    getRemoteConnectionData() {
        return this._remoteConnectionData;
    }
    async initialize() {
        try {
            await this._beforeAlmostReadyToRunExtensions();
            this._almostReadyToRunExtensions.open();
            await this._extHostWorkspace.waitForInitializeCall();
            performance.mark('code/extHost/ready');
            this._readyToStartExtensionHost.open();
            if (this._initData.autoStart) {
                this._startExtensionHost();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
        }
    }
    async _deactivateAll() {
        this._storagePath.onWillDeactivateAll();
        let allPromises = [];
        try {
            const allExtensions = this._myRegistry.getAllExtensionDescriptions();
            const allExtensionsIds = allExtensions.map(ext => ext.identifier);
            const activatedExtensions = allExtensionsIds.filter(id => this.isActivated(id));
            allPromises = activatedExtensions.map((extensionId) => {
                return this._deactivate(extensionId);
            });
        }
        catch (err) {
            // TODO: write to log once we have one
        }
        await Promise.all(allPromises);
    }
    terminate(reason, code = 0) {
        if (this._isTerminating) {
            // we are already shutting down...
            return;
        }
        this._isTerminating = true;
        this._logService.info(`Extension host terminating: ${reason}`);
        this._logService.flush();
        this._extHostTerminalService.dispose();
        this._activator.dispose();
        errors.setUnexpectedErrorHandler((err) => {
            this._logService.error(err);
        });
        // Invalidate all proxies
        this._extHostContext.dispose();
        const extensionsDeactivated = this._deactivateAll();
        // Give extensions at most 5 seconds to wrap up any async deactivate, then exit
        Promise.race([timeout(5000), extensionsDeactivated]).finally(() => {
            if (this._hostUtils.pid) {
                this._logService.info(`Extension host with pid ${this._hostUtils.pid} exiting with code ${code}`);
            }
            else {
                this._logService.info(`Extension host exiting with code ${code}`);
            }
            this._logService.flush();
            this._logService.dispose();
            this._hostUtils.exit(code);
        });
    }
    isActivated(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.isActivated(extensionId);
        }
        return false;
    }
    async getExtension(extensionId) {
        const ext = await this._mainThreadExtensionsProxy.$getExtension(extensionId);
        return ext && {
            ...ext,
            identifier: new ExtensionIdentifier(ext.identifier.value),
            extensionLocation: URI.revive(ext.extensionLocation)
        };
    }
    _activateByEvent(activationEvent, startup) {
        return this._activator.activateByEvent(activationEvent, startup);
    }
    _activateById(extensionId, reason) {
        return this._activator.activateById(extensionId, reason);
    }
    activateByIdWithErrors(extensionId, reason) {
        return this._activateById(extensionId, reason).then(() => {
            const extension = this._activator.getActivatedExtension(extensionId);
            if (extension.activationFailed) {
                // activation failed => bubble up the error as the promise result
                return Promise.reject(extension.activationFailedError);
            }
            return undefined;
        });
    }
    getExtensionRegistry() {
        return this._readyToRunExtensions.wait().then(_ => this._myRegistry);
    }
    getExtensionExports(extensionId) {
        if (this._readyToRunExtensions.isOpen()) {
            return this._activator.getActivatedExtension(extensionId).exports;
        }
        else {
            try {
                return this._activator.getActivatedExtension(extensionId).exports;
            }
            catch (err) {
                return null;
            }
        }
    }
    /**
     * Applies realpath to file-uris and returns all others uris unmodified.
     * The real path is cached for the lifetime of the extension host.
     */
    async _realPathExtensionUri(uri) {
        if (uri.scheme === Schemas.file && this._hostUtils.fsRealpath) {
            const fsPath = uri.fsPath;
            if (!this._realPathCache.has(fsPath)) {
                this._realPathCache.set(fsPath, this._hostUtils.fsRealpath(fsPath));
            }
            const realpathValue = await this._realPathCache.get(fsPath);
            return URI.file(realpathValue);
        }
        return uri;
    }
    // create trie to enable fast 'filename -> extension id' look up
    async getExtensionPathIndex() {
        if (!this._extensionPathIndex) {
            this._extensionPathIndex = this._createExtensionPathIndex(this._myRegistry.getAllExtensionDescriptions()).then((searchTree) => {
                return new ExtensionPaths(searchTree);
            });
        }
        return this._extensionPathIndex;
    }
    /**
     * create trie to enable fast 'filename -> extension id' look up
     */
    async _createExtensionPathIndex(extensions) {
        const tst = TernarySearchTree.forUris(key => {
            // using the default/biased extUri-util because the IExtHostFileSystemInfo-service
            // isn't ready to be used yet, e.g the knowledge about `file` protocol and others
            // comes in while this code runs
            return extUriBiasedIgnorePathCase.ignorePathCasing(key);
        });
        // const tst = TernarySearchTree.forUris<IExtensionDescription>(key => true);
        await Promise.all(extensions.map(async (ext) => {
            if (this._getEntryPoint(ext)) {
                const uri = await this._realPathExtensionUri(ext.extensionLocation);
                tst.set(uri, ext);
            }
        }));
        return tst;
    }
    _deactivate(extensionId) {
        let result = Promise.resolve(undefined);
        if (!this._readyToRunExtensions.isOpen()) {
            return result;
        }
        if (!this._activator.isActivated(extensionId)) {
            return result;
        }
        const extension = this._activator.getActivatedExtension(extensionId);
        if (!extension) {
            return result;
        }
        // call deactivate if available
        try {
            if (typeof extension.module.deactivate === 'function') {
                result = Promise.resolve(extension.module.deactivate()).then(undefined, (err) => {
                    this._logService.error(err);
                    return Promise.resolve(undefined);
                });
            }
        }
        catch (err) {
            this._logService.error(`An error occurred when deactivating the extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        // clean up subscriptions
        try {
            extension.disposable.dispose();
        }
        catch (err) {
            this._logService.error(`An error occurred when disposing the subscriptions for extension '${extensionId.value}':`);
            this._logService.error(err);
        }
        return result;
    }
    // --- impl
    async _activateExtension(extensionDescription, reason) {
        if (!this._initData.remote.isRemote) {
            // local extension host process
            await this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        else {
            // remote extension host process
            // do not wait for renderer confirmation
            this._mainThreadExtensionsProxy.$onWillActivateExtension(extensionDescription.identifier);
        }
        return this._doActivateExtension(extensionDescription, reason).then((activatedExtension) => {
            const activationTimes = activatedExtension.activationTimes;
            this._mainThreadExtensionsProxy.$onDidActivateExtension(extensionDescription.identifier, activationTimes.codeLoadingTime, activationTimes.activateCallTime, activationTimes.activateResolvedTime, reason);
            this._logExtensionActivationTimes(extensionDescription, reason, 'success', activationTimes);
            return activatedExtension;
        }, (err) => {
            this._logExtensionActivationTimes(extensionDescription, reason, 'failure');
            throw err;
        });
    }
    _logExtensionActivationTimes(extensionDescription, reason, outcome, activationTimes) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('extensionActivationTimes', {
            ...event,
            ...(activationTimes || {}),
            outcome
        });
    }
    _doActivateExtension(extensionDescription, reason) {
        const event = getTelemetryActivationEvent(extensionDescription, reason);
        this._mainThreadTelemetryProxy.$publicLog2('activatePlugin', event);
        const entryPoint = this._getEntryPoint(extensionDescription);
        if (!entryPoint) {
            // Treat the extension as being empty => NOT AN ERROR CASE
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        this._logService.info(`ExtensionService#_doActivateExtension ${extensionDescription.identifier.value}, startup: ${reason.startup}, activationEvent: '${reason.activationEvent}'${extensionDescription.identifier.value !== reason.extensionId.value ? `, root cause: ${reason.extensionId.value}` : ``}`);
        this._logService.flush();
        const isESM = this._isESM(extensionDescription);
        const extensionInternalStore = new DisposableStore(); // disposables that follow the extension lifecycle
        const activationTimesBuilder = new ExtensionActivationTimesBuilder(reason.startup);
        return Promise.all([
            isESM
                ? this._loadESMModule(extensionDescription, joinPath(extensionDescription.extensionLocation, entryPoint), activationTimesBuilder)
                : this._loadCommonJSModule(extensionDescription, joinPath(extensionDescription.extensionLocation, entryPoint), activationTimesBuilder),
            this._loadExtensionContext(extensionDescription, extensionInternalStore)
        ]).then(values => {
            performance.mark(`code/extHost/willActivateExtension/${extensionDescription.identifier.value}`);
            return AbstractExtHostExtensionService_1._callActivate(this._logService, extensionDescription.identifier, values[0], values[1], extensionInternalStore, activationTimesBuilder);
        }).then((activatedExtension) => {
            performance.mark(`code/extHost/didActivateExtension/${extensionDescription.identifier.value}`);
            return activatedExtension;
        });
    }
    _loadExtensionContext(extensionDescription, extensionInternalStore) {
        const languageModelAccessInformation = this._extHostLanguageModels.createLanguageModelAccessInformation(extensionDescription);
        const globalState = extensionInternalStore.add(new ExtensionGlobalMemento(extensionDescription, this._storage));
        const workspaceState = extensionInternalStore.add(new ExtensionMemento(extensionDescription.identifier.value, false, this._storage));
        const secrets = extensionInternalStore.add(new ExtensionSecrets(extensionDescription, this._secretState));
        const extensionMode = extensionDescription.isUnderDevelopment
            ? (this._initData.environment.extensionTestsLocationURI ? ExtensionMode.Test : ExtensionMode.Development)
            : ExtensionMode.Production;
        const extensionKind = this._initData.remote.isRemote ? ExtensionKind.Workspace : ExtensionKind.UI;
        this._logService.trace(`ExtensionService#loadExtensionContext ${extensionDescription.identifier.value}`);
        return Promise.all([
            globalState.whenReady,
            workspaceState.whenReady,
            this._storagePath.whenReady
        ]).then(() => {
            const that = this;
            let extension;
            let messagePassingProtocol;
            const messagePort = isProposedApiEnabled(extensionDescription, 'ipc')
                ? this._initData.messagePorts?.get(ExtensionIdentifier.toKey(extensionDescription.identifier))
                : undefined;
            return Object.freeze({
                globalState,
                workspaceState,
                secrets,
                subscriptions: [],
                get languageModelAccessInformation() { return languageModelAccessInformation; },
                get extensionUri() { return extensionDescription.extensionLocation; },
                get extensionPath() { return extensionDescription.extensionLocation.fsPath; },
                asAbsolutePath(relativePath) { return path.join(extensionDescription.extensionLocation.fsPath, relativePath); },
                get storagePath() { return that._storagePath.workspaceValue(extensionDescription)?.fsPath; },
                get globalStoragePath() { return that._storagePath.globalValue(extensionDescription).fsPath; },
                get logPath() { return path.join(that._initData.logsLocation.fsPath, extensionDescription.identifier.value); },
                get logUri() { return URI.joinPath(that._initData.logsLocation, extensionDescription.identifier.value); },
                get storageUri() { return that._storagePath.workspaceValue(extensionDescription); },
                get globalStorageUri() { return that._storagePath.globalValue(extensionDescription); },
                get extensionMode() { return extensionMode; },
                get extension() {
                    if (extension === undefined) {
                        extension = new Extension(that, extensionDescription.identifier, extensionDescription, extensionKind, false);
                    }
                    return extension;
                },
                get extensionRuntime() {
                    checkProposedApiEnabled(extensionDescription, 'extensionRuntime');
                    return that.extensionRuntime;
                },
                get environmentVariableCollection() { return that._extHostTerminalService.getEnvironmentVariableCollection(extensionDescription); },
                get messagePassingProtocol() {
                    if (!messagePassingProtocol) {
                        if (!messagePort) {
                            return undefined;
                        }
                        const onDidReceiveMessage = Event.buffer(Event.fromDOMEventEmitter(messagePort, 'message', e => e.data));
                        messagePort.start();
                        messagePassingProtocol = {
                            onDidReceiveMessage,
                            postMessage: messagePort.postMessage.bind(messagePort)
                        };
                    }
                    return messagePassingProtocol;
                }
            });
        });
    }
    static _callActivate(logService, extensionId, extensionModule, context, extensionInternalStore, activationTimesBuilder) {
        // Make sure the extension's surface is not undefined
        extensionModule = extensionModule || {
            activate: undefined,
            deactivate: undefined
        };
        return this._callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder).then((extensionExports) => {
            return new ActivatedExtension(false, null, activationTimesBuilder.build(), extensionModule, extensionExports, toDisposable(() => {
                extensionInternalStore.dispose();
                dispose(context.subscriptions);
            }));
        });
    }
    static _callActivateOptional(logService, extensionId, extensionModule, context, activationTimesBuilder) {
        if (typeof extensionModule.activate === 'function') {
            try {
                activationTimesBuilder.activateCallStart();
                logService.trace(`ExtensionService#_callActivateOptional ${extensionId.value}`);
                const activateResult = extensionModule.activate.apply(globalThis, [context]);
                activationTimesBuilder.activateCallStop();
                activationTimesBuilder.activateResolveStart();
                return Promise.resolve(activateResult).then((value) => {
                    activationTimesBuilder.activateResolveStop();
                    return value;
                });
            }
            catch (err) {
                return Promise.reject(err);
            }
        }
        else {
            // No activate found => the module is the extension's exports
            return Promise.resolve(extensionModule);
        }
    }
    // -- eager activation
    _activateOneStartupFinished(desc, activationEvent) {
        this._activateById(desc.identifier, {
            startup: false,
            extensionId: desc.identifier,
            activationEvent: activationEvent
        }).then(undefined, (err) => {
            this._logService.error(err);
        });
    }
    _activateAllStartupFinishedDeferred(extensions, start = 0) {
        const timeBudget = 50; // 50 milliseconds
        const startTime = Date.now();
        setTimeout0(() => {
            for (let i = start; i < extensions.length; i += 1) {
                const desc = extensions[i];
                for (const activationEvent of (desc.activationEvents ?? [])) {
                    if (activationEvent === 'onStartupFinished') {
                        if (Date.now() - startTime > timeBudget) {
                            // time budget for current task has been exceeded
                            // set a new task to activate current and remaining extensions
                            this._activateAllStartupFinishedDeferred(extensions, i);
                            break;
                        }
                        else {
                            this._activateOneStartupFinished(desc, activationEvent);
                        }
                    }
                }
            }
        });
    }
    _activateAllStartupFinished() {
        // startup is considered finished
        this._mainThreadExtensionsProxy.$setPerformanceMarks(performance.getMarks());
        this._extHostConfiguration.getConfigProvider().then((configProvider) => {
            const shouldDeferActivation = configProvider.getConfiguration('extensions.experimental').get('deferredStartupFinishedActivation');
            const allExtensionDescriptions = this._myRegistry.getAllExtensionDescriptions();
            if (shouldDeferActivation) {
                this._activateAllStartupFinishedDeferred(allExtensionDescriptions);
            }
            else {
                for (const desc of allExtensionDescriptions) {
                    if (desc.activationEvents) {
                        for (const activationEvent of desc.activationEvents) {
                            if (activationEvent === 'onStartupFinished') {
                                this._activateOneStartupFinished(desc, activationEvent);
                            }
                        }
                    }
                }
            }
        });
    }
    // Handle "eager" activation extensions
    _handleEagerExtensions() {
        const starActivation = this._activateByEvent('*', true).then(undefined, (err) => {
            this._logService.error(err);
        });
        this._register(this._extHostWorkspace.onDidChangeWorkspace((e) => this._handleWorkspaceContainsEagerExtensions(e.added)));
        const folders = this._extHostWorkspace.workspace ? this._extHostWorkspace.workspace.folders : [];
        const workspaceContainsActivation = this._handleWorkspaceContainsEagerExtensions(folders);
        const remoteResolverActivation = this._handleRemoteResolverEagerExtensions();
        const eagerExtensionsActivation = Promise.all([remoteResolverActivation, starActivation, workspaceContainsActivation]).then(() => { });
        Promise.race([eagerExtensionsActivation, timeout(10000)]).then(() => {
            this._activateAllStartupFinished();
        });
        return eagerExtensionsActivation;
    }
    _handleWorkspaceContainsEagerExtensions(folders) {
        if (folders.length === 0) {
            return Promise.resolve(undefined);
        }
        return Promise.all(this._myRegistry.getAllExtensionDescriptions().map((desc) => {
            return this._handleWorkspaceContainsEagerExtension(folders, desc);
        })).then(() => { });
    }
    async _handleWorkspaceContainsEagerExtension(folders, desc) {
        if (this.isActivated(desc.identifier)) {
            return;
        }
        const localWithRemote = !this._initData.remote.isRemote && !!this._initData.remote.authority;
        const host = {
            logService: this._logService,
            folders: folders.map(folder => folder.uri),
            forceUsingSearch: localWithRemote || !this._hostUtils.fsExists,
            exists: (uri) => this._hostUtils.fsExists(uri.fsPath),
            checkExists: (folders, includes, token) => this._mainThreadWorkspaceProxy.$checkExists(folders, includes, token)
        };
        const result = await checkActivateWorkspaceContainsExtension(host, desc);
        if (!result) {
            return;
        }
        return (this._activateById(desc.identifier, { startup: true, extensionId: desc.identifier, activationEvent: result.activationEvent })
            .then(undefined, err => this._logService.error(err)));
    }
    async _handleRemoteResolverEagerExtensions() {
        if (this._initData.remote.authority) {
            return this._activateByEvent(`onResolveRemoteAuthority:${this._initData.remote.authority}`, false);
        }
    }
    async $extensionTestsExecute() {
        await this._eagerExtensionsActivated.wait();
        try {
            return await this._doHandleExtensionTests();
        }
        catch (error) {
            console.error(error); // ensure any error message makes it onto the console
            throw error;
        }
    }
    async _doHandleExtensionTests() {
        const { extensionDevelopmentLocationURI, extensionTestsLocationURI } = this._initData.environment;
        if (!extensionDevelopmentLocationURI || !extensionTestsLocationURI) {
            throw new Error(nls.localize('extensionTestError1', "Cannot load test runner."));
        }
        const extensionDescription = (await this.getExtensionPathIndex()).findSubstr(extensionTestsLocationURI);
        const isESM = this._isESM(extensionDescription, extensionTestsLocationURI.path);
        // Require the test runner via node require from the provided path
        const testRunner = await (isESM
            ? this._loadESMModule(null, extensionTestsLocationURI, new ExtensionActivationTimesBuilder(false))
            : this._loadCommonJSModule(null, extensionTestsLocationURI, new ExtensionActivationTimesBuilder(false)));
        if (!testRunner || typeof testRunner.run !== 'function') {
            throw new Error(nls.localize('extensionTestError', "Path {0} does not point to a valid extension test runner.", extensionTestsLocationURI.toString()));
        }
        // Execute the runner if it follows the old `run` spec
        return new Promise((resolve, reject) => {
            const oldTestRunnerCallback = (error, failures) => {
                if (error) {
                    if (isCI) {
                        this._logService.error(`Test runner called back with error`, error);
                    }
                    reject(error);
                }
                else {
                    if (isCI) {
                        if (failures) {
                            this._logService.info(`Test runner called back with ${failures} failures.`);
                        }
                        else {
                            this._logService.info(`Test runner called back with successful outcome.`);
                        }
                    }
                    resolve((typeof failures === 'number' && failures > 0) ? 1 /* ERROR */ : 0 /* OK */);
                }
            };
            const extensionTestsPath = originalFSPath(extensionTestsLocationURI); // for the old test runner API
            const runResult = testRunner.run(extensionTestsPath, oldTestRunnerCallback);
            // Using the new API `run(): Promise<void>`
            if (runResult && runResult.then) {
                runResult
                    .then(() => {
                    if (isCI) {
                        this._logService.info(`Test runner finished successfully.`);
                    }
                    resolve(0);
                })
                    .catch((err) => {
                    if (isCI) {
                        this._logService.error(`Test runner finished with error`, err);
                    }
                    reject(err instanceof Error && err.stack ? err.stack : String(err));
                });
            }
        });
    }
    _startExtensionHost() {
        if (this._started) {
            throw new Error(`Extension host is already started!`);
        }
        this._started = true;
        return this._readyToStartExtensionHost.wait()
            .then(() => this._readyToRunExtensions.open())
            .then(() => {
            // wait for all activation events that came in during workbench startup, but at maximum 1s
            return Promise.race([this._activator.waitForActivatingExtensions(), timeout(1000)]);
        })
            .then(() => this._handleEagerExtensions())
            .then(() => {
            this._eagerExtensionsActivated.open();
            this._logService.info(`Eager extensions activated`);
        });
    }
    // -- called by extensions
    registerRemoteAuthorityResolver(authorityPrefix, resolver) {
        this._resolvers[authorityPrefix] = resolver;
        return toDisposable(() => {
            delete this._resolvers[authorityPrefix];
        });
    }
    async getRemoteExecServer(remoteAuthority) {
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        return resolver?.resolveExecServer?.(remoteAuthority, { resolveAttempt: 0 });
    }
    // -- called by main thread
    async _activateAndGetResolver(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            throw new RemoteAuthorityResolverError(`Not an authority that can be resolved!`, RemoteAuthorityResolverErrorCode.InvalidAuthority);
        }
        const authorityPrefix = remoteAuthority.substr(0, authorityPlusIndex);
        await this._almostReadyToRunExtensions.wait();
        await this._activateByEvent(`onResolveRemoteAuthority:${authorityPrefix}`, false);
        return { authorityPrefix, resolver: this._resolvers[authorityPrefix] };
    }
    async $resolveAuthority(remoteAuthorityChain, resolveAttempt) {
        const sw = StopWatch.create(false);
        const prefix = () => `[resolveAuthority(${getRemoteAuthorityPrefix(remoteAuthorityChain)},${resolveAttempt})][${sw.elapsed()}ms] `;
        const logInfo = (msg) => this._logService.info(`${prefix()}${msg}`);
        const logWarning = (msg) => this._logService.warn(`${prefix()}${msg}`);
        const logError = (msg, err = undefined) => this._logService.error(`${prefix()}${msg}`, err);
        const normalizeError = (err) => {
            if (err instanceof RemoteAuthorityResolverError) {
                return {
                    type: 'error',
                    error: {
                        code: err._code,
                        message: err._message,
                        detail: err._detail
                    }
                };
            }
            throw err;
        };
        const getResolver = async (remoteAuthority) => {
            logInfo(`activating resolver for ${remoteAuthority}...`);
            const { resolver, authorityPrefix } = await this._activateAndGetResolver(remoteAuthority);
            if (!resolver) {
                logError(`no resolver for ${authorityPrefix}`);
                throw new RemoteAuthorityResolverError(`No remote extension installed to resolve ${authorityPrefix}.`, RemoteAuthorityResolverErrorCode.NoResolverFound);
            }
            return { resolver, authorityPrefix, remoteAuthority };
        };
        const chain = remoteAuthorityChain.split(/@|%40/g).reverse();
        logInfo(`activating remote resolvers ${chain.join(' -> ')}`);
        let resolvers;
        try {
            resolvers = await Promise.all(chain.map(getResolver)).catch(async (e) => {
                if (!(e instanceof RemoteAuthorityResolverError) || e._code !== RemoteAuthorityResolverErrorCode.InvalidAuthority) {
                    throw e;
                }
                logWarning(`resolving nested authorities failed: ${e.message}`);
                return [await getResolver(remoteAuthorityChain)];
            });
        }
        catch (e) {
            return normalizeError(e);
        }
        const intervalLogger = new IntervalTimer();
        intervalLogger.cancelAndSet(() => logInfo('waiting...'), 1000);
        let result;
        let execServer;
        for (const [i, { authorityPrefix, resolver, remoteAuthority }] of resolvers.entries()) {
            try {
                if (i === resolvers.length - 1) {
                    logInfo(`invoking final resolve()...`);
                    performance.mark(`code/extHost/willResolveAuthority/${authorityPrefix}`);
                    result = await resolver.resolve(remoteAuthority, { resolveAttempt, execServer });
                    performance.mark(`code/extHost/didResolveAuthorityOK/${authorityPrefix}`);
                    logInfo(`setting tunnel factory...`);
                    this._register(await this._extHostTunnelService.setTunnelFactory(resolver, ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result) ? result : undefined));
                }
                else {
                    logInfo(`invoking resolveExecServer() for ${remoteAuthority}`);
                    performance.mark(`code/extHost/willResolveExecServer/${authorityPrefix}`);
                    execServer = await resolver.resolveExecServer?.(remoteAuthority, { resolveAttempt, execServer });
                    if (!execServer) {
                        throw new RemoteAuthorityResolverError(`Exec server was not available for ${remoteAuthority}`, RemoteAuthorityResolverErrorCode.NoResolverFound); // we did, in fact, break the chain :(
                    }
                    performance.mark(`code/extHost/didResolveExecServerOK/${authorityPrefix}`);
                }
            }
            catch (e) {
                performance.mark(`code/extHost/didResolveAuthorityError/${authorityPrefix}`);
                logError(`returned an error`, e);
                intervalLogger.dispose();
                return normalizeError(e);
            }
        }
        intervalLogger.dispose();
        const tunnelInformation = {
            environmentTunnels: result.environmentTunnels,
            features: result.tunnelFeatures ? {
                elevation: result.tunnelFeatures.elevation,
                privacyOptions: result.tunnelFeatures.privacyOptions,
                protocol: result.tunnelFeatures.protocol === undefined ? true : result.tunnelFeatures.protocol,
            } : undefined
        };
        // Split merged API result into separate authority/options
        const options = {
            extensionHostEnv: result.extensionHostEnv,
            isTrusted: result.isTrusted,
            authenticationSession: result.authenticationSessionForInitializingExtensions ? { id: result.authenticationSessionForInitializingExtensions.id, providerId: result.authenticationSessionForInitializingExtensions.providerId } : undefined
        };
        // extension are not required to return an instance of ResolvedAuthority or ManagedResolvedAuthority, so don't use `instanceof`
        logInfo(`returned ${ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result) ? 'managed authority' : `${result.host}:${result.port}`}`);
        let authority;
        if (ExtHostManagedResolvedAuthority.isManagedResolvedAuthority(result)) {
            // The socket factory is identified by the `resolveAttempt`, since that is a number which
            // always increments and is unique over all resolve() calls in a workbench session.
            const socketFactoryId = resolveAttempt;
            // There is only on managed socket factory at a time, so we can just overwrite the old one.
            this._extHostManagedSockets.setFactory(socketFactoryId, result.makeConnection);
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new ManagedRemoteConnection(socketFactoryId),
                connectionToken: result.connectionToken
            };
        }
        else {
            authority = {
                authority: remoteAuthorityChain,
                connectTo: new WebSocketRemoteConnection(result.host, result.port),
                connectionToken: result.connectionToken
            };
        }
        return {
            type: 'ok',
            value: {
                authority: authority,
                options,
                tunnelInformation,
            }
        };
    }
    async $getCanonicalURI(remoteAuthority, uriComponents) {
        this._logService.info(`$getCanonicalURI invoked for authority (${getRemoteAuthorityPrefix(remoteAuthority)})`);
        const { resolver } = await this._activateAndGetResolver(remoteAuthority);
        if (!resolver) {
            // Return `null` if no resolver for `remoteAuthority` is found.
            return null;
        }
        const uri = URI.revive(uriComponents);
        if (typeof resolver.getCanonicalURI === 'undefined') {
            // resolver cannot compute canonical URI
            return uri;
        }
        const result = await asPromise(() => resolver.getCanonicalURI(uri));
        if (!result) {
            return uri;
        }
        return result;
    }
    async $startExtensionHost(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => extension.extensionLocation = URI.revive(extension.extensionLocation));
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$startExtensionHost: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$startExtensionHost: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return this._startExtensionHost();
    }
    $activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */) {
            return this._almostReadyToRunExtensions.wait()
                .then(_ => this._activateByEvent(activationEvent, false));
        }
        return (this._readyToRunExtensions.wait()
            .then(_ => this._activateByEvent(activationEvent, false)));
    }
    async $activate(extensionId, reason) {
        await this._readyToRunExtensions.wait();
        if (!this._myRegistry.getExtensionDescription(extensionId)) {
            // unknown extension => ignore
            return false;
        }
        await this._activateById(extensionId, reason);
        return true;
    }
    async $deltaExtensions(extensionsDelta) {
        extensionsDelta.toAdd.forEach((extension) => extension.extensionLocation = URI.revive(extension.extensionLocation));
        // First build up and update the trie and only afterwards apply the delta
        const { globalRegistry, myExtensions } = applyExtensionsDelta(this._activationEventsReader, this._globalRegistry, this._myRegistry, extensionsDelta);
        const newSearchTree = await this._createExtensionPathIndex(myExtensions);
        const extensionsPaths = await this.getExtensionPathIndex();
        extensionsPaths.setSearchTree(newSearchTree);
        this._globalRegistry.set(globalRegistry.getAllExtensionDescriptions());
        this._myRegistry.set(myExtensions);
        if (isCI) {
            this._logService.info(`$deltaExtensions: global extensions: ${printExtIds(this._globalRegistry)}`);
            this._logService.info(`$deltaExtensions: local extensions: ${printExtIds(this._myRegistry)}`);
        }
        return Promise.resolve(undefined);
    }
    async $test_latency(n) {
        return n;
    }
    async $test_up(b) {
        return b.byteLength;
    }
    async $test_down(size) {
        const buff = VSBuffer.alloc(size);
        const value = Math.random() % 256;
        for (let i = 0; i < size; i++) {
            buff.writeUInt8(value, i);
        }
        return buff;
    }
    async $updateRemoteConnectionData(connectionData) {
        this._remoteConnectionData = connectionData;
        this._onDidChangeRemoteConnectionData.fire();
    }
    _isESM(extensionDescription, modulePath) {
        modulePath ??= extensionDescription ? this._getEntryPoint(extensionDescription) : modulePath;
        return modulePath?.endsWith('.mjs') || (extensionDescription?.type === 'module' && !modulePath?.endsWith('.cjs'));
    }
};
AbstractExtHostExtensionService = AbstractExtHostExtensionService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHostUtils),
    __param(2, IExtHostRpcService),
    __param(3, IExtHostWorkspace),
    __param(4, IExtHostConfiguration),
    __param(5, ILogService),
    __param(6, IExtHostInitDataService),
    __param(7, IExtensionStoragePaths),
    __param(8, IExtHostTunnelService),
    __param(9, IExtHostTerminalService),
    __param(10, IExtHostLocalizationService),
    __param(11, IExtHostManagedSockets),
    __param(12, IExtHostLanguageModels)
], AbstractExtHostExtensionService);
export { AbstractExtHostExtensionService };
function applyExtensionsDelta(activationEventsReader, oldGlobalRegistry, oldMyRegistry, extensionsDelta) {
    activationEventsReader.addActivationEvents(extensionsDelta.addActivationEvents);
    const globalRegistry = new ExtensionDescriptionRegistry(activationEventsReader, oldGlobalRegistry.getAllExtensionDescriptions());
    globalRegistry.deltaExtensions(extensionsDelta.toAdd, extensionsDelta.toRemove);
    const myExtensionsSet = new ExtensionIdentifierSet(oldMyRegistry.getAllExtensionDescriptions().map(extension => extension.identifier));
    for (const extensionId of extensionsDelta.myToRemove) {
        myExtensionsSet.delete(extensionId);
    }
    for (const extensionId of extensionsDelta.myToAdd) {
        myExtensionsSet.add(extensionId);
    }
    const myExtensions = filterExtensions(globalRegistry, myExtensionsSet);
    return { globalRegistry, myExtensions };
}
function getTelemetryActivationEvent(extensionDescription, reason) {
    const event = {
        id: extensionDescription.identifier.value,
        name: extensionDescription.name,
        extensionVersion: extensionDescription.version,
        publisherDisplayName: extensionDescription.publisher,
        activationEvents: extensionDescription.activationEvents ? extensionDescription.activationEvents.join(',') : null,
        isBuiltin: extensionDescription.isBuiltin,
        reason: reason.activationEvent,
        reasonId: reason.extensionId.value,
    };
    return event;
}
function printExtIds(registry) {
    return registry.getAllExtensionDescriptions().map(ext => ext.identifier.value).join(',');
}
export const IExtHostExtensionService = createDecorator('IExtHostExtensionService');
export class Extension {
    #extensionService;
    #originExtensionId;
    #identifier;
    constructor(extensionService, originExtensionId, description, kind, isFromDifferentExtensionHost) {
        this.#extensionService = extensionService;
        this.#originExtensionId = originExtensionId;
        this.#identifier = description.identifier;
        this.id = description.identifier.value;
        this.extensionUri = description.extensionLocation;
        this.extensionPath = path.normalize(originalFSPath(description.extensionLocation));
        this.packageJSON = description;
        this.extensionKind = kind;
        this.isFromDifferentExtensionHost = isFromDifferentExtensionHost;
    }
    get isActive() {
        // TODO@alexdima support this
        return this.#extensionService.isActivated(this.#identifier);
    }
    get exports() {
        if (this.packageJSON.api === 'none' || this.isFromDifferentExtensionHost) {
            return undefined; // Strict nulloverride - Public api
        }
        return this.#extensionService.getExtensionExports(this.#identifier);
    }
    async activate() {
        if (this.isFromDifferentExtensionHost) {
            throw new Error('Cannot activate foreign extension'); // TODO@alexdima support this
        }
        await this.#extensionService.activateByIdWithErrors(this.#identifier, { startup: false, extensionId: this.#originExtensionId, activationEvent: 'api' });
        return this.exports;
    }
}
function filterExtensions(globalRegistry, desiredExtensions) {
    return globalRegistry.getAllExtensionDescriptions().filter(extension => desiredExtensions.has(extension.identifier));
}
export class ExtensionPaths {
    constructor(_searchTree) {
        this._searchTree = _searchTree;
    }
    setSearchTree(searchTree) {
        this._searchTree = searchTree;
    }
    findSubstr(key) {
        return this._searchTree.findSubstr(key);
    }
    forEach(callback) {
        return this._searchTree.forEach(callback);
    }
}
/**
 * This mirrors the activation events as seen by the renderer. The renderer
 * is the only one which can have a reliable view of activation events because
 * implicit activation events are generated via extension points, and they
 * are registered only on the renderer side.
 */
class SyncedActivationEventsReader {
    constructor(activationEvents) {
        this._map = new ExtensionIdentifierMap();
        this.addActivationEvents(activationEvents);
    }
    readActivationEvents(extensionDescription) {
        return this._map.get(extensionDescription.identifier) ?? [];
    }
    addActivationEvents(activationEvents) {
        for (const extensionId of Object.keys(activationEvents)) {
            this._map.set(extensionId, activationEvents[extensionId]);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBZ0MsV0FBVyxFQUF1RixNQUFNLHVCQUF1QixDQUFDO0FBRXZLLE9BQU8sRUFBd0IscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLCtCQUErQixFQUFFLG1CQUFtQixFQUFtQyxhQUFhLEVBQW9DLE1BQU0sZ0NBQWdDLENB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