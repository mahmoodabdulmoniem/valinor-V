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
import * as dom from '../../../../base/browser/dom.js';
import { asArray, compareBy, numberComparator } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isEmptyMarkdownString, MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID } from './hoverActionIds.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { RenderedHoverParts } from './hoverTypes.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ClickAction, KeyDownAction } from '../../../../base/browser/ui/hover/hoverWidget.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { getHoverProviderResultsAsAsyncIterable } from './getHover.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
const $ = dom.$;
const increaseHoverVerbosityIcon = registerIcon('hover-increase-verbosity', Codicon.add, nls.localize('increaseHoverVerbosity', 'Icon for increaseing hover verbosity.'));
const decreaseHoverVerbosityIcon = registerIcon('hover-decrease-verbosity', Codicon.remove, nls.localize('decreaseHoverVerbosity', 'Icon for decreasing hover verbosity.'));
export class MarkdownHover {
    constructor(owner, range, contents, isBeforeContent, ordinal, source = undefined) {
        this.owner = owner;
        this.range = range;
        this.contents = contents;
        this.isBeforeContent = isBeforeContent;
        this.ordinal = ordinal;
        this.source = source;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
class HoverSource {
    constructor(hover, hoverProvider, hoverPosition) {
        this.hover = hover;
        this.hoverProvider = hoverProvider;
        this.hoverPosition = hoverPosition;
    }
    supportsVerbosityAction(hoverVerbosityAction) {
        switch (hoverVerbosityAction) {
            case HoverVerbosityAction.Increase:
                return this.hover.canIncreaseVerbosity ?? false;
            case HoverVerbosityAction.Decrease:
                return this.hover.canDecreaseVerbosity ?? false;
        }
    }
}
let MarkdownHoverParticipant = class MarkdownHoverParticipant {
    constructor(_editor, _languageService, _openerService, _configurationService, _languageFeaturesService, _keybindingService, _hoverService, _commandService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._commandService = _commandService;
        this.hoverOrdinal = 3;
    }
    createLoadingMessage(anchor) {
        return new MarkdownHover(this, anchor.range, [new MarkdownString().appendText(nls.localize('modesContentHover.loading', "Loading..."))], false, 2000);
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const lineNumber = anchor.range.startLineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        const result = [];
        let index = 1000;
        const lineLength = model.getLineLength(lineNumber);
        const languageId = model.getLanguageIdAtPosition(anchor.range.startLineNumber, anchor.range.startColumn);
        const stopRenderingLineAfter = this._editor.getOption(132 /* EditorOption.stopRenderingLineAfter */);
        const maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: languageId
        });
        let stopRenderingMessage = false;
        if (stopRenderingLineAfter >= 0 && lineLength > stopRenderingLineAfter && anchor.range.startColumn >= stopRenderingLineAfter) {
            stopRenderingMessage = true;
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('stopped rendering', "Rendering paused for long line for performance reasons. This can be configured via `editor.stopRenderingLineAfter`.")
                }], false, index++));
        }
        if (!stopRenderingMessage && typeof maxTokenizationLineLength === 'number' && lineLength >= maxTokenizationLineLength) {
            result.push(new MarkdownHover(this, anchor.range, [{
                    value: nls.localize('too many characters', "Tokenization is skipped for long lines for performance reasons. This can be configured via `editor.maxTokenizationLineLength`.")
                }], false, index++));
        }
        let isBeforeContent = false;
        for (const d of lineDecorations) {
            const startColumn = (d.range.startLineNumber === lineNumber) ? d.range.startColumn : 1;
            const endColumn = (d.range.endLineNumber === lineNumber) ? d.range.endColumn : maxColumn;
            const hoverMessage = d.options.hoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            if (d.options.beforeContentClassName) {
                isBeforeContent = true;
            }
            const range = new Range(anchor.range.startLineNumber, startColumn, anchor.range.startLineNumber, endColumn);
            result.push(new MarkdownHover(this, range, asArray(hoverMessage), isBeforeContent, index++));
        }
        return result;
    }
    computeAsync(anchor, lineDecorations, source, token) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return AsyncIterableObject.EMPTY;
        }
        const model = this._editor.getModel();
        const hoverProviderRegistry = this._languageFeaturesService.hoverProvider;
        if (!hoverProviderRegistry.has(model)) {
            return AsyncIterableObject.EMPTY;
        }
        const markdownHovers = this._getMarkdownHovers(hoverProviderRegistry, model, anchor, token);
        return markdownHovers;
    }
    _getMarkdownHovers(hoverProviderRegistry, model, anchor, token) {
        const position = anchor.range.getStartPosition();
        const hoverProviderResults = getHoverProviderResultsAsAsyncIterable(hoverProviderRegistry, model, position, token);
        const markdownHovers = hoverProviderResults.filter(item => !isEmptyMarkdownString(item.hover.contents))
            .map(item => {
            const range = item.hover.range ? Range.lift(item.hover.range) : anchor.range;
            const hoverSource = new HoverSource(item.hover, item.provider, position);
            return new MarkdownHover(this, range, item.hover.contents, false, item.ordinal, hoverSource);
        });
        return markdownHovers;
    }
    renderHoverParts(context, hoverParts) {
        this._renderedHoverParts = new MarkdownRenderedHoverParts(hoverParts, context.fragment, this, this._editor, this._languageService, this._openerService, this._commandService, this._keybindingService, this._hoverService, this._configurationService, context.onContentsChanged);
        return this._renderedHoverParts;
    }
    handleScroll(e) {
        this._renderedHoverParts?.handleScroll(e);
    }
    getAccessibleContent(hoverPart) {
        return this._renderedHoverParts?.getAccessibleContent(hoverPart) ?? '';
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        return this._renderedHoverParts?.doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) ?? false;
    }
    updateMarkdownHoverVerbosityLevel(action, index) {
        return Promise.resolve(this._renderedHoverParts?.updateMarkdownHoverPartVerbosityLevel(action, index));
    }
};
MarkdownHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeaturesService),
    __param(5, IKeybindingService),
    __param(6, IHoverService),
    __param(7, ICommandService)
], MarkdownHoverParticipant);
export { MarkdownHoverParticipant };
class RenderedMarkdownHoverPart {
    constructor(hoverPart, hoverElement, disposables, actionsContainer) {
        this.hoverPart = hoverPart;
        this.hoverElement = hoverElement;
        this.disposables = disposables;
        this.actionsContainer = actionsContainer;
    }
    get hoverAccessibleContent() {
        return this.hoverElement.innerText.trim();
    }
    dispose() {
        this.disposables.dispose();
    }
}
class MarkdownRenderedHoverParts {
    constructor(hoverParts, hoverPartsContainer, _hoverParticipant, _editor, _languageService, _openerService, _commandService, _keybindingService, _hoverService, _configurationService, _onFinishedRendering) {
        this._hoverParticipant = _hoverParticipant;
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._hoverService = _hoverService;
        this._configurationService = _configurationService;
        this._onFinishedRendering = _onFinishedRendering;
        this._ongoingHoverOperations = new Map();
        this._disposables = new DisposableStore();
        this.renderedHoverParts = this._renderHoverParts(hoverParts, hoverPartsContainer, this._onFinishedRendering);
        this._disposables.add(toDisposable(() => {
            this.renderedHoverParts.forEach(renderedHoverPart => {
                renderedHoverPart.dispose();
            });
            this._ongoingHoverOperations.forEach(operation => {
                operation.tokenSource.dispose(true);
            });
        }));
    }
    _renderHoverParts(hoverParts, hoverPartsContainer, onFinishedRendering) {
        hoverParts.sort(compareBy(hover => hover.ordinal, numberComparator));
        return hoverParts.map(hoverPart => {
            const renderedHoverPart = this._renderHoverPart(hoverPart, onFinishedRendering);
            hoverPartsContainer.appendChild(renderedHoverPart.hoverElement);
            return renderedHoverPart;
        });
    }
    _renderHoverPart(hoverPart, onFinishedRendering) {
        const renderedMarkdownPart = this._renderMarkdownHover(hoverPart, onFinishedRendering);
        const renderedMarkdownElement = renderedMarkdownPart.hoverElement;
        const hoverSource = hoverPart.source;
        const disposables = new DisposableStore();
        disposables.add(renderedMarkdownPart);
        if (!hoverSource) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const canIncreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Increase);
        const canDecreaseVerbosity = hoverSource.supportsVerbosityAction(HoverVerbosityAction.Decrease);
        if (!canIncreaseVerbosity && !canDecreaseVerbosity) {
            return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables);
        }
        const actionsContainer = $('div.verbosity-actions');
        renderedMarkdownElement.prepend(actionsContainer);
        const actionsContainerInner = $('div.verbosity-actions-inner');
        actionsContainer.append(actionsContainerInner);
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Increase, canIncreaseVerbosity));
        disposables.add(this._renderHoverExpansionAction(actionsContainerInner, HoverVerbosityAction.Decrease, canDecreaseVerbosity));
        return new RenderedMarkdownHoverPart(hoverPart, renderedMarkdownElement, disposables, actionsContainerInner);
    }
    _renderMarkdownHover(markdownHover, onFinishedRendering) {
        const renderedMarkdownHover = renderMarkdown(this._editor, markdownHover, this._languageService, this._openerService, onFinishedRendering);
        return renderedMarkdownHover;
    }
    _renderHoverExpansionAction(container, action, actionEnabled) {
        const store = new DisposableStore();
        const isActionIncrease = action === HoverVerbosityAction.Increase;
        const actionElement = dom.append(container, $(ThemeIcon.asCSSSelector(isActionIncrease ? increaseHoverVerbosityIcon : decreaseHoverVerbosityIcon)));
        actionElement.tabIndex = 0;
        const hoverDelegate = new WorkbenchHoverDelegate('mouse', undefined, { target: container, position: { hoverPosition: 0 /* HoverPosition.LEFT */ } }, this._configurationService, this._hoverService);
        store.add(this._hoverService.setupManagedHover(hoverDelegate, actionElement, labelForHoverVerbosityAction(this._keybindingService, action)));
        if (!actionEnabled) {
            actionElement.classList.add('disabled');
            return store;
        }
        actionElement.classList.add('enabled');
        const actionFunction = () => this._commandService.executeCommand(action === HoverVerbosityAction.Increase ? INCREASE_HOVER_VERBOSITY_ACTION_ID : DECREASE_HOVER_VERBOSITY_ACTION_ID, { focus: true });
        store.add(new ClickAction(actionElement, actionFunction));
        store.add(new KeyDownAction(actionElement, actionFunction, [3 /* KeyCode.Enter */, 10 /* KeyCode.Space */]));
        return store;
    }
    handleScroll(e) {
        this.renderedHoverParts.forEach(renderedHoverPart => {
            const actionsContainerInner = renderedHoverPart.actionsContainer;
            if (!actionsContainerInner) {
                return;
            }
            const hoverElement = renderedHoverPart.hoverElement;
            const topOfHoverScrollPosition = e.scrollTop;
            const bottomOfHoverScrollPosition = topOfHoverScrollPosition + e.height;
            const topOfRenderedPart = hoverElement.offsetTop;
            const hoverElementHeight = hoverElement.clientHeight;
            const bottomOfRenderedPart = topOfRenderedPart + hoverElementHeight;
            const iconsHeight = 22;
            let top;
            if (bottomOfRenderedPart <= bottomOfHoverScrollPosition || topOfRenderedPart >= bottomOfHoverScrollPosition) {
                top = hoverElementHeight - iconsHeight;
            }
            else {
                top = bottomOfHoverScrollPosition - topOfRenderedPart - iconsHeight;
            }
            actionsContainerInner.style.top = `${top}px`;
        });
    }
    async updateMarkdownHoverPartVerbosityLevel(action, index) {
        const model = this._editor.getModel();
        if (!model) {
            return undefined;
        }
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return undefined;
        }
        const newHover = await this._fetchHover(hoverSource, model, action);
        if (!newHover) {
            return undefined;
        }
        const newHoverSource = new HoverSource(newHover, hoverSource.hoverProvider, hoverSource.hoverPosition);
        const initialHoverPart = hoverRenderedPart.hoverPart;
        const newHoverPart = new MarkdownHover(this._hoverParticipant, initialHoverPart.range, newHover.contents, initialHoverPart.isBeforeContent, initialHoverPart.ordinal, newHoverSource);
        const newHoverRenderedPart = this._updateRenderedHoverPart(index, newHoverPart);
        if (!newHoverRenderedPart) {
            return undefined;
        }
        return {
            hoverPart: newHoverPart,
            hoverElement: newHoverRenderedPart.hoverElement
        };
    }
    getAccessibleContent(hoverPart) {
        const renderedHoverPartIndex = this.renderedHoverParts.findIndex(renderedHoverPart => renderedHoverPart.hoverPart === hoverPart);
        if (renderedHoverPartIndex === -1) {
            return undefined;
        }
        const renderedHoverPart = this._getRenderedHoverPartAtIndex(renderedHoverPartIndex);
        if (!renderedHoverPart) {
            return undefined;
        }
        const hoverElementInnerText = renderedHoverPart.hoverElement.innerText;
        const accessibleContent = hoverElementInnerText.replace(/[^\S\n\r]+/gu, ' ');
        return accessibleContent;
    }
    doesMarkdownHoverAtIndexSupportVerbosityAction(index, action) {
        const hoverRenderedPart = this._getRenderedHoverPartAtIndex(index);
        const hoverSource = hoverRenderedPart?.hoverPart.source;
        if (!hoverRenderedPart || !hoverSource?.supportsVerbosityAction(action)) {
            return false;
        }
        return true;
    }
    async _fetchHover(hoverSource, model, action) {
        let verbosityDelta = action === HoverVerbosityAction.Increase ? 1 : -1;
        const provider = hoverSource.hoverProvider;
        const ongoingHoverOperation = this._ongoingHoverOperations.get(provider);
        if (ongoingHoverOperation) {
            ongoingHoverOperation.tokenSource.cancel();
            verbosityDelta += ongoingHoverOperation.verbosityDelta;
        }
        const tokenSource = new CancellationTokenSource();
        this._ongoingHoverOperations.set(provider, { verbosityDelta, tokenSource });
        const context = { verbosityRequest: { verbosityDelta, previousHover: hoverSource.hover } };
        let hover;
        try {
            hover = await Promise.resolve(provider.provideHover(model, hoverSource.hoverPosition, tokenSource.token, context));
        }
        catch (e) {
            onUnexpectedExternalError(e);
        }
        tokenSource.dispose();
        this._ongoingHoverOperations.delete(provider);
        return hover;
    }
    _updateRenderedHoverPart(index, hoverPart) {
        if (index >= this.renderedHoverParts.length || index < 0) {
            return undefined;
        }
        const renderedHoverPart = this._renderHoverPart(hoverPart, this._onFinishedRendering);
        const currentRenderedHoverPart = this.renderedHoverParts[index];
        const currentRenderedMarkdown = currentRenderedHoverPart.hoverElement;
        const renderedMarkdown = renderedHoverPart.hoverElement;
        const renderedChildrenElements = Array.from(renderedMarkdown.children);
        currentRenderedMarkdown.replaceChildren(...renderedChildrenElements);
        const newRenderedHoverPart = new RenderedMarkdownHoverPart(hoverPart, currentRenderedMarkdown, renderedHoverPart.disposables, renderedHoverPart.actionsContainer);
        currentRenderedHoverPart.dispose();
        this.renderedHoverParts[index] = newRenderedHoverPart;
        return newRenderedHoverPart;
    }
    _getRenderedHoverPartAtIndex(index) {
        return this.renderedHoverParts[index];
    }
    dispose() {
        this._disposables.dispose();
    }
}
export function renderMarkdownHovers(context, markdownHovers, editor, languageService, openerService) {
    // Sort hover parts to keep them stable since they might come in async, out-of-order
    markdownHovers.sort(compareBy(hover => hover.ordinal, numberComparator));
    const renderedHoverParts = [];
    for (const markdownHover of markdownHovers) {
        const renderedHoverPart = renderMarkdown(editor, markdownHover, languageService, openerService, context.onContentsChanged);
        context.fragment.appendChild(renderedHoverPart.hoverElement);
        renderedHoverParts.push(renderedHoverPart);
    }
    return new RenderedHoverParts(renderedHoverParts);
}
function renderMarkdown(editor, markdownHover, languageService, openerService, onFinishedRendering) {
    const disposables = new DisposableStore();
    const renderedMarkdown = $('div.hover-row');
    const renderedMarkdownContents = $('div.hover-row-contents');
    renderedMarkdown.appendChild(renderedMarkdownContents);
    const markdownStrings = markdownHover.contents;
    for (const markdownString of markdownStrings) {
        if (isEmptyMarkdownString(markdownString)) {
            continue;
        }
        const markdownHoverElement = $('div.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents'));
        const renderer = new MarkdownRenderer({ editor }, languageService, openerService);
        const renderedContents = disposables.add(renderer.render(markdownString, {
            asyncRenderCallback: () => {
                hoverContentsElement.className = 'hover-contents code-hover-contents';
                onFinishedRendering();
            }
        }));
        hoverContentsElement.appendChild(renderedContents.element);
        renderedMarkdownContents.appendChild(markdownHoverElement);
    }
    const renderedHoverPart = {
        hoverPart: markdownHover,
        hoverElement: renderedMarkdown,
        dispose() { disposables.dispose(); }
    };
    return renderedHoverPart;
}
export function labelForHoverVerbosityAction(keybindingService, action) {
    switch (action) {
        case HoverVerbosityAction.Increase: {
            const kb = keybindingService.lookupKeybinding(INCREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb ?
                nls.localize('increaseVerbosityWithKb', "Increase Hover Verbosity ({0})", kb.getLabel()) :
                nls.localize('increaseVerbosity', "Increase Hover Verbosity");
        }
        case HoverVerbosityAction.Decrease: {
            const kb = keybindingService.lookupKeybinding(DECREASE_HOVER_VERBOSITY_ACTION_ID);
            return kb ?
                nls.localize('decreaseVerbosityWithKb', "Decrease Hover Verbosity ({0})", kb.getLabel()) :
                nls.localize('decreaseVerbosity', "Decrease Hover Verbosity");
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Ib3ZlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL21hcmtkb3duSG92ZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUN4RyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUc3RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUEySixrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlNLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFN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