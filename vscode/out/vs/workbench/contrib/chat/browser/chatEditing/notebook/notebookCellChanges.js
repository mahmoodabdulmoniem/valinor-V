/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function countChanges(changes) {
    return changes.reduce((count, change) => {
        const diff = change.diff.get();
        // When we accept some of the cell insert/delete the items might still be in the list.
        if (diff.identical) {
            return count;
        }
        switch (change.type) {
            case 'delete':
                return count + 1; // We want to see 1 deleted entry in the pill for navigation
            case 'insert':
                return count + 1; // We want to see 1 new entry in the pill for navigation
            case 'modified':
                return count + diff.changes.length;
            default:
                return count;
        }
    }, 0);
}
export function sortCellChanges(changes) {
    const indexes = new Map();
    changes.forEach((c, i) => indexes.set(c, i));
    return [...changes].sort((a, b) => {
        // For unchanged and modified, use modifiedCellIndex
        if ((a.type === 'unchanged' || a.type === 'modified') &&
            (b.type === 'unchanged' || b.type === 'modified')) {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        // For delete entries, use originalCellIndex
        if (a.type === 'delete' && b.type === 'delete') {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // For insert entries, use modifiedCellIndex
        if (a.type === 'insert' && b.type === 'insert') {
            return a.modifiedCellIndex - b.modifiedCellIndex;
        }
        if (a.type === 'delete' && b.type === 'insert') {
            // If the deleted cell comes before the inserted cell, we want the delete to come first
            // As this means the cell was deleted before it was inserted
            // We would like to see the deleted cell first in the list
            // Else in the UI it would look weird to see an inserted cell before a deleted cell,
            // When the users operation was to first delete the cell and then insert a new one
            // I.e. this is merely just a simple way to ensure we have a stable sort.
            return indexes.get(a) - indexes.get(b);
        }
        if (a.type === 'insert' && b.type === 'delete') {
            // If the deleted cell comes before the inserted cell, we want the delete to come first
            // As this means the cell was deleted before it was inserted
            // We would like to see the deleted cell first in the list
            // Else in the UI it would look weird to see an inserted cell before a deleted cell,
            // When the users operation was to first delete the cell and then insert a new one
            // I.e. this is merely just a simple way to ensure we have a stable sort.
            return indexes.get(a) - indexes.get(b);
        }
        if ((a.type === 'delete' && b.type !== 'insert') || (a.type !== 'insert' && b.type === 'delete')) {
            return a.originalCellIndex - b.originalCellIndex;
        }
        // Mixed types: compare based on available indices
        const aIndex = a.type === 'delete' ? a.originalCellIndex :
            (a.type === 'insert' ? a.modifiedCellIndex : a.modifiedCellIndex);
        const bIndex = b.type === 'delete' ? b.originalCellIndex :
            (b.type === 'insert' ? b.modifiedCellIndex : b.modifiedCellIndex);
        return aIndex - bIndex;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQ2hhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL25vdGVib29rQ2VsbENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE0RGhHLE1BQU0sVUFBVSxZQUFZLENBQUMsT0FBd0I7SUFDcEQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDL0Isc0ZBQXNGO1FBQ3RGLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELFFBQVEsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLEtBQUssUUFBUTtnQkFDWixPQUFPLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyw0REFBNEQ7WUFDL0UsS0FBSyxRQUFRO2dCQUNaLE9BQU8sS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLHdEQUF3RDtZQUMzRSxLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDcEM7Z0JBQ0MsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRVAsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBd0I7SUFDdkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7SUFDakQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVB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