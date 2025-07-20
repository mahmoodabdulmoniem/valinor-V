/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
import { StringEdit, StringReplacement } from '../core/edits/stringEdit.js';
import { OffsetRange } from '../core/ranges/offsetRange.js';
import { LengthEdit } from '../core/edits/lengthEdit.js';
import { countEOL } from '../core/misc/eolCounter.js';
export function offsetEditToEditOperations(offsetEdit, doc) {
    const edits = [];
    for (const singleEdit of offsetEdit.replacements) {
        const range = Range.fromPositions(doc.getPositionAt(singleEdit.replaceRange.start), doc.getPositionAt(singleEdit.replaceRange.start + singleEdit.replaceRange.length));
        edits.push(EditOperation.replace(range, singleEdit.newText));
    }
    return edits;
}
export function offsetEditFromContentChanges(contentChanges) {
    const editsArr = contentChanges.map(c => new StringReplacement(OffsetRange.ofStartAndLength(c.rangeOffset, c.rangeLength), c.text));
    editsArr.reverse();
    const edits = new StringEdit(editsArr);
    return edits;
}
export function offsetEditFromLineRangeMapping(original, modified, changes) {
    const edits = [];
    for (const c of changes) {
        for (const i of c.innerChanges ?? []) {
            const newText = modified.getValueInRange(i.modifiedRange);
            const startOrig = original.getOffsetAt(i.originalRange.getStartPosition());
            const endExOrig = original.getOffsetAt(i.originalRange.getEndPosition());
            const origRange = new OffsetRange(startOrig, endExOrig);
            edits.push(new StringReplacement(origRange, newText));
        }
    }
    return new StringEdit(edits);
}
export function linesLengthEditFromModelContentChange(c) {
    const contentChanges = c.slice().reverse();
    const lengthEdits = contentChanges.map(c => LengthEdit.replace(
    // Expand the edit range to include the entire line
    new OffsetRange(c.range.startLineNumber - 1, c.range.endLineNumber), countEOL(c.text)[0] + 1));
    const lengthEdit = LengthEdit.compose(lengthEdits);
    return lengthEdit;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsU3RyaW5nRWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxTdHJpbmdFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUk1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXRELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxVQUFzQixFQUFFLEdBQWU7SUFDakYsTUFBTSxLQUFLLEdBQXFDLEVBQUUsQ0FBQztJQUNuRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNsRCxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsYUFBYSxDQUNoQyxHQUFHLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQ2hELEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FDakYsQ0FBQztRQUNGLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEIsQ0FBQyxjQUE4QztJQUMxRixNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxRQUFvQixFQUFFLFFBQW9CLEVBQUUsT0FBNEM7SUFDdEksTUFBTSxLQUFLLEdBQXdCLEVBQUUsQ0FBQztJQUN0QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUUxRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLE1BQU0sU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUV4RCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFFRCxNQUFNLFVBQVUscUNBQXFDLENBQUMsQ0FBd0I7SUFDN0UsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNDLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTztJQUM3RCxtREFBbUQ7SUFDbkQsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQ25FLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3hCLENBQUM7SUFDRixNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELE9BQU8sVUFBVSxDQUFDO0FBQ25CLENBQUMifQ==