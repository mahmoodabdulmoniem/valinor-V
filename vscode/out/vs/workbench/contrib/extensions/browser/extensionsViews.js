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
var ExtensionsListView_1;
import { localize } from '../../../../nls.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { isCancellationError, getErrorMessage, CancellationError } from '../../../../base/common/errors.js';
import { PagedModel, DelayedPagedModel } from '../../../../base/common/paging.js';
import { ExtensionGalleryError } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService, IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { areSameExtensions, getExtensionDependencies } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ExtensionResultsListFocused, IExtensionsWorkbenchService } from '../common/extensions.js';
import { Query } from '../common/extensionQuery.js';
import { IExtensionService, toExtension } from '../../../services/extensions/common/extensions.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ViewPane, ViewPaneShowActions } from '../../../browser/parts/views/viewPane.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { coalesce, distinct, range } from '../../../../base/common/arrays.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, isLanguagePackExtension } from '../../../../platform/extensions/common/extensions.js';
import { createCancelablePromise, ThrottledDelayer } from '../../../../base/common/async.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isOfflineError } from '../../../../base/parts/request/common/request.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { isString } from '../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ExtensionsList } from './extensionsViewer.js';
export const NONE_CATEGORY = 'none';
class ExtensionsViewState extends Disposable {
    constructor() {
        super(...arguments);
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this.currentlyFocusedItems = [];
        this.filters = {};
    }
    onFocusChange(extensions) {
        this.currentlyFocusedItems.forEach(extension => this._onBlur.fire(extension));
        this.currentlyFocusedItems = extensions;
        this.currentlyFocusedItems.forEach(extension => this._onFocus.fire(extension));
    }
}
var LocalSortBy;
(function (LocalSortBy) {
    LocalSortBy["UpdateDate"] = "UpdateDate";
})(LocalSortBy || (LocalSortBy = {}));
function isLocalSortBy(value) {
    switch (value) {
        case "UpdateDate" /* LocalSortBy.UpdateDate */: return true;
    }
}
export class AbstractExtensionsListView extends ViewPane {
}
let ExtensionsListView = class ExtensionsListView extends AbstractExtensionsListView {
    static { ExtensionsListView_1 = this; }
    static { this.RECENT_UPDATE_DURATION = 7 * 24 * 60 * 60 * 1000; } // 7 days
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, storageService, workspaceTrustManagementService, extensionEnablementService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super({
            ...viewletViewOptions,
            showActions: ViewPaneShowActions.Always,
            maximumBodySize: options.flexibleHeight ? (storageService.getNumber(`${viewletViewOptions.id}.size`, 0 /* StorageScope.PROFILE */, 0) ? undefined : 0) : undefined
        }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.options = options;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionRecommendationsService = extensionRecommendationsService;
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.extensionManagementService = extensionManagementService;
        this.workspaceService = workspaceService;
        this.productService = productService;
        this.storageService = storageService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.list = null;
        this.queryRequest = null;
        this.contextMenuActionRunner = this._register(new ActionRunner());
        if (this.options.onDidChangeTitle) {
            this._register(this.options.onDidChangeTitle(title => this.updateTitle(title)));
        }
        this._register(this.contextMenuActionRunner.onDidRun(({ error }) => error && this.notificationService.error(error)));
        this.registerActions();
    }
    registerActions() { }
    renderHeader(container) {
        container.classList.add('extension-view-header');
        super.renderHeader(container);
        if (!this.options.hideBadge) {
            this.badge = this._register(new CountBadge(append(container, $('.count-badge-wrapper')), {}, defaultCountBadgeStyles));
        }
    }
    renderBody(container) {
        super.renderBody(container);
        const messageContainer = append(container, $('.message-container'));
        const messageSeverityIcon = append(messageContainer, $(''));
        const messageBox = append(messageContainer, $('.message'));
        const extensionsList = append(container, $('.extensions-list'));
        this.extensionsViewState = this._register(new ExtensionsViewState());
        this.list = this._register(this.instantiationService.createInstance(ExtensionsList, extensionsList, this.id, {}, this.extensionsViewState)).list;
        ExtensionResultsListFocused.bindTo(this.list.contextKeyService);
        this._register(this.list.onDidChangeFocus(e => this.extensionsViewState?.onFocusChange(coalesce(e.elements)), this));
        this.bodyTemplate = {
            extensionsList,
            messageBox,
            messageContainer,
            messageSeverityIcon
        };
        if (this.queryResult) {
            this.setModel(this.queryResult.model);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        if (this.bodyTemplate) {
            this.bodyTemplate.extensionsList.style.height = height + 'px';
        }
        this.list?.layout(height, width);
    }
    async show(query, refresh) {
        if (this.queryRequest) {
            if (!refresh && this.queryRequest.query === query) {
                return this.queryRequest.request;
            }
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
            if (this.extensionsViewState) {
                this.extensionsViewState.filters = {};
            }
        }
        const parsedQuery = Query.parse(query);
        const options = {
            sortOrder: 0 /* SortOrder.Default */
        };
        switch (parsedQuery.sortBy) {
            case 'installs':
                options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
                break;
            case 'rating':
                options.sortBy = "WeightedRating" /* GallerySortBy.WeightedRating */;
                break;
            case 'name':
                options.sortBy = "Title" /* GallerySortBy.Title */;
                break;
            case 'publishedDate':
                options.sortBy = "PublishedDate" /* GallerySortBy.PublishedDate */;
                break;
            case 'updateDate':
                options.sortBy = "UpdateDate" /* LocalSortBy.UpdateDate */;
                break;
        }
        const request = createCancelablePromise(async (token) => {
            try {
                this.queryResult = await this.query(parsedQuery, options, token);
                const model = this.queryResult.model;
                this.setModel(model, this.queryResult.message);
                if (this.queryResult.onDidChangeModel) {
                    this.queryResult.disposables.add(this.queryResult.onDidChangeModel(model => {
                        if (this.queryResult) {
                            this.queryResult.model = model;
                            this.updateModel(model);
                        }
                    }));
                }
                return model;
            }
            catch (e) {
                const model = new PagedModel([]);
                if (!isCancellationError(e)) {
                    this.logService.error(e);
                    this.setModel(model, this.getMessage(e));
                }
                return this.list ? this.list.model : model;
            }
        });
        request.finally(() => this.queryRequest = null);
        this.queryRequest = { query, request };
        return request;
    }
    count() {
        return this.queryResult?.model.length ?? 0;
    }
    showEmptyModel() {
        const emptyModel = new PagedModel([]);
        this.setModel(emptyModel);
        return Promise.resolve(emptyModel);
    }
    async query(query, options, token) {
        const idRegex = /@id:(([a-z0-9A-Z][a-z0-9\-A-Z]*)\.([a-z0-9A-Z][a-z0-9\-A-Z]*))/g;
        const ids = [];
        let idMatch;
        while ((idMatch = idRegex.exec(query.value)) !== null) {
            const name = idMatch[1];
            ids.push(name);
        }
        if (ids.length) {
            const model = await this.queryByIds(ids, options, token);
            return { model, disposables: new DisposableStore() };
        }
        if (ExtensionsListView_1.isLocalExtensionsQuery(query.value, query.sortBy)) {
            return this.queryLocal(query, options);
        }
        if (ExtensionsListView_1.isSearchPopularQuery(query.value)) {
            query.value = query.value.replace('@popular', '');
            options.sortBy = !options.sortBy ? "InstallCount" /* GallerySortBy.InstallCount */ : options.sortBy;
        }
        else if (ExtensionsListView_1.isSearchRecentlyPublishedQuery(query.value)) {
            query.value = query.value.replace('@recentlyPublished', '');
            options.sortBy = !options.sortBy ? "PublishedDate" /* GallerySortBy.PublishedDate */ : options.sortBy;
        }
        const galleryQueryOptions = { ...options, sortBy: isLocalSortBy(options.sortBy) ? undefined : options.sortBy };
        return this.queryGallery(query, galleryQueryOptions, token);
    }
    async queryByIds(ids, options, token) {
        const idsSet = ids.reduce((result, id) => { result.add(id.toLowerCase()); return result; }, new Set());
        const result = (await this.extensionsWorkbenchService.queryLocal(this.options.server))
            .filter(e => idsSet.has(e.identifier.id.toLowerCase()));
        const galleryIds = result.length ? ids.filter(id => result.every(r => !areSameExtensions(r.identifier, { id }))) : ids;
        if (galleryIds.length) {
            const galleryResult = await this.extensionsWorkbenchService.getExtensions(galleryIds.map(id => ({ id })), { source: 'queryById' }, token);
            result.push(...galleryResult);
        }
        return new PagedModel(result);
    }
    async queryLocal(query, options) {
        const local = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        let { extensions, canIncludeInstalledExtensions, description } = await this.filterLocal(local, this.extensionService.extensions, query, options);
        const disposables = new DisposableStore();
        const onDidChangeModel = disposables.add(new Emitter());
        if (canIncludeInstalledExtensions) {
            let isDisposed = false;
            disposables.add(toDisposable(() => isDisposed = true));
            disposables.add(Event.debounce(Event.any(Event.filter(this.extensionsWorkbenchService.onChange, e => e?.state === 1 /* ExtensionState.Installed */), this.extensionService.onDidChangeExtensions), () => undefined)(async () => {
                const local = this.options.server ? this.extensionsWorkbenchService.installed.filter(e => e.server === this.options.server) : this.extensionsWorkbenchService.local;
                const { extensions: newExtensions } = await this.filterLocal(local, this.extensionService.extensions, query, options);
                if (!isDisposed) {
                    const mergedExtensions = this.mergeAddedExtensions(extensions, newExtensions);
                    if (mergedExtensions) {
                        extensions = mergedExtensions;
                        onDidChangeModel.fire(new PagedModel(extensions));
                    }
                }
            }));
        }
        return {
            model: new PagedModel(extensions),
            message: description ? { text: description, severity: Severity.Info } : undefined,
            onDidChangeModel: onDidChangeModel.event,
            disposables
        };
    }
    async filterLocal(local, runningExtensions, query, options) {
        const value = query.value;
        let extensions = [];
        let description;
        const includeBuiltin = /@builtin/i.test(value);
        const canIncludeInstalledExtensions = !includeBuiltin;
        if (/@installed/i.test(value)) {
            extensions = this.filterInstalledExtensions(local, runningExtensions, query, options);
        }
        else if (/@outdated/i.test(value)) {
            extensions = this.filterOutdatedExtensions(local, query, options);
        }
        else if (/@disabled/i.test(value)) {
            extensions = this.filterDisabledExtensions(local, runningExtensions, query, options, includeBuiltin);
        }
        else if (/@enabled/i.test(value)) {
            extensions = this.filterEnabledExtensions(local, runningExtensions, query, options, includeBuiltin);
        }
        else if (/@workspaceUnsupported/i.test(value)) {
            extensions = this.filterWorkspaceUnsupportedExtensions(local, query, options);
        }
        else if (/@deprecated/i.test(query.value)) {
            extensions = await this.filterDeprecatedExtensions(local, query, options);
        }
        else if (/@recentlyUpdated/i.test(query.value)) {
            extensions = this.filterRecentlyUpdatedExtensions(local, query, options);
        }
        else if (/@feature:/i.test(query.value)) {
            const result = this.filterExtensionsByFeature(local, query);
            if (result) {
                extensions = result.extensions;
                description = result.description;
            }
        }
        else if (includeBuiltin) {
            extensions = this.filterBuiltinExtensions(local, query, options);
        }
        return { extensions, canIncludeInstalledExtensions, description };
    }
    filterBuiltinExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replaceAll(/@builtin/gi, '').replaceAll(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local
            .filter(e => e.isBuiltin && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterExtensionByCategory(e, includedCategories, excludedCategories) {
        if (!includedCategories.length && !excludedCategories.length) {
            return true;
        }
        if (e.categories.length) {
            if (excludedCategories.length && e.categories.some(category => excludedCategories.includes(category.toLowerCase()))) {
                return false;
            }
            return e.categories.some(category => includedCategories.includes(category.toLowerCase()));
        }
        else {
            return includedCategories.includes(NONE_CATEGORY);
        }
    }
    parseCategories(value) {
        const includedCategories = [];
        const excludedCategories = [];
        value = value.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
            const entry = (category || quotedCategory || '').toLowerCase();
            if (entry.startsWith('-')) {
                if (excludedCategories.indexOf(entry) === -1) {
                    excludedCategories.push(entry);
                }
            }
            else {
                if (includedCategories.indexOf(entry) === -1) {
                    includedCategories.push(entry);
                }
            }
            return '';
        });
        return { value, includedCategories, excludedCategories };
    }
    filterInstalledExtensions(local, runningExtensions, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@installed/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const matchingText = (e) => (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1 || e.description.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories);
        let result;
        if (options.sortBy !== undefined) {
            result = local.filter(e => !e.isBuiltin && matchingText(e));
            result = this.sortExtensions(result, options);
        }
        else {
            result = local.filter(e => (!e.isBuiltin || e.outdated || e.runtimeState !== undefined) && matchingText(e));
            const runningExtensionsById = runningExtensions.reduce((result, e) => { result.set(e.identifier.value, e); return result; }, new ExtensionIdentifierMap());
            const defaultSort = (e1, e2) => {
                const running1 = runningExtensionsById.get(e1.identifier.id);
                const isE1Running = !!running1 && this.extensionManagementServerService.getExtensionManagementServer(toExtension(running1)) === e1.server;
                const running2 = runningExtensionsById.get(e2.identifier.id);
                const isE2Running = running2 && this.extensionManagementServerService.getExtensionManagementServer(toExtension(running2)) === e2.server;
                if ((isE1Running && isE2Running)) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                const isE1LanguagePackExtension = e1.local && isLanguagePackExtension(e1.local.manifest);
                const isE2LanguagePackExtension = e2.local && isLanguagePackExtension(e2.local.manifest);
                if (!isE1Running && !isE2Running) {
                    if (isE1LanguagePackExtension) {
                        return -1;
                    }
                    if (isE2LanguagePackExtension) {
                        return 1;
                    }
                    return e1.displayName.localeCompare(e2.displayName);
                }
                if ((isE1Running && isE2LanguagePackExtension) || (isE2Running && isE1LanguagePackExtension)) {
                    return e1.displayName.localeCompare(e2.displayName);
                }
                return isE1Running ? -1 : 1;
            };
            const incompatible = [];
            const deprecated = [];
            const outdated = [];
            const actionRequired = [];
            const noActionRequired = [];
            for (const e of result) {
                if (e.enablementState === 6 /* EnablementState.DisabledByInvalidExtension */) {
                    incompatible.push(e);
                }
                else if (e.deprecationInfo) {
                    deprecated.push(e);
                }
                else if (e.outdated && this.extensionEnablementService.isEnabledEnablementState(e.enablementState)) {
                    outdated.push(e);
                }
                else if (e.runtimeState) {
                    actionRequired.push(e);
                }
                else {
                    noActionRequired.push(e);
                }
            }
            result = [
                ...incompatible.sort(defaultSort),
                ...deprecated.sort(defaultSort),
                ...outdated.sort(defaultSort),
                ...actionRequired.sort(defaultSort),
                ...noActionRequired.sort(defaultSort)
            ];
        }
        return result;
    }
    filterOutdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replace(/@outdated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(extension => extension.outdated
            && (extension.name.toLowerCase().indexOf(value) > -1 || extension.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(extension, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterDisabledExtensions(local, runningExtensions, query, options, includeBuiltin) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value.replaceAll(/@disabled|@builtin/gi, '').replaceAll(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        if (includeBuiltin) {
            local = local.filter(e => e.isBuiltin);
        }
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(e => runningExtensions.every(r => !areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier))
            && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterEnabledExtensions(local, runningExtensions, query, options, includeBuiltin) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        value = value ? value.replaceAll(/@enabled|@builtin/gi, '').replaceAll(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase() : '';
        local = local.filter(e => e.isBuiltin === includeBuiltin);
        const result = local
            .sort((e1, e2) => e1.displayName.localeCompare(e2.displayName))
            .filter(e => runningExtensions.some(r => areSameExtensions({ id: r.identifier.value, uuid: r.uuid }, e.identifier))
            && (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        return this.sortExtensions(result, options);
    }
    filterWorkspaceUnsupportedExtensions(local, query, options) {
        // shows local extensions which are restricted or disabled in the current workspace because of the extension's capability
        const queryString = query.value; // @sortby is already filtered out
        const match = queryString.match(/^\s*@workspaceUnsupported(?::(untrusted|virtual)(Partial)?)?(?:\s+([^\s]*))?/i);
        if (!match) {
            return [];
        }
        const type = match[1]?.toLowerCase();
        const partial = !!match[2];
        const nameFilter = match[3]?.toLowerCase();
        if (nameFilter) {
            local = local.filter(extension => extension.name.toLowerCase().indexOf(nameFilter) > -1 || extension.displayName.toLowerCase().indexOf(nameFilter) > -1);
        }
        const hasVirtualSupportType = (extension, supportType) => {
            return extension.local && this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.local.manifest) === supportType;
        };
        const hasRestrictedSupportType = (extension, supportType) => {
            if (!extension.local) {
                return false;
            }
            const enablementState = this.extensionEnablementService.getEnablementState(extension.local);
            if (enablementState !== 11 /* EnablementState.EnabledGlobally */ && enablementState !== 12 /* EnablementState.EnabledWorkspace */ &&
                enablementState !== 0 /* EnablementState.DisabledByTrustRequirement */ && enablementState !== 8 /* EnablementState.DisabledByExtensionDependency */) {
                return false;
            }
            if (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.local.manifest) === supportType) {
                return true;
            }
            if (supportType === false) {
                const dependencies = getExtensionDependencies(local.map(ext => ext.local), extension.local);
                return dependencies.some(ext => this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(ext.manifest) === supportType);
            }
            return false;
        };
        const inVirtualWorkspace = isVirtualWorkspace(this.workspaceService.getWorkspace());
        const inRestrictedWorkspace = !this.workspaceTrustManagementService.isWorkspaceTrusted();
        if (type === 'virtual') {
            // show limited and disabled extensions unless disabled because of a untrusted workspace
            local = local.filter(extension => inVirtualWorkspace && hasVirtualSupportType(extension, partial ? 'limited' : false) && !(inRestrictedWorkspace && hasRestrictedSupportType(extension, false)));
        }
        else if (type === 'untrusted') {
            // show limited and disabled extensions unless disabled because of a virtual workspace
            local = local.filter(extension => hasRestrictedSupportType(extension, partial ? 'limited' : false) && !(inVirtualWorkspace && hasVirtualSupportType(extension, false)));
        }
        else {
            // show extensions that are restricted or disabled in the current workspace
            local = local.filter(extension => inVirtualWorkspace && !hasVirtualSupportType(extension, true) || inRestrictedWorkspace && !hasRestrictedSupportType(extension, true));
        }
        return this.sortExtensions(local, options);
    }
    async filterDeprecatedExtensions(local, query, options) {
        const value = query.value.replace(/@deprecated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
        const deprecatedExtensionIds = Object.keys(extensionsControlManifest.deprecated);
        local = local.filter(e => deprecatedExtensionIds.includes(e.identifier.id) && (!value || e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1));
        return this.sortExtensions(local, options);
    }
    filterRecentlyUpdatedExtensions(local, query, options) {
        let { value, includedCategories, excludedCategories } = this.parseCategories(query.value);
        const currentTime = Date.now();
        local = local.filter(e => !e.isBuiltin && !e.outdated && e.local?.updated && e.local?.installedTimestamp !== undefined && currentTime - e.local.installedTimestamp < ExtensionsListView_1.RECENT_UPDATE_DURATION);
        value = value.replace(/@recentlyUpdated/g, '').replace(/@sort:(\w+)(-\w*)?/g, '').trim().toLowerCase();
        const result = local.filter(e => (e.name.toLowerCase().indexOf(value) > -1 || e.displayName.toLowerCase().indexOf(value) > -1)
            && this.filterExtensionByCategory(e, includedCategories, excludedCategories));
        options.sortBy = options.sortBy ?? "UpdateDate" /* LocalSortBy.UpdateDate */;
        return this.sortExtensions(result, options);
    }
    filterExtensionsByFeature(local, query) {
        const value = query.value.replace(/@feature:/g, '').trim();
        const featureId = value.split(' ')[0];
        const feature = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeature(featureId);
        if (!feature) {
            return undefined;
        }
        if (this.extensionsViewState) {
            this.extensionsViewState.filters.featureId = featureId;
        }
        const renderer = feature.renderer ? this.instantiationService.createInstance(feature.renderer) : undefined;
        try {
            const result = [];
            for (const e of local) {
                if (!e.local) {
                    continue;
                }
                const accessData = this.extensionFeaturesManagementService.getAccessData(new ExtensionIdentifier(e.identifier.id), featureId);
                const shouldRender = renderer?.shouldRender(e.local.manifest);
                if (accessData || shouldRender) {
                    result.push([e, accessData?.accessTimes.length ?? 0]);
                }
            }
            return {
                extensions: result.sort(([, a], [, b]) => b - a).map(([e]) => e),
                description: localize('showingExtensionsForFeature', "Extensions using {0} in the last 30 days", feature.label)
            };
        }
        finally {
            renderer?.dispose();
        }
    }
    mergeAddedExtensions(extensions, newExtensions) {
        const oldExtensions = [...extensions];
        const findPreviousExtensionIndex = (from) => {
            let index = -1;
            const previousExtensionInNew = newExtensions[from];
            if (previousExtensionInNew) {
                index = oldExtensions.findIndex(e => areSameExtensions(e.identifier, previousExtensionInNew.identifier));
                if (index === -1) {
                    return findPreviousExtensionIndex(from - 1);
                }
            }
            return index;
        };
        let hasChanged = false;
        for (let index = 0; index < newExtensions.length; index++) {
            const extension = newExtensions[index];
            if (extensions.every(r => !areSameExtensions(r.identifier, extension.identifier))) {
                hasChanged = true;
                extensions.splice(findPreviousExtensionIndex(index - 1) + 1, 0, extension);
            }
        }
        return hasChanged ? extensions : undefined;
    }
    async queryGallery(query, options, token) {
        const hasUserDefinedSortOrder = options.sortBy !== undefined;
        if (!hasUserDefinedSortOrder && !query.value.trim()) {
            options.sortBy = "InstallCount" /* GallerySortBy.InstallCount */;
        }
        if (this.isRecommendationsQuery(query)) {
            const model = await this.queryRecommendations(query, options, token);
            return { model, disposables: new DisposableStore() };
        }
        const text = query.value;
        if (!text) {
            options.source = 'viewlet';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return { model: new PagedModel(pager), disposables: new DisposableStore() };
        }
        if (/\bext:([^\s]+)\b/g.test(text)) {
            options.text = text;
            options.source = 'file-extension-tags';
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return { model: new PagedModel(pager), disposables: new DisposableStore() };
        }
        options.text = text.substring(0, 350);
        options.source = 'searchText';
        if (hasUserDefinedSortOrder || /\b(category|tag):([^\s]+)\b/gi.test(text) || /\bfeatured(\s+|\b|$)/gi.test(text)) {
            const pager = await this.extensionsWorkbenchService.queryGallery(options, token);
            return { model: new PagedModel(pager), disposables: new DisposableStore() };
        }
        try {
            const [pager, preferredExtensions] = await Promise.all([
                this.extensionsWorkbenchService.queryGallery(options, token),
                this.getPreferredExtensions(options.text.toLowerCase(), token).catch(() => [])
            ]);
            const model = preferredExtensions.length ? new PreferredExtensionsPagedModel(preferredExtensions, pager) : new PagedModel(pager);
            return { model, disposables: new DisposableStore() };
        }
        catch (error) {
            if (isCancellationError(error)) {
                throw error;
            }
            if (!(error instanceof ExtensionGalleryError)) {
                throw error;
            }
            const searchText = options.text.toLowerCase();
            const localExtensions = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && (e.name.toLowerCase().indexOf(searchText) > -1 || e.displayName.toLowerCase().indexOf(searchText) > -1 || e.description.toLowerCase().indexOf(searchText) > -1));
            if (localExtensions.length) {
                const message = this.getMessage(error);
                return { model: new PagedModel(localExtensions), disposables: new DisposableStore(), message: { text: localize('showing local extensions only', "{0} Showing local extensions.", message.text), severity: message.severity } };
            }
            throw error;
        }
    }
    async getPreferredExtensions(searchText, token) {
        const preferredExtensions = this.extensionsWorkbenchService.local.filter(e => !e.isBuiltin && (e.name.toLowerCase().indexOf(searchText) > -1 || e.displayName.toLowerCase().indexOf(searchText) > -1 || e.description.toLowerCase().indexOf(searchText) > -1));
        const preferredExtensionUUIDs = new Set();
        if (preferredExtensions.length) {
            // Update gallery data for preferred extensions if they are not yet fetched
            const extesionsToFetch = [];
            for (const extension of preferredExtensions) {
                if (extension.identifier.uuid) {
                    preferredExtensionUUIDs.add(extension.identifier.uuid);
                }
                if (!extension.gallery && extension.identifier.uuid) {
                    extesionsToFetch.push(extension.identifier);
                }
            }
            if (extesionsToFetch.length) {
                this.extensionsWorkbenchService.getExtensions(extesionsToFetch, CancellationToken.None).catch(e => null /*ignore error*/);
            }
        }
        const preferredResults = [];
        try {
            const manifest = await this.extensionManagementService.getExtensionsControlManifest();
            if (Array.isArray(manifest.search)) {
                for (const s of manifest.search) {
                    if (s.query && s.query.toLowerCase() === searchText && Array.isArray(s.preferredResults)) {
                        preferredResults.push(...s.preferredResults);
                        break;
                    }
                }
            }
            if (preferredResults.length) {
                const result = await this.extensionsWorkbenchService.getExtensions(preferredResults.map(id => ({ id })), token);
                for (const extension of result) {
                    if (extension.identifier.uuid && !preferredExtensionUUIDs.has(extension.identifier.uuid)) {
                        preferredExtensions.push(extension);
                    }
                }
            }
        }
        catch (e) {
            this.logService.warn('Failed to get preferred results from the extensions control manifest.', e);
        }
        return preferredExtensions;
    }
    sortExtensions(extensions, options) {
        switch (options.sortBy) {
            case "InstallCount" /* GallerySortBy.InstallCount */:
                extensions = extensions.sort((e1, e2) => typeof e2.installCount === 'number' && typeof e1.installCount === 'number' ? e2.installCount - e1.installCount : NaN);
                break;
            case "UpdateDate" /* LocalSortBy.UpdateDate */:
                extensions = extensions.sort((e1, e2) => typeof e2.local?.installedTimestamp === 'number' && typeof e1.local?.installedTimestamp === 'number' ? e2.local.installedTimestamp - e1.local.installedTimestamp :
                    typeof e2.local?.installedTimestamp === 'number' ? 1 :
                        typeof e1.local?.installedTimestamp === 'number' ? -1 : NaN);
                break;
            case "AverageRating" /* GallerySortBy.AverageRating */:
            case "WeightedRating" /* GallerySortBy.WeightedRating */:
                extensions = extensions.sort((e1, e2) => typeof e2.rating === 'number' && typeof e1.rating === 'number' ? e2.rating - e1.rating : NaN);
                break;
            default:
                extensions = extensions.sort((e1, e2) => e1.displayName.localeCompare(e2.displayName));
                break;
        }
        if (options.sortOrder === 2 /* SortOrder.Descending */) {
            extensions = extensions.reverse();
        }
        return extensions;
    }
    isRecommendationsQuery(query) {
        return ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value)
            || /@recommended:all/i.test(query.value)
            || ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value)
            || ExtensionsListView_1.isRecommendedExtensionsQuery(query.value);
    }
    async queryRecommendations(query, options, token) {
        // Workspace recommendations
        if (ExtensionsListView_1.isWorkspaceRecommendedExtensionsQuery(query.value)) {
            return this.getWorkspaceRecommendationsModel(query, options, token);
        }
        // Keymap recommendations
        if (ExtensionsListView_1.isKeymapsRecommendedExtensionsQuery(query.value)) {
            return this.getKeymapRecommendationsModel(query, options, token);
        }
        // Language recommendations
        if (ExtensionsListView_1.isLanguageRecommendedExtensionsQuery(query.value)) {
            return this.getLanguageRecommendationsModel(query, options, token);
        }
        // Exe recommendations
        if (ExtensionsListView_1.isExeRecommendedExtensionsQuery(query.value)) {
            return this.getExeRecommendationsModel(query, options, token);
        }
        // Remote recommendations
        if (ExtensionsListView_1.isRemoteRecommendedExtensionsQuery(query.value)) {
            return this.getRemoteRecommendationsModel(query, options, token);
        }
        // All recommendations
        if (/@recommended:all/i.test(query.value)) {
            return this.getAllRecommendationsModel(options, token);
        }
        // Search recommendations
        if (ExtensionsListView_1.isSearchRecommendedExtensionsQuery(query.value) ||
            (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value) && options.sortBy !== undefined)) {
            return this.searchRecommendations(query, options, token);
        }
        // Other recommendations
        if (ExtensionsListView_1.isRecommendedExtensionsQuery(query.value)) {
            return this.getOtherRecommendationsModel(query, options, token);
        }
        return new PagedModel([]);
    }
    async getInstallableRecommendations(recommendations, options, token) {
        const result = [];
        if (recommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of recommendations) {
                if (typeof recommendation === 'string') {
                    galleryExtensions.push(recommendation);
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            if (galleryExtensions.length) {
                try {
                    const extensions = await this.extensionsWorkbenchService.getExtensions(galleryExtensions.map(id => ({ id })), { source: options.source }, token);
                    for (const extension of extensions) {
                        if (extension.gallery && !extension.deprecationInfo
                            && await this.extensionManagementService.canInstall(extension.gallery) === true) {
                            result.push(extension);
                        }
                    }
                }
                catch (error) {
                    if (!resourceExtensions.length || !this.isOfflineError(error)) {
                        throw error;
                    }
                }
            }
            if (resourceExtensions.length) {
                const extensions = await this.extensionsWorkbenchService.getResourceExtensions(resourceExtensions, true);
                for (const extension of extensions) {
                    if (await this.extensionsWorkbenchService.canInstall(extension) === true) {
                        result.push(extension);
                    }
                }
            }
        }
        return result;
    }
    async getWorkspaceRecommendations() {
        const recommendations = await this.extensionRecommendationsService.getWorkspaceRecommendations();
        const { important } = await this.extensionRecommendationsService.getConfigBasedRecommendations();
        for (const configBasedRecommendation of important) {
            if (!recommendations.find(extensionId => extensionId === configBasedRecommendation)) {
                recommendations.push(configBasedRecommendation);
            }
        }
        return recommendations;
    }
    async getWorkspaceRecommendationsModel(query, options, token) {
        const recommendations = await this.getWorkspaceRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-workspace' }, token));
        return new PagedModel(installableRecommendations);
    }
    async getKeymapRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:keymaps/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getKeymapRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-keymaps' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getLanguageRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:languages/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getLanguageRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-languages' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getRemoteRecommendationsModel(query, options, token) {
        const value = query.value.replace(/@recommended:remotes/g, '').trim().toLowerCase();
        const recommendations = this.extensionRecommendationsService.getRemoteRecommendations();
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations-remotes' }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(installableRecommendations);
    }
    async getExeRecommendationsModel(query, options, token) {
        const exe = query.value.replace(/@exe:/g, '').trim().toLowerCase();
        const { important, others } = await this.extensionRecommendationsService.getExeBasedRecommendations(exe.startsWith('"') ? exe.substring(1, exe.length - 1) : exe);
        const installableRecommendations = await this.getInstallableRecommendations([...important, ...others], { ...options, source: 'recommendations-exe' }, token);
        return new PagedModel(installableRecommendations);
    }
    async getOtherRecommendationsModel(query, options, token) {
        const otherRecommendations = await this.getOtherRecommendations();
        const installableRecommendations = await this.getInstallableRecommendations(otherRecommendations, { ...options, source: 'recommendations-other', sortBy: undefined }, token);
        const result = coalesce(otherRecommendations.map(id => installableRecommendations.find(i => areSameExtensions(i.identifier, { id }))));
        return new PagedModel(result);
    }
    async getOtherRecommendations() {
        const local = (await this.extensionsWorkbenchService.queryLocal(this.options.server))
            .map(e => e.identifier.id.toLowerCase());
        const workspaceRecommendations = (await this.getWorkspaceRecommendations())
            .map(extensionId => isString(extensionId) ? extensionId.toLowerCase() : extensionId);
        return distinct((await Promise.all([
            // Order is important
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations()
        ])).flat().filter(extensionId => !local.includes(extensionId.toLowerCase()) && !workspaceRecommendations.includes(extensionId.toLowerCase())), extensionId => extensionId.toLowerCase());
    }
    // Get All types of recommendations, trimmed to show a max of 8 at any given time
    async getAllRecommendationsModel(options, token) {
        const localExtensions = await this.extensionsWorkbenchService.queryLocal(this.options.server);
        const localExtensionIds = localExtensions.map(e => e.identifier.id.toLowerCase());
        const allRecommendations = distinct((await Promise.all([
            // Order is important
            this.getWorkspaceRecommendations(),
            this.extensionRecommendationsService.getImportantRecommendations(),
            this.extensionRecommendationsService.getFileBasedRecommendations(),
            this.extensionRecommendationsService.getOtherRecommendations()
        ])).flat().filter(extensionId => {
            if (isString(extensionId)) {
                return !localExtensionIds.includes(extensionId.toLowerCase());
            }
            return !localExtensions.some(localExtension => localExtension.local && this.uriIdentityService.extUri.isEqual(localExtension.local.location, extensionId));
        }));
        const installableRecommendations = await this.getInstallableRecommendations(allRecommendations, { ...options, source: 'recommendations-all', sortBy: undefined }, token);
        const result = [];
        for (let i = 0; i < installableRecommendations.length && result.length < 8; i++) {
            const recommendation = allRecommendations[i];
            if (isString(recommendation)) {
                const extension = installableRecommendations.find(extension => areSameExtensions(extension.identifier, { id: recommendation }));
                if (extension) {
                    result.push(extension);
                }
            }
            else {
                const extension = installableRecommendations.find(extension => extension.resourceExtension && this.uriIdentityService.extUri.isEqual(extension.resourceExtension.location, recommendation));
                if (extension) {
                    result.push(extension);
                }
            }
        }
        return new PagedModel(result);
    }
    async searchRecommendations(query, options, token) {
        const value = query.value.replace(/@recommended/g, '').trim().toLowerCase();
        const recommendations = distinct([...await this.getWorkspaceRecommendations(), ...await this.getOtherRecommendations()]);
        const installableRecommendations = (await this.getInstallableRecommendations(recommendations, { ...options, source: 'recommendations', sortBy: undefined }, token))
            .filter(extension => extension.identifier.id.toLowerCase().indexOf(value) > -1);
        return new PagedModel(this.sortExtensions(installableRecommendations, options));
    }
    setModel(model, message, donotResetScrollTop) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody(message);
            if (!donotResetScrollTop) {
                this.list.scrollTop = 0;
            }
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateModel(model) {
        if (this.list) {
            this.list.model = new DelayedPagedModel(model);
            this.updateBody();
        }
        if (this.badge) {
            this.badge.setCount(this.count());
        }
    }
    updateBody(message) {
        if (this.bodyTemplate) {
            const count = this.count();
            this.bodyTemplate.extensionsList.classList.toggle('hidden', count === 0);
            this.bodyTemplate.messageContainer.classList.toggle('hidden', !message && count > 0);
            if (this.isBodyVisible()) {
                if (message) {
                    this.bodyTemplate.messageSeverityIcon.className = SeverityIcon.className(message.severity);
                    this.bodyTemplate.messageBox.textContent = message.text;
                }
                else if (this.count() === 0) {
                    this.bodyTemplate.messageSeverityIcon.className = '';
                    this.bodyTemplate.messageBox.textContent = localize('no extensions found', "No extensions found.");
                }
                if (this.bodyTemplate.messageBox.textContent) {
                    alert(this.bodyTemplate.messageBox.textContent);
                }
            }
        }
        this.updateSize();
    }
    getMessage(error) {
        if (this.isOfflineError(error)) {
            return { text: localize('offline error', "Unable to search the Marketplace when offline, please check your network connection."), severity: Severity.Warning };
        }
        else {
            return { text: localize('error', "Error while fetching extensions. {0}", getErrorMessage(error)), severity: Severity.Error };
        }
    }
    isOfflineError(error) {
        if (error instanceof ExtensionGalleryError) {
            return error.code === "Offline" /* ExtensionGalleryErrorCode.Offline */;
        }
        return isOfflineError(error);
    }
    updateSize() {
        if (this.options.flexibleHeight) {
            this.maximumBodySize = this.list?.model.length ? Number.POSITIVE_INFINITY : 0;
            this.storageService.store(`${this.id}.size`, this.list?.model.length || 0, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    dispose() {
        super.dispose();
        if (this.queryRequest) {
            this.queryRequest.request.cancel();
            this.queryRequest = null;
        }
        if (this.queryResult) {
            this.queryResult.disposables.dispose();
            this.queryResult = undefined;
        }
        this.list = null;
    }
    static isLocalExtensionsQuery(query, sortBy) {
        return this.isInstalledExtensionsQuery(query)
            || this.isSearchInstalledExtensionsQuery(query)
            || this.isOutdatedExtensionsQuery(query)
            || this.isEnabledExtensionsQuery(query)
            || this.isDisabledExtensionsQuery(query)
            || this.isBuiltInExtensionsQuery(query)
            || this.isSearchBuiltInExtensionsQuery(query)
            || this.isBuiltInGroupExtensionsQuery(query)
            || this.isSearchDeprecatedExtensionsQuery(query)
            || this.isSearchWorkspaceUnsupportedExtensionsQuery(query)
            || this.isSearchRecentlyUpdatedQuery(query)
            || this.isSearchExtensionUpdatesQuery(query)
            || this.isSortInstalledExtensionsQuery(query, sortBy)
            || this.isFeatureExtensionsQuery(query);
    }
    static isSearchBuiltInExtensionsQuery(query) {
        return /@builtin\s.+|.+\s@builtin/i.test(query);
    }
    static isBuiltInExtensionsQuery(query) {
        return /^@builtin$/i.test(query.trim());
    }
    static isBuiltInGroupExtensionsQuery(query) {
        return /^@builtin:.+$/i.test(query.trim());
    }
    static isSearchWorkspaceUnsupportedExtensionsQuery(query) {
        return /^\s*@workspaceUnsupported(:(untrusted|virtual)(Partial)?)?(\s|$)/i.test(query);
    }
    static isInstalledExtensionsQuery(query) {
        return /@installed$/i.test(query);
    }
    static isSearchInstalledExtensionsQuery(query) {
        return /@installed\s./i.test(query) || this.isFeatureExtensionsQuery(query);
    }
    static isOutdatedExtensionsQuery(query) {
        return /@outdated/i.test(query);
    }
    static isEnabledExtensionsQuery(query) {
        return /@enabled/i.test(query) && !/@builtin/i.test(query);
    }
    static isDisabledExtensionsQuery(query) {
        return /@disabled/i.test(query) && !/@builtin/i.test(query);
    }
    static isSearchDeprecatedExtensionsQuery(query) {
        return /@deprecated\s?.*/i.test(query);
    }
    static isRecommendedExtensionsQuery(query) {
        return /^@recommended$/i.test(query.trim());
    }
    static isSearchRecommendedExtensionsQuery(query) {
        return /@recommended\s.+/i.test(query);
    }
    static isWorkspaceRecommendedExtensionsQuery(query) {
        return /@recommended:workspace/i.test(query);
    }
    static isExeRecommendedExtensionsQuery(query) {
        return /@exe:.+/i.test(query);
    }
    static isRemoteRecommendedExtensionsQuery(query) {
        return /@recommended:remotes/i.test(query);
    }
    static isKeymapsRecommendedExtensionsQuery(query) {
        return /@recommended:keymaps/i.test(query);
    }
    static isLanguageRecommendedExtensionsQuery(query) {
        return /@recommended:languages/i.test(query);
    }
    static isSortInstalledExtensionsQuery(query, sortBy) {
        return (sortBy !== undefined && sortBy !== '' && query === '') || (!sortBy && /^@sort:\S*$/i.test(query));
    }
    static isSearchPopularQuery(query) {
        return /@popular/i.test(query);
    }
    static isSearchRecentlyPublishedQuery(query) {
        return /@recentlyPublished/i.test(query);
    }
    static isSearchRecentlyUpdatedQuery(query) {
        return /@recentlyUpdated/i.test(query);
    }
    static isSearchExtensionUpdatesQuery(query) {
        return /@updates/i.test(query);
    }
    static isSortUpdateDateQuery(query) {
        return /@sort:updateDate/i.test(query);
    }
    static isFeatureExtensionsQuery(query) {
        return /@feature:/i.test(query);
    }
    focus() {
        super.focus();
        if (!this.list) {
            return;
        }
        if (!(this.list.getFocus().length || this.list.getSelection().length)) {
            this.list.focusNext();
        }
        this.list.domFocus();
    }
};
ExtensionsListView = ExtensionsListView_1 = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IStorageService),
    __param(23, IWorkspaceTrustManagementService),
    __param(24, IWorkbenchExtensionEnablementService),
    __param(25, IExtensionFeaturesManagementService),
    __param(26, IUriIdentityService),
    __param(27, ILogService)
], ExtensionsListView);
export { ExtensionsListView };
export class DefaultPopularExtensionsView extends ExtensionsListView {
    async show() {
        const query = this.extensionManagementServerService.webExtensionManagementServer && !this.extensionManagementServerService.localExtensionManagementServer && !this.extensionManagementServerService.remoteExtensionManagementServer ? '@web' : '';
        return super.show(query);
    }
}
export class ServerInstalledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@installed';
        if (!ExtensionsListView.isLocalExtensionsQuery(query) || ExtensionsListView.isSortInstalledExtensionsQuery(query)) {
            query = query += ' @installed';
        }
        return super.show(query.trim());
    }
}
export class EnabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@enabled';
        return ExtensionsListView.isEnabledExtensionsQuery(query) ? super.show(query) :
            ExtensionsListView.isSortInstalledExtensionsQuery(query) ? super.show('@enabled ' + query) : this.showEmptyModel();
    }
}
export class DisabledExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query || '@disabled';
        return ExtensionsListView.isDisabledExtensionsQuery(query) ? super.show(query) :
            ExtensionsListView.isSortInstalledExtensionsQuery(query) ? super.show('@disabled ' + query) : this.showEmptyModel();
    }
}
export class OutdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@outdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@outdated');
        }
        return super.show(query.trim());
    }
    updateSize() {
        super.updateSize();
        this.setExpanded(this.count() > 0);
    }
}
export class RecentlyUpdatedExtensionsView extends ExtensionsListView {
    async show(query) {
        query = query ? query : '@recentlyUpdated';
        if (ExtensionsListView.isSearchExtensionUpdatesQuery(query)) {
            query = query.replace('@updates', '@recentlyUpdated');
        }
        return super.show(query.trim());
    }
}
let StaticQueryExtensionsView = class StaticQueryExtensionsView extends ExtensionsListView {
    constructor(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, storageService, workspaceTrustManagementService, extensionEnablementService, extensionFeaturesManagementService, uriIdentityService, logService) {
        super(options, viewletViewOptions, notificationService, keybindingService, contextMenuService, instantiationService, themeService, extensionService, extensionsWorkbenchService, extensionRecommendationsService, telemetryService, hoverService, configurationService, contextService, extensionManagementServerService, extensionManifestPropertiesService, extensionManagementService, workspaceService, productService, contextKeyService, viewDescriptorService, openerService, storageService, workspaceTrustManagementService, extensionEnablementService, extensionFeaturesManagementService, uriIdentityService, logService);
        this.options = options;
    }
    show() {
        return super.show(this.options.query);
    }
};
StaticQueryExtensionsView = __decorate([
    __param(2, INotificationService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, IExtensionService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IExtensionRecommendationsService),
    __param(10, ITelemetryService),
    __param(11, IHoverService),
    __param(12, IConfigurationService),
    __param(13, IWorkspaceContextService),
    __param(14, IExtensionManagementServerService),
    __param(15, IExtensionManifestPropertiesService),
    __param(16, IWorkbenchExtensionManagementService),
    __param(17, IWorkspaceContextService),
    __param(18, IProductService),
    __param(19, IContextKeyService),
    __param(20, IViewDescriptorService),
    __param(21, IOpenerService),
    __param(22, IStorageService),
    __param(23, IWorkspaceTrustManagementService),
    __param(24, IWorkbenchExtensionEnablementService),
    __param(25, IExtensionFeaturesManagementService),
    __param(26, IUriIdentityService),
    __param(27, ILogService)
], StaticQueryExtensionsView);
export { StaticQueryExtensionsView };
function toSpecificWorkspaceUnsupportedQuery(query, qualifier) {
    if (!query) {
        return '@workspaceUnsupported:' + qualifier;
    }
    const match = query.match(new RegExp(`@workspaceUnsupported(:${qualifier})?(\\s|$)`, 'i'));
    if (match) {
        if (!match[1]) {
            return query.replace(/@workspaceUnsupported/gi, '@workspaceUnsupported:' + qualifier);
        }
        return query;
    }
    return undefined;
}
export class UntrustedWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrusted');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class UntrustedWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'untrustedPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspaceUnsupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtual');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class VirtualWorkspacePartiallySupportedExtensionsView extends ExtensionsListView {
    async show(query) {
        const updatedQuery = toSpecificWorkspaceUnsupportedQuery(query, 'virtualPartial');
        return updatedQuery ? super.show(updatedQuery) : this.showEmptyModel();
    }
}
export class DeprecatedExtensionsView extends ExtensionsListView {
    async show(query) {
        return ExtensionsListView.isSearchDeprecatedExtensionsQuery(query) ? super.show(query) : this.showEmptyModel();
    }
}
export class SearchMarketplaceExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.reportSearchFinishedDelayer = this._register(new ThrottledDelayer(2000));
        this.searchWaitPromise = Promise.resolve();
    }
    async show(query) {
        const queryPromise = super.show(query);
        this.reportSearchFinishedDelayer.trigger(() => this.reportSearchFinished());
        this.searchWaitPromise = queryPromise.then(null, null);
        return queryPromise;
    }
    async reportSearchFinished() {
        await this.searchWaitPromise;
        this.telemetryService.publicLog2('extensionsView:MarketplaceSearchFinished');
    }
}
export class DefaultRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:all';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        if (query && query.trim() !== this.recommendedExtensionsQuery) {
            return this.showEmptyModel();
        }
        const model = await super.show(this.recommendedExtensionsQuery);
        if (!this.extensionsWorkbenchService.local.some(e => !e.isBuiltin)) {
            // This is part of popular extensions view. Collapse if no installed extensions.
            this.setExpanded(model.length > 0);
        }
        return model;
    }
}
export class RecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => {
            this.show('');
        }));
    }
    async show(query) {
        return (query && query.trim() !== this.recommendedExtensionsQuery) ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery);
    }
}
export class WorkspaceRecommendedExtensionsView extends ExtensionsListView {
    constructor() {
        super(...arguments);
        this.recommendedExtensionsQuery = '@recommended:workspace';
    }
    renderBody(container) {
        super.renderBody(container);
        this._register(this.extensionRecommendationsService.onDidChangeRecommendations(() => this.show(this.recommendedExtensionsQuery)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.show(this.recommendedExtensionsQuery)));
    }
    async show(query) {
        const shouldShowEmptyView = query && query.trim() !== '@recommended' && query.trim() !== '@recommended:workspace';
        const model = await (shouldShowEmptyView ? this.showEmptyModel() : super.show(this.recommendedExtensionsQuery));
        this.setExpanded(model.length > 0);
        return model;
    }
    async getInstallableWorkspaceRecommendations() {
        const installed = (await this.extensionsWorkbenchService.queryLocal())
            .filter(l => l.enablementState !== 1 /* EnablementState.DisabledByExtensionKind */); // Filter extensions disabled by kind
        const recommendations = (await this.getWorkspaceRecommendations())
            .filter(recommendation => installed.every(local => isString(recommendation) ? !areSameExtensions({ id: recommendation }, local.identifier) : !this.uriIdentityService.extUri.isEqual(recommendation, local.local?.location)));
        return this.getInstallableRecommendations(recommendations, { source: 'install-all-workspace-recommendations' }, CancellationToken.None);
    }
    async installWorkspaceRecommendations() {
        const installableRecommendations = await this.getInstallableWorkspaceRecommendations();
        if (installableRecommendations.length) {
            const galleryExtensions = [];
            const resourceExtensions = [];
            for (const recommendation of installableRecommendations) {
                if (recommendation.gallery) {
                    galleryExtensions.push({ extension: recommendation.gallery, options: {} });
                }
                else {
                    resourceExtensions.push(recommendation);
                }
            }
            await Promise.all([
                this.extensionManagementService.installGalleryExtensions(galleryExtensions),
                ...resourceExtensions.map(extension => this.extensionsWorkbenchService.install(extension))
            ]);
        }
        else {
            this.notificationService.notify({
                severity: Severity.Info,
                message: localize('no local extensions', "There are no extensions to install.")
            });
        }
    }
}
export class PreferredExtensionsPagedModel {
    constructor(preferredExtensions, pager) {
        this.preferredExtensions = preferredExtensions;
        this.pager = pager;
        this.resolved = new Map();
        this.preferredGalleryExtensions = new Set();
        this.resolvedGalleryExtensionsFromQuery = [];
        for (let i = 0; i < this.preferredExtensions.length; i++) {
            this.resolved.set(i, this.preferredExtensions[i]);
        }
        for (const e of preferredExtensions) {
            if (e.identifier.uuid) {
                this.preferredGalleryExtensions.add(e.identifier.uuid);
            }
        }
        // expected that all preferred gallery extensions will be part of the query results
        this.length = (preferredExtensions.length - this.preferredGalleryExtensions.size) + this.pager.total;
        const totalPages = Math.ceil(this.pager.total / this.pager.pageSize);
        this.populateResolvedExtensions(0, this.pager.firstPage);
        this.pages = range(totalPages - 1).map(() => ({
            promise: null,
            cts: null,
            promiseIndexes: new Set(),
        }));
    }
    isResolved(index) {
        return this.resolved.has(index);
    }
    get(index) {
        return this.resolved.get(index);
    }
    async resolve(index, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            throw new CancellationError();
        }
        if (this.isResolved(index)) {
            return this.get(index);
        }
        const indexInPagedModel = index - this.preferredExtensions.length + this.resolvedGalleryExtensionsFromQuery.length;
        const pageIndex = Math.floor(indexInPagedModel / this.pager.pageSize);
        const page = this.pages[pageIndex];
        if (!page.promise) {
            page.cts = new CancellationTokenSource();
            page.promise = this.pager.getPage(pageIndex, page.cts.token)
                .then(extensions => this.populateResolvedExtensions(pageIndex, extensions))
                .catch(e => { page.promise = null; throw e; })
                .finally(() => page.cts = null);
        }
        const listener = cancellationToken.onCancellationRequested(() => {
            if (!page.cts) {
                return;
            }
            page.promiseIndexes.delete(index);
            if (page.promiseIndexes.size === 0) {
                page.cts.cancel();
            }
        });
        page.promiseIndexes.add(index);
        try {
            await page.promise;
        }
        finally {
            listener.dispose();
        }
        return this.get(index);
    }
    populateResolvedExtensions(pageIndex, extensions) {
        let adjustIndexOfNextPagesBy = 0;
        const pageStartIndex = pageIndex * this.pager.pageSize;
        for (let i = 0; i < extensions.length; i++) {
            const e = extensions[i];
            if (e.gallery?.identifier.uuid && this.preferredGalleryExtensions.has(e.gallery.identifier.uuid)) {
                this.resolvedGalleryExtensionsFromQuery.push(e);
                adjustIndexOfNextPagesBy++;
            }
            else {
                this.resolved.set(this.preferredExtensions.length - this.resolvedGalleryExtensionsFromQuery.length + pageStartIndex + i, e);
            }
        }
        // If this page has preferred gallery extensions, then adjust the index of the next pages
        // by the number of preferred gallery extensions found in this page. Because these preferred extensions
        // are already in the resolved list and since we did not add them now, we need to adjust the indices of the next pages.
        // Skip first page as the preferred extensions are always in the first page
        if (pageIndex !== 0 && adjustIndexOfNextPagesBy) {
            const nextPageStartIndex = (pageIndex + 1) * this.pager.pageSize;
            const indices = [...this.resolved.keys()].sort();
            for (const index of indices) {
                if (index >= nextPageStartIndex) {
                    const e = this.resolved.get(index);
                    if (e) {
                        this.resolved.delete(index);
                        this.resolved.set(index - adjustIndexOfNextPagesBy, e);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc1ZpZXdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDNUcsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBVSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZHLE9BQU8sRUFBOEgscUJBQXFCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUMzTyxPQUFPLEVBQThCLGlDQUFpQyxFQUFtQixvQ0FBb0MsRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2pQLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3pJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFC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