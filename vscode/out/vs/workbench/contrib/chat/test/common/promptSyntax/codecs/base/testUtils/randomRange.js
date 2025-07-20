/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
/**
 * Generates a random {@link Range} object.
 *
 * @throws if {@link maxNumber} argument is less than `2`,
 *         is equal to `NaN` or is `infinite`.
 */
export function randomRange(maxNumber = 1_000) {
    assert(maxNumber > 1, `Max number must be greater than 1, got '${maxNumber}'.`);
    const startLineNumber = randomInt(maxNumber, 1);
    const endLineNumber = (randomBoolean() === true)
        ? startLineNumber
        : randomInt(2 * maxNumber, startLineNumber);
    const startColumnNumber = randomInt(maxNumber, 1);
    const endColumnNumber = (randomBoolean() === true)
        ? startColumnNumber + 1
        : randomInt(2 * maxNumber, startColumnNumber + 1);
    return new Range(startLineNumber, startColumnNumber, endLineNumber, endColumnNumber);
}
/**
 * Generates a random {@link Range} object that is different
 * from the provided one.
 */
export function randomRangeNotEqualTo(differentFrom, maxTries = 10) {
    let retriesLeft = maxTries;
    while (retriesLeft-- > 0) {
        const range = randomRange();
        if (range.equalsRange(differentFrom) === false) {
            return range;
        }
    }
    throw new Error(`Failed to generate a random range different from '${differentFrom}' in ${maxTries} tries.`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3Rlc3RVdGlscy9yYW5kb21SYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFekY7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLFlBQW9CLEtBQUs7SUFDcEQsTUFBTSxDQUNMLFNBQVMsR0FBRyxDQUFDLEVBQ2IsMkNBQTJDLFNBQVMsSUFBSSxDQUN4RCxDQUFDO0lBRUYsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNoRCxNQUFNLGFBQWEsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLElBQUksQ0FBQztRQUMvQyxDQUFDLENBQUMsZUFBZTtRQUNqQixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFFN0MsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sZUFBZSxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssSUFBSSxDQUFDO1FBQ2pELENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVuRCxPQUFPLElBQUksS0FBSyxDQUNmLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGVBQWUsQ0FDZixDQUFDO0FBQ0gsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxhQUFvQixFQUFFLFdBQW1CLEVBQUU7SUFDaEYsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDO0lBRTNCLE9BQU8sV0FBVyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDMUIsTUFBTSxLQUFLLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFDNUIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2hELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLElBQUksS0FBSyxDQUNkLHFEQUFxRCxhQUFhLFFBQVEsUUFBUSxTQUFTLENBQzNGLENBQUM7QUFDSCxDQUFDIn0=