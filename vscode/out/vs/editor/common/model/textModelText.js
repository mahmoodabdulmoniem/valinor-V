/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractText } from '../core/text/abstractText.js';
import { TextLength } from '../core/text/textLength.js';
export class TextModelText extends AbstractText {
    constructor(_textModel) {
        super();
        this._textModel = _textModel;
    }
    getValueOfRange(range) {
        return this._textModel.getValueInRange(range);
    }
    getLineLength(lineNumber) {
        return this._textModel.getLineLength(lineNumber);
    }
    get length() {
        const lastLineNumber = this._textModel.getLineCount();
        const lastLineLen = this._textModel.getLineLength(lastLineNumber);
        return new TextLength(lastLineNumber - 1, lastLineLen);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxUZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHeEQsTUFBTSxPQUFPLGFBQWMsU0FBUSxZQUFZO0lBQzlDLFlBQTZCLFVBQXNCO1FBQ2xELEtBQUssRUFBRSxDQUFDO1FBRG9CLGVBQVUsR0FBVixVQUFVLENBQVk7SUFFbkQsQ0FBQztJQUVRLGVBQWUsQ0FBQyxLQUFZO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVRLGFBQWEsQ0FBQyxVQUFrQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU8sSUFBSSxVQUFVLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN4RCxDQUFDO0NBQ0QifQ==