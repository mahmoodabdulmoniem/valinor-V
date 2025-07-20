/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { PromptsType } from '../promptTypes.js';
import { getPromptFileDefaultLocation } from './promptFileLocations.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link PromptsConfig.KEY}, {@link PromptsConfig.PROMPT_LOCATIONS_KEY}, {@link PromptsConfig.INSTRUCTIONS_LOCATION_KEY} or {@link PromptsConfig.MODE_LOCATION_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export var PromptsConfig;
(function (PromptsConfig) {
    /**
     * Configuration key for the `reusable prompts` feature
     * (also known as `prompt files`, `prompt instructions`, etc.).
     */
    PromptsConfig.KEY = 'chat.promptFiles';
    /**
     * Configuration key for the locations of reusable prompt files.
     */
    PromptsConfig.PROMPT_LOCATIONS_KEY = 'chat.promptFilesLocations';
    /**
     * Configuration key for the locations of instructions files.
     */
    PromptsConfig.INSTRUCTIONS_LOCATION_KEY = 'chat.instructionsFilesLocations';
    /**
     * Configuration key for the locations of mode files.
     */
    PromptsConfig.MODE_LOCATION_KEY = 'chat.modeFilesLocations';
    /**
     * Configuration key for use of the copilot instructions file.
     */
    PromptsConfig.USE_COPILOT_INSTRUCTION_FILES = 'github.copilot.chat.codeGeneration.useInstructionFiles';
    /**
     * Configuration key for the copilot instruction setting.
     */
    PromptsConfig.COPILOT_INSTRUCTIONS = 'github.copilot.chat.codeGeneration.instructions';
    /**
     * Checks if the feature is enabled.
     * @see {@link PromptsConfig.KEY}.
     */
    function enabled(configService) {
        const enabledValue = configService.getValue(PromptsConfig.KEY);
        return asBoolean(enabledValue) ?? false;
    }
    PromptsConfig.enabled = enabled;
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    PromptsConfig.enabledCtx = ContextKeyExpr.equals(`config.${PromptsConfig.KEY}`, true);
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link PROMPT_LOCATIONS_CONFIG_KEY}, {@link INSTRUCTIONS_LOCATIONS_CONFIG_KEY}, {@link MODE_LOCATIONS_CONFIG_KEY}.
     */
    function getLocationsValue(configService, type) {
        const key = getPromptFileLocationsConfigKey(type);
        const configValue = configService.getValue(key);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if ((booleanValue !== undefined) && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    }
    PromptsConfig.getLocationsValue = getLocationsValue;
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link PROMPT_DEFAULT_SOURCE_FOLDER}, {@link INSTRUCTIONS_DEFAULT_SOURCE_FOLDER} or {@link MODE_DEFAULT_SOURCE_FOLDER}.
     */
    function promptSourceFolders(configService, type) {
        const value = getLocationsValue(configService, type);
        const defaultSourceFolder = getPromptFileDefaultLocation(type);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && (typeof value === 'object')) {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[defaultSourceFolder] !== false) {
                paths.push(defaultSourceFolder);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabledValue] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if ((enabledValue === false) || (path === defaultSourceFolder)) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    }
    PromptsConfig.promptSourceFolders = promptSourceFolders;
})(PromptsConfig || (PromptsConfig = {}));
export function getPromptFileLocationsConfigKey(type) {
    switch (type) {
        case PromptsType.instructions:
            return PromptsConfig.INSTRUCTIONS_LOCATION_KEY;
        case PromptsType.prompt:
            return PromptsConfig.PROMPT_LOCATIONS_KEY;
        case PromptsType.mode:
            return PromptsConfig.MODE_LOCATION_KEY;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
export function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29uZmlnL2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBb0UsNEJBQTRCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUxSTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILE1BQU0sS0FBVyxhQUFhLENBa0g3QjtBQWxIRCxXQUFpQixhQUFhO0lBQzdCOzs7T0FHRztJQUNVLGlCQUFHLEdBQUcsa0JBQWtCLENBQUM7SUFFdEM7O09BRUc7SUFDVSxrQ0FBb0IsR0FBRywyQkFBMkIsQ0FBQztJQUVoRTs7T0FFRztJQUNVLHVDQUF5QixHQUFHLGlDQUFpQyxDQUFDO0lBQzNFOztPQUVHO0lBQ1UsK0JBQWlCLEdBQUcseUJBQXlCLENBQUM7SUFFM0Q7O09BRUc7SUFDVSwyQ0FBNkIsR0FBRyx3REFBd0QsQ0FBQztJQUV0Rzs7T0FFRztJQUNVLGtDQUFvQixHQUFHLGlEQUFpRCxDQUFDO0lBRXRGOzs7T0FHRztJQUNILFNBQWdCLE9BQU8sQ0FBQyxhQUFvQztRQUMzRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUUvRCxPQUFPLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUM7SUFDekMsQ0FBQztJQUplLHFCQUFPLFVBSXRCLENBQUE7SUFFRDs7T0FFRztJQUNVLHdCQUFVLEdBQUcsY0FBYyxDQUFDLE1B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