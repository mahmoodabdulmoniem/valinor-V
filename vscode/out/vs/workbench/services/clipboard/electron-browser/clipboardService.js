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
var NativeClipboardService_1;
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { URI } from '../../../../base/common/uri.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
let NativeClipboardService = class NativeClipboardService {
    static { NativeClipboardService_1 = this; }
    static { this.FILE_FORMAT = 'code/file-list'; } // Clipboard format for files
    constructor(nativeHostService) {
        this.nativeHostService = nativeHostService;
    }
    async triggerPaste(targetWindowId) {
        return this.nativeHostService.triggerPaste({ targetWindowId });
    }
    async readImage() {
        return this.nativeHostService.readImage();
    }
    async writeText(text, type) {
        return this.nativeHostService.writeClipboardText(text, type);
    }
    async readText(type) {
        return this.nativeHostService.readClipboardText(type);
    }
    async readFindText() {
        if (isMacintosh) {
            return this.nativeHostService.readClipboardFindText();
        }
        return '';
    }
    async writeFindText(text) {
        if (isMacintosh) {
            return this.nativeHostService.writeClipboardFindText(text);
        }
    }
    async writeResources(resources) {
        if (resources.length) {
            return this.nativeHostService.writeClipboardBuffer(NativeClipboardService_1.FILE_FORMAT, this.resourcesToBuffer(resources));
        }
    }
    async readResources() {
        return this.bufferToResources(await this.nativeHostService.readClipboardBuffer(NativeClipboardService_1.FILE_FORMAT));
    }
    async hasResources() {
        return this.nativeHostService.hasClipboard(NativeClipboardService_1.FILE_FORMAT);
    }
    resourcesToBuffer(resources) {
        return VSBuffer.fromString(resources.map(r => r.toString()).join('\n'));
    }
    bufferToResources(buffer) {
        if (!buffer) {
            return [];
        }
        const bufferValue = buffer.toString();
        if (!bufferValue) {
            return [];
        }
        try {
            return bufferValue.split('\n').map(f => URI.parse(f));
        }
        catch (error) {
            return []; // do not trust clipboard data
        }
    }
};
NativeClipboardService = NativeClipboardService_1 = __decorate([
    __param(0, INativeHostService)
], NativeClipboardService);
export { NativeClipboardService };
registerSingleton(IClipboardService, NativeClipboardService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NsaXBib2FyZC9lbGVjdHJvbi1icm93c2VyL2NsaXBib2FyZFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjs7YUFFVixnQkFBVyxHQUFHLGdCQUFnQixBQUFuQixDQUFvQixHQUFDLDZCQUE2QjtJQUlyRixZQUNzQyxpQkFBcUM7UUFBckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUN2RSxDQUFDO0lBRUwsS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFzQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUztRQUNkLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLElBQVksRUFBRSxJQUFnQztRQUM3RCxPQUFP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