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
var ChatEntitlementRequests_1, ChatEntitlementContext_1;
import product from '../../../../platform/product/common/product.js';
import { Barrier } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IAuthenticationExtensionsService, IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { ChatContextKeys } from './chatContextKeys.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import Severity from '../../../../base/common/severity.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
export const IChatEntitlementService = createDecorator('chatEntitlementService');
export var ChatEntitlement;
(function (ChatEntitlement) {
    /** Signed out */
    ChatEntitlement[ChatEntitlement["Unknown"] = 1] = "Unknown";
    /** Signed in but not yet resolved */
    ChatEntitlement[ChatEntitlement["Unresolved"] = 2] = "Unresolved";
    /** Signed in and entitled to Free */
    ChatEntitlement[ChatEntitlement["Available"] = 3] = "Available";
    /** Signed in but not entitled to Free */
    ChatEntitlement[ChatEntitlement["Unavailable"] = 4] = "Unavailable";
    /** Signed-up to Free */
    ChatEntitlement[ChatEntitlement["Free"] = 5] = "Free";
    /** Signed-up to Pro */
    ChatEntitlement[ChatEntitlement["Pro"] = 6] = "Pro";
    /** Signed-up to Pro Plus */
    ChatEntitlement[ChatEntitlement["ProPlus"] = 7] = "ProPlus";
    /** Signed-up to Business */
    ChatEntitlement[ChatEntitlement["Business"] = 8] = "Business";
    /** Signed-up to Enterprise */
    ChatEntitlement[ChatEntitlement["Enterprise"] = 9] = "Enterprise";
})(ChatEntitlement || (ChatEntitlement = {}));
//#region Helper Functions
/**
 * Checks the chat entitlements to see if the user falls into the paid category
 * @param chatEntitlement The chat entitlement to check
 * @returns Whether or not they are a paid user
 */
