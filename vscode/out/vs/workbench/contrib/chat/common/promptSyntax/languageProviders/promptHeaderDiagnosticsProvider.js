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
import { IPromptsService } from '../service/promptsService.js';
import { ProviderInstanceBase } from './providerInstanceBase.js';
import { assertNever } from '../../../../../../base/common/assert.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ProviderInstanceManagerBase } from './providerInstanceManagerBase.js';
import { PromptMetadataError, PromptMetadataWarning } from '../parsers/promptHeader/diagnostics.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { PromptHeader } from '../parsers/promptHeader/promptHeader.js';
import { ModeHeader } from '../parsers/promptHeader/modeHeader.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { localize } from '../../../../../../nls.js';
import { ChatModeKind } from '../../constants.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'prompts-header-diagnostics-provider';
/**
 * Prompt header diagnostics provider for an individual text model
 * of a prompt file.
 */
let PromptHeaderDiagnosticsProvider = class PromptHeaderDiagnosticsProvider extends ProviderInstanceBase {
    constructor(model, promptsService, markerService, languageModelsService, languageModelToolsService) {
        super(model, promptsService);
        this.markerService = markerService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this._register(languageModelsService.onDidChangeLanguageModels(() => {
            this.onPromptSettled(undefined, CancellationToken.None);
        }));
        this._register(languageModelToolsService.onDidChangeTools(() => {
            this.onPromptSettled(undefined, CancellationToken.None);
        }));
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async onPromptSettled(_error, token) {
        const { header } = this.parser;
        if (header === undefined) {
            this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
            return;
        }
        // header parsing process is separate from the prompt parsing one, hence
        // apply markers only after the header is settled and so has diagnostics
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return;
        }
        const markers = [];
        for (const diagnostic of header.diagnostics) {
            markers.push(toMarker(diagnostic));
        }
        if (header instanceof PromptHeader) {
            this.validateTools(header.metadataUtility.tools, header.metadata.mode, markers);
            this.validateModel(header.metadataUtility.model, header.metadata.mode, markers);
        }
        else if (header instanceof ModeHeader) {
            this.validateTools(header.metadataUtility.tools, ChatModeKind.Agent, markers);
            this.validateModel(header.metadataUtility.model, ChatModeKind.Agent, markers);
        }
        if (markers.length === 0) {
            this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
            return;
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.model.uri, markers);
        return;
    }
    validateModel(modelNode, modeKind, markers) {
        if (!modelNode || modelNode.value === undefined) {
            return;
        }
        const languageModes = this.languageModelsService.getLanguageModelIds();
        if (languageModes.length === 0) {
            // likely the service is not initialized yet
            return;
        }
        const modelMetadata = this.findModelByName(languageModes, modelNode.value);
        if (!modelMetadata) {
            markers.push({
                message: localize('promptHeaderDiagnosticsProvider.modelNotFound', "Unknown model '{0}'", modelNode.value),
                severity: MarkerSeverity.Warning,
                ...modelNode.range,
            });
        }
        else if (modeKind === ChatModeKind.Agent && !ILanguageModelChatMetadata.suitableForAgentMode(modelMetadata)) {
            markers.push({
                message: localize('promptHeaderDiagnosticsProvider.modelNotSuited', "Model '{0}' is not suited for agent mode", modelNode.value),
                severity: MarkerSeverity.Warning,
                ...modelNode.range,
            });
        }
    }
    findModelByName(languageModes, modelName) {
        for (const model of languageModes) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false && ILanguageModelChatMetadata.asQualifiedName(metadata) === modelName) {
                return metadata;
            }
        }
        return undefined;
    }
    validateTools(tools, modeKind, markers) {
        if (!tools || tools.value === undefined || modeKind === ChatModeKind.Ask || modeKind === ChatModeKind.Edit) {
            return;
        }
        const toolNames = new Set(tools.value);
        if (toolNames.size === 0) {
            return;
        }
        for (const tool of this.languageModelToolsService.getTools()) {
            toolNames.delete(tool.toolReferenceName ?? tool.displayName);
        }
        for (const toolSet of this.languageModelToolsService.toolSets.get()) {
            toolNames.delete(toolSet.referenceName);
        }
        for (const toolName of toolNames) {
            const range = tools.getToolRange(toolName);
            if (range) {
                markers.push({
                    message: localize('promptHeaderDiagnosticsProvider.toolNotFound', "Unknown tool '{0}'", toolName),
                    severity: MarkerSeverity.Warning,
                    ...range,
                });
            }
        }
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-header-diagnostics:${this.model.uri.path}`;
    }
};
PromptHeaderDiagnosticsProvider = __decorate([
    __param(1, IPromptsService),
    __param(2, IMarkerService),
    __param(3, ILanguageModelsService),
    __param(4, ILanguageModelToolsService)
], PromptHeaderDiagnosticsProvider);
/**
 * Convert a provided diagnostic object into a marker data object.
 */
function toMarker(diagnostic) {
    if (diagnostic instanceof PromptMetadataWarning) {
        return {
            message: diagnostic.message,
            severity: MarkerSeverity.Warning,
            ...diagnostic.range,
        };
    }
    if (diagnostic instanceof PromptMetadataError) {
        return {
            message: diagnostic.message,
            severity: MarkerSeverity.Error,
            ...diagnostic.range,
        };
    }
    assertNever(diagnostic, `Unknown prompt metadata diagnostic type '${diagnostic}'.`);
}
/**
 * The class that manages creation and disposal of {@link PromptHeaderDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export class PromptHeaderDiagnosticsInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptHeaderDiagnosticsProvider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyRGlhZ25vc3RpY3NQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdEhlYWRlckRpYWdub3N0aWNzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsMkJBQTJCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxFQUFlLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakgsT0FBTyxFQUFlLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7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