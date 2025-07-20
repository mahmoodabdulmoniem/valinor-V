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
var PromptCodingAgentActionOverlayWidget_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IRemoteCodingAgentsService } from '../../../remoteCodingAgents/common/remoteCodingAgentsService.js';
import { localize } from '../../../../../nls.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { getPromptCommandName } from '../../common/promptSyntax/service/promptsServiceImpl.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { $ } from '../../../../../base/browser/dom.js';
let PromptCodingAgentActionOverlayWidget = class PromptCodingAgentActionOverlayWidget extends Disposable {
    static { PromptCodingAgentActionOverlayWidget_1 = this; }
    static { this.ID = 'promptCodingAgentActionOverlay'; }
    constructor(_editor, _commandService, _contextKeyService, _remoteCodingAgentService) {
        super();
        this._editor = _editor;
        this._commandService = _commandService;
        this._contextKeyService = _contextKeyService;
        this._remoteCodingAgentService = _remoteCodingAgentService;
        this._isVisible = false;
        this._domNode = $('.prompt-coding-agent-action-overlay');
        this._button = this._register(new Button(this._domNode, {
            supportIcons: true,
            title: localize('runPromptWithCodingAgent', "Run prompt file in a remote coding agent")
        }));
        this._button.element.style.background = 'var(--vscode-button-background)';
        this._button.element.style.color = 'var(--vscode-button-foreground)';
        this._button.label = localize('runWithCodingAgent.label', "{0} Delegate to Copilot coding agent", '$(cloud-upload)');
        this._register(this._button.onDidClick(async () => {
            await this._execute();
        }));
        this._register(this._contextKeyService.onDidChangeContext(() => {
            this._updateVisibility();
        }));
        this._register(this._editor.onDidChangeModel(() => {
            this._updateVisibility();
        }));
        this._register(this._editor.onDidLayoutChange(() => {
            if (this._isVisible) {
                this._editor.layoutOverlayWidget(this);
            }
        }));
        // initial visibility
        this._updateVisibility();
    }
    getId() {
        return PromptCodingAgentActionOverlayWidget_1.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        if (!this._isVisible) {
            return null;
        }
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */,
        };
    }
    _updateVisibility() {
        const enableRemoteCodingAgentPromptFileOverlay = ChatContextKeys.enableRemoteCodingAgentPromptFileOverlay.getValue(this._contextKeyService);
        const hasRemoteCodingAgent = ChatContextKeys.hasRemoteCodingAgent.getValue(this._contextKeyService);
        const model = this._editor.getModel();
        const isPromptFile = model?.getLanguageId() === PROMPT_LANGUAGE_ID;
        const shouldBeVisible = !!(isPromptFile && enableRemoteCodingAgentPromptFileOverlay && hasRemoteCodingAgent);
        if (shouldBeVisible !== this._isVisible) {
            this._isVisible = shouldBeVisible;
            if (this._isVisible) {
                this._editor.addOverlayWidget(this);
            }
            else {
                this._editor.removeOverlayWidget(this);
            }
        }
    }
    async _execute() {
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        this._button.enabled = false;
        try {
            const promptContent = model.getValue();
            const promptName = getPromptCommandName(model.uri.path);
            const agents = this._remoteCodingAgentService.getAvailableAgents();
            const agent = agents[0]; // Use the first available agent
            if (!agent) {
                return;
            }
            await this._commandService.executeCommand(agent.command, {
                userPrompt: promptName,
                summary: promptContent,
                source: 'prompt',
            });
        }
        finally {
            this._button.enabled = true;
        }
    }
    dispose() {
        if (this._isVisible) {
            this._editor.removeOverlayWidget(this);
        }
        super.dispose();
    }
};
PromptCodingAgentActionOverlayWidget = PromptCodingAgentActionOverlayWidget_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IContextKeyService),
    __param(3, IRemoteCodingAgentsService)
], PromptCodingAgentActionOverlayWidget);
export { PromptCodingAgentActionOverlayWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29kaW5nQWdlbnRBY3Rpb25PdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3Byb21wdENvZGluZ0FnZW50QWN0aW9uT3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDN0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFaEQsSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBcUMsU0FBUSxVQUFVOzthQUUzQyxPQUFFLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW9DO0lBTTlELFlBQ2tCLE9BQW9CLEVBQ3BCLGVBQWlELEVBQzlDLGtCQUF1RCxFQUMvQyx5QkFBc0U7UUFFbEcsS0FBSyxFQUFFLENBQUM7UUFMUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FB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