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
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout, RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
const SHELL_INTEGRATION_TIMEOUT = 5000;
const NO_SHELL_INTEGRATION_IDLE = 1000;
const SUGGEST_DEBOUNCE = 200;
let McpPromptArgumentPick = class McpPromptArgumentPick extends Disposable {
    constructor(prompt, _quickInputService, _terminalService, _searchService, _workspaceContextService, _labelService, _fileService, _modelService, _languageService, _terminalGroupService, _instantiationService) {
        super();
        this.prompt = prompt;
        this._quickInputService = _quickInputService;
        this._terminalService = _terminalService;
        this._searchService = _searchService;
        this._workspaceContextService = _workspaceContextService;
        this._labelService = _labelService;
        this._fileService = _fileService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._terminalGroupService = _terminalGroupService;
        this._instantiationService = _instantiationService;
        this.quickPick = this._register(_quickInputService.createQuickPick({ useSeparators: true }));
    }
    async createArgs(token) {
        const { quickPick, prompt } = this;
        quickPick.totalSteps = prompt.arguments.length;
        quickPick.step = 0;
        quickPick.ignoreFocusOut = true;
        quickPick.sortByLabel = false;
        const args = {};
        const backSnapshots = [];
        for (let i = 0; i < prompt.arguments.length; i++) {
            const arg = prompt.arguments[i];
            const restore = backSnapshots.at(i);
            quickPick.step = i + 1;
            quickPick.placeholder = arg.required ? arg.description : `${arg.description || ''} (${localize('optional', 'Optional')})`;
            quickPick.title = localize('mcp.prompt.pick.title', 'Value for: {0}', arg.title || arg.name);
            quickPick.value = restore?.value ?? ((args.hasOwnProperty(arg.name) && args[arg.name]) || '');
            quickPick.items = restore?.items ?? [];
            quickPick.activeItems = restore?.activeItems ?? [];
            quickPick.buttons = i > 0 ? [this._quickInputService.backButton] : [];
            const value = await this._getArg(arg, !!restore, args, token);
            if (value.type === 'back') {
                i -= 2;
            }
            else if (value.type === 'cancel') {
                return undefined;
            }
            else if (value.type === 'arg') {
                backSnapshots[i] = { value: quickPick.value, items: quickPick.items.slice(), activeItems: quickPick.activeItems.slice() };
                args[arg.name] = value.value;
            }
            else {
                assertNever(value);
            }
        }
        quickPick.value = '';
        quickPick.placeholder = localize('loading', 'Loading...');
        quickPick.busy = true;
        return args;
    }
    async _getArg(arg, didRestoreState, argsSoFar, token) {
        const { quickPick } = this;
        const store = new DisposableStore();
        const input$ = observableValue(this, quickPick.value);
        const asyncPicks = [
            {
                name: localize('mcp.arg.suggestions', 'Suggestions'),
                observer: this._promptCompletions(arg, input$, argsSoFar),
            },
            {
                name: localize('mcp.arg.files', 'Files'),
                observer: this._fileCompletions(input$),
            }
        ];
        store.add(autorun(reader => {
            if (didRestoreState) {
                input$.read(reader);
                return; // don't overwrite initial items until the user types
            }
            let items = [];
            items.push({ id: 'insert-text', label: localize('mcp.arg.asText', 'Insert as text'), iconClass: ThemeIcon.asClassName(Codicon.textSize), action: 'text', alwaysShow: true });
            items.push({ id: 'run-command', label: localize('mcp.arg.asCommand', 'Run as Command'), description: localize('mcp.arg.asCommand.description', 'Inserts the command output as the prompt argument'), iconClass: ThemeIcon.asClassName(Codicon.terminal), action: 'command', alwaysShow: true });
            let busy = false;
            for (const pick of asyncPicks) {
                const state = pick.observer.read(reader);
                busy ||= state.busy;
                if (state.picks) {
                    items.push({ label: pick.name, type: 'separator' });
                    items = items.concat(state.picks);
                }
            }
            const previouslyActive = quickPick.activeItems;
            quickPick.busy = busy;
            quickPick.items = items;
            const lastActive = items.find(i => previouslyActive.some(a => a.id === i.id));
            // Keep any selection state, but otherwise select the first completion item, and avoid default-selecting the top item unless there are no compltions
            if (lastActive) {
                quickPick.activeItems = [lastActive];
            }
            else if (items.length > 2) {
                quickPick.activeItems = [items[3]];
            }
            else if (busy) {
                quickPick.activeItems = [];
            }
            else {
                quickPick.activeItems = [items[0]];
            }
        }));
        try {
            const value = await new Promise(resolve => {
                if (token) {
                    store.add(token.onCancellationRequested(() => {
                        resolve(undefined);
                    }));
                }
                store.add(quickPick.onDidChangeValue(value => {
                    quickPick.validationMessage = undefined;
                    input$.set(value, undefined);
                }));
                store.add(quickPick.onDidAccept(() => {
                    const item = quickPick.selectedItems[0];
                    if (!quickPick.value && arg.required && (!item || item.action === 'text' || item.action === 'command')) {
                        quickPick.validationMessage = localize('mcp.arg.required', "This argument is required");
                    }
                    else if (!item) {
                        // For optional arguments when no item is selected, return empty text action
                        resolve({ id: 'insert-text', label: '', action: 'text' });
                    }
                    else {
                        resolve(item);
                    }
                }));
                store.add(quickPick.onDidTriggerButton(() => {
                    resolve('back');
                }));
                store.add(quickPick.onDidHide(() => {
                    resolve(undefined);
                }));
                quickPick.show();
            });
            if (value === 'back') {
                return { type: 'back' };
            }
            if (value === undefined) {
                return { type: 'cancel' };
            }
            store.clear();
            const cts = new CancellationTokenSource();
            store.add(toDisposable(() => cts.dispose(true)));
            store.add(quickPick.onDidHide(() => store.dispose()));
            switch (value.action) {
                case 'text':
                    return { type: 'arg', value: quickPick.value || undefined };
                case 'command':
                    if (!quickPick.value) {
                        return { type: 'arg', value: undefined };
                    }
                    quickPick.busy = true;
                    return { type: 'arg', value: await this._getTerminalOutput(quickPick.value, cts.token) };
                case 'suggest':
                    return { type: 'arg', value: value.label };
                case 'file':
                    quickPick.busy = true;
                    return { type: 'arg', value: await this._fileService.readFile(value.uri).then(c => c.value.toString()) };
                default:
                    assertNever(value);
            }
        }
        finally {
            store.dispose();
        }
    }
    _promptCompletions(arg, input, argsSoFar) {
        const alreadyResolved = {};
        for (const [key, value] of Object.entries(argsSoFar)) {
            if (value) {
                alreadyResolved[key] = value;
            }
        }
        return this._asyncCompletions(input, async (i, t) => {
            const items = await this.prompt.complete(arg.name, i, alreadyResolved, t);
            return items.map((i) => ({ id: `suggest:${i}`, label: i, action: 'suggest' }));
        });
    }
    _fileCompletions(input) {
        const qb = this._instantiationService.createInstance(QueryBuilder);
        return this._asyncCompletions(input, async (i, token) => {
            if (!i) {
                return [];
            }
            const query = qb.file(this._workspaceContextService.getWorkspace().folders, {
                filePattern: i,
                maxResults: 10,
            });
            const { results } = await this._searchService.fileSearch(query, token);
            return results.map((i) => ({
                id: i.resource.toString(),
                label: basename(i.resource),
                description: this._labelService.getUriLabel(i.resource),
                iconClasses: getIconClasses(this._modelService, this._languageService, i.resource),
                uri: i.resource,
                action: 'file',
            }));
        });
    }
    _asyncCompletions(input, mapper) {
        const promise = derived(reader => {
            const queryValue = input.read(reader);
            const cts = new CancellationTokenSource();
            reader.store.add(toDisposable(() => cts.dispose(true)));
            return new ObservablePromise(timeout(SUGGEST_DEBOUNCE, cts.token)
                .then(() => mapper(queryValue, cts.token))
                .catch(() => []));
        });
        return promise.map((value, reader) => {
            const result = value.promiseResult.read(reader);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async _getTerminalOutput(command, token) {
        // The terminal outlives the specific pick argument. This is both a feature and a bug.
        // Feature: we can reuse the terminal if the user puts in multiple args
        // Bug workaround: if we dispose the terminal here and that results in the panel
        // closing, then focus moves out of the quickpick and into the active editor pane (chat input)
        // https://github.com/microsoft/vscode/blob/6a016f2507cd200b12ca6eecdab2f59da15aacb1/src/vs/workbench/browser/parts/editor/editorGroupView.ts#L1084
        const terminal = (this._terminal ??= this._register(await this._terminalService.createTerminal({
            config: {
                name: localize('mcp.terminal.name', "MCP Terminal"),
                isTransient: true,
                forceShellIntegration: true,
                isFeatureTerminal: true,
            },
            location: TerminalLocation.Panel,
        })));
        this._terminalService.setActiveInstance(terminal);
        this._terminalGroupService.showPanel(false);
        const shellIntegration = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (shellIntegration) {
            return this._getTerminalOutputInner(terminal, command, shellIntegration, token);
        }
        const store = new DisposableStore();
        return await new Promise(resolve => {
            store.add(terminal.capabilities.onDidAddCapability(e => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                    store.dispose();
                    resolve(this._getTerminalOutputInner(terminal, command, e.capability, token));
                }
            }));
            store.add(token.onCancellationRequested(() => {
                store.dispose();
                resolve(undefined);
            }));
            store.add(disposableTimeout(() => {
                store.dispose();
                resolve(this._getTerminalOutputInner(terminal, command, undefined, token));
            }, SHELL_INTEGRATION_TIMEOUT));
        });
    }
    async _getTerminalOutputInner(terminal, command, shellIntegration, token) {
        const store = new DisposableStore();
        return new Promise(resolve => {
            let allData = '';
            store.add(terminal.onLineData(d => allData += d + '\n'));
            if (shellIntegration) {
                store.add(shellIntegration.onCommandFinished(e => resolve(e.getOutput() || allData)));
            }
            else {
                const done = store.add(new RunOnceScheduler(() => resolve(allData), NO_SHELL_INTEGRATION_IDLE));
                store.add(terminal.onData(() => done.schedule()));
            }
            store.add(token.onCancellationRequested(() => resolve(undefined)));
            store.add(terminal.onDisposed(() => resolve(undefined)));
            terminal.runCommand(command, true);
        }).finally(() => {
            store.dispose();
        });
    }
};
McpPromptArgumentPick = __decorate([
    __param(1, IQuickInputService),
    __param(2, ITerminalService),
    __param(3, ISearchService),
    __param(4, IWorkspaceContextService),
    __param(5, ILabelService),
    __param(6, IFileService),
    __param(7, IModelService),
    __param(8, ILanguageService),
    __param(9, ITerminalGroupService),
    __param(10, IInstantiationService)
], McpPromptArgumentPick);
export { McpPromptArgumentPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUHJvbXB0QXJndW1lbnRQaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BQcm9tcHRBcmd1bWVudFBpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxx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