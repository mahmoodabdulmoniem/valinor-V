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
var EditSessionsContribution_1;
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IEditSessionsStorageService, ChangeType, FileType, EDIT_SESSION_SYNC_CATEGORY, EDIT_SESSIONS_CONTAINER_ID, EditSessionSchemaVersion, IEditSessionsLogService, EDIT_SESSIONS_VIEW_ICON, EDIT_SESSIONS_TITLE, EDIT_SESSIONS_SHOW_VIEW, EDIT_SESSIONS_DATA_VIEW_ID, decodeEditSessionFileContent, hashedEditSessionId, editSessionsLogId, EDIT_SESSIONS_PENDING } from '../common/editSessions.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../base/common/uri.js';
import { basename, joinPath, relativePath } from '../../../../base/common/resources.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { EditSessionsWorkbenchService } from './editSessionsStorageService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { UserDataSyncStoreError } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { getFileNamesMessage, IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { Schemas } from '../../../../base/common/network.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { EditSessionsLogService } from '../common/editSessionsLogService.js';
import { Extensions as ViewExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditSessionsDataViews } from './editSessionsViews.js';
import { EditSessionsFileSystemProvider } from './editSessionsFileSystemProvider.js';
import { isNative, isWeb } from '../../../../base/common/platform.js';
import { VirtualWorkspaceContext, WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { equals } from '../../../../base/common/objects.js';
import { EditSessionIdentityMatch, IEditSessionIdentityService } from '../../../../platform/workspace/common/editSessions.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { WorkspaceStateSynchroniser } from '../common/workspaceStateSync.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { EditSessionsStoreClient } from '../common/editSessionsStorageClient.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceIdentityService } from '../../../services/workspaces/common/workspaceIdentityService.js';
import { hashAsync } from '../../../../base/common/hash.js';
import { ResourceSet } from '../../../../base/common/map.js';
registerSingleton(IEditSessionsLogService, EditSessionsLogService, 1 /* InstantiationType.Delayed */);
registerSingleton(IEditSessionsStorageService, EditSessionsWorkbenchService, 1 /* InstantiationType.Delayed */);
const continueWorkingOnCommand = {
    id: '_workbench.editSessions.actions.continueEditSession',
    title: localize2('continue working on', 'Continue Working On...'),
    precondition: WorkspaceFolderCountContext.notEqualsTo('0'),
    f1: true
};
const openLocalFolderCommand = {
    id: '_workbench.editSessions.actions.continueEditSession.openLocalFolder',
    title: localize2('continue edit session in local folder', 'Open In Local Folder'),
    category: EDIT_SESSION_SYNC_CATEGORY,
    precondition: ContextKeyExpr.and(IsWebContext.toNegated(), VirtualWorkspaceContext)
};
const showOutputChannelCommand = {
    id: 'workbench.editSessions.actions.showOutputChannel',
    title: localize2('show log', "Show Log"),
    category: EDIT_SESSION_SYNC_CATEGORY
};
const installAdditionalContinueOnOptionsCommand = {
    id: 'workbench.action.continueOn.extensions',
    title: localize('continueOn.installAdditional', 'Install additional development environment options'),
};
registerAction2(class extends Action2 {
    constructor() {
        super({ ...installAdditionalContinueOnOptionsCommand, f1: false });
    }
    async run(accessor) {
        return accessor.get(IExtensionsWorkbenchService).openSearch('@tag:continueOn');
    }
});
const resumeProgressOptionsTitle = `[${localize('resuming working changes window', 'Resuming working changes...')}](command:${showOutputChannelCommand.id})`;
const resumeProgressOptions = {
    location: 10 /* ProgressLocation.Window */,
    type: 'syncing',
};
const queryParamName = 'editSessionId';
const useEditSessionsWithContinueOn = 'workbench.editSessions.continueOn';
let EditSessionsContribution = class EditSessionsContribution extends Disposable {
    static { EditSessionsContribution_1 = this; }
    static { this.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY = 'applicationLaunchedViaContinueOn'; }
    constructor(editSessionsStorageService, fileService, progressService, openerService, telemetryService, scmService, notificationService, dialogService, logService, environmentService, instantiationService, productService, configurationService, contextService, editSessionIdentityService, quickInputService, commandService, contextKeyService, fileDialogService, lifecycleService, storageService, activityService, editorService, remoteAgentService, extensionService, requestService, userDataProfilesService, uriIdentityService, workspaceIdentityService) {
        super();
        this.editSessionsStorageService = editSessionsStorageService;
        this.fileService = fileService;
        this.progressService = progressService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.scmService = scmService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.editSessionIdentityService = editSessionIdentityService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.fileDialogService = fileDialogService;
        this.lifecycleService = lifecycleService;
        this.storageService = storageService;
        this.activityService = activityService;
        this.editorService = editorService;
        this.remoteAgentService = remoteAgentService;
        this.extensionService = extensionService;
        this.requestService = requestService;
        this.userDataProfilesService = userDataProfilesService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceIdentityService = workspaceIdentityService;
        this.continueEditSessionOptions = [];
        this.accountsMenuBadgeDisposable = this._register(new MutableDisposable());
        this.registeredCommands = new Set();
        this.shouldShowViewsContext = EDIT_SESSIONS_SHOW_VIEW.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext = EDIT_SESSIONS_PENDING.bindTo(this.contextKeyService);
        this.pendingEditSessionsContext.set(false);
        if (!this.productService['editSessions.store']?.url) {
            return;
        }
        this.editSessionsStorageClient = new EditSessionsStoreClient(URI.parse(this.productService['editSessions.store'].url), this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
        this.editSessionsStorageService.storeClient = this.editSessionsStorageClient;
        this.workspaceStateSynchronizer = new WorkspaceStateSynchroniser(this.userDataProfilesService.defaultProfile, undefined, this.editSessionsStorageClient, this.logService, this.fileService, this.environmentService, this.telemetryService, this.configurationService, this.storageService, this.uriIdentityService, this.workspaceIdentityService, this.editSessionsStorageService);
        this.autoResumeEditSession();
        this.registerActions();
        this.registerViews();
        this.registerContributedEditSessionOptions();
        this._register(this.fileService.registerProvider(EditSessionsFileSystemProvider.SCHEMA, new EditSessionsFileSystemProvider(this.editSessionsStorageService)));
        this.lifecycleService.onWillShutdown((e) => {
            if (e.reason !== 3 /* ShutdownReason.RELOAD */ && this.editSessionsStorageService.isSignedIn && this.configurationService.getValue('workbench.experimental.cloudChanges.autoStore') === 'onShutdown' && !isWeb) {
                e.join(this.autoStoreEditSession(), { id: 'autoStoreWorkingChanges', label: localize('autoStoreWorkingChanges', 'Storing current working changes...') });
            }
        });
        this._register(this.editSessionsStorageService.onDidSignIn(() => this.updateAccountsMenuBadge()));
        this._register(this.editSessionsStorageService.onDidSignOut(() => this.updateAccountsMenuBadge()));
    }
    async autoResumeEditSession() {
        const shouldAutoResumeOnReload = this.configurationService.getValue('workbench.cloudChanges.autoResume') === 'onReload';
        if (this.environmentService.editSessionId !== undefined) {
            this.logService.info(`Resuming cloud changes, reason: found editSessionId ${this.environmentService.editSessionId} in environment service...`);
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(this.environmentService.editSessionId, undefined, undefined, undefined, progress).finally(() => this.environmentService.editSessionId = undefined));
        }
        else if (shouldAutoResumeOnReload && this.editSessionsStorageService.isSignedIn) {
            this.logService.info('Resuming cloud changes, reason: cloud changes enabled...');
            // Attempt to resume edit session based on edit workspace identifier
            // Note: at this point if the user is not signed into edit sessions,
            // we don't want them to be prompted to sign in and should just return early
            await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
        }
        else if (shouldAutoResumeOnReload) {
            // The application has previously launched via a protocol URL Continue On flow
            const hasApplicationLaunchedFromContinueOnFlow = this.storageService.getBoolean(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, false);
            this.logService.info(`Prompting to enable cloud changes, has application previously launched from Continue On flow: ${hasApplicationLaunchedFromContinueOnFlow}`);
            const handlePendingEditSessions = () => {
                // display a badge in the accounts menu but do not prompt the user to sign in again
                this.logService.info('Showing badge to enable cloud changes in accounts menu...');
                this.updateAccountsMenuBadge();
                this.pendingEditSessionsContext.set(true);
                // attempt a resume if we are in a pending state and the user just signed in
                const disposable = this.editSessionsStorageService.onDidSignIn(async () => {
                    disposable.dispose();
                    this.logService.info('Showing badge to enable cloud changes in accounts menu succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                    this.storageService.remove(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
                    this.environmentService.continueOn = undefined;
                });
            };
            if ((this.environmentService.continueOn !== undefined) &&
                !this.editSessionsStorageService.isSignedIn &&
                // and user has not yet been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === false) {
                // store the fact that we prompted the user
                this.storageService.store(EditSessionsContribution_1.APPLICATION_LAUNCHED_VIA_CONTINUE_ON_STORAGE_KEY, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                this.logService.info('Prompting to enable cloud changes...');
                await this.editSessionsStorageService.initialize('read');
                if (this.editSessionsStorageService.isSignedIn) {
                    this.logService.info('Prompting to enable cloud changes succeeded, resuming cloud changes...');
                    await this.progressService.withProgress(resumeProgressOptions, async (progress) => await this.resumeEditSession(undefined, true, undefined, undefined, progress));
                }
                else {
                    handlePendingEditSessions();
                }
            }
            else if (!this.editSessionsStorageService.isSignedIn &&
                // and user has been prompted to sign in on this machine
                hasApplicationLaunchedFromContinueOnFlow === true) {
                handlePendingEditSessions();
            }
        }
        else {
            this.logService.debug('Auto resuming cloud changes disabled.');
        }
    }
    updateAccountsMenuBadge() {
        if (this.editSessionsStorageService.isSignedIn) {
            return this.accountsMenuBadgeDisposable.clear();
        }
        const badge = new NumberBadge(1, () => localize('check for pending cloud changes', 'Check for pending cloud changes'));
        this.accountsMenuBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
    }
    async autoStoreEditSession() {
        const cancellationTokenSource = new CancellationTokenSource();
        await this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            type: 'syncing',
            title: localize('store working changes', 'Storing working changes...')
        }, async () => this.storeEditSession(false, cancellationTokenSource.token), () => {
            cancellationTokenSource.cancel();
            cancellationTokenSource.dispose();
        });
    }
    registerViews() {
        const container = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
            id: EDIT_SESSIONS_CONTAINER_ID,
            title: EDIT_SESSIONS_TITLE,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [EDIT_SESSIONS_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
            icon: EDIT_SESSIONS_VIEW_ICON,
            hideIfEmpty: true
        }, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
        this._register(this.instantiationService.createInstance(EditSessionsDataViews, container));
    }
    registerActions() {
        this.registerContinueEditSessionAction();
        this.registerResumeLatestEditSessionAction();
        this.registerStoreLatestEditSessionAction();
        this.registerContinueInLocalFolderAction();
        this.registerShowEditSessionViewAction();
        this.registerShowEditSessionOutputChannelAction();
    }
    registerShowEditSessionOutputChannelAction() {
        this._register(registerAction2(class ShowEditSessionOutput extends Action2 {
            constructor() {
                super(showOutputChannelCommand);
            }
            run(accessor, ...args) {
                const outputChannel = accessor.get(IOutputService);
                void outputChannel.showChannel(editSessionsLogId);
            }
        }));
    }
    registerShowEditSessionViewAction() {
        const that = this;
        this._register(registerAction2(class ShowEditSessionView extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.showEditSessions',
                    title: localize2('show cloud changes', 'Show Cloud Changes'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true
                });
            }
            async run(accessor) {
                that.shouldShowViewsContext.set(true);
                const viewsService = accessor.get(IViewsService);
                await viewsService.openView(EDIT_SESSIONS_DATA_VIEW_ID);
            }
        }));
    }
    registerContinueEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ContinueEditSessionAction extends Action2 {
            constructor() {
                super(continueWorkingOnCommand);
            }
            async run(accessor, workspaceUri, destination) {
                // First ask the user to pick a destination, if necessary
                let uri = workspaceUri;
                if (!destination && !uri) {
                    destination = await that.pickContinueEditSessionDestination();
                    if (!destination) {
                        that.telemetryService.publicLog2('continueOn.editSessions.pick.outcome', { outcome: 'noSelection' });
                        return;
                    }
                }
                // Determine if we need to store an edit session, asking for edit session auth if necessary
                const shouldStoreEditSession = await that.shouldContinueOnWithEditSession();
                // Run the store action to get back a ref
                let ref;
                if (shouldStoreEditSession) {
                    that.telemetryService.publicLog2('continueOn.editSessions.store');
                    const cancellationTokenSource = new CancellationTokenSource();
                    try {
                        ref = await that.progressService.withProgress({
                            location: 15 /* ProgressLocation.Notification */,
                            cancellable: true,
                            type: 'syncing',
                            title: localize('store your working changes', 'Storing your working changes...')
                        }, async () => {
                            const ref = await that.storeEditSession(false, cancellationTokenSource.token);
                            if (ref !== undefined) {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeSucceeded', hashedId: hashedEditSessionId(ref) });
                            }
                            else {
                                that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeSkipped' });
                            }
                            return ref;
                        }, () => {
                            cancellationTokenSource.cancel();
                            cancellationTokenSource.dispose();
                            that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeCancelledByUser' });
                        });
                    }
                    catch (ex) {
                        that.telemetryService.publicLog2('continueOn.editSessions.store.outcome', { outcome: 'storeFailed' });
                        throw ex;
                    }
                }
                // Append the ref to the URI
                uri = destination ? await that.resolveDestination(destination) : uri;
                if (uri === undefined) {
                    return;
                }
                if (ref !== undefined && uri !== 'noDestinationUri') {
                    const encodedRef = encodeURIComponent(ref);
                    uri = uri.with({
                        query: uri.query.length > 0 ? (uri.query + `&${queryParamName}=${encodedRef}&continueOn=1`) : `${queryParamName}=${encodedRef}&continueOn=1`
                    });
                    // Open the URI
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if ((!shouldStoreEditSession || ref === undefined) && uri !== 'noDestinationUri') {
                    // Open the URI without an edit session ref
                    that.logService.info(`Opening ${uri.toString()}`);
                    await that.openerService.open(uri, { openExternal: true });
                }
                else if (ref === undefined && shouldStoreEditSession) {
                    that.logService.warn(`Failed to store working changes when invoking ${continueWorkingOnCommand.id}.`);
                }
            }
        }));
    }
    registerResumeLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeLatest',
                    title: localize2('resume latest cloud changes', 'Resume Latest Changes from Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor, editSessionId, forceApplyUnrelatedChange) {
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, forceApplyUnrelatedChange));
            }
        }));
        this._register(registerAction2(class ResumeLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.resumeFromSerializedPayload',
                    title: localize2('resume cloud changes', 'Resume Changes from Serialized Data'),
                    category: 'Developer',
                    f1: true,
                });
            }
            async run(accessor, editSessionId) {
                const data = await that.quickInputService.input({ prompt: 'Enter serialized data' });
                if (data) {
                    that.editSessionsStorageService.lastReadResources.set('editSessions', { content: data, ref: '' });
                }
                await that.progressService.withProgress({ ...resumeProgressOptions, title: resumeProgressOptionsTitle }, async () => await that.resumeEditSession(editSessionId, undefined, undefined, undefined, undefined, data));
            }
        }));
    }
    registerStoreLatestEditSessionAction() {
        const that = this;
        this._register(registerAction2(class StoreLatestEditSessionAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.editSessions.actions.storeCurrent',
                    title: localize2('store working changes in cloud', 'Store Working Changes in Cloud'),
                    category: EDIT_SESSION_SYNC_CATEGORY,
                    f1: true,
                });
            }
            async run(accessor) {
                const cancellationTokenSource = new CancellationTokenSource();
                await that.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('storing working changes', 'Storing working changes...')
                }, async () => {
                    that.telemetryService.publicLog2('editSessions.store');
                    await that.storeEditSession(true, cancellationTokenSource.token);
                }, () => {
                    cancellationTokenSource.cancel();
                    cancellationTokenSource.dispose();
                });
            }
        }));
    }
    async resumeEditSession(ref, silent, forceApplyUnrelatedChange, applyPartialMatch, progress, serializedData) {
        // Wait for the remote environment to become available, if any
        await this.remoteAgentService.getEnvironment();
        // Edit sessions are not currently supported in empty workspaces
        // https://github.com/microsoft/vscode/issues/159220
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return;
        }
        this.logService.info(ref !== undefined ? `Resuming changes from cloud with ref ${ref}...` : 'Checking for pending cloud changes...');
        if (silent && !(await this.editSessionsStorageService.initialize('read', true))) {
            return;
        }
        this.telemetryService.publicLog2('editSessions.resume');
        performance.mark('code/willResumeEditSessionFromIdentifier');
        progress?.report({ message: localize('checkingForWorkingChanges', 'Checking for pending cloud changes...') });
        const data = serializedData ? { content: serializedData, ref: '' } : await this.editSessionsStorageService.read('editSessions', ref);
        if (!data) {
            if (ref === undefined && !silent) {
                this.notificationService.info(localize('no cloud changes', 'There are no changes to resume from the cloud.'));
            }
            else if (ref !== undefined) {
                this.notificationService.warn(localize('no cloud changes for ref', 'Could not resume changes from the cloud for ID {0}.', ref));
            }
            this.logService.info(ref !== undefined ? `Aborting resuming changes from cloud as no edit session content is available to be applied from ref ${ref}.` : `Aborting resuming edit session as no edit session content is available to be applied`);
            return;
        }
        progress?.report({ message: resumeProgressOptionsTitle });
        const editSession = JSON.parse(data.content);
        ref = data.ref;
        if (editSession.version > EditSessionSchemaVersion) {
            this.notificationService.error(localize('client too old', "Please upgrade to a newer version of {0} to resume your working changes from the cloud.", this.productService.nameLong));
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'clientUpdateNeeded' });
            return;
        }
        try {
            const { changes, conflictingChanges } = await this.generateChanges(editSession, ref, forceApplyUnrelatedChange, applyPartialMatch);
            if (changes.length === 0) {
                return;
            }
            // TODO@joyceerhl Provide the option to diff files which would be overwritten by edit session contents
            if (conflictingChanges.length > 0) {
                // Allow to show edit sessions
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Warning,
                    message: conflictingChanges.length > 1 ?
                        localize('resume edit session warning many', 'Resuming your working changes from the cloud will overwrite the following {0} files. Do you want to proceed?', conflictingChanges.length) :
                        localize('resume edit session warning 1', 'Resuming your working changes from the cloud will overwrite {0}. Do you want to proceed?', basename(conflictingChanges[0].uri)),
                    detail: conflictingChanges.length > 1 ? getFileNamesMessage(conflictingChanges.map((c) => c.uri)) : undefined
                });
                if (!confirmed) {
                    return;
                }
            }
            for (const { uri, type, contents } of changes) {
                if (type === ChangeType.Addition) {
                    await this.fileService.writeFile(uri, decodeEditSessionFileContent(editSession.version, contents));
                }
                else if (type === ChangeType.Deletion && await this.fileService.exists(uri)) {
                    await this.fileService.del(uri);
                }
            }
            await this.workspaceStateSynchronizer?.apply();
            this.logService.info(`Deleting edit session with ref ${ref} after successfully applying it to current workspace...`);
            await this.editSessionsStorageService.delete('editSessions', ref);
            this.logService.info(`Deleted edit session with ref ${ref}.`);
            this.telemetryService.publicLog2('editSessions.resume.outcome', { hashedId: hashedEditSessionId(ref), outcome: 'resumeSucceeded' });
        }
        catch (ex) {
            this.logService.error('Failed to resume edit session, reason: ', ex.toString());
            this.notificationService.error(localize('resume failed', "Failed to resume your working changes from the cloud."));
        }
        performance.mark('code/didResumeEditSessionFromIdentifier');
    }
    async generateChanges(editSession, ref, forceApplyUnrelatedChange = false, applyPartialMatch = false) {
        const changes = [];
        const conflictingChanges = [];
        const workspaceFolders = this.contextService.getWorkspace().folders;
        const cancellationTokenSource = new CancellationTokenSource();
        for (const folder of editSession.folders) {
            let folderRoot;
            if (folder.canonicalIdentity) {
                // Look for an edit session identifier that we can use
                for (const f of workspaceFolders) {
                    const identity = await this.editSessionIdentityService.getEditSessionIdentifier(f, cancellationTokenSource.token);
                    this.logService.info(`Matching identity ${identity} against edit session folder identity ${folder.canonicalIdentity}...`);
                    if (equals(identity, folder.canonicalIdentity) || forceApplyUnrelatedChange) {
                        folderRoot = f;
                        break;
                    }
                    if (identity !== undefined) {
                        const match = await this.editSessionIdentityService.provideEditSessionIdentityMatch(f, identity, folder.canonicalIdentity, cancellationTokenSource.token);
                        if (match === EditSessionIdentityMatch.Complete) {
                            folderRoot = f;
                            break;
                        }
                        else if (match === EditSessionIdentityMatch.Partial &&
                            this.configurationService.getValue('workbench.experimental.cloudChanges.partialMatches.enabled') === true) {
                            if (!applyPartialMatch) {
                                // Surface partially matching edit session
                                this.notificationService.prompt(Severity.Info, localize('editSessionPartialMatch', 'You have pending working changes in the cloud for this workspace. Would you like to resume them?'), [{ label: localize('resume', 'Resume'), run: () => this.resumeEditSession(ref, false, undefined, true) }]);
                            }
                            else {
                                folderRoot = f;
                                break;
                            }
                        }
                    }
                }
            }
            else {
                folderRoot = workspaceFolders.find((f) => f.name === folder.name);
            }
            if (!folderRoot) {
                this.logService.info(`Skipping applying ${folder.workingChanges.length} changes from edit session with ref ${ref} as no matching workspace folder was found.`);
                return { changes: [], conflictingChanges: [], contributedStateHandlers: [] };
            }
            const localChanges = new Set();
            for (const repository of this.scmService.repositories) {
                if (repository.provider.rootUri !== undefined &&
                    this.contextService.getWorkspaceFolder(repository.provider.rootUri)?.name === folder.name) {
                    const repositoryChanges = this.getChangedResources(repository);
                    repositoryChanges.forEach((change) => localChanges.add(change.toString()));
                }
            }
            for (const change of folder.workingChanges) {
                const uri = joinPath(folderRoot.uri, change.relativeFilePath);
                changes.push({ uri, type: change.type, contents: change.contents });
                if (await this.willChangeLocalContents(localChanges, uri, change)) {
                    conflictingChanges.push({ uri, type: change.type, contents: change.contents });
                }
            }
        }
        return { changes, conflictingChanges };
    }
    async willChangeLocalContents(localChanges, uriWithIncomingChanges, incomingChange) {
        if (!localChanges.has(uriWithIncomingChanges.toString())) {
            return false;
        }
        const { contents, type } = incomingChange;
        switch (type) {
            case (ChangeType.Addition): {
                const [originalContents, incomingContents] = await Promise.all([
                    hashAsync(contents),
                    hashAsync(encodeBase64((await this.fileService.readFile(uriWithIncomingChanges)).value))
                ]);
                return originalContents !== incomingContents;
            }
            case (ChangeType.Deletion): {
                return await this.fileService.exists(uriWithIncomingChanges);
            }
            default:
                throw new Error('Unhandled change type.');
        }
    }
    async storeEditSession(fromStoreCommand, cancellationToken) {
        const folders = [];
        let editSessionSize = 0;
        let hasEdits = false;
        // Save all saveable editors before building edit session contents
        await this.editorService.saveAll();
        // Do a first pass over all repositories to ensure that the edit session identity is created for each.
        // This may change the working changes that need to be stored later
        const createdEditSessionIdentities = new ResourceSet();
        for (const repository of this.scmService.repositories) {
            const changedResources = this.getChangedResources(repository);
            if (!changedResources.size) {
                continue;
            }
            for (const uri of changedResources) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(uri);
                if (!workspaceFolder || createdEditSessionIdentities.has(uri)) {
                    continue;
                }
                createdEditSessionIdentities.add(uri);
                await this.editSessionIdentityService.onWillCreateEditSessionIdentity(workspaceFolder, cancellationToken);
            }
        }
        for (const repository of this.scmService.repositories) {
            // Look through all resource groups and compute which files were added/modified/deleted
            const trackedUris = this.getChangedResources(repository); // A URI might appear in more than one resource group
            const workingChanges = [];
            const { rootUri } = repository.provider;
            const workspaceFolder = rootUri ? this.contextService.getWorkspaceFolder(rootUri) : undefined;
            let name = workspaceFolder?.name;
            for (const uri of trackedUris) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(uri);
                if (!workspaceFolder) {
                    this.logService.info(`Skipping working change ${uri.toString()} as no associated workspace folder was found.`);
                    continue;
                }
                name = name ?? workspaceFolder.name;
                const relativeFilePath = relativePath(workspaceFolder.uri, uri) ?? uri.path;
                // Only deal with file contents for now
                try {
                    if (!(await this.fileService.stat(uri)).isFile) {
                        continue;
                    }
                }
                catch { }
                hasEdits = true;
                if (await this.fileService.exists(uri)) {
                    const contents = encodeBase64((await this.fileService.readFile(uri)).value);
                    editSessionSize += contents.length;
                    if (editSessionSize > this.editSessionsStorageService.SIZE_LIMIT) {
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        return undefined;
                    }
                    workingChanges.push({ type: ChangeType.Addition, fileType: FileType.File, contents: contents, relativeFilePath: relativeFilePath });
                }
                else {
                    // Assume it's a deletion
                    workingChanges.push({ type: ChangeType.Deletion, fileType: FileType.File, contents: undefined, relativeFilePath: relativeFilePath });
                }
            }
            let canonicalIdentity = undefined;
            if (workspaceFolder !== null && workspaceFolder !== undefined) {
                canonicalIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            }
            // TODO@joyceerhl debt: don't store working changes as a child of the folder
            folders.push({ workingChanges, name: name ?? '', canonicalIdentity: canonicalIdentity ?? undefined, absoluteUri: workspaceFolder?.uri.toString() });
        }
        // Store contributed workspace state
        await this.workspaceStateSynchronizer?.sync();
        if (!hasEdits) {
            this.logService.info('Skipped storing working changes in the cloud as there are no edits to store.');
            if (fromStoreCommand) {
                this.notificationService.info(localize('no working changes to store', 'Skipped storing working changes in the cloud as there are no edits to store.'));
            }
            return undefined;
        }
        const data = { folders, version: 2, workspaceStateId: this.editSessionsStorageService.lastWrittenResources.get('workspaceState')?.ref };
        try {
            this.logService.info(`Storing edit session...`);
            const ref = await this.editSessionsStorageService.write('editSessions', data);
            this.logService.info(`Stored edit session with ref ${ref}.`);
            return ref;
        }
        catch (ex) {
            this.logService.error(`Failed to store edit session, reason: `, ex.toString());
            if (ex instanceof UserDataSyncStoreError) {
                switch (ex.code) {
                    case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
                        // Uploading a payload can fail due to server size limits
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'TooLarge' });
                        this.notificationService.error(localize('payload too large', 'Your working changes exceed the size limit and cannot be stored.'));
                        break;
                    default:
                        this.telemetryService.publicLog2('editSessions.upload.failed', { reason: 'unknown' });
                        this.notificationService.error(localize('payload failed', 'Your working changes cannot be stored.'));
                        break;
                }
            }
        }
        return undefined;
    }
    getChangedResources(repository) {
        return repository.provider.groups.reduce((resources, resourceGroups) => {
            resourceGroups.resources.forEach((resource) => resources.add(resource.sourceUri));
            return resources;
        }, new Set()); // A URI might appear in more than one resource group
    }
    hasEditSession() {
        for (const repository of this.scmService.repositories) {
            if (this.getChangedResources(repository).size > 0) {
                return true;
            }
        }
        return false;
    }
    async shouldContinueOnWithEditSession() {
        // If the user is already signed in, we should store edit session
        if (this.editSessionsStorageService.isSignedIn) {
            return this.hasEditSession();
        }
        // If the user has been asked before and said no, don't use edit sessions
        if (this.configurationService.getValue(useEditSessionsWithContinueOn) === 'off') {
            this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'disabledEditSessionsViaSetting' });
            return false;
        }
        // Prompt the user to use edit sessions if they currently could benefit from using it
        if (this.hasEditSession()) {
            const disposables = new DisposableStore();
            const quickpick = disposables.add(this.quickInputService.createQuickPick());
            quickpick.placeholder = localize('continue with cloud changes', "Select whether to bring your working changes with you");
            quickpick.ok = false;
            quickpick.ignoreFocusOut = true;
            const withCloudChanges = { label: localize('with cloud changes', "Yes, continue with my working changes") };
            const withoutCloudChanges = { label: localize('without cloud changes', "No, continue without my working changes") };
            quickpick.items = [withCloudChanges, withoutCloudChanges];
            const continueWithCloudChanges = await new Promise((resolve, reject) => {
                disposables.add(quickpick.onDidAccept(() => {
                    resolve(quickpick.selectedItems[0] === withCloudChanges);
                    disposables.dispose();
                }));
                disposables.add(quickpick.onDidHide(() => {
                    reject(new CancellationError());
                    disposables.dispose();
                }));
                quickpick.show();
            });
            if (!continueWithCloudChanges) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'didNotEnableEditSessionsWhenPrompted' });
                return continueWithCloudChanges;
            }
            const initialized = await this.editSessionsStorageService.initialize('write');
            if (!initialized) {
                this.telemetryService.publicLog2('continueOn.editSessions.canStore.outcome', { outcome: 'didNotEnableEditSessionsWhenPrompted' });
            }
            return initialized;
        }
        return false;
    }
    //#region Continue Edit Session extension contribution point
    registerContributedEditSessionOptions() {
        continueEditSessionExtPoint.setHandler(extensions => {
            const continueEditSessionOptions = [];
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'contribEditSessions')) {
                    continue;
                }
                if (!Array.isArray(extension.value)) {
                    continue;
                }
                for (const contribution of extension.value) {
                    const command = MenuRegistry.getCommand(contribution.command);
                    if (!command) {
                        return;
                    }
                    const icon = command.icon;
                    const title = typeof command.title === 'string' ? command.title : command.title.value;
                    const when = ContextKeyExpr.deserialize(contribution.when);
                    continueEditSessionOptions.push(new ContinueEditSessionItem(ThemeIcon.isThemeIcon(icon) ? `$(${icon.id}) ${title}` : title, command.id, command.source?.title, when, contribution.documentation));
                    if (contribution.qualifiedName) {
                        this.generateStandaloneOptionCommand(command.id, contribution.qualifiedName, contribution.category ?? command.category, when, contribution.remoteGroup);
                    }
                }
            }
            this.continueEditSessionOptions = continueEditSessionOptions;
        });
    }
    generateStandaloneOptionCommand(commandId, qualifiedName, category, when, remoteGroup) {
        const command = {
            id: `${continueWorkingOnCommand.id}.${commandId}`,
            title: { original: qualifiedName, value: qualifiedName },
            category: typeof category === 'string' ? { original: category, value: category } : category,
            precondition: when,
            f1: true
        };
        if (!this.registeredCommands.has(command.id)) {
            this.registeredCommands.add(command.id);
            this._register(registerAction2(class StandaloneContinueOnOption extends Action2 {
                constructor() {
                    super(command);
                }
                async run(accessor) {
                    return accessor.get(ICommandService).executeCommand(continueWorkingOnCommand.id, undefined, commandId);
                }
            }));
            if (remoteGroup !== undefined) {
                MenuRegistry.appendMenuItem(MenuId.StatusBarRemoteIndicatorMenu, {
                    group: remoteGroup,
                    command: command,
                    when: command.precondition
                });
            }
        }
    }
    registerContinueInLocalFolderAction() {
        const that = this;
        this._register(registerAction2(class ContinueInLocalFolderAction extends Action2 {
            constructor() {
                super(openLocalFolderCommand);
            }
            async run(accessor) {
                const selection = await that.fileDialogService.showOpenDialog({
                    title: localize('continueEditSession.openLocalFolder.title.v2', 'Select a local folder to continue working in'),
                    canSelectFolders: true,
                    canSelectMany: false,
                    canSelectFiles: false,
                    availableFileSystems: [Schemas.file]
                });
                return selection?.length !== 1 ? undefined : URI.from({
                    scheme: that.productService.urlProtocol,
                    authority: Schemas.file,
                    path: selection[0].path
                });
            }
        }));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            this.generateStandaloneOptionCommand(openLocalFolderCommand.id, localize('continueWorkingOn.existingLocalFolder', 'Continue Working in Existing Local Folder'), undefined, openLocalFolderCommand.precondition, undefined);
        }
    }
    async pickContinueEditSessionDestination() {
        const disposables = new DisposableStore();
        const quickPick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const workspaceContext = this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */
            ? this.contextService.getWorkspace().folders[0].name
            : this.contextService.getWorkspace().folders.map((folder) => folder.name).join(', ');
        quickPick.placeholder = localize('continueEditSessionPick.title.v2', "Select a development environment to continue working on {0} in", `'${workspaceContext}'`);
        quickPick.items = this.createPickItems();
        this.extensionService.onDidChangeExtensions(() => {
            quickPick.items = this.createPickItems();
        });
        const command = await new Promise((resolve, reject) => {
            disposables.add(quickPick.onDidHide(() => {
                disposables.dispose();
                resolve(undefined);
            }));
            disposables.add(quickPick.onDidAccept((e) => {
                const selection = quickPick.activeItems[0].command;
                if (selection === installAdditionalContinueOnOptionsCommand.id) {
                    void this.commandService.executeCommand(installAdditionalContinueOnOptionsCommand.id);
                }
                else {
                    resolve(selection);
                    quickPick.hide();
                }
            }));
            quickPick.show();
            disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
                if (e.item.documentation !== undefined) {
                    const uri = URI.isUri(e.item.documentation) ? URI.parse(e.item.documentation) : await this.commandService.executeCommand(e.item.documentation);
                    void this.openerService.open(uri, { openExternal: true });
                }
            }));
        });
        quickPick.dispose();
        return command;
    }
    async resolveDestination(command) {
        try {
            const uri = await this.commandService.executeCommand(command);
            // Some continue on commands do not return a URI
            // to support extensions which want to be in control
            // of how the destination is opened
            if (uri === undefined) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'noDestinationUri' });
                return 'noDestinationUri';
            }
            if (URI.isUri(uri)) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'resolvedUri' });
                return uri;
            }
            this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'invalidDestination' });
            return undefined;
        }
        catch (ex) {
            if (ex instanceof CancellationError) {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'cancelled' });
            }
            else {
                this.telemetryService.publicLog2('continueOn.openDestination.outcome', { selection: command, outcome: 'unknownError' });
            }
            return undefined;
        }
    }
    createPickItems() {
        const items = [...this.continueEditSessionOptions].filter((option) => option.when === undefined || this.contextKeyService.contextMatchesRules(option.when));
        if (getVirtualWorkspaceLocation(this.contextService.getWorkspace()) !== undefined && isNative) {
            items.push(new ContinueEditSessionItem('$(folder) ' + localize('continueEditSessionItem.openInLocalFolder.v2', 'Open in Local Folder'), openLocalFolderCommand.id, localize('continueEditSessionItem.builtin', 'Built-in')));
        }
        const sortedItems = items.sort((item1, item2) => item1.label.localeCompare(item2.label));
        return sortedItems.concat({ type: 'separator' }, new ContinueEditSessionItem(installAdditionalContinueOnOptionsCommand.title, installAdditionalContinueOnOptionsCommand.id));
    }
};
EditSessionsContribution = EditSessionsContribution_1 = __decorate([
    __param(0, IEditSessionsStorageService),
    __param(1, IFileService),
    __param(2, IProgressService),
    __param(3, IOpenerService),
    __param(4, ITelemetryService),
    __param(5, ISCMService),
    __param(6, INotificationService),
    __param(7, IDialogService),
    __param(8, IEditSessionsLogService),
    __param(9, IEnvironmentService),
    __param(10, IInstantiationService),
    __param(11, IProductService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IEditSessionIdentityService),
    __param(15, IQuickInputService),
    __param(16, ICommandService),
    __param(17, IContextKeyService),
    __param(18, IFileDialogService),
    __param(19, ILifecycleService),
    __param(20, IStorageService),
    __param(21, IActivityService),
    __param(22, IEditorService),
    __param(23, IRemoteAgentService),
    __param(24, IExtensionService),
    __param(25, IRequestService),
    __param(26, IUserDataProfilesService),
    __param(27, IUriIdentityService),
    __param(28, IWorkspaceIdentityService)
], EditSessionsContribution);
export { EditSessionsContribution };
const infoButtonClass = ThemeIcon.asClassName(Codicon.info);
class ContinueEditSessionItem {
    constructor(label, command, description, when, documentation) {
        this.label = label;
        this.command = command;
        this.description = description;
        this.when = when;
        this.documentation = documentation;
        if (documentation !== undefined) {
            this.buttons = [{
                    iconClass: infoButtonClass,
                    tooltip: localize('learnMoreTooltip', 'Learn More'),
                }];
        }
    }
}
const continueEditSessionExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'continueEditSession',
    jsonSchema: {
        description: localize('continueEditSessionExtPoint', 'Contributes options for continuing the current edit session in a different environment'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                command: {
                    description: localize('continueEditSessionExtPoint.command', 'Identifier of the command to execute. The command must be declared in the \'commands\'-section and return a URI representing a different environment where the current edit session can be continued.'),
                    type: 'string'
                },
                group: {
                    description: localize('continueEditSessionExtPoint.group', 'Group into which this item belongs.'),
                    type: 'string'
                },
                qualifiedName: {
                    description: localize('continueEditSessionExtPoint.qualifiedName', 'A fully qualified name for this item which is used for display in menus.'),
                    type: 'string'
                },
                description: {
                    description: localize('continueEditSessionExtPoint.description', "The url, or a command that returns the url, to the option's documentation page."),
                    type: 'string'
                },
                remoteGroup: {
                    description: localize('continueEditSessionExtPoint.remoteGroup', 'Group into which this item belongs in the remote indicator.'),
                    type: 'string'
                },
                when: {
                    description: localize('continueEditSessionExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                }
            },
            required: ['command']
        }
    }
});
//#endregion
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(EditSessionsContribution, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...workbenchConfigurationNodeBase,
    'properties': {
        'workbench.experimental.cloudChanges.autoStore': {
            enum: ['onShutdown', 'off'],
            enumDescriptions: [
                localize('autoStoreWorkingChanges.onShutdown', "Automatically store current working changes in the cloud on window close."),
                localize('autoStoreWorkingChanges.off', "Never attempt to automatically store working changes in the cloud.")
            ],
            'type': 'string',
            'tags': ['experimental', 'usesOnlineServices'],
            'default': 'off',
            'markdownDescription': localize('autoStoreWorkingChangesDescription', "Controls whether to automatically store available working changes in the cloud for the current workspace. This setting has no effect in the web."),
        },
        'workbench.cloudChanges.autoResume': {
            enum: ['onReload', 'off'],
            enumDescriptions: [
                localize('autoResumeWorkingChanges.onReload', "Automatically resume available working changes from the cloud on window reload."),
                localize('autoResumeWorkingChanges.off', "Never attempt to resume working changes from the cloud.")
            ],
            'type': 'string',
            'tags': ['usesOnlineServices'],
            'default': 'onReload',
            'markdownDescription': localize('autoResumeWorkingChanges', "Controls whether to automatically resume available working changes stored in the cloud for the current workspace."),
        },
        'workbench.cloudChanges.continueOn': {
            enum: ['prompt', 'off'],
            enumDescriptions: [
                localize('continueOnCloudChanges.promptForAuth', 'Prompt the user to sign in to store working changes in the cloud with Continue Working On.'),
                localize('continueOnCloudChanges.off', 'Do not store working changes in the cloud with Continue Working On unless the user has already turned on Cloud Changes.')
            ],
            type: 'string',
            tags: ['usesOnlineServices'],
            default: 'prompt',
            markdownDescription: localize('continueOnCloudChanges', 'Controls whether to prompt the user to store working changes in the cloud when using Continue Working On.')
        },
        'workbench.experimental.cloudChanges.partialMatches.enabled': {
            'type': 'boolean',
            'tags': ['experimental', 'usesOnlineServices'],
            'default': false,
            'markdownDescription': localize('cloudChangesPartialMatchesEnabled', "Controls whether to surface cloud changes which partially match the current session.")
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL2Jyb3dzZXIvZWRpdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RyxPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBMEIsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQyxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFakksT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsMkJBQTJCLEVBQVUsVUFBVSxFQUF1QixRQUFRLEVBQUUsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsd0JBQXdCLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsNEJBQTRCLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0YSxPQUFPLEVBQWtCLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMx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