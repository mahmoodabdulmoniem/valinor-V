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
var InlineAnchorWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { DefinitionAction } from '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import * as nls from '../../../../nls.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { FolderThemeIcon, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../browser/dnd.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { INotebookDocumentService } from '../../../services/notebook/common/notebookDocumentService.js';
import { ExplorerFolderContext } from '../../files/common/files.js';
import { IChatWidgetService } from './chat.js';
import { chatAttachmentResourceContextKey, hookUpSymbolAttachmentDragAndContextMenu } from './chatAttachmentWidgets.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
export function renderFileWidgets(element, instantiationService, chatMarkdownAnchorService, disposables) {
    const links = element.querySelectorAll('a');
    links.forEach(a => {
        // Empty link text -> render file widget
        if (!a.textContent?.trim()) {
            const href = a.getAttribute('data-href');
            const uri = href ? URI.parse(href) : undefined;
            if (uri?.scheme) {
                const widget = instantiationService.createInstance(InlineAnchorWidget, a, { kind: 'inlineReference', inlineReference: uri });
                disposables.add(chatMarkdownAnchorService.register(widget));
                disposables.add(widget);
            }
        }
    });
}
let InlineAnchorWidget = class InlineAnchorWidget extends Disposable {
    static { InlineAnchorWidget_1 = this; }
    static { this.className = 'chat-inline-anchor-widget'; }
    constructor(element, inlineReference, originalContextKeyService, contextMenuService, fileService, hoverService, instantiationService, labelService, languageService, menuService, modelService, telemetryService, themeService, notebookDocumentService) {
        super();
        this.element = element;
        this.inlineReference = inlineReference;
        this.notebookDocumentService = notebookDocumentService;
        this._isDisposed = false;
        // TODO: Make sure we handle updates from an inlineReference being `resolved` late
        this.data = 'uri' in inlineReference.inlineReference
            ? inlineReference.inlineReference
            : 'name' in inlineReference.inlineReference
                ? { kind: 'symbol', symbol: inlineReference.inlineReference }
                : { uri: inlineReference.inlineReference };
        const contextKeyService = this._register(originalContextKeyService.createScoped(element));
        this._chatResourceContext = chatAttachmentResourceContextKey.bindTo(contextKeyService);
        element.classList.add(InlineAnchorWidget_1.className, 'show-file-icons');
        let iconText;
        let iconClasses;
        let location;
        let updateContextKeys;
        if (this.data.kind === 'symbol') {
            const symbol = this.data.symbol;
            location = this.data.symbol.location;
            iconText = this.data.symbol.name;
            iconClasses = ['codicon', ...getIconClasses(modelService, languageService, undefined, undefined, SymbolKinds.toIcon(symbol.kind))];
            this._store.add(instantiationService.invokeFunction(accessor => hookUpSymbolAttachmentDragAndContextMenu(accessor, element, contextKeyService, { value: symbol.location, name: symbol.name, kind: symbol.kind }, MenuId.ChatInlineSymbolAnchorContext)));
        }
        else {
            location = this.data;
            const label = labelService.getUriBasenameLabel(location.uri);
            iconText = location.range && this.data.kind !== 'symbol' ?
                `${label}#${location.range.startLineNumber}-${location.range.endLineNumber}` :
                location.uri.scheme === 'vscode-notebook-cell' && this.data.kind !== 'symbol' ?
                    `${label} • cell${this.getCellIndex(location.uri)}` :
                    label;
            let fileKind = location.uri.path.endsWith('/') ? FileKind.FOLDER : FileKind.FILE;
            const recomputeIconClasses = () => getIconClasses(modelService, languageService, location.uri, fileKind, fileKind === FileKind.FOLDER && !themeService.getFileIconTheme().hasFolderIcons ? FolderThemeIcon : undefined);
            iconClasses = recomputeIconClasses();
            const refreshIconClasses = () => {
                iconEl.classList.remove(...iconClasses);
                iconClasses = recomputeIconClasses();
                iconEl.classList.add(...iconClasses);
            };
            this._register(themeService.onDidFileIconThemeChange(() => {
                refreshIconClasses();
            }));
            const isFolderContext = ExplorerFolderContext.bindTo(contextKeyService);
            fileService.stat(location.uri)
                .then(stat => {
                isFolderContext.set(stat.isDirectory);
                if (stat.isDirectory) {
                    fileKind = FileKind.FOLDER;
                    refreshIconClasses();
                }
            })
                .catch(() => { });
            // Context menu
            this._register(dom.addDisposableListener(element, dom.EventType.CONTEXT_MENU, async (domEvent) => {
                const event = new StandardMouseEvent(dom.getWindow(domEvent), domEvent);
                dom.EventHelper.stop(domEvent, true);
                try {
                    await updateContextKeys?.();
                }
                catch (e) {
                    console.error(e);
                }
                if (this._isDisposed) {
                    return;
                }
                contextMenuService.showContextMenu({
                    contextKeyService,
                    getAnchor: () => event,
                    getActions: () => {
                        const menu = menuService.getMenuActions(MenuId.ChatInlineResourceAnchorContext, contextKeyService, { arg: location.uri });
                        return getFlatContextMenuActions(menu);
                    },
                });
            }));
        }
        const resourceContextKey = this._register(new ResourceContextKey(contextKeyService, fileService, languageService, modelService));
        resourceContextKey.set(location.uri);
        this._chatResourceContext.set(location.uri.toString());
        const iconEl = dom.$('span.icon');
        iconEl.classList.add(...iconClasses);
        element.replaceChildren(iconEl, dom.$('span.icon-label', {}, iconText));
        const fragment = location.range ? `${location.range.startLineNumber},${location.range.startColumn}` : '';
        element.setAttribute('data-href', (fragment ? location.uri.with({ fragment }) : location.uri).toString());
        // Hover
        const relativeLabel = labelService.getUriLabel(location.uri, { relative: true });
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, relativeLabel));
        // Drag and drop
        if (this.data.kind !== 'symbol') {
            element.draggable = true;
            this._register(dom.addDisposableListener(element, 'dragstart', e => {
                const stat = {
                    resource: location.uri,
                    selection: location.range,
                };
                instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, [stat], e));
                e.dataTransfer?.setDragImage(element, 0, 0);
            }));
        }
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    getHTMLElement() {
        return this.element;
    }
    getCellIndex(location) {
        const notebook = this.notebookDocumentService.getNotebook(location);
        const index = notebook?.getCellIndex(location) ?? -1;
        return index >= 0 ? ` ${index + 1}` : '';
    }
};
InlineAnchorWidget = InlineAnchorWidget_1 = __decorate([
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IFileService),
    __param(5, IHoverService),
    __param(6, IInstantiationService),
    __param(7, ILabelService),
    __param(8, ILanguageService),
    __param(9, IMenuService),
    __param(10, IModelService),
    __param(11, ITelemetryService),
    __param(12, IThemeService),
    __param(13, INotebookDocumentService)
], InlineAnchorWidget);
export { InlineAnchorWidget };
//#region Resource context menu
registerAction2(class AddFileToChatAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.addFileToChat'; }
    constructor() {
        super({
            id: AddFileToChatAction.id,
            title: nls.localize2('actions.attach.label', "Add File to Chat"),
            menu: [{
                    id: MenuId.ChatInlineResourceAnchorContext,
                    group: 'chat',
                    order: 1,
                    when: ExplorerFolderContext.negate(),
                }]
        });
    }
    async run(accessor, resource) {
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        if (widget) {
            widget.attachmentModel.addFile(resource);
        }
    }
});
//#endregion
//#region Resource keybindings
registerAction2(class CopyResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.copyResource'; }
    constructor() {
        super({
            id: CopyResourceAction.id,
            title: nls.localize2('actions.copy.label', "Copy"),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
            }
        });
    }
    async run(accessor) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        const clipboardService = accessor.get(IClipboardService);
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return;
        }
        // TODO: we should also write out the standard mime types so that external programs can use them
        // like how `fillEditorsDragData` works but without having an event to work with.
        const resource = anchor.data.kind === 'symbol' ? anchor.data.symbol.location.uri : anchor.data.uri;
        clipboardService.writeResources([resource]);
    }
});
registerAction2(class OpenToSideResourceAction extends Action2 {
    static { this.id = 'chat.inlineResourceAnchor.openToSide'; }
    constructor() {
        super({
            id: OpenToSideResourceAction.id,
            title: nls.localize2('actions.openToSide.label', "Open to the Side"),
            f1: false,
            precondition: chatAttachmentResourceContextKey,
            keybinding: {
                weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */
                },
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id: id,
                group: 'navigation',
                order: 1
            }))
        });
    }
    async run(accessor, arg) {
        const editorService = accessor.get(IEditorService);
        const target = this.getTarget(accessor, arg);
        if (!target) {
            return;
        }
        const input = URI.isUri(target)
            ? { resource: target }
            : {
                resource: target.uri, options: {
                    selection: {
                        startColumn: target.range.startColumn,
                        startLineNumber: target.range.startLineNumber,
                    }
                }
            };
        await editorService.openEditors([input], SIDE_GROUP);
    }
    getTarget(accessor, arg) {
        const chatWidgetService = accessor.get(IChatMarkdownAnchorService);
        if (arg) {
            return arg;
        }
        const anchor = chatWidgetService.lastFocusedAnchor;
        if (!anchor) {
            return undefined;
        }
        return anchor.data.kind === 'symbol' ? anchor.data.symbol.location : anchor.data.uri;
    }
});
//#endregion
//#region Symbol context menu
registerAction2(class GoToDefinitionAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToDefinition'; }
    constructor() {
        super({
            id: GoToDefinitionAction.id,
            title: {
                ...nls.localize2('actions.goToDecl.label', "Go to Definition"),
                mnemonicTitle: nls.localize({ key: 'miGotoDefinition', comment: ['&& denotes a mnemonic'] }, "Go to &&Definition"),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasDefinitionProvider,
            }))
        });
    }
    async run(accessor, location) {
        const editorService = accessor.get(ICodeEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        await openEditorWithSelection(editorService, location);
        const action = new DefinitionAction({ openToSide: false, openInPeek: false, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
        return instantiationService.invokeFunction(accessor => action.run(accessor));
    }
});
async function openEditorWithSelection(editorService, location) {
    await editorService.openCodeEditor({
        resource: location.uri, options: {
            selection: {
                startColumn: location.range.startColumn,
                startLineNumber: location.range.startLineNumber,
            }
        }
    }, null);
}
async function runGoToCommand(accessor, command, location) {
    const editorService = accessor.get(ICodeEditorService);
    const commandService = accessor.get(ICommandService);
    await openEditorWithSelection(editorService, location);
    return commandService.executeCommand(command);
}
registerAction2(class GoToTypeDefinitionsAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToTypeDefinitions'; }
    constructor() {
        super({
            id: GoToTypeDefinitionsAction.id,
            title: {
                ...nls.localize2('goToTypeDefinitions.label', "Go to Type Definitions"),
                mnemonicTitle: nls.localize({ key: 'miGotoTypeDefinition', comment: ['&& denotes a mnemonic'] }, "Go to &&Type Definitions"),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.1,
                when: EditorContextKeys.hasTypeDefinitionProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToTypeDefinition', location);
    }
});
registerAction2(class GoToImplementations extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToImplementations'; }
    constructor() {
        super({
            id: GoToImplementations.id,
            title: {
                ...nls.localize2('goToImplementations.label', "Go to Implementations"),
                mnemonicTitle: nls.localize({ key: 'miGotoImplementations', comment: ['&& denotes a mnemonic'] }, "Go to &&Implementations"),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.2,
                when: EditorContextKeys.hasImplementationProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToImplementation', location);
    }
});
registerAction2(class GoToReferencesAction extends Action2 {
    static { this.id = 'chat.inlineSymbolAnchor.goToReferences'; }
    constructor() {
        super({
            id: GoToReferencesAction.id,
            title: {
                ...nls.localize2('goToReferences.label', "Go to References"),
                mnemonicTitle: nls.localize({ key: 'miGotoReference', comment: ['&& denotes a mnemonic'] }, "Go to &&References"),
            },
            menu: [MenuId.ChatInlineSymbolAnchorContext, MenuId.ChatInputSymbolAttachmentContext].map(id => ({
                id,
                group: '4_symbol_nav',
                order: 1.3,
                when: EditorContextKeys.hasReferenceProvider,
            })),
        });
    }
    async run(accessor, location) {
        return runGoToCommand(accessor, 'editor.action.goToReferences', location);
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElubGluZUFuY2hvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRJbmxpbmVBbmNob3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFcEcsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFZLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUs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