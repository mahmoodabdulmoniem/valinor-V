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
var MainThreadMessageService_1;
import * as nls from '../../../nls.js';
import { toAction } from '../../../base/common/actions.js';
import { MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService, NotificationPriority } from '../../../platform/notification/common/notification.js';
import { Event } from '../../../base/common/event.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
let MainThreadMessageService = class MainThreadMessageService {
    static { MainThreadMessageService_1 = this; }
    static { this.URGENT_NOTIFICATION_SOURCES = [
        'vscode.github-authentication',
        'vscode.microsoft-authentication'
    ]; }
    constructor(extHostContext, _notificationService, _commandService, _dialogService, extensionService) {
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        this._dialogService = _dialogService;
        this.extensionsListener = extensionService.onDidChangeExtensions(e => {
            for (const extension of e.removed) {
                this._notificationService.removeFilter(extension.identifier.value);
            }
        });
    }
    dispose() {
        this.extensionsListener.dispose();
    }
    $showMessage(severity, message, options, commands) {
        if (options.modal) {
            return this._showModalMessage(severity, message, options.detail, commands, options.useCustom);
        }
        else {
            return this._showMessage(severity, message, commands, options);
        }
    }
    _showMessage(severity, message, commands, options) {
        return new Promise(resolve => {
            const primaryActions = commands.map(command => toAction({
                id: `_extension_message_handle_${command.handle}`,
                label: command.title,
                enabled: true,
                run: () => {
                    resolve(command.handle);
                    return Promise.resolve();
                }
            }));
            let source;
            let sourceIsUrgent = false;
            if (options.source) {
                source = {
                    label: options.source.label,
                    id: options.source.identifier.value
                };
                sourceIsUrgent = MainThreadMessageService_1.URGENT_NOTIFICATION_SOURCES.includes(source.id);
            }
            if (!source) {
                source = nls.localize('defaultSource', "Extension");
            }
            const secondaryActions = [];
            if (options.source) {
                secondaryActions.push(toAction({
                    id: options.source.identifier.value,
                    label: nls.localize('manageExtension', "Manage Extension"),
                    run: () => {
                        return this._commandService.executeCommand('_extensions.manage', options.source.identifier.value);
                    }
                }));
            }
            const messageHandle = this._notificationService.notify({
                severity,
                message,
                actions: { primary: primaryActions, secondary: secondaryActions },
                source,
                priority: sourceIsUrgent ? NotificationPriority.URGENT : NotificationPriority.DEFAULT,
                sticky: sourceIsUrgent
            });
            // if promise has not been resolved yet, now is the time to ensure a return value
            // otherwise if already resolved it means the user clicked one of the buttons
            Event.once(messageHandle.onDidClose)(() => {
                resolve(undefined);
            });
        });
    }
    async _showModalMessage(severity, message, detail, commands, useCustom) {
        const buttons = [];
        let cancelButton = undefined;
        for (const command of commands) {
            const button = {
                label: command.title,
                run: () => command.handle
            };
            if (command.isCloseAffordance) {
                cancelButton = button;
            }
            else {
                buttons.push(button);
            }
        }
        if (!cancelButton) {
            if (buttons.length > 0) {
                cancelButton = {
                    label: nls.localize('cancel', "Cancel"),
                    run: () => undefined
                };
            }
            else {
                cancelButton = {
                    label: nls.localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, "&&OK"),
                    run: () => undefined
                };
            }
        }
        const { result } = await this._dialogService.prompt({
            type: severity,
            message,
            detail,
            buttons,
            cancelButton,
            custom: useCustom
        });
        return result;
    }
};
MainThreadMessageService = MainThreadMessageService_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMessageService),
    __param(1, INotificationService),
    __param(2, ICommandService),
    __param(3, IDialogService),
    __param(4, IExtensionService)
], MainThreadMessageService);
export { MainThreadMessageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZE1lc3NhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBRXZDLE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEVBQWlDLFdBQVcsRUFBNEIsTUFBTSwrQkFBK0IsQ0FBQztBQUNySCxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLGNBQWMsRUFBaUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEksT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUk1RSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3Qjs7YUFJWixnQ0FBMkIsR0FBRztRQUNyRCw4QkFBOEI7UUFDOUIsaUNBQWlDO0tBQ2pDLEFBSGtELENBR2pEO0lBRUYsWUFDQyxjQUErQixFQUNRLG9CQUEwQyxFQUMvQyxlQUFnQyxFQUNqQyxjQUE4QixFQUM1QyxnQkFBbUM7UUFIZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNqQyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFH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