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
import '../media/simpleBrowserOverlay.css';
import { combinedDisposable, DisposableMap, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derivedOpts, observableFromEvent, observableSignalFromEvent } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize } from '../../../../../nls.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { Event } from '../../../../../base/common/event.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { isEqual, joinPath } from '../../../../../base/common/resources.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IChatWidgetService, showChatView } from '../chat.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { Button, ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { addDisposableListener } from '../../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { cleanupOldImages, createFileForMedia } from '../imageUtils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IBrowserElementsService } from '../../../../services/browserElements/browser/browserElementsService.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { toAction } from '../../../../../base/common/actions.js';
import { BrowserType } from '../../../../../platform/browserElements/common/browserElements.js';
let SimpleBrowserOverlayWidget = class SimpleBrowserOverlayWidget {
    constructor(_editor, _container, _hostService, _chatWidgetService, _viewService, fileService, environmentService, logService, configurationService, _preferencesService, _browserElementsService, contextMenuService) {
        this._editor = _editor;
        this._container = _container;
        this._hostService = _hostService;
        this._chatWidgetService = _chatWidgetService;
        this._viewService = _viewService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._preferencesService = _preferencesService;
        this._browserElementsService = _browserElementsService;
        this.contextMenuService = contextMenuService;
        this._showStore = new DisposableStore();
        this._timeout = undefined;
        this._activeBrowserType = undefined;
        this._showStore.add(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('chat.sendElementsToChat.enabled')) {
                if (this.configurationService.getValue('chat.sendElementsToChat.enabled')) {
                    this.showElement(this._domNode);
                }
                else {
                    this.hideElement(this._domNode);
                }
            }
        }));
        this.imagesFolder = joinPath(this.environmentService.workspaceStorageHome, 'vscode-chat-images');
        cleanupOldImages(this.fileService, this.logService, this.imagesFolder);
        this._domNode = document.createElement('div');
        this._domNode.className = 'element-selection-message';
        const message = document.createElement('span');
        const startSelectionMessage = localize('elementSelectionMessage', 'Add element to chat');
        message.textContent = startSelectionMessage;
        this._domNode.appendChild(message);
        let cts;
        const actions = [];
        actions.push(toAction({
            id: 'singleSelection',
            label: localize('selectElementDropdown', 'Select an Element'),
            enabled: true,
            run: async () => { await startElementSelection(); }
        }), toAction({
            id: 'continuousSelection',
            label: localize('continuousSelectionDropdown', 'Continuous Selection'),
            enabled: true,
            run: async () => {
                this._editor.focus();
                cts = new CancellationTokenSource();
                // start selection
                message.textContent = localize('elementSelectionInProgress', 'Selecting element...');
                this.hideElement(startButton.element);
                this.showElement(cancelButton.element);
                cancelButton.label = localize('finishSelectionLabel', 'Done');
                while (!cts.token.isCancellationRequested) {
                    try {
                        await this.addElementToChat(cts);
                    }
                    catch (err) {
                        this.logService.error('Failed to select this element.', err);
                        cts.cancel();
                        break;
                    }
                }
                // stop selection
                message.textContent = localize('elementSelectionComplete', 'Element added to chat');
                finishedSelecting();
            }
        }));
        const startButton = this._showStore.add(new ButtonWithDropdown(this._domNode, {
            actions: actions,
            addPrimaryActionToDropdown: false,
            contextMenuProvider: this.contextMenuService,
            supportShortLabel: true,
            title: localize('selectAnElement', 'Click to select an element.'),
            supportIcons: true,
            ...defaultButtonStyles
        }));
        startButton.primaryButton.label = localize('startSelection', 'Start');
        startButton.element.classList.add('element-selection-start');
        const cancelButton = this._showStore.add(new Button(this._domNode, { ...defaultButtonStyles, supportIcons: true, title: localize('cancelSelection', 'Click to cancel selection.') }));
        cancelButton.element.className = 'element-selection-cancel hidden';
        const cancelButtonLabel = localize('cancelSelectionLabel', 'Cancel');
        cancelButton.label = cancelButtonLabel;
        const configure = this._showStore.add(new Button(this._domNode, { supportIcons: true, title: localize('chat.configureElements', "Configure Attachments Sent") }));
        configure.icon = Codicon.gear;
        const collapseOverlay = this._showStore.add(new Button(this._domNode, { supportIcons: true, title: localize('chat.hideOverlay', "Collapse Overlay") }));
        collapseOverlay.icon = Codicon.chevronRight;
        const nextSelection = this._showStore.add(new Button(this._domNode, { supportIcons: true, title: localize('chat.nextSelection', "Select Again") }));
        nextSelection.icon = Codicon.close;
        nextSelection.element.classList.add('hidden');
        // shown if the overlay is collapsed
        const expandOverlay = this._showStore.add(new Button(this._domNode, { supportIcons: true, title: localize('chat.expandOverlay', "Expand Overlay") }));
        expandOverlay.icon = Codicon.layout;
        const expandContainer = document.createElement('div');
        expandContainer.className = 'element-expand-container hidden';
        expandContainer.appendChild(expandOverlay.element);
        this._container.appendChild(expandContainer);
        const resetButtons = () => {
            this.hideElement(nextSelection.element);
            this.showElement(startButton.element);
            this.showElement(collapseOverlay.element);
        };
        const finishedSelecting = () => {
            // stop selection
            this.hideElement(cancelButton.element);
            cancelButton.label = cancelButtonLabel;
            this.hideElement(collapseOverlay.element);
            this.showElement(nextSelection.element);
            // wait 3 seconds before showing the start button again unless cancelled out.
            this._timeout = setTimeout(() => {
                message.textContent = startSelectionMessage;
                resetButtons();
            }, 3000);
        };
        const startElementSelection = async () => {
            cts = new CancellationTokenSource();
            this._editor.focus();
            // start selection
            message.textContent = localize('elementSelectionInProgress', 'Selecting element...');
            this.hideElement(startButton.element);
            this.showElement(cancelButton.element);
            await this.addElementToChat(cts);
            // stop selection
            message.textContent = localize('elementSelectionComplete', 'Element added to chat');
            finishedSelecting();
        };
        this._showStore.add(addDisposableListener(startButton.primaryButton.element, 'click', async () => {
            await startElementSelection();
        }));
        this._showStore.add(addDisposableListener(cancelButton.element, 'click', () => {
            cts.cancel();
            message.textContent = localize('elementCancelMessage', 'Selection canceled');
            finishedSelecting();
        }));
        this._showStore.add(addDisposableListener(collapseOverlay.element, 'click', () => {
            this.hideElement(this._domNode);
            this.showElement(expandContainer);
        }));
        this._showStore.add(addDisposableListener(expandOverlay.element, 'click', () => {
            this.showElement(this._domNode);
            this.hideElement(expandContainer);
        }));
        this._showStore.add(addDisposableListener(nextSelection.element, 'click', () => {
            clearTimeout(this._timeout);
            message.textContent = startSelectionMessage;
            resetButtons();
        }));
        this._showStore.add(addDisposableListener(configure.element, 'click', () => {
            this._preferencesService.openSettings({ jsonEditor: false, query: '@id:chat.sendElementsToChat.enabled,chat.sendElementsToChat.attachCSS,chat.sendElementsToChat.attachImages' });
        }));
    }
    setActiveBrowserType(type) {
        this._activeBrowserType = type;
    }
    hideElement(element) {
        if (element.classList.contains('hidden')) {
            return;
        }
        element.classList.add('hidden');
    }
    showElement(element) {
        if (!element.classList.contains('hidden')) {
            return;
        }
        element.classList.remove('hidden');
    }
    async addElementToChat(cts) {
        const editorContainer = this._container.querySelector('.editor-container');
        const editorContainerPosition = editorContainer ? editorContainer.getBoundingClientRect() : this._container.getBoundingClientRect();
        const elementData = await this._browserElementsService.getElementData(editorContainerPosition, cts.token, this._activeBrowserType);
        if (!elementData) {
            throw new Error('Element data not found');
        }
        const bounds = elementData.bounds;
        const toAttach = [];
        const widget = await showChatView(this._viewService) ?? this._chatWidgetService.lastFocusedWidget;
        let value = 'Attached HTML and CSS Context\n\n' + elementData.outerHTML;
        if (this.configurationService.getValue('chat.sendElementsToChat.attachCSS')) {
            value += '\n\n' + elementData.computedStyle;
        }
        toAttach.push({
            id: 'element-' + Date.now(),
            name: this.getDisplayNameFromOuterHTML(elementData.outerHTML),
            fullName: this.getDisplayNameFromOuterHTML(elementData.outerHTML),
            value: value,
            kind: 'element',
            icon: ThemeIcon.fromId(Codicon.layout.id),
        });
        if (this.configurationService.getValue('chat.sendElementsToChat.attachImages')) {
            // remove container so we don't block anything on screenshot
            this._domNode.style.display = 'none';
            // Wait 1 extra frame to make sure overlay is gone
            await new Promise(resolve => setTimeout(resolve, 100));
            const screenshot = await this._hostService.getScreenshot(bounds);
            if (!screenshot) {
                throw new Error('Screenshot failed');
            }
            const fileReference = await createFileForMedia(this.fileService, this.imagesFolder, screenshot.buffer, 'image/png');
            toAttach.push({
                id: 'element-screenshot-' + Date.now(),
                name: 'Element Screenshot',
                fullName: 'Element Screenshot',
                kind: 'image',
                value: screenshot.buffer,
                references: fileReference ? [{ reference: fileReference, kind: 'reference' }] : [],
            });
            this._domNode.style.display = '';
        }
        widget?.attachmentModel?.addContext(...toAttach);
    }
    getDisplayNameFromOuterHTML(outerHTML) {
        const firstElementMatch = outerHTML.match(/^<(\w+)([^>]*?)>/);
        if (!firstElementMatch) {
            throw new Error('No outer element found');
        }
        const tagName = firstElementMatch[1];
        const idMatch = firstElementMatch[2].match(/\s+id\s*=\s*["']([^"']+)["']/i);
        const id = idMatch ? `#${idMatch[1]}` : '';
        const classMatch = firstElementMatch[2].match(/\s+class\s*=\s*["']([^"']+)["']/i);
        const className = classMatch ? `.${classMatch[1].replace(/\s+/g, '.')}` : '';
        return `${tagName}${id}${className}`;
    }
    dispose() {
        this._showStore.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
};
SimpleBrowserOverlayWidget = __decorate([
    __param(2, IHostService),
    __param(3, IChatWidgetService),
    __param(4, IViewsService),
    __param(5, IFileService),
    __param(6, IEnvironmentService),
    __param(7, ILogService),
    __param(8, IConfigurationService),
    __param(9, IPreferencesService),
    __param(10, IBrowserElementsService),
    __param(11, IContextMenuService)
], SimpleBrowserOverlayWidget);
let SimpleBrowserOverlayController = class SimpleBrowserOverlayController {
    constructor(container, group, instaService, configurationService, _browserElementsService) {
        this.configurationService = configurationService;
        this._browserElementsService = _browserElementsService;
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        if (!this.configurationService.getValue('chat.sendElementsToChat.enabled')) {
            return;
        }
        this._domNode.classList.add('chat-simple-browser-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = `5px`;
        this._domNode.style.right = `5px`;
        this._domNode.style.zIndex = `100`;
        const widget = instaService.createInstance(SimpleBrowserOverlayWidget, group, container);
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        this._store.add(widget);
        const connectingWebviewElement = document.createElement('div');
        connectingWebviewElement.className = 'connecting-webview-element';
        const getActiveBrowserType = () => {
            const editor = group.activeEditorPane;
            const isSimpleBrowser = editor?.input.editorId === 'mainThreadWebview-simpleBrowser.view';
            const isLiveServer = editor?.input.editorId === 'mainThreadWebview-browserPreview';
            return isSimpleBrowser ? BrowserType.SimpleBrowser : isLiveServer ? BrowserType.LiveServer : undefined;
        };
        let cts = new CancellationTokenSource();
        const show = async () => {
            // Show the connecting indicator while establishing the session
            connectingWebviewElement.textContent = localize('connectingWebviewElement', 'Connecting to webview...');
            if (!container.contains(connectingWebviewElement)) {
                container.appendChild(connectingWebviewElement);
            }
            cts = new CancellationTokenSource();
            const activeBrowserType = getActiveBrowserType();
            if (activeBrowserType) {
                try {
                    await this._browserElementsService.startDebugSession(cts.token, activeBrowserType);
                }
                catch (error) {
                    connectingWebviewElement.textContent = localize('reopenErrorWebviewElement', 'Please reopen the preview.');
                    return;
                }
            }
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
            connectingWebviewElement.remove();
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                cts.cancel();
                this._domNode.remove();
            }
            connectingWebviewElement.remove();
        };
        const activeEditorSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange));
        const activeUriObs = derivedOpts({ equalsFn: isEqual }, r => {
            activeEditorSignal.read(r); // signal
            const editor = group.activeEditorPane;
            const activeBrowser = getActiveBrowserType();
            widget.setActiveBrowserType(activeBrowser);
            if (activeBrowser) {
                const uri = EditorResourceAccessor.getOriginalUri(editor?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
                return uri;
            }
            return undefined;
        });
        this._store.add(autorun(r => {
            const data = activeUriObs.read(r);
            if (!data) {
                hide();
                return;
            }
            show();
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
SimpleBrowserOverlayController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IBrowserElementsService)
], SimpleBrowserOverlayController);
let SimpleBrowserOverlay = class SimpleBrowserOverlay {
    static { this.ID = 'chat.simpleBrowser.overlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = new DisposableMap();
        this._store.add(autorun(r => {
            const toDelete = new Set(overlayWidgets.keys());
            const groups = editorGroups.read(r);
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    // TODO@jrieken better with https://github.com/microsoft/vscode/tree/ben/layout-group-container
                    continue;
                }
                toDelete.delete(group); // we keep the widget for this group!
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const container = group.element;
                    const ctrl = scopedInstaService.createInstance(SimpleBrowserOverlayController, container, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
SimpleBrowserOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], SimpleBrowserOverlay);
export { SimpleBrowserOverlay };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQnJvd3NlckVkaXRvck92ZXJsYXkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9zaW1wbGVCcm93c2VyRWRpdG9yT3ZlcmxheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG1DQUFtQyxDQUFDO0FBQzNDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzNILE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEYs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