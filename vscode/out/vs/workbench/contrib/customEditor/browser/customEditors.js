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
import './media/customEditor.css';
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { RedoCommand, UndoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorExtensions } from '../../../common/editor.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { CONTEXT_ACTIVE_CUSTOM_EDITOR_ID, CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE, CustomEditorInfoCollection } from '../common/customEditor.js';
import { CustomEditorModelManager } from '../common/customEditorModelManager.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContributedCustomEditors } from '../common/contributedCustomEditors.js';
import { CustomEditorInput } from './customEditorInput.js';
let CustomEditorService = class CustomEditorService extends Disposable {
    constructor(fileService, storageService, editorService, editorGroupService, instantiationService, uriIdentityService, editorResolverService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.editorResolverService = editorResolverService;
        this._untitledCounter = 0;
        this._editorResolverDisposables = this._register(new DisposableStore());
        this._editorCapabilities = new Map();
        this._onDidChangeEditorTypes = this._register(new Emitter());
        this.onDidChangeEditorTypes = this._onDidChangeEditorTypes.event;
        this._fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        this._models = new CustomEditorModelManager();
        this._contributedEditors = this._register(new ContributedCustomEditors(storageService));
        // Register the contribution points only emitting one change from the resolver
        this.editorResolverService.bufferChangeEvents(this.registerContributionPoints.bind(this));
        this._register(this._contributedEditors.onChange(() => {
            // Register the contribution points only emitting one change from the resolver
            this.editorResolverService.bufferChangeEvents(this.registerContributionPoints.bind(this));
            this._onDidChangeEditorTypes.fire();
        }));
        // Register group context key providers.
        // These set the context keys for each editor group and the global context
        const activeCustomEditorContextKeyProvider = {
            contextKey: CONTEXT_ACTIVE_CUSTOM_EDITOR_ID,
            getGroupContextKeyValue: group => this.getActiveCustomEditorId(group),
            onDidChange: this.onDidChangeEditorTypes
        };
        const customEditorIsEditableContextKeyProvider = {
            contextKey: CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE,
            getGroupContextKeyValue: group => this.getCustomEditorIsEditable(group),
            onDidChange: this.onDidChangeEditorTypes
        };
        this._register(this.editorGroupService.registerContextKeyProvider(activeCustomEditorContextKeyProvider));
        this._register(this.editorGroupService.registerContextKeyProvider(customEditorIsEditableContextKeyProvider));
        this._register(fileService.onDidRunOperation(e => {
            if (e.isOperation(2 /* FileOperation.MOVE */)) {
                this.handleMovedFileInOpenedFileEditors(e.resource, this.uriIdentityService.asCanonicalUri(e.target.resource));
            }
        }));
        const PRIORITY = 105;
        this._register(UndoCommand.addImplementation(PRIORITY, 'custom-editor', () => {
            return this.withActiveCustomEditor(editor => editor.undo());
        }));
        this._register(RedoCommand.addImplementation(PRIORITY, 'custom-editor', () => {
            return this.withActiveCustomEditor(editor => editor.redo());
        }));
    }
    getEditorTypes() {
        return [...this._contributedEditors];
    }
    withActiveCustomEditor(f) {
        const activeEditor = this.editorService.activeEditor;
        if (activeEditor instanceof CustomEditorInput) {
            const result = f(activeEditor);
            if (result) {
                return result;
            }
            return true;
        }
        return false;
    }
    registerContributionPoints() {
        // Clear all previous contributions we know
        this._editorResolverDisposables.clear();
        for (const contributedEditor of this._contributedEditors) {
            for (const globPattern of contributedEditor.selector) {
                if (!globPattern.filenamePattern) {
                    continue;
                }
                this._editorResolverDisposables.add(this.editorResolverService.registerEditor(globPattern.filenamePattern, {
                    id: contributedEditor.id,
                    label: contributedEditor.displayName,
                    detail: contributedEditor.providerDisplayName,
                    priority: contributedEditor.priority,
                }, {
                    singlePerResource: () => !(this.getCustomEditorCapabilities(contributedEditor.id)?.supportsMultipleEditorsPerDocument ?? false)
                }, {
                    createEditorInput: ({ resource }, group) => {
                        return { editor: CustomEditorInput.create(this.instantiationService, resource, contributedEditor.id, group.id) };
                    },
                    createUntitledEditorInput: ({ resource }, group) => {
                        return { editor: CustomEditorInput.create(this.instantiationService, resource ?? URI.from({ scheme: Schemas.untitled, authority: `Untitled-${this._untitledCounter++}` }), contributedEditor.id, group.id) };
                    },
                    createDiffEditorInput: (diffEditorInput, group) => {
                        return { editor: this.createDiffEditorInput(diffEditorInput, contributedEditor.id, group) };
                    },
                }));
            }
        }
    }
    createDiffEditorInput(editor, editorID, group) {
        const modifiedOverride = CustomEditorInput.create(this.instantiationService, assertReturnsDefined(editor.modified.resource), editorID, group.id, { customClasses: 'modified' });
        const originalOverride = CustomEditorInput.create(this.instantiationService, assertReturnsDefined(editor.original.resource), editorID, group.id, { customClasses: 'original' });
        return this.instantiationService.createInstance(DiffEditorInput, editor.label, editor.description, originalOverride, modifiedOverride, true);
    }
    get models() { return this._models; }
    getCustomEditor(viewType) {
        return this._contributedEditors.get(viewType);
    }
    getContributedCustomEditors(resource) {
        return new CustomEditorInfoCollection(this._contributedEditors.getContributedEditors(resource));
    }
    getUserConfiguredCustomEditors(resource) {
        const resourceAssocations = this.editorResolverService.getAssociationsForResource(resource);
        return new CustomEditorInfoCollection(coalesce(resourceAssocations
            .map(association => this._contributedEditors.get(association.viewType))));
    }
    getAllCustomEditors(resource) {
        return new CustomEditorInfoCollection([
            ...this.getUserConfiguredCustomEditors(resource).allEditors,
            ...this.getContributedCustomEditors(resource).allEditors,
        ]);
    }
    registerCustomEditorCapabilities(viewType, options) {
        if (this._editorCapabilities.has(viewType)) {
            throw new Error(`Capabilities for ${viewType} already set`);
        }
        this._editorCapabilities.set(viewType, options);
        return toDisposable(() => {
            this._editorCapabilities.delete(viewType);
        });
    }
    getCustomEditorCapabilities(viewType) {
        return this._editorCapabilities.get(viewType);
    }
    getActiveCustomEditorId(group) {
        const activeEditorPane = group.activeEditorPane;
        const resource = activeEditorPane?.input?.resource;
        if (!resource) {
            return '';
        }
        return activeEditorPane?.input instanceof CustomEditorInput ? activeEditorPane.input.viewType : '';
    }
    getCustomEditorIsEditable(group) {
        const activeEditorPane = group.activeEditorPane;
        const resource = activeEditorPane?.input?.resource;
        if (!resource) {
            return false;
        }
        return activeEditorPane?.input instanceof CustomEditorInput;
    }
    async handleMovedFileInOpenedFileEditors(oldResource, newResource) {
        if (extname(oldResource).toLowerCase() === extname(newResource).toLowerCase()) {
            return;
        }
        const possibleEditors = this.getAllCustomEditors(newResource);
        // See if we have any non-optional custom editor for this resource
        if (!possibleEditors.allEditors.some(editor => editor.priority !== RegisteredEditorPriority.option)) {
            return;
        }
        // If so, check all editors to see if there are any file editors open for the new resource
        const editorsToReplace = new Map();
        for (const group of this.editorGroupService.groups) {
            for (const editor of group.editors) {
                if (this._fileEditorFactory.isFileEditor(editor)
                    && !(editor instanceof CustomEditorInput)
                    && isEqual(editor.resource, newResource)) {
                    let entry = editorsToReplace.get(group.id);
                    if (!entry) {
                        entry = [];
                        editorsToReplace.set(group.id, entry);
                    }
                    entry.push(editor);
                }
            }
        }
        if (!editorsToReplace.size) {
            return;
        }
        for (const [group, entries] of editorsToReplace) {
            this.editorService.replaceEditors(entries.map(editor => {
                let replacement;
                if (possibleEditors.defaultEditor) {
                    const viewType = possibleEditors.defaultEditor.id;
                    replacement = CustomEditorInput.create(this.instantiationService, newResource, viewType, group);
                }
                else {
                    replacement = { resource: newResource, options: { override: DEFAULT_EDITOR_ASSOCIATION.id } };
                }
                return {
                    editor,
                    replacement,
                    options: {
                        preserveFocus: true,
                    }
                };
            }), group);
        }
    }
};
CustomEditorService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IInstantiationService),
    __param(5, IUriIdentityService),
    __param(6, IEditorResolverService)
], CustomEditorService);
export { CustomEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2Jyb3dzZXIvY3VzdG9tRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFMUYsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxnQkFBZ0Is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