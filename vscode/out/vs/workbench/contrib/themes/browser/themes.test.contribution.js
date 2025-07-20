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
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { ITextMateTokenizationService } from '../../../services/textMate/browser/textMateTokenizationFeature.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { TokenMetadata } from '../../../../editor/common/encodedTokenAttributes.js';
import { findMatchingThemeRule } from '../../../services/textMate/common/TMHelper.js';
import { Color } from '../../../../base/common/color.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { splitLines } from '../../../../base/common/strings.js';
import { findMetadata } from '../../../services/themes/common/colorThemeData.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Event } from '../../../../base/common/event.js';
import { Range } from '../../../../editor/common/core/range.js';
import { TreeSitterSyntaxTokenBackend } from '../../../../editor/common/model/tokens/treeSitter/treeSitterSyntaxTokenBackend.js';
import { waitForState } from '../../../../base/common/observable.js';
class ThemeDocument {
    constructor(theme) {
        this._theme = theme;
        this._cache = Object.create(null);
        this._defaultColor = '#000000';
        for (let i = 0, len = this._theme.tokenColors.length; i < len; i++) {
            const rule = this._theme.tokenColors[i];
            if (!rule.scope) {
                this._defaultColor = rule.settings.foreground;
            }
        }
    }
    _generateExplanation(selector, color) {
        return `${selector}: ${Color.Format.CSS.formatHexA(color, true).toUpperCase()}`;
    }
    explainTokenColor(scopes, color) {
        const matchingRule = this._findMatchingThemeRule(scopes);
        if (!matchingRule) {
            const expected = Color.fromHex(this._defaultColor);
            // No matching rule
            if (!color.equals(expected)) {
                throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected default ${Color.Format.CSS.formatHexA(expected)}`);
            }
            return this._generateExplanation('default', color);
        }
        const expected = Color.fromHex(matchingRule.settings.foreground);
        if (!color.equals(expected)) {
            throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected ${Color.Format.CSS.formatHexA(expected)} coming in from ${matchingRule.rawSelector}`);
        }
        return this._generateExplanation(matchingRule.rawSelector, color);
    }
    _findMatchingThemeRule(scopes) {
        if (!this._cache[scopes]) {
            this._cache[scopes] = findMatchingThemeRule(this._theme, scopes.split(' '));
        }
        return this._cache[scopes];
    }
}
let Snapper = class Snapper {
    constructor(languageService, themeService, textMateService, modelService) {
        this.languageService = languageService;
        this.themeService = themeService;
        this.textMateService = textMateService;
        this.modelService = modelService;
    }
    _themedTokenize(grammar, lines) {
        const colorMap = TokenizationRegistry.getColorMap();
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine2(line, state);
            for (let j = 0, lenJ = tokenizationResult.tokens.length >>> 1; j < lenJ; j++) {
                const startOffset = tokenizationResult.tokens[(j << 1)];
                const metadata = tokenizationResult.tokens[(j << 1) + 1];
                const endOffset = j + 1 < lenJ ? tokenizationResult.tokens[((j + 1) << 1)] : line.length;
                const tokenText = line.substring(startOffset, endOffset);
                const color = TokenMetadata.getForeground(metadata);
                result[resultLen++] = {
                    text: tokenText,
                    color: colorMap[color]
                };
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    _themedTokenizeTreeSitter(tokens, languageId) {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = Array(tokens.length);
        const colorThemeData = this.themeService.getColorTheme();
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const scopes = token.t.split(' ');
            const metadata = findMetadata(colorThemeData, scopes, this.languageService.languageIdCodec.encodeLanguageId(languageId), false);
            const color = TokenMetadata.getForeground(metadata);
            result[i] = {
                text: token.c,
                color: colorMap[color]
            };
        }
        return result;
    }
    _tokenize(grammar, lines) {
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine(line, state);
            let lastScopes = null;
            for (let j = 0, lenJ = tokenizationResult.tokens.length; j < lenJ; j++) {
                const token = tokenizationResult.tokens[j];
                const tokenText = line.substring(token.startIndex, token.endIndex);
                const tokenScopes = token.scopes.join(' ');
                if (lastScopes === tokenScopes) {
                    result[resultLen - 1].c += tokenText;
                }
                else {
                    lastScopes = tokenScopes;
                    result[resultLen++] = {
                        c: tokenText,
                        t: tokenScopes,
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        }
                    };
                }
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    async _getThemesResult(grammar, lines) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter(themeData => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenize(grammar, lines)
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    async _getTreeSitterThemesResult(tokens, languageId) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter(themeData => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenizeTreeSitter(tokens, languageId)
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    _enrichResult(result, themesResult) {
        const index = {};
        const themeNames = Object.keys(themesResult);
        for (const themeName of themeNames) {
            index[themeName] = 0;
        }
        for (let i = 0, len = result.length; i < len; i++) {
            const token = result[i];
            for (const themeName of themeNames) {
                const themedToken = themesResult[themeName].tokens[index[themeName]];
                themedToken.text = themedToken.text.substr(token.c.length);
                if (themedToken.color) {
                    token.r[themeName] = themesResult[themeName].document.explainTokenColor(token.t, themedToken.color);
                }
                if (themedToken.text.length === 0) {
                    index[themeName]++;
                }
            }
        }
    }
    _moveInjectionCursorToRange(cursor, injectionRange) {
        let continueCursor = cursor.gotoFirstChild();
        // Get into the first "real" child node, as the root nodes can extend outside the range.
        while (((cursor.startIndex < injectionRange.startIndex) || (cursor.endIndex > injectionRange.endIndex)) && continueCursor) {
            if (cursor.endIndex < injectionRange.startIndex) {
                continueCursor = cursor.gotoNextSibling();
            }
            else {
                continueCursor = cursor.gotoFirstChild();
            }
        }
    }
    async _treeSitterTokenize(treeSitterTree, tokenizationModel, languageId) {
        const tree = await waitForState(treeSitterTree.tree);
        if (!tree) {
            return [];
        }
        const cursor = tree.walk();
        cursor.gotoFirstChild();
        let cursorResult = true;
        const tokens = [];
        const cursors = [{ cursor, languageId, startOffset: 0, endOffset: treeSitterTree.textModel.getValueLength() }];
        do {
            const current = cursors[cursors.length - 1];
            const currentCursor = current.cursor;
            const currentLanguageId = current.languageId;
            const isOutsideRange = (currentCursor.currentNode.endIndex > current.endOffset);
            if (!isOutsideRange && (currentCursor.currentNode.childCount === 0)) {
                const range = new Range(currentCursor.currentNode.startPosition.row + 1, currentCursor.currentNode.startPosition.column + 1, currentCursor.currentNode.endPosition.row + 1, currentCursor.currentNode.endPosition.column + 1);
                const injection = treeSitterTree.getInjectionTrees(currentCursor.currentNode.startIndex, currentLanguageId);
                const treeSitterRange = injection?.ranges.find(r => r.startIndex <= currentCursor.currentNode.startIndex && r.endIndex >= currentCursor.currentNode.endIndex);
                const injectionTree = injection?.tree.get();
                const injectionLanguageId = injection?.languageId;
                if (injectionTree && injectionLanguageId && treeSitterRange && (treeSitterRange.startIndex === currentCursor.currentNode.startIndex)) {
                    const injectionCursor = injectionTree.walk();
                    this._moveInjectionCursorToRange(injectionCursor, treeSitterRange);
                    cursors.push({ cursor: injectionCursor, languageId: injectionLanguageId, startOffset: treeSitterRange.startIndex, endOffset: treeSitterRange.endIndex });
                    while ((currentCursor.endIndex <= treeSitterRange.endIndex) && (currentCursor.gotoNextSibling() || currentCursor.gotoParent())) { }
                }
                else {
                    const capture = tokenizationModel.captureAtRangeTree(range);
                    tokens.push({
                        c: currentCursor.currentNode.text.replace(/\r/g, ''),
                        t: capture?.map(cap => cap.name).join(' ') ?? '',
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        }
                    });
                    while (!(cursorResult = currentCursor.gotoNextSibling())) {
                        if (!(cursorResult = currentCursor.gotoParent())) {
                            break;
                        }
                    }
                }
            }
            else {
                cursorResult = currentCursor.gotoFirstChild();
            }
            if (cursors.length > 1 && ((!cursorResult && currentCursor === cursors[cursors.length - 1].cursor) || isOutsideRange)) {
                current.cursor.delete();
                cursors.pop();
                cursorResult = true;
            }
        } while (cursorResult);
        cursor.delete();
        return tokens;
    }
    captureSyntaxTokens(fileName, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(fileName));
        return this.textMateService.createTokenizer(languageId).then((grammar) => {
            if (!grammar) {
                return [];
            }
            const lines = splitLines(content);
            const result = this._tokenize(grammar, lines);
            return this._getThemesResult(grammar, lines).then((themesResult) => {
                this._enrichResult(result, themesResult);
                return result.filter(t => t.c.length > 0);
            });
        });
    }
    async captureTreeSitterSyntaxTokens(resource, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
        if (!languageId) {
            return [];
        }
        const model = this.modelService.getModel(resource) ?? this.modelService.createModel(content, { languageId, onDidChange: Event.None }, resource);
        const tokenizationPart = model.tokenization.tokens.get();
        if (!(tokenizationPart instanceof TreeSitterSyntaxTokenBackend)) {
            return [];
        }
        const treeObs = tokenizationPart.tree;
        const tokenizationImplObs = tokenizationPart.tokenizationImpl;
        const treeSitterTree = treeObs.get() ?? await waitForState(treeObs);
        const tokenizationImpl = tokenizationImplObs.get() ?? await waitForState(tokenizationImplObs);
        // TODO: injections
        if (!treeSitterTree) {
            return [];
        }
        const result = (await this._treeSitterTokenize(treeSitterTree, tokenizationImpl, languageId)).filter(t => t.c.length > 0);
        const themeTokens = await this._getTreeSitterThemesResult(result, languageId);
        this._enrichResult(result, themeTokens);
        return result;
    }
};
Snapper = __decorate([
    __param(0, ILanguageService),
    __param(1, IWorkbenchThemeService),
    __param(2, ITextMateTokenizationService),
    __param(3, IModelService)
], Snapper);
async function captureTokens(accessor, resource, treeSitter = false) {
    const process = (resource) => {
        const fileService = accessor.get(IFileService);
        const fileName = basename(resource);
        const snapper = accessor.get(IInstantiationService).createInstance(Snapper);
        return fileService.readFile(resource).then(content => {
            if (treeSitter) {
                return snapper.captureTreeSitterSyntaxTokens(resource, content.value.toString());
            }
            else {
                return snapper.captureSyntaxTokens(fileName, content.value.toString());
            }
        });
    };
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        const file = editorService.activeEditor ? EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { filterByScheme: Schemas.file }) : null;
        if (file) {
            process(file).then(result => {
                console.log(result);
            });
        }
        else {
            console.log('No file editor active');
        }
    }
    else {
        const processResult = await process(resource);
        return processResult;
    }
    return undefined;
}
CommandsRegistry.registerCommand('_workbench.captureSyntaxTokens', function (accessor, resource) {
    return captureTokens(accessor, resource);
});
CommandsRegistry.registerCommand('_workbench.captureTreeSitterSyntaxTokens', function (accessor, resource) {
    // If no resource is provided, use the active editor's resource
    // This is useful for testing the command
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        resource = editorService.activeEditor?.resource;
    }
    return captureTokens(accessor, resource, true);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLnRlc3QuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90aGVtZXMvYnJvd3Nlci90aGVtZXMudGVzdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsc0JBQXNCLEVBQXdCLE1BQU0sMERBQTBELENBQUM7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ25FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRWpILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNwRixPQUFPLEVBQWEscUJBQXFCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1B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