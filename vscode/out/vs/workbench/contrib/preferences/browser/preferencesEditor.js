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
var PreferencesEditor_1;
import './media/preferencesEditor.css';
import * as DOM from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Event } from '../../../../base/common/event.js';
import { getInputBoxStyle } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { CONTEXT_PREFERENCES_SEARCH_FOCUS } from '../common/preferences.js';
import { settingsTextInputBorder } from '../common/settingsEditorColorRegistry.js';
import { SearchWidget } from './preferencesWidgets.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from './preferencesEditorRegistry.js';
import { Action } from '../../../../base/common/actions.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
class PreferenceTabAction extends Action {
    constructor(descriptor, actionCallback) {
        super(descriptor.id, descriptor.title, '', true, actionCallback);
        this.descriptor = descriptor;
    }
}
let PreferencesEditor = class PreferencesEditor extends EditorPane {
    static { PreferencesEditor_1 = this; }
    static { this.ID = 'workbench.editor.preferences'; }
    constructor(group, telemetryService, themeService, storageService, instantiationService, contextKeyService) {
        super(PreferencesEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.editorPanesRegistry = Registry.as(Extensions.PreferencesEditorPane);
        this.preferencesTabActions = [];
        this.preferencesEditorPane = this._register(new MutableDisposable());
        this.searchFocusContextKey = CONTEXT_PREFERENCES_SEARCH_FOCUS.bindTo(contextKeyService);
        this.element = DOM.$('.preferences-editor');
        const headerContainer = DOM.append(this.element, DOM.$('.preferences-editor-header'));
        const searchContainer = DOM.append(headerContainer, DOM.$('.search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(SearchWidget, searchContainer, {
            focusKey: this.searchFocusContextKey,
            inputBoxStyles: getInputBoxStyle({
                inputBorder: settingsTextInputBorder
            })
        }));
        this._register(Event.debounce(this.searchWidget.onDidChange, () => undefined, 300)(() => {
            this.preferencesEditorPane.value?.search(this.searchWidget.getValue());
        }));
        const preferencesTabsContainer = DOM.append(headerContainer, DOM.$('.preferences-tabs-container'));
        this.preferencesTabActionBar = this._register(new ActionBar(preferencesTabsContainer, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            focusOnlyEnabledItems: true,
            ariaLabel: localize('preferencesTabSwitcherBarAriaLabel', "Preferences Tab Switcher"),
            ariaRole: 'tablist',
        }));
        this.onDidChangePreferencesEditorPane(this.editorPanesRegistry.getPreferencesEditorPanes(), []);
        this._register(this.editorPanesRegistry.onDidRegisterPreferencesEditorPanes(descriptors => this.onDidChangePreferencesEditorPane(descriptors, [])));
        this._register(this.editorPanesRegistry.onDidDeregisterPreferencesEditorPanes(descriptors => this.onDidChangePreferencesEditorPane([], descriptors)));
        this.bodyElement = DOM.append(this.element, DOM.$('.preferences-editor-body'));
    }
    createEditor(parent) {
        DOM.append(parent, this.element);
    }
    layout(dimension) {
        this.dimension = dimension;
        this.searchWidget.layout(dimension);
        this.searchWidget.inputBox.inputElement.style.paddingRight = `12px`;
        this.preferencesEditorPane.value?.layout(new DOM.Dimension(this.bodyElement.clientWidth, dimension.height - 87 /* header height */));
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        if (this.preferencesTabActions.length) {
            this.onDidSelectPreferencesEditorPane(this.preferencesTabActions[0].id);
        }
    }
    onDidChangePreferencesEditorPane(toAdd, toRemove) {
        for (const desc of toRemove) {
            const index = this.preferencesTabActions.findIndex(action => action.id === desc.id);
            if (index !== -1) {
                this.preferencesTabActionBar.pull(index);
                this.preferencesTabActions[index].dispose();
                this.preferencesTabActions.splice(index, 1);
            }
        }
        if (toAdd.length > 0) {
            const all = this.editorPanesRegistry.getPreferencesEditorPanes();
            for (const desc of toAdd) {
                const index = all.findIndex(action => action.id === desc.id);
                if (index !== -1) {
                    const action = new PreferenceTabAction(desc, () => this.onDidSelectPreferencesEditorPane(desc.id));
                    this.preferencesTabActions.splice(index, 0, action);
                    this.preferencesTabActionBar.push(action, { index });
                }
            }
        }
    }
    onDidSelectPreferencesEditorPane(id) {
        let selectedAction;
        for (const action of this.preferencesTabActions) {
            if (action.id === id) {
                action.checked = true;
                selectedAction = action;
            }
            else {
                action.checked = false;
            }
        }
        if (selectedAction) {
            this.searchWidget.inputBox.setPlaceHolder(localize('FullTextSearchPlaceholder', "Search {0}", selectedAction.descriptor.title));
            this.searchWidget.inputBox.setAriaLabel(localize('FullTextSearchPlaceholder', "Search {0}", selectedAction.descriptor.title));
        }
        this.renderBody(selectedAction?.descriptor);
        if (this.dimension) {
            this.layout(this.dimension);
        }
    }
    renderBody(descriptor) {
        this.preferencesEditorPane.value = undefined;
        DOM.clearNode(this.bodyElement);
        if (descriptor) {
            const editorPane = this.instantiationService.createInstance(descriptor.ctorDescriptor.ctor);
            this.preferencesEditorPane.value = editorPane;
            this.bodyElement.appendChild(editorPane.getDomNode());
        }
    }
    dispose() {
        super.dispose();
        this.preferencesTabActions.forEach(action => action.dispose());
    }
};
PreferencesEditor = PreferencesEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], PreferencesEditor);
export { PreferencesEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUM7QUFDdkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLG9EQUFvRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVB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