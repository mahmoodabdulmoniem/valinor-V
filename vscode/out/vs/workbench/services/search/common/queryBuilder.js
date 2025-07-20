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
import * as arrays from '../../../../base/common/arrays.js';
import * as collections from '../../../../base/common/collections.js';
import * as glob from '../../../../base/common/glob.js';
import { untildify } from '../../../../base/common/labels.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import { isEqual, basename, relativePath, isAbsolutePath } from '../../../../base/common/resources.js';
import * as strings from '../../../../base/common/strings.js';
import { assertReturnsDefined, isDefined } from '../../../../base/common/types.js';
import { URI, URI as uri } from '../../../../base/common/uri.js';
import { isMultilineRegexSource } from '../../../../editor/common/model/textModelSearch.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, toWorkspaceFolder } from '../../../../platform/workspace/common/workspace.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { IPathService } from '../../path/common/pathService.js';
import { getExcludes, pathIncludedInQuery } from './search.js';
export function isISearchPatternBuilder(object) {
    return (typeof object === 'object' && 'uri' in object && 'pattern' in object);
}
export function globPatternToISearchPatternBuilder(globPattern) {
    if (typeof globPattern === 'string') {
        return {
            pattern: globPattern
        };
    }
    return {
        pattern: globPattern.pattern,
        uri: globPattern.baseUri
    };
}
let QueryBuilder = class QueryBuilder {
    constructor(configurationService, workspaceContextService, editorGroupsService, logService, pathService, uriIdentityService) {
        this.configurationService = configurationService;
        this.workspaceContextService = workspaceContextService;
        this.editorGroupsService = editorGroupsService;
        this.logService = logService;
        this.pathService = pathService;
        this.uriIdentityService = uriIdentityService;
    }
    aiText(contentPattern, folderResources, options = {}) {
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 3 /* QueryType.aiText */,
            contentPattern,
        };
    }
    text(contentPattern, folderResources, options = {}) {
        contentPattern = this.getContentPattern(contentPattern, options);
        const searchConfig = this.configurationService.getValue();
        const fallbackToPCRE = folderResources && folderResources.some(folder => {
            const folderConfig = this.configurationService.getValue({ resource: folder });
            return !folderConfig.search.useRipgrep;
        });
        const commonQuery = this.commonQuery(folderResources?.map(toWorkspaceFolder), options);
        return {
            ...commonQuery,
            type: 2 /* QueryType.Text */,
            contentPattern,
            previewOptions: options.previewOptions,
            maxFileSize: options.maxFileSize,
            usePCRE2: searchConfig.search.usePCRE2 || fallbackToPCRE || false,
            surroundingContext: options.surroundingContext,
            userDisabledExcludesAndIgnoreFiles: options.disregardExcludeSettings && options.disregardIgnoreFiles,
        };
    }
    /**
     * Adjusts input pattern for config
     */
    getContentPattern(inputPattern, options) {
        const searchConfig = this.configurationService.getValue();
        if (inputPattern.isRegExp) {
            inputPattern.pattern = inputPattern.pattern.replace(/\r?\n/g, '\\n');
        }
        const newPattern = {
            ...inputPattern,
            wordSeparators: searchConfig.editor.wordSeparators
        };
        if (this.isCaseSensitive(inputPattern, options)) {
            newPattern.isCaseSensitive = true;
        }
        if (this.isMultiline(inputPattern)) {
            newPattern.isMultiline = true;
        }
        if (options.notebookSearchConfig?.includeMarkupInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownInput = options.notebookSearchConfig.includeMarkupInput;
        }
        if (options.notebookSearchConfig?.includeMarkupPreview) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookMarkdownPreview = options.notebookSearchConfig.includeMarkupPreview;
        }
        if (options.notebookSearchConfig?.includeCodeInput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellInput = options.notebookSearchConfig.includeCodeInput;
        }
        if (options.notebookSearchConfig?.includeOutput) {
            if (!newPattern.notebookInfo) {
                newPattern.notebookInfo = {};
            }
            newPattern.notebookInfo.isInNotebookCellOutput = options.notebookSearchConfig.includeOutput;
        }
        return newPattern;
    }
    file(folders, options = {}) {
        const commonQuery = this.commonQuery(folders, options);
        return {
            ...commonQuery,
            type: 1 /* QueryType.File */,
            filePattern: options.filePattern
                ? options.filePattern.trim()
                : options.filePattern,
            exists: options.exists,
            sortByScore: options.sortByScore,
            cacheKey: options.cacheKey,
            shouldGlobMatchFilePattern: options.shouldGlobSearch
        };
    }
    handleIncludeExclude(pattern, expandPatterns) {
        if (!pattern) {
            return {};
        }
        if (Array.isArray(pattern)) {
            pattern = pattern.filter(p => p.length > 0).map(normalizeSlashes);
            if (!pattern.length) {
                return {};
            }
        }
        else {
            pattern = normalizeSlashes(pattern);
        }
        return expandPatterns
            ? this.parseSearchPaths(pattern)
            : { pattern: patternListToIExpression(...(Array.isArray(pattern) ? pattern : [pattern])) };
    }
    commonQuery(folderResources = [], options = {}) {
        let excludePatterns = Array.isArray(options.excludePattern) ? options.excludePattern.map(p => p.pattern).flat() : options.excludePattern;
        excludePatterns = excludePatterns?.length === 1 ? excludePatterns[0] : excludePatterns;
        const includeSearchPathsInfo = this.handleIncludeExclude(options.includePattern, options.expandPatterns);
        const excludeSearchPathsInfo = this.handleIncludeExclude(excludePatterns, options.expandPatterns);
        // Build folderQueries from searchPaths, if given, otherwise folderResources
        const includeFolderName = folderResources.length > 1;
        const folderQueries = (includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length ?
            includeSearchPathsInfo.searchPaths.map(searchPath => this.getFolderQueryForSearchPath(searchPath, options, excludeSearchPathsInfo)) :
            folderResources.map(folder => this.getFolderQueryForRoot(folder, options, excludeSearchPathsInfo, includeFolderName)))
            .filter(query => !!query);
        const queryProps = {
            _reason: options._reason,
            folderQueries,
            usingSearchPaths: !!(includeSearchPathsInfo.searchPaths && includeSearchPathsInfo.searchPaths.length),
            extraFileResources: options.extraFileResources,
            excludePattern: excludeSearchPathsInfo.pattern,
            includePattern: includeSearchPathsInfo.pattern,
            onlyOpenEditors: options.onlyOpenEditors,
            maxResults: options.maxResults,
            onlyFileScheme: options.onlyFileScheme
        };
        if (options.onlyOpenEditors) {
            const openEditors = arrays.coalesce(this.editorGroupsService.groups.flatMap(group => group.editors.map(editor => editor.resource)));
            this.logService.trace('QueryBuilder#commonQuery - openEditor URIs', JSON.stringify(openEditors));
            const openEditorsInQuery = openEditors.filter(editor => pathIncludedInQuery(queryProps, editor.fsPath));
            const openEditorsQueryProps = this.commonQueryFromFileList(openEditorsInQuery);
            this.logService.trace('QueryBuilder#commonQuery - openEditor Query', JSON.stringify(openEditorsQueryProps));
            return { ...queryProps, ...openEditorsQueryProps };
        }
        // Filter extraFileResources against global include/exclude patterns - they are already expected to not belong to a workspace
        const extraFileResources = options.extraFileResources && options.extraFileResources.filter(extraFile => pathIncludedInQuery(queryProps, extraFile.fsPath));
        queryProps.extraFileResources = extraFileResources && extraFileResources.length ? extraFileResources : undefined;
        return queryProps;
    }
    commonQueryFromFileList(files) {
        const folderQueries = [];
        const foldersToSearch = new ResourceMap();
        const includePattern = {};
        let hasIncludedFile = false;
        files.forEach(file => {
            if (file.scheme === Schemas.walkThrough) {
                return;
            }
            const providerExists = isAbsolutePath(file);
            // Special case userdata as we don't have a search provider for it, but it can be searched.
            if (providerExists) {
                const searchRoot = this.workspaceContextService.getWorkspaceFolder(file)?.uri ?? this.uriIdentityService.extUri.dirname(file);
                let folderQuery = foldersToSearch.get(searchRoot);
                if (!folderQuery) {
                    hasIncludedFile = true;
                    folderQuery = { folder: searchRoot, includePattern: {} };
                    folderQueries.push(folderQuery);
                    foldersToSearch.set(searchRoot, folderQuery);
                }
                const relPath = path.relative(searchRoot.fsPath, file.fsPath);
                assertReturnsDefined(folderQuery.includePattern)[relPath.replace(/\\/g, '/')] = true;
            }
            else {
                if (file.fsPath) {
                    hasIncludedFile = true;
                    includePattern[file.fsPath] = true;
                }
            }
        });
        return {
            folderQueries,
            includePattern,
            usingSearchPaths: true,
            excludePattern: hasIncludedFile ? undefined : { '**/*': true }
        };
    }
    /**
     * Resolve isCaseSensitive flag based on the query and the isSmartCase flag, for search providers that don't support smart case natively.
     */
    isCaseSensitive(contentPattern, options) {
        if (options.isSmartCase) {
            if (contentPattern.isRegExp) {
                // Consider it case sensitive if it contains an unescaped capital letter
                if (strings.containsUppercaseCharacter(contentPattern.pattern, true)) {
                    return true;
                }
            }
            else if (strings.containsUppercaseCharacter(contentPattern.pattern)) {
                return true;
            }
        }
        return !!contentPattern.isCaseSensitive;
    }
    isMultiline(contentPattern) {
        if (contentPattern.isMultiline) {
            return true;
        }
        if (contentPattern.isRegExp && isMultilineRegexSource(contentPattern.pattern)) {
            return true;
        }
        if (contentPattern.pattern.indexOf('\n') >= 0) {
            return true;
        }
        return !!contentPattern.isMultiline;
    }
    /**
     * Take the includePattern as seen in the search viewlet, and split into components that look like searchPaths, and
     * glob patterns. Glob patterns are expanded from 'foo/bar' to '{foo/bar/**, **\/foo/bar}.
     *
     * Public for test.
     */
    parseSearchPaths(pattern) {
        const isSearchPath = (segment) => {
            // A segment is a search path if it is an absolute path or starts with ./, ../, .\, or ..\
            return path.isAbsolute(segment) || /^\.\.?([\/\\]|$)/.test(segment);
        };
        const patterns = Array.isArray(pattern) ? pattern : splitGlobPattern(pattern);
        const segments = patterns
            .map(segment => {
            const userHome = this.pathService.resolvedUserHome;
            if (userHome) {
                return untildify(segment, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
            }
            return segment;
        });
        const groups = collections.groupBy(segments, segment => isSearchPath(segment) ? 'searchPaths' : 'exprSegments');
        const expandedExprSegments = (groups.exprSegments || [])
            .map(s => strings.rtrim(s, '/'))
            .map(s => strings.rtrim(s, '\\'))
            .map(p => {
            if (p[0] === '.') {
                p = '*' + p; // convert ".js" to "*.js"
            }
            return expandGlobalGlob(p);
        });
        const result = {};
        const searchPaths = this.expandSearchPathPatterns(groups.searchPaths || []);
        if (searchPaths && searchPaths.length) {
            result.searchPaths = searchPaths;
        }
        const exprSegments = expandedExprSegments.flat();
        const includePattern = patternListToIExpression(...exprSegments);
        if (includePattern) {
            result.pattern = includePattern;
        }
        return result;
    }
    getExcludesForFolder(folderConfig, options) {
        return options.disregardExcludeSettings ?
            undefined :
            getExcludes(folderConfig, !options.disregardSearchExcludeSettings);
    }
    /**
     * Split search paths (./ or ../ or absolute paths in the includePatterns) into absolute paths and globs applied to those paths
     */
    expandSearchPathPatterns(searchPaths) {
        if (!searchPaths || !searchPaths.length) {
            // No workspace => ignore search paths
            return [];
        }
        const expandedSearchPaths = searchPaths.flatMap(searchPath => {
            // 1 open folder => just resolve the search paths to absolute paths
            let { pathPortion, globPortion } = splitGlobFromPath(searchPath);
            if (globPortion) {
                globPortion = normalizeGlobPattern(globPortion);
            }
            // One pathPortion to multiple expanded search paths (e.g. duplicate matching workspace folders)
            const oneExpanded = this.expandOneSearchPath(pathPortion);
            // Expanded search paths to multiple resolved patterns (with ** and without)
            return oneExpanded.flatMap(oneExpandedResult => this.resolveOneSearchPathPattern(oneExpandedResult, globPortion));
        });
        const searchPathPatternMap = new Map();
        expandedSearchPaths.forEach(oneSearchPathPattern => {
            const key = oneSearchPathPattern.searchPath.toString();
            const existing = searchPathPatternMap.get(key);
            if (existing) {
                if (oneSearchPathPattern.pattern) {
                    existing.pattern = existing.pattern || {};
                    existing.pattern[oneSearchPathPattern.pattern] = true;
                }
            }
            else {
                searchPathPatternMap.set(key, {
                    searchPath: oneSearchPathPattern.searchPath,
                    pattern: oneSearchPathPattern.pattern ? patternListToIExpression(oneSearchPathPattern.pattern) : undefined
                });
            }
        });
        return Array.from(searchPathPatternMap.values());
    }
    /**
     * Takes a searchPath like `./a/foo` or `../a/foo` and expands it to absolute paths for all the workspaces it matches.
     */
    expandOneSearchPath(searchPath) {
        if (path.isAbsolute(searchPath)) {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            if (workspaceFolders[0] && workspaceFolders[0].uri.scheme !== Schemas.file) {
                return [{
                        searchPath: workspaceFolders[0].uri.with({ path: searchPath })
                    }];
            }
            // Currently only local resources can be searched for with absolute search paths.
            // TODO convert this to a workspace folder + pattern, so excludes will be resolved properly for an absolute path inside a workspace folder
            return [{
                    searchPath: uri.file(path.normalize(searchPath))
                }];
        }
        if (this.workspaceContextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceUri = this.workspaceContextService.getWorkspace().folders[0].uri;
            searchPath = normalizeSlashes(searchPath);
            if (searchPath.startsWith('../') || searchPath === '..') {
                const resolvedPath = path.posix.resolve(workspaceUri.path, searchPath);
                return [{
                        searchPath: workspaceUri.with({ path: resolvedPath })
                    }];
            }
            const cleanedPattern = normalizeGlobPattern(searchPath);
            return [{
                    searchPath: workspaceUri,
                    pattern: cleanedPattern
                }];
        }
        else if (searchPath === './' || searchPath === '.\\') {
            return []; // ./ or ./**/foo makes sense for single-folder but not multi-folder workspaces
        }
        else {
            const searchPathWithoutDotSlash = searchPath.replace(/^\.[\/\\]/, '');
            const folders = this.workspaceContextService.getWorkspace().folders;
            const folderMatches = folders.map(folder => {
                const match = searchPathWithoutDotSlash.match(new RegExp(`^${strings.escapeRegExpCharacters(folder.name)}(?:/(.*)|$)`));
                return match ? {
                    match,
                    folder
                } : null;
            }).filter(isDefined);
            if (folderMatches.length) {
                return folderMatches.map(match => {
                    const patternMatch = match.match[1];
                    return {
                        searchPath: match.folder.uri,
                        pattern: patternMatch && normalizeGlobPattern(patternMatch)
                    };
                });
            }
            else {
                const probableWorkspaceFolderNameMatch = searchPath.match(/\.[\/\\](.+)[\/\\]?/);
                const probableWorkspaceFolderName = probableWorkspaceFolderNameMatch ? probableWorkspaceFolderNameMatch[1] : searchPath;
                // No root folder with name
                const searchPathNotFoundError = nls.localize('search.noWorkspaceWithName', "Workspace folder does not exist: {0}", probableWorkspaceFolderName);
                throw new Error(searchPathNotFoundError);
            }
        }
    }
    resolveOneSearchPathPattern(oneExpandedResult, globPortion) {
        const pattern = oneExpandedResult.pattern && globPortion ?
            `${oneExpandedResult.pattern}/${globPortion}` :
            oneExpandedResult.pattern || globPortion;
        const results = [
            {
                searchPath: oneExpandedResult.searchPath,
                pattern
            }
        ];
        if (pattern && !pattern.endsWith('**')) {
            results.push({
                searchPath: oneExpandedResult.searchPath,
                pattern: pattern + '/**'
            });
        }
        return results;
    }
    getFolderQueryForSearchPath(searchPath, options, searchPathExcludes) {
        const rootConfig = this.getFolderQueryForRoot(toWorkspaceFolder(searchPath.searchPath), options, searchPathExcludes, false);
        if (!rootConfig) {
            return null;
        }
        return {
            ...rootConfig,
            ...{
                includePattern: searchPath.pattern
            }
        };
    }
    getFolderQueryForRoot(folder, options, searchPathExcludes, includeFolderName) {
        let thisFolderExcludeSearchPathPattern;
        const folderUri = URI.isUri(folder) ? folder : folder.uri;
        // only use exclude root if it is different from the folder root
        let excludeFolderRoots = options.excludePattern?.map(excludePattern => {
            const excludeRoot = options.excludePattern && isISearchPatternBuilder(excludePattern) ? excludePattern.uri : undefined;
            const shouldUseExcludeRoot = (!excludeRoot || !(URI.isUri(folder) && this.uriIdentityService.extUri.isEqual(folder, excludeRoot)));
            return shouldUseExcludeRoot ? excludeRoot : undefined;
        });
        if (!excludeFolderRoots?.length) {
            excludeFolderRoots = [undefined];
        }
        if (searchPathExcludes.searchPaths) {
            const thisFolderExcludeSearchPath = searchPathExcludes.searchPaths.filter(sp => isEqual(sp.searchPath, folderUri))[0];
            if (thisFolderExcludeSearchPath && !thisFolderExcludeSearchPath.pattern) {
                // entire folder is excluded
                return null;
            }
            else if (thisFolderExcludeSearchPath) {
                thisFolderExcludeSearchPathPattern = thisFolderExcludeSearchPath.pattern;
            }
        }
        const folderConfig = this.configurationService.getValue({ resource: folderUri });
        const settingExcludes = this.getExcludesForFolder(folderConfig, options);
        const excludePattern = {
            ...(settingExcludes || {}),
            ...(thisFolderExcludeSearchPathPattern || {})
        };
        const folderName = URI.isUri(folder) ? basename(folder) : folder.name;
        const excludePatternRet = excludeFolderRoots.map(excludeFolderRoot => {
            return Object.keys(excludePattern).length > 0 ? {
                folder: excludeFolderRoot,
                pattern: excludePattern
            } : undefined;
        }).filter((e) => e);
        return {
            folder: folderUri,
            folderName: includeFolderName ? folderName : undefined,
            excludePattern: excludePatternRet,
            fileEncoding: folderConfig.files && folderConfig.files.encoding,
            disregardIgnoreFiles: typeof options.disregardIgnoreFiles === 'boolean' ? options.disregardIgnoreFiles : !folderConfig.search.useIgnoreFiles,
            disregardGlobalIgnoreFiles: typeof options.disregardGlobalIgnoreFiles === 'boolean' ? options.disregardGlobalIgnoreFiles : !folderConfig.search.useGlobalIgnoreFiles,
            disregardParentIgnoreFiles: typeof options.disregardParentIgnoreFiles === 'boolean' ? options.disregardParentIgnoreFiles : !folderConfig.search.useParentIgnoreFiles,
            ignoreSymlinks: typeof options.ignoreSymlinks === 'boolean' ? options.ignoreSymlinks : !folderConfig.search.followSymlinks,
        };
    }
};
QueryBuilder = __decorate([
    __param(0, IConfigurationService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorGroupsService),
    __param(3, ILogService),
    __param(4, IPathService),
    __param(5, IUriIdentityService)
], QueryBuilder);
export { QueryBuilder };
function splitGlobFromPath(searchPath) {
    const globCharMatch = searchPath.match(/[\*\{\}\(\)\[\]\?]/);
    if (globCharMatch) {
        const globCharIdx = globCharMatch.index;
        const lastSlashMatch = searchPath.substr(0, globCharIdx).match(/[/|\\][^/\\]*$/);
        if (lastSlashMatch) {
            let pathPortion = searchPath.substr(0, lastSlashMatch.index);
            if (!pathPortion.match(/[/\\]/)) {
                // If the last slash was the only slash, then we now have '' or 'C:' or '.'. Append a slash.
                pathPortion += '/';
            }
            return {
                pathPortion,
                globPortion: searchPath.substr((lastSlashMatch.index || 0) + 1)
            };
        }
    }
    // No glob char, or malformed
    return {
        pathPortion: searchPath
    };
}
function patternListToIExpression(...patterns) {
    return patterns.length ?
        patterns.reduce((glob, cur) => { glob[cur] = true; return glob; }, Object.create(null)) :
        undefined;
}
function splitGlobPattern(pattern) {
    return glob.splitGlobAware(pattern, ',')
        .map(s => s.trim())
        .filter(s => !!s.length);
}
/**
 * Note - we used {} here previously but ripgrep can't handle nested {} patterns. See https://github.com/microsoft/vscode/issues/32761
 */
function expandGlobalGlob(pattern) {
    const patterns = [
        `**/${pattern}/**`,
        `**/${pattern}`
    ];
    return patterns.map(p => p.replace(/\*\*\/\*\*/g, '**'));
}
function normalizeSlashes(pattern) {
    return pattern.replace(/\\/g, '/');
}
/**
 * Normalize slashes, remove `./` and trailing slashes
 */
function normalizeGlobPattern(pattern) {
    return normalizeSlashes(pattern)
        .replace(/^\.\//, '')
        .replace(/\/+$/g, '');
}
/**
 * Escapes a path for use as a glob pattern that would match the input precisely.
 * Characters '?', '*', '[', and ']' are escaped into character range glob syntax
 * (for example, '?' becomes '[?]').
 * NOTE: This implementation makes no special cases for UNC paths. For example,
 * given the input "//?/C:/A?.txt", this would produce output '//[?]/C:/A[?].txt',
 * which may not be desirable in some cases. Use with caution if UNC paths could be expected.
 */
function escapeGlobPattern(path) {
    return path.replace(/([?*[\]])/g, '[$1]');
}
/**
 * Construct an include pattern from a list of folders uris to search in.
 */
export function resolveResourcesForSearchIncludes(resources, contextService) {
    resources = arrays.distinct(resources, resource => resource.toString());
    const folderPaths = [];
    const workspace = contextService.getWorkspace();
    if (resources) {
        resources.forEach(resource => {
            let folderPath;
            if (contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                // Show relative path from the root for single-root mode
                folderPath = relativePath(workspace.folders[0].uri, resource); // always uses forward slashes
                if (folderPath && folderPath !== '.') {
                    folderPath = './' + folderPath;
                }
            }
            else {
                const owningFolder = contextService.getWorkspaceFolder(resource);
                if (owningFolder) {
                    const owningRootName = owningFolder.name;
                    // If this root is the only one with its basename, use a relative ./ path. If there is another, use an absolute path
                    const isUniqueFolder = workspace.folders.filter(folder => folder.name === owningRootName).length === 1;
                    if (isUniqueFolder) {
                        const relPath = relativePath(owningFolder.uri, resource); // always uses forward slashes
                        if (relPath === '') {
                            folderPath = `./${owningFolder.name}`;
                        }
                        else {
                            folderPath = `./${owningFolder.name}/${relPath}`;
                        }
                    }
                    else {
                        folderPath = resource.fsPath; // TODO rob: handle non-file URIs
                    }
                }
            }
            if (folderPath) {
                folderPaths.push(escapeGlobPattern(folderPath));
            }
        });
    }
    return folderPaths;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnlCdWlsZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9xdWVyeUJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdD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