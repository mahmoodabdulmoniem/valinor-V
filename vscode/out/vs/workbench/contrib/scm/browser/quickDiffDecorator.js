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
var QuickDiffDecorator_1;
import * as nls from '../../../../nls.js';
import './media/dirtydiffDecorator.css';
import { Disposable, DisposableStore, DisposableMap } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChangeType, getChangeType, IQuickDiffService, minimapGutterAddedBackground, minimapGutterDeletedBackground, minimapGutterModifiedBackground, overviewRulerAddedForeground, overviewRulerDeletedForeground, overviewRulerModifiedForeground } from '../common/quickDiff.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ContextKeyTrueExpr, ContextKeyFalseExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { autorun, autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
export const quickDiffDecorationCount = new RawContextKey('quickDiffDecorationCount', 0);
let QuickDiffDecorator = QuickDiffDecorator_1 = class QuickDiffDecorator extends Disposable {
    static createDecoration(className, tooltip, options) {
        const decorationOptions = {
            description: 'dirty-diff-decoration',
            isWholeLine: options.isWholeLine,
        };
        if (options.gutter) {
            decorationOptions.linesDecorationsClassName = `dirty-diff-glyph ${className}`;
            decorationOptions.linesDecorationsTooltip = tooltip;
        }
        if (options.overview.active) {
            decorationOptions.overviewRuler = {
                color: themeColorFromId(options.overview.color),
                position: OverviewRulerLane.Left
            };
        }
        if (options.minimap.active) {
            decorationOptions.minimap = {
                color: themeColorFromId(options.minimap.color),
                position: 2 /* MinimapPosition.Gutter */
            };
        }
        return ModelDecorationOptions.createDynamic(decorationOptions);
    }
    constructor(codeEditor, quickDiffModelRef, configurationService, quickDiffService) {
        super();
        this.codeEditor = codeEditor;
        this.quickDiffModelRef = quickDiffModelRef;
        this.configurationService = configurationService;
        this.quickDiffService = quickDiffService;
        const decorations = configurationService.getValue('scm.diffDecorations');
        const gutter = decorations === 'all' || decorations === 'gutter';
        const overview = decorations === 'all' || decorations === 'overview';
        const minimap = decorations === 'all' || decorations === 'minimap';
        const diffAdded = nls.localize('diffAdded', 'Added lines');
        const diffAddedOptions = {
            gutter,
            overview: { active: overview, color: overviewRulerAddedForeground },
            minimap: { active: minimap, color: minimapGutterAddedBackground },
            isWholeLine: true
        };
        this.addedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added primary', diffAdded, diffAddedOptions);
        this.addedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added primary pattern', diffAdded, diffAddedOptions);
        this.addedSecondaryOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added secondary', diffAdded, diffAddedOptions);
        this.addedSecondaryPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added secondary pattern', diffAdded, diffAddedOptions);
        const diffModified = nls.localize('diffModified', 'Changed lines');
        const diffModifiedOptions = {
            gutter,
            overview: { active: overview, color: overviewRulerModifiedForeground },
            minimap: { active: minimap, color: minimapGutterModifiedBackground },
            isWholeLine: true
        };
        this.modifiedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified primary', diffModified, diffModifiedOptions);
        this.modifiedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified primary pattern', diffModified, diffModifiedOptions);
        this.modifiedSecondaryOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified secondary', diffModified, diffModifiedOptions);
        this.modifiedSecondaryPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified secondary pattern', diffModified, diffModifiedOptions);
        const diffDeleted = nls.localize('diffDeleted', 'Removed lines');
        const diffDeletedOptions = {
            gutter,
            overview: { active: overview, color: overviewRulerDeletedForeground },
            minimap: { active: minimap, color: minimapGutterDeletedBackground },
            isWholeLine: false
        };
        this.deletedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-deleted primary', diffDeleted, diffDeletedOptions);
        this.deletedSecondaryOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-deleted secondary', diffDeleted, diffDeletedOptions);
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('scm.diffDecorationsGutterPattern')) {
                this.onDidChange();
            }
        }));
        this._register(Event.runAndSubscribe(this.quickDiffModelRef.object.onDidChange, () => this.onDidChange()));
    }
    onDidChange() {
        if (!this.codeEditor.hasModel()) {
            return;
        }
        const pattern = this.configurationService.getValue('scm.diffDecorationsGutterPattern');
        const primaryQuickDiff = this.quickDiffModelRef.object.quickDiffs.find(quickDiff => quickDiff.kind === 'primary');
        const primaryQuickDiffChanges = this.quickDiffModelRef.object.changes.filter(change => change.providerId === primaryQuickDiff?.id);
        const decorations = [];
        for (const change of this.quickDiffModelRef.object.changes) {
            const quickDiff = this.quickDiffModelRef.object.quickDiffs
                .find(quickDiff => quickDiff.id === change.providerId);
            // Skip quick diffs that are not visible
            if (!quickDiff || !this.quickDiffService.isQuickDiffProviderVisible(quickDiff.id)) {
                continue;
            }
            if (quickDiff.kind !== 'primary' && primaryQuickDiffChanges.some(c => c.change2.modified.intersectsOrTouches(change.change2.modified))) {
                // Overlap with primary quick diff changes
                continue;
            }
            const changeType = getChangeType(change.change);
            const startLineNumber = change.change.modifiedStartLineNumber;
            const endLineNumber = change.change.modifiedEndLineNumber || startLineNumber;
            switch (changeType) {
                case ChangeType.Add:
                    decorations.push({
                        range: {
                            startLineNumber: startLineNumber, startColumn: 1,
                            endLineNumber: endLineNumber, endColumn: 1
                        },
                        options: quickDiff.kind === 'primary' || quickDiff.kind === 'contributed'
                            ? pattern.added ? this.addedPatternOptions : this.addedOptions
                            : pattern.added ? this.addedSecondaryPatternOptions : this.addedSecondaryOptions
                    });
                    break;
                case ChangeType.Delete:
                    decorations.push({
                        range: {
                            startLineNumber: startLineNumber, startColumn: Number.MAX_VALUE,
                            endLineNumber: startLineNumber, endColumn: Number.MAX_VALUE
                        },
                        options: quickDiff.kind === 'primary' || quickDiff.kind === 'contributed'
                            ? this.deletedOptions
                            : this.deletedSecondaryOptions
                    });
                    break;
                case ChangeType.Modify:
                    decorations.push({
                        range: {
                            startLineNumber: startLineNumber, startColumn: 1,
                            endLineNumber: endLineNumber, endColumn: 1
                        },
                        options: quickDiff.kind === 'primary' || quickDiff.kind === 'contributed'
                            ? pattern.modified ? this.modifiedPatternOptions : this.modifiedOptions
                            : pattern.modified ? this.modifiedSecondaryPatternOptions : this.modifiedSecondaryOptions
                    });
                    break;
            }
        }
        if (!this.decorationsCollection) {
            this.decorationsCollection = this.codeEditor.createDecorationsCollection(decorations);
        }
        else {
            this.decorationsCollection.set(decorations);
        }
    }
    dispose() {
        if (this.decorationsCollection) {
            this.decorationsCollection.clear();
        }
        this.decorationsCollection = undefined;
        this.quickDiffModelRef.dispose();
        super.dispose();
    }
};
QuickDiffDecorator = QuickDiffDecorator_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IQuickDiffService)
], QuickDiffDecorator);
let QuickDiffWorkbenchController = class QuickDiffWorkbenchController extends Disposable {
    constructor(editorService, configurationService, quickDiffModelService, quickDiffService, uriIdentityService, contextKeyService) {
        super();
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.quickDiffModelService = quickDiffModelService;
        this.quickDiffService = quickDiffService;
        this.uriIdentityService = uriIdentityService;
        this.enabled = false;
        // Resource URI -> Code Editor Id -> Decoration (Disposable)
        this.decorators = new ResourceMap();
        this.viewState = { width: 3, visibility: 'always' };
        this.transientDisposables = this._register(new DisposableStore());
        this.stylesheet = domStylesheetsJs.createStyleSheet(undefined, undefined, this._store);
        this.quickDiffDecorationCount = quickDiffDecorationCount.bindTo(contextKeyService);
        this.activeEditor = observableFromEvent(this, this.editorService.onDidActiveEditorChange, () => this.editorService.activeEditor);
        this.quickDiffProviders = observableFromEvent(this, this.quickDiffService.onDidChangeQuickDiffProviders, () => this.quickDiffService.providers);
        const onDidChangeConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorations'));
        this._register(onDidChangeConfiguration(this.onDidChangeConfiguration, this));
        this.onDidChangeConfiguration();
        const onDidChangeDiffWidthConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsGutterWidth'));
        this._register(onDidChangeDiffWidthConfiguration(this.onDidChangeDiffWidthConfiguration, this));
        this.onDidChangeDiffWidthConfiguration();
        const onDidChangeDiffVisibilityConfiguration = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsGutterVisibility'));
        this._register(onDidChangeDiffVisibilityConfiguration(this.onDidChangeDiffVisibilityConfiguration, this));
        this.onDidChangeDiffVisibilityConfiguration();
    }
    onDidChangeConfiguration() {
        const enabled = this.configurationService.getValue('scm.diffDecorations') !== 'none';
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    onDidChangeDiffWidthConfiguration() {
        let width = this.configurationService.getValue('scm.diffDecorationsGutterWidth');
        if (isNaN(width) || width <= 0 || width > 5) {
            width = 3;
        }
        this.setViewState({ ...this.viewState, width });
    }
    onDidChangeDiffVisibilityConfiguration() {
        const visibility = this.configurationService.getValue('scm.diffDecorationsGutterVisibility');
        this.setViewState({ ...this.viewState, visibility });
    }
    setViewState(state) {
        this.viewState = state;
        this.stylesheet.textContent = `
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-modified {
				border-left-width:${state.width}px;
			}
			.monaco-editor .dirty-diff-added.pattern,
			.monaco-editor .dirty-diff-added.pattern:before,
			.monaco-editor .dirty-diff-modified.pattern,
			.monaco-editor .dirty-diff-modified.pattern:before {
				background-size: ${state.width}px ${state.width}px;
			}
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-modified,
			.monaco-editor .dirty-diff-deleted {
				opacity: ${state.visibility === 'always' ? 1 : 0};
			}
		`;
    }
    enable() {
        if (this.enabled) {
            this.disable();
        }
        this.transientDisposables.add(Event.any(this.editorService.onDidCloseEditor, this.editorService.onDidVisibleEditorsChange)(() => this.onEditorsChanged()));
        this.onEditorsChanged();
        this.onDidActiveEditorChange();
        this.onDidChangeQuickDiffProviders();
        this.enabled = true;
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        this.transientDisposables.clear();
        this.quickDiffDecorationCount.set(0);
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            decoratorMap.dispose();
            this.decorators.delete(uri);
        }
        this.enabled = false;
    }
    onDidActiveEditorChange() {
        this.transientDisposables.add(autorunWithStore((reader, store) => {
            const activeEditor = this.activeEditor.read(reader);
            const activeTextEditorControl = this.editorService.activeTextEditorControl;
            if (!isCodeEditor(activeTextEditorControl) || !activeEditor?.resource) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(activeEditor.resource);
            if (!quickDiffModelRef) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            store.add(quickDiffModelRef);
            const visibleDecorationCount = observableFromEvent(this, quickDiffModelRef.object.onDidChange, () => {
                const visibleQuickDiffs = quickDiffModelRef.object.quickDiffs.filter(quickDiff => this.quickDiffService.isQuickDiffProviderVisible(quickDiff.id));
                return quickDiffModelRef.object.changes.filter(change => visibleQuickDiffs.some(quickDiff => quickDiff.id === change.providerId)).length;
            });
            store.add(autorun(reader => {
                const count = visibleDecorationCount.read(reader);
                this.quickDiffDecorationCount.set(count);
            }));
        }));
    }
    onDidChangeQuickDiffProviders() {
        this.transientDisposables.add(autorunWithStore((reader, store) => {
            const providers = this.quickDiffProviders.read(reader);
            const labels = [];
            for (let index = 0; index < providers.length; index++) {
                const provider = providers[index];
                if (labels.includes(provider.label)) {
                    continue;
                }
                const visible = this.quickDiffService.isQuickDiffProviderVisible(provider.id);
                const group = provider.kind !== 'contributed' ? '0_scm' : '1_contributed';
                const order = index + 1;
                store.add(registerAction2(class extends Action2 {
                    constructor() {
                        super({
                            id: `workbench.scm.action.toggleQuickDiffVisibility.${provider.id}`,
                            title: provider.label,
                            toggled: visible ? ContextKeyTrueExpr.INSTANCE : ContextKeyFalseExpr.INSTANCE,
                            menu: {
                                id: MenuId.SCMQuickDiffDecorations, group, order
                            },
                            f1: false
                        });
                    }
                    run(accessor) {
                        const quickDiffService = accessor.get(IQuickDiffService);
                        quickDiffService.toggleQuickDiffProviderVisibility(provider.id);
                    }
                }));
                labels.push(provider.label);
            }
        }));
    }
    onEditorsChanged() {
        for (const editor of this.editorService.visibleTextEditorControls) {
            if (!isCodeEditor(editor)) {
                continue;
            }
            const textModel = editor.getModel();
            if (!textModel) {
                continue;
            }
            const editorId = editor.getId();
            if (this.decorators.get(textModel.uri)?.has(editorId)) {
                continue;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(textModel.uri);
            if (!quickDiffModelRef) {
                continue;
            }
            if (!this.decorators.has(textModel.uri)) {
                this.decorators.set(textModel.uri, new DisposableMap());
            }
            this.decorators.get(textModel.uri).set(editorId, new QuickDiffDecorator(editor, quickDiffModelRef, this.configurationService, this.quickDiffService));
        }
        // Dispose decorators for editors that are no longer visible.
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            for (const editorId of decoratorMap.keys()) {
                const codeEditor = this.editorService.visibleTextEditorControls
                    .find(editor => isCodeEditor(editor) && editor.getId() === editorId &&
                    this.uriIdentityService.extUri.isEqual(editor.getModel()?.uri, uri));
                if (!codeEditor) {
                    decoratorMap.deleteAndDispose(editorId);
                }
            }
            if (decoratorMap.size === 0) {
                decoratorMap.dispose();
                this.decorators.delete(uri);
            }
        }
    }
    dispose() {
        this.disable();
        super.dispose();
    }
};
QuickDiffWorkbenchController = __decorate([
    __param(0, IEditorService),
    __param(1, IConfigurationService),
    __param(2, IQuickDiffModelService),
    __param(3, IQuickDiffService),
    __param(4, IUriIdentityService),
    __param(5, IContextKeyService)
], QuickDiffWorkbenchController);
export { QuickDiffWorkbenchController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9xdWlja0RpZmZEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckYsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBbUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4SSxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFxQiw0QkFBNEIsRUFBRSw4QkFBOEIsRUFBRSwrQkFBK0IsRUFBRSw0QkFBNEIsRUFBRSw4QkFBOEIsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZTLE9BQU8sRUFBa0Isc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUU3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