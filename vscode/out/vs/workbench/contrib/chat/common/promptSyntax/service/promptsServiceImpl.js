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
import { localize } from '../../../../../../nls.js';
import { getLanguageIdForPromptsType, getPromptsTypeForLanguageId, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../promptTypes.js';
import { PromptParser } from '../parsers/promptParser.js';
import { assert } from '../../../../../../base/common/assert.js';
import { basename } from '../../../../../../base/common/path.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../utils/objectCache.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { TextModelPromptParser } from '../parsers/textModelPromptParser.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { getCleanPromptName, PROMPT_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { PromptsConfig } from '../config/config.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(logger, labelService, modelService, instantiationService, userDataService, languageService, configurationService) {
        super();
        this.logger = logger;
        this.labelService = labelService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.userDataService = userDataService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this.fileLocator = this._register(this.instantiationService.createInstance(PromptFilesLocator));
        // the factory function below creates a new prompt parser object
        // for the provided model, if no active non-disposed parser exists
        this.cache = this._register(new ObjectCache((model) => {
            assert(model.isDisposed() === false, 'Text model must not be disposed.');
            /**
             * Note! When/if shared with "file" prompts, the `seenReferences` array below must be taken into account.
             * Otherwise consumers will either see incorrect failing or incorrect successful results, based on their
             * use case, timing of their calls to the {@link getSyntaxParserFor} function, and state of this service.
             */
            const parser = instantiationService.createInstance(TextModelPromptParser, model, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true }).start();
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            parser.assertNotDisposed('Created prompt parser must not be disposed.');
            return parser;
        }));
    }
    /**
     * Emitter for the custom chat modes change event.
     */
    get onDidChangeCustomChatModes() {
        if (!this.onDidChangeCustomChatModesEvent) {
            this.onDidChangeCustomChatModesEvent = this._register(this.fileLocator.createFilesUpdatedEvent(PromptsType.mode)).event;
            this._register(this.onDidChangeCustomChatModesEvent(() => {
                this.cachedCustomChatModes = undefined; // reset cached custom chat modes
            }));
        }
        return this.onDidChangeCustomChatModesEvent;
    }
    getPromptFileType(uri) {
        const model = this.modelService.getModel(uri);
        const languageId = model ? model.getLanguageId() : this.languageService.guessLanguageIdByFilepathOrFirstLine(uri);
        return languageId ? getPromptsTypeForLanguageId(languageId) : undefined;
    }
    /**
     * @throws {Error} if:
     * 	- the provided model is disposed
     * 	- newly created parser is disposed immediately on initialization.
     * 	  See factory function in the {@link constructor} for more info.
     */
    getSyntaxParserFor(model) {
        assert(model.isDisposed() === false, 'Cannot create a prompt syntax parser for a disposed model.');
        return this.cache.get(model);
    }
    async listPromptFiles(type, token) {
        if (!PromptsConfig.enabled(this.configurationService)) {
            return [];
        }
        const prompts = await Promise.all([
            this.fileLocator.listFiles(type, 'user', token)
                .then(withType('user', type)),
            this.fileLocator.listFiles(type, 'local', token)
                .then(withType('local', type)),
        ]);
        return prompts.flat();
    }
    getSourceFolders(type) {
        if (!PromptsConfig.enabled(this.configurationService)) {
            return [];
        }
        const result = [];
        for (const uri of this.fileLocator.getConfigBasedSourceFolders(type)) {
            result.push({ uri, storage: 'local', type });
        }
        const userHome = this.userDataService.currentProfile.promptsHome;
        result.push({ uri: userHome, storage: 'user', type });
        return result;
    }
    asPromptSlashCommand(command) {
        if (command.match(/^[\p{L}\d_\-\.]+$/u)) {
            return { command, detail: localize('prompt.file.detail', 'Prompt file: {0}', command) };
        }
        return undefined;
    }
    async resolvePromptSlashCommand(data, token) {
        const promptUri = await this.getPromptPath(data);
        if (!promptUri) {
            return undefined;
        }
        return await this.parse(promptUri, PromptsType.prompt, token);
    }
    async getPromptPath(data) {
        if (data.promptPath) {
            return data.promptPath.uri;
        }
        const files = await this.listPromptFiles(PromptsType.prompt, CancellationToken.None);
        const command = data.command;
        const result = files.find(file => getPromptCommandName(file.uri.path) === command);
        if (result) {
            return result.uri;
        }
        const textModel = this.modelService.getModels().find(model => model.getLanguageId() === PROMPT_LANGUAGE_ID && getPromptCommandName(model.uri.path) === command);
        if (textModel) {
            return textModel.uri;
        }
        return undefined;
    }
    async findPromptSlashCommands() {
        const promptFiles = await this.listPromptFiles(PromptsType.prompt, CancellationToken.None);
        return promptFiles.map(promptPath => {
            const command = getPromptCommandName(promptPath.uri.path);
            return {
                command,
                detail: localize('prompt.file.detail', 'Prompt file: {0}', this.labelService.getUriLabel(promptPath.uri, { relative: true })),
                promptPath
            };
        });
    }
    async getCustomChatModes(token) {
        if (!this.cachedCustomChatModes) {
            const customChatModes = this.computeCustomChatModes(token);
            if (!this.onDidChangeCustomChatModesEvent) {
                return customChatModes;
            }
            this.cachedCustomChatModes = customChatModes;
        }
        return this.cachedCustomChatModes;
    }
    async computeCustomChatModes(token) {
        const modeFiles = await this.listPromptFiles(PromptsType.mode, token);
        const metadataList = await Promise.all(modeFiles.map(async ({ uri }) => {
            let parser;
            try {
                // Note! this can be (and should be) improved by using shared parser instances
                // 		 that the `getSyntaxParserFor` method provides for opened documents.
                parser = this.instantiationService.createInstance(PromptParser, uri, { allowNonPromptFiles: true, languageId: MODE_LANGUAGE_ID, updateOnChange: false }).start(token);
                const completed = await parser.settled();
                if (!completed) {
                    throw new Error(localize('promptParser.notCompleted', "Prompt parser for {0} did not complete.", uri.toString()));
                }
                const body = await parser.getBody();
                const name = getCleanPromptName(uri);
                const metadata = parser.metadata;
                if (metadata?.promptType !== PromptsType.mode) {
                    return { uri, name, body };
                }
                const { description, model, tools } = metadata;
                return { uri, name, description, model, tools, body };
            }
            finally {
                parser?.dispose();
            }
        }));
        return metadataList;
    }
    async parse(uri, type, token) {
        let parser;
        try {
            const languageId = getLanguageIdForPromptsType(type);
            parser = this.instantiationService.createInstance(PromptParser, uri, { allowNonPromptFiles: true, languageId, updateOnChange: false }).start(token);
            const completed = await parser.settled();
            if (!completed) {
                throw new Error(localize('promptParser.notCompleted', "Prompt parser for {0} did not complete.", uri.toString()));
            }
            // make a copy, to avoid leaking the parser instance
            return {
                uri: parser.uri,
                metadata: parser.metadata,
                topError: parser.topError,
                references: parser.references.map(ref => ref.uri)
            };
        }
        finally {
            parser?.dispose();
        }
    }
};
PromptsService = __decorate([
    __param(0, ILogService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, IInstantiationService),
    __param(4, IUserDataProfileService),
    __param(5, ILanguageService),
    __param(6, IConfigurationService)
], PromptsService);
export { PromptsService };
export function getPromptCommandName(path) {
    const name = basename(path, PROMPT_FILE_EXTENSION);
    return name;
}
/**
 * Utility to add a provided prompt `storage` and
 * `type` attributes to a prompt URI.
 */
function addType(storage, type) {
    return (uri) => {
        return { uri, storage, type };
    };
}
/**
 * Utility to add a provided prompt `type` to a list of prompt URIs.
 */
function withType(storage, type) {
    return (uris) => {
        return uris
            .map(addType(storage, type));
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvc2VydmljZS9wcm9tcHRzU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoSixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxN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