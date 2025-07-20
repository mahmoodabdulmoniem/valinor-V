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
import { assert } from '../../../../../../../../../../base/common/assert.js';
import { Colon, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { FrontMatterRecordName, FrontMatterRecordDelimiter } from '../../tokens/index.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
/**
 * Parser for a record `name` with the `: ` delimiter.
 *
 *  * E.g., `name:` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export class PartialFrontMatterRecordNameWithDelimiter extends ParserBase {
    constructor(factory, tokens) {
        super([...tokens]);
        this.factory = factory;
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        const isSpacingToken = (token instanceof SpacingToken);
        // delimiter must always be a `:` followed by a "space" character
        // once we encounter that sequence, we can transition to the next parser
        if (isSpacingToken && (previousToken instanceof Colon)) {
            const recordDelimiter = new FrontMatterRecordDelimiter([
                previousToken,
                token,
            ]);
            const recordName = this.currentTokens[0];
            // sanity check
            assert(recordName instanceof FrontMatterRecordName, `Expected a front matter record name, got '${recordName}'.`);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.factory.createRecord([recordName, recordDelimiter]),
                wasTokenConsumed: true,
            };
        }
        // allow some spacing before the colon delimiter
        if (token instanceof SpacingToken) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // include the colon delimiter
        if (token instanceof Colon) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // otherwise fail due to the unexpected token type between
        // record name and record name delimiter tokens
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecordNameWithDelimiter.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmROYW1lV2l0aERlbGltaXRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlclJlY29yZC9mcm9udE1hdHRlclJlY29yZE5hbWVXaXRoRGVsaW1pdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUU3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQTJCLE1BQU0sb0NBQW9DLENBQUM7QUFhNUc7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLE9BQU8seUNBQTBDLFNBQVEsVUFHOUQ7SUFDQSxZQUNrQixPQUFpQyxFQUNsRCxNQUF3RDtRQUV4RCxLQUFLLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFIRixZQUFPLEdBQVAsT0FBTyxDQUEwQjtJQUluRCxDQUFDO0lBR00sTUFBTSxDQUFDLEtBQTBCO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFLLFlBQVksWUFBWSxDQUFDLENBQUM7UUFFdkQsaUVBQWlFO1FBQ2pFLHdFQUF3RTtRQUN4RSxJQUFJLGNBQWMsSUFBSSxDQUFDLGFBQWEsWUFBWSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksMEJBQTBCLENBQUM7Z0JBQ3RELGFBQWE7Z0JBQ2IsS0FBSzthQUNMLENBQUMsQ0FBQztZQUVILE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFekMsZUFBZTtZQUNmLE1BQU0sQ0FDTCxVQUFVLFlBQVkscUJBQXFCLEVBQzNDLDZDQUE2QyxVQUFVLElBQUksQ0FDM0QsQ0FBQztZQUVGLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FDcEMsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQzdCO2dCQUNELGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsSUFBSSxLQUFLLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0IsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFL0IsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCwwREFBMEQ7UUFDMUQsK0NBQStDO1FBQy9DLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLE9BQU87WUFDTixNQUFNLEVBQUUsU0FBUztZQUNqQixnQkFBZ0IsRUFBRSxLQUFLO1NBQ3ZCLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUE1RE87SUFETixpQkFBaUI7dUVBNERqQiJ9