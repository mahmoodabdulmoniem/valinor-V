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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuId, IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService, ViewContainerLocationToString } from '../../../common/views.js';
let ViewMenuActions = class ViewMenuActions extends Disposable {
    constructor(menuId, contextMenuId, options, contextKeyService, menuService) {
        super();
        this.menuId = menuId;
        this.contextMenuId = contextMenuId;
        this.options = options;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService, { emitEventsForSubmenuChanges: true }));
        this._register(this.menu.onDidChange(() => {
            this.actions = undefined;
            this._onDidChange.fire();
        }));
    }
    getActions() {
        if (!this.actions) {
            this.actions = getActionBarActions(this.menu.getActions(this.options));
        }
        return this.actions;
    }
    getPrimaryActions() {
        return this.getActions().primary;
    }
    getSecondaryActions() {
        return this.getActions().secondary;
    }
    getContextMenuActions() {
        if (this.contextMenuId) {
            const menu = this.menuService.getMenuActions(this.contextMenuId, this.contextKeyService, this.options);
            return getActionBarActions(menu).secondary;
        }
        return [];
    }
};
ViewMenuActions = __decorate([
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], ViewMenuActions);
export { ViewMenuActions };
let ViewContainerMenuActions = class ViewContainerMenuActions extends ViewMenuActions {
    constructor(element, viewContainer, viewDescriptorService, contextKeyService, menuService) {
        const scopedContextKeyService = contextKeyService.createScoped(element);
        scopedContextKeyService.createKey('viewContainer', viewContainer.id);
        const viewContainerLocationKey = scopedContextKeyService.createKey('viewContainerLocation', ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)));
        super(MenuId.ViewContainerTitle, MenuId.ViewContainerTitleContext, { shouldForwardArgs: true, renderShortTitle: true }, scopedContextKeyService, menuService);
        this._register(scopedContextKeyService);
        this._register(Event.filter(viewDescriptorService.onDidChangeContainerLocation, e => e.viewContainer === viewContainer)(() => viewContainerLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)))));
    }
};
ViewContainerMenuActions = __decorate([
    __param(2, IViewDescriptorService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], ViewContainerMenuActions);
export { ViewContainerMenuActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01lbnVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy92aWV3TWVudUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUE4QixNQUFNLGlFQUFpRSxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxNQUFNLEVBQXNCLFlBQVksRUFBUyxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBaUIsNkJBQTZCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUV6RyxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUFPOUMsWUFDVSxNQUFjLEVBQ04sYUFBaUMsRUFDakMsT0FBdUMsRUFDcEMsaUJBQXNELEVBQzVELFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFDO1FBTkMsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNOLGtCQUFhLEdBQWIsYUFBYSxDQUFvQjtRQUNqQyxZQUFPLEdBQVAsT0FBTyxDQUFnQztRQUNuQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBUnhDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDM0QsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUss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