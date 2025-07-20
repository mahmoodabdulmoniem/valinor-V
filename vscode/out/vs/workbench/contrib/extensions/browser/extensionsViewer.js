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
var ExtensionRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { dispose, Disposable, DisposableStore, toDisposable, isDisposable } from '../../../../base/common/lifecycle.js';
import { Action, ActionRunner, Separator } from '../../../../base/common/actions.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { Event } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchAsyncDataTree, WorkbenchPagedList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Delegate, Renderer } from './extensionsList.js';
import { listFocusForeground, listFocusBackground, foreground, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ExtensionAction, getContextMenuActions, ManageExtensionAction } from './extensionsActions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { getLocationBasedViewColors } from '../../../browser/parts/views/viewPane.js';
import { DelayedPagedModel } from '../../../../base/common/paging.js';
import { ExtensionIconWidget } from './extensionsWidgets.js';
function getAriaLabelForExtension(extension) {
    if (!extension) {
        return '';
    }
    const publisher = extension.publisherDomain?.verified ? localize('extension.arialabel.verifiedPublisher', "Verified Publisher {0}", extension.publisherDisplayName) : localize('extension.arialabel.publisher', "Publisher {0}", extension.publisherDisplayName);
    const deprecated = extension?.deprecationInfo ? localize('extension.arialabel.deprecated', "Deprecated") : '';
    const rating = extension?.rating ? localize('extension.arialabel.rating', "Rated {0} out of 5 stars by {1} users", extension.rating.toFixed(2), extension.ratingCount) : '';
    return `${extension.displayName}, ${deprecated ? `${deprecated}, ` : ''}${extension.version}, ${publisher}, ${extension.description} ${rating ? `, ${rating}` : ''}`;
}
let ExtensionsList = class ExtensionsList extends Disposable {
    constructor(parent, viewId, options, extensionsViewState, extensionsWorkbenchService, viewDescriptorService, layoutService, notificationService, contextMenuService, contextKeyService, instantiationService) {
        super();
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.contextMenuActionRunner = this._register(new ActionRunner());
        this._register(this.contextMenuActionRunner.onDidRun(({ error }) => error && notificationService.error(error)));
        const delegate = new Delegate();
        const renderer = instantiationService.createInstance(Renderer, extensionsViewState, {
            hoverOptions: {
                position: () => {
                    const viewLocation = viewDescriptorService.getViewLocationById(viewId);
                    if (viewLocation === 0 /* ViewContainerLocation.Sidebar */) {
                        return layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 1 /* HoverPosition.RIGHT */ : 0 /* HoverPosition.LEFT */;
                    }
                    if (viewLocation === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                        return layoutService.getSideBarPosition() === 0 /* Position.LEFT */ ? 0 /* HoverPosition.LEFT */ : 1 /* HoverPosition.RIGHT */;
                    }
                    return 1 /* HoverPosition.RIGHT */;
                }
            }
        });
        this.list = instantiationService.createInstance(WorkbenchPagedList, `${viewId}-Extensions`, parent, delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(extension) {
                    return getAriaLabelForExtension(extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', "Extensions");
                }
            },
            overrideStyles: getLocationBasedViewColors(viewDescriptorService.getViewLocationById(viewId)).listOverrideStyles,
            openOnSingleClick: true,
            ...options
        });
        this._register(this.list.onContextMenu(e => this.onContextMenu(e), this));
        this._register(this.list);
        this._register(Event.debounce(Event.filter(this.list.onDidOpen, e => e.element !== null), (_, event) => event, 75, true)(options => {
            this.openExtension(options.element, { sideByside: options.sideBySide, ...options.editorOptions });
        }));
    }
    setModel(model) {
        this.list.model = new DelayedPagedModel(model);
    }
    layout(height, width) {
        this.list.layout(height, width);
    }
    openExtension(extension, options) {
        extension = this.extensionsWorkbenchService.local.filter(e => areSameExtensions(e.identifier, extension.identifier))[0] || extension;
        this.extensionsWorkbenchService.open(extension, options);
    }
    async onContextMenu(e) {
        if (e.element) {
            const disposables = new DisposableStore();
            const manageExtensionAction = disposables.add(this.instantiationService.createInstance(ManageExtensionAction));
            const extension = e.element ? this.extensionsWorkbenchService.local.find(local => areSameExtensions(local.identifier, e.element.identifier) && (!e.element.server || e.element.server === local.server)) || e.element
                : e.element;
            manageExtensionAction.extension = extension;
            let groups = [];
            if (manageExtensionAction.enabled) {
                groups = await manageExtensionAction.getActionGroups();
            }
            else if (extension) {
                groups = await getContextMenuActions(extension, this.contextKeyService, this.instantiationService);
                groups.forEach(group => group.forEach(extensionAction => {
                    if (extensionAction instanceof ExtensionAction) {
                        extensionAction.extension = extension;
                    }
                }));
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
};
ExtensionsList = __decorate([
    __param(4, IExtensionsWorkbenchService),
    __param(5, IViewDescriptorService),
    __param(6, IWorkbenchLayoutService),
    __param(7, INotificationService),
    __param(8, IContextMenuService),
    __param(9, IContextKeyService),
    __param(10, IInstantiationService)
], ExtensionsList);
export { ExtensionsList };
let ExtensionsGridView = class ExtensionsGridView extends Disposable {
    constructor(parent, delegate, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.element = dom.append(parent, dom.$('.extensions-grid-view'));
        this.renderer = this.instantiationService.createInstance(Renderer, { onFocus: Event.None, onBlur: Event.None, filters: {} }, { hoverOptions: { position() { return 2 /* HoverPosition.BELOW */; } } });
        this.delegate = delegate;
        this.disposableStore = this._register(new DisposableStore());
    }
    setExtensions(extensions) {
        this.disposableStore.clear();
        extensions.forEach((e, index) => this.renderExtension(e, index));
    }
    renderExtension(extension, index) {
        const extensionContainer = dom.append(this.element, dom.$('.extension-container'));
        extensionContainer.style.height = `${this.delegate.getHeight()}px`;
        extensionContainer.setAttribute('tabindex', '0');
        const template = this.renderer.renderTemplate(extensionContainer);
        this.disposableStore.add(toDisposable(() => this.renderer.disposeTemplate(template)));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        openExtensionAction.extension = extension;
        template.name.setAttribute('tabindex', '0');
        const handleEvent = (e) => {
            if (e instanceof StandardKeyboardEvent && e.keyCode !== 3 /* KeyCode.Enter */) {
                return;
            }
            openExtensionAction.run(e.ctrlKey || e.metaKey);
            e.stopPropagation();
            e.preventDefault();
        };
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.CLICK, (e) => handleEvent(new StandardMouseEvent(dom.getWindow(template.name), e))));
        this.disposableStore.add(dom.addDisposableListener(template.name, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.disposableStore.add(dom.addDisposableListener(extensionContainer, dom.EventType.KEY_DOWN, (e) => handleEvent(new StandardKeyboardEvent(e))));
        this.renderer.renderElement(extension, index, template);
    }
};
ExtensionsGridView = __decorate([
    __param(2, IInstantiationService)
], ExtensionsGridView);
export { ExtensionsGridView };
class AsyncDataSource {
    hasChildren({ hasChildren }) {
        return hasChildren;
    }
    getChildren(extensionData) {
        return extensionData.getChildren();
    }
}
class VirualDelegate {
    getHeight(element) {
        return 62;
    }
    getTemplateId({ extension }) {
        return extension ? ExtensionRenderer.TEMPLATE_ID : UnknownExtensionRenderer.TEMPLATE_ID;
    }
}
let ExtensionRenderer = class ExtensionRenderer {
    static { ExtensionRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'extension-template'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    get templateId() {
        return ExtensionRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('extension');
        const iconWidget = this.instantiationService.createInstance(ExtensionIconWidget, container);
        const details = dom.append(container, dom.$('.details'));
        const header = dom.append(details, dom.$('.header'));
        const name = dom.append(header, dom.$('span.name'));
        const openExtensionAction = this.instantiationService.createInstance(OpenExtensionAction);
        const extensionDisposables = [dom.addDisposableListener(name, 'click', (e) => {
                openExtensionAction.run(e.ctrlKey || e.metaKey);
                e.stopPropagation();
                e.preventDefault();
            }), iconWidget, openExtensionAction];
        const identifier = dom.append(header, dom.$('span.identifier'));
        const footer = dom.append(details, dom.$('.footer'));
        const author = dom.append(footer, dom.$('.author'));
        return {
            name,
            identifier,
            author,
            extensionDisposables,
            set extensionData(extensionData) {
                iconWidget.extension = extensionData.extension;
                openExtensionAction.extension = extensionData.extension;
            }
        };
    }
    renderElement(node, index, data) {
        const extension = node.element.extension;
        data.name.textContent = extension.displayName;
        data.identifier.textContent = extension.identifier.id;
        data.author.textContent = extension.publisherDisplayName;
        data.extensionData = node.element;
    }
    disposeTemplate(templateData) {
        templateData.extensionDisposables = dispose(templateData.extensionDisposables);
    }
};
ExtensionRenderer = ExtensionRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], ExtensionRenderer);
class UnknownExtensionRenderer {
    static { this.TEMPLATE_ID = 'unknown-extension-template'; }
    get templateId() {
        return UnknownExtensionRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const messageContainer = dom.append(container, dom.$('div.unknown-extension'));
        dom.append(messageContainer, dom.$('span.error-marker')).textContent = localize('error', "Error");
        dom.append(messageContainer, dom.$('span.message')).textContent = localize('Unknown Extension', "Unknown Extension:");
        const identifier = dom.append(messageContainer, dom.$('span.message'));
        return { identifier };
    }
    renderElement(node, index, data) {
        data.identifier.textContent = node.element.extension.identifier.id;
    }
    disposeTemplate(data) {
    }
}
let OpenExtensionAction = class OpenExtensionAction extends Action {
    constructor(extensionsWorkdbenchService) {
        super('extensions.action.openExtension', '');
        this.extensionsWorkdbenchService = extensionsWorkdbenchService;
    }
    set extension(extension) {
        this._extension = extension;
    }
    run(sideByside) {
        if (this._extension) {
            return this.extensionsWorkdbenchService.open(this._extension, { sideByside });
        }
        return Promise.resolve();
    }
};
OpenExtensionAction = __decorate([
    __param(0, IExtensionsWorkbenchService)
], OpenExtensionAction);
let ExtensionsTree = class ExtensionsTree extends WorkbenchAsyncDataTree {
    constructor(input, container, overrideStyles, contextKeyService, listService, instantiationService, configurationService, extensionsWorkdbenchService) {
        const delegate = new VirualDelegate();
        const dataSource = new AsyncDataSource();
        const renderers = [instantiationService.createInstance(ExtensionRenderer), instantiationService.createInstance(UnknownExtensionRenderer)];
        const identityProvider = {
            getId({ extension, parent }) {
                return parent ? this.getId(parent) + '/' + extension.identifier.id : extension.identifier.id;
            }
        };
        super('ExtensionsTree', container, delegate, renderers, dataSource, {
            indent: 40,
            identityProvider,
            multipleSelectionSupport: false,
            overrideStyles,
            accessibilityProvider: {
                getAriaLabel(extensionData) {
                    return getAriaLabelForExtension(extensionData.extension);
                },
                getWidgetAriaLabel() {
                    return localize('extensions', "Extensions");
                }
            }
        }, instantiationService, contextKeyService, listService, configurationService);
        this.setInput(input);
        this.disposables.add(this.onDidChangeSelection(event => {
            if (dom.isKeyboardEvent(event.browserEvent)) {
                extensionsWorkdbenchService.open(event.elements[0].extension, { sideByside: false });
            }
        }));
    }
};
ExtensionsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IInstantiationService),
    __param(6, IConfigurationService),
    __param(7, IExtensionsWorkbenchService)
], ExtensionsTree);
export { ExtensionsTree };
export class ExtensionData {
    constructor(extension, parent, getChildrenExtensionIds, extensionsWorkbenchService) {
        this.extension = extension;
        this.parent = parent;
        this.getChildrenExtensionIds = getChildrenExtensionIds;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.childrenExtensionIds = this.getChildrenExtensionIds(extension);
    }
    get hasChildren() {
        return isNonEmptyArray(this.childrenExtensionIds);
    }
    async getChildren() {
        if (this.hasChildren) {
            const result = await getExtensions(this.childrenExtensionIds, this.extensionsWorkbenchService);
            return result.map(extension => new ExtensionData(extension, this, this.getChildrenExtensionIds, this.extensionsWorkbenchService));
        }
        return null;
    }
}
export async function getExtensions(extensions, extensionsWorkbenchService) {
    const localById = extensionsWorkbenchService.local.reduce((result, e) => { result.set(e.identifier.id.toLowerCase(), e); return result; }, new Map());
    const result = [];
    const toQuery = [];
    for (const extensionId of extensions) {
        const id = extensionId.toLowerCase();
        const local = localById.get(id);
        if (local) {
            result.push(local);
        }
        else {
            toQuery.push(id);
        }
    }
    if (toQuery.length) {
        const galleryResult = await extensionsWorkbenchService.getExtensions(toQuery.map(id => ({ id })), CancellationToken.None);
        result.push(...galleryResult);
    }
    return result;
}
registerThemingParticipant((theme, collector) => {
    const focusBackground = theme.getColor(listFocusBackground);
    if (focusBackground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { background-color: ${focusBackground}; outline: none; }`);
    }
    const focusForeground = theme.getColor(listFocusForeground);
    if (focusForeground) {
        collector.addRule(`.extensions-grid-view .extension-container:focus { color: ${focusForeground}; }`);
    }
    const foregroundColor = theme.getColor(foreground);
    const editorBackgroundColor = theme.getColor(editorBackground);
    if (foregroundColor && editorBackgroundColor) {
        const authorForeground = foregroundColor.transparent(.9).makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container:not(.disabled) .author { color: ${authorForeground}; }`);
        const disabledExtensionForeground = foregroundColor.transparent(.5).makeOpaque(editorBackgroundColor);
        collector.addRule(`.extensions-grid-view .extension-container.disabled { color: ${disabledExtensionForeground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNWaWV3ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckksT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUYsT0FBTyxFQUFFLDJCQUEyQixFQUFvQyxNQUFNLHlCQUF5QixDQUFDO0FBQ3hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUE4QixzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3hKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSwwQkFBMEIsRUFBbUMsTUFBTSxtREFBbUQsQ0FBQztBQUdoSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUs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