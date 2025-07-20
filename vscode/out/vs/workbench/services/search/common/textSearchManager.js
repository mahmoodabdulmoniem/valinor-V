/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { FolderQuerySearchTree } from './folderQuerySearchTree.js';
import { DEFAULT_MAX_SEARCH_RESULTS, hasSiblingPromiseFn, excludeToGlobPattern, QueryGlobTester, resolvePatternsForProvider, DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from './search.js';
import { TextSearchMatch2, AISearchKeyword } from './searchExtTypes.js';
export class TextSearchManager {
    constructor(queryProviderPair, fileUtils, processType) {
        this.queryProviderPair = queryProviderPair;
        this.fileUtils = fileUtils;
        this.processType = processType;
        this.collector = null;
        this.isLimitHit = false;
        this.resultCount = 0;
    }
    get query() {
        return this.queryProviderPair.query;
    }
    search(onProgress, token, onKeywordResult) {
        const folderQueries = this.query.folderQueries || [];
        const tokenSource = new CancellationTokenSource(token);
        return new Promise((resolve, reject) => {
            this.collector = new TextSearchResultsCollector(onProgress);
            let isCanceled = false;
            const onResult = (result, folderIdx) => {
                if (result instanceof AISearchKeyword) {
                    // Already processed by the callback.
                    return;
                }
                if (isCanceled) {
                    return;
                }
                if (!this.isLimitHit) {
                    const resultSize = this.resultSize(result);
                    if (result instanceof TextSearchMatch2 && typeof this.query.maxResults === 'number' && this.resultCount + resultSize > this.query.maxResults) {
                        this.isLimitHit = true;
                        isCanceled = true;
                        tokenSource.cancel();
                        result = this.trimResultToSize(result, this.query.maxResults - this.resultCount);
                    }
                    const newResultSize = this.resultSize(result);
                    this.resultCount += newResultSize;
                    const a = result instanceof TextSearchMatch2;
                    if (newResultSize > 0 || !a) {
                        this.collector.add(result, folderIdx);
                    }
                }
            };
            // For each root folder
            this.doSearch(folderQueries, onResult, tokenSource.token, onKeywordResult).then(result => {
                tokenSource.dispose();
                this.collector.flush();
                resolve({
                    limitHit: this.isLimitHit || result?.limitHit,
                    messages: this.getMessagesFromResults(result),
                    stats: {
                        type: this.processType
                    }
                });
            }, (err) => {
                tokenSource.dispose();
                const errMsg = toErrorMessage(err);
                reject(new Error(errMsg));
            });
        });
    }
    getMessagesFromResults(result) {
        if (!result?.message) {
            return [];
        }
        if (Array.isArray(result.message)) {
            return result.message;
        }
        return [result.message];
    }
    resultSize(result) {
        if (result instanceof TextSearchMatch2) {
            return Array.isArray(result.ranges) ?
                result.ranges.length :
                1;
        }
        else {
            // #104400 context lines shoudn't count towards result count
            return 0;
        }
    }
    trimResultToSize(result, size) {
        return new TextSearchMatch2(result.uri, result.ranges.slice(0, size), result.previewText);
    }
    async doSearch(folderQueries, onResult, token, onKeywordResult) {
        const folderMappings = new FolderQuerySearchTree(folderQueries, (fq, i) => {
            const queryTester = new QueryGlobTester(this.query, fq);
            return { queryTester, folder: fq.folder, folderIdx: i };
        }, () => true);
        const testingPs = [];
        const progress = {
            report: (result) => {
                if (result instanceof AISearchKeyword) {
                    onKeywordResult?.(result);
                }
                else {
                    if (result.uri === undefined) {
                        throw Error('Text search result URI is undefined. Please check provider implementation.');
                    }
                    const folderQuery = folderMappings.findQueryFragmentAwareSubstr(result.uri);
                    const hasSibling = folderQuery.folder.scheme === Schemas.file ?
                        hasSiblingPromiseFn(() => {
                            return this.fileUtils.readdir(resources.dirname(result.uri));
                        }) :
                        undefined;
                    const relativePath = resources.relativePath(folderQuery.folder, result.uri);
                    if (relativePath) {
                        // This method is only async when the exclude contains sibling clauses
                        const included = folderQuery.queryTester.includedInQuery(relativePath, path.basename(relativePath), hasSibling);
                        if (isThenable(included)) {
                            testingPs.push(included.then(isIncluded => {
                                if (isIncluded) {
                                    onResult(result, folderQuery.folderIdx);
                                }
                            }));
                        }
                        else if (included) {
                            onResult(result, folderQuery.folderIdx);
                        }
                    }
                }
            }
        };
        const folderOptions = folderQueries.map(fq => this.getSearchOptionsForFolder(fq));
        const searchOptions = {
            folderOptions,
            maxFileSize: this.query.maxFileSize,
            maxResults: this.query.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS,
            previewOptions: this.query.previewOptions ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS,
            surroundingContext: this.query.surroundingContext ?? 0,
        };
        if ('usePCRE2' in this.query) {
            searchOptions.usePCRE2 = this.query.usePCRE2;
        }
        let result;
        if (this.queryProviderPair.query.type === 3 /* QueryType.aiText */) {
            result = await this.queryProviderPair.provider.provideAITextSearchResults(this.queryProviderPair.query.contentPattern, searchOptions, progress, token);
        }
        else {
            result = await this.queryProviderPair.provider.provideTextSearchResults(patternInfoToQuery(this.queryProviderPair.query.contentPattern), searchOptions, progress, token);
        }
        if (testingPs.length) {
            await Promise.all(testingPs);
        }
        return result;
    }
    getSearchOptionsForFolder(fq) {
        const includes = resolvePatternsForProvider(this.query.includePattern, fq.includePattern);
        let excludePattern = fq.excludePattern?.map(e => ({
            folder: e.folder,
            patterns: resolvePatternsForProvider(this.query.excludePattern, e.pattern)
        }));
        if (!excludePattern || excludePattern.length === 0) {
            excludePattern = [{
                    folder: undefined,
                    patterns: resolvePatternsForProvider(this.query.excludePattern, undefined)
                }];
        }
        const excludes = excludeToGlobPattern(excludePattern);
        const options = {
            folder: URI.from(fq.folder),
            excludes,
            includes,
            useIgnoreFiles: {
                local: !fq.disregardIgnoreFiles,
                parent: !fq.disregardParentIgnoreFiles,
                global: !fq.disregardGlobalIgnoreFiles
            },
            followSymlinks: !fq.ignoreSymlinks,
            encoding: (fq.fileEncoding && this.fileUtils.toCanonicalName(fq.fileEncoding)) ?? '',
        };
        return options;
    }
}
function patternInfoToQuery(patternInfo) {
    return {
        isCaseSensitive: patternInfo.isCaseSensitive || false,
        isRegExp: patternInfo.isRegExp || false,
        isWordMatch: patternInfo.isWordMatch || false,
        isMultiline: patternInfo.isMultiline || false,
        pattern: patternInfo.pattern
    };
}
export class TextSearchResultsCollector {
    constructor(_onResult) {
        this._onResult = _onResult;
        this._currentFolderIdx = -1;
        this._currentFileMatch = null;
        this._batchedCollector = new BatchedCollector(512, items => this.sendItems(items));
    }
    add(data, folderIdx) {
        // Collects TextSearchResults into IInternalFileMatches and collates using BatchedCollector.
        // This is efficient for ripgrep which sends results back one file at a time. It wouldn't be efficient for other search
        // providers that send results in random order. We could do this step afterwards instead.
        if (this._currentFileMatch && (this._currentFolderIdx !== folderIdx || !resources.isEqual(this._currentUri, data.uri))) {
            this.pushToCollector();
            this._currentFileMatch = null;
        }
        if (!this._currentFileMatch) {
            this._currentFolderIdx = folderIdx;
            this._currentFileMatch = {
                resource: data.uri,
                results: []
            };
        }
        this._currentFileMatch.results.push(extensionResultToFrontendResult(data));
    }
    pushToCollector() {
        const size = this._currentFileMatch && this._currentFileMatch.results ?
            this._currentFileMatch.results.length :
            0;
        this._batchedCollector.addItem(this._currentFileMatch, size);
    }
    flush() {
        this.pushToCollector();
        this._batchedCollector.flush();
    }
    sendItems(items) {
        this._onResult(items);
    }
}
function extensionResultToFrontendResult(data) {
    // Warning: result from RipgrepTextSearchEH has fake Range. Don't depend on any other props beyond these...
    if (data instanceof TextSearchMatch2) {
        return {
            previewText: data.previewText,
            rangeLocations: data.ranges.map(r => ({
                preview: {
                    startLineNumber: r.previewRange.start.line,
                    startColumn: r.previewRange.start.character,
                    endLineNumber: r.previewRange.end.line,
                    endColumn: r.previewRange.end.character
                },
                source: {
                    startLineNumber: r.sourceRange.start.line,
                    startColumn: r.sourceRange.start.character,
                    endLineNumber: r.sourceRange.end.line,
                    endColumn: r.sourceRange.end.character
                },
            })),
        };
    }
    else {
        return {
            text: data.text,
            lineNumber: data.lineNumber
        };
    }
}
/**
 * Collects items that have a size - before the cumulative size of collected items reaches START_BATCH_AFTER_COUNT, the callback is called for every
 * set of items collected.
 * But after that point, the callback is called with batches of maxBatchSize.
 * If the batch isn't filled within some time, the callback is also called.
 */
export class BatchedCollector {
    static { this.TIMEOUT = 4000; }
    // After START_BATCH_AFTER_COUNT items have been collected, stop flushing on timeout
    static { this.START_BATCH_AFTER_COUNT = 50; }
    constructor(maxBatchSize, cb) {
        this.maxBatchSize = maxBatchSize;
        this.cb = cb;
        this.totalNumberCompleted = 0;
        this.batch = [];
        this.batchSize = 0;
    }
    addItem(item, size) {
        if (!item) {
            return;
        }
        this.addItemToBatch(item, size);
    }
    addItems(items, size) {
        if (!items) {
            return;
        }
        this.addItemsToBatch(items, size);
    }
    addItemToBatch(item, size) {
        this.batch.push(item);
        this.batchSize += size;
        this.onUpdate();
    }
    addItemsToBatch(item, size) {
        this.batch = this.batch.concat(item);
        this.batchSize += size;
        this.onUpdate();
    }
    onUpdate() {
        if (this.totalNumberCompleted < BatchedCollector.START_BATCH_AFTER_COUNT) {
            // Flush because we aren't batching yet
            this.flush();
        }
        else if (this.batchSize >= this.maxBatchSize) {
            // Flush because the batch is full
            this.flush();
        }
        else if (!this.timeoutHandle) {
            // No timeout running, start a timeout to flush
            this.timeoutHandle = setTimeout(() => {
                this.flush();
            }, BatchedCollector.TIMEOUT);
        }
    }
    flush() {
        if (this.batchSize) {
            this.totalNumberCompleted += this.batchSize;
            this.cb(this.batch);
            this.batch = [];
            this.batchSize = 0;
            if (this.timeoutHandle) {
                clearTimeout(this.timeoutHandle);
                this.timeoutHandle = undefined;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3RleHRTZWFyY2hNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ25FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBMkUsb0JBQW9CLEVBQTZILGVBQWUsRUFBYSwwQkFBMEIsRUFBZ0IsbUNBQW1DLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDblosT0FBTyxFQUF1QixnQkFBZ0IsRUFBOEosZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFtQnpQLE1BQU0sT0FBTyxpQkFBaUI7SUFPN0IsWUFBb0IsaUJBQW9FLEVBQy9FLFNBQXFCLEVBQ3JCLFdBQXFDO1FBRjFCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUQ7UUFDL0UsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNyQixnQkFBVyxHQUFYLFdBQVcsQ0FBMEI7UUFQdEMsY0FBUyxHQUFzQyxJQUFJLENBQUM7UUFFcEQsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUNuQixnQkFBVyxHQUFHLENBQUMsQ0FBQztJQUkwQixDQUFDO0lBRW5ELElBQVksS0FBSztRQUNoQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7SUFDckMsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUEyQyxFQUFFLEtBQXdCLEVBQUUsZUFBb0Q7UUFDakksTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksRUFBRSxDQUFDO1FBQ3JELE1BQU0sV0FBVyxHQUFHLElBQUksdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkQsT0FBTyxJQUFJLE9BQU8sQ0FBdUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDNUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRTVELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUN2QixNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQXlCLEVBQUUsU0FBaUIsRUFBRSxFQUFFO2dCQUNqRSxJQUFJLE1BQU0sWUFBWSxlQUFlLEVBQUUsQ0FBQztvQkFDdkMscUNBQXFDO29CQUNyQyxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsSUFBSSxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsT0FBTztnQkFDUixDQUFDO2dCQUVELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ3RCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzNDLElBQUksTUFBTSxZQUFZLGdCQUFnQixJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQzlJLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO3dCQUN2QixVQUFVLEdBQUcsSUFBSSxDQUFDO3dCQUNsQixXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBRXJCLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDbEYsQ0FBQztvQkFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM5QyxJQUFJLENBQUMsV0FBVyxJQUFJLGFBQWEsQ0FBQztvQkFDbEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxZQUFZLGdCQUFnQixDQUFDO29CQUU3QyxJQUFJLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLFNBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUN4QyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUM7WUFFRix1QkFBdUI7WUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN4RixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxTQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBRXhCLE9BQU8sQ0FBQztvQkFDUCxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsSUFBSSxNQUFNLEVBQUUsUUFBUTtvQkFDN0MsUUFBUSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUM7b0JBQzdDLEtBQUssRUFBRTt3QkFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVc7cUJBQ3RCO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUMsRUFBRSxDQUFDLEdBQVUsRUFBRSxFQUFFO2dCQUNqQixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxNQUE4QztRQUM1RSxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQUMsT0FBTyxFQUFFLENBQUM7UUFBQyxDQUFDO1FBQ3BDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUFDLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQXlCO1FBQzNDLElBQUksTUFBTSxZQUFZLGdCQUFnQixFQUFFLENBQUM7WUFDeEMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQ0ksQ0FBQztZQUNMLDREQUE0RDtZQUM1RCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsTUFBd0IsRUFBRSxJQUFZO1FBQzlELE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBa0MsRUFBRSxRQUFnRSxFQUFFLEtBQXdCLEVBQUUsZUFBb0Q7UUFDMU0sTUFBTSxjQUFjLEdBQTJDLElBQUkscUJBQXFCLENBQ3ZGLGFBQWEsRUFDYixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNULE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDekQsQ0FBQyxFQUNELEdBQUcsRUFBRSxDQUFDLElBQUksQ0FDVixDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRztZQUNoQixNQUFNLEVBQUUsQ0FBQyxNQUEwQyxFQUFFLEVBQUU7Z0JBQ3RELElBQUksTUFBTSxZQUFZLGVBQWUsRUFBRSxDQUFDO29CQUN2QyxlQUFlLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQzt3QkFDOUIsTUFBTSxLQUFLLENBQUMsNEVBQTRFLENBQUMsQ0FBQztvQkFDM0YsQ0FBQztvQkFDRCxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsNEJBQTRCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxDQUFDO29CQUM3RSxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzlELG1CQUFtQixDQUFDLEdBQUcsRUFBRTs0QkFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNKLFNBQVMsQ0FBQztvQkFFWCxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM1RSxJQUFJLFlBQVksRUFBRSxDQUFDO3dCQUNsQixzRUFBc0U7d0JBQ3RFLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO3dCQUNoSCxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDOzRCQUMxQixTQUFTLENBQUMsSUFBSSxDQUNiLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0NBQzFCLElBQUksVUFBVSxFQUFFLENBQUM7b0NBQ2hCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dDQUN6QyxDQUFDOzRCQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ04sQ0FBQzs2QkFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDOzRCQUNyQixRQUFRLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDekMsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixNQUFNLGFBQWEsR0FBOEI7WUFDaEQsYUFBYTtZQUNiLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVc7WUFDbkMsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLDBCQUEwQjtZQUMvRCxjQUFjLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLElBQUksbUNBQW1DO1lBQ2hGLGtCQUFrQixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksQ0FBQztTQUN0RCxDQUFDO1FBQ0YsSUFBSSxVQUFVLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ0ksYUFBYyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUNqRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUM7UUFDWCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsSUFBSSw2QkFBcUIsRUFBRSxDQUFDO1lBQzVELE1BQU0sR0FBRyxNQUFPLElBQUksQ0FBQyxpQkFBOEMsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0TCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxNQUFPLElBQUksQ0FBQyxpQkFBNEMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RNLENBQUM7UUFDRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLHlCQUF5QixDQUFDLEVBQXFCO1FBQ3RELE1BQU0sUUFBUSxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxRixJQUFJLGNBQWMsR0FBRyxFQUFFLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDakQsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNO1lBQ2hCLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQzFFLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELGNBQWMsR0FBRyxDQUFDO29CQUNqQixNQUFNLEVBQUUsU0FBUztvQkFDakIsUUFBUSxFQUFFLDBCQUEwQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQztpQkFDMUUsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXRELE1BQU0sT0FBTyxHQUFHO1lBQ2YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUMzQixRQUFRO1lBQ1IsUUFBUTtZQUNSLGNBQWMsRUFBRTtnQkFDZixLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsb0JBQW9CO2dCQUMvQixNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsMEJBQTBCO2dCQUN0QyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsMEJBQTBCO2FBQ3RDO1lBQ0QsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQWM7WUFDbEMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxFQUFFO1NBQ3BGLENBQUM7UUFDRixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFdBQXlCO0lBQ3BELE9BQU87UUFDTixlQUFlLEVBQUUsV0FBVyxDQUFDLGVBQWUsSUFBSSxLQUFLO1FBQ3JELFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUSxJQUFJLEtBQUs7UUFDdkMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxXQUFXLElBQUksS0FBSztRQUM3QyxXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVcsSUFBSSxLQUFLO1FBQzdDLE9BQU8sRUFBRSxXQUFXLENBQUMsT0FBTztLQUM1QixDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFPdEMsWUFBb0IsU0FBeUM7UUFBekMsY0FBUyxHQUFULFNBQVMsQ0FBZ0M7UUFKckQsc0JBQWlCLEdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFL0Isc0JBQWlCLEdBQXNCLElBQUksQ0FBQztRQUduRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBYSxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVELEdBQUcsQ0FBQyxJQUF1QixFQUFFLFNBQWlCO1FBQzdDLDRGQUE0RjtRQUM1Rix1SEFBdUg7UUFDdkgseUZBQXlGO1FBQ3pGLElBQUksSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixLQUFLLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hILElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztZQUNuQyxJQUFJLENBQUMsaUJBQWlCLEdBQUc7Z0JBQ3hCLFFBQVEsRUFBRSxJQUFJLENBQUMsR0FBRztnQkFDbEIsT0FBTyxFQUFFLEVBQUU7YUFDWCxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVPLGVBQWU7UUFDdEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRU8sU0FBUyxDQUFDLEtBQW1CO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztDQUNEO0FBRUQsU0FBUywrQkFBK0IsQ0FBQyxJQUF1QjtJQUMvRCwyR0FBMkc7SUFDM0csSUFBSSxJQUFJLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxPQUFPO1lBQ04sV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3JDLE9BQU8sRUFBRTtvQkFDUixlQUFlLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSTtvQkFDMUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVM7b0JBQzNDLGFBQWEsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJO29CQUN0QyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUztpQkFDaEI7Z0JBQ3hCLE1BQU0sRUFBRTtvQkFDUCxlQUFlLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSTtvQkFDekMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVM7b0JBQzFDLGFBQWEsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJO29CQUNyQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUztpQkFDZjthQUN4QixDQUFDLENBQUM7U0FDd0IsQ0FBQztJQUM5QixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDRSxDQUFDO0lBQ2hDLENBQUM7QUFDRixDQUFDO0FBR0Q7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO2FBQ0osWUFBTyxHQUFHLElBQUksQUFBUCxDQUFRO0lBRXZDLG9GQUFvRjthQUM1RCw0QkFBdUIsR0FBRyxFQUFFLEFBQUwsQ0FBTTtJQU9yRCxZQUFvQixZQUFvQixFQUFVLEVBQXdCO1FBQXRELGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQVUsT0FBRSxHQUFGLEVBQUUsQ0FBc0I7UUFMbEUseUJBQW9CLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLFVBQUssR0FBUSxFQUFFLENBQUM7UUFDaEIsY0FBUyxHQUFHLENBQUMsQ0FBQztJQUl0QixDQUFDO0lBRUQsT0FBTyxDQUFDLElBQU8sRUFBRSxJQUFZO1FBQzVCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFVLEVBQUUsSUFBWTtRQUNoQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFTyxjQUFjLENBQUMsSUFBTyxFQUFFLElBQVk7UUFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFTyxlQUFlLENBQUMsSUFBUyxFQUFFLElBQVk7UUFDOUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQztRQUN2QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVPLFFBQVE7UUFDZixJQUFJLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxnQkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQzFFLHVDQUF1QztZQUN2QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNoRCxrQ0FBa0M7WUFDbEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEMsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQzVDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBRW5CLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN4QixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMifQ==