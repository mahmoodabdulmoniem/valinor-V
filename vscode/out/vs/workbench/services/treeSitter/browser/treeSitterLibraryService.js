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
import { ObservablePromise } from '../../../../base/common/observable.js';
import { canASAR, importAMDNodeModule } from '../../../../amdX.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { CachedFunction } from '../../../../base/common/cache.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { FileAccess, nodeModulesAsarUnpackedPath, nodeModulesPath } from '../../../../base/common/network.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export const EDITOR_EXPERIMENTAL_PREFER_TREESITTER = 'editor.experimental.preferTreeSitter';
export const TREESITTER_ALLOWED_SUPPORT = ['css', 'typescript', 'ini', 'regex'];
const MODULE_LOCATION_SUBPATH = `@vscode/tree-sitter-wasm/wasm`;
const FILENAME_TREESITTER_WASM = `tree-sitter.wasm`;
export function getModuleLocation(environmentService) {
    return `${(canASAR && environmentService.isBuilt) ? nodeModulesAsarUnpackedPath : nodeModulesPath}/${MODULE_LOCATION_SUBPATH}`;
}
let TreeSitterLibraryService = class TreeSitterLibraryService extends Disposable {
    constructor(_configurationService, _fileService, _environmentService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this.isTest = false;
        this._treeSitterImport = new Lazy(async () => {
            const TreeSitter = await importAMDNodeModule('@vscode/tree-sitter-wasm', 'wasm/tree-sitter.js');
            const environmentService = this._environmentService;
            const isTest = this.isTest;
            await TreeSitter.Parser.init({
                locateFile(_file, _folder) {
                    const location = `${getModuleLocation(environmentService)}/${FILENAME_TREESITTER_WASM}`;
                    if (isTest) {
                        return FileAccess.asFileUri(location).toString(true);
                    }
                    else {
                        return FileAccess.asBrowserUri(location).toString(true);
                    }
                }
            });
            return TreeSitter;
        });
        this._supportsLanguage = new CachedFunction((languageId) => {
            return observableConfigValue(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${languageId}`, false, this._configurationService);
        });
        this._languagesCache = new CachedFunction((languageId) => {
            return ObservablePromise.fromFn(async () => {
                const languageLocation = getModuleLocation(this._environmentService);
                const grammarName = `tree-sitter-${languageId}`;
                const wasmPath = `${languageLocation}/${grammarName}.wasm`;
                const [treeSitter, languageFile] = await Promise.all([
                    this._treeSitterImport.value,
                    this._fileService.readFile(FileAccess.asFileUri(wasmPath))
                ]);
                const Language = treeSitter.Language;
                const language = await Language.load(languageFile.value.buffer);
                return language;
            });
        });
        this._injectionQueries = new CachedFunction({ getCacheKey: JSON.stringify }, (arg) => {
            const loadQuerySource = async () => {
                const injectionsQueriesLocation = `vs/editor/common/languages/${arg.kind}/${arg.languageId}.scm`;
                const uri = FileAccess.asFileUri(injectionsQueriesLocation);
                if (!this._fileService.hasProvider(uri)) {
                    return undefined;
                }
                const query = await tryReadFile(this._fileService, uri);
                if (query === undefined) {
                    return undefined;
                }
                return query.value.toString();
            };
            return ObservablePromise.fromFn(async () => {
                const [querySource, language, treeSitter] = await Promise.all([
                    loadQuerySource(),
                    this._languagesCache.get(arg.languageId).promise,
                    this._treeSitterImport.value,
                ]);
                if (querySource === undefined) {
                    return null;
                }
                const Query = treeSitter.Query;
                return new Query(language, querySource);
            }).resolvedValue;
        });
    }
    supportsLanguage(languageId, reader) {
        return this._supportsLanguage.get(languageId).read(reader);
    }
    async getParserClass() {
        const treeSitter = await this._treeSitterImport.value;
        return treeSitter.Parser;
    }
    getLanguage(languageId, reader) {
        if (!this.supportsLanguage(languageId, reader)) {
            return undefined;
        }
        const lang = this._languagesCache.get(languageId).resolvedValue.read(reader);
        return lang;
    }
    getInjectionQueries(languageId, reader) {
        if (!this.supportsLanguage(languageId, reader)) {
            return undefined;
        }
        const query = this._injectionQueries.get({ languageId, kind: 'injections' }).read(reader);
        return query;
    }
    getHighlightingQueries(languageId, reader) {
        if (!this.supportsLanguage(languageId, reader)) {
            return undefined;
        }
        const query = this._injectionQueries.get({ languageId, kind: 'highlights' }).read(reader);
        return query;
    }
};
TreeSitterLibraryService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService),
    __param(2, IEnvironmentService)
], TreeSitterLibraryService);
export { TreeSitterLibraryService };
async function tryReadFile(fileService, uri) {
    try {
        const result = await fileService.readFile(uri);
        return result;
    }
    catch (e) {
        if (toFileOperationResult(e) === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
            return undefined;
        }
        throw e;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckxpYnJhcnlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdHJlZVNpdHRlci9icm93c2VyL3RyZWVTaXR0ZXJMaWJyYXJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQVcsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVuRixPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUMsWUFBWSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBbUIsVUFBVSxFQUFFLDJCQUEyQixFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdsRSxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyxzQ0FBc0MsQ0FBQztBQUM1RixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBRWhGLE1BQU0sdUJBQXVCLEdBQUcsK0JBQStC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