export function isProUser(chatEntitlement) {
    return chatEntitlement === ChatEntitlement.Pro ||
        chatEntitlement === ChatEntitlement.ProPlus ||
        chatEntitlement === ChatEntitlement.Business ||
        chatEntitlement === ChatEntitlement.Enterprise;
}
//#region Service Implementation
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { id: '' }, enterprise: { id: '' } },
    providerScopes: product.defaultChatAgent?.providerScopes ?? [[]],
    entitlementUrl: product.defaultChatAgent?.entitlementUrl ?? '',
    entitlementSignupLimitedUrl: product.defaultChatAgent?.entitlementSignupLimitedUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    chatQuotaExceededContext: product.defaultChatAgent?.chatQuotaExceededContext ?? '',
    completionsQuotaExceededContext: product.defaultChatAgent?.completionsQuotaExceededContext ?? ''
};
let ChatEntitlementService = class ChatEntitlementService extends Disposable {
    constructor(instantiationService, productService, environmentService, contextKeyService, configurationService) {
        super();
        this.contextKeyService = contextKeyService;
        //#endregion
        //#region --- Quotas
        this._onDidChangeQuotaExceeded = this._register(new Emitter());
        this.onDidChangeQuotaExceeded = this._onDidChangeQuotaExceeded.event;
        this._onDidChangeQuotaRemaining = this._register(new Emitter());
        this.onDidChangeQuotaRemaining = this._onDidChangeQuotaRemaining.event;
        this._quotas = {};
        this.ExtensionQuotaContextKeys = {
            chatQuotaExceeded: defaultChat.chatQuotaExceededContext,
            completionsQuotaExceeded: defaultChat.completionsQuotaExceededContext,
        };
        this.chatQuotaExceededContextKey = ChatContextKeys.chatQuotaExceeded.bindTo(this.contextKeyService);
        this.completionsQuotaExceededContextKey = ChatContextKeys.completionsQuotaExceeded.bindTo(this.contextKeyService);
        this.onDidChangeEntitlement = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatContextKeys.Entitlement.pro.key,
            ChatContextKeys.Entitlement.business.key,
            ChatContextKeys.Entitlement.enterprise.key,
            ChatContextKeys.Entitlement.proPlus.key,
            ChatContextKeys.Entitlement.free.key,
            ChatContextKeys.Entitlement.canSignUp.key,
            ChatContextKeys.Entitlement.signedOut.key
        ])), this._store), () => { }, this._store);
        this.onDidChangeSentiment = Event.map(Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(new Set([
            ChatContextKeys.Setup.hidden.key,
            ChatContextKeys.Setup.disabled.key,
            ChatContextKeys.Setup.untrusted.key,
            ChatContextKeys.Setup.installed.key,
            ChatContextKeys.Setup.later.key
        ])), this._store), () => { }, this._store);
        if (!productService.defaultChatAgent || // needs product config
            (
            // TODO@bpasero remove this condition and 'serverlessWebEnabled' once Chat web support lands
            isWeb &&
                !environmentService.remoteAuthority &&
                !configurationService.getValue('chat.experimental.serverlessWebEnabled'))) {
            ChatContextKeys.Setup.hidden.bindTo(this.contextKeyService).set(true); // hide copilot UI
            return;
        }
        const context = this.context = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementContext)));
        this.requests = new Lazy(() => this._register(instantiationService.createInstance(ChatEntitlementRequests, context.value, {
            clearQuotas: () => this.clearQuotas(),
            acceptQuotas: quotas => this.acceptQuotas(quotas)
        })));
        this.registerListeners();
    }
    get entitlement() {
        if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.pro.key) === true) {
            return ChatEntitlement.Pro;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.business.key) === true) {
            return ChatEntitlement.Business;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.enterprise.key) === true) {
            return ChatEntitlement.Enterprise;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.proPlus.key) === true) {
            return ChatEntitlement.ProPlus;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.free.key) === true) {
            return ChatEntitlement.Free;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.canSignUp.key) === true) {
            return ChatEntitlement.Available;
        }
        else if (this.contextKeyService.getContextKeyValue(ChatContextKeys.Entitlement.signedOut.key) === true) {
            return ChatEntitlement.Unknown;
        }
        return ChatEntitlement.Unresolved;
    }
    get quotas() { return this._quotas; }
    registerListeners() {
        const quotaExceededSet = new Set([this.ExtensionQuotaContextKeys.chatQuotaExceeded, this.ExtensionQuotaContextKeys.completionsQuotaExceeded]);
        const cts = this._register(new MutableDisposable());
        this._register(this.contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(quotaExceededSet)) {
                if (cts.value) {
                    cts.value.cancel();
                }
                cts.value = new CancellationTokenSource();
                this.update(cts.value.token);
            }
        }));
    }
    acceptQuotas(quotas) {
        const oldQuota = this._quotas;
        this._quotas = quotas;
        this.updateContextKeys();
        const { changed: chatChanged } = this.compareQuotas(oldQuota.chat, quotas.chat);
        const { changed: completionsChanged } = this.compareQuotas(oldQuota.completions, quotas.completions);
        const { changed: premiumChatChanged } = this.compareQuotas(oldQuota.premiumChat, quotas.premiumChat);
        if (chatChanged.exceeded || completionsChanged.exceeded || premiumChatChanged.exceeded) {
            this._onDidChangeQuotaExceeded.fire();
        }
        if (chatChanged.remaining || completionsChanged.remaining || premiumChatChanged.remaining) {
            this._onDidChangeQuotaRemaining.fire();
        }
    }
    compareQuotas(oldQuota, newQuota) {
        return {
            changed: {
                exceeded: (oldQuota?.percentRemaining === 0) !== (newQuota?.percentRemaining === 0),
                remaining: oldQuota?.percentRemaining !== newQuota?.percentRemaining
            }
        };
    }
    clearQuotas() {
        this.acceptQuotas({});
    }
    updateContextKeys() {
        this.chatQuotaExceededContextKey.set(this._quotas.chat?.percentRemaining === 0);
        this.completionsQuotaExceededContextKey.set(this._quotas.completions?.percentRemaining === 0);
    }
    get sentiment() {
        return {
            installed: this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.installed.key) === true,
            hidden: this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.hidden.key) === true,
            disabled: this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.disabled.key) === true,
            untrusted: this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.untrusted.key) === true,
            later: this.contextKeyService.getContextKeyValue(ChatContextKeys.Setup.later.key) === true
        };
    }
    //#endregion
    async update(token) {
        await this.requests?.value.forceResolveEntitlement(undefined, token);
    }
};
ChatEntitlementService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService)
], ChatEntitlementService);
export { ChatEntitlementService };
let ChatEntitlementRequests = ChatEntitlementRequests_1 = class ChatEntitlementRequests extends Disposable {
    static providerId(configurationService) {
        if (configurationService.getValue(`${defaultChat.completionsAdvancedSetting}.authProvider`) === defaultChat.provider.enterprise.id) {
            return defaultChat.provider.enterprise.id;
        }
        return defaultChat.provider.default.id;
    }
    constructor(context, chatQuotasAccessor, telemetryService, authenticationService, logService, requestService, dialogService, openerService, configurationService, authenticationExtensionsService, lifecycleService) {
        super();
        this.context = context;
        this.chatQuotasAccessor = chatQuotasAccessor;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.logService = logService;
        this.requestService = requestService;
        this.dialogService = dialogService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.lifecycleService = lifecycleService;
        this.pendingResolveCts = new CancellationTokenSource();
        this.didResolveEntitlements = false;
        this.state = { entitlement: this.context.state.entitlement };
        this.registerListeners();
        this.resolve();
    }
    registerListeners() {
        this._register(this.authenticationService.onDidChangeDeclaredProviders(() => this.resolve()));
        this._register(this.authenticationService.onDidChangeSessions(e => {
            if (e.providerId === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidRegisterAuthenticationProvider(e => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider(e => {
            if (e.id === ChatEntitlementRequests_1.providerId(this.configurationService)) {
                this.resolve();
            }
        }));
        this._register(this.context.onDidChange(() => {
            if (!this.context.state.installed || this.context.state.disabled || this.context.state.entitlement === ChatEntitlement.Unknown) {
                // When the extension is not installed, disabled or the user is not entitled
                // make sure to clear quotas so that any indicators are also gone
                this.state = { entitlement: this.state.entitlement, quotas: undefined };
                this.chatQuotasAccessor.clearQuotas();
            }
        }));
    }
    async resolve() {
        this.pendingResolveCts.dispose(true);
        const cts = this.pendingResolveCts = new CancellationTokenSource();
        const session = await this.findMatchingProviderSession(cts.token);
        if (cts.token.isCancellationRequested) {
            return;
        }
        // Immediately signal whether we have a session or not
        let state = undefined;
        if (session) {
            // Do not overwrite any state we have already
            if (this.state.entitlement === ChatEntitlement.Unknown) {
                state = { entitlement: ChatEntitlement.Unresolved };
            }
        }
        else {
            this.didResolveEntitlements = false; // reset so that we resolve entitlements fresh when signed in again
            state = { entitlement: ChatEntitlement.Unknown };
        }
        if (state) {
            this.update(state);
        }
        if (session && !this.didResolveEntitlements) {
            // Afterwards resolve entitlement with a network request
            // but only unless it was not already resolved before.
            await this.resolveEntitlement(session, cts.token);
        }
    }
    async findMatchingProviderSession(token) {
        const sessions = await this.doGetSessions(ChatEntitlementRequests_1.providerId(this.configurationService));
        if (token.isCancellationRequested) {
            return undefined;
        }
        for (const session of sessions) {
            for (const scopes of defaultChat.providerScopes) {
                if (this.scopesMatch(session.scopes, scopes)) {
                    return session;
                }
            }
        }
        return undefined;
    }
    async doGetSessions(providerId) {
        const preferredAccountName = this.authenticationExtensionsService.getAccountPreference(defaultChat.chatExtensionId, providerId) ?? this.authenticationExtensionsService.getAccountPreference(defaultChat.extensionId, providerId);
        let preferredAccount;
        for (const account of await this.authenticationService.getAccounts(providerId)) {
            if (account.label === preferredAccountName) {
                preferredAccount = account;
                break;
            }
        }
        try {
            return await this.authenticationService.getSessions(providerId, undefined, { account: preferredAccount });
        }
        catch (error) {
            // ignore - errors can throw if a provider is not registered
        }
        return [];
    }
    scopesMatch(scopes, expectedScopes) {
        return scopes.length === expectedScopes.length && expectedScopes.every(scope => scopes.includes(scope));
    }
    async resolveEntitlement(session, token) {
        const entitlements = await this.doResolveEntitlement(session, token);
        if (typeof entitlements?.entitlement === 'number' && !token.isCancellationRequested) {
            this.didResolveEntitlements = true;
            this.update(entitlements);
        }
        return entitlements;
    }
    async doResolveEntitlement(session, token) {
        if (ChatEntitlementRequests_1.providerId(this.configurationService) === defaultChat.provider.enterprise.id) {
            this.logService.trace('[chat entitlement]: enterprise provider, assuming Enterprise plan');
            return { entitlement: ChatEntitlement.Enterprise };
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        const response = await this.request(defaultChat.entitlementUrl, 'GET', undefined, session, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!response) {
            this.logService.trace('[chat entitlement]: no response');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            this.logService.trace(`[chat entitlement]: unexpected status code ${response.res.statusCode}`);
            return (response.res.statusCode === 401 || // oauth token being unavailable (expired/revoked)
                response.res.statusCode === 404 // missing scopes/permissions, service pretends the endpoint doesn't exist
            ) ? { entitlement: ChatEntitlement.Unknown /* treat as signed out */ } : { entitlement: ChatEntitlement.Unresolved };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        if (!responseText) {
            this.logService.trace('[chat entitlement]: response has no content');
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlementsResponse;
        try {
            entitlementsResponse = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement]: parsed result is ${JSON.stringify(entitlementsResponse)}`);
        }
        catch (err) {
            this.logService.trace(`[chat entitlement]: error parsing response (${err})`);
            return { entitlement: ChatEntitlement.Unresolved };
        }
        let entitlement;
        if (entitlementsResponse.access_type_sku === 'free_limited_copilot') {
            entitlement = ChatEntitlement.Free;
        }
        else if (entitlementsResponse.can_signup_for_limited) {
            entitlement = ChatEntitlement.Available;
        }
        else if (entitlementsResponse.copilot_plan === 'individual') {
            entitlement = ChatEntitlement.Pro;
        }
        else if (entitlementsResponse.copilot_plan === 'individual_pro') {
            entitlement = ChatEntitlement.ProPlus;
        }
        else if (entitlementsResponse.copilot_plan === 'business') {
            entitlement = ChatEntitlement.Business;
        }
        else if (entitlementsResponse.copilot_plan === 'enterprise') {
            entitlement = ChatEntitlement.Enterprise;
        }
        else if (entitlementsResponse.chat_enabled) {
            // This should never happen as we exhaustively list the plans above. But if a new plan is added in the future older clients won't break
            entitlement = ChatEntitlement.Pro;
        }
        else {
            entitlement = ChatEntitlement.Unavailable;
        }
        const entitlements = {
            entitlement,
            quotas: this.toQuotas(entitlementsResponse)
        };
        this.logService.trace(`[chat entitlement]: resolved to ${entitlements.entitlement}, quotas: ${JSON.stringify(entitlements.quotas)}`);
        this.telemetryService.publicLog2('chatInstallEntitlement', {
            entitlement: entitlements.entitlement,
            tid: entitlementsResponse.analytics_tracking_id,
            quotaChat: entitlementsResponse?.quota_snapshots?.chat?.remaining,
            quotaPremiumChat: entitlementsResponse?.quota_snapshots?.premium_interactions?.remaining,
            quotaCompletions: entitlementsResponse?.quota_snapshots?.completions?.remaining,
            quotaResetDate: entitlementsResponse.quota_reset_date ?? entitlementsResponse.limited_user_reset_date
        });
        return entitlements;
    }
    toQuotas(response) {
        const quotas = {
            resetDate: response.quota_reset_date ?? response.limited_user_reset_date
        };
        // Legacy Free SKU Quota
        if (response.monthly_quotas?.chat && typeof response.limited_user_quotas?.chat === 'number') {
            quotas.chat = {
                total: response.monthly_quotas.chat,
                percentRemaining: Math.min(100, Math.max(0, (response.limited_user_quotas.chat / response.monthly_quotas.chat) * 100)),
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            };
        }
        if (response.monthly_quotas?.completions && typeof response.limited_user_quotas?.completions === 'number') {
            quotas.completions = {
                total: response.monthly_quotas.completions,
                percentRemaining: Math.min(100, Math.max(0, (response.limited_user_quotas.completions / response.monthly_quotas.completions) * 100)),
                overageEnabled: false,
                overageCount: 0,
                unlimited: false
            };
        }
        // New Quota Snapshot
        if (response.quota_snapshots) {
            for (const quotaType of ['chat', 'completions', 'premium_interactions']) {
                const rawQuotaSnapshot = response.quota_snapshots[quotaType];
                if (!rawQuotaSnapshot) {
                    continue;
                }
                const quotaSnapshot = {
                    total: rawQuotaSnapshot.entitlement,
                    percentRemaining: Math.min(100, Math.max(0, rawQuotaSnapshot.percent_remaining)),
                    overageEnabled: rawQuotaSnapshot.overage_permitted,
                    overageCount: rawQuotaSnapshot.overage_count,
                    unlimited: rawQuotaSnapshot.unlimited
                };
                switch (quotaType) {
                    case 'chat':
                        quotas.chat = quotaSnapshot;
                        break;
                    case 'completions':
                        quotas.completions = quotaSnapshot;
                        break;
                    case 'premium_interactions':
                        quotas.premiumChat = quotaSnapshot;
                        break;
                }
            }
        }
        return quotas;
    }
    async request(url, type, body, session, token) {
        try {
            return await this.requestService.request({
                type,
                url,
                data: type === 'POST' ? JSON.stringify(body) : undefined,
                disableCache: true,
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`
                }
            }, token);
        }
        catch (error) {
            if (!token.isCancellationRequested) {
                this.logService.error(`[chat entitlement] request: error ${error}`);
            }
            return undefined;
        }
    }
    update(state) {
        this.state = state;
        this.context.update({ entitlement: this.state.entitlement });
        if (state.quotas) {
            this.chatQuotasAccessor.acceptQuotas(state.quotas);
        }
    }
    async forceResolveEntitlement(session, token = CancellationToken.None) {
        if (!session) {
            session = await this.findMatchingProviderSession(token);
        }
        if (!session) {
            return undefined;
        }
        return this.resolveEntitlement(session, token);
    }
    async signUpFree(session) {
        const body = {
            restricted_telemetry: this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */ ? 'disabled' : 'enabled',
            public_code_suggestions: 'enabled'
        };
        const response = await this.request(defaultChat.entitlementSignupLimitedUrl, 'POST', body, session, CancellationToken.None);
        if (!response) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseError', "No response received."), '[chat entitlement] sign-up: no response');
            return retry ? this.signUpFree(session) : { errorCode: 1 };
        }
        if (response.res.statusCode && response.res.statusCode !== 200) {
            if (response.res.statusCode === 422) {
                try {
                    const responseText = await asText(response);
                    if (responseText) {
                        const responseError = JSON.parse(responseText);
                        if (typeof responseError.message === 'string' && responseError.message) {
                            this.onUnprocessableSignUpError(`[chat entitlement] sign-up: unprocessable entity (${responseError.message})`, responseError.message);
                            return { errorCode: response.res.statusCode };
                        }
                    }
                }
                catch (error) {
                    // ignore - handled below
                }
            }
            const retry = await this.onUnknownSignUpError(localize('signUpUnexpectedStatusError', "Unexpected status code {0}.", response.res.statusCode), `[chat entitlement] sign-up: unexpected status code ${response.res.statusCode}`);
            return retry ? this.signUpFree(session) : { errorCode: response.res.statusCode };
        }
        let responseText = null;
        try {
            responseText = await asText(response);
        }
        catch (error) {
            // ignore - handled below
        }
        if (!responseText) {
            const retry = await this.onUnknownSignUpError(localize('signUpNoResponseContentsError', "Response has no contents."), '[chat entitlement] sign-up: response has no content');
            return retry ? this.signUpFree(session) : { errorCode: 2 };
        }
        let parsedResult = undefined;
        try {
            parsedResult = JSON.parse(responseText);
            this.logService.trace(`[chat entitlement] sign-up: response is ${responseText}`);
        }
        catch (err) {
            const retry = await this.onUnknownSignUpError(localize('signUpInvalidResponseError', "Invalid response contents."), `[chat entitlement] sign-up: error parsing response (${err})`);
            return retry ? this.signUpFree(session) : { errorCode: 3 };
        }
        // We have made it this far, so the user either did sign-up or was signed-up already.
        // That is, because the endpoint throws in all other case according to Patrick.
        this.update({ entitlement: ChatEntitlement.Free });
        return Boolean(parsedResult?.subscribed);
    }
    async onUnknownSignUpError(detail, logMessage) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize('unknownSignUpError', "An error occurred while signing up for the Copilot Free plan. Would you like to try again?"),
                detail,
                primaryButton: localize('retry', "Retry")
            });
            return confirmed;
        }
        return false;
    }
    onUnprocessableSignUpError(logMessage, logDetails) {
        this.logService.error(logMessage);
        if (!this.lifecycleService.willShutdown) {
            this.dialogService.prompt({
                type: Severity.Error,
                message: localize('unprocessableSignUpError', "An error occurred while signing up for the Copilot Free plan."),
                detail: logDetails,
                buttons: [
                    {
                        label: localize('ok', "OK"),
                        run: () => { }
                    },
                    {
                        label: localize('learnMore', "Learn More"),
                        run: () => this.openerService.open(URI.parse(defaultChat.upgradePlanUrl))
                    }
                ]
            });
        }
    }
    async signIn(options) {
        const providerId = ChatEntitlementRequests_1.providerId(this.configurationService);
        const session = await this.authenticationService.createSession(providerId, defaultChat.providerScopes[0], options?.useSocialProvider ? { provider: options.useSocialProvider } : undefined);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateAccountPreference(defaultChat.chatExtensionId, providerId, session.account);
        const entitlements = await this.forceResolveEntitlement(session);
        return { session, entitlements };
    }
    dispose() {
        this.pendingResolveCts.dispose(true);
        super.dispose();
    }
};
ChatEntitlementRequests = ChatEntitlementRequests_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IDialogService),
    __param(7, IOpenerService),
    __param(8, IConfigurationService),
    __param(9, IAuthenticationExtensionsService),
    __param(10, ILifecycleService)
], ChatEntitlementRequests);
export { ChatEntitlementRequests };
let ChatEntitlementContext = class ChatEntitlementContext extends Disposable {
    static { ChatEntitlementContext_1 = this; }
    static { this.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY = 'chat.setupContext'; }
    get state() { return this.suspendedState ?? this._state; }
    constructor(contextKeyService, storageService, extensionEnablementService, logService, extensionsWorkbenchService) {
        super();
        this.storageService = storageService;
        this.extensionEnablementService = extensionEnablementService;
        this.logService = logService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.suspendedState = undefined;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.updateBarrier = undefined;
        this.canSignUpContextKey = ChatContextKeys.Entitlement.canSignUp.bindTo(contextKeyService);
        this.signedOutContextKey = ChatContextKeys.Entitlement.signedOut.bindTo(contextKeyService);
        this.freeContextKey = ChatContextKeys.Entitlement.free.bindTo(contextKeyService);
        this.proContextKey = ChatContextKeys.Entitlement.pro.bindTo(contextKeyService);
        this.proPlusContextKey = ChatContextKeys.Entitlement.proPlus.bindTo(contextKeyService);
        this.businessContextKey = ChatContextKeys.Entitlement.business.bindTo(contextKeyService);
        this.enterpriseContextKey = ChatContextKeys.Entitlement.enterprise.bindTo(contextKeyService);
        this.hiddenContext = ChatContextKeys.Setup.hidden.bindTo(contextKeyService);
        this.laterContext = ChatContextKeys.Setup.later.bindTo(contextKeyService);
        this.installedContext = ChatContextKeys.Setup.installed.bindTo(contextKeyService);
        this.disabledContext = ChatContextKeys.Setup.disabled.bindTo(contextKeyService);
        this.untrustedContext = ChatContextKeys.Setup.untrusted.bindTo(contextKeyService);
        this._state = this.storageService.getObject(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, 0 /* StorageScope.PROFILE */) ?? { entitlement: ChatEntitlement.Unknown };
        this.checkExtensionInstallation();
        this.updateContextSync();
    }
    async checkExtensionInstallation() {
        // Await extensions to be ready to be queried
        await this.extensionsWorkbenchService.queryLocal();
        // Listen to extensions change and process extensions once
        this._register(Event.runAndSubscribe(this.extensionsWorkbenchService.onChange, e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.extensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.extensionId));
            const installed = !!defaultChatExtension?.local;
            let disabled;
            let untrusted = false;
            if (installed) {
                disabled = !this.extensionEnablementService.isEnabled(defaultChatExtension.local);
                if (disabled) {
                    const state = this.extensionEnablementService.getEnablementState(defaultChatExtension.local);
                    if (state === 0 /* EnablementState.DisabledByTrustRequirement */) {
                        disabled = false; // not disabled by user choice but
                        untrusted = true; // by missing workspace trust
                    }
                }
            }
            else {
                disabled = false;
            }
            this.update({ installed, disabled, untrusted });
        }));
    }
    update(context) {
        this.logService.trace(`[chat entitlement context] update(): ${JSON.stringify(context)}`);
        if (typeof context.installed === 'boolean' && typeof context.disabled === 'boolean' && typeof context.untrusted === 'boolean') {
            this._state.installed = context.installed;
            this._state.disabled = context.disabled;
            this._state.untrusted = context.untrusted;
            if (context.installed && !context.disabled) {
                context.hidden = false; // treat this as a sign to make Chat visible again in case it is hidden
            }
        }
        if (typeof context.hidden === 'boolean') {
            this._state.hidden = context.hidden;
        }
        if (typeof context.later === 'boolean') {
            this._state.later = context.later;
        }
        if (typeof context.entitlement === 'number') {
            this._state.entitlement = context.entitlement;
            if (this._state.entitlement === ChatEntitlement.Free || isProUser(this._state.entitlement)) {
                this._state.registered = true;
            }
            else if (this._state.entitlement === ChatEntitlement.Available) {
                this._state.registered = false; // only reset when signed-in user can sign-up for free
            }
        }
        this.storageService.store(ChatEntitlementContext_1.CHAT_ENTITLEMENT_CONTEXT_STORAGE_KEY, {
            ...this._state,
            later: undefined // do not persist this across restarts for now
        }, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return this.updateContext();
    }
    async updateContext() {
        await this.updateBarrier?.wait();
        this.updateContextSync();
    }
    updateContextSync() {
        this.logService.trace(`[chat entitlement context] updateContext(): ${JSON.stringify(this._state)}`);
        this.signedOutContextKey.set(this._state.entitlement === ChatEntitlement.Unknown);
        this.canSignUpContextKey.set(this._state.entitlement === ChatEntitlement.Available);
        this.freeContextKey.set(this._state.entitlement === ChatEntitlement.Free);
        this.proContextKey.set(this._state.entitlement === ChatEntitlement.Pro);
        this.proPlusContextKey.set(this._state.entitlement === ChatEntitlement.ProPlus);
        this.businessContextKey.set(this._state.entitlement === ChatEntitlement.Business);
        this.enterpriseContextKey.set(this._state.entitlement === ChatEntitlement.Enterprise);
        this.hiddenContext.set(!!this._state.hidden);
        this.laterContext.set(!!this._state.later);
        this.installedContext.set(!!this._state.installed);
        this.disabledContext.set(!!this._state.disabled);
        this.untrustedContext.set(!!this._state.untrusted);
        this._onDidChange.fire();
    }
    suspend() {
        this.suspendedState = { ...this._state };
        this.updateBarrier = new Barrier();
    }
    resume() {
        this.suspendedState = undefined;
        this.updateBarrier?.open();
        this.updateBarrier = undefined;
    }
};
ChatEntitlementContext = ChatEntitlementContext_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService),
    __param(2, IWorkbenchExtensionEnablementService),
    __param(3, ILogService),
    __param(4, IExtensionsWorkbenchService)
], ChatEntitlementContext);
export { ChatEntitlementContext };
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVudGl0bGVtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVudGl0bGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sb0RBQW9ELENBQUM7QUFDdkcsT0FBTyxFQUF1RCxnQ0FBZ0MsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzFMLE9BQU8sRUFBbUIsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1SSxPQUFPLEVBQWMsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFHcEYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQix3QkFBd0IsQ0FBQyxDQUFDO0FBRTFHLE1BQU0sQ0FBTixJQUFZLGVBbUJYO0FBbkJELFdBQVksZUFBZTtJQUMxQixpQkFBaUI7SUFDakIsMkRBQVcsQ0FBQTtJQUNYLHFDQUFxQztJQUNyQyxpRUFBVSxDQUFBO0lBQ1YscUNBQXFDO0lBQ3JDLCtEQUFTLENBQUE7SUFDVCx5Q0FBeUM7SUFDekMsbUVBQVcsQ0FBQTtJQUNYLHdCQUF3QjtJQUN4QixxREFBSSxDQUFBO0lBQ0osdUJBQXVCO0lBQ3ZCLG1EQUFHLENBQUE7SUFDSCw0QkFBNEI7SUFDNUIsMkRBQU8sQ0FBQTtJQUNQLDRCQUE0QjtJQUM1Qiw2REFBUSxDQUFBO0lBQ1IsOEJBQThCO0lBQzlCLGlFQUFVLENBQUE7QUFDWCxDQUFDLEVBbkJXLGVBQWUsS0FBZixlQUFlLFFBbUIxQjtBQTRERCwwQkFBMEI7QUFFMUI7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQUMsZUFBZ0M7SUFDekQsT0FBTyxlQUFlLEtBQUssZUFBZSxDQUFDLEdBQUc7UUFDN0MsZUFBZSxLQUFLLGVBQWUsQ0FBQyxPQUFPO1FBQzNDLGVBQWUsS0FBSyxlQUFlLENBQUMsUUFBUTtRQUM1QyxlQUFlLEtBQUssZUFBZSxDQUFDLFVBQVUsQ0FBQztBQUNqRCxDQUFDO0FBRUQsZ0NBQWdDO0FBRWhDLE1BQU0sV0FBVyxHQUFHO0lBQ25CLFdBQVcsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxJQUFJLEVBQUU7SUFDeEQsZUFBZSxFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLElBQUksRUFBRTtJQUNoRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxFQUFFO0lBQzlELFFBQVEsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtJQUMvRixjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsSUFBSSxFQUFFO0lBQzlELDJCQUEyQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSwyQkFBMkIsSUFBSSxFQUFFO0lBQ3hGLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSwwQkFBMEIsSUFBSSxFQUFFO0lBQ3RGLHdCQUF3QixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSx3QkFBd0IsSUFBSSxFQUFFO0lBQ2xGLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSwrQkFBK0IsSUFBSSxFQUFFO0NBQ2hHLENBQUM7QUFPSyxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFPckQsWUFDd0Isb0JBQTJDLEVBQ2pELGNBQStCLEVBQ2xCLGtCQUFnRCxFQUMxRCxpQkFBc0QsRUFDbkQsb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFDO1FBSDZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFnRjNFLFlBQVk7UUFFWixvQkFBb0I7UUFFSCw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUN4RSw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDO1FBRXhELCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3pFLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFbkUsWUFBTyxHQUFZLEVBQUUsQ0FBQztRQU10Qiw4QkFBeUIsR0FBRztZQUNuQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsd0JBQXdCO1lBQ3ZELHdCQUF3QixFQUFFLFdBQVcsQ0FBQywrQkFBK0I7U0FDckUsQ0FBQztRQTlGRCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsZUFBZSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNwRyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsZUFBZSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVsSCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDdEMsS0FBSyxDQUFDLE1BQU0sQ0FDWCxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksR0FBRyxDQUFDO1lBQ3JFLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUc7WUFDbkMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRztZQUN4QyxlQUFlLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHO1lBQzFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDdkMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRztZQUNwQyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHO1lBQ3pDLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUc7U0FDekMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FDaEIsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FDekIsQ0FBQztRQUVGLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUM7WUFDckUsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNoQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHO1lBQ2xDLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUc7WUFDbkMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRztZQUNuQyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHO1NBQy9CLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQ2hCLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQ3pCLENBQUM7UUFFRixJQUNDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixJQUFJLHVCQUF1QjtZQUMzRDtZQUNDLDRGQUE0RjtZQUM1RixLQUFLO2dCQUNMLENBQUMsa0JBQWtCLENBQUMsZUFBZTtnQkFDbkMsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsd0NBQXdDLENBQUMsQ0FDeEUsRUFDQSxDQUFDO1lBQ0YsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtZQUN6RixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0gsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFO1lBQ3pILFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO1lBQ3JDLFlBQVksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1NBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBTUQsSUFBSSxXQUFXO1FBQ2QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEcsT0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDO1FBQzVCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBVSxlQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNsSCxPQUFPLGVBQWUsQ0FBQyxRQUFRLENBQUM7UUFDakMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFVLGVBQWUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3BILE9BQU8sZUFBZSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDakgsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFDO1FBQ2hDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBVSxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM5RyxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUM7UUFDN0IsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFVLGVBQWUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ25ILE9BQU8sZUFBZSxDQUFDLFNBQVMsQ0FBQztRQUNsQyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbkgsT0FBTyxlQUFlLENBQUMsT0FBTyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUM7SUFDbkMsQ0FBQztJQWFELElBQUksTUFBTSxLQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFVN0IsaUJBQWlCO1FBQ3hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUU5SSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQTJCLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1RCxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDZixHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixDQUFDO2dCQUNELEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWU7UUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEYsTUFBTSxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckcsTUFBTSxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFckcsSUFBSSxXQUFXLENBQUMsUUFBUSxJQUFJLGtCQUFrQixDQUFDLFFBQVEsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN4RixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksV0FBVyxDQUFDLFNBQVMsSUFBSSxrQkFBa0IsQ0FBQyxTQUFTLElBQUksa0JBQWtCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDM0YsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLFFBQW9DLEVBQUUsUUFBb0M7UUFDL0YsT0FBTztZQUNOLE9BQU8sRUFBRTtnQkFDUixRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLEtBQUssQ0FBQyxDQUFDO2dCQUNuRixTQUFTLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixLQUFLLFFBQVEsRUFBRSxnQkFBZ0I7YUFDcEU7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGdCQUFnQixLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFRRCxJQUFJLFNBQVM7UUFDWixPQUFPO1lBQ04sU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBVSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJO1lBQzNHLE1BQU0sRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSTtZQUNyRyxRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFVLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUk7WUFDekcsU0FBUyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBVSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJO1lBQzNHLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQVUsZUFBZSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSTtTQUNuRyxDQUFDO0lBQ0gsQ0FBQztJQUVELFlBQVk7SUFFWixLQUFLLENBQUMsTUFBTSxDQUFDLEtBQXdCO1FBQ3BDLE1BQU0sSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLENBQUM7Q0FDRCxDQUFBO0FBeExZLHNCQUFzQjtJQVFoQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FaWCxzQkFBc0IsQ0F3TGxDOztBQW9GTSxJQUFNLHVCQUF1QiwrQkFBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBRXRELE1BQU0sQ0FBQyxVQUFVLENBQUMsb0JBQTJDO1FBQzVELElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFxQixHQUFHLFdBQVcsQ0FBQywwQkFBMEIsZUFBZSxDQUFDLEtBQUssV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDeEosT0FBTyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFPRCxZQUNrQixPQUErQixFQUMvQixrQkFBdUMsRUFDckMsZ0JBQW9ELEVBQy9DLHFCQUE4RCxFQUN6RSxVQUF3QyxFQUNwQyxjQUFnRCxFQUNqRCxhQUE4QyxFQUM5QyxhQUE4QyxFQUN2QyxvQkFBNEQsRUFDakQsK0JBQWtGLEVBQ2pHLGdCQUFvRDtRQUV2RSxLQUFLLEVBQUUsQ0FBQztRQVpTLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBQy9CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDcEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUM5QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3hELGVBQVUsR0FBVixVQUFVLENBQWE7UUFDbkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2hDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM3QixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDdEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNoQyxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQ2hGLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFkaEUsc0JBQWlCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQ2xELDJCQUFzQixHQUFHLEtBQUssQ0FBQztRQWlCdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU3RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pFLElBQUksQ0FBQyxDQUFDLFVBQVUsS0FBSyx5QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztnQkFDcEYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakYsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLHlCQUF1QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUM1RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRixJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUsseUJBQXVCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7Z0JBQzVFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hJLDRFQUE0RTtnQkFDNUUsaUVBQWlFO2dCQUNqRSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPO1FBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUVuRSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDdkMsT0FBTztRQUNSLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsSUFBSSxLQUFLLEdBQThCLFNBQVMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsNkNBQTZDO1lBQzdDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN4RCxLQUFLLEdBQUcsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUMsQ0FBQyxtRUFBbUU7WUFDeEcsS0FBSyxHQUFHLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO1FBQ0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0Msd0RBQXdEO1lBQ3hELHNEQUFzRDtZQUN0RCxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQixDQUFDLEtBQXdCO1FBQ2pFLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyx5QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUN6RyxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLEtBQUssTUFBTSxNQUFNLElBQUksV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUM5QyxPQUFPLE9BQU8sQ0FBQztnQkFDaEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsVUFBa0I7UUFDN0MsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsTyxJQUFJLGdCQUEwRCxDQUFDO1FBQy9ELEtBQUssTUFBTSxPQUFPLElBQUksTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDaEYsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLG9CQUFvQixFQUFFLENBQUM7Z0JBQzVDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztnQkFDM0IsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDM0csQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsNERBQTREO1FBQzdELENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTyxXQUFXLENBQUMsTUFBNkIsRUFBRSxjQUF3QjtRQUMxRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEtBQUssY0FBYyxDQUFDLE1BQU0sSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3pHLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBOEIsRUFBRSxLQUF3QjtRQUN4RixNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckUsSUFBSSxPQUFPLFlBQVksRUFBRSxXQUFXLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDckYsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztZQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQThCLEVBQUUsS0FBd0I7UUFDMUYsSUFBSSx5QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNwRCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEcsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztZQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNwRCxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNoRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQy9GLE9BQU8sQ0FDTixRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxHQUFHLElBQUssa0RBQWtEO2dCQUN0RixRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUUsMEVBQTBFO2FBQzNHLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3RILENBQUM7UUFFRCxJQUFJLFlBQVksR0FBa0IsSUFBSSxDQUFDO1FBQ3ZDLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQix5QkFBeUI7UUFDMUIsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3BELENBQUM7UUFFRCxJQUFJLG9CQUEyQyxDQUFDO1FBQ2hELElBQUksQ0FBQztZQUNKLG9CQUFvQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsd0NBQXdDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywrQ0FBK0MsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNwRCxDQUFDO1FBRUQsSUFBSSxXQUE0QixDQUFDO1FBQ2pDLElBQUksb0JBQW9CLENBQUMsZUFBZSxLQUFLLHNCQUFzQixFQUFFLENBQUM7WUFDckUsV0FBVyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUM7UUFDcEMsQ0FBQzthQUFNLElBQUksb0JBQW9CLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUN4RCxXQUFXLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQztRQUN6QyxDQUFDO2FBQU0sSUFBSSxvQkFBb0IsQ0FBQyxZQUFZLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDL0QsV0FBVyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUM7UUFDbkMsQ0FBQzthQUFNLElBQUksb0JBQW9CLENBQUMsWUFBWSxLQUFLLGdCQUFnQixFQUFFLENBQUM7WUFDbkUsV0FBVyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUM7UUFDdkMsQ0FBQzthQUFNLElBQUksb0JBQW9CLENBQUMsWUFBWSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzdELFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDO1FBQ3hDLENBQUM7YUFBTSxJQUFJLG9CQUFvQixDQUFDLFlBQVksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUMvRCxXQUFXLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQztRQUMxQyxDQUFDO2FBQU0sSUFBSSxvQkFBb0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM5Qyx1SUFBdUk7WUFDdkksV0FBVyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUM7UUFDbkMsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQztRQUMzQyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQWtCO1lBQ25DLFdBQVc7WUFDWCxNQUFNLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztTQUMzQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsbUNBQW1DLFlBQVksQ0FBQyxXQUFXLGFBQWEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQThDLHdCQUF3QixFQUFFO1lBQ3ZHLFdBQVcsRUFBRSxZQUFZLENBQUMsV0FBVztZQUNyQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMscUJBQXFCO1lBQy9DLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLFNBQVM7WUFDakUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLG9CQUFvQixFQUFFLFNBQVM7WUFDeEYsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxTQUFTO1lBQy9FLGNBQWMsRUFBRSxvQkFBb0IsQ0FBQyxnQkFBZ0IsSUFBSSxvQkFBb0IsQ0FBQyx1QkFBdUI7U0FDckcsQ0FBQyxDQUFDO1FBRUgsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxRQUErQjtRQUMvQyxNQUFNLE1BQU0sR0FBcUI7WUFDaEMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsdUJBQXVCO1NBQ3hFLENBQUM7UUFFRix3QkFBd0I7UUFDeEIsSUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFLElBQUksSUFBSSxPQUFPLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0YsTUFBTSxDQUFDLElBQUksR0FBRztnQkFDYixLQUFLLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJO2dCQUNuQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDdEgsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLFlBQVksRUFBRSxDQUFDO2dCQUNmLFNBQVMsRUFBRSxLQUFLO2FBQ2hCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsY0FBYyxFQUFFLFdBQVcsSUFBSSxPQUFPLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0csTUFBTSxDQUFDLFdBQVcsR0FBRztnQkFDcEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVztnQkFDMUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBQ3BJLGNBQWMsRUFBRSxLQUFLO2dCQUNyQixZQUFZLEVBQUUsQ0FBQztnQkFDZixTQUFTLEVBQUUsS0FBSzthQUNoQixDQUFDO1FBQ0gsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM5QixLQUFLLE1BQU0sU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsQ0FBVSxFQUFFLENBQUM7Z0JBQ2xGLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZCLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxNQUFNLGFBQWEsR0FBbUI7b0JBQ3JDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxXQUFXO29CQUNuQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO29CQUNoRixjQUFjLEVBQUUsZ0JBQWdCLENBQUMsaUJBQWlCO29CQUNsRCxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsYUFBYTtvQkFDNUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLFNBQVM7aUJBQ3JDLENBQUM7Z0JBRUYsUUFBUSxTQUFTLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxNQUFNO3dCQUNWLE1BQU0sQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDO3dCQUM1QixNQUFNO29CQUNQLEtBQUssYUFBYTt3QkFDakIsTUFBTSxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUM7d0JBQ25DLE1BQU07b0JBQ1AsS0FBSyxzQkFBc0I7d0JBQzFCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDO3dCQUNuQyxNQUFNO2dCQUNSLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUlPLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBVyxFQUFFLElBQW9CLEVBQUUsSUFBd0IsRUFBRSxPQUE4QixFQUFFLEtBQXdCO1FBQzFJLElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztnQkFDeEMsSUFBSTtnQkFDSixHQUFHO2dCQUNILElBQUksRUFBRSxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN4RCxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsT0FBTyxFQUFFO29CQUNSLGVBQWUsRUFBRSxVQUFVLE9BQU8sQ0FBQyxXQUFXLEVBQUU7aUJBQ2hEO2FBQ0QsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNYLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMscUNBQXFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDckUsQ0FBQztZQUVELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLEtBQW9CO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBRW5CLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUU3RCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxPQUEwQyxFQUFFLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxJQUFJO1FBQ3ZHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUE4QjtRQUM5QyxNQUFNLElBQUksR0FBRztZQUNaLG9CQUFvQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLGdDQUF3QixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDM0csdUJBQXVCLEVBQUUsU0FBUztTQUNsQyxDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ3JKLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM1RCxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNoRSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNyQyxJQUFJLENBQUM7b0JBQ0osTUFBTSxZQUFZLEdBQUcsTUFBTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQzVDLElBQUksWUFBWSxFQUFFLENBQUM7d0JBQ2xCLE1BQU0sYUFBYSxHQUF3QixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO3dCQUNwRSxJQUFJLE9BQU8sYUFBYSxDQUFDLE9BQU8sS0FBSyxRQUFRLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUN4RSxJQUFJLENBQUMsMEJBQTBCLENBQUMscURBQXFELGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7NEJBQ3RJLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDL0MsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIseUJBQXlCO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLHNEQUFzRCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7WUFDaE8sT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEYsQ0FBQztRQUVELElBQUksWUFBWSxHQUFrQixJQUFJLENBQUM7UUFDdkMsSUFBSSxDQUFDO1lBQ0osWUFBWSxHQUFHLE1BQU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLHlCQUF5QjtRQUMxQixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLHFEQUFxRCxDQUFDLENBQUM7WUFDN0ssT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzVELENBQUM7UUFFRCxJQUFJLFlBQVksR0FBd0MsU0FBUyxDQUFDO1FBQ2xFLElBQUksQ0FBQztZQUNKLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDRCQUE0QixDQUFDLEVBQUUsdURBQXVELEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDbkwsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzVELENBQUM7UUFFRCxxRkFBcUY7UUFDckYsK0VBQStFO1FBQy9FLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFbkQsT0FBTyxPQUFPLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBYyxFQUFFLFVBQWtCO1FBQ3BFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWxDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDekMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7Z0JBQ3RELElBQUksRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0RkFBNEYsQ0FBQztnQkFDckksTUFBTTtnQkFDTixhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7YUFDekMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLDBCQUEwQixDQUFDLFVBQWtCLEVBQUUsVUFBa0I7UUFDeEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztnQkFDekIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNwQixPQUFPLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLCtEQUErRCxDQUFDO2dCQUM5RyxNQUFNLEVBQUUsVUFBVTtnQkFDbEIsT0FBTyxFQUFFO29CQUNSO3dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQzt3QkFDM0IsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFjLENBQUM7cUJBQ3pCO29CQUNEO3dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQzt3QkFDMUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO3FCQUN6RTtpQkFDRDthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUF3QztRQUNwRCxNQUFNLFVBQVUsR0FBRyx5QkFBdUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDakYsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTVMLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkgsSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2SCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztDQUNELENBQUE7QUF4Y1ksdUJBQXVCO0lBa0JqQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0NBQWdDLENBQUE7SUFDaEMsWUFBQSxpQkFBaUIsQ0FBQTtHQTFCUCx1QkFBdUIsQ0F3Y25DOztBQW1CTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7O2FBRTdCLHlDQUFvQyxHQUFHLG1CQUFtQixBQUF0QixDQUF1QjtJQW1CbkYsSUFBSSxLQUFLLEtBQW1DLE9BQU8sSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQU94RixZQUNxQixpQkFBcUMsRUFDeEMsY0FBZ0QsRUFDM0IsMEJBQWlGLEVBQzFHLFVBQXdDLEVBQ3hCLDBCQUF3RTtRQUVyRyxLQUFLLEVBQUUsQ0FBQztRQUwwQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDViwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBQ3pGLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDUCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBYjlGLG1CQUFjLEdBQTZDLFNBQVMsQ0FBQztRQUc1RCxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzNELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFdkMsa0JBQWEsR0FBd0IsU0FBUyxDQUFDO1FBV3RELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsbUJBQW1CLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDM0YsSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsYUFBYSxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxlQUFlLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxhQUFhLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLFlBQVksR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFbEYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBK0Isd0JBQXNCLENBQUMsb0NBQW9DLCtCQUF1QixJQUFJLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV6TSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQjtRQUV2Qyw2Q0FBNkM7UUFDN0MsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFbkQsMERBQTBEO1FBQzFELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBeUIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMxRyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDaEYsT0FBTyxDQUFDLGtCQUFrQjtZQUMzQixDQUFDO1lBRUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUMzSixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDO1lBRWhELElBQUksUUFBaUIsQ0FBQztZQUN0QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDdEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsRixJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDN0YsSUFBSSxLQUFLLHVEQUErQyxFQUFFLENBQUM7d0JBQzFELFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxrQ0FBa0M7d0JBQ3BELFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyw2QkFBNkI7b0JBQ2hELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBTUQsTUFBTSxDQUFDLE9BQTJJO1FBQ2pKLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV6RixJQUFJLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLElBQUksT0FBTyxPQUFPLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFFMUMsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM1QyxPQUFPLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLHVFQUF1RTtZQUNoRyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksT0FBTyxPQUFPLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDckMsQ0FBQztRQUVELElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksT0FBTyxPQUFPLENBQUMsV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFFOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsSUFBSSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQzVGLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUMvQixDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNsRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxzREFBc0Q7WUFDdkYsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyx3QkFBc0IsQ0FBQyxvQ0FBb0MsRUFBRTtZQUN0RixHQUFHLElBQUksQ0FBQyxNQUFNO1lBQ2QsS0FBSyxFQUFFLFNBQVMsQ0FBQyw4Q0FBOEM7U0FDL0QsOERBQThDLENBQUM7UUFFaEQsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhO1FBQzFCLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUVqQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLCtDQUErQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFcEcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEtBQUssZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN0RixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVELE1BQU07UUFDTCxJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLENBQUM7O0FBdEtXLHNCQUFzQjtJQTZCaEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsb0NBQW9DLENBQUE7SUFDcEMsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLDJCQUEyQixDQUFBO0dBakNqQixzQkFBc0IsQ0F1S2xDOztBQUVELFlBQVkifQ==