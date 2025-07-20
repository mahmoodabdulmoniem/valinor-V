/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
export var InlineDecorationType;
(function (InlineDecorationType) {
    InlineDecorationType[InlineDecorationType["Regular"] = 0] = "Regular";
    InlineDecorationType[InlineDecorationType["Before"] = 1] = "Before";
    InlineDecorationType[InlineDecorationType["After"] = 2] = "After";
    InlineDecorationType[InlineDecorationType["RegularAffectingLetterSpacing"] = 3] = "RegularAffectingLetterSpacing";
})(InlineDecorationType || (InlineDecorationType = {}));
export class InlineDecoration {
    constructor(range, inlineClassName, type) {
        this.range = range;
        this.inlineClassName = inlineClassName;
        this.type = type;
    }
}
export class SingleLineInlineDecoration {
    constructor(startOffset, endOffset, inlineClassName, inlineClassNameAffectsLetterSpacing) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.inlineClassName = inlineClassName;
        this.inlineClassNameAffectsLetterSpacing = inlineClassNameAffectsLetterSpacing;
    }
    toInlineDecoration(lineNumber) {
        return new InlineDecoration(new Range(lineNumber, this.startOffset + 1, lineNumber, this.endOffset + 1), this.inlineClassName, this.inlineClassNameAffectsLetterSpacing ? 3 /* InlineDecorationType.RegularAffectingLetterSpacing */ : 0 /* InlineDecorationType.Regular */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL2lubGluZURlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxNQUFNLENBQU4sSUFBa0Isb0JBS2pCO0FBTEQsV0FBa0Isb0JBQW9CO0lBQ3JDLHFFQUFXLENBQUE7SUFDWCxtRUFBVSxDQUFBO0lBQ1YsaUVBQVMsQ0FBQTtJQUNULGlIQUFpQyxDQUFBO0FBQ2xDLENBQUMsRUFMaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUtyQztBQUVELE1BQU0sT0FBTyxnQkFBZ0I7SUFDNUIsWUFDaUIsS0FBWSxFQUNaLGVBQXVCLEVBQ3ZCLElBQTBCO1FBRjFCLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixTQUFJLEdBQUosSUFBSSxDQUFzQjtJQUN2QyxDQUFDO0NBQ0w7QUFFRCxNQUFNLE9BQU8sMEJBQTBCO0lBQ3RDLFlBQ2lCLFdBQW1CLEVBQ25CLFNBQWlCLEVBQ2pCLGVBQXVCLEVBQ3ZCLG1DQUE0QztRQUg1QyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLHdDQUFtQyxHQUFuQyxtQ0FBbUMsQ0FBUztJQUU3RCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsVUFBa0I7UUFDcEMsT0FBTyxJQUFJLGdCQUFnQixDQUMxQixJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEVBQzNFLElBQUksQ0FBQyxlQUFlLEVBQ3BCLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLDREQUFvRCxDQUFDLHFDQUE2QixDQUM1SCxDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=