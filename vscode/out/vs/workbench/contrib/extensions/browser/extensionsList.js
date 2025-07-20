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
import './media/extension.css';
import { append, $ } from '../../../../base/browser/dom.js';
import { dispose, combinedDisposable } from '../../../../base/common/lifecycle.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ExtensionContainers, IExtensionsWorkbenchService } from '../common/extensions.js';
import { ManageExtensionAction, ExtensionRuntimeStateAction, ExtensionStatusLabelAction, RemoteInstallAction, ExtensionStatusAction, LocalInstallAction, ButtonWithDropDownExtensionAction, InstallDropdownAction, InstallingLabelAction, ButtonWithDropdownExtensionActionViewItem, DropDownExtensionAction, WebInstallAction, MigrateDeprecatedExtensionAction, SetLanguageAction, ClearLanguageAction, UpdateAction } from './extensionsActions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RatingsWidget, InstallCountWidget, RecommendationWidget, RemoteBadgeWidget, ExtensionPackCountWidget as ExtensionPackBadgeWidget, SyncIgnoredWidget, ExtensionHoverWidget, ExtensionRuntimeStatusWidget, PreReleaseBookmarkWidget, PublisherWidget, ExtensionKindIndicatorWidget, ExtensionIconWidget } from './extensionsWidgets.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { extensionVerifiedPublisherIconColor, verifiedPublisherIcon } from '../../../services/extensionManagement/common/extensionsIcons.js';
const EXTENSION_LIST_ELEMENT_HEIGHT = 72;
export class Delegate {
    getHeight() { return EXTENSION_LIST_ELEMENT_HEIGHT; }
    getTemplateId() { return 'extension'; }
}
let Renderer = class Renderer {
    constructor(extensionViewState, options, instantiationService, notificationService, extensionService, extensionsWorkbenchService, extensionEnablementService, contextMenuService) {
        this.extensionViewState = extensionViewState;
        this.options = options;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.contextMenuService = contextMenuService;
    }
    get templateId() { return 'extension'; }
    renderTemplate(root) {
        const recommendationWidget = this.instantiationService.createInstance(RecommendationWidget, append(root, $('.extension-bookmark-container')));
        const preReleaseWidget = this.instantiationService.createInstance(PreReleaseBookmarkWidget, append(root, $('.extension-bookmark-container')));
        const element = append(root, $('.extension-list-item'));
        const iconContainer = append(element, $('.icon-container'));
        const iconWidget = this.instantiationService.createInstance(ExtensionIconWidget, iconContainer);
        const iconRemoteBadgeWidget = this.instantiationService.createInstance(RemoteBadgeWidget, iconContainer, false);
        const extensionPackBadgeWidget = this.instantiationService.createInstance(ExtensionPackBadgeWidget, iconContainer);
        const details = append(element, $('.details'));
        const headerContainer = append(details, $('.header-container'));
        const header = append(headerContainer, $('.header'));
        const name = append(header, $('span.name'));
        const installCount = append(header, $('span.install-count'));
        const ratings = append(header, $('span.ratings'));
        const syncIgnore = append(header, $('span.sync-ignored'));
        const extensionKindIndicator = append(header, $('span'));
        const activationStatus = append(header, $('span.activation-status'));
        const description = append(details, $('.description.ellipsis'));
        const footer = append(details, $('.footer'));
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, append(footer, $('.publisher-container')), true);
        const actionbar = new ActionBar(footer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof ButtonWithDropDownExtensionAction) {
                    return new ButtonWithDropdownExtensionActionViewItem(action, {
                        ...options,
                        icon: true,
                        label: true,
                        menuActionsOrProvider: { getActions: () => action.menuActions },
                        menuActionClassNames: action.menuActionClassNames
                    }, this.contextMenuService);
                }
                if (action instanceof DropDownExtensionAction) {
                    return action.createActionViewItem(options);
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        });
        actionbar.setFocusable(false);
        const actionBarListener = actionbar.onDidRun(({ error }) => error && this.notificationService.error(error));
        const extensionStatusIconAction = this.instantiationService.createInstance(ExtensionStatusAction);
        const actions = [
            this.instantiationService.createInstance(ExtensionStatusLabelAction),
            this.instantiationService.createInstance(MigrateDeprecatedExtensionAction, true),
            this.instantiationService.createInstance(ExtensionRuntimeStateAction),
            this.instantiationService.createInstance(UpdateAction, false),
            this.instantiationService.createInstance(InstallDropdownAction),
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(SetLanguageAction),
            this.instantiationService.createInstance(ClearLanguageAction),
            this.instantiationService.createInstance(RemoteInstallAction, false),
            this.instantiationService.createInstance(LocalInstallAction),
            this.instantiationService.createInstance(WebInstallAction),
            extensionStatusIconAction,
            this.instantiationService.createInstance(ManageExtensionAction)
        ];
        const extensionHoverWidget = this.instantiationService.createInstance(ExtensionHoverWidget, { target: root, position: this.options.hoverOptions.position }, extensionStatusIconAction);
        const widgets = [
            iconWidget,
            recommendationWidget,
            preReleaseWidget,
            iconRemoteBadgeWidget,
            extensionPackBadgeWidget,
            publisherWidget,
            extensionHoverWidget,
            this.instantiationService.createInstance(SyncIgnoredWidget, syncIgnore),
            this.instantiationService.createInstance(ExtensionRuntimeStatusWidget, this.extensionViewState, activationStatus),
            this.instantiationService.createInstance(InstallCountWidget, installCount, true),
            this.instantiationService.createInstance(RatingsWidget, ratings, true),
            this.instantiationService.createInstance(ExtensionKindIndicatorWidget, extensionKindIndicator, true),
        ];
        const extensionContainers = this.instantiationService.createInstance(ExtensionContainers, [...actions, ...widgets]);
        actionbar.push(actions, { icon: true, label: true });
        const disposable = combinedDisposable(...actions, ...widgets, actionbar, actionBarListener, extensionContainers);
        return {
            root, element, name, installCount, ratings, description, disposables: [disposable], actionbar,
            extensionDisposables: [],
            set extension(extension) {
                extensionContainers.extension = extension;
            }
        };
    }
    renderPlaceholder(index, data) {
        data.element.classList.add('loading');
        data.root.removeAttribute('aria-label');
        data.root.removeAttribute('data-extension-id');
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.name.textContent = '';
        data.description.textContent = '';
        data.installCount.style.display = 'none';
        data.ratings.style.display = 'none';
        data.extension = null;
    }
    renderElement(extension, index, data) {
        data.element.classList.remove('loading');
        data.root.setAttribute('data-extension-id', extension.identifier.id);
        if (extension.state !== 3 /* ExtensionState.Uninstalled */ && !extension.server) {
            // Get the extension if it is installed and has no server information
            extension = this.extensionsWorkbenchService.local.filter(e => e.server === extension.server && areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        }
        data.extensionDisposables = dispose(data.extensionDisposables);
        const updateEnablement = () => {
            const disabled = extension.state === 1 /* ExtensionState.Installed */ && !!extension.local && !this.extensionEnablementService.isEnabled(extension.local);
            const deprecated = !!extension.deprecationInfo;
            data.element.classList.toggle('deprecated', deprecated);
            data.root.classList.toggle('disabled', disabled);
        };
        updateEnablement();
        this.extensionService.onDidChangeExtensions(() => updateEnablement(), this, data.extensionDisposables);
        data.name.textContent = extension.displayName;
        data.description.textContent = extension.description;
        data.installCount.style.display = '';
        data.ratings.style.display = '';
        data.extension = extension;
        if (extension.gallery && extension.gallery.properties && extension.gallery.properties.localizedLanguages && extension.gallery.properties.localizedLanguages.length) {
            data.description.textContent = extension.gallery.properties.localizedLanguages.map(name => name[0].toLocaleUpperCase() + name.slice(1)).join(', ');
        }
        this.extensionViewState.onFocus(e => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(true);
            }
        }, this, data.extensionDisposables);
        this.extensionViewState.onBlur(e => {
            if (areSameExtensions(extension.identifier, e.identifier)) {
                data.actionbar.setFocusable(false);
            }
        }, this, data.extensionDisposables);
    }
    disposeElement(extension, index, data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
    }
    disposeTemplate(data) {
        data.extensionDisposables = dispose(data.extensionDisposables);
        data.disposables = dispose(data.disposables);
    }
};
Renderer = __decorate([
    __param(2, IInstantiationService),
    __param(3, INotificationService),
    __param(4, IExtensionService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IWorkbenchExtensionEnablementService),
    __param(7, IContextMenuService)
], Renderer);
export { Renderer };
registerThemingParticipant((theme, collector) => {
    const verifiedPublisherIconColor = theme.getColor(extensionVerifiedPublisherIconColor);
    if (verifiedPublisherIconColor) {
        const disabledVerifiedPublisherIconColor = verifiedPublisherIconColor.transparent(.5).makeOpaque(WORKBENCH_BACKGROUND(theme));
        collector.addRule(`.extensions-list .monaco-list .monaco-list-row.disabled:not(.selected) .author .verified-publisher ${ThemeIcon.asCSSSelector(verifiedPublisherIcon)} { color: ${disabledVerifiedPublisherIconColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0xpc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zTGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFlLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyxPQUFPLEVBQWMsbUJBQW1CLEVBQWtCLDJCQUEyQixFQUF3QixNQUFNLHlCQUF5QixDQUFDO0FBQzdJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSx5Q0FBeUMsRUFBRSx1QkFBdUIsRUFBRSxnQkFBZ0IsRUFBRSxnQ0FBZ0MsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN2YixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixJQUFJLHdCQUF3QixFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLDRCQUE0QixF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