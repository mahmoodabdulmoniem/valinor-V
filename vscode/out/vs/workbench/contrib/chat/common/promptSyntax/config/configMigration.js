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
import { assert } from '../../../../../../base/common/assert.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { asBoolean, PromptsConfig } from './config.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Contribution that migrates the old config setting value to a new one.
 *
 * Note! This is a temporary logic and can be removed on ~2026-04-29.
 */
let ConfigMigration = class ConfigMigration {
    constructor(logService, configService) {
        this.logService = logService;
        this.configService = configService;
        // migrate the old config setting value to a new one
        this.migrateConfig()
            .catch((error) => {
            this.logService.warn('failed to migrate config setting value.', error);
        });
    }
    /**
     * The main function that implements the migration logic.
     */
    async migrateConfig() {
        const value = await this.configService.getValue(PromptsConfig.KEY);
        // if setting is not set, nothing to do
        if ((value === undefined) || (value === null)) {
            return;
        }
        // if the setting value is a boolean, we don't need to do
        // anything since it is already a valid configuration value
        if ((typeof value === 'boolean') || (asBoolean(value) !== undefined)) {
            return;
        }
        // in the old setting logic an array of strings was treated
        // as a list of locations, so we need to migrate that
        if (Array.isArray(value)) {
            // copy array values into a map of paths
            const locationsValue = {};
            for (const filePath of value) {
                if (typeof filePath !== 'string') {
                    continue;
                }
                const trimmedValue = filePath.trim();
                if (!trimmedValue) {
                    continue;
                }
                locationsValue[trimmedValue] = true;
            }
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, locationsValue);
            return;
        }
        // in the old setting logic an object was treated as a map
        // of `location -> boolean`, so we need to migrate that
        if (typeof value === 'object') {
            // sanity check on the contents of value variable - while
            // we've handled the 'null' case above this assertion is
            // here to prevent churn when this block is moved around
            assert(value !== null, 'Object value must not be a null.');
            // copy object values into a map of paths
            const locationsValue = {};
            for (const [location, enabled] of Object.entries(value)) {
                // if the old location enabled value wasn't a boolean
                // then ignore it as it is not a valid value
                if ((typeof enabled !== 'boolean') || (asBoolean(enabled) === undefined)) {
                    continue;
                }
                const trimmedValue = location.trim();
                if (!trimmedValue) {
                    continue;
                }
                locationsValue[trimmedValue] = enabled;
            }
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, locationsValue);
            return;
        }
        // in the old setting logic a string was treated as a single
        // location path, so we need to migrate that
        if (typeof value === 'string') {
            // sanity check on the contents of value variable - while
            // we've handled the 'boolean' case above this assertion is
            // here to prevent churn when this block is moved around
            assert(asBoolean(value) === undefined, `String value must not be a boolean, got '${value}'.`);
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, { [value]: true });
            return;
        }
    }
};
ConfigMigration = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], ConfigMigration);
export { ConfigMigration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29uZmlnL2NvbmZpZ01pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHOzs7O0dBSUc7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBQzNCLFlBQytCLFVBQXVCLEVBQ2IsYUFBb0M7UUFEOUMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNiLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUU1RSxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGFBQWEsRUFBRTthQUNsQixLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxhQUFhO1FBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRW5FLHVDQUF1QztRQUN2QyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxJQUFJLENBQUMs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