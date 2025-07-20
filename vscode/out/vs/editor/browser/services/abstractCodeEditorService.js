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
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheets from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, Disposable, toDisposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import * as strings from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { isThemeColor } from '../../common/editorCommon.js';
import { OverviewRulerLane } from '../../common/model.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
let AbstractCodeEditorService = class AbstractCodeEditorService extends Disposable {
    constructor(_themeService) {
        super();
        this._themeService = _themeService;
        this._onWillCreateCodeEditor = this._register(new Emitter());
        this.onWillCreateCodeEditor = this._onWillCreateCodeEditor.event;
        this._onCodeEditorAdd = this._register(new Emitter());
        this.onCodeEditorAdd = this._onCodeEditorAdd.event;
        this._onCodeEditorRemove = this._register(new Emitter());
        this.onCodeEditorRemove = this._onCodeEditorRemove.event;
        this._onWillCreateDiffEditor = this._register(new Emitter());
        this.onWillCreateDiffEditor = this._onWillCreateDiffEditor.event;
        this._onDiffEditorAdd = this._register(new Emitter());
        this.onDiffEditorAdd = this._onDiffEditorAdd.event;
        this._onDiffEditorRemove = this._register(new Emitter());
        this.onDiffEditorRemove = this._onDiffEditorRemove.event;
        this._onDidChangeTransientModelProperty = this._register(new Emitter());
        this.onDidChangeTransientModelProperty = this._onDidChangeTransientModelProperty.event;
        this._onDecorationTypeRegistered = this._register(new Emitter());
        this.onDecorationTypeRegistered = this._onDecorationTypeRegistered.event;
        this._decorationOptionProviders = new Map();
        this._editorStyleSheets = new Map();
        this._codeEditorOpenHandlers = new LinkedList();
        this._transientWatchers = this._register(new DisposableMap());
        this._modelProperties = new Map();
        this._codeEditors = Object.create(null);
        this._diffEditors = Object.create(null);
        this._globalStyleSheet = null;
    }
    willCreateCodeEditor() {
        this._onWillCreateCodeEditor.fire();
    }
    addCodeEditor(editor) {
        this._codeEditors[editor.getId()] = editor;
        this._onCodeEditorAdd.fire(editor);
    }
    removeCodeEditor(editor) {
        if (delete this._codeEditors[editor.getId()]) {
            this._onCodeEditorRemove.fire(editor);
        }
    }
    listCodeEditors() {
        return Object.keys(this._codeEditors).map(id => this._codeEditors[id]);
    }
    willCreateDiffEditor() {
        this._onWillCreateDiffEditor.fire();
    }
    addDiffEditor(editor) {
        this._diffEditors[editor.getId()] = editor;
        this._onDiffEditorAdd.fire(editor);
    }
    removeDiffEditor(editor) {
        if (delete this._diffEditors[editor.getId()]) {
            this._onDiffEditorRemove.fire(editor);
        }
    }
    listDiffEditors() {
        return Object.keys(this._diffEditors).map(id => this._diffEditors[id]);
    }
    getFocusedCodeEditor() {
        let editorWithWidgetFocus = null;
        const editors = this.listCodeEditors();
        for (const editor of editors) {
            if (editor.hasTextFocus()) {
                // bingo!
                return editor;
            }
            if (editor.hasWidgetFocus()) {
                editorWithWidgetFocus = editor;
            }
        }
        return editorWithWidgetFocus;
    }
    _getOrCreateGlobalStyleSheet() {
        if (!this._globalStyleSheet) {
            this._globalStyleSheet = this._createGlobalStyleSheet();
        }
        return this._globalStyleSheet;
    }
    _createGlobalStyleSheet() {
        return new GlobalStyleSheet(domStylesheets.createStyleSheet());
    }
    _getOrCreateStyleSheet(editor) {
        if (!editor) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const domNode = editor.getContainerDomNode();
        if (!dom.isInShadowDOM(domNode)) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const editorId = editor.getId();
        if (!this._editorStyleSheets.has(editorId)) {
            const refCountedStyleSheet = new RefCountedStyleSheet(this, editorId, domStylesheets.createStyleSheet(domNode));
            this._editorStyleSheets.set(editorId, refCountedStyleSheet);
        }
        return this._editorStyleSheets.get(editorId);
    }
    _removeEditorStyleSheets(editorId) {
        this._editorStyleSheets.delete(editorId);
    }
    registerDecorationType(description, key, options, parentTypeKey, editor) {
        let provider = this._decorationOptionProviders.get(key);
        if (!provider) {
            const styleSheet = this._getOrCreateStyleSheet(editor);
            const providerArgs = {
                styleSheet: styleSheet,
                key: key,
                parentTypeKey: parentTypeKey,
                options: options || Object.create(null)
            };
            if (!parentTypeKey) {
                provider = new DecorationTypeOptionsProvider(description, this._themeService, styleSheet, providerArgs);
            }
            else {
                provider = new DecorationSubTypeOptionsProvider(this._themeService, styleSheet, providerArgs);
            }
            this._decorationOptionProviders.set(key, provider);
            this._onDecorationTypeRegistered.fire(key);
        }
        provider.refCount++;
        return {
            dispose: () => {
                this.removeDecorationType(key);
            }
        };
    }
    listDecorationTypes() {
        return Array.from(this._decorationOptionProviders.keys());
    }
    removeDecorationType(key) {
        const provider = this._decorationOptionProviders.get(key);
        if (provider) {
            provider.refCount--;
            if (provider.refCount <= 0) {
                this._decorationOptionProviders.delete(key);
                provider.dispose();
                this.listCodeEditors().forEach((ed) => ed.removeDecorationsByType(key));
            }
        }
    }
    resolveDecorationOptions(decorationTypeKey, writable) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            throw new Error('Unknown decoration type key: ' + decorationTypeKey);
        }
        return provider.getOptions(this, writable);
    }
    resolveDecorationCSSRules(decorationTypeKey) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            return null;
        }
        return provider.resolveDecorationCSSRules();
    }
    setModelProperty(resource, key, value) {
        const key1 = resource.toString();
        let dest;
        if (this._modelProperties.has(key1)) {
            dest = this._modelProperties.get(key1);
        }
        else {
            dest = new Map();
            this._modelProperties.set(key1, dest);
        }
        dest.set(key, value);
    }
    getModelProperty(resource, key) {
        const key1 = resource.toString();
        if (this._modelProperties.has(key1)) {
            const innerMap = this._modelProperties.get(key1);
            return innerMap.get(key);
        }
        return undefined;
    }
    setTransientModelProperty(model, key, value) {
        const uri = model.uri.toString();
        let w = this._transientWatchers.get(uri);
        if (!w) {
            w = new ModelTransientSettingWatcher(uri, model, this);
            this._transientWatchers.set(uri, w);
        }
        const previousValue = w.get(key);
        if (previousValue !== value) {
            w.set(key, value);
            this._onDidChangeTransientModelProperty.fire(model);
        }
    }
    getTransientModelProperty(model, key) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.get(key);
    }
    getTransientModelProperties(model) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.keys().map(key => [key, watcher.get(key)]);
    }
    _removeWatcher(w) {
        this._transientWatchers.deleteAndDispose(w.uri);
    }
    async openCodeEditor(input, source, sideBySide) {
        for (const handler of this._codeEditorOpenHandlers) {
            const candidate = await handler(input, source, sideBySide);
            if (candidate !== null) {
                return candidate;
            }
        }
        return null;
    }
    registerCodeEditorOpenHandler(handler) {
        const rm = this._codeEditorOpenHandlers.unshift(handler);
        return toDisposable(rm);
    }
};
AbstractCodeEditorService = __decorate([
    __param(0, IThemeService)
], AbstractCodeEditorService);
export { AbstractCodeEditorService };
export class ModelTransientSettingWatcher extends Disposable {
    constructor(uri, model, owner) {
        super();
        this.uri = uri;
        this._values = {};
        this._register(model.onWillDispose(() => owner._removeWatcher(this)));
    }
    set(key, value) {
        this._values[key] = value;
    }
    get(key) {
        return this._values[key];
    }
    keys() {
        return Object.keys(this._values);
    }
}
class RefCountedStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(parent, editorId, styleSheet) {
        this._parent = parent;
        this._editorId = editorId;
        this._styleSheet = styleSheet;
        this._refCount = 0;
    }
    ref() {
        this._refCount++;
    }
    unref() {
        this._refCount--;
        if (this._refCount === 0) {
            this._styleSheet.remove();
            this._parent._removeEditorStyleSheets(this._editorId);
        }
    }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
export class GlobalStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(styleSheet) {
        this._styleSheet = styleSheet;
    }
    ref() {
    }
    unref() {
    }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
class DecorationSubTypeOptionsProvider {
    constructor(themeService, styleSheet, providerArgs) {
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this._parentTypeKey = providerArgs.parentTypeKey;
        this.refCount = 0;
        this._beforeContentRules = new DecorationCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */, providerArgs, themeService);
        this._afterContentRules = new DecorationCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */, providerArgs, themeService);
    }
    getOptions(codeEditorService, writable) {
        const options = codeEditorService.resolveDecorationOptions(this._parentTypeKey, true);
        if (this._beforeContentRules) {
            options.beforeContentClassName = this._beforeContentRules.className;
        }
        if (this._afterContentRules) {
            options.afterContentClassName = this._afterContentRules.className;
        }
        return options;
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.cssRules;
    }
    dispose() {
        if (this._beforeContentRules) {
            this._beforeContentRules.dispose();
            this._beforeContentRules = null;
        }
        if (this._afterContentRules) {
            this._afterContentRules.dispose();
            this._afterContentRules = null;
        }
        this._styleSheet.unref();
    }
}
class DecorationTypeOptionsProvider {
    constructor(description, themeService, styleSheet, providerArgs) {
        this._disposables = new DisposableStore();
        this.description = description;
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this.refCount = 0;
        const createCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return rules.className;
            }
            return undefined;
        };
        const createInlineCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return { className: rules.className, hasLetterSpacing: rules.hasLetterSpacing };
            }
            return null;
        };
        this.className = createCSSRules(0 /* ModelDecorationCSSRuleType.ClassName */);
        const inlineData = createInlineCSSRules(1 /* ModelDecorationCSSRuleType.InlineClassName */);
        if (inlineData) {
            this.inlineClassName = inlineData.className;
            this.inlineClassNameAffectsLetterSpacing = inlineData.hasLetterSpacing;
        }
        this.beforeContentClassName = createCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */);
        this.afterContentClassName = createCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */);
        if (providerArgs.options.beforeInjectedText && providerArgs.options.beforeInjectedText.contentText) {
            const beforeInlineData = createInlineCSSRules(5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */);
            this.beforeInjectedText = {
                content: providerArgs.options.beforeInjectedText.contentText,
                inlineClassName: beforeInlineData?.className,
                inlineClassNameAffectsLetterSpacing: beforeInlineData?.hasLetterSpacing || providerArgs.options.beforeInjectedText.affectsLetterSpacing
            };
        }
        if (providerArgs.options.afterInjectedText && providerArgs.options.afterInjectedText.contentText) {
            const afterInlineData = createInlineCSSRules(6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */);
            this.afterInjectedText = {
                content: providerArgs.options.afterInjectedText.contentText,
                inlineClassName: afterInlineData?.className,
                inlineClassNameAffectsLetterSpacing: afterInlineData?.hasLetterSpacing || providerArgs.options.afterInjectedText.affectsLetterSpacing
            };
        }
        this.glyphMarginClassName = createCSSRules(2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */);
        const options = providerArgs.options;
        this.isWholeLine = Boolean(options.isWholeLine);
        this.lineHeight = options.lineHeight;
        this.fontFamily = options.fontFamily;
        this.fontSize = options.fontSize;
        this.fontWeight = options.fontWeight;
        this.fontStyle = options.fontStyle;
        this.stickiness = options.rangeBehavior;
        const lightOverviewRulerColor = options.light && options.light.overviewRulerColor || options.overviewRulerColor;
        const darkOverviewRulerColor = options.dark && options.dark.overviewRulerColor || options.overviewRulerColor;
        if (typeof lightOverviewRulerColor !== 'undefined'
            || typeof darkOverviewRulerColor !== 'undefined') {
            this.overviewRuler = {
                color: lightOverviewRulerColor || darkOverviewRulerColor,
                darkColor: darkOverviewRulerColor || lightOverviewRulerColor,
                position: options.overviewRulerLane || OverviewRulerLane.Center
            };
        }
    }
    getOptions(codeEditorService, writable) {
        if (!writable) {
            return this;
        }
        return {
            description: this.description,
            inlineClassName: this.inlineClassName,
            beforeContentClassName: this.beforeContentClassName,
            afterContentClassName: this.afterContentClassName,
            className: this.className,
            glyphMarginClassName: this.glyphMarginClassName,
            isWholeLine: this.isWholeLine,
            lineHeight: this.lineHeight,
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            overviewRuler: this.overviewRuler,
            stickiness: this.stickiness,
            before: this.beforeInjectedText,
            after: this.afterInjectedText
        };
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.rules;
    }
    dispose() {
        this._disposables.dispose();
        this._styleSheet.unref();
    }
}
export const _CSS_MAP = {
    color: 'color:{0} !important;',
    opacity: 'opacity:{0};',
    backgroundColor: 'background-color:{0};',
    outline: 'outline:{0};',
    outlineColor: 'outline-color:{0};',
    outlineStyle: 'outline-style:{0};',
    outlineWidth: 'outline-width:{0};',
    border: 'border:{0};',
    borderColor: 'border-color:{0};',
    borderRadius: 'border-radius:{0};',
    borderSpacing: 'border-spacing:{0};',
    borderStyle: 'border-style:{0};',
    borderWidth: 'border-width:{0};',
    fontStyle: 'font-style:{0};',
    fontWeight: 'font-weight:{0};',
    fontSize: 'font-size:{0};',
    fontFamily: 'font-family:{0};',
    textDecoration: 'text-decoration:{0};',
    cursor: 'cursor:{0};',
    letterSpacing: 'letter-spacing:{0};',
    gutterIconPath: 'background:{0} center center no-repeat;',
    gutterIconSize: 'background-size:{0};',
    contentText: 'content:\'{0}\';',
    contentIconPath: 'content:{0};',
    margin: 'margin:{0};',
    padding: 'padding:{0};',
    width: 'width:{0};',
    height: 'height:{0};',
    verticalAlign: 'vertical-align:{0};',
};
class DecorationCSSRules {
    constructor(ruleType, providerArgs, themeService) {
        this._theme = themeService.getColorTheme();
        this._ruleType = ruleType;
        this._providerArgs = providerArgs;
        this._usesThemeColors = false;
        this._hasContent = false;
        this._hasLetterSpacing = false;
        let className = CSSNameHelper.getClassName(this._providerArgs.key, ruleType);
        if (this._providerArgs.parentTypeKey) {
            className = className + ' ' + CSSNameHelper.getClassName(this._providerArgs.parentTypeKey, ruleType);
        }
        this._className = className;
        this._unThemedSelector = CSSNameHelper.getSelector(this._providerArgs.key, this._providerArgs.parentTypeKey, ruleType);
        this._buildCSS();
        if (this._usesThemeColors) {
            this._themeListener = themeService.onDidColorThemeChange(theme => {
                this._theme = themeService.getColorTheme();
                this._removeCSS();
                this._buildCSS();
            });
        }
        else {
            this._themeListener = null;
        }
    }
    dispose() {
        if (this._hasContent) {
            this._removeCSS();
            this._hasContent = false;
        }
        if (this._themeListener) {
            this._themeListener.dispose();
            this._themeListener = null;
        }
    }
    get hasContent() {
        return this._hasContent;
    }
    get hasLetterSpacing() {
        return this._hasLetterSpacing;
    }
    get className() {
        return this._className;
    }
    _buildCSS() {
        const options = this._providerArgs.options;
        let unthemedCSS, lightCSS, darkCSS;
        switch (this._ruleType) {
            case 0 /* ModelDecorationCSSRuleType.ClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationClassName(options);
                lightCSS = this.getCSSTextForModelDecorationClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationClassName(options.dark);
                break;
            case 1 /* ModelDecorationCSSRuleType.InlineClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationInlineClassName(options);
                lightCSS = this.getCSSTextForModelDecorationInlineClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationInlineClassName(options.dark);
                break;
            case 2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options);
                lightCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.dark);
                break;
            case 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.before);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.before);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.before);
                break;
            case 4 /* ModelDecorationCSSRuleType.AfterContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.after);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.after);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.after);
                break;
            case 5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.beforeInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.beforeInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.beforeInjectedText);
                break;
            case 6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.afterInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.afterInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.afterInjectedText);
                break;
            default:
                throw new Error('Unknown rule type: ' + this._ruleType);
        }
        const sheet = this._providerArgs.styleSheet;
        let hasContent = false;
        if (unthemedCSS.length > 0) {
            sheet.insertRule(this._unThemedSelector, unthemedCSS);
            hasContent = true;
        }
        if (lightCSS.length > 0) {
            sheet.insertRule(`.vs${this._unThemedSelector}, .hc-light${this._unThemedSelector}`, lightCSS);
            hasContent = true;
        }
        if (darkCSS.length > 0) {
            sheet.insertRule(`.vs-dark${this._unThemedSelector}, .hc-black${this._unThemedSelector}`, darkCSS);
            hasContent = true;
        }
        this._hasContent = hasContent;
    }
    _removeCSS() {
        this._providerArgs.styleSheet.removeRulesContainingSelector(this._unThemedSelector);
    }
    /**
     * Build the CSS for decorations styled via `className`.
     */
    getCSSTextForModelDecorationClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['backgroundColor'], cssTextArr);
        this.collectCSSText(opts, ['outline', 'outlineColor', 'outlineStyle', 'outlineWidth'], cssTextArr);
        this.collectBorderSettingsCSSText(opts, cssTextArr);
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `inlineClassName`.
     */
    getCSSTextForModelDecorationInlineClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['fontStyle', 'fontWeight', 'fontFamily', 'fontSize', 'textDecoration', 'cursor', 'color', 'opacity', 'letterSpacing'], cssTextArr);
        if (opts.letterSpacing) {
            this._hasLetterSpacing = true;
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled before or after content.
     */
    getCSSTextForModelDecorationContentClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts !== 'undefined') {
            this.collectBorderSettingsCSSText(opts, cssTextArr);
            if (typeof opts.contentIconPath !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.contentIconPath, cssJs.asCSSUrl(URI.revive(opts.contentIconPath))));
            }
            if (typeof opts.contentText === 'string') {
                const truncated = opts.contentText.match(/^.*$/m)[0]; // only take first line
                const escaped = truncated.replace(/['\\]/g, '\\$&');
                cssTextArr.push(strings.format(_CSS_MAP.contentText, escaped));
            }
            this.collectCSSText(opts, ['verticalAlign', 'fontStyle', 'fontWeight', 'fontSize', 'fontFamily', 'textDecoration', 'color', 'opacity', 'backgroundColor', 'margin', 'padding'], cssTextArr);
            if (this.collectCSSText(opts, ['width', 'height'], cssTextArr)) {
                cssTextArr.push('display:inline-block;');
            }
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `glyphMarginClassName`.
     */
    getCSSTextForModelDecorationGlyphMarginClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts.gutterIconPath !== 'undefined') {
            cssTextArr.push(strings.format(_CSS_MAP.gutterIconPath, cssJs.asCSSUrl(URI.revive(opts.gutterIconPath))));
            if (typeof opts.gutterIconSize !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.gutterIconSize, opts.gutterIconSize));
            }
        }
        return cssTextArr.join('');
    }
    collectBorderSettingsCSSText(opts, cssTextArr) {
        if (this.collectCSSText(opts, ['border', 'borderColor', 'borderRadius', 'borderSpacing', 'borderStyle', 'borderWidth'], cssTextArr)) {
            cssTextArr.push(strings.format('box-sizing: border-box;'));
            return true;
        }
        return false;
    }
    collectCSSText(opts, properties, cssTextArr) {
        const lenBefore = cssTextArr.length;
        for (const property of properties) {
            const value = this.resolveValue(opts[property]);
            if (typeof value === 'string') {
                cssTextArr.push(strings.format(_CSS_MAP[property], value));
            }
        }
        return cssTextArr.length !== lenBefore;
    }
    resolveValue(value) {
        if (isThemeColor(value)) {
            this._usesThemeColors = true;
            const color = this._theme.getColor(value.id);
            if (color) {
                return color.toString();
            }
            return 'transparent';
        }
        return value;
    }
}
var ModelDecorationCSSRuleType;
(function (ModelDecorationCSSRuleType) {
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["ClassName"] = 0] = "ClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["InlineClassName"] = 1] = "InlineClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["GlyphMarginClassName"] = 2] = "GlyphMarginClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeContentClassName"] = 3] = "BeforeContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterContentClassName"] = 4] = "AfterContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeInjectedTextClassName"] = 5] = "BeforeInjectedTextClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterInjectedTextClassName"] = 6] = "AfterInjectedTextClassName";
})(ModelDecorationCSSRuleType || (ModelDecorationCSSRuleType = {}));
class CSSNameHelper {
    static getClassName(key, type) {
        return 'ced-' + key + '-' + type;
    }
    static getSelector(key, parentKey, ruleType) {
        let selector = '.monaco-editor .' + this.getClassName(key, ruleType);
        if (parentKey) {
            selector = selector + '.' + this.getClassName(parentKey, ruleType);
        }
        if (ruleType === 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */) {
            selector += '::before';
        }
        else if (ruleType === 4 /* ModelDecorationCSSRuleType.AfterContentClassName */) {
            selector += '::after';
        }
        return selector;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RDb2RlRWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc2VydmljZXMvYWJzdHJhY3RDb2RlRWRpdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sS0FBSyxjQUFjLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUdsRCxPQUFPLEVBQTRGLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RKLE9BQU8sRUFBa0csaUJBQWlCLEVBQTBCLE1BQU0sdUJBQXVCLENBQUM7QUFFbEwsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3JGLElBQWUseUJBQXlCLEdBQXhDLE1BQWUseUJBQTBCLFNBQVEsVUFBVTtJQW1DakUsWUFDZ0IsYUFBNkM7UUFFNUQsS0FBSyxFQUFFLENBQUM7UUFGd0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUFoQzVDLDRCQUF1QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEs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