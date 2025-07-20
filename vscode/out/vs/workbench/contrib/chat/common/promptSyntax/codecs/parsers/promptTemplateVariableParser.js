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
import { assert } from '../../../../../../../base/common/assert.js';
import { PromptTemplateVariable } from '../tokens/promptTemplateVariable.js';
import { BaseToken } from '../base/baseToken.js';
import { DollarSign, LeftCurlyBrace, RightCurlyBrace } from '../base/simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../base/simpleCodec/parserBase.js';
/**
 * Parser that handles start sequence of a `${variable}` token sequence in
 * a prompt text. Transitions to {@link PartialPromptTemplateVariable} parser
 * as soon as the `${` character sequence is found.
 */
export class PartialPromptTemplateVariableStart extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        if (token instanceof LeftCurlyBrace) {
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: new PartialPromptTemplateVariable(this.currentTokens),
                wasTokenConsumed: true,
            };
        }
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialPromptTemplateVariableStart.prototype, "accept", null);
/**
 * Parser that handles a partial `${variable}` token sequence in a prompt text.
 */
export class PartialPromptTemplateVariable extends ParserBase {
    constructor(tokens) {
        super(tokens);
    }
    accept(token) {
        // template variables are terminated by the `}` character
        if (token instanceof RightCurlyBrace) {
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asPromptTemplateVariable(),
                wasTokenConsumed: true,
            };
        }
        // otherwise it is a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Returns a string representation of the prompt template variable
     * contents, if any is present.
     */
    get contents() {
        const contentTokens = [];
        // template variables are surrounded by `${}`, hence we need to have
        // at least `${` plus one character for the contents to be non-empty
        if (this.currentTokens.length < 3) {
            return '';
        }
        // collect all tokens besides the first two (`${`) and a possible `}` at the end
        for (let i = 2; i < this.currentTokens.length; i++) {
            const token = this.currentTokens[i];
            const isLastToken = (i === this.currentTokens.length - 1);
            if ((token instanceof RightCurlyBrace) && (isLastToken === true)) {
                break;
            }
            contentTokens.push(token);
        }
        return BaseToken.render(contentTokens);
    }
    /**
     * Try to convert current parser instance into a {@link PromptTemplateVariable} token.
     *
     * @throws if:
     * 	- current tokens sequence cannot be converted to a valid template variable token
     */
    asPromptTemplateVariable() {
        const firstToken = this.currentTokens[0];
        const secondToken = this.currentTokens[1];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // template variables are surrounded by `${}`, hence we need
        // to have at least 3 tokens in the list for a valid one
        assert(this.currentTokens.length >= 3, 'Prompt template variable should have at least 3 tokens.');
        // a complete template variable must end with a `}`
        assert(lastToken instanceof RightCurlyBrace, 'Last token is not a "}".');
        // sanity checks of the first and second tokens
        assert(firstToken instanceof DollarSign, 'First token must be a "$".');
        assert(secondToken instanceof LeftCurlyBrace, 'Second token must be a "{".');
        return new PromptTemplateVariable(BaseToken.fullRange(this.currentTokens), this.contents);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptTemplateVariable.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VGVtcGxhdGVWYXJpYWJsZVBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9wYXJzZXJzL3Byb21wdFRlbXBsYXRlVmFyaWFibGVQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUVqRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLG1DQUFtQyxDQUFDO0FBT3RHOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sa0NBQW1DLFNBQVEsVUFBMkc7SUFDbEssWUFBWSxLQUFpQjtRQUM1QixLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2hCLENBQUM7SUFHTSxNQUFNLENBQUMsS0FBMEI7UUFDdkMsSUFBSSxLQUFLLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDdkIsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztnQkFDakUsZ0JBQWdCLEVBQUUsSUFB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