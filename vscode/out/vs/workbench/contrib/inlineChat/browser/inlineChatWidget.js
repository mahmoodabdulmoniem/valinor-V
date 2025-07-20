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
var HunkAccessibleDiffViewer_1;
import { $, getActiveElement, getTotalHeight, getWindow, h, reset, trackFocus } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { constObservable, derived, observableValue } from '../../../../base/common/observable.js';
import { AccessibleDiffViewer } from '../../../../editor/browser/widget/diffEditor/components/accessibleDiffViewer.js';
import { LineRange } from '../../../../editor/common/core/ranges/lineRange.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { DetailedLineRangeMapping, RangeMapping } from '../../../../editor/common/diff/rangeMapping.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar } from '../../../../platform/actions/browser/buttonbar.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { asCssVariable, asCssVariableName, editorBackground, inputBackground } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { MarkUnhelpfulActionId } from '../../chat/browser/actions/chatTitleActions.js';
import { ChatVoteDownButton } from '../../chat/browser/chatListRenderer.js';
import { ChatWidget } from '../../chat/browser/chatWidget.js';
import { chatRequestBackground } from '../../chat/common/chatColors.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatAgentVoteDirection, IChatService } from '../../chat/common/chatService.js';
import { isResponseVM } from '../../chat/common/chatViewModel.js';
import { CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_RESPONSE_FOCUSED, inlineChatBackground, inlineChatForeground } from '../common/inlineChat.js';
import './media/inlineChat.css';
let InlineChatWidget = class InlineChatWidget {
    constructor(location, _options, _instantiationService, _contextKeyService, _keybindingService, _accessibilityService, _configurationService, _accessibleViewService, _textModelResolverService, _chatService, _hoverService) {
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._accessibleViewService = _accessibleViewService;
        this._textModelResolverService = _textModelResolverService;
        this._chatService = _chatService;
        this._hoverService = _hoverService;
        this._elements = h('div.inline-chat@root', [
            h('div.chat-widget@chatWidget'),
            h('div.accessibleViewer@accessibleViewer'),
            h('div.status@status', [
                h('div.label.info.hidden@infoLabel'),
                h('div.actions.hidden@toolbar1'),
                h('div.label.status.hidden@statusLabel'),
                h('div.actions.secondary.hidden@toolbar2'),
            ]),
        ]);
        this._store = new DisposableStore();
        this._onDidChangeHeight = this._store.add(new Emitter());
        this.onDidChangeHeight = Event.filter(this._onDidChangeHeight.event, _ => !this._isLayouting);
        this._requestInProgress = observableValue(this, false);
        this.requestInProgress = this._requestInProgress;
        this._isLayouting = false;
        this.scopedContextKeyService = this._store.add(_contextKeyService.createScoped(this._elements.chatWidget));
        const scopedInstaService = _instantiationService.createChild(new ServiceCollection([
            IContextKeyService,
            this.scopedContextKeyService
        ]), this._store);
        this._chatWidget = scopedInstaService.createInstance(ChatWidget, location, { isInlineChat: true }, {
            autoScroll: true,
            defaultElementHeight: 32,
            renderStyle: 'minimal',
            renderInputOnTop: false,
            renderFollowups: true,
            supportsFileReferences: true,
            filter: item => {
                if (!isResponseVM(item) || item.errorDetails) {
                    // show all requests and errors
                    return true;
                }
                const emptyResponse = item.response.value.length === 0;
                if (emptyResponse) {
                    return false;
                }
                if (item.response.value.every(item => item.kind === 'textEditGroup' && _options.chatWidgetViewOptions?.rendererOptions?.renderTextEditsAsSummary?.(item.uri))) {
                    return false;
                }
                return true;
            },
            dndContainer: this._elements.root,
            ..._options.chatWidgetViewOptions
        }, {
            listForeground: inlineChatForeground,
            listBackground: inlineChatBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground
        });
        this._elements.root.classList.toggle('in-zone-widget', !!_options.inZoneWidget);
        this._chatWidget.render(this._elements.chatWidget);
        this._elements.chatWidget.style.setProperty(asCssVariableName(chatRequestBackground), asCssVariable(inlineChatBackground));
        this._chatWidget.setVisible(true);
        this._store.add(this._chatWidget);
        const ctxResponse = ChatContextKeys.isResponse.bindTo(this.scopedContextKeyService);
        const ctxResponseVote = ChatContextKeys.responseVote.bindTo(this.scopedContextKeyService);
        const ctxResponseSupportIssues = ChatContextKeys.responseSupportsIssueReporting.bindTo(this.scopedContextKeyService);
        const ctxResponseError = ChatContextKeys.responseHasError.bindTo(this.scopedContextKeyService);
        const ctxResponseErrorFiltered = ChatContextKeys.responseIsFiltered.bindTo(this.scopedContextKeyService);
        const viewModelStore = this._store.add(new DisposableStore());
        this._store.add(this._chatWidget.onDidChangeViewModel(() => {
            viewModelStore.clear();
            const viewModel = this._chatWidget.viewModel;
            if (!viewModel) {
                return;
            }
            viewModelStore.add(toDisposable(() => {
                toolbar2.context = undefined;
                ctxResponse.reset();
                ctxResponseVote.reset();
                ctxResponseError.reset();
                ctxResponseErrorFiltered.reset();
                ctxResponseSupportIssues.reset();
            }));
            viewModelStore.add(viewModel.onDidChange(() => {
                this._requestInProgress.set(viewModel.requestInProgress, undefined);
                const last = viewModel.getItems().at(-1);
                toolbar2.context = last;
                ctxResponse.set(isResponseVM(last));
                ctxResponseVote.set(isResponseVM(last) ? last.vote === ChatAgentVoteDirection.Down ? 'down' : last.vote === ChatAgentVoteDirection.Up ? 'up' : '' : '');
                ctxResponseError.set(isResponseVM(last) && last.errorDetails !== undefined);
                ctxResponseErrorFiltered.set((!!(isResponseVM(last) && last.errorDetails?.responseIsFiltered)));
                ctxResponseSupportIssues.set(isResponseVM(last) && (last.agent?.metadata.supportIssueReporting ?? false));
                this._onDidChangeHeight.fire();
            }));
            this._onDidChangeHeight.fire();
        }));
        this._store.add(this.chatWidget.onDidChangeContentHeight(() => {
            this._onDidChangeHeight.fire();
        }));
        // context keys
        this._ctxResponseFocused = CTX_INLINE_CHAT_RESPONSE_FOCUSED.bindTo(this._contextKeyService);
        const tracker = this._store.add(trackFocus(this.domNode));
        this._store.add(tracker.onDidBlur(() => this._ctxResponseFocused.set(false)));
        this._store.add(tracker.onDidFocus(() => this._ctxResponseFocused.set(true)));
        this._ctxInputEditorFocused = CTX_INLINE_CHAT_FOCUSED.bindTo(_contextKeyService);
        this._store.add(this._chatWidget.inputEditor.onDidFocusEditorWidget(() => this._ctxInputEditorFocused.set(true)));
        this._store.add(this._chatWidget.inputEditor.onDidBlurEditorWidget(() => this._ctxInputEditorFocused.set(false)));
        const statusMenuId = _options.statusMenuId instanceof MenuId ? _options.statusMenuId : _options.statusMenuId.menu;
        // BUTTON bar
        const statusMenuOptions = _options.statusMenuId instanceof MenuId ? undefined : _options.statusMenuId.options;
        const statusButtonBar = scopedInstaService.createInstance(MenuWorkbenchButtonBar, this._elements.toolbar1, statusMenuId, {
            toolbarOptions: { primaryGroup: '0_main' },
            telemetrySource: _options.chatWidgetViewOptions?.menus?.telemetrySource,
            menuOptions: { renderShortTitle: true },
            ...statusMenuOptions,
        });
        this._store.add(statusButtonBar.onDidChange(() => this._onDidChangeHeight.fire()));
        this._store.add(statusButtonBar);
        // secondary toolbar
        const toolbar2 = scopedInstaService.createInstance(MenuWorkbenchToolBar, this._elements.toolbar2, _options.secondaryMenuId ?? MenuId.for(''), {
            telemetrySource: _options.chatWidgetViewOptions?.menus?.telemetrySource,
            menuOptions: { renderShortTitle: true, shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && action.item.id === MarkUnhelpfulActionId) {
                    return scopedInstaService.createInstance(ChatVoteDownButton, action, options);
                }
                return createActionViewItem(scopedInstaService, action, options);
            }
        });
        this._store.add(toolbar2.onDidChangeMenuItems(() => this._onDidChangeHeight.fire()));
        this._store.add(toolbar2);
        this._store.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */)) {
                this._updateAriaLabel();
            }
        }));
        this._elements.root.tabIndex = 0;
        this._elements.statusLabel.tabIndex = 0;
        this._updateAriaLabel();
        // this._elements.status
        this._store.add(this._hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this._elements.statusLabel, () => {
            return this._elements.statusLabel.dataset['title'];
        }));
        this._store.add(this._chatService.onDidPerformUserAction(e => {
            if (e.sessionId === this._chatWidget.viewModel?.model.sessionId && e.action.kind === 'vote') {
                this.updateStatus('Thank you for your feedback!', { resetAfter: 1250 });
            }
        }));
    }
    _updateAriaLabel() {
        this._elements.root.ariaLabel = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
        if (this._accessibilityService.isScreenReaderOptimized()) {
            let label = defaultAriaLabel;
            if (this._configurationService.getValue("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */)) {
                const kbLabel = this._keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
                label = kbLabel
                    ? localize('inlineChat.accessibilityHelp', "Inline Chat Input, Use {0} for Inline Chat Accessibility Help.", kbLabel)
                    : localize('inlineChat.accessibilityHelpNoKb', "Inline Chat Input, Run the Inline Chat Accessibility Help command for more information.");
            }
            this._chatWidget.inputEditor.updateOptions({ ariaLabel: label });
        }
    }
    dispose() {
        this._store.dispose();
    }
    get domNode() {
        return this._elements.root;
    }
    get chatWidget() {
        return this._chatWidget;
    }
    saveState() {
        this._chatWidget.saveState();
    }
    layout(widgetDim) {
        const contentHeight = this.contentHeight;
        this._isLayouting = true;
        try {
            this._doLayout(widgetDim);
        }
        finally {
            this._isLayouting = false;
            if (this.contentHeight !== contentHeight) {
                this._onDidChangeHeight.fire();
            }
        }
    }
    _doLayout(dimension) {
        const extraHeight = this._getExtraHeight();
        const statusHeight = getTotalHeight(this._elements.status);
        // console.log('ZONE#Widget#layout', { height: dimension.height, extraHeight, progressHeight, followUpsHeight, statusHeight, LIST: dimension.height - progressHeight - followUpsHeight - statusHeight - extraHeight });
        this._elements.root.style.height = `${dimension.height - extraHeight}px`;
        this._elements.root.style.width = `${dimension.width}px`;
        this._chatWidget.layout(dimension.height - statusHeight - extraHeight, dimension.width);
    }
    /**
     * The content height of this widget is the size that would require no scrolling
     */
    get contentHeight() {
        const data = {
            chatWidgetContentHeight: this._chatWidget.contentHeight,
            statusHeight: getTotalHeight(this._elements.status),
            extraHeight: this._getExtraHeight()
        };
        const result = data.chatWidgetContentHeight + data.statusHeight + data.extraHeight;
        return result;
    }
    get minHeight() {
        // The chat widget is variable height and supports scrolling. It should be
        // at least "maxWidgetHeight" high and at most the content height.
        let maxWidgetOutputHeight = 100;
        for (const item of this._chatWidget.viewModel?.getItems() ?? []) {
            if (isResponseVM(item) && item.response.value.some(r => r.kind === 'textEditGroup' && !r.state?.applied)) {
                maxWidgetOutputHeight = 270;
                break;
            }
        }
        let value = this.contentHeight;
        value -= this._chatWidget.contentHeight;
        value += Math.min(this._chatWidget.input.contentHeight + maxWidgetOutputHeight, this._chatWidget.contentHeight);
        return value;
    }
    _getExtraHeight() {
        return this._options.inZoneWidget ? 1 : (2 /*border*/ + 4 /*shadow*/);
    }
    get value() {
        return this._chatWidget.getInput();
    }
    set value(value) {
        this._chatWidget.setInput(value);
    }
    selectAll() {
        this._chatWidget.inputEditor.setSelection(new Selection(1, 1, Number.MAX_SAFE_INTEGER, 1));
    }
    set placeholder(value) {
        this._chatWidget.setInputPlaceholder(value);
    }
    toggleStatus(show) {
        this._elements.toolbar1.classList.toggle('hidden', !show);
        this._elements.toolbar2.classList.toggle('hidden', !show);
        this._elements.status.classList.toggle('hidden', !show);
        this._elements.infoLabel.classList.toggle('hidden', !show);
        this._onDidChangeHeight.fire();
    }
    updateToolbar(show) {
        this._elements.root.classList.toggle('toolbar', show);
        this._elements.toolbar1.classList.toggle('hidden', !show);
        this._elements.toolbar2.classList.toggle('hidden', !show);
        this._elements.status.classList.toggle('actions', show);
        this._elements.infoLabel.classList.toggle('hidden', show);
        this._onDidChangeHeight.fire();
    }
    async getCodeBlockInfo(codeBlockIndex) {
        const { viewModel } = this._chatWidget;
        if (!viewModel) {
            return undefined;
        }
        const items = viewModel.getItems().filter(i => isResponseVM(i));
        const item = items.at(-1);
        if (!item) {
            return;
        }
        return viewModel.codeBlockModelCollection.get(viewModel.sessionId, item, codeBlockIndex)?.model;
    }
    get responseContent() {
        const requests = this._chatWidget.viewModel?.model.getRequests();
        return requests?.at(-1)?.response?.response.toString();
    }
    getChatModel() {
        return this._chatWidget.viewModel?.model;
    }
    setChatModel(chatModel, state) {
        this._chatWidget.setModel(chatModel, { ...state, inputValue: undefined });
    }
    updateInfo(message) {
        this._elements.infoLabel.classList.toggle('hidden', !message);
        const renderedMessage = renderLabelWithIcons(message);
        reset(this._elements.infoLabel, ...renderedMessage);
        this._onDidChangeHeight.fire();
    }
    updateStatus(message, ops = {}) {
        const isTempMessage = typeof ops.resetAfter === 'number';
        if (isTempMessage && !this._elements.statusLabel.dataset['state']) {
            const statusLabel = this._elements.statusLabel.innerText;
            const title = this._elements.statusLabel.dataset['title'];
            const classes = Array.from(this._elements.statusLabel.classList.values());
            setTimeout(() => {
                this.updateStatus(statusLabel, { classes, keepMessage: true, title });
            }, ops.resetAfter);
        }
        const renderedMessage = renderLabelWithIcons(message);
        reset(this._elements.statusLabel, ...renderedMessage);
        this._elements.statusLabel.className = `label status ${(ops.classes ?? []).join(' ')}`;
        this._elements.statusLabel.classList.toggle('hidden', !message);
        if (isTempMessage) {
            this._elements.statusLabel.dataset['state'] = 'temp';
        }
        else {
            delete this._elements.statusLabel.dataset['state'];
        }
        if (ops.title) {
            this._elements.statusLabel.dataset['title'] = ops.title;
        }
        else {
            delete this._elements.statusLabel.dataset['title'];
        }
        this._onDidChangeHeight.fire();
    }
    reset() {
        this._chatWidget.attachmentModel.clear(true);
        this._chatWidget.saveState();
        reset(this._elements.statusLabel);
        this._elements.statusLabel.classList.toggle('hidden', true);
        this._elements.toolbar1.classList.add('hidden');
        this._elements.toolbar2.classList.add('hidden');
        this.updateInfo('');
        this._elements.accessibleViewer.classList.toggle('hidden', true);
        this._onDidChangeHeight.fire();
    }
    focus() {
        this._chatWidget.focusInput();
    }
    hasFocus() {
        return this.domNode.contains(getActiveElement());
    }
};
InlineChatWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IAccessibilityService),
    __param(6, IConfigurationService),
    __param(7, IAccessibleViewService),
    __param(8, ITextModelService),
    __param(9, IChatService),
    __param(10, IHoverService)
], InlineChatWidget);
export { InlineChatWidget };
const defaultAriaLabel = localize('aria-label', "Inline Chat Input");
let EditorBasedInlineChatWidget = class EditorBasedInlineChatWidget extends InlineChatWidget {
    constructor(location, _parentEditor, options, contextKeyService, keybindingService, instantiationService, accessibilityService, configurationService, accessibleViewService, textModelResolverService, chatService, hoverService, layoutService) {
        const overflowWidgetsNode = layoutService.getContainer(getWindow(_parentEditor.getContainerDomNode())).appendChild($('.inline-chat-overflow.monaco-editor'));
        super(location, {
            ...options,
            chatWidgetViewOptions: {
                ...options.chatWidgetViewOptions,
                editorOverflowWidgetsDomNode: overflowWidgetsNode
            }
        }, instantiationService, contextKeyService, keybindingService, accessibilityService, configurationService, accessibleViewService, textModelResolverService, chatService, hoverService);
        this._parentEditor = _parentEditor;
        this._accessibleViewer = this._store.add(new MutableDisposable());
        this._store.add(toDisposable(() => {
            overflowWidgetsNode.remove();
        }));
    }
    // --- layout
    get contentHeight() {
        let result = super.contentHeight;
        if (this._accessibleViewer.value) {
            result += this._accessibleViewer.value.height + 8 /* padding */;
        }
        return result;
    }
    _doLayout(dimension) {
        let newHeight = dimension.height;
        if (this._accessibleViewer.value) {
            this._accessibleViewer.value.width = dimension.width - 12;
            newHeight -= this._accessibleViewer.value.height + 8;
        }
        super._doLayout(dimension.with(undefined, newHeight));
        // update/fix the height of the zone which was set to newHeight in super._doLayout
        this._elements.root.style.height = `${dimension.height - this._getExtraHeight()}px`;
    }
    reset() {
        this._accessibleViewer.clear();
        super.reset();
    }
    // --- accessible viewer
    showAccessibleHunk(session, hunkData) {
        this._elements.accessibleViewer.classList.remove('hidden');
        this._accessibleViewer.clear();
        this._accessibleViewer.value = this._instantiationService.createInstance(HunkAccessibleDiffViewer, this._elements.accessibleViewer, session, hunkData, new AccessibleHunk(this._parentEditor, session, hunkData));
        this._onDidChangeHeight.fire();
    }
};
EditorBasedInlineChatWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IAccessibilityService),
    __param(7, IConfigurationService),
    __param(8, IAccessibleViewService),
    __param(9, ITextModelService),
    __param(10, IChatService),
    __param(11, IHoverService),
    __param(12, ILayoutService)
], EditorBasedInlineChatWidget);
export { EditorBasedInlineChatWidget };
let HunkAccessibleDiffViewer = HunkAccessibleDiffViewer_1 = class HunkAccessibleDiffViewer extends AccessibleDiffViewer {
    set width(value) {
        this._width2.set(value, undefined);
    }
    constructor(parentNode, session, hunk, models, instantiationService) {
        const width = observableValue('width', 0);
        const diff = observableValue('diff', HunkAccessibleDiffViewer_1._asMapping(hunk));
        const diffs = derived(r => [diff.read(r)]);
        const lines = Math.min(10, 8 + diff.get().changedLineCount);
        const height = models.getModifiedOptions().get(75 /* EditorOption.lineHeight */) * lines;
        super(parentNode, constObservable(true), () => { }, constObservable(false), width, constObservable(height), diffs, models, instantiationService);
        this.height = height;
        this._width2 = width;
        this._store.add(session.textModelN.onDidChangeContent(() => {
            diff.set(HunkAccessibleDiffViewer_1._asMapping(hunk), undefined);
        }));
    }
    static _asMapping(hunk) {
        const ranges0 = hunk.getRanges0();
        const rangesN = hunk.getRangesN();
        const originalLineRange = LineRange.fromRangeInclusive(ranges0[0]);
        const modifiedLineRange = LineRange.fromRangeInclusive(rangesN[0]);
        const innerChanges = [];
        for (let i = 1; i < ranges0.length; i++) {
            innerChanges.push(new RangeMapping(ranges0[i], rangesN[i]));
        }
        return new DetailedLineRangeMapping(originalLineRange, modifiedLineRange, innerChanges);
    }
};
HunkAccessibleDiffViewer = HunkAccessibleDiffViewer_1 = __decorate([
    __param(4, IInstantiationService)
], HunkAccessibleDiffViewer);
class AccessibleHunk {
    constructor(_editor, _session, _hunk) {
        this._editor = _editor;
        this._session = _session;
        this._hunk = _hunk;
    }
    getOriginalModel() {
        return this._session.textModel0;
    }
    getModifiedModel() {
        return this._session.textModelN;
    }
    getOriginalOptions() {
        return this._editor.getOptions();
    }
    getModifiedOptions() {
        return this._editor.getOptions();
    }
    originalReveal(range) {
        // throw new Error('Method not implemented.');
    }
    modifiedReveal(range) {
        this._editor.revealRangeInCenterIfOutsideViewport(range || this._hunk.getRangesN()[0], 0 /* ScrollType.Smooth */);
    }
    modifiedSetSelection(range) {
        // this._editor.revealRangeInCenterIfOutsideViewport(range, ScrollType.Smooth);
        // this._editor.setSelection(range);
    }
    modifiedFocus() {
        this._editor.focus();
    }
    getModifiedPosition() {
        return this._hunk.getRangesN()[0].getStartPosition();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQWEsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBb0MsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEksT0FBTyxFQUFFLG9CQUFvQixFQUE4QixNQUFNLGlGQUFpRixDQUFDO0FBRW5KLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUcvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxP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