/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Queue } from '../../../../base/common/async.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LRUCache } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as Types from '../../../../base/common/types.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../nls.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { VariableError, VariableKind } from '../common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../common/configurationResolverExpression.js';
import { AbstractVariableResolverService } from '../common/variableResolver.js';
const LAST_INPUT_STORAGE_KEY = 'configResolveInputLru';
const LAST_INPUT_CACHE_SIZE = 5;
export class BaseConfigurationResolverService extends AbstractVariableResolverService {
    static { this.INPUT_OR_COMMAND_VARIABLES_PATTERN = /\${((input|command):(.*?))}/g; }
    constructor(context, envVariablesPromise, editorService, configurationService, commandService, workspaceContextService, quickInputService, labelService, pathService, extensionService, storageService) {
        super({
            getFolderUri: (folderName) => {
                const folder = workspaceContextService.getWorkspace().folders.filter(f => f.name === folderName).pop();
                return folder ? folder.uri : undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceContextService.getWorkspace().folders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return configurationService.getValue(section, folderUri ? { resource: folderUri } : {});
            },
            getAppRoot: () => {
                return context.getAppRoot();
            },
            getExecPath: () => {
                return context.getExecPath();
            },
            getFilePath: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [Schemas.file, Schemas.vscodeUserData, this.pathService.defaultUriScheme]
                });
                if (!fileResource) {
                    return undefined;
                }
                return this.labelService.getUriLabel(fileResource, { noPrefix: true });
            },
            getWorkspaceFolderPathForFile: () => {
                const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                    filterByScheme: [Schemas.file, Schemas.vscodeUserData, this.pathService.defaultUriScheme]
                });
                if (!fileResource) {
                    return undefined;
                }
                const wsFolder = workspaceContextService.getWorkspaceFolder(fileResource);
                if (!wsFolder) {
                    return undefined;
                }
                return this.labelService.getUriLabel(wsFolder.uri, { noPrefix: true });
            },
            getSelectedText: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                let activeControl = null;
                if (isCodeEditor(activeTextEditorControl)) {
                    activeControl = activeTextEditorControl;
                }
                else if (isDiffEditor(activeTextEditorControl)) {
                    const original = activeTextEditorControl.getOriginalEditor();
                    const modified = activeTextEditorControl.getModifiedEditor();
                    activeControl = original.hasWidgetFocus() ? original : modified;
                }
                const activeModel = activeControl?.getModel();
                const activeSelection = activeControl?.getSelection();
                if (activeModel && activeSelection) {
                    return activeModel.getValueInRange(activeSelection);
                }
                return undefined;
            },
            getLineNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const lineNumber = selection.positionLineNumber;
                        return String(lineNumber);
                    }
                }
                return undefined;
            },
            getColumnNumber: () => {
                const activeTextEditorControl = editorService.activeTextEditorControl;
                if (isCodeEditor(activeTextEditorControl)) {
                    const selection = activeTextEditorControl.getSelection();
                    if (selection) {
                        const columnNumber = selection.positionColumn;
                        return String(columnNumber);
                    }
                }
                return undefined;
            },
            getExtension: id => {
                return extensionService.getExtension(id);
            },
        }, labelService, pathService.userHome().then(home => home.path), envVariablesPromise);
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.storageService = storageService;
        this.userInputAccessQueue = new Queue();
        this.resolvableVariables.add('command');
        this.resolvableVariables.add('input');
    }
    async resolveWithInteractionReplace(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        await this.resolveWithInteraction(folder, parsed, section, variables, target);
        return parsed.toObject();
    }
    async resolveWithInteraction(folder, config, section, variableToCommandMap, target) {
        const expr = ConfigurationResolverExpression.parse(config);
        // Get values for input variables from UI
        for (const variable of expr.unresolved()) {
            let result;
            // Command
            if (variable.name === 'command') {
                const commandId = (variableToCommandMap ? variableToCommandMap[variable.arg] : undefined) || variable.arg;
                const value = await this.commandService.executeCommand(commandId, expr.toObject());
                if (!Types.isUndefinedOrNull(value)) {
                    if (typeof value !== 'string') {
                        throw new VariableError(VariableKind.Command, localize('commandVariable.noStringType', "Cannot substitute command variable '{0}' because command did not return a result of type string.", commandId));
                    }
                    result = { value };
                }
            }
            // Input
            else if (variable.name === 'input') {
                result = await this.showUserInput(section, variable.arg, await this.resolveInputs(folder, section, target), variableToCommandMap);
            }
            // Contributed variable
            else if (this._contributedVariables.has(variable.inner)) {
                result = { value: await this._contributedVariables.get(variable.inner)() };
            }
            else {
                // Fallback to parent evaluation
                const resolvedValue = await this.evaluateSingleVariable(variable, folder?.uri);
                if (resolvedValue === undefined) {
                    // Not something we can handle
                    continue;
                }
                result = typeof resolvedValue === 'string' ? { value: resolvedValue } : resolvedValue;
            }
            if (result === undefined) {
                // Skip the entire flow if any input variable was canceled
                return undefined;
            }
            expr.resolve(variable, result);
        }
        return new Map(Iterable.map(expr.resolved(), ([key, value]) => [key.inner, value.value]));
    }
    async resolveInputs(folder, section, target) {
        if (!section) {
            return undefined;
        }
        // Look at workspace configuration
        let inputs;
        const overrides = folder ? { resource: folder.uri } : {};
        const result = this.configurationService.inspect(section, overrides);
        if (result) {
            switch (target) {
                case 8 /* ConfigurationTarget.MEMORY */:
                    inputs = result.memoryValue?.inputs;
                    break;
                case 7 /* ConfigurationTarget.DEFAULT */:
                    inputs = result.defaultValue?.inputs;
                    break;
                case 2 /* ConfigurationTarget.USER */:
                    inputs = result.userValue?.inputs;
                    break;
                case 3 /* ConfigurationTarget.USER_LOCAL */:
                    inputs = result.userLocalValue?.inputs;
                    break;
                case 4 /* ConfigurationTarget.USER_REMOTE */:
                    inputs = result.userRemoteValue?.inputs;
                    break;
                case 1 /* ConfigurationTarget.APPLICATION */:
                    inputs = result.applicationValue?.inputs;
                    break;
                case 5 /* ConfigurationTarget.WORKSPACE */:
                    inputs = result.workspaceValue?.inputs;
                    break;
                case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                default:
                    inputs = result.workspaceFolderValue?.inputs;
                    break;
            }
        }
        inputs ??= this.configurationService.getValue(section, overrides)?.inputs;
        return inputs;
    }
    readInputLru() {
        const contents = this.storageService.get(LAST_INPUT_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        const lru = new LRUCache(LAST_INPUT_CACHE_SIZE);
        try {
            if (contents) {
                lru.fromJSON(JSON.parse(contents));
            }
        }
        catch {
            // ignored
        }
        return lru;
    }
    storeInputLru(lru) {
        this.storageService.store(LAST_INPUT_STORAGE_KEY, JSON.stringify(lru.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async showUserInput(section, variable, inputInfos, variableToCommandMap) {
        if (!inputInfos) {
            throw new VariableError(VariableKind.Input, localize('inputVariable.noInputSection', "Variable '{0}' must be defined in an '{1}' section of the debug or task configuration.", variable, 'inputs'));
        }
        // Find info for the given input variable
        const info = inputInfos.filter(item => item.id === variable).pop();
        if (info) {
            const missingAttribute = (attrName) => {
                throw new VariableError(VariableKind.Input, localize('inputVariable.missingAttribute', "Input variable '{0}' is of type '{1}' and must include '{2}'.", variable, info.type, attrName));
            };
            const defaultValueMap = this.readInputLru();
            const defaultValueKey = `${section}.${variable}`;
            const previousPickedValue = defaultValueMap.get(defaultValueKey);
            switch (info.type) {
                case 'promptString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    const inputOptions = { prompt: info.description, ignoreFocusLost: true, value: variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default };
                    if (info.password) {
                        inputOptions.password = info.password;
                    }
                    return this.userInputAccessQueue.queue(() => this.quickInputService.input(inputOptions)).then(resolvedInput => {
                        if (typeof resolvedInput === 'string') {
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, resolvedInput));
                        }
                        return resolvedInput !== undefined ? { value: resolvedInput, input: info } : undefined;
                    });
                }
                case 'pickString': {
                    if (!Types.isString(info.description)) {
                        missingAttribute('description');
                    }
                    if (Array.isArray(info.options)) {
                        for (const pickOption of info.options) {
                            if (!Types.isString(pickOption) && !Types.isString(pickOption.value)) {
                                missingAttribute('value');
                            }
                        }
                    }
                    else {
                        missingAttribute('options');
                    }
                    const picks = new Array();
                    for (const pickOption of info.options) {
                        const value = Types.isString(pickOption) ? pickOption : pickOption.value;
                        const label = Types.isString(pickOption) ? undefined : pickOption.label;
                        const item = {
                            label: label ? `${label}: ${value}` : value,
                            value: value
                        };
                        const topValue = variableToCommandMap?.[`input:${variable}`] ?? previousPickedValue ?? info.default;
                        if (value === info.default) {
                            item.description = localize('inputVariable.defaultInputValue', "(Default)");
                            picks.unshift(item);
                        }
                        else if (value === topValue) {
                            picks.unshift(item);
                        }
                        else {
                            picks.push(item);
                        }
                    }
                    const pickOptions = { placeHolder: info.description, matchOnDetail: true, ignoreFocusLost: true };
                    return this.userInputAccessQueue.queue(() => this.quickInputService.pick(picks, pickOptions, undefined)).then(resolvedInput => {
                        if (resolvedInput) {
                            const value = resolvedInput.value;
                            this.storeInputLru(defaultValueMap.set(defaultValueKey, value));
                            return { value, input: info };
                        }
                        return undefined;
                    });
                }
                case 'command': {
                    if (!Types.isString(info.command)) {
                        missingAttribute('command');
                    }
                    return this.userInputAccessQueue.queue(() => this.commandService.executeCommand(info.command, info.args)).then(result => {
                        if (typeof result === 'string' || Types.isUndefinedOrNull(result)) {
                            return { value: result, input: info };
                        }
                        throw new VariableError(VariableKind.Input, localize('inputVariable.command.noStringType', "Cannot substitute input variable '{0}' because command '{1}' did not return a result of type string.", variable, info.command));
                    });
                }
                default:
                    throw new VariableError(VariableKind.Input, localize('inputVariable.unknownType', "Input variable '{0}' can only be of type 'promptString', 'pickString', or 'command'.", variable));
            }
        }
        throw new VariableError(VariableKind.Input, localize('inputVariable.undefinedVariable', "Undefined input variable '{0}' encountered. Remove or define '{0}' to continue.", variable));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUNvbmZpZ3VyYXRpb25SZXNvbHZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uUmVzb2x2ZXIvYnJvd3Nlci9iYXNlQ29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUUxRCxPQUFPLEVBQWUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQU85QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUlyRixPQUFPLEVBQW1CLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsK0JBQStCLEVBQWtCLE1BQU0sOENBQThDLENBQUM7QUFDL0csT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFaEYsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FBQztBQUN2RCxNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQztBQUVoQyxNQUFNLE9BQWdCLGdDQUFpQyxTQUFRLCtCQUErQjthQUU3RSx1Q0FBa0Ms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