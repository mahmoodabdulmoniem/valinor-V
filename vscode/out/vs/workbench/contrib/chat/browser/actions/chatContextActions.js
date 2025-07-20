/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, isThenable } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isObject } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { AbstractGotoSymbolQuickAccessProvider } from '../../../../../editor/contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, isEditorCommandsContext, SideBySideEditor } from '../../../../common/editor.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ExplorerFolderContext } from '../../../files/common/files.js';
import { AnythingQuickAccessProvider } from '../../../search/browser/anythingQuickAccess.js';
import { isSearchTreeFileMatch, isSearchTreeMatch } from '../../../search/browser/searchTreeModel/searchTreeCommon.js';
import { SymbolsQuickAccessProvider } from '../../../search/browser/symbolsQuickAccess.js';
import { SearchContext } from '../../../search/common/constants.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatWidgetService, IQuickChatService, showChatView } from '../chat.js';
import { IChatContextPickService, isChatContextPickerPickItem } from '../chatContextPickService.js';
import { isQuickChat } from '../chatWidget.js';
import { resizeImage } from '../imageUtils.js';
import { registerPromptActions } from '../promptSyntax/promptFileActions.js';
import { CHAT_CATEGORY } from './chatActions.js';
export function registerChatContextActions() {
    registerAction2(AttachContextAction);
    registerAction2(AttachFileToChatAction);
    registerAction2(AttachFolderToChatAction);
    registerAction2(AttachSelectionToChatAction);
    registerAction2(AttachSearchResultAction);
    registerPromptActions();
}
async function withChatView(accessor) {
    const viewsService = accessor.get(IViewsService);
    const chatWidgetService = accessor.get(IChatWidgetService);
    if (chatWidgetService.lastFocusedWidget) {
        return chatWidgetService.lastFocusedWidget;
    }
    return showChatView(viewsService);
}
class AttachResourceAction extends Action2 {
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const widget = await instaService.invokeFunction(withChatView);
        if (!widget) {
            return;
        }
        return instaService.invokeFunction(this.runWithWidget.bind(this), widget, ...args);
    }
    _getResources(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const contexts = isEditorCommandsContext(args[1]) ? this._getEditorResources(accessor, args) : Array.isArray(args[1]) ? args[1] : [args[0]];
        const files = [];
        for (const context of contexts) {
            let uri;
            if (URI.isUri(context)) {
                uri = context;
            }
            else if (isSearchTreeFileMatch(context)) {
                uri = context.resource;
            }
            else if (isSearchTreeMatch(context)) {
                uri = context.parent().resource;
            }
            else if (!context && editorService.activeTextEditorControl) {
                uri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
            }
            if (uri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(uri.scheme)) {
                files.push(uri);
            }
        }
        return files;
    }
    _getEditorResources(accessor, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        return resolvedContext.groupedEditors
            .flatMap(groupedEditor => groupedEditor.editors)
            .map(editor => EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }))
            .filter(uri => uri !== undefined);
    }
}
class AttachFileToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFile'; }
    constructor() {
        super({
            id: AttachFileToChatAction.ID,
            title: localize2('workbench.action.chat.attachFile.label', "Add File to Chat"),
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.enabled,
            f1: true,
            menu: [{
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, SearchContext.FileMatchOrMatchFocusKey, SearchContext.SearchResultHeaderFocused.negate()),
                }, {
                    id: MenuId.ExplorerContext,
                    group: '5_chat',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ExplorerFolderContext.negate(), ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote))),
                }, {
                    id: MenuId.EditorTitleContext,
                    group: '2_chat',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote))),
                }, {
                    id: MenuId.EditorContext,
                    group: '1_chat',
                    order: 2,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote), ResourceContextKey.Scheme.isEqualTo(Schemas.untitled), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData)))
                }]
        });
    }
    async runWithWidget(accessor, widget, ...args) {
        const files = this._getResources(accessor, ...args);
        if (!files.length) {
            return;
        }
        if (widget) {
            widget.focusInput();
            for (const file of files) {
                widget.attachmentModel.addFile(file);
            }
        }
    }
}
class AttachFolderToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFolder'; }
    constructor() {
        super({
            id: AttachFolderToChatAction.ID,
            title: localize2('workbench.action.chat.attachFolder.label', "Add Folder to Chat"),
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ExplorerContext,
                group: '5_chat',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ExplorerFolderContext, ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote)))
            }
        });
    }
    async runWithWidget(accessor, widget, ...args) {
        const folders = this._getResources(accessor, ...args);
        if (!folders.length) {
            return;
        }
        if (widget) {
            widget.focusInput();
            for (const folder of folders) {
                widget.attachmentModel.addFolder(folder);
            }
        }
    }
}
class AttachSelectionToChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.attachSelection'; }
    constructor() {
        super({
            id: AttachSelectionToChatAction.ID,
            title: localize2('workbench.action.chat.attachSelection.label', "Add Selection to Chat"),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.EditorContext,
                group: '1_chat',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote), ResourceContextKey.Scheme.isEqualTo(Schemas.untitled), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData)))
            }
        });
    }
    async run(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const widget = await accessor.get(IInstantiationService).invokeFunction(withChatView);
        if (!widget) {
            return;
        }
        const [_, matches] = args;
        // If we have search matches, it means this is coming from the search widget
        if (matches && matches.length > 0) {
            const uris = new Map();
            for (const match of matches) {
                if (isSearchTreeFileMatch(match)) {
                    uris.set(match.resource, undefined);
                }
                else {
                    const context = { uri: match._parent.resource, range: match._range };
                    const range = uris.get(context.uri);
                    if (!range ||
                        range.startLineNumber !== context.range.startLineNumber && range.endLineNumber !== context.range.endLineNumber) {
                        uris.set(context.uri, context.range);
                        widget.attachmentModel.addFile(context.uri, context.range);
                    }
                }
            }
            // Add the root files for all of the ones that didn't have a match
            for (const uri of uris) {
                const [resource, range] = uri;
                if (!range) {
                    widget.attachmentModel.addFile(resource);
                }
            }
        }
        else {
            const activeEditor = editorService.activeTextEditorControl;
            const activeUri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (activeEditor && activeUri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(activeUri.scheme)) {
                const selection = activeEditor.getSelection();
                if (selection) {
                    widget.focusInput();
                    const range = selection.isEmpty() ? new Range(selection.startLineNumber, 1, selection.startLineNumber + 1, 1) : selection;
                    widget.attachmentModel.addFile(activeUri, range);
                }
            }
        }
    }
}
export class AttachSearchResultAction extends Action2 {
    static { this.Name = 'searchResults'; }
    constructor() {
        super({
            id: 'workbench.action.chat.insertSearchResults',
            title: localize2('chat.insertSearchResults', 'Add Search Results to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [{
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 3,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, SearchContext.SearchResultHeaderFocused),
                }]
        });
    }
    async run(accessor) {
        const logService = accessor.get(ILogService);
        const widget = await accessor.get(IInstantiationService).invokeFunction(withChatView);
        if (!widget) {
            logService.trace('InsertSearchResultAction: no chat view available');
            return;
        }
        const editor = widget.inputEditor;
        const originalRange = editor.getSelection() ?? editor.getModel()?.getFullModelRange().collapseToEnd();
        if (!originalRange) {
            logService.trace('InsertSearchResultAction: no selection');
            return;
        }
        let insertText = `#${AttachSearchResultAction.Name}`;
        const varRange = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.startLineNumber + insertText.length);
        // check character before the start of the range. If it's not a space, add a space
        const model = editor.getModel();
        if (model && model.getValueInRange(new Range(originalRange.startLineNumber, originalRange.startColumn - 1, originalRange.startLineNumber, originalRange.startColumn)) !== ' ') {
            insertText = ' ' + insertText;
        }
        const success = editor.executeEdits('chatInsertSearch', [{ range: varRange, text: insertText + ' ' }]);
        if (!success) {
            logService.trace(`InsertSearchResultAction: failed to insert "${insertText}"`);
            return;
        }
    }
}
function isIContextPickItemItem(obj) {
    return (isObject(obj)
        && typeof obj.kind === 'string'
        && obj.kind === 'contextPick');
}
function isIGotoSymbolQuickPickItem(obj) {
    return (isObject(obj)
        && typeof obj.symbolName === 'string'
        && !!obj.uri
        && !!obj.range);
}
function isIQuickPickItemWithResource(obj) {
    return (isObject(obj)
        && URI.isUri(obj.resource));
}
export class AttachContextAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.attachContext',
            title: localize2('workbench.action.chat.attachContext.label.2', "Add Context..."),
            icon: Codicon.attach,
            category: CHAT_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: {
                when: ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel),
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 3
            },
        });
    }
    async run(accessor, ...args) {
        const instantiationService = accessor.get(IInstantiationService);
        const widgetService = accessor.get(IChatWidgetService);
        const contextKeyService = accessor.get(IContextKeyService);
        const keybindingService = accessor.get(IKeybindingService);
        const contextPickService = accessor.get(IChatContextPickService);
        const context = args[0];
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const quickPickItems = [];
        for (const item of contextPickService.items) {
            if (item.isEnabled && !await item.isEnabled(widget)) {
                continue;
            }
            quickPickItems.push({
                kind: 'contextPick',
                item,
                label: item.label,
                iconClass: ThemeIcon.asClassName(item.icon),
                keybinding: item.commandId ? keybindingService.lookupKeybinding(item.commandId, contextKeyService) : undefined,
            });
        }
        instantiationService.invokeFunction(this._show.bind(this), widget, quickPickItems, context?.placeholder);
    }
    _show(accessor, widget, additionPicks, placeholder) {
        const quickInputService = accessor.get(IQuickInputService);
        const quickChatService = accessor.get(IQuickChatService);
        const instantiationService = accessor.get(IInstantiationService);
        const commandService = accessor.get(ICommandService);
        const providerOptions = {
            additionPicks,
            handleAccept: async (item, isBackgroundAccept) => {
                if (isIContextPickItemItem(item)) {
                    let isDone = true;
                    if (item.item.type === 'valuePick') {
                        this._handleContextPick(item.item, widget);
                    }
                    else if (item.item.type === 'pickerPick') {
                        isDone = await this._handleContextPickerItem(quickInputService, commandService, item.item, widget);
                    }
                    if (!isDone) {
                        // restart picker when sub-picker didn't return anything
                        instantiationService.invokeFunction(this._show.bind(this), widget, additionPicks, placeholder);
                        return;
                    }
                }
                else {
                    instantiationService.invokeFunction(this._handleQPPick.bind(this), widget, isBackgroundAccept, item);
                }
                if (isQuickChat(widget)) {
                    quickChatService.open();
                }
            }
        };
        quickInputService.quickAccess.show('', {
            enabledProviderPrefixes: [
                AnythingQuickAccessProvider.PREFIX,
                SymbolsQuickAccessProvider.PREFIX,
                AbstractGotoSymbolQuickAccessProvider.PREFIX
            ],
            placeholder: placeholder ?? localize('chatContext.attach.placeholder', 'Search attachments'),
            providerOptions,
        });
    }
    async _handleQPPick(accessor, widget, isInBackground, pick) {
        const fileService = accessor.get(IFileService);
        const textModelService = accessor.get(ITextModelService);
        const toAttach = [];
        if (isIQuickPickItemWithResource(pick) && pick.resource) {
            if (/\.(png|jpg|jpeg|bmp|gif|tiff)$/i.test(pick.resource.path)) {
                // checks if the file is an image
                if (URI.isUri(pick.resource)) {
                    // read the image and attach a new file context.
                    const readFile = await fileService.readFile(pick.resource);
                    const resizedImage = await resizeImage(readFile.value.buffer);
                    toAttach.push({
                        id: pick.resource.toString(),
                        name: pick.label,
                        fullName: pick.label,
                        value: resizedImage,
                        kind: 'image',
                        references: [{ reference: pick.resource, kind: 'reference' }]
                    });
                }
            }
            else {
                let omittedState = 0 /* OmittedState.NotOmitted */;
                try {
                    const createdModel = await textModelService.createModelReference(pick.resource);
                    createdModel.dispose();
                }
                catch {
                    omittedState = 2 /* OmittedState.Full */;
                }
                toAttach.push({
                    kind: 'file',
                    id: pick.resource.toString(),
                    value: pick.resource,
                    name: pick.label,
                    omittedState
                });
            }
        }
        else if (isIGotoSymbolQuickPickItem(pick) && pick.uri && pick.range) {
            toAttach.push({
                kind: 'generic',
                id: JSON.stringify({ uri: pick.uri, range: pick.range.decoration }),
                value: { uri: pick.uri, range: pick.range.decoration },
                fullName: pick.label,
                name: pick.symbolName,
            });
        }
        widget.attachmentModel.addContext(...toAttach);
        if (!isInBackground) {
            // Set focus back into the input once the user is done attaching items
            // so that the user can start typing their message
            widget.focusInput();
        }
    }
    async _handleContextPick(item, widget) {
        const value = await item.asAttachment(widget);
        if (Array.isArray(value)) {
            widget.attachmentModel.addContext(...value);
        }
        else if (value) {
            widget.attachmentModel.addContext(value);
        }
    }
    async _handleContextPickerItem(quickInputService, commandService, item, widget) {
        const pickerConfig = item.asPicker(widget);
        const store = new DisposableStore();
        const goBackItem = {
            label: localize('goBack', 'Go back ↩'),
            alwaysShow: true
        };
        const configureItem = pickerConfig.configure ? {
            label: pickerConfig.configure.label,
            commandId: pickerConfig.configure.commandId,
            alwaysShow: true
        } : undefined;
        const extraPicks = [{ type: 'separator' }];
        if (configureItem) {
            extraPicks.push(configureItem);
        }
        extraPicks.push(goBackItem);
        const qp = store.add(quickInputService.createQuickPick({ useSeparators: true }));
        const cts = new CancellationTokenSource();
        store.add(qp.onDidHide(() => cts.cancel()));
        store.add(toDisposable(() => cts.dispose(true)));
        qp.placeholder = pickerConfig.placeholder;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        // qp.ignoreFocusOut = true;
        qp.canAcceptInBackground = true;
        qp.busy = true;
        qp.show();
        if (isThenable(pickerConfig.picks)) {
            const items = await (pickerConfig.picks.then(value => {
                return [].concat(value, extraPicks);
            }));
            qp.items = items;
            qp.busy = false;
        }
        else {
            const query = observableValue('attachContext.query', qp.value);
            store.add(qp.onDidChangeValue(() => query.set(qp.value, undefined)));
            const picksObservable = pickerConfig.picks(query, cts.token);
            store.add(autorun(reader => {
                const { busy, picks } = picksObservable.read(reader);
                qp.items = [].concat(picks, extraPicks);
                qp.busy = busy;
            }));
        }
        if (cts.token.isCancellationRequested) {
            return true; // picker got hidden already
        }
        const defer = new DeferredPromise();
        const addPromises = [];
        store.add(qp.onDidAccept(e => {
            const [selected] = qp.selectedItems;
            if (isChatContextPickerPickItem(selected)) {
                const attachment = selected.asAttachment();
                if (isThenable(attachment)) {
                    addPromises.push(attachment.then(v => widget.attachmentModel.addContext(v)));
                }
                else {
                    widget.attachmentModel.addContext(attachment);
                }
            }
            if (selected === goBackItem) {
                defer.complete(false);
            }
            if (selected === configureItem) {
                defer.complete(true);
                commandService.executeCommand(configureItem.commandId);
            }
            if (!e.inBackground) {
                defer.complete(true);
            }
        }));
        store.add(qp.onDidHide(() => {
            defer.complete(true);
        }));
        try {
            const result = await defer.p;
            qp.busy = true; // if still visible
            await Promise.all(addPromises);
            return result;
        }
        finally {
            store.dispose();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29udGV4dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFDQUFxQyxFQUE0QixNQUFNLDRFQUE0RSxDQUFDO0FBQzdKLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1E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