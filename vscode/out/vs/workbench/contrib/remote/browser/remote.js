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
import './media/remoteViewlet.css';
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { URI } from '../../../../base/common/uri.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { FilterViewPaneContainer } from '../../../browser/parts/views/viewsViewlet.js';
import { VIEWLET_ID } from './remoteExplorer.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions, IViewDescriptorService } from '../../../common/views.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { ReloadWindowAction } from '../../../browser/actions/windowActions.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { SwitchRemoteViewItem } from './explorerViewItems.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import * as icons from './remoteIcons.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
import { getRemoteName } from '../../../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWalkthroughsService } from '../../welcomeGettingStarted/browser/gettingStartedService.js';
import { Schemas } from '../../../../base/common/network.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class HelpTreeVirtualDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return 'HelpItemTemplate';
    }
}
class HelpTreeRenderer {
    constructor() {
        this.templateId = 'HelpItemTemplate';
    }
    renderTemplate(container) {
        container.classList.add('remote-help-tree-node-item');
        const icon = dom.append(container, dom.$('.remote-help-tree-node-item-icon'));
        const parent = container;
        return { parent, icon };
    }
    renderElement(element, index, templateData) {
        const container = templateData.parent;
        dom.append(container, templateData.icon);
        templateData.icon.classList.add(...element.element.iconClasses);
        const labelContainer = dom.append(container, dom.$('.help-item-label'));
        labelContainer.innerText = element.element.label;
    }
    disposeTemplate(templateData) {
    }
}
class HelpDataSource {
    hasChildren(element) {
        return element instanceof HelpModel;
    }
    getChildren(element) {
        if (element instanceof HelpModel && element.items) {
            return element.items;
        }
        return [];
    }
}
class HelpModel extends Disposable {
    constructor(viewModel, openerService, quickInputService, commandService, remoteExplorerService, environmentService, workspaceContextService, walkthroughsService) {
        super();
        this.viewModel = viewModel;
        this.openerService = openerService;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
        this.updateItems();
        this._register(viewModel.onDidChangeHelpInformation(() => this.updateItems()));
    }
    createHelpItemValue(info, infoKey) {
        return new HelpItemValue(this.commandService, this.walkthroughsService, info.extensionDescription, (typeof info.remoteName === 'string') ? [info.remoteName] : info.remoteName, info.virtualWorkspace, info[infoKey]);
    }
    updateItems() {
        const helpItems = [];
        const getStarted = this.viewModel.helpInformation.filter(info => info.getStarted);
        if (getStarted.length) {
            const helpItemValues = getStarted.map((info) => this.createHelpItemValue(info, 'getStarted'));
            const getStartedHelpItem = this.items?.find(item => item.icon === icons.getStartedIcon) ?? new GetStartedHelpItem(icons.getStartedIcon, nls.localize('remote.help.getStarted', "Get Started"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService, this.commandService);
            getStartedHelpItem.values = helpItemValues;
            helpItems.push(getStartedHelpItem);
        }
        const documentation = this.viewModel.helpInformation.filter(info => info.documentation);
        if (documentation.length) {
            const helpItemValues = documentation.map((info) => this.createHelpItemValue(info, 'documentation'));
            const documentationHelpItem = this.items?.find(item => item.icon === icons.documentationIcon) ?? new HelpItem(icons.documentationIcon, nls.localize('remote.help.documentation', "Read Documentation"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            documentationHelpItem.values = helpItemValues;
            helpItems.push(documentationHelpItem);
        }
        const issues = this.viewModel.helpInformation.filter(info => info.issues);
        if (issues.length) {
            const helpItemValues = issues.map((info) => this.createHelpItemValue(info, 'issues'));
            const reviewIssuesHelpItem = this.items?.find(item => item.icon === icons.reviewIssuesIcon) ?? new HelpItem(icons.reviewIssuesIcon, nls.localize('remote.help.issues', "Review Issues"), helpItemValues, this.quickInputService, this.environmentService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            reviewIssuesHelpItem.values = helpItemValues;
            helpItems.push(reviewIssuesHelpItem);
        }
        if (helpItems.length) {
            const helpItemValues = this.viewModel.helpInformation.map(info => this.createHelpItemValue(info, 'reportIssue'));
            const issueReporterItem = this.items?.find(item => item.icon === icons.reportIssuesIcon) ?? new IssueReporterItem(icons.reportIssuesIcon, nls.localize('remote.help.report', "Report Issue"), helpItemValues, this.quickInputService, this.environmentService, this.commandService, this.openerService, this.remoteExplorerService, this.workspaceContextService);
            issueReporterItem.values = helpItemValues;
            helpItems.push(issueReporterItem);
        }
        if (helpItems.length) {
            this.items = helpItems;
        }
    }
}
class HelpItemValue {
    constructor(commandService, walkthroughService, extensionDescription, remoteAuthority, virtualWorkspace, urlOrCommandOrId) {
        this.commandService = commandService;
        this.walkthroughService = walkthroughService;
        this.extensionDescription = extensionDescription;
        this.remoteAuthority = remoteAuthority;
        this.virtualWorkspace = virtualWorkspace;
        this.urlOrCommandOrId = urlOrCommandOrId;
    }
    get description() {
        return this.getUrl().then(() => this._description);
    }
    get url() {
        return this.getUrl();
    }
    async getUrl() {
        if (this._url === undefined) {
            if (typeof this.urlOrCommandOrId === 'string') {
                const url = URI.parse(this.urlOrCommandOrId);
                if (url.authority) {
                    this._url = this.urlOrCommandOrId;
                }
                else {
                    const urlCommand = this.commandService.executeCommand(this.urlOrCommandOrId).then((result) => {
                        // if executing this command times out, cache its value whenever it eventually resolves
                        this._url = result;
                        return this._url;
                    });
                    // We must be defensive. The command may never return, meaning that no help at all is ever shown!
                    const emptyString = new Promise(resolve => setTimeout(() => resolve(''), 500));
                    this._url = await Promise.race([urlCommand, emptyString]);
                }
            }
            else if (this.urlOrCommandOrId?.id) {
                try {
                    const walkthroughId = `${this.extensionDescription.id}#${this.urlOrCommandOrId.id}`;
                    const walkthrough = await this.walkthroughService.getWalkthrough(walkthroughId);
                    this._description = walkthrough.title;
                    this._url = walkthroughId;
                }
                catch { }
            }
        }
        if (this._url === undefined) {
            this._url = '';
        }
        return this._url;
    }
}
class HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService) {
        this.icon = icon;
        this.label = label;
        this.values = values;
        this.quickInputService = quickInputService;
        this.environmentService = environmentService;
        this.remoteExplorerService = remoteExplorerService;
        this.workspaceContextService = workspaceContextService;
        this.iconClasses = [];
        this.iconClasses.push(...ThemeIcon.asClassNameArray(icon));
        this.iconClasses.push('remote-help-tree-node-item-icon');
    }
    async getActions() {
        return (await Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: await value.description ?? await value.url,
                url: await value.url,
                extensionDescription: value.extensionDescription
            };
        }))).filter(item => item.description);
    }
    async handleClick() {
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                if (remoteAuthority.startsWith(this.remoteExplorerService.targetType[i])) {
                    for (const value of this.values) {
                        if (value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (remoteAuthority.startsWith(authority)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        else {
            const virtualWorkspace = getVirtualWorkspaceLocation(this.workspaceContextService.getWorkspace())?.scheme;
            if (virtualWorkspace) {
                for (let i = 0; i < this.remoteExplorerService.targetType.length; i++) {
                    for (const value of this.values) {
                        if (value.virtualWorkspace && value.remoteAuthority) {
                            for (const authority of value.remoteAuthority) {
                                if (this.remoteExplorerService.targetType[i].startsWith(authority) && virtualWorkspace.startsWith(value.virtualWorkspace)) {
                                    await this.takeAction(value.extensionDescription, await value.url);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (this.values.length > 1) {
            const actions = await this.getActions();
            if (actions.length) {
                const action = await this.quickInputService.pick(actions, { placeHolder: nls.localize('pickRemoteExtension', "Select url to open") });
                if (action) {
                    await this.takeAction(action.extensionDescription, action.url);
                }
            }
        }
        else {
            await this.takeAction(this.values[0].extensionDescription, await this.values[0].url);
        }
    }
}
class GetStartedHelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService, commandService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
        this.commandService = commandService;
    }
    async takeAction(extensionDescription, urlOrWalkthroughId) {
        if ([Schemas.http, Schemas.https].includes(URI.parse(urlOrWalkthroughId).scheme)) {
            this.openerService.open(urlOrWalkthroughId, { allowCommands: true });
            return;
        }
        this.commandService.executeCommand('workbench.action.openWalkthrough', urlOrWalkthroughId);
    }
}
class HelpItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.openerService = openerService;
    }
    async takeAction(extensionDescription, url) {
        await this.openerService.open(URI.parse(url), { allowCommands: true });
    }
}
class IssueReporterItem extends HelpItemBase {
    constructor(icon, label, values, quickInputService, environmentService, commandService, openerService, remoteExplorerService, workspaceContextService) {
        super(icon, label, values, quickInputService, environmentService, remoteExplorerService, workspaceContextService);
        this.commandService = commandService;
        this.openerService = openerService;
    }
    async getActions() {
        return Promise.all(this.values.map(async (value) => {
            return {
                label: value.extensionDescription.displayName || value.extensionDescription.identifier.value,
                description: '',
                url: await value.url,
                extensionDescription: value.extensionDescription
            };
        }));
    }
    async takeAction(extensionDescription, url) {
        if (!url) {
            await this.commandService.executeCommand('workbench.action.openIssueReporter', [extensionDescription.identifier.value]);
        }
        else {
            await this.openerService.open(URI.parse(url));
        }
    }
}
let HelpPanel = class HelpPanel extends ViewPane {
    static { this.ID = '~remote.helpPanel'; }
    static { this.TITLE = nls.localize2('remote.help', "Help and feedback"); }
    constructor(viewModel, options, keybindingService, contextMenuService, contextKeyService, configurationService, instantiationService, viewDescriptorService, openerService, quickInputService, commandService, remoteExplorerService, environmentService, themeService, hoverService, workspaceContextService, walkthroughsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.viewModel = viewModel;
        this.quickInputService = quickInputService;
        this.commandService = commandService;
        this.remoteExplorerService = remoteExplorerService;
        this.environmentService = environmentService;
        this.workspaceContextService = workspaceContextService;
        this.walkthroughsService = walkthroughsService;
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('remote-help');
        const treeContainer = document.createElement('div');
        treeContainer.classList.add('remote-help-content');
        container.appendChild(treeContainer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'RemoteHelp', treeContainer, new HelpTreeVirtualDelegate(), [new HelpTreeRenderer()], new HelpDataSource(), {
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    return item.label;
                },
                getWidgetAriaLabel: () => nls.localize('remotehelp', "Remote Help")
            }
        });
        const model = this._register(new HelpModel(this.viewModel, this.openerService, this.quickInputService, this.commandService, this.remoteExplorerService, this.environmentService, this.workspaceContextService, this.walkthroughsService));
        this.tree.setInput(model);
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, 75, true)(e => {
            e.element?.handleClick();
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
};
HelpPanel = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IContextKeyService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IViewDescriptorService),
    __param(8, IOpenerService),
    __param(9, IQuickInputService),
    __param(10, ICommandService),
    __param(11, IRemoteExplorerService),
    __param(12, IWorkbenchEnvironmentService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, IWorkspaceContextService),
    __param(16, IWalkthroughsService)
], HelpPanel);
class HelpPanelDescriptor {
    constructor(viewModel) {
        this.id = HelpPanel.ID;
        this.name = HelpPanel.TITLE;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        this.group = 'help@50';
        this.order = -10;
        this.ctorDescriptor = new SyncDescriptor(HelpPanel, [viewModel]);
    }
}
let RemoteViewPaneContainer = class RemoteViewPaneContainer extends FilterViewPaneContainer {
    constructor(layoutService, telemetryService, contextService, storageService, configurationService, instantiationService, themeService, contextMenuService, extensionService, remoteExplorerService, viewDescriptorService, logService) {
        super(VIEWLET_ID, remoteExplorerService.onDidChangeTargetType, configurationService, layoutService, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, viewDescriptorService, logService);
        this.remoteExplorerService = remoteExplorerService;
        this.helpPanelDescriptor = new HelpPanelDescriptor(this);
        this.helpInformation = [];
        this._onDidChangeHelpInformation = new Emitter();
        this.onDidChangeHelpInformation = this._onDidChangeHelpInformation.event;
        this.hasRegisteredHelpView = false;
        this.addConstantViewDescriptors([this.helpPanelDescriptor]);
        this._register(this.remoteSwitcher = this.instantiationService.createInstance(SwitchRemoteViewItem));
        this._register(this.remoteExplorerService.onDidChangeHelpInformation(extensions => {
            this._setHelpInformation(extensions);
        }));
        this._setHelpInformation(this.remoteExplorerService.helpInformation);
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        this.remoteSwitcher.createOptionItems(viewsRegistry.getViews(this.viewContainer));
        this._register(viewsRegistry.onViewsRegistered(e => {
            const remoteViews = [];
            for (const view of e) {
                if (view.viewContainer.id === VIEWLET_ID) {
                    remoteViews.push(...view.views);
                }
            }
            if (remoteViews.length > 0) {
                this.remoteSwitcher.createOptionItems(remoteViews);
            }
        }));
        this._register(viewsRegistry.onViewsDeregistered(e => {
            if (e.viewContainer.id === VIEWLET_ID) {
                this.remoteSwitcher.removeOptionItems(e.views);
            }
        }));
    }
    _setHelpInformation(extensions) {
        const helpInformation = [];
        for (const extension of extensions) {
            this._handleRemoteInfoExtensionPoint(extension, helpInformation);
        }
        this.helpInformation = helpInformation;
        this._onDidChangeHelpInformation.fire();
        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
        if (this.helpInformation.length && !this.hasRegisteredHelpView) {
            const view = viewsRegistry.getView(this.helpPanelDescriptor.id);
            if (!view) {
                viewsRegistry.registerViews([this.helpPanelDescriptor], this.viewContainer);
            }
            this.hasRegisteredHelpView = true;
        }
        else if (this.hasRegisteredHelpView) {
            viewsRegistry.deregisterViews([this.helpPanelDescriptor], this.viewContainer);
            this.hasRegisteredHelpView = false;
        }
    }
    _handleRemoteInfoExtensionPoint(extension, helpInformation) {
        if (!isProposedApiEnabled(extension.description, 'contribRemoteHelp')) {
            return;
        }
        if (!extension.value.documentation && !extension.value.getStarted && !extension.value.issues) {
            return;
        }
        helpInformation.push({
            extensionDescription: extension.description,
            getStarted: extension.value.getStarted,
            documentation: extension.value.documentation,
            reportIssue: extension.value.reportIssue,
            issues: extension.value.issues,
            remoteName: extension.value.remoteName,
            virtualWorkspace: extension.value.virtualWorkspace
        });
    }
    getFilterOn(viewDescriptor) {
        return isStringArray(viewDescriptor.remoteAuthority) ? viewDescriptor.remoteAuthority[0] : viewDescriptor.remoteAuthority;
    }
    setFilter(viewDescriptor) {
        this.remoteExplorerService.targetType = isStringArray(viewDescriptor.remoteAuthority) ? viewDescriptor.remoteAuthority : [viewDescriptor.remoteAuthority];
    }
    getTitle() {
        const title = nls.localize('remote.explorer', "Remote Explorer");
        return title;
    }
};
RemoteViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IWorkspaceContextService),
    __param(3, IStorageService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IContextMenuService),
    __param(8, IExtensionService),
    __param(9, IRemoteExplorerService),
    __param(10, IViewDescriptorService),
    __param(11, ILogService)
], RemoteViewPaneContainer);
Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('remote.explorer', "Remote Explorer"),
    ctorDescriptor: new SyncDescriptor(RemoteViewPaneContainer),
    hideIfEmpty: true,
    viewOrderDelegate: {
        getOrder: (group) => {
            if (!group) {
                return;
            }
            let matches = /^targets@(\d+)$/.exec(group);
            if (matches) {
                return -1000;
            }
            matches = /^details(@(\d+))?$/.exec(group);
            if (matches) {
                return -500 + Number(matches[2]);
            }
            matches = /^help(@(\d+))?$/.exec(group);
            if (matches) {
                return -10;
            }
            return;
        }
    },
    icon: icons.remoteExplorerViewIcon,
    order: 4
}, 0 /* ViewContainerLocation.Sidebar */);
let RemoteMarkers = class RemoteMarkers {
    constructor(remoteAgentService, timerService) {
        remoteAgentService.getEnvironment().then(remoteEnv => {
            if (remoteEnv) {
                timerService.setPerformanceMarks('server', remoteEnv.marks);
            }
        });
    }
};
RemoteMarkers = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ITimerService)
], RemoteMarkers);
export { RemoteMarkers };
class VisibleProgress {
    get lastReport() {
        return this._lastReport;
    }
    constructor(progressService, location, initialReport, buttons, onDidCancel) {
        this.location = location;
        this._isDisposed = false;
        this._lastReport = initialReport;
        this._currentProgressPromiseResolve = null;
        this._currentProgress = null;
        this._currentTimer = null;
        const promise = new Promise((resolve) => this._currentProgressPromiseResolve = resolve);
        progressService.withProgress({ location: location, buttons: buttons }, (progress) => { if (!this._isDisposed) {
            this._currentProgress = progress;
        } return promise; }, (choice) => onDidCancel(choice, this._lastReport));
        if (this._lastReport) {
            this.report();
        }
    }
    dispose() {
        this._isDisposed = true;
        if (this._currentProgressPromiseResolve) {
            this._currentProgressPromiseResolve();
            this._currentProgressPromiseResolve = null;
        }
        this._currentProgress = null;
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
    report(message) {
        if (message) {
            this._lastReport = message;
        }
        if (this._lastReport && this._currentProgress) {
            this._currentProgress.report({ message: this._lastReport });
        }
    }
    startTimer(completionTime) {
        this.stopTimer();
        this._currentTimer = new ReconnectionTimer(this, completionTime);
    }
    stopTimer() {
        if (this._currentTimer) {
            this._currentTimer.dispose();
            this._currentTimer = null;
        }
    }
}
class ReconnectionTimer {
    constructor(parent, completionTime) {
        this._parent = parent;
        this._completionTime = completionTime;
        this._renderInterval = dom.disposableWindowInterval(mainWindow, () => this._render(), 1000);
        this._render();
    }
    dispose() {
        this._renderInterval.dispose();
    }
    _render() {
        const remainingTimeMs = this._completionTime - Date.now();
        if (remainingTimeMs < 0) {
            return;
        }
        const remainingTime = Math.ceil(remainingTimeMs / 1000);
        if (remainingTime === 1) {
            this._parent.report(nls.localize('reconnectionWaitOne', "Attempting to reconnect in {0} second...", remainingTime));
        }
        else {
            this._parent.report(nls.localize('reconnectionWaitMany', "Attempting to reconnect in {0} seconds...", remainingTime));
        }
    }
}
/**
 * The time when a prompt is shown to the user
 */
const DISCONNECT_PROMPT_TIME = 40 * 1000; // 40 seconds
let RemoteAgentConnectionStatusListener = class RemoteAgentConnectionStatusListener extends Disposable {
    constructor(remoteAgentService, progressService, dialogService, commandService, quickInputService, logService, environmentService, telemetryService) {
        super();
        this._reloadWindowShown = false;
        const connection = remoteAgentService.getConnection();
        if (connection) {
            let quickInputVisible = false;
            this._register(quickInputService.onShow(() => quickInputVisible = true));
            this._register(quickInputService.onHide(() => quickInputVisible = false));
            let visibleProgress = null;
            let reconnectWaitEvent = null;
            const disposableListener = this._register(new MutableDisposable());
            function showProgress(location, buttons, initialReport = null) {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
                if (!location) {
                    location = quickInputVisible ? 15 /* ProgressLocation.Notification */ : 20 /* ProgressLocation.Dialog */;
                }
                return new VisibleProgress(progressService, location, initialReport, buttons.map(button => button.label), (choice, lastReport) => {
                    // Handle choice from dialog
                    if (typeof choice !== 'undefined' && buttons[choice]) {
                        buttons[choice].callback();
                    }
                    else {
                        if (location === 20 /* ProgressLocation.Dialog */) {
                            visibleProgress = showProgress(15 /* ProgressLocation.Notification */, buttons, lastReport);
                        }
                        else {
                            hideProgress();
                        }
                    }
                });
            }
            function hideProgress() {
                if (visibleProgress) {
                    visibleProgress.dispose();
                    visibleProgress = null;
                }
            }
            let reconnectionToken = '';
            let lastIncomingDataTime = 0;
            let reconnectionAttempts = 0;
            const reconnectButton = {
                label: nls.localize('reconnectNow', "Reconnect Now"),
                callback: () => {
                    reconnectWaitEvent?.skipWait();
                }
            };
            const reloadButton = {
                label: nls.localize('reloadWindow', "Reload Window"),
                callback: () => {
                    telemetryService.publicLog2('remoteReconnectionReload', {
                        remoteName: getRemoteName(environmentService.remoteAuthority),
                        reconnectionToken: reconnectionToken,
                        millisSinceLastIncomingData: Date.now() - lastIncomingDataTime,
                        attempt: reconnectionAttempts
                    });
                    commandService.executeCommand(ReloadWindowAction.ID);
                }
            };
            // Possible state transitions:
            // ConnectionGain      -> ConnectionLost
            // ConnectionLost      -> ReconnectionWait, ReconnectionRunning
            // ReconnectionWait    -> ReconnectionRunning
            // ReconnectionRunning -> ConnectionGain, ReconnectionPermanentFailure
            this._register(connection.onDidStateChange((e) => {
                visibleProgress?.stopTimer();
                disposableListener.clear();
                switch (e.type) {
                    case 0 /* PersistentConnectionEventType.ConnectionLost */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = 0;
                        telemetryService.publicLog2('remoteConnectionLost', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            if (!visibleProgress) {
                                visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            }
                            visibleProgress.report(nls.localize('connectionLost', "Connection Lost"));
                        }
                        break;
                    case 1 /* PersistentConnectionEventType.ReconnectionWait */:
                        if (visibleProgress) {
                            reconnectWaitEvent = e;
                            visibleProgress = showProgress(null, [reconnectButton, reloadButton]);
                            visibleProgress.startTimer(Date.now() + 1000 * e.durationSeconds);
                        }
                        break;
                    case 2 /* PersistentConnectionEventType.ReconnectionRunning */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionRunning', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt
                        });
                        if (visibleProgress || e.millisSinceLastIncomingData > DISCONNECT_PROMPT_TIME) {
                            visibleProgress = showProgress(null, [reloadButton]);
                            visibleProgress.report(nls.localize('reconnectionRunning', "Disconnected. Attempting to reconnect..."));
                            // Register to listen for quick input is opened
                            disposableListener.value = quickInputService.onShow(() => {
                                // Need to move from dialog if being shown and user needs to type in a prompt
                                if (visibleProgress && visibleProgress.location === 20 /* ProgressLocation.Dialog */) {
                                    visibleProgress = showProgress(15 /* ProgressLocation.Notification */, [reloadButton], visibleProgress.lastReport);
                                }
                            });
                        }
                        break;
                    case 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteReconnectionPermanentFailure', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt,
                            handled: e.handled
                        });
                        hideProgress();
                        if (e.handled) {
                            logService.info(`Error handled: Not showing a notification for the error.`);
                            console.log(`Error handled: Not showing a notification for the error.`);
                        }
                        else if (!this._reloadWindowShown) {
                            this._reloadWindowShown = true;
                            dialogService.confirm({
                                type: Severity.Error,
                                message: nls.localize('reconnectionPermanentFailure', "Cannot reconnect. Please reload the window."),
                                primaryButton: nls.localize({ key: 'reloadWindow.dialog', comment: ['&& denotes a mnemonic'] }, "&&Reload Window")
                            }).then(result => {
                                if (result.confirmed) {
                                    commandService.executeCommand(ReloadWindowAction.ID);
                                }
                            });
                        }
                        break;
                    case 4 /* PersistentConnectionEventType.ConnectionGain */:
                        reconnectionToken = e.reconnectionToken;
                        lastIncomingDataTime = Date.now() - e.millisSinceLastIncomingData;
                        reconnectionAttempts = e.attempt;
                        telemetryService.publicLog2('remoteConnectionGain', {
                            remoteName: getRemoteName(environmentService.remoteAuthority),
                            reconnectionToken: e.reconnectionToken,
                            millisSinceLastIncomingData: e.millisSinceLastIncomingData,
                            attempt: e.attempt
                        });
                        hideProgress();
                        break;
                }
            }));
        }
    }
};
RemoteAgentConnectionStatusListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IProgressService),
    __param(2, IDialogService),
    __param(3, ICommandService),
    __param(4, IQuickInputService),
    __param(5, ILogService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, ITelemetryService)
], RemoteAgentConnectionStatusListener);
export { RemoteAgentConnectionStatusListener };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZW1vdGUvYnJvd3Nlci9yZW1vdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQkFBcUIsQ0FB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