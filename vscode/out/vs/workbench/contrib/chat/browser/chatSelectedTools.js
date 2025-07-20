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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEvent, ObservableMap } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { PromptFileRewriter } from './promptSyntax/promptFileRewriter.js';
export var ToolsScope;
(function (ToolsScope) {
    ToolsScope[ToolsScope["Global"] = 0] = "Global";
    ToolsScope[ToolsScope["Session"] = 1] = "Session";
    ToolsScope[ToolsScope["Mode"] = 2] = "Mode";
})(ToolsScope || (ToolsScope = {}));
let ChatSelectedTools = class ChatSelectedTools extends Disposable {
    constructor(_mode, _toolsService, _storageService, _instantiationService) {
        super();
        this._mode = _mode;
        this._toolsService = _toolsService;
        this._instantiationService = _instantiationService;
        this._sessionStates = new ObservableMap();
        /**
         * All enabled tools and tool sets.
         */
        this.entries = this.entriesMap.map(function (value) {
            const result = new Set();
            for (const [item, enabled] of value) {
                if (enabled) {
                    result.add(item);
                }
            }
            return result;
        });
        this.enablementMap = this.entriesMap.map((map, r) => {
            const result = new Map();
            const _set = (tool, enabled) => {
                // ONLY disable a tool that isn't enabled yet
                const enabledNow = result.get(tool);
                if (enabled || !enabledNow) {
                    result.set(tool, enabled);
                }
            };
            for (const [item, enabled] of map) {
                if (item instanceof ToolSet) {
                    for (const tool of item.getTools(r)) {
                        // Tools from an mcp tool set are explicitly enabled/disabled under the tool set.
                        // Other toolsets don't show individual tools under the tool set and enablement just follows the toolset.
                        const toolEnabled = item.source.type === 'mcp' ?
                            map.get(tool) ?? enabled :
                            enabled;
                        _set(tool, toolEnabled);
                    }
                }
                else {
                    if (item.canBeReferencedInPrompt) {
                        _set(item, enabled);
                    }
                }
            }
            return result;
        });
        const storedTools = observableMemento({
            defaultValue: { disabledToolSets: [], disabledTools: [] },
            key: 'chat/selectedTools',
        });
        this._selectedTools = this._store.add(storedTools(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, _storageService));
        this._allTools = observableFromEvent(_toolsService.onDidChangeTools, () => Array.from(_toolsService.getTools()));
    }
    /**
     * All tools and tool sets with their enabled state.
     */
    get entriesMap() {
        return derived(r => {
            const map = new Map();
            const currentMode = this._mode.read(r);
            let currentMap = this._sessionStates.get(currentMode.id);
            const modeTools = currentMode.customTools?.read(r);
            if (!currentMap && currentMode.kind === ChatModeKind.Agent && modeTools) {
                currentMap = this._toolsService.toToolAndToolSetEnablementMap(modeTools);
            }
            if (currentMap) {
                for (const tool of this._allTools.read(r)) {
                    if (tool.canBeReferencedInPrompt) {
                        map.set(tool, currentMap.get(tool) === true); // false if not present
                    }
                }
                for (const toolSet of this._toolsService.toolSets.read(r)) {
                    map.set(toolSet, currentMap.get(toolSet) === true); // false if not present
                }
            }
            else {
                const currData = this._selectedTools.read(r);
                const disabledToolSets = new Set(currData.disabledToolSets ?? []);
                const disabledTools = new Set(currData.disabledTools ?? []);
                for (const tool of this._allTools.read(r)) {
                    if (tool.canBeReferencedInPrompt) {
                        map.set(tool, !disabledTools.has(tool.id));
                    }
                }
                for (const toolSet of this._toolsService.toolSets.read(r)) {
                    map.set(toolSet, !disabledToolSets.has(toolSet.id));
                }
            }
            return map;
        });
    }
    get entriesScope() {
        const mode = this._mode.get();
        if (this._sessionStates.has(mode.id)) {
            return ToolsScope.Session;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            return ToolsScope.Mode;
        }
        return ToolsScope.Global;
    }
    get currentMode() {
        return this._mode.get();
    }
    resetSessionEnablementState() {
        const mode = this._mode.get();
        this._sessionStates.delete(mode.id);
    }
    set(enablementMap, sessionOnly) {
        const mode = this._mode.get();
        if (sessionOnly) {
            this._sessionStates.set(mode.id, enablementMap);
            return;
        }
        if (this._sessionStates.has(mode.id)) {
            this._sessionStates.set(mode.id, enablementMap);
            return;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            // apply directly to mode file.
            this.updateCustomModeTools(mode.uri.get(), enablementMap);
            return;
        }
        const storedData = { disabledToolSets: [], disabledTools: [] };
        for (const [item, enabled] of enablementMap) {
            if (!enabled) {
                if (item instanceof ToolSet) {
                    storedData.disabledToolSets.push(item.id);
                }
                else {
                    storedData.disabledTools.push(item.id);
                }
            }
        }
        this._selectedTools.set(storedData, undefined);
    }
    async updateCustomModeTools(uri, enablementMap) {
        await this._instantiationService.createInstance(PromptFileRewriter).openAndRewriteTools(uri, enablementMap, CancellationToken.None);
    }
};
ChatSelectedTools = __decorate([
    __param(1, ILanguageModelToolsService),
    __param(2, IStorageService),
    __param(3, IInstantiationService)
], ChatSelectedTools);
export { ChatSelectedTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2VsZWN0ZWRUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVqSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLDBCQUEwQixFQUEyQyxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0SSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQWUxRSxNQUFNLENBQU4sSUFBWSxVQUlYO0FBSkQsV0FBWSxVQUFVO0lBQ3JCLCtDQUFNLENBQUE7SUFDTixpREFBTyxDQUFBO0lBQ1AsMkNBQUksQ0FBQTtBQUNMLENBQUMsRUFKVyxVQUFVLEtBQVYsVUFBVSxRQUlyQjtBQUVNLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQXFCaEQsWUFDa0IsS0FBNkIsRUFDbEIsYUFBMEQsRUFDckUsZUFBZ0MsRUFDMUIscUJBQTZEO1FBRXBG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