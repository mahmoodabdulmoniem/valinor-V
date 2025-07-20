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
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { env as processEnv } from '../../../../../base/common/process.js';
import { timeout } from '../../../../../base/common/async.js';
import { gitBashToWindowsPath } from './terminalGitBashHelpers.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
export const ITerminalCompletionService = createDecorator('terminalCompletionService');
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the terminal.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items;
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
let TerminalCompletionService = class TerminalCompletionService extends Disposable {
    get providers() {
        return this._providersGenerator();
    }
    *_providersGenerator() {
        for (const providerMap of this._providers.values()) {
            for (const provider of providerMap.values()) {
                yield provider;
            }
        }
    }
    /** Overrides the environment for testing purposes. */
    set processEnv(env) { this._processEnv = env; }
    constructor(_configurationService, _fileService, _logService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._logService = _logService;
        this._providers = new Map();
        this._onDidChangeProviders = this._register(new Emitter());
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._processEnv = processEnv;
    }
    registerTerminalCompletionProvider(extensionIdentifier, id, provider, ...triggerCharacters) {
        let extMap = this._providers.get(extensionIdentifier);
        if (!extMap) {
            extMap = new Map();
            this._providers.set(extensionIdentifier, extMap);
        }
        provider.triggerCharacters = triggerCharacters;
        provider.id = id;
        extMap.set(id, provider);
        this._onDidChangeProviders.fire();
        return toDisposable(() => {
            const extMap = this._providers.get(extensionIdentifier);
            if (extMap) {
                extMap.delete(id);
                if (extMap.size === 0) {
                    this._providers.delete(extensionIdentifier);
                }
            }
            this._onDidChangeProviders.fire();
        });
    }
    async provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, shellType, capabilities, token, triggerCharacter, skipExtensionCompletions, explicitlyInvoked) {
        if (!this._providers || !this._providers.values || cursorPosition < 0) {
            return undefined;
        }
        let providers;
        if (triggerCharacter) {
            const providersToRequest = [];
            for (const provider of this.providers) {
                if (!provider.triggerCharacters) {
                    continue;
                }
                for (const char of provider.triggerCharacters) {
                    if (promptValue.substring(0, cursorPosition)?.endsWith(char)) {
                        providersToRequest.push(provider);
                        break;
                    }
                }
            }
            providers = providersToRequest;
        }
        else {
            providers = [...this._providers.values()].flatMap(providerMap => [...providerMap.values()]);
        }
        if (skipExtensionCompletions) {
            providers = providers.filter(p => p.isBuiltin);
            return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token, explicitlyInvoked);
        }
        providers = this._getEnabledProviders(providers);
        if (!providers.length) {
            return;
        }
        return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token, explicitlyInvoked);
    }
    _getEnabledProviders(providers) {
        const providerConfig = this._configurationService.getValue("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */);
        return providers.filter(p => {
            const providerId = p.id;
            return providerId && (!(providerId in providerConfig) || providerConfig[providerId] !== false);
        });
    }
    async _collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token, explicitlyInvoked) {
        const completionPromises = providers.map(async (provider) => {
            if (provider.shellTypes && shellType && !provider.shellTypes.includes(shellType)) {
                return undefined;
            }
            const timeoutMs = explicitlyInvoked ? 30000 : 5000;
            let timedOut = false;
            let completions;
            try {
                completions = await Promise.race([
                    provider.provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, token),
                    (async () => { await timeout(timeoutMs); timedOut = true; return undefined; })()
                ]);
            }
            catch (e) {
                this._logService.trace(`[TerminalCompletionService] Exception from provider '${provider.id}':`, e);
                return undefined;
            }
            if (timedOut) {
                this._logService.trace(`[TerminalCompletionService] Provider '${provider.id}' timed out after ${timeoutMs}ms. promptValue='${promptValue}', cursorPosition=${cursorPosition}, explicitlyInvoked=${explicitlyInvoked}`);
                return undefined;
            }
            if (!completions) {
                return undefined;
            }
            const completionItems = Array.isArray(completions) ? completions : completions.items ?? [];
            if (shellType === "pwsh" /* GeneralShellType.PowerShell */) {
                for (const completion of completionItems) {
                    completion.isFileOverride ??= completion.kind === TerminalCompletionItemKind.Method && completion.replacementIndex === 0;
                }
            }
            if (provider.isBuiltin) {
                //TODO: why is this needed?
                for (const item of completionItems) {
                    item.provider ??= provider.id;
                }
            }
            if (Array.isArray(completions)) {
                return completionItems;
            }
            if (completions.resourceRequestConfig) {
                const resourceCompletions = await this.resolveResources(completions.resourceRequestConfig, promptValue, cursorPosition, `core:path:ext:${provider.id}`, capabilities, shellType);
                if (resourceCompletions) {
                    for (const item of resourceCompletions) {
                        const labels = new Set(completionItems.map(c => c.label));
                        // Ensure no duplicates such as .
                        if (!labels.has(item.label)) {
                            completionItems.push(item);
                        }
                    }
                }
            }
            return completionItems;
        });
        const results = await Promise.all(completionPromises);
        return results.filter(result => !!result).flat();
    }
    async resolveResources(resourceRequestConfig, promptValue, cursorPosition, provider, capabilities, shellType) {
        const useWindowsStylePath = resourceRequestConfig.pathSeparator === '\\';
        if (useWindowsStylePath) {
            // for tests, make sure the right path separator is used
            promptValue = promptValue.replaceAll(/[\\/]/g, resourceRequestConfig.pathSeparator);
        }
        // Files requested implies folders requested since the file could be in any folder. We could
        // provide diagnostics when a folder is provided where a file is expected.
        const foldersRequested = (resourceRequestConfig.foldersRequested || resourceRequestConfig.filesRequested) ?? false;
        const filesRequested = resourceRequestConfig.filesRequested ?? false;
        const fileExtensions = resourceRequestConfig.fileExtensions ?? undefined;
        const cwd = URI.revive(resourceRequestConfig.cwd);
        if (!cwd || (!foldersRequested && !filesRequested)) {
            return;
        }
        const resourceCompletions = [];
        const cursorPrefix = promptValue.substring(0, cursorPosition);
        // TODO: Leverage Fig's tokens array here?
        // The last word (or argument). When the cursor is following a space it will be the empty
        // string
        const lastWord = cursorPrefix.endsWith(' ') ? '' : cursorPrefix.split(/(?<!\\) /).at(-1) ?? '';
        // Get the nearest folder path from the prefix. This ignores everything after the `/` as
        // they are what triggers changes in the directory.
        let lastSlashIndex;
        if (useWindowsStylePath) {
            // TODO: Flesh out escaped path logic, it currently only partially works
            let lastBackslashIndex = -1;
            for (let i = lastWord.length - 1; i >= 0; i--) {
                if (lastWord[i] === '\\') {
                    if (i === lastWord.length - 1 || lastWord[i + 1] !== ' ') {
                        lastBackslashIndex = i;
                        break;
                    }
                }
            }
            lastSlashIndex = Math.max(lastBackslashIndex, lastWord.lastIndexOf('/'));
        }
        else {
            lastSlashIndex = lastWord.lastIndexOf(resourceRequestConfig.pathSeparator);
        }
        // The _complete_ folder of the last word. For example if the last word is `./src/file`,
        // this will be `./src/`. This also always ends in the path separator if it is not the empty
        // string and path separators are normalized on Windows.
        let lastWordFolder = lastSlashIndex === -1 ? '' : lastWord.slice(0, lastSlashIndex + 1);
        if (useWindowsStylePath) {
            lastWordFolder = lastWordFolder.replaceAll('/', '\\');
        }
        // Determine the current folder being shown
        let lastWordFolderResource;
        const lastWordFolderHasDotPrefix = !!lastWordFolder.match(/^\.\.?[\\\/]/);
        const lastWordFolderHasTildePrefix = !!lastWordFolder.match(/^~[\\\/]?/);
        const isAbsolutePath = getIsAbsolutePath(shellType, resourceRequestConfig.pathSeparator, lastWordFolder, useWindowsStylePath);
        const type = lastWordFolderHasTildePrefix ? 'tilde' : isAbsolutePath ? 'absolute' : 'relative';
        switch (type) {
            case 'tilde': {
                const home = this._getHomeDir(useWindowsStylePath, capabilities);
                if (home) {
                    lastWordFolderResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
                }
                if (!lastWordFolderResource) {
                    // Use less strong wording here as it's not as strong of a concept on Windows
                    // and could be misleading
                    if (lastWord.match(/^~[\\\/]$/)) {
                        lastWordFolderResource = useWindowsStylePath ? 'Home directory' : '$HOME';
                    }
                }
                break;
            }
            case 'absolute': {
                if (shellType === "gitbash" /* WindowsShellType.GitBash */) {
                    lastWordFolderResource = URI.file(gitBashToWindowsPath(lastWordFolder, this._processEnv.SystemDrive));
                }
                else {
                    lastWordFolderResource = URI.file(lastWordFolder.replaceAll('\\ ', ' '));
                }
                break;
            }
            case 'relative': {
                lastWordFolderResource = cwd;
                break;
            }
        }
        // Assemble completions based on the resource of lastWordFolder. Note that on Windows the
        // path seprators are normalized to `\`.
        if (!lastWordFolderResource) {
            return undefined;
        }
        // Early exit with basic completion if we don't know the resource
        if (typeof lastWordFolderResource === 'string') {
            resourceCompletions.push({
                label: lastWordFolder,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: lastWordFolderResource,
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
            return resourceCompletions;
        }
        const stat = await this._fileService.resolve(lastWordFolderResource, { resolveSingleChildDescendants: true });
        if (!stat?.children) {
            return;
        }
        // Add current directory. This should be shown at the top because it will be an exact
        // match and therefore highlight the detail, plus it improves the experience when
        // runOnEnter is used.
        //
        // - (relative) `|`       -> `.`
        //   this does not have the trailing `/` intentionally as it's common to complete the
        //   current working directory and we do not want to complete `./` when `runOnEnter` is
        //   used.
        // - (relative) `./src/|` -> `./src/`
        // - (absolute) `/src/|`  -> `/src/`
        // - (tilde)    `~/|`     -> `~/`
        // - (tilde)    `~/src/|` -> `~/src/`
        if (foldersRequested) {
            let label;
            switch (type) {
                case 'tilde': {
                    label = lastWordFolder;
                    break;
                }
                case 'absolute': {
                    label = lastWordFolder;
                    break;
                }
                case 'relative': {
                    label = '.';
                    if (lastWordFolder.length > 0) {
                        label = addPathRelativePrefix(lastWordFolder, resourceRequestConfig, lastWordFolderHasDotPrefix);
                    }
                    break;
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(lastWordFolderResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder, shellType),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Add all direct children files or folders
        //
        // - (relative) `cd ./src/`  -> `cd ./src/folder1/`, ...
        // - (absolute) `cd c:/src/` -> `cd c:/src/folder1/`, ...
        // - (tilde)    `cd ~/src/`  -> `cd ~/src/folder1/`, ...
        for (const child of stat.children) {
            let kind;
            let detail = undefined;
            if (foldersRequested && child.isDirectory) {
                if (child.isSymbolicLink) {
                    kind = TerminalCompletionItemKind.SymbolicLinkFolder;
                }
                else {
                    kind = TerminalCompletionItemKind.Folder;
                }
            }
            else if (filesRequested && child.isFile) {
                if (child.isSymbolicLink) {
                    kind = TerminalCompletionItemKind.SymbolicLinkFile;
                }
                else {
                    kind = TerminalCompletionItemKind.File;
                }
            }
            if (kind === undefined) {
                continue;
            }
            let label = lastWordFolder;
            if (label.length > 0 && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            label += child.name;
            if (type === 'relative') {
                label = addPathRelativePrefix(label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            if (child.isDirectory && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            label = escapeTerminalCompletionLabel(label, shellType, resourceRequestConfig.pathSeparator);
            if (child.isFile && fileExtensions) {
                const extension = child.name.split('.').length > 1 ? child.name.split('.').at(-1) : undefined;
                if (extension && !fileExtensions.includes(extension)) {
                    continue;
                }
            }
            // Try to resolve symlink target for symbolic links
            if (child.isSymbolicLink) {
                try {
                    const realpath = await this._fileService.realpath(child.resource);
                    if (realpath && !isEqual(child.resource, realpath)) {
                        detail = `${getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind, shellType)} -> ${getFriendlyPath(realpath, resourceRequestConfig.pathSeparator, kind, shellType)}`;
                    }
                }
                catch (error) {
                    // Ignore errors resolving symlink targets - they may be dangling links
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind,
                detail: detail ?? getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind, shellType),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Support $CDPATH specially for the `cd` command only
        //
        // - (relative) `|` -> `/foo/vscode` (CDPATH has /foo which contains vscode folder)
        if (type === 'relative' && foldersRequested) {
            if (promptValue.startsWith('cd ')) {
                const config = this._configurationService.getValue("terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */);
                if (config === 'absolute' || config === 'relative') {
                    const cdPath = this._getEnvVar('CDPATH', capabilities);
                    if (cdPath) {
                        const cdPathEntries = cdPath.split(useWindowsStylePath ? ';' : ':');
                        for (const cdPathEntry of cdPathEntries) {
                            try {
                                const fileStat = await this._fileService.resolve(URI.file(cdPathEntry), { resolveSingleChildDescendants: true });
                                if (fileStat?.children) {
                                    for (const child of fileStat.children) {
                                        if (!child.isDirectory) {
                                            continue;
                                        }
                                        const useRelative = config === 'relative';
                                        const kind = TerminalCompletionItemKind.Folder;
                                        const label = useRelative ? basename(child.resource.fsPath) : getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind, shellType);
                                        const detail = useRelative ? `CDPATH ${getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind, shellType)}` : `CDPATH`;
                                        resourceCompletions.push({
                                            label,
                                            provider,
                                            kind,
                                            detail,
                                            replacementIndex: cursorPosition - lastWord.length,
                                            replacementLength: lastWord.length
                                        });
                                    }
                                }
                            }
                            catch { /* ignore */ }
                        }
                    }
                }
            }
        }
        // Add parent directory to the bottom of the list because it's not as useful as other suggestions
        //
        // - (relative) `|` -> `../`
        // - (relative) `./src/|` -> `./src/../`
        if (type === 'relative' && foldersRequested) {
            let label = `..${resourceRequestConfig.pathSeparator}`;
            if (lastWordFolder.length > 0) {
                label = addPathRelativePrefix(lastWordFolder + label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            const parentDir = URI.joinPath(cwd, '..' + resourceRequestConfig.pathSeparator);
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(parentDir, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder, shellType),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Add tilde for home directory for relative paths when there is no path separator in the
        // input.
        //
        // - (relative) `|` -> `~`
        if (type === 'relative' && !lastWordFolder.match(/[\\\/]/)) {
            let homeResource;
            const home = this._getHomeDir(useWindowsStylePath, capabilities);
            if (home) {
                homeResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
            }
            if (!homeResource) {
                // Use less strong wording here as it's not as strong of a concept on Windows
                // and could be misleading
                homeResource = useWindowsStylePath ? 'Home directory' : '$HOME';
            }
            resourceCompletions.push({
                label: '~',
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: typeof homeResource === 'string' ? homeResource : getFriendlyPath(homeResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder, shellType),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        return resourceCompletions;
    }
    _getEnvVar(key, capabilities) {
        const env = capabilities.get(5 /* TerminalCapability.ShellEnvDetection */)?.env?.value;
        if (env) {
            return env[key];
        }
        return this._processEnv[key];
    }
    _getHomeDir(useWindowsStylePath, capabilities) {
        return useWindowsStylePath ? this._getEnvVar('USERPROFILE', capabilities) : this._getEnvVar('HOME', capabilities);
    }
};
TerminalCompletionService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, ILogService)
], TerminalCompletionService);
export { TerminalCompletionService };
function getFriendlyPath(uri, pathSeparator, kind, shellType) {
    let path = uri.fsPath;
    const sep = shellType === "gitbash" /* WindowsShellType.GitBash */ ? '\\' : pathSeparator;
    // Ensure folders end with the path separator to differentiate presentation from files
    if (kind === TerminalCompletionItemKind.Folder && !path.endsWith(sep)) {
        path += sep;
    }
    // Ensure drive is capitalized on Windows
    if (sep === '\\' && path.match(/^[a-zA-Z]:\\/)) {
        path = `${path[0].toUpperCase()}:${path.slice(2)}`;
    }
    return path;
}
/**
 * Normalize suggestion to add a ./ prefix to the start of the path if there isn't one already. We
 * may want to change this behavior in the future to go with whatever format the user has.
 */
function addPathRelativePrefix(text, resourceRequestConfig, lastWordFolderHasDotPrefix) {
    if (!lastWordFolderHasDotPrefix) {
        if (text.startsWith(resourceRequestConfig.pathSeparator)) {
            return `.${text}`;
        }
        return `.${resourceRequestConfig.pathSeparator}${text}`;
    }
    return text;
}
/**
 * Escapes special characters in a file/folder label for shell completion.
 * This ensures that characters like [, ], etc. are properly escaped.
 */
export function escapeTerminalCompletionLabel(label, shellType, pathSeparator) {
    // Only escape for bash/zsh/fish; PowerShell and cmd have different rules
    if (shellType === undefined || shellType === "pwsh" /* GeneralShellType.PowerShell */ || shellType === "cmd" /* WindowsShellType.CommandPrompt */) {
        return label;
    }
    return label.replace(/[\[\]\(\)'"\\\`\*\?;|&<>]/g, '\\$&');
}
function getIsAbsolutePath(shellType, pathSeparator, lastWord, useWindowsStylePath) {
    if (shellType === "gitbash" /* WindowsShellType.GitBash */) {
        return lastWord.startsWith(pathSeparator) || /^[a-zA-Z]:\//.test(lastWord);
    }
    return useWindowsStylePath ? /^[a-zA-Z]:[\\\/]/.test(lastWord) : lastWord.startsWith(pathSeparator);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFJaEcsT0FBTyxFQUFFLDBCQUEwQixFQUE0QixNQUFNLDZCQUE2QixDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLElBQUksVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFeEUsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUE2QiwyQkFBMkIsQ0FBQyxDQUFDO0FBRW5IOzs7R0FHRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFZbEM7Ozs7O09BS0c7SUFDSCxZQUFZLEtBQTZCLEVBQUUscUJBQXFEO1FBQy9GLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ25CLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztJQUNwRCxDQUFDO0NBQ0Q7QUE0Qk0sSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBT3hELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVPLENBQUMsbUJBQW1CO1FBQzNCLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3BELEtBQUssTUFBTSxRQUFRLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQzdDLE1BQU0sUUFBUSxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxJQUFJLFVBQVUsQ0FBQyxHQUF3QixJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUdwRSxZQUN3QixxQkFBNkQsRUFDdEUsWUFBMkMsRUFDNUMsV0FBeUM7UUFFdEQsS0FBSyxFQUFFLENBQUM7UUFKZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNyRCxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMzQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQXhCdEMsZUFBVSxHQUFtRixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXZHLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3BFLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFnQnpELGdCQUFXLEdBQUcsVUFBVSxDQUFDO0lBUWpDLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxtQkFBMkIsRUFBRSxFQUFVLEVBQUUsUUFBcUMsRUFBRSxHQUFHLGlCQUEyQjtRQUNoSixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFDRCxRQUFRLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFDL0MsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3hELElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsV0FBbUIsRUFBRSxjQUFzQixFQUFFLHdCQUFpQyxFQUFFLFNBQXdDLEVBQUUsWUFBc0MsRUFBRSxLQUF3QixFQUFFLGdCQUEwQixFQUFFLHdCQUFrQyxFQUFFLGlCQUEyQjtRQUMvUyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLGNBQWMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxTQUFTLENBQUM7UUFDZCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxrQkFBa0IsR0FBa0MsRUFBRSxDQUFDO1lBQzdELEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ2pDLFNBQVM7Z0JBQ1YsQ0FBQztnQkFDRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUMvQyxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUM5RCxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ2xDLE1BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELFNBQVMsR0FBRyxrQkFBa0IsQ0FBQztRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdGLENBQUM7UUFFRCxJQUFJLHdCQUF3QixFQUFFLENBQUM7WUFDOUIsU0FBUyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDL0MsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN0SixDQUFDO1FBRUQsU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU87UUFDUixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUN0SixDQUFDO0lBRVMsb0JBQW9CLENBQUMsU0FBd0M7UUFDdEUsTUFBTSxjQUFjLEdBQStCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLGtGQUFvQyxDQUFDO1FBQzNILE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzQixNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxjQUFjLENBQUMsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUFDLFNBQXdDLEVBQUUsU0FBd0MsRUFBRSxXQUFtQixFQUFFLGNBQXNCLEVBQUUsd0JBQWlDLEVBQUUsWUFBc0MsRUFBRSxLQUF3QixFQUFFLGlCQUEyQjtRQUNsUyxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLFFBQVEsRUFBQyxFQUFFO1lBQ3pELElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNsRixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25ELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztZQUNyQixJQUFJLFdBQVcsQ0FBQztZQUNoQixJQUFJLENBQUM7Z0JBQ0osV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDaEMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDO29CQUN6RixDQUFDLEtBQUssSUFBSSxFQUFFLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtpQkFDaEYsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsd0RBQXdELFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbkcsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMseUNBQXlDLFFBQVEsQ0FBQyxFQUFFLHFCQUFxQixTQUFTLG9CQUFvQixXQUFXLHFCQUFxQixjQUFjLHVCQUF1QixpQkFBaUIsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZOLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNGLElBQUksU0FBUyw2Q0FBZ0MsRUFBRSxDQUFDO2dCQUMvQyxLQUFLLE1BQU0sVUFBVSxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUMxQyxVQUFVLENBQUMsY0FBYyxLQUFLLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLENBQUM7Z0JBQzFILENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLDJCQUEyQjtnQkFDM0IsS0FBSyxNQUFNLElBQUksSUFBSSxlQUFlLEVBQUUsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLGVBQWUsQ0FBQztZQUN4QixDQUFDO1lBQ0QsSUFBSSxXQUFXLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDakwsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO29CQUN6QixLQUFLLE1BQU0sSUFBSSxJQUFJLG1CQUFtQixFQUFFLENBQUM7d0JBQ3hDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDMUQsaUNBQWlDO3dCQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzs0QkFDN0IsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDNUIsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxlQUFlLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN0RCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBb0QsRUFBRSxXQUFtQixFQUFFLGNBQXNCLEVBQUUsUUFBZ0IsRUFBRSxZQUFzQyxFQUFFLFNBQTZCO1FBQ2hOLE1BQU0sbUJBQW1CLEdBQUcscUJBQXFCLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQztRQUN6RSxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsd0RBQXdEO1lBQ3hELFdBQVcsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBRUQsNEZBQTRGO1FBQzVGLDBFQUEwRTtRQUMxRSxNQUFNLGdCQUFnQixHQUFHLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLElBQUkscUJBQXFCLENBQUMsY0FBYyxDQUFDLElBQUksS0FBSyxDQUFDO1FBQ25ILE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsY0FBYyxJQUFJLFNBQVMsQ0FBQztRQUV6RSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLGdCQUFnQixJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQTBCLEVBQUUsQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5RCwwQ0FBMEM7UUFDMUMseUZBQXlGO1FBQ3pGLFNBQVM7UUFDVCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRS9GLHdGQUF3RjtRQUN4RixtREFBbUQ7UUFDbkQsSUFBSSxjQUFzQixDQUFDO1FBQzNCLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6Qix3RUFBd0U7WUFDeEUsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzFCLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7d0JBQzFELGtCQUFrQixHQUFHLENBQUMsQ0FBQzt3QkFDdkIsTUFBTTtvQkFDUCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7YUFBTSxDQUFDO1lBQ1AsY0FBYyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELHdGQUF3RjtRQUN4Riw0RkFBNEY7UUFDNUYsd0RBQXdEO1FBQ3hELElBQUksY0FBYyxHQUFHLGNBQWMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEYsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGNBQWMsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBR0QsMkNBQTJDO1FBQzNDLElBQUksc0JBQWdELENBQUM7UUFDckQsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMxRSxNQUFNLDRCQUE0QixHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDOUgsTUFBTSxJQUFJLEdBQUcsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUMvRixRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ2pFLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1Ysc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2RyxDQUFDO2dCQUNELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUM3Qiw2RUFBNkU7b0JBQzdFLDBCQUEwQjtvQkFDMUIsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7d0JBQ2pDLHNCQUFzQixHQUFHLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO29CQUMzRSxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLElBQUksU0FBUyw2Q0FBNkIsRUFBRSxDQUFDO29CQUM1QyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxzQkFBc0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFFLENBQUM7Z0JBQ0QsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLHNCQUFzQixHQUFHLEdBQUcsQ0FBQztnQkFDN0IsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQseUZBQXlGO1FBQ3pGLHdDQUF3QztRQUN4QyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM3QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsaUVBQWlFO1FBQ2pFLElBQUksT0FBTyxzQkFBc0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hCLEtBQUssRUFBRSxjQUFjO2dCQUNyQixRQUFRO2dCQUNSLElBQUksRUFBRSwwQkFBMEIsQ0FBQyxNQUFNO2dCQUN2QyxNQUFNLEVBQUUsc0JBQXNCO2dCQUM5QixnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07Z0JBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2xDLENBQUMsQ0FBQztZQUNILE9BQU8sbUJBQW1CLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsRUFBRSw2QkFBNkIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlHLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxxRkFBcUY7UUFDckYsaUZBQWlGO1FBQ2pGLHNCQUFzQjtRQUN0QixFQUFFO1FBQ0YsZ0NBQWdDO1FBQ2hDLHFGQUFxRjtRQUNyRix1RkFBdUY7UUFDdkYsVUFBVTtRQUNWLHFDQUFxQztRQUNyQyxvQ0FBb0M7UUFDcEMsaUNBQWlDO1FBQ2pDLHFDQUFxQztRQUNyQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxLQUFhLENBQUM7WUFDbEIsUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ2QsS0FBSyxHQUFHLGNBQWMsQ0FBQztvQkFDdkIsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDakIsS0FBSyxHQUFHLGNBQWMsQ0FBQztvQkFDdkIsTUFBTTtnQkFDUCxDQUFDO2dCQUNELEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDakIsS0FBSyxHQUFHLEdBQUcsQ0FBQztvQkFDWixJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQy9CLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztvQkFDbEcsQ0FBQztvQkFDRCxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBQ0QsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dCQUN4QixLQUFLO2dCQUNMLFFBQVE7Z0JBQ1IsSUFBSSxFQUFFLDBCQUEwQixDQUFDLE1BQU07Z0JBQ3ZDLE1BQU0sRUFBRSxlQUFlLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLENBQUMsYUFBYSxFQUFFLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7Z0JBQ2xJLGdCQUFnQixFQUFFLGNBQWMsR0FBRyxRQUFRLENBQUMsTUFBTTtnQkFDbEQsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU07YUFDbEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELDJDQUEyQztRQUMzQyxFQUFFO1FBQ0Ysd0RBQXdEO1FBQ3hELHlEQUF5RDtRQUN6RCx3REFBd0Q7UUFDeEQsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsSUFBSSxJQUE0QyxDQUFDO1lBQ2pELElBQUksTUFBTSxHQUF1QixTQUFTLENBQUM7WUFDM0MsSUFBSSxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUMxQixJQUFJLEdBQUcsMEJBQTBCLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3RELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLEdBQUcsMEJBQTBCLENBQUMsTUFBTSxDQUFDO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLGNBQWMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNDLElBQUksS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUMxQixJQUFJLEdBQUcsMEJBQTBCLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3BELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksS0FBSyxHQUFHLGNBQWMsQ0FBQztZQUMzQixJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxLQUFLLElBQUkscUJBQXFCLENBQUMsYUFBYSxDQUFDO1lBQzlDLENBQUM7WUFDRCxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQztZQUNwQixJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxHQUFHLHFCQUFxQixDQUFDLEtBQUssRUFBRSxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQy9FLEtBQUssSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLENBQUM7WUFDOUMsQ0FBQztZQUVELEtBQUssR0FBRyw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRTdGLElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDOUYsSUFBSSxTQUFTLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQ3RELFNBQVM7Z0JBQ1YsQ0FBQztZQUNGLENBQUM7WUFFRCxtREFBbUQ7WUFDbkQsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQztvQkFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDbEUsSUFBSSxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO3dCQUNwRCxNQUFNLEdBQUcsR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxPQUFPLGVBQWUsQ0FBQyxRQUFRLEVBQUUscUJBQXFCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUMzTCxDQUFDO2dCQUNGLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsdUVBQXVFO2dCQUN4RSxDQUFDO1lBQ0YsQ0FBQztZQUVELG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDeEIsS0FBSztnQkFDTCxRQUFRO2dCQUNSLElBQUk7Z0JBQ0osTUFBTSxFQUFFLE1BQU0sSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztnQkFDdkcsZ0JBQWdCLEVBQUUsY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNO2dCQUNsRCxpQkFBaUIsRUFBRSxRQUFRLENBQUMsTUFBTTthQUNsQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELEVBQUU7UUFDRixtRkFBbUY7UUFDbkYsSUFBSSxJQUFJLEtBQUssVUFBVSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDN0MsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLDRFQUFpQyxDQUFDO2dCQUNwRixJQUFJLE1BQU0sS0FBSyxVQUFVLElBQUksTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxNQUFNLEVBQUUsQ0FBQzt3QkFDWixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNwRSxLQUFLLE1BQU0sV0FBVyxJQUFJLGFBQWEsRUFBRSxDQUFDOzRCQUN6QyxJQUFJLENBQUM7Z0NBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsNkJBQTZCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQ0FDakgsSUFBSSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUM7b0NBQ3hCLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dDQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDOzRDQUN4QixTQUFTO3dDQUNWLENBQUM7d0NBQ0QsTUFBTSxXQUFXLEdBQUcsTUFBTSxLQUFLLFVBQVUsQ0FBQzt3Q0FDMUMsTUFBTSxJQUFJLEdBQUcsMEJBQTBCLENBQUMsTUFBTSxDQUFDO3dDQUMvQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO3dDQUNwSixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUscUJBQXFCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7d0NBQzFJLG1CQUFtQixDQUFDLElBQUksQ0FBQzs0Q0FDeEIsS0FBSzs0Q0FDTCxRQUFROzRDQUNSLElBQUk7NENBQ0osTUFBTTs0Q0FDTixnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07NENBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO3lDQUNsQyxDQUFDLENBQUM7b0NBQ0osQ0FBQztnQ0FDRixDQUFDOzRCQUNGLENBQUM7NEJBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQ3pCLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxpR0FBaUc7UUFDakcsRUFBRTtRQUNGLDRCQUE0QjtRQUM1Qix3Q0FBd0M7UUFDeEMsSUFBSSxJQUFJLEtBQUssVUFBVSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDN0MsSUFBSSxLQUFLLEdBQUcsS0FBSyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2RCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxjQUFjLEdBQUcsS0FBSyxFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLENBQUM7WUFDMUcsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNoRixtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hCLEtBQUs7Z0JBQ0wsUUFBUTtnQkFDUixJQUFJLEVBQUUsMEJBQTBCLENBQUMsTUFBTTtnQkFDdkMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxTQUFTLEVBQUUscUJBQXFCLENBQUMsYUFBYSxFQUFFLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUM7Z0JBQ3JILGdCQUFnQixFQUFFLGNBQWMsR0FBRyxRQUFRLENBQUMsTUFBTTtnQkFDbEQsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU07YUFDbEMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELHlGQUF5RjtRQUN6RixTQUFTO1FBQ1QsRUFBRTtRQUNGLDBCQUEwQjtRQUMxQixJQUFJLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxZQUFzQyxDQUFDO1lBQzNDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDakUsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixZQUFZLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzdGLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLDZFQUE2RTtnQkFDN0UsMEJBQTBCO2dCQUMxQixZQUFZLEdBQUcsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDakUsQ0FBQztZQUNELG1CQUFtQixDQUFDLElBQUksQ0FBQztnQkFDeEIsS0FBSyxFQUFFLEdBQUc7Z0JBQ1YsUUFBUTtnQkFDUixJQUFJLEVBQUUsMEJBQTBCLENBQUMsTUFBTTtnQkFDdkMsTUFBTSxFQUFFLE9BQU8sWUFBWSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLGFBQWEsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO2dCQUMxSyxnQkFBZ0IsRUFBRSxjQUFjLEdBQUcsUUFBUSxDQUFDLE1BQU07Z0JBQ2xELGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxNQUFNO2FBQ2xDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7SUFFTyxVQUFVLENBQUMsR0FBVyxFQUFFLFlBQXNDO1FBQ3JFLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLDhDQUFzQyxFQUFFLEdBQUcsRUFBRSxLQUE4QyxDQUFDO1FBQ3hILElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFTyxXQUFXLENBQUMsbUJBQTRCLEVBQUUsWUFBc0M7UUFDdkYsT0FBTyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ25ILENBQUM7Q0FDRCxDQUFBO0FBN2RZLHlCQUF5QjtJQXdCbkMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0dBMUJELHlCQUF5QixDQTZkckM7O0FBRUQsU0FBUyxlQUFlLENBQUMsR0FBUSxFQUFFLGFBQXFCLEVBQUUsSUFBZ0MsRUFBRSxTQUE2QjtJQUN4SCxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3RCLE1BQU0sR0FBRyxHQUFHLFNBQVMsNkNBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0lBQzFFLHNGQUFzRjtJQUN0RixJQUFJLElBQUksS0FBSywwQkFBMEIsQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDdkUsSUFBSSxJQUFJLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFDRCx5Q0FBeUM7SUFDekMsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztRQUNoRCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLHFCQUFxQixDQUFDLElBQVksRUFBRSxxQkFBMkUsRUFBRSwwQkFBbUM7SUFDNUosSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFDakMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDMUQsT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ25CLENBQUM7UUFDRCxPQUFPLElBQUkscUJBQXFCLENBQUMsYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDO0lBQ3pELENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsS0FBYSxFQUFFLFNBQXdDLEVBQUUsYUFBcUI7SUFDM0gseUVBQXlFO0lBQ3pFLElBQUksU0FBUyxLQUFLLFNBQVMsSUFBSSxTQUFTLDZDQUFnQyxJQUFJLFNBQVMsK0NBQW1DLEVBQUUsQ0FBQztRQUMxSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDNUQsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsU0FBd0MsRUFBRSxhQUFxQixFQUFFLFFBQWdCLEVBQUUsbUJBQTRCO0lBQ3pJLElBQUksU0FBUyw2Q0FBNkIsRUFBRSxDQUFDO1FBQzVDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFDRCxPQUFPLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDckcsQ0FBQyJ9