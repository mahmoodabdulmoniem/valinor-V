/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../../baseToken.js';
/**
 * Base class for all "simple" tokens with a `range`.
 * A simple token is the one that represents a single character.
 */
export class SimpleToken extends BaseToken {
    /**
     * Create new token instance with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber, Constructor) {
        const { range } = line;
        return new Constructor(new Range(range.startLineNumber, atColumnNumber, range.startLineNumber, atColumnNumber + Constructor.symbol.length));
    }
}
/**
 * Base class for all tokens that represent some form of
 * a spacing character, e.g. 'space', 'tab', etc.
 */
export class SpacingToken extends SimpleToken {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlVG9rZW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvc2ltcGxlVG9rZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQWtCL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixXQUFvQyxTQUFRLFNBQWtCO0lBTW5GOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxTQUFTLENBQ3RCLElBQVUsRUFDVixjQUFzQixFQUN0QixXQUE0QztRQUU1QyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXZCLE9BQU8sSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQy9CLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLGNBQWMsRUFDZCxLQUFLLENBQUMsZUFBZSxFQUNyQixjQUFjLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQzFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsWUFBOEMsU0FBUSxXQUFvQjtDQUFJIn0=