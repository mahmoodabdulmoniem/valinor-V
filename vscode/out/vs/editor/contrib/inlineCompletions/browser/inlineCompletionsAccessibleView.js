/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { InlineCompletionContextKeys } from './controller/inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './controller/inlineCompletionsController.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TextEdit } from '../../../common/core/edits/textEdit.js';
import { LineEdit } from '../../../common/core/edits/lineEdit.js';
import { TextModelText } from '../../../common/model/textModelText.js';
export class InlineCompletionsAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 95;
        this.name = 'inline-completions';
        this.when = ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible);
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        const model = InlineCompletionsController.get(editor)?.model.get();
        if (!model?.state.get()) {
            return;
        }
        return new InlineCompletionsAccessibleViewContentProvider(editor, model);
    }
}
class InlineCompletionsAccessibleViewContentProvider extends Disposable {
    constructor(_editor, _model) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this.id = "inlineCompletions" /* AccessibleViewProviderId.InlineCompletions */;
        this.verbositySettingKey = 'accessibility.verbosity.inlineCompletions';
        this.options = { language: this._editor.getModel()?.getLanguageId() ?? undefined, type: "view" /* AccessibleViewType.View */ };
    }
    provideContent() {
        const state = this._model.state.get();
        if (!state) {
            throw new Error('Inline completion is visible but state is not available');
        }
        if (state.kind === 'ghostText') {
            const lineText = this._model.textModel.getLineContent(state.primaryGhostText.lineNumber);
            const ghostText = state.primaryGhostText.renderForScreenReader(lineText);
            if (!ghostText) {
                throw new Error('Inline completion is visible but ghost text is not available');
            }
            return lineText + ghostText;
        }
        else {
            const text = new TextModelText(this._model.textModel);
            const lineEdit = LineEdit.fromTextEdit(new TextEdit(state.edits), text);
            return lineEdit.humanReadablePatch(text.getLines());
        }
    }
    provideNextContent() {
        // asynchronously update the model and fire the event
        this._model.next().then((() => this._onDidChangeContent.fire()));
        return;
    }
    providePreviousContent() {
        // asynchronously update the model and fire the event
        this._model.previous().then((() => this._onDidChangeContent.fire()));
        return;
    }
    onClose() {
        this._model.stop();
        this._editor.focus();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9uc0FjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMxRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUcxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXZFLE1BQU0sT0FBTywrQkFBK0I7SUFBNUM7UUFDVSxTQUFJLHdDQUEyQjtRQUMvQixhQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2QsU0FBSSxHQUFHLG9CQUFvQixDQUFDO1FBQzVCLFNBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxDQUFDLDJCQUEyQixDQUFDLHVCQUF1QixFQUFFLDJCQUEyQixDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFldkksQ0FBQztJQWRBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDbkcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ25FLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCxPQUFPLElBQUksOENBQThDLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFFLENBQUM7Q0FDRDtBQUVELE1BQU0sOENBQStDLFNBQVEsVUFBVTtJQUl0RSxZQUNrQixPQUFvQixFQUNwQixNQUE4QjtRQUUvQyxLQUFLLEVBQUUsQ0FBQztRQUhTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsV0FBTSxHQUFOLE1BQU0sQ0FBd0I7UUFML0Isd0JBQW1CLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzFFLHVCQUFrQixHQUFnQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBVWpFLE9BQUUsd0VBQThDO1FBQ2hELHdCQUFtQixHQUFHLDJDQUEyQyxDQUFDO1FBSmpGLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxTQUFTLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxDQUFDO0lBQ25ILENBQUM7SUFLTSxjQUFjO1FBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBRWhDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekYsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1lBQ2pGLENBQUM7WUFDRCxPQUFPLFFBQVEsR0FBRyxTQUFTLENBQUM7UUFDN0IsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sUUFBUSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3JELENBQUM7SUFDRixDQUFDO0lBQ00sa0JBQWtCO1FBQ3hCLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakUsT0FBTztJQUNSLENBQUM7SUFDTSxzQkFBc0I7UUFDNUIscURBQXFEO1FBQ3JELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxPQUFPO0lBQ1IsQ0FBQztJQUNNLE9BQU87UUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztDQUNEIn0=