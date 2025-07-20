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
import './media/chatStatus.css';
import { safeIntl } from '../../../../base/common/date.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { language } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IStatusbarService, ShowTooltipCommand } from '../../../services/statusbar/browser/statusbar.js';
import { $, addDisposableListener, append, clearNode, disposableWindowInterval, EventHelper, EventType, getWindow } from '../../../../base/browser/dom.js';
import { ChatEntitlement, IChatEntitlementService, isProUser } from '../common/chatEntitlementService.js';
import { defaultButtonStyles, defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { contrastBorder, inputValidationErrorBorder, inputValidationInfoBorder, inputValidationWarningBorder, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService, nativeHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { Color } from '../../../../base/common/color.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import product from '../../../../platform/product/common/product.js';
import { isObject } from '../../../../base/common/types.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { toAction } from '../../../../base/common/actions.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IChatStatusItemService } from './chatStatusItemService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { URI } from '../../../../base/common/uri.js';
import { IInlineCompletionsService } from '../../../../editor/browser/services/inlineCompletionsService.js';
const gaugeBackground = registerColor('gauge.background', {
    dark: inputValidationInfoBorder,
    light: inputValidationInfoBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeBackground', "Gauge background color."));
registerColor('gauge.foreground', {
    dark: transparent(gaugeBackground, 0.3),
    light: transparent(gaugeBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeForeground', "Gauge foreground color."));
registerColor('gauge.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeBorder', "Gauge border color."));
const gaugeWarningBackground = registerColor('gauge.warningBackground', {
    dark: inputValidationWarningBorder,
    light: inputValidationWarningBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeWarningBackground', "Gauge warning background color."));
registerColor('gauge.warningForeground', {
    dark: transparent(gaugeWarningBackground, 0.3),
    light: transparent(gaugeWarningBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeWarningForeground', "Gauge warning foreground color."));
const gaugeErrorBackground = registerColor('gauge.errorBackground', {
    dark: inputValidationErrorBorder,
    light: inputValidationErrorBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('gaugeErrorBackground', "Gauge error background color."));
registerColor('gauge.errorForeground', {
    dark: transparent(gaugeErrorBackground, 0.3),
    light: transparent(gaugeErrorBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white
}, localize('gaugeErrorForeground', "Gauge error foreground color."));
//#endregion
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    completionsEnablementSetting: product.defaultChatAgent?.completionsEnablementSetting ?? '',
    nextEditSuggestionsSetting: product.defaultChatAgent?.nextEditSuggestionsSetting ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    manageOverageUrl: product.defaultChatAgent?.manageOverageUrl ?? '',
};
let ChatStatusBarEntry = class ChatStatusBarEntry extends Disposable {
    static { this.ID = 'workbench.contrib.chatStatusBarEntry'; }
    constructor(chatEntitlementService, instantiationService, statusbarService, editorService, configurationService, completionsService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.instantiationService = instantiationService;
        this.statusbarService = statusbarService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.completionsService = completionsService;
        this.entry = undefined;
        this.dashboard = new Lazy(() => this.instantiationService.createInstance(ChatStatusDashboard));
        this.activeCodeEditorListener = this._register(new MutableDisposable());
        this.update();
        this.registerListeners();
    }
    update() {
        if (!this.chatEntitlementService.sentiment.hidden) {
            if (!this.entry) {
                this.entry = this.statusbarService.addEntry(this.getEntryProps(), 'chat.statusBarEntry', 1 /* StatusbarAlignment.RIGHT */, { location: { id: 'status.editor.mode', priority: 100.1 }, alignment: 1 /* StatusbarAlignment.RIGHT */ });
            }
            else {
                this.entry.update(this.getEntryProps());
            }
        }
        else {
            this.entry?.dispose();
            this.entry = undefined;
        }
    }
    registerListeners() {
        this._register(this.chatEntitlementService.onDidChangeQuotaExceeded(() => this.update()));
        this._register(this.chatEntitlementService.onDidChangeSentiment(() => this.update()));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.update()));
        this._register(this.completionsService.onDidChangeIsSnoozing(() => this.update()));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                this.update();
            }
        }));
    }
    onDidActiveEditorChange() {
        this.update();
        this.activeCodeEditorListener.clear();
        // Listen to language changes in the active code editor
        const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
        if (activeCodeEditor) {
            this.activeCodeEditorListener.value = activeCodeEditor.onDidChangeModelLanguage(() => {
                this.update();
            });
        }
    }
    getEntryProps() {
        let text = '$(copilot)';
        let ariaLabel = localize('chatStatus', "Copilot Status");
        let kind;
        if (isNewUser(this.chatEntitlementService)) {
            const entitlement = this.chatEntitlementService.entitlement;
            // Finish Setup
            if (this.chatEntitlementService.sentiment.later || // user skipped setup
                entitlement === ChatEntitlement.Available || // user is entitled
                isProUser(entitlement) || // user is already pro
                entitlement === ChatEntitlement.Free // user is already free
            ) {
                const finishSetup = localize('copilotLaterStatus', "Finish Setup");
                text = `$(copilot) ${finishSetup}`;
                ariaLabel = finishSetup;
                kind = 'prominent';
            }
        }
        else {
            const chatQuotaExceeded = this.chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const completionsQuotaExceeded = this.chatEntitlementService.quotas.completions?.percentRemaining === 0;
            // Disabled
            if (this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted) {
                text = `$(copilot-unavailable)`;
                ariaLabel = localize('copilotDisabledStatus', "Copilot Disabled");
            }
            // Signed out
            else if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown) {
                const signedOutWarning = localize('notSignedIntoCopilot', "Signed out");
                text = `$(copilot-not-connected) ${signedOutWarning}`;
                ariaLabel = signedOutWarning;
                kind = 'prominent';
            }
            // Free Quota Exceeded
            else if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && (chatQuotaExceeded || completionsQuotaExceeded)) {
                let quotaWarning;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    quotaWarning = localize('chatQuotaExceededStatus', "Chat quota reached");
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    quotaWarning = localize('completionsQuotaExceededStatus', "Completions quota reached");
                }
                else {
                    quotaWarning = localize('chatAndCompletionsQuotaExceededStatus', "Quota reached");
                }
                text = `$(copilot-warning) ${quotaWarning}`;
                ariaLabel = quotaWarning;
                kind = 'prominent';
            }
            // Completions Disabled
            else if (this.editorService.activeTextEditorLanguageId && !isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId)) {
                text = `$(copilot-unavailable)`;
                ariaLabel = localize('completionsDisabledStatus', "Code completions disabled");
            }
            // Completions Snoozed
            else if (this.completionsService.isSnoozing()) {
                text = `$(copilot-snooze)`;
                ariaLabel = localize('completionsSnoozedStatus', "Code completions snoozed");
            }
        }
        return {
            name: localize('chatStatus', "Copilot Status"),
            text,
            ariaLabel,
            command: ShowTooltipCommand,
            showInAllWindows: true,
            kind,
            tooltip: { element: token => this.dashboard.value.show(token) }
        };
    }
    dispose() {
        super.dispose();
        this.entry?.dispose();
        this.entry = undefined;
    }
};
ChatStatusBarEntry = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IInstantiationService),
    __param(2, IStatusbarService),
    __param(3, IEditorService),
    __param(4, IConfigurationService),
    __param(5, IInlineCompletionsService)
], ChatStatusBarEntry);
export { ChatStatusBarEntry };
function isNewUser(chatEntitlementService) {
    return !chatEntitlementService.sentiment.installed || // copilot not installed
        chatEntitlementService.entitlement === ChatEntitlement.Available; // not yet signed up to copilot
}
function canUseCopilot(chatEntitlementService) {
    const newUser = isNewUser(chatEntitlementService);
    const disabled = chatEntitlementService.sentiment.disabled || chatEntitlementService.sentiment.untrusted;
    const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
    const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
    const allFreeQuotaReached = free && chatEntitlementService.quotas.chat?.percentRemaining === 0 && chatEntitlementService.quotas.completions?.percentRemaining === 0;
    return !newUser && !signedOut && !allFreeQuotaReached && !disabled;
}
function isCompletionsEnabled(configurationService, modeId = '*') {
    const result = configurationService.getValue(defaultChat.completionsEnablementSetting);
    if (!isObject(result)) {
        return false;
    }
    if (typeof result[modeId] !== 'undefined') {
        return Boolean(result[modeId]); // go with setting if explicitly defined
    }
    return Boolean(result['*']); // fallback to global setting otherwise
}
let ChatStatusDashboard = class ChatStatusDashboard extends Disposable {
    constructor(chatEntitlementService, chatStatusItemService, commandService, configurationService, editorService, hoverService, languageService, openerService, telemetryService, textResourceConfigurationService, inlineCompletionsService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.chatStatusItemService = chatStatusItemService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.hoverService = hoverService;
        this.languageService = languageService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.inlineCompletionsService = inlineCompletionsService;
        this.element = $('div.chat-status-bar-entry-tooltip');
        this.dateFormatter = safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
        this.quotaPercentageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
        this.quotaOverageFormatter = safeIntl.NumberFormat(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        this.entryDisposables = this._register(new MutableDisposable());
    }
    show(token) {
        clearNode(this.element);
        const disposables = this.entryDisposables.value = new DisposableStore();
        disposables.add(token.onCancellationRequested(() => disposables.dispose()));
        let needsSeparator = false;
        const addSeparator = (label, action) => {
            if (needsSeparator) {
                this.element.appendChild($('hr'));
            }
            if (label || action) {
                this.renderHeader(this.element, disposables, label ?? '', action);
            }
            needsSeparator = true;
        };
        // Quota Indicator
        const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota, resetDate } = this.chatEntitlementService.quotas;
        if (chatQuota || completionsQuota || premiumChatQuota) {
            addSeparator(localize('usageTitle', "Copilot Usage"), toAction({
                id: 'workbench.action.manageCopilot',
                label: localize('quotaLabel', "Manage Copilot"),
                tooltip: localize('quotaTooltip', "Manage Copilot"),
                class: ThemeIcon.asClassName(Codicon.settings),
                run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat.manageSettingsUrl))),
            }));
            const completionsQuotaIndicator = completionsQuota && (completionsQuota.total > 0 || completionsQuota.unlimited) ? this.createQuotaIndicator(this.element, disposables, completionsQuota, localize('completionsLabel', "Code completions"), false) : undefined;
            const chatQuotaIndicator = chatQuota && (chatQuota.total > 0 || chatQuota.unlimited) ? this.createQuotaIndicator(this.element, disposables, chatQuota, localize('chatsLabel', "Chat messages"), false) : undefined;
            const premiumChatQuotaIndicator = premiumChatQuota && (premiumChatQuota.total > 0 || premiumChatQuota.unlimited) ? this.createQuotaIndicator(this.element, disposables, premiumChatQuota, localize('premiumChatsLabel', "Premium requests"), true) : undefined;
            if (resetDate) {
                this.element.appendChild($('div.description', undefined, localize('limitQuota', "Allowance resets {0}.", this.dateFormatter.value.format(new Date(resetDate)))));
            }
            if (this.chatEntitlementService.entitlement === ChatEntitlement.Free && (Number(chatQuota?.percentRemaining) <= 25 || Number(completionsQuota?.percentRemaining) <= 25)) {
                const upgradeProButton = disposables.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: canUseCopilot(this.chatEntitlementService) /* use secondary color when copilot can still be used */ }));
                upgradeProButton.label = localize('upgradeToCopilotPro', "Upgrade to Copilot Pro");
                disposables.add(upgradeProButton.onDidClick(() => this.runCommandAndClose('workbench.action.chat.upgradePlan')));
            }
            (async () => {
                await this.chatEntitlementService.update(token);
                if (token.isCancellationRequested) {
                    return;
                }
                const { chat: chatQuota, completions: completionsQuota, premiumChat: premiumChatQuota } = this.chatEntitlementService.quotas;
                if (completionsQuota) {
                    completionsQuotaIndicator?.(completionsQuota);
                }
                if (chatQuota) {
                    chatQuotaIndicator?.(chatQuota);
                }
                if (premiumChatQuota) {
                    premiumChatQuotaIndicator?.(premiumChatQuota);
                }
            })();
        }
        // Contributions
        {
            for (const item of this.chatStatusItemService.getEntries()) {
                addSeparator();
                const itemDisposables = disposables.add(new MutableDisposable());
                let rendered = this.renderContributedChatStatusItem(item);
                itemDisposables.value = rendered.disposables;
                this.element.appendChild(rendered.element);
                disposables.add(this.chatStatusItemService.onDidChange(e => {
                    if (e.entry.id === item.id) {
                        const previousElement = rendered.element;
                        rendered = this.renderContributedChatStatusItem(e.entry);
                        itemDisposables.value = rendered.disposables;
                        previousElement.replaceWith(rendered.element);
                    }
                }));
            }
        }
        // Settings
        {
            const chatSentiment = this.chatEntitlementService.sentiment;
            addSeparator(localize('codeCompletions', "Code Completions"), chatSentiment.installed && !chatSentiment.disabled && !chatSentiment.untrusted ? toAction({
                id: 'workbench.action.openChatSettings',
                label: localize('settingsLabel', "Settings"),
                tooltip: localize('settingsTooltip', "Open Settings"),
                class: ThemeIcon.asClassName(Codicon.settingsGear),
                run: () => this.runCommandAndClose(() => this.commandService.executeCommand('workbench.action.openSettings', { query: `@id:${defaultChat.completionsEnablementSetting} @id:${defaultChat.nextEditSuggestionsSetting}` })),
            }) : undefined);
            this.createSettings(this.element, disposables);
        }
        // Completions Snooze
        if (canUseCopilot(this.chatEntitlementService)) {
            const snooze = append(this.element, $('div.snooze-completions'));
            this.createCompletionsSnooze(snooze, localize('settings.snooze', "Snooze"), disposables);
        }
        // New to Copilot / Signed out
        {
            const newUser = isNewUser(this.chatEntitlementService);
            const disabled = this.chatEntitlementService.sentiment.disabled || this.chatEntitlementService.sentiment.untrusted;
            const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (newUser || signedOut || disabled) {
                addSeparator();
                let descriptionText;
                if (newUser) {
                    descriptionText = localize('activateDescription', "Set up Copilot to use AI features.");
                }
                else if (disabled) {
                    descriptionText = localize('enableDescription', "Enable Copilot to use AI features.");
                }
                else {
                    descriptionText = localize('signInDescription', "Sign in to use Copilot AI features.");
                }
                let buttonLabel;
                if (newUser) {
                    buttonLabel = localize('activateCopilotButton', "Set up Copilot");
                }
                else if (disabled) {
                    buttonLabel = localize('enableCopilotButton', "Enable Copilot");
                }
                else {
                    buttonLabel = localize('signInToUseCopilotButton', "Sign in to use Copilot");
                }
                this.element.appendChild($('div.description', undefined, descriptionText));
                const button = disposables.add(new Button(this.element, { ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate }));
                button.label = buttonLabel;
                disposables.add(button.onDidClick(() => this.runCommandAndClose('workbench.action.chat.triggerSetup')));
            }
        }
        return this.element;
    }
    renderHeader(container, disposables, label, action) {
        const header = container.appendChild($('div.header', undefined, label ?? ''));
        if (action) {
            const toolbar = disposables.add(new ActionBar(header, { hoverDelegate: nativeHoverDelegate }));
            toolbar.push([action], { icon: true, label: false });
        }
    }
    renderContributedChatStatusItem(item) {
        const disposables = new DisposableStore();
        const itemElement = $('div.contribution');
        const headerLabel = typeof item.label === 'string' ? item.label : item.label.label;
        const headerLink = typeof item.label === 'string' ? undefined : item.label.link;
        this.renderHeader(itemElement, disposables, headerLabel, headerLink ? toAction({
            id: 'workbench.action.openChatStatusItemLink',
            label: localize('learnMore', "Learn More"),
            tooltip: localize('learnMore', "Learn More"),
            class: ThemeIcon.asClassName(Codicon.linkExternal),
            run: () => this.runCommandAndClose(() => this.openerService.open(URI.parse(headerLink))),
        }) : undefined);
        const itemBody = itemElement.appendChild($('div.body'));
        const description = itemBody.appendChild($('span.description'));
        this.renderTextPlus(description, item.description, disposables);
        if (item.detail) {
            const detail = itemBody.appendChild($('div.detail-item'));
            this.renderTextPlus(detail, item.detail, disposables);
        }
        return { element: itemElement, disposables };
    }
    renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                target.append(...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this.hoverService, this.openerService));
            }
        }
    }
    runCommandAndClose(commandOrFn) {
        if (typeof commandOrFn === 'function') {
            commandOrFn();
        }
        else {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandOrFn, from: 'chat-status' });
            this.commandService.executeCommand(commandOrFn);
        }
        this.hoverService.hideHover(true);
    }
    createQuotaIndicator(container, disposables, quota, label, supportsOverage) {
        const quotaValue = $('span.quota-value');
        const quotaBit = $('div.quota-bit');
        const overageLabel = $('span.overage-label');
        const quotaIndicator = container.appendChild($('div.quota-indicator', undefined, $('div.quota-label', undefined, $('span', undefined, label), quotaValue), $('div.quota-bar', undefined, quotaBit), $('div.description', undefined, overageLabel)));
        if (supportsOverage && (this.chatEntitlementService.entitlement === ChatEntitlement.Pro || this.chatEntitlementService.entitlement === ChatEntitlement.ProPlus)) {
            const manageOverageButton = disposables.add(new Button(quotaIndicator, { ...defaultButtonStyles, secondary: true, hoverDelegate: nativeHoverDelegate }));
            manageOverageButton.label = localize('enableAdditionalUsage', "Manage paid premium requests");
            disposables.add(manageOverageButton.onDidClick(() => this.runCommandAndClose(() => this.openerService.open(URI.parse(defaultChat.manageOverageUrl)))));
        }
        const update = (quota) => {
            quotaIndicator.classList.remove('error');
            quotaIndicator.classList.remove('warning');
            let usedPercentage;
            if (quota.unlimited) {
                usedPercentage = 0;
            }
            else {
                usedPercentage = Math.max(0, 100 - quota.percentRemaining);
            }
            if (quota.unlimited) {
                quotaValue.textContent = localize('quotaUnlimited', "Included");
            }
            else if (quota.overageCount) {
                quotaValue.textContent = localize('quotaDisplayWithOverage', "+{0} requests", this.quotaOverageFormatter.value.format(quota.overageCount));
            }
            else {
                quotaValue.textContent = localize('quotaDisplay', "{0}%", this.quotaPercentageFormatter.value.format(usedPercentage));
            }
            quotaBit.style.width = `${usedPercentage}%`;
            if (usedPercentage >= 90) {
                quotaIndicator.classList.add('error');
            }
            else if (usedPercentage >= 75) {
                quotaIndicator.classList.add('warning');
            }
            if (supportsOverage) {
                if (quota.overageEnabled) {
                    overageLabel.textContent = localize('additionalUsageEnabled', "Additional paid premium requests enabled.");
                }
                else {
                    overageLabel.textContent = localize('additionalUsageDisabled', "Additional paid premium requests disabled.");
                }
            }
            else {
                overageLabel.textContent = '';
            }
        };
        update(quota);
        return update;
    }
    createSettings(container, disposables) {
        const modeId = this.editorService.activeTextEditorLanguageId;
        const settings = container.appendChild($('div.settings'));
        // --- Code completions
        {
            const globalSetting = append(settings, $('div.setting'));
            this.createCodeCompletionsSetting(globalSetting, localize('settings.codeCompletions.allFiles', "All files"), '*', disposables);
            if (modeId) {
                const languageSetting = append(settings, $('div.setting'));
                this.createCodeCompletionsSetting(languageSetting, localize('settings.codeCompletions.language', "{0}", this.languageService.getLanguageName(modeId) ?? modeId), modeId, disposables);
            }
        }
        // --- Next edit suggestions
        {
            const setting = append(settings, $('div.setting'));
            this.createNextEditSuggestionsSetting(setting, localize('settings.nextEditSuggestions', "Next edit suggestions"), this.getCompletionsSettingAccessor(modeId), disposables);
        }
        return settings;
    }
    createSetting(container, settingIdsToReEvaluate, label, accessor, disposables) {
        const checkbox = disposables.add(new Checkbox(label, Boolean(accessor.readSetting()), { ...defaultCheckboxStyles, hoverDelegate: nativeHoverDelegate }));
        container.appendChild(checkbox.domNode);
        const settingLabel = append(container, $('span.setting-label', undefined, label));
        disposables.add(Gesture.addTarget(settingLabel));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            disposables.add(addDisposableListener(settingLabel, eventType, e => {
                if (checkbox?.enabled) {
                    EventHelper.stop(e, true);
                    checkbox.checked = !checkbox.checked;
                    accessor.writeSetting(checkbox.checked);
                    checkbox.focus();
                }
            }));
        });
        disposables.add(checkbox.onChange(() => {
            accessor.writeSetting(checkbox.checked);
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (settingIdsToReEvaluate.some(id => e.affectsConfiguration(id))) {
                checkbox.checked = Boolean(accessor.readSetting());
            }
        }));
        if (!canUseCopilot(this.chatEntitlementService)) {
            container.classList.add('disabled');
            checkbox.disable();
            checkbox.checked = false;
        }
        return checkbox;
    }
    createCodeCompletionsSetting(container, label, modeId, disposables) {
        this.createSetting(container, [defaultChat.completionsEnablementSetting], label, this.getCompletionsSettingAccessor(modeId), disposables);
    }
    getCompletionsSettingAccessor(modeId = '*') {
        const settingId = defaultChat.completionsEnablementSetting;
        return {
            readSetting: () => isCompletionsEnabled(this.configurationService, modeId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: settingId,
                    settingMode: modeId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                let result = this.configurationService.getValue(settingId);
                if (!isObject(result)) {
                    result = Object.create(null);
                }
                return this.configurationService.updateValue(settingId, { ...result, [modeId]: value });
            }
        };
    }
    createNextEditSuggestionsSetting(container, label, completionsSettingAccessor, disposables) {
        const nesSettingId = defaultChat.nextEditSuggestionsSetting;
        const completionsSettingId = defaultChat.completionsEnablementSetting;
        const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const checkbox = this.createSetting(container, [nesSettingId, completionsSettingId], label, {
            readSetting: () => completionsSettingAccessor.readSetting() && this.textResourceConfigurationService.getValue(resource, nesSettingId),
            writeSetting: (value) => {
                this.telemetryService.publicLog2('chatStatus.settingChanged', {
                    settingIdentifier: nesSettingId,
                    settingEnablement: value ? 'enabled' : 'disabled'
                });
                return this.textResourceConfigurationService.updateValue(resource, nesSettingId, value);
            }
        }, disposables);
        // enablement of NES depends on completions setting
        // so we have to update our checkbox state accordingly
        if (!completionsSettingAccessor.readSetting()) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(completionsSettingId)) {
                if (completionsSettingAccessor.readSetting() && canUseCopilot(this.chatEntitlementService)) {
                    checkbox.enable();
                    container.classList.remove('disabled');
                }
                else {
                    checkbox.disable();
                    container.classList.add('disabled');
                }
            }
        }));
    }
    createCompletionsSnooze(container, label, disposables) {
        const isEnabled = () => {
            const completionsEnabled = isCompletionsEnabled(this.configurationService);
            const completionsEnabledActiveLanguage = isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId);
            return completionsEnabled || completionsEnabledActiveLanguage;
        };
        const button = disposables.add(new Button(container, { disabled: !isEnabled(), ...defaultButtonStyles, hoverDelegate: nativeHoverDelegate, secondary: true }));
        const timerDisplay = container.appendChild($('span.snooze-label'));
        const actionBar = container.appendChild($('div.snooze-action-bar'));
        const toolbar = disposables.add(new ActionBar(actionBar, { hoverDelegate: nativeHoverDelegate }));
        const cancelAction = toAction({
            id: 'workbench.action.cancelSnoozeStatusBarLink',
            label: localize('cancelSnooze', "Cancel Snooze"),
            run: () => this.inlineCompletionsService.cancelSnooze(),
            class: ThemeIcon.asClassName(Codicon.stopCircle)
        });
        const update = (isEnabled) => {
            container.classList.toggle('disabled', !isEnabled);
            toolbar.clear();
            const timeLeftMs = this.inlineCompletionsService.snoozeTimeLeft;
            if (!isEnabled || timeLeftMs <= 0) {
                timerDisplay.textContent = localize('completions.snooze5minutesTitle', "Hide completions for 5 min");
                timerDisplay.title = '';
                button.label = label;
                button.setTitle(localize('completions.snooze5minutes', "Hide completions and NES for 5 min"));
                return true;
            }
            const timeLeftSeconds = Math.ceil(timeLeftMs / 1000);
            const minutes = Math.floor(timeLeftSeconds / 60);
            const seconds = timeLeftSeconds % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} ${localize('completions.remainingTime', "remaining")}`;
            timerDisplay.title = localize('completions.snoozeTimeDescription', "Completions are hidden for the remaining duration");
            button.label = localize('completions.plus5min', "+5 min");
            button.setTitle(localize('completions.snoozeAdditional5minutes', "Snooze additional 5 min"));
            toolbar.push([cancelAction], { icon: true, label: false });
            return false;
        };
        // Update every second if there's time remaining
        const timerDisposables = disposables.add(new DisposableStore());
        function updateIntervalTimer() {
            timerDisposables.clear();
            const enabled = isEnabled();
            if (update(enabled)) {
                return;
            }
            timerDisposables.add(disposableWindowInterval(getWindow(container), () => update(enabled), 1_000));
        }
        updateIntervalTimer();
        disposables.add(button.onDidClick(() => {
            this.inlineCompletionsService.snooze();
            update(isEnabled());
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                button.enabled = isEnabled();
            }
            updateIntervalTimer();
        }));
        disposables.add(this.inlineCompletionsService.onDidChangeIsSnoozing(e => {
            updateIntervalTimer();
        }));
    }
};
ChatStatusDashboard = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IChatStatusItemService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IEditorService),
    __param(5, IHoverService),
    __param(6, ILanguageService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService),
    __param(9, ITextResourceConfigurationService),
    __param(10, IInlineCompletionsService)
], ChatStatusDashboard);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx3QkFBd0IsQ0FBQztBQUNoQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBNEMsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQTBDLE1BQU0sa0RBQWtELENBQUM7QUFDM0wsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0osT0FBTyxFQUFFLGVBQWUsRUFBMEIsdUJBQXVCLEVBQWtCLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWxKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFN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