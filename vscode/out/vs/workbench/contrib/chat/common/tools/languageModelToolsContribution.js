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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { transaction } from '../../../../../base/common/observable.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { ILanguageModelToolsService, ToolDataSource } from '../languageModelToolsService.js';
import { toolsParametersSchemaSchemaId } from './languageModelToolsParametersSchema.js';
const languageModelToolsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelTools',
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onLanguageModelTool:${contrib.name}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.tools', 'Contributes a tool that can be invoked by a language model in a chat session, or from a standalone command. Registered tools can be used by all extensions.'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{
                    body: {
                        name: '${1}',
                        modelDescription: '${2}',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                '${3:name}': {
                                    type: 'string',
                                    description: '${4:description}'
                                }
                            }
                        },
                    }
                }],
            required: ['name', 'displayName', 'modelDescription'],
            properties: {
                name: {
                    description: localize('toolName', "A unique name for this tool. This name must be a globally unique identifier, and is also used as a name when presenting this tool to a language model."),
                    type: 'string',
                    // [\\w-]+ is OpenAI's requirement for tool names
                    pattern: '^(?!copilot_|vscode_)[\\w-]+$'
                },
                toolReferenceName: {
                    markdownDescription: localize('toolName2', "If {0} is enabled for this tool, the user may use '#' with this name to invoke the tool in a query. Otherwise, the name is not required. Name must not contain whitespace.", '`canBeReferencedInPrompt`'),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                displayName: {
                    description: localize('toolDisplayName', "A human-readable name for this tool that may be used to describe it in the UI."),
                    type: 'string'
                },
                userDescription: {
                    description: localize('toolUserDescription', "A description of this tool that may be shown to the user."),
                    type: 'string'
                },
                modelDescription: {
                    description: localize('toolModelDescription', "A description of this tool that may be used by a language model to select it."),
                    type: 'string'
                },
                inputSchema: {
                    description: localize('parametersSchema', "A JSON schema for the input this tool accepts. The input must be an object at the top level. A particular language model may not support all JSON schema features. See the documentation for the language model family you are using for more information."),
                    $ref: toolsParametersSchemaSchemaId
                },
                canBeReferencedInPrompt: {
                    markdownDescription: localize('canBeReferencedInPrompt', "If true, this tool shows up as an attachment that the user can add manually to their request. Chat participants will receive the tool in {0}.", '`ChatRequest#toolReferences`'),
                    type: 'boolean'
                },
                icon: {
                    markdownDescription: localize('icon', "An icon that represents this tool. Either a file path, an object with file paths for dark and light themes, or a theme icon reference, like `$(zap)`"),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize('icon.light', 'Icon path when a light theme is used'),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize('icon.dark', 'Icon path when a dark theme is used'),
                                    type: 'string'
                                }
                            }
                        }]
                },
                when: {
                    markdownDescription: localize('condition', "Condition which must be true for this tool to be enabled. Note that a tool may still be invoked by another extension even when its `when` condition is false."),
                    type: 'string'
                },
                tags: {
                    description: localize('toolTags', "A set of tags that roughly describe the tool's capabilities. A tool user may use these to filter the set of tools to just ones that are relevant for the task at hand, or they may want to pick a tag that can be used to identify just the tools contributed by this extension."),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^(?!copilot_|vscode_)'
                    }
                }
            }
        }
    }
});
const languageModelToolSetsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelToolSets',
    deps: [languageModelToolsExtensionPoint],
    jsonSchema: {
        description: localize('vscode.extension.contributes.toolSets', 'Contributes a set of language model tools that can be used together.'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{
                    body: {
                        name: '${1}',
                        description: '${2}',
                        tools: ['${3}']
                    }
                }],
            required: ['name', 'description', 'tools'],
            properties: {
                name: {
                    description: localize('toolSetName', "A name for this tool set. Used as reference and should not contain whitespace."),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                description: {
                    description: localize('toolSetDescription', "A description of this tool set."),
                    type: 'string'
                },
                icon: {
                    markdownDescription: localize('toolSetIcon', "An icon that represents this tool set, like `$(zap)`"),
                    type: 'string'
                },
                tools: {
                    markdownDescription: localize('toolSetTools', "A list of tools or tool sets to include in this tool set. Cannot be empty and must reference tools by their `toolReferenceName`."),
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'string'
                    }
                }
            }
        }
    }
});
function toToolKey(extensionIdentifier, toolName) {
    return `${extensionIdentifier.value}/${toolName}`;
}
function toToolSetKey(extensionIdentifier, toolName) {
    return `toolset:${extensionIdentifier.value}/${toolName}`;
}
let LanguageModelToolsExtensionPointHandler = class LanguageModelToolsExtensionPointHandler {
    static { this.ID = 'workbench.contrib.toolsExtensionPointHandler'; }
    constructor(productService, languageModelToolsService) {
        this._registrationDisposables = new DisposableMap();
        languageModelToolsExtensionPoint.setHandler((_extensions, delta) => {
            for (const extension of delta.added) {
                for (const rawTool of extension.value) {
                    if (!rawTool.name || !rawTool.modelDescription || !rawTool.displayName) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool without name, modelDescription, and displayName: ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if (!rawTool.name.match(/^[\w-]+$/)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with invalid id: ${rawTool.name}. The id must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (rawTool.canBeReferencedInPrompt && !rawTool.toolReferenceName) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with 'canBeReferencedInPrompt' set without a 'toolReferenceName': ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if ((rawTool.name.startsWith('copilot_') || rawTool.name.startsWith('vscode_')) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with name starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    if (rawTool.tags?.some(tag => tag.startsWith('copilot_') || tag.startsWith('vscode_')) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tags starting with "vscode_" or "copilot_"`);
                    }
                    const rawIcon = rawTool.icon;
                    let icon;
                    if (typeof rawIcon === 'string') {
                        icon = ThemeIcon.fromString(rawIcon) ?? {
                            dark: joinPath(extension.description.extensionLocation, rawIcon),
                            light: joinPath(extension.description.extensionLocation, rawIcon)
                        };
                    }
                    else if (rawIcon) {
                        icon = {
                            dark: joinPath(extension.description.extensionLocation, rawIcon.dark),
                            light: joinPath(extension.description.extensionLocation, rawIcon.light)
                        };
                    }
                    // If OSS and the product.json is not set up, fall back to checking api proposal
                    const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId ?
                        ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId) :
                        isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const source = isBuiltinTool
                        ? ToolDataSource.Internal
                        : { type: 'extension', label: extension.description.displayName ?? extension.description.name, extensionId: extension.description.identifier };
                    const tool = {
                        ...rawTool,
                        source,
                        inputSchema: rawTool.inputSchema,
                        id: rawTool.name,
                        icon,
                        when: rawTool.when ? ContextKeyExpr.deserialize(rawTool.when) : undefined,
                        alwaysDisplayInputOutput: !isBuiltinTool,
                    };
                    try {
                        const disposable = languageModelToolsService.registerToolData(tool);
                        this._registrationDisposables.set(toToolKey(extension.description.identifier, rawTool.name), disposable);
                    }
                    catch (e) {
                        extension.collector.error(`Failed to register tool '${rawTool.name}': ${e}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const tool of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolKey(extension.description.identifier, tool.name));
                }
            }
        });
        languageModelToolSetsExtensionPoint.setHandler((_extensions, delta) => {
            for (const extension of delta.added) {
                if (!isProposedApiEnabled(extension.description, 'contribLanguageModelToolSets')) {
                    extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register language model tools because the 'contribLanguageModelToolSets' API proposal is not enabled.`);
                    continue;
                }
                const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId ?
                    ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId) :
                    isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                const source = isBuiltinTool
                    ? ToolDataSource.Internal
                    : { type: 'extension', label: extension.description.displayName ?? extension.description.name, extensionId: extension.description.identifier };
                for (const toolSet of extension.value) {
                    if (isFalsyOrWhitespace(toolSet.name)) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty name`);
                        continue;
                    }
                    if (isFalsyOrEmpty(toolSet.tools)) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty tools array`);
                        continue;
                    }
                    const tools = [];
                    const toolSets = [];
                    for (const toolName of toolSet.tools) {
                        const toolObj = languageModelToolsService.getToolByName(toolName, true);
                        if (toolObj) {
                            tools.push(toolObj);
                            continue;
                        }
                        const toolSetObj = languageModelToolsService.getToolSetByName(toolName);
                        if (toolSetObj) {
                            toolSets.push(toolSetObj);
                            continue;
                        }
                        extension.collector.warn(`Tool set '${toolSet.name}' CANNOT find tool or tool set by name: ${toolName}`);
                    }
                    if (toolSets.length === 0 && tools.length === 0) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty tools array (none of the tools were found)`);
                        continue;
                    }
                    const store = new DisposableStore();
                    const obj = languageModelToolsService.createToolSet(source, toToolSetKey(extension.description.identifier, toolSet.name), toolSet.referenceName ?? toolSet.name, { icon: toolSet.icon ? ThemeIcon.fromString(toolSet.icon) : undefined, description: toolSet.description });
                    transaction(tx => {
                        store.add(obj);
                        tools.forEach(tool => store.add(obj.addTool(tool, tx)));
                        toolSets.forEach(toolSet => store.add(obj.addToolSet(toolSet, tx)));
                    });
                    this._registrationDisposables.set(toToolSetKey(extension.description.identifier, toolSet.name), store);
                }
            }
            for (const extension of delta.removed) {
                for (const toolSet of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolSetKey(extension.description.identifier, toolSet.name));
                }
            }
        });
    }
};
LanguageModelToolsExtensionPointHandler = __decorate([
    __param(0, IProductService),
    __param(1, ILanguageModelToolsService)
], LanguageModelToolsExtensionPointHandler);
export { LanguageModelToolsExtensionPointHandler };
// --- render
class LanguageModelToolDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelTools;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelTools ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('toolTableName', "Name"),
            localize('toolTableDisplayName', "Display Name"),
            localize('toolTableDescription', "Description"),
        ];
        const rows = contribs.map(t => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.displayName,
                t.userDescription ?? t.modelDescription,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelTools',
    label: localize('langModelTools', "Language Model Tools"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageModelToolDataRenderer),
});
class LanguageModelToolSetDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelToolSets;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelToolSets ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('name', "Name"),
            localize('reference', "Reference Name"),
            localize('tools', "Tools"),
            localize('descriptions', "Description"),
        ];
        const rows = contribs.map(t => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.referenceName ? new MarkdownString(`\`#${t.referenceName}\``) : 'none',
                t.tools.join(', '),
                t.description,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelToolSets',
    label: localize('langModelToolSets', "Language Model Tool Sets"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageModelToolSetDataRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9sYW5ndWFnZU1vZGVsVG9vbHNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBc0IsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxPQUFPLEVBQUUsVUFBVSxFQUFtRyxNQUFNLHNFQUFzRSxDQUFDO0FBQ25N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