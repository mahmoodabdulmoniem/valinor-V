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
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { dirname } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { IChatContextPickService } from '../chatContextPickService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
import { imageToHash, isImage } from '../chatPasteProviders.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { ChatInstructionsPickerPick } from '../promptSyntax/attachInstructionsAction.js';
let ChatContextContributions = class ChatContextContributions extends Disposable {
    static { this.ID = 'chat.contextContributions'; }
    constructor(instantiationService, contextPickService) {
        super();
        // ###############################################################################################
        //
        // Default context picks/values which are "native" to chat. This is NOT the complete list
        // and feature area specific context, like for notebooks, problems, etc, should be contributed
        // by the feature area.
        //
        // ###############################################################################################
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ToolsContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ChatInstructionsPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(OpenEditorContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(RelatedFilesContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ClipboardImageContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ScreenshotContextValuePick)));
    }
};
ChatContextContributions = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], ChatContextContributions);
export { ChatContextContributions };
class ToolsContextPickerPick {
    constructor() {
        this.type = 'pickerPick';
        this.label = localize('chatContext.tools', 'Tools...');
        this.icon = Codicon.tools;
        this.ordinal = -500;
    }
    asPicker(widget) {
        const items = [];
        for (const entry of widget.input.selectedToolsModel.entries.get()) {
            if (entry instanceof ToolSet) {
                items.push({
                    toolInfo: ToolDataSource.classify(entry.source),
                    label: entry.referenceName,
                    description: entry.description,
                    asAttachment: () => this._asToolSetAttachment(entry)
                });
            }
            else {
                items.push({
                    toolInfo: ToolDataSource.classify(entry.source),
                    label: entry.toolReferenceName ?? entry.displayName,
                    description: entry.userDescription ?? entry.modelDescription,
                    asAttachment: () => this._asToolAttachment(entry)
                });
            }
        }
        items.sort((a, b) => {
            let res = a.toolInfo.ordinal - b.toolInfo.ordinal;
            if (res === 0) {
                res = a.toolInfo.label.localeCompare(b.toolInfo.label);
            }
            if (res === 0) {
                res = a.label.localeCompare(b.label);
            }
            return res;
        });
        let lastGroupLabel;
        const picks = [];
        for (const item of items) {
            if (lastGroupLabel !== item.toolInfo.label) {
                picks.push({ type: 'separator', label: item.toolInfo.label });
                lastGroupLabel = item.toolInfo.label;
            }
            picks.push(item);
        }
        return {
            placeholder: localize('chatContext.tools.placeholder', 'Select a tool'),
            picks: Promise.resolve(picks)
        };
    }
    _asToolAttachment(entry) {
        return {
            kind: 'tool',
            id: entry.id,
            icon: ThemeIcon.isThemeIcon(entry.icon) ? entry.icon : undefined,
            name: entry.displayName,
            value: undefined,
        };
    }
    _asToolSetAttachment(entry) {
        return {
            kind: 'toolset',
            id: entry.id,
            icon: entry.icon,
            name: entry.referenceName,
            value: Array.from(entry.getTools()).map(t => this._asToolAttachment(t)),
        };
    }
}
let OpenEditorContextValuePick = class OpenEditorContextValuePick {
    constructor(_editorService, _labelService) {
        this._editorService = _editorService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize('chatContext.editors', 'Open Editors');
        this.icon = Codicon.file;
        this.ordinal = 800;
    }
    isEnabled() {
        return this._editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput).length > 0;
    }
    async asAttachment() {
        const result = [];
        for (const editor of this._editorService.editors) {
            if (!(editor instanceof FileEditorInput || editor instanceof DiffEditorInput || editor instanceof UntitledTextEditorInput || editor instanceof NotebookEditorInput)) {
                continue;
            }
            const uri = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (!uri) {
                continue;
            }
            result.push({
                kind: 'file',
                id: uri.toString(),
                value: uri,
                name: this._labelService.getUriBasenameLabel(uri),
            });
        }
        return result;
    }
};
OpenEditorContextValuePick = __decorate([
    __param(0, IEditorService),
    __param(1, ILabelService)
], OpenEditorContextValuePick);
let RelatedFilesContextPickerPick = class RelatedFilesContextPickerPick {
    constructor(_chatEditingService, _labelService) {
        this._chatEditingService = _chatEditingService;
        this._labelService = _labelService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.relatedFiles', 'Related Files');
        this.icon = Codicon.sparkle;
        this.ordinal = 300;
    }
    isEnabled(widget) {
        return this._chatEditingService.hasRelatedFilesProviders() && (Boolean(widget.getInput()) || widget.attachmentModel.fileAttachments.length > 0);
    }
    asPicker(widget) {
        const picks = (async () => {
            const chatSessionId = widget.viewModel?.sessionId;
            if (!chatSessionId) {
                return [];
            }
            const relatedFiles = await this._chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None);
            if (!relatedFiles) {
                return [];
            }
            const attachments = widget.attachmentModel.getAttachmentIDs();
            return this._chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
                .then((files) => (files ?? []).reduce((acc, cur) => {
                acc.push({ type: 'separator', label: cur.group });
                for (const file of cur.files) {
                    const label = this._labelService.getUriBasenameLabel(file.uri);
                    acc.push({
                        label: label,
                        description: this._labelService.getUriLabel(dirname(file.uri), { relative: true }),
                        disabled: attachments.has(file.uri.toString()),
                        asAttachment: () => {
                            return {
                                kind: 'file',
                                id: file.uri.toString(),
                                value: file.uri,
                                name: label,
                                omittedState: 0 /* OmittedState.NotOmitted */
                            };
                        }
                    });
                }
                return acc;
            }, []));
        })();
        return {
            placeholder: localize('relatedFiles', 'Add related files to your working set'),
            picks,
        };
    }
};
RelatedFilesContextPickerPick = __decorate([
    __param(0, IChatEditingService),
    __param(1, ILabelService)
], RelatedFilesContextPickerPick);
let ClipboardImageContextValuePick = class ClipboardImageContextValuePick {
    constructor(_clipboardService) {
        this._clipboardService = _clipboardService;
        this.type = 'valuePick';
        this.label = localize('imageFromClipboard', 'Image from Clipboard');
        this.icon = Codicon.fileMedia;
    }
    async isEnabled(widget) {
        if (!widget.input.selectedLanguageModel?.metadata.capabilities?.vision) {
            return false;
        }
        const imageData = await this._clipboardService.readImage();
        return isImage(imageData);
    }
    async asAttachment() {
        const fileBuffer = await this._clipboardService.readImage();
        return {
            id: await imageToHash(fileBuffer),
            name: localize('pastedImage', 'Pasted Image'),
            fullName: localize('pastedImage', 'Pasted Image'),
            value: fileBuffer,
            kind: 'image',
        };
    }
};
ClipboardImageContextValuePick = __decorate([
    __param(0, IClipboardService)
], ClipboardImageContextValuePick);
let ScreenshotContextValuePick = class ScreenshotContextValuePick {
    constructor(_hostService) {
        this._hostService = _hostService;
        this.type = 'valuePick';
        this.icon = Codicon.deviceCamera;
        this.label = (isElectron
            ? localize('chatContext.attachScreenshot.labelElectron.Window', 'Screenshot Window')
            : localize('chatContext.attachScreenshot.labelWeb', 'Screenshot'));
    }
    async isEnabled(widget) {
        return !!widget.input.selectedLanguageModel?.metadata.capabilities?.vision;
    }
    async asAttachment() {
        const blob = await this._hostService.getScreenshot();
        return blob && convertBufferToScreenshotVariable(blob);
    }
};
ScreenshotContextValuePick = __decorate([
    __param(0, IHostService)
], ScreenshotContextValuePick);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUc5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztB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