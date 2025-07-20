/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Can only be called with increasing values of `index`.
*/
export class MonotonousIndexTransformer {
    static fromMany(transformations) {
        // TODO improve performance by combining transformations first
        const transformers = transformations.map(t => new MonotonousIndexTransformer(t));
        return new CombinedIndexTransformer(transformers);
    }
    constructor(transformation) {
        this.transformation = transformation;
        this.idx = 0;
        this.offset = 0;
    }
    /**
     * Precondition: index >= previous-value-of(index).
     */
    transform(index) {
        let nextChange = this.transformation.replacements.at(this.idx);
        while (nextChange && nextChange.replaceRange.endExclusive <= index) {
            this.offset += nextChange.getLengthDelta();
            this.idx++;
            nextChange = this.transformation.replacements.at(this.idx);
        }
        // assert nextChange === undefined || index < nextChange.offset + nextChange.length
        if (nextChange && nextChange.replaceRange.start <= index) {
            // Offset is touched by the change
            return undefined;
        }
        return index + this.offset;
    }
}
export class CombinedIndexTransformer {
    constructor(transformers) {
        this.transformers = transformers;
    }
    transform(index) {
        for (const transformer of this.transformers) {
            const result = transformer.transform(index);
            if (result === undefined) {
                return undefined;
            }
            index = result;
        }
        return index;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmFuc2Zvcm1lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvaW5kZXhUcmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRzs7RUFFRTtBQUNGLE1BQU0sT0FBTywwQkFBMEI7SUFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUEwQjtRQUNoRCw4REFBOEQ7UUFDOUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixPQUFPLElBQUksd0JBQXdCLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUtELFlBQTZCLGNBQXVCO1FBQXZCLG1CQUFjLEdBQWQsY0FBYyxDQUFTO1FBSDVDLFFBQUcsR0FBRyxDQUFDLENBQUM7UUFDUixXQUFNLEdBQUcsQ0FBQyxDQUFDO0lBR25CLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0QsT0FBTyxVQUFVLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxZQUFZLElBQUksS0FBSyxFQUFFLENBQUM7WUFDcEUsSUFBSSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1gsVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUNELG1GQUFtRjtRQUVuRixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxRCxrQ0FBa0M7WUFDbEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxZQUNrQixZQUFpQztRQUFqQyxpQkFBWSxHQUFaLFlBQVksQ0FBcUI7SUFDL0MsQ0FBQztJQUVMLFNBQVMsQ0FBQyxLQUFhO1FBQ3RCLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCJ9