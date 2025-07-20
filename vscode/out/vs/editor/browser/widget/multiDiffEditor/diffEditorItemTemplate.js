var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derived, globalTransaction, observableValue } from '../../../../base/common/observable.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { observableCodeEditor } from '../../observableCodeEditor.js';
import { DiffEditorWidget } from '../diffEditor/diffEditorWidget.js';
import { ActionRunnerWithContext } from './utils.js';
export class TemplateData {
    constructor(viewModel, deltaScrollVertical) {
        this.viewModel = viewModel;
        this.deltaScrollVertical = deltaScrollVertical;
    }
    getId() {
        return this.viewModel;
    }
}
let DiffEditorItemTemplate = class DiffEditorItemTemplate extends Disposable {
    constructor(_container, _overflowWidgetsDomNode, _workbenchUIElementFactory, _instantiationService, _parentContextKeyService) {
        super();
        this._container = _container;
        this._overflowWidgetsDomNode = _overflowWidgetsDomNode;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._instantiationService = _instantiationService;
        this._viewModel = observableValue(this, undefined);
        this._collapsed = derived(this, reader => this._viewModel.read(reader)?.collapsed.read(reader));
        this._editorContentHeight = observableValue(this, 500);
        this.contentHeight = derived(this, reader => {
            const h = this._collapsed.read(reader) ? 0 : this._editorContentHeight.read(reader);
            return h + this._outerEditorHeight;
        });
        this._modifiedContentWidth = observableValue(this, 0);
        this._modifiedWidth = observableValue(this, 0);
        this._originalContentWidth = observableValue(this, 0);
        this._originalWidth = observableValue(this, 0);
        this.maxScroll = derived(this, reader => {
            const scroll1 = this._modifiedContentWidth.read(reader) - this._modifiedWidth.read(reader);
            const scroll2 = this._originalContentWidth.read(reader) - this._originalWidth.read(reader);
            if (scroll1 > scroll2) {
                return { maxScroll: scroll1, width: this._modifiedWidth.read(reader) };
            }
            else {
                return { maxScroll: scroll2, width: this._originalWidth.read(reader) };
            }
        });
        this._elements = h('div.multiDiffEntry', [
            h('div.header@header', [
                h('div.header-content', [
                    h('div.collapse-button@collapseButton'),
                    h('div.file-path', [
                        h('div.title.modified.show-file-icons@primaryPath', []),
                        h('div.status.deleted@status', ['R']),
                        h('div.title.original.show-file-icons@secondaryPath', []),
                    ]),
                    h('div.actions@actions'),
                ]),
            ]),
            h('div.editorParent', [
                h('div.editorContainer@editor'),
            ])
        ]);
        this.editor = this._register(this._instantiationService.createInstance(DiffEditorWidget, this._elements.editor, {
            overflowWidgetsDomNode: this._overflowWidgetsDomNode,
        }, {}));
        this.isModifedFocused = observableCodeEditor(this.editor.getModifiedEditor()).isFocused;
        this.isOriginalFocused = observableCodeEditor(this.editor.getOriginalEditor()).isFocused;
        this.isFocused = derived(this, reader => this.isModifedFocused.read(reader) || this.isOriginalFocused.read(reader));
        this._resourceLabel = this._workbenchUIElementFactory.createResourceLabel
            ? this._register(this._workbenchUIElementFactory.createResourceLabel(this._elements.primaryPath))
            : undefined;
        this._resourceLabel2 = this._workbenchUIElementFactory.createResourceLabel
            ? this._register(this._workbenchUIElementFactory.createResourceLabel(this._elements.secondaryPath))
            : undefined;
        this._dataStore = this._register(new DisposableStore());
        this._headerHeight = 40;
        this._lastScrollTop = -1;
        this._isSettingScrollTop = false;
        const btn = new Button(this._elements.collapseButton, {});
        this._register(autorun(reader => {
            btn.element.className = '';
            btn.icon = this._collapsed.read(reader) ? Codicon.chevronRight : Codicon.chevronDown;
        }));
        this._register(btn.onDidClick(() => {
            this._viewModel.get()?.collapsed.set(!this._collapsed.get(), undefined);
        }));
        this._register(autorun(reader => {
            this._elements.editor.style.display = this._collapsed.read(reader) ? 'none' : 'block';
        }));
        this._register(this.editor.getModifiedEditor().onDidLayoutChange(e => {
            const width = this.editor.getModifiedEditor().getLayoutInfo().contentWidth;
            this._modifiedWidth.set(width, undefined);
        }));
        this._register(this.editor.getOriginalEditor().onDidLayoutChange(e => {
            const width = this.editor.getOriginalEditor().getLayoutInfo().contentWidth;
            this._originalWidth.set(width, undefined);
        }));
        this._register(this.editor.onDidContentSizeChange(e => {
            globalTransaction(tx => {
                this._editorContentHeight.set(e.contentHeight, tx);
                this._modifiedContentWidth.set(this.editor.getModifiedEditor().getContentWidth(), tx);
                this._originalContentWidth.set(this.editor.getOriginalEditor().getContentWidth(), tx);
            });
        }));
        this._register(this.editor.getOriginalEditor().onDidScrollChange(e => {
            if (this._isSettingScrollTop) {
                return;
            }
            if (!e.scrollTopChanged || !this._data) {
                return;
            }
            const delta = e.scrollTop - this._lastScrollTop;
            this._data.deltaScrollVertical(delta);
        }));
        this._register(autorun(reader => {
            const isActive = this._viewModel.read(reader)?.isActive.read(reader);
            this._elements.root.classList.toggle('active', isActive);
        }));
        this._container.appendChild(this._elements.root);
        this._outerEditorHeight = this._headerHeight;
        this._contextKeyService = this._register(_parentContextKeyService.createScoped(this._elements.actions));
        const instantiationService = this._register(this._instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._register(instantiationService.createInstance(MenuWorkbenchToolBar, this._elements.actions, MenuId.MultiDiffEditorFileToolbar, {
            actionRunner: this._register(new ActionRunnerWithContext(() => (this._viewModel.get()?.modifiedUri))),
            menuOptions: {
                shouldForwardArgs: true,
            },
            toolbarOptions: { primaryGroup: g => g.startsWith('navigation') },
            actionViewItemProvider: (action, options) => createActionViewItem(instantiationService, action, options),
        }));
    }
    setScrollLeft(left) {
        if (this._modifiedContentWidth.get() - this._modifiedWidth.get() > this._originalContentWidth.get() - this._originalWidth.get()) {
            this.editor.getModifiedEditor().setScrollLeft(left);
        }
        else {
            this.editor.getOriginalEditor().setScrollLeft(left);
        }
    }
    setData(data) {
        this._data = data;
        function updateOptions(options) {
            return {
                ...options,
                scrollBeyondLastLine: false,
                hideUnchangedRegions: {
                    enabled: true,
                },
                scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                    handleMouseWheel: false,
                    useShadows: false,
                },
                renderOverviewRuler: false,
                fixedOverflowWidgets: true,
                overviewRulerBorder: false,
            };
        }
        if (!data) {
            globalTransaction(tx => {
                this._viewModel.set(undefined, tx);
                this.editor.setDiffModel(null, tx);
                this._dataStore.clear();
            });
            return;
        }
        const value = data.viewModel.documentDiffItem;
        globalTransaction(tx => {
            this._resourceLabel?.setUri(data.viewModel.modifiedUri ?? data.viewModel.originalUri, { strikethrough: data.viewModel.modifiedUri === undefined });
            let isRenamed = false;
            let isDeleted = false;
            let isAdded = false;
            let flag = '';
            if (data.viewModel.modifiedUri && data.viewModel.originalUri && data.viewModel.modifiedUri.path !== data.viewModel.originalUri.path) {
                flag = 'R';
                isRenamed = true;
            }
            else if (!data.viewModel.modifiedUri) {
                flag = 'D';
                isDeleted = true;
            }
            else if (!data.viewModel.originalUri) {
                flag = 'A';
                isAdded = true;
            }
            this._elements.status.classList.toggle('renamed', isRenamed);
            this._elements.status.classList.toggle('deleted', isDeleted);
            this._elements.status.classList.toggle('added', isAdded);
            this._elements.status.innerText = flag;
            this._resourceLabel2?.setUri(isRenamed ? data.viewModel.originalUri : undefined, { strikethrough: true });
            this._dataStore.clear();
            this._viewModel.set(data.viewModel, tx);
            this.editor.setDiffModel(data.viewModel.diffEditorViewModelRef, tx);
            this.editor.updateOptions(updateOptions(value.options ?? {}));
        });
        if (value.onOptionsDidChange) {
            this._dataStore.add(value.onOptionsDidChange(() => {
                this.editor.updateOptions(updateOptions(value.options ?? {}));
            }));
        }
        data.viewModel.isAlive.recomputeInitiallyAndOnChange(this._dataStore, value => {
            if (!value) {
                this.setData(undefined);
            }
        });
        if (data.viewModel.documentDiffItem.contextKeys) {
            for (const [key, value] of Object.entries(data.viewModel.documentDiffItem.contextKeys)) {
                this._contextKeyService.createKey(key, value);
            }
        }
    }
    render(verticalRange, width, editorScroll, viewPort) {
        this._elements.root.style.visibility = 'visible';
        this._elements.root.style.top = `${verticalRange.start}px`;
        this._elements.root.style.height = `${verticalRange.length}px`;
        this._elements.root.style.width = `${width}px`;
        this._elements.root.style.position = 'absolute';
        // For sticky scroll
        const maxDelta = verticalRange.length - this._headerHeight;
        const delta = Math.max(0, Math.min(viewPort.start - verticalRange.start, maxDelta));
        this._elements.header.style.transform = `translateY(${delta}px)`;
        globalTransaction(tx => {
            this.editor.layout({
                width: width - 2 * 8 - 2 * 1,
                height: verticalRange.length - this._outerEditorHeight,
            });
        });
        try {
            this._isSettingScrollTop = true;
            this._lastScrollTop = editorScroll;
            this.editor.getOriginalEditor().setScrollTop(editorScroll);
        }
        finally {
            this._isSettingScrollTop = false;
        }
        this._elements.header.classList.toggle('shadow', delta > 0 || editorScroll > 0);
        this._elements.header.classList.toggle('collapsed', delta === maxDelta);
    }
    hide() {
        this._elements.root.style.top = `-100000px`;
        this._elements.root.style.visibility = 'hidden'; // Some editor parts are still visible
    }
};
DiffEditorItemTemplate = __decorate([
    __param(3, IInstantiationService),
    __param(4, IContextKeyService)
], DiffEditorItemTemplate);
export { DiffEditorItemTemplate };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckl0ZW1UZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L211bHRpRGlmZkVkaXRvci9kaWZmRWRpdG9ySXRlbVRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDdkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBaUMsTUFBTSxzREFBc0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUduRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUdyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFHckQsTUFBTSxPQUFPLFlBQVk7SUFDeEIsWUFDaUIsU0FBb0MsRUFDcEMsbUJBQTRDO1FBRDVDLGNBQVMsR0FBVCxTQUFTLENBQTJCO1FBQ3BDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBeUI7SUFDekQsQ0FBQztJQUdMLEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztDQUNEO0FBRU0sSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBOEJyRCxZQUNrQixVQUF1QixFQUN2Qix1QkFBb0MsRUFDcEMsMEJBQXNELEVBQy9CLHFCQUE0QyxFQUNoRSx3QkFBNEM7UUFFaEUsS0FBSyxFQUFFLENBQUM7UUFOUyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBYTtRQUNwQywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTRCO1FBQy9CLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFJcEYsSUFBSSxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQXdDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMxRixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEcsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGVBQWUsQ0FBUyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzNDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEYsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHFCQUFxQixHQUFHLGVBQWUsQ0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxlQUFlLENBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxlQUFlLENBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxjQUFjLEdBQUcsZUFBZSxDQUFTLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNGLElBQUksT0FBTyxHQUFHLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN4RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDeEUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsb0JBQW9CLEVBQUU7WUFDeEMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFO2dCQUN0QixDQUFDLENBQUMsb0JBQW9CLEVBQUU7b0JBQ3ZCLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDdkMsQ0FBQyxDQUFDLGVBQWUsRUFBRTt3QkFDbEIsQ0FBQyxDQUFDLGdEQUFnRCxFQUFFLEVBQVMsQ0FBQzt3QkFDOUQsQ0FBQyxDQUFDLDJCQUEyQixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3JDLENBQUMsQ0FBQyxrREFBa0QsRUFBRSxFQUFTLENBQUM7cUJBQ2hFLENBQUM7b0JBQ0YsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO2lCQUN4QixDQUFDO2FBQ0YsQ0FBQztZQUVGLENBQUMsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDckIsQ0FBQyxDQUFDLDRCQUE0QixDQUFDO2FBQy9CLENBQUM7U0FDRixDQUFnQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO1lBQy9HLHNCQUFzQixFQUFFLElBQUksQ0FBQyx1QkFBdUI7U0FDcEQsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4RixJQUFJLENBQUMsaUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3pGLElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQjtZQUN4RSxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNqRyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsbUJBQW1CO1lBQ3pFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ25HLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDYixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQztRQUVqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFDM0IsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUN0RixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUN2RixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLFlBQVksQ0FBQztZQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxZQUFZLENBQUM7WUFDM0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckQsaUJBQWlCLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsZUFBZSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3RGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BFLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzlCLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDeEMsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7WUFDaEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztRQUU3QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3hHLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxSixJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsMEJBQTBCLEVBQUU7WUFDbkksWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNyRyxXQUFXLEVBQUU7Z0JBQ1osaUJBQWlCLEVBQUUsSUFBSTthQUN2QjtZQUNELGNBQWMsRUFBRSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDakUsc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDO1NBQ3hHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLGFBQWEsQ0FBQyxJQUFZO1FBQ2hDLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNqSSxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQztJQU1NLE9BQU8sQ0FBQyxJQUE4QjtRQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixTQUFTLGFBQWEsQ0FBQyxPQUEyQjtZQUNqRCxPQUFPO2dCQUNOLEdBQUcsT0FBTztnQkFDVixvQkFBb0IsRUFBRSxLQUFLO2dCQUMzQixvQkFBb0IsRUFBRTtvQkFDckIsT0FBTyxFQUFFLElBQUk7aUJBQ2I7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLFFBQVEsRUFBRSxRQUFRO29CQUNsQixVQUFVLEVBQUUsUUFBUTtvQkFDcEIsZ0JBQWdCLEVBQUUsS0FBSztvQkFDdkIsVUFBVSxFQUFFLEtBQUs7aUJBQ2pCO2dCQUNELG1CQUFtQixFQUFFLEtBQUs7Z0JBQzFCLG9CQUFvQixFQUFFLElBQUk7Z0JBQzFCLG1CQUFtQixFQUFFLEtBQUs7YUFDMUIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekIsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUM7UUFFOUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFZLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUMsQ0FBQztZQUVwSixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDdEIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1lBQ3RCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDckksSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDWCxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLENBQUM7aUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3hDLElBQUksR0FBRyxHQUFHLENBQUM7Z0JBQ1gsU0FBUyxHQUFHLElBQUksQ0FBQztZQUNsQixDQUFDO2lCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLEdBQUcsR0FBRyxDQUFDO2dCQUNYLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFFdkMsSUFBSSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFFMUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksS0FBSyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtnQkFDakQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUU7WUFDN0UsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0MsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBT00sTUFBTSxDQUFDLGFBQTBCLEVBQUUsS0FBYSxFQUFFLFlBQW9CLEVBQUUsUUFBcUI7UUFDbkcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLElBQUksQ0FBQztRQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDO1FBQy9ELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQztRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztRQUVoRCxvQkFBb0I7UUFDcEIsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLEtBQUssS0FBSyxDQUFDO1FBRWpFLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxhQUFhLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0I7YUFDdEQsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsWUFBWSxDQUFDO1lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDNUQsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQztRQUNsQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxHQUFHLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsQ0FBQyxzQ0FBc0M7SUFDeEYsQ0FBQztDQUNELENBQUE7QUE5Ulksc0JBQXNCO0lBa0NoQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7R0FuQ1Isc0JBQXNCLENBOFJsQyJ9