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
var EditorGroupWatermark_1;
import { $, append, clearNode, h } from '../../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { coalesce, shuffle } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWeb, OS } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorForeground, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
const showCommands = { text: localize('watermark.showCommands', "Show All Commands"), id: 'workbench.action.showCommands' };
const gotoFile = { text: localize('watermark.quickAccess', "Go to File"), id: 'workbench.action.quickOpen' };
const openFile = { text: localize('watermark.openFile', "Open File"), id: 'workbench.action.files.openFile' };
const openFolder = { text: localize('watermark.openFolder', "Open Folder"), id: 'workbench.action.files.openFolder' };
const openFileOrFolder = { text: localize('watermark.openFileFolder', "Open File or Folder"), id: 'workbench.action.files.openFileFolder' };
const openRecent = { text: localize('watermark.openRecent', "Open Recent"), id: 'workbench.action.openRecent' };
const newUntitledFile = { text: localize('watermark.newUntitledFile', "New Untitled Text File"), id: 'workbench.action.files.newUntitledFile' };
const findInFiles = { text: localize('watermark.findInFiles', "Find in Files"), id: 'workbench.action.findInFiles' };
const toggleTerminal = { text: localize({ key: 'watermark.toggleTerminal', comment: ['toggle is a verb here'] }, "Toggle Terminal"), id: 'workbench.action.terminal.toggleTerminal', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
const startDebugging = { text: localize('watermark.startDebugging', "Start Debugging"), id: 'workbench.action.debug.start', when: { web: ContextKeyExpr.equals('terminalProcessSupported', true) } };
const openSettings = { text: localize('watermark.openSettings', "Open Settings"), id: 'workbench.action.openSettings' };
const showChat = ContextKeyExpr.and(ContextKeyExpr.equals('chatSetupHidden', false), ContextKeyExpr.equals('chatSetupDisabled', false));
const openChat = { text: localize('watermark.openChat', "Open Chat"), id: 'workbench.action.chat.open', when: { native: showChat, web: showChat } };
const emptyWindowEntries = coalesce([
    showCommands,
    ...(isMacintosh && !isWeb ? [openFileOrFolder] : [openFile, openFolder]),
    openRecent,
    isMacintosh && !isWeb ? newUntitledFile : undefined, // fill in one more on macOS to get to 5 entries
    openChat
]);
const randomEmptyWindowEntries = [
/* Nothing yet */
];
const workspaceEntries = [
    showCommands,
    gotoFile,
    openChat
];
const randomWorkspaceEntries = [
    findInFiles,
    startDebugging,
    toggleTerminal,
    openSettings,
];
let EditorGroupWatermark = class EditorGroupWatermark extends Disposable {
    static { EditorGroupWatermark_1 = this; }
    static { this.CACHED_WHEN = 'editorGroupWatermark.whenConditions'; }
    constructor(container, keybindingService, contextService, contextKeyService, configurationService, storageService) {
        super();
        this.keybindingService = keybindingService;
        this.contextService = contextService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.transientDisposables = this._register(new DisposableStore());
        this.keybindingLabels = this._register(new DisposableStore());
        this.enabled = false;
        this.cachedWhen = this.storageService.getObject(EditorGroupWatermark_1.CACHED_WHEN, 0 /* StorageScope.PROFILE */, Object.create(null));
        this.workbenchState = this.contextService.getWorkbenchState();
        const elements = h('.editor-group-watermark', [
            h('.letterpress'),
            h('.shortcuts@shortcuts'),
        ]);
        append(container, elements.root);
        this.shortcuts = elements.shortcuts;
        this.registerListeners();
        this.render();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.tips.enabled') && this.enabled !== this.configurationService.getValue('workbench.tips.enabled')) {
                this.render();
            }
        }));
        this._register(this.contextService.onDidChangeWorkbenchState(workbenchState => {
            if (this.workbenchState !== workbenchState) {
                this.workbenchState = workbenchState;
                this.render();
            }
        }));
        this._register(this.storageService.onWillSaveState(e => {
            if (e.reason === WillSaveStateReason.SHUTDOWN) {
                const entries = [...emptyWindowEntries, ...randomEmptyWindowEntries, ...workspaceEntries, ...randomWorkspaceEntries];
                for (const entry of entries) {
                    const when = isWeb ? entry.when?.web : entry.when?.native;
                    if (when) {
                        this.cachedWhen[entry.id] = this.contextKeyService.contextMatchesRules(when);
                    }
                }
                this.storageService.store(EditorGroupWatermark_1.CACHED_WHEN, JSON.stringify(this.cachedWhen), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            }
        }));
    }
    render() {
        this.enabled = this.configurationService.getValue('workbench.tips.enabled');
        clearNode(this.shortcuts);
        this.transientDisposables.clear();
        if (!this.enabled) {
            return;
        }
        const fixedEntries = this.filterEntries(this.workbenchState !== 1 /* WorkbenchState.EMPTY */ ? workspaceEntries : emptyWindowEntries, false /* not shuffled */);
        const randomEntries = this.filterEntries(this.workbenchState !== 1 /* WorkbenchState.EMPTY */ ? randomWorkspaceEntries : randomEmptyWindowEntries, true /* shuffled */).slice(0, Math.max(0, 5 - fixedEntries.length));
        const entries = [...fixedEntries, ...randomEntries];
        const box = append(this.shortcuts, $('.watermark-box'));
        const update = () => {
            clearNode(box);
            this.keybindingLabels.clear();
            for (const entry of entries) {
                const keys = this.keybindingService.lookupKeybinding(entry.id);
                if (!keys) {
                    continue;
                }
                const dl = append(box, $('dl'));
                const dt = append(dl, $('dt'));
                dt.textContent = entry.text;
                const dd = append(dl, $('dd'));
                const label = this.keybindingLabels.add(new KeybindingLabel(dd, OS, { renderUnboundKeybindings: true, ...defaultKeybindingLabelStyles }));
                label.set(keys);
            }
        };
        update();
        this.transientDisposables.add(this.keybindingService.onDidUpdateKeybindings(update));
    }
    filterEntries(entries, shuffleEntries) {
        const filteredEntries = entries
            .filter(entry => (isWeb && !entry.when?.web) || (!isWeb && !entry.when?.native) || this.cachedWhen[entry.id])
            .filter(entry => !!CommandsRegistry.getCommand(entry.id))
            .filter(entry => !!this.keybindingService.lookupKeybinding(entry.id));
        if (shuffleEntries) {
            shuffle(filteredEntries);
        }
        return filteredEntries;
    }
};
EditorGroupWatermark = EditorGroupWatermark_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IWorkspaceContextService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IStorageService)
], EditorGroupWatermark);
export { EditorGroupWatermark };
registerColor('editorWatermark.foreground', { dark: transparent(editorForeground, 0.6), light: transparent(editorForeground, 0.68), hcDark: editorForeground, hcLight: editorForeground }, localize('editorLineHighlight', 'Foreground color for the labels in the editor watermark.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBXYXRlcm1hcmsuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JHcm91cFdhdGVybWFyay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuSSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFF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