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
var ChatDynamicVariableModel_1;
import { coalesce } from '../../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, dispose, isDisposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
export const dynamicVariableDecorationType = 'chat-dynamic-variable';
let ChatDynamicVariableModel = class ChatDynamicVariableModel extends Disposable {
    static { ChatDynamicVariableModel_1 = this; }
    static { this.ID = 'chatDynamicVariableModel'; }
    get variables() {
        return [...this._variables];
    }
    get id() {
        return ChatDynamicVariableModel_1.ID;
    }
    constructor(widget, labelService) {
        super();
        this.widget = widget;
        this.labelService = labelService;
        this._variables = [];
        this.decorationData = [];
        this._register(widget.inputEditor.onDidChangeModelContent(e => {
            const removed = [];
            let didChange = false;
            // Don't mutate entries in _variables, since they will be returned from the getter
            this._variables = coalesce(this._variables.map((ref, idx) => {
                const model = widget.inputEditor.getModel();
                if (!model) {
                    removed.push(ref);
                    return null;
                }
                const data = this.decorationData[idx];
                const newRange = model.getDecorationRange(data.id);
                if (!newRange) {
                    // gone
                    removed.push(ref);
                    return null;
                }
                const newText = model.getValueInRange(newRange);
                if (newText !== data.text) {
                    this.widget.inputEditor.executeEdits(this.id, [{
                            range: newRange,
                            text: '',
                        }]);
                    this.widget.refreshParsedInput();
                    removed.push(ref);
                    return null;
                }
                if (newRange.equalsRange(ref.range)) {
                    // all good
                    return ref;
                }
                didChange = true;
                return { ...ref, range: newRange };
            }));
            // cleanup disposable variables
            dispose(removed.filter(isDisposable));
            if (didChange || removed.length > 0) {
                this.widget.refreshParsedInput();
            }
            this.updateDecorations();
        }));
    }
    getInputState() {
        return this.variables;
    }
    setInputState(s) {
        if (!Array.isArray(s)) {
            s = [];
        }
        this.disposeVariables();
        this._variables = [];
        for (const variable of s) {
            if (!isDynamicVariable(variable)) {
                continue;
            }
            this.addReference(variable);
        }
    }
    addReference(ref) {
        this._variables.push(ref);
        this.updateDecorations();
        this.widget.refreshParsedInput();
    }
    updateDecorations() {
        const decorationIds = this.widget.inputEditor.setDecorationsByType('chat', dynamicVariableDecorationType, this._variables.map((r) => ({
            range: r.range,
            hoverMessage: this.getHoverForReference(r)
        })));
        this.decorationData = [];
        for (let i = 0; i < decorationIds.length; i++) {
            this.decorationData.push({
                id: decorationIds[i],
                text: this.widget.inputEditor.getModel().getValueInRange(this._variables[i].range)
            });
        }
    }
    getHoverForReference(ref) {
        const value = ref.data;
        if (URI.isUri(value)) {
            return new MarkdownString(this.labelService.getUriLabel(value, { relative: true }));
        }
        else if (isLocation(value)) {
            const prefix = ref.fullName ? ` ${ref.fullName}` : '';
            const rangeString = `#${value.range.startLineNumber}-${value.range.endLineNumber}`;
            return new MarkdownString(prefix + this.labelService.getUriLabel(value.uri, { relative: true }) + rangeString);
        }
        else {
            return undefined;
        }
    }
    /**
     * Dispose all existing variables.
     */
    disposeVariables() {
        for (const variable of this._variables) {
            if (isDisposable(variable)) {
                variable.dispose();
            }
        }
    }
    dispose() {
        this.disposeVariables();
        super.dispose();
    }
};
ChatDynamicVariableModel = ChatDynamicVariableModel_1 = __decorate([
    __param(1, ILabelService)
], ChatDynamicVariableModel);
export { ChatDynamicVariableModel };
/**
 * Loose check to filter objects that are obviously missing data
 */
function isDynamicVariable(obj) {
    return obj &&
        typeof obj.id === 'string' &&
        Range.isIRange(obj.range) &&
        'data' in obj;
}
function isAddDynamicVariableContext(context) {
    return 'widget' in context &&
        'range' in context &&
        'variableData' in context;
}
export class AddDynamicVariableAction extends Action2 {
    static { this.ID = 'workbench.action.chat.addDynamicVariable'; }
    constructor() {
        super({
            id: AddDynamicVariableAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!isAddDynamicVariableContext(context)) {
            return;
        }
        let range = context.range;
        const variableData = context.variableData;
        const doCleanup = () => {
            // Failed, remove the dangling variable prefix
            context.widget.inputEditor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: context.range, text: `` }]);
        };
        // If this completion item has no command, return it directly
        if (context.command) {
            // Invoke the command on this completion item along with its args and return the result
            const commandService = accessor.get(ICommandService);
            const selection = await commandService.executeCommand(context.command.id, ...(context.command.arguments ?? []));
            if (!selection) {
                doCleanup();
                return;
            }
            // Compute new range and variableData
            const insertText = ':' + selection;
            const insertRange = new Range(range.startLineNumber, range.endColumn, range.endLineNumber, range.endColumn + insertText.length);
            range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + insertText.length);
            const editor = context.widget.inputEditor;
            const success = editor.executeEdits('chatInsertDynamicVariableWithArguments', [{ range: insertRange, text: insertText + ' ' }]);
            if (!success) {
                doCleanup();
                return;
            }
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: context.id,
            range: range,
            isFile: true,
            data: variableData
        });
    }
}
registerAction2(AddDynamicVariableAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXREeW5hbWljVmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBVyxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFLOUUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsdUJBQXVCLENBQUM7QUFJOUQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOzthQUNoQyxPQUFFLEdBQUcsMEJBQTBCLEFBQTdCLENBQThCO0lBSXZELElBQUksU0FBUztRQUNaLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxFQUFFO1FBQ0wsT0FBTywwQkFBd0Is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