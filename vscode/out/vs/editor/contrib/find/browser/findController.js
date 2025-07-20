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
var CommonFindController_1;
import { Delayer } from '../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import { EditorAction, EditorCommand, MultiEditorAction, registerEditorAction, registerEditorCommand, registerEditorContribution, registerMultiEditorAction } from '../../../browser/editorExtensions.js';
import { overviewRulerRangeHighlight } from '../../../common/core/editorColorRegistry.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { OverviewRulerLane } from '../../../common/model.js';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_FIND_WIDGET_VISIBLE, CONTEXT_REPLACE_INPUT_FOCUSED, FindModelBoundToEditorModel, FIND_IDS, ToggleCaseSensitiveKeybinding, TogglePreserveCaseKeybinding, ToggleRegexKeybinding, ToggleSearchScopeKeybinding, ToggleWholeWordKeybinding } from './findModel.js';
import { FindOptionsWidget } from './findOptionsWidget.js';
import { FindReplaceState } from './findState.js';
import { FindWidget } from './findWidget.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { FindWidgetSearchHistory } from './findWidgetSearchHistory.js';
import { ReplaceWidgetHistory } from './replaceWidgetHistory.js';
const SEARCH_STRING_MAX_LENGTH = 524288;
export function getSelectionSearchString(editor, seedSearchStringFromSelection = 'single', seedSearchStringFromNonEmptySelection = false) {
    if (!editor.hasModel()) {
        return null;
    }
    const selection = editor.getSelection();
    // if selection spans multiple lines, default search string to empty
    if ((seedSearchStringFromSelection === 'single' && selection.startLineNumber === selection.endLineNumber)
        || seedSearchStringFromSelection === 'multiple') {
        if (selection.isEmpty()) {
            const wordAtPosition = editor.getConfiguredWordAtPosition(selection.getStartPosition());
            if (wordAtPosition && (false === seedSearchStringFromNonEmptySelection)) {
                return wordAtPosition.word;
            }
        }
        else {
            if (editor.getModel().getValueLengthInRange(selection) < SEARCH_STRING_MAX_LENGTH) {
                return editor.getModel().getValueInRange(selection);
            }
        }
    }
    return null;
}
export var FindStartFocusAction;
(function (FindStartFocusAction) {
    FindStartFocusAction[FindStartFocusAction["NoFocusChange"] = 0] = "NoFocusChange";
    FindStartFocusAction[FindStartFocusAction["FocusFindInput"] = 1] = "FocusFindInput";
    FindStartFocusAction[FindStartFocusAction["FocusReplaceInput"] = 2] = "FocusReplaceInput";
})(FindStartFocusAction || (FindStartFocusAction = {}));
let CommonFindController = class CommonFindController extends Disposable {
    static { CommonFindController_1 = this; }
    static { this.ID = 'editor.contrib.findController'; }
    get editor() {
        return this._editor;
    }
    static get(editor) {
        return editor.getContribution(CommonFindController_1.ID);
    }
    constructor(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService) {
        super();
        this._editor = editor;
        this._findWidgetVisible = CONTEXT_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
        this._contextKeyService = contextKeyService;
        this._storageService = storageService;
        this._clipboardService = clipboardService;
        this._notificationService = notificationService;
        this._hoverService = hoverService;
        this._updateHistoryDelayer = new Delayer(500);
        this._state = this._register(new FindReplaceState());
        this.loadQueryState();
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._model = null;
        this._register(this._editor.onDidChangeModel(() => {
            const shouldRestartFind = (this._editor.getModel() && this._state.isRevealed);
            this.disposeModel();
            this._state.change({
                searchScope: null,
                matchCase: this._storageService.getBoolean('editor.matchCase', 1 /* StorageScope.WORKSPACE */, false),
                wholeWord: this._storageService.getBoolean('editor.wholeWord', 1 /* StorageScope.WORKSPACE */, false),
                isRegex: this._storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */, false),
                preserveCase: this._storageService.getBoolean('editor.preserveCase', 1 /* StorageScope.WORKSPACE */, false)
            }, false);
            if (shouldRestartFind) {
                this._start({
                    forceRevealReplace: false,
                    seedSearchStringFromSelection: 'none',
                    seedSearchStringFromNonEmptySelection: false,
                    seedSearchStringFromGlobalClipboard: false,
                    shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                    shouldAnimate: false,
                    updateSearchScope: false,
                    loop: this._editor.getOption(50 /* EditorOption.find */).loop
                });
            }
        }));
    }
    dispose() {
        this.disposeModel();
        super.dispose();
    }
    disposeModel() {
        if (this._model) {
            this._model.dispose();
            this._model = null;
        }
    }
    _onStateChanged(e) {
        this.saveQueryState(e);
        if (e.isRevealed) {
            if (this._state.isRevealed) {
                this._findWidgetVisible.set(true);
            }
            else {
                this._findWidgetVisible.reset();
                this.disposeModel();
            }
        }
        if (e.searchString) {
            this.setGlobalBufferTerm(this._state.searchString);
        }
    }
    saveQueryState(e) {
        if (e.isRegex) {
            this._storageService.store('editor.isRegex', this._state.actualIsRegex, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.wholeWord) {
            this._storageService.store('editor.wholeWord', this._state.actualWholeWord, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.matchCase) {
            this._storageService.store('editor.matchCase', this._state.actualMatchCase, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        if (e.preserveCase) {
            this._storageService.store('editor.preserveCase', this._state.actualPreserveCase, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    loadQueryState() {
        this._state.change({
            matchCase: this._storageService.getBoolean('editor.matchCase', 1 /* StorageScope.WORKSPACE */, this._state.matchCase),
            wholeWord: this._storageService.getBoolean('editor.wholeWord', 1 /* StorageScope.WORKSPACE */, this._state.wholeWord),
            isRegex: this._storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */, this._state.isRegex),
            preserveCase: this._storageService.getBoolean('editor.preserveCase', 1 /* StorageScope.WORKSPACE */, this._state.preserveCase)
        }, false);
    }
    isFindInputFocused() {
        return !!CONTEXT_FIND_INPUT_FOCUSED.getValue(this._contextKeyService);
    }
    getState() {
        return this._state;
    }
    closeFindWidget() {
        this._state.change({
            isRevealed: false,
            searchScope: null
        }, false);
        this._editor.focus();
    }
    toggleCaseSensitive() {
        this._state.change({ matchCase: !this._state.matchCase }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleWholeWords() {
        this._state.change({ wholeWord: !this._state.wholeWord }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleRegex() {
        this._state.change({ isRegex: !this._state.isRegex }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    togglePreserveCase() {
        this._state.change({ preserveCase: !this._state.preserveCase }, false);
        if (!this._state.isRevealed) {
            this.highlightFindOptions();
        }
    }
    toggleSearchScope() {
        if (this._state.searchScope) {
            this._state.change({ searchScope: null }, true);
        }
        else {
            if (this._editor.hasModel()) {
                let selections = this._editor.getSelections();
                selections = selections.map(selection => {
                    if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                        selection = selection.setEndPosition(selection.endLineNumber - 1, this._editor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                    }
                    if (!selection.isEmpty()) {
                        return selection;
                    }
                    return null;
                }).filter((element) => !!element);
                if (selections.length) {
                    this._state.change({ searchScope: selections }, true);
                }
            }
        }
    }
    setSearchString(searchString) {
        if (this._state.isRegex) {
            searchString = strings.escapeRegExpCharacters(searchString);
        }
        this._state.change({ searchString: searchString }, false);
    }
    highlightFindOptions(ignoreWhenVisible = false) {
        // overwritten in subclass
    }
    async _start(opts, newState) {
        this.disposeModel();
        if (!this._editor.hasModel()) {
            // cannot do anything with an editor that doesn't have a model...
            return;
        }
        const stateChanges = {
            ...newState,
            isRevealed: true
        };
        if (opts.seedSearchStringFromSelection === 'single') {
            const selectionSearchString = getSelectionSearchString(this._editor, opts.seedSearchStringFromSelection, opts.seedSearchStringFromNonEmptySelection);
            if (selectionSearchString) {
                if (this._state.isRegex) {
                    stateChanges.searchString = strings.escapeRegExpCharacters(selectionSearchString);
                }
                else {
                    stateChanges.searchString = selectionSearchString;
                }
            }
        }
        else if (opts.seedSearchStringFromSelection === 'multiple' && !opts.updateSearchScope) {
            const selectionSearchString = getSelectionSearchString(this._editor, opts.seedSearchStringFromSelection);
            if (selectionSearchString) {
                stateChanges.searchString = selectionSearchString;
            }
        }
        if (!stateChanges.searchString && opts.seedSearchStringFromGlobalClipboard) {
            const selectionSearchString = await this.getGlobalBufferTerm();
            if (!this._editor.hasModel()) {
                // the editor has lost its model in the meantime
                return;
            }
            if (selectionSearchString) {
                stateChanges.searchString = selectionSearchString;
            }
        }
        // Overwrite isReplaceRevealed
        if (opts.forceRevealReplace || stateChanges.isReplaceRevealed) {
            stateChanges.isReplaceRevealed = true;
        }
        else if (!this._findWidgetVisible.get()) {
            stateChanges.isReplaceRevealed = false;
        }
        if (opts.updateSearchScope) {
            const currentSelections = this._editor.getSelections();
            if (currentSelections.some(selection => !selection.isEmpty())) {
                stateChanges.searchScope = currentSelections;
            }
        }
        stateChanges.loop = opts.loop;
        this._state.change(stateChanges, false);
        if (!this._model) {
            this._model = new FindModelBoundToEditorModel(this._editor, this._state);
        }
    }
    start(opts, newState) {
        return this._start(opts, newState);
    }
    moveToNextMatch() {
        if (this._model) {
            this._model.moveToNextMatch();
            return true;
        }
        return false;
    }
    moveToPrevMatch() {
        if (this._model) {
            this._model.moveToPrevMatch();
            return true;
        }
        return false;
    }
    goToMatch(index) {
        if (this._model) {
            this._model.moveToMatch(index);
            return true;
        }
        return false;
    }
    replace() {
        if (this._model) {
            this._model.replace();
            return true;
        }
        return false;
    }
    replaceAll() {
        if (this._model) {
            if (this._editor.getModel()?.isTooLargeForHeapOperation()) {
                this._notificationService.warn(nls.localize('too.large.for.replaceall', "The file is too large to perform a replace all operation."));
                return false;
            }
            this._model.replaceAll();
            return true;
        }
        return false;
    }
    selectAllMatches() {
        if (this._model) {
            this._model.selectAllMatches();
            this._editor.focus();
            return true;
        }
        return false;
    }
    async getGlobalBufferTerm() {
        if (this._editor.getOption(50 /* EditorOption.find */).globalFindClipboard
            && this._editor.hasModel()
            && !this._editor.getModel().isTooLargeForSyncing()) {
            return this._clipboardService.readFindText();
        }
        return '';
    }
    setGlobalBufferTerm(text) {
        if (this._editor.getOption(50 /* EditorOption.find */).globalFindClipboard
            && this._editor.hasModel()
            && !this._editor.getModel().isTooLargeForSyncing()) {
            // intentionally not awaited
            this._clipboardService.writeFindText(text);
        }
    }
};
CommonFindController = CommonFindController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IClipboardService),
    __param(4, INotificationService),
    __param(5, IHoverService)
], CommonFindController);
export { CommonFindController };
let FindController = class FindController extends CommonFindController {
    constructor(editor, _contextViewService, _contextKeyService, _keybindingService, notificationService, _storageService, clipboardService, hoverService) {
        super(editor, _contextKeyService, _storageService, clipboardService, notificationService, hoverService);
        this._contextViewService = _contextViewService;
        this._keybindingService = _keybindingService;
        this._widget = null;
        this._findOptionsWidget = null;
        this._findWidgetSearchHistory = FindWidgetSearchHistory.getOrCreate(_storageService);
        this._replaceWidgetHistory = ReplaceWidgetHistory.getOrCreate(_storageService);
    }
    async _start(opts, newState) {
        if (!this._widget) {
            this._createFindWidget();
        }
        const selection = this._editor.getSelection();
        let updateSearchScope = false;
        switch (this._editor.getOption(50 /* EditorOption.find */).autoFindInSelection) {
            case 'always':
                updateSearchScope = true;
                break;
            case 'never':
                updateSearchScope = false;
                break;
            case 'multiline': {
                const isSelectionMultipleLine = !!selection && selection.startLineNumber !== selection.endLineNumber;
                updateSearchScope = isSelectionMultipleLine;
                break;
            }
            default:
                break;
        }
        opts.updateSearchScope = opts.updateSearchScope || updateSearchScope;
        await super._start(opts, newState);
        if (this._widget) {
            if (opts.shouldFocus === 2 /* FindStartFocusAction.FocusReplaceInput */) {
                this._widget.focusReplaceInput();
            }
            else if (opts.shouldFocus === 1 /* FindStartFocusAction.FocusFindInput */) {
                this._widget.focusFindInput();
            }
        }
    }
    highlightFindOptions(ignoreWhenVisible = false) {
        if (!this._widget) {
            this._createFindWidget();
        }
        if (this._state.isRevealed && !ignoreWhenVisible) {
            this._widget.highlightFindOptions();
        }
        else {
            this._findOptionsWidget.highlightFindOptions();
        }
    }
    _createFindWidget() {
        this._widget = this._register(new FindWidget(this._editor, this, this._state, this._contextViewService, this._keybindingService, this._contextKeyService, this._hoverService, this._findWidgetSearchHistory, this._replaceWidgetHistory));
        this._findOptionsWidget = this._register(new FindOptionsWidget(this._editor, this._state, this._keybindingService));
    }
    saveViewState() {
        return this._widget?.getViewState();
    }
    restoreViewState(state) {
        this._widget?.setViewState(state);
    }
};
FindController = __decorate([
    __param(1, IContextViewService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, INotificationService),
    __param(5, IStorageService),
    __param(6, IClipboardService),
    __param(7, IHoverService)
], FindController);
export { FindController };
export const StartFindAction = registerMultiEditorAction(new MultiEditorAction({
    id: FIND_IDS.StartFindAction,
    label: nls.localize2('startFindAction', "Find"),
    precondition: ContextKeyExpr.or(EditorContextKeys.focus, ContextKeyExpr.has('editorIsOpen')),
    kbOpts: {
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
        weight: 100 /* KeybindingWeight.EditorContrib */
    },
    menuOpts: {
        menuId: MenuId.MenubarEditMenu,
        group: '3_find',
        title: nls.localize({ key: 'miFind', comment: ['&& denotes a mnemonic'] }, "&&Find"),
        order: 1
    }
}));
StartFindAction.addImplementation(0, (accessor, editor, args) => {
    const controller = CommonFindController.get(editor);
    if (!controller) {
        return false;
    }
    return controller.start({
        forceRevealReplace: false,
        seedSearchStringFromSelection: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
        seedSearchStringFromNonEmptySelection: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: editor.getOption(50 /* EditorOption.find */).globalFindClipboard,
        shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: editor.getOption(50 /* EditorOption.find */).loop
    });
});
const findArgDescription = {
    description: 'Open a new In-Editor Find Widget.',
    args: [{
            name: 'Open a new In-Editor Find Widget args',
            schema: {
                properties: {
                    searchString: { type: 'string' },
                    replaceString: { type: 'string' },
                    isRegex: { type: 'boolean' },
                    matchWholeWord: { type: 'boolean' },
                    isCaseSensitive: { type: 'boolean' },
                    preserveCase: { type: 'boolean' },
                    findInSelection: { type: 'boolean' },
                }
            }
        }]
};
export class StartFindWithArgsAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.StartFindWithArgs,
            label: nls.localize2('startFindWithArgsAction', "Find with Arguments"),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            metadata: findArgDescription
        });
    }
    async run(accessor, editor, args) {
        const controller = CommonFindController.get(editor);
        if (controller) {
            const newState = args ? {
                searchString: args.searchString,
                replaceString: args.replaceString,
                isReplaceRevealed: args.replaceString !== undefined,
                isRegex: args.isRegex,
                // isRegexOverride: args.regexOverride,
                wholeWord: args.matchWholeWord,
                // wholeWordOverride: args.wholeWordOverride,
                matchCase: args.isCaseSensitive,
                // matchCaseOverride: args.matchCaseOverride,
                preserveCase: args.preserveCase,
                // preserveCaseOverride: args.preserveCaseOverride,
            } : {};
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: (controller.getState().searchString.length === 0) && editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
                seedSearchStringFromNonEmptySelection: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
                seedSearchStringFromGlobalClipboard: true,
                shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
                shouldAnimate: true,
                updateSearchScope: args?.findInSelection || false,
                loop: editor.getOption(50 /* EditorOption.find */).loop
            }, newState);
            controller.setGlobalBufferTerm(controller.getState().searchString);
        }
    }
}
export class StartFindWithSelectionAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.StartFindWithSelection,
            label: nls.localize2('startFindWithSelectionAction', "Find with Selection"),
            precondition: undefined,
            kbOpts: {
                kbExpr: null,
                primary: 0,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */,
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (controller) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'multiple',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(50 /* EditorOption.find */).loop
            });
            controller.setGlobalBufferTerm(controller.getState().searchString);
        }
    }
}
export class MatchFindAction extends EditorAction {
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (controller && !this._run(controller)) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: (controller.getState().searchString.length === 0) && editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection !== 'never' ? 'single' : 'none',
                seedSearchStringFromNonEmptySelection: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
                seedSearchStringFromGlobalClipboard: true,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(50 /* EditorOption.find */).loop
            });
            this._run(controller);
        }
    }
}
export class NextMatchFindAction extends MatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.NextMatchFindAction,
            label: nls.localize2('findNextMatchAction', "Find Next"),
            precondition: undefined,
            kbOpts: [{
                    kbExpr: EditorContextKeys.focus,
                    primary: 61 /* KeyCode.F3 */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, secondary: [61 /* KeyCode.F3 */] },
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }, {
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
                    primary: 3 /* KeyCode.Enter */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }]
        });
    }
    _run(controller) {
        const result = controller.moveToNextMatch();
        if (result) {
            controller.editor.pushUndoStop();
            return true;
        }
        return false;
    }
}
export class PreviousMatchFindAction extends MatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.PreviousMatchFindAction,
            label: nls.localize2('findPreviousMatchAction', "Find Previous"),
            precondition: undefined,
            kbOpts: [{
                    kbExpr: EditorContextKeys.focus,
                    primary: 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */, secondary: [1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */] },
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }, {
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_FIND_INPUT_FOCUSED),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: 100 /* KeybindingWeight.EditorContrib */
                }
            ]
        });
    }
    _run(controller) {
        return controller.moveToPrevMatch();
    }
}
export class MoveToMatchFindAction extends EditorAction {
    constructor() {
        super({
            id: FIND_IDS.GoToMatchFindAction,
            label: nls.localize2('findMatchAction.goToMatch', "Go to Match..."),
            precondition: CONTEXT_FIND_WIDGET_VISIBLE
        });
        this._highlightDecorations = [];
    }
    run(accessor, editor, args) {
        const controller = CommonFindController.get(editor);
        if (!controller) {
            return;
        }
        const matchesCount = controller.getState().matchesCount;
        if (matchesCount < 1) {
            const notificationService = accessor.get(INotificationService);
            notificationService.notify({
                severity: Severity.Warning,
                message: nls.localize('findMatchAction.noResults', "No matches. Try searching for something else.")
            });
            return;
        }
        const quickInputService = accessor.get(IQuickInputService);
        const disposables = new DisposableStore();
        const inputBox = disposables.add(quickInputService.createInputBox());
        inputBox.placeholder = nls.localize('findMatchAction.inputPlaceHolder', "Type a number to go to a specific match (between 1 and {0})", matchesCount);
        const toFindMatchIndex = (value) => {
            const index = parseInt(value);
            if (isNaN(index)) {
                return undefined;
            }
            const matchCount = controller.getState().matchesCount;
            if (index > 0 && index <= matchCount) {
                return index - 1; // zero based
            }
            else if (index < 0 && index >= -matchCount) {
                return matchCount + index;
            }
            return undefined;
        };
        const updatePickerAndEditor = (value) => {
            const index = toFindMatchIndex(value);
            if (typeof index === 'number') {
                // valid
                inputBox.validationMessage = undefined;
                controller.goToMatch(index);
                const currentMatch = controller.getState().currentMatch;
                if (currentMatch) {
                    this.addDecorations(editor, currentMatch);
                }
            }
            else {
                inputBox.validationMessage = nls.localize('findMatchAction.inputValidationMessage', "Please type a number between 1 and {0}", controller.getState().matchesCount);
                this.clearDecorations(editor);
            }
        };
        disposables.add(inputBox.onDidChangeValue(value => {
            updatePickerAndEditor(value);
        }));
        disposables.add(inputBox.onDidAccept(() => {
            const index = toFindMatchIndex(inputBox.value);
            if (typeof index === 'number') {
                controller.goToMatch(index);
                inputBox.hide();
            }
            else {
                inputBox.validationMessage = nls.localize('findMatchAction.inputValidationMessage', "Please type a number between 1 and {0}", controller.getState().matchesCount);
            }
        }));
        disposables.add(inputBox.onDidHide(() => {
            this.clearDecorations(editor);
            disposables.dispose();
        }));
        inputBox.show();
    }
    clearDecorations(editor) {
        editor.changeDecorations(changeAccessor => {
            this._highlightDecorations = changeAccessor.deltaDecorations(this._highlightDecorations, []);
        });
    }
    addDecorations(editor, range) {
        editor.changeDecorations(changeAccessor => {
            this._highlightDecorations = changeAccessor.deltaDecorations(this._highlightDecorations, [
                {
                    range,
                    options: {
                        description: 'find-match-quick-access-range-highlight',
                        className: 'rangeHighlight',
                        isWholeLine: true
                    }
                },
                {
                    range,
                    options: {
                        description: 'find-match-quick-access-range-highlight-overview',
                        overviewRuler: {
                            color: themeColorFromId(overviewRulerRangeHighlight),
                            position: OverviewRulerLane.Full
                        }
                    }
                }
            ]);
        });
    }
}
export class SelectionMatchFindAction extends EditorAction {
    async run(accessor, editor) {
        const controller = CommonFindController.get(editor);
        if (!controller) {
            return;
        }
        const selectionSearchString = getSelectionSearchString(editor, 'single', false);
        if (selectionSearchString) {
            controller.setSearchString(selectionSearchString);
        }
        if (!this._run(controller)) {
            await controller.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: true,
                updateSearchScope: false,
                loop: editor.getOption(50 /* EditorOption.find */).loop
            });
            this._run(controller);
        }
    }
}
export class NextSelectionMatchFindAction extends SelectionMatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.NextSelectionMatchFindAction,
            label: nls.localize2('nextSelectionMatchFindAction', "Find Next Selection"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _run(controller) {
        return controller.moveToNextMatch();
    }
}
export class PreviousSelectionMatchFindAction extends SelectionMatchFindAction {
    constructor() {
        super({
            id: FIND_IDS.PreviousSelectionMatchFindAction,
            label: nls.localize2('previousSelectionMatchFindAction', "Find Previous Selection"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _run(controller) {
        return controller.moveToPrevMatch();
    }
}
export const StartFindReplaceAction = registerMultiEditorAction(new MultiEditorAction({
    id: FIND_IDS.StartFindReplaceAction,
    label: nls.localize2('startReplace', "Replace"),
    precondition: ContextKeyExpr.or(EditorContextKeys.focus, ContextKeyExpr.has('editorIsOpen')),
    kbOpts: {
        kbExpr: null,
        primary: 2048 /* KeyMod.CtrlCmd */ | 38 /* KeyCode.KeyH */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */ },
        weight: 100 /* KeybindingWeight.EditorContrib */
    },
    menuOpts: {
        menuId: MenuId.MenubarEditMenu,
        group: '3_find',
        title: nls.localize({ key: 'miReplace', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
        order: 2
    }
}));
StartFindReplaceAction.addImplementation(0, (accessor, editor, args) => {
    if (!editor.hasModel() || editor.getOption(103 /* EditorOption.readOnly */)) {
        return false;
    }
    const controller = CommonFindController.get(editor);
    if (!controller) {
        return false;
    }
    const currentSelection = editor.getSelection();
    const findInputFocused = controller.isFindInputFocused();
    // we only seed search string from selection when the current selection is single line and not empty,
    // + the find input is not focused
    const seedSearchStringFromSelection = !currentSelection.isEmpty()
        && currentSelection.startLineNumber === currentSelection.endLineNumber
        && (editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection !== 'never')
        && !findInputFocused;
    /*
    * if the existing search string in find widget is empty and we don't seed search string from selection, it means the Find Input is still empty, so we should focus the Find Input instead of Replace Input.

    * findInputFocused true -> seedSearchStringFromSelection false, FocusReplaceInput
    * findInputFocused false, seedSearchStringFromSelection true FocusReplaceInput
    * findInputFocused false seedSearchStringFromSelection false FocusFindInput
    */
    const shouldFocus = (findInputFocused || seedSearchStringFromSelection) ?
        2 /* FindStartFocusAction.FocusReplaceInput */ : 1 /* FindStartFocusAction.FocusFindInput */;
    return controller.start({
        forceRevealReplace: true,
        seedSearchStringFromSelection: seedSearchStringFromSelection ? 'single' : 'none',
        seedSearchStringFromNonEmptySelection: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection === 'selection',
        seedSearchStringFromGlobalClipboard: editor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection !== 'never',
        shouldFocus: shouldFocus,
        shouldAnimate: true,
        updateSearchScope: false,
        loop: editor.getOption(50 /* EditorOption.find */).loop
    });
});
registerEditorContribution(CommonFindController.ID, FindController, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(StartFindWithArgsAction);
registerEditorAction(StartFindWithSelectionAction);
registerEditorAction(NextMatchFindAction);
registerEditorAction(PreviousMatchFindAction);
registerEditorAction(MoveToMatchFindAction);
registerEditorAction(NextSelectionMatchFindAction);
registerEditorAction(PreviousSelectionMatchFindAction);
const FindCommand = EditorCommand.bindToContribution(CommonFindController.get);
registerEditorCommand(new FindCommand({
    id: FIND_IDS.CloseFindWidgetCommand,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.closeFindWidget(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleCaseSensitiveCommand,
    precondition: undefined,
    handler: x => x.toggleCaseSensitive(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleCaseSensitiveKeybinding.primary,
        mac: ToggleCaseSensitiveKeybinding.mac,
        win: ToggleCaseSensitiveKeybinding.win,
        linux: ToggleCaseSensitiveKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleWholeWordCommand,
    precondition: undefined,
    handler: x => x.toggleWholeWords(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleWholeWordKeybinding.primary,
        mac: ToggleWholeWordKeybinding.mac,
        win: ToggleWholeWordKeybinding.win,
        linux: ToggleWholeWordKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleRegexCommand,
    precondition: undefined,
    handler: x => x.toggleRegex(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleRegexKeybinding.primary,
        mac: ToggleRegexKeybinding.mac,
        win: ToggleRegexKeybinding.win,
        linux: ToggleRegexKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ToggleSearchScopeCommand,
    precondition: undefined,
    handler: x => x.toggleSearchScope(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: ToggleSearchScopeKeybinding.primary,
        mac: ToggleSearchScopeKeybinding.mac,
        win: ToggleSearchScopeKeybinding.win,
        linux: ToggleSearchScopeKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.TogglePreserveCaseCommand,
    precondition: undefined,
    handler: x => x.togglePreserveCase(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: TogglePreserveCaseKeybinding.primary,
        mac: TogglePreserveCaseKeybinding.mac,
        win: TogglePreserveCaseKeybinding.win,
        linux: TogglePreserveCaseKeybinding.linux
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceOneAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.replace(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 22 /* KeyCode.Digit1 */
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceOneAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.replace(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
        primary: 3 /* KeyCode.Enter */
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceAllAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.replaceAll(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.ReplaceAllAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.replaceAll(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, CONTEXT_REPLACE_INPUT_FOCUSED),
        primary: undefined,
        mac: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
        }
    }
}));
registerEditorCommand(new FindCommand({
    id: FIND_IDS.SelectAllMatchesAction,
    precondition: CONTEXT_FIND_WIDGET_VISIBLE,
    handler: x => x.selectAllMatches(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 5,
        kbExpr: EditorContextKeys.focus,
        primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
    }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZENvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9maW5kQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBbUMsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUseUJBQXlCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFFN1AsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDJCQUEyQixFQUFFLDZCQUE2QixFQUFFLDJCQUEyQixFQUFFLFFBQVEsRUFBRSw2QkFBNkIsRUFBRSw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzNTLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBc0QsTUFBTSxnQkFBZ0IsQ0FBQztBQUN0RyxPQUFPLEVBQUUsVUFBVSxFQUFtQixNQUFNLGlCQUFpQixDQUFDO0FB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