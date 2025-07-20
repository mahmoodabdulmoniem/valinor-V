/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
class LongLinesHelper extends Disposable {
    static { this.ID = 'editor.contrib.longLinesHelper'; }
    static get(editor) {
        return editor.getContribution(LongLinesHelper.ID);
    }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(this._editor.onMouseDown((e) => {
            const stopRenderingLineAfter = this._editor.getOption(132 /* EditorOption.stopRenderingLineAfter */);
            if (stopRenderingLineAfter >= 0 && e.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && e.target.position.column >= stopRenderingLineAfter) {
                this._editor.updateOptions({
                    stopRenderingLineAfter: -1
                });
            }
        }));
    }
}
registerEditorContribution(LongLinesHelper.ID, LongLinesHelper, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9uZ0xpbmVzSGVscGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9sb25nTGluZXNIZWxwZXIvYnJvd3Nlci9sb25nTGluZXNIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUluSCxNQUFNLGVBQWdCLFNBQVEsVUFBVTthQUNoQixPQUFFLEdBQUcsZ0NBQWdDLENBQUM7SUFFdEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQWtCLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsWUFDa0IsT0FBb0I7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFGUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBSXJDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3QyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUywrQ0FBcUMsQ0FBQztZQUMzRixJQUFJLHNCQUFzQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUkseUNBQWlDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQ3pJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO29CQUMxQixzQkFBc0IsRUFBRSxDQUFDLENBQUM7aUJBQzFCLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUFHRiwwQkFBMEIsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGVBQWUsaUVBQXlELENBQUMifQ==