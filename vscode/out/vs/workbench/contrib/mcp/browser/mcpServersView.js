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
var McpServerRenderer_1;
import './media/mcpServersView.css';
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableStore, dispose, isDisposable } from '../../../../base/common/lifecycle.js';
import { DelayedPagedModel, PagedModel } from '../../../../base/common/paging.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchPagedList } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { getLocationBasedViewColors } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService, Extensions as ViewExtensions } from '../../../common/views.js';
import { HasInstalledMcpServersContext, IMcpWorkbenchService, InstalledMcpServersViewId, McpServerContainers, mcpServerIcon } from '../common/mcpTypes.js';
import { DropDownAction, InstallAction, InstallingLabelAction, ManageMcpServerAction, McpServerStatusAction } from './mcpServerActions.js';
import { PublisherWidget, InstallCountWidget, RatingsWidget, McpServerIconWidget, McpServerHoverWidget } from './mcpServerWidgets.js';
import { ActionRunner, Separator } from '../../../../base/common/actions.js';
import { IAllowedMcpServersService, IMcpGalleryService } from '../../../../platform/mcp/common/mcpManagement.js';
import { URI } from '../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { DefaultViewsContext, SearchMcpServersContext } from '../../extensions/common/extensions.js';
import { VIEW_CONTAINER } from '../../extensions/browser/extensions.contribution.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { AbstractExtensionsListView } from '../../extensions/browser/extensionsViews.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
let McpServersListView = class McpServersListView extends AbstractExtensionsListView {
    constructor(mpcViewOptions, options, keybindingService, contextMenuService, instantiationService, themeService, hoverService, configurationService, contextKeyService, viewDescriptorService, openerService, mcpWorkbenchService, mcpGalleryService, productService, layoutService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.mpcViewOptions = mpcViewOptions;
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.mcpGalleryService = mcpGalleryService;
        this.productService = productService;
        this.layoutService = layoutService;
        this.list = null;
        this.listContainer = null;
        this.welcomeContainer = null;
        this.contextMenuActionRunner = this._register(new ActionRunner());
    }
    renderBody(container) {
        super.renderBody(container);
        // Create welcome container
        this.welcomeContainer = dom.append(container, dom.$('.mcp-welcome-container.hide'));
        this.createWelcomeContent(this.welcomeContainer);
        this.listContainer = dom.append(container, dom.$('.mcp-servers-list'));
        this.list = this._register(this.instantiationService.createInstance(WorkbenchPagedList, `${this.id}-MCP-Servers`, this.listContainer, {
            getHeight() { return 72; },
            getTemplateId: () => McpServerRenderer.templateId,
        }, [this.instantiationService.createInstance(McpServerRenderer, {
                hoverOptions: {
                    position: () => {
                        const viewLocation = this.viewDescriptorService.getViewLocationById(this.id);
                        if (viewLocation === 0 /* ViewContainerLocation.Sidebar */) {
                            return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
                        }
                        if (viewLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                            return this.layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
                        }
                        return 1 /* HoverPosition.RIGHT */;
                    }
                }
            })], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(mcpServer) {
                    return mcpServer?.label ?? '';
                },
                getWidgetAriaLabel() {
                    return localize('mcp servers', "MCP Servers");
                }
            },
            overrideStyles: getLocationBasedViewColors(this.viewDescriptorService.getViewLocationById(this.id)).listOverrideStyles,
            openOnSingleClick: true,
        }));
        this._register(Event.debounce(Event.filter(this.list.onDidOpen, e => e.element !== null), (_, event) => event, 75, true)(options => {
            this.mcpWorkbenchService.open(options.element, options.editorOptions);
        }));
        this._register(this.list.onContextMenu(e => this.onContextMenu(e), this));
        if (this.input) {
            this.renderInput();
        }
    }
    async onContextMenu(e) {
        if (e.element) {
            const disposables = new DisposableStore();
            const manageExtensionAction = disposables.add(this.instantiationService.createInstance(ManageMcpServerAction, false));
            const extension = e.element ? this.mcpWorkbenchService.local.find(local => local.name === e.element.name) || e.element
                : e.element;
            manageExtensionAction.mcpServer = extension;
            let groups = [];
            if (manageExtensionAction.enabled) {
                groups = await manageExtensionAction.getActionGroups();
            }
            const actions = [];
            for (const menuActions of groups) {
                for (const menuAction of menuActions) {
                    actions.push(menuAction);
                    if (isDisposable(menuAction)) {
                        disposables.add(menuAction);
                    }
                }
                actions.push(new Separator());
            }
            actions.pop();
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => actions,
                actionRunner: this.contextMenuActionRunner,
                onHide: () => disposables.dispose()
            });
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.list?.layout(height, width);
    }
    async show(query) {
        if (this.input) {
            this.input.disposables.dispose();
            this.input = undefined;
        }
        this.input = await this.query(query.trim());
        this.input.showWelcomeContent = !this.mcpGalleryService.isEnabled() && this.input.model.length === 0 && !!this.mpcViewOptions.showWelcomeOnEmpty;
        this.renderInput();
        if (this.input.onDidChangeModel) {
            this.input.disposables.add(this.input.onDidChangeModel(model => {
                if (!this.input) {
                    return;
                }
                this.input.model = model;
                this.input.showWelcomeContent = !this.mcpGalleryService.isEnabled() && this.input.model.length === 0 && !!this.mpcViewOptions.showWelcomeOnEmpty;
                this.renderInput();
            }));
        }
        return this.input.model;
    }
    renderInput() {
        if (!this.input) {
            return;
        }
        if (this.list) {
            this.list.model = new DelayedPagedModel(this.input.model);
        }
        this.showWelcomeContent(!!this.input.showWelcomeContent);
    }
    showWelcomeContent(show) {
        this.welcomeContainer?.classList.toggle('hide', !show);
        this.listContainer?.classList.toggle('hide', show);
    }
    createWelcomeContent(welcomeContainer) {
        const welcomeContent = dom.append(welcomeContainer, dom.$('.mcp-welcome-content'));
        const iconContainer = dom.append(welcomeContent, dom.$('.mcp-welcome-icon'));
        const iconElement = dom.append(iconContainer, dom.$('span'));
        iconElement.className = ThemeIcon.asClassName(mcpServerIcon);
        const title = dom.append(welcomeContent, dom.$('.mcp-welcome-title'));
        title.textContent = localize('mcp.welcome.title', "MCP Servers");
        const description = dom.append(welcomeContent, dom.$('.mcp-welcome-description'));
        const markdownResult = this._register(renderMarkdown(new MarkdownString(localize('mcp.welcome.descriptionWithLink', "Extend agent mode by installing MCP servers to bring extra tools for connecting to databases, invoking APIs and performing specialized tasks."), { isTrusted: true }), {
            actionHandler: {
                callback: (content) => {
                    this.openerService.open(URI.parse(content));
                },
                disposables: this._store
            }
        }));
        description.appendChild(markdownResult.element);
        // Browse button
        const buttonContainer = dom.append(welcomeContent, dom.$('.mcp-welcome-button-container'));
        const button = this._register(new Button(buttonContainer, {
            title: localize('mcp.welcome.browseButton', "Browse MCP Servers"),
            ...defaultButtonStyles
        }));
        button.label = localize('mcp.welcome.browseButton', "Browse MCP Servers");
        this._register(button.onDidClick(() => this.openerService.open(URI.parse(this.productService.quality === 'insider' ? 'https://code.visualstudio.com/insider/mcp' : 'https://code.visualstudio.com/mcp'))));
    }
    async query(query) {
        const disposables = new DisposableStore();
        if (query) {
            const servers = await this.mcpWorkbenchService.queryGallery({ text: query.replace('@mcp', '') });
            return { model: new PagedModel(servers), disposables };
        }
        const onDidChangeModel = disposables.add(new Emitter());
        let servers = await this.mcpWorkbenchService.queryLocal();
        disposables.add(Event.debounce(Event.filter(this.mcpWorkbenchService.onChange, e => e?.installState === 1 /* McpServerInstallState.Installed */), () => undefined)(() => {
            const mergedMcpServers = this.mergeAddedMcpServers(servers, [...this.mcpWorkbenchService.local]);
            if (mergedMcpServers) {
                servers = mergedMcpServers;
                onDidChangeModel.fire(new PagedModel(servers));
            }
        }));
        disposables.add(this.mcpWorkbenchService.onReset(() => onDidChangeModel.fire(new PagedModel([...this.mcpWorkbenchService.local]))));
        return { model: new PagedModel(servers), onDidChangeModel: onDidChangeModel.event, disposables };
    }
    mergeAddedMcpServers(mcpServers, newMcpServers) {
        const oldMcpServers = [...mcpServers];
        const findPreviousMcpServerIndex = (from) => {
            let index = -1;
            const previousMcpServerInNew = newMcpServers[from];
            if (previousMcpServerInNew) {
                index = oldMcpServers.findIndex(e => e.name === previousMcpServerInNew.name);
                if (index === -1) {
                    return findPreviousMcpServerIndex(from - 1);
                }
            }
            return index;
        };
        let hasChanged = false;
        for (let index = 0; index < newMcpServers.length; index++) {
            const mcpServer = newMcpServers[index];
            if (mcpServers.every(r => r.name !== mcpServer.name)) {
                hasChanged = true;
                mcpServers.splice(findPreviousMcpServerIndex(index - 1) + 1, 0, mcpServer);
            }
        }
        return hasChanged ? mcpServers : undefined;
    }
};
McpServersListView = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IHoverService),
    __param(7, IConfigurationService),
    __param(8, IContextKeyService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IMcpWorkbenchService),
    __param(12, IMcpGalleryService),
    __param(13, IProductService),
    __param(14, IWorkbenchLayoutService)
], McpServersListView);
export { McpServersListView };
let McpServerRenderer = class McpServerRenderer {
    static { McpServerRenderer_1 = this; }
    static { this.templateId = 'mcpServer'; }
    constructor(options, allowedMcpServersService, instantiationService, notificationService) {
        this.options = options;
        this.allowedMcpServersService = allowedMcpServersService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.templateId = McpServerRenderer_1.templateId;
    }
    renderTemplate(root) {
        const element = dom.append(root, dom.$('.mcp-server-item.extension-list-item'));
        const iconContainer = dom.append(element, dom.$('.icon-container'));
        const iconWidget = this.instantiationService.createInstance(McpServerIconWidget, iconContainer);
        const details = dom.append(element, dom.$('.details'));
        const headerContainer = dom.append(details, dom.$('.header-container'));
        const header = dom.append(headerContainer, dom.$('.header'));
        const name = dom.append(header, dom.$('span.name'));
        const installCount = dom.append(header, dom.$('span.install-count'));
        const ratings = dom.append(header, dom.$('span.ratings'));
        const description = dom.append(details, dom.$('.description.ellipsis'));
        const footer = dom.append(details, dom.$('.footer'));
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, dom.append(footer, dom.$('.publisher-container')), true);
        const actionbar = new ActionBar(footer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof DropDownAction) {
                    return action.createActionViewItem(options);
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        });
        actionbar.setFocusable(false);
        const actionBarListener = actionbar.onDidRun(({ error }) => error && this.notificationService.error(error));
        const mcpServerStatusAction = this.instantiationService.createInstance(McpServerStatusAction);
        const actions = [
            this.instantiationService.createInstance(InstallAction, false),
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(ManageMcpServerAction, false),
            mcpServerStatusAction
        ];
        const widgets = [
            iconWidget,
            publisherWidget,
            this.instantiationService.createInstance(InstallCountWidget, installCount, true),
            this.instantiationService.createInstance(RatingsWidget, ratings, true),
            this.instantiationService.createInstance(McpServerHoverWidget, { target: root, position: this.options.hoverOptions.position }, mcpServerStatusAction)
        ];
        const extensionContainers = this.instantiationService.createInstance(McpServerContainers, [...actions, ...widgets]);
        actionbar.push(actions, { icon: true, label: true });
        const disposable = combinedDisposable(...actions, ...widgets, actionbar, actionBarListener, extensionContainers);
        return {
            root, element, name, description, installCount, ratings, disposables: [disposable], actionbar,
            mcpServerDisposables: [],
            set mcpServer(mcpServer) {
                extensionContainers.mcpServer = mcpServer;
            }
        };
    }
    renderElement(mcpServer, index, data) {
        data.element.classList.remove('loading');
        data.mcpServerDisposables = dispose(data.mcpServerDisposables);
        data.root.setAttribute('data-mcp-server-id', mcpServer.id);
        data.name.textContent = mcpServer.label;
        data.description.textContent = mcpServer.description;
        data.installCount.style.display = '';
        data.ratings.style.display = '';
        data.mcpServer = mcpServer;
        const updateEnablement = () => {
            const disabled = mcpServer.installState === 1 /* McpServerInstallState.Installed */ && !!mcpServer.local && this.allowedMcpServersService.isAllowed(mcpServer.local) !== true;
            data.root.classList.toggle('disabled', disabled);
        };
        updateEnablement();
        this.allowedMcpServersService.onDidChangeAllowedMcpServers(() => updateEnablement(), this, data.mcpServerDisposables);
    }
    disposeElement(mcpServer, index, data) {
        data.mcpServerDisposables = dispose(data.mcpServerDisposables);
    }
    disposeTemplate(data) {
        data.mcpServerDisposables = dispose(data.mcpServerDisposables);
        data.disposables = dispose(data.disposables);
    }
};
McpServerRenderer = McpServerRenderer_1 = __decorate([
    __param(1, IAllowedMcpServersService),
    __param(2, IInstantiationService),
    __param(3, INotificationService)
], McpServerRenderer);
export class DefaultBrowseMcpServersView extends McpServersListView {
    async show() {
        return super.show('@mcp');
    }
}
export class McpServersViewsContribution extends Disposable {
    static { this.ID = 'workbench.mcp.servers.views.contribution'; }
    constructor() {
        super();
        Registry.as(ViewExtensions.ViewsRegistry).registerViews([
            {
                id: InstalledMcpServersViewId,
                name: localize2('mcp-installed', "MCP Servers - Installed"),
                ctorDescriptor: new SyncDescriptor(McpServersListView, [{ showWelcomeOnEmpty: false }]),
                when: ContextKeyExpr.and(DefaultViewsContext, HasInstalledMcpServersContext),
                weight: 40,
                order: 4,
                canToggleVisibility: true
            },
            {
                id: 'workbench.views.mcp.default.marketplace',
                name: localize2('mcp', "MCP Servers"),
                ctorDescriptor: new SyncDescriptor(DefaultBrowseMcpServersView, [{ showWelcomeOnEmpty: true }]),
                when: ContextKeyExpr.and(DefaultViewsContext, HasInstalledMcpServersContext.toNegated(), ChatContextKeys.Setup.hidden.negate()),
                weight: 40,
                order: 4,
                canToggleVisibility: true
            },
            {
                id: 'workbench.views.mcp.marketplace',
                name: localize2('mcp', "MCP Servers"),
                ctorDescriptor: new SyncDescriptor(McpServersListView, [{ showWelcomeOnEmpty: true }]),
                when: ContextKeyExpr.and(SearchMcpServersContext),
            }
        ], VIEW_CONTAINER);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFNlcnZlcnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENB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