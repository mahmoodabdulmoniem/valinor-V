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
var ChatEditorInput_1;
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation } from '../common/constants.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
const ChatEditorIcon = registerIcon('chat-editor-label-icon', Codicon.commentDiscussion, nls.localize('chatEditorLabelIcon', 'Icon of the chat editor label.'));
let ChatEditorInput = class ChatEditorInput extends EditorInput {
    static { ChatEditorInput_1 = this; }
    static { this.countsInUse = new Set(); }
    static { this.TypeID = 'workbench.input.chatSession'; }
    static { this.EditorID = 'workbench.editor.chatSession'; }
    static getNewEditorUri() {
        const handle = Math.floor(Math.random() * 1e9);
        return ChatUri.generate(handle);
    }
    static getNextCount() {
        let count = 0;
        while (ChatEditorInput_1.countsInUse.has(count)) {
            count++;
        }
        return count;
    }
    constructor(resource, options, chatService, dialogService) {
        super();
        this.resource = resource;
        this.options = options;
        this.chatService = chatService;
        this.dialogService = dialogService;
        this.closeHandler = this;
        const parsed = ChatUri.parse(resource);
        if (typeof parsed?.handle !== 'number') {
            throw new Error('Invalid chat URI');
        }
        this.sessionId = (options.target && 'sessionId' in options.target) ?
            options.target.sessionId :
            undefined;
        this.inputCount = ChatEditorInput_1.getNextCount();
        ChatEditorInput_1.countsInUse.add(this.inputCount);
        this._register(toDisposable(() => ChatEditorInput_1.countsInUse.delete(this.inputCount)));
    }
    showConfirm() {
        return this.model?.editingSession ? shouldShowClearEditingSessionConfirmation(this.model.editingSession) : false;
    }
    async confirm(editors) {
        if (!this.model?.editingSession) {
            return 0 /* ConfirmResult.SAVE */;
        }
        const titleOverride = nls.localize('chatEditorConfirmTitle', "Close Chat Editor");
        const messageOverride = nls.localize('chat.startEditing.confirmation.pending.message.default', "Closing the chat editor will end your current edit session.");
        const result = await showClearEditingSessionConfirmation(this.model.editingSession, this.dialogService, { titleOverride, messageOverride });
        return result ? 0 /* ConfirmResult.SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    get editorId() {
        return ChatEditorInput_1.EditorID;
    }
    get capabilities() {
        return super.capabilities | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */;
    }
    matches(otherInput) {
        return otherInput instanceof ChatEditorInput_1 && otherInput.resource.toString() === this.resource.toString();
    }
    get typeId() {
        return ChatEditorInput_1.TypeID;
    }
    getName() {
        return this.model?.title || nls.localize('chatEditorName', "Chat") + (this.inputCount > 0 ? ` ${this.inputCount + 1}` : '');
    }
    getIcon() {
        return ChatEditorIcon;
    }
    async resolve() {
        if (typeof this.sessionId === 'string') {
            this.model = await this.chatService.getOrRestoreSession(this.sessionId)
                ?? this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if (!this.options.target) {
            this.model = this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        }
        else if ('data' in this.options.target) {
            this.model = this.chatService.loadSessionFromContent(this.options.target.data);
        }
        if (!this.model) {
            return null;
        }
        this.sessionId = this.model.sessionId;
        this._register(this.model.onDidChange(() => this._onDidChangeLabel.fire()));
        return this._register(new ChatEditorModel(this.model));
    }
    dispose() {
        super.dispose();
        if (this.sessionId) {
            this.chatService.clearSession(this.sessionId);
        }
    }
};
ChatEditorInput = ChatEditorInput_1 = __decorate([
    __param(2, IChatService),
    __param(3, IDialogService)
], ChatEditorInput);
export { ChatEditorInput };
export class ChatEditorModel extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._isDisposed = false;
        this._isResolved = false;
    }
    async resolve() {
        this._isResolved = true;
    }
    isResolved() {
        return this._isResolved;
    }
    isDisposed() {
        return this._isDisposed;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
}
export var ChatUri;
(function (ChatUri) {
    ChatUri.scheme = Schemas.vscodeChatSesssion;
    function generate(handle) {
        return URI.from({ scheme: ChatUri.scheme, path: `chat-${handle}` });
    }
    ChatUri.generate = generate;
    function parse(resource) {
        if (resource.scheme !== ChatUri.scheme) {
            return undefined;
        }
        const match = resource.path.match(/chat-(\d+)/);
        const handleStr = match?.[1];
        if (typeof handleStr !== 'string') {
            return undefined;
        }
        const handle = parseInt(handleStr);
        if (isNaN(handle)) {
            return undefined;
        }
        return { handle };
    }
    ChatUri.parse = parse;
})(ChatUri || (ChatUri = {}));
export class ChatEditorInputSerializer {
    canSerialize(input) {
        return input instanceof ChatEditorInput && typeof input.sessionId === 'string';
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        const obj = {
            options: input.options,
            sessionId: input.sessionId,
            resource: input.resource
        };
        return JSON.stringify(obj);
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const parsed = JSON.parse(serializedEditor);
            const resource = URI.revive(parsed.resource);
            return instantiationService.createInstance(ChatEditorInput, resource, { ...parsed.options, target: { sessionId: parsed.sessionId } });
        }
        catch (err) {
            return undefined;
        }
    }
}
export async function showClearEditingSessionConfirmation(editingSession, dialogService, options) {
    const defaultPhrase = nls.localize('chat.startEditing.confirmation.pending.message.default1', "Starting a new chat will end your current edit session.");
    const defaultTitle = nls.localize('chat.startEditing.confirmation.title', "Start new chat?");
    const phrase = options?.messageOverride ?? defaultPhrase;
    const title = options?.titleOverride ?? defaultTitle;
    const currentEdits = editingSession.entries.get();
    const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
    const { result } = await dialogService.prompt({
        title,
        message: phrase + ' ' + nls.localize('chat.startEditing.confirmation.pending.message.2', "Do you want to keep pending edits to {0} files?", undecidedEdits.length),
        type: 'info',
        cancelButton: true,
        buttons: [
            {
                label: nls.localize('chat.startEditing.confirmation.acceptEdits', "Keep & Continue"),
                run: async () => {
                    await editingSession.accept();
                    return true;
                }
            },
            {
                label: nls.localize('chat.startEditing.confirmation.discardEdits', "Undo & Continue"),
                run: async () => {
                    await editingSession.reject();
                    return true;
                }
            }
        ],
    });
    return Boolean(result);
}
export function shouldShowClearEditingSessionConfirmation(editingSession) {
    const currentEdits = editingSession.entries.get();
    const currentEditCount = currentEdits.length;
    if (currentEditCount) {
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        return !!undecidedEdits.length;
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUF1QixNQUFNLHVDQUF1QyxDQUFDO0FBR3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUMzRCxPQUFPLEVBQWlCLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSS9GLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7QUFFekosSUFBTSxlQUFlLEdBQXJC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