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
import * as dom from '../../../../base/browser/dom.js';
import { $ } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../base/common/codicons.js';
import * as event from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename, dirname } from '../../../../base/common/path.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { fillInSymbolsDragData } from '../../../../platform/dnd/browser/dnd.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { FolderThemeIcon, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { revealInSideBarCommand } from '../../files/browser/fileActions.contribution.js';
import { CellUri } from '../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { getHistoryItemEditorTitle, getHistoryItemHoverContent } from '../../scm/browser/util.js';
import { PromptFileVariableKind } from '../common/chatVariableEntries.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { getCleanPromptName } from '../common/promptSyntax/config/promptFileLocations.js';
let AbstractChatAttachmentWidget = class AbstractChatAttachmentWidget extends Disposable {
    get onDidDelete() {
        return this._onDidDelete.event;
    }
    get onDidOpen() {
        return this._onDidOpen.event;
    }
    constructor(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService) {
        super();
        this.attachment = attachment;
        this.options = options;
        this.hoverDelegate = hoverDelegate;
        this.currentLanguageModel = currentLanguageModel;
        this.commandService = commandService;
        this.openerService = openerService;
        this._onDidDelete = this._register(new event.Emitter());
        this._onDidOpen = this._register(new event.Emitter());
        this.element = dom.append(container, $('.chat-attached-context-attachment.show-file-icons'));
        this.label = contextResourceLabels.create(this.element, { supportIcons: true, hoverDelegate, hoverTargetOverride: this.element });
        this._register(this.label);
        this.element.tabIndex = 0;
        this.element.role = 'button';
        // Add middle-click support for removal
        this._register(dom.addDisposableListener(this.element, dom.EventType.AUXCLICK, (e) => {
            if (e.button === 1 /* Middle Button */ && this.options.supportsDeletion && !this.attachment.range) {
                e.preventDefault();
                e.stopPropagation();
                this._onDidDelete.fire(e);
            }
        }));
    }
    modelSupportsVision() {
        return modelSupportsVision(this.currentLanguageModel);
    }
    attachClearButton() {
        if (this.attachment.range || !this.options.supportsDeletion) {
            // no clear button for attachments with ranges because range means
            // referenced from prompt
            return;
        }
        const clearButton = new Button(this.element, {
            supportIcons: true,
            hoverDelegate: this.hoverDelegate,
            title: localize('chat.attachment.clearButton', "Remove from context")
        });
        clearButton.element.tabIndex = -1;
        clearButton.icon = Codicon.close;
        this._register(clearButton);
        this._register(event.Event.once(clearButton.onDidClick)((e) => {
            this._onDidDelete.fire(e);
        }));
        this._register(dom.addStandardDisposableListener(this.element, dom.EventType.KEY_DOWN, e => {
            if (e.keyCode === 1 /* KeyCode.Backspace */ || e.keyCode === 20 /* KeyCode.Delete */) {
                this._onDidDelete.fire(e.browserEvent);
            }
        }));
    }
    addResourceOpenHandlers(resource, range) {
        this.element.style.cursor = 'pointer';
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, async (e) => {
            dom.EventHelper.stop(e, true);
            if (this.attachment.kind === 'directory') {
                await this.openResource(resource, true);
            }
            else {
                await this.openResource(resource, false, range);
            }
        }));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, async (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                if (this.attachment.kind === 'directory') {
                    await this.openResource(resource, true);
                }
                else {
                    await this.openResource(resource, false, range);
                }
            }
        }));
    }
    async openResource(resource, isDirectory, range) {
        if (isDirectory) {
            // Reveal Directory in explorer
            this.commandService.executeCommand(revealInSideBarCommand.id, resource);
            return;
        }
        // Open file in editor
        const openTextEditorOptions = range ? { selection: range } : undefined;
        const options = {
            fromUserGesture: true,
            editorOptions: { ...openTextEditorOptions, preserveFocus: true },
        };
        await this.openerService.open(resource, options);
        this._onDidOpen.fire();
        this.element.focus();
    }
};
AbstractChatAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService)
], AbstractChatAttachmentWidget);
function modelSupportsVision(currentLanguageModel) {
    return currentLanguageModel?.metadata.capabilities?.vision ?? false;
}
let FileAttachmentWidget = class FileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, correspondingContentReference, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, themeService, hoverService, languageModelsService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.instantiationService = instantiationService;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        let ariaLabel = range ? localize('chat.fileAttachmentWithRange', "Attached file, {0}, line {1} to line {2}", friendlyName, range.startLineNumber, range.endLineNumber) : localize('chat.fileAttachment', "Attached file, {0}", friendlyName);
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedFileAttachment', "Omitted this file: {0}", attachment.name);
            this.renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate);
        }
        else {
            const fileOptions = { hidePath: true, title: correspondingContentReference?.options?.status?.description };
            this.label.setFile(resource, attachment.kind === 'file' ? {
                ...fileOptions,
                fileKind: FileKind.FILE,
                range,
            } : {
                ...fileOptions,
                fileKind: FileKind.FOLDER,
                icon: !this.themeService.getFileIconTheme().hasFolderIcons ? FolderThemeIcon : undefined
            });
        }
        this.element.ariaLabel = ariaLabel;
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, range);
        this.attachClearButton();
    }
    renderOmittedWarning(friendlyName, ariaLabel, hoverDelegate) {
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-warning'));
        const textLabel = dom.$('span.chat-attached-context-custom-text', {}, friendlyName);
        this.element.appendChild(pillIcon);
        this.element.appendChild(textLabel);
        const hoverElement = dom.$('div.chat-attached-context-hover');
        hoverElement.setAttribute('aria-label', ariaLabel);
        this.element.classList.add('warning');
        hoverElement.textContent = localize('chat.fileAttachmentHover', "{0} does not support this file type.", this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name : this.currentLanguageModel ?? 'This model');
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverElement, { trapFocus: true }));
    }
};
FileAttachmentWidget = __decorate([
    __param(9, ICommandService),
    __param(10, IOpenerService),
    __param(11, IThemeService),
    __param(12, IHoverService),
    __param(13, ILanguageModelsService),
    __param(14, IInstantiationService)
], FileAttachmentWidget);
export { FileAttachmentWidget };
let ImageAttachmentWidget = class ImageAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, languageModelsService, telemetryService, instantiationService, labelService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.telemetryService = telemetryService;
        this.labelService = labelService;
        let ariaLabel;
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedImageAttachment', "Omitted this image: {0}", attachment.name);
        }
        else if (attachment.omittedState === 1 /* OmittedState.Partial */) {
            ariaLabel = localize('chat.partiallyOmittedImageAttachment', "Partially omitted this image: {0}", attachment.name);
        }
        else {
            ariaLabel = localize('chat.imageAttachment', "Attached image, {0}", attachment.name);
        }
        const ref = attachment.references?.[0]?.reference;
        resource = ref && URI.isUri(ref) ? ref : undefined;
        const clickHandler = async () => {
            if (resource) {
                await this.openResource(resource, false, undefined);
            }
        };
        const currentLanguageModelName = this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name ?? this.currentLanguageModel.identifier : 'unknown';
        const supportsVision = this.modelSupportsVision();
        this.telemetryService.publicLog2('copilot.attachImage', {
            currentModel: currentLanguageModelName,
            supportsVision: supportsVision
        });
        const fullName = resource ? this.labelService.getUriLabel(resource) : (attachment.fullName || attachment.name);
        this._register(createImageElements(resource, attachment.name, fullName, this.element, attachment.value, this.hoverService, ariaLabel, currentLanguageModelName, clickHandler, this.currentLanguageModel, attachment.omittedState));
        if (resource) {
            this.addResourceOpenHandlers(resource, undefined);
            instantiationService.invokeFunction(accessor => {
                this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
            });
        }
        this.attachClearButton();
    }
};
ImageAttachmentWidget = __decorate([
    __param(7, ICommandService),
    __param(8, IOpenerService),
    __param(9, IHoverService),
    __param(10, ILanguageModelsService),
    __param(11, ITelemetryService),
    __param(12, IInstantiationService),
    __param(13, ILabelService)
], ImageAttachmentWidget);
export { ImageAttachmentWidget };
function createImageElements(resource, name, fullName, element, buffer, hoverService, ariaLabel, currentLanguageModelName, clickHandler, currentLanguageModel, omittedState) {
    const disposable = new DisposableStore();
    if (omittedState === 1 /* OmittedState.Partial */) {
        element.classList.add('partial-warning');
    }
    element.ariaLabel = ariaLabel;
    element.style.position = 'relative';
    if (resource) {
        element.style.cursor = 'pointer';
        disposable.add(dom.addDisposableListener(element, 'click', clickHandler));
    }
    const supportsVision = modelSupportsVision(currentLanguageModel);
    const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$(supportsVision ? 'span.codicon.codicon-file-media' : 'span.codicon.codicon-warning'));
    const textLabel = dom.$('span.chat-attached-context-custom-text', {}, name);
    element.appendChild(pillIcon);
    element.appendChild(textLabel);
    const hoverElement = dom.$('div.chat-attached-context-hover');
    hoverElement.setAttribute('aria-label', ariaLabel);
    if ((!supportsVision && currentLanguageModel) || omittedState === 2 /* OmittedState.Full */) {
        element.classList.add('warning');
        hoverElement.textContent = localize('chat.imageAttachmentHover', "{0} does not support images.", currentLanguageModelName ?? 'This model');
        disposable.add(hoverService.setupDelayedHover(element, { content: hoverElement, appearance: { showPointer: true } }));
    }
    else {
        disposable.add(hoverService.setupDelayedHover(element, { content: hoverElement, appearance: { showPointer: true } }));
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const pillImg = dom.$('img.chat-attached-context-pill-image', { src: url, alt: '' });
        const pill = dom.$('div.chat-attached-context-pill', {}, pillImg);
        const existingPill = element.querySelector('.chat-attached-context-pill');
        if (existingPill) {
            existingPill.replaceWith(pill);
        }
        const hoverImage = dom.$('img.chat-attached-context-image', { src: url, alt: '' });
        const imageContainer = dom.$('div.chat-attached-context-image-container', {}, hoverImage);
        hoverElement.appendChild(imageContainer);
        if (resource) {
            const urlContainer = dom.$('a.chat-attached-context-url', {}, omittedState === 1 /* OmittedState.Partial */ ? localize('chat.imageAttachmentWarning', "This GIF was partially omitted - current frame will be sent.") : fullName);
            const separator = dom.$('div.chat-attached-context-url-separator');
            disposable.add(dom.addDisposableListener(urlContainer, 'click', () => clickHandler()));
            hoverElement.append(separator, urlContainer);
        }
        hoverImage.onload = () => { URL.revokeObjectURL(url); };
        hoverImage.onerror = () => {
            // reset to original icon on error or invalid image
            const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-file-media'));
            const pill = dom.$('div.chat-attached-context-pill', {}, pillIcon);
            const existingPill = element.querySelector('.chat-attached-context-pill');
            if (existingPill) {
                existingPill.replaceWith(pill);
            }
        };
    }
    return disposable;
}
let PasteAttachmentWidget = class PasteAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        const ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        const classNames = ['file-icon', `${attachment.language}-lang-file-icon`];
        let resource;
        let range;
        if (attachment.copiedFrom) {
            resource = attachment.copiedFrom.uri;
            range = attachment.copiedFrom.range;
            const filename = basename(resource.path);
            this.label.setLabel(filename, undefined, { extraClasses: classNames });
        }
        else {
            this.label.setLabel(attachment.fileName, undefined, { extraClasses: classNames });
        }
        this.element.appendChild(dom.$('span.attachment-additional-info', {}, `Pasted ${attachment.pastedLines}`));
        this.element.style.position = 'relative';
        const sourceUri = attachment.copiedFrom?.uri;
        const hoverContent = {
            markdown: {
                value: `${sourceUri ? this.instantiationService.invokeFunction(accessor => accessor.get(ILabelService).getUriLabel(sourceUri, { relative: true })) : attachment.fileName}\n\n---\n\n\`\`\`${attachment.language}\n\n${attachment.code}\n\`\`\``,
            },
            markdownNotSupportedFallback: attachment.code,
        };
        this._register(this.hoverService.setupManagedHover(hoverDelegate, this.element, hoverContent, { trapFocus: true }));
        const copiedFromResource = attachment.copiedFrom?.uri;
        if (copiedFromResource) {
            this._register(this.instantiationService.invokeFunction(hookUpResourceAttachmentDragAndContextMenu, this.element, copiedFromResource));
            this.addResourceOpenHandlers(copiedFromResource, range);
        }
        this.attachClearButton();
    }
};
PasteAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IHoverService),
    __param(9, IInstantiationService)
], PasteAttachmentWidget);
export { PasteAttachmentWidget };
let DefaultChatAttachmentWidget = class DefaultChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, range, attachment, correspondingContentReference, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, contextKeyService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.contextKeyService = contextKeyService;
        this.instantiationService = instantiationService;
        const attachmentLabel = attachment.fullName ?? attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        this.label.setLabel(withIcon, correspondingContentReference?.options?.status?.description);
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        if (attachment.kind === 'diagnostic') {
            if (attachment.filterUri) {
                resource = attachment.filterUri ? URI.revive(attachment.filterUri) : undefined;
                range = attachment.filterRange;
            }
            else {
                this.element.style.cursor = 'pointer';
                this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, () => {
                    this.commandService.executeCommand('workbench.panel.markers.view.focus');
                }));
            }
        }
        if (attachment.kind === 'symbol') {
            const scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            this._register(this.instantiationService.invokeFunction(hookUpSymbolAttachmentDragAndContextMenu, this.element, scopedContextKeyService, { ...attachment, kind: attachment.symbolKind }, MenuId.ChatInputSymbolAttachmentContext));
        }
        if (resource) {
            this.addResourceOpenHandlers(resource, range);
        }
        this.attachClearButton();
    }
};
DefaultChatAttachmentWidget = __decorate([
    __param(9, ICommandService),
    __param(10, IOpenerService),
    __param(11, IContextKeyService),
    __param(12, IInstantiationService)
], DefaultChatAttachmentWidget);
export { DefaultChatAttachmentWidget };
let PromptFileAttachmentWidget = class PromptFileAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, labelService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.hintElement = dom.append(this.element, dom.$('span.prompt-type'));
        this.updateLabel(attachment);
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, attachment.value));
        });
        this.addResourceOpenHandlers(attachment.value, undefined);
        this.attachClearButton();
    }
    updateLabel(attachment) {
        const resource = attachment.value;
        const fileBasename = basename(resource.path);
        const fileDirname = dirname(resource.path);
        const friendlyName = `${fileBasename} ${fileDirname}`;
        const isPrompt = attachment.id.startsWith(PromptFileVariableKind.PromptFile);
        const ariaLabel = isPrompt
            ? localize('chat.promptAttachment', "Prompt file, {0}", friendlyName)
            : localize('chat.instructionsAttachment', "Instructions attachment, {0}", friendlyName);
        const typeLabel = isPrompt
            ? localize('prompt', "Prompt")
            : localize('instructions', "Instructions");
        const title = this.labelService.getUriLabel(resource) + (attachment.originLabel ? `\n${attachment.originLabel}` : '');
        //const { topError } = this.promptFile;
        this.element.classList.remove('warning', 'error');
        // if there are some errors/warning during the process of resolving
        // attachment references (including all the nested child references),
        // add the issue details in the hover title for the attachment, one
        // error/warning at a time because there is a limited space available
        // if (topError) {
        // 	const { errorSubject: subject } = topError;
        // 	const isError = (subject === 'root');
        // 	this.element.classList.add((isError) ? 'error' : 'warning');
        // 	const severity = (isError)
        // 		? localize('error', "Error")
        // 		: localize('warning', "Warning");
        // 	title += `\n[${severity}]: ${topError.localizedMessage}`;
        // }
        const fileWithoutExtension = getCleanPromptName(resource);
        this.label.setFile(URI.file(fileWithoutExtension), {
            fileKind: FileKind.FILE,
            hidePath: true,
            range: undefined,
            title,
            icon: ThemeIcon.fromId(Codicon.bookmark.id),
            extraClasses: [],
        });
        this.hintElement.innerText = typeLabel;
        this.element.ariaLabel = ariaLabel;
    }
};
PromptFileAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, ILabelService),
    __param(9, IInstantiationService)
], PromptFileAttachmentWidget);
export { PromptFileAttachmentWidget };
let PromptTextAttachmentWidget = class PromptTextAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, preferencesService, hoverService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        if (attachment.settingId) {
            const openSettings = () => preferencesService.openSettings({ jsonEditor: false, query: `@id:${attachment.settingId}` });
            this.element.style.cursor = 'pointer';
            this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, async (e) => {
                dom.EventHelper.stop(e, true);
                openSettings();
            }));
            this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, async (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                    dom.EventHelper.stop(e, true);
                    openSettings();
                }
            }));
        }
        this.label.setLabel(localize('instructions.label', 'Additional Instructions'), undefined, undefined);
        this._register(hoverService.setupManagedHover(hoverDelegate, this.element, attachment.value, { trapFocus: true }));
    }
};
PromptTextAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IPreferencesService),
    __param(9, IHoverService)
], PromptTextAttachmentWidget);
export { PromptTextAttachmentWidget };
let ToolSetOrToolItemAttachmentWidget = class ToolSetOrToolItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, toolsService, commandService, openerService, hoverService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        const toolOrToolSet = Iterable.find(toolsService.getTools(), tool => tool.id === attachment.id) ?? Iterable.find(toolsService.toolSets.get(), toolSet => toolSet.id === attachment.id);
        let name = attachment.name;
        const icon = attachment.icon ?? Codicon.tools;
        if (toolOrToolSet instanceof ToolSet) {
            name = toolOrToolSet.referenceName;
        }
        else if (toolOrToolSet) {
            name = toolOrToolSet.toolReferenceName ?? name;
        }
        this.label.setLabel(`$(${icon.id})\u00A0${name}`, undefined);
        this.element.style.cursor = 'pointer';
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", name);
        let hoverContent;
        if (toolOrToolSet instanceof ToolSet) {
            hoverContent = localize('toolset', "{0} - {1}", toolOrToolSet.description ?? toolOrToolSet.referenceName, toolOrToolSet.source.label);
        }
        else if (toolOrToolSet) {
            hoverContent = localize('tool', "{0} - {1}", toolOrToolSet.userDescription ?? toolOrToolSet.modelDescription, toolOrToolSet.source.label);
        }
        if (hoverContent) {
            this._register(hoverService.setupManagedHover(hoverDelegate, this.element, hoverContent, { trapFocus: true }));
        }
        this.attachClearButton();
    }
};
ToolSetOrToolItemAttachmentWidget = __decorate([
    __param(6, ILanguageModelToolsService),
    __param(7, ICommandService),
    __param(8, IOpenerService),
    __param(9, IHoverService)
], ToolSetOrToolItemAttachmentWidget);
export { ToolSetOrToolItemAttachmentWidget };
let NotebookCellOutputChatAttachmentWidget = class NotebookCellOutputChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(resource, attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, hoverService, languageModelsService, notebookService, instantiationService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.hoverService = hoverService;
        this.languageModelsService = languageModelsService;
        this.notebookService = notebookService;
        this.instantiationService = instantiationService;
        switch (attachment.mimeType) {
            case 'application/vnd.code.notebook.error': {
                this.renderErrorOutput(resource, attachment);
                break;
            }
            case 'image/png':
            case 'image/jpeg':
            case 'image/svg': {
                this.renderImageOutput(resource, attachment);
                break;
            }
            default: {
                this.renderGenericOutput(resource, attachment);
            }
        }
        this.instantiationService.invokeFunction(accessor => {
            this._register(hookUpResourceAttachmentDragAndContextMenu(accessor, this.element, resource));
        });
        this.addResourceOpenHandlers(resource, undefined);
        this.attachClearButton();
    }
    getAriaLabel(attachment) {
        return localize('chat.NotebookImageAttachment', "Attached Notebook output, {0}", attachment.name);
    }
    renderErrorOutput(resource, attachment) {
        const attachmentLabel = attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        const buffer = this.getOutputItem(resource, attachment)?.data.buffer ?? new Uint8Array();
        let title = undefined;
        try {
            const error = JSON.parse(new TextDecoder().decode(buffer));
            if (error.name && error.message) {
                title = `${error.name}: ${error.message}`;
            }
        }
        catch {
            //
        }
        this.label.setLabel(withIcon, undefined, { title });
        this.element.ariaLabel = this.getAriaLabel(attachment);
    }
    renderGenericOutput(resource, attachment) {
        this.element.ariaLabel = this.getAriaLabel(attachment);
        this.label.setFile(resource, { hidePath: true, icon: ThemeIcon.fromId('output') });
    }
    renderImageOutput(resource, attachment) {
        let ariaLabel;
        if (attachment.omittedState === 2 /* OmittedState.Full */) {
            ariaLabel = localize('chat.omittedNotebookImageAttachment', "Omitted this Notebook ouput: {0}", attachment.name);
        }
        else if (attachment.omittedState === 1 /* OmittedState.Partial */) {
            ariaLabel = localize('chat.partiallyOmittedNotebookImageAttachment', "Partially omitted this Notebook output: {0}", attachment.name);
        }
        else {
            ariaLabel = this.getAriaLabel(attachment);
        }
        const clickHandler = async () => await this.openResource(resource, false, undefined);
        const currentLanguageModelName = this.currentLanguageModel ? this.languageModelsService.lookupLanguageModel(this.currentLanguageModel.identifier)?.name ?? this.currentLanguageModel.identifier : undefined;
        const buffer = this.getOutputItem(resource, attachment)?.data.buffer ?? new Uint8Array();
        this._register(createImageElements(resource, attachment.name, attachment.name, this.element, buffer, this.hoverService, ariaLabel, currentLanguageModelName, clickHandler, this.currentLanguageModel, attachment.omittedState));
    }
    getOutputItem(resource, attachment) {
        const parsedInfo = CellUri.parseCellOutputUri(resource);
        if (!parsedInfo || typeof parsedInfo.cellHandle !== 'number' || typeof parsedInfo.outputIndex !== 'number') {
            return undefined;
        }
        const notebook = this.notebookService.getNotebookTextModel(parsedInfo.notebook);
        if (!notebook) {
            return undefined;
        }
        const cell = notebook.cells.find(c => c.handle === parsedInfo.cellHandle);
        if (!cell) {
            return undefined;
        }
        const output = cell.outputs.length > parsedInfo.outputIndex ? cell.outputs[parsedInfo.outputIndex] : undefined;
        return output?.outputs.find(o => o.mime === attachment.mimeType);
    }
};
NotebookCellOutputChatAttachmentWidget = __decorate([
    __param(7, ICommandService),
    __param(8, IOpenerService),
    __param(9, IHoverService),
    __param(10, ILanguageModelsService),
    __param(11, INotebookService),
    __param(12, IInstantiationService)
], NotebookCellOutputChatAttachmentWidget);
export { NotebookCellOutputChatAttachmentWidget };
let ElementChatAttachmentWidget = class ElementChatAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, openerService, editorService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        const ariaLabel = localize('chat.elementAttachment', "Attached element, {0}", attachment.name);
        this.element.ariaLabel = ariaLabel;
        this.element.style.position = 'relative';
        this.element.style.cursor = 'pointer';
        const attachmentLabel = attachment.name;
        const withIcon = attachment.icon?.id ? `$(${attachment.icon.id})\u00A0${attachmentLabel}` : attachmentLabel;
        this.label.setLabel(withIcon, undefined, { title: localize('chat.clickToViewContents', "Click to view the contents of: {0}", attachmentLabel) });
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, async () => {
            const content = attachment.value?.toString() || '';
            await editorService.openEditor({
                resource: undefined,
                contents: content,
                options: {
                    pinned: true
                }
            });
        }));
        this.attachClearButton();
    }
};
ElementChatAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IOpenerService),
    __param(8, IEditorService)
], ElementChatAttachmentWidget);
export { ElementChatAttachmentWidget };
let SCMHistoryItemAttachmentWidget = class SCMHistoryItemAttachmentWidget extends AbstractChatAttachmentWidget {
    constructor(attachment, currentLanguageModel, options, container, contextResourceLabels, hoverDelegate, commandService, hoverService, openerService, themeService) {
        super(attachment, options, container, contextResourceLabels, hoverDelegate, currentLanguageModel, commandService, openerService);
        this.label.setLabel(attachment.name, undefined);
        this.element.style.cursor = 'pointer';
        this.element.ariaLabel = localize('chat.attachment', "Attached context, {0}", attachment.name);
        this._store.add(hoverService.setupManagedHover(hoverDelegate, this.element, () => getHistoryItemHoverContent(themeService, attachment.historyItem), { trapFocus: true }));
        this._store.add(dom.addDisposableListener(this.element, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e, true);
            this._openAttachment(attachment);
        }));
        this._store.add(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e, true);
                this._openAttachment(attachment);
            }
        }));
        this.attachClearButton();
    }
    async _openAttachment(attachment) {
        await this.commandService.executeCommand('_workbench.openMultiDiffEditor', {
            title: getHistoryItemEditorTitle(attachment.historyItem), multiDiffSourceUri: attachment.value
        });
    }
};
SCMHistoryItemAttachmentWidget = __decorate([
    __param(6, ICommandService),
    __param(7, IHoverService),
    __param(8, IOpenerService),
    __param(9, IThemeService)
], SCMHistoryItemAttachmentWidget);
export { SCMHistoryItemAttachmentWidget };
export function hookUpResourceAttachmentDragAndContextMenu(accessor, widget, resource) {
    const contextKeyService = accessor.get(IContextKeyService);
    const instantiationService = accessor.get(IInstantiationService);
    const store = new DisposableStore();
    // Context
    const scopedContextKeyService = store.add(contextKeyService.createScoped(widget));
    store.add(setResourceContext(accessor, scopedContextKeyService, resource));
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [resource], e));
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, MenuId.ChatInputResourceAttachmentContext, resource));
    return store;
}
export function hookUpSymbolAttachmentDragAndContextMenu(accessor, widget, scopedContextKeyService, attachment, contextMenuId) {
    const instantiationService = accessor.get(IInstantiationService);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const textModelService = accessor.get(ITextModelService);
    const store = new DisposableStore();
    // Context
    store.add(setResourceContext(accessor, scopedContextKeyService, attachment.value.uri));
    const chatResourceContext = chatAttachmentResourceContextKey.bindTo(scopedContextKeyService);
    chatResourceContext.set(attachment.value.uri.toString());
    // Drag and drop
    widget.draggable = true;
    store.add(dom.addDisposableListener(widget, 'dragstart', e => {
        instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [{ resource: attachment.value.uri, selection: attachment.value.range }], e));
        fillInSymbolsDragData([{
                fsPath: attachment.value.uri.fsPath,
                range: attachment.value.range,
                name: attachment.name,
                kind: attachment.kind,
            }], e);
        e.dataTransfer?.setDragImage(widget, 0, 0);
    }));
    // Context menu
    const providerContexts = [
        [EditorContextKeys.hasDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.definitionProvider],
        [EditorContextKeys.hasReferenceProvider.bindTo(scopedContextKeyService), languageFeaturesService.referenceProvider],
        [EditorContextKeys.hasImplementationProvider.bindTo(scopedContextKeyService), languageFeaturesService.implementationProvider],
        [EditorContextKeys.hasTypeDefinitionProvider.bindTo(scopedContextKeyService), languageFeaturesService.typeDefinitionProvider],
    ];
    const updateContextKeys = async () => {
        const modelRef = await textModelService.createModelReference(attachment.value.uri);
        try {
            const model = modelRef.object.textEditorModel;
            for (const [contextKey, registry] of providerContexts) {
                contextKey.set(registry.has(model));
            }
        }
        finally {
            modelRef.dispose();
        }
    };
    store.add(addBasicContextMenu(accessor, widget, scopedContextKeyService, contextMenuId, attachment.value, updateContextKeys));
    return store;
}
function setResourceContext(accessor, scopedContextKeyService, resource) {
    const fileService = accessor.get(IFileService);
    const languageService = accessor.get(ILanguageService);
    const modelService = accessor.get(IModelService);
    const resourceContextKey = new ResourceContextKey(scopedContextKeyService, fileService, languageService, modelService);
    resourceContextKey.set(resource);
    return resourceContextKey;
}
function addBasicContextMenu(accessor, widget, scopedContextKeyService, menuId, arg, updateContextKeys) {
    const contextMenuService = accessor.get(IContextMenuService);
    const menuService = accessor.get(IMenuService);
    return dom.addDisposableListener(widget, dom.EventType.CONTEXT_MENU, async (domEvent) => {
        const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
        dom.EventHelper.stop(domEvent, true);
        try {
            await updateContextKeys?.();
        }
        catch (e) {
            console.error(e);
        }
        contextMenuService.showContextMenu({
            contextKeyService: scopedContextKeyService,
            getAnchor: () => event,
            getActions: () => {
                const menu = menuService.getMenuActions(menuId, scopedContextKeyService, { arg });
                return getFlatContextMenuActions(menu);
            },
        });
    });
}
export const chatAttachmentResourceContextKey = new RawContextKey('chatAttachmentResource', undefined, { type: 'URI', description: localize('resource', "The full value of the chat attachment resource, including scheme and path") });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEF0dGFjaG1lbnRXaWRnZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQWUsa0JBQWtCLEVBQTRCLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hKLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBdUIsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFbEcsT0FBTyxFQUFtUSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNVLE9BQU8sRUFBMkMsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFMUYsSUFBZSw0QkFBNEIsR0FBM0MsTUFBZSw0QkFBNkIsU0FBUSxVQUFVO0lBSzdELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQUdELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVELFlBQ2tCLFVBQXFDLEVBQ3JDLE9BQXVFLEVBQ3hGLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNsQixhQUE2QixFQUM3QixvQkFBeUUsRUFDM0UsY0FBa0QsRUFDbkQsYUFBZ0Q7UUFFaEUsS0FBSyxFQUFFLENBQUM7UUFUUyxlQUFVLEdBQVYsVUFBVSxDQUEyQjtRQUNyQyxZQUFPLEdBQVAsT0FBTyxDQUFnRTtRQUdyRSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFxRDtRQUN4RCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBbEJoRCxpQkFBWSxHQUF5QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBUyxDQUFDLENBQUM7UUFLaEYsZUFBVSxHQUF3QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFnQjVGLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLG1EQUFtRCxDQUFDLENBQUMsQ0FBQztRQUM3RixJQUFJLENBQUMsS0FBSyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDbEksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztRQUU3Qix1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQ2hHLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsbUJBQW1CLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ25HLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyxtQkFBbUI7UUFDNUIsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRVMsaUJBQWlCO1FBRTFCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDN0Qsa0VBQWtFO1lBQ2xFLHlCQUF5QjtZQUN6QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDNUMsWUFBWSxFQUFFLElBQUk7WUFDbEIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLEtBQUssRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUscUJBQXFCLENBQUM7U0FDckUsQ0FBQyxDQUFDO1FBQ0gsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbEMsV0FBVyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM3RCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMxRixJQUFJLENBQUMsQ0FBQyxPQUFPLDhCQUFzQixJQUFJLENBQUMsQ0FBQyxPQUFPLDRCQUFtQixFQUFFLENBQUM7Z0JBQ3JFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFUyx1QkFBdUIsQ0FBQyxRQUFhLEVBQUUsS0FBeUI7UUFDekUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFhLEVBQUUsRUFBRTtZQUNuRyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFnQixFQUFFLEVBQUU7WUFDekcsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQyxJQUFJLEtBQUssQ0FBQyxNQUFNLHVCQUFlLElBQUksS0FBSyxDQUFDLE1BQU0sd0JBQWUsRUFBRSxDQUFDO2dCQUNoRSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzlCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7b0JBQzFDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDakQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUlTLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBYSxFQUFFLFdBQXFCLEVBQUUsS0FBYztRQUNoRixJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLCtCQUErQjtZQUMvQixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDeEUsT0FBTztRQUNSLENBQUM7UUFFRCxzQkFBc0I7UUFDdEIsTUFBTSxxQkFBcUIsR0FBbUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3ZHLE1BQU0sT0FBTyxHQUF3QjtZQUNwQyxlQUFlLEVBQUUsSUFBSTtZQUNyQixhQUFhLEVBQUUsRUFBRSxHQUFHLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUU7U0FDaEUsQ0FBQztRQUNGLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0NBQ0QsQ0FBQTtBQWxIYyw0QkFBNEI7SUFxQnhDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7R0F0QkYsNEJBQTRCLENBa0gxQztBQUVELFNBQVMsbUJBQW1CLENBQUMsb0JBQXlFO0lBQ3JHLE9BQU8sb0JBQW9CLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDO0FBQ3JFLENBQUM7QUFFTSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLDRCQUE0QjtJQUVyRSxZQUNDLFFBQWEsRUFDYixLQUF5QixFQUN6QixVQUFxQyxFQUNyQyw2QkFBZ0UsRUFDaEUsb0JBQXlFLEVBQ3pFLE9BQXVFLEVBQ3ZFLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2hDLGFBQTZCLEVBQ2IsWUFBMkIsRUFDM0IsWUFBMkIsRUFDbEIscUJBQTZDLEVBQzlDLG9CQUEyQztRQUVuRixLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUxqRyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNsQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQzlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sWUFBWSxHQUFHLEdBQUcsWUFBWSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3RELElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLDBDQUEwQyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRTdPLElBQUksVUFBVSxDQUFDLFlBQVksOEJBQXNCLEVBQUUsQ0FBQztZQUNuRCxTQUFTLEdBQUcsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHdCQUF3QixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sV0FBVyxHQUFzQixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLDZCQUE2QixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDOUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDekQsR0FBRyxXQUFXO2dCQUNkLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDdkIsS0FBSzthQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNILEdBQUcsV0FBVztnQkFDZCxRQUFRLEVBQUUsUUFBUSxDQUFDLE1BQU07Z0JBQ3pCLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUN4RixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBRW5DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzlGLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU5QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sb0JBQW9CLENBQUMsWUFBb0IsRUFBRSxTQUFpQixFQUFFLGFBQTZCO1FBQ2xHLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXBDLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUM5RCxZQUFZLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFdEMsWUFBWSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsc0NBQXNDLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixJQUFJLFlBQVksQ0FBQyxDQUFDO1FBQzVRLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JILENBQUM7Q0FDRCxDQUFBO0FBakVZLG9CQUFvQjtJQVk5QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxxQkFBcUIsQ0FBQTtHQWpCWCxvQkFBb0IsQ0FpRWhDOztBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsNEJBQTRCO0lBRXRFLFlBQ0MsUUFBeUIsRUFDekIsVUFBcUMsRUFDckMsb0JBQXlFLEVBQ3pFLE9BQXVFLEVBQ3ZFLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2hDLGFBQTZCLEVBQ2IsWUFBMkIsRUFDbEIscUJBQTZDLEVBQ2xELGdCQUFtQyxFQUNoRCxvQkFBMkMsRUFDbEMsWUFBMkI7UUFFM0QsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFOakcsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNsRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBRXZDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBSTNELElBQUksU0FBaUIsQ0FBQztRQUN0QixJQUFJLFVBQVUsQ0FBQyxZQUFZLDhCQUFzQixFQUFFLENBQUM7WUFDbkQsU0FBUyxHQUFHLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSx5QkFBeUIsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakcsQ0FBQzthQUFNLElBQUksVUFBVSxDQUFDLFlBQVksaUNBQXlCLEVBQUUsQ0FBQztZQUM3RCxTQUFTLEdBQUcsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLG1DQUFtQyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwSCxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxRQUFRLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDO1FBQ2xELFFBQVEsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDbkQsTUFBTSxZQUFZLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDL0IsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNyRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBWUYsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM1TSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUVsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFtRCxxQkFBcUIsRUFBRTtZQUN6RyxZQUFZLEVBQUUsd0JBQXdCO1lBQ3RDLGNBQWMsRUFBRSxjQUFjO1NBQzlCLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0csSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsS0FBbUIsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSx3QkFBd0IsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRWpQLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzlGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBbkVZLHFCQUFxQjtJQVUvQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixZQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLGFBQWEsQ0FBQTtHQWhCSCxxQkFBcUIsQ0FtRWpDOztBQUVELFNBQVMsbUJBQW1CLENBQUMsUUFBeUIsRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFDckYsT0FBb0IsRUFDcEIsTUFBZ0MsRUFDaEMsWUFBMkIsRUFBRSxTQUFpQixFQUM5Qyx3QkFBNEMsRUFDNUMsWUFBd0IsRUFDeEIsb0JBQThELEVBQzlELFlBQTJCO0lBRTNCLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDekMsSUFBSSxZQUFZLGlDQUF5QixFQUFFLENBQUM7UUFDM0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDOUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDO0lBRXBDLElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDakMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFDRCxNQUFNLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO0lBQ3pKLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVFLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUUvQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7SUFDOUQsWUFBWSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFbkQsSUFBSSxDQUFDLENBQUMsY0FBYyxJQUFJLG9CQUFvQixDQUFDLElBQUksWUFBWSw4QkFBc0IsRUFBRSxDQUFDO1FBQ3JGLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLFlBQVksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDhCQUE4QixFQUFFLHdCQUF3QixJQUFJLFlBQVksQ0FBQyxDQUFDO1FBQzNJLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZILENBQUM7U0FBTSxDQUFDO1FBQ1AsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdEgsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFpQyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNsRixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0NBQXNDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWxFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUMxRSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzFGLFlBQVksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxFQUFFLFlBQVksaUNBQXlCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw4REFBOEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxTixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDbkUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkYsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELFVBQVUsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RCxVQUFVLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRTtZQUN6QixtREFBbUQ7WUFDbkQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUM7WUFDdkcsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbkUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQzFFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUMsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNuQixDQUFDO0FBRU0sSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSw0QkFBNEI7SUFFdEUsWUFDQyxVQUEwQyxFQUMxQyxvQkFBeUUsRUFDekUsT0FBdUUsRUFDdkUsU0FBc0IsRUFDdEIscUJBQXFDLEVBQ3JDLGFBQTZCLEVBQ1osY0FBK0IsRUFDaEMsYUFBNkIsRUFDYixZQUEyQixFQUNuQixvQkFBMkM7UUFFbkYsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFIakcsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUVuQyxNQUFNLFVBQVUsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxRQUFRLGlCQUFpQixDQUFDLENBQUM7UUFDMUUsSUFBSSxRQUF5QixDQUFDO1FBQzlCLElBQUksS0FBeUIsQ0FBQztRQUU5QixJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMzQixRQUFRLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDckMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1lBQ3BDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7UUFFekMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUM7UUFDN0MsTUFBTSxZQUFZLEdBQXVDO1lBQ3hELFFBQVEsRUFBRTtnQkFDVCxLQUFLLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxvQkFBb0IsVUFBVSxDQUFDLFFBQVEsT0FBTyxVQUFVLENBQUMsSUFBSSxVQUFVO2FBQy9PO1lBQ0QsNEJBQTRCLEVBQUUsVUFBVSxDQUFDLElBQUk7U0FDN0MsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBILE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUM7UUFDdEQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywwQ0FBMEMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUN2SSxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBcERZLHFCQUFxQjtJQVMvQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0dBWlgscUJBQXFCLENBb0RqQzs7QUFFTSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLDRCQUE0QjtJQUM1RSxZQUNDLFFBQXlCLEVBQ3pCLEtBQXlCLEVBQ3pCLFVBQXFDLEVBQ3JDLDZCQUFnRSxFQUNoRSxvQkFBeUUsRUFDekUsT0FBdUUsRUFDdkUsU0FBc0IsRUFDdEIscUJBQXFDLEVBQ3JDLGFBQTZCLEVBQ1osY0FBK0IsRUFDaEMsYUFBNkIsRUFDUixpQkFBcUMsRUFDbEMsb0JBQTJDO1FBRW5GLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBSDVGLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDL0QsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUM1RyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9GLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDMUIsUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQy9FLEtBQUssR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ2hDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO2dCQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtvQkFDaEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsb0NBQW9DLENBQUMsQ0FBQztnQkFDMUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3Q0FBd0MsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEVBQUUsR0FBRyxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBQ3BPLENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztDQUNELENBQUE7QUE5Q1ksMkJBQTJCO0lBV3JDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEscUJBQXFCLENBQUE7R0FkWCwyQkFBMkIsQ0E4Q3ZDOztBQUVNLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsNEJBQTRCO0lBSTNFLFlBQ0MsVUFBb0MsRUFDcEMsb0JBQXlFLEVBQ3pFLE9BQXVFLEVBQ3ZFLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2hDLGFBQTZCLEVBQ2IsWUFBMkIsRUFDbkIsb0JBQTJDO1FBRW5GLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBSGpHLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFLbkYsSUFBSSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU3QixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ25ELElBQUksQ0FBQyxTQUFTLENBQUMsMENBQTBDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDdEcsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sV0FBVyxDQUFDLFVBQW9DO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDbEMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLE1BQU0sWUFBWSxHQUFHLEdBQUcsWUFBWSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sU0FBUyxHQUFHLFFBQVE7WUFDekIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLENBQUM7WUFDckUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSw4QkFBOEIsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN6RixNQUFNLFNBQVMsR0FBRyxRQUFRO1lBQ3pCLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztZQUM5QixDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU1QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV0SCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVsRCxtRUFBbUU7UUFDbkUscUVBQXFFO1FBQ3JFLG1FQUFtRTtRQUNuRSxxRUFBcUU7UUFDckUsa0JBQWtCO1FBQ2xCLCtDQUErQztRQUMvQyx5Q0FBeUM7UUFDekMsZ0VBQWdFO1FBRWhFLDhCQUE4QjtRQUM5QixpQ0FBaUM7UUFDakMsc0NBQXNDO1FBRXRDLDZEQUE2RDtRQUM3RCxJQUFJO1FBRUosTUFBTSxvQkFBb0IsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDbEQsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ3ZCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsS0FBSyxFQUFFLFNBQVM7WUFDaEIsS0FBSztZQUNMLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNDLFlBQVksRUFBRSxFQUFFO1NBQ2hCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUd2QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDcEMsQ0FBQztDQUNELENBQUE7QUFoRlksMEJBQTBCO0lBV3BDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FkWCwwQkFBMEIsQ0FnRnRDOztBQUVNLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsNEJBQTRCO0lBRTNFLFlBQ0MsVUFBb0MsRUFDcEMsb0JBQXlFLEVBQ3pFLE9BQXVFLEVBQ3ZFLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2hDLGFBQTZCLEVBQ3hCLGtCQUF1QyxFQUM3QyxZQUEyQjtRQUUxQyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUVqSSxJQUFJLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFFeEgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztZQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFhLEVBQUUsRUFBRTtnQkFDbkcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5QixZQUFZLEVBQUUsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBZ0IsRUFBRSxFQUFFO2dCQUN6RyxNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEtBQUssQ0FBQyxNQUFNLHVCQUFlLElBQUksS0FBSyxDQUFDLE1BQU0sd0JBQWUsRUFBRSxDQUFDO29CQUNoRSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQzlCLFlBQVksRUFBRSxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFckcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFcEgsQ0FBQztDQUNELENBQUE7QUF0Q1ksMEJBQTBCO0lBU3BDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0dBWkgsMEJBQTBCLENBc0N0Qzs7QUFHTSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLDRCQUE0QjtJQUNsRixZQUNDLFVBQTRELEVBQzVELG9CQUF5RSxFQUN6RSxPQUF1RSxFQUN2RSxTQUFzQixFQUN0QixxQkFBcUMsRUFDckMsYUFBNkIsRUFDRCxZQUF3QyxFQUNuRCxjQUErQixFQUNoQyxhQUE2QixFQUM5QixZQUEyQjtRQUUxQyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUdqSSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZMLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDM0IsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDO1FBRTlDLElBQUksYUFBYSxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLElBQUksR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDO1FBQ3BDLENBQUM7YUFBTSxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQzFCLElBQUksR0FBRyxhQUFhLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDO1FBQ2hELENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLFVBQVUsSUFBSSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFcEYsSUFBSSxZQUFnQyxDQUFDO1FBRXJDLElBQUksYUFBYSxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLFlBQVksR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2SSxDQUFDO2FBQU0sSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUMxQixZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDLGVBQWUsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzSSxDQUFDO1FBRUQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hILENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBR0QsQ0FBQTtBQWhEWSxpQ0FBaUM7SUFRM0MsV0FBQSwwQkFBMEIsQ0FBQTtJQUMxQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7R0FYSCxpQ0FBaUMsQ0FnRDdDOztBQUVNLElBQU0sc0NBQXNDLEdBQTVDLE1BQU0sc0NBQXVDLFNBQVEsNEJBQTRCO0lBQ3ZGLFlBQ0MsUUFBYSxFQUNiLFVBQXdDLEVBQ3hDLG9CQUF5RSxFQUN6RSxPQUF1RSxFQUN2RSxTQUFzQixFQUN0QixxQkFBcUMsRUFDckMsYUFBNkIsRUFDWixjQUErQixFQUNoQyxhQUE2QixFQUNiLFlBQTJCLEVBQ2xCLHFCQUE2QyxFQUNuRCxlQUFpQyxFQUM1QixvQkFBMkM7UUFFbkYsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFMakcsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUNuRCxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDNUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixRQUFRLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QixLQUFLLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDN0MsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLFdBQVcsQ0FBQztZQUNqQixLQUFLLFlBQVksQ0FBQztZQUNsQixLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzdDLE1BQU07WUFDUCxDQUFDO1lBQ0QsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDVCxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFDRCxZQUFZLENBQUMsVUFBd0M7UUFDcEQsT0FBTyxRQUFRLENBQUMsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25HLENBQUM7SUFDTyxpQkFBaUIsQ0FBQyxRQUFhLEVBQUUsVUFBd0M7UUFDaEYsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztRQUN4QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDO1FBQzVHLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUN6RixJQUFJLEtBQUssR0FBdUIsU0FBUyxDQUFDO1FBQzFDLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQVUsQ0FBQztZQUNwRSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxLQUFLLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQyxDQUFDO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLEVBQUU7UUFDSCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ08sbUJBQW1CLENBQUMsUUFBYSxFQUFFLFVBQXdDO1FBQ2xGLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUNPLGlCQUFpQixDQUFDLFFBQWEsRUFBRSxVQUF3QztRQUNoRixJQUFJLFNBQWlCLENBQUM7UUFDdEIsSUFBSSxVQUFVLENBQUMsWUFBWSw4QkFBc0IsRUFBRSxDQUFDO1lBQ25ELFNBQVMsR0FBRyxRQUFRLENBQUMscUNBQXFDLEVBQUUsa0NBQWtDLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xILENBQUM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxZQUFZLGlDQUF5QixFQUFFLENBQUM7WUFDN0QsU0FBUyxHQUFHLFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRSw2Q0FBNkMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEksQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzVNLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUN6RixJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUNqTyxDQUFDO0lBRU8sYUFBYSxDQUFDLFFBQWEsRUFBRSxVQUF3QztRQUM1RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFVBQVUsSUFBSSxPQUFPLFVBQVUsQ0FBQyxVQUFVLEtBQUssUUFBUSxJQUFJLE9BQU8sVUFBVSxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1RyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDL0csT0FBTyxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7Q0FFRCxDQUFBO0FBaEdZLHNDQUFzQztJQVNoRCxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7SUFDYixZQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFlBQUEsZ0JBQWdCLENBQUE7SUFDaEIsWUFBQSxxQkFBcUIsQ0FBQTtHQWRYLHNDQUFzQyxDQWdHbEQ7O0FBRU0sSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSw0QkFBNEI7SUFDNUUsWUFDQyxVQUFpQyxFQUNqQyxvQkFBeUUsRUFDekUsT0FBdUUsRUFDdkUsU0FBc0IsRUFDdEIscUJBQXFDLEVBQ3JDLGFBQTZCLEVBQ1osY0FBK0IsRUFDaEMsYUFBNkIsRUFDN0IsYUFBNkI7UUFFN0MsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFakksTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztRQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3RDLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7UUFDeEMsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztRQUM1RyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxvQ0FBb0MsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFakosSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNuRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQzlCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixRQUFRLEVBQUUsT0FBTztnQkFDakIsT0FBTyxFQUFFO29CQUNSLE1BQU0sRUFBRSxJQUFJO2lCQUNaO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRCxDQUFBO0FBcENZLDJCQUEyQjtJQVFyQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxjQUFjLENBQUE7R0FWSiwyQkFBMkIsQ0FvQ3ZDOztBQUVNLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsNEJBQTRCO0lBQy9FLFlBQ0MsVUFBd0MsRUFDeEMsb0JBQXlFLEVBQ3pFLE9BQXVFLEVBQ3ZFLFNBQXNCLEVBQ3RCLHFCQUFxQyxFQUNyQyxhQUE2QixFQUNaLGNBQStCLEVBQ2pDLFlBQTJCLEVBQzFCLGFBQTZCLEVBQzlCLFlBQTJCO1FBRTFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxhQUFhLEVBQUUsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWpJLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9GLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQzlGLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQWdCLEVBQUUsRUFBRTtZQUNwRyxNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNDLElBQUksS0FBSyxDQUFDLE1BQU0sdUJBQWUsSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZSxFQUFFLENBQUM7Z0JBQ2hFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFTyxLQUFLLENBQUMsZUFBZSxDQUFDLFVBQXdDO1FBQ3JFLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsZ0NBQWdDLEVBQUU7WUFDMUUsS0FBSyxFQUFFLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsS0FBSztTQUM5RixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQTNDWSw4QkFBOEI7SUFReEMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7R0FYSCw4QkFBOEIsQ0EyQzFDOztBQUVELE1BQU0sVUFBVSwwQ0FBMEMsQ0FBQyxRQUEwQixFQUFFLE1BQW1CLEVBQUUsUUFBYTtJQUN4SCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUVqRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBRXBDLFVBQVU7SUFDVixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDbEYsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUUzRSxnQkFBZ0I7SUFDaEIsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDeEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsRUFBRTtRQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlGLENBQUMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVKLGVBQWU7SUFDZixLQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLGtDQUFrQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFL0gsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLHdDQUF3QyxDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSx1QkFBaUQsRUFBRSxVQUErRCxFQUFFLGFBQXFCO0lBQ2xQLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3ZFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBRXpELE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFFcEMsVUFBVTtJQUNWLEtBQUssQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUV2RixNQUFNLG1CQUFtQixHQUFHLGdDQUFnQyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQzdGLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBRXpELGdCQUFnQjtJQUNoQixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFO1FBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzSixxQkFBcUIsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTTtnQkFDbkMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSztnQkFDN0IsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO2dCQUNyQixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7YUFDckIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRVAsQ0FBQyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRUosZUFBZTtJQUNmLE1BQU0sZ0JBQWdCLEdBQTRFO1FBQ2pHLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsdUJBQXVCLENBQUMsa0JBQWtCLENBQUM7UUFDckgsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FBQztRQUNuSCxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLHNCQUFzQixDQUFDO1FBQzdILENBQUMsaUJBQWlCLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsdUJBQXVCLENBQUMsc0JBQXNCLENBQUM7S0FDN0gsQ0FBQztJQUVGLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25GLElBQUksQ0FBQztZQUNKLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1lBQzlDLEtBQUssTUFBTSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2RCxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNyQyxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDLENBQUM7SUFDRixLQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsYUFBYSxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBRTlILE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsUUFBMEIsRUFBRSx1QkFBaUQsRUFBRSxRQUFhO0lBQ3ZILE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDL0MsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7SUFFakQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUFDLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDdkgsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sa0JBQWtCLENBQUM7QUFDM0IsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsUUFBMEIsRUFBRSxNQUFtQixFQUFFLHVCQUFpRCxFQUFFLE1BQWMsRUFBRSxHQUFRLEVBQUUsaUJBQXVDO0lBQ2pNLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzdELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFL0MsT0FBTyxHQUFHLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBQyxRQUFRLEVBQUMsRUFBRTtRQUNyRixNQUFNLEtBQUssR0FBRyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDeEUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXJDLElBQUksQ0FBQztZQUNKLE1BQU0saUJBQWlCLEVBQUUsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBRUQsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1lBQ2xDLGlCQUFpQixFQUFFLHVCQUF1QjtZQUMxQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSztZQUN0QixVQUFVLEVBQUUsR0FBRyxFQUFFO2dCQUNoQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2xGLE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLElBQUksYUFBYSxDQUFTLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsMkVBQTJFLENBQUMsRUFBRSxDQUFDLENBQUMifQ==