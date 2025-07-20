/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
/**
 * An expected child reference to use in tests.
 */
export class ExpectedReference {
    constructor(options) {
        this.options = options;
    }
    /**
     * Validate that the provided reference is equal to this object.
     */
    validateEqual(other) {
        const { uri, text, path = [] } = this.options;
        const errorPrefix = `[${uri}] `;
        /**
         * Validate the base properties of the reference first.
         */
        assert.strictEqual(other.uri.toString(), uri.toString(), `${errorPrefix} Incorrect 'uri'.`);
        assert.strictEqual(other.text, text, `${errorPrefix} Incorrect 'text'.`);
        assert.strictEqual(other.path, path, `${errorPrefix} Incorrect 'path'.`);
        const range = new Range(this.options.startLine, this.options.startColumn, this.options.startLine, this.options.startColumn + text.length);
        assert(range.equalsRange(other.range), `${errorPrefix} Incorrect 'range': expected '${range}', got '${other.range}'.`);
        if (path.length) {
            assertDefined(other.linkRange, `${errorPrefix} Link range must be defined.`);
            const linkRange = new Range(this.options.startLine, this.options.pathStartColumn, this.options.startLine, this.options.pathStartColumn + path.length);
            assert(linkRange.equalsRange(other.linkRange), `${errorPrefix} Incorrect 'linkRange': expected '${linkRange}', got '${other.linkRange}'.`);
        }
        else {
            assert.strictEqual(other.linkRange, undefined, `${errorPrefix} Link range must be 'undefined'.`);
        }
    }
    /**
     * Returns a string representation of the reference.
     */
    toString() {
        return `expected-reference/${this.options.text}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3Rlc3RVdGlscy9leHBlY3RlZFJlZmVyZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQXlDMUU7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQzdCLFlBQTZCLE9BQWtDO1FBQWxDLFlBQU8sR0FBUCxPQUFPLENBQTJCO0lBQUksQ0FBQztJQUVwRTs7T0FFRztJQUNJLGFBQWEsQ0FBQyxLQUF1QjtRQUMzQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBRWhDOztXQUVHO1FBRUgsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDcEIsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUNkLEdBQUcsV0FBVyxtQkFBbUIsQ0FDakMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxJQUFJLEVBQ1YsSUFBSSxFQUNKLEdBQUcsV0FBVyxvQkFBb0IsQ0FDbEMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxJQUFJLEVBQ1YsSUFBSSxFQUNKLEdBQUcsV0FBVyxvQkFBb0IsQ0FDbEMsQ0FBQztRQUVGLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUN0QyxDQUFDO1FBRUYsTUFBTSxDQUNMLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUM5QixHQUFHLFdBQVcsaUNBQWlDLEtBQUssV0FBVyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQzlFLENBQUM7UUFFRixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixhQUFhLENBQ1osS0FBSyxDQUFDLFNBQVMsRUFDZixHQUFHLFdBQVcsOEJBQThCLENBQzVDLENBQUM7WUFFRixNQUFNLFNBQVMsR0FBRyxJQUFJLEtBQUssQ0FDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FDMUMsQ0FBQztZQUVGLE1BQU0sQ0FDTCxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFDdEMsR0FBRyxXQUFXLHFDQUFxQyxTQUFTLFdBQVcsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUMxRixDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsU0FBUyxFQUNmLFNBQVMsRUFDVCxHQUFHLFdBQVcsa0NBQWtDLENBQ2hELENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksUUFBUTtRQUNkLE9BQU8sc0JBQXNCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEQsQ0FBQztDQUNEIn0=