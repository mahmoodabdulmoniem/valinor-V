/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IPreferencesSearchService = createDecorator('preferencesSearchService');
export const PREFERENCES_EDITOR_COMMAND_OPEN = 'workbench.preferences.action.openPreferencesEditor';
export const CONTEXT_PREFERENCES_SEARCH_FOCUS = new RawContextKey('inPreferencesSearch', false);
export const SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'settings.action.clearSearchResults';
export const SETTINGS_EDITOR_COMMAND_SHOW_AI_RESULTS = 'settings.action.showAIResults';
export const SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU = 'settings.action.showContextMenu';
export const SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS = 'settings.action.suggestFilters';
export const CONTEXT_SETTINGS_EDITOR = new RawContextKey('inSettingsEditor', false);
export const CONTEXT_SETTINGS_JSON_EDITOR = new RawContextKey('inSettingsJSONEditor', false);
export const CONTEXT_SETTINGS_SEARCH_FOCUS = new RawContextKey('inSettingsSearch', false);
export const CONTEXT_TOC_ROW_FOCUS = new RawContextKey('settingsTocRowFocus', false);
export const CONTEXT_SETTINGS_ROW_FOCUS = new RawContextKey('settingRowFocus', false);
export const CONTEXT_KEYBINDINGS_EDITOR = new RawContextKey('inKeybindings', false);
export const CONTEXT_KEYBINDINGS_SEARCH_FOCUS = new RawContextKey('inKeybindingsSearch', false);
export const CONTEXT_KEYBINDING_FOCUS = new RawContextKey('keybindingFocus', false);
export const CONTEXT_WHEN_FOCUS = new RawContextKey('whenFocus', false);
export const KEYBINDINGS_EDITOR_COMMAND_SEARCH = 'keybindings.editor.searchKeybindings';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'keybindings.editor.clearSearchResults';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_HISTORY = 'keybindings.editor.clearSearchHistory';
export const KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS = 'keybindings.editor.recordSearchKeys';
export const KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE = 'keybindings.editor.toggleSortByPrecedence';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE = 'keybindings.editor.defineKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_ADD = 'keybindings.editor.addKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN = 'keybindings.editor.defineWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_ACCEPT_WHEN = 'keybindings.editor.acceptWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REJECT_WHEN = 'keybindings.editor.rejectWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REMOVE = 'keybindings.editor.removeKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_RESET = 'keybindings.editor.resetKeybinding';
export const KEYBINDINGS_EDITOR_COMMAND_COPY = 'keybindings.editor.copyKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND = 'keybindings.editor.copyCommandKeybindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE = 'keybindings.editor.copyCommandTitle';
export const KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR = 'keybindings.editor.showConflicts';
export const KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS = 'keybindings.editor.focusKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS = 'keybindings.editor.showDefaultKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS = 'keybindings.editor.showUserKeybindings';
export const KEYBINDINGS_EDITOR_SHOW_EXTENSION_KEYBINDINGS = 'keybindings.editor.showExtensionKeybindings';
export const MODIFIED_SETTING_TAG = 'modified';
export const EXTENSION_SETTING_TAG = 'ext:';
export const FEATURE_SETTING_TAG = 'feature:';
export const ID_SETTING_TAG = 'id:';
export const LANGUAGE_SETTING_TAG = 'lang:';
export const GENERAL_TAG_SETTING_TAG = 'tag:';
export const POLICY_SETTING_TAG = 'hasPolicy';
export const WORKSPACE_TRUST_SETTING_TAG = 'workspaceTrust';
export const REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG = 'requireTrustedWorkspace';
export const KEYBOARD_LAYOUT_OPEN_PICKER = 'workbench.action.openKeyboardLayoutPicker';
export const ENABLE_LANGUAGE_FILTER = true;
export const ENABLE_EXTENSION_TOGGLE_SETTINGS = true;
export const EXTENSION_FETCH_TIMEOUT_MS = 1000;
export const STRING_MATCH_SEARCH_PROVIDER_NAME = 'local';
export const TF_IDF_SEARCH_PROVIDER_NAME = 'tfIdf';
export const FILTER_MODEL_SEARCH_PROVIDER_NAME = 'filterModel';
export const EMBEDDINGS_ONLY_SEARCH_PROVIDER_NAME = 'embeddingsOnly';
export const EMBEDDINGS_SEARCH_PROVIDER_NAME = 'embeddingsFull';
export const LLM_RANKED_SEARCH_PROVIDER_NAME = 'llmRanked';
export var WorkbenchSettingsEditorSettings;
(function (WorkbenchSettingsEditorSettings) {
    WorkbenchSettingsEditorSettings["ShowAISearchToggle"] = "workbench.settings.showAISearchToggle";
    WorkbenchSettingsEditorSettings["EnableNaturalLanguageSearch"] = "workbench.settings.enableNaturalLanguageSearch";
})(WorkbenchSettingsEditorSettings || (WorkbenchSettingsEditorSettings = {}));
let cachedExtensionToggleData;
export async function getExperimentalExtensionToggleData(contextKeyService, extensionGalleryService, productService) {
    if (!ENABLE_EXTENSION_TOGGLE_SETTINGS) {
        return undefined;
    }
    if (!extensionGalleryService.isEnabled()) {
        return undefined;
    }
    if (contextKeyService.getContextKeyValue('chatSetupHidden')) {
        return undefined;
    }
    if (cachedExtensionToggleData) {
        return cachedExtensionToggleData;
    }
    if (productService.extensionRecommendations && productService.commonlyUsedSettings) {
        const settingsEditorRecommendedExtensions = {};
        Object.keys(productService.extensionRecommendations).forEach(extensionId => {
            const extensionInfo = productService.extensionRecommendations[extensionId];
            if (extensionInfo.onSettingsEditorOpen) {
                settingsEditorRecommendedExtensions[extensionId] = extensionInfo;
            }
        });
        const recommendedExtensionsGalleryInfo = {};
        for (const key in settingsEditorRecommendedExtensions) {
            const extensionId = key;
            // Recommend prerelease if not on Stable.
            const isStable = productService.quality === 'stable';
            try {
                const extensions = await raceTimeout(extensionGalleryService.getExtensions([{ id: extensionId, preRelease: !isStable }], CancellationToken.None), EXTENSION_FETCH_TIMEOUT_MS);
                if (extensions?.length === 1) {
                    recommendedExtensionsGalleryInfo[key] = extensions[0];
                }
                else {
                    // same as network connection fail. we do not want a blank settings page: https://github.com/microsoft/vscode/issues/195722
                    // so instead of returning partial data we return undefined here
                    return undefined;
                }
            }
            catch (e) {
                // Network connection fail. Return nothing rather than partial data.
                return undefined;
            }
        }
        cachedExtensionToggleData = {
            settingsEditorRecommendedExtensions,
            recommendedExtensionsGalleryInfo,
            commonlyUsed: productService.commonlyUsedSettings
        };
        return cachedExtensionToggleData;
    }
    return undefined;
}
/**
 * Compares two nullable numbers such that null values always come after defined ones.
 */
export function compareTwoNullableNumbers(a, b) {
    const aOrMax = a ?? Number.MAX_SAFE_INTEGER;
    const bOrMax = b ?? Number.MAX_SAFE_INTEGER;
    if (aOrMax < bOrMax) {
        return -1;
    }
    else if (aOrMax > bOrMax) {
        return 1;
    }
    else {
        return 0;
    }
}
export const PREVIEW_INDICATOR_DESCRIPTION = localize('previewIndicatorDescription', "Preview setting: this setting controls a new feature that is still under refinement yet ready to use. Feedback is welcome.");
export const EXPERIMENTAL_INDICATOR_DESCRIPTION = localize('experimentalIndicatorDescription', "Experimental setting: this setting controls a new feature that is actively being developed and may be unstable. It is subject to change or removal.");
export const knownAcronyms = new Set();
[
    'css',
    'html',
    'scss',
    'less',
    'json',
    'js',
    'ts',
    'ie',
    'id',
    'php',
    'scm',
].forEach(str => knownAcronyms.add(str));
export const knownTermMappings = new Map();
knownTermMappings.set('power shell', 'PowerShell');
knownTermMappings.set('powershell', 'PowerShell');
knownTermMappings.set('javascript', 'JavaScript');
knownTermMappings.set('typescript', 'TypeScript');
knownTermMappings.set('github', 'GitHub');
knownTermMappings.set('jet brains', 'JetBrains');
knownTermMappings.set('jetbrains', 'JetBrains');
knownTermMappings.set('re sharper', 'ReSharper');
knownTermMappings.set('resharper', 'ReSharper');
export function wordifyKey(key) {
    key = key
        .replace(/\.([a-z0-9])/g, (_, p1) => ` \u203A ${p1.toUpperCase()}`) // Replace dot with spaced '>'
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Camel case to spacing, fooBar => foo Bar
        .replace(/([A-Z]{1,})([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals letters, AISearch => AI Search
        .replace(/^[a-z]/g, match => match.toUpperCase()) // Upper casing all first letters, foo => Foo
        .replace(/\b\w+\b/g, match => {
        return knownAcronyms.has(match.toLowerCase()) ?
            match.toUpperCase() :
            match;
    });
    for (const [k, v] of knownTermMappings) {
        key = key.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
    }
    return key;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBc0IsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBdUI3RixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDBCQUEwQixDQUFDLENBQUM7QUFzQmhILE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLG9EQUFvRCxDQUFDO0FBQ3BHLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRXpHLE1BQU0sQ0FBQyxNQUFNLDRDQUE0QyxHQUFHLG9DQUFvQyxDQUFDO0FBQ2pHLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLCtCQUErQixDQUFDO0FBQ3ZGLE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLGlDQUFpQyxDQUFDO0FBQzNGLE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLGdDQUFnQyxDQUFDO0FBRXhGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLElBQUksYUFBYSxDQUFVLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzdGLE1BQU0sQ0FBQyxNQUFNLDRC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