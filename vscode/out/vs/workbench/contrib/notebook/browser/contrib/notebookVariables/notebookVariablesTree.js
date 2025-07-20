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
var NotebookVariableRenderer_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../../../../../platform/list/browser/listService.js';
import { DebugExpressionRenderer } from '../../../../debug/browser/debugExpressionRenderer.js';
const $ = dom.$;
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
export const NOTEBOOK_TITLE = localize2('notebook.notebookVariables', "Notebook Variables");
export const REPL_TITLE = localize2('notebook.ReplVariables', "REPL Variables");
export class NotebookVariablesTree extends WorkbenchObjectTree {
}
export class NotebookVariablesDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return NotebookVariableRenderer.ID;
    }
}
let NotebookVariableRenderer = class NotebookVariableRenderer {
    static { NotebookVariableRenderer_1 = this; }
    static { this.ID = 'variableElement'; }
    get templateId() {
        return NotebookVariableRenderer_1.ID;
    }
    constructor(instantiationService) {
        this.expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
    }
    renderTemplate(container) {
        const expression = dom.append(container, $('.expression'));
        const name = dom.append(expression, $('span.name'));
        const value = dom.append(expression, $('span.value'));
        const template = { expression, name, value, elementDisposables: new DisposableStore() };
        return template;
    }
    renderElement(element, _index, data) {
        const text = element.element.value.trim() !== '' ? `${element.element.name}:` : element.element.name;
        data.name.textContent = text;
        data.name.title = element.element.type ?? '';
        data.elementDisposables.add(this.expressionRenderer.renderValue(data.value, element.element, {
            colorize: true,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            session: undefined,
        }));
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
    }
};
NotebookVariableRenderer = NotebookVariableRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], NotebookVariableRenderer);
export { NotebookVariableRenderer };
export class NotebookVariableAccessibilityProvider {
    constructor() {
        this._widgetAriaLabel = observableValue('widgetAriaLabel', NOTEBOOK_TITLE.value);
    }
    getWidgetAriaLabel() {
        return this._widgetAriaLabel;
    }
    updateWidgetAriaLabel(label) {
        this._widgetAriaLabel.set(label, undefined);
    }
    getAriaLabel(element) {
        return localize('notebookVariableAriaLabel', "Variable {0}, value {1}", element.name, element.value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tWYXJpYWJsZXNUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBSzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFvQixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHL0YsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNoQixNQUFNLGtDQUFrQyxHQUFHLElBQUksQ0FBQztBQUVoRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQXFCLFNBQVMsQ0FBQyw0QkFBNEIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0FBQzlHLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBcUIsU0FBUyxDQUFDLHdCQUF3QixFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFFbEcsTUFBTSxPQUFPLHFCQUFzQixTQUFRLG1CQUE2QztDQUFJO0FBRTVGLE1BQU0sT0FBTyx5QkFBeUI7SUFFckMsU0FBUyxDQUFDLE9BQWlDO1FBQzFDLE9BQU8s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