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
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { chatViewsWelcomeRegistry } from './chatViewsWelcome.js';
const $ = dom.$;
let ChatViewWelcomeController = class ChatViewWelcomeController extends Disposable {
    constructor(container, delegate, location, contextKeyService, instantiationService) {
        super();
        this.container = container;
        this.delegate = delegate;
        this.location = location;
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        this.enabled = false;
        this.enabledDisposables = this._register(new DisposableStore());
        this.renderDisposables = this._register(new DisposableStore());
        this.element = dom.append(this.container, dom.$('.chat-view-welcome'));
        this._register(Event.runAndSubscribe(delegate.onDidChangeViewWelcomeState, () => this.update()));
        this._register(chatViewsWelcomeRegistry.onDidChange(() => this.update(true)));
    }
    update(force) {
        const enabled = this.delegate.shouldShowWelcome();
        if (this.enabled === enabled && !force) {
            return;
        }
        this.enabled = enabled;
        this.enabledDisposables.clear();
        if (!enabled) {
            this.container.classList.toggle('chat-view-welcome-visible', false);
            this.renderDisposables.clear();
            return;
        }
        const descriptors = chatViewsWelcomeRegistry.get();
        if (descriptors.length) {
            this.render(descriptors);
            const descriptorKeys = new Set(descriptors.flatMap(d => d.when.keys()));
            this.enabledDisposables.add(this.contextKeyService.onDidChangeContext(e => {
                if (e.affectsSome(descriptorKeys)) {
                    this.render(descriptors);
                }
            }));
        }
    }
    render(descriptors) {
        this.renderDisposables.clear();
        dom.clearNode(this.element);
        const matchingDescriptors = descriptors.filter(descriptor => this.contextKeyService.contextMatchesRules(descriptor.when));
        let enabledDescriptor;
        for (const descriptor of matchingDescriptors) {
            if (typeof descriptor.content === 'function') {
                enabledDescriptor = descriptor; // when multiple descriptors match, prefer a "core" one over a "descriptive" one
                break;
            }
        }
        enabledDescriptor = enabledDescriptor ?? matchingDescriptors.at(0);
        if (enabledDescriptor) {
            const content = {
                icon: enabledDescriptor.icon,
                title: enabledDescriptor.title,
                message: enabledDescriptor.content
            };
            const welcomeView = this.renderDisposables.add(this.instantiationService.createInstance(ChatViewWelcomePart, content, { firstLinkToButton: true, location: this.location }));
            this.element.appendChild(welcomeView.element);
            this.container.classList.toggle('chat-view-welcome-visible', true);
        }
        else {
            this.container.classList.toggle('chat-view-welcome-visible', false);
        }
    }
};
ChatViewWelcomeController = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInstantiationService)
], ChatViewWelcomeController);
export { ChatViewWelcomeController };
let ChatViewWelcomePart = class ChatViewWelcomePart extends Disposable {
    constructor(content, options, openerService, instantiationService, logService, chatWidgetService, telemetryService, configurationService) {
        super();
        this.content = content;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.chatWidgetService = chatWidgetService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.element = dom.$('.chat-welcome-view');
        try {
            const renderer = this.instantiationService.createInstance(MarkdownRenderer, {});
            // Icon
            const icon = dom.append(this.element, $('.chat-welcome-view-icon'));
            if (content.icon) {
                icon.appendChild(renderIcon(content.icon));
            }
            // Title
            const title = dom.append(this.element, $('.chat-welcome-view-title'));
            title.textContent = content.title;
            // Preview indicator
            const expEmptyState = this.configurationService.getValue('chat.emptyChatState.enabled');
            if (typeof content.message !== 'function' && options?.isWidgetAgentWelcomeViewContent && !expEmptyState) {
                const container = dom.append(this.element, $('.chat-welcome-view-indicator-container'));
                dom.append(container, $('.chat-welcome-view-subtitle', undefined, localize('agentModeSubtitle', "Agent Mode")));
            }
            // Message
            const message = dom.append(this.element, content.isExperimental ? $('.chat-welcome-experimental-view-message') : $('.chat-welcome-view-message'));
            message.classList.toggle('experimental-empty-state', expEmptyState);
            if (typeof content.message === 'function') {
                dom.append(message, content.message(this._register(new DisposableStore())));
            }
            else {
                const messageResult = this.renderMarkdownMessageContent(renderer, content.message, options);
                dom.append(message, messageResult.element);
            }
            if (content.isExperimental && content.inputPart) {
                content.inputPart.querySelector('.chat-attachments-container')?.remove();
                dom.append(this.element, content.inputPart);
                if (content.suggestedPrompts && content.suggestedPrompts.length) {
                    // create a tile with icon and label for each suggested promot
                    const suggestedPromptsContainer = dom.append(this.element, $('.chat-welcome-view-suggested-prompts'));
                    for (const prompt of content.suggestedPrompts) {
                        const promptElement = dom.append(suggestedPromptsContainer, $('.chat-welcome-view-suggested-prompt'));
                        if (prompt.icon) {
                            const iconElement = dom.append(promptElement, $('.chat-welcome-view-suggested-prompt-icon'));
                            iconElement.appendChild(renderIcon(prompt.icon));
                        }
                        const labelElement = dom.append(promptElement, $('.chat-welcome-view-suggested-prompt-label'));
                        labelElement.textContent = prompt.label;
                        this._register(dom.addDisposableListener(promptElement, dom.EventType.CLICK, () => {
                            this.telemetryService.publicLog2('chat.clickedSuggestedPrompt', {
                                suggestedPrompt: prompt.prompt,
                            });
                            if (!this.chatWidgetService.lastFocusedWidget) {
                                const widgets = this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel);
                                if (widgets.length) {
                                    widgets[0].setInput(prompt.prompt);
                                }
                            }
                            else {
                                this.chatWidgetService.lastFocusedWidget.setInput(prompt.prompt);
                            }
                        }));
                    }
                }
                if (typeof content.additionalMessage === 'string') {
                    const additionalMsg = $('.chat-welcome-view-experimental-additional-message');
                    additionalMsg.textContent = content.additionalMessage;
                    dom.append(this.element, additionalMsg);
                }
            }
            else {
                // Additional message
                if (typeof content.additionalMessage === 'string') {
                    const element = $('');
                    element.textContent = content.additionalMessage;
                    dom.append(message, element);
                }
                else if (content.additionalMessage) {
                    const additionalMessageResult = this.renderMarkdownMessageContent(renderer, content.additionalMessage, options);
                    dom.append(message, additionalMessageResult.element);
                }
            }
            // Tips
            if (content.tips) {
                const tips = dom.append(this.element, $('.chat-welcome-view-tips'));
                const tipsResult = this._register(renderer.render(content.tips));
                tips.appendChild(tipsResult.element);
            }
        }
        catch (err) {
            this.logService.error('Failed to render chat view welcome content', err);
        }
    }
    renderMarkdownMessageContent(renderer, content, options) {
        const messageResult = this._register(renderer.render(content));
        const firstLink = options?.firstLinkToButton ? messageResult.element.querySelector('a') : undefined;
        if (firstLink) {
            const target = firstLink.getAttribute('data-href');
            const button = this._register(new Button(firstLink.parentElement, defaultButtonStyles));
            button.label = firstLink.textContent ?? '';
            if (target) {
                this._register(button.onDidClick(() => {
                    this.openerService.open(target, { allowCommands: true });
                }));
            }
            firstLink.replaceWith(button.element);
        }
        return messageResult;
    }
};
ChatViewWelcomePart = __decorate([
    __param(2, IOpenerService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IChatWidgetService),
    __param(6, ITelemetryService),
    __param(7, IConfigurationService)
], ChatViewWelcomePart);
export { ChatViewWelcomePart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdXZWxjb21lQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3ZpZXdzV2VsY29tZS9jaGF0Vmlld1dlbGNvbWVDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RixPQUFPLEVBQXlCLGdCQUFnQixFQUFFLE1BQU0sbUZBQW1GLENBQUM7QUFDNUksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBK0IsTUFBTSx1QkFBdUIsQ0FBQztBQUU5RixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBT1QsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBT3hELFlBQ2tCLFNBQXNCLEVBQ3RCLFFBQThCLEVBQzlCLFFBQTJCLEVBQ3hCLGlCQUE2QyxFQUMxQyxvQkFBbUQ7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFOUyxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLGFBQVEsR0FBUixRQUFRLENBQXNCO1FBQzlCLGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQ2hCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVRuRSxZQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ1AsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDM0Qsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFXMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUNuQyxRQUFRLENBQUMsMkJBQTJCLEVBQ3BDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVPLE1BQU0sQ0FBQyxLQUFlO1FBQzdCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUNsRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFaEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMvQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ25ELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFekIsTUFBTSxjQUFjLEdBQWdCLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyRixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDekUsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsV0FBdUQ7UUFDckUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQVEsQ0FBQyxDQUFDO1FBRTdCLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxSCxJQUFJLGlCQUEwRCxDQUFDO1FBQy9ELEtBQUssTUFBTSxVQUFVLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUM5QyxJQUFJLE9BQU8sVUFBVSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDOUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDLENBQUMsZ0ZBQWdGO2dCQUNoSCxNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFDRCxpQkFBaUIsR0FBRyxpQkFBaUIsSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sT0FBTyxHQUE0QjtnQkFDeEMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLElBQUk7Z0JBQzVCLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxLQUFLO2dCQUM5QixPQUFPLEVBQUUsaUJBQWlCLENBQUMsT0FBTzthQUNsQyxDQUFDO1lBQ0YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3SyxJQUFJLENBQUMsT0FBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTdFWSx5QkFBeUI7SUFXbkMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0dBWlgseUJBQXlCLENBNkVyQzs7QUF5Qk0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBR2xELFlBQ2lCLE9BQWdDLEVBQ2hELE9BQWtELEVBQzFCLGFBQTZCLEVBQ3RCLG9CQUEyQyxFQUNyRCxVQUF1QixFQUNoQixpQkFBcUMsRUFDdEMsZ0JBQW1DLEVBQy9CLG9CQUEyQztRQUUxRSxLQUFLLEVBQUUsQ0FBQztRQVRRLFlBQU8sR0FBUCxPQUFPLENBQXlCO1FBRXhCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDaEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN0QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQy9CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFHMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUVoRixPQUFPO1lBQ1AsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7WUFDcEUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzVDLENBQUM7WUFFRCxRQUFRO1lBQ1IsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7WUFDdEUsS0FBSyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1lBRWxDLG9CQUFvQjtZQUNwQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLDZCQUE2QixDQUFDLENBQUM7WUFDakcsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssVUFBVSxJQUFJLE9BQU8sRUFBRSwrQkFBK0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN6RyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLDZCQUE2QixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pILENBQUM7WUFFRCxVQUFVO1lBQ1YsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQ2xKLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3BFLElBQUksT0FBTyxPQUFPLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUMzQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM1RixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUMsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLGNBQWMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2pELE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ3pFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBRTVDLElBQUksT0FBTyxDQUFDLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDakUsOERBQThEO29CQUM5RCxNQUFNLHlCQUF5QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxDQUFDO29CQUN0RyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUMvQyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3RHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDOzRCQUNqQixNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDOzRCQUM3RixXQUFXLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDbEQsQ0FBQzt3QkFDRCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxDQUFDO3dCQUMvRixZQUFZLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7d0JBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7NEJBVWpGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXNELDZCQUE2QixFQUFFO2dDQUNwSCxlQUFlLEVBQUUsTUFBTSxDQUFDLE1BQU07NkJBQzlCLENBQUMsQ0FBQzs0QkFFSCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0NBQy9DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQ0FDdEYsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7b0NBQ3BCLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dDQUNwQyxDQUFDOzRCQUNGLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQzs0QkFDbEUsQ0FBQzt3QkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLE9BQU8sT0FBTyxDQUFDLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUNuRCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsb0RBQW9ELENBQUMsQ0FBQztvQkFDOUUsYUFBYSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUM7b0JBQ3RELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDekMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxxQkFBcUI7Z0JBQ3JCLElBQUksT0FBTyxPQUFPLENBQUMsaUJBQWlCLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ25ELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdEIsT0FBTyxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUM7b0JBQ2hELEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM5QixDQUFDO3FCQUFNLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3RDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ2hILEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU87WUFDUCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDakUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxRQUEwQixFQUFFLE9BQXdCLEVBQUUsT0FBa0Q7UUFDNUksTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0QsTUFBTSxTQUFTLEdBQUcsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3BHLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGFBQWMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7WUFDekYsTUFBTSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUNELFNBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0NBQ0QsQ0FBQTtBQW5JWSxtQkFBbUI7SUFNN0IsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7R0FYWCxtQkFBbUIsQ0FtSS9CIn0=