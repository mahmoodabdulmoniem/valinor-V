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
var WalkThroughPart_1;
import '../common/walkThroughUtils.js';
import './media/walkThroughPart.css';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { dispose, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { WalkThroughInput } from './walkThroughInput.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { localize } from '../../../../nls.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { RawContextKey, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isObject } from '../../../../base/common/types.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { OS } from '../../../../base/common/platform.js';
import { deepClone } from '../../../../base/common/objects.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { addDisposableListener, isHTMLAnchorElement, isHTMLButtonElement, isHTMLElement, size } from '../../../../base/browser/dom.js';
import * as domSanitize from '../../../../base/browser/domSanitize.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
export const WALK_THROUGH_FOCUS = new RawContextKey('interactivePlaygroundFocus', false);
const UNBOUND_COMMAND = localize('walkThrough.unboundCommand', "unbound");
const WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'walkThroughEditorViewState';
let WalkThroughPart = class WalkThroughPart extends EditorPane {
    static { WalkThroughPart_1 = this; }
    static { this.ID = 'workbench.editor.walkThroughPart'; }
    constructor(group, telemetryService, themeService, textResourceConfigurationService, instantiationService, openerService, keybindingService, storageService, contextKeyService, configurationService, notificationService, extensionService, editorGroupService) {
        super(WalkThroughPart_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.disposables = new DisposableStore();
        this.contentDisposables = [];
        this.editorFocus = WALK_THROUGH_FOCUS.bindTo(this.contextKeyService);
        this.editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, WALK_THROUGH_EDITOR_VIEW_STATE_PREFERENCE_KEY);
    }
    createEditor(container) {
        this.content = document.createElement('div');
        this.content.classList.add('welcomePageFocusElement');
        this.content.tabIndex = 0;
        this.content.style.outlineStyle = 'none';
        this.scrollbar = new DomScrollableElement(this.content, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */
        });
        this.disposables.add(this.scrollbar);
        container.appendChild(this.scrollbar.getDomNode());
        this.registerFocusHandlers();
        this.registerClickHandler();
        this.disposables.add(this.scrollbar.onScroll(e => this.updatedScrollPosition()));
    }
    updatedScrollPosition() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        const scrollHeight = scrollDimensions.scrollHeight;
        if (scrollHeight && this.input instanceof WalkThroughInput) {
            const scrollTop = scrollPosition.scrollTop;
            const height = scrollDimensions.height;
            this.input.relativeScrollPosition(scrollTop / scrollHeight, (scrollTop + height) / scrollHeight);
        }
    }
    onTouchChange(event) {
        event.preventDefault();
        event.stopPropagation();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - event.translationY });
    }
    addEventListener(element, type, listener, useCapture) {
        element.addEventListener(type, listener, useCapture);
        return toDisposable(() => { element.removeEventListener(type, listener, useCapture); });
    }
    registerFocusHandlers() {
        this.disposables.add(this.addEventListener(this.content, 'mousedown', e => {
            this.focus();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focus', e => {
            this.editorFocus.set(true);
        }));
        this.disposables.add(this.addEventListener(this.content, 'blur', e => {
            this.editorFocus.reset();
        }));
        this.disposables.add(this.addEventListener(this.content, 'focusin', (e) => {
            // Work around scrolling as side-effect of setting focus on the offscreen zone widget (#18929)
            if (isHTMLElement(e.target) && e.target.classList.contains('zone-widget-container')) {
                const scrollPosition = this.scrollbar.getScrollPosition();
                this.content.scrollTop = scrollPosition.scrollTop;
                this.content.scrollLeft = scrollPosition.scrollLeft;
            }
            if (isHTMLElement(e.target)) {
                this.lastFocus = e.target;
            }
        }));
    }
    registerClickHandler() {
        this.content.addEventListener('click', event => {
            for (let node = event.target; node; node = node.parentNode) {
                if (isHTMLAnchorElement(node) && node.href) {
                    const baseElement = node.ownerDocument.getElementsByTagName('base')[0] || this.window.location;
                    if (baseElement && node.href.indexOf(baseElement.href) >= 0 && node.hash) {
                        const scrollTarget = this.content.querySelector(node.hash);
                        const innerContent = this.content.firstElementChild;
                        if (scrollTarget && innerContent) {
                            const targetTop = scrollTarget.getBoundingClientRect().top - 20;
                            const containerTop = innerContent.getBoundingClientRect().top;
                            this.scrollbar.setScrollPosition({ scrollTop: targetTop - containerTop });
                        }
                    }
                    else {
                        this.open(URI.parse(node.href));
                    }
                    event.preventDefault();
                    break;
                }
                else if (isHTMLButtonElement(node)) {
                    const href = node.getAttribute('data-href');
                    if (href) {
                        this.open(URI.parse(href));
                    }
                    break;
                }
                else if (node === event.currentTarget) {
                    break;
                }
            }
        });
    }
    open(uri) {
        if (uri.scheme === 'command' && uri.path === 'git.clone' && !CommandsRegistry.getCommand('git.clone')) {
            this.notificationService.info(localize('walkThrough.gitNotFound', "It looks like Git is not installed on your system."));
            return;
        }
        this.openerService.open(this.addFrom(uri), { allowCommands: true });
    }
    addFrom(uri) {
        if (uri.scheme !== 'command' || !(this.input instanceof WalkThroughInput)) {
            return uri;
        }
        const query = uri.query ? JSON.parse(uri.query) : {};
        query.from = this.input.getTelemetryFrom();
        return uri.with({ query: JSON.stringify(query) });
    }
    layout(dimension) {
        this.size = dimension;
        size(this.content, dimension.width, dimension.height);
        this.updateSizeClasses();
        this.contentDisposables.forEach(disposable => {
            if (disposable instanceof CodeEditorWidget) {
                disposable.layout();
            }
        });
        const walkthroughInput = this.input instanceof WalkThroughInput && this.input;
        if (walkthroughInput && walkthroughInput.layout) {
            walkthroughInput.layout(dimension);
        }
        this.scrollbar.scanDomNode();
    }
    updateSizeClasses() {
        const innerContent = this.content.firstElementChild;
        if (this.size && innerContent) {
            innerContent.classList.toggle('max-height-685px', this.size.height <= 685);
        }
    }
    focus() {
        super.focus();
        let active = this.content.ownerDocument.activeElement;
        while (active && active !== this.content) {
            active = active.parentElement;
        }
        if (!active) {
            (this.lastFocus || this.content).focus();
        }
        this.editorFocus.set(true);
    }
    arrowUp() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - this.getArrowScrollHeight() });
    }
    arrowDown() {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + this.getArrowScrollHeight() });
    }
    getArrowScrollHeight() {
        let fontSize = this.configurationService.getValue('editor.fontSize');
        if (typeof fontSize !== 'number' || fontSize < 1) {
            fontSize = 12;
        }
        return 3 * fontSize;
    }
    pageUp() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop - scrollDimensions.height });
    }
    pageDown() {
        const scrollDimensions = this.scrollbar.getScrollDimensions();
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.scrollbar.setScrollPosition({ scrollTop: scrollPosition.scrollTop + scrollDimensions.height });
    }
    setInput(input, options, context, token) {
        const store = new DisposableStore();
        this.contentDisposables.push(store);
        this.content.innerText = '';
        return super.setInput(input, options, context, token)
            .then(async () => {
            if (input.resource.path.endsWith('.md')) {
                await this.extensionService.whenInstalledExtensionsRegistered();
            }
            return input.resolve();
        })
            .then(model => {
            if (token.isCancellationRequested) {
                return;
            }
            const content = model.main;
            if (!input.resource.path.endsWith('.md')) {
                this.safeSetInnerHtml(this.content, content);
                this.updateSizeClasses();
                this.decorateContent();
                this.contentDisposables.push(this.keybindingService.onDidUpdateKeybindings(() => this.decorateContent()));
                input.onReady?.(this.content.firstElementChild, store);
                this.scrollbar.scanDomNode();
                this.loadTextEditorViewState(input);
                this.updatedScrollPosition();
                return;
            }
            const innerContent = document.createElement('div');
            innerContent.classList.add('walkThroughContent'); // only for markdown files
            const markdown = this.expandMacros(content);
            this.safeSetInnerHtml(innerContent, markdown);
            this.content.appendChild(innerContent);
            model.snippets.forEach((snippet, i) => {
                const model = snippet.textEditorModel;
                if (!model) {
                    return;
                }
                const id = `snippet-${model.uri.fragment}`;
                const div = innerContent.querySelector(`#${id.replace(/[\\.]/g, '\\$&')}`);
                const options = this.getEditorOptions(model.getLanguageId());
                const telemetryData = {
                    target: this.input instanceof WalkThroughInput ? this.input.getTelemetryFrom() : undefined,
                    snippet: i
                };
                const editor = this.instantiationService.createInstance(CodeEditorWidget, div, options, {
                    telemetryData: telemetryData
                });
                editor.setModel(model);
                this.contentDisposables.push(editor);
                const updateHeight = (initial) => {
                    const lineHeight = editor.getOption(75 /* EditorOption.lineHeight */);
                    const height = `${Math.max(model.getLineCount() + 1, 4) * lineHeight}px`;
                    if (div.style.height !== height) {
                        div.style.height = height;
                        editor.layout();
                        if (!initial) {
                            this.scrollbar.scanDomNode();
                        }
                    }
                };
                updateHeight(true);
                this.contentDisposables.push(editor.onDidChangeModelContent(() => updateHeight(false)));
                this.contentDisposables.push(editor.onDidChangeCursorPosition(e => {
                    const innerContent = this.content.firstElementChild;
                    if (innerContent) {
                        const targetTop = div.getBoundingClientRect().top;
                        const containerTop = innerContent.getBoundingClientRect().top;
                        const lineHeight = editor.getOption(75 /* EditorOption.lineHeight */);
                        const lineTop = (targetTop + (e.position.lineNumber - 1) * lineHeight) - containerTop;
                        const lineBottom = lineTop + lineHeight;
                        const scrollDimensions = this.scrollbar.getScrollDimensions();
                        const scrollPosition = this.scrollbar.getScrollPosition();
                        const scrollTop = scrollPosition.scrollTop;
                        const height = scrollDimensions.height;
                        if (scrollTop > lineTop) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineTop });
                        }
                        else if (scrollTop < lineBottom - height) {
                            this.scrollbar.setScrollPosition({ scrollTop: lineBottom - height });
                        }
                    }
                }));
                this.contentDisposables.push(this.configurationService.onDidChangeConfiguration(e => {
                    if (e.affectsConfiguration('editor') && snippet.textEditorModel) {
                        editor.updateOptions(this.getEditorOptions(snippet.textEditorModel.getLanguageId()));
                    }
                }));
            });
            this.updateSizeClasses();
            this.multiCursorModifier();
            this.contentDisposables.push(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('editor.multiCursorModifier')) {
                    this.multiCursorModifier();
                }
            }));
            input.onReady?.(innerContent, store);
            this.scrollbar.scanDomNode();
            this.loadTextEditorViewState(input);
            this.updatedScrollPosition();
            this.contentDisposables.push(Gesture.addTarget(innerContent));
            this.contentDisposables.push(addDisposableListener(innerContent, TouchEventType.Change, e => this.onTouchChange(e)));
        });
    }
    safeSetInnerHtml(node, content) {
        domSanitize.safeSetInnerHtml(node, content, {
            allowedAttributes: {
                augment: [
                    'id',
                    'class',
                    'style',
                    'data-command',
                    'data-href',
                ]
            }
        });
    }
    getEditorOptions(language) {
        const config = deepClone(this.configurationService.getValue('editor', { overrideIdentifier: language }));
        return {
            ...isObject(config) ? config : Object.create(null),
            scrollBeyondLastLine: false,
            scrollbar: {
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false
            },
            overviewRulerLanes: 3,
            fixedOverflowWidgets: false,
            lineNumbersMinChars: 1,
            minimap: { enabled: false },
        };
    }
    expandMacros(input) {
        return input.replace(/kb\(([a-z.\d\-]+)\)/gi, (match, kb) => {
            const keybinding = this.keybindingService.lookupKeybinding(kb);
            const shortcut = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            return `<span class="shortcut">${strings.escape(shortcut)}</span>`;
        });
    }
    decorateContent() {
        const keys = this.content.querySelectorAll('.shortcut[data-command]');
        Array.prototype.forEach.call(keys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            const label = keybinding ? keybinding.getLabel() || '' : UNBOUND_COMMAND;
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(label));
        });
        const ifkeys = this.content.querySelectorAll('.if_shortcut[data-command]');
        Array.prototype.forEach.call(ifkeys, (key) => {
            const command = key.getAttribute('data-command');
            const keybinding = command && this.keybindingService.lookupKeybinding(command);
            key.style.display = !keybinding ? 'none' : '';
        });
    }
    multiCursorModifier() {
        const labels = UILabelProvider.modifierLabels[OS];
        const value = this.configurationService.getValue('editor.multiCursorModifier');
        const modifier = labels[value === 'ctrlCmd' ? (OS === 2 /* OperatingSystem.Macintosh */ ? 'metaKey' : 'ctrlKey') : 'altKey'];
        const keys = this.content.querySelectorAll('.multi-cursor-modifier');
        Array.prototype.forEach.call(keys, (key) => {
            while (key.firstChild) {
                key.firstChild.remove();
            }
            key.appendChild(document.createTextNode(modifier));
        });
    }
    saveTextEditorViewState(input) {
        const scrollPosition = this.scrollbar.getScrollPosition();
        this.editorMemento.saveEditorState(this.group, input, {
            viewState: {
                scrollTop: scrollPosition.scrollTop,
                scrollLeft: scrollPosition.scrollLeft
            }
        });
    }
    loadTextEditorViewState(input) {
        const state = this.editorMemento.loadEditorState(this.group, input);
        if (state) {
            this.scrollbar.setScrollPosition(state.viewState);
        }
    }
    clearInput() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        this.contentDisposables = dispose(this.contentDisposables);
        super.clearInput();
    }
    saveState() {
        if (this.input instanceof WalkThroughInput) {
            this.saveTextEditorViewState(this.input);
        }
        super.saveState();
    }
    dispose() {
        this.editorFocus.reset();
        this.contentDisposables = dispose(this.contentDisposables);
        this.disposables.dispose();
        super.dispose();
    }
};
WalkThroughPart = WalkThroughPart_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IOpenerService),
    __param(6, IKeybindingService),
    __param(7, IStorageService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, INotificationService),
    __param(11, IExtensionService),
    __param(12, IEditorGroupsService)
], WalkThroughPart);
export { WalkThroughPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lV2Fsa3Rocm91Z2gvYnJvd3Nlci93YWxrVGhyb3VnaFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBZ0IsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFdkcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFM0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FB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