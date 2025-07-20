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
var TextEditorService_1;
import { Event } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorExtensions, isResourceDiffEditorInput, isResourceSideBySideEditorInput, DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput } from '../../../common/editor.js';
import { IUntitledTextEditorService } from '../../untitled/common/untitledTextEditorService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { TextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../untitled/common/untitledTextEditorInput.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../editor/common/editorResolverService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
export const ITextEditorService = createDecorator('textEditorService');
class FileEditorInputLeakError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'FileEditorInputLeakError';
        this.stack = stack;
    }
}
let TextEditorService = class TextEditorService extends Disposable {
    static { TextEditorService_1 = this; }
    constructor(untitledTextEditorService, instantiationService, uriIdentityService, fileService, editorResolverService) {
        super();
        this.untitledTextEditorService = untitledTextEditorService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.editorResolverService = editorResolverService;
        this.editorInputCache = new ResourceMap();
        this.fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        this.mapLeakToCounter = new Map();
        // Register the default editor to the editor resolver
        // service so that it shows up in the editors picker
        this.registerDefaultEditor();
    }
    registerDefaultEditor() {
        this._register(this.editorResolverService.registerEditor('*', {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createEditorInput: editor => ({ editor: this.createTextEditor(editor) }),
            createUntitledEditorInput: untitledEditor => ({ editor: this.createTextEditor(untitledEditor) }),
            createDiffEditorInput: diffEditor => ({ editor: this.createTextEditor(diffEditor) })
        }));
    }
    async resolveTextEditor(input) {
        return this.createTextEditor(input);
    }
    createTextEditor(input) {
        // Merge Editor Not Supported (we fallback to showing the result only)
        if (isResourceMergeEditorInput(input)) {
            return this.createTextEditor(input.result);
        }
        // Diff Editor Support
        if (isResourceDiffEditorInput(input)) {
            const original = this.createTextEditor(input.original);
            const modified = this.createTextEditor(input.modified);
            return this.instantiationService.createInstance(DiffEditorInput, input.label, input.description, original, modified, undefined);
        }
        // Side by Side Editor Support
        if (isResourceSideBySideEditorInput(input)) {
            const primary = this.createTextEditor(input.primary);
            const secondary = this.createTextEditor(input.secondary);
            return this.instantiationService.createInstance(SideBySideEditorInput, input.label, input.description, secondary, primary);
        }
        // Untitled text file support
        const untitledInput = input;
        if (untitledInput.forceUntitled || !untitledInput.resource || (untitledInput.resource.scheme === Schemas.untitled)) {
            const untitledOptions = {
                languageId: untitledInput.languageId,
                initialValue: untitledInput.contents,
                encoding: untitledInput.encoding
            };
            // Untitled resource: use as hint for an existing untitled editor
            let untitledModel;
            if (untitledInput.resource?.scheme === Schemas.untitled) {
                untitledModel = this.untitledTextEditorService.create({ untitledResource: untitledInput.resource, ...untitledOptions });
            }
            // Other resource: use as hint for associated filepath
            else {
                untitledModel = this.untitledTextEditorService.create({ associatedResource: untitledInput.resource, ...untitledOptions });
            }
            return this.createOrGetCached(untitledModel.resource, () => this.instantiationService.createInstance(UntitledTextEditorInput, untitledModel));
        }
        // Text File/Resource Editor Support
        const textResourceEditorInput = input;
        if (textResourceEditorInput.resource instanceof URI) {
            // Derive the label from the path if not provided explicitly
            const label = textResourceEditorInput.label || basename(textResourceEditorInput.resource);
            // We keep track of the preferred resource this input is to be created
            // with but it may be different from the canonical resource (see below)
            const preferredResource = textResourceEditorInput.resource;
            // From this moment on, only operate on the canonical resource
            // to ensure we reduce the chance of opening the same resource
            // with different resource forms (e.g. path casing on Windows)
            const canonicalResource = this.uriIdentityService.asCanonicalUri(preferredResource);
            return this.createOrGetCached(canonicalResource, () => {
                // File
                if (textResourceEditorInput.forceFile || this.fileService.hasProvider(canonicalResource)) {
                    return this.fileEditorFactory.createFileEditor(canonicalResource, preferredResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.encoding, textResourceEditorInput.languageId, textResourceEditorInput.contents, this.instantiationService);
                }
                // Resource
                return this.instantiationService.createInstance(TextResourceEditorInput, canonicalResource, textResourceEditorInput.label, textResourceEditorInput.description, textResourceEditorInput.languageId, textResourceEditorInput.contents);
            }, cachedInput => {
                // Untitled
                if (cachedInput instanceof UntitledTextEditorInput) {
                    return;
                }
                // Files
                else if (!(cachedInput instanceof TextResourceEditorInput)) {
                    cachedInput.setPreferredResource(preferredResource);
                    if (textResourceEditorInput.label) {
                        cachedInput.setPreferredName(textResourceEditorInput.label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setPreferredDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.encoding) {
                        cachedInput.setPreferredEncoding(textResourceEditorInput.encoding);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
                // Resources
                else {
                    if (label) {
                        cachedInput.setName(label);
                    }
                    if (textResourceEditorInput.description) {
                        cachedInput.setDescription(textResourceEditorInput.description);
                    }
                    if (textResourceEditorInput.languageId) {
                        cachedInput.setPreferredLanguageId(textResourceEditorInput.languageId);
                    }
                    if (typeof textResourceEditorInput.contents === 'string') {
                        cachedInput.setPreferredContents(textResourceEditorInput.contents);
                    }
                }
            });
        }
        throw new Error(`ITextEditorService: Unable to create texteditor from ${JSON.stringify(input)}`);
    }
    createOrGetCached(resource, factoryFn, cachedFn) {
        // Return early if already cached
        let input = this.editorInputCache.get(resource);
        if (input) {
            cachedFn?.(input);
            return input;
        }
        // Otherwise create and add to cache
        input = factoryFn();
        this.editorInputCache.set(resource, input);
        // Track Leaks
        const leakId = this.trackLeaks(input);
        Event.once(input.onWillDispose)(() => {
            // Remove from cache
            this.editorInputCache.delete(resource);
            // Untrack Leaks
            if (leakId) {
                this.untrackLeaks(leakId);
            }
        });
        return input;
    }
    //#region Leak Monitoring
    static { this.LEAK_TRACKING_THRESHOLD = 256; }
    static { this.LEAK_REPORTING_THRESHOLD = 2 * this.LEAK_TRACKING_THRESHOLD; }
    static { this.LEAK_REPORTED = false; }
    trackLeaks(input) {
        if (TextEditorService_1.LEAK_REPORTED || this.editorInputCache.size < TextEditorService_1.LEAK_TRACKING_THRESHOLD) {
            return undefined;
        }
        const leakId = `${input.resource.scheme}#${input.typeId || '<no typeId>'}#${input.editorId || '<no editorId>'}\n${new Error().stack?.split('\n').slice(2).join('\n') ?? ''}`;
        const leakCounter = (this.mapLeakToCounter.get(leakId) ?? 0) + 1;
        this.mapLeakToCounter.set(leakId, leakCounter);
        if (this.editorInputCache.size > TextEditorService_1.LEAK_REPORTING_THRESHOLD) {
            TextEditorService_1.LEAK_REPORTED = true;
            const [topLeak, topCount] = Array.from(this.mapLeakToCounter.entries()).reduce(([topLeak, topCount], [key, val]) => val > topCount ? [key, val] : [topLeak, topCount]);
            const message = `Potential text editor input LEAK detected, having ${this.editorInputCache.size} text editor inputs already. Most frequent owner (${topCount})`;
            onUnexpectedError(new FileEditorInputLeakError(message, topLeak));
        }
        return leakId;
    }
    untrackLeaks(leakId) {
        const stackCounter = (this.mapLeakToCounter.get(leakId) ?? 1) - 1;
        this.mapLeakToCounter.set(leakId, stackCounter);
        if (stackCounter === 0) {
            this.mapLeakToCounter.delete(leakId);
        }
    }
};
TextEditorService = TextEditorService_1 = __decorate([
    __param(0, IUntitledTextEditorService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IFileService),
    __param(4, IEditorResolverService)
], TextEditorService);
export { TextEditorService };
registerSingleton(ITextEditorService, TextEditorService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwSCxPQUFPLEVBQTBGLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLCtCQUErQixFQUFvQywwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTNTLE9BQU8sRUFBaUMsMEJBQTBCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUFF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