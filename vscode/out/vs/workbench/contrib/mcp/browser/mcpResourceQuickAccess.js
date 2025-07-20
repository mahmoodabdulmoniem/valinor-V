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
import { DeferredPromise, disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { DefaultQuickAccessFilterValue } from '../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAttachmentResolveService } from '../../chat/browser/chatAttachmentResolveService.js';
import { IMcpService, isMcpResourceTemplate, McpResourceURI } from '../common/mcpTypes.js';
import { openPanelChatAndGetWidget } from './openPanelChatAndGetWidget.js';
let McpResourcePickHelper = class McpResourcePickHelper {
    static sep(server) {
        return {
            id: server.definition.id,
            type: 'separator',
            label: server.definition.label,
        };
    }
    static item(resource) {
        if (isMcpResourceTemplate(resource)) {
            return {
                id: resource.template.template,
                label: resource.title || resource.name,
                description: resource.description,
                detail: localize('mcp.resource.template', 'Resource template: {0}', resource.template.template),
            };
        }
        return {
            id: resource.uri.toString(),
            label: resource.title || resource.name,
            description: resource.description,
            detail: resource.mcpUri + (resource.sizeInBytes !== undefined ? ' (' + ByteSize.formatSize(resource.sizeInBytes) + ')' : ''),
        };
    }
    constructor(_mcpService, _fileService, _quickInputService, _notificationService, _chatAttachmentResolveService) {
        this._mcpService = _mcpService;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._chatAttachmentResolveService = _chatAttachmentResolveService;
        this.hasServersWithResources = derived(reader => {
            let enabled = false;
            for (const server of this._mcpService.servers.read(reader)) {
                const cap = server.capabilities.get();
                if (cap === undefined) {
                    enabled = true; // until we know more
                }
                else if (cap & 16 /* McpCapability.Resources */) {
                    enabled = true;
                    break;
                }
            }
            return enabled;
        });
    }
    async toAttachment(resource) {
        if (isMcpResourceTemplate(resource)) {
            return this._resourceTemplateToAttachment(resource);
        }
        else {
            return this._resourceToAttachment(resource);
        }
    }
    async toURI(resource) {
        if (isMcpResourceTemplate(resource)) {
            const maybeUri = await this._resourceTemplateToURI(resource);
            return maybeUri && await this._verifyUriIfNeeded(maybeUri);
        }
        else {
            return resource.uri;
        }
    }
    async _resourceToAttachment(resource) {
        const asImage = await this._chatAttachmentResolveService.resolveImageEditorAttachContext(resource.uri, undefined, resource.mimeType);
        if (asImage) {
            return asImage;
        }
        return {
            id: resource.uri.toString(),
            kind: 'file',
            name: resource.name,
            value: resource.uri,
        };
    }
    async _resourceTemplateToAttachment(rt) {
        const maybeUri = await this._resourceTemplateToURI(rt);
        const uri = maybeUri && await this._verifyUriIfNeeded(maybeUri);
        return uri && this._resourceToAttachment({
            uri,
            name: rt.name,
            mimeType: rt.mimeType,
        });
    }
    async _verifyUriIfNeeded({ uri, needsVerification }) {
        if (!needsVerification) {
            return uri;
        }
        const exists = await this._fileService.exists(uri);
        if (exists) {
            return uri;
        }
        this._notificationService.warn(localize('mcp.resource.template.notFound', "The resource {0} was not found.", McpResourceURI.toServer(uri).resourceURL.toString()));
        return undefined;
    }
    async _resourceTemplateToURI(rt) {
        const todo = rt.template.components.flatMap(c => typeof c === 'object' ? c.variables : []);
        const quickInput = this._quickInputService.createQuickPick();
        const cts = new CancellationTokenSource();
        const vars = {};
        quickInput.totalSteps = todo.length;
        quickInput.ignoreFocusOut = true;
        let needsVerification = false;
        try {
            for (let i = 0; i < todo.length; i++) {
                const variable = todo[i];
                const resolved = await this._promptForTemplateValue(quickInput, variable, vars, rt);
                if (resolved === undefined) {
                    return undefined;
                }
                // mark the URI as needing verification if any part was not a completion pick
                needsVerification ||= !resolved.completed;
                vars[todo[i].name] = variable.repeatable ? resolved.value.split('/') : resolved.value;
            }
            return { uri: rt.resolveURI(vars), needsVerification };
        }
        finally {
            cts.dispose(true);
            quickInput.dispose();
        }
    }
    _promptForTemplateValue(input, variable, variablesSoFar, rt) {
        const store = new DisposableStore();
        const completions = new Map([]);
        const variablesWithPlaceholders = { ...variablesSoFar };
        for (const variable of rt.template.components.flatMap(c => typeof c === 'object' ? c.variables : [])) {
            if (!variablesWithPlaceholders.hasOwnProperty(variable.name)) {
                variablesWithPlaceholders[variable.name] = `$${variable.name.toUpperCase()}`;
            }
        }
        let placeholder = localize('mcp.resource.template.placeholder', "Value for ${0} in {1}", variable.name.toUpperCase(), rt.template.resolve(variablesWithPlaceholders).replaceAll('%24', '$'));
        if (variable.optional) {
            placeholder += ' (' + localize('mcp.resource.template.optional', "Optional") + ')';
        }
        input.placeholder = placeholder;
        input.value = '';
        input.items = [];
        input.show();
        const currentID = generateUuid();
        const setItems = (value, completed = []) => {
            const items = completed.filter(c => c !== value).map(c => ({ id: c, label: c }));
            if (value) {
                items.unshift({ id: currentID, label: value });
            }
            else if (variable.optional) {
                items.unshift({ id: currentID, label: localize('mcp.resource.template.empty', "<Empty>") });
            }
            input.items = items;
        };
        let changeCancellation = store.add(new CancellationTokenSource());
        const getCompletionItems = () => {
            const inputValue = input.value;
            let promise = completions.get(inputValue);
            if (!promise) {
                promise = rt.complete(variable.name, inputValue, variablesSoFar, changeCancellation.token);
                completions.set(inputValue, promise);
            }
            promise.then(values => {
                if (!changeCancellation.token.isCancellationRequested) {
                    setItems(inputValue, values);
                }
            }).catch(() => {
                completions.delete(inputValue);
            }).finally(() => {
                if (!changeCancellation.token.isCancellationRequested) {
                    input.busy = false;
                }
            });
        };
        const getCompletionItemsScheduler = store.add(new RunOnceScheduler(getCompletionItems, 300));
        return new Promise(resolve => {
            store.add(input.onDidHide(() => resolve(undefined)));
            store.add(input.onDidAccept(() => {
                const item = input.selectedItems[0];
                if (item.id === currentID) {
                    resolve({ value: input.value, completed: false });
                }
                else if (variable.explodable && item.label.endsWith('/') && item.label !== input.value) {
                    // if navigating in a path structure, picking a `/` should let the user pick in a subdirectory
                    input.value = item.label;
                }
                else {
                    resolve({ value: item.label, completed: true });
                }
            }));
            store.add(input.onDidChangeValue(value => {
                input.busy = true;
                changeCancellation.dispose(true);
                store.delete(changeCancellation);
                changeCancellation = store.add(new CancellationTokenSource());
                getCompletionItemsScheduler.cancel();
                setItems(value);
                if (completions.has(input.value)) {
                    getCompletionItems();
                }
                else {
                    getCompletionItemsScheduler.schedule();
                }
            }));
            getCompletionItems();
        }).finally(() => store.dispose());
    }
    getPicks(onChange, token) {
        const cts = new CancellationTokenSource(token);
        const store = new DisposableStore();
        store.add(toDisposable(() => cts.dispose(true)));
        // We try to show everything in-sequence to avoid flickering (#250411) as long as
        // it loads within 5 seconds. Otherwise we just show things as the load in parallel.
        let showInSequence = true;
        store.add(disposableTimeout(() => {
            showInSequence = false;
            publish();
        }, 5_000));
        const publish = () => {
            const output = new Map();
            for (const [server, rec] of servers) {
                const r = [];
                output.set(server, r);
                if (rec.templates.isResolved) {
                    r.push(...rec.templates.value);
                }
                else if (showInSequence) {
                    break;
                }
                r.push(...rec.resourcesSoFar);
                if (!rec.resources.isSettled && showInSequence) {
                    break;
                }
            }
            onChange(output);
        };
        const servers = new Map();
        // Enumerate servers and start servers that need to be started to get capabilities
        return Promise.all((this.explicitServers || this._mcpService.servers.get()).map(async (server) => {
            let cap = server.capabilities.get();
            const rec = {
                templates: new DeferredPromise(),
                resourcesSoFar: [],
                resources: new DeferredPromise(),
            };
            servers.set(server, rec); // always add it to retain order
            if (cap === undefined) {
                cap = await new Promise(resolve => {
                    server.start().then(state => {
                        if (state.state === 3 /* McpConnectionState.Kind.Error */ || state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                            resolve(undefined);
                        }
                    });
                    store.add(cts.token.onCancellationRequested(() => resolve(undefined)));
                    store.add(autorun(reader => {
                        const cap2 = server.capabilities.read(reader);
                        if (cap2 !== undefined) {
                            resolve(cap2);
                        }
                    }));
                });
            }
            if (cap && (cap & 16 /* McpCapability.Resources */)) {
                await Promise.all([
                    rec.templates.settleWith(server.resourceTemplates(cts.token).catch(() => [])).finally(publish),
                    rec.resources.settleWith((async () => {
                        for await (const page of server.resources(cts.token)) {
                            rec.resourcesSoFar = rec.resourcesSoFar.concat(page);
                            publish();
                        }
                    })())
                ]);
            }
            else {
                rec.templates.complete([]);
                rec.resources.complete([]);
            }
            publish();
        })).finally(() => {
            store.dispose();
        });
    }
};
McpResourcePickHelper = __decorate([
    __param(0, IMcpService),
    __param(1, IFileService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IChatAttachmentResolveService)
], McpResourcePickHelper);
export { McpResourcePickHelper };
let AbstractMcpResourceAccessPick = class AbstractMcpResourceAccessPick {
    constructor(_scopeTo, _instantiationService, _editorService, _chatWidgetService, _viewsService) {
        this._scopeTo = _scopeTo;
        this._instantiationService = _instantiationService;
        this._editorService = _editorService;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
    }
    applyToPick(picker, token, runOptions) {
        picker.canAcceptInBackground = true;
        picker.busy = true;
        picker.keepScrollPosition = true;
        const attachButton = localize('mcp.quickaccess.attach', "Attach to chat");
        const helper = this._instantiationService.createInstance(McpResourcePickHelper);
        if (this._scopeTo) {
            helper.explicitServers = [this._scopeTo];
        }
        helper.getPicks(servers => {
            const items = [];
            for (const [server, resources] of servers) {
                items.push(McpResourcePickHelper.sep(server));
                for (const resource of resources) {
                    const pickItem = McpResourcePickHelper.item(resource);
                    pickItem.buttons = [{ iconClass: ThemeIcon.asClassName(Codicon.attach), tooltip: attachButton }];
                    items.push({ ...pickItem, resource });
                }
            }
            picker.items = items;
        }, token).finally(() => {
            picker.busy = false;
        });
        const store = new DisposableStore();
        store.add(picker.onDidTriggerItemButton(event => {
            if (event.button.tooltip === attachButton) {
                picker.busy = true;
                helper.toAttachment(event.item.resource).then(async (a) => {
                    if (a) {
                        const widget = await openPanelChatAndGetWidget(this._viewsService, this._chatWidgetService);
                        widget?.attachmentModel.addContext(a);
                    }
                    picker.hide();
                });
            }
        }));
        store.add(picker.onDidAccept(async (event) => {
            if (!event.inBackground) {
                picker.hide(); // hide picker unless we accept in background
            }
            if (runOptions?.handleAccept) {
                runOptions.handleAccept?.(picker.activeItems[0], event.inBackground);
            }
            else {
                const [item] = picker.selectedItems;
                const uri = await helper.toURI(item.resource);
                if (uri) {
                    this._editorService.openEditor({ resource: uri, options: { preserveFocus: event.inBackground } });
                }
            }
        }));
        return store;
    }
};
AbstractMcpResourceAccessPick = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, IViewsService)
], AbstractMcpResourceAccessPick);
export { AbstractMcpResourceAccessPick };
let McpResourceQuickPick = class McpResourceQuickPick extends AbstractMcpResourceAccessPick {
    constructor(scopeTo, instantiationService, editorService, chatWidgetService, viewsService, _quickInputService) {
        super(scopeTo, instantiationService, editorService, chatWidgetService, viewsService);
        this._quickInputService = _quickInputService;
    }
    async pick(token = CancellationToken.None) {
        const store = new DisposableStore();
        const qp = store.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        qp.placeholder = localize('mcp.quickaccess.placeholder', "Search for resources");
        store.add(this.applyToPick(qp, token));
        store.add(qp.onDidHide(() => store.dispose()));
        qp.show();
        await Event.toPromise(qp.onDidHide);
    }
};
McpResourceQuickPick = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, IViewsService),
    __param(5, IQuickInputService)
], McpResourceQuickPick);
export { McpResourceQuickPick };
let McpResourceQuickAccess = class McpResourceQuickAccess extends AbstractMcpResourceAccessPick {
    static { this.PREFIX = 'mcpr '; }
    constructor(instantiationService, editorService, chatWidgetService, viewsService) {
        super(undefined, instantiationService, editorService, chatWidgetService, viewsService);
        this.defaultFilterValue = DefaultQuickAccessFilterValue.LAST;
    }
    provide(picker, token, runOptions) {
        return this.applyToPick(picker, token, runOptions);
    }
};
McpResourceQuickAccess = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorService),
    __param(2, IChatWidgetService),
    __param(3, IViewsService)
], McpResourceQuickAccess);
export { McpResourceQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwUmVzb3VyY2VRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQXdELE1BQU0sdURBQXVELENBQUM7QUFDNUosT0FBTyxFQUFFLGtCQUFr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