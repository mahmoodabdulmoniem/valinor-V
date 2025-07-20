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
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { registerEditorContribution } from '../../../../../editor/browser/editorExtensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { PromptCodingAgentActionOverlayWidget } from './promptCodingAgentActionOverlay.js';
let PromptCodingAgentActionContribution = class PromptCodingAgentActionContribution extends Disposable {
    static { this.ID = 'promptCodingAgentActionContribution'; }
    constructor(_editor, _instantiationService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._overlayWidgets = this._register(new DisposableMap());
        this._register(this._editor.onDidChangeModel(() => {
            this._updateOverlayWidget();
        }));
        this._updateOverlayWidget();
    }
    _updateOverlayWidget() {
        const model = this._editor.getModel();
        // Remove existing overlay if present
        this._overlayWidgets.deleteAndDispose(this._editor);
        // Add overlay if this is a prompt file
        if (model && model.getLanguageId() === PROMPT_LANGUAGE_ID) {
            const widget = this._instantiationService.createInstance(PromptCodingAgentActionOverlayWidget, this._editor);
            this._overlayWidgets.set(this._editor, widget);
        }
    }
};
PromptCodingAgentActionContribution = __decorate([
    __param(1, IInstantiationService)
], PromptCodingAgentActionContribution);
export { PromptCodingAgentActionContribution };
registerEditorContribution(PromptCodingAgentActionContribution.ID, PromptCodingAgentActionContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29kaW5nQWdlbnRBY3Rpb25Db250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvcHJvbXB0Q29kaW5nQWdlbnRBY3Rpb25Db250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRixPQUFPLEVBQUUsMEJBQTBCLEVBQW1DLE1BQU0sbURBQW1ELENBQUM7QUFDaEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFcEYsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSxVQUFVO2FBQ2xELE9BQUUsR0FBRyxxQ0FBcUMsQUFBeEMsQ0FBeUM7SUFJM0QsWUFDa0IsT0FBb0IsRUFDZCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFIUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0csMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUpwRSxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXFELENBQUMsQ0FBQztRQVF6SCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ2pELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBQ08sb0JBQW9CO1FBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFdEMscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXBELHVDQUF1QztRQUN2QyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztZQUMzRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3RyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELENBQUM7SUFDRixDQUFDOztBQTVCVyxtQ0FBbUM7SUFPN0MsV0FBQSxxQkFBcUIsQ0FBQTtHQVBYLG1DQUFtQyxDQTZCL0M7O0FBRUQsMEJBQTBCLENBQUMsbUNBQW1DLENBQUMsRUFBRSxFQUFFLG1DQUFtQywyREFBbUQsQ0FBQyJ9