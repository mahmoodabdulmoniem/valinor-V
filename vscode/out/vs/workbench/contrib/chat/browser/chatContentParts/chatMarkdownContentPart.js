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
var ChatMarkdownContentPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { allowedMarkdownHtmlAttributes } from '../../../../../base/browser/markdownRenderer.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { DomScrollableElement } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { equalsIgnoreCase } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MarkedKatexSupport } from '../../../markdown/browser/markedKatexSupport.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatConfiguration } from '../../common/constants.js';
import { ChatMarkdownDecorationsRenderer } from '../chatMarkdownDecorationsRenderer.js';
import { allowedChatMarkdownHtmlTags } from '../chatMarkdownRenderer.js';
import { CodeBlockPart, localFileLanguageId, parseLocalFileData } from '../codeBlockPart.js';
import '../media/chatCodeBlockPill.css';
import { ResourcePool } from './chatCollections.js';
import { ChatExtensionsContentPart } from './chatExtensionsContentPart.js';
import './media/chatMarkdownPart.css';
const $ = dom.$;
let ChatMarkdownContentPart = class ChatMarkdownContentPart extends Disposable {
    static { ChatMarkdownContentPart_1 = this; }
    static { this.idPool = 0; }
    constructor(markdown, context, editorPool, fillInIncompleteTokens = false, codeBlockStartIndex = 0, renderer, currentWidth, codeBlockModelCollection, rendererOptions, contextKeyService, configurationService, textModelService, instantiationService) {
        super();
        this.markdown = markdown;
        this.editorPool = editorPool;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.rendererOptions = rendererOptions;
        this.textModelService = textModelService;
        this.instantiationService = instantiationService;
        this.codeblocksPartId = String(++ChatMarkdownContentPart_1.idPool);
        this.allRefs = [];
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.codeblocks = [];
        this.mathLayoutParticipants = new Set();
        const element = context.element;
        const inUndoStop = findLast(context.content, e => e.kind === 'undoStop', context.contentIndex)?.id;
        // We release editors in order so that it's more likely that the same editor will be assigned if this element is re-rendered right away, like it often is during progressive rendering
        const orderedDisposablesList = [];
        // Need to track the index of the codeblock within the response so it can have a unique ID,
        // and within this part to find it within the codeblocks array
        let globalCodeBlockIndexStart = codeBlockStartIndex;
        let thisPartCodeBlockIndexStart = 0;
        this.domNode = $('div.chat-markdown-part');
        const enableMath = configurationService.getValue(ChatConfiguration.EnableMath);
        const doRenderMarkdown = () => {
            // TODO: Move katex support into chatMarkdownRenderer
            const markedExtensions = enableMath
                ? coalesce([MarkedKatexSupport.getExtension(dom.getWindow(context.container), {
                        throwOnError: false
                    })])
                : [];
            // Don't set to 'false' for responses, respect defaults
            const markedOpts = isRequestVM(element) ? {
                gfm: true,
                breaks: true,
                markedExtensions,
            } : {
                markedExtensions,
            };
            const result = this._register(renderer.render(markdown.content, {
                sanitizerOptions: MarkedKatexSupport.getSanitizerOptions({
                    allowedTags: allowedChatMarkdownHtmlTags,
                    allowedAttributes: allowedMarkdownHtmlAttributes,
                }),
                fillInIncompleteTokens,
                codeBlockRendererSync: (languageId, text, raw) => {
                    const isCodeBlockComplete = !isResponseVM(context.element) || context.element.isComplete || !raw || codeblockHasClosingBackticks(raw);
                    if ((!text || (text.startsWith('<vscode_codeblock_uri') && !text.includes('\n'))) && !isCodeBlockComplete) {
                        const hideEmptyCodeblock = $('div');
                        hideEmptyCodeblock.style.display = 'none';
                        return hideEmptyCodeblock;
                    }
                    if (languageId === 'vscode-extensions') {
                        const chatExtensions = this._register(instantiationService.createInstance(ChatExtensionsContentPart, { kind: 'extensions', extensions: text.split(',') }));
                        this._register(chatExtensions.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
                        return chatExtensions.domNode;
                    }
                    const globalIndex = globalCodeBlockIndexStart++;
                    const thisPartIndex = thisPartCodeBlockIndexStart++;
                    let textModel;
                    let range;
                    let vulns;
                    let codeblockEntry;
                    if (equalsIgnoreCase(languageId, localFileLanguageId)) {
                        try {
                            const parsedBody = parseLocalFileData(text);
                            range = parsedBody.range && Range.lift(parsedBody.range);
                            textModel = this.textModelService.createModelReference(parsedBody.uri).then(ref => ref.object.textEditorModel);
                        }
                        catch (e) {
                            return $('div');
                        }
                    }
                    else {
                        const sessionId = isResponseVM(element) || isRequestVM(element) ? element.sessionId : '';
                        const modelEntry = this.codeBlockModelCollection.getOrCreate(sessionId, element, globalIndex);
                        const fastUpdateModelEntry = this.codeBlockModelCollection.updateSync(sessionId, element, globalIndex, { text, languageId, isComplete: isCodeBlockComplete });
                        vulns = modelEntry.vulns;
                        codeblockEntry = fastUpdateModelEntry;
                        textModel = modelEntry.model;
                    }
                    const hideToolbar = isResponseVM(element) && element.errorDetails?.responseIsFiltered;
                    const renderOptions = {
                        ...this.rendererOptions.codeBlockRenderOptions,
                    };
                    if (hideToolbar !== undefined) {
                        renderOptions.hideToolbar = hideToolbar;
                    }
                    const codeBlockInfo = { languageId, textModel, codeBlockIndex: globalIndex, codeBlockPartIndex: thisPartIndex, element, range, parentContextKeyService: contextKeyService, vulns, codemapperUri: codeblockEntry?.codemapperUri, renderOptions, chatSessionId: element.sessionId };
                    if (element.isCompleteAddedRequest || !codeblockEntry?.codemapperUri || !codeblockEntry.isEdit) {
                        const ref = this.renderCodeBlock(codeBlockInfo, text, isCodeBlockComplete, currentWidth);
                        this.allRefs.push(ref);
                        // Attach this after updating text/layout of the editor, so it should only be fired when the size updates later (horizontal scrollbar, wrapping)
                        // not during a renderElement OR a progressive render (when we will be firing this event anyway at the end of the render)
                        this._register(ref.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
                        const ownerMarkdownPartId = this.codeblocksPartId;
                        const info = new class {
                            constructor() {
                                this.ownerMarkdownPartId = ownerMarkdownPartId;
                                this.codeBlockIndex = globalIndex;
                                this.elementId = element.id;
                                this.isStreaming = false;
                                this.chatSessionId = element.sessionId;
                                this.codemapperUri = undefined; // will be set async
                                this.uriPromise = textModel.then(model => model.uri);
                            }
                            get uri() {
                                // here we must do a getter because the ref.object is rendered
                                // async and the uri might be undefined when it's read immediately
                                return ref.object.uri;
                            }
                            focus() {
                                ref.object.focus();
                            }
                        }();
                        this.codeblocks.push(info);
                        orderedDisposablesList.push(ref);
                        return ref.object.element;
                    }
                    else {
                        const requestId = isRequestVM(element) ? element.id : element.requestId;
                        const ref = this.renderCodeBlockPill(element.sessionId, requestId, inUndoStop, codeBlockInfo.codemapperUri, !isCodeBlockComplete);
                        if (isResponseVM(codeBlockInfo.element)) {
                            // TODO@joyceerhl: remove this code when we change the codeblockUri API to make the URI available synchronously
                            this.codeBlockModelCollection.update(codeBlockInfo.element.sessionId, codeBlockInfo.element, codeBlockInfo.codeBlockIndex, { text, languageId: codeBlockInfo.languageId, isComplete: isCodeBlockComplete }).then((e) => {
                                // Update the existing object's codemapperUri
                                this.codeblocks[codeBlockInfo.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                                this._onDidChangeHeight.fire();
                            });
                        }
                        this.allRefs.push(ref);
                        const ownerMarkdownPartId = this.codeblocksPartId;
                        const info = new class {
                            constructor() {
                                this.ownerMarkdownPartId = ownerMarkdownPartId;
                                this.codeBlockIndex = globalIndex;
                                this.elementId = element.id;
                                this.isStreaming = !isCodeBlockComplete;
                                this.codemapperUri = codeblockEntry?.codemapperUri;
                                this.chatSessionId = element.sessionId;
                                this.uriPromise = Promise.resolve(undefined);
                            }
                            get uri() {
                                return undefined;
                            }
                            focus() {
                                return ref.object.element.focus();
                            }
                        }();
                        this.codeblocks.push(info);
                        orderedDisposablesList.push(ref);
                        return ref.object.element;
                    }
                },
                asyncRenderCallback: () => this._onDidChangeHeight.fire(),
                markedOptions: markedOpts,
            }, this.domNode));
            const markdownDecorationsRenderer = instantiationService.createInstance(ChatMarkdownDecorationsRenderer);
            this._register(markdownDecorationsRenderer.walkTreeAndAnnotateReferenceLinks(markdown, result.element));
            const layoutParticipants = new Lazy(() => {
                const observer = new ResizeObserver(() => this.mathLayoutParticipants.forEach(layout => layout()));
                observer.observe(this.domNode);
                this._register(toDisposable(() => observer.disconnect()));
                return this.mathLayoutParticipants;
            });
            // Make katex blocks horizontally scrollable
            for (const katexBlock of this.domNode.querySelectorAll('.katex-display')) {
                if (!dom.isHTMLElement(katexBlock)) {
                    continue;
                }
                const scrollable = new DomScrollableElement(katexBlock.cloneNode(true), {
                    vertical: 2 /* ScrollbarVisibility.Hidden */,
                    horizontal: 1 /* ScrollbarVisibility.Auto */,
                });
                orderedDisposablesList.push(scrollable);
                katexBlock.replaceWith(scrollable.getDomNode());
                layoutParticipants.value.add(() => { scrollable.scanDomNode(); });
                scrollable.scanDomNode();
            }
            orderedDisposablesList.reverse().forEach(d => this._register(d));
        };
        if (enableMath && !MarkedKatexSupport.getExtension(dom.getWindow(context.container))) {
            // Need to load async
            MarkedKatexSupport.loadExtension(dom.getWindow(context.container)).then(() => {
                doRenderMarkdown();
            });
        }
        else {
            doRenderMarkdown();
        }
    }
    renderCodeBlockPill(sessionId, requestId, inUndoStop, codemapperUri, isStreaming) {
        const codeBlock = this.instantiationService.createInstance(CollapsedCodeBlock, sessionId, requestId, inUndoStop);
        if (codemapperUri) {
            codeBlock.render(codemapperUri, isStreaming);
        }
        return {
            object: codeBlock,
            isStale: () => false,
            dispose: () => codeBlock.dispose()
        };
    }
    renderCodeBlock(data, text, isComplete, currentWidth) {
        const ref = this.editorPool.get();
        const editorInfo = ref.object;
        if (isResponseVM(data.element)) {
            this.codeBlockModelCollection.update(data.element.sessionId, data.element, data.codeBlockIndex, { text, languageId: data.languageId, isComplete }).then((e) => {
                // Update the existing object's codemapperUri
                this.codeblocks[data.codeBlockPartIndex].codemapperUri = e.codemapperUri;
                this._onDidChangeHeight.fire();
            });
        }
        editorInfo.render(data, currentWidth);
        return ref;
    }
    hasSameContent(other) {
        return other.kind === 'markdownContent' && !!(other.content.value === this.markdown.content.value
            || this.codeblocks.at(-1)?.isStreaming && this.codeblocks.at(-1)?.codemapperUri !== undefined && other.content.value.lastIndexOf('```') === this.markdown.content.value.lastIndexOf('```'));
    }
    layout(width) {
        this.allRefs.forEach((ref, index) => {
            if (ref.object instanceof CodeBlockPart) {
                ref.object.layout(width);
            }
            else if (ref.object instanceof CollapsedCodeBlock) {
                const codeblockModel = this.codeblocks[index];
                if (codeblockModel.codemapperUri && ref.object.uri?.toString() !== codeblockModel.codemapperUri.toString()) {
                    ref.object.render(codeblockModel.codemapperUri, codeblockModel.isStreaming);
                }
            }
        });
        this.mathLayoutParticipants.forEach(layout => layout());
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMarkdownContentPart = ChatMarkdownContentPart_1 = __decorate([
    __param(9, IContextKeyService),
    __param(10, IConfigurationService),
    __param(11, ITextModelService),
    __param(12, IInstantiationService)
], ChatMarkdownContentPart);
export { ChatMarkdownContentPart };
let EditorPool = class EditorPool extends Disposable {
    inUse() {
        return this._pool.inUse;
    }
    constructor(options, delegate, overflowWidgetsDomNode, isSimpleWidget = false, instantiationService) {
        super();
        this.isSimpleWidget = isSimpleWidget;
        this._pool = this._register(new ResourcePool(() => {
            return instantiationService.createInstance(CodeBlockPart, options, MenuId.ChatCodeBlock, delegate, overflowWidgetsDomNode, this.isSimpleWidget);
        }));
    }
    get() {
        const codeBlock = this._pool.get();
        let stale = false;
        return {
            object: codeBlock,
            isStale: () => stale,
            dispose: () => {
                codeBlock.reset();
                stale = true;
                this._pool.release(codeBlock);
            }
        };
    }
};
EditorPool = __decorate([
    __param(4, IInstantiationService)
], EditorPool);
export { EditorPool };
export function codeblockHasClosingBackticks(str) {
    str = str.trim();
    return !!str.match(/\n```+$/);
}
let CollapsedCodeBlock = class CollapsedCodeBlock extends Disposable {
    get uri() {
        return this._uri;
    }
    constructor(sessionId, requestId, inUndoStop, labelService, editorService, modelService, languageService, contextMenuService, contextKeyService, menuService, hoverService, chatService) {
        super();
        this.sessionId = sessionId;
        this.requestId = requestId;
        this.inUndoStop = inUndoStop;
        this.labelService = labelService;
        this.editorService = editorService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextMenuService = contextMenuService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.hover = this._register(new MutableDisposable());
        this._progressStore = this._store.add(new DisposableStore());
        this.element = $('.chat-codeblock-pill-widget');
        this.element.tabIndex = 0;
        this.element.classList.add('show-file-icons');
        this.element.role = 'button';
        this._register(dom.addDisposableListener(this.element, 'click', () => this._showDiff()));
        this._register(dom.addDisposableListener(this.element, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                this._showDiff();
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.CONTEXT_MENU, domEvent => {
            const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
            dom.EventHelper.stop(domEvent, true);
            this.contextMenuService.showContextMenu({
                contextKeyService: this.contextKeyService,
                getAnchor: () => event,
                getActions: () => {
                    const menu = this.menuService.getMenuActions(MenuId.ChatEditingCodeBlockContext, this.contextKeyService, { arg: { sessionId, requestId, uri: this.uri, stopId: inUndoStop } });
                    return getFlatContextMenuActions(menu);
                },
            });
        }));
    }
    _showDiff() {
        if (this._currentDiff) {
            this.editorService.openEditor({
                original: { resource: this._currentDiff.originalURI },
                modified: { resource: this._currentDiff.modifiedURI },
                options: { transient: true },
            });
        }
        else if (this.uri) {
            this.editorService.openEditor({ resource: this.uri });
        }
    }
    render(uri, isStreaming) {
        this._progressStore.clear();
        this._uri = uri;
        const session = this.chatService.getSession(this.sessionId);
        const iconText = this.labelService.getUriBasenameLabel(uri);
        let editSession = session?.editingSessionObs?.promiseResult.get()?.data;
        let modifiedEntry = editSession?.getEntry(uri);
        let modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.get();
        const isComplete = !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
        let iconClasses = [];
        if (isStreaming || !isComplete) {
            const codicon = ThemeIcon.modify(Codicon.loading, 'spin');
            iconClasses = ThemeIcon.asClassNameArray(codicon);
        }
        else {
            const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            iconClasses = getIconClasses(this.modelService, this.languageService, uri, fileKind);
        }
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        const children = [dom.$('span.icon-label', {}, iconText)];
        const labelDetail = dom.$('span.label-detail', {}, '');
        children.push(labelDetail);
        if (isStreaming) {
            labelDetail.textContent = localize('chat.codeblock.generating', "Generating edits...");
        }
        this.element.replaceChildren(iconEl, ...children);
        this.updateTooltip(this.labelService.getUriLabel(uri, { relative: false }));
        const renderDiff = (changes) => {
            const labelAdded = this.element.querySelector('.label-added') ?? this.element.appendChild(dom.$('span.label-added'));
            const labelRemoved = this.element.querySelector('.label-removed') ?? this.element.appendChild(dom.$('span.label-removed'));
            if (changes && !changes?.identical && !changes?.quitEarly) {
                this._currentDiff = changes;
                labelAdded.textContent = `+${changes.added}`;
                labelRemoved.textContent = `-${changes.removed}`;
                const insertionsFragment = changes.added === 1 ? localize('chat.codeblock.insertions.one', "1 insertion") : localize('chat.codeblock.insertions', "{0} insertions", changes.added);
                const deletionsFragment = changes.removed === 1 ? localize('chat.codeblock.deletions.one', "1 deletion") : localize('chat.codeblock.deletions', "{0} deletions", changes.removed);
                const summary = localize('summary', 'Edited {0}, {1}, {2}', iconText, insertionsFragment, deletionsFragment);
                this.element.ariaLabel = summary;
                this.updateTooltip(summary);
            }
        };
        let diffBetweenStops;
        // Show a percentage progress that is driven by the rewrite
        this._progressStore.add(autorun(r => {
            if (!editSession) {
                editSession = session?.editingSessionObs?.promiseResult.read(r)?.data;
                modifiedEntry = editSession?.getEntry(uri);
            }
            modifiedByResponse = modifiedEntry?.isCurrentlyBeingModifiedBy.read(r);
            let diffValue = diffBetweenStops?.read(r);
            const isComplete = !!diffValue || !modifiedByResponse || modifiedByResponse.requestId !== this.requestId;
            const rewriteRatio = modifiedEntry?.rewriteRatio.read(r);
            if (!isStreaming && !isComplete) {
                const value = rewriteRatio;
                labelDetail.textContent = value === 0 || !value ? localize('chat.codeblock.generating', "Generating edits...") : localize('chat.codeblock.applyingPercentage', "Applying edits ({0}%)...", Math.round(value * 100));
            }
            else if (!isStreaming && isComplete) {
                iconEl.classList.remove(...iconClasses);
                const fileKind = uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
                iconEl.classList.add(...getIconClasses(this.modelService, this.languageService, uri, fileKind));
                labelDetail.textContent = '';
            }
            if (!diffBetweenStops) {
                diffBetweenStops = modifiedEntry && editSession
                    ? editSession.getEntryDiffBetweenStops(modifiedEntry.modifiedURI, this.requestId, this.inUndoStop)
                    : undefined;
                diffValue = diffBetweenStops?.read(r);
            }
            if (!isStreaming && isComplete) {
                renderDiff(diffValue);
            }
        }));
    }
    updateTooltip(tooltip) {
        this.tooltip = tooltip;
        if (!this.hover.value) {
            this.hover.value = this.hoverService.setupDelayedHover(this.element, () => ({
                content: this.tooltip,
                appearance: { compact: true, showPointer: true },
                position: { hoverPosition: 2 /* HoverPosition.BELOW */ },
                persistence: { hideOnKeyDown: true },
            }));
        }
    }
};
CollapsedCodeBlock = __decorate([
    __param(3, ILabelService),
    __param(4, IEditorService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, IContextMenuService),
    __param(8, IContextKeyService),
    __param(9, IMenuService),
    __param(10, IHoverService),
    __param(11, IChatService)
], CollapsedCodeBlock);
export { CollapsedCodeBlock };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRNYXJrZG93bkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSw2QkFBNkIsRUFBaUIsTUFBTSxpREFBaUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxD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