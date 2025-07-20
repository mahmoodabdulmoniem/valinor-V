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
var SymbolsQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { getWorkspaceSymbols } from '../common/search.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { getSelectionSearchString } from '../../../../editor/contrib/find/browser/findController.js';
import { prepareQuery, scoreFuzzy2, pieceToQuery } from '../../../../base/common/fuzzyScorer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let SymbolsQuickAccessProvider = class SymbolsQuickAccessProvider extends PickerQuickAccessProvider {
    static { SymbolsQuickAccessProvider_1 = this; }
    static { this.PREFIX = '#'; }
    static { this.TYPING_SEARCH_DELAY = 200; } // this delay accommodates for the user typing a word and then stops typing to start searching
    static { this.TREAT_AS_GLOBAL_SYMBOL_TYPES = new Set([
        4 /* SymbolKind.Class */,
        9 /* SymbolKind.Enum */,
        0 /* SymbolKind.File */,
        10 /* SymbolKind.Interface */,
        2 /* SymbolKind.Namespace */,
        3 /* SymbolKind.Package */,
        1 /* SymbolKind.Module */
    ]); }
    get defaultFilterValue() {
        // Prefer the word under the cursor in the active editor as default filter
        const editor = this.codeEditorService.getFocusedCodeEditor();
        if (editor) {
            return getSelectionSearchString(editor) ?? undefined;
        }
        return undefined;
    }
    constructor(labelService, openerService, editorService, configurationService, codeEditorService) {
        super(SymbolsQuickAccessProvider_1.PREFIX, {
            canAcceptInBackground: true,
            noResultsPick: {
                label: localize('noSymbolResults', "No matching workspace symbols")
            }
        });
        this.labelService = labelService;
        this.openerService = openerService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        this.delayer = this._register(new ThrottledDelayer(SymbolsQuickAccessProvider_1.TYPING_SEARCH_DELAY));
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection
        };
    }
    _getPicks(filter, disposables, token) {
        return this.getSymbolPicks(filter, undefined, token);
    }
    async getSymbolPicks(filter, options, token) {
        return this.delayer.trigger(async () => {
            if (token.isCancellationRequested) {
                return [];
            }
            return this.doGetSymbolPicks(prepareQuery(filter), options, token);
        }, options?.delay);
    }
    async doGetSymbolPicks(query, options, token) {
        // Split between symbol and container query
        let symbolQuery;
        let containerQuery;
        if (query.values && query.values.length > 1) {
            symbolQuery = pieceToQuery(query.values[0]); // symbol: only match on first part
            containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all but first parts
        }
        else {
            symbolQuery = query;
        }
        // Run the workspace symbol query
        const workspaceSymbols = await getWorkspaceSymbols(symbolQuery.original, token);
        if (token.isCancellationRequested) {
            return [];
        }
        const symbolPicks = [];
        // Convert to symbol picks and apply filtering
        const openSideBySideDirection = this.configuration.openSideBySideDirection;
        for (const { symbol, provider } of workspaceSymbols) {
            // Depending on the workspace symbols filter setting, skip over symbols that:
            // - do not have a container
            // - and are not treated explicitly as global symbols (e.g. classes)
            if (options?.skipLocal && !SymbolsQuickAccessProvider_1.TREAT_AS_GLOBAL_SYMBOL_TYPES.has(symbol.kind) && !!symbol.containerName) {
                continue;
            }
            const symbolLabel = symbol.name;
            // Score by symbol label if searching
            let symbolScore = undefined;
            let symbolMatches = undefined;
            let skipContainerQuery = false;
            if (symbolQuery.original.length > 0) {
                // First: try to score on the entire query, it is possible that
                // the symbol matches perfectly (e.g. searching for "change log"
                // can be a match on a markdown symbol "change log"). In that
                // case we want to skip the container query altogether.
                if (symbolQuery !== query) {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabel, { ...query, values: undefined /* disable multi-query support */ }, 0, 0);
                    if (typeof symbolScore === 'number') {
                        skipContainerQuery = true; // since we consumed the query, skip any container matching
                    }
                }
                // Otherwise: score on the symbol query and match on the container later
                if (typeof symbolScore !== 'number') {
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabel, symbolQuery, 0, 0);
                    if (typeof symbolScore !== 'number') {
                        continue;
                    }
                }
            }
            const symbolUri = symbol.location.uri;
            let containerLabel = undefined;
            if (symbolUri) {
                const containerPath = this.labelService.getUriLabel(symbolUri, { relative: true });
                if (symbol.containerName) {
                    containerLabel = `${symbol.containerName} • ${containerPath}`;
                }
                else {
                    containerLabel = containerPath;
                }
            }
            // Score by container if specified and searching
            let containerScore = undefined;
            let containerMatches = undefined;
            if (!skipContainerQuery && containerQuery && containerQuery.original.length > 0) {
                if (containerLabel) {
                    [containerScore, containerMatches] = scoreFuzzy2(containerLabel, containerQuery);
                }
                if (typeof containerScore !== 'number') {
                    continue;
                }
                if (typeof symbolScore === 'number') {
                    symbolScore += containerScore; // boost symbolScore by containerScore
                }
            }
            const deprecated = symbol.tags ? symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0 : false;
            symbolPicks.push({
                symbol,
                resource: symbolUri,
                score: symbolScore,
                iconClass: ThemeIcon.asClassName(SymbolKinds.toIcon(symbol.kind)),
                label: symbolLabel,
                ariaLabel: symbolLabel,
                highlights: deprecated ? undefined : {
                    label: symbolMatches,
                    description: containerMatches
                },
                description: containerLabel,
                strikethrough: deprecated,
                buttons: [
                    {
                        iconClass: openSideBySideDirection === 'right' ? ThemeIcon.asClassName(Codicon.splitHorizontal) : ThemeIcon.asClassName(Codicon.splitVertical),
                        tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
                    }
                ],
                trigger: (buttonIndex, keyMods) => {
                    this.openSymbol(provider, symbol, token, { keyMods, forceOpenSideBySide: true });
                    return TriggerAction.CLOSE_PICKER;
                },
                accept: async (keyMods, event) => this.openSymbol(provider, symbol, token, { keyMods, preserveFocus: event.inBackground, forcePinned: event.inBackground }),
            });
        }
        // Sort picks (unless disabled)
        if (!options?.skipSorting) {
            symbolPicks.sort((symbolA, symbolB) => this.compareSymbols(symbolA, symbolB));
        }
        return symbolPicks;
    }
    async openSymbol(provider, symbol, token, options) {
        // Resolve actual symbol to open for providers that can resolve
        let symbolToOpen = symbol;
        if (typeof provider.resolveWorkspaceSymbol === 'function') {
            symbolToOpen = await provider.resolveWorkspaceSymbol(symbol, token) || symbol;
            if (token.isCancellationRequested) {
                return;
            }
        }
        // Open HTTP(s) links with opener service
        if (symbolToOpen.location.uri.scheme === Schemas.http || symbolToOpen.location.uri.scheme === Schemas.https) {
            await this.openerService.open(symbolToOpen.location.uri, { fromUserGesture: true, allowContributedOpeners: true });
        }
        // Otherwise open as editor
        else {
            await this.editorService.openEditor({
                resource: symbolToOpen.location.uri,
                options: {
                    preserveFocus: options?.preserveFocus,
                    pinned: options.keyMods.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
                    selection: symbolToOpen.location.range ? Range.collapseToStart(symbolToOpen.location.range) : undefined
                }
            }, options.keyMods.alt || (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) || options?.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        }
    }
    compareSymbols(symbolA, symbolB) {
        // By score
        if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
            if (symbolA.score > symbolB.score) {
                return -1;
            }
            if (symbolA.score < symbolB.score) {
                return 1;
            }
        }
        // By name
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAName = symbolA.symbol.name.toLowerCase();
            const symbolBName = symbolB.symbol.name.toLowerCase();
            const res = symbolAName.localeCompare(symbolBName);
            if (res !== 0) {
                return res;
            }
        }
        // By kind
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAKind = SymbolKinds.toIcon(symbolA.symbol.kind).id;
            const symbolBKind = SymbolKinds.toIcon(symbolB.symbol.kind).id;
            return symbolAKind.localeCompare(symbolBKind);
        }
        return 0;
    }
};
SymbolsQuickAccessProvider = SymbolsQuickAccessProvider_1 = __decorate([
    __param(0, ILabelService),
    __param(1, IOpenerService),
    __param(2, IEditorService),
    __param(3, IConfigurationService),
    __param(4, ICodeEditorService)
], SymbolsQuickAccessProvider);
export { SymbolsQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zeW1ib2xzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQTBCLHlCQUF5QixFQUFFLGFBQWEsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBR2hKLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBOEMsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RyxPQUFPLEVBQUUsV0FBVyxFQUF5QixNQUFNLHdDQUF3QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsWUFBWSxFQUFrQixXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NB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