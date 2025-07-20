/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import * as paths from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import * as process from '../../../../base/common/process.js';
import * as types from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { allVariableKinds, VariableError, VariableKind } from './configurationResolver.js';
import { ConfigurationResolverExpression } from './configurationResolverExpression.js';
export class AbstractVariableResolverService {
    constructor(_context, _labelService, _userHomePromise, _envVariablesPromise) {
        this._contributedVariables = new Map();
        this.resolvableVariables = new Set(allVariableKinds);
        this._context = _context;
        this._labelService = _labelService;
        this._userHomePromise = _userHomePromise;
        if (_envVariablesPromise) {
            this._envVariablesPromise = _envVariablesPromise.then(envVariables => {
                return this.prepareEnv(envVariables);
            });
        }
    }
    prepareEnv(envVariables) {
        // windows env variables are case insensitive
        if (isWindows) {
            const ev = Object.create(null);
            Object.keys(envVariables).forEach(key => {
                ev[key.toLowerCase()] = envVariables[key];
            });
            return ev;
        }
        return envVariables;
    }
    async resolveWithEnvironment(environment, folder, value) {
        const expr = ConfigurationResolverExpression.parse(value);
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(replacement, folder?.uri, environment);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, String(resolvedValue));
            }
        }
        return expr.toObject();
    }
    async resolveAsync(folder, config) {
        const expr = ConfigurationResolverExpression.parse(config);
        for (const replacement of expr.unresolved()) {
            const resolvedValue = await this.evaluateSingleVariable(replacement, folder?.uri);
            if (resolvedValue !== undefined) {
                expr.resolve(replacement, String(resolvedValue));
            }
        }
        return expr.toObject();
    }
    resolveWithInteractionReplace(folder, config) {
        throw new Error('resolveWithInteractionReplace not implemented.');
    }
    resolveWithInteraction(folder, config) {
        throw new Error('resolveWithInteraction not implemented.');
    }
    contributeVariable(variable, resolution) {
        if (this._contributedVariables.has(variable)) {
            throw new Error('Variable ' + variable + ' is contributed twice.');
        }
        else {
            this.resolvableVariables.add(variable);
            this._contributedVariables.set(variable, resolution);
        }
    }
    fsPath(displayUri) {
        return this._labelService ? this._labelService.getUriLabel(displayUri, { noPrefix: true }) : displayUri.fsPath;
    }
    async evaluateSingleVariable(replacement, folderUri, processEnvironment, commandValueMapping) {
        const environment = {
            env: (processEnvironment !== undefined) ? this.prepareEnv(processEnvironment) : await this._envVariablesPromise,
            userHome: (processEnvironment !== undefined) ? undefined : await this._userHomePromise
        };
        const { name: variable, arg: argument } = replacement;
        // common error handling for all variables that require an open editor
        const getFilePath = (variableKind) => {
            const filePath = this._context.getFilePath();
            if (filePath) {
                return normalizeDriveLetter(filePath);
            }
            throw new VariableError(variableKind, (localize('canNotResolveFile', "Variable {0} can not be resolved. Please open an editor.", replacement.id)));
        };
        // common error handling for all variables that require an open editor
        const getFolderPathForFile = (variableKind) => {
            const filePath = getFilePath(variableKind); // throws error if no editor open
            if (this._context.getWorkspaceFolderPathForFile) {
                const folderPath = this._context.getWorkspaceFolderPathForFile();
                if (folderPath) {
                    return normalizeDriveLetter(folderPath);
                }
            }
            throw new VariableError(variableKind, localize('canNotResolveFolderForFile', "Variable {0}: can not find workspace folder of '{1}'.", replacement.id, paths.basename(filePath)));
        };
        // common error handling for all variables that require an open folder and accept a folder name argument
        const getFolderUri = (variableKind) => {
            if (argument) {
                const folder = this._context.getFolderUri(argument);
                if (folder) {
                    return folder;
                }
                throw new VariableError(variableKind, localize('canNotFindFolder', "Variable {0} can not be resolved. No such folder '{1}'.", variableKind, argument));
            }
            if (folderUri) {
                return folderUri;
            }
            if (this._context.getWorkspaceFolderCount() > 1) {
                throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolderMultiRoot', "Variable {0} can not be resolved in a multi folder workspace. Scope this variable using ':' and a workspace folder name.", variableKind));
            }
            throw new VariableError(variableKind, localize('canNotResolveWorkspaceFolder', "Variable {0} can not be resolved. Please open a folder.", variableKind));
        };
        switch (variable) {
            case 'env':
                if (argument) {
                    if (environment.env) {
                        const env = environment.env[isWindows ? argument.toLowerCase() : argument];
                        if (types.isString(env)) {
                            return env;
                        }
                    }
                    return '';
                }
                throw new VariableError(VariableKind.Env, localize('missingEnvVarName', "Variable {0} can not be resolved because no environment variable name is given.", replacement.id));
            case 'config':
                if (argument) {
                    const config = this._context.getConfigurationValue(folderUri, argument);
                    if (types.isUndefinedOrNull(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNotFound', "Variable {0} can not be resolved because setting '{1}' not found.", replacement.id, argument));
                    }
                    if (types.isObject(config)) {
                        throw new VariableError(VariableKind.Config, localize('configNoString', "Variable {0} can not be resolved because '{1}' is a structured value.", replacement.id, argument));
                    }
                    return config;
                }
                throw new VariableError(VariableKind.Config, localize('missingConfigName', "Variable {0} can not be resolved because no settings name is given.", replacement.id));
            case 'command':
                return this.resolveFromMap(VariableKind.Command, replacement.id, argument, commandValueMapping, 'command');
            case 'input':
                return this.resolveFromMap(VariableKind.Input, replacement.id, argument, commandValueMapping, 'input');
            case 'extensionInstallFolder':
                if (argument) {
                    const ext = await this._context.getExtension(argument);
                    if (!ext) {
                        throw new VariableError(VariableKind.ExtensionInstallFolder, localize('extensionNotInstalled', "Variable {0} can not be resolved because the extension {1} is not installed.", replacement.id, argument));
                    }
                    return this.fsPath(ext.extensionLocation);
                }
                throw new VariableError(VariableKind.ExtensionInstallFolder, localize('missingExtensionName', "Variable {0} can not be resolved because no extension name is given.", replacement.id));
            default: {
                switch (variable) {
                    case 'workspaceRoot':
                    case 'workspaceFolder': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolder);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'cwd': {
                        if (!folderUri && !argument) {
                            return process.cwd();
                        }
                        const uri = getFolderUri(VariableKind.Cwd);
                        return uri ? normalizeDriveLetter(this.fsPath(uri)) : undefined;
                    }
                    case 'workspaceRootFolderName':
                    case 'workspaceFolderBasename': {
                        const uri = getFolderUri(VariableKind.WorkspaceFolderBasename);
                        return uri ? normalizeDriveLetter(paths.basename(this.fsPath(uri))) : undefined;
                    }
                    case 'userHome':
                        if (environment.userHome) {
                            return environment.userHome;
                        }
                        throw new VariableError(VariableKind.UserHome, localize('canNotResolveUserHome', "Variable {0} can not be resolved. UserHome path is not defined", replacement.id));
                    case 'lineNumber': {
                        const lineNumber = this._context.getLineNumber();
                        if (lineNumber) {
                            return lineNumber;
                        }
                        throw new VariableError(VariableKind.LineNumber, localize('canNotResolveLineNumber', "Variable {0} can not be resolved. Make sure to have a line selected in the active editor.", replacement.id));
                    }
                    case 'columnNumber': {
                        const columnNumber = this._context.getColumnNumber();
                        if (columnNumber) {
                            return columnNumber;
                        }
                        throw new Error(localize('canNotResolveColumnNumber', "Variable {0} can not be resolved. Make sure to have a column selected in the active editor.", replacement.id));
                    }
                    case 'selectedText': {
                        const selectedText = this._context.getSelectedText();
                        if (selectedText) {
                            return selectedText;
                        }
                        throw new VariableError(VariableKind.SelectedText, localize('canNotResolveSelectedText', "Variable {0} can not be resolved. Make sure to have some text selected in the active editor.", replacement.id));
                    }
                    case 'file':
                        return getFilePath(VariableKind.File);
                    case 'fileWorkspaceFolder':
                        return getFolderPathForFile(VariableKind.FileWorkspaceFolder);
                    case 'fileWorkspaceFolderBasename':
                        return paths.basename(getFolderPathForFile(VariableKind.FileWorkspaceFolderBasename));
                    case 'relativeFile':
                        if (folderUri || argument) {
                            return paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFile)), getFilePath(VariableKind.RelativeFile));
                        }
                        return getFilePath(VariableKind.RelativeFile);
                    case 'relativeFileDirname': {
                        const dirname = paths.dirname(getFilePath(VariableKind.RelativeFileDirname));
                        if (folderUri || argument) {
                            const relative = paths.relative(this.fsPath(getFolderUri(VariableKind.RelativeFileDirname)), dirname);
                            return relative.length === 0 ? '.' : relative;
                        }
                        return dirname;
                    }
                    case 'fileDirname':
                        return paths.dirname(getFilePath(VariableKind.FileDirname));
                    case 'fileExtname':
                        return paths.extname(getFilePath(VariableKind.FileExtname));
                    case 'fileBasename':
                        return paths.basename(getFilePath(VariableKind.FileBasename));
                    case 'fileBasenameNoExtension': {
                        const basename = paths.basename(getFilePath(VariableKind.FileBasenameNoExtension));
                        return (basename.slice(0, basename.length - paths.extname(basename).length));
                    }
                    case 'fileDirnameBasename':
                        return paths.basename(paths.dirname(getFilePath(VariableKind.FileDirnameBasename)));
                    case 'execPath': {
                        const ep = this._context.getExecPath();
                        if (ep) {
                            return ep;
                        }
                        return replacement.id;
                    }
                    case 'execInstallFolder': {
                        const ar = this._context.getAppRoot();
                        if (ar) {
                            return ar;
                        }
                        return replacement.id;
                    }
                    case 'pathSeparator':
                    case '/':
                        return paths.sep;
                    default: {
                        try {
                            return this.resolveFromMap(VariableKind.Unknown, replacement.id, argument, commandValueMapping, undefined);
                        }
                        catch {
                            return replacement.id;
                        }
                    }
                }
            }
        }
    }
    resolveFromMap(variableKind, match, argument, commandValueMapping, prefix) {
        if (argument && commandValueMapping) {
            const v = (prefix === undefined) ? commandValueMapping[argument] : commandValueMapping[prefix + ':' + argument];
            if (typeof v === 'string') {
                return v;
            }
            throw new VariableError(variableKind, localize('noValueForCommand', "Variable {0} can not be resolved because the command has no value.", match));
        }
        return match;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci9jb21tb24vdmFyaWFibGVSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBdUIsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckYsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQWlDLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxSCxPQUFPLEVBQUUsK0JBQStCLEVBQStCLE1BQU0sc0NBQXNDLENBQUM7QUFrQnBILE1BQU0sT0FBZ0IsK0JBQStCO0lBWXBELFlBQVksUUFBaUMsRUFBRSxhQUE2QixFQUFFLGdCQUFrQyxFQUFFLG9CQUFtRDtRQUozSiwwQkFBcUIsR0FBbUQsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU1RSx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBUyxnQkFBZ0IsQ0FBQyxDQUFDO1FBR3ZFLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQztRQUN6QyxJQUFJLG9CQUFvQixFQUFF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