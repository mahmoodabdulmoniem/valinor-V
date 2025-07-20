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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { OpenFileAction, OpenFolderAction } from '../../../browser/actions/workspaceActions.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { Extensions, IViewDescriptorService, ViewContentGroups } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE, IDebugService } from '../common/debug.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_START_COMMAND_ID } from './debugCommands.js';
const debugStartLanguageKey = 'debugStartLanguage';
const CONTEXT_DEBUG_START_LANGUAGE = new RawContextKey(debugStartLanguageKey, undefined);
const CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR = new RawContextKey('debuggerInterestedInActiveEditor', false);
let WelcomeView = class WelcomeView extends ViewPane {
    static { this.ID = 'workbench.debug.welcome'; }
    static { this.LABEL = localize2('run', "Run"); }
    constructor(options, themeService, keybindingService, contextMenuService, configurationService, contextKeyService, debugService, editorService, instantiationService, viewDescriptorService, openerService, storageSevice, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.debugStartLanguageContext = CONTEXT_DEBUG_START_LANGUAGE.bindTo(contextKeyService);
        this.debuggerInterestedContext = CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.bindTo(contextKeyService);
        const lastSetLanguage = storageSevice.get(debugStartLanguageKey, 1 /* StorageScope.WORKSPACE */);
        this.debugStartLanguageContext.set(lastSetLanguage);
        const setContextKey = () => {
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                const model = editorControl.getModel();
                const language = model ? model.getLanguageId() : undefined;
                if (language && this.debugService.getAdapterManager().someDebuggerInterestedInLanguage(language)) {
                    this.debugStartLanguageContext.set(language);
                    this.debuggerInterestedContext.set(true);
                    storageSevice.store(debugStartLanguageKey, language, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                    return;
                }
            }
            this.debuggerInterestedContext.set(false);
        };
        const disposables = new DisposableStore();
        this._register(disposables);
        this._register(editorService.onDidActiveEditorChange(() => {
            disposables.clear();
            let editorControl = this.editorService.activeTextEditorControl;
            if (isDiffEditor(editorControl)) {
                editorControl = editorControl.getModifiedEditor();
            }
            if (isCodeEditor(editorControl)) {
                disposables.add(editorControl.onDidChangeModelLanguage(setContextKey));
            }
            setContextKey();
        }));
        this._register(this.debugService.getAdapterManager().onDidRegisterDebugger(setContextKey));
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible) {
                setContextKey();
            }
        }));
        setContextKey();
        const debugKeybinding = this.keybindingService.lookupKeybinding(DEBUG_START_COMMAND_ID);
        debugKeybindingLabel = debugKeybinding ? ` (${debugKeybinding.getLabel()})` : '';
    }
    shouldShowWelcome() {
        return true;
    }
};
WelcomeView = __decorate([
    __param(1, IThemeService),
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IDebugService),
    __param(7, IEditorService),
    __param(8, IInstantiationService),
    __param(9, IViewDescriptorService),
    __param(10, IOpenerService),
    __param(11, IStorageService),
    __param(12, IHoverService)
], WelcomeView);
export { WelcomeView };
const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'openAFileWhichCanBeDebugged',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}'
        ]
    }, "[Open a file](command:{0}) which can be debugged or run.", OpenFileAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.toNegated()),
    group: ViewContentGroups.Open,
});
let debugKeybindingLabel = '';
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: `[${localize('runAndDebugAction', "Run and Debug")}${debugKeybindingLabel}](command:${DEBUG_START_COMMAND_ID})`,
    when: CONTEXT_DEBUGGERS_AVAILABLE,
    group: ViewContentGroups.Debug,
    // Allow inserting more buttons directly after this one (by setting order to 1).
    order: 1
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebug',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            '{Locked="](command:{0})"}'
        ]
    }, "To customize Run and Debug [create a launch.json file](command:{0}).", `${DEBUG_CONFIGURE_COMMAND_ID}?${encodeURIComponent(JSON.stringify([{ addNew: true }]))}`),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.notEqualsTo('empty')),
    group: ViewContentGroups.Debug
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize({
        key: 'customizeRunAndDebugOpenFolder',
        comment: [
            'Please do not translate the word "command", it is part of our internal syntax which must not change',
            'Please do not translate "launch.json", it is the specific configuration file name',
            '{Locked="](command:{0})"}',
        ]
    }, "To customize Run and Debug, [open a folder](command:{0}) and create a launch.json file.", OpenFolderAction.ID),
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.isEqualTo('empty')),
    group: ViewContentGroups.Debug
});
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
    content: localize('allDebuggersDisabled', "All debug extensions are disabled. Enable a debug extension or install a new one from the Marketplace."),
    when: CONTEXT_DEBUG_EXTENSION_AVAILABLE.toNegated(),
    group: ViewContentGroups.Debug
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VsY29tZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvd2VsY29tZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRyxPQUFP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