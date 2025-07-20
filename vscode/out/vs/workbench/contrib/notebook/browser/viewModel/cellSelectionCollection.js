/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { cellRangesEqual } from '../../common/notebookRange.js';
// Challenge is List View talks about `element`, which needs extra work to convert to ICellRange as we support Folding and Cell Move
export class NotebookCellSelectionCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeSelection = this._register(new Emitter());
        this._primary = { start: 0, end: 0 };
        this._selections = [{ start: 0, end: 0 }];
    }
    get onDidChangeSelection() { return this._onDidChangeSelection.event; }
    get selections() {
        return this._selections;
    }
    get focus() {
        return this._primary;
    }
    setState(primary, selections, forceEventEmit, source) {
        const validPrimary = primary ?? { start: 0, end: 0 };
        const validSelections = selections.length > 0 ? selections : [{ start: 0, end: 0 }];
        const changed = !cellRangesEqual([validPrimary], [this._primary]) || !cellRangesEqual(this._selections, validSelections);
        this._primary = validPrimary;
        this._selections = validSelections;
        if (changed || forceEventEmit) {
            this._onDidChangeSelection.fire(source);
        }
    }
    setSelections(selections, forceEventEmit, source) {
        this.setState(this._primary, selections, forceEventEmit, source);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFNlbGVjdGlvbkNvbGxlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2NlbGxTZWxlY3Rpb25Db2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLCtCQUErQixDQUFDO0FBRTVFLG9JQUFvSTtBQUNwSSxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsVUFBVTtJQUEvRDs7UUFFa0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVSxDQUFDLENBQUM7UUFHdkUsYUFBUSxHQUFlLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFFNUMsZ0JBQVcsR0FBaUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUEwQjVELENBQUM7SUE5QkEsSUFBSSxvQkFBb0IsS0FBb0IsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQU10RixJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsUUFBUSxDQUFDLE9BQTBCLEVBQUUsVUFBd0IsRUFBRSxjQUF1QixFQUFFLE1BQXdCO1FBQy9HLE1BQU0sWUFBWSxHQUFHLE9BQU8sSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ3JELE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXBGLE1BQU0sT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXpILElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDO1FBQzdCLElBQUksQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1FBQ25DLElBQUksT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBd0IsRUFBRSxjQUF1QixFQUFFLE1BQXdCO1FBQ3hGLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFLENBQUM7Q0FDRCJ9