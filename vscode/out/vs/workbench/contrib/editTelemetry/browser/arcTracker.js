/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sumBy } from '../../../../base/common/arrays.js';
/**
 * The ARC (accepted and retained characters) counts how many characters inserted by the initial suggestion (trackedEdit)
 * stay unmodified after a certain amount of time after acceptance.
*/
export class ArcTracker {
    constructor(valueBeforeTrackedEdit, _trackedEdit) {
        this.valueBeforeTrackedEdit = valueBeforeTrackedEdit;
        this._trackedEdit = _trackedEdit;
        const eNormalized = _trackedEdit.removeCommonSuffixPrefix(valueBeforeTrackedEdit.getValue());
        this._updatedTrackedEdit = eNormalized.mapData(() => new IsTrackedEditData(true));
    }
    handleEdits(edit) {
        const e = edit.mapData(_d => new IsTrackedEditData(false));
        const composedEdit = this._updatedTrackedEdit.compose(e);
        const onlyTrackedEdit = composedEdit.decomposeSplit(e => !e.data.isTrackedEdit).e2;
        this._updatedTrackedEdit = onlyTrackedEdit;
    }
    getTrackedEdit() {
        return this._updatedTrackedEdit.toStringEdit();
    }
    getAcceptedRestrainedCharactersCount() {
        const s = sumBy(this._updatedTrackedEdit.replacements, e => e.getNewLength());
        return s;
    }
    getOriginalCharacterCount() {
        return sumBy(this._trackedEdit.replacements, e => e.getNewLength());
    }
    getDebugState() {
        return {
            edits: this._updatedTrackedEdit.replacements.map(e => ({
                range: e.replaceRange.toString(),
                newText: e.newText,
                isTrackedEdit: e.data.isTrackedEdit,
            }))
        };
    }
}
export class IsTrackedEditData {
    constructor(isTrackedEdit) {
        this.isTrackedEdit = isTrackedEdit;
    }
    join(data) {
        if (this.isTrackedEdit !== data.isTrackedEdit) {
            return undefined;
        }
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFRlbGVtZXRyeS9icm93c2VyL2FyY1RyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSTFEOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyxVQUFVO0lBR3RCLFlBQ2lCLHNCQUFvQyxFQUNuQyxZQUE0QjtRQUQ3QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQWM7UUFDbkMsaUJBQVksR0FBWixZQUFZLENBQWdCO1FBRTdDLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdGLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsV0FBVyxDQUFDLElBQW9CO1FBQy9CLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6RCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRixJQUFJLENBQUMsbUJBQW1CLEdBQUcsZUFBZSxDQUFDO0lBQzVDLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUVELG9DQUFvQztRQUNuQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELEtBQUssRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRTtnQkFDaEMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2dCQUNsQixhQUFhLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhO2FBQ25DLENBQUMsQ0FBQztTQUNILENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8saUJBQWlCO0lBQzdCLFlBQ2lCLGFBQXNCO1FBQXRCLGtCQUFhLEdBQWIsYUFBYSxDQUFTO0lBQ25DLENBQUM7SUFFTCxJQUFJLENBQUMsSUFBdUI7UUFDM0IsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMvQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==