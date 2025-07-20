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
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import * as arrays from '../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { GettingStartedInput, gettingStartedInputTypeId } from './gettingStartedInput.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { startupExpContext, StartupExperimentGroup } from '../../../services/coreExperimentation/common/coreExperimentationService.js';
import { AuxiliaryBarMaximizedContext } from '../../../common/contextkeys.js';
export const restoreWalkthroughsConfigurationKey = 'workbench.welcomePage.restorableWalkthroughs';
const configurationKey = 'workbench.startupEditor';
const oldConfigurationKey = 'workbench.welcome.enabled';
const telemetryOptOutStorageKey = 'workbench.telemetryOptOutShown';
let StartupPageEditorResolverContribution = class StartupPageEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.startupPageEditorResolver'; }
    constructor(instantiationService, editorResolverService) {
        super();
        this.instantiationService = instantiationService;
        const disposables = new DisposableStore();
        this._register(disposables);
        editorResolverService.registerEditor(`${GettingStartedInput.RESOURCE.scheme}:/**`, {
            id: GettingStartedInput.ID,
            label: localize('welcome.displayName', "Welcome Page"),
            priority: RegisteredEditorPriority.builtin,
        }, {
            singlePerResource: false,
            canSupportResource: uri => uri.scheme === GettingStartedInput.RESOURCE.scheme,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: disposables.add(this.instantiationService.createInstance(GettingStartedInput, options)),
                    options: {
                        ...options,
                        pinned: false
                    }
                };
            }
        });
    }
};
StartupPageEditorResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorResolverService)
], StartupPageEditorResolverContribution);
export { StartupPageEditorResolverContribution };
let StartupPageRunnerContribution = class StartupPageRunnerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.startupPageRunner'; }
    constructor(configurationService, editorService, fileService, contextService, lifecycleService, layoutService, productService, commandService, environmentService, storageService, logService, notificationService, contextKeyService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.fileService = fileService;
        this.contextService = contextService;
        this.lifecycleService = lifecycleService;
        this.layoutService = layoutService;
        this.productService = productService;
        this.commandService = commandService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.contextKeyService = contextKeyService;
        this.run().then(undefined, onUnexpectedError);
        this._register(this.editorService.onDidCloseEditor((e) => {
            if (e.editor instanceof GettingStartedInput) {
                e.editor.selectedCategory = undefined;
                e.editor.selectedStep = undefined;
            }
        }));
    }
    async run() {
        // Wait for resolving startup editor until we are restored to reduce startup pressure
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        if (AuxiliaryBarMaximizedContext.getValue(this.contextKeyService)) {
            // If the auxiliary bar is maximized, we do not show the welcome page.
            return;
        }
        // Always open Welcome page for first-launch, no matter what is open or which startupEditor is set.
        if (this.productService.enableTelemetry
            && this.productService.showTelemetryOptOut
            && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */
            && !this.environmentService.skipWelcome
            && !this.storageService.get(telemetryOptOutStorageKey, 0 /* StorageScope.PROFILE */)) {
            this.storageService.store(telemetryOptOutStorageKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        if (this.tryOpenWalkthroughForFolder()) {
            return;
        }
        const enabled = isStartupPageEnabled(this.configurationService, this.contextService, this.environmentService, this.logService);
        if (enabled && this.lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            // Open the welcome even if we opened a set of default editors
            if (!this.editorService.activeEditor || this.layoutService.openedDefaultEditors) {
                const startupEditorSetting = this.configurationService.inspect(configurationKey);
                if (startupEditorSetting.value === 'readme') {
                    await this.openReadme();
                }
                else if (startupEditorSetting.value === 'welcomePage' || startupEditorSetting.value === 'welcomePageInEmptyWorkbench') {
                    if (this.storageService.isNew(-1 /* StorageScope.APPLICATION */)) {
                        const startupExpValue = startupExpContext.getValue(this.contextKeyService);
                        if (startupExpValue === StartupExperimentGroup.MaximizedChat || startupExpValue === StartupExperimentGroup.SplitEmptyEditorChat) {
                            return;
                        }
                    }
                    await this.openGettingStarted(true);
                }
                else if (startupEditorSetting.value === 'terminal') {
                    this.commandService.executeCommand("workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */);
                }
            }
        }
    }
    tryOpenWalkthroughForFolder() {
        const toRestore = this.storageService.get(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
        if (!toRestore) {
            return false;
        }
        else {
            const restoreData = JSON.parse(toRestore);
            const currentWorkspace = this.contextService.getWorkspace();
            if (restoreData.folder === UNKNOWN_EMPTY_WINDOW_WORKSPACE.id || restoreData.folder === currentWorkspace.folders[0].uri.toString()) {
                const options = { selectedCategory: restoreData.category, selectedStep: restoreData.step, pinned: false };
                this.editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options
                });
                this.storageService.remove(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
                return true;
            }
        }
        return false;
    }
    async openReadme() {
        const readmes = arrays.coalesce(await Promise.all(this.contextService.getWorkspace().folders.map(async (folder) => {
            const folderUri = folder.uri;
            const folderStat = await this.fileService.resolve(folderUri).catch(onUnexpectedError);
            const files = folderStat?.children ? folderStat.children.map(child => child.name).sort() : [];
            const file = files.find(file => file.toLowerCase() === 'readme.md') || files.find(file => file.toLowerCase().startsWith('readme'));
            if (file) {
                return joinPath(folderUri, file);
            }
            else {
                return undefined;
            }
        })));
        if (!this.editorService.activeEditor) {
            if (readmes.length) {
                const isMarkDown = (readme) => readme.path.toLowerCase().endsWith('.md');
                await Promise.all([
                    this.commandService.executeCommand('markdown.showPreview', null, readmes.filter(isMarkDown), { locked: true }).catch(error => {
                        this.notificationService.error(localize('startupPage.markdownPreviewError', 'Could not open markdown preview: {0}.\n\nPlease make sure the markdown extension is enabled.', error.message));
                    }),
                    this.editorService.openEditors(readmes.filter(readme => !isMarkDown(readme)).map(readme => ({ resource: readme }))),
                ]);
            }
            else {
                // If no readme is found, default to showing the welcome page.
                await this.openGettingStarted();
            }
        }
    }
    async openGettingStarted(showTelemetryNotice) {
        const startupEditorTypeID = gettingStartedInputTypeId;
        const editor = this.editorService.activeEditor;
        // Ensure that the welcome editor won't get opened more than once
        if (editor?.typeId === startupEditorTypeID || this.editorService.editors.some(e => e.typeId === startupEditorTypeID)) {
            return;
        }
        const options = editor ? { pinned: false, index: 0, showTelemetryNotice } : { pinned: false, showTelemetryNotice };
        if (startupEditorTypeID === gettingStartedInputTypeId) {
            this.editorService.openEditor({
                resource: GettingStartedInput.RESOURCE,
                options,
            });
        }
    }
};
StartupPageRunnerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IFileService),
    __param(3, IWorkspaceContextService),
    __param(4, ILifecycleService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IProductService),
    __param(7, ICommandService),
    __param(8, IWorkbenchEnvironmentService),
    __param(9, IStorageService),
    __param(10, ILogService),
    __param(11, INotificationService),
    __param(12, IContextKeyService)
], StartupPageRunnerContribution);
export { StartupPageRunnerContribution };
function isStartupPageEnabled(configurationService, contextService, environmentService, logService) {
    if (environmentService.skipWelcome) {
        return false;
    }
    const startupEditor = configurationService.inspect(configurationKey);
    if (!startupEditor.userValue && !startupEditor.workspaceValue) {
        const welcomeEnabled = configurationService.inspect(oldConfigurationKey);
        if (welcomeEnabled.value !== undefined && welcomeEnabled.value !== null) {
            return welcomeEnabled.value;
        }
    }
    return startupEditor.value === 'welcomePage'
        || startupEditor.value === 'readme'
        || (contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && startupEditor.value === 'welcomePageInEmptyWorkbench')
        || startupEditor.value === 'terminal';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFBhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL3N0YXJ0dXBQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDOUksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUErQixNQUFNLGlEQUFpRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RixPQUFPLEVBQStCLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdkgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FB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