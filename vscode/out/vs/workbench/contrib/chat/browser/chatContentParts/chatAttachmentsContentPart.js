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
import * as dom from '../../../../../base/browser/dom.js';
import { createInstantHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { isElementVariableEntry, isImageVariableEntry, isNotebookOutputVariableEntry, isPasteVariableEntry, isPromptFileVariableEntry, isPromptTextVariableEntry, isSCMHistoryItemVariableEntry } from '../../common/chatVariableEntries.js';
import { ChatResponseReferencePartStatusKind } from '../../common/chatService.js';
import { DefaultChatAttachmentWidget, ElementChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, NotebookCellOutputChatAttachmentWidget, PasteAttachmentWidget, PromptFileAttachmentWidget, PromptTextAttachmentWidget, SCMHistoryItemAttachmentWidget, ToolSetOrToolItemAttachmentWidget } from '../chatAttachmentWidgets.js';
let ChatAttachmentsContentPart = class ChatAttachmentsContentPart extends Disposable {
    constructor(variables, contentReferences = [], domNode = dom.$('.chat-attached-context'), instantiationService) {
        super();
        this.variables = variables;
        this.contentReferences = contentReferences;
        this.domNode = domNode;
        this.instantiationService = instantiationService;
        this.attachedContextDisposables = this._register(new DisposableStore());
        this._onDidChangeVisibility = this._register(new Emitter());
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event }));
        this.initAttachedContext(domNode);
        if (!domNode.childElementCount) {
            this.domNode = undefined;
        }
    }
    initAttachedContext(container) {
        dom.clearNode(container);
        this.attachedContextDisposables.clear();
        const hoverDelegate = this.attachedContextDisposables.add(createInstantHoverDelegate());
        for (const attachment of this.variables) {
            const resource = URI.isUri(attachment.value) ? attachment.value : attachment.value && typeof attachment.value === 'object' && 'uri' in attachment.value && URI.isUri(attachment.value.uri) ? attachment.value.uri : undefined;
            const range = attachment.value && typeof attachment.value === 'object' && 'range' in attachment.value && Range.isIRange(attachment.value.range) ? attachment.value.range : undefined;
            const correspondingContentReference = this.contentReferences.find((ref) => (typeof ref.reference === 'object' && 'variableName' in ref.reference && ref.reference.variableName === attachment.name) || (URI.isUri(ref.reference) && basename(ref.reference.path) === attachment.name));
            const isAttachmentOmitted = correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Omitted;
            const isAttachmentPartialOrOmitted = isAttachmentOmitted || correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Partial;
            let widget;
            if (attachment.kind === 'tool' || attachment.kind === 'toolset') {
                widget = this.instantiationService.createInstance(ToolSetOrToolItemAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isElementVariableEntry(attachment)) {
                widget = this.instantiationService.createInstance(ElementChatAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isImageVariableEntry(attachment)) {
                attachment.omittedState = isAttachmentPartialOrOmitted ? 2 /* OmittedState.Full */ : attachment.omittedState;
                widget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isPromptFileVariableEntry(attachment)) {
                if (attachment.automaticallyAdded) {
                    continue;
                }
                widget = this.instantiationService.createInstance(PromptFileAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isPromptTextVariableEntry(attachment)) {
                if (attachment.automaticallyAdded) {
                    continue;
                }
                widget = this.instantiationService.createInstance(PromptTextAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (resource && (attachment.kind === 'file' || attachment.kind === 'directory')) {
                widget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, correspondingContentReference, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isPasteVariableEntry(attachment)) {
                widget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (resource && isNotebookOutputVariableEntry(attachment)) {
                widget = this.instantiationService.createInstance(NotebookCellOutputChatAttachmentWidget, resource, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else if (isSCMHistoryItemVariableEntry(attachment)) {
                widget = this.instantiationService.createInstance(SCMHistoryItemAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            else {
                widget = this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, correspondingContentReference, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels, hoverDelegate);
            }
            let ariaLabel = null;
            if (isAttachmentPartialOrOmitted) {
                widget.element.classList.add('warning');
            }
            const description = correspondingContentReference?.options?.status?.description;
            if (isAttachmentPartialOrOmitted) {
                ariaLabel = `${ariaLabel}${description ? ` ${description}` : ''}`;
                for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
                    const element = widget.label.element.querySelector(selector);
                    if (element) {
                        element.classList.add('warning');
                    }
                }
            }
            this._register(dom.addDisposableListener(widget.element, 'contextmenu', e => this.contextMenuHandler?.(attachment, e)));
            if (this.attachedContextDisposables.isDisposed) {
                widget.dispose();
                return;
            }
            if (ariaLabel) {
                widget.element.ariaLabel = ariaLabel;
            }
            this.attachedContextDisposables.add(widget);
        }
    }
};
ChatAttachmentsContentPart = __decorate([
    __param(3, IInstantiationService)
], ChatAttachmentsContentPart);
export { ChatAttachmentsContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRBdHRhY2htZW50c0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBNkIsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVBQUUsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsNkJBQTZCLEVBQWdCLE1BQU0scUNBQXFDLENBQUM7QUFDdFIsT0FBTyxFQUFFLG1DQUFtQyxFQUF5QixNQUFNLDZCQUE2QixDQUFDO0FBQ3pHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSwyQkFBMkIsRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxzQ0FB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