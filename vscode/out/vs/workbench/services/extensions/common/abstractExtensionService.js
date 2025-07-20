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
var AbstractExtensionService_1;
import { Barrier } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as perf from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isDefined } from '../../../../base/common/types.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { ExtensionIdentifier, ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { handleVetos } from '../../../../platform/lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, getRemoteAuthorityPrefix } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions as ExtensionFeaturesExtensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { LockableExtensionDescriptionRegistry } from './extensionDescriptionRegistry.js';
import { parseExtensionDevOptions } from './extensionDevOptions.js';
import { ExtensionHostManager } from './extensionHostManager.js';
import { IExtensionManifestPropertiesService } from './extensionManifestPropertiesService.js';
import { LocalProcessRunningLocation, LocalWebWorkerRunningLocation, RemoteRunningLocation } from './extensionRunningLocation.js';
import { ExtensionRunningLocationTracker, filterExtensionIdentifiers } from './extensionRunningLocationTracker.js';
import { ActivationTimes, ExtensionPointContribution, toExtension, toExtensionDescription } from './extensions.js';
import { ExtensionMessageCollector, ExtensionsRegistry } from './extensionsRegistry.js';
import { LazyCreateExtensionHostManager } from './lazyCreateExtensionHostManager.js';
import { checkActivateWorkspaceContainsExtension, checkGlobFileExists } from './workspaceContains.js';
import { ILifecycleService, WillShutdownJoinerOrder } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
const hasOwnProperty = Object.hasOwnProperty;
const NO_OP_VOID_PROMISE = Promise.resolve(undefined);
let AbstractExtensionService = AbstractExtensionService_1 = class AbstractExtensionService extends Disposable {
    constructor(options, _extensionsProposedApi, _extensionHostFactory, _extensionHostKindPicker, _instantiationService, _notificationService, _environmentService, _telemetryService, _extensionEnablementService, _fileService, _productService, _extensionManagementService, _contextService, _configurationService, _extensionManifestPropertiesService, _logService, _remoteAgentService, _remoteExtensionsScannerService, _lifecycleService, _remoteAuthorityResolverService, _dialogService) {
        super();
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionHostFactory = _extensionHostFactory;
        this._extensionHostKindPicker = _extensionHostKindPicker;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._environmentService = _environmentService;
        this._telemetryService = _telemetryService;
        this._extensionEnablementService = _extensionEnablementService;
        this._fileService = _fileService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._contextService = _contextService;
        this._configurationService = _configurationService;
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        this._logService = _logService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteExtensionsScannerService = _remoteExtensionsScannerService;
        this._lifecycleService = _lifecycleService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._dialogService = _dialogService;
        this._onDidRegisterExtensions = this._register(new Emitter());
        this.onDidRegisterExtensions = this._onDidRegisterExtensions.event;
        this._onDidChangeExtensionsStatus = this._register(new Emitter());
        this.onDidChangeExtensionsStatus = this._onDidChangeExtensionsStatus.event;
        this._onDidChangeExtensions = this._register(new Emitter({ leakWarningThreshold: 400 }));
        this.onDidChangeExtensions = this._onDidChangeExtensions.event;
        this._onWillActivateByEvent = this._register(new Emitter());
        this.onWillActivateByEvent = this._onWillActivateByEvent.event;
        this._onDidChangeResponsiveChange = this._register(new Emitter());
        this.onDidChangeResponsiveChange = this._onDidChangeResponsiveChange.event;
        this._onWillStop = this._register(new Emitter());
        this.onWillStop = this._onWillStop.event;
        this._activationEventReader = new ImplicitActivationAwareReader();
        this._registry = new LockableExtensionDescriptionRegistry(this._activationEventReader);
        this._installedExtensionsReady = new Barrier();
        this._extensionStatus = new ExtensionIdentifierMap();
        this._allRequestedActivateEvents = new Set();
        this._remoteCrashTracker = new ExtensionHostCrashTracker();
        this._deltaExtensionsQueue = [];
        this._inHandleDeltaExtensions = false;
        this._extensionHostManagers = this._register(new ExtensionHostCollection());
        this._resolveAuthorityAttempt = 0;
        this._hasLocalProcess = options.hasLocalProcess;
        this._allowRemoteExtensionsInLocalWebWorker = options.allowRemoteExtensionsInLocalWebWorker;
        // help the file service to activate providers by activating extensions by file system event
        this._register(this._fileService.onWillActivateFileSystemProvider(e => {
            if (e.scheme !== Schemas.vscodeRemote) {
                e.join(this.activateByEvent(`onFileSystem:${e.scheme}`));
            }
        }));
        this._runningLocations = new ExtensionRunningLocationTracker(this._registry, this._extensionHostKindPicker, this._environmentService, this._configurationService, this._logService, this._extensionManifestPropertiesService);
        this._register(this._extensionEnablementService.onEnablementChanged((extensions) => {
            const toAdd = [];
            const toRemove = [];
            for (const extension of extensions) {
                if (this._safeInvokeIsEnabled(extension)) {
                    // an extension has been enabled
                    toAdd.push(extension);
                }
                else {
                    // an extension has been disabled
                    toRemove.push(extension);
                }
            }
            if (isCI) {
                this._logService.info(`AbstractExtensionService.onEnablementChanged fired for ${extensions.map(e => e.identifier.id).join(', ')}`);
            }
            this._handleDeltaExtensions(new DeltaExtensionsQueueItem(toAdd, toRemove));
        }));
        this._register(this._extensionManagementService.onDidChangeProfile(({ added, removed }) => {
            if (added.length || removed.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidChangeProfile fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(added, removed));
            }
        }));
        this._register(this._extensionManagementService.onDidEnableExtensions(extensions => {
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidEnableExtensions fired`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidInstallExtensions((result) => {
            const extensions = [];
            for (const { local, operation } of result) {
                if (local && local.isValid && operation !== 4 /* InstallOperation.Migrate */ && this._safeInvokeIsEnabled(local)) {
                    extensions.push(local);
                }
            }
            if (extensions.length) {
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidInstallExtensions fired for ${extensions.map(e => e.identifier.id).join(', ')}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem(extensions, []));
            }
        }));
        this._register(this._extensionManagementService.onDidUninstallExtension((event) => {
            if (!event.error) {
                // an extension has been uninstalled
                if (isCI) {
                    this._logService.info(`AbstractExtensionService.onDidUninstallExtension fired for ${event.identifier.id}`);
                }
                this._handleDeltaExtensions(new DeltaExtensionsQueueItem([], [event.identifier.id]));
            }
        }));
        this._register(this._lifecycleService.onWillShutdown(event => {
            if (this._remoteAgentService.getConnection()) {
                event.join(async () => {
                    // We need to disconnect the management connection before killing the local extension host.
                    // Otherwise, the local extension host might terminate the underlying tunnel before the
                    // management connection has a chance to send its disconnection message.
                    try {
                        await this._remoteAgentService.endConnection();
                        await this._doStopExtensionHosts();
                        this._remoteAgentService.getConnection()?.dispose();
                    }
                    catch {
                        this._logService.warn('Error while disconnecting remote agent');
                    }
                }, {
                    id: 'join.disconnectRemote',
                    label: nls.localize('disconnectRemote', "Disconnect Remote Agent"),
                    order: WillShutdownJoinerOrder.Last // after others have joined that might depend on a remote connection
                });
            }
            else {
                event.join(this._doStopExtensionHosts(), {
                    id: 'join.stopExtensionHosts',
                    label: nls.localize('stopExtensionHosts', "Stopping Extension Hosts"),
                });
            }
        }));
    }
    _getExtensionHostManagers(kind) {
        return this._extensionHostManagers.getByKind(kind);
    }
    //#region deltaExtensions
    async _handleDeltaExtensions(item) {
        this._deltaExtensionsQueue.push(item);
        if (this._inHandleDeltaExtensions) {
            // Let the current item finish, the new one will be picked up
            return;
        }
        let lock = null;
        try {
            this._inHandleDeltaExtensions = true;
            // wait for _initialize to finish before hanlding any delta extension events
            await this._installedExtensionsReady.wait();
            lock = await this._registry.acquireLock('handleDeltaExtensions');
            while (this._deltaExtensionsQueue.length > 0) {
                const item = this._deltaExtensionsQueue.shift();
                await this._deltaExtensions(lock, item.toAdd, item.toRemove);
            }
        }
        finally {
            this._inHandleDeltaExtensions = false;
            lock?.dispose();
        }
    }
    async _deltaExtensions(lock, _toAdd, _toRemove) {
        if (isCI) {
            this._logService.info(`AbstractExtensionService._deltaExtensions: toAdd: [${_toAdd.map(e => e.identifier.id).join(',')}] toRemove: [${_toRemove.map(e => typeof e === 'string' ? e : e.identifier.id).join(',')}]`);
        }
        let toRemove = [];
        for (let i = 0, len = _toRemove.length; i < len; i++) {
            const extensionOrId = _toRemove[i];
            const extensionId = (typeof extensionOrId === 'string' ? extensionOrId : extensionOrId.identifier.id);
            const extension = (typeof extensionOrId === 'string' ? null : extensionOrId);
            const extensionDescription = this._registry.getExtensionDescription(extensionId);
            if (!extensionDescription) {
                // ignore disabling/uninstalling an extension which is not running
                continue;
            }
            if (extension && extensionDescription.extensionLocation.scheme !== extension.location.scheme) {
                // this event is for a different extension than mine (maybe for the local extension, while I have the remote extension)
                continue;
            }
            if (!this.canRemoveExtension(extensionDescription)) {
                // uses non-dynamic extension point or is activated
                continue;
            }
            toRemove.push(extensionDescription);
        }
        const toAdd = [];
        for (let i = 0, len = _toAdd.length; i < len; i++) {
            const extension = _toAdd[i];
            const extensionDescription = toExtensionDescription(extension, false);
            if (!extensionDescription) {
                // could not scan extension...
                continue;
            }
            if (!this._canAddExtension(extensionDescription, toRemove)) {
                continue;
            }
            toAdd.push(extensionDescription);
        }
        if (toAdd.length === 0 && toRemove.length === 0) {
            return;
        }
        // Update the local registry
        const result = this._registry.deltaExtensions(lock, toAdd, toRemove.map(e => e.identifier));
        this._onDidChangeExtensions.fire({ added: toAdd, removed: toRemove });
        toRemove = toRemove.concat(result.removedDueToLooping);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', "The following extensions contain dependency loops and have been disabled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', '))
            });
        }
        // enable or disable proposed API per extension
        this._extensionsProposedApi.updateEnabledApiProposals(toAdd);
        // Update extension points
        this._doHandleExtensionPoints([].concat(toAdd).concat(toRemove), false);
        // Update the extension host
        await this._updateExtensionsOnExtHosts(result.versionId, toAdd, toRemove.map(e => e.identifier));
        for (let i = 0; i < toAdd.length; i++) {
            this._activateAddedExtensionIfNeeded(toAdd[i]);
        }
    }
    async _updateExtensionsOnExtHosts(versionId, toAdd, toRemove) {
        const removedRunningLocation = this._runningLocations.deltaExtensions(toAdd, toRemove);
        const promises = this._extensionHostManagers.map(extHostManager => this._updateExtensionsOnExtHost(extHostManager, versionId, toAdd, toRemove, removedRunningLocation));
        await Promise.all(promises);
    }
    async _updateExtensionsOnExtHost(extensionHostManager, versionId, toAdd, toRemove, removedRunningLocation) {
        const myToAdd = this._runningLocations.filterByExtensionHostManager(toAdd, extensionHostManager);
        const myToRemove = filterExtensionIdentifiers(toRemove, removedRunningLocation, extRunningLocation => extensionHostManager.representsRunningLocation(extRunningLocation));
        const addActivationEvents = ImplicitActivationEvents.createActivationEventsMap(toAdd);
        if (isCI) {
            const printExtIds = (extensions) => extensions.map(e => e.identifier.value).join(',');
            const printIds = (extensions) => extensions.map(e => e.value).join(',');
            this._logService.info(`AbstractExtensionService: Calling deltaExtensions: toRemove: [${printIds(toRemove)}], toAdd: [${printExtIds(toAdd)}], myToRemove: [${printIds(myToRemove)}], myToAdd: [${printExtIds(myToAdd)}],`);
        }
        await extensionHostManager.deltaExtensions({ versionId, toRemove, toAdd, addActivationEvents, myToRemove, myToAdd: myToAdd.map(extension => extension.identifier) });
    }
    canAddExtension(extension) {
        return this._canAddExtension(extension, []);
    }
    _canAddExtension(extension, extensionsBeingRemoved) {
        // (Also check for renamed extensions)
        const existing = this._registry.getExtensionDescriptionByIdOrUUID(extension.identifier, extension.id);
        if (existing) {
            // This extension is already known (most likely at a different version)
            // so it cannot be added again unless it is removed first
            const isBeingRemoved = extensionsBeingRemoved.some((extensionDescription) => ExtensionIdentifier.equals(extension.identifier, extensionDescription.identifier));
            if (!isBeingRemoved) {
                return false;
            }
        }
        const extensionKinds = this._runningLocations.readExtensionKinds(extension);
        const isRemote = extension.extensionLocation.scheme === Schemas.vscodeRemote;
        const extensionHostKind = this._extensionHostKindPicker.pickExtensionHostKind(extension.identifier, extensionKinds, !isRemote, isRemote, 0 /* ExtensionRunningPreference.None */);
        if (extensionHostKind === null) {
            return false;
        }
        return true;
    }
    canRemoveExtension(extension) {
        const extensionDescription = this._registry.getExtensionDescription(extension.identifier);
        if (!extensionDescription) {
            // Can't remove an extension that is unknown!
            return false;
        }
        if (this._extensionStatus.get(extensionDescription.identifier)?.activationStarted) {
            // Extension is running, cannot remove it safely
            return false;
        }
        return true;
    }
    async _activateAddedExtensionIfNeeded(extensionDescription) {
        let shouldActivate = false;
        let shouldActivateReason = null;
        let hasWorkspaceContains = false;
        const activationEvents = this._activationEventReader.readActivationEvents(extensionDescription);
        for (const activationEvent of activationEvents) {
            if (this._allRequestedActivateEvents.has(activationEvent)) {
                // This activation event was fired before the extension was added
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (activationEvent === '*') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
            if (/^workspaceContains/.test(activationEvent)) {
                hasWorkspaceContains = true;
            }
            if (activationEvent === 'onStartupFinished') {
                shouldActivate = true;
                shouldActivateReason = activationEvent;
                break;
            }
        }
        if (shouldActivate) {
            await Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: shouldActivateReason }))).then(() => { });
        }
        else if (hasWorkspaceContains) {
            const workspace = await this._contextService.getCompleteWorkspace();
            const forceUsingSearch = !!this._environmentService.remoteAuthority;
            const host = {
                logService: this._logService,
                folders: workspace.folders.map(folder => folder.uri),
                forceUsingSearch: forceUsingSearch,
                exists: (uri) => this._fileService.exists(uri),
                checkExists: (folders, includes, token) => this._instantiationService.invokeFunction((accessor) => checkGlobFileExists(accessor, folders, includes, token))
            };
            const result = await checkActivateWorkspaceContainsExtension(host, extensionDescription);
            if (!result) {
                return;
            }
            await Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activate(extensionDescription.identifier, { startup: false, extensionId: extensionDescription.identifier, activationEvent: result.activationEvent }))).then(() => { });
        }
    }
    //#endregion
    async _initialize() {
        perf.mark('code/willLoadExtensions');
        this._startExtensionHostsIfNecessary(true, []);
        const lock = await this._registry.acquireLock('_initialize');
        try {
            await this._resolveAndProcessExtensions(lock);
            // Start extension hosts which are not automatically started
            this._startOnDemandExtensionHosts();
        }
        finally {
            lock.dispose();
        }
        this._releaseBarrier();
        perf.mark('code/didLoadExtensions');
        await this._handleExtensionTests();
    }
    async _resolveAndProcessExtensions(lock) {
        let resolverExtensions = [];
        let localExtensions = [];
        let remoteExtensions = [];
        for await (const extensions of this._resolveExtensions()) {
            if (extensions instanceof ResolverExtensions) {
                resolverExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
                this._registry.deltaExtensions(lock, resolverExtensions, []);
                this._doHandleExtensionPoints(resolverExtensions, true);
            }
            if (extensions instanceof LocalExtensions) {
                localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
            if (extensions instanceof RemoteExtensions) {
                remoteExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, extensions.extensions, false);
            }
        }
        // `initializeRunningLocation` will look at the complete picture (e.g. an extension installed on both sides),
        // takes care of duplicates and picks a running location for each extension
        this._runningLocations.initializeRunningLocation(localExtensions, remoteExtensions);
        this._startExtensionHostsIfNecessary(true, []);
        // Some remote extensions could run locally in the web worker, so store them
        const remoteExtensionsThatNeedToRunLocally = (this._allowRemoteExtensionsInLocalWebWorker ? this._runningLocations.filterByExtensionHostKind(remoteExtensions, 2 /* ExtensionHostKind.LocalWebWorker */) : []);
        const localProcessExtensions = (this._hasLocalProcess ? this._runningLocations.filterByExtensionHostKind(localExtensions, 1 /* ExtensionHostKind.LocalProcess */) : []);
        const localWebWorkerExtensions = this._runningLocations.filterByExtensionHostKind(localExtensions, 2 /* ExtensionHostKind.LocalWebWorker */);
        remoteExtensions = this._runningLocations.filterByExtensionHostKind(remoteExtensions, 3 /* ExtensionHostKind.Remote */);
        // Add locally the remote extensions that need to run locally in the web worker
        for (const ext of remoteExtensionsThatNeedToRunLocally) {
            if (!includes(localWebWorkerExtensions, ext.identifier)) {
                localWebWorkerExtensions.push(ext);
            }
        }
        const allExtensions = remoteExtensions.concat(localProcessExtensions).concat(localWebWorkerExtensions);
        let toAdd = allExtensions;
        if (resolverExtensions.length) {
            // Add extensions that are not registered as resolvers but are in the final resolved set
            toAdd = allExtensions.filter(extension => !resolverExtensions.some(e => ExtensionIdentifier.equals(e.identifier, extension.identifier) && e.extensionLocation.toString() === extension.extensionLocation.toString()));
            // Remove extensions that are registered as resolvers but are not in the final resolved set
            if (allExtensions.length < toAdd.length + resolverExtensions.length) {
                const toRemove = resolverExtensions.filter(registered => !allExtensions.some(e => ExtensionIdentifier.equals(e.identifier, registered.identifier) && e.extensionLocation.toString() === registered.extensionLocation.toString()));
                if (toRemove.length) {
                    this._registry.deltaExtensions(lock, [], toRemove.map(e => e.identifier));
                    this._doHandleExtensionPoints(toRemove, true);
                }
            }
        }
        const result = this._registry.deltaExtensions(lock, toAdd, []);
        if (result.removedDueToLooping.length > 0) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: nls.localize('looping', "The following extensions contain dependency loops and have been disabled: {0}", result.removedDueToLooping.map(e => `'${e.identifier.value}'`).join(', '))
            });
        }
        this._doHandleExtensionPoints(this._registry.getAllExtensionDescriptions(), false);
    }
    async _handleExtensionTests() {
        if (!this._environmentService.isExtensionDevelopment || !this._environmentService.extensionTestsLocationURI) {
            return;
        }
        const extensionHostManager = this.findTestExtensionHost(this._environmentService.extensionTestsLocationURI);
        if (!extensionHostManager) {
            const msg = nls.localize('extensionTestError', "No extension host found that can launch the test runner at {0}.", this._environmentService.extensionTestsLocationURI.toString());
            console.error(msg);
            this._notificationService.error(msg);
            return;
        }
        let exitCode;
        try {
            exitCode = await extensionHostManager.extensionTestsExecute();
            if (isCI) {
                this._logService.info(`Extension host test runner exit code: ${exitCode}`);
            }
        }
        catch (err) {
            if (isCI) {
                this._logService.error(`Extension host test runner error`, err);
            }
            console.error(err);
            exitCode = 1 /* ERROR */;
        }
        this._onExtensionHostExit(exitCode);
    }
    findTestExtensionHost(testLocation) {
        let runningLocation = null;
        for (const extension of this._registry.getAllExtensionDescriptions()) {
            if (isEqualOrParent(testLocation, extension.extensionLocation)) {
                runningLocation = this._runningLocations.getRunningLocation(extension.identifier);
                break;
            }
        }
        if (runningLocation === null) {
            // not sure if we should support that, but it was possible to have an test outside an extension
            if (testLocation.scheme === Schemas.vscodeRemote) {
                runningLocation = new RemoteRunningLocation();
            }
            else {
                // When a debugger attaches to the extension host, it will surface all console.log messages from the extension host,
                // but not necessarily from the window. So it would be best if any errors get printed to the console of the extension host.
                // That is why here we use the local process extension host even for non-file URIs
                runningLocation = new LocalProcessRunningLocation(0);
            }
        }
        if (runningLocation !== null) {
            return this._extensionHostManagers.getByRunningLocation(runningLocation);
        }
        return null;
    }
    _releaseBarrier() {
        this._installedExtensionsReady.open();
        this._onDidRegisterExtensions.fire(undefined);
        this._onDidChangeExtensionsStatus.fire(this._registry.getAllExtensionDescriptions().map(e => e.identifier));
    }
    //#region remote authority resolving
    async _resolveAuthorityInitial(remoteAuthority) {
        const MAX_ATTEMPTS = 5;
        for (let attempt = 1;; attempt++) {
            try {
                return this._resolveAuthorityWithLogging(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    // There is no point in retrying if there is no resolver found
                    throw err;
                }
                if (RemoteAuthorityResolverError.isNotAvailable(err)) {
                    // The resolver is not available and asked us to not retry
                    throw err;
                }
                if (attempt >= MAX_ATTEMPTS) {
                    // Too many failed attempts, give up
                    throw err;
                }
            }
        }
    }
    async _resolveAuthorityAgain() {
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (!remoteAuthority) {
            return;
        }
        this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
        try {
            const result = await this._resolveAuthorityWithLogging(remoteAuthority);
            this._remoteAuthorityResolverService._setResolvedAuthority(result.authority, result.options);
        }
        catch (err) {
            this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
        }
    }
    async _resolveAuthorityWithLogging(remoteAuthority) {
        const authorityPrefix = getRemoteAuthorityPrefix(remoteAuthority);
        const sw = StopWatch.create(false);
        this._logService.info(`Invoking resolveAuthority(${authorityPrefix})...`);
        try {
            perf.mark(`code/willResolveAuthority/${authorityPrefix}`);
            const result = await this._resolveAuthority(remoteAuthority);
            perf.mark(`code/didResolveAuthorityOK/${authorityPrefix}`);
            this._logService.info(`resolveAuthority(${authorityPrefix}) returned '${result.authority.connectTo}' after ${sw.elapsed()} ms`);
            return result;
        }
        catch (err) {
            perf.mark(`code/didResolveAuthorityError/${authorityPrefix}`);
            this._logService.error(`resolveAuthority(${authorityPrefix}) returned an error after ${sw.elapsed()} ms`, err);
            throw err;
        }
    }
    async _resolveAuthorityOnExtensionHosts(kind, remoteAuthority) {
        const extensionHosts = this._getExtensionHostManagers(kind);
        if (extensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve authority`);
        }
        this._resolveAuthorityAttempt++;
        const results = await Promise.all(extensionHosts.map(extHost => extHost.resolveAuthority(remoteAuthority, this._resolveAuthorityAttempt)));
        let bestErrorResult = null;
        for (const result of results) {
            if (result.type === 'ok') {
                return result.value;
            }
            if (!bestErrorResult) {
                bestErrorResult = result;
                continue;
            }
            const bestErrorIsUnknown = (bestErrorResult.error.code === RemoteAuthorityResolverErrorCode.Unknown);
            const errorIsUnknown = (result.error.code === RemoteAuthorityResolverErrorCode.Unknown);
            if (bestErrorIsUnknown && !errorIsUnknown) {
                bestErrorResult = result;
            }
        }
        // we can only reach this if there is an error
        throw new RemoteAuthorityResolverError(bestErrorResult.error.message, bestErrorResult.error.code, bestErrorResult.error.detail);
    }
    //#endregion
    //#region Stopping / Starting / Restarting
    stopExtensionHosts(reason, auto) {
        return this._doStopExtensionHostsWithVeto(reason, auto);
    }
    async _doStopExtensionHosts() {
        const previouslyActivatedExtensionIds = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted) {
                previouslyActivatedExtensionIds.push(extensionStatus.id);
            }
        }
        await this._extensionHostManagers.stopAllInReverse();
        for (const extensionStatus of this._extensionStatus.values()) {
            extensionStatus.clearRuntimeStatus();
        }
        if (previouslyActivatedExtensionIds.length > 0) {
            this._onDidChangeExtensionsStatus.fire(previouslyActivatedExtensionIds);
        }
    }
    async _doStopExtensionHostsWithVeto(reason, auto = false) {
        if (auto && this._environmentService.isExtensionDevelopment) {
            return false;
        }
        const vetos = [];
        const vetoReasons = new Set();
        this._onWillStop.fire({
            reason,
            auto,
            veto(value, reason) {
                vetos.push(value);
                if (typeof value === 'boolean') {
                    if (value === true) {
                        vetoReasons.add(reason);
                    }
                }
                else {
                    value.then(value => {
                        if (value) {
                            vetoReasons.add(reason);
                        }
                    }).catch(error => {
                        vetoReasons.add(nls.localize('extensionStopVetoError', "{0} (Error: {1})", reason, toErrorMessage(error)));
                    });
                }
            }
        });
        const veto = await handleVetos(vetos, error => this._logService.error(error));
        if (!veto) {
            await this._doStopExtensionHosts();
        }
        else {
            if (!auto) {
                const vetoReasonsArray = Array.from(vetoReasons);
                this._logService.warn(`Extension host was not stopped because of veto (stop reason: ${reason}, veto reason: ${vetoReasonsArray.join(', ')})`);
                const { confirmed } = await this._dialogService.confirm({
                    type: Severity.Warning,
                    message: nls.localize('extensionStopVetoMessage', "Please confirm restart of extensions."),
                    detail: vetoReasonsArray.length === 1 ?
                        vetoReasonsArray[0] :
                        vetoReasonsArray.join('\n -'),
                    primaryButton: nls.localize('proceedAnyways', "Restart Anyway")
                });
                if (confirmed) {
                    return true;
                }
            }
        }
        return !veto;
    }
    _startExtensionHostsIfNecessary(isInitialStart, initialActivationEvents) {
        const locations = [];
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalProcessAffinity; affinity++) {
            locations.push(new LocalProcessRunningLocation(affinity));
        }
        for (let affinity = 0; affinity <= this._runningLocations.maxLocalWebWorkerAffinity; affinity++) {
            locations.push(new LocalWebWorkerRunningLocation(affinity));
        }
        locations.push(new RemoteRunningLocation());
        for (const location of locations) {
            if (this._extensionHostManagers.getByRunningLocation(location)) {
                // already running
                continue;
            }
            const res = this._createExtensionHostManager(location, isInitialStart, initialActivationEvents);
            if (res) {
                const [extHostManager, disposableStore] = res;
                this._extensionHostManagers.add(extHostManager, disposableStore);
            }
        }
    }
    _createExtensionHostManager(runningLocation, isInitialStart, initialActivationEvents) {
        const extensionHost = this._extensionHostFactory.createExtensionHost(this._runningLocations, runningLocation, isInitialStart);
        if (!extensionHost) {
            return null;
        }
        const processManager = this._doCreateExtensionHostManager(extensionHost, initialActivationEvents);
        const disposableStore = new DisposableStore();
        disposableStore.add(processManager.onDidExit(([code, signal]) => this._onExtensionHostCrashOrExit(processManager, code, signal)));
        disposableStore.add(processManager.onDidChangeResponsiveState((responsiveState) => {
            this._logService.info(`Extension host (${processManager.friendyName}) is ${responsiveState === 0 /* ResponsiveState.Responsive */ ? 'responsive' : 'unresponsive'}.`);
            this._onDidChangeResponsiveChange.fire({
                extensionHostKind: processManager.kind,
                isResponsive: responsiveState === 0 /* ResponsiveState.Responsive */,
                getInspectListener: (tryEnableInspector) => {
                    return processManager.getInspectPort(tryEnableInspector);
                }
            });
        }));
        return [processManager, disposableStore];
    }
    _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
        const internalExtensionService = this._acquireInternalAPI(extensionHost);
        if (extensionHost.startup === 3 /* ExtensionHostStartup.LazyAutoStart */) {
            return this._instantiationService.createInstance(LazyCreateExtensionHostManager, extensionHost, initialActivationEvents, internalExtensionService);
        }
        return this._instantiationService.createInstance(ExtensionHostManager, extensionHost, initialActivationEvents, internalExtensionService);
    }
    _onExtensionHostCrashOrExit(extensionHost, code, signal) {
        // Unexpected termination
        const isExtensionDevHost = parseExtensionDevOptions(this._environmentService).isExtensionDevHost;
        if (!isExtensionDevHost) {
            this._onExtensionHostCrashed(extensionHost, code, signal);
            return;
        }
        this._onExtensionHostExit(code);
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        console.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. Code: ${code}, Signal: ${signal}`);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            this._doStopExtensionHosts();
        }
        else if (extensionHost.kind === 3 /* ExtensionHostKind.Remote */) {
            if (signal) {
                this._onRemoteExtensionHostCrashed(extensionHost, signal);
            }
            this._extensionHostManagers.stopOne(extensionHost);
        }
    }
    _getExtensionHostExitInfoWithTimeout(reconnectionToken) {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(new Error('getExtensionHostExitInfo timed out'));
            }, 2000);
            this._remoteAgentService.getExtensionHostExitInfo(reconnectionToken).then((r) => {
                clearTimeout(timeoutHandle);
                resolve(r);
            }, reject);
        });
    }
    async _onRemoteExtensionHostCrashed(extensionHost, reconnectionToken) {
        try {
            const info = await this._getExtensionHostExitInfoWithTimeout(reconnectionToken);
            if (info) {
                this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly with code ${info.code}.`);
            }
            this._logExtensionHostCrash(extensionHost);
            this._remoteCrashTracker.registerCrash();
            if (this._remoteCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the remote extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', "The remote extension host terminated unexpectedly. Restarting..."), { hideAfter: 5000 });
                this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            }
            else {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', "Remote Extension host terminated unexpectedly 3 times within the last 5 minutes."), [{
                        label: nls.localize('restart', "Restart Remote Extension Host"),
                        run: () => {
                            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
                        }
                    }]);
            }
        }
        catch (err) {
            // maybe this wasn't an extension host crash and it was a permanent disconnection
        }
    }
    _logExtensionHostCrash(extensionHost) {
        const activatedExtensions = [];
        for (const extensionStatus of this._extensionStatus.values()) {
            if (extensionStatus.activationStarted && extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        if (activatedExtensions.length > 0) {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. The following extensions were running: ${activatedExtensions.map(id => id.value).join(', ')}`);
        }
        else {
            this._logService.error(`Extension host (${extensionHost.friendyName}) terminated unexpectedly. No extensions were activated.`);
        }
    }
    async startExtensionHosts(updates) {
        await this._doStopExtensionHosts();
        if (updates) {
            await this._handleDeltaExtensions(new DeltaExtensionsQueueItem(updates.toAdd, updates.toRemove));
        }
        const lock = await this._registry.acquireLock('startExtensionHosts');
        try {
            this._startExtensionHostsIfNecessary(false, Array.from(this._allRequestedActivateEvents.keys()));
            this._startOnDemandExtensionHosts();
            const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
            await Promise.all(localProcessExtensionHosts.map(extHost => extHost.ready()));
        }
        finally {
            lock.dispose();
        }
    }
    _startOnDemandExtensionHosts() {
        const snapshot = this._registry.getSnapshot();
        for (const extHostManager of this._extensionHostManagers) {
            if (extHostManager.startup !== 1 /* ExtensionHostStartup.EagerAutoStart */) {
                const extensions = this._runningLocations.filterByExtensionHostManager(snapshot.extensions, extHostManager);
                extHostManager.start(snapshot.versionId, snapshot.extensions, extensions.map(extension => extension.identifier));
            }
        }
    }
    //#endregion
    //#region IExtensionService
    activateByEvent(activationEvent, activationKind = 0 /* ActivationKind.Normal */) {
        if (this._installedExtensionsReady.isOpen()) {
            // Extensions have been scanned and interpreted
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (!this._registry.containsActivationEvent(activationEvent)) {
                // There is no extension that is interested in this activation event
                return NO_OP_VOID_PROMISE;
            }
            return this._activateByEvent(activationEvent, activationKind);
        }
        else {
            // Extensions have not been scanned yet.
            // Record the fact that this activationEvent was requested (in case of a restart)
            this._allRequestedActivateEvents.add(activationEvent);
            if (activationKind === 1 /* ActivationKind.Immediate */) {
                // Do not wait for the normal start-up of the extension host(s)
                return this._activateByEvent(activationEvent, activationKind);
            }
            return this._installedExtensionsReady.wait().then(() => this._activateByEvent(activationEvent, activationKind));
        }
    }
    _activateByEvent(activationEvent, activationKind) {
        const result = Promise.all(this._extensionHostManagers.map(extHostManager => extHostManager.activateByEvent(activationEvent, activationKind))).then(() => { });
        this._onWillActivateByEvent.fire({
            event: activationEvent,
            activation: result
        });
        return result;
    }
    activateById(extensionId, reason) {
        return this._activateById(extensionId, reason);
    }
    activationEventIsDone(activationEvent) {
        if (!this._installedExtensionsReady.isOpen()) {
            return false;
        }
        if (!this._registry.containsActivationEvent(activationEvent)) {
            // There is no extension that is interested in this activation event
            return true;
        }
        return this._extensionHostManagers.every(manager => manager.activationEventIsDone(activationEvent));
    }
    whenInstalledExtensionsRegistered() {
        return this._installedExtensionsReady.wait();
    }
    get extensions() {
        return this._registry.getAllExtensionDescriptions();
    }
    _getExtensionRegistrySnapshotWhenReady() {
        return this._installedExtensionsReady.wait().then(() => this._registry.getSnapshot());
    }
    getExtension(id) {
        return this._installedExtensionsReady.wait().then(() => {
            return this._registry.getExtensionDescription(id);
        });
    }
    readExtensionPointContributions(extPoint) {
        return this._installedExtensionsReady.wait().then(() => {
            const availableExtensions = this._registry.getAllExtensionDescriptions();
            const result = [];
            for (const desc of availableExtensions) {
                if (desc.contributes && hasOwnProperty.call(desc.contributes, extPoint.name)) {
                    result.push(new ExtensionPointContribution(desc, desc.contributes[extPoint.name]));
                }
            }
            return result;
        });
    }
    getExtensionsStatus() {
        const result = Object.create(null);
        if (this._registry) {
            const extensions = this._registry.getAllExtensionDescriptions();
            for (const extension of extensions) {
                const extensionStatus = this._extensionStatus.get(extension.identifier);
                result[extension.identifier.value] = {
                    id: extension.identifier,
                    messages: extensionStatus?.messages ?? [],
                    activationStarted: extensionStatus?.activationStarted ?? false,
                    activationTimes: extensionStatus?.activationTimes ?? undefined,
                    runtimeErrors: extensionStatus?.runtimeErrors ?? [],
                    runningLocation: this._runningLocations.getRunningLocation(extension.identifier),
                };
            }
        }
        return result;
    }
    async getInspectPorts(extensionHostKind, tryEnableInspector) {
        const result = await Promise.all(this._getExtensionHostManagers(extensionHostKind).map(extHost => extHost.getInspectPort(tryEnableInspector)));
        // remove 0s:
        return result.filter(isDefined);
    }
    async setRemoteEnvironment(env) {
        await this._extensionHostManagers
            .map(manager => manager.setRemoteEnvironment(env));
    }
    //#endregion
    // --- impl
    _safeInvokeIsEnabled(extension) {
        try {
            return this._extensionEnablementService.isEnabled(extension);
        }
        catch (err) {
            return false;
        }
    }
    _doHandleExtensionPoints(affectedExtensions, onlyResolverExtensionPoints) {
        const affectedExtensionPoints = Object.create(null);
        for (const extensionDescription of affectedExtensions) {
            if (extensionDescription.contributes) {
                for (const extPointName in extensionDescription.contributes) {
                    if (hasOwnProperty.call(extensionDescription.contributes, extPointName)) {
                        affectedExtensionPoints[extPointName] = true;
                    }
                }
            }
        }
        const messageHandler = (msg) => this._handleExtensionPointMessage(msg);
        const availableExtensions = this._registry.getAllExtensionDescriptions();
        const extensionPoints = ExtensionsRegistry.getExtensionPoints();
        perf.mark(onlyResolverExtensionPoints ? 'code/willHandleResolverExtensionPoints' : 'code/willHandleExtensionPoints');
        for (const extensionPoint of extensionPoints) {
            if (affectedExtensionPoints[extensionPoint.name] && (!onlyResolverExtensionPoints || extensionPoint.canHandleResolver)) {
                perf.mark(`code/willHandleExtensionPoint/${extensionPoint.name}`);
                AbstractExtensionService_1._handleExtensionPoint(extensionPoint, availableExtensions, messageHandler);
                perf.mark(`code/didHandleExtensionPoint/${extensionPoint.name}`);
            }
        }
        perf.mark(onlyResolverExtensionPoints ? 'code/didHandleResolverExtensionPoints' : 'code/didHandleExtensionPoints');
    }
    _getOrCreateExtensionStatus(extensionId) {
        if (!this._extensionStatus.has(extensionId)) {
            this._extensionStatus.set(extensionId, new ExtensionStatus(extensionId));
        }
        return this._extensionStatus.get(extensionId);
    }
    _handleExtensionPointMessage(msg) {
        const extensionStatus = this._getOrCreateExtensionStatus(msg.extensionId);
        extensionStatus.addMessage(msg);
        const extension = this._registry.getExtensionDescription(msg.extensionId);
        const strMsg = `[${msg.extensionId.value}]: ${msg.message}`;
        if (msg.type === Severity.Error) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Error, message: strMsg });
            }
            this._logService.error(strMsg);
        }
        else if (msg.type === Severity.Warning) {
            if (extension && extension.isUnderDevelopment) {
                // This message is about the extension currently being developed
                this._notificationService.notify({ severity: Severity.Warning, message: strMsg });
            }
            this._logService.warn(strMsg);
        }
        else {
            this._logService.info(strMsg);
        }
        if (msg.extensionId && this._environmentService.isBuilt && !this._environmentService.isExtensionDevelopment) {
            const { type, extensionId, extensionPointId, message } = msg;
            this._telemetryService.publicLog2('extensionsMessage', {
                type, extensionId: extensionId.value, extensionPointId, message
            });
        }
    }
    static _handleExtensionPoint(extensionPoint, availableExtensions, messageHandler) {
        const users = [];
        for (const desc of availableExtensions) {
            if (desc.contributes && hasOwnProperty.call(desc.contributes, extensionPoint.name)) {
                users.push({
                    description: desc,
                    value: desc.contributes[extensionPoint.name],
                    collector: new ExtensionMessageCollector(messageHandler, desc, extensionPoint.name)
                });
            }
        }
        extensionPoint.acceptUsers(users);
    }
    //#region Called by extension host
    _acquireInternalAPI(extensionHost) {
        return {
            _activateById: (extensionId, reason) => {
                return this._activateById(extensionId, reason);
            },
            _onWillActivateExtension: (extensionId) => {
                return this._onWillActivateExtension(extensionId, extensionHost.runningLocation);
            },
            _onDidActivateExtension: (extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) => {
                return this._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
            },
            _onDidActivateExtensionError: (extensionId, error) => {
                return this._onDidActivateExtensionError(extensionId, error);
            },
            _onExtensionRuntimeError: (extensionId, err) => {
                return this._onExtensionRuntimeError(extensionId, err);
            }
        };
    }
    async _activateById(extensionId, reason) {
        const results = await Promise.all(this._extensionHostManagers.map(manager => manager.activate(extensionId, reason)));
        const activated = results.some(e => e);
        if (!activated) {
            throw new Error(`Unknown extension ${extensionId.value}`);
        }
    }
    _onWillActivateExtension(extensionId, runningLocation) {
        this._runningLocations.set(extensionId, runningLocation);
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.onWillActivate();
    }
    _onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.setActivationTimes(new ActivationTimes(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason));
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
    _onDidActivateExtensionError(extensionId, error) {
        this._telemetryService.publicLog2('extensionActivationError', {
            extensionId: extensionId.value,
            error: error.message
        });
    }
    _onExtensionRuntimeError(extensionId, err) {
        const extensionStatus = this._getOrCreateExtensionStatus(extensionId);
        extensionStatus.addRuntimeError(err);
        this._onDidChangeExtensionsStatus.fire([extensionId]);
    }
};
AbstractExtensionService = AbstractExtensionService_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, INotificationService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IWorkbenchExtensionManagementService),
    __param(12, IWorkspaceContextService),
    __param(13, IConfigurationService),
    __param(14, IExtensionManifestPropertiesService),
    __param(15, ILogService),
    __param(16, IRemoteAgentService),
    __param(17, IRemoteExtensionsScannerService),
    __param(18, ILifecycleService),
    __param(19, IRemoteAuthorityResolverService),
    __param(20, IDialogService)
], AbstractExtensionService);
export { AbstractExtensionService };
class ExtensionHostCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._extensionHostManagers = [];
    }
    dispose() {
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
        super.dispose();
    }
    add(extensionHostManager, disposableStore) {
        this._extensionHostManagers.push(new ExtensionHostManagerData(extensionHostManager, disposableStore));
    }
    async stopAllInReverse() {
        // See https://github.com/microsoft/vscode/issues/152204
        // Dispose extension hosts in reverse creation order because the local extension host
        // might be critical in sustaining a connection to the remote extension host
        for (let i = this._extensionHostManagers.length - 1; i >= 0; i--) {
            const manager = this._extensionHostManagers[i];
            await manager.extensionHost.disconnect();
            manager.dispose();
        }
        this._extensionHostManagers = [];
    }
    async stopOne(extensionHostManager) {
        const index = this._extensionHostManagers.findIndex(el => el.extensionHost === extensionHostManager);
        if (index >= 0) {
            this._extensionHostManagers.splice(index, 1);
            await extensionHostManager.disconnect();
            extensionHostManager.dispose();
        }
    }
    getByKind(kind) {
        return this.filter(el => el.kind === kind);
    }
    getByRunningLocation(runningLocation) {
        for (const el of this._extensionHostManagers) {
            if (el.extensionHost.representsRunningLocation(runningLocation)) {
                return el.extensionHost;
            }
        }
        return null;
    }
    *[Symbol.iterator]() {
        for (const extensionHostManager of this._extensionHostManagers) {
            yield extensionHostManager.extensionHost;
        }
    }
    map(callback) {
        return this._extensionHostManagers.map(el => callback(el.extensionHost));
    }
    every(callback) {
        return this._extensionHostManagers.every(el => callback(el.extensionHost));
    }
    filter(callback) {
        return this._extensionHostManagers.filter(el => callback(el.extensionHost)).map(el => el.extensionHost);
    }
}
class ExtensionHostManagerData {
    constructor(extensionHost, disposableStore) {
        this.extensionHost = extensionHost;
        this.disposableStore = disposableStore;
    }
    dispose() {
        this.disposableStore.dispose();
        this.extensionHost.dispose();
    }
}
export class ResolverExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class LocalExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class RemoteExtensions {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
class DeltaExtensionsQueueItem {
    constructor(toAdd, toRemove) {
        this.toAdd = toAdd;
        this.toRemove = toRemove;
    }
}
export function isResolverExtension(extension) {
    return !!extension.activationEvents?.some(activationEvent => activationEvent.startsWith('onResolveRemoteAuthority:'));
}
/**
 * @argument extensions The extensions to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function checkEnabledAndProposedAPI(logService, extensionEnablementService, extensionsProposedApi, extensions, ignoreWorkspaceTrust) {
    // enable or disable proposed API per extension
    extensionsProposedApi.updateEnabledApiProposals(extensions);
    // keep only enabled extensions
    return filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust);
}
/**
 * Return the subset of extensions that are enabled.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function filterEnabledExtensions(logService, extensionEnablementService, extensions, ignoreWorkspaceTrust) {
    const enabledExtensions = [], extensionsToCheck = [], mappedExtensions = [];
    for (const extension of extensions) {
        if (extension.isUnderDevelopment) {
            // Never disable extensions under development
            enabledExtensions.push(extension);
        }
        else {
            extensionsToCheck.push(extension);
            mappedExtensions.push(toExtension(extension));
        }
    }
    const enablementStates = extensionEnablementService.getEnablementStates(mappedExtensions, ignoreWorkspaceTrust ? { trusted: true } : undefined);
    for (let index = 0; index < enablementStates.length; index++) {
        if (extensionEnablementService.isEnabledEnablementState(enablementStates[index])) {
            enabledExtensions.push(extensionsToCheck[index]);
        }
        else {
            if (isCI) {
                logService.info(`filterEnabledExtensions: extension '${extensionsToCheck[index].identifier.value}' is disabled`);
            }
        }
    }
    return enabledExtensions;
}
/**
 * @argument extension The extension to be checked.
 * @argument ignoreWorkspaceTrust Do not take workspace trust into account.
 */
export function extensionIsEnabled(logService, extensionEnablementService, extension, ignoreWorkspaceTrust) {
    return filterEnabledExtensions(logService, extensionEnablementService, [extension], ignoreWorkspaceTrust).includes(extension);
}
function includes(extensions, identifier) {
    for (const extension of extensions) {
        if (ExtensionIdentifier.equals(extension.identifier, identifier)) {
            return true;
        }
    }
    return false;
}
export class ExtensionStatus {
    get messages() {
        return this._messages;
    }
    get activationTimes() {
        return this._activationTimes;
    }
    get runtimeErrors() {
        return this._runtimeErrors;
    }
    get activationStarted() {
        return this._activationStarted;
    }
    constructor(id) {
        this.id = id;
        this._messages = [];
        this._activationTimes = null;
        this._runtimeErrors = [];
        this._activationStarted = false;
    }
    clearRuntimeStatus() {
        this._activationStarted = false;
        this._activationTimes = null;
        this._runtimeErrors = [];
    }
    addMessage(msg) {
        this._messages.push(msg);
    }
    setActivationTimes(activationTimes) {
        this._activationTimes = activationTimes;
    }
    addRuntimeError(err) {
        this._runtimeErrors.push(err);
    }
    onWillActivate() {
        this._activationStarted = true;
    }
}
export class ExtensionHostCrashTracker {
    constructor() {
        this._recentCrashes = [];
    }
    static { this._TIME_LIMIT = 5 * 60 * 1000; } // 5 minutes
    static { this._CRASH_LIMIT = 3; }
    _removeOldCrashes() {
        const limit = Date.now() - ExtensionHostCrashTracker._TIME_LIMIT;
        while (this._recentCrashes.length > 0 && this._recentCrashes[0].timestamp < limit) {
            this._recentCrashes.shift();
        }
    }
    registerCrash() {
        this._removeOldCrashes();
        this._recentCrashes.push({ timestamp: Date.now() });
    }
    shouldAutomaticallyRestart() {
        this._removeOldCrashes();
        return (this._recentCrashes.length < ExtensionHostCrashTracker._CRASH_LIMIT);
    }
}
/**
 * This can run correctly only on the renderer process because that is the only place
 * where all extension points and all implicit activation events generators are known.
 */
export class ImplicitActivationAwareReader {
    readActivationEvents(extensionDescription) {
        return ImplicitActivationEvents.readActivationEvents(extensionDescription);
    }
}
class ActivationFeatureMarkdowneRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.activationEvents;
    }
    render(manifest) {
        const activationEvents = manifest.activationEvents || [];
        const data = new MarkdownString();
        if (activationEvents.length) {
            for (const activationEvent of activationEvents) {
                data.appendMarkdown(`- \`${activationEvent}\`\n`);
            }
        }
        return {
            data,
            dispose: () => { }
        };
    }
}
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'activationEvents',
    label: nls.localize('activation', "Activation Events"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ActivationFeatureMarkdowneRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vYWJzdHJhY3RFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxJQUFJLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZFQUE2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