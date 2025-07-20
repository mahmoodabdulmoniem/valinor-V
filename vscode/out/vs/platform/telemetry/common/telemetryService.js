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
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { mixin } from '../../../base/common/objects.js';
import { isWeb } from '../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Extensions } from '../../configuration/common/configurationRegistry.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { Registry } from '../../registry/common/platform.js';
import { TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID } from './telemetry.js';
import { cleanData, getTelemetryLevel } from './telemetryUtils.js';
let TelemetryService = class TelemetryService {
    static { this.IDLE_START_EVENT_NAME = 'UserIdleStart'; }
    static { this.IDLE_STOP_EVENT_NAME = 'UserIdleStop'; }
    constructor(config, _configurationService, _productService) {
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._experimentProperties = {};
        this._disposables = new DisposableStore();
        this._cleanupPatterns = [];
        this._appenders = config.appenders;
        this._commonProperties = config.commonProperties ?? Object.create(null);
        this.sessionId = this._commonProperties['sessionID'];
        this.machineId = this._commonProperties['common.machineId'];
        this.sqmId = this._commonProperties['common.sqmId'];
        this.devDeviceId = this._commonProperties['common.devDeviceId'];
        this.firstSessionDate = this._commonProperties['common.firstSessionDate'];
        this.msftInternal = this._commonProperties['common.msftInternal'];
        this._piiPaths = config.piiPaths || [];
        this._telemetryLevel = 3 /* TelemetryLevel.USAGE */;
        this._sendErrorTelemetry = !!config.sendErrorTelemetry;
        // static cleanup pattern for: `vscode-file:///DANGEROUS/PATH/resources/app/Useful/Information`
        this._cleanupPatterns = [/(vscode-)?file:\/\/\/.*?\/resources\/app\//gi];
        for (const piiPath of this._piiPaths) {
            this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath), 'gi'));
            if (piiPath.indexOf('\\') >= 0) {
                this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath.replace(/\\/g, '/')), 'gi'));
            }
        }
        this._updateTelemetryLevel();
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            // Check on the telemetry settings and update the state if changed
            const affectsTelemetryConfig = e.affectsConfiguration(TELEMETRY_SETTING_ID)
                || e.affectsConfiguration(TELEMETRY_OLD_SETTING_ID)
                || e.affectsConfiguration(TELEMETRY_CRASH_REPORTER_SETTING_ID);
            if (affectsTelemetryConfig) {
                this._updateTelemetryLevel();
            }
        }));
    }
    setExperimentProperty(name, value) {
        this._experimentProperties[name] = value;
    }
    _updateTelemetryLevel() {
        let level = getTelemetryLevel(this._configurationService);
        const collectableTelemetry = this._productService.enabledTelemetryLevels;
        // Also ensure that error telemetry is respecting the product configuration for collectable telemetry
        if (collectableTelemetry) {
            this._sendErrorTelemetry = this.sendErrorTelemetry ? collectableTelemetry.error : false;
            // Make sure the telemetry level from the service is the minimum of the config and product
            const maxCollectableTelemetryLevel = collectableTelemetry.usage ? 3 /* TelemetryLevel.USAGE */ : collectableTelemetry.error ? 2 /* TelemetryLevel.ERROR */ : 0 /* TelemetryLevel.NONE */;
            level = Math.min(level, maxCollectableTelemetryLevel);
        }
        this._telemetryLevel = level;
    }
    get sendErrorTelemetry() {
        return this._sendErrorTelemetry;
    }
    get telemetryLevel() {
        return this._telemetryLevel;
    }
    dispose() {
        this._disposables.dispose();
    }
    _log(eventName, eventLevel, data) {
        // don't send events when the user is optout
        if (this._telemetryLevel < eventLevel) {
            return;
        }
        // add experiment properties
        data = mixin(data, this._experimentProperties);
        // remove all PII from data
        data = cleanData(data, this._cleanupPatterns);
        // add common properties
        data = mixin(data, this._commonProperties);
        // Log to the appenders of sufficient level
        this._appenders.forEach(a => a.log(eventName, data));
    }
    publicLog(eventName, data) {
        this._log(eventName, 3 /* TelemetryLevel.USAGE */, data);
    }
    publicLog2(eventName, data) {
        this.publicLog(eventName, data);
    }
    publicLogError(errorEventName, data) {
        if (!this._sendErrorTelemetry) {
            return;
        }
        // Send error event and anonymize paths
        this._log(errorEventName, 2 /* TelemetryLevel.ERROR */, data);
    }
    publicLogError2(eventName, data) {
        this.publicLogError(eventName, data);
    }
};
TelemetryService = __decorate([
    __param(1, IConfigurationService),
    __param(2, IProductService)
], TelemetryService);
export { TelemetryService };
function getTelemetryLevelSettingDescription() {
    const telemetryText = localize('telemetry.telemetryLevelMd', "Controls {0} telemetry, first-party extension telemetry, and participating third-party extension telemetry. Some third party extensions might not respect this setting. Consult the specific extension's documentation to be sure. Telemetry helps us better understand how {0} is performing, where improvements need to be made, and how features are being used.", product.nameLong);
    const externalLinksStatement = !product.privacyStatementUrl ?
        localize("telemetry.docsStatement", "Read more about the [data we collect]({0}).", 'https://aka.ms/vscode-telemetry') :
        localize("telemetry.docsAndPrivacyStatement", "Read more about the [data we collect]({0}) and our [privacy statement]({1}).", 'https://aka.ms/vscode-telemetry', product.privacyStatementUrl);
    const restartString = !isWeb ? localize('telemetry.restart', 'A full restart of the application is necessary for crash reporting changes to take effect.') : '';
    const crashReportsHeader = localize('telemetry.crashReports', "Crash Reports");
    const errorsHeader = localize('telemetry.errors', "Error Telemetry");
    const usageHeader = localize('telemetry.usage', "Usage Data");
    const telemetryTableDescription = localize('telemetry.telemetryLevel.tableDescription', "The following table outlines the data sent with each setting:");
    const telemetryTable = `
|       | ${crashReportsHeader} | ${errorsHeader} | ${usageHeader} |
|:------|:-------------:|:---------------:|:----------:|
| all   |       ✓       |        ✓        |     ✓      |
| error |       ✓       |        ✓        |     -      |
| crash |       ✓       |        -        |     -      |
| off   |       -       |        -        |     -      |
`;
    const deprecatedSettingNote = localize('telemetry.telemetryLevel.deprecated', "****Note:*** If this setting is 'off', no telemetry will be sent regardless of other telemetry settings. If this setting is set to anything except 'off' and telemetry is disabled with deprecated settings, no telemetry will be sent.*");
    const telemetryDescription = `
${telemetryText} ${externalLinksStatement} ${restartString}

&nbsp;

${telemetryTableDescription}
${telemetryTable}

&nbsp;

${deprecatedSettingNote}
`;
    return telemetryDescription;
}
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration({
    'id': TELEMETRY_SECTION_ID,
    'order': 1,
    'type': 'object',
    'title': localize('telemetryConfigurationTitle', "Telemetry"),
    'properties': {
        [TELEMETRY_SETTING_ID]: {
            'type': 'string',
            'enum': ["all" /* TelemetryConfiguration.ON */, "error" /* TelemetryConfiguration.ERROR */, "crash" /* TelemetryConfiguration.CRASH */, "off" /* TelemetryConfiguration.OFF */],
            'enumDescriptions': [
                localize('telemetry.telemetryLevel.default', "Sends usage data, errors, and crash reports."),
                localize('telemetry.telemetryLevel.error', "Sends general error telemetry and crash reports."),
                localize('telemetry.telemetryLevel.crash', "Sends OS level crash reports."),
                localize('telemetry.telemetryLevel.off', "Disables all product telemetry.")
            ],
            'markdownDescription': getTelemetryLevelSettingDescription(),
            'default': "all" /* TelemetryConfiguration.ON */,
            'restricted': true,
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'tags': ['usesOnlineServices', 'telemetry'],
            'policy': {
                name: 'TelemetryLevel',
                minimumVersion: '1.99',
                description: localize('telemetry.telemetryLevel.policyDescription', "Controls the level of telemetry."),
            }
        },
        'telemetry.feedback.enabled': {
            type: 'boolean',
            default: true,
            description: localize('telemetry.feedback.enabled', "Enable feedback mechanisms such as the issue reporter, surveys, and feedback options in features like Copilot Chat."),
            policy: {
                name: 'EnableFeedback',
                minimumVersion: '1.99',
            }
        },
        // Deprecated telemetry setting
        [TELEMETRY_OLD_SETTING_ID]: {
            'type': 'boolean',
            'markdownDescription': !product.privacyStatementUrl ?
                localize('telemetry.enableTelemetry', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made.", product.nameLong) :
                localize('telemetry.enableTelemetryMd', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made. [Read more]({1}) about what we collect and our privacy statement.", product.nameLong, product.privacyStatementUrl),
            'default': true,
            'restricted': true,
            'markdownDeprecationMessage': localize('enableTelemetryDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated in favor of the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
            'scope': 1 /* ConfigurationScope.APPLICATION */,
            'tags': ['usesOnlineServices', 'telemetry']
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQXNCLFVBQVUsRUFBMEIsTUFBTSxxREFBcUQsQ0FBQztBQUM3SCxPQUFPLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBNkUsbUNBQW1DLEVBQUUsd0JBQXdCLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQXFCLE1BQU0sZ0JBQWdCLENBQUM7QUFDek8sT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBc0IsTUFBTSxxQkFBcUIsQ0FBQztBQVNoRixJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjthQUVaLDBCQUFxQixHQUFHLGVBQWUsQUFBbEIsQ0FBbUI7YUFDeEMseUJBQW9CLEdBQUcsY0FBYyxBQUFqQixDQUFrQjtJ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