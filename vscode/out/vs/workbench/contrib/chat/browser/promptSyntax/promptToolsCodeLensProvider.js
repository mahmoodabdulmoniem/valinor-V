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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { isITextModel } from '../../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { showToolsPicker } from '../actions/chatToolPicker.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR } from '../../common/promptSyntax/promptTypes.js';
import { PromptToolsMetadata } from '../../common/promptSyntax/parsers/promptHeader/metadata/tools.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { registerEditorFeature } from '../../../../../editor/common/editorFeatures.js';
import { PromptFileRewriter } from './promptFileRewriter.js';
let PromptToolsCodeLensProvider = class PromptToolsCodeLensProvider extends Disposable {
    constructor(promptsService, languageService, languageModelToolsService, instantiationService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this.languageModelToolsService = languageModelToolsService;
        this.instantiationService = instantiationService;
        // `_`-prefix marks this as private command
        this.cmdId = `_configure/${generateUuid()}`;
        this._register(this.languageService.codeLensProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
        this._register(CommandsRegistry.registerCommand(this.cmdId, (_accessor, ...args) => {
            const [first, second] = args;
            if (isITextModel(first) && second instanceof PromptToolsMetadata) {
                this.updateTools(first, second);
            }
        }));
    }
    async provideCodeLenses(model, token) {
        const parser = this.promptsService.getSyntaxParserFor(model);
        await parser.start(token).settled();
        const { header } = parser;
        if (!header) {
            return undefined;
        }
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        if (('tools' in header.metadataUtility) === false) {
            return undefined;
        }
        const { tools } = header.metadataUtility;
        if (tools === undefined) {
            return undefined;
        }
        const codeLens = {
            range: tools.range.collapseToStart(),
            command: {
                title: localize('configure-tools.capitalized.ellipsis', "Configure Tools..."),
                id: this.cmdId,
                arguments: [model, tools]
            }
        };
        return { lenses: [codeLens] };
    }
    async updateTools(model, tools) {
        const selectedToolsNow = tools.value ? this.languageModelToolsService.toToolAndToolSetEnablementMap(tools.value) : new Map();
        const newSelectedAfter = await this.instantiationService.invokeFunction(showToolsPicker, localize('placeholder', "Select tools"), undefined, selectedToolsNow);
        if (!newSelectedAfter) {
            return;
        }
        await this.instantiationService.createInstance(PromptFileRewriter).rewriteTools(model, newSelectedAfter, tools.range);
    }
};
PromptToolsCodeLensProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageModelToolsService),
    __param(3, IInstantiationService)
], PromptToolsCodeLensProvider);
registerEditorFeature(PromptToolsCodeLensProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VG9vbHNDb2RlTGVuc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3Byb21wdFRvb2xzQ29kZUxlbnNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQWMsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU3RCxJQUFNLDJC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