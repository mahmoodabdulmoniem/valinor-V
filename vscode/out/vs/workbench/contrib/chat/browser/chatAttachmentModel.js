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
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isPromptFileVariableEntry } from '../common/chatVariableEntries.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { Schemas } from '../../../../base/common/network.js';
import { IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { equals } from '../../../../base/common/objects.js';
import { Iterable } from '../../../../base/common/iterator.js';
let ChatAttachmentModel = class ChatAttachmentModel extends Disposable {
    constructor(fileService, webContentExtractorService, chatAttachmentResolveService) {
        super();
        this.fileService = fileService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatAttachmentResolveService = chatAttachmentResolveService;
        this._attachments = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    get attachments() {
        return Array.from(this._attachments.values());
    }
    get size() {
        return this._attachments.size;
    }
    get fileAttachments() {
        return this.attachments.filter(file => file.kind === 'file' && URI.isUri(file.value))
            .map(file => file.value);
    }
    getAttachmentIDs() {
        return new Set(this._attachments.keys());
    }
    async addFile(uri, range) {
        if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(uri.path)) {
            const context = await this.asImageVariableEntry(uri);
            if (context) {
                this.addContext(context);
            }
            return;
        }
        else {
            this.addContext(this.asFileVariableEntry(uri, range));
        }
    }
    addFolder(uri) {
        this.addContext({
            kind: 'directory',
            value: uri,
            id: uri.toString(),
            name: basename(uri),
        });
    }
    clear(clearStickyAttachments = false) {
        if (clearStickyAttachments) {
            const deleted = Array.from(this._attachments.keys());
            this._attachments.clear();
            this._onDidChange.fire({ deleted, added: [], updated: [] });
        }
        else {
            const deleted = [];
            const allIds = Array.from(this._attachments.keys());
            for (const id of allIds) {
                const entry = this._attachments.get(id);
                if (entry && !isPromptFileVariableEntry(entry)) {
                    this._attachments.delete(id);
                    deleted.push(id);
                }
            }
            this._onDidChange.fire({ deleted, added: [], updated: [] });
        }
    }
    addContext(...attachments) {
        attachments = attachments.filter(attachment => !this._attachments.has(attachment.id));
        this.updateContext(Iterable.empty(), attachments);
    }
    clearAndSetContext(...attachments) {
        this.updateContext(Array.from(this._attachments.keys()), attachments);
    }
    delete(...variableEntryIds) {
        this.updateContext(variableEntryIds, Iterable.empty());
    }
    updateContext(toDelete, upsert) {
        const deleted = [];
        const added = [];
        const updated = [];
        for (const id of toDelete) {
            const item = this._attachments.get(id);
            if (item) {
                this._attachments.delete(id);
                deleted.push(id);
            }
        }
        for (const item of upsert) {
            const oldItem = this._attachments.get(item.id);
            if (!oldItem) {
                this._attachments.set(item.id, item);
                added.push(item);
            }
            else if (!equals(oldItem, item)) {
                this._attachments.set(item.id, item);
                updated.push(item);
            }
        }
        if (deleted.length > 0 || added.length > 0 || updated.length > 0) {
            this._onDidChange.fire({ deleted, added, updated });
        }
    }
    // ---- create utils
    asFileVariableEntry(uri, range) {
        return {
            kind: 'file',
            value: range ? { uri, range } : uri,
            id: uri.toString() + (range?.toString() ?? ''),
            name: basename(uri),
        };
    }
    // Gets an image variable for a given URI, which may be a file or a web URL
    async asImageVariableEntry(uri) {
        if (uri.scheme === Schemas.file && await this.fileService.canHandleResource(uri)) {
            return await this.chatAttachmentResolveService.resolveImageEditorAttachContext(uri);
        }
        else if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            const extractedImages = await this.webContentExtractorService.readImage(uri, CancellationToken.None);
            if (extractedImages) {
                return await this.chatAttachmentResolveService.resolveImageEditorAttachContext(uri, extractedImages);
            }
        }
        return undefined;
    }
};
ChatAttachmentModel = __decorate([
    __param(0, IFileService),
    __param(1, ISharedWebContentExtractorService),
    __param(2, IChatAttachmentResolveService)
], ChatAttachmentModel);
export { ChatAttachmentModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBdHRhY2htZW50TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBb0QseUJBQXlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDM0gsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFReEQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBT2xELFlBQ2UsV0FBMEMsRUFDckIsMEJBQThFLEVBQ2xGLDRCQUE0RTtRQUUzRyxLQUFLLEVBQUUsQ0FBQztRQUp1QixnQkFBVyxHQUFYLFdBQVcsQ0FB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