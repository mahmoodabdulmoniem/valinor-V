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
import { localize } from '../../../../nls.js';
import { fromNow } from '../../../../base/common/date.js';
import { isLinuxSnap } from '../../../../base/common/platform.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { AbstractDialogHandler } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { process } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let NativeDialogHandler = class NativeDialogHandler extends AbstractDialogHandler {
    constructor(logService, nativeHostService, productService, clipboardService) {
        super();
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.productService = productService;
        this.clipboardService = clipboardService;
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(prompt.type),
            title: prompt.title,
            message: prompt.message,
            detail: prompt.detail,
            buttons,
            cancelId: prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */,
            checkboxLabel: prompt.checkbox?.label,
            checkboxChecked: prompt.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        return this.getPromptResult(prompt, response, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(confirmation.type) ?? 'question',
            title: confirmation.title,
            message: confirmation.message,
            detail: confirmation.detail,
            buttons,
            cancelId: buttons.length - 1,
            checkboxLabel: confirmation.checkbox?.label,
            checkboxChecked: confirmation.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        return { confirmed: response === 0, checkboxChecked };
    }
    input() {
        throw new Error('Unsupported'); // we have no native API for password dialogs in Electron
    }
    async about() {
        let version = this.productService.version;
        if (this.productService.target) {
            version = `${version} (${this.productService.target} setup)`;
        }
        else if (this.productService.darwinUniversalAssetId) {
            version = `${version} (Universal)`;
        }
        const osProps = await this.nativeHostService.getOSProperties();
        const detailString = (useAgo) => {
            return localize({ key: 'aboutDetail', comment: ['Electron, Chromium, Node.js and V8 are product names that need no translation'] }, "Version: {0}\nCommit: {1}\nDate: {2}\nElectron: {3}\nElectronBuildId: {4}\nChromium: {5}\nNode.js: {6}\nV8: {7}\nOS: {8}", version, this.productService.commit || 'Unknown', this.productService.date ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}` : 'Unknown', process.versions['electron'], process.versions['microsoft-build'], process.versions['chrome'], process.versions['node'], process.versions['v8'], `${osProps.type} ${osProps.arch} ${osProps.release}${isLinuxSnap ? ' snap' : ''}`);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { response } = await this.nativeHostService.showMessageBox({
            type: 'info',
            message: this.productService.nameLong,
            detail: `\n${detail}`,
            buttons: [
                localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
                localize('okButton', "OK")
            ],
            targetWindowId: getActiveWindow().vscodeWindowId
        });
        if (response === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
};
NativeDialogHandler = __decorate([
    __param(0, ILogService),
    __param(1, INativeHostService),
    __param(2, IProductService),
    __param(3, IClipboardService)
], NativeDialogHandler);
export { NativeDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2VsZWN0cm9uLWJyb3dzZXIvcGFydHMvZGlhbG9ncy9kaWFsb2dIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBbUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFM0QsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxxQkFBcUI7SUFFN0QsWUFDK0IsVUFBdUIsRUFDaEIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzdCLGdCQUFtQztRQUV2RSxLQUFLLEVBQUUsQ0FBQztRQUxzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2hCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDeEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzdCLHFCQUFnQixH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