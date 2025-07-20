/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
/**
 * Token that represents a string value in a Front Matter header.
 */
export class FrontMatterString extends FrontMatterValueToken {
    constructor() {
        super(...arguments);
        /**
         * Name of the `string` value type.
         */
        this.valueTypeName = 'quoted-string';
    }
    /**
     * Text of the string value without the wrapping quotes.
     */
    get cleanText() {
        return BaseToken.render(this.children.slice(1, this.children.length - 1));
    }
    toString() {
        return `front-matter-string(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTdHJpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3Rva2Vucy9mcm9udE1hdHRlclN0cmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFROUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQXNELFNBQVEscUJBRzFFO0lBSEQ7O1FBSUM7O1dBRUc7UUFDc0Isa0JBQWEsR0FBRyxlQUFlLENBQUM7SUFjMUQsQ0FBQztJQVpBOztPQUVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUNoRCxDQUFDO0lBQ0gsQ0FBQztJQUVlLFFBQVE7UUFDdkIsT0FBTyx1QkFBdUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNoRSxDQUFDO0NBQ0QifQ==