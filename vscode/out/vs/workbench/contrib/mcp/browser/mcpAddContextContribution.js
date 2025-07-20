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
import { Codicon } from '../../../../base/common/codicons.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
import { McpResourcePickHelper } from './mcpResourceQuickAccess.js';
let McpAddContextContribution = class McpAddContextContribution extends Disposable {
    constructor(_chatContextPickService, instantiationService) {
        super();
        this._chatContextPickService = _chatContextPickService;
        this._addContextMenu = this._register(new MutableDisposable());
        this._helper = instantiationService.createInstance(McpResourcePickHelper);
        this._register(autorun(reader => {
            const enabled = this._helper.hasServersWithResources.read(reader);
            if (enabled && !this._addContextMenu.value) {
                this._registerAddContextMenu();
            }
            else {
                this._addContextMenu.clear();
            }
        }));
    }
    _registerAddContextMenu() {
        this._addContextMenu.value = this._chatContextPickService.registerChatContextItem({
            type: 'pickerPick',
            label: localize('mcp.addContext', "MCP Resources..."),
            icon: Codicon.mcp,
            asPicker: () => ({
                placeholder: localize('mcp.addContext.placeholder', "Select MCP Resource..."),
                picks: (_query, token) => this._getResourcePicks(token),
            }),
        });
    }
    _getResourcePicks(token) {
        const observable = observableValue(this, { busy: true, picks: [] });
        this._helper.getPicks(servers => {
            const picks = [];
            for (const [server, resources] of servers) {
                if (resources.length === 0) {
                    continue;
                }
                picks.push(McpResourcePickHelper.sep(server));
                for (const resource of resources) {
                    picks.push({
                        ...McpResourcePickHelper.item(resource),
                        asAttachment: () => this._helper.toAttachment(resource).then(r => {
                            if (!r) {
                                throw new CancellationError();
                            }
                            else {
                                return r;
                            }
                        }),
                    });
                }
            }
            observable.set({ picks, busy: true }, undefined);
        }, token).finally(() => {
            observable.set({ busy: false, picks: observable.get().picks }, undefined);
        });
        return observable;
    }
};
McpAddContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService)
], McpAddContextContribution);
export { McpAddContextContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQWRkQ29udGV4dENvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwQWRkQ29udGV4dENvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBbUIsdUJBQXVCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUU3RCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFHeEQsWUFDMEIsdUJBQWlFLEVBQ25FLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQUhrQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBRjFFLG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQU8xRSxJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzFFLElBQUksQ0FB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