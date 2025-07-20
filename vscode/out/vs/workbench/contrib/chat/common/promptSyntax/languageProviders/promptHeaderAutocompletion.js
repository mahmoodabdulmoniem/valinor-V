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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { ModeHeader } from '../parsers/promptHeader/modeHeader.js';
import { PromptHeader } from '../parsers/promptHeader/promptHeader.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR, getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
let PromptHeaderAutocompletion = class PromptHeaderAutocompletion extends Disposable {
    constructor(promptsService, languageService, languageModelsService, languageModelToolsService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHeaderAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':'];
        this._register(this.languageService.completionProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any completions
            return undefined;
        }
        const parser = this.promptsService.getSyntaxParserFor(model);
        await parser.start(token).settled();
        if (token.isCancellationRequested) {
            return undefined;
        }
        const header = parser.header;
        if (!header) {
            return undefined;
        }
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        const fullHeaderRange = parser.header.range;
        const headerRange = new Range(fullHeaderRange.startLineNumber + 1, 0, fullHeaderRange.endLineNumber - 1, model.getLineMaxColumn(fullHeaderRange.endLineNumber - 1));
        if (!headerRange.containsPosition(position)) {
            // if the position is not inside the header, we don't provide any completions
            return undefined;
        }
        const lineText = model.getLineContent(position.lineNumber);
        const colonIndex = lineText.indexOf(':');
        const colonPosition = colonIndex !== -1 ? new Position(position.lineNumber, colonIndex + 1) : undefined;
        if (!colonPosition || position.isBeforeOrEqual(colonPosition)) {
            return this.providePropertyCompletions(model, position, headerRange, colonPosition, promptType);
        }
        else if (colonPosition && colonPosition.isBefore(position)) {
            return this.provideValueCompletions(model, position, header, colonPosition, promptType);
        }
        return undefined;
    }
    async providePropertyCompletions(model, position, headerRange, colonPosition, promptType) {
        const suggestions = [];
        const supportedProperties = this.getSupportedProperties(promptType);
        this.removeUsedProperties(supportedProperties, model, headerRange, position);
        const getInsertText = (property) => {
            if (colonPosition) {
                return property;
            }
            const valueSuggestions = this.getValueSuggestions(promptType, property);
            if (valueSuggestions.length > 0) {
                return `${property}: \${0:${valueSuggestions[0]}}`;
            }
            else {
                return `${property}: \$0`;
            }
        };
        for (const property of supportedProperties) {
            const item = {
                label: property,
                kind: 9 /* CompletionItemKind.Property */,
                insertText: getInsertText(property),
                insertTextRules: 4 /* CompletionItemInsertTextRule.InsertAsSnippet */,
                range: new Range(position.lineNumber, 1, position.lineNumber, !colonPosition ? model.getLineMaxColumn(position.lineNumber) : colonPosition.column),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    async provideValueCompletions(model, position, header, colonPosition, promptType) {
        const suggestions = [];
        const lineContent = model.getLineContent(position.lineNumber);
        const property = lineContent.substring(0, colonPosition.column - 1).trim();
        if (!this.getSupportedProperties(promptType).has(property)) {
            return undefined;
        }
        if (header instanceof PromptHeader || header instanceof ModeHeader) {
            const tools = header.metadataUtility.tools;
            if (tools) {
                // if the position is inside the tools metadata, we provide tool name completions
                const result = this.provideToolCompletions(model, position, tools);
                if (result) {
                    return result;
                }
            }
        }
        const bracketIndex = lineContent.indexOf('[');
        if (bracketIndex !== -1 && bracketIndex <= position.column - 1) {
            // if the property is already inside a bracket, we don't provide value completions
            return undefined;
        }
        const whilespaceAfterColon = (lineContent.substring(colonPosition.column).match(/^\s*/)?.[0].length) ?? 0;
        const values = this.getValueSuggestions(promptType, property);
        for (const value of values) {
            const item = {
                label: value,
                kind: 13 /* CompletionItemKind.Value */,
                insertText: whilespaceAfterColon === 0 ? ` ${value}` : value,
                range: new Range(position.lineNumber, colonPosition.column + whilespaceAfterColon + 1, position.lineNumber, model.getLineMaxColumn(position.lineNumber)),
            };
            suggestions.push(item);
        }
        return { suggestions };
    }
    getSupportedProperties(promptType) {
        switch (promptType) {
            case PromptsType.instructions:
                return new Set(['applyTo', 'description']);
            case PromptsType.prompt:
                return new Set(['mode', 'tools', 'description', 'model']);
            default:
                return new Set(['tools', 'description', 'model']);
        }
    }
    removeUsedProperties(properties, model, headerRange, position) {
        for (let i = headerRange.startLineNumber; i <= headerRange.endLineNumber; i++) {
            if (i !== position.lineNumber) {
                const lineText = model.getLineContent(i);
                const colonIndex = lineText.indexOf(':');
                if (colonIndex !== -1) {
                    const property = lineText.substring(0, colonIndex).trim();
                    properties.delete(property);
                }
            }
        }
    }
    getValueSuggestions(promptType, property) {
        if (promptType === PromptsType.instructions && property === 'applyTo') {
            return ['**', '**/*.ts, **/*.js', '**/*.php', '**/*.py'];
        }
        if (promptType === PromptsType.prompt && property === 'mode') {
            return ['agent', 'edit', 'ask'];
        }
        if (property === 'tools' && (promptType === PromptsType.prompt || promptType === PromptsType.mode)) {
            return ['[]', `['codebase', 'editFiles', 'fetch']`];
        }
        if (property === 'model' && (promptType === PromptsType.prompt || promptType === PromptsType.mode)) {
            return this.getModelNames(promptType === PromptsType.mode);
        }
        return [];
    }
    getModelNames(agentModeOnly) {
        const result = [];
        for (const model of this.languageModelsService.getLanguageModelIds()) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false) {
                if (!agentModeOnly || ILanguageModelChatMetadata.suitableForAgentMode(metadata)) {
                    result.push(ILanguageModelChatMetadata.asQualifiedName(metadata));
                }
            }
        }
        return result;
    }
    provideToolCompletions(model, position, node) {
        const tools = node.value;
        if (!tools || !node.range.containsPosition(position)) {
            return undefined;
        }
        const getSuggestions = (toolRange) => {
            const suggestions = [];
            const addSuggestion = (toolName, toolRange) => {
                let insertText;
                if (!toolRange.isEmpty()) {
                    const firstChar = model.getValueInRange(toolRange).charCodeAt(0);
                    insertText = firstChar === 39 /* CharCode.SingleQuote */ ? `'${toolName}'` : firstChar === 34 /* CharCode.DoubleQuote */ ? `"${toolName}"` : toolName;
                }
                else {
                    insertText = `'${toolName}'`;
                }
                suggestions.push({
                    label: toolName,
                    kind: 13 /* CompletionItemKind.Value */,
                    filterText: insertText,
                    insertText: insertText,
                    range: toolRange,
                });
            };
            for (const tool of this.languageModelToolsService.getTools()) {
                if (tool.canBeReferencedInPrompt) {
                    addSuggestion(tool.toolReferenceName ?? tool.displayName, toolRange);
                }
            }
            for (const toolSet of this.languageModelToolsService.toolSets.get()) {
                addSuggestion(toolSet.referenceName, toolRange);
            }
            return { suggestions };
        };
        for (const tool of tools) {
            const toolRange = node.getToolRange(tool);
            if (toolRange?.containsPosition(position)) {
                // if the position is inside a tool range, we provide tool name completions
                return getSuggestions(toolRange);
            }
        }
        const prefix = model.getValueInRange(new Range(position.lineNumber, 1, position.lineNumber, position.column));
        if (prefix.match(/[,[]\s*$/)) {
            // if the position is after a comma or bracket
            return getSuggestions(new Range(position.lineNumber, position.column, position.lineNumber, position.column));
        }
        return undefined;
    }
};
PromptHeaderAutocompletion = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageModelsService),
    __param(3, ILanguageModelToolsService)
], PromptHeaderAutocompletion);
export { PromptHeaderAutocompletion };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyQXV0b2NvbXBsZXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm9tcHRIZWFkZXJBdXRvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUdoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSwyQkFBMkIsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFeEQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBV3pELFlBQ2tCLGNBQWdELEVBQ3ZDLGVBQTBELEVBQzVELHFCQUE4RCxFQUMxRCx5QkFBc0U7UUFFbEcsS0FBSyxFQUFFLENBQUM7UUFMMEIsbUJBQWMsR0FBZCxjQUFj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