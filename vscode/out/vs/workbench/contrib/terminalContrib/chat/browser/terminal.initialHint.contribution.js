var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TerminalInitialHintContribution_1;
import * as dom from '../../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../../base/browser/formattedTextRenderer.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { KeybindingLabel } from '../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { OS } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../terminal/browser/terminal.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalInstance } from '../../../terminal/browser/terminalInstance.js';
import './media/terminalInitialHint.css';
const $ = dom.$;
var Constants;
(function (Constants) {
    Constants["InitialHintHideStorageKey"] = "terminal.initialHint.hide";
})(Constants || (Constants = {}));
export class InitialHintAddon extends Disposable {
    get onDidRequestCreateHint() { return this._onDidRequestCreateHint.event; }
    constructor(_capabilities, _onDidChangeAgents) {
        super();
        this._capabilities = _capabilities;
        this._onDidChangeAgents = _onDidChangeAgents;
        this._onDidRequestCreateHint = this._register(new Emitter());
        this._disposables = this._register(new MutableDisposable());
    }
    activate(terminal) {
        const store = this._register(new DisposableStore());
        this._disposables.value = store;
        const capability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (capability) {
            store.add(Event.once(capability.promptInputModel.onDidStartInput)(() => this._onDidRequestCreateHint.fire()));
        }
        else {
            this._register(this._capabilities.onDidAddCapability(e => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                    const capability = e.capability;
                    store.add(Event.once(capability.promptInputModel.onDidStartInput)(() => this._onDidRequestCreateHint.fire()));
                    if (!capability.promptInputModel.value) {
                        this._onDidRequestCreateHint.fire();
                    }
                }
            }));
        }
        const agentListener = this._onDidChangeAgents((e) => {
            if (e?.locations.includes(ChatAgentLocation.Terminal)) {
                this._onDidRequestCreateHint.fire();
                agentListener.dispose();
            }
        });
        this._disposables.value?.add(agentListener);
    }
}
let TerminalInitialHintContribution = class TerminalInitialHintContribution extends Disposable {
    static { TerminalInitialHintContribution_1 = this; }
    static { this.ID = 'terminal.initialHint'; }
    static get(instance) {
        return instance.getContribution(TerminalInitialHintContribution_1.ID);
    }
    constructor(_ctx, _chatAgentService, _configurationService, _instantiationService, _storageService, _terminalEditorService, _terminalGroupService) {
        super();
        this._ctx = _ctx;
        this._chatAgentService = _chatAgentService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        // Reset hint state when config changes
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this._storageService.remove("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, -1 /* StorageScope.APPLICATION */);
            }
        }));
    }
    xtermOpen(xterm) {
        // Don't show is the terminal was launched by an extension or a feature like debug
        if ('shellLaunchConfig' in this._ctx.instance && (this._ctx.instance.shellLaunchConfig.isExtensionOwnedTerminal || this._ctx.instance.shellLaunchConfig.isFeatureTerminal)) {
            return;
        }
        // Don't show if disabled
        if (this._storageService.getBoolean("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, -1 /* StorageScope.APPLICATION */, false)) {
            return;
        }
        // Only show for the first terminal
        if (this._terminalGroupService.instances.length + this._terminalEditorService.instances.length !== 1) {
            return;
        }
        this._xterm = xterm;
        this._addon = this._register(this._instantiationService.createInstance(InitialHintAddon, this._ctx.instance.capabilities, this._chatAgentService.onDidChangeAgents));
        this._xterm.raw.loadAddon(this._addon);
        this._register(this._addon.onDidRequestCreateHint(() => this._createHint()));
    }
    _createHint() {
        const instance = this._ctx.instance instanceof TerminalInstance ? this._ctx.instance : undefined;
        const commandDetectionCapability = instance?.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!instance || !this._xterm || this._hintWidget || !commandDetectionCapability || commandDetectionCapability.promptInputModel.value || !!instance.shellLaunchConfig.attachPersistentProcess) {
            return;
        }
        if (!this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
            return;
        }
        if (!this._decoration) {
            const marker = this._xterm.raw.registerMarker();
            if (!marker) {
                return;
            }
            if (this._xterm.raw.buffer.active.cursorX === 0) {
                return;
            }
            this._register(marker);
            this._decoration = this._xterm.raw.registerDecoration({
                marker,
                x: this._xterm.raw.buffer.active.cursorX + 1,
            });
            if (this._decoration) {
                this._register(this._decoration);
            }
        }
        this._register(this._xterm.raw.onKey(() => this.dispose()));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */) && !this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this.dispose();
            }
        }));
        const inputModel = commandDetectionCapability.promptInputModel;
        if (inputModel) {
            this._register(inputModel.onDidChangeInput(() => {
                if (inputModel.value) {
                    this.dispose();
                }
            }));
        }
        if (!this._decoration) {
            return;
        }
        this._register(this._decoration);
        this._register(this._decoration.onRender((e) => {
            if (!this._hintWidget && this._xterm?.isFocused && this._terminalGroupService.instances.length + this._terminalEditorService.instances.length === 1) {
                const terminalAgents = this._chatAgentService.getActivatedAgents().filter(candidate => candidate.locations.includes(ChatAgentLocation.Terminal));
                if (terminalAgents?.length) {
                    const widget = this._register(this._instantiationService.createInstance(TerminalInitialHintWidget, instance));
                    this._addon?.dispose();
                    this._hintWidget = widget.getDomNode(terminalAgents);
                    if (!this._hintWidget) {
                        return;
                    }
                    e.appendChild(this._hintWidget);
                    e.classList.add('terminal-initial-hint');
                    const font = this._xterm.getFont();
                    if (font) {
                        e.style.fontFamily = font.fontFamily;
                        e.style.fontSize = font.fontSize + 'px';
                    }
                }
            }
            if (this._hintWidget && this._xterm) {
                const decoration = this._hintWidget.parentElement;
                if (decoration) {
                    decoration.style.width = (this._xterm.raw.cols - this._xterm.raw.buffer.active.cursorX) / this._xterm.raw.cols * 100 + '%';
                }
            }
        }));
    }
};
TerminalInitialHintContribution = TerminalInitialHintContribution_1 = __decorate([
    __param(1, IChatAgentService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITerminalEditorService),
    __param(6, ITerminalGroupService)
], TerminalInitialHintContribution);
export { TerminalInitialHintContribution };
registerTerminalContribution(TerminalInitialHintContribution.ID, TerminalInitialHintContribution, false);
let TerminalInitialHintWidget = class TerminalInitialHintWidget extends Disposable {
    constructor(_instance, _commandService, _configurationService, _contextMenuService, _keybindingService, _storageService, _telemetryService, _terminalService) {
        super();
        this._instance = _instance;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._storageService = _storageService;
        this._telemetryService = _telemetryService;
        this._terminalService = _terminalService;
        this._toDispose = this._register(new DisposableStore());
        this._isVisible = false;
        this._ariaLabel = '';
        this._toDispose.add(_instance.onDidFocus(() => {
            if (this._instance.hasFocus && this._isVisible && this._ariaLabel && this._configurationService.getValue("accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalChat */)) {
                status(this._ariaLabel);
            }
        }));
        this._toDispose.add(_terminalService.onDidChangeInstances(() => {
            if (this._terminalService.instances.length !== 1) {
                this.dispose();
            }
        }));
        this._toDispose.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */) && !this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this.dispose();
            }
        }));
    }
    _getHintInlineChat(agents) {
        let ariaLabel = `Open chat.`;
        const handleClick = () => {
            this._storageService.store("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            this._telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'terminalInlineChat.hintAction',
                from: 'hint'
            });
            this._commandService.executeCommand("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */, { from: 'hint' });
        };
        this._toDispose.add(this._commandService.onDidExecuteCommand(e => {
            if (e.commandId === "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */) {
                this._storageService.store("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                this.dispose();
            }
        }));
        const hintHandler = {
            disposables: this._toDispose,
            callback: (index, _event) => {
                switch (index) {
                    case '0':
                        handleClick();
                        break;
                }
            }
        };
        const hintElement = $('div.terminal-initial-hint');
        hintElement.style.display = 'block';
        const keybindingHint = this._keybindingService.lookupKeybinding("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */);
        const keybindingHintLabel = keybindingHint?.getLabel();
        if (keybindingHint && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Open chat {0}. ', keybindingHintLabel);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                const hintPart = $('a', undefined, fragment);
                this._toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CLICK, handleClick));
                return hintPart;
            });
            hintElement.appendChild(before);
            const label = hintHandler.disposables.add(new KeybindingLabel(hintElement, OS));
            label.set(keybindingHint);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            label.element.style.cursor = 'pointer';
            this._toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CLICK, handleClick));
            hintElement.appendChild(after);
            const typeToDismiss = localize('hintTextDismiss', 'Start typing to dismiss.');
            const textHint2 = $('span.detail', undefined, typeToDismiss);
            hintElement.appendChild(textHint2);
            ariaLabel = actionPart.concat(typeToDismiss);
        }
        else {
            const hintMsg = localize({
                key: 'inlineChatHint',
                comment: [
                    'Preserve double-square brackets and their order',
                ]
            }, '[[Open chat]] or start typing to dismiss.');
            const rendered = renderFormattedText(hintMsg, { actionHandler: hintHandler });
            hintElement.appendChild(rendered);
        }
        return { ariaLabel, hintHandler, hintElement };
    }
    getDomNode(agents) {
        if (!this._domNode) {
            this._domNode = $('.terminal-initial-hint');
            this._domNode.style.paddingLeft = '4px';
            const { hintElement, ariaLabel } = this._getHintInlineChat(agents);
            this._domNode.append(hintElement);
            this._ariaLabel = ariaLabel.concat(localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalChat */));
            this._toDispose.add(dom.addDisposableListener(this._domNode, 'click', () => {
                this._domNode?.remove();
                this._domNode = undefined;
            }));
            this._toDispose.add(dom.addDisposableListener(this._domNode, dom.EventType.CONTEXT_MENU, (e) => {
                this._contextMenuService.showContextMenu({
                    getAnchor: () => { return new StandardMouseEvent(dom.getActiveWindow(), e); },
                    getActions: () => {
                        return [{
                                id: 'workench.action.disableTerminalInitialHint',
                                label: localize('disableInitialHint', "Disable Initial Hint"),
                                tooltip: localize('disableInitialHint', "Disable Initial Hint"),
                                enabled: true,
                                class: undefined,
                                run: () => this._configurationService.updateValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */, false)
                            }
                        ];
                    }
                });
            }));
        }
        return this._domNode;
    }
    dispose() {
        this._domNode?.remove();
        super.dispose();
    }
};
TerminalInitialHintWidget = __decorate([
    __param(1, ICommandService),
    __param(2, IConfigurationService),
    __param(3, IContextMenuService),
    __param(4, IKeybindingService),
    __param(5, IStorageService),
    __param(6, ITelemetryService),
    __param(7, ITerminalService)
], TerminalInitialHintWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaW5pdGlhbEhpbnQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsLmluaXRpYWxIaW50LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0EsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQXlCLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUVwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekcsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUcxRixPQUFPLEVBQWMsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQW9ELHNCQUFzQixFQUFFLHFCQUFxQixFQUFxQixnQkFBZ0IsRUFBa0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3TSxPQUFPLEVBQUUsNEJBQTRCLEVBQTBGLE1BQU0saURBQWlELENBQUM7QUFDdkwsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFakYsT0FBTyxpQ0FBaUMsQ0FBQztBQUd6QyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQixvRUFBdUQsQ0FBQTtBQUN4RCxDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQUUvQyxJQUFJLHNCQUFzQixLQUFrQixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBR3hGLFlBQTZCLGFBQXVDLEVBQ2xELGtCQUFpRDtRQUNsRSxLQUFLLEVBQUUsQ0FBQztRQUZvQixrQkFBYSxHQUFiLGFBQWEsQ0FBMEI7UUFDbEQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUErQjtRQUxsRCw0QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUU5RCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBbUIsQ0FBQyxDQUFDO0lBS3pGLENBQUM7SUFDRCxRQUFRLENBQUMsUUFBMEI7UUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyw2Q0FBcUMsQ0FBQztRQUMvRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDeEQsSUFBSSxDQUFDLENBQUMsRUFBRSxnREFBd0MsRUFBRSxDQUFDO29CQUNsRCxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO29CQUNoQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQzlHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQ3hDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0Q7QUFFTSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7O2FBQzlDLE9BQUUsR0FBRyxzQkFBc0IsQUFBekIsQ0FBMEI7SUFNNUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUF1RDtRQUNqRSxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQWtDLGlDQUErQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFJRCxZQUNrQixJQUFtRixFQUNoRSxpQkFBb0MsRUFDaEMscUJBQTRDLEVBQzVDLHFCQUE0QyxFQUNsRCxlQUFnQyxFQUN6QixzQkFBOEMsRUFDL0MscUJBQTRDO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBUlMsU0FBSSxHQUFKLElBQUksQ0FBK0U7UUFDaEUsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbEQsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3pCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFDL0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUlwRix1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEUsSUFBSSxDQUFDLENBQUMsb0JBQW9CLDhFQUFzQyxFQUFFLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSwwR0FBK0QsQ0FBQztZQUM1RixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBaUQ7UUFDMUQsa0ZBQWtGO1FBQ2xGLElBQUksbUJBQW1CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDNUssT0FBTztRQUNSLENBQUM7UUFDRCx5QkFBeUI7UUFDekIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsMkdBQWdFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0csT0FBTztRQUNSLENBQUM7UUFDRCxtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0RyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3JLLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUVPLFdBQVc7UUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLFlBQVksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDakcsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLEVBQUUsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7UUFDbkcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLDBCQUEwQixJQUFJLDBCQUEwQixDQUFDLGdCQUFnQixDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDL0wsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsOEVBQXNDLEVBQUUsQ0FBQztZQUNoRixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakQsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3JELE1BQU07Z0JBQ04sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUM7YUFDNUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsOEVBQXNDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSw4RUFBc0MsRUFBRSxDQUFDO2dCQUNoSixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQztRQUMvRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQkFDL0MsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckosTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDakosSUFBSSxjQUFjLEVBQUUsTUFBTSxFQUFFLENBQUM7b0JBQzVCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUM5RyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDO29CQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ3JELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ3ZCLE9BQU87b0JBQ1IsQ0FBQztvQkFDRCxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztvQkFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkMsSUFBSSxJQUFJLEVBQUUsQ0FBQzt3QkFDVixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO3dCQUNyQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztvQkFDekMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDO2dCQUNsRCxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO2dCQUM3SCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQWhJVywrQkFBK0I7SUFlekMsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7R0FwQlgsK0JBQStCLENBaUkzQzs7QUFDRCw0QkFBNEIsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFekcsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBT2pELFlBQ2tCLFNBQTRCLEVBQzVCLGVBQWlELEVBQzNDLHFCQUE2RCxFQUMvRCxtQkFBeUQsRUFDMUQsa0JBQXVELEVBQzFELGVBQWlELEVBQy9DLGlCQUFxRCxFQUN0RCxnQkFBbUQ7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFUUyxjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUNYLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUMxQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDekMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN6QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDOUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNyQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBWnJELGVBQVUsR0FBb0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDN0UsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUNuQixlQUFVLEdBQVcsRUFBRSxDQUFDO1FBYS9CLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzdDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLDJGQUE4QyxFQUFFLENBQUM7Z0JBQ3hKLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNFLElBQUksQ0FBQyxDQUFDLG9CQUFvQiw4RUFBc0MsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLDhFQUFzQyxFQUFFLENBQUM7Z0JBQ2hKLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxNQUFvQjtRQUM5QyxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUM7UUFFN0IsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyx3RUFBc0MsSUFBSSxnRUFBK0MsQ0FBQztZQUNwSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRTtnQkFDakksRUFBRSxFQUFFLCtCQUErQjtnQkFDbkMsSUFBSSxFQUFFLE1BQU07YUFDWixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsMkVBQThCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDcEYsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNoRSxJQUFJLENBQUMsQ0FBQyxTQUFTLDZFQUFnQyxFQUFFLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyx3RUFBc0MsSUFBSSxnRUFBK0MsQ0FBQztnQkFDcEgsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSxXQUFXLEdBQTBCO1lBQzFDLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUM1QixRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzNCLFFBQVEsS0FBSyxFQUFFLENBQUM7b0JBQ2YsS0FBSyxHQUFHO3dCQUNQLFdBQVcsRUFBRSxDQUFDO3dCQUNkLE1BQU07Z0JBQ1IsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbkQsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBRXBDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsMEVBQTZCLENBQUM7UUFDN0YsTUFBTSxtQkFBbUIsR0FBRyxjQUFjLEVBQUUsUUFBUSxFQUFFLENBQUM7UUFFdkQsSUFBSSxjQUFjLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUMzQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFFckYsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQzlFLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzNGLE9BQU8sUUFBUSxDQUFDO1lBQ2pCLENBQUMsQ0FBQyxDQUFDO1lBRUgsV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVoQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRixLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzFCLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUM7WUFDMUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztZQUV2QyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFFaEcsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvQixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUM5RSxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RCxXQUFXLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRW5DLFNBQVMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDO2dCQUN4QixHQUFHLEVBQUUsZ0JBQWdCO2dCQUNyQixPQUFPLEVBQUU7b0JBQ1IsaURBQWlEO2lCQUNqRDthQUNELEVBQUUsMkNBQTJDLENBQUMsQ0FBQztZQUNoRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUM5RSxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFFRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQW9CO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsUUFBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1lBRXpDLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLCtDQUErQyw0RkFBK0MsQ0FBQyxDQUFDO1lBRTNKLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQzFFLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM5RixJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDO29CQUN4QyxTQUFTLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzdFLFVBQVUsRUFBRSxHQUFHLEVBQUU7d0JBQ2hCLE9BQU8sQ0FBQztnQ0FDUCxFQUFFLEVBQUUsNENBQTRDO2dDQUNoRCxLQUFLLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHNCQUFzQixDQUFDO2dDQUM3RCxPQUFPLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHNCQUFzQixDQUFDO2dDQUMvRCxPQUFPLEVBQUUsSUFBSTtnQ0FDYixLQUFLLEVBQUUsU0FBUztnQ0FDaEIsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLCtFQUF1QyxLQUFLLENBQUM7NkJBQzlGO3lCQUNBLENBQUM7b0JBQ0gsQ0FBQztpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDeEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRCxDQUFBO0FBcEpLLHlCQUF5QjtJQVM1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGdCQUFnQixDQUFBO0dBZmIseUJBQXlCLENBb0o5QiJ9