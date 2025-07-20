/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineCompletionLanguageStatusBarContribution_1;
import { createHotClass } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, debouncedObservable, derived, observableFromEvent } from '../../../../base/common/observable.js';
import Severity from '../../../../base/common/severity.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { localize } from '../../../../nls.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
let InlineCompletionLanguageStatusBarContribution = class InlineCompletionLanguageStatusBarContribution extends Disposable {
    static { InlineCompletionLanguageStatusBarContribution_1 = this; }
    static { this.hot = createHotClass(InlineCompletionLanguageStatusBarContribution_1); }
    static { this.Id = 'vs.contrib.inlineCompletionLanguageStatusBarContribution'; }
    static { this.languageStatusBarDisposables = new Set(); }
    constructor(_languageStatusService, _editorService) {
        super();
        this._languageStatusService = _languageStatusService;
        this._editorService = _editorService;
        this._activeEditor = observableFromEvent(this, _editorService.onDidActiveEditorChange, () => this._editorService.activeTextEditorControl);
        this._state = derived(this, reader => {
            const editor = this._activeEditor.read(reader);
            if (!editor || !isCodeEditor(editor)) {
                return undefined;
            }
            const c = InlineCompletionsController.get(editor);
            const model = c?.model.read(reader);
            if (!model) {
                return undefined;
            }
            return {
                model,
                status: debouncedObservable(model.status, 300),
            };
        });
        this._register(autorunWithStore((reader, store) => {
            const state = this._state.read(reader);
            if (!state) {
                return;
            }
            const status = state.status.read(reader);
            const statusMap = {
                loading: { shortLabel: '', label: localize('inlineSuggestionLoading', "Loading..."), loading: true, },
                ghostText: { shortLabel: '$(lightbulb)', label: '$(copilot) ' + localize('inlineCompletionAvailable', "Inline completion available"), loading: false, },
                inlineEdit: { shortLabel: '$(lightbulb-sparkle)', label: '$(copilot) ' + localize('inlineEditAvailable', "Inline edit available"), loading: false, },
                noSuggestion: { shortLabel: '$(circle-slash)', label: '$(copilot) ' + localize('noInlineSuggestionAvailable', "No inline suggestion available"), loading: false, },
            };
            store.add(this._languageStatusService.addStatus({
                accessibilityInfo: undefined,
                busy: statusMap[status].loading,
                command: undefined,
                detail: localize('inlineSuggestionsSmall', "Inline suggestions"),
                id: 'inlineSuggestions',
                label: { value: statusMap[status].label, shortValue: statusMap[status].shortLabel },
                name: localize('inlineSuggestions', "Inline Suggestions"),
                selector: { pattern: state.model.textModel.uri.fsPath },
                severity: Severity.Info,
                source: 'inlineSuggestions',
            }));
        }));
    }
};
InlineCompletionLanguageStatusBarContribution = InlineCompletionLanguageStatusBarContribution_1 = __decorate([
    __param(0, ILanguageStatusService),
    __param(1, IEditorService)
], InlineCompletionLanguageStatusBarContribution);
export { InlineCompletionLanguageStatusBarContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbkxhbmd1YWdlU3RhdHVzQmFyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2lubGluZUNvbXBsZXRpb25MYW5ndWFnZVN0YXR1c0JhckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVILE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxnR0FBZ0csQ0FBQztBQUM3SSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRW5HLElBQU0sNkNBQTZDLEdBQW5ELE1BQU0sNkNBQThDLFNBQVEsVUFBVTs7YUFDckQsUUFBRyxHQUFHLGNBQWMsQ0FBQywrQ0FBNkMsQ0FBQyxBQUFoRSxDQUFpRTthQUU3RSxPQUFFLEdBQUcsMERBQTBELEFBQTdELENBQThEO2FBQ3ZELGlDQUE0QixHQUFHLElBQUksR0FBRyxFQUFtQixBQUE3QixDQUE4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