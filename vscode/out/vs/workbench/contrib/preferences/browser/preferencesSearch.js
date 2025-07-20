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
import { distinct } from '../../../../base/common/arrays.js';
import { matchesContiguousSubString, matchesSubString, matchesWords } from '../../../../base/common/filters.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { TfIdfCalculator } from '../../../../base/common/tfIdf.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IAiSettingsSearchService } from '../../../services/aiSettingsSearch/common/aiSettingsSearch.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { SettingKeyMatchTypes, SettingMatchType } from '../../../services/preferences/common/preferences.js';
import { nullRange } from '../../../services/preferences/common/preferencesModels.js';
import { EMBEDDINGS_ONLY_SEARCH_PROVIDER_NAME, EMBEDDINGS_SEARCH_PROVIDER_NAME, IPreferencesSearchService, LLM_RANKED_SEARCH_PROVIDER_NAME, STRING_MATCH_SEARCH_PROVIDER_NAME, TF_IDF_SEARCH_PROVIDER_NAME } from '../common/preferences.js';
let PreferencesSearchService = class PreferencesSearchService extends Disposable {
    constructor(instantiationService, configurationService, extensionManagementService, extensionEnablementService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        // This request goes to the shared process but results won't change during a window's lifetime, so cache the results.
        this._installedExtensions = this.extensionManagementService.getInstalled(1 /* ExtensionType.User */).then(exts => {
            // Filter to enabled extensions that have settings
            return exts
                .filter(ext => this.extensionEnablementService.isEnabled(ext))
                .filter(ext => ext.manifest && ext.manifest.contributes && ext.manifest.contributes.configuration)
                .filter(ext => !!ext.identifier.uuid);
        });
    }
    getLocalSearchProvider(filter) {
        return this.instantiationService.createInstance(LocalSearchProvider, filter);
    }
    get remoteSearchAllowed() {
        const workbenchSettings = this.configurationService.getValue().workbench.settings;
        return workbenchSettings.enableNaturalLanguageSearch;
    }
    getRemoteSearchProvider(filter) {
        if (!this.remoteSearchAllowed) {
            return undefined;
        }
        this._remoteSearchProvider ??= this.instantiationService.createInstance(RemoteSearchProvider);
        this._remoteSearchProvider.setFilter(filter);
        return this._remoteSearchProvider;
    }
    getAiSearchProvider(filter) {
        if (!this.remoteSearchAllowed) {
            return undefined;
        }
        this._aiSearchProvider ??= this.instantiationService.createInstance(AiSearchProvider);
        this._aiSearchProvider.setFilter(filter);
        return this._aiSearchProvider;
    }
};
PreferencesSearchService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService)
], PreferencesSearchService);
export { PreferencesSearchService };
function cleanFilter(filter) {
    // Remove " and : which are likely to be copypasted as part of a setting name.
    // Leave other special characters which the user might want to search for.
    return filter
        .replace(/[":]/g, ' ')
        .replace(/  /g, ' ')
        .trim();
}
let LocalSearchProvider = class LocalSearchProvider {
    constructor(_filter, configurationService) {
        this._filter = _filter;
        this.configurationService = configurationService;
        this._filter = cleanFilter(this._filter);
    }
    searchModel(preferencesModel, token) {
        if (!this._filter) {
            return Promise.resolve(null);
        }
        const settingMatcher = (setting) => {
            let { matches, matchType, keyMatchScore } = new SettingMatches(this._filter, setting, true, this.configurationService);
            if (matchType === SettingMatchType.None || matches.length === 0) {
                return null;
            }
            if (strings.equalsIgnoreCase(this._filter, setting.key)) {
                matchType = SettingMatchType.ExactMatch;
            }
            return {
                matches,
                matchType,
                keyMatchScore,
                score: 0 // only used for RemoteSearchProvider matches.
            };
        };
        const filterMatches = preferencesModel.filterSettings(this._filter, this.getGroupFilter(this._filter), settingMatcher);
        // Check the top key match type.
        const topKeyMatchType = Math.max(...filterMatches.map(m => (m.matchType & SettingKeyMatchTypes)));
        // Always allow description matches as part of https://github.com/microsoft/vscode/issues/239936.
        const alwaysAllowedMatchTypes = SettingMatchType.DescriptionOrValueMatch | SettingMatchType.LanguageTagSettingMatch;
        const filteredMatches = filterMatches
            .filter(m => (m.matchType & topKeyMatchType) || (m.matchType & alwaysAllowedMatchTypes) || m.matchType === SettingMatchType.ExactMatch)
            .map(m => ({ ...m, providerName: STRING_MATCH_SEARCH_PROVIDER_NAME }));
        return Promise.resolve({
            filterMatches: filteredMatches,
            exactMatch: filteredMatches.some(m => m.matchType === SettingMatchType.ExactMatch)
        });
    }
    getGroupFilter(filter) {
        const regex = strings.createRegExp(filter, false, { global: true });
        return (group) => {
            return group.id !== 'defaultOverrides' && regex.test(group.title);
        };
    }
};
LocalSearchProvider = __decorate([
    __param(1, IConfigurationService)
], LocalSearchProvider);
export { LocalSearchProvider };
export class SettingMatches {
    constructor(searchString, setting, searchDescription, configurationService) {
        this.searchDescription = searchDescription;
        this.configurationService = configurationService;
        this.matchType = SettingMatchType.None;
        /**
         * A match score for key matches to allow comparing key matches against each other.
         * Otherwise, all key matches are treated the same, and sorting is done by ToC order.
         */
        this.keyMatchScore = 0;
        this.matches = distinct(this._findMatchesInSetting(searchString, setting), (match) => `${match.startLineNumber}_${match.startColumn}_${match.endLineNumber}_${match.endColumn}_`);
    }
    _findMatchesInSetting(searchString, setting) {
        const result = this._doFindMatchesInSetting(searchString, setting);
        return result;
    }
    _keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    _toAlphaNumeric(s) {
        return s.replace(/[^\p{L}\p{N}]+/gu, '');
    }
    _doFindMatchesInSetting(searchString, setting) {
        const descriptionMatchingWords = new Map();
        const keyMatchingWords = new Map();
        const valueMatchingWords = new Map();
        // Key (ID) search
        // First, search by the setting's ID and label.
        const settingKeyAsWords = this._keyToLabel(setting.key);
        const queryWords = new Set(searchString.split(' '));
        for (const word of queryWords) {
            // Check if the key contains the word. Use contiguous search.
            const keyMatches = matchesWords(word, settingKeyAsWords, true);
            if (keyMatches?.length) {
                keyMatchingWords.set(word, keyMatches.map(match => this.toKeyRange(setting, match)));
            }
        }
        if (keyMatchingWords.size === queryWords.size) {
            // All words in the query matched with something in the setting key.
            // Matches "edit format on paste" to "editor.formatOnPaste".
            this.matchType |= SettingMatchType.AllWordsInSettingsLabel;
        }
        else if (keyMatchingWords.size >= 2) {
            // Matches "edit paste" to "editor.formatOnPaste".
            // The if statement reduces noise by preventing "editor formatonpast" from matching all editor settings.
            this.matchType |= SettingMatchType.ContiguousWordsInSettingsLabel;
            this.keyMatchScore = keyMatchingWords.size;
        }
        const searchStringAlphaNumeric = this._toAlphaNumeric(searchString);
        const keyAlphaNumeric = this._toAlphaNumeric(setting.key);
        const keyIdMatches = matchesContiguousSubString(searchStringAlphaNumeric, keyAlphaNumeric);
        if (keyIdMatches?.length) {
            // Matches "editorformatonp" to "editor.formatonpaste".
            keyMatchingWords.set(setting.key, keyIdMatches.map(match => this.toKeyRange(setting, match)));
            this.matchType |= SettingMatchType.ContiguousQueryInSettingId;
        }
        // Fall back to non-contiguous key (ID) searches if nothing matched yet.
        if (this.matchType === SettingMatchType.None) {
            keyMatchingWords.clear();
            for (const word of queryWords) {
                const keyMatches = matchesWords(word, settingKeyAsWords, false);
                if (keyMatches?.length) {
                    keyMatchingWords.set(word, keyMatches.map(match => this.toKeyRange(setting, match)));
                }
            }
            if (keyMatchingWords.size >= 2 || (keyMatchingWords.size === 1 && queryWords.size === 1)) {
                // Matches "edforonpas" to "editor.formatOnPaste".
                // The if statement reduces noise by preventing "editor fomonpast" from matching all editor settings.
                this.matchType |= SettingMatchType.NonContiguousWordsInSettingsLabel;
                this.keyMatchScore = keyMatchingWords.size;
            }
            else {
                const keyIdMatches = matchesSubString(searchStringAlphaNumeric, keyAlphaNumeric);
                if (keyIdMatches?.length) {
                    // Matches "edfmonpas" to "editor.formatOnPaste".
                    keyMatchingWords.set(setting.key, keyIdMatches.map(match => this.toKeyRange(setting, match)));
                    this.matchType |= SettingMatchType.NonContiguousQueryInSettingId;
                }
            }
        }
        // Check if the match was for a language tag group setting such as [markdown].
        // In such a case, move that setting to be last.
        if (setting.overrides?.length && (this.matchType !== SettingMatchType.None)) {
            this.matchType = SettingMatchType.LanguageTagSettingMatch;
            const keyRanges = keyMatchingWords.size ?
                Array.from(keyMatchingWords.values()).flat() : [];
            return [...keyRanges];
        }
        // Description search
        // Search the description if we found non-contiguous key matches at best.
        const hasContiguousKeyMatchTypes = this.matchType >= SettingMatchType.ContiguousWordsInSettingsLabel;
        if (this.searchDescription && !hasContiguousKeyMatchTypes) {
            for (const word of queryWords) {
                // Search the description lines.
                for (let lineIndex = 0; lineIndex < setting.description.length; lineIndex++) {
                    const descriptionMatches = matchesContiguousSubString(word, setting.description[lineIndex]);
                    if (descriptionMatches?.length) {
                        descriptionMatchingWords.set(word, descriptionMatches.map(match => this.toDescriptionRange(setting, match, lineIndex)));
                    }
                }
            }
            if (descriptionMatchingWords.size === queryWords.size) {
                this.matchType |= SettingMatchType.DescriptionOrValueMatch;
            }
            else {
                // Clear out the match for now. We want to require all words to match in the description.
                descriptionMatchingWords.clear();
            }
        }
        // Value search
        // Check if the value contains all the words.
        // Search the values if we found non-contiguous key matches at best.
        if (!hasContiguousKeyMatchTypes) {
            if (setting.enum?.length) {
                // Search all string values of enums.
                for (const option of setting.enum) {
                    if (typeof option !== 'string') {
                        continue;
                    }
                    valueMatchingWords.clear();
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, option);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map(match => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                        break;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
            else {
                // Search single string value.
                const settingValue = this.configurationService.getValue(setting.key);
                if (typeof settingValue === 'string') {
                    for (const word of queryWords) {
                        const valueMatches = matchesContiguousSubString(word, settingValue);
                        if (valueMatches?.length) {
                            valueMatchingWords.set(word, valueMatches.map(match => this.toValueRange(setting, match)));
                        }
                    }
                    if (valueMatchingWords.size === queryWords.size) {
                        this.matchType |= SettingMatchType.DescriptionOrValueMatch;
                    }
                    else {
                        // Clear out the match for now. We want to require all words to match in the value.
                        valueMatchingWords.clear();
                    }
                }
            }
        }
        const descriptionRanges = descriptionMatchingWords.size ?
            Array.from(descriptionMatchingWords.values()).flat() : [];
        const keyRanges = keyMatchingWords.size ?
            Array.from(keyMatchingWords.values()).flat() : [];
        const valueRanges = valueMatchingWords.size ?
            Array.from(valueMatchingWords.values()).flat() : [];
        return [...descriptionRanges, ...keyRanges, ...valueRanges];
    }
    toKeyRange(setting, match) {
        return {
            startLineNumber: setting.keyRange.startLineNumber,
            startColumn: setting.keyRange.startColumn + match.start,
            endLineNumber: setting.keyRange.startLineNumber,
            endColumn: setting.keyRange.startColumn + match.end
        };
    }
    toDescriptionRange(setting, match, lineIndex) {
        const descriptionRange = setting.descriptionRanges[lineIndex];
        if (!descriptionRange) {
            // This case occurs with added settings such as the
            // manage extension setting.
            return nullRange;
        }
        return {
            startLineNumber: descriptionRange.startLineNumber,
            startColumn: descriptionRange.startColumn + match.start,
            endLineNumber: descriptionRange.endLineNumber,
            endColumn: descriptionRange.startColumn + match.end
        };
    }
    toValueRange(setting, match) {
        return {
            startLineNumber: setting.valueRange.startLineNumber,
            startColumn: setting.valueRange.startColumn + match.start + 1,
            endLineNumber: setting.valueRange.startLineNumber,
            endColumn: setting.valueRange.startColumn + match.end + 1
        };
    }
}
class SettingsRecordProvider {
    constructor() {
        this._settingsRecord = {};
    }
    updateModel(preferencesModel) {
        if (preferencesModel === this._currentPreferencesModel) {
            return;
        }
        this._currentPreferencesModel = preferencesModel;
        this.refresh();
    }
    refresh() {
        this._settingsRecord = {};
        if (!this._currentPreferencesModel) {
            return;
        }
        for (const group of this._currentPreferencesModel.settingsGroups) {
            if (group.id === 'mostCommonlyUsed') {
                continue;
            }
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    this._settingsRecord[setting.key] = setting;
                }
            }
        }
    }
    getSettingsRecord() {
        return this._settingsRecord;
    }
}
class EmbeddingsSearchProvider {
    static { this.EMBEDDINGS_SETTINGS_SEARCH_MAX_PICKS = 10; }
    constructor(_aiSettingsSearchService, _excludeSelectionStep) {
        this._aiSettingsSearchService = _aiSettingsSearchService;
        this._excludeSelectionStep = _excludeSelectionStep;
        this._filter = '';
        this._recordProvider = new SettingsRecordProvider();
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter || !this._aiSettingsSearchService.isEnabled()) {
            return null;
        }
        this._recordProvider.updateModel(preferencesModel);
        this._aiSettingsSearchService.startSearch(this._filter, this._excludeSelectionStep, token);
        return {
            filterMatches: await this.getEmbeddingsItems(token),
            exactMatch: false
        };
    }
    async getEmbeddingsItems(token) {
        const settingsRecord = this._recordProvider.getSettingsRecord();
        const filterMatches = [];
        const settings = await this._aiSettingsSearchService.getEmbeddingsResults(this._filter, token);
        if (!settings) {
            return [];
        }
        const providerName = this._excludeSelectionStep ? EMBEDDINGS_ONLY_SEARCH_PROVIDER_NAME : EMBEDDINGS_SEARCH_PROVIDER_NAME;
        for (const settingKey of settings) {
            if (filterMatches.length === EmbeddingsSearchProvider.EMBEDDINGS_SETTINGS_SEARCH_MAX_PICKS) {
                break;
            }
            filterMatches.push({
                setting: settingsRecord[settingKey],
                matches: [settingsRecord[settingKey].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: 0, // the results are sorted upstream.
                providerName
            });
        }
        return filterMatches;
    }
}
class TfIdfSearchProvider {
    static { this.TF_IDF_PRE_NORMALIZE_THRESHOLD = 50; }
    static { this.TF_IDF_POST_NORMALIZE_THRESHOLD = 0.7; }
    static { this.TF_IDF_MAX_PICKS = 5; }
    constructor() {
        this._filter = '';
        this._documents = [];
        this._settingsRecord = {};
    }
    setFilter(filter) {
        this._filter = cleanFilter(filter);
    }
    keyToLabel(settingId) {
        const label = settingId
            .replace(/[-._]/g, ' ')
            .replace(/([a-z]+)([A-Z])/g, '$1 $2')
            .replace(/([A-Za-z]+)(\d+)/g, '$1 $2')
            .replace(/(\d+)([A-Za-z]+)/g, '$1 $2')
            .toLowerCase();
        return label;
    }
    settingItemToEmbeddingString(item) {
        let result = `Setting Id: ${item.key}\n`;
        result += `Label: ${this.keyToLabel(item.key)}\n`;
        result += `Description: ${item.description}\n`;
        return result;
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter) {
            return null;
        }
        if (this._currentPreferencesModel !== preferencesModel) {
            // Refresh the documents and settings record
            this._currentPreferencesModel = preferencesModel;
            this._documents = [];
            this._settingsRecord = {};
            for (const group of preferencesModel.settingsGroups) {
                if (group.id === 'mostCommonlyUsed') {
                    continue;
                }
                for (const section of group.sections) {
                    for (const setting of section.settings) {
                        this._documents.push({
                            key: setting.key,
                            textChunks: [this.settingItemToEmbeddingString(setting)]
                        });
                        this._settingsRecord[setting.key] = setting;
                    }
                }
            }
        }
        return {
            filterMatches: await this.getTfIdfItems(token),
            exactMatch: false
        };
    }
    async getTfIdfItems(token) {
        const filterMatches = [];
        const tfIdfCalculator = new TfIdfCalculator();
        tfIdfCalculator.updateDocuments(this._documents);
        const tfIdfRankings = tfIdfCalculator.calculateScores(this._filter, token);
        tfIdfRankings.sort((a, b) => b.score - a.score);
        const maxScore = tfIdfRankings[0].score;
        if (maxScore < TfIdfSearchProvider.TF_IDF_PRE_NORMALIZE_THRESHOLD) {
            // Reject all the matches.
            return [];
        }
        for (const info of tfIdfRankings) {
            if (info.score / maxScore < TfIdfSearchProvider.TF_IDF_POST_NORMALIZE_THRESHOLD || filterMatches.length === TfIdfSearchProvider.TF_IDF_MAX_PICKS) {
                break;
            }
            const pick = info.key;
            filterMatches.push({
                setting: this._settingsRecord[pick],
                matches: [this._settingsRecord[pick].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: info.score,
                providerName: TF_IDF_SEARCH_PROVIDER_NAME
            });
        }
        return filterMatches;
    }
}
class RemoteSearchProvider {
    constructor() {
        this._filter = '';
        this._tfIdfSearchProvider = new TfIdfSearchProvider();
    }
    setFilter(filter) {
        this._filter = filter;
        this._tfIdfSearchProvider.setFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter) {
            return null;
        }
        const results = await this._tfIdfSearchProvider.searchModel(preferencesModel, token);
        return results;
    }
}
let AiSearchProvider = class AiSearchProvider {
    constructor(aiSettingsSearchService) {
        this.aiSettingsSearchService = aiSettingsSearchService;
        this._filter = '';
        this._embeddingsSearchProvider = new EmbeddingsSearchProvider(this.aiSettingsSearchService, false);
        this._recordProvider = new SettingsRecordProvider();
    }
    setFilter(filter) {
        this._filter = filter;
        this._embeddingsSearchProvider.setFilter(filter);
    }
    async searchModel(preferencesModel, token) {
        if (!this._filter || !this.aiSettingsSearchService.isEnabled()) {
            return null;
        }
        this._recordProvider.updateModel(preferencesModel);
        const results = await this._embeddingsSearchProvider.searchModel(preferencesModel, token);
        return results;
    }
    async getLLMRankedResults(token) {
        if (!this._filter || !this.aiSettingsSearchService.isEnabled()) {
            return null;
        }
        const items = await this.getLLMRankedItems(token);
        return {
            filterMatches: items,
            exactMatch: false
        };
    }
    async getLLMRankedItems(token) {
        const settingsRecord = this._recordProvider.getSettingsRecord();
        const filterMatches = [];
        const settings = await this.aiSettingsSearchService.getLLMRankedResults(this._filter, token);
        if (!settings) {
            return [];
        }
        for (const settingKey of settings) {
            if (!settingsRecord[settingKey]) {
                // Non-existent setting.
                continue;
            }
            filterMatches.push({
                setting: settingsRecord[settingKey],
                matches: [settingsRecord[settingKey].range],
                matchType: SettingMatchType.RemoteMatch,
                keyMatchScore: 0,
                score: 0, // the results are sorted upstream.
                providerName: LLM_RANKED_SEARCH_PROVIDER_NAME
            });
        }
        return filterMatches;
    }
};
AiSearchProvider = __decorate([
    __param(0, IAiSettingsSearchService)
], AiSearchProvider);
registerSingleton(IPreferencesSearchService, PreferencesSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNTZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzdELE9BQU8sRUFBVSwwQkFBMEIsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLGtDQUFrQyxDQUFDO0FBRWxGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSwyQkFBMkIsRUFBbUIsTUFBTSx3RUFBd0UsQ0FBQztBQUV0SSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDekcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDM0gsT0FBTyxFQUErRyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFOLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN0RixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsK0JBQStCLEVBQXFCLHlCQUF5QixF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