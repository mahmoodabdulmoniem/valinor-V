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
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { ToolSet } from '../../common/languageModelToolsService.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
let PromptFileRewriter = class PromptFileRewriter {
    constructor(_codeEditorService, _promptsService) {
        this._codeEditorService = _codeEditorService;
        this._promptsService = _promptsService;
    }
    async openAndRewriteTools(uri, newTools, token) {
        const editor = await this._codeEditorService.openCodeEditor({ resource: uri }, this._codeEditorService.getFocusedCodeEditor());
        if (!editor || !editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const parser = this._promptsService.getSyntaxParserFor(model);
        await parser.start(token).settled();
        const { header } = parser;
        if (header === undefined) {
            return undefined;
        }
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return;
        }
        if (('tools' in header.metadataUtility) === false) {
            return undefined;
        }
        const { tools } = header.metadataUtility;
        if (tools === undefined) {
            return undefined;
        }
        editor.setSelection(tools.range);
        await this.rewriteTools(model, newTools, tools.range);
    }
    rewriteTools(model, newTools, range) {
        const newToolNames = [];
        if (newTools === undefined) {
            model.pushStackElement();
            model.pushEditOperations(null, [EditOperation.replaceMove(range, '')], () => null);
            model.pushStackElement();
            return;
        }
        const toolsCoveredBySets = new Set();
        for (const [item, picked] of newTools) {
            if (picked && item instanceof ToolSet) {
                for (const tool of item.getTools()) {
                    toolsCoveredBySets.add(tool);
                }
            }
        }
        for (const [item, picked] of newTools) {
            if (picked) {
                if (item instanceof ToolSet) {
                    newToolNames.push(item.referenceName);
                }
                else if (!toolsCoveredBySets.has(item)) {
                    newToolNames.push(item.toolReferenceName ?? item.displayName);
                }
            }
        }
        model.pushStackElement();
        model.pushEditOperations(null, [EditOperation.replaceMove(range, `tools: [${newToolNames.map(s => `'${s}'`).join(', ')}]`)], () => null);
        model.pushStackElement();
    }
};
PromptFileRewriter = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IPromptsService)
], PromptFileRewriter);
export { PromptFileRewriter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJld3JpdGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3Byb21wdEZpbGVSZXdyaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHbkYsT0FBTyxFQUEyQyxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFL0UsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFDOUIsWUFDc0Msa0JBQXNDLEVBQ3pDLGVBQWdDO1FBRDdCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDekMsb0JBQWUsR0FBZixlQUFlLENBQWlCO0lBRW5FLENBQUM7SUFFTSxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBUSxFQUFFLFFBQWtELEVBQUUsS0FBd0I7UUFDdEgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDL0gsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ25DLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWhDLE1BQU0sTUFBTSxHQUFHLElB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