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
import './media/extensionsViewlet.css';
import { localize, localize2 } from '../../../../nls.js';
import { timeout, Delayer } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { Action } from '../../../../base/common/actions.js';
import { append, $, Dimension, hide, show, DragAndDropObserver, trackFocus, addDisposableListener, EventType, clearNode } from '../../../../base/browser/dom.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService, VIEWLET_ID, CloseExtensionDetailsOnViewChangeKey, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, WORKSPACE_RECOMMENDATIONS_VIEW_ID, AutoCheckUpdatesConfigurationKey, OUTDATED_EXTENSIONS_VIEW_ID, CONTEXT_HAS_GALLERY, extensionsSearchActionsMenu, AutoRestartConfigurationKey, SearchMcpServersContext, DefaultViewsContext, CONTEXT_EXTENSIONS_GALLERY_STATUS } from '../common/extensions.js';
import { InstallLocalExtensionsInRemoteAction, InstallRemoteExtensionsInLocalAction } from './extensionsActions.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { ExtensionsInput } from '../common/extensionsInput.js';
import { ExtensionsListView, EnabledExtensionsView, DisabledExtensionsView, RecommendedExtensionsView, WorkspaceRecommendedExtensionsView, ServerInstalledExtensionsView, DefaultRecommendedExtensionsView, UntrustedWorkspaceUnsupportedExtensionsView, UntrustedWorkspacePartiallySupportedExtensionsView, VirtualWorkspaceUnsupportedExtensionsView, VirtualWorkspacePartiallySupportedExtensionsView, DefaultPopularExtensionsView, DeprecatedExtensionsView, SearchMarketplaceExtensionsView, RecentlyUpdatedExtensionsView, OutdatedExtensionsView, StaticQueryExtensionsView, NONE_CATEGORY, AbstractExtensionsListView } from './extensionsViews.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import Severity from '../../../../base/common/severity.js';
import { IActivityService, NumberBadge, WarningBadge } from '../../../services/activity/common/activity.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, IViewDescriptorService } from '../../../common/views.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IContextKeyService, ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Query } from '../common/extensionQuery.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { SIDE_BAR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { VirtualWorkspaceContext, WorkbenchStateContext } from '../../../common/contextkeys.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { installLocalInRemoteIcon } from './extensionsIcons.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { extractEditorsAndFilesDropData } from '../../../../platform/dnd/browser/dnd.js';
import { extname } from '../../../../base/common/resources.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { URI } from '../../../../base/common/uri.js';
import { DEFAULT_ACCOUNT_SIGN_IN_COMMAND } from '../../../services/accounts/common/defaultAccount.js';
export const ExtensionsSortByContext = new RawContextKey('extensionsSortByValue', '');
export const SearchMarketplaceExtensionsContext = new RawContextKey('searchMarketplaceExtensions', false);
export const SearchHasTextContext = new RawContextKey('extensionSearchHasText', false);
const InstalledExtensionsContext = new RawContextKey('installedExtensions', false);
const SearchInstalledExtensionsContext = new RawContextKey('searchInstalledExtensions', false);
const SearchRecentlyUpdatedExtensionsContext = new RawContextKey('searchRecentlyUpdatedExtensions', false);
const SearchExtensionUpdatesContext = new RawContextKey('searchExtensionUpdates', false);
const SearchOutdatedExtensionsContext = new RawContextKey('searchOutdatedExtensions', false);
const SearchEnabledExtensionsContext = new RawContextKey('searchEnabledExtensions', false);
const SearchDisabledExtensionsContext = new RawContextKey('searchDisabledExtensions', false);
const HasInstalledExtensionsContext = new RawContextKey('hasInstalledExtensions', true);
export const BuiltInExtensionsContext = new RawContextKey('builtInExtensions', false);
const SearchBuiltInExtensionsContext = new RawContextKey('searchBuiltInExtensions', false);
const SearchUnsupportedWorkspaceExtensionsContext = new RawContextKey('searchUnsupportedWorkspaceExtensions', false);
const SearchDeprecatedExtensionsContext = new RawContextKey('searchDeprecatedExtensions', false);
export const RecommendedExtensionsContext = new RawContextKey('recommendedExtensions', false);
const SortByUpdateDateContext = new RawContextKey('sortByUpdateDate', false);
export const ExtensionsSearchValueContext = new RawContextKey('extensionsSearchValue', '');
const REMOTE_CATEGORY = localize2({ key: 'remote', comment: ['Remote as in remote machine'] }, "Remote");
let ExtensionsViewletViewsContribution = class ExtensionsViewletViewsContribution extends Disposable {
    constructor(extensionManagementServerService, labelService, viewDescriptorService, contextKeyService) {
        super();
        this.extensionManagementServerService = extensionManagementServerService;
        this.labelService = labelService;
        this.contextKeyService = contextKeyService;
        this.container = viewDescriptorService.getViewContainerById(VIEWLET_ID);
        this.registerViews();
    }
    registerViews() {
        const viewDescriptors = [];
        /* Default views */
        viewDescriptors.push(...this.createDefaultExtensionsViewDescriptors());
        /* Search views */
        viewDescriptors.push(...this.createSearchExtensionsViewDescriptors());
        /* Recommendations views */
        viewDescriptors.push(...this.createRecommendedExtensionsViewDescriptors());
        /* Built-in extensions views */
        viewDescriptors.push(...this.createBuiltinExtensionsViewDescriptors());
        /* Trust Required extensions views */
        viewDescriptors.push(...this.createUnsupportedWorkspaceExtensionsViewDescriptors());
        /* Other Local Filtered extensions views */
        viewDescriptors.push(...this.createOtherLocalFilteredExtensionsViewDescriptors());
        viewDescriptors.push({
            id: 'workbench.views.extensions.marketplaceAccess',
            name: localize2('marketPlace', "Marketplace"),
            ctorDescriptor: new SyncDescriptor(class extends ViewPane {
                shouldShowWelcome() {
                    return true;
                }
            }),
            when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.has('searchMarketplaceExtensions'), ContextKeyExpr.and(DefaultViewsContext)), ContextKeyExpr.or(CONTEXT_EXTENSIONS_GALLERY_STATUS.isEqualTo("requiresSignIn" /* ExtensionGalleryManifestStatus.RequiresSignIn */), CONTEXT_EXTENSIONS_GALLERY_STATUS.isEqualTo("accessDenied" /* ExtensionGalleryManifestStatus.AccessDenied */))),
            order: -1,
        });
        const viewRegistry = Registry.as(Extensions.ViewsRegistry);
        viewRegistry.registerViews(viewDescriptors, this.container);
        viewRegistry.registerViewWelcomeContent('workbench.views.extensions.marketplaceAccess', {
            content: localize('sign in', "[Sign in to access Extensions Marketplace]({0})", `command:${DEFAULT_ACCOUNT_SIGN_IN_COMMAND}`),
            when: CONTEXT_EXTENSIONS_GALLERY_STATUS.isEqualTo("requiresSignIn" /* ExtensionGalleryManifestStatus.RequiresSignIn */)
        });
        viewRegistry.registerViewWelcomeContent('workbench.views.extensions.marketplaceAccess', {
            content: localize('access denied', "Your account does not have access to the Extensions Marketplace. Please contact your administrator."),
            when: CONTEXT_EXTENSIONS_GALLERY_STATUS.isEqualTo("accessDenied" /* ExtensionGalleryManifestStatus.AccessDenied */)
        });
    }
    createDefaultExtensionsViewDescriptors() {
        const viewDescriptors = [];
        /*
         * Default installed extensions views - Shows all user installed extensions.
         */
        const servers = [];
        if (this.extensionManagementServerService.localExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.localExtensionManagementServer);
        }
        if (this.extensionManagementServerService.remoteExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.remoteExtensionManagementServer);
        }
        if (this.extensionManagementServerService.webExtensionManagementServer) {
            servers.push(this.extensionManagementServerService.webExtensionManagementServer);
        }
        const getViewName = (viewTitle, server) => {
            return servers.length > 1 ? `${server.label} - ${viewTitle}` : viewTitle;
        };
        let installedWebExtensionsContextChangeEvent = Event.None;
        if (this.extensionManagementServerService.webExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
            const interestingContextKeys = new Set();
            interestingContextKeys.add('hasInstalledWebExtensions');
            installedWebExtensionsContextChangeEvent = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(interestingContextKeys));
        }
        const serverLabelChangeEvent = Event.any(this.labelService.onDidChangeFormatters, installedWebExtensionsContextChangeEvent);
        for (const server of servers) {
            const getInstalledViewName = () => getViewName(localize('installed', "Installed"), server);
            const onDidChangeTitle = Event.map(serverLabelChangeEvent, () => getInstalledViewName());
            const id = servers.length > 1 ? `workbench.views.extensions.${server.id}.installed` : `workbench.views.extensions.installed`;
            /* Installed extensions view */
            viewDescriptors.push({
                id,
                get name() {
                    return {
                        value: getInstalledViewName(),
                        original: getViewName('Installed', server)
                    };
                },
                weight: 100,
                order: 1,
                when: ContextKeyExpr.and(DefaultViewsContext),
                ctorDescriptor: new SyncDescriptor(ServerInstalledExtensionsView, [{ server, flexibleHeight: true, onDidChangeTitle }]),
                /* Installed extensions views shall not be allowed to hidden when there are more than one server */
                canToggleVisibility: servers.length === 1
            });
            if (server === this.extensionManagementServerService.remoteExtensionManagementServer && this.extensionManagementServerService.localExtensionManagementServer) {
                this._register(registerAction2(class InstallLocalExtensionsInRemoteAction2 extends Action2 {
                    constructor() {
                        super({
                            id: 'workbench.extensions.installLocalExtensions',
                            get title() {
                                return localize2('select and install local extensions', "Install Local Extensions in '{0}'...", server.label);
                            },
                            category: REMOTE_CATEGORY,
                            icon: installLocalInRemoteIcon,
                            f1: true,
                            menu: {
                                id: MenuId.ViewTitle,
                                when: ContextKeyExpr.equals('view', id),
                                group: 'navigation',
                            }
                        });
                    }
                    run(accessor) {
                        return accessor.get(IInstantiationService).createInstance(InstallLocalExtensionsInRemoteAction).run();
                    }
                }));
            }
        }
        if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
            this._register(registerAction2(class InstallRemoteExtensionsInLocalAction2 extends Action2 {
                constructor() {
                    super({
                        id: 'workbench.extensions.actions.installLocalExtensionsInRemote',
                        title: localize2('install remote in local', 'Install Remote Extensions Locally...'),
                        category: REMOTE_CATEGORY,
                        f1: true
                    });
                }
                run(accessor) {
                    return accessor.get(IInstantiationService).createInstance(InstallRemoteExtensionsInLocalAction, 'workbench.extensions.actions.installLocalExtensionsInRemote').run();
                }
            }));
        }
        /*
         * Default popular extensions view
         * Separate view for popular extensions required as we need to show popular and recommended sections
         * in the default view when there is no search text, and user has no installed extensions.
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.popular',
            name: localize2('popularExtensions', "Popular"),
            ctorDescriptor: new SyncDescriptor(DefaultPopularExtensionsView, [{ hideBadge: true }]),
            when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.not('hasInstalledExtensions'), CONTEXT_HAS_GALLERY),
            weight: 60,
            order: 2,
            canToggleVisibility: false
        });
        /*
         * Default recommended extensions view
         * When user has installed extensions, this is shown along with the views for enabled & disabled extensions
         * When user has no installed extensions, this is shown along with the view for popular extensions
         */
        viewDescriptors.push({
            id: 'extensions.recommendedList',
            name: localize2('recommendedExtensions', "Recommended"),
            ctorDescriptor: new SyncDescriptor(DefaultRecommendedExtensionsView, [{ flexibleHeight: true }]),
            when: ContextKeyExpr.and(DefaultViewsContext, SortByUpdateDateContext.negate(), ContextKeyExpr.not('config.extensions.showRecommendationsOnlyOnDemand'), CONTEXT_HAS_GALLERY),
            weight: 40,
            order: 3,
            canToggleVisibility: true
        });
        /* Installed views shall be default in multi server window  */
        if (servers.length === 1) {
            /*
             * Default enabled extensions view - Shows all user installed enabled extensions.
             * Hidden by default
             */
            viewDescriptors.push({
                id: 'workbench.views.extensions.enabled',
                name: localize2('enabledExtensions', "Enabled"),
                ctorDescriptor: new SyncDescriptor(EnabledExtensionsView, [{}]),
                when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.has('hasInstalledExtensions')),
                hideByDefault: true,
                weight: 40,
                order: 4,
                canToggleVisibility: true
            });
            /*
             * Default disabled extensions view - Shows all disabled extensions.
             * Hidden by default
             */
            viewDescriptors.push({
                id: 'workbench.views.extensions.disabled',
                name: localize2('disabledExtensions', "Disabled"),
                ctorDescriptor: new SyncDescriptor(DisabledExtensionsView, [{}]),
                when: ContextKeyExpr.and(DefaultViewsContext, ContextKeyExpr.has('hasInstalledExtensions')),
                hideByDefault: true,
                weight: 10,
                order: 5,
                canToggleVisibility: true
            });
        }
        return viewDescriptors;
    }
    createSearchExtensionsViewDescriptors() {
        const viewDescriptors = [];
        /*
         * View used for searching Marketplace
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.marketplace',
            name: localize2('marketPlace', "Marketplace"),
            ctorDescriptor: new SyncDescriptor(SearchMarketplaceExtensionsView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchMarketplaceExtensions'), CONTEXT_HAS_GALLERY)
        });
        /*
         * View used for searching all installed extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchInstalled',
            name: localize2('installed', "Installed"),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.or(ContextKeyExpr.has('searchInstalledExtensions'), ContextKeyExpr.has('installedExtensions')),
        });
        /*
         * View used for searching recently updated extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchRecentlyUpdated',
            name: localize2('recently updated', "Recently Updated"),
            ctorDescriptor: new SyncDescriptor(RecentlyUpdatedExtensionsView, [{}]),
            when: ContextKeyExpr.or(SearchExtensionUpdatesContext, ContextKeyExpr.has('searchRecentlyUpdatedExtensions')),
            order: 2,
        });
        /*
         * View used for searching enabled extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchEnabled',
            name: localize2('enabled', "Enabled"),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchEnabledExtensions')),
        });
        /*
         * View used for searching disabled extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchDisabled',
            name: localize2('disabled', "Disabled"),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchDisabledExtensions')),
        });
        /*
         * View used for searching outdated extensions
         */
        viewDescriptors.push({
            id: OUTDATED_EXTENSIONS_VIEW_ID,
            name: localize2('availableUpdates', "Available Updates"),
            ctorDescriptor: new SyncDescriptor(OutdatedExtensionsView, [{}]),
            when: ContextKeyExpr.or(SearchExtensionUpdatesContext, ContextKeyExpr.has('searchOutdatedExtensions')),
            order: 1,
        });
        /*
         * View used for searching builtin extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchBuiltin',
            name: localize2('builtin', "Builtin"),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchBuiltInExtensions')),
        });
        /*
         * View used for searching workspace unsupported extensions
         */
        viewDescriptors.push({
            id: 'workbench.views.extensions.searchWorkspaceUnsupported',
            name: localize2('workspaceUnsupported', "Workspace Unsupported"),
            ctorDescriptor: new SyncDescriptor(ExtensionsListView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('searchWorkspaceUnsupportedExtensions')),
        });
        return viewDescriptors;
    }
    createRecommendedExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: WORKSPACE_RECOMMENDATIONS_VIEW_ID,
            name: localize2('workspaceRecommendedExtensions', "Workspace Recommendations"),
            ctorDescriptor: new SyncDescriptor(WorkspaceRecommendedExtensionsView, [{}]),
            when: ContextKeyExpr.and(ContextKeyExpr.has('recommendedExtensions'), WorkbenchStateContext.notEqualsTo('empty')),
            order: 1
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.otherRecommendations',
            name: localize2('otherRecommendedExtensions', "Other Recommendations"),
            ctorDescriptor: new SyncDescriptor(RecommendedExtensionsView, [{}]),
            when: ContextKeyExpr.has('recommendedExtensions'),
            order: 2
        });
        return viewDescriptors;
    }
    createBuiltinExtensionsViewDescriptors() {
        const viewDescriptors = [];
        const configuredCategories = ['themes', 'programming languages'];
        const otherCategories = EXTENSION_CATEGORIES.filter(c => !configuredCategories.includes(c.toLowerCase()));
        otherCategories.push(NONE_CATEGORY);
        const otherCategoriesQuery = `${otherCategories.map(c => `category:"${c}"`).join(' ')} ${configuredCategories.map(c => `category:"-${c}"`).join(' ')}`;
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinFeatureExtensions',
            name: localize2('builtinFeatureExtensions', "Features"),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [{ query: `@builtin ${otherCategoriesQuery}` }]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinThemeExtensions',
            name: localize2('builtInThemesExtensions', "Themes"),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [{ query: `@builtin category:themes` }]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.builtinProgrammingLanguageExtensions',
            name: localize2('builtinProgrammingLanguageExtensions', "Programming Languages"),
            ctorDescriptor: new SyncDescriptor(StaticQueryExtensionsView, [{ query: `@builtin category:"programming languages"` }]),
            when: ContextKeyExpr.has('builtInExtensions'),
        });
        return viewDescriptors;
    }
    createUnsupportedWorkspaceExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: 'workbench.views.extensions.untrustedUnsupportedExtensions',
            name: localize2('untrustedUnsupportedExtensions', "Disabled in Restricted Mode"),
            ctorDescriptor: new SyncDescriptor(UntrustedWorkspaceUnsupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.untrustedPartiallySupportedExtensions',
            name: localize2('untrustedPartiallySupportedExtensions', "Limited in Restricted Mode"),
            ctorDescriptor: new SyncDescriptor(UntrustedWorkspacePartiallySupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.virtualUnsupportedExtensions',
            name: localize2('virtualUnsupportedExtensions', "Disabled in Virtual Workspaces"),
            ctorDescriptor: new SyncDescriptor(VirtualWorkspaceUnsupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(VirtualWorkspaceContext, SearchUnsupportedWorkspaceExtensionsContext),
        });
        viewDescriptors.push({
            id: 'workbench.views.extensions.virtualPartiallySupportedExtensions',
            name: localize2('virtualPartiallySupportedExtensions', "Limited in Virtual Workspaces"),
            ctorDescriptor: new SyncDescriptor(VirtualWorkspacePartiallySupportedExtensionsView, [{}]),
            when: ContextKeyExpr.and(VirtualWorkspaceContext, SearchUnsupportedWorkspaceExtensionsContext),
        });
        return viewDescriptors;
    }
    createOtherLocalFilteredExtensionsViewDescriptors() {
        const viewDescriptors = [];
        viewDescriptors.push({
            id: 'workbench.views.extensions.deprecatedExtensions',
            name: localize2('deprecated', "Deprecated"),
            ctorDescriptor: new SyncDescriptor(DeprecatedExtensionsView, [{}]),
            when: ContextKeyExpr.and(SearchDeprecatedExtensionsContext),
        });
        return viewDescriptors;
    }
};
ExtensionsViewletViewsContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, ILabelService),
    __param(2, IViewDescriptorService),
    __param(3, IContextKeyService)
], ExtensionsViewletViewsContribution);
export { ExtensionsViewletViewsContribution };
let ExtensionsViewPaneContainer = class ExtensionsViewPaneContainer extends ViewPaneContainer {
    constructor(layoutService, telemetryService, progressService, instantiationService, editorGroupService, extensionGalleryManifestService, extensionsWorkbenchService, extensionManagementServerService, notificationService, paneCompositeService, themeService, configurationService, storageService, contextService, contextKeyService, contextMenuService, extensionService, viewDescriptorService, preferencesService, commandService, logService) {
        super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.progressService = progressService;
        this.editorGroupService = editorGroupService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.notificationService = notificationService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
        this.preferencesService = preferencesService;
        this.commandService = commandService;
        this.extensionGalleryManifest = null;
        this.notificationDisposables = this._register(new MutableDisposable());
        this.searchDelayer = new Delayer(500);
        this.extensionsSearchValueContextKey = ExtensionsSearchValueContext.bindTo(contextKeyService);
        this.defaultViewsContextKey = DefaultViewsContext.bindTo(contextKeyService);
        this.sortByContextKey = ExtensionsSortByContext.bindTo(contextKeyService);
        this.searchMarketplaceExtensionsContextKey = SearchMarketplaceExtensionsContext.bindTo(contextKeyService);
        this.searchMcpServersContextKey = SearchMcpServersContext.bindTo(contextKeyService);
        this.searchHasTextContextKey = SearchHasTextContext.bindTo(contextKeyService);
        this.sortByUpdateDateContextKey = SortByUpdateDateContext.bindTo(contextKeyService);
        this.installedExtensionsContextKey = InstalledExtensionsContext.bindTo(contextKeyService);
        this.searchInstalledExtensionsContextKey = SearchInstalledExtensionsContext.bindTo(contextKeyService);
        this.searchRecentlyUpdatedExtensionsContextKey = SearchRecentlyUpdatedExtensionsContext.bindTo(contextKeyService);
        this.searchExtensionUpdatesContextKey = SearchExtensionUpdatesContext.bindTo(contextKeyService);
        this.searchWorkspaceUnsupportedExtensionsContextKey = SearchUnsupportedWorkspaceExtensionsContext.bindTo(contextKeyService);
        this.searchDeprecatedExtensionsContextKey = SearchDeprecatedExtensionsContext.bindTo(contextKeyService);
        this.searchOutdatedExtensionsContextKey = SearchOutdatedExtensionsContext.bindTo(contextKeyService);
        this.searchEnabledExtensionsContextKey = SearchEnabledExtensionsContext.bindTo(contextKeyService);
        this.searchDisabledExtensionsContextKey = SearchDisabledExtensionsContext.bindTo(contextKeyService);
        this.hasInstalledExtensionsContextKey = HasInstalledExtensionsContext.bindTo(contextKeyService);
        this.builtInExtensionsContextKey = BuiltInExtensionsContext.bindTo(contextKeyService);
        this.searchBuiltInExtensionsContextKey = SearchBuiltInExtensionsContext.bindTo(contextKeyService);
        this.recommendedExtensionsContextKey = RecommendedExtensionsContext.bindTo(contextKeyService);
        this._register(this.paneCompositeService.onDidPaneCompositeOpen(e => { if (e.viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            this.onViewletOpen(e.composite);
        } }, this));
        this._register(extensionsWorkbenchService.onReset(() => this.refresh()));
        this.searchViewletState = this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        extensionGalleryManifestService.getExtensionGalleryManifest()
            .then(galleryManifest => {
            this.extensionGalleryManifest = galleryManifest;
            this._register(extensionGalleryManifestService.onDidChangeExtensionGalleryManifest(galleryManifest => {
                this.extensionGalleryManifest = galleryManifest;
                this.refresh();
            }));
        });
    }
    get searchValue() {
        return this.searchBox?.getValue();
    }
    create(parent) {
        parent.classList.add('extensions-viewlet');
        this.root = parent;
        const overlay = append(this.root, $('.overlay'));
        const overlayBackgroundColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
        overlay.style.backgroundColor = overlayBackgroundColor;
        hide(overlay);
        this.header = append(this.root, $('.header'));
        const placeholder = localize('searchExtensions', "Search Extensions in Marketplace");
        const searchValue = this.searchViewletState['query.value'] ? this.searchViewletState['query.value'] : '';
        const searchContainer = append(this.header, $('.extensions-search-container'));
        this.searchBox = this._register(this.instantiationService.createInstance(SuggestEnabledInput, `${VIEWLET_ID}.searchbox`, searchContainer, {
            triggerCharacters: ['@'],
            sortKey: (item) => {
                if (item.indexOf(':') === -1) {
                    return 'a';
                }
                else if (/ext:/.test(item) || /id:/.test(item) || /tag:/.test(item)) {
                    return 'b';
                }
                else if (/sort:/.test(item)) {
                    return 'c';
                }
                else {
                    return 'd';
                }
            },
            provideResults: (query) => Query.suggestions(query, this.extensionGalleryManifest)
        }, placeholder, 'extensions:searchinput', { placeholderText: placeholder, value: searchValue }));
        this.notificationContainer = append(this.header, $('.notification-container.hidden', { 'tabindex': '0' }));
        this.renderNotificaiton();
        this._register(this.extensionsWorkbenchService.onDidChangeExtensionsNotification(() => this.renderNotificaiton()));
        this.updateInstalledExtensionsContexts();
        if (this.searchBox.getValue()) {
            this.triggerSearch();
        }
        this._register(this.searchBox.onInputDidChange(() => {
            this.sortByContextKey.set(Query.parse(this.searchBox?.getValue() ?? '').sortBy);
            this.triggerSearch();
        }, this));
        this._register(this.searchBox.onShouldFocusResults(() => this.focusListView(), this));
        const controlElement = append(searchContainer, $('.extensions-search-actions-container'));
        this._register(this.instantiationService.createInstance(MenuWorkbenchToolBar, controlElement, extensionsSearchActionsMenu, {
            toolbarOptions: {
                primaryGroup: () => true,
            },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options)
        }));
        // Register DragAndDrop support
        this._register(new DragAndDropObserver(this.root, {
            onDragEnter: (e) => {
                if (this.isSupportedDragElement(e)) {
                    show(overlay);
                }
            },
            onDragLeave: (e) => {
                if (this.isSupportedDragElement(e)) {
                    hide(overlay);
                }
            },
            onDragOver: (e) => {
                if (this.isSupportedDragElement(e)) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            },
            onDrop: async (e) => {
                if (this.isSupportedDragElement(e)) {
                    hide(overlay);
                    const vsixs = coalesce((await this.instantiationService.invokeFunction(accessor => extractEditorsAndFilesDropData(accessor, e)))
                        .map(editor => editor.resource && extname(editor.resource) === '.vsix' ? editor.resource : undefined));
                    if (vsixs.length > 0) {
                        try {
                            // Attempt to install the extension(s)
                            await this.commandService.executeCommand(INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID, vsixs);
                        }
                        catch (err) {
                            this.notificationService.error(err);
                        }
                    }
                }
            }
        }));
        super.create(append(this.root, $('.extensions')));
        const focusTracker = this._register(trackFocus(this.root));
        const isSearchBoxFocused = () => this.searchBox?.inputWidget.hasWidgetFocus();
        this._register(registerNavigableContainer({
            name: 'extensionsView',
            focusNotifiers: [focusTracker],
            focusNextWidget: () => {
                if (isSearchBoxFocused()) {
                    this.focusListView();
                }
            },
            focusPreviousWidget: () => {
                if (!isSearchBoxFocused()) {
                    this.searchBox?.focus();
                }
            }
        }));
    }
    focus() {
        super.focus();
        this.searchBox?.focus();
    }
    layout(dimension) {
        this._dimension = dimension;
        if (this.root) {
            this.root.classList.toggle('narrow', dimension.width <= 250);
            this.root.classList.toggle('mini', dimension.width <= 200);
        }
        this.searchBox?.layout(new Dimension(dimension.width - 34 - /*padding*/ 8 - (24 * 2), 20));
        const searchBoxHeight = 20 + 21 /*margin*/;
        const headerHeight = this.header && !!this.notificationContainer?.childNodes.length ? this.notificationContainer.clientHeight + searchBoxHeight + 10 /*margin*/ : searchBoxHeight;
        this.header.style.height = `${headerHeight}px`;
        super.layout(new Dimension(dimension.width, dimension.height - headerHeight));
    }
    getOptimalWidth() {
        return 400;
    }
    search(value) {
        if (this.searchBox && this.searchBox.getValue() !== value) {
            this.searchBox.setValue(value);
        }
    }
    async refresh() {
        await this.updateInstalledExtensionsContexts();
        this.doSearch(true);
        if (this.configurationService.getValue(AutoCheckUpdatesConfigurationKey)) {
            this.extensionsWorkbenchService.checkForUpdates();
        }
    }
    renderNotificaiton() {
        if (!this.notificationContainer) {
            return;
        }
        clearNode(this.notificationContainer);
        this.notificationDisposables.value = new DisposableStore();
        const status = this.extensionsWorkbenchService.getExtensionsNotification();
        const query = status?.extensions.map(extension => `@id:${extension.identifier.id}`).join(' ');
        if (status && (query === this.searchBox?.getValue() || !this.searchMarketplaceExtensionsContextKey.get())) {
            this.notificationContainer.setAttribute('aria-label', status.message);
            this.notificationContainer.classList.remove('hidden');
            const messageContainer = append(this.notificationContainer, $('.message-container'));
            append(messageContainer, $('span')).className = SeverityIcon.className(status.severity);
            append(messageContainer, $('span.message', undefined, status.message));
            const showAction = append(messageContainer, $('span.message-text-action', {
                'tabindex': '0',
                'role': 'button',
                'aria-label': `${status.message}. ${localize('click show', "Click to Show")}`
            }, localize('show', "Show")));
            this.notificationDisposables.value.add(addDisposableListener(showAction, EventType.CLICK, () => this.search(query ?? '')));
            this.notificationDisposables.value.add(addDisposableListener(showAction, EventType.KEY_DOWN, (e) => {
                const standardKeyboardEvent = new StandardKeyboardEvent(e);
                if (standardKeyboardEvent.keyCode === 3 /* KeyCode.Enter */ || standardKeyboardEvent.keyCode === 10 /* KeyCode.Space */) {
                    this.search(query ?? '');
                }
                standardKeyboardEvent.stopPropagation();
            }));
            const dismissAction = append(this.notificationContainer, $(`span.message-action${ThemeIcon.asCSSSelector(Codicon.close)}`, {
                'tabindex': '0',
                'role': 'button',
                'aria-label': localize('dismiss', "Dismiss"),
                'title': localize('dismiss', "Dismiss")
            }));
            this.notificationDisposables.value.add(addDisposableListener(dismissAction, EventType.CLICK, () => status.dismiss()));
            this.notificationDisposables.value.add(addDisposableListener(dismissAction, EventType.KEY_DOWN, (e) => {
                const standardKeyboardEvent = new StandardKeyboardEvent(e);
                if (standardKeyboardEvent.keyCode === 3 /* KeyCode.Enter */ || standardKeyboardEvent.keyCode === 10 /* KeyCode.Space */) {
                    status.dismiss();
                }
                standardKeyboardEvent.stopPropagation();
            }));
        }
        else {
            this.notificationContainer.removeAttribute('aria-label');
            this.notificationContainer.classList.add('hidden');
        }
        if (this._dimension) {
            this.layout(this._dimension);
        }
    }
    async updateInstalledExtensionsContexts() {
        const result = await this.extensionsWorkbenchService.queryLocal();
        this.hasInstalledExtensionsContextKey.set(result.some(r => !r.isBuiltin));
    }
    triggerSearch() {
        this.searchDelayer.trigger(() => this.doSearch(), this.searchBox && this.searchBox.getValue() ? 500 : 0).then(undefined, err => this.onError(err));
    }
    normalizedQuery() {
        return this.searchBox
            ? this.searchBox.getValue()
                .trim()
                .replace(/@category/g, 'category')
                .replace(/@tag:/g, 'tag:')
                .replace(/@ext:/g, 'ext:')
                .replace(/@featured/g, 'featured')
                .replace(/@popular/g, this.extensionManagementServerService.webExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer ? '@web' : '@popular')
            : '';
    }
    saveState() {
        const value = this.searchBox ? this.searchBox.getValue() : '';
        if (ExtensionsListView.isLocalExtensionsQuery(value)) {
            this.searchViewletState['query.value'] = value;
        }
        else {
            this.searchViewletState['query.value'] = '';
        }
        super.saveState();
    }
    doSearch(refresh) {
        const value = this.normalizedQuery();
        this.contextKeyService.bufferChangeEvents(() => {
            const isRecommendedExtensionsQuery = ExtensionsListView.isRecommendedExtensionsQuery(value);
            this.searchHasTextContextKey.set(value.trim() !== '');
            this.extensionsSearchValueContextKey.set(value);
            this.installedExtensionsContextKey.set(ExtensionsListView.isInstalledExtensionsQuery(value));
            this.searchInstalledExtensionsContextKey.set(ExtensionsListView.isSearchInstalledExtensionsQuery(value));
            this.searchRecentlyUpdatedExtensionsContextKey.set(ExtensionsListView.isSearchRecentlyUpdatedQuery(value) && !ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchOutdatedExtensionsContextKey.set(ExtensionsListView.isOutdatedExtensionsQuery(value) && !ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchExtensionUpdatesContextKey.set(ExtensionsListView.isSearchExtensionUpdatesQuery(value));
            this.searchEnabledExtensionsContextKey.set(ExtensionsListView.isEnabledExtensionsQuery(value));
            this.searchDisabledExtensionsContextKey.set(ExtensionsListView.isDisabledExtensionsQuery(value));
            this.searchBuiltInExtensionsContextKey.set(ExtensionsListView.isSearchBuiltInExtensionsQuery(value));
            this.searchWorkspaceUnsupportedExtensionsContextKey.set(ExtensionsListView.isSearchWorkspaceUnsupportedExtensionsQuery(value));
            this.searchDeprecatedExtensionsContextKey.set(ExtensionsListView.isSearchDeprecatedExtensionsQuery(value));
            this.builtInExtensionsContextKey.set(ExtensionsListView.isBuiltInExtensionsQuery(value));
            this.recommendedExtensionsContextKey.set(isRecommendedExtensionsQuery);
            this.searchMcpServersContextKey.set(!!value && /@mcp\s?.*/i.test(value));
            this.searchMarketplaceExtensionsContextKey.set(!!value && !ExtensionsListView.isLocalExtensionsQuery(value) && !isRecommendedExtensionsQuery && !this.searchMcpServersContextKey.get());
            this.sortByUpdateDateContextKey.set(ExtensionsListView.isSortUpdateDateQuery(value));
            this.defaultViewsContextKey.set(!value || ExtensionsListView.isSortInstalledExtensionsQuery(value));
        });
        this.renderNotificaiton();
        return this.showExtensionsViews(this.panes);
    }
    onDidAddViewDescriptors(added) {
        const addedViews = super.onDidAddViewDescriptors(added);
        this.showExtensionsViews(addedViews);
        return addedViews;
    }
    async showExtensionsViews(views) {
        await this.progress(Promise.all(views.map(async (view) => {
            if (view instanceof AbstractExtensionsListView) {
                const model = await view.show(this.normalizedQuery());
                this.alertSearchResult(model.length, view.id);
            }
        })));
    }
    alertSearchResult(count, viewId) {
        const view = this.viewContainerModel.visibleViewDescriptors.find(view => view.id === viewId);
        switch (count) {
            case 0:
                break;
            case 1:
                if (view) {
                    alert(localize('extensionFoundInSection', "1 extension found in the {0} section.", view.name.value));
                }
                else {
                    alert(localize('extensionFound', "1 extension found."));
                }
                break;
            default:
                if (view) {
                    alert(localize('extensionsFoundInSection', "{0} extensions found in the {1} section.", count, view.name.value));
                }
                else {
                    alert(localize('extensionsFound', "{0} extensions found.", count));
                }
                break;
        }
    }
    getFirstExpandedPane() {
        for (const pane of this.panes) {
            if (pane.isExpanded() && pane instanceof ExtensionsListView) {
                return pane;
            }
        }
        return undefined;
    }
    focusListView() {
        const pane = this.getFirstExpandedPane();
        if (pane && pane.count() > 0) {
            pane.focus();
        }
    }
    onViewletOpen(viewlet) {
        if (!viewlet || viewlet.getId() === VIEWLET_ID) {
            return;
        }
        if (this.configurationService.getValue(CloseExtensionDetailsOnViewChangeKey)) {
            const promises = this.editorGroupService.groups.map(group => {
                const editors = group.editors.filter(input => input instanceof ExtensionsInput);
                return group.closeEditors(editors);
            });
            Promise.all(promises);
        }
    }
    progress(promise) {
        return this.progressService.withProgress({ location: 5 /* ProgressLocation.Extensions */ }, () => promise);
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        const message = err && err.message || '';
        if (/ECONNREFUSED/.test(message)) {
            const error = createErrorWithActions(localize('suggestProxyError', "Marketplace returned 'ECONNREFUSED'. Please check the 'http.proxy' setting."), [
                new Action('open user settings', localize('open user settings', "Open User Settings"), undefined, true, () => this.preferencesService.openUserSettings())
            ]);
            this.notificationService.error(error);
            return;
        }
        this.notificationService.error(err);
    }
    isSupportedDragElement(e) {
        if (e.dataTransfer) {
            const typesLowerCase = e.dataTransfer.types.map(t => t.toLocaleLowerCase());
            return typesLowerCase.indexOf('files') !== -1;
        }
        return false;
    }
};
ExtensionsViewPaneContainer = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, ITelemetryService),
    __param(2, IProgressService),
    __param(3, IInstantiationService),
    __param(4, IEditorGroupsService),
    __param(5, IExtensionGalleryManifestService),
    __param(6, IExtensionsWorkbenchService),
    __param(7, IExtensionManagementServerService),
    __param(8, INotificationService),
    __param(9, IPaneCompositePartService),
    __param(10, IThemeService),
    __param(11, IConfigurationService),
    __param(12, IStorageService),
    __param(13, IWorkspaceContextService),
    __param(14, IContextKeyService),
    __param(15, IContextMenuService),
    __param(16, IExtensionService),
    __param(17, IViewDescriptorService),
    __param(18, IPreferencesService),
    __param(19, ICommandService),
    __param(20, ILogService)
], ExtensionsViewPaneContainer);
export { ExtensionsViewPaneContainer };
let StatusUpdater = class StatusUpdater extends Disposable {
    constructor(activityService, extensionsWorkbenchService, extensionEnablementService, configurationService) {
        super();
        this.activityService = activityService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.configurationService = configurationService;
        this.badgeHandle = this._register(new MutableDisposable());
        this.onServiceChange();
        this._register(Event.any(Event.debounce(extensionsWorkbenchService.onChange, () => undefined, 100, undefined, undefined, undefined, this._store), extensionsWorkbenchService.onDidChangeExtensionsNotification)(this.onServiceChange, this));
    }
    onServiceChange() {
        this.badgeHandle.clear();
        let badge;
        const extensionsNotification = this.extensionsWorkbenchService.getExtensionsNotification();
        if (extensionsNotification) {
            if (extensionsNotification.severity === Severity.Warning) {
                badge = new WarningBadge(() => extensionsNotification.message);
            }
        }
        else {
            const actionRequired = this.configurationService.getValue(AutoRestartConfigurationKey) === true ? [] : this.extensionsWorkbenchService.installed.filter(e => e.runtimeState !== undefined);
            const outdated = this.extensionsWorkbenchService.outdated.reduce((r, e) => r + (this.extensionEnablementService.isEnabled(e.local) && !actionRequired.includes(e) ? 1 : 0), 0);
            const newBadgeNumber = outdated + actionRequired.length;
            if (newBadgeNumber > 0) {
                let msg = '';
                if (outdated) {
                    msg += outdated === 1 ? localize('extensionToUpdate', '{0} requires update', outdated) : localize('extensionsToUpdate', '{0} require update', outdated);
                }
                if (outdated > 0 && actionRequired.length > 0) {
                    msg += ', ';
                }
                if (actionRequired.length) {
                    msg += actionRequired.length === 1 ? localize('extensionToReload', '{0} requires restart', actionRequired.length) : localize('extensionsToReload', '{0} require restart', actionRequired.length);
                }
                badge = new NumberBadge(newBadgeNumber, () => msg);
            }
        }
        if (badge) {
            this.badgeHandle.value = this.activityService.showViewContainerActivity(VIEWLET_ID, { badge });
        }
    }
};
StatusUpdater = __decorate([
    __param(0, IActivityService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, IConfigurationService)
], StatusUpdater);
export { StatusUpdater };
let MaliciousExtensionChecker = class MaliciousExtensionChecker {
    constructor(extensionsManagementService, extensionsWorkbenchService, hostService, logService, notificationService, commandService) {
        this.extensionsManagementService = extensionsManagementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hostService = hostService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.loopCheckForMaliciousExtensions();
    }
    loopCheckForMaliciousExtensions() {
        this.checkForMaliciousExtensions()
            .then(() => timeout(1000 * 60 * 5)) // every five minutes
            .then(() => this.loopCheckForMaliciousExtensions());
    }
    async checkForMaliciousExtensions() {
        try {
            const maliciousExtensions = [];
            let shouldRestartExtensions = false;
            let shouldReloadWindow = false;
            for (const extension of this.extensionsWorkbenchService.installed) {
                if (extension.isMalicious && extension.local) {
                    maliciousExtensions.push([extension.local, extension.maliciousInfoLink]);
                    shouldRestartExtensions = shouldRestartExtensions || extension.runtimeState?.action === "restartExtensions" /* ExtensionRuntimeActionType.RestartExtensions */;
                    shouldReloadWindow = shouldReloadWindow || extension.runtimeState?.action === "reloadWindow" /* ExtensionRuntimeActionType.ReloadWindow */;
                }
            }
            if (maliciousExtensions.length) {
                await this.extensionsManagementService.uninstallExtensions(maliciousExtensions.map(e => ({ extension: e[0], options: { remove: true } })));
                for (const [extension, link] of maliciousExtensions) {
                    const buttons = [];
                    if (shouldRestartExtensions || shouldReloadWindow) {
                        buttons.push({
                            label: shouldRestartExtensions ? localize('restartNow', "Restart Extensions") : localize('reloadNow', "Reload Now"),
                            run: () => shouldRestartExtensions ? this.extensionsWorkbenchService.updateRunningExtensions() : this.hostService.reload()
                        });
                    }
                    if (link) {
                        buttons.push({
                            label: localize('learnMore', "Learn More"),
                            run: () => this.commandService.executeCommand('vscode.open', URI.parse(link))
                        });
                    }
                    this.notificationService.prompt(Severity.Warning, localize('malicious warning', "The extension '{0}' was found to be problematic and has been uninstalled", extension.manifest.displayName || extension.identifier.id), buttons, {
                        sticky: true,
                        priority: NotificationPriority.URGENT
                    });
                }
            }
        }
        catch (err) {
            this.logService.error(err);
        }
    }
};
MaliciousExtensionChecker = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IHostService),
    __param(3, ILogService),
    __param(4, INotificationService),
    __param(5, ICommandService)
], MaliciousExtensionChecker);
export { MaliciousExtensionChecker };
let ExtensionMarketplaceStatusUpdater = class ExtensionMarketplaceStatusUpdater extends Disposable {
    constructor(activityService, extensionGalleryManifestService) {
        super();
        this.activityService = activityService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.badgeHandle = this._register(new MutableDisposable());
        this.accountBadgeDisposable = this._register(new MutableDisposable());
        this.updateBadge();
        this._register(this.extensionGalleryManifestService.onDidChangeExtensionGalleryManifestStatus(() => this.updateBadge()));
    }
    async updateBadge() {
        this.badgeHandle.clear();
        const status = this.extensionGalleryManifestService.extensionGalleryManifestStatus;
        let badge;
        switch (status) {
            case "requiresSignIn" /* ExtensionGalleryManifestStatus.RequiresSignIn */:
                badge = new NumberBadge(1, () => localize('signInRequired', "Sign in required to access marketplace"));
                break;
            case "accessDenied" /* ExtensionGalleryManifestStatus.AccessDenied */:
                badge = new WarningBadge(() => localize('accessDenied', "Access denied to marketplace"));
                break;
        }
        if (badge) {
            this.badgeHandle.value = this.activityService.showViewContainerActivity(VIEWLET_ID, { badge });
        }
        this.accountBadgeDisposable.clear();
        if (status === "requiresSignIn" /* ExtensionGalleryManifestStatus.RequiresSignIn */) {
            const badge = new NumberBadge(1, () => localize('sign in enterprise marketplace', "Sign in to access Marketplace"));
            this.accountBadgeDisposable.value = this.activityService.showAccountsActivity({ badge });
        }
    }
};
ExtensionMarketplaceStatusUpdater = __decorate([
    __param(0, IActivityService),
    __param(1, IExtensionGalleryManifestService)
], ExtensionMarketplaceStatusUpdater);
export { ExtensionMarketplaceStatusUpdater };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdsZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zVmlld2xldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqSyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFF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