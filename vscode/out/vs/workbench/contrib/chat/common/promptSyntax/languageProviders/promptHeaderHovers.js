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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { InstructionsHeader } from '../parsers/promptHeader/instructionsHeader.js';
import { ModeHeader } from '../parsers/promptHeader/modeHeader.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR, getPromptsTypeForLanguageId } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
let PromptHeaderHoverProvider = class PromptHeaderHoverProvider extends Disposable {
    constructor(promptsService, languageService, languageModelToolsService, languageModelsService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHeaderHoverProvider';
        this._register(this.languageService.hoverProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
    }
    createHover(contents, range) {
        return {
            contents: [new MarkdownString(contents)],
            range
        };
    }
    async provideHover(model, position, token, _context) {
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
        if (header instanceof InstructionsHeader) {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.instructions.description', 'The description of the instruction file. It can be used to provide additional context or information about the instructions and is passed to the language model as part of the prompt.'), descriptionRange);
            }
            const applyToRange = header.metadataUtility.applyTo?.range;
            if (applyToRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.instructions.applyToRange', 'One or more glob pattern (separated by comma) that describe for which files the instructions apply to. Based on these patterns, the file is automatically included in the prompt, when the context contains a file that matches one or more of these patterns. Use `**` when you want this file to always be added.\nExample: **/*.ts, **/*.js, client/**'), applyToRange);
            }
        }
        else if (header instanceof ModeHeader) {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.mode.description', 'The description of the mode file. It can be used to provide additional context or information about the mode to the mode author.'), descriptionRange);
            }
            const model = header.metadataUtility.model;
            if (model?.range.containsPosition(position)) {
                return this.getModelHover(model, model.range, localize('promptHeader.mode.model', 'The model to use in this mode.'));
            }
            const tools = header.metadataUtility.tools;
            if (tools?.range?.containsPosition(position)) {
                return this.getToolHover(tools, position, localize('promptHeader.mode.tools', 'The tools to use in this mode.'));
            }
        }
        else {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.prompt.description', 'The description of the prompt file. It can be used to provide additional context or information about the prompt to the prompt author.'), descriptionRange);
            }
            const model = header.metadataUtility.model;
            if (model?.range.containsPosition(position)) {
                return this.getModelHover(model, model.range, localize('promptHeader.prompt.model', 'The model to use in this prompt.'));
            }
            const tools = header.metadataUtility.tools;
            if (tools?.range?.containsPosition(position)) {
                return this.getToolHover(tools, position, localize('promptHeader.prompt.tools', 'The tools to use in this prompt.'));
            }
            const modeRange = header.metadataUtility.mode?.range;
            if (modeRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.prompt.mode', 'The mode (ask, edit or agent) to use when running this prompt.'), modeRange);
            }
        }
        return undefined;
    }
    getToolHover(node, position, baseMessage) {
        if (node.value) {
            for (const toolName of node.value) {
                const toolRange = node.getToolRange(toolName);
                if (toolRange?.containsPosition(position)) {
                    const tool = this.languageModelToolsService.getToolByName(toolName);
                    if (tool) {
                        return this.createHover(tool.modelDescription, toolRange);
                    }
                    const toolSet = this.languageModelToolsService.getToolSetByName(toolName);
                    if (toolSet) {
                        return this.getToolsetHover(toolSet, toolRange);
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getToolsetHover(toolSet, range) {
        const lines = [];
        lines.push(localize('toolSetName', 'ToolSet: {0}\n\n', toolSet.referenceName));
        if (toolSet.description) {
            lines.push(toolSet.description);
        }
        for (const tool of toolSet.getTools()) {
            lines.push(`- ${tool.toolReferenceName ?? tool.displayName}`);
        }
        return this.createHover(lines.join('\n'), range);
    }
    getModelHover(node, range, baseMessage) {
        const modelName = node.value;
        if (modelName) {
            for (const id of this.languageModelsService.getLanguageModelIds()) {
                const meta = this.languageModelsService.lookupLanguageModel(id);
                if (meta && ILanguageModelChatMetadata.asQualifiedName(meta) === modelName) {
                    const lines = [];
                    lines.push(baseMessage + '\n');
                    lines.push(localize('modelName', '- Name: {0}', meta.name));
                    lines.push(localize('modelFamily', '- Family: {0}', meta.family));
                    lines.push(localize('modelVendor', '- Vendor: {0}', meta.vendor));
                    if (meta.description) {
                        lines.push('', '', meta.description);
                    }
                    return this.createHover(lines.join('\n'), range);
                }
            }
        }
        return this.createHover(baseMessage, range);
    }
};
PromptHeaderHoverProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageModelToolsService),
    __param(3, ILanguageModelsService)
], PromptHeaderHoverProvider);
export { PromptHeaderHoverProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVySG92ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvbXB0SGVhZGVySG92ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFLeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBR25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFeEQsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBTXhELFlBQ2tCLGNBQWdELEVBQ3ZDLGVBQTBELEVBQ3hELHlCQUFzRSxFQUMxRSxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUM7UUFMMEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ3RCLG9CQUFlLEdBQWYs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