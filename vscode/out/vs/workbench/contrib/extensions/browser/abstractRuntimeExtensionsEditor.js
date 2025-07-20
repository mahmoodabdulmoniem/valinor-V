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
var AbstractRuntimeExtensionsEditor_1;
import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { fromNow } from '../../../../base/common/date.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ExtensionIdentifierMap } from '../../../../platform/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { LocalWebWorkerRunningLocation } from '../../../services/extensions/common/extensionRunningLocation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { errorIcon, warningIcon } from './extensionsIcons.js';
import { ExtensionIconWidget } from './extensionsWidgets.js';
import './media/runtimeExtensionsEditor.css';
let AbstractRuntimeExtensionsEditor = class AbstractRuntimeExtensionsEditor extends EditorPane {
    static { AbstractRuntimeExtensionsEditor_1 = this; }
    static { this.ID = 'workbench.editor.runtimeExtensions'; }
    constructor(group, telemetryService, themeService, contextKeyService, _extensionsWorkbenchService, _extensionService, _notificationService, _contextMenuService, _instantiationService, storageService, _labelService, _environmentService, _clipboardService, _extensionFeaturesManagementService, _hoverService, _menuService) {
        super(AbstractRuntimeExtensionsEditor_1.ID, group, telemetryService, themeService, storageService);
        this.contextKeyService = contextKeyService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._contextMenuService = _contextMenuService;
        this._instantiationService = _instantiationService;
        this._labelService = _labelService;
        this._environmentService = _environmentService;
        this._clipboardService = _clipboardService;
        this._extensionFeaturesManagementService = _extensionFeaturesManagementService;
        this._hoverService = _hoverService;
        this._menuService = _menuService;
        this._list = null;
        this._elements = null;
        this._updateSoon = this._register(new RunOnceScheduler(() => this._updateExtensions(), 200));
        this._register(this._extensionService.onDidChangeExtensionsStatus(() => this._updateSoon.schedule()));
        this._register(this._extensionFeaturesManagementService.onDidChangeAccessData(() => this._updateSoon.schedule()));
        this._updateExtensions();
    }
    async _updateExtensions() {
        this._elements = await this._resolveExtensions();
        this._list?.splice(0, this._list.length, this._elements);
    }
    async _resolveExtensions() {
        // We only deal with extensions with source code!
        await this._extensionService.whenInstalledExtensionsRegistered();
        const extensionsDescriptions = this._extensionService.extensions.filter((extension) => {
            return Boolean(extension.main) || Boolean(extension.browser);
        });
        const marketplaceMap = new ExtensionIdentifierMap();
        const marketPlaceExtensions = await this._extensionsWorkbenchService.queryLocal();
        for (const extension of marketPlaceExtensions) {
            marketplaceMap.set(extension.identifier.id, extension);
        }
        const statusMap = this._extensionService.getExtensionsStatus();
        // group profile segments by extension
        const segments = new ExtensionIdentifierMap();
        const profileInfo = this._getProfileInfo();
        if (profileInfo) {
            let currentStartTime = profileInfo.startTime;
            for (let i = 0, len = profileInfo.deltas.length; i < len; i++) {
                const id = profileInfo.ids[i];
                const delta = profileInfo.deltas[i];
                let extensionSegments = segments.get(id);
                if (!extensionSegments) {
                    extensionSegments = [];
                    segments.set(id, extensionSegments);
                }
                extensionSegments.push(currentStartTime);
                currentStartTime = currentStartTime + delta;
                extensionSegments.push(currentStartTime);
            }
        }
        let result = [];
        for (let i = 0, len = extensionsDescriptions.length; i < len; i++) {
            const extensionDescription = extensionsDescriptions[i];
            let extProfileInfo = null;
            if (profileInfo) {
                const extensionSegments = segments.get(extensionDescription.identifier) || [];
                let extensionTotalTime = 0;
                for (let j = 0, lenJ = extensionSegments.length / 2; j < lenJ; j++) {
                    const startTime = extensionSegments[2 * j];
                    const endTime = extensionSegments[2 * j + 1];
                    extensionTotalTime += (endTime - startTime);
                }
                extProfileInfo = {
                    segments: extensionSegments,
                    totalTime: extensionTotalTime
                };
            }
            result[i] = {
                originalIndex: i,
                description: extensionDescription,
                marketplaceInfo: marketplaceMap.get(extensionDescription.identifier),
                status: statusMap[extensionDescription.identifier.value],
                profileInfo: extProfileInfo || undefined,
                unresponsiveProfile: this._getUnresponsiveProfile(extensionDescription.identifier)
            };
        }
        result = result.filter(element => element.status.activationStarted);
        // bubble up extensions that have caused slowness
        const isUnresponsive = (extension) => extension.unresponsiveProfile === profileInfo;
        const profileTime = (extension) => extension.profileInfo?.totalTime ?? 0;
        const activationTime = (extension) => (extension.status.activationTimes?.codeLoadingTime ?? 0) +
            (extension.status.activationTimes?.activateCallTime ?? 0);
        result = result.sort((a, b) => {
            if (isUnresponsive(a) || isUnresponsive(b)) {
                return +isUnresponsive(b) - +isUnresponsive(a);
            }
            else if (profileTime(a) || profileTime(b)) {
                return profileTime(b) - profileTime(a);
            }
            else if (activationTime(a) || activationTime(b)) {
                return activationTime(b) - activationTime(a);
            }
            return a.originalIndex - b.originalIndex;
        });
        return result;
    }
    createEditor(parent) {
        parent.classList.add('runtime-extensions-editor');
        const TEMPLATE_ID = 'runtimeExtensionElementTemplate';
        const delegate = new class {
            getHeight(element) {
                return 70;
            }
            getTemplateId(element) {
                return TEMPLATE_ID;
            }
        };
        const renderer = {
            templateId: TEMPLATE_ID,
            renderTemplate: (root) => {
                const element = append(root, $('.extension'));
                const iconContainer = append(element, $('.icon-container'));
                const extensionIconWidget = this._instantiationService.createInstance(ExtensionIconWidget, iconContainer);
                const desc = append(element, $('div.desc'));
                const headerContainer = append(desc, $('.header-container'));
                const header = append(headerContainer, $('.header'));
                const name = append(header, $('div.name'));
                const version = append(header, $('span.version'));
                const msgContainer = append(desc, $('div.msg'));
                const actionbar = new ActionBar(desc);
                const listener = actionbar.onDidRun(({ error }) => error && this._notificationService.error(error));
                const timeContainer = append(element, $('.time'));
                const activationTime = append(timeContainer, $('div.activation-time'));
                const profileTime = append(timeContainer, $('div.profile-time'));
                const disposables = [extensionIconWidget, actionbar, listener];
                return {
                    root,
                    element,
                    name,
                    version,
                    actionbar,
                    activationTime,
                    profileTime,
                    msgContainer,
                    set extension(extension) {
                        extensionIconWidget.extension = extension || null;
                    },
                    disposables,
                    elementDisposables: [],
                };
            },
            renderElement: (element, index, data) => {
                data.elementDisposables = dispose(data.elementDisposables);
                data.extension = element.marketplaceInfo;
                data.root.classList.toggle('odd', index % 2 === 1);
                data.name.textContent = (element.marketplaceInfo?.displayName || element.description.identifier.value).substr(0, 50);
                data.version.textContent = element.description.version;
                const activationTimes = element.status.activationTimes;
                if (activationTimes) {
                    const syncTime = activationTimes.codeLoadingTime + activationTimes.activateCallTime;
                    data.activationTime.textContent = activationTimes.activationReason.startup ? `Startup Activation: ${syncTime}ms` : `Activation: ${syncTime}ms`;
                }
                else {
                    data.activationTime.textContent = `Activating...`;
                }
                data.actionbar.clear();
                const slowExtensionAction = this._createSlowExtensionAction(element);
                if (slowExtensionAction) {
                    data.actionbar.push(slowExtensionAction, { icon: false, label: true });
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const reportExtensionIssueAction = this._createReportExtensionIssueAction(element);
                    if (reportExtensionIssueAction) {
                        data.actionbar.push(reportExtensionIssueAction, { icon: false, label: true });
                    }
                }
                let title;
                if (activationTimes) {
                    const activationId = activationTimes.activationReason.extensionId.value;
                    const activationEvent = activationTimes.activationReason.activationEvent;
                    if (activationEvent === '*') {
                        title = nls.localize({
                            key: 'starActivation',
                            comment: [
                                '{0} will be an extension identifier'
                            ]
                        }, "Activated by {0} on start-up", activationId);
                    }
                    else if (/^workspaceContains:/.test(activationEvent)) {
                        const fileNameOrGlob = activationEvent.substr('workspaceContains:'.length);
                        if (fileNameOrGlob.indexOf('*') >= 0 || fileNameOrGlob.indexOf('?') >= 0) {
                            title = nls.localize({
                                key: 'workspaceContainsGlobActivation',
                                comment: [
                                    '{0} will be a glob pattern',
                                    '{1} will be an extension identifier'
                                ]
                            }, "Activated by {1} because a file matching {0} exists in your workspace", fileNameOrGlob, activationId);
                        }
                        else {
                            title = nls.localize({
                                key: 'workspaceContainsFileActivation',
                                comment: [
                                    '{0} will be a file name',
                                    '{1} will be an extension identifier'
                                ]
                            }, "Activated by {1} because file {0} exists in your workspace", fileNameOrGlob, activationId);
                        }
                    }
                    else if (/^workspaceContainsTimeout:/.test(activationEvent)) {
                        const glob = activationEvent.substr('workspaceContainsTimeout:'.length);
                        title = nls.localize({
                            key: 'workspaceContainsTimeout',
                            comment: [
                                '{0} will be a glob pattern',
                                '{1} will be an extension identifier'
                            ]
                        }, "Activated by {1} because searching for {0} took too long", glob, activationId);
                    }
                    else if (activationEvent === 'onStartupFinished') {
                        title = nls.localize({
                            key: 'startupFinishedActivation',
                            comment: [
                                'This refers to an extension. {0} will be an activation event.'
                            ]
                        }, "Activated by {0} after start-up finished", activationId);
                    }
                    else if (/^onLanguage:/.test(activationEvent)) {
                        const language = activationEvent.substr('onLanguage:'.length);
                        title = nls.localize('languageActivation', "Activated by {1} because you opened a {0} file", language, activationId);
                    }
                    else {
                        title = nls.localize({
                            key: 'workspaceGenericActivation',
                            comment: [
                                '{0} will be an activation event, like e.g. \'language:typescript\', \'debug\', etc.',
                                '{1} will be an extension identifier'
                            ]
                        }, "Activated by {1} on {0}", activationEvent, activationId);
                    }
                }
                else {
                    title = nls.localize('extensionActivating', "Extension is activating...");
                }
                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.activationTime, title));
                clearNode(data.msgContainer);
                if (this._getUnresponsiveProfile(element.description.identifier)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(` $(alert) Unresponsive`));
                    const extensionHostFreezTitle = nls.localize('unresponsive.title', "Extension has caused the extension host to freeze.");
                    data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), el, extensionHostFreezTitle));
                    data.msgContainer.appendChild(el);
                }
                if (isNonEmptyArray(element.status.runtimeErrors)) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(bug) ${nls.localize('errors', "{0} uncaught errors", element.status.runtimeErrors.length)}`));
                    data.msgContainer.appendChild(el);
                }
                if (element.status.messages && element.status.messages.length > 0) {
                    const el = $('span', undefined, ...renderLabelWithIcons(`$(alert) ${element.status.messages[0].message}`));
                    data.msgContainer.appendChild(el);
                }
                let extraLabel = null;
                if (element.status.runningLocation && element.status.runningLocation.equals(new LocalWebWorkerRunningLocation(0))) {
                    extraLabel = `$(globe) web worker`;
                }
                else if (element.description.extensionLocation.scheme === Schemas.vscodeRemote) {
                    const hostLabel = this._labelService.getHostLabel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
                    if (hostLabel) {
                        extraLabel = `$(remote) ${hostLabel}`;
                    }
                    else {
                        extraLabel = `$(remote) ${element.description.extensionLocation.authority}`;
                    }
                }
                else if (element.status.runningLocation && element.status.runningLocation.affinity > 0) {
                    extraLabel = element.status.runningLocation instanceof LocalWebWorkerRunningLocation
                        ? `$(globe) web worker ${element.status.runningLocation.affinity + 1}`
                        : `$(server-process) local process ${element.status.runningLocation.affinity + 1}`;
                }
                if (extraLabel) {
                    const el = $('span', undefined, ...renderLabelWithIcons(extraLabel));
                    data.msgContainer.appendChild(el);
                }
                const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
                for (const feature of features) {
                    const accessData = this._extensionFeaturesManagementService.getAccessData(element.description.identifier, feature.id);
                    if (accessData) {
                        const status = accessData?.current?.status;
                        if (status) {
                            data.msgContainer.appendChild($('span', undefined, `${feature.label}: `));
                            data.msgContainer.appendChild($('span', undefined, ...renderLabelWithIcons(`$(${status.severity === Severity.Error ? errorIcon.id : warningIcon.id}) ${status.message}`)));
                        }
                        if (accessData?.accessTimes.length > 0) {
                            const element = $('span', undefined, `${nls.localize('requests count', "{0} Usage: {1} Requests", feature.label, accessData.accessTimes.length)}${accessData.current ? nls.localize('session requests count', ", {0} Requests (Session)", accessData.current.accessTimes.length) : ''}`);
                            if (accessData.current) {
                                const title = nls.localize('requests count title', "Last request was {0}.", fromNow(accessData.current.lastAccessed, true, true));
                                data.elementDisposables.push(this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), element, title));
                            }
                            data.msgContainer.appendChild(element);
                        }
                    }
                }
                if (element.profileInfo) {
                    data.profileTime.textContent = `Profile: ${(element.profileInfo.totalTime / 1000).toFixed(2)}ms`;
                }
                else {
                    data.profileTime.textContent = '';
                }
            },
            disposeTemplate: (data) => {
                data.disposables = dispose(data.disposables);
            }
        };
        this._list = this._instantiationService.createInstance((WorkbenchList), 'RuntimeExtensions', parent, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            overrideStyles: {
                listBackground: editorBackground
            },
            accessibilityProvider: new class {
                getWidgetAriaLabel() {
                    return nls.localize('runtimeExtensions', "Runtime Extensions");
                }
                getAriaLabel(element) {
                    return element.description.name;
                }
            }
        });
        this._list.splice(0, this._list.length, this._elements || undefined);
        this._register(this._list.onContextMenu((e) => {
            if (!e.element) {
                return;
            }
            const actions = [];
            actions.push(new Action('runtimeExtensionsEditor.action.copyId', nls.localize('copy id', "Copy id ({0})", e.element.description.identifier.value), undefined, true, () => {
                this._clipboardService.writeText(e.element.description.identifier.value);
            }));
            const reportExtensionIssueAction = this._createReportExtensionIssueAction(e.element);
            if (reportExtensionIssueAction) {
                actions.push(reportExtensionIssueAction);
            }
            actions.push(new Separator());
            if (e.element.marketplaceInfo) {
                actions.push(new Action('runtimeExtensionsEditor.action.disableWorkspace', nls.localize('disable workspace', "Disable (Workspace)"), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 10 /* EnablementState.DisabledWorkspace */)));
                actions.push(new Action('runtimeExtensionsEditor.action.disable', nls.localize('disable', "Disable"), undefined, true, () => this._extensionsWorkbenchService.setEnablement(e.element.marketplaceInfo, 9 /* EnablementState.DisabledGlobally */)));
            }
            actions.push(new Separator());
            const menuActions = this._menuService.getMenuActions(MenuId.ExtensionEditorContextMenu, this.contextKeyService);
            actions.push(...getContextMenuActions(menuActions).secondary);
            this._contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions
            });
        }));
    }
    layout(dimension) {
        this._list?.layout(dimension.height);
    }
};
AbstractRuntimeExtensionsEditor = AbstractRuntimeExtensionsEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IExtensionService),
    __param(6, INotificationService),
    __param(7, IContextMenuService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, ILabelService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IClipboardService),
    __param(13, IExtensionFeaturesManagementService),
    __param(14, IHoverService),
    __param(15, IMenuService)
], AbstractRuntimeExtensionsEditor);
export { AbstractRuntimeExtensionsEditor };
export class ShowRuntimeExtensionsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showRuntimeExtensions',
            title: nls.localize2('showRuntimeExtensions', "Show Running Extensions"),
            category: Categories.Developer,
            f1: true,
            menu: {
                id: MenuId.ViewContainerTitle,
                when: ContextKeyExpr.equals('viewContainer', 'workbench.view.extensions'),
                group: '2_enablement',
                order: 3
            }
        });
    }
    async run(accessor) {
        await accessor.get(IEditorService).openEditor(RuntimeExtensionsInput.instance, { pinned: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RSdW50aW1lRXh0ZW5zaW9uc0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2Fic3RyYWN0UnVudGltZUV4dGVuc2lvbnNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQWEsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUczRixPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN4RyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxN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