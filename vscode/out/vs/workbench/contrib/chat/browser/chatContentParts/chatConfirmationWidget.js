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
import * as dom from '../../../../../base/browser/dom.js';
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { Action } from '../../../../../base/common/actions.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer, openLinkFromMarkdown } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { showChatView } from '../chat.js';
import './media/chatConfirmationWidget.css';
let ChatQueryTitlePart = class ChatQueryTitlePart extends Disposable {
    get title() {
        return this._title;
    }
    set title(value) {
        this._title = value;
        const next = this._renderer.render(this.toMdString(value), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        const previousEl = this._renderedTitle.value?.element;
        if (previousEl?.parentElement) {
            previousEl.parentElement.replaceChild(next.element, previousEl);
        }
        else {
            this.element.appendChild(next.element); // unreachable?
        }
        this._renderedTitle.value = next;
    }
    constructor(element, _title, subtitle, _renderer, _openerService) {
        super();
        this.element = element;
        this._title = _title;
        this._renderer = _renderer;
        this._openerService = _openerService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._renderedTitle = this._register(new MutableDisposable());
        element.classList.add('chat-query-title-part');
        this._renderedTitle.value = _renderer.render(this.toMdString(_title), {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
        });
        element.append(this._renderedTitle.value.element);
        if (subtitle) {
            const str = this.toMdString(subtitle);
            const renderedTitle = this._register(_renderer.render(str, {
                asyncRenderCallback: () => this._onDidChangeHeight.fire(),
                actionHandler: { callback: link => openLinkFromMarkdown(this._openerService, link, str.isTrusted), disposables: this._store },
            }));
            const wrapper = document.createElement('small');
            wrapper.appendChild(renderedTitle.element);
            element.append(wrapper);
        }
    }
    toMdString(value) {
        if (typeof value === 'string') {
            return new MarkdownString('', { supportThemeIcons: true }).appendText(value);
        }
        else {
            return new MarkdownString(value.value, { supportThemeIcons: true, isTrusted: value.isTrusted });
        }
    }
};
ChatQueryTitlePart = __decorate([
    __param(4, IOpenerService)
], ChatQueryTitlePart);
export { ChatQueryTitlePart };
let BaseChatConfirmationWidget = class BaseChatConfirmationWidget extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidChangeHeight() { return this._onDidChangeHeight.event; }
    get domNode() {
        return this._domNode;
    }
    get showingButtons() {
        return !this.domNode.classList.contains('hideButtons');
    }
    setShowButtons(showButton) {
        this.domNode.classList.toggle('hideButtons', !showButton);
    }
    constructor(title, subtitle, buttons, instantiationService, contextMenuService, _configurationService, _hostService, _viewsService) {
        super();
        this.title = title;
        this.instantiationService = instantiationService;
        this._configurationService = _configurationService;
        this._hostService = _hostService;
        this._viewsService = _viewsService;
        this._onDidClick = this._register(new Emitter());
        this._onDidChangeHeight = this._register(new Emitter());
        this.notification = this._register(new MutableDisposable());
        const elements = dom.h('.chat-confirmation-widget@root', [
            dom.h('.chat-confirmation-widget-title@title'),
            dom.h('.chat-confirmation-widget-message@message'),
            dom.h('.chat-buttons-container@buttonsContainer'),
        ]);
        this._domNode = elements.root;
        this.markdownRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        const titlePart = this._register(instantiationService.createInstance(ChatQueryTitlePart, elements.title, title, subtitle, this.markdownRenderer));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.messageElement = elements.message;
        buttons.forEach(buttonData => {
            const buttonOptions = { ...defaultButtonStyles, secondary: buttonData.isSecondary, title: buttonData.tooltip, disabled: buttonData.disabled };
            let button;
            if (buttonData.moreActions) {
                button = new ButtonWithDropdown(elements.buttonsContainer, {
                    ...buttonOptions,
                    contextMenuProvider: contextMenuService,
                    addPrimaryActionToDropdown: false,
                    actions: buttonData.moreActions.map(action => this._register(new Action(action.label, action.label, undefined, !action.disabled, () => {
                        this._onDidClick.fire(action);
                        return Promise.resolve();
                    }))),
                });
            }
            else {
                button = new Button(elements.buttonsContainer, buttonOptions);
            }
            this._register(button);
            button.label = buttonData.label;
            this._register(button.onDidClick(() => this._onDidClick.fire(buttonData)));
            if (buttonData.onDidChangeDisablement) {
                this._register(buttonData.onDidChangeDisablement(disabled => button.enabled = !disabled));
            }
        });
    }
    renderMessage(element, listContainer) {
        this.messageElement.append(element);
        if (this.showingButtons && this._configurationService.getValue('chat.notifyWindowOnConfirmation')) {
            const targetWindow = dom.getWindow(listContainer);
            if (!targetWindow.document.hasFocus()) {
                this.notifyConfirmationNeeded(targetWindow);
            }
        }
    }
    async notifyConfirmationNeeded(targetWindow) {
        // Focus Window
        this._hostService.focus(targetWindow, { mode: 1 /* FocusMode.Notify */ });
        // Notify
        const title = renderAsPlaintext(this.title);
        const notification = await dom.triggerNotification(title ? localize('notificationTitle', "Chat: {0}", title) : localize('defaultTitle', "Chat: Confirmation Required"), {
            detail: localize('notificationDetail', "The current chat session requires your confirmation to proceed.")
        });
        if (notification) {
            const disposables = this.notification.value = new DisposableStore();
            disposables.add(notification);
            disposables.add(Event.once(notification.onClick)(() => {
                this._hostService.focus(targetWindow, { mode: 2 /* FocusMode.Force */ });
                showChatView(this._viewsService);
            }));
            disposables.add(this._hostService.onDidChangeFocus(focus => {
                if (focus) {
                    disposables.dispose();
                }
            }));
        }
    }
};
BaseChatConfirmationWidget = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IConfigurationService),
    __param(6, IHostService),
    __param(7, IViewsService)
], BaseChatConfirmationWidget);
let ChatConfirmationWidget = class ChatConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, subtitle, message, buttons, _container, instantiationService, contextMenuService, configurationService, hostService, viewsService) {
        super(title, subtitle, buttons, instantiationService, contextMenuService, configurationService, hostService, viewsService);
        this._container = _container;
        this.updateMessage(message);
    }
    updateMessage(message) {
        this._renderedMessage?.remove();
        const renderedMessage = this._register(this.markdownRenderer.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        this.renderMessage(renderedMessage.element, this._container);
        this._renderedMessage = renderedMessage.element;
    }
};
ChatConfirmationWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextMenuService),
    __param(7, IConfigurationService),
    __param(8, IHostService),
    __param(9, IViewsService)
], ChatConfirmationWidget);
export { ChatConfirmationWidget };
let ChatCustomConfirmationWidget = class ChatCustomConfirmationWidget extends BaseChatConfirmationWidget {
    constructor(title, subtitle, messageElement, buttons, container, instantiationService, contextMenuService, configurationService, hostService, viewsService) {
        super(title, subtitle, buttons, instantiationService, contextMenuService, configurationService, hostService, viewsService);
        this.renderMessage(messageElement, container);
    }
};
ChatCustomConfirmationWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, IContextMenuService),
    __param(7, IConfigurationService),
    __param(8, IHostService),
    __param(9, IViewsService)
], ChatCustomConfirmationWidget);
export { ChatCustomConfirmationWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbmZpcm1hdGlvbldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQTJCLE1BQU0saURBQWlELENBQUM7QUFDdEgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pHLE9BQU8sRUFBeUIsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNsSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFB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