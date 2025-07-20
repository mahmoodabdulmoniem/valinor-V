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
import { assert } from '../../../../../../../../../base/common/assert.js';
import { SimpleToken } from '../../simpleCodec/tokens/tokens.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { FrontMatterString } from '../tokens/frontMatterString.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a string value.
 */
export class PartialFrontMatterString extends ParserBase {
    constructor(startToken) {
        super([startToken]);
        this.startToken = startToken;
    }
    accept(token) {
        this.currentTokens.push(token);
        // iterate until a `matching end quote` is found
        if ((token instanceof SimpleToken) && (this.startToken.sameType(token))) {
            return {
                result: 'success',
                nextParser: this.asStringToken(),
                wasTokenConsumed: true,
            };
        }
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Convert the current parser into a {@link FrontMatterString} token,
     * if possible.
     *
     * @throws if the first and last tokens are not quote tokens of the same type.
     */
    asStringToken() {
        const endToken = this.currentTokens[this.currentTokens.length - 1];
        assertDefined(endToken, `No matching end token found.`);
        assert(this.startToken.sameType(endToken), `String starts with \`${this.startToken.text}\`, but ends with \`${endToken.text}\`.`);
        return new FrontMatterString([
            this.startToken,
            ...this.currentTokens
                .slice(1, this.currentTokens.length - 1),
            endToken,
        ]);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterString.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTdHJpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJTdHJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQTJCLE1BQU0saUNBQWlDLENBQUM7QUFFekc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBMEY7SUFDdkksWUFDa0IsVUFBdUI7UUFFeEMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUZILGVBQVUsR0FBVixVQUFVLENBQWE7SUFHekMsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUEwQjtRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUvQixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLEtBQUssWUFBWSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN6RSxPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRTtnQkFDaEMsZ0JBQWdCLEVBQUUsSUFBSTthQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU87WUFDTixNQUFNLEVBQUUsU0FBUztZQUNqQixVQUFVLEVBQUUsSUFBSTtZQUNoQixnQkFBZ0IsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxhQUFhO1FBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFbkUsYUFBYSxDQUNaLFFBQVEsRUFDUiw4QkFBOEIsQ0FDOUIsQ0FBQztRQUVGLE1BQU0sQ0FDTCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDbEMsd0JBQXdCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSx1QkFBdUIsUUFBUSxDQUFDLElBQUksS0FBSyxDQUNyRixDQUFDO1FBRUYsT0FBTyxJQUFJLGlCQUFpQixDQUFDO1lBQzVCLElBQUksQ0FBQyxVQUFVO1lBQ2YsR0FBRyxJQUFJLENBQUMsYUFBYTtpQkFDbkIsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDekMsUUFBUTtTQUNSLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQTdDTztJQUROLGlCQUFpQjtzREFrQmpCIn0=