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
var RepositoryRenderer_1;
import './media/scm.css';
import { DisposableStore, combinedDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore } from '../../../../base/common/observable.js';
import { append, $ } from '../../../../base/browser/dom.js';
import { ISCMViewService } from '../common/scm.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { connectPrimaryMenu, getRepositoryResourceCount, isSCMRepository, StatusBarAction } from './util.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
export class RepositoryActionRunner extends ActionRunner {
    constructor(getSelectedRepositories) {
        super();
        this.getSelectedRepositories = getSelectedRepositories;
    }
    async runAction(action, context) {
        if (!(action instanceof MenuItemAction)) {
            return super.runAction(action, context);
        }
        const selection = this.getSelectedRepositories().map(r => r.provider);
        const actionContext = selection.some(s => s === context) ? selection : [context];
        await action.run(...actionContext);
    }
}
let RepositoryRenderer = class RepositoryRenderer {
    static { RepositoryRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'repository'; }
    get templateId() { return RepositoryRenderer_1.TEMPLATE_ID; }
    constructor(toolbarMenuId, actionViewItemProvider, commandService, contextKeyService, contextMenuService, hoverService, keybindingService, menuService, scmViewService, telemetryService) {
        this.toolbarMenuId = toolbarMenuId;
        this.actionViewItemProvider = actionViewItemProvider;
        this.commandService = commandService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.scmViewService = scmViewService;
        this.telemetryService = telemetryService;
    }
    renderTemplate(container) {
        // hack
        if (container.classList.contains('monaco-tl-contents')) {
            container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-twistie');
        }
        const provider = append(container, $('.scm-provider'));
        const label = append(provider, $('.label'));
        const labelCustomHover = this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), label, '', {});
        const name = append(label, $('span.name'));
        const description = append(label, $('span.description'));
        const actions = append(provider, $('.actions'));
        const toolBar = new WorkbenchToolBar(actions, { actionViewItemProvider: this.actionViewItemProvider, resetMenu: this.toolbarMenuId }, this.menuService, this.contextKeyService, this.contextMenuService, this.keybindingService, this.commandService, this.telemetryService);
        const countContainer = append(provider, $('.count'));
        const count = new CountBadge(countContainer, {}, defaultCountBadgeStyles);
        const visibilityDisposable = toolBar.onDidChangeDropdownVisibility(e => provider.classList.toggle('active', e));
        const templateDisposable = combinedDisposable(labelCustomHover, visibilityDisposable, toolBar);
        return { label, labelCustomHover, name, description, countContainer, count, toolBar, elementDisposables: new DisposableStore(), templateDisposable };
    }
    renderElement(arg, index, templateData) {
        const repository = isSCMRepository(arg) ? arg : arg.element;
        templateData.name.textContent = repository.provider.name;
        if (repository.provider.rootUri) {
            templateData.labelCustomHover.update(`${repository.provider.label}: ${repository.provider.rootUri.fsPath}`);
            templateData.description.textContent = repository.provider.label;
        }
        else {
            templateData.labelCustomHover.update(repository.provider.label);
            templateData.description.textContent = '';
        }
        let statusPrimaryActions = [];
        let menuPrimaryActions = [];
        let menuSecondaryActions = [];
        const updateToolbar = () => {
            templateData.toolBar.setActions([...statusPrimaryActions, ...menuPrimaryActions], menuSecondaryActions);
        };
        templateData.elementDisposables.add(autorunWithStore((reader, store) => {
            const commands = repository.provider.statusBarCommands.read(reader) ?? [];
            statusPrimaryActions = commands.map(c => store.add(new StatusBarAction(c, this.commandService)));
            updateToolbar();
        }));
        templateData.elementDisposables.add(autorun(reader => {
            const count = repository.provider.count.read(reader) ?? getRepositoryResourceCount(repository.provider);
            templateData.countContainer.setAttribute('data-count', String(count));
            templateData.count.setCount(count);
        }));
        templateData.elementDisposables.add(autorun(reader => {
            repository.provider.contextValue.read(reader);
            const repositoryMenus = this.scmViewService.menus.getRepositoryMenus(repository.provider);
            const menu = this.toolbarMenuId === MenuId.SCMTitle
                ? repositoryMenus.titleMenu.menu
                : repositoryMenus.getRepositoryMenu(repository);
            reader.store.add(connectPrimaryMenu(menu, (primary, secondary) => {
                menuPrimaryActions = primary;
                menuSecondaryActions = secondary;
                updateToolbar();
            }));
        }));
        templateData.toolBar.context = repository.provider;
    }
    renderCompressedElements() {
        throw new Error('Should never happen since node is incompressible');
    }
    disposeElement(group, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
        templateData.templateDisposable.dispose();
        templateData.count.dispose();
    }
};
RepositoryRenderer = RepositoryRenderer_1 = __decorate([
    __param(2, ICommandService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IHoverService),
    __param(6, IKeybindingService),
    __param(7, IMenuService),
    __param(8, ISCMViewService),
    __param(9, ITelemetryService)
], RepositoryRenderer);
export { RepositoryRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtUmVwb3NpdG9yeVJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21SZXBvc2l0b3J5UmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFlLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVELE9BQU8sRUFBZ0MsZUFBZSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDBCQUEwQixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFNN0csT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixF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