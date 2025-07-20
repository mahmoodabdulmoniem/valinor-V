/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import * as strings from '../../../base/common/strings.js';
import { StringBuilder } from '../core/stringBuilder.js';
import { LineDecoration, LineDecorationsNormalizer } from './lineDecorations.js';
import { LinePart } from './linePart.js';
import { TextDirection } from '../model.js';
export var RenderWhitespace;
(function (RenderWhitespace) {
    RenderWhitespace[RenderWhitespace["None"] = 0] = "None";
    RenderWhitespace[RenderWhitespace["Boundary"] = 1] = "Boundary";
    RenderWhitespace[RenderWhitespace["Selection"] = 2] = "Selection";
    RenderWhitespace[RenderWhitespace["Trailing"] = 3] = "Trailing";
    RenderWhitespace[RenderWhitespace["All"] = 4] = "All";
})(RenderWhitespace || (RenderWhitespace = {}));
export class RenderLineInput {
    get isLTR() {
        return !this.containsRTL && this.textDirection !== TextDirection.RTL;
    }
    constructor(useMonospaceOptimizations, canUseHalfwidthRightwardsArrow, lineContent, continuesWithWrappedLine, isBasicASCII, containsRTL, fauxIndentLength, lineTokens, lineDecorations, tabSize, startVisibleColumn, spaceWidth, middotWidth, wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, selectionsOnLine, textDirection, verticalScrollbarSize, renderNewLineWhenEmpty = false) {
        this.useMonospaceOptimizations = useMonospaceOptimizations;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.continuesWithWrappedLine = continuesWithWrappedLine;
        this.isBasicASCII = isBasicASCII;
        this.containsRTL = containsRTL;
        this.fauxIndentLength = fauxIndentLength;
        this.lineTokens = lineTokens;
        this.lineDecorations = lineDecorations.sort(LineDecoration.compare);
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.spaceWidth = spaceWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace = (renderWhitespace === 'all'
            ? 4 /* RenderWhitespace.All */
            : renderWhitespace === 'boundary'
                ? 1 /* RenderWhitespace.Boundary */
                : renderWhitespace === 'selection'
                    ? 2 /* RenderWhitespace.Selection */
                    : renderWhitespace === 'trailing'
                        ? 3 /* RenderWhitespace.Trailing */
                        : 0 /* RenderWhitespace.None */);
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.selectionsOnLine = selectionsOnLine && selectionsOnLine.sort((a, b) => a.start < b.start ? -1 : 1);
        this.renderNewLineWhenEmpty = renderNewLineWhenEmpty;
        this.textDirection = textDirection;
        this.verticalScrollbarSize = verticalScrollbarSize;
        const wsmiddotDiff = Math.abs(wsmiddotWidth - spaceWidth);
        const middotDiff = Math.abs(middotWidth - spaceWidth);
        if (wsmiddotDiff < middotDiff) {
            this.renderSpaceWidth = wsmiddotWidth;
            this.renderSpaceCharCode = 0x2E31; // U+2E31 - WORD SEPARATOR MIDDLE DOT
        }
        else {
            this.renderSpaceWidth = middotWidth;
            this.renderSpaceCharCode = 0xB7; // U+00B7 - MIDDLE DOT
        }
    }
    sameSelection(otherSelections) {
        if (this.selectionsOnLine === null) {
            return otherSelections === null;
        }
        if (otherSelections === null) {
            return false;
        }
        if (otherSelections.length !== this.selectionsOnLine.length) {
            return false;
        }
        for (let i = 0; i < this.selectionsOnLine.length; i++) {
            if (!this.selectionsOnLine[i].equals(otherSelections[i])) {
                return false;
            }
        }
        return true;
    }
    equals(other) {
        return (this.useMonospaceOptimizations === other.useMonospaceOptimizations
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.lineContent === other.lineContent
            && this.continuesWithWrappedLine === other.continuesWithWrappedLine
            && this.isBasicASCII === other.isBasicASCII
            && this.containsRTL === other.containsRTL
            && this.fauxIndentLength === other.fauxIndentLength
            && this.tabSize === other.tabSize
            && this.startVisibleColumn === other.startVisibleColumn
            && this.spaceWidth === other.spaceWidth
            && this.renderSpaceWidth === other.renderSpaceWidth
            && this.renderSpaceCharCode === other.renderSpaceCharCode
            && this.stopRenderingLineAfter === other.stopRenderingLineAfter
            && this.renderWhitespace === other.renderWhitespace
            && this.renderControlCharacters === other.renderControlCharacters
            && this.fontLigatures === other.fontLigatures
            && LineDecoration.equalsArr(this.lineDecorations, other.lineDecorations)
            && this.lineTokens.equals(other.lineTokens)
            && this.sameSelection(other.selectionsOnLine)
            && this.textDirection === other.textDirection
            && this.verticalScrollbarSize === other.verticalScrollbarSize
            && this.renderNewLineWhenEmpty === other.renderNewLineWhenEmpty);
    }
}
var CharacterMappingConstants;
(function (CharacterMappingConstants) {
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_MASK"] = 4294901760] = "PART_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_MASK"] = 65535] = "CHAR_INDEX_MASK";
    CharacterMappingConstants[CharacterMappingConstants["CHAR_INDEX_OFFSET"] = 0] = "CHAR_INDEX_OFFSET";
    CharacterMappingConstants[CharacterMappingConstants["PART_INDEX_OFFSET"] = 16] = "PART_INDEX_OFFSET";
})(CharacterMappingConstants || (CharacterMappingConstants = {}));
export class DomPosition {
    constructor(partIndex, charIndex) {
        this.partIndex = partIndex;
        this.charIndex = charIndex;
    }
}
/**
 * Provides a both direction mapping between a line's character and its rendered position.
 */
export class CharacterMapping {
    static getPartIndex(partData) {
        return (partData & 4294901760 /* CharacterMappingConstants.PART_INDEX_MASK */) >>> 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */;
    }
    static getCharIndex(partData) {
        return (partData & 65535 /* CharacterMappingConstants.CHAR_INDEX_MASK */) >>> 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */;
    }
    constructor(length, partCount) {
        this.length = length;
        this._data = new Uint32Array(this.length);
        this._horizontalOffset = new Uint32Array(this.length);
    }
    setColumnInfo(column, partIndex, charIndex, horizontalOffset) {
        const partData = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */)
            | (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>> 0;
        this._data[column - 1] = partData;
        this._horizontalOffset[column - 1] = horizontalOffset;
    }
    getHorizontalOffset(column) {
        if (this._horizontalOffset.length === 0) {
            // No characters on this line
            return 0;
        }
        return this._horizontalOffset[column - 1];
    }
    charOffsetToPartData(charOffset) {
        if (this.length === 0) {
            return 0;
        }
        if (charOffset < 0) {
            return this._data[0];
        }
        if (charOffset >= this.length) {
            return this._data[this.length - 1];
        }
        return this._data[charOffset];
    }
    getDomPosition(column) {
        const partData = this.charOffsetToPartData(column - 1);
        const partIndex = CharacterMapping.getPartIndex(partData);
        const charIndex = CharacterMapping.getCharIndex(partData);
        return new DomPosition(partIndex, charIndex);
    }
    getColumn(domPosition, partLength) {
        const charOffset = this.partDataToCharOffset(domPosition.partIndex, partLength, domPosition.charIndex);
        return charOffset + 1;
    }
    partDataToCharOffset(partIndex, partLength, charIndex) {
        if (this.length === 0) {
            return 0;
        }
        const searchEntry = ((partIndex << 16 /* CharacterMappingConstants.PART_INDEX_OFFSET */)
            | (charIndex << 0 /* CharacterMappingConstants.CHAR_INDEX_OFFSET */)) >>> 0;
        let min = 0;
        let max = this.length - 1;
        while (min + 1 < max) {
            const mid = ((min + max) >>> 1);
            const midEntry = this._data[mid];
            if (midEntry === searchEntry) {
                return mid;
            }
            else if (midEntry > searchEntry) {
                max = mid;
            }
            else {
                min = mid;
            }
        }
        if (min === max) {
            return min;
        }
        const minEntry = this._data[min];
        const maxEntry = this._data[max];
        if (minEntry === searchEntry) {
            return min;
        }
        if (maxEntry === searchEntry) {
            return max;
        }
        const minPartIndex = CharacterMapping.getPartIndex(minEntry);
        const minCharIndex = CharacterMapping.getCharIndex(minEntry);
        const maxPartIndex = CharacterMapping.getPartIndex(maxEntry);
        let maxCharIndex;
        if (minPartIndex !== maxPartIndex) {
            // sitting between parts
            maxCharIndex = partLength;
        }
        else {
            maxCharIndex = CharacterMapping.getCharIndex(maxEntry);
        }
        const minEntryDistance = charIndex - minCharIndex;
        const maxEntryDistance = maxCharIndex - charIndex;
        if (minEntryDistance <= maxEntryDistance) {
            return min;
        }
        return max;
    }
    inflate() {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            const partData = this._data[i];
            const partIndex = CharacterMapping.getPartIndex(partData);
            const charIndex = CharacterMapping.getCharIndex(partData);
            const visibleColumn = this._horizontalOffset[i];
            result.push([partIndex, charIndex, visibleColumn]);
        }
        return result;
    }
}
export var ForeignElementType;
(function (ForeignElementType) {
    ForeignElementType[ForeignElementType["None"] = 0] = "None";
    ForeignElementType[ForeignElementType["Before"] = 1] = "Before";
    ForeignElementType[ForeignElementType["After"] = 2] = "After";
})(ForeignElementType || (ForeignElementType = {}));
export class RenderLineOutput {
    constructor(characterMapping, containsForeignElements) {
        this._renderLineOutputBrand = undefined;
        this.characterMapping = characterMapping;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine(input, sb) {
    if (input.lineContent.length === 0) {
        if (input.lineDecorations.length > 0) {
            // This line is empty, but it contains inline decorations
            sb.appendString(`<span>`);
            let beforeCount = 0;
            let afterCount = 0;
            let containsForeignElements = 0 /* ForeignElementType.None */;
            for (const lineDecoration of input.lineDecorations) {
                if (lineDecoration.type === 1 /* InlineDecorationType.Before */ || lineDecoration.type === 2 /* InlineDecorationType.After */) {
                    sb.appendString(`<span class="`);
                    sb.appendString(lineDecoration.className);
                    sb.appendString(`"></span>`);
                    if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                        containsForeignElements |= 1 /* ForeignElementType.Before */;
                        beforeCount++;
                    }
                    if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                        containsForeignElements |= 2 /* ForeignElementType.After */;
                        afterCount++;
                    }
                }
            }
            sb.appendString(`</span>`);
            const characterMapping = new CharacterMapping(1, beforeCount + afterCount);
            characterMapping.setColumnInfo(1, beforeCount, 0, 0);
            return new RenderLineOutput(characterMapping, containsForeignElements);
        }
        // completely empty line
        if (input.renderNewLineWhenEmpty) {
            sb.appendString('<span><span>\n</span></span>');
        }
        else {
            sb.appendString('<span><span></span></span>');
        }
        return new RenderLineOutput(new CharacterMapping(0, 0), 0 /* ForeignElementType.None */);
    }
    return _renderLine(resolveRenderLineInput(input), sb);
}
export class RenderLineOutput2 {
    constructor(characterMapping, html, containsForeignElements) {
        this.characterMapping = characterMapping;
        this.html = html;
        this.containsForeignElements = containsForeignElements;
    }
}
export function renderViewLine2(input) {
    const sb = new StringBuilder(10000);
    const out = renderViewLine(input, sb);
    return new RenderLineOutput2(out.characterMapping, sb.build(), out.containsForeignElements);
}
class ResolvedRenderLineInput {
    constructor(fontIsMonospace, canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, parts, containsForeignElements, fauxIndentLength, tabSize, startVisibleColumn, spaceWidth, renderSpaceCharCode, renderWhitespace, renderControlCharacters) {
        this.fontIsMonospace = fontIsMonospace;
        this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
        this.lineContent = lineContent;
        this.len = len;
        this.isOverflowing = isOverflowing;
        this.overflowingCharCount = overflowingCharCount;
        this.parts = parts;
        this.containsForeignElements = containsForeignElements;
        this.fauxIndentLength = fauxIndentLength;
        this.tabSize = tabSize;
        this.startVisibleColumn = startVisibleColumn;
        this.spaceWidth = spaceWidth;
        this.renderSpaceCharCode = renderSpaceCharCode;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        //
    }
}
function resolveRenderLineInput(input) {
    const lineContent = input.lineContent;
    let isOverflowing;
    let overflowingCharCount;
    let len;
    if (input.stopRenderingLineAfter !== -1 && input.stopRenderingLineAfter < lineContent.length) {
        isOverflowing = true;
        overflowingCharCount = lineContent.length - input.stopRenderingLineAfter;
        len = input.stopRenderingLineAfter;
    }
    else {
        isOverflowing = false;
        overflowingCharCount = 0;
        len = lineContent.length;
    }
    let tokens = transformAndRemoveOverflowing(lineContent, input.containsRTL, input.lineTokens, input.fauxIndentLength, len);
    if (input.renderControlCharacters && !input.isBasicASCII) {
        // Calling `extractControlCharacters` before adding (possibly empty) line parts
        // for inline decorations. `extractControlCharacters` removes empty line parts.
        tokens = extractControlCharacters(lineContent, tokens);
    }
    if (input.renderWhitespace === 4 /* RenderWhitespace.All */ ||
        input.renderWhitespace === 1 /* RenderWhitespace.Boundary */ ||
        (input.renderWhitespace === 2 /* RenderWhitespace.Selection */ && !!input.selectionsOnLine) ||
        (input.renderWhitespace === 3 /* RenderWhitespace.Trailing */ && !input.continuesWithWrappedLine)) {
        tokens = _applyRenderWhitespace(input, lineContent, len, tokens);
    }
    let containsForeignElements = 0 /* ForeignElementType.None */;
    if (input.lineDecorations.length > 0) {
        for (let i = 0, len = input.lineDecorations.length; i < len; i++) {
            const lineDecoration = input.lineDecorations[i];
            if (lineDecoration.type === 3 /* InlineDecorationType.RegularAffectingLetterSpacing */) {
                // Pretend there are foreign elements... although not 100% accurate.
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 1 /* InlineDecorationType.Before */) {
                containsForeignElements |= 1 /* ForeignElementType.Before */;
            }
            else if (lineDecoration.type === 2 /* InlineDecorationType.After */) {
                containsForeignElements |= 2 /* ForeignElementType.After */;
            }
        }
        tokens = _applyInlineDecorations(lineContent, len, tokens, input.lineDecorations);
    }
    if (!input.containsRTL) {
        // We can never split RTL text, as it ruins the rendering
        tokens = splitLargeTokens(lineContent, tokens, !input.isBasicASCII || input.fontLigatures);
    }
    return new ResolvedRenderLineInput(input.useMonospaceOptimizations, input.canUseHalfwidthRightwardsArrow, lineContent, len, isOverflowing, overflowingCharCount, tokens, containsForeignElements, input.fauxIndentLength, input.tabSize, input.startVisibleColumn, input.spaceWidth, input.renderSpaceCharCode, input.renderWhitespace, input.renderControlCharacters);
}
/**
 * In the rendering phase, characters are always looped until token.endIndex.
 * Ensure that all tokens end before `len` and the last one ends precisely at `len`.
 */
function transformAndRemoveOverflowing(lineContent, lineContainsRTL, tokens, fauxIndentLength, len) {
    const result = [];
    let resultLen = 0;
    // The faux indent part of the line should have no token type
    if (fauxIndentLength > 0) {
        result[resultLen++] = new LinePart(fauxIndentLength, '', 0, false);
    }
    let startOffset = fauxIndentLength;
    for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
        const endIndex = tokens.getEndOffset(tokenIndex);
        if (endIndex <= fauxIndentLength) {
            // The faux indent part of the line should have no token type
            continue;
        }
        const type = tokens.getClassName(tokenIndex);
        if (endIndex >= len) {
            const tokenContainsRTL = (lineContainsRTL ? strings.containsRTL(lineContent.substring(startOffset, len)) : false);
            result[resultLen++] = new LinePart(len, type, 0, tokenContainsRTL);
            break;
        }
        const tokenContainsRTL = (lineContainsRTL ? strings.containsRTL(lineContent.substring(startOffset, endIndex)) : false);
        result[resultLen++] = new LinePart(endIndex, type, 0, tokenContainsRTL);
        startOffset = endIndex;
    }
    return result;
}
/**
 * written as a const enum to get value inlining.
 */
var Constants;
(function (Constants) {
    Constants[Constants["LongToken"] = 50] = "LongToken";
})(Constants || (Constants = {}));
/**
 * See https://github.com/microsoft/vscode/issues/6885.
 * It appears that having very large spans causes very slow reading of character positions.
 * So here we try to avoid that.
 */
function splitLargeTokens(lineContent, tokens, onlyAtSpaces) {
    let lastTokenEndIndex = 0;
    const result = [];
    let resultLen = 0;
    if (onlyAtSpaces) {
        // Split only at spaces => we need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            if (lastTokenEndIndex + 50 /* Constants.LongToken */ < tokenEndIndex) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                let lastSpaceOffset = -1;
                let currTokenStart = lastTokenEndIndex;
                for (let j = lastTokenEndIndex; j < tokenEndIndex; j++) {
                    if (lineContent.charCodeAt(j) === 32 /* CharCode.Space */) {
                        lastSpaceOffset = j;
                    }
                    if (lastSpaceOffset !== -1 && j - currTokenStart >= 50 /* Constants.LongToken */) {
                        // Split at `lastSpaceOffset` + 1
                        result[resultLen++] = new LinePart(lastSpaceOffset + 1, tokenType, tokenMetadata, tokenContainsRTL);
                        currTokenStart = lastSpaceOffset + 1;
                        lastSpaceOffset = -1;
                    }
                }
                if (currTokenStart !== tokenEndIndex) {
                    result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    else {
        // Split anywhere => we don't need to walk each character
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const tokenEndIndex = token.endIndex;
            const diff = (tokenEndIndex - lastTokenEndIndex);
            if (diff > 50 /* Constants.LongToken */) {
                const tokenType = token.type;
                const tokenMetadata = token.metadata;
                const tokenContainsRTL = token.containsRTL;
                const piecesCount = Math.ceil(diff / 50 /* Constants.LongToken */);
                for (let j = 1; j < piecesCount; j++) {
                    const pieceEndIndex = lastTokenEndIndex + (j * 50 /* Constants.LongToken */);
                    result[resultLen++] = new LinePart(pieceEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
                }
                result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            else {
                result[resultLen++] = token;
            }
            lastTokenEndIndex = tokenEndIndex;
        }
    }
    return result;
}
function isControlCharacter(charCode) {
    if (charCode < 32) {
        return (charCode !== 9 /* CharCode.Tab */);
    }
    if (charCode === 127) {
        // DEL
        return true;
    }
    if ((charCode >= 0x202A && charCode <= 0x202E)
        || (charCode >= 0x2066 && charCode <= 0x2069)
        || (charCode >= 0x200E && charCode <= 0x200F)
        || charCode === 0x061C) {
        // Unicode Directional Formatting Characters
        // LRE	U+202A	LEFT-TO-RIGHT EMBEDDING
        // RLE	U+202B	RIGHT-TO-LEFT EMBEDDING
        // PDF	U+202C	POP DIRECTIONAL FORMATTING
        // LRO	U+202D	LEFT-TO-RIGHT OVERRIDE
        // RLO	U+202E	RIGHT-TO-LEFT OVERRIDE
        // LRI	U+2066	LEFT-TO-RIGHT ISOLATE
        // RLI	U+2067	RIGHT-TO-LEFT ISOLATE
        // FSI	U+2068	FIRST STRONG ISOLATE
        // PDI	U+2069	POP DIRECTIONAL ISOLATE
        // LRM	U+200E	LEFT-TO-RIGHT MARK
        // RLM	U+200F	RIGHT-TO-LEFT MARK
        // ALM	U+061C	ARABIC LETTER MARK
        return true;
    }
    return false;
}
function extractControlCharacters(lineContent, tokens) {
    const result = [];
    let lastLinePart = new LinePart(0, '', 0, false);
    let charOffset = 0;
    for (const token of tokens) {
        const tokenEndIndex = token.endIndex;
        for (; charOffset < tokenEndIndex; charOffset++) {
            const charCode = lineContent.charCodeAt(charOffset);
            if (isControlCharacter(charCode)) {
                if (charOffset > lastLinePart.endIndex) {
                    // emit previous part if it has text
                    lastLinePart = new LinePart(charOffset, token.type, token.metadata, token.containsRTL);
                    result.push(lastLinePart);
                }
                lastLinePart = new LinePart(charOffset + 1, 'mtkcontrol', token.metadata, false);
                result.push(lastLinePart);
            }
        }
        if (charOffset > lastLinePart.endIndex) {
            // emit previous part if it has text
            lastLinePart = new LinePart(tokenEndIndex, token.type, token.metadata, token.containsRTL);
            result.push(lastLinePart);
        }
    }
    return result;
}
/**
 * Whitespace is rendered by "replacing" tokens with a special-purpose `mtkw` type that is later recognized in the rendering phase.
 * Moreover, a token is created for every visual indent because on some fonts the glyphs used for rendering whitespace (&rarr; or &middot;) do not have the same width as &nbsp;.
 * The rendering phase will generate `style="width:..."` for these tokens.
 */
function _applyRenderWhitespace(input, lineContent, len, tokens) {
    const continuesWithWrappedLine = input.continuesWithWrappedLine;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const useMonospaceOptimizations = input.useMonospaceOptimizations;
    const selections = input.selectionsOnLine;
    const onlyBoundary = (input.renderWhitespace === 1 /* RenderWhitespace.Boundary */);
    const onlyTrailing = (input.renderWhitespace === 3 /* RenderWhitespace.Trailing */);
    const generateLinePartForEachWhitespace = (input.renderSpaceWidth !== input.spaceWidth);
    const result = [];
    let resultLen = 0;
    let tokenIndex = 0;
    let tokenType = tokens[tokenIndex].type;
    let tokenContainsRTL = tokens[tokenIndex].containsRTL;
    let tokenEndIndex = tokens[tokenIndex].endIndex;
    const tokensLength = tokens.length;
    let lineIsEmptyOrWhitespace = false;
    let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
    let lastNonWhitespaceIndex;
    if (firstNonWhitespaceIndex === -1) {
        lineIsEmptyOrWhitespace = true;
        firstNonWhitespaceIndex = len;
        lastNonWhitespaceIndex = len;
    }
    else {
        lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
    }
    let wasInWhitespace = false;
    let currentSelectionIndex = 0;
    let currentSelection = selections && selections[currentSelectionIndex];
    let tmpIndent = startVisibleColumn % tabSize;
    for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
        const chCode = lineContent.charCodeAt(charIndex);
        if (currentSelection && currentSelection.endExclusive <= charIndex) {
            currentSelectionIndex++;
            currentSelection = selections && selections[currentSelectionIndex];
        }
        let isInWhitespace;
        if (charIndex < firstNonWhitespaceIndex || charIndex > lastNonWhitespaceIndex) {
            // in leading or trailing whitespace
            isInWhitespace = true;
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            // a tab character is rendered both in all and boundary cases
            isInWhitespace = true;
        }
        else if (chCode === 32 /* CharCode.Space */) {
            // hit a space character
            if (onlyBoundary) {
                // rendering only boundary whitespace
                if (wasInWhitespace) {
                    isInWhitespace = true;
                }
                else {
                    const nextChCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : 0 /* CharCode.Null */);
                    isInWhitespace = (nextChCode === 32 /* CharCode.Space */ || nextChCode === 9 /* CharCode.Tab */);
                }
            }
            else {
                isInWhitespace = true;
            }
        }
        else {
            isInWhitespace = false;
        }
        // If rendering whitespace on selection, check that the charIndex falls within a selection
        if (isInWhitespace && selections) {
            isInWhitespace = !!currentSelection && currentSelection.start <= charIndex && charIndex < currentSelection.endExclusive;
        }
        // If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
        if (isInWhitespace && onlyTrailing) {
            isInWhitespace = lineIsEmptyOrWhitespace || charIndex > lastNonWhitespaceIndex;
        }
        if (isInWhitespace && tokenContainsRTL) {
            // If the token contains RTL text, breaking it up into multiple line parts
            // to render whitespace might affect the browser's bidi layout.
            //
            // We render whitespace in such tokens only if the whitespace
            // is the leading or the trailing whitespace of the line,
            // which doesn't affect the browser's bidi layout.
            if (charIndex >= firstNonWhitespaceIndex && charIndex <= lastNonWhitespaceIndex) {
                isInWhitespace = false;
            }
        }
        if (wasInWhitespace) {
            // was in whitespace token
            if (!isInWhitespace || (!useMonospaceOptimizations && tmpIndent >= tabSize)) {
                // leaving whitespace token or entering a new indent
                if (generateLinePartForEachWhitespace) {
                    const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
                    for (let i = lastEndIndex + 1; i <= charIndex; i++) {
                        result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                    }
                }
                else {
                    result[resultLen++] = new LinePart(charIndex, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
                }
                tmpIndent = tmpIndent % tabSize;
            }
        }
        else {
            // was in regular token
            if (charIndex === tokenEndIndex || (isInWhitespace && charIndex > fauxIndentLength)) {
                result[resultLen++] = new LinePart(charIndex, tokenType, 0, tokenContainsRTL);
                tmpIndent = tmpIndent % tabSize;
            }
        }
        if (chCode === 9 /* CharCode.Tab */) {
            tmpIndent = tabSize;
        }
        else if (strings.isFullWidthCharacter(chCode)) {
            tmpIndent += 2;
        }
        else {
            tmpIndent++;
        }
        wasInWhitespace = isInWhitespace;
        while (charIndex === tokenEndIndex) {
            tokenIndex++;
            if (tokenIndex < tokensLength) {
                tokenType = tokens[tokenIndex].type;
                tokenContainsRTL = tokens[tokenIndex].containsRTL;
                tokenEndIndex = tokens[tokenIndex].endIndex;
            }
            else {
                break;
            }
        }
    }
    let generateWhitespace = false;
    if (wasInWhitespace) {
        // was in whitespace token
        if (continuesWithWrappedLine && onlyBoundary) {
            const lastCharCode = (len > 0 ? lineContent.charCodeAt(len - 1) : 0 /* CharCode.Null */);
            const prevCharCode = (len > 1 ? lineContent.charCodeAt(len - 2) : 0 /* CharCode.Null */);
            const isSingleTrailingSpace = (lastCharCode === 32 /* CharCode.Space */ && (prevCharCode !== 32 /* CharCode.Space */ && prevCharCode !== 9 /* CharCode.Tab */));
            if (!isSingleTrailingSpace) {
                generateWhitespace = true;
            }
        }
        else {
            generateWhitespace = true;
        }
    }
    if (generateWhitespace) {
        if (generateLinePartForEachWhitespace) {
            const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
            for (let i = lastEndIndex + 1; i <= len; i++) {
                result[resultLen++] = new LinePart(i, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
            }
        }
        else {
            result[resultLen++] = new LinePart(len, 'mtkw', 1 /* LinePartMetadata.IS_WHITESPACE */, false);
        }
    }
    else {
        result[resultLen++] = new LinePart(len, tokenType, 0, tokenContainsRTL);
    }
    return result;
}
/**
 * Inline decorations are "merged" on top of tokens.
 * Special care must be taken when multiple inline decorations are at play and they overlap.
 */
function _applyInlineDecorations(lineContent, len, tokens, _lineDecorations) {
    _lineDecorations.sort(LineDecoration.compare);
    const lineDecorations = LineDecorationsNormalizer.normalize(lineContent, _lineDecorations);
    const lineDecorationsLen = lineDecorations.length;
    let lineDecorationIndex = 0;
    const result = [];
    let resultLen = 0;
    let lastResultEndIndex = 0;
    for (let tokenIndex = 0, len = tokens.length; tokenIndex < len; tokenIndex++) {
        const token = tokens[tokenIndex];
        const tokenEndIndex = token.endIndex;
        const tokenType = token.type;
        const tokenMetadata = token.metadata;
        const tokenContainsRTL = token.containsRTL;
        while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset < tokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            if (lineDecoration.startOffset > lastResultEndIndex) {
                lastResultEndIndex = lineDecoration.startOffset;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
            }
            if (lineDecoration.endOffset + 1 <= tokenEndIndex) {
                // This line decoration ends before this token ends
                lastResultEndIndex = lineDecoration.endOffset + 1;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                lineDecorationIndex++;
            }
            else {
                // This line decoration continues on to the next token
                lastResultEndIndex = tokenEndIndex;
                result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata, tokenContainsRTL);
                break;
            }
        }
        if (tokenEndIndex > lastResultEndIndex) {
            lastResultEndIndex = tokenEndIndex;
            result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata, tokenContainsRTL);
        }
    }
    const lastTokenEndIndex = tokens[tokens.length - 1].endIndex;
    if (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
        while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
            const lineDecoration = lineDecorations[lineDecorationIndex];
            result[resultLen++] = new LinePart(lastResultEndIndex, lineDecoration.className, lineDecoration.metadata, false);
            lineDecorationIndex++;
        }
    }
    return result;
}
/**
 * This function is on purpose not split up into multiple functions to allow runtime type inference (i.e. performance reasons).
 * Notice how all the needed data is fully resolved and passed in (i.e. no other calls).
 */
function _renderLine(input, sb) {
    const fontIsMonospace = input.fontIsMonospace;
    const canUseHalfwidthRightwardsArrow = input.canUseHalfwidthRightwardsArrow;
    const containsForeignElements = input.containsForeignElements;
    const lineContent = input.lineContent;
    const len = input.len;
    const isOverflowing = input.isOverflowing;
    const overflowingCharCount = input.overflowingCharCount;
    const parts = input.parts;
    const fauxIndentLength = input.fauxIndentLength;
    const tabSize = input.tabSize;
    const startVisibleColumn = input.startVisibleColumn;
    const spaceWidth = input.spaceWidth;
    const renderSpaceCharCode = input.renderSpaceCharCode;
    const renderWhitespace = input.renderWhitespace;
    const renderControlCharacters = input.renderControlCharacters;
    const characterMapping = new CharacterMapping(len + 1, parts.length);
    let lastCharacterMappingDefined = false;
    let charIndex = 0;
    let visibleColumn = startVisibleColumn;
    let charOffsetInPart = 0; // the character offset in the current part
    let charHorizontalOffset = 0; // the character horizontal position in terms of chars relative to line start
    let partDisplacement = 0;
    sb.appendString('<span>');
    for (let partIndex = 0, tokensLen = parts.length; partIndex < tokensLen; partIndex++) {
        const part = parts[partIndex];
        const partEndIndex = part.endIndex;
        const partType = part.type;
        const partContainsRTL = part.containsRTL;
        const partRendersWhitespace = (renderWhitespace !== 0 /* RenderWhitespace.None */ && part.isWhitespace());
        const partRendersWhitespaceWithWidth = partRendersWhitespace && !fontIsMonospace && (partType === 'mtkw' /*only whitespace*/ || !containsForeignElements);
        const partIsEmptyAndHasPseudoAfter = (charIndex === partEndIndex && part.isPseudoAfter());
        charOffsetInPart = 0;
        sb.appendString('<span ');
        if (partContainsRTL) {
            sb.appendString('style="unicode-bidi:isolate" ');
        }
        sb.appendString('class="');
        sb.appendString(partRendersWhitespaceWithWidth ? 'mtkz' : partType);
        sb.appendASCIICharCode(34 /* CharCode.DoubleQuote */);
        if (partRendersWhitespace) {
            let partWidth = 0;
            {
                let _charIndex = charIndex;
                let _visibleColumn = visibleColumn;
                for (; _charIndex < partEndIndex; _charIndex++) {
                    const charCode = lineContent.charCodeAt(_charIndex);
                    const charWidth = (charCode === 9 /* CharCode.Tab */ ? (tabSize - (_visibleColumn % tabSize)) : 1) | 0;
                    partWidth += charWidth;
                    if (_charIndex >= fauxIndentLength) {
                        _visibleColumn += charWidth;
                    }
                }
            }
            if (partRendersWhitespaceWithWidth) {
                sb.appendString(' style="width:');
                sb.appendString(String(spaceWidth * partWidth));
                sb.appendString('px"');
            }
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters;
                let charWidth;
                if (charCode === 9 /* CharCode.Tab */) {
                    producedCharacters = (tabSize - (visibleColumn % tabSize)) | 0;
                    charWidth = producedCharacters;
                    if (!canUseHalfwidthRightwardsArrow || charWidth > 1) {
                        sb.appendCharCode(0x2192); // RIGHTWARDS ARROW
                    }
                    else {
                        sb.appendCharCode(0xFFEB); // HALFWIDTH RIGHTWARDS ARROW
                    }
                    for (let space = 2; space <= charWidth; space++) {
                        sb.appendCharCode(0xA0); // &nbsp;
                    }
                }
                else { // must be CharCode.Space
                    producedCharacters = 2;
                    charWidth = 1;
                    sb.appendCharCode(renderSpaceCharCode); // &middot; or word separator middle dot
                    sb.appendCharCode(0x200C); // ZERO WIDTH NON-JOINER
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        else {
            sb.appendASCIICharCode(62 /* CharCode.GreaterThan */);
            for (; charIndex < partEndIndex; charIndex++) {
                characterMapping.setColumnInfo(charIndex + 1, partIndex - partDisplacement, charOffsetInPart, charHorizontalOffset);
                partDisplacement = 0;
                const charCode = lineContent.charCodeAt(charIndex);
                let producedCharacters = 1;
                let charWidth = 1;
                switch (charCode) {
                    case 9 /* CharCode.Tab */:
                        producedCharacters = (tabSize - (visibleColumn % tabSize));
                        charWidth = producedCharacters;
                        for (let space = 1; space <= producedCharacters; space++) {
                            sb.appendCharCode(0xA0); // &nbsp;
                        }
                        break;
                    case 32 /* CharCode.Space */:
                        sb.appendCharCode(0xA0); // &nbsp;
                        break;
                    case 60 /* CharCode.LessThan */:
                        sb.appendString('&lt;');
                        break;
                    case 62 /* CharCode.GreaterThan */:
                        sb.appendString('&gt;');
                        break;
                    case 38 /* CharCode.Ampersand */:
                        sb.appendString('&amp;');
                        break;
                    case 0 /* CharCode.Null */:
                        if (renderControlCharacters) {
                            // See https://unicode-table.com/en/blocks/control-pictures/
                            sb.appendCharCode(9216);
                        }
                        else {
                            sb.appendString('&#00;');
                        }
                        break;
                    case 65279 /* CharCode.UTF8_BOM */:
                    case 8232 /* CharCode.LINE_SEPARATOR */:
                    case 8233 /* CharCode.PARAGRAPH_SEPARATOR */:
                    case 133 /* CharCode.NEXT_LINE */:
                        sb.appendCharCode(0xFFFD);
                        break;
                    default:
                        if (strings.isFullWidthCharacter(charCode)) {
                            charWidth++;
                        }
                        // See https://unicode-table.com/en/blocks/control-pictures/
                        if (renderControlCharacters && charCode < 32) {
                            sb.appendCharCode(9216 + charCode);
                        }
                        else if (renderControlCharacters && charCode === 127) {
                            // DEL
                            sb.appendCharCode(9249);
                        }
                        else if (renderControlCharacters && isControlCharacter(charCode)) {
                            sb.appendString('[U+');
                            sb.appendString(to4CharHex(charCode));
                            sb.appendString(']');
                            producedCharacters = 8;
                            charWidth = producedCharacters;
                        }
                        else {
                            sb.appendCharCode(charCode);
                        }
                }
                charOffsetInPart += producedCharacters;
                charHorizontalOffset += charWidth;
                if (charIndex >= fauxIndentLength) {
                    visibleColumn += charWidth;
                }
            }
        }
        if (partIsEmptyAndHasPseudoAfter) {
            partDisplacement++;
        }
        else {
            partDisplacement = 0;
        }
        if (charIndex >= len && !lastCharacterMappingDefined && part.isPseudoAfter()) {
            lastCharacterMappingDefined = true;
            characterMapping.setColumnInfo(charIndex + 1, partIndex, charOffsetInPart, charHorizontalOffset);
        }
        sb.appendString('</span>');
    }
    if (!lastCharacterMappingDefined) {
        // When getting client rects for the last character, we will position the
        // text range at the end of the span, insteaf of at the beginning of next span
        characterMapping.setColumnInfo(len + 1, parts.length - 1, charOffsetInPart, charHorizontalOffset);
    }
    if (isOverflowing) {
        sb.appendString('<span class="mtkoverflow">');
        sb.appendString(nls.localize('showMore', "Show more ({0})", renderOverflowingCharCount(overflowingCharCount)));
        sb.appendString('</span>');
    }
    sb.appendString('</span>');
    return new RenderLineOutput(characterMapping, containsForeignElements);
}
function to4CharHex(n) {
    return n.toString(16).toUpperCase().padStart(4, '0');
}
function renderOverflowingCharCount(n) {
    if (n < 1024) {
        return nls.localize('overflow.chars', "{0} chars", n);
    }
    if (n < 1024 * 1024) {
        return `${(n / 1024).toFixed(1)} KB`;
    }
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L3ZpZXdMaW5lUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUV2QyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBb0IsTUFBTSxlQUFlLENBQUM7QUFHM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUU1QyxNQUFNLENBQU4sSUFBa0IsZ0JBTWpCO0FBTkQsV0FBa0IsZ0JBQWdCO0lBQ2pDLHVEQUFRLENBQUE7SUFDUiwrREFBWSxDQUFBO0lBQ1osaUVBQWEsQ0FBQTtJQUNiLCtEQUFZLENBQUE7SUFDWixxREFBTyxDQUFBO0FBQ1IsQ0FBQyxFQU5pQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBTWpDO0FBRUQsTUFBTSxPQUFPLGVBQWU7SUFpQzNCLElBQVcsS0FBSztRQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssYUFBYSxDQUFDLEdBQUcsQ0FBQztJQUN0RSxDQUFDO0lBRUQsWUFDQyx5QkFBa0MsRUFDbEMsOEJBQXVDLEVBQ3ZDLFdBQW1CLEVBQ25CLHdCQUFpQyxFQUNqQyxZQUFxQixFQUNyQixXQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsVUFBMkIsRUFDM0IsZUFBaUMsRUFDakMsT0FBZSxFQUNm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