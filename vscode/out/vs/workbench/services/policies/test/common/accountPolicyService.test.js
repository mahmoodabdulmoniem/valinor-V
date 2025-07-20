/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { PolicyTag } from '../../../../../base/common/policy.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DefaultAccountService } from '../../../accounts/common/defaultAccount.js';
import { AccountPolicyService } from '../../common/accountPolicyService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { DefaultConfiguration, PolicyConfiguration } from '../../../../../platform/configuration/common/configurations.js';
const BASE_DEFAULT_ACCOUNT = {
    enterprise: false,
    sessionId: 'abc123',
};
suite('AccountPolicyService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let policyService;
    let defaultAccountService;
    let policyConfiguration;
    const logService = new NullLogService();
    const policyConfigurationNode = {
        'id': 'policyConfiguration',
        'order': 1,
        'title': 'a',
        'type': 'object',
        'properties': {
            'setting.A': {
                'type': 'string',
                'default': 'defaultValueA',
                policy: {
                    name: 'PolicySettingA',
                    minimumVersion: '1.0.0',
                }
            },
            'setting.B': {
                'type': 'string',
                'default': 'defaultValueB',
                policy: {
                    name: 'PolicySettingB',
                    minimumVersion: '1.0.0',
                    defaultValue: "policyValueB",
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.C': {
                'type': 'array',
                'default': ['defaultValueC1', 'defaultValueC2'],
                policy: {
                    name: 'PolicySettingC',
                    minimumVersion: '1.0.0',
                    defaultValue: JSON.stringify(['policyValueC1', 'policyValueC2']),
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.D': {
                'type': 'boolean',
                'default': true,
                policy: {
                    name: 'PolicySettingD',
                    minimumVersion: '1.0.0',
                    defaultValue: false,
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.E': {
                'type': 'boolean',
                'default': true,
            }
        }
    };
    suiteSetup(() => Registry.as(Extensions.Configuration).registerConfiguration(policyConfigurationNode));
    suiteTeardown(() => Registry.as(Extensions.Configuration).deregisterConfigurations([policyConfigurationNode]));
    setup(async () => {
        const defaultConfiguration = disposables.add(new DefaultConfiguration(new NullLogService()));
        await defaultConfiguration.initialize();
        defaultAccountService = disposables.add(new DefaultAccountService());
        policyService = disposables.add(new AccountPolicyService(logService, defaultAccountService));
        policyConfiguration = disposables.add(new PolicyConfiguration(defaultConfiguration, policyService, new NullLogService()));
    });
    async function assertDefaultBehavior(defaultAccount) {
        defaultAccountService.setDefaultAccount(defaultAccount);
        await policyConfiguration.initialize();
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            // No policy is set
            assert.strictEqual(A, undefined);
            assert.strictEqual(B, undefined);
            assert.strictEqual(C, undefined);
            assert.strictEqual(D, undefined);
        }
        {
            const B = policyConfiguration.configurationModel.getValue('setting.B');
            const C = policyConfiguration.configurationModel.getValue('setting.C');
            const D = policyConfiguration.configurationModel.getValue('setting.D');
            assert.strictEqual(B, undefined);
            assert.deepStrictEqual(C, undefined);
            assert.strictEqual(D, undefined);
        }
    }
    test('should initialize with default account', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT };
        await assertDefaultBehavior(defaultAccount);
    });
    test('should initialize with default account and preview features enabled', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: true };
        await assertDefaultBehavior(defaultAccount);
    });
    test('should initialize with default account and preview features disabled', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: false };
        defaultAccountService.setDefaultAccount(defaultAccount);
        await policyConfiguration.initialize();
        const actualConfigurationModel = policyConfiguration.configurationModel;
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            assert.strictEqual(A, undefined); // Not tagged with chat preview tags
            assert.strictEqual(B, 'policyValueB');
            assert.strictEqual(C, JSON.stringify(['policyValueC1', 'policyValueC2']));
            assert.strictEqual(D, false);
        }
        {
            const B = actualConfigurationModel.getValue('setting.B');
            const C = actualConfigurationModel.getValue('setting.C');
            const D = actualConfigurationModel.getValue('setting.D');
            assert.strictEqual(B, 'policyValueB');
            assert.deepStrictEqual(C, ['policyValueC1', 'policyValueC2']);
            assert.strictEqual(D, false);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BvbGljaWVzL3Rlc3QvY29tbW9uL2FjY291bnRQb2xpY3lTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUEyQyxNQUFNLDRDQUE0QyxDQUFDO0FBQzVILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUE4QyxNQUFNLHVFQUF1RSxDQUFDO0FBQy9JLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTNILE1BQU0sb0JBQW9CLEdBQW9CO0lBQzdDLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLFNBQVMsRUFBRSxRQUFRO0NBQ25CLENBQUM7QUFFRixLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBRWxDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxhQUFtQyxDQUFDO0lBQ3hDLElBQUkscUJBQTZDLENBQUM7SUFDbEQsSUFBSSxtQkFBd0MsQ0FBQztJQUM3QyxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMs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