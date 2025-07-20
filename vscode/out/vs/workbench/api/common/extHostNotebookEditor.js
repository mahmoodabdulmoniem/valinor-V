/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from '../../../base/common/errors.js';
import * as extHostConverter from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { NotebookRange } from './extHostTypes.js';
export class ExtHostNotebookEditor {
    static { this.apiEditorsToExtHost = new WeakMap(); }
    constructor(id, _proxy, notebookData, _visibleRanges, _selections, _viewColumn, viewType) {
        this.id = id;
        this._proxy = _proxy;
        this.notebookData = notebookData;
        this._visibleRanges = _visibleRanges;
        this._selections = _selections;
        this._viewColumn = _viewColumn;
        this.viewType = viewType;
        this._visible = false;
    }
    get apiEditor() {
        if (!this._editor) {
            const that = this;
            this._editor = {
                get notebook() {
                    return that.notebookData.apiNotebook;
                },
                get selection() {
                    return that._selections[0];
                },
                set selection(selection) {
                    this.selections = [selection];
                },
                get selections() {
                    return that._selections;
                },
                set selections(value) {
                    if (!Array.isArray(value) || !value.every(extHostTypes.NotebookRange.isNotebookRange)) {
                        throw illegalArgument('selections');
                    }
                    that._selections = value.length === 0 ? [new NotebookRange(0, 0)] : value;
                    that._trySetSelections(that._selections);
                },
                get visibleRanges() {
                    return that._visibleRanges;
                },
                revealRange(range, revealType) {
                    that._proxy.$tryRevealRange(that.id, extHostConverter.NotebookRange.from(range), revealType ?? extHostTypes.NotebookEditorRevealType.Default);
                },
                get viewColumn() {
                    return that._viewColumn;
                },
                get replOptions() {
                    if (that.viewType === 'repl') {
                        return { appendIndex: this.notebook.cellCount - 1 };
                    }
                    return undefined;
                },
                [Symbol.for('debug.description')]() {
                    return `NotebookEditor(${this.notebook.uri.toString()})`;
                }
            };
            ExtHostNotebookEditor.apiEditorsToExtHost.set(this._editor, this);
        }
        return this._editor;
    }
    get visible() {
        return this._visible;
    }
    _acceptVisibility(value) {
        this._visible = value;
    }
    _acceptVisibleRanges(value) {
        this._visibleRanges = value;
    }
    _acceptSelections(selections) {
        this._selections = selections;
    }
    _trySetSelections(value) {
        this._proxy.$trySetSelections(this.id, value.map(extHostConverter.NotebookRange.from));
    }
    _acceptViewColumn(value) {
        this._viewColumn = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Tm90ZWJvb2tFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRWpFLE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRCxPQUFPLEtBQUssWUFBWSxNQUFNLG1CQUFtQixDQUFDO0FBR2xELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVsRCxNQUFNLE9BQU8scUJBQXFCO2FBRVYsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQWdELEFBQTlELENBQStEO0lBTXpHLFlBQ1UsRUFBVSxFQUNGLE1BQXNDLEVBQzlDLFlBQXFDLEVBQ3RDLGNBQXNDLEVBQ3RDLFdBQW1DLEVBQ25DLFdBQTBDLEVBQ2pDLFFBQWdCO1FBTnhCLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDRixXQUFNLEdBQU4sTUFBTSxDQUFnQztRQUM5QyxpQkFBWSxHQUFaLFlBQVksQ0FBeUI7UUFDdEMsbUJBQWMsR0FBZCxjQUFjLENBQXdCO1FBQ3RDLGdCQUFXLEdBQVgsV0FBVyxDQUF3QjtRQUNuQyxnQkFBVyxHQUFYLFdBQVcsQ0FBK0I7UUFDakMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQVgxQixhQUFRLEdBQVksS0FBSyxDQUFDO0lBWTlCLENBQUM7SUFFTCxJQUFJLFNBQVM7UUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxHQUFHO2dCQUNkLElBQUksUUFBUTtvQkFDWCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO2dCQUN0QyxDQUFDO2dCQUNELElBQUksU0FBUztvQkFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLENBQUM7Z0JBQ0QsSUFBSSxTQUFTLENBQUMsU0FBK0I7b0JBQzVDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDL0IsQ0FBQztnQkFDRCxJQUFJLFVBQVU7b0JBQ2IsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO2dCQUN6QixDQUFDO2dCQUNELElBQUksVUFBVSxDQUFDLEtBQTZCO29CQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO3dCQUN2RixNQUFNLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztvQkFDckMsQ0FBQztvQkFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQzFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFDLENBQUM7Z0JBQ0QsSUFBSSxhQUFhO29CQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQzVCLENBQUM7Z0JBQ0QsV0FBVyxDQUFDLEtBQUssRUFBRSxVQUFVO29CQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDMUIsSUFBSSxDQUFDLEVBQUUsRUFDUCxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUMxQyxVQUFVLElBQUksWUFBWSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FDM0QsQ0FBQztnQkFDSCxDQUFDO2dCQUNELElBQUksVUFBVTtvQkFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ3pCLENBQUM7Z0JBQ0QsSUFBSSxXQUFXO29CQUNkLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQzt3QkFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDckQsQ0FBQztvQkFDRCxPQUFPLFNBQVMsQ0FBQztnQkFDbEIsQ0FBQztnQkFDRCxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztvQkFDaEMsT0FBTyxrQkFBa0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztnQkFDMUQsQ0FBQzthQUNELENBQUM7WUFFRixxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQWM7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDdkIsQ0FBQztJQUVELG9CQUFvQixDQUFDLEtBQTZCO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzdCLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxVQUFrQztRQUNuRCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztJQUMvQixDQUFDO0lBRU8saUJBQWlCLENBQUMsS0FBNkI7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQW9DO1FBQ3JELElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQzFCLENBQUMifQ==