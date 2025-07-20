/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import * as strings from '../../../../base/common/strings.js';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { TextEditorCursorStyle } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
class ViewCursorRenderData {
    constructor(top, left, paddingLeft, width, height, textContent, textContentClassName) {
        this.top = top;
        this.left = left;
        this.paddingLeft = paddingLeft;
        this.width = width;
        this.height = height;
        this.textContent = textContent;
        this.textContentClassName = textContentClassName;
    }
}
export var CursorPlurality;
(function (CursorPlurality) {
    CursorPlurality[CursorPlurality["Single"] = 0] = "Single";
    CursorPlurality[CursorPlurality["MultiPrimary"] = 1] = "MultiPrimary";
    CursorPlurality[CursorPlurality["MultiSecondary"] = 2] = "MultiSecondary";
})(CursorPlurality || (CursorPlurality = {}));
export class ViewCursor {
    constructor(context, plurality) {
        this._context = context;
        const options = this._context.configuration.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        this._cursorStyle = options.get(160 /* EditorOption.effectiveCursorStyle */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._lineCursorWidth = Math.min(options.get(37 /* EditorOption.cursorWidth */), this._typicalHalfwidthCharacterWidth);
        this._lineCursorHeight = options.get(38 /* EditorOption.cursorHeight */);
        this._isVisible = true;
        // Create the dom node
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setClassName(`cursor ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
        this._domNode.setHeight(this._context.viewLayout.getLineHeightForLineNumber(1));
        this._domNode.setTop(0);
        this._domNode.setLeft(0);
        applyFontInfo(this._domNode, fontInfo);
        this._domNode.setDisplay('none');
        this._position = new Position(1, 1);
        this._pluralityClass = '';
        this.setPlurality(plurality);
        this._lastRenderedContent = '';
        this._renderData = null;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return this._position;
    }
    setPlurality(plurality) {
        switch (plurality) {
            default:
            case CursorPlurality.Single:
                this._pluralityClass = '';
                break;
            case CursorPlurality.MultiPrimary:
                this._pluralityClass = 'cursor-primary';
                break;
            case CursorPlurality.MultiSecondary:
                this._pluralityClass = 'cursor-secondary';
                break;
        }
    }
    show() {
        if (!this._isVisible) {
            this._domNode.setVisibility('inherit');
            this._isVisible = true;
        }
    }
    hide() {
        if (this._isVisible) {
            this._domNode.setVisibility('hidden');
            this._isVisible = false;
        }
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        this._cursorStyle = options.get(160 /* EditorOption.effectiveCursorStyle */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._lineCursorWidth = Math.min(options.get(37 /* EditorOption.cursorWidth */), this._typicalHalfwidthCharacterWidth);
        this._lineCursorHeight = options.get(38 /* EditorOption.cursorHeight */);
        applyFontInfo(this._domNode, fontInfo);
        return true;
    }
    onCursorPositionChanged(position, pauseAnimation) {
        if (pauseAnimation) {
            this._domNode.domNode.style.transitionProperty = 'none';
        }
        else {
            this._domNode.domNode.style.transitionProperty = '';
        }
        this._position = position;
        return true;
    }
    /**
     * If `this._position` is inside a grapheme, returns the position where the grapheme starts.
     * Also returns the next grapheme.
     */
    _getGraphemeAwarePosition() {
        const { lineNumber, column } = this._position;
        const lineContent = this._context.viewModel.getLineContent(lineNumber);
        const [startOffset, endOffset] = strings.getCharContainingOffset(lineContent, column - 1);
        return [new Position(lineNumber, startOffset + 1), lineContent.substring(startOffset, endOffset)];
    }
    _prepareRender(ctx) {
        let textContent = '';
        let textContentClassName = '';
        const [position, nextGrapheme] = this._getGraphemeAwarePosition();
        const lineHeight = this._context.viewLayout.getLineHeightForLineNumber(position.lineNumber);
        const lineCursorHeight = (this._lineCursorHeight === 0
            ? lineHeight // 0 indicates that the cursor should take the full line height
            : Math.min(lineHeight, this._lineCursorHeight));
        const lineHeightAdjustment = (lineHeight - lineCursorHeight) / 2;
        if (this._cursorStyle === TextEditorCursorStyle.Line || this._cursorStyle === TextEditorCursorStyle.LineThin) {
            const visibleRange = ctx.visibleRangeForPosition(position);
            if (!visibleRange || visibleRange.outsideRenderedLine) {
                // Outside viewport
                return null;
            }
            const window = dom.getWindow(this._domNode.domNode);
            let width;
            if (this._cursorStyle === TextEditorCursorStyle.Line) {
                width = dom.computeScreenAwareSize(window, this._lineCursorWidth > 0 ? this._lineCursorWidth : 2);
                if (width > 2) {
                    textContent = nextGrapheme;
                    textContentClassName = this._getTokenClassName(position);
                }
            }
            else {
                width = dom.computeScreenAwareSize(window, 1);
            }
            let left = visibleRange.left;
            let paddingLeft = 0;
            if (width >= 2 && left >= 1) {
                // shift the cursor a bit between the characters
                paddingLeft = 1;
                left -= paddingLeft;
            }
            const top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.bigNumbersDelta + lineHeightAdjustment;
            return new ViewCursorRenderData(top, left, paddingLeft, width, lineCursorHeight, textContent, textContentClassName);
        }
        const visibleRangeForCharacter = ctx.linesVisibleRangesForRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column + nextGrapheme.length), false);
        if (!visibleRangeForCharacter || visibleRangeForCharacter.length === 0) {
            // Outside viewport
            return null;
        }
        const firstVisibleRangeForCharacter = visibleRangeForCharacter[0];
        if (firstVisibleRangeForCharacter.outsideRenderedLine || firstVisibleRangeForCharacter.ranges.length === 0) {
            // Outside viewport
            return null;
        }
        const range = firstVisibleRangeForCharacter.ranges[0];
        const width = (nextGrapheme === '\t'
            ? this._typicalHalfwidthCharacterWidth
            : (range.width < 1
                ? this._typicalHalfwidthCharacterWidth
                : range.width));
        if (this._cursorStyle === TextEditorCursorStyle.Block) {
            textContent = nextGrapheme;
            textContentClassName = this._getTokenClassName(position);
        }
        let top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.bigNumbersDelta;
        let height = lineHeight;
        // Underline might interfere with clicking
        if (this._cursorStyle === TextEditorCursorStyle.Underline || this._cursorStyle === TextEditorCursorStyle.UnderlineThin) {
            top += lineHeight - 2;
            height = 2;
        }
        return new ViewCursorRenderData(top, range.left, 0, width, height, textContent, textContentClassName);
    }
    _getTokenClassName(position) {
        const lineData = this._context.viewModel.getViewLineData(position.lineNumber);
        const tokenIndex = lineData.tokens.findTokenIndexAtOffset(position.column - 1);
        return lineData.tokens.getClassName(tokenIndex);
    }
    prepareRender(ctx) {
        this._renderData = this._prepareRender(ctx);
    }
    render(ctx) {
        if (!this._renderData) {
            this._domNode.setDisplay('none');
            return null;
        }
        if (this._lastRenderedContent !== this._renderData.textContent) {
            this._lastRenderedContent = this._renderData.textContent;
            this._domNode.domNode.textContent = this._lastRenderedContent;
        }
        this._domNode.setClassName(`cursor ${this._pluralityClass} ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME} ${this._renderData.textContentClassName}`);
        this._domNode.setDisplay('block');
        this._domNode.setTop(this._renderData.top);
        this._domNode.setLeft(this._renderData.left);
        this._domNode.setPaddingLeft(this._renderData.paddingLeft);
        this._domNode.setWidth(this._renderData.width);
        this._domNode.setLineHeight(this._renderData.height);
        this._domNode.setHeight(this._renderData.height);
        return {
            domNode: this._domNode.domNode,
            position: this._position,
            contentLeft: this._renderData.left,
            height: this._renderData.height,
            width: 2
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0N1cnNvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdDdXJzb3JzL3ZpZXdDdXJzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQWdCLE1BQU0seUNBQXlDLENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUl0RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQVUxRyxNQUFNLG9CQUFvQjtJQUN6QixZQUNpQixHQUFXLEVBQ1gsSUFBWSxFQUNaLFdBQW1CLEVBQ25CLEtBQWEsRUFDYixNQUFjLEVBQ2QsV0FBbUIsRUFDbkIsb0JBQTRCO1FBTjVCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7SUFDekMsQ0FBQztDQUNMO0FBRUQsTUFBTSxDQUFOLElBQVksZUFJWDtBQUpELFdBQVksZUFB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