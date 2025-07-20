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
import { PauseableEmitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidget } from '../../../notebook/browser/notebookEditorWidget.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource, isSearchTreeMatch, isTextSearchHeading, mergeSearchResultEvents, SEARCH_RESULT_PREFIX } from './searchTreeCommon.js';
import { PlainTextSearchHeadingImpl } from './textSearchHeading.js';
import { AITextSearchHeadingImpl } from '../AISearch/aiSearchModel.js';
let SearchResultImpl = class SearchResultImpl extends Disposable {
    constructor(searchModel, instantiationService, modelService, notebookEditorService) {
        super();
        this.searchModel = searchModel;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.notebookEditorService = notebookEditorService;
        this._onChange = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents
        }));
        this.onChange = this._onChange.event;
        this._plainTextSearchResult = this._register(this.instantiationService.createInstance(PlainTextSearchHeadingImpl, this));
        this._aiTextSearchResult = this._register(this.instantiationService.createInstance(AITextSearchHeadingImpl, this));
        this._register(this._plainTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this._register(this._aiTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this.modelService.getModels().forEach(model => this.onModelAdded(model));
        this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));
        this._register(this.notebookEditorService.onDidAddNotebookEditor(widget => {
            if (widget instanceof NotebookEditorWidget) {
                this.onDidAddNotebookEditorWidget(widget);
            }
        }));
        this._id = SEARCH_RESULT_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    get plainTextSearchResult() {
        return this._plainTextSearchResult;
    }
    get aiTextSearchResult() {
        return this._aiTextSearchResult;
    }
    get children() {
        return this.textSearchResults;
    }
    get hasChildren() {
        return true; // should always have a Text Search Result for plain results.
    }
    get textSearchResults() {
        return [this._plainTextSearchResult, this._aiTextSearchResult];
    }
    async batchReplace(elementsToReplace) {
        try {
            this._onChange.pause();
            await Promise.all(elementsToReplace.map(async (elem) => {
                const parent = elem.parent();
                if ((isSearchTreeFolderMatch(parent) || isSearchTreeFileMatch(parent)) && arrayContainsElementOrParent(parent, elementsToReplace)) {
                    // skip any children who have parents in the array
                    return;
                }
                if (isSearchTreeFileMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeFolderMatch(elem)) {
                    await elem.replaceAll();
                }
            }));
        }
        finally {
            this._onChange.resume();
        }
    }
    batchRemove(elementsToRemove) {
        // need to check that we aren't trying to remove elements twice
        const removedElems = [];
        try {
            this._onChange.pause();
            elementsToRemove.forEach((currentElement) => {
                if (!arrayContainsElementOrParent(currentElement, removedElems)) {
                    if (isTextSearchHeading(currentElement)) {
                        currentElement.hide();
                    }
                    else if (!isSearchTreeFolderMatch(currentElement) || isSearchTreeFolderMatchWithResource(currentElement)) {
                        if (isSearchTreeFileMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeFolderMatchWithResource(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        removedElems.push(currentElement);
                    }
                }
            });
        }
        finally {
            this._onChange.resume();
        }
    }
    get isDirty() {
        return this._aiTextSearchResult.isDirty || this._plainTextSearchResult.isDirty;
    }
    get query() {
        return this._plainTextSearchResult.query;
    }
    set query(query) {
        this._plainTextSearchResult.query = query;
    }
    setAIQueryUsingTextQuery(query) {
        if (!query) {
            query = this.query;
        }
        this.aiTextSearchResult.query = aiTextQueryFromTextQuery(query);
    }
    onDidAddNotebookEditorWidget(widget) {
        this._onWillChangeModelListener?.dispose();
        this._onWillChangeModelListener = widget.onWillChangeModel((model) => {
            if (model) {
                this.onNotebookEditorWidgetRemoved(widget, model?.uri);
            }
        });
        this._onDidChangeModelListener?.dispose();
        // listen to view model change as we are searching on both inputs and outputs
        this._onDidChangeModelListener = widget.onDidAttachViewModel(() => {
            if (widget.hasModel()) {
                this.onNotebookEditorWidgetAdded(widget, widget.textModel.uri);
            }
        });
    }
    folderMatches(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.folderMatches();
        }
        return this._plainTextSearchResult.folderMatches();
    }
    onModelAdded(model) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(model.uri);
        folderMatch?.bindModel(model);
    }
    async onNotebookEditorWidgetAdded(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        await folderMatch?.bindNotebookEditorWidget(editor, resource);
    }
    onNotebookEditorWidgetRemoved(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        folderMatch?.unbindNotebookEditorWidget(editor, resource);
    }
    add(allRaw, searchInstanceID, ai, silent = false) {
        this._plainTextSearchResult.hidden = false;
        if (ai) {
            this._aiTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
        else {
            this._plainTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
    }
    clear() {
        this._plainTextSearchResult.clear();
        this._aiTextSearchResult.clear();
    }
    remove(matches, ai = false) {
        if (ai) {
            this._aiTextSearchResult.remove(matches, ai);
        }
        this._plainTextSearchResult.remove(matches, ai);
    }
    replace(match) {
        return this._plainTextSearchResult.replace(match);
    }
    matches(ai) {
        if (ai === undefined) {
            return this._plainTextSearchResult.matches().concat(this._aiTextSearchResult.matches());
        }
        else if (ai === true) {
            return this._aiTextSearchResult.matches();
        }
        return this._plainTextSearchResult.matches();
    }
    isEmpty() {
        return this._plainTextSearchResult.isEmpty() && this._aiTextSearchResult.isEmpty();
    }
    fileCount(ignoreSemanticSearchResults = false) {
        if (ignoreSemanticSearchResults) {
            return this._plainTextSearchResult.fileCount();
        }
        return this._plainTextSearchResult.fileCount() + this._aiTextSearchResult.fileCount();
    }
    count(ignoreSemanticSearchResults = false) {
        if (ignoreSemanticSearchResults) {
            return this._plainTextSearchResult.count();
        }
        return this._plainTextSearchResult.count() + this._aiTextSearchResult.count();
    }
    setCachedSearchComplete(cachedSearchComplete, ai) {
        if (ai) {
            this._aiTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
        else {
            this._plainTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
    }
    getCachedSearchComplete(ai) {
        if (ai) {
            return this._aiTextSearchResult.cachedSearchComplete;
        }
        return this._plainTextSearchResult.cachedSearchComplete;
    }
    toggleHighlights(value, ai = false) {
        if (ai) {
            this._aiTextSearchResult.toggleHighlights(value);
        }
        else {
            this._plainTextSearchResult.toggleHighlights(value);
        }
    }
    getRangeHighlightDecorations(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.rangeHighlightDecorations;
        }
        return this._plainTextSearchResult.rangeHighlightDecorations;
    }
    replaceAll(progress) {
        return this._plainTextSearchResult.replaceAll(progress);
    }
    async dispose() {
        this._aiTextSearchResult?.dispose();
        this._plainTextSearchResult?.dispose();
        this._onWillChangeModelListener?.dispose();
        this._onDidChangeModelListener?.dispose();
        super.dispose();
    }
};
SearchResultImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, INotebookEditorService)
], SearchResultImpl);
export { SearchResultImpl };
function aiTextQueryFromTextQuery(query) {
    return query === null ? null : { ...query, contentPattern: query.contentPattern.pattern, type: 3 /* QueryType.aiText */ };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hUcmVlTW9kZWwvc2VhcmNoUmVzdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFckcsT0FBTyxFQUFFLDRCQUE0QixFQUFvSCxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxtQ0FBbUMsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBc0IsdUJBQXVCLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHeFksT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFaEUsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBWS9DLFlBQ2lCLFdBQXlCLEVBQ2xCLG9CQUE0RCxFQUNwRSxZQUE0QyxFQUNuQyxxQkFBOEQ7UUFFdEYsS0FBSyxFQUFFLENBQUM7UUFMUSxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNELHlCQUFvQixHQUFwQixv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