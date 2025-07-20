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
var McpServerEditor_1;
import './media/mcpServerEditor.css';
import { $, append, clearNode, setParentFlowTo } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Action } from '../../../../base/common/actions.js';
import * as arrays from '../../../../base/common/arrays.js';
import { Cache } from '../../../../base/common/cache.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { language } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { DEFAULT_MARKDOWN_STYLES, renderMarkdownDocument } from '../../markdown/browser/markdownDocumentRenderer.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IMcpWorkbenchService, McpServerContainers } from '../common/mcpTypes.js';
import { InstallCountWidget, McpServerIconWidget, McpServerStatusWidget, McpServerWidget, onClick, PublisherWidget, RatingsWidget } from './mcpServerWidgets.js';
import { DropDownAction, InstallAction, InstallingLabelAction, ManageMcpServerAction, McpServerStatusAction, UninstallAction } from './mcpServerActions.js';
var McpServerEditorTab;
(function (McpServerEditorTab) {
    McpServerEditorTab["Readme"] = "readme";
    McpServerEditorTab["Configuration"] = "configuration";
    McpServerEditorTab["Manifest"] = "manifest";
})(McpServerEditorTab || (McpServerEditorTab = {}));
function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}, ${date.toLocaleTimeString(language, { hourCycle: 'h23' })}`;
}
class NavBar extends Disposable {
    get onChange() { return this._onChange.event; }
    get currentId() { return this._currentId; }
    constructor(container) {
        super();
        this._onChange = this._register(new Emitter());
        this._currentId = null;
        const element = append(container, $('.navbar'));
        this.actions = [];
        this.actionbar = this._register(new ActionBar(element));
    }
    push(id, label, tooltip, index) {
        const action = new Action(id, label, undefined, true, () => this.update(id, true));
        action.tooltip = tooltip;
        if (typeof index === 'number') {
            this.actions.splice(index, 0, action);
        }
        else {
            this.actions.push(action);
        }
        this.actionbar.push(action, { index });
        if (this.actions.length === 1) {
            this.update(id);
        }
    }
    remove(id) {
        const index = this.actions.findIndex(action => action.id === id);
        if (index !== -1) {
            this.actions.splice(index, 1);
            this.actionbar.pull(index);
            if (this._currentId === id) {
                this.switch(this.actions[0]?.id);
            }
        }
    }
    clear() {
        this.actions = dispose(this.actions);
        this.actionbar.clear();
    }
    switch(id) {
        const action = this.actions.find(action => action.id === id);
        if (action) {
            action.run();
            return true;
        }
        return false;
    }
    has(id) {
        return this.actions.some(action => action.id === id);
    }
    update(id, focus) {
        this._currentId = id;
        this._onChange.fire({ id, focus: !!focus });
        this.actions.forEach(a => a.checked = a.id === id);
    }
}
var WebviewIndex;
(function (WebviewIndex) {
    WebviewIndex[WebviewIndex["Readme"] = 0] = "Readme";
    WebviewIndex[WebviewIndex["Changelog"] = 1] = "Changelog";
})(WebviewIndex || (WebviewIndex = {}));
let McpServerEditor = class McpServerEditor extends EditorPane {
    static { McpServerEditor_1 = this; }
    static { this.ID = 'workbench.editor.mcpServer'; }
    constructor(group, telemetryService, instantiationService, themeService, notificationService, openerService, storageService, extensionService, webviewService, languageService, contextKeyService, mcpWorkbenchService, hoverService) {
        super(McpServerEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.extensionService = extensionService;
        this.webviewService = webviewService;
        this.languageService = languageService;
        this.contextKeyService = contextKeyService;
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.hoverService = hoverService;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        // Some action bar items use a webview whose vertical scroll position we track in this map
        this.initialScrollProgress = new Map();
        // Spot when an ExtensionEditor instance gets reused for a different extension, in which case the vertical scroll positions must be zeroed
        this.currentIdentifier = '';
        this.layoutParticipants = [];
        this.contentDisposables = this._register(new DisposableStore());
        this.transientDisposables = this._register(new DisposableStore());
        this.activeElement = null;
        this.mcpServerReadme = null;
        this.mcpServerManifest = null;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService.value;
    }
    createEditor(parent) {
        const root = append(parent, $('.extension-editor.mcp-server-editor'));
        this._scopedContextKeyService.value = this.contextKeyService.createScoped(root);
        this._scopedContextKeyService.value.createKey('inExtensionEditor', true);
        root.tabIndex = 0; // this is required for the focus tracker on the editor
        root.style.outline = 'none';
        root.setAttribute('role', 'document');
        const header = append(root, $('.header'));
        const iconContainer = append(header, $('.icon-container'));
        const iconWidget = this.instantiationService.createInstance(McpServerIconWidget, iconContainer);
        const details = append(header, $('.details'));
        const title = append(details, $('.title'));
        const name = append(title, $('span.name.clickable', { role: 'heading', tabIndex: 0 }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), name, localize('name', "Extension name")));
        const subtitle = append(details, $('.subtitle'));
        const subTitleEntryContainers = [];
        const publisherContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(publisherContainer);
        const publisherWidget = this.instantiationService.createInstance(PublisherWidget, publisherContainer, false);
        const installCountContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(installCountContainer);
        const installCountWidget = this.instantiationService.createInstance(InstallCountWidget, installCountContainer, false);
        const ratingsContainer = append(subtitle, $('.subtitle-entry'));
        subTitleEntryContainers.push(ratingsContainer);
        const ratingsWidget = this.instantiationService.createInstance(RatingsWidget, ratingsContainer, false);
        const widgets = [
            iconWidget,
            publisherWidget,
            installCountWidget,
            ratingsWidget,
        ];
        const description = append(details, $('.description'));
        const actions = [
            this.instantiationService.createInstance(InstallAction, true),
            this.instantiationService.createInstance(InstallingLabelAction),
            this.instantiationService.createInstance(UninstallAction),
            this.instantiationService.createInstance(ManageMcpServerAction, true),
        ];
        const actionsAndStatusContainer = append(details, $('.actions-status-container.mcp-server-actions'));
        const actionBar = this._register(new ActionBar(actionsAndStatusContainer, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof DropDownAction) {
                    return action.createActionViewItem(options);
                }
                return undefined;
            },
            focusOnlyEnabledItems: true
        }));
        actionBar.push(actions, { icon: true, label: true });
        actionBar.setFocusable(true);
        // update focusable elements when the enablement of an action changes
        this._register(Event.any(...actions.map(a => Event.filter(a.onDidChange, e => e.enabled !== undefined)))(() => {
            actionBar.setFocusable(false);
            actionBar.setFocusable(true);
        }));
        const otherContainers = [];
        const mcpServerStatusAction = this.instantiationService.createInstance(McpServerStatusAction);
        const mcpServerStatusWidget = this._register(this.instantiationService.createInstance(McpServerStatusWidget, append(actionsAndStatusContainer, $('.status')), mcpServerStatusAction));
        this._register(Event.any(mcpServerStatusWidget.onDidRender)(() => {
            if (this.dimension) {
                this.layout(this.dimension);
            }
        }));
        otherContainers.push(mcpServerStatusAction, new class extends McpServerWidget {
            render() {
                actionsAndStatusContainer.classList.toggle('list-layout', this.mcpServer?.installState === 1 /* McpServerInstallState.Installed */);
            }
        }());
        const mcpServerContainers = this.instantiationService.createInstance(McpServerContainers, [...actions, ...widgets, ...otherContainers]);
        for (const disposable of [...actions, ...widgets, ...otherContainers, mcpServerContainers]) {
            this._register(disposable);
        }
        const onError = Event.chain(actionBar.onDidRun, $ => $.map(({ error }) => error)
            .filter(error => !!error));
        this._register(onError(this.onError, this));
        const body = append(root, $('.body'));
        const navbar = new NavBar(body);
        const content = append(body, $('.content'));
        content.id = generateUuid(); // An id is needed for the webview parent flow to
        this.template = {
            content,
            description,
            header,
            name,
            navbar,
            actionsAndStatusContainer,
            actionBar: actionBar,
            set mcpServer(mcpServer) {
                mcpServerContainers.mcpServer = mcpServer;
                let lastNonEmptySubtitleEntryContainer;
                for (const subTitleEntryElement of subTitleEntryContainers) {
                    subTitleEntryElement.classList.remove('last-non-empty');
                    if (subTitleEntryElement.children.length > 0) {
                        lastNonEmptySubtitleEntryContainer = subTitleEntryElement;
                    }
                }
                if (lastNonEmptySubtitleEntryContainer) {
                    lastNonEmptySubtitleEntryContainer.classList.add('last-non-empty');
                }
            }
        };
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        if (this.template) {
            await this.render(input.mcpServer, this.template, !!options?.preserveFocus);
        }
    }
    async render(mcpServer, template, preserveFocus) {
        this.activeElement = null;
        this.transientDisposables.clear();
        const token = this.transientDisposables.add(new CancellationTokenSource()).token;
        this.mcpServerReadme = new Cache(() => mcpServer.getReadme(token));
        this.mcpServerManifest = new Cache(() => mcpServer.getManifest(token));
        template.mcpServer = mcpServer;
        template.name.textContent = mcpServer.label;
        template.name.classList.toggle('clickable', !!mcpServer.url);
        template.description.textContent = mcpServer.description;
        if (mcpServer.url) {
            this.transientDisposables.add(onClick(template.name, () => this.openerService.open(URI.parse(mcpServer.url))));
        }
        this.renderNavbar(mcpServer, template, preserveFocus);
    }
    setOptions(options) {
        super.setOptions(options);
        if (options?.tab) {
            this.template?.navbar.switch(options.tab);
        }
    }
    renderNavbar(extension, template, preserveFocus) {
        template.content.innerText = '';
        template.navbar.clear();
        if (this.currentIdentifier !== extension.id) {
            this.initialScrollProgress.clear();
            this.currentIdentifier = extension.id;
        }
        if (extension.readmeUrl) {
            template.navbar.push("readme" /* McpServerEditorTab.Readme */, localize('details', "Details"), localize('detailstooltip', "Extension details, rendered from the extension's 'README.md' file"));
        }
        if (extension.config) {
            template.navbar.push("configuration" /* McpServerEditorTab.Configuration */, localize('configuration', "Configuration"), localize('configurationtooltip', "Server configuration details"));
        }
        if (extension.gallery || extension.local?.manifest) {
            template.navbar.push("manifest" /* McpServerEditorTab.Manifest */, localize('manifest', "Manifest"), localize('manifesttooltip', "Server manifest details"));
        }
        this.transientDisposables.add(this.mcpWorkbenchService.onChange(e => {
            if (e === extension) {
                if (e.config && !template.navbar.has("configuration" /* McpServerEditorTab.Configuration */)) {
                    template.navbar.push("configuration" /* McpServerEditorTab.Configuration */, localize('configuration', "Configuration"), localize('configurationtooltip', "Server configuration details"), extension.readmeUrl ? 1 : 0);
                }
                if (!e.config && template.navbar.has("configuration" /* McpServerEditorTab.Configuration */)) {
                    template.navbar.remove("configuration" /* McpServerEditorTab.Configuration */);
                }
            }
        }));
        if (this.options?.tab) {
            template.navbar.switch(this.options.tab);
        }
        if (template.navbar.currentId) {
            this.onNavbarChange(extension, { id: template.navbar.currentId, focus: !preserveFocus }, template);
        }
        template.navbar.onChange(e => this.onNavbarChange(extension, e, template), this, this.transientDisposables);
    }
    clearInput() {
        this.contentDisposables.clear();
        this.transientDisposables.clear();
        super.clearInput();
    }
    focus() {
        super.focus();
        this.activeElement?.focus();
    }
    showFind() {
        this.activeWebview?.showFind();
    }
    runFindAction(previous) {
        this.activeWebview?.runFindAction(previous);
    }
    get activeWebview() {
        if (!this.activeElement || !this.activeElement.runFindAction) {
            return undefined;
        }
        return this.activeElement;
    }
    onNavbarChange(extension, { id, focus }, template) {
        this.contentDisposables.clear();
        template.content.innerText = '';
        this.activeElement = null;
        if (id) {
            const cts = new CancellationTokenSource();
            this.contentDisposables.add(toDisposable(() => cts.dispose(true)));
            this.open(id, extension, template, cts.token)
                .then(activeElement => {
                if (cts.token.isCancellationRequested) {
                    return;
                }
                this.activeElement = activeElement;
                if (focus) {
                    this.focus();
                }
            });
        }
    }
    open(id, extension, template, token) {
        switch (id) {
            case "configuration" /* McpServerEditorTab.Configuration */: return this.openConfiguration(extension, template, token);
            case "readme" /* McpServerEditorTab.Readme */: return this.openDetails(extension, template, token);
            case "manifest" /* McpServerEditorTab.Manifest */: return this.openManifest(extension, template, token);
        }
        return Promise.resolve(null);
    }
    async openMarkdown(extension, cacheResult, noContentCopy, container, webviewIndex, title, token) {
        try {
            const body = await this.renderMarkdown(extension, cacheResult, container, token);
            if (token.isCancellationRequested) {
                return Promise.resolve(null);
            }
            const webview = this.contentDisposables.add(this.webviewService.createWebviewOverlay({
                title,
                options: {
                    enableFindWidget: true,
                    tryRestoreScrollPosition: true,
                    disableServiceWorker: true,
                },
                contentOptions: {},
                extension: undefined,
            }));
            webview.initialScrollProgress = this.initialScrollProgress.get(webviewIndex) || 0;
            webview.claim(this, this.window, this.scopedContextKeyService);
            setParentFlowTo(webview.container, container);
            webview.layoutWebviewOverElement(container);
            webview.setHtml(body);
            webview.claim(this, this.window, undefined);
            this.contentDisposables.add(webview.onDidFocus(() => this._onDidFocus?.fire()));
            this.contentDisposables.add(webview.onDidScroll(() => this.initialScrollProgress.set(webviewIndex, webview.initialScrollProgress)));
            const removeLayoutParticipant = arrays.insert(this.layoutParticipants, {
                layout: () => {
                    webview.layoutWebviewOverElement(container);
                }
            });
            this.contentDisposables.add(toDisposable(removeLayoutParticipant));
            let isDisposed = false;
            this.contentDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.contentDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since syntax highlighting of code blocks may have changed
                const body = await this.renderMarkdown(extension, cacheResult, container);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    webview.setHtml(body);
                }
            }));
            this.contentDisposables.add(webview.onDidClickLink(link => {
                if (!link) {
                    return;
                }
                // Only allow links with specific schemes
                if (matchesScheme(link, Schemas.http) || matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.mailto)) {
                    this.openerService.open(link);
                }
            }));
            return webview;
        }
        catch (e) {
            const p = append(container, $('p.nocontent'));
            p.textContent = noContentCopy;
            return p;
        }
    }
    async renderMarkdown(extension, cacheResult, container, token) {
        const contents = await this.loadContents(() => cacheResult, container);
        if (token?.isCancellationRequested) {
            return '';
        }
        const content = await renderMarkdownDocument(contents, this.extensionService, this.languageService, { shouldSanitize: true, token });
        if (token?.isCancellationRequested) {
            return '';
        }
        return this.renderBody(content);
    }
    renderBody(body) {
        const nonce = generateUuid();
        const colorMap = TokenizationRegistry.getColorMap();
        const css = colorMap ? generateTokensCSSForColorMap(colorMap) : '';
        return `<!DOCTYPE html>
		<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; script-src 'none'; style-src 'nonce-${nonce}';">
				<style nonce="${nonce}">
					${DEFAULT_MARKDOWN_STYLES}

					/* prevent scroll-to-top button from blocking the body text */
					body {
						padding-bottom: 75px;
					}

					#scroll-to-top {
						position: fixed;
						width: 32px;
						height: 32px;
						right: 25px;
						bottom: 25px;
						background-color: var(--vscode-button-secondaryBackground);
						border-color: var(--vscode-button-border);
						border-radius: 50%;
						cursor: pointer;
						box-shadow: 1px 1px 1px rgba(0,0,0,.25);
						outline: none;
						display: flex;
						justify-content: center;
						align-items: center;
					}

					#scroll-to-top:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
						box-shadow: 2px 2px 2px rgba(0,0,0,.25);
					}

					body.vscode-high-contrast #scroll-to-top {
						border-width: 2px;
						border-style: solid;
						box-shadow: none;
					}

					#scroll-to-top span.icon::before {
						content: "";
						display: block;
						background: var(--vscode-button-secondaryForeground);
						/* Chevron up icon */
						webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						-webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAxNiAxNiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTYgMTY7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4KCS5zdDB7ZmlsbDojRkZGRkZGO30KCS5zdDF7ZmlsbDpub25lO30KPC9zdHlsZT4KPHRpdGxlPnVwY2hldnJvbjwvdGl0bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik04LDUuMWwtNy4zLDcuM0wwLDExLjZsOC04bDgsOGwtMC43LDAuN0w4LDUuMXoiLz4KPHJlY3QgY2xhc3M9InN0MSIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ii8+Cjwvc3ZnPgo=');
						width: 16px;
						height: 16px;
					}
					${css}
				</style>
			</head>
			<body>
				<a id="scroll-to-top" role="button" aria-label="scroll to top" href="#"><span class="icon"></span></a>
				${body}
			</body>
		</html>`;
    }
    async openDetails(extension, template, token) {
        const details = append(template.content, $('.details'));
        const readmeContainer = append(details, $('.readme-container'));
        const additionalDetailsContainer = append(details, $('.additional-details-container'));
        const layout = () => details.classList.toggle('narrow', this.dimension && this.dimension.width < 500);
        layout();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        const activeElement = await this.openMarkdown(extension, this.mcpServerReadme.get(), localize('noReadme', "No README available."), readmeContainer, 0 /* WebviewIndex.Readme */, localize('Readme title', "Readme"), token);
        this.renderAdditionalDetails(additionalDetailsContainer, extension);
        return activeElement;
    }
    async openConfiguration(mcpServer, template, token) {
        const configContainer = append(template.content, $('.configuration'));
        const content = $('div', { class: 'configuration-content' });
        this.renderConfigurationDetails(content, mcpServer);
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        append(configContainer, scrollableContent.getDomNode());
        return { focus: () => content.focus() };
    }
    async openManifest(mcpServer, template, token) {
        const manifestContainer = append(template.content, $('.manifest'));
        const content = $('div', { class: 'manifest-content' });
        try {
            const manifest = await this.loadContents(() => this.mcpServerManifest.get(), content);
            if (token.isCancellationRequested) {
                return null;
            }
            this.renderManifestDetails(content, manifest);
        }
        catch (error) {
            // Handle error - show no manifest message
            while (content.firstChild) {
                content.removeChild(content.firstChild);
            }
            const noManifestMessage = append(content, $('.no-manifest'));
            noManifestMessage.textContent = localize('noManifest', "No manifest available for this MCP server.");
        }
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        this.contentDisposables.add(toDisposable(arrays.insert(this.layoutParticipants, { layout })));
        append(manifestContainer, scrollableContent.getDomNode());
        return { focus: () => content.focus() };
    }
    renderConfigurationDetails(container, mcpServer) {
        clearNode(container);
        const config = mcpServer.config;
        if (!config) {
            const noConfigMessage = append(container, $('.no-config'));
            noConfigMessage.textContent = localize('noConfig', "No configuration available for this MCP server.");
            return;
        }
        // Server Name
        const nameSection = append(container, $('.config-section'));
        const nameLabel = append(nameSection, $('.config-label'));
        nameLabel.textContent = localize('serverName', "Name:");
        const nameValue = append(nameSection, $('.config-value'));
        nameValue.textContent = mcpServer.name;
        // Server Type
        const typeSection = append(container, $('.config-section'));
        const typeLabel = append(typeSection, $('.config-label'));
        typeLabel.textContent = localize('serverType', "Type:");
        const typeValue = append(typeSection, $('.config-value'));
        typeValue.textContent = config.type;
        // Type-specific configuration
        if (config.type === "stdio" /* McpServerType.LOCAL */) {
            // Command
            const commandSection = append(container, $('.config-section'));
            const commandLabel = append(commandSection, $('.config-label'));
            commandLabel.textContent = localize('command', "Command:");
            const commandValue = append(commandSection, $('code.config-value'));
            commandValue.textContent = config.command;
            // Arguments (if present)
            if (config.args && config.args.length > 0) {
                const argsSection = append(container, $('.config-section'));
                const argsLabel = append(argsSection, $('.config-label'));
                argsLabel.textContent = localize('arguments', "Arguments:");
                const argsValue = append(argsSection, $('code.config-value'));
                argsValue.textContent = config.args.join(' ');
            }
        }
        else if (config.type === "http" /* McpServerType.REMOTE */) {
            // URL
            const urlSection = append(container, $('.config-section'));
            const urlLabel = append(urlSection, $('.config-label'));
            urlLabel.textContent = localize('url', "URL:");
            const urlValue = append(urlSection, $('code.config-value'));
            urlValue.textContent = config.url;
        }
    }
    renderManifestDetails(container, manifest) {
        clearNode(container);
        if (manifest.packages && manifest.packages.length > 0) {
            const packagesByType = new Map();
            for (const pkg of manifest.packages) {
                const type = pkg.registry_name;
                let packages = packagesByType.get(type);
                if (!packages) {
                    packagesByType.set(type, packages = []);
                }
                packages.push(pkg);
            }
            append(container, $('.manifest-section', undefined, $('.manifest-section-title', undefined, localize('packages', "Packages"))));
            for (const [packageType, packages] of packagesByType) {
                const packageSection = append(container, $('.package-section', undefined, $('.package-section-title', undefined, packageType.toUpperCase())));
                const packagesGrid = append(packageSection, $('.package-details'));
                for (let i = 0; i < packages.length; i++) {
                    const pkg = packages[i];
                    append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('packageName', "Package:")), $('.detail-value', undefined, pkg.name)));
                    if (pkg.package_arguments && pkg.package_arguments.length > 0) {
                        const argStrings = [];
                        for (const arg of pkg.package_arguments) {
                            if (arg.type === 'named') {
                                argStrings.push(arg.name);
                                if (arg.value) {
                                    argStrings.push(arg.value);
                                }
                            }
                            if (arg.type === 'positional') {
                                argStrings.push(arg.value ?? arg.value_hint);
                            }
                        }
                        append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('packagearguments', "Package Arguments:")), $('code.detail-value', undefined, argStrings.join(' '))));
                    }
                    if (pkg.runtime_arguments && pkg.runtime_arguments.length > 0) {
                        const argStrings = [];
                        for (const arg of pkg.runtime_arguments) {
                            if (arg.type === 'named') {
                                argStrings.push(arg.name);
                                if (arg.value) {
                                    argStrings.push(arg.value);
                                }
                            }
                            if (arg.type === 'positional') {
                                argStrings.push(arg.value ?? arg.value_hint);
                            }
                        }
                        append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('runtimeargs', "Runtime Arguments:")), $('code.detail-value', undefined, argStrings.join(' '))));
                    }
                    if (pkg.environment_variables && pkg.environment_variables.length > 0) {
                        const envStrings = pkg.environment_variables.map((envVar) => `${envVar.name}=${envVar.value}`);
                        append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('environmentVariables', "Environment Variables:")), $('code.detail-value', undefined, envStrings.join(' '))));
                    }
                    if (i < packages.length - 1) {
                        append(packagesGrid, $('.package-separator'));
                    }
                }
            }
        }
        if (manifest.remotes && manifest.remotes.length > 0) {
            const packageSection = append(container, $('.package-section', undefined, $('.package-section-title', undefined, localize('remotes', "Remote").toLocaleUpperCase())));
            for (const remote of manifest.remotes) {
                const packagesGrid = append(packageSection, $('.package-details'));
                append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('url', "URL:")), $('.detail-value', undefined, remote.url)));
                if (remote.transport_type) {
                    append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('transport', "Transport:")), $('.detail-value', undefined, remote.transport_type)));
                }
                if (remote.headers && remote.headers.length > 0) {
                    const headerStrings = remote.headers.map((header) => `${header.name}: ${header.value}`);
                    append(packagesGrid, $('.package-detail', undefined, $('.detail-label', undefined, localize('headers', "Headers:")), $('.detail-value', undefined, headerStrings.join(', '))));
                }
            }
        }
    }
    renderAdditionalDetails(container, extension) {
        const content = $('div', { class: 'additional-details-content', tabindex: '0' });
        const scrollableContent = new DomScrollableElement(content, {});
        const layout = () => scrollableContent.scanDomNode();
        const removeLayoutParticipant = arrays.insert(this.layoutParticipants, { layout });
        this.contentDisposables.add(toDisposable(removeLayoutParticipant));
        this.contentDisposables.add(scrollableContent);
        this.contentDisposables.add(this.instantiationService.createInstance(AdditionalDetailsWidget, content, extension));
        append(container, scrollableContent.getDomNode());
        scrollableContent.scanDomNode();
    }
    loadContents(loadingTask, container) {
        container.classList.add('loading');
        const result = this.contentDisposables.add(loadingTask());
        const onDone = () => container.classList.remove('loading');
        result.promise.then(onDone, onDone);
        return result.promise;
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutParticipants.forEach(p => p.layout());
    }
    onError(err) {
        if (isCancellationError(err)) {
            return;
        }
        this.notificationService.error(err);
    }
};
McpServerEditor = McpServerEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, INotificationService),
    __param(5, IOpenerService),
    __param(6, IStorageService),
    __param(7, IExtensionService),
    __param(8, IWebviewService),
    __param(9, ILanguageService),
    __param(10, IContextKeyService),
    __param(11, IMcpWorkbenchService),
    __param(12, IHoverService)
], McpServerEditor);
export { McpServerEditor };
let AdditionalDetailsWidget = class AdditionalDetailsWidget extends Disposable {
    constructor(container, extension, hoverService, openerService) {
        super();
        this.container = container;
        this.hoverService = hoverService;
        this.openerService = openerService;
        this.disposables = this._register(new DisposableStore());
        this.render(extension);
    }
    render(extension) {
        this.container.innerText = '';
        this.disposables.clear();
        if (extension.local) {
            this.renderInstallInfo(this.container, extension.local);
        }
        if (extension.gallery) {
            this.renderMarketplaceInfo(this.container, extension);
        }
        this.renderExtensionResources(this.container, extension);
    }
    renderExtensionResources(container, extension) {
        const resources = [];
        if (extension.repository) {
            try {
                resources.push([localize('repository', "Repository"), URI.parse(extension.repository)]);
            }
            catch (error) { /* Ignore */ }
        }
        if (extension.publisherUrl && extension.publisherDisplayName) {
            resources.push([extension.publisherDisplayName, URI.parse(extension.publisherUrl)]);
        }
        if (resources.length) {
            const extensionResourcesContainer = append(container, $('.resources-container.additional-details-element'));
            append(extensionResourcesContainer, $('.additional-details-title', undefined, localize('resources', "Resources")));
            const resourcesElement = append(extensionResourcesContainer, $('.resources'));
            for (const [label, uri] of resources) {
                const resource = append(resourcesElement, $('a.resource', { tabindex: '0' }, label));
                this.disposables.add(onClick(resource, () => this.openerService.open(uri)));
                this.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), resource, uri.toString()));
            }
        }
    }
    renderInstallInfo(container, extension) {
        const installInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(installInfoContainer, $('.additional-details-title', undefined, localize('Install Info', "Installation")));
        const installInfo = append(installInfoContainer, $('.more-info'));
        append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.name)));
        if (extension.version) {
            append(installInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, extension.version)));
        }
    }
    renderMarketplaceInfo(container, extension) {
        const gallery = extension.gallery;
        const moreInfoContainer = append(container, $('.more-info-container.additional-details-element'));
        append(moreInfoContainer, $('.additional-details-title', undefined, localize('Marketplace Info', "Marketplace")));
        const moreInfo = append(moreInfoContainer, $('.more-info'));
        if (gallery) {
            if (!extension.local) {
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('id', "Identifier")), $('code', undefined, extension.name)));
                if (gallery.version) {
                    append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('Version', "Version")), $('code', undefined, gallery.version)));
                }
            }
            if (gallery.lastUpdated) {
                append(moreInfo, $('.more-info-entry', undefined, $('div.more-info-entry-name', undefined, localize('last released', "Last Released")), $('div', undefined, toDateString(new Date(gallery.lastUpdated)))));
            }
        }
    }
};
AdditionalDetailsWidget = __decorate([
    __param(2, IHoverService),
    __param(3, IOpenerService)
], AdditionalDetailsWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BTZXJ2ZXJFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxFQUFFLENBQUMsRUFBYSxNQUFNLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUM7QUFDckUsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFlLE1BQU0sa0NBQWtDLENBQUM7QUFDdEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdILE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFD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