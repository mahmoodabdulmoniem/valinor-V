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
var AuxiliaryEditorPart_1, AuxiliaryEditorPartImpl_1;
import { onDidChangeFullscreen } from '../../../../base/browser/browser.js';
import { $, getActiveWindow, hide, show } from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, markAsSingleton, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isNative } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { hasCustomTitlebar } from '../../../../platform/window/common/window.js';
import { EditorPart } from './editorPart.js';
import { WindowTitle } from '../titlebar/windowTitle.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService, shouldShowCustomTitleBar } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ITitleService } from '../../../services/title/browser/titleService.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IsAuxiliaryWindowContext, IsAuxiliaryWindowFocusedContext, IsCompactTitleBarContext } from '../../../common/contextkeys.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
const compactWindowEmitter = markAsSingleton(new Emitter());
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleCompactAuxiliaryWindow',
            title: localize2('toggleCompactAuxiliaryWindow', "Toggle Window Compact Mode"),
            category: Categories.View,
            f1: true,
            precondition: IsAuxiliaryWindowFocusedContext
        });
    }
    async run() {
        compactWindowEmitter.fire({ windowId: getActiveWindow().vscodeWindowId, compact: 'toggle' });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.enableCompactAuxiliaryWindow',
            title: localize('enableCompactAuxiliaryWindow', "Turn On Compact Mode"),
            icon: Codicon.screenFull,
            menu: {
                id: MenuId.LayoutControlMenu,
                when: ContextKeyExpr.and(IsCompactTitleBarContext.toNegated(), IsAuxiliaryWindowContext),
                order: 0
            }
        });
    }
    async run() {
        compactWindowEmitter.fire({ windowId: getActiveWindow().vscodeWindowId, compact: true });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.disableCompactAuxiliaryWindow',
            title: localize('disableCompactAuxiliaryWindow', "Turn Off Compact Mode"),
            icon: Codicon.screenNormal,
            menu: {
                id: MenuId.LayoutControlMenu,
                when: ContextKeyExpr.and(IsCompactTitleBarContext, IsAuxiliaryWindowContext),
                order: 0
            }
        });
    }
    async run() {
        compactWindowEmitter.fire({ windowId: getActiveWindow().vscodeWindowId, compact: false });
    }
});
let AuxiliaryEditorPart = class AuxiliaryEditorPart {
    static { AuxiliaryEditorPart_1 = this; }
    static { this.STATUS_BAR_VISIBILITY = 'workbench.statusBar.visible'; }
    constructor(editorPartsView, instantiationService, auxiliaryWindowService, lifecycleService, configurationService, statusbarService, titleService, editorService, layoutService) {
        this.editorPartsView = editorPartsView;
        this.instantiationService = instantiationService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.lifecycleService = lifecycleService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.titleService = titleService;
        this.editorService = editorService;
        this.layoutService = layoutService;
    }
    async create(label, options) {
        const that = this;
        const disposables = new DisposableStore();
        let compact = Boolean(options?.compact);
        function computeEditorPartHeightOffset() {
            let editorPartHeightOffset = 0;
            if (statusbarVisible) {
                editorPartHeightOffset += statusbarPart.height;
            }
            if (titlebarPart && titlebarVisible) {
                editorPartHeightOffset += titlebarPart.height;
            }
            return editorPartHeightOffset;
        }
        function updateStatusbarVisibility(fromEvent) {
            if (statusbarVisible) {
                show(statusbarPart.container);
            }
            else {
                hide(statusbarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        function updateTitlebarVisibility(fromEvent) {
            if (!titlebarPart) {
                return;
            }
            if (titlebarVisible) {
                show(titlebarPart.container);
            }
            else {
                hide(titlebarPart.container);
            }
            if (fromEvent) {
                auxiliaryWindow.layout();
            }
        }
        function updateCompact(newCompact) {
            if (newCompact === compact) {
                return;
            }
            compact = newCompact;
            auxiliaryWindow.updateOptions({ compact });
            titlebarPart?.updateOptions({ compact });
            editorPart.updateOptions({ compact });
            const oldStatusbarVisible = statusbarVisible;
            statusbarVisible = !compact && that.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
            if (oldStatusbarVisible !== statusbarVisible) {
                updateStatusbarVisibility(true);
            }
        }
        // Auxiliary Window
        const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open(options));
        // Editor Part
        const editorPartContainer = $('.part.editor', { role: 'main' });
        editorPartContainer.style.position = 'relative';
        auxiliaryWindow.container.appendChild(editorPartContainer);
        const editorPart = disposables.add(this.instantiationService.createInstance(AuxiliaryEditorPartImpl, auxiliaryWindow.window.vscodeWindowId, this.editorPartsView, options?.state, label));
        editorPart.updateOptions({ compact });
        disposables.add(this.editorPartsView.registerPart(editorPart));
        editorPart.create(editorPartContainer);
        const scopedEditorPartInstantiationService = disposables.add(editorPart.scopedInstantiationService.createChild(new ServiceCollection([IEditorService, this.editorService.createScoped(editorPart, disposables)])));
        // Titlebar
        let titlebarPart = undefined;
        let titlebarVisible = false;
        const useCustomTitle = isNative && hasCustomTitlebar(this.configurationService); // custom title in aux windows only enabled in native
        if (useCustomTitle) {
            titlebarPart = disposables.add(this.titleService.createAuxiliaryTitlebarPart(auxiliaryWindow.container, editorPart, scopedEditorPartInstantiationService));
            titlebarPart.updateOptions({ compact });
            titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
            const handleTitleBarVisibilityEvent = () => {
                const oldTitlebarPartVisible = titlebarVisible;
                titlebarVisible = shouldShowCustomTitleBar(this.configurationService, auxiliaryWindow.window, undefined);
                if (oldTitlebarPartVisible !== titlebarVisible) {
                    updateTitlebarVisibility(true);
                }
            };
            disposables.add(titlebarPart.onDidChange(() => auxiliaryWindow.layout()));
            disposables.add(this.layoutService.onDidChangePartVisibility(() => handleTitleBarVisibilityEvent()));
            disposables.add(onDidChangeFullscreen(windowId => {
                if (windowId !== auxiliaryWindow.window.vscodeWindowId) {
                    return; // ignore all but our window
                }
                handleTitleBarVisibilityEvent();
            }));
            updateTitlebarVisibility(false);
        }
        else {
            disposables.add(scopedEditorPartInstantiationService.createInstance(WindowTitle, auxiliaryWindow.window));
        }
        // Statusbar
        const statusbarPart = disposables.add(this.statusbarService.createAuxiliaryStatusbarPart(auxiliaryWindow.container, scopedEditorPartInstantiationService));
        let statusbarVisible = !compact && this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY)) {
                statusbarVisible = !compact && this.configurationService.getValue(AuxiliaryEditorPart_1.STATUS_BAR_VISIBILITY) !== false;
                updateStatusbarVisibility(true);
            }
        }));
        updateStatusbarVisibility(false);
        // Lifecycle
        const editorCloseListener = disposables.add(Event.once(editorPart.onWillClose)(() => auxiliaryWindow.window.close()));
        disposables.add(Event.once(auxiliaryWindow.onUnload)(() => {
            if (disposables.isDisposed) {
                return; // the close happened as part of an earlier dispose call
            }
            editorCloseListener.dispose();
            editorPart.close();
            disposables.dispose();
        }));
        disposables.add(Event.once(this.lifecycleService.onDidShutdown)(() => disposables.dispose()));
        disposables.add(auxiliaryWindow.onBeforeUnload(event => {
            for (const group of editorPart.groups) {
                for (const editor of group.editors) {
                    // Closing an auxiliary window with opened editors
                    // will move the editors to the main window. As such,
                    // we need to validate that we can move and otherwise
                    // prevent the window from closing.
                    const canMoveVeto = editor.canMove(group.id, this.editorPartsView.mainPart.activeGroup.id);
                    if (typeof canMoveVeto === 'string') {
                        group.openEditor(editor);
                        event.veto(canMoveVeto);
                        break;
                    }
                }
            }
        }));
        // Layout: specifically `onWillLayout` to have a chance
        // to build the aux editor part before other components
        // have a chance to react.
        disposables.add(auxiliaryWindow.onWillLayout(dimension => {
            const titlebarPartHeight = titlebarPart?.height ?? 0;
            titlebarPart?.layout(dimension.width, titlebarPartHeight, 0, 0);
            const editorPartHeight = dimension.height - computeEditorPartHeightOffset();
            editorPart.layout(dimension.width, editorPartHeight, titlebarPartHeight, 0);
            statusbarPart.layout(dimension.width, statusbarPart.height, dimension.height - statusbarPart.height, 0);
        }));
        auxiliaryWindow.layout();
        // Compact mode
        disposables.add(compactWindowEmitter.event(e => {
            if (e.windowId === auxiliaryWindow.window.vscodeWindowId) {
                let newCompact;
                if (typeof e.compact === 'boolean') {
                    newCompact = e.compact;
                }
                else {
                    newCompact = !compact;
                }
                updateCompact(newCompact);
            }
        }));
        // Have a scoped instantiation service that is scoped to the auxiliary window
        const scopedInstantiationService = disposables.add(scopedEditorPartInstantiationService.createChild(new ServiceCollection([IStatusbarService, this.statusbarService.createScoped(statusbarPart, disposables)])));
        return {
            part: editorPart,
            instantiationService: scopedInstantiationService,
            disposables
        };
    }
};
AuxiliaryEditorPart = AuxiliaryEditorPart_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IAuxiliaryWindowService),
    __param(3, ILifecycleService),
    __param(4, IConfigurationService),
    __param(5, IStatusbarService),
    __param(6, ITitleService),
    __param(7, IEditorService),
    __param(8, IWorkbenchLayoutService)
], AuxiliaryEditorPart);
export { AuxiliaryEditorPart };
let AuxiliaryEditorPartImpl = class AuxiliaryEditorPartImpl extends EditorPart {
    static { AuxiliaryEditorPartImpl_1 = this; }
    static { this.COUNTER = 1; }
    constructor(windowId, editorPartsView, state, groupsLabel, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService) {
        const id = AuxiliaryEditorPartImpl_1.COUNTER++;
        super(editorPartsView, `workbench.parts.auxiliaryEditor.${id}`, groupsLabel, windowId, instantiationService, themeService, configurationService, storageService, layoutService, hostService, contextKeyService);
        this.state = state;
        this._onWillClose = this._register(new Emitter());
        this.onWillClose = this._onWillClose.event;
        this.optionsDisposable = this._register(new MutableDisposable());
        this.isCompact = false;
    }
    updateOptions(options) {
        this.isCompact = options.compact;
        if (options.compact) {
            if (!this.optionsDisposable.value) {
                this.optionsDisposable.value = this.enforcePartOptions({
                    showTabs: 'none',
                    closeEmptyGroups: true
                });
            }
        }
        else {
            this.optionsDisposable.clear();
        }
    }
    addGroup(location, direction, groupToCopy) {
        if (this.isCompact) {
            // When in compact mode, we prefer to open groups in the main part
            // as compact mode is typically meant for showing just 1 editor.
            location = this.editorPartsView.mainPart.activeGroup;
        }
        return super.addGroup(location, direction, groupToCopy);
    }
    removeGroup(group, preserveFocus) {
        // Close aux window when last group removed
        const groupView = this.assertGroupView(group);
        if (this.count === 1 && this.activeGroup === groupView) {
            this.doRemoveLastGroup(preserveFocus);
        }
        // Otherwise delegate to parent implementation
        else {
            super.removeGroup(group, preserveFocus);
        }
    }
    doRemoveLastGroup(preserveFocus) {
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.container);
        // Activate next group
        const mostRecentlyActiveGroups = this.editorPartsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current group we are about to dispose
        if (nextActiveGroup) {
            nextActiveGroup.groupsView.activateGroup(nextActiveGroup);
            if (restoreFocus) {
                nextActiveGroup.focus();
            }
        }
        this.doClose(false /* do not merge any confirming editors to main part */);
    }
    loadState() {
        return this.state;
    }
    saveState() {
        return; // disabled, auxiliary editor part state is tracked outside
    }
    close() {
        return this.doClose(true /* merge all confirming editors to main part */);
    }
    doClose(mergeConfirmingEditorsToMainPart) {
        let result = true;
        if (mergeConfirmingEditorsToMainPart) {
            // First close all editors that are non-confirming
            for (const group of this.groups) {
                group.closeAllEditors({ excludeConfirming: true });
            }
            // Then merge remaining to main part
            result = this.mergeGroupsToMainPart();
        }
        this._onWillClose.fire();
        return result;
    }
    mergeGroupsToMainPart() {
        if (!this.groups.some(group => group.count > 0)) {
            return true; // skip if we have no editors opened
        }
        // Find the most recent group that is not locked
        let targetGroup = undefined;
        for (const group of this.editorPartsView.mainPart.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (!group.isLocked) {
                targetGroup = group;
                break;
            }
        }
        if (!targetGroup) {
            targetGroup = this.editorPartsView.mainPart.addGroup(this.editorPartsView.mainPart.activeGroup, this.partOptions.openSideBySideDirection === 'right' ? 3 /* GroupDirection.RIGHT */ : 1 /* GroupDirection.DOWN */);
        }
        const result = this.mergeAllGroups(targetGroup, {
            // Try to reduce the impact of closing the auxiliary window
            // as much as possible by not changing existing editors
            // in the main window.
            preserveExistingIndex: true
        });
        targetGroup.focus();
        return result;
    }
};
AuxiliaryEditorPartImpl = AuxiliaryEditorPartImpl_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IStorageService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IHostService),
    __param(10, IContextKeyService)
], AuxiliaryEditorPartImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5RWRpdG9yUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2F1eGlsaWFyeUVkaXRvclBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxVQUFVLEVBQXNCLE1BQU0saUJBQWlCLENBQUM7QUFFakUsT0FBTyxFQUFF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