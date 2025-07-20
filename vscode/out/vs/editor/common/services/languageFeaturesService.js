/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageFeatureRegistry } from '../languageFeatureRegistry.js';
import { ILanguageFeaturesService } from './languageFeatures.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
export class LanguageFeaturesService {
    constructor() {
        this.referenceProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.renameProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.newSymbolNamesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeActionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.definitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.typeDefinitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.declarationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.implementationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSymbolProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlayHintsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.colorProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeLensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.onTypeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.signatureHelpProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.hoverProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.multiDocumentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.selectionRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.foldingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineCompletionsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.completionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkedEditingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineValuesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.evaluatableExpressionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentDropEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentPasteEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
    }
    setNotebookTypeResolver(resolver) {
        this._notebookTypeResolver = resolver;
    }
    _score(uri) {
        return this._notebookTypeResolver?.(uri);
    }
}
registerSingleton(ILanguageFeaturesService, LanguageFeaturesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFzQyxNQUFNLCtCQUErQixDQUFDO0FBRTVHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUU1RyxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBSVUsc0JBQWlCLEdBQUcsSUFBSSx1QkFBdUIsQ0FBb0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzRixtQkFBYyxHQUFHLElBQUksdUJBQXVCLENBQWlCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckYsMkJBQXNCLEdBQUcsSUFBSSx1QkFBdUIsQ0FBeUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRyx1QkFBa0IsR0FBRyxJQUFJLHVCQUF1QixDQUFxQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdGLHVCQUFrQixHQUFHLElBQUksdUJBQXVCLENBQXFCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0YsMkJBQXNCLEdBQUcsSUFBSSx1QkFBdUIsQ0FBeUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFD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