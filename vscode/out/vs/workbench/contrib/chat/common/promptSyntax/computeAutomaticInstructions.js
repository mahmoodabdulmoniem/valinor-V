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
import { match, splitGlobAware } from '../../../../../base/common/glob.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IChatRequestVariableEntry, isPromptFileVariableEntry, toPromptFileVariableEntry, toPromptTextVariableEntry, PromptFileVariableKind } from '../chatVariableEntries.js';
import { PromptsConfig } from './config/config.js';
import { COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, isPromptOrInstructionsFile } from './config/promptFileLocations.js';
import { PromptsType } from './promptTypes.js';
import { IPromptsService } from './service/promptsService.js';
let ComputeAutomaticInstructions = class ComputeAutomaticInstructions {
    constructor(_readFileTool, _promptsService, _logService, _labelService, _configurationService, _workspaceService, _fileService) {
        this._readFileTool = _readFileTool;
        this._promptsService = _promptsService;
        this._logService = _logService;
        this._labelService = _labelService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._parseResults = new ResourceMap();
        this._autoAddedInstructions = [];
    }
    get autoAddedInstructions() {
        return this._autoAddedInstructions;
    }
    async _parseInstructionsFile(uri, token) {
        if (this._parseResults.has(uri)) {
            return this._parseResults.get(uri);
        }
        const result = await this._promptsService.parse(uri, PromptsType.instructions, token);
        this._parseResults.set(uri, result);
        return result;
    }
    async collect(variables, token) {
        const instructionFiles = await this._promptsService.listPromptFiles(PromptsType.instructions, token);
        this._logService.trace(`[InstructionsContextComputer] ${instructionFiles.length} instruction files available.`);
        // find instructions where the `applyTo` matches the attached context
        const context = this._getContext(variables);
        const autoAddedInstructions = await this.findInstructionFilesFor(instructionFiles, context, token);
        variables.add(...autoAddedInstructions);
        this._autoAddedInstructions.push(...autoAddedInstructions);
        // get copilot instructions
        const copilotInstructions = await this._getCopilotInstructions();
        for (const entry of copilotInstructions) {
            variables.add(entry);
        }
        this._logService.trace(`[InstructionsContextComputer]  ${copilotInstructions.length} Copilot instructions files added.`);
        const instructionsWithPatternsList = await this._getInstructionsWithPatternsList(instructionFiles, variables, token);
        if (instructionsWithPatternsList.length > 0) {
            const text = instructionsWithPatternsList.join('\n');
            variables.add(toPromptTextVariableEntry(text, PromptsConfig.COPILOT_INSTRUCTIONS, true));
        }
        // add all instructions for all instruction files that are in the context
        await this._addReferencedInstructions(variables, token);
    }
    async collectCopilotInstructionsOnly(variables, token) {
        const copilotInstructions = await this._getCopilotInstructions();
        for (const entry of copilotInstructions) {
            variables.add(entry);
        }
        this._logService.trace(`[InstructionsContextComputer]  ${copilotInstructions.length} Copilot instructions files added.`);
        // add all instructions for all instruction files that are in the context
        await this._addReferencedInstructions(variables, token);
        return;
    }
    /** public for testing */
    async findInstructionFilesFor(instructionFiles, context, token) {
        const autoAddedInstructions = [];
        for (const instructionFile of instructionFiles) {
            const { metadata, uri } = await this._parseInstructionsFile(instructionFile.uri, token);
            if (metadata?.promptType !== PromptsType.instructions) {
                this._logService.trace(`[InstructionsContextComputer] Not an instruction file: ${uri}`);
                continue;
            }
            const applyTo = metadata?.applyTo;
            if (!applyTo) {
                this._logService.trace(`[InstructionsContextComputer] No 'applyTo' found: ${uri}`);
                continue;
            }
            if (context.instructions.has(uri)) {
                // the instruction file is already part of the input or has already been processed
                this._logService.trace(`[InstructionsContextComputer] Skipping already processed instruction file: ${uri}`);
                continue;
            }
            const match = this._matches(context.files, applyTo);
            if (match) {
                this._logService.trace(`[InstructionsContextComputer] Match for ${uri} with ${match.pattern}${match.file ? ` for file ${match.file}` : ''}`);
                const reason = !match.file ?
                    localize('instruction.file.reason.allFiles', 'Automatically attached as pattern is **') :
                    localize('instruction.file.reason.specificFile', 'Automatically attached as pattern {0} matches {1}', applyTo, this._labelService.getUriLabel(match.file, { relative: true }));
                autoAddedInstructions.push(toPromptFileVariableEntry(uri, PromptFileVariableKind.Instruction, reason, true));
            }
            else {
                this._logService.trace(`[InstructionsContextComputer] No match for ${uri} with ${applyTo}`);
            }
        }
        return autoAddedInstructions;
    }
    _getContext(attachedContext) {
        const files = new ResourceSet();
        const instructions = new ResourceSet();
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                instructions.add(variable.value);
            }
            else {
                const uri = IChatRequestVariableEntry.toUri(variable);
                if (uri) {
                    files.add(uri);
                }
            }
        }
        return { files, instructions };
    }
    async _getCopilotInstructions() {
        const useCopilotInstructionsFiles = this._configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        if (!useCopilotInstructionsFiles) {
            return [];
        }
        const instructionFiles = [];
        instructionFiles.push(`.github/` + COPILOT_CUSTOM_INSTRUCTIONS_FILENAME);
        const { folders } = this._workspaceService.getWorkspace();
        const entries = [];
        for (const folder of folders) {
            for (const instructionFilePath of instructionFiles) {
                const file = joinPath(folder.uri, instructionFilePath);
                if (await this._fileService.exists(file)) {
                    entries.push(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.copilot', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_COPILOT_INSTRUCTION_FILES), true));
                }
            }
        }
        return entries;
    }
    _matches(files, applyToPattern) {
        const patterns = splitGlobAware(applyToPattern, ',');
        const patterMatches = (pattern) => {
            pattern = pattern.trim();
            if (pattern.length === 0) {
                // if glob pattern is empty, skip it
                return undefined;
            }
            if (pattern === '**' || pattern === '**/*' || pattern === '*') {
                // if glob pattern is one of the special wildcard values,
                // add the instructions file event if no files are attached
                return { pattern };
            }
            if (!pattern.startsWith('/') && !pattern.startsWith('**/')) {
                // support relative glob patterns, e.g. `src/**/*.js`
                pattern = '**/' + pattern;
            }
            // match each attached file with each glob pattern and
            // add the instructions file if its rule matches the file
            for (const file of files) {
                // if the file is not a valid URI, skip it
                if (match(pattern, file.path)) {
                    return { pattern, file }; // return the matched pattern and file URI
                }
            }
            return undefined;
        };
        for (const pattern of patterns) {
            const matchResult = patterMatches(pattern);
            if (matchResult) {
                return matchResult; // return the first matched pattern and file URI
            }
        }
        return undefined;
    }
    async _getInstructionsWithPatternsList(instructionFiles, _existingVariables, token) {
        if (!this._readFileTool) {
            this._logService.trace('[InstructionsContextComputer] No readFile tool available, skipping instructions with patterns list.');
            return [];
        }
        const entries = [];
        for (const instructionFile of instructionFiles) {
            const { metadata, uri } = await this._parseInstructionsFile(instructionFile.uri, token);
            if (metadata?.promptType !== PromptsType.instructions) {
                continue;
            }
            const applyTo = metadata?.applyTo;
            const description = metadata?.description ?? '';
            if (applyTo && applyTo !== '**' && applyTo !== '**/*' && applyTo !== '*') {
                entries.push(`| ${metadata.applyTo} | '${getFilePath(uri)}' | ${description} |`);
            }
        }
        if (entries.length === 0) {
            return entries;
        }
        const toolName = 'read_file'; // workaround https://github.com/microsoft/vscode/issues/252167
        return [
            'Here is a list of instruction files that contain rules for modifying or creating new code.',
            'These files are important for ensuring that the code is modified or created correctly.',
            'Please make sure to follow the rules specified in these files when working with the codebase.',
            `If the file is not already available as attachment, use the \`${toolName}\` tool to acquire it.`,
            'Make sure to acquire the instructions before making any changes to the code.',
            '| Pattern | File Path | Description |',
            '| ------- | --------- | ----------- |',
        ].concat(entries);
    }
    async _addReferencedInstructions(attachedContext, token) {
        const seen = new ResourceSet();
        const todo = [];
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                if (!seen.has(variable.value)) {
                    todo.push(variable.value);
                    seen.add(variable.value);
                }
            }
        }
        let next = todo.pop();
        while (next) {
            const result = await this._parseInstructionsFile(next, token);
            const refsToCheck = [];
            for (const ref of result.references) {
                if (!seen.has(ref) && (isPromptOrInstructionsFile(ref) || this._workspaceService.getWorkspaceFolder(ref) !== undefined)) {
                    // only add references that are either prompt or instruction files or are part of the workspace
                    refsToCheck.push({ resource: ref });
                    seen.add(ref);
                }
            }
            if (refsToCheck.length > 0) {
                const stats = await this._fileService.resolveAll(refsToCheck);
                for (let i = 0; i < stats.length; i++) {
                    const stat = stats[i];
                    const uri = refsToCheck[i].resource;
                    if (stat.success && stat.stat?.isFile) {
                        if (isPromptOrInstructionsFile(uri)) {
                            // only recursivly parse instruction files
                            todo.push(uri);
                        }
                        const reason = localize('instruction.file.reason.referenced', 'Referenced by {0}', basename(next));
                        attachedContext.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.InstructionReference, reason, true));
                    }
                }
            }
            next = todo.pop();
        }
    }
};
ComputeAutomaticInstructions = __decorate([
    __param(1, IPromptsService),
    __param(2, ILogService),
    __param(3, ILabelService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService)
], ComputeAutomaticInstructions);
export { ComputeAutomaticInstructions };
function getFilePath(uri) {
    if (uri.scheme === Schemas.file || uri.scheme === Schemas.vscodeRemote) {
        return uri.fsPath;
    }
    return uri.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUF1dG9tYXRpY0luc3RydWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbXB1dGVBdXRvbWF0aWNJbnN0cnVjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQTBCLHlCQUF5QixFQUE0Qix5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWpPLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsb0NBQW9DLEVBQUUs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