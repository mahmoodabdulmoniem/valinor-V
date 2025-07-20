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
var ParameterHintsWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import './parameterHints.css';
import { EDITOR_FONT_DEFAULTS } from '../../../common/config/editorOptions.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { MarkdownRenderer } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { Context } from './provideSignatureHelp.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { listHighlightForeground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const $ = dom.$;
const parameterHintsNextIcon = registerIcon('parameter-hints-next', Codicon.chevronDown, nls.localize('parameterHintsNextIcon', 'Icon for show next parameter hint.'));
const parameterHintsPreviousIcon = registerIcon('parameter-hints-previous', Codicon.chevronUp, nls.localize('parameterHintsPreviousIcon', 'Icon for show previous parameter hint.'));
let ParameterHintsWidget = class ParameterHintsWidget extends Disposable {
    static { ParameterHintsWidget_1 = this; }
    static { this.ID = 'editor.widget.parameterHintsWidget'; }
    constructor(editor, model, contextKeyService, openerService, languageService) {
        super();
        this.editor = editor;
        this.model = model;
        this.renderDisposeables = this._register(new DisposableStore());
        this.visible = false;
        this.announcedLabel = null;
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.markdownRenderer = new MarkdownRenderer({ editor }, languageService, openerService);
        this.keyVisible = Context.Visible.bindTo(contextKeyService);
        this.keyMultipleSignatures = Context.MultipleSignatures.bindTo(contextKeyService);
    }
    createParameterHintDOMNodes() {
        const element = $('.editor-widget.parameter-hints-widget');
        const wrapper = dom.append(element, $('.phwrapper'));
        wrapper.tabIndex = -1;
        const controls = dom.append(wrapper, $('.controls'));
        const previous = dom.append(controls, $('.button' + ThemeIcon.asCSSSelector(parameterHintsPreviousIcon)));
        const overloads = dom.append(controls, $('.overloads'));
        const next = dom.append(controls, $('.button' + ThemeIcon.asCSSSelector(parameterHintsNextIcon)));
        this._register(dom.addDisposableListener(previous, 'click', e => {
            dom.EventHelper.stop(e);
            this.previous();
        }));
        this._register(dom.addDisposableListener(next, 'click', e => {
            dom.EventHelper.stop(e);
            this.next();
        }));
        const body = $('.body');
        const scrollbar = new DomScrollableElement(body, {
            alwaysConsumeMouseWheel: true,
        });
        this._register(scrollbar);
        wrapper.appendChild(scrollbar.getDomNode());
        const signature = dom.append(body, $('.signature'));
        const docs = dom.append(body, $('.docs'));
        element.style.userSelect = 'text';
        this.domNodes = {
            element,
            signature,
            overloads,
            docs,
            scrollbar,
        };
        this.editor.addContentWidget(this);
        this.hide();
        this._register(this.editor.onDidChangeCursorSelection(e => {
            if (this.visible) {
                this.editor.layoutContentWidget(this);
            }
        }));
        const updateFont = () => {
            if (!this.domNodes) {
                return;
            }
            const fontInfo = this.editor.getOption(59 /* EditorOption.fontInfo */);
            const element = this.domNodes.element;
            element.style.fontSize = `${fontInfo.fontSize}px`;
            element.style.lineHeight = `${fontInfo.lineHeight / fontInfo.fontSize}`;
            element.style.setProperty('--vscode-parameterHintsWidget-editorFontFamily', fontInfo.fontFamily);
            element.style.setProperty('--vscode-parameterHintsWidget-editorFontFamilyDefault', EDITOR_FONT_DEFAULTS.fontFamily);
        };
        updateFont();
        this._register(Event.chain(this.editor.onDidChangeConfiguration.bind(this.editor), $ => $.filter(e => e.hasChanged(59 /* EditorOption.fontInfo */)))(updateFont));
        this._register(this.editor.onDidLayoutChange(e => this.updateMaxHeight()));
        this.updateMaxHeight();
    }
    show() {
        if (this.visible) {
            return;
        }
        if (!this.domNodes) {
            this.createParameterHintDOMNodes();
        }
        this.keyVisible.set(true);
        this.visible = true;
        setTimeout(() => {
            this.domNodes?.element.classList.add('visible');
        }, 100);
        this.editor.layoutContentWidget(this);
    }
    hide() {
        this.renderDisposeables.clear();
        if (!this.visible) {
            return;
        }
        this.keyVisible.reset();
        this.visible = false;
        this.announcedLabel = null;
        this.domNodes?.element.classList.remove('visible');
        this.editor.layoutContentWidget(this);
    }
    getPosition() {
        if (this.visible) {
            return {
                position: this.editor.getPosition(),
                preference: [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */]
            };
        }
        return null;
    }
    render(hints) {
        this.renderDisposeables.clear();
        if (!this.domNodes) {
            return;
        }
        const multiple = hints.signatures.length > 1;
        this.domNodes.element.classList.toggle('multiple', multiple);
        this.keyMultipleSignatures.set(multiple);
        this.domNodes.signature.innerText = '';
        this.domNodes.docs.innerText = '';
        const signature = hints.signatures[hints.activeSignature];
        if (!signature) {
            return;
        }
        const code = dom.append(this.domNodes.signature, $('.code'));
        const hasParameters = signature.parameters.length > 0;
        const activeParameterIndex = signature.activeParameter ?? hints.activeParameter;
        if (!hasParameters) {
            const label = dom.append(code, $('span'));
            label.textContent = signature.label;
        }
        else {
            this.renderParameters(code, signature, activeParameterIndex);
        }
        const activeParameter = signature.parameters[activeParameterIndex];
        if (activeParameter?.documentation) {
            const documentation = $('span.documentation');
            if (typeof activeParameter.documentation === 'string') {
                documentation.textContent = activeParameter.documentation;
            }
            else {
                const renderedContents = this.renderMarkdownDocs(activeParameter.documentation);
                documentation.appendChild(renderedContents.element);
            }
            dom.append(this.domNodes.docs, $('p', {}, documentation));
        }
        if (signature.documentation === undefined) {
            /** no op */
        }
        else if (typeof signature.documentation === 'string') {
            dom.append(this.domNodes.docs, $('p', {}, signature.documentation));
        }
        else {
            const renderedContents = this.renderMarkdownDocs(signature.documentation);
            dom.append(this.domNodes.docs, renderedContents.element);
        }
        const hasDocs = this.hasDocs(signature, activeParameter);
        this.domNodes.signature.classList.toggle('has-docs', hasDocs);
        this.domNodes.docs.classList.toggle('empty', !hasDocs);
        this.domNodes.overloads.textContent =
            String(hints.activeSignature + 1).padStart(hints.signatures.length.toString().length, '0') + '/' + hints.signatures.length;
        if (activeParameter) {
            let labelToAnnounce = '';
            const param = signature.parameters[activeParameterIndex];
            if (Array.isArray(param.label)) {
                labelToAnnounce = signature.label.substring(param.label[0], param.label[1]);
            }
            else {
                labelToAnnounce = param.label;
            }
            if (param.documentation) {
                labelToAnnounce += typeof param.documentation === 'string' ? `, ${param.documentation}` : `, ${param.documentation.value}`;
            }
            if (signature.documentation) {
                labelToAnnounce += typeof signature.documentation === 'string' ? `, ${signature.documentation}` : `, ${signature.documentation.value}`;
            }
            // Select method gets called on every user type while parameter hints are visible.
            // We do not want to spam the user with same announcements, so we only announce if the current parameter changed.
            if (this.announcedLabel !== labelToAnnounce) {
                aria.alert(nls.localize('hint', "{0}, hint", labelToAnnounce));
                this.announcedLabel = labelToAnnounce;
            }
        }
        this.editor.layoutContentWidget(this);
        this.domNodes.scrollbar.scanDomNode();
    }
    renderMarkdownDocs(markdown) {
        const renderedContents = this.renderDisposeables.add(this.markdownRenderer.render(markdown, {
            asyncRenderCallback: () => {
                this.domNodes?.scrollbar.scanDomNode();
            }
        }));
        renderedContents.element.classList.add('markdown-docs');
        return renderedContents;
    }
    hasDocs(signature, activeParameter) {
        if (activeParameter && typeof activeParameter.documentation === 'string' && assertReturnsDefined(activeParameter.documentation).length > 0) {
            return true;
        }
        if (activeParameter && typeof activeParameter.documentation === 'object' && assertReturnsDefined(activeParameter.documentation).value.length > 0) {
            return true;
        }
        if (signature.documentation && typeof signature.documentation === 'string' && assertReturnsDefined(signature.documentation).length > 0) {
            return true;
        }
        if (signature.documentation && typeof signature.documentation === 'object' && assertReturnsDefined(signature.documentation.value).length > 0) {
            return true;
        }
        return false;
    }
    renderParameters(parent, signature, activeParameterIndex) {
        const [start, end] = this.getParameterLabelOffsets(signature, activeParameterIndex);
        const beforeSpan = document.createElement('span');
        beforeSpan.textContent = signature.label.substring(0, start);
        const paramSpan = document.createElement('span');
        paramSpan.textContent = signature.label.substring(start, end);
        paramSpan.className = 'parameter active';
        const afterSpan = document.createElement('span');
        afterSpan.textContent = signature.label.substring(end);
        dom.append(parent, beforeSpan, paramSpan, afterSpan);
    }
    getParameterLabelOffsets(signature, paramIdx) {
        const param = signature.parameters[paramIdx];
        if (!param) {
            return [0, 0];
        }
        else if (Array.isArray(param.label)) {
            return param.label;
        }
        else if (!param.label.length) {
            return [0, 0];
        }
        else {
            const regex = new RegExp(`(\\W|^)${escapeRegExpCharacters(param.label)}(?=\\W|$)`, 'g');
            regex.test(signature.label);
            const idx = regex.lastIndex - param.label.length;
            return idx >= 0
                ? [idx, regex.lastIndex]
                : [0, 0];
        }
    }
    next() {
        this.editor.focus();
        this.model.next();
    }
    previous() {
        this.editor.focus();
        this.model.previous();
    }
    getDomNode() {
        if (!this.domNodes) {
            this.createParameterHintDOMNodes();
        }
        return this.domNodes.element;
    }
    getId() {
        return ParameterHintsWidget_1.ID;
    }
    updateMaxHeight() {
        if (!this.domNodes) {
            return;
        }
        const height = Math.max(this.editor.getLayoutInfo().height / 4, 250);
        const maxHeight = `${height}px`;
        this.domNodes.element.style.maxHeight = maxHeight;
        const wrapper = this.domNodes.element.getElementsByClassName('phwrapper');
        if (wrapper.length) {
            wrapper[0].style.maxHeight = maxHeight;
        }
    }
};
ParameterHintsWidget = ParameterHintsWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IOpenerService),
    __param(4, ILanguageService)
], ParameterHintsWidget);
export { ParameterHintsWidget };
registerColor('editorHoverWidget.highlightForeground', listHighlightForeground, nls.localize('editorHoverWidgetHighlightForeground', 'Foreground color of the active item in the parameter hint.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BhcmFtZXRlckhpbnRzL2Jyb3dzZXIvcGFyYW1ldGVySGludHNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxzQkFBc0IsQ0FBQztBQUU5QixPQUFPLEVBQUUsb0JBQW9CLEVBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFFN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUF5QixnQkFBZ0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBRS9ILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFB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