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
var SCMHistoryItemContext_1;
import { coalesce } from '../../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { fromNow } from '../../../../base/common/date.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showChatView } from '../../chat/browser/chat.js';
import { IChatContextPickService, picksWithPromiseFn } from '../../chat/browser/chatContextPickService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ScmHistoryItemResolver } from '../../multiDiffEditor/browser/scmMultiDiffSourceResolver.js';
import { ISCMService, ISCMViewService } from '../common/scm.js';
let SCMHistoryItemContextContribution = class SCMHistoryItemContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chat.scmHistoryItemContextContribution'; }
    constructor(contextPickService, instantiationService, textModelResolverService) {
        super();
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(SCMHistoryItemContext)));
        this._store.add(textModelResolverService.registerTextModelContentProvider(ScmHistoryItemResolver.scheme, instantiationService.createInstance(SCMHistoryItemContextContentProvider)));
    }
};
SCMHistoryItemContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService),
    __param(2, ITextModelService)
], SCMHistoryItemContextContribution);
export { SCMHistoryItemContextContribution };
let SCMHistoryItemContext = SCMHistoryItemContext_1 = class SCMHistoryItemContext {
    static asAttachment(provider, historyItem) {
        const multiDiffSourceUri = ScmHistoryItemResolver.getMultiDiffSourceUri(provider, historyItem);
        const attachmentName = `$(${Codicon.repo.id})\u00A0${provider.name}\u00A0$(${Codicon.gitCommit.id})\u00A0${historyItem.displayId ?? historyItem.id}`;
        return {
            id: historyItem.id,
            name: attachmentName,
            value: multiDiffSourceUri,
            historyItem: {
                ...historyItem,
                references: []
            },
            kind: 'scmHistoryItem'
        };
    }
    constructor(_scmViewService) {
        this._scmViewService = _scmViewService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.scmHistoryItems', 'Source Control...');
        this.icon = Codicon.gitCommit;
        this._delayer = new ThrottledDelayer(200);
    }
    isEnabled(_widget) {
        const activeRepository = this._scmViewService.activeRepository.get();
        return activeRepository?.provider.historyProvider.get() !== undefined;
    }
    asPicker(_widget) {
        return {
            placeholder: localize('chatContext.scmHistoryItems.placeholder', 'Select a change'),
            picks: picksWithPromiseFn((query, token) => {
                const filterText = query.trim() !== '' ? query.trim() : undefined;
                const activeRepository = this._scmViewService.activeRepository.get();
                const historyProvider = activeRepository?.provider.historyProvider.get();
                if (!activeRepository || !historyProvider) {
                    return Promise.resolve([]);
                }
                const historyItemRefs = coalesce([
                    historyProvider.historyItemRef.get(),
                    historyProvider.historyItemRemoteRef.get(),
                    historyProvider.historyItemBaseRef.get(),
                ]).map(ref => ref.id);
                return this._delayer.trigger(() => {
                    return historyProvider.provideHistoryItems({ historyItemRefs, filterText, limit: 100 }, token)
                        .then(historyItems => {
                        if (!historyItems) {
                            return [];
                        }
                        return historyItems.map(historyItem => {
                            const details = [`${historyItem.displayId ?? historyItem.id}`];
                            if (historyItem.author) {
                                details.push(historyItem.author);
                            }
                            if (historyItem.statistics) {
                                details.push(`${historyItem.statistics.files} ${localize('files', 'file(s)')}`);
                            }
                            if (historyItem.timestamp) {
                                details.push(fromNow(historyItem.timestamp, true, true));
                            }
                            return {
                                iconClass: ThemeIcon.asClassName(Codicon.gitCommit),
                                label: historyItem.subject,
                                detail: details.join(`$(${Codicon.circleSmallFilled.id})`),
                                asAttachment: () => SCMHistoryItemContext_1.asAttachment(activeRepository.provider, historyItem)
                            };
                        });
                    });
                });
            })
        };
    }
};
SCMHistoryItemContext = SCMHistoryItemContext_1 = __decorate([
    __param(0, ISCMViewService)
], SCMHistoryItemContext);
let SCMHistoryItemContextContentProvider = class SCMHistoryItemContextContentProvider {
    constructor(_modelService, _scmService) {
        this._modelService = _modelService;
        this._scmService = _scmService;
    }
    async provideTextContent(resource) {
        const uriFields = ScmHistoryItemResolver.parseUri(resource);
        if (!uriFields) {
            return null;
        }
        const textModel = this._modelService.getModel(resource);
        if (textModel) {
            return textModel;
        }
        const { repositoryId, historyItemId } = uriFields;
        const repository = this._scmService.getRepository(repositoryId);
        const historyProvider = repository?.provider.historyProvider.get();
        if (!repository || !historyProvider) {
            return null;
        }
        const historyItemContext = await historyProvider.resolveHistoryItemChatContext(historyItemId);
        if (!historyItemContext) {
            return null;
        }
        return this._modelService.createModel(historyItemContext, null, resource, false);
    }
};
SCMHistoryItemContextContentProvider = __decorate([
    __param(0, IModelService),
    __param(1, ISCMService)
], SCMHistoryItemContextContentProvider);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.addHistoryItemToChat',
            title: localize('chat.action.scmHistoryItemContext', 'Add to Chat'),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryItemContext,
                group: 'z_chat',
                order: 1,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, provider, historyItem) {
        const viewsService = accessor.get(IViewsService);
        const widget = await showChatView(viewsService);
        if (!provider || !historyItem || !widget) {
            return;
        }
        widget.attachmentModel.addContext(SCMHistoryItemContext.asAttachment(provider, historyItem));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.summarizeHistoryItem',
            title: localize('chat.action.scmHistoryItemSummarize', 'Explain Changes'),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryItemContext,
                group: 'z_chat',
                order: 2,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, provider, historyItem) {
        const viewsService = accessor.get(IViewsService);
        const widget = await showChatView(viewsService);
        if (!provider || !historyItem || !widget) {
            return;
        }
        widget.attachmentModel.addContext(SCMHistoryItemContext.asAttachment(provider, historyItem));
        await widget.acceptInput('Summarize the attached history item');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeUNoYXRDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21IaXN0b3J5Q2hhdENvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBRXJILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkUsT0FBTyxFQUFzRCx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9KLE9BQU8s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