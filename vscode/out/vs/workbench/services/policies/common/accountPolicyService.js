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
import { equals } from '../../../../base/common/objects.js';
import { PolicyTag } from '../../../../base/common/policy.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService } from '../../../../platform/policy/common/policy.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
let AccountPolicyService = class AccountPolicyService extends AbstractPolicyService {
    constructor(logService, defaultAccountService) {
        super();
        this.logService = logService;
        this.defaultAccountService = defaultAccountService;
        this.accountPolicy = {
            chatPreviewFeaturesEnabled: true,
            mcpEnabled: true
        };
        this.defaultAccountService.getDefaultAccount()
            .then(account => {
            this._update({
                chatPreviewFeaturesEnabled: account?.chat_preview_features_enabled ?? true,
                mcpEnabled: account?.mcp ?? true
            });
            this._register(this.defaultAccountService.onDidChangeDefaultAccount(account => this._update({
                chatPreviewFeaturesEnabled: account?.chat_preview_features_enabled ?? true,
                mcpEnabled: account?.mcp ?? true
            })));
        });
    }
    _update(updatedPolicy) {
        if (!equals(this.accountPolicy, updatedPolicy)) {
            this.accountPolicy = updatedPolicy;
            this._updatePolicyDefinitions(this.policyDefinitions);
        }
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        this.logService.trace(`AccountPolicyService#_updatePolicyDefinitions: Got ${Object.keys(policyDefinitions).length} policy definitions`);
        const updated = [];
        const updateIfNeeded = (key, policy, isFeatureEnabled) => {
            if (isFeatureEnabled) {
                // Clear the policy if it is set
                if (this.policies.has(key)) {
                    this.policies.delete(key);
                    updated.push(key);
                }
            }
            else {
                // Enforce the defaultValue if not already set
                const updatedValue = policy.defaultValue === undefined ? false : policy.defaultValue;
                if (this.policies.get(key) !== updatedValue) {
                    this.policies.set(key, updatedValue);
                    updated.push(key);
                }
            }
        };
        const hasAllTags = (policy, tags) => {
            return policy.tags && tags.every(tag => policy.tags.includes(tag));
        };
        for (const key in policyDefinitions) {
            const policy = policyDefinitions[key];
            // Map chat preview features with ACCOUNT + PREVIEW tags
            if (hasAllTags(policy, [PolicyTag.Account, PolicyTag.Preview])) {
                updateIfNeeded(key, policy, this.accountPolicy?.chatPreviewFeaturesEnabled);
            }
            // Map MCP feature with MCP tag
            else if (hasAllTags(policy, [PolicyTag.Account, PolicyTag.MCP])) {
                updateIfNeeded(key, policy, this.accountPolicy?.mcpEnabled);
            }
        }
        if (updated.length) {
            this._onDidChange.fire(updated);
        }
    }
};
AccountPolicyService = __decorate([
    __param(0, ILogService),
    __param(1, IDefaultAccountService)
], AccountPolicyService);
export { AccountPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wb2xpY2llcy9jb21tb24vYWNjb3VudFBvbGljeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQyxNQUFNLDhDQUE4QyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBTzFFLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEscUJBQXFCO0lBSzlELFlBQ2MsVUFBd0MsRUFDN0IscUJBQThEO1FBRXRGLEtBQUssRUFBRSxDQUFDO1FBSHNCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDWiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBTi9FLGtCQUFhLEdBQW1CO1lBQ3ZDLDBCQUEwQixFQUFFLElBQUk7WUFDaEMsVUFBVSxFQUFFLElBQUk7U0FDaEIsQ0FBQztRQU9ELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTthQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDZixJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUNaLDBCQUEwQixFQUFFLE9BQU8sRUFBRSw2QkFBNkIsSUFBSSxJQUFJO2dCQUMxRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxJQUFJO2FBQ2hDLENBQUMsQ0FBQztZQUNILElB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