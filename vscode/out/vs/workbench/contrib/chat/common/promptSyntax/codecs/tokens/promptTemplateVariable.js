/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { DollarSign } from '../base/simpleCodec/tokens/dollarSign.js';
import { LeftCurlyBrace, RightCurlyBrace } from '../base/simpleCodec/tokens/curlyBraces.js';
/**
 * Represents a `${variable}` token in a prompt text.
 */
export class PromptTemplateVariable extends PromptToken {
    constructor(range, 
    /**
     * The contents of the template variable, excluding
     * the surrounding `${}` characters.
     */
    contents) {
        super(range);
        this.contents = contents;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return [
            DollarSign.symbol,
            LeftCurlyBrace.symbol,
            this.contents,
            RightCurlyBrace.symbol,
        ].join('');
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VGVtcGxhdGVWYXJpYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvcHJvbXB0VGVtcGxhdGVWYXJpYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFNUY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsV0FBVztJQUN0RCxZQUNDLEtBQVk7SUFDWjs7O09BR0c7SUFDYSxRQUFnQjtRQUVoQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFGRyxhQUFRLEdBQVIsUUFBUSxDQUFRO0lBR2pDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU87WUFDTixVQUFVLENBQUMsTUFBTTtZQUNqQixjQUFjLENBQUMsTUFBTTtZQUNyQixJQUFJLENBQUMsUUFBUTtZQUNiLGVBQWUsQ0FBQyxNQUFNO1NBQ3RCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ1osQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEMsQ0FBQztDQUNEIn0=