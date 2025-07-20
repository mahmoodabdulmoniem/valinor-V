/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterSequence } from './frontMatterSequence.js';
import { FrontMatterToken } from './frontMatterToken.js';
/**
 * Token representing a `record name` inside a Front Matter record.
 *
 * E.g., `name` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecordName extends FrontMatterToken {
    toString() {
        return `front-matter-record-name(${this.shortText()})${this.range}`;
    }
}
/**
 * Token representing a delimiter of a record inside a Front Matter header.
 *
 * E.g., `: ` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecordDelimiter extends FrontMatterToken {
    toString() {
        return `front-matter-delimiter(${this.shortText()})${this.range}`;
    }
}
/**
 * Token representing a `record` inside a Front Matter header.
 *
 * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecord extends FrontMatterToken {
    /**
     * Token that represent `name` of the record.
     *
     * E.g., `tools` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get nameToken() {
        return this.children[0];
    }
    /**
     * Token that represent `value` of the record.
     *
     * E.g., `['value']` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get valueToken() {
        return this.children[2];
    }
    /**
     * Trim spacing tokens at the end of the record.
     */
    trimValueEnd() {
        const { valueToken } = this;
        // only the "generic sequence" value tokens can hold
        // some spacing tokens at the end of them
        if ((valueToken instanceof FrontMatterSequence) === false) {
            return [];
        }
        const trimmedTokens = valueToken.trimEnd();
        // update the current range to reflect the current trimmed value
        this.withRange(BaseToken.fullRange(this.children));
        return trimmedTokens;
    }
    toString() {
        return `front-matter-record(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3Rva2Vucy9mcm9udE1hdHRlclJlY29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFL0QsT0FBTyxFQUFFLGdCQUFnQixFQUE4QyxNQUFNLHVCQUF1QixDQUFDO0FBT3JHOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsZ0JBQXVDO0lBQ2pFLFFBQVE7UUFDdkIsT0FBTyw0QkFBNEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0NBQ0Q7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGdCQUFnRDtJQUMvRSxRQUFRO1FBQ3ZCLE9BQU8sMEJBQTBCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbkUsQ0FBQztDQUNEO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxnQkFFdEM7SUFDQTs7Ozs7Ozs7OztPQVVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksWUFBWTtRQUNsQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTVCLG9EQUFvRDtRQUNwRCx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsWUFBWSxtQkFBbUIsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzNELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQyxnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FDbEMsQ0FBQztRQUVGLE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8sdUJBQXVCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEUsQ0FBQztDQUNEIn0=