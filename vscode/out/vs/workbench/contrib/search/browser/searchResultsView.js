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
var TextSearchResultRenderer_1, FolderMatchRenderer_1, FileMatchRenderer_1, MatchRenderer_1;
import * as DOM from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as paths from '../../../../base/common/path.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isEqual } from '../../../../base/common/resources.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { SearchContext } from '../common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isTextSearchHeading, isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, isPlainTextSearchHeading } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
export class SearchDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return SearchDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (isSearchTreeFolderMatch(element)) {
            return FolderMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeFileMatch(element)) {
            return FileMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeMatch(element)) {
            return MatchRenderer.TEMPLATE_ID;
        }
        else if (isTextSearchHeading(element)) {
            return TextSearchResultRenderer.TEMPLATE_ID;
        }
        console.error('Invalid search tree element', element);
        throw new Error('Invalid search tree element');
    }
}
let TextSearchResultRenderer = class TextSearchResultRenderer extends Disposable {
    static { TextSearchResultRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'textResultMatch'; }
    constructor(labels, contextService, instantiationService, contextKeyService) {
        super();
        this.labels = labels;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = TextSearchResultRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const textSearchResultElement = DOM.append(container, DOM.$('.textsearchresult'));
        const label = this.labels.create(textSearchResultElement, { supportDescriptionHighlights: true, supportHighlights: true, supportIcons: true });
        disposables.add(label);
        const actionBarContainer = DOM.append(textSearchResultElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            highlightToggledItems: true,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return { label, disposables, actions, contextKeyService: contextKeyServiceMain };
    }
    async renderElement(node, index, templateData) {
        if (isPlainTextSearchHeading(node.element)) {
            templateData.label.setLabel(nls.localize('searchFolderMatch.plainText.label', "Text Results"));
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(false);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
        else {
            try {
                await node.element.parent().searchModel.getAITextResultProviderName();
            }
            catch {
                // ignore
            }
            const localizedLabel = nls.localize({
                key: 'searchFolderMatch.aiText.label',
                comment: ['This is displayed before the AI text search results, now always "AI-assisted results".']
            }, 'AI-assisted results');
            // todo: make icon extension-contributed.
            templateData.label.setLabel(`$(${Codicon.searchSparkle.id}) ${localizedLabel}`);
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(true);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderCompressedElements(node, index, templateData) {
    }
};
TextSearchResultRenderer = TextSearchResultRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], TextSearchResultRenderer);
export { TextSearchResultRenderer };
let FolderMatchRenderer = class FolderMatchRenderer extends Disposable {
    static { FolderMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'folderMatch'; }
    constructor(searchView, labels, contextService, labelService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FolderMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map(e => e.name());
        if (folder.resource) {
            const fileKind = (isSearchTreeFolderMatchWorkspaceRoot(folder)) ? FileKind.ROOT_FOLDER : FileKind.FOLDER;
            templateData.label.setResource({ resource: folder.resource, name: label }, {
                fileKind,
                separator: this.labelService.getSeparator(folder.resource.scheme),
            });
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        this.renderFolderDetails(folder, templateData);
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const folderMatchElement = DOM.append(container, DOM.$('.foldermatch'));
        const label = this.labels.create(folderMatchElement, { supportDescriptionHighlights: true, supportHighlights: true });
        disposables.add(label);
        const badge = new CountBadge(DOM.append(folderMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(folderMatchElement, DOM.$('.actionBarContainer'));
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(true);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const folderMatch = node.element;
        if (folderMatch.resource) {
            const workspaceFolder = this.contextService.getWorkspaceFolder(folderMatch.resource);
            if (workspaceFolder && isEqual(workspaceFolder.uri, folderMatch.resource)) {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.ROOT_FOLDER, hidePath: true });
            }
            else {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.FOLDER, hidePath: this.searchView.isTreeLayoutViewVisible });
            }
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(folderMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        }));
        this.renderFolderDetails(folderMatch, templateData);
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderFolderDetails(folder, templateData) {
        const count = folder.recursiveMatchCount();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchFileMatches', "{0} files found", count) : nls.localize('searchFileMatch', "{0} file found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: folder };
    }
};
FolderMatchRenderer = FolderMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, ILabelService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FolderMatchRenderer);
export { FolderMatchRenderer };
let FileMatchRenderer = class FileMatchRenderer extends Disposable {
    static { FileMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'fileMatch'; }
    constructor(searchView, labels, contextService, configurationService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FileMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const fileMatchElement = DOM.append(container, DOM.$('.filematch'));
        const label = this.labels.create(fileMatchElement);
        disposables.add(label);
        const badge = new CountBadge(DOM.append(fileMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(fileMatchElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            el: fileMatchElement,
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const fileMatch = node.element;
        templateData.el.setAttribute('data-resource', fileMatch.resource.toString());
        const decorationConfig = this.configurationService.getValue('search').decorations;
        templateData.label.setFile(fileMatch.resource, { range: isSearchTreeAIFileMatch(fileMatch) ? fileMatch.getFullRange() : undefined, hidePath: this.searchView.isTreeLayoutViewVisible && !(isSearchTreeFolderMatchNoRoot(fileMatch.parent())), hideIcon: false, fileDecorations: { colors: decorationConfig.colors, badges: decorationConfig.badges } });
        const count = fileMatch.count();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchMatches', "{0} matches found", count) : nls.localize('searchMatch', "{0} match found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: fileMatch };
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(fileMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        }));
        // when hidesExplorerArrows: true, then the file nodes should still have a twistie because it would otherwise
        // be hard to tell whether the node is collapsed or expanded.
        const twistieContainer = templateData.el.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.add('force-twistie');
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
FileMatchRenderer = FileMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FileMatchRenderer);
export { FileMatchRenderer };
let MatchRenderer = class MatchRenderer extends Disposable {
    static { MatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'match'; }
    constructor(searchView, contextService, configurationService, instantiationService, contextKeyService, hoverService) {
        super();
        this.searchView = searchView;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.templateId = MatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        container.classList.add('linematch');
        const lineNumber = DOM.append(container, DOM.$('span.matchLineNum'));
        const parent = DOM.append(container, DOM.$('a.plain.match'));
        const before = DOM.append(parent, DOM.$('span'));
        const match = DOM.append(parent, DOM.$('span.findInFileMatch'));
        const replace = DOM.append(parent, DOM.$('span.replaceMatch'));
        const after = DOM.append(parent, DOM.$('span'));
        const actionBarContainer = DOM.append(container, DOM.$('span.actionBarContainer'));
        const disposables = new DisposableStore();
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            parent,
            before,
            match,
            replace,
            after,
            lineNumber,
            actions,
            disposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const match = node.element;
        const preview = match.preview();
        const replace = this.searchView.model.isReplaceActive() &&
            !!this.searchView.model.replaceString &&
            !match.isReadonly;
        templateData.before.textContent = preview.before;
        templateData.match.textContent = preview.inside;
        templateData.match.classList.toggle('replace', replace);
        templateData.replace.textContent = replace ? match.replaceString : '';
        templateData.after.textContent = preview.after;
        const title = (preview.fullBefore + (replace ? match.replaceString : preview.inside) + preview.after).trim().substr(0, 999);
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.parent, title));
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!match.isReadonly);
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const extraLinesStr = numLines > 0 ? `+${numLines}` : '';
        const showLineNumbers = this.configurationService.getValue('search').showLineNumbers;
        const lineNumberStr = showLineNumbers ? `${match.range().startLineNumber}:` : '';
        templateData.lineNumber.classList.toggle('show', (numLines > 0) || showLineNumbers);
        templateData.lineNumber.textContent = lineNumberStr + extraLinesStr;
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.lineNumber, this.getMatchTitle(match, showLineNumbers)));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: match };
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    getMatchTitle(match, showLineNumbers) {
        const startLine = match.range().startLineNumber;
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const lineNumStr = showLineNumbers ?
            nls.localize('lineNumStr', "From line {0}", startLine, numLines) + ' ' :
            '';
        const numLinesStr = numLines > 0 ?
            '+ ' + nls.localize('numLinesStr', "{0} more lines", numLines) :
            '';
        return lineNumStr + numLinesStr;
    }
};
MatchRenderer = MatchRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IHoverService)
], MatchRenderer);
export { MatchRenderer };
let SearchAccessibilityProvider = class SearchAccessibilityProvider {
    constructor(searchView, labelService) {
        this.searchView = searchView;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return nls.localize('search', "Search");
    }
    getAriaLabel(element) {
        if (isSearchTreeFolderMatch(element)) {
            const count = element.allDownstreamFileMatches().reduce((total, current) => total + current.count(), 0);
            return element.resource ?
                nls.localize('folderMatchAriaLabel', "{0} matches in folder root {1}, Search result", count, element.name()) :
                nls.localize('otherFilesAriaLabel', "{0} matches outside of the workspace, Search result", count);
        }
        if (isSearchTreeFileMatch(element)) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) || element.resource.fsPath;
            return nls.localize('fileMatchAriaLabel', "{0} matches in file {1} of folder {2}, Search result", element.count(), element.name(), paths.dirname(path));
        }
        if (isSearchTreeMatch(element)) {
            const match = element;
            const searchModel = this.searchView.model;
            const replace = searchModel.isReplaceActive() && !!searchModel.replaceString;
            const matchString = match.getMatchString();
            const range = match.range();
            const matchText = match.text().substr(0, range.endColumn + 150);
            if (replace) {
                return nls.localize('replacePreviewResultAria', "'{0}' at column {1} replace {2} with {3}", matchText, range.startColumn, matchString, match.replaceString);
            }
            return nls.localize('searchResultAria', "'{0}' at column {1} found {2}", matchText, range.startColumn, matchString);
        }
        return null;
    }
};
SearchAccessibilityProvider = __decorate([
    __param(1, ILabelService)
], SearchAccessibilityProvider);
export { SearchAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFJlc3VsdHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUlsRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sS0FBSyxLQUFLLE1BQU0saUNBQWlDLENBQUM7QUFDekQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUcvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFzQixvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ25HLE9B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