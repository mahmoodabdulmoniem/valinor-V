/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derived } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { TextEdit } from '../../../../../common/core/edits/textEdit.js';
import { StringText } from '../../../../../common/core/text/abstractText.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
export class InlineEditModel {
    constructor(_model, inlineEdit, tabAction) {
        this._model = _model;
        this.inlineEdit = inlineEdit;
        this.tabAction = tabAction;
        this.action = this.inlineEdit.inlineCompletion.action;
        this.displayName = this.inlineEdit.inlineCompletion.source.provider.displayName ?? localize('inlineEdit', "Inline Edit");
        this.extensionCommands = this.inlineEdit.inlineCompletion.source.inlineSuggestions.commands ?? [];
        this.isInDiffEditor = this._model.isInDiffEditor;
        this.displayLocation = this.inlineEdit.inlineCompletion.displayLocation;
        this.showCollapsed = this._model.showCollapsed;
    }
    accept() {
        this._model.accept();
    }
    jump() {
        this._model.jump();
    }
    abort(reason) {
        console.error(reason);
        this.inlineEdit.inlineCompletion.reportInlineEditError(reason);
        this._model.stop();
    }
    handleInlineEditShown(viewKind, viewData) {
        this._model.handleInlineSuggestionShown(this.inlineEdit.inlineCompletion, viewKind, viewData);
    }
}
export class InlineEditHost {
    constructor(_model) {
        this._model = _model;
        this.onDidAccept = this._model.onDidAccept;
        this.inAcceptFlow = this._model.inAcceptFlow;
    }
}
export class GhostTextIndicator {
    constructor(editor, model, lineRange, inlineCompletion) {
        this.lineRange = lineRange;
        const editorObs = observableCodeEditor(editor);
        const tabAction = derived(this, reader => {
            if (editorObs.isFocused.read(reader)) {
                if (inlineCompletion.showInlineEditMenu) {
                    return InlineEditTabAction.Accept;
                }
            }
            return InlineEditTabAction.Inactive;
        });
        this.model = new InlineEditModel(model, new InlineEditWithChanges(new StringText(''), new TextEdit([inlineCompletion.getSingleTextEdit()]), model.primaryPosition.get(), inlineCompletion.source.inlineSuggestions.commands ?? [], inlineCompletion), tabAction);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBZSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBSTdFLE9BQU8sRUFBeUYsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzSixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVuRSxNQUFNLE9BQU8sZUFBZTtJQVUzQixZQUNrQixNQUE4QixFQUN0QyxVQUFpQyxFQUNqQyxTQUEyQztRQUZuQyxXQUFNLEdBQU4sTUFBTSxDQUF3QjtRQUN0QyxlQUFVLEdBQVYsVUFBVSxDQUF1QjtRQUNqQyxjQUFTLEdBQVQsU0FBUyxDQUFrQztRQUVwRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1FBQ3RELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3pI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