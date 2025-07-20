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
import { isFalsyOrEmpty } from '../../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableFromEvent, observableSignalFromEvent, autorun, transaction } from '../../../../../base/common/observable.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType, isObject } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../common/languageModelToolsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Codicon, getAllCodicons } from '../../../../../base/common/codicons.js';
import { isValidBasename } from '../../../../../base/common/extpath.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { parse } from '../../../../../base/common/jsonc.js';
import * as JSONContributionRegistry from '../../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatViewId } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
const toolEnumValues = [];
const toolEnumDescriptions = [];
const toolSetSchemaId = 'vscode://schemas/toolsets';
const toolSetsSchema = {
    id: toolSetSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [{
            label: localize('schema.default', "Empty tool set"),
            body: { '${1:toolSetName}': { 'tools': ['${2:someTool}', '${3:anotherTool}'], 'description': '${4:description}', 'icon': '${5:tools}' } }
        }],
    type: 'object',
    description: localize('toolsetSchema.json', 'User tool sets configuration'),
    additionalProperties: {
        type: 'object',
        required: ['tools'],
        additionalProperties: false,
        properties: {
            tools: {
                description: localize('schema.tools', "A list of tools or tool sets to include in this tool set. Cannot be empty and must reference tools the way they are referenced in prompts."),
                type: 'array',
                minItems: 1,
                items: {
                    type: 'string',
                    enum: toolEnumValues,
                    enumDescriptions: toolEnumDescriptions,
                }
            },
            icon: {
                description: localize('schema.icon', "Icon to use for this tool set in the UI. Uses the `\\$(name)`-syntax, like `\\$(zap)`"),
                type: 'string',
                enum: Array.from(getAllCodicons(), icon => icon.id),
                markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
            },
            description: {
                description: localize('schema.description', "A short description of this tool set."),
                type: 'string'
            },
        },
    }
};
const reg = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
class RawToolSetsShape {
    static { this.suffix = '.toolsets.jsonc'; }
    static isToolSetFileName(uri) {
        return basename(uri).endsWith(RawToolSetsShape.suffix);
    }
    static from(data, logService) {
        if (!isObject(data)) {
            throw new Error(`Invalid tool set data`);
        }
        const map = new Map();
        for (const [name, value] of Object.entries(data)) {
            if (isFalsyOrWhitespace(name)) {
                logService.error(`Tool set name cannot be empty`);
            }
            if (isFalsyOrEmpty(value.tools)) {
                logService.error(`Tool set '${name}' cannot have an empty tools array`);
            }
            map.set(name, {
                name,
                tools: value.tools,
                description: value.description,
                icon: value.icon,
            });
        }
        return new class extends RawToolSetsShape {
        }(map);
    }
    constructor(entries) {
        this.entries = Object.freeze(new Map(entries));
    }
}
let UserToolSetsContributions = class UserToolSetsContributions extends Disposable {
    static { this.ID = 'chat.userToolSets'; }
    constructor(extensionService, lifecycleService, _languageModelToolsService, _userDataProfileService, _fileService, _logService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._userDataProfileService = _userDataProfileService;
        this._fileService = _fileService;
        this._logService = _logService;
        Promise.allSettled([
            extensionService.whenInstalledExtensionsRegistered,
            lifecycleService.when(3 /* LifecyclePhase.Restored */)
        ]).then(() => this._initToolSets());
        const toolsObs = observableFromEvent(this, _languageModelToolsService.onDidChangeTools, () => Array.from(_languageModelToolsService.getTools()));
        const store = this._store.add(new DisposableStore());
        this._store.add(autorun(r => {
            const tools = toolsObs.read(r);
            const toolSets = this._languageModelToolsService.toolSets.read(r);
            const data = [];
            for (const tool of tools) {
                if (tool.canBeReferencedInPrompt) {
                    data.push({
                        name: tool.toolReferenceName ?? tool.displayName,
                        sourceLabel: ToolDataSource.classify(tool.source).label,
                        sourceOrdinal: ToolDataSource.classify(tool.source).ordinal,
                        description: tool.userDescription ?? tool.modelDescription
                    });
                }
            }
            for (const toolSet of toolSets) {
                data.push({
                    name: toolSet.referenceName,
                    sourceLabel: ToolDataSource.classify(toolSet.source).label,
                    sourceOrdinal: ToolDataSource.classify(toolSet.source).ordinal,
                    description: toolSet.description
                });
            }
            toolEnumValues.length = 0;
            toolEnumDescriptions.length = 0;
            data.sort((a, b) => {
                if (a.sourceOrdinal !== b.sourceOrdinal) {
                    return a.sourceOrdinal - b.sourceOrdinal;
                }
                if (a.sourceLabel !== b.sourceLabel) {
                    return a.sourceLabel.localeCompare(b.sourceLabel);
                }
                return a.name.localeCompare(b.name);
            });
            for (const item of data) {
                toolEnumValues.push(item.name);
                toolEnumDescriptions.push(localize('tool.description', "{1} ({0})\n\n{2}", item.sourceLabel, item.name, item.description));
            }
            store.clear(); // reset old schema
            reg.registerSchema(toolSetSchemaId, toolSetsSchema, store);
        }));
    }
    _initToolSets() {
        const promptFolder = observableFromEvent(this, this._userDataProfileService.onDidChangeCurrentProfile, () => this._userDataProfileService.currentProfile.promptsHome);
        const toolsSig = observableSignalFromEvent(this, this._languageModelToolsService.onDidChangeTools);
        const fileEventSig = observableSignalFromEvent(this, Event.filter(this._fileService.onDidFilesChange, e => e.affects(promptFolder.get())));
        const store = this._store.add(new DisposableStore());
        const getFilesInFolder = async (folder) => {
            try {
                return (await this._fileService.resolve(folder)).children ?? [];
            }
            catch (err) {
                return []; // folder does not exist or cannot be read
            }
        };
        this._store.add(autorun(async (r) => {
            store.clear();
            toolsSig.read(r); // SIGNALS
            fileEventSig.read(r);
            const uri = promptFolder.read(r);
            const cts = new CancellationTokenSource();
            store.add(toDisposable(() => cts.dispose(true)));
            const entries = await getFilesInFolder(uri);
            if (cts.token.isCancellationRequested) {
                return;
            }
            for (const entry of entries) {
                if (!entry.isFile || !RawToolSetsShape.isToolSetFileName(entry.resource)) {
                    // not interesting
                    continue;
                }
                // watch this file
                store.add(this._fileService.watch(entry.resource));
                let data;
                try {
                    const content = await this._fileService.readFile(entry.resource, undefined, cts.token);
                    const rawObj = parse(content.value.toString());
                    data = RawToolSetsShape.from(rawObj, this._logService);
                }
                catch (err) {
                    this._logService.error(`Error reading tool set file ${entry.resource.toString()}:`, err);
                    continue;
                }
                if (cts.token.isCancellationRequested) {
                    return;
                }
                for (const [name, value] of data.entries) {
                    const tools = [];
                    const toolSets = [];
                    value.tools.forEach(name => {
                        const tool = this._languageModelToolsService.getToolByName(name);
                        if (tool) {
                            tools.push(tool);
                            return;
                        }
                        const toolSet = this._languageModelToolsService.getToolSetByName(name);
                        if (toolSet) {
                            toolSets.push(toolSet);
                            return;
                        }
                    });
                    if (tools.length === 0 && toolSets.length === 0) {
                        // NO tools in this set
                        continue;
                    }
                    const toolset = this._languageModelToolsService.createToolSet({ type: 'user', file: entry.resource, label: basename(entry.resource) }, `user/${entry.resource.toString()}/${name}`, name, {
                        // toolReferenceName: value.referenceName,
                        icon: value.icon ? ThemeIcon.fromId(value.icon) : undefined,
                        description: value.description
                    });
                    transaction(tx => {
                        store.add(toolset);
                        tools.forEach(tool => store.add(toolset.addTool(tool, tx)));
                        toolSets.forEach(toolSet => store.add(toolset.addToolSet(toolSet, tx)));
                    });
                }
            }
        }));
    }
};
UserToolSetsContributions = __decorate([
    __param(0, IExtensionService),
    __param(1, ILifecycleService),
    __param(2, ILanguageModelToolsService),
    __param(3, IUserDataProfileService),
    __param(4, IFileService),
    __param(5, ILogService)
], UserToolSetsContributions);
export { UserToolSetsContributions };
// ---- actions
export class ConfigureToolSets extends Action2 {
    static { this.ID = 'chat.configureToolSets'; }
    constructor() {
        super({
            id: ConfigureToolSets.ID,
            title: localize2('chat.configureToolSets', 'Configure Tool Sets...'),
            shortTitle: localize('chat.configureToolSets.short', "Tool Sets"),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.Tools.toolsCount.greater(0)),
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.equals('view', ChatViewId),
                order: 11,
                group: '0_level'
            },
        });
    }
    async run(accessor) {
        const toolsService = accessor.get(ILanguageModelToolsService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const picks = [];
        picks.push({
            label: localize('chat.configureToolSets.add', 'Create new tool sets file...'),
            alwaysShow: true,
            iconClass: ThemeIcon.asClassName(Codicon.plus)
        });
        for (const toolSet of toolsService.toolSets.get()) {
            if (toolSet.source.type !== 'user') {
                continue;
            }
            picks.push({
                label: toolSet.referenceName,
                toolset: toolSet,
                tooltip: toolSet.description,
                iconClass: ThemeIcon.asClassName(toolSet.icon)
            });
        }
        const pick = await quickInputService.pick(picks, {
            canPickMany: false,
            placeHolder: localize('chat.configureToolSets.placeholder', 'Select a tool set to configure'),
        });
        if (!pick) {
            return; // user cancelled
        }
        let resource;
        if (!pick.toolset) {
            const name = await quickInputService.input({
                placeHolder: localize('input.placeholder', "Type tool sets file name"),
                validateInput: async (input) => {
                    if (!input) {
                        return localize('bad_name1', "Invalid file name");
                    }
                    if (!isValidBasename(input)) {
                        return localize('bad_name2', "'{0}' is not a valid file name", input);
                    }
                    return undefined;
                }
            });
            if (isFalsyOrWhitespace(name)) {
                return; // user cancelled
            }
            resource = joinPath(userDataProfileService.currentProfile.promptsHome, `${name}${RawToolSetsShape.suffix}`);
            if (!await fileService.exists(resource)) {
                await textFileService.write(resource, [
                    '// Place your tool sets here...',
                    '// Example:',
                    '// {',
                    '// \t"toolSetName": {',
                    '// \t\t"tools": [',
                    '// \t\t\t"someTool",',
                    '// \t\t\t"anotherTool"',
                    '// \t\t],',
                    '// \t\t"description": "description",',
                    '// \t\t"icon": "tools"',
                    '// \t}',
                    '// }',
                ].join('\n'));
            }
        }
        else {
            assertType(pick.toolset.source.type === 'user');
            resource = pick.toolset.source.file;
        }
        await editorService.openEditor({ resource, options: { pinned: true } });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbFNldHNDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci90b29scy90b29sU2V0c0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEksT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hF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