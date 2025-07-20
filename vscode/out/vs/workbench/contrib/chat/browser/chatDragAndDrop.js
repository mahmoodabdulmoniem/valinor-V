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
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, DragAndDropObserver } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { Mimes } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { CodeDataTransfers, containsDragType, extractEditorsDropData, extractMarkerDropData, extractNotebookCellOutputDropData, extractSymbolDropData } from '../../../../platform/dnd/browser/dnd.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { IChatWidgetService } from './chat.js';
import { IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { convertStringToUInt8Array } from './imageUtils.js';
var ChatDragAndDropType;
(function (ChatDragAndDropType) {
    ChatDragAndDropType[ChatDragAndDropType["FILE_INTERNAL"] = 0] = "FILE_INTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FILE_EXTERNAL"] = 1] = "FILE_EXTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FOLDER"] = 2] = "FOLDER";
    ChatDragAndDropType[ChatDragAndDropType["IMAGE"] = 3] = "IMAGE";
    ChatDragAndDropType[ChatDragAndDropType["SYMBOL"] = 4] = "SYMBOL";
    ChatDragAndDropType[ChatDragAndDropType["HTML"] = 5] = "HTML";
    ChatDragAndDropType[ChatDragAndDropType["MARKER"] = 6] = "MARKER";
    ChatDragAndDropType[ChatDragAndDropType["NOTEBOOK_CELL_OUTPUT"] = 7] = "NOTEBOOK_CELL_OUTPUT";
})(ChatDragAndDropType || (ChatDragAndDropType = {}));
const IMAGE_DATA_REGEX = /^data:image\/[a-z]+;base64,/;
const URL_REGEX = /^https?:\/\/.+/;
let ChatDragAndDrop = class ChatDragAndDrop extends Themable {
    constructor(attachmentModel, styles, themeService, extensionService, webContentExtractorService, chatWidgetService, logService, chatAttachmentResolveService) {
        super(themeService);
        this.attachmentModel = attachmentModel;
        this.styles = styles;
        this.extensionService = extensionService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatWidgetService = chatWidgetService;
        this.logService = logService;
        this.chatAttachmentResolveService = chatAttachmentResolveService;
        this.overlays = new Map();
        this.overlayTextBackground = '';
        this.disableOverlay = false;
        this.currentActiveTarget = undefined;
        this.updateStyles();
    }
    addOverlay(target, overlayContainer) {
        this.removeOverlay(target);
        const { overlay, disposable } = this.createOverlay(target, overlayContainer);
        this.overlays.set(target, { overlay, disposable });
    }
    removeOverlay(target) {
        if (this.currentActiveTarget === target) {
            this.currentActiveTarget = undefined;
        }
        const existingOverlay = this.overlays.get(target);
        if (existingOverlay) {
            existingOverlay.overlay.remove();
            existingOverlay.disposable.dispose();
            this.overlays.delete(target);
        }
    }
    setDisabledOverlay(disable) {
        this.disableOverlay = disable;
    }
    createOverlay(target, overlayContainer) {
        const overlay = document.createElement('div');
        overlay.classList.add('chat-dnd-overlay');
        this.updateOverlayStyles(overlay);
        overlayContainer.appendChild(overlay);
        const disposable = new DragAndDropObserver(target, {
            onDragOver: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                if (target === this.currentActiveTarget) {
                    return;
                }
                if (this.currentActiveTarget) {
                    this.setOverlay(this.currentActiveTarget, undefined);
                }
                this.currentActiveTarget = target;
                this.onDragEnter(e, target);
            },
            onDragLeave: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                if (target === this.currentActiveTarget) {
                    this.currentActiveTarget = undefined;
                }
                this.onDragLeave(e, target);
            },
            onDrop: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                if (target !== this.currentActiveTarget) {
                    return;
                }
                this.currentActiveTarget = undefined;
                this.onDrop(e, target);
            },
        });
        return { overlay, disposable };
    }
    onDragEnter(e, target) {
        const estimatedDropType = this.guessDropType(e);
        this.updateDropFeedback(e, target, estimatedDropType);
    }
    onDragLeave(e, target) {
        this.updateDropFeedback(e, target, undefined);
    }
    onDrop(e, target) {
        this.updateDropFeedback(e, target, undefined);
        this.drop(e);
    }
    async drop(e) {
        const contexts = await this.resolveAttachmentsFromDragEvent(e);
        if (contexts.length === 0) {
            return;
        }
        this.attachmentModel.addContext(...contexts);
    }
    updateDropFeedback(e, target, dropType) {
        const showOverlay = dropType !== undefined;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = showOverlay ? 'copy' : 'none';
        }
        this.setOverlay(target, dropType);
    }
    guessDropType(e) {
        // This is an estimation based on the datatransfer types/items
        if (containsDragType(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT)) {
            return ChatDragAndDropType.NOTEBOOK_CELL_OUTPUT;
        }
        else if (containsImageDragType(e)) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? ChatDragAndDropType.IMAGE : undefined;
        }
        else if (containsDragType(e, 'text/html')) {
            return ChatDragAndDropType.HTML;
        }
        else if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            return ChatDragAndDropType.SYMBOL;
        }
        else if (containsDragType(e, CodeDataTransfers.MARKERS)) {
            return ChatDragAndDropType.MARKER;
        }
        else if (containsDragType(e, DataTransfers.FILES)) {
            return ChatDragAndDropType.FILE_EXTERNAL;
        }
        else if (containsDragType(e, CodeDataTransfers.EDITORS)) {
            return ChatDragAndDropType.FILE_INTERNAL;
        }
        else if (containsDragType(e, Mimes.uriList, CodeDataTransfers.FILES, DataTransfers.RESOURCES, DataTransfers.INTERNAL_URI_LIST)) {
            return ChatDragAndDropType.FOLDER;
        }
        return undefined;
    }
    isDragEventSupported(e) {
        // if guessed drop type is undefined, it means the drop is not supported
        const dropType = this.guessDropType(e);
        return dropType !== undefined;
    }
    getDropTypeName(type) {
        switch (type) {
            case ChatDragAndDropType.FILE_INTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FILE_EXTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FOLDER: return localize('folder', 'Folder');
            case ChatDragAndDropType.IMAGE: return localize('image', 'Image');
            case ChatDragAndDropType.SYMBOL: return localize('symbol', 'Symbol');
            case ChatDragAndDropType.MARKER: return localize('problem', 'Problem');
            case ChatDragAndDropType.HTML: return localize('url', 'URL');
            case ChatDragAndDropType.NOTEBOOK_CELL_OUTPUT: return localize('notebookOutput', 'Output');
        }
    }
    async resolveAttachmentsFromDragEvent(e) {
        if (!this.isDragEventSupported(e)) {
            return [];
        }
        if (containsDragType(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT)) {
            const notebookOutputData = extractNotebookCellOutputDropData(e);
            if (notebookOutputData) {
                return this.chatAttachmentResolveService.resolveNotebookOutputAttachContext(notebookOutputData);
            }
        }
        const markerData = extractMarkerDropData(e);
        if (markerData) {
            return this.chatAttachmentResolveService.resolveMarkerAttachContext(markerData);
        }
        if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            const symbolsData = extractSymbolDropData(e);
            return this.chatAttachmentResolveService.resolveSymbolsAttachContext(symbolsData);
        }
        const editorDragData = extractEditorsDropData(e);
        if (editorDragData.length > 0) {
            return coalesce(await Promise.all(editorDragData.map(editorInput => {
                return this.chatAttachmentResolveService.resolveEditorAttachContext(editorInput);
            })));
        }
        const internal = e.dataTransfer?.getData(DataTransfers.INTERNAL_URI_LIST);
        if (internal) {
            const uriList = UriList.parse(internal);
            if (uriList.length) {
                return coalesce(await Promise.all(uriList.map(uri => this.chatAttachmentResolveService.resolveEditorAttachContext({ resource: URI.parse(uri) }))));
            }
        }
        if (!containsDragType(e, DataTransfers.INTERNAL_URI_LIST) && containsDragType(e, Mimes.uriList) && ((containsDragType(e, Mimes.html) || containsDragType(e, Mimes.text) /* Text mime needed for safari support */))) {
            return this.resolveHTMLAttachContext(e);
        }
        return [];
    }
    async downloadImageAsUint8Array(url) {
        try {
            const extractedImages = await this.webContentExtractorService.readImage(URI.parse(url), CancellationToken.None);
            if (extractedImages) {
                return extractedImages.buffer;
            }
        }
        catch (error) {
            this.logService.warn('Fetch failed:', error);
        }
        // TODO: use dnd provider to insert text @justschen
        const selection = this.chatWidgetService.lastFocusedWidget?.inputEditor.getSelection();
        if (selection && this.chatWidgetService.lastFocusedWidget) {
            this.chatWidgetService.lastFocusedWidget.inputEditor.executeEdits('chatInsertUrl', [{ range: selection, text: url }]);
        }
        this.logService.warn(`Image URLs must end in .jpg, .png, .gif, .webp, or .bmp. Failed to fetch image from this URL: ${url}`);
        return undefined;
    }
    async resolveHTMLAttachContext(e) {
        const existingAttachmentNames = new Set(this.attachmentModel.attachments.map(attachment => attachment.name));
        const createDisplayName = () => {
            const baseName = localize('dragAndDroppedImageName', 'Image from URL');
            let uniqueName = baseName;
            let baseNameInstance = 1;
            while (existingAttachmentNames.has(uniqueName)) {
                uniqueName = `${baseName} ${++baseNameInstance}`;
            }
            existingAttachmentNames.add(uniqueName);
            return uniqueName;
        };
        const getImageTransferDataFromUrl = async (url) => {
            const resource = URI.parse(url);
            if (IMAGE_DATA_REGEX.test(url)) {
                return { data: convertStringToUInt8Array(url), name: createDisplayName(), resource };
            }
            if (URL_REGEX.test(url)) {
                const data = await this.downloadImageAsUint8Array(url);
                if (data) {
                    return { data, name: createDisplayName(), resource, id: url };
                }
            }
            return undefined;
        };
        const getImageTransferDataFromFile = async (file) => {
            try {
                const buffer = await file.arrayBuffer();
                return { data: new Uint8Array(buffer), name: createDisplayName() };
            }
            catch (error) {
                this.logService.error('Error reading file:', error);
            }
            return undefined;
        };
        const imageTransferData = [];
        // Image Web File Drag and Drop
        const imageFiles = extractImageFilesFromDragEvent(e);
        if (imageFiles.length) {
            const imageTransferDataFromFiles = await Promise.all(imageFiles.map(file => getImageTransferDataFromFile(file)));
            imageTransferData.push(...imageTransferDataFromFiles.filter(data => !!data));
        }
        // Image Web URL Drag and Drop
        const imageUrls = extractUrlsFromDragEvent(e);
        if (imageUrls.length) {
            const imageTransferDataFromUrl = await Promise.all(imageUrls.map(getImageTransferDataFromUrl));
            imageTransferData.push(...imageTransferDataFromUrl.filter(data => !!data));
        }
        return await this.chatAttachmentResolveService.resolveImageAttachContext(imageTransferData);
    }
    setOverlay(target, type) {
        // Remove any previous overlay text
        this.overlayText?.remove();
        this.overlayText = undefined;
        const { overlay } = this.overlays.get(target);
        if (type !== undefined) {
            // Render the overlay text
            const iconAndtextElements = renderLabelWithIcons(`$(${Codicon.attach.id}) ${this.getOverlayText(type)}`);
            const htmlElements = iconAndtextElements.map(element => {
                if (typeof element === 'string') {
                    return $('span.overlay-text', undefined, element);
                }
                return element;
            });
            this.overlayText = $('span.attach-context-overlay-text', undefined, ...htmlElements);
            this.overlayText.style.backgroundColor = this.overlayTextBackground;
            overlay.appendChild(this.overlayText);
        }
        overlay.classList.toggle('visible', type !== undefined);
    }
    getOverlayText(type) {
        const typeName = this.getDropTypeName(type);
        return localize('attacAsContext', 'Attach {0} as Context', typeName);
    }
    updateOverlayStyles(overlay) {
        overlay.style.backgroundColor = this.getColor(this.styles.overlayBackground) || '';
        overlay.style.color = this.getColor(this.styles.listForeground) || '';
    }
    updateStyles() {
        this.overlays.forEach(overlay => this.updateOverlayStyles(overlay.overlay));
        this.overlayTextBackground = this.getColor(this.styles.listBackground) || '';
    }
};
ChatDragAndDrop = __decorate([
    __param(2, IThemeService),
    __param(3, IExtensionService),
    __param(4, ISharedWebContentExtractorService),
    __param(5, IChatWidgetService),
    __param(6, ILogService),
    __param(7, IChatAttachmentResolveService)
], ChatDragAndDrop);
export { ChatDragAndDrop };
function containsImageDragType(e) {
    // Image detection should not have false positives, only false negatives are allowed
    if (containsDragType(e, 'image')) {
        return true;
    }
    if (containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            return Array.from(files).some(file => file.type.startsWith('image/'));
        }
        const items = e.dataTransfer?.items;
        if (items && items.length > 0) {
            return Array.from(items).some(item => item.type.startsWith('image/'));
        }
    }
    return false;
}
function extractUrlsFromDragEvent(e, logService) {
    const textUrl = e.dataTransfer?.getData('text/uri-list');
    if (textUrl) {
        try {
            const urls = UriList.parse(textUrl);
            if (urls.length > 0) {
                return urls;
            }
        }
        catch (error) {
            logService?.error('Error parsing URI list:', error);
            return [];
        }
    }
    return [];
}
function extractImageFilesFromDragEvent(e) {
    const files = e.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return Array.from(files).filter(file => file.type.startsWith('image/'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERyYWdBbmREcm9wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdERyYWdBbmREcm9wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLGlDQUFpQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdk0sT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUYsT0FBTyxFQUFFLGlDQUFp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