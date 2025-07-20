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
import { EventType } from '../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore, dispose, toDisposable } from '../../../../../base/common/lifecycle.js';
import { isMacintosh, OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import * as nls from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITunnelService } from '../../../../../platform/tunnel/common/tunnel.js';
import { TerminalExternalLinkDetector } from './terminalExternalLinkDetector.js';
import { TerminalLinkDetectorAdapter } from './terminalLinkDetectorAdapter.js';
import { TerminalLocalFileLinkOpener, TerminalLocalFolderInWorkspaceLinkOpener, TerminalLocalFolderOutsideWorkspaceLinkOpener, TerminalSearchLinkOpener, TerminalUrlLinkOpener } from './terminalLinkOpeners.js';
import { TerminalLocalLinkDetector } from './terminalLocalLinkDetector.js';
import { TerminalUriLinkDetector } from './terminalUriLinkDetector.js';
import { TerminalWordLinkDetector } from './terminalWordLinkDetector.js';
import { ITerminalConfigurationService, TerminalLinkQuickPickEvent } from '../../../terminal/browser/terminal.js';
import { TerminalHover } from '../../../terminal/browser/widgets/terminalHoverWidget.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { convertBufferRangeToViewport } from './terminalLinkHelpers.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { TerminalMultiLineLinkDetector } from './terminalMultiLineLinkDetector.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
/**
 * An object responsible for managing registration of link matchers and link providers.
 */
let TerminalLinkManager = class TerminalLinkManager extends DisposableStore {
    constructor(_xterm, _processInfo, capabilities, _linkResolver, _configurationService, _instantiationService, notificationService, _telemetryService, terminalConfigurationService, _logService, _tunnelService) {
        super();
        this._xterm = _xterm;
        this._processInfo = _processInfo;
        this._linkResolver = _linkResolver;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._tunnelService = _tunnelService;
        this._standardLinkProviders = new Map();
        this._linkProvidersDisposables = [];
        this._externalLinkProviders = [];
        this._openers = new Map();
        let enableFileLinks = true;
        const enableFileLinksConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).enableFileLinks;
        switch (enableFileLinksConfig) {
            case 'off':
            case false: // legacy from v1.75
                enableFileLinks = false;
                break;
            case 'notRemote':
                enableFileLinks = !this._processInfo.remoteAuthority;
                break;
        }
        // Setup link detectors in their order of priority
        if (enableFileLinks) {
            this._setupLinkDetector(TerminalMultiLineLinkDetector.id, this._instantiationService.createInstance(TerminalMultiLineLinkDetector, this._xterm, this._processInfo, this._linkResolver));
            this._setupLinkDetector(TerminalLocalLinkDetector.id, this._instantiationService.createInstance(TerminalLocalLinkDetector, this._xterm, capabilities, this._processInfo, this._linkResolver));
        }
        this._setupLinkDetector(TerminalUriLinkDetector.id, this._instantiationService.createInstance(TerminalUriLinkDetector, this._xterm, this._processInfo, this._linkResolver));
        this._setupLinkDetector(TerminalWordLinkDetector.id, this.add(this._instantiationService.createInstance(TerminalWordLinkDetector, this._xterm)));
        // Setup link openers
        const localFileOpener = this._instantiationService.createInstance(TerminalLocalFileLinkOpener);
        const localFolderInWorkspaceOpener = this._instantiationService.createInstance(TerminalLocalFolderInWorkspaceLinkOpener);
        this._openers.set("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, localFileOpener);
        this._openers.set("LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */, localFolderInWorkspaceOpener);
        this._openers.set("LocalFolderOutsideWorkspace" /* TerminalBuiltinLinkType.LocalFolderOutsideWorkspace */, this._instantiationService.createInstance(TerminalLocalFolderOutsideWorkspaceLinkOpener));
        this._openers.set("Search" /* TerminalBuiltinLinkType.Search */, this._instantiationService.createInstance(TerminalSearchLinkOpener, capabilities, this._processInfo.initialCwd, localFileOpener, localFolderInWorkspaceOpener, () => this._processInfo.os || OS));
        this._openers.set("Url" /* TerminalBuiltinLinkType.Url */, this._instantiationService.createInstance(TerminalUrlLinkOpener, !!this._processInfo.remoteAuthority));
        this._registerStandardLinkProviders();
        let activeHoverDisposable;
        let activeTooltipScheduler;
        this.add(toDisposable(() => {
            this._clearLinkProviders();
            dispose(this._externalLinkProviders);
            activeHoverDisposable?.dispose();
            activeTooltipScheduler?.dispose();
        }));
        this._xterm.options.linkHandler = {
            allowNonHttpProtocols: true,
            activate: (event, text) => {
                if (!this._isLinkActivationModifierDown(event)) {
                    return;
                }
                const colonIndex = text.indexOf(':');
                if (colonIndex === -1) {
                    throw new Error(`Could not find scheme in link "${text}"`);
                }
                const scheme = text.substring(0, colonIndex);
                if (terminalConfigurationService.config.allowedLinkSchemes.indexOf(scheme) === -1) {
                    notificationService.prompt(Severity.Warning, nls.localize('scheme', 'Opening URIs can be insecure, do you want to allow opening links with the scheme {0}?', scheme), [
                        {
                            label: nls.localize('allow', 'Allow {0}', scheme),
                            run: () => {
                                const allowedLinkSchemes = [
                                    ...terminalConfigurationService.config.allowedLinkSchemes,
                                    scheme
                                ];
                                this._configurationService.updateValue(`terminal.integrated.allowedLinkSchemes`, allowedLinkSchemes);
                            }
                        }
                    ]);
                }
                this._openers.get("Url" /* TerminalBuiltinLinkType.Url */)?.open({
                    type: "Url" /* TerminalBuiltinLinkType.Url */,
                    text,
                    bufferRange: null,
                    uri: URI.parse(text)
                });
            },
            hover: (e, text, range) => {
                activeHoverDisposable?.dispose();
                activeHoverDisposable = undefined;
                activeTooltipScheduler?.dispose();
                activeTooltipScheduler = new RunOnceScheduler(() => {
                    const core = this._xterm._core;
                    const cellDimensions = {
                        width: core._renderService.dimensions.css.cell.width,
                        height: core._renderService.dimensions.css.cell.height
                    };
                    const terminalDimensions = {
                        width: this._xterm.cols,
                        height: this._xterm.rows
                    };
                    activeHoverDisposable = this._showHover({
                        viewportRange: convertBufferRangeToViewport(range, this._xterm.buffer.active.viewportY),
                        cellDimensions,
                        terminalDimensions
                    }, this._getLinkHoverString(text, text), undefined, (text) => this._xterm.options.linkHandler?.activate(e, text, range));
                    // Clear out scheduler until next hover event
                    activeTooltipScheduler?.dispose();
                    activeTooltipScheduler = undefined;
                }, this._configurationService.getValue('workbench.hover.delay'));
                activeTooltipScheduler.schedule();
            }
        };
    }
    _setupLinkDetector(id, detector, isExternal = false) {
        const detectorAdapter = this.add(this._instantiationService.createInstance(TerminalLinkDetectorAdapter, detector));
        this.add(detectorAdapter.onDidActivateLink(e => {
            // Prevent default electron link handling so Alt+Click mode works normally
            e.event?.preventDefault();
            // Require correct modifier on click unless event is coming from linkQuickPick selection
            if (e.event && !(e.event instanceof TerminalLinkQuickPickEvent) && !this._isLinkActivationModifierDown(e.event)) {
                return;
            }
            // Just call the handler if there is no before listener
            if (e.link.activate) {
                // Custom activate call (external links only)
                e.link.activate(e.link.text);
            }
            else {
                this._openLink(e.link);
            }
        }));
        this.add(detectorAdapter.onDidShowHover(e => this._tooltipCallback(e.link, e.viewportRange, e.modifierDownCallback, e.modifierUpCallback)));
        if (!isExternal) {
            this._standardLinkProviders.set(id, detectorAdapter);
        }
        return detectorAdapter;
    }
    async _openLink(link) {
        this._logService.debug('Opening link', link);
        const opener = this._openers.get(link.type);
        if (!opener) {
            throw new Error(`No matching opener for link type "${link.type}"`);
        }
        this._telemetryService.publicLog2('terminal/openLink', { linkType: typeof link.type === 'string' ? link.type : `extension:${link.type.id}` });
        await opener.open(link);
    }
    async openRecentLink(type) {
        let links;
        let i = this._xterm.buffer.active.length;
        while ((!links || links.length === 0) && i >= this._xterm.buffer.active.viewportY) {
            links = await this._getLinksForType(i, type);
            i--;
        }
        if (!links || links.length < 1) {
            return undefined;
        }
        const event = new TerminalLinkQuickPickEvent(EventType.CLICK);
        links[0].activate(event, links[0].text);
        return links[0];
    }
    async getLinks() {
        // Fetch and await the viewport results
        const viewportLinksByLinePromises = [];
        for (let i = this._xterm.buffer.active.viewportY + this._xterm.rows - 1; i >= this._xterm.buffer.active.viewportY; i--) {
            viewportLinksByLinePromises.push(this._getLinksForLine(i));
        }
        const viewportLinksByLine = await Promise.all(viewportLinksByLinePromises);
        // Assemble viewport links
        const viewportLinks = {
            wordLinks: [],
            webLinks: [],
            fileLinks: [],
            folderLinks: [],
        };
        for (const links of viewportLinksByLine) {
            if (links) {
                const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                if (wordLinks?.length) {
                    viewportLinks.wordLinks.push(...wordLinks.reverse());
                }
                if (webLinks?.length) {
                    viewportLinks.webLinks.push(...webLinks.reverse());
                }
                if (fileLinks?.length) {
                    viewportLinks.fileLinks.push(...fileLinks.reverse());
                }
                if (folderLinks?.length) {
                    viewportLinks.folderLinks.push(...folderLinks.reverse());
                }
            }
        }
        // Fetch the remaining results async
        const aboveViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.viewportY - 1; i >= 0; i--) {
            aboveViewportLinksPromises.push(this._getLinksForLine(i));
        }
        const belowViewportLinksPromises = [];
        for (let i = this._xterm.buffer.active.length - 1; i >= this._xterm.buffer.active.viewportY + this._xterm.rows; i--) {
            belowViewportLinksPromises.push(this._getLinksForLine(i));
        }
        // Assemble all links in results
        const allLinks = Promise.all(aboveViewportLinksPromises).then(async (aboveViewportLinks) => {
            const belowViewportLinks = await Promise.all(belowViewportLinksPromises);
            const allResults = {
                wordLinks: [...viewportLinks.wordLinks],
                webLinks: [...viewportLinks.webLinks],
                fileLinks: [...viewportLinks.fileLinks],
                folderLinks: [...viewportLinks.folderLinks]
            };
            for (const links of [...belowViewportLinks, ...aboveViewportLinks]) {
                if (links) {
                    const { wordLinks, webLinks, fileLinks, folderLinks } = links;
                    if (wordLinks?.length) {
                        allResults.wordLinks.push(...wordLinks.reverse());
                    }
                    if (webLinks?.length) {
                        allResults.webLinks.push(...webLinks.reverse());
                    }
                    if (fileLinks?.length) {
                        allResults.fileLinks.push(...fileLinks.reverse());
                    }
                    if (folderLinks?.length) {
                        allResults.folderLinks.push(...folderLinks.reverse());
                    }
                }
            }
            return allResults;
        });
        return {
            viewport: viewportLinks,
            all: allLinks
        };
    }
    async _getLinksForLine(y) {
        const unfilteredWordLinks = await this._getLinksForType(y, 'word');
        const webLinks = await this._getLinksForType(y, 'url');
        const fileLinks = await this._getLinksForType(y, 'localFile');
        const folderLinks = await this._getLinksForType(y, 'localFolder');
        const words = new Set();
        let wordLinks;
        if (unfilteredWordLinks) {
            wordLinks = [];
            for (const link of unfilteredWordLinks) {
                if (!words.has(link.text) && link.text.length > 1) {
                    wordLinks.push(link);
                    words.add(link.text);
                }
            }
        }
        return { wordLinks, webLinks, fileLinks, folderLinks };
    }
    async _getLinksForType(y, type) {
        switch (type) {
            case 'word':
                return (await new Promise(r => this._standardLinkProviders.get(TerminalWordLinkDetector.id)?.provideLinks(y, r)));
            case 'url':
                return (await new Promise(r => this._standardLinkProviders.get(TerminalUriLinkDetector.id)?.provideLinks(y, r)));
            case 'localFile': {
                const links = (await new Promise(r => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r)));
                return links?.filter(link => link.type === "LocalFile" /* TerminalBuiltinLinkType.LocalFile */);
            }
            case 'localFolder': {
                const links = (await new Promise(r => this._standardLinkProviders.get(TerminalLocalLinkDetector.id)?.provideLinks(y, r)));
                return links?.filter(link => link.type === "LocalFolderInWorkspace" /* TerminalBuiltinLinkType.LocalFolderInWorkspace */);
            }
        }
    }
    _tooltipCallback(link, viewportRange, modifierDownCallback, modifierUpCallback) {
        if (!this._widgetManager) {
            return;
        }
        const core = this._xterm._core;
        const cellDimensions = {
            width: core._renderService.dimensions.css.cell.width,
            height: core._renderService.dimensions.css.cell.height
        };
        const terminalDimensions = {
            width: this._xterm.cols,
            height: this._xterm.rows
        };
        // Don't pass the mouse event as this avoids the modifier check
        this._showHover({
            viewportRange,
            cellDimensions,
            terminalDimensions,
            modifierDownCallback,
            modifierUpCallback
        }, this._getLinkHoverString(link.text, link.label), link.actions, (text) => link.activate(undefined, text), link);
    }
    _showHover(targetOptions, text, actions, linkHandler, link) {
        if (this._widgetManager) {
            const widget = this._instantiationService.createInstance(TerminalHover, targetOptions, text, actions, linkHandler);
            const attached = this._widgetManager.attachWidget(widget);
            if (attached) {
                link?.onInvalidated(() => attached.dispose());
            }
            return attached;
        }
        return undefined;
    }
    setWidgetManager(widgetManager) {
        this._widgetManager = widgetManager;
    }
    _clearLinkProviders() {
        dispose(this._linkProvidersDisposables);
        this._linkProvidersDisposables.length = 0;
    }
    _registerStandardLinkProviders() {
        // Forward any external link provider requests to the registered provider if it exists. This
        // helps maintain the relative priority of the link providers as it's defined by the order
        // in which they're registered in xterm.js.
        //
        /**
         * There's a bit going on here but here's another view:
         * - {@link externalProvideLinksCb} The external callback that gives the links (eg. from
         *   exthost)
         * - {@link proxyLinkProvider} A proxy that forwards the call over to
         *   {@link externalProvideLinksCb}
         * - {@link wrappedLinkProvider} Wraps the above in an `TerminalLinkDetectorAdapter`
         */
        const proxyLinkProvider = async (bufferLineNumber) => {
            return this.externalProvideLinksCb?.(bufferLineNumber);
        };
        const detectorId = `extension-${this._externalLinkProviders.length}`;
        const wrappedLinkProvider = this._setupLinkDetector(detectorId, new TerminalExternalLinkDetector(detectorId, this._xterm, proxyLinkProvider), true);
        this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(wrappedLinkProvider));
        for (const p of this._standardLinkProviders.values()) {
            this._linkProvidersDisposables.push(this._xterm.registerLinkProvider(p));
        }
    }
    _isLinkActivationModifierDown(event) {
        const editorConf = this._configurationService.getValue('editor');
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            return !!event.altKey;
        }
        return isMacintosh ? event.metaKey : event.ctrlKey;
    }
    _getLinkHoverString(uri, label) {
        const editorConf = this._configurationService.getValue('editor');
        let clickLabel = '';
        if (editorConf.multiCursorModifier === 'ctrlCmd') {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt.mac', "option + click");
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkAlt', "alt + click");
            }
        }
        else {
            if (isMacintosh) {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCmd', "cmd + click");
            }
            else {
                clickLabel = nls.localize('terminalLinkHandler.followLinkCtrl', "ctrl + click");
            }
        }
        let fallbackLabel = nls.localize('followLink', "Follow link");
        try {
            if (this._tunnelService.canTunnel(URI.parse(uri))) {
                fallbackLabel = nls.localize('followForwardedLink', "Follow link using forwarded port");
            }
        }
        catch {
            // No-op, already set to fallback
        }
        const markdown = new MarkdownString('', true);
        // Escapes markdown in label & uri
        if (label) {
            label = markdown.appendText(label).value;
            markdown.value = '';
        }
        if (uri) {
            uri = markdown.appendText(uri).value;
            markdown.value = '';
        }
        label = label || fallbackLabel;
        // Use the label when uri is '' so the link displays correctly
        uri = uri || label;
        // Although if there is a space in the uri, just replace it completely
        if (/(\s|&nbsp;)/.test(uri)) {
            uri = nls.localize('followLinkUrl', 'Link');
        }
        return markdown.appendLink(uri, label).appendMarkdown(` (${clickLabel})`);
    }
};
TerminalLinkManager = __decorate([
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, INotificationService),
    __param(7, ITelemetryService),
    __param(8, ITerminalConfigurationService),
    __param(9, ITerminalLogService),
    __param(10, ITunnelService)
], TerminalLinkManager);
export { TerminalLinkManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVqRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsd0NBQXdDLEVBQUUsNkNBQTZDLEVBQUUsd0JBQXdCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNqTixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsNkJBQTZCLEVBQWlDLDBCQUEwQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakosT0FBTyxFQUEyQixhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUlsSCxPQUFPLEVBQWdELHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFN0gsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTdHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBSTFGOztHQUVHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxlQUFlO0lBU3ZELFlBQ2tCLE1BQWdCLEVBQ2hCLFlBQWtDLEVBQ25ELFlBQXNDLEVBQ3JCLGFBQW9DLEVBQzlCLHFCQUE2RCxFQUM3RCxxQkFBNkQsRUFDOUQsbUJBQXlDLEVBQzVDLGlCQUFxRCxFQUN6Qyw0QkFBMkQsRUFDckUsV0FBaUQsRUFDdEQsY0FBK0M7UUFFL0QsS0FBSyxFQUFFLENBQUM7UUFaUyxXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQ2hCLGlCQUFZLEdBQVosWUFBWSxDQUFzQjtRQUVsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFDYiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFaEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUVsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFDckMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBbEIvQywyQkFBc0IsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMvRCw4QkFBeUIsR0FBa0IsRUFBRSxDQUFDO1FBQzlDLDJCQUFzQixHQUFrQixFQUFFLENBQUM7UUFDM0MsYUFBUSxHQUErQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBbUJqRixJQUFJLGVBQWUsR0FBWSxJQUFJLENBQUM7UUFDcEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDLGVBQXNFLENBQUM7UUFDMUwsUUFBUSxxQkFBcUIsRUFBRSxDQUFDO1lBQy9CLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxLQUFLLEVBQUUsb0JBQW9CO2dCQUMvQixlQUFlLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixNQUFNO1lBQ1AsS0FBSyxXQUFXO2dCQUNmLGVBQWUsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDO2dCQUNyRCxNQUFNO1FBQ1IsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDeEwsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDL0wsQ0FBQztRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDNUssSUFBSSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqSixxQkFBcUI7UUFDckIsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3pILElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxzREFBb0MsZUFBZSxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLGdGQUFpRCw0QkFBNEIsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRywwRkFBc0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUM7UUFDakssSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLGdEQUFpQyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxlQUFlLEVBQUUsNEJBQTRCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsMENBQThCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUV0SixJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUV0QyxJQUFJLHFCQUE4QyxDQUFDO1FBQ25ELElBQUksc0JBQW9ELENBQUM7UUFDekQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUNyQyxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNqQyxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHO1lBQ2pDLHFCQUFxQixFQUFFLElBQUk7WUFDM0IsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2hELE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO2dCQUM1RCxDQUFDO2dCQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbkYsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsdUZBQXVGLEVBQUUsTUFBTSxDQUFDLEVBQUU7d0JBQ3JLOzRCQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDOzRCQUNqRCxHQUFHLEVBQUUsR0FBRyxFQUFFO2dDQUNULE1BQU0sa0JBQWtCLEdBQUc7b0NBQzFCLEdBQUcsNEJBQTRCLENBQUMsTUFBTSxDQUFDLGtCQUFrQjtvQ0FDekQsTUFBTTtpQ0FDTixDQUFDO2dDQUNGLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsd0NBQXdDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQzs0QkFDdEcsQ0FBQzt5QkFDRDtxQkFDRCxDQUFDLENBQUM7Z0JBQ0osQ0FBQztnQkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcseUNBQTZCLEVBQUUsSUFBSSxDQUFDO29CQUNwRCxJQUFJLHlDQUE2QjtvQkFDakMsSUFBSTtvQkFDSixXQUFXLEVBQUUsSUFBSztvQkFDbEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2lCQUNwQixDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDekIscUJBQXFCLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ2pDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQztnQkFDbEMsc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ2xDLHNCQUFzQixHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO29CQUNsRCxNQUFNLElBQUksR0FBSSxJQUFJLENBQUMsTUFBYyxDQUFDLEtBQW1CLENBQUM7b0JBQ3RELE1BQU0sY0FBYyxHQUFHO3dCQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO3dCQUNwRCxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNO3FCQUN0RCxDQUFDO29CQUNGLE1BQU0sa0JBQWtCLEdBQUc7d0JBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7d0JBQ3ZCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7cUJBQ3hCLENBQUM7b0JBQ0YscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQzt3QkFDdkMsYUFBYSxFQUFFLDRCQUE0QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDO3dCQUN2RixjQUFjO3dCQUNkLGtCQUFrQjtxQkFDbEIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3pILDZDQUE2QztvQkFDN0Msc0JBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUM7b0JBQ2xDLHNCQUFzQixHQUFHLFNBQVMsQ0FBQztnQkFDcEMsQ0FBQyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO2dCQUNqRSxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxFQUFVLEVBQUUsUUFBK0IsRUFBRSxhQUFzQixLQUFLO1FBQ2xHLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ25ILElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlDLDBFQUEwRTtZQUMxRSxDQUFDLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDO1lBQzFCLHdGQUF3RjtZQUN4RixJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFlBQVksMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakgsT0FBTztZQUNSLENBQUM7WUFDRCx1REFBdUQ7WUFDdkQsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNyQiw2Q0FBNkM7Z0JBQzdDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBeUI7UUFDaEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FNOUIsbUJBQW1CLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBeUI7UUFDN0MsSUFBSSxLQUFLLENBQUM7UUFDVixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkYsS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM3QyxDQUFDLEVBQUUsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksMEJBQTBCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlELEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDYix1Q0FBdUM7UUFDdkMsTUFBTSwyQkFBMkIsR0FBMEMsRUFBRSxDQUFDO1FBQzlFLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4SCwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQztRQUNELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFFM0UsMEJBQTBCO1FBQzFCLE1BQU0sYUFBYSxHQUEyRjtZQUM3RyxTQUFTLEVBQUUsRUFBRTtZQUNiLFFBQVEsRUFBRSxFQUFFO1lBQ1osU0FBUyxFQUFFLEVBQUU7WUFDYixXQUFXLEVBQUUsRUFBRTtTQUNmLENBQUM7UUFDRixLQUFLLE1BQU0sS0FBSyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO2dCQUM5RCxJQUFJLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDdEQsQ0FBQztnQkFDRCxJQUFJLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdEIsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztnQkFDRCxJQUFJLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDdEQsQ0FBQztnQkFDRCxJQUFJLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDekIsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDMUQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sMEJBQTBCLEdBQTBDLEVBQUUsQ0FBQztRQUM3RSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELE1BQU0sMEJBQTBCLEdBQTBDLEVBQUUsQ0FBQztRQUM3RSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckgsMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsTUFBTSxRQUFRLEdBQW9HLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFDLGtCQUFrQixFQUFDLEVBQUU7WUFDekwsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUN6RSxNQUFNLFVBQVUsR0FBMkY7Z0JBQzFHLFNBQVMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFDdkMsUUFBUSxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDO2dCQUNyQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZDLFdBQVcsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQzthQUMzQyxDQUFDO1lBQ0YsS0FBSyxNQUFNLEtBQUssSUFBSSxDQUFDLEdBQUcsa0JBQWtCLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQztvQkFDOUQsSUFBSSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7d0JBQ3ZCLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ25ELENBQUM7b0JBQ0QsSUFBSSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7d0JBQ3RCLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ2pELENBQUM7b0JBQ0QsSUFBSSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7d0JBQ3ZCLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ25ELENBQUM7b0JBQ0QsSUFBSSxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUM7d0JBQ3pCLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7b0JBQ3ZELENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLFVBQVUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU87WUFDTixRQUFRLEVBQUUsYUFBYTtZQUN2QixHQUFHLEVBQUUsUUFBUTtTQUNiLENBQUM7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQVM7UUFDdkMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDbkUsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM5RCxNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLFNBQVMsQ0FBQztRQUNkLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLElBQUksSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN4QyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ25ELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVTLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFTLEVBQUUsSUFBa0Q7UUFDN0YsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssTUFBTTtnQkFDVixPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hJLEtBQUssS0FBSztnQkFDVCxPQUFPLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZJLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9JLE9BQU8sS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFFLElBQXFCLENBQUMsSUFBSSx3REFBc0MsQ0FBQyxDQUFDO1lBQ2pHLENBQUM7WUFDRCxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBc0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLEVBQUUsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvSSxPQUFPLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxJQUFxQixDQUFDLElBQUksa0ZBQW1ELENBQUMsQ0FBQztZQUM5RyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUFrQixFQUFFLGFBQTZCLEVBQUUsb0JBQWlDLEVBQUUsa0JBQStCO1FBQzdJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLElBQUksR0FBSSxJQUFJLENBQUMsTUFBYyxDQUFDLEtBQW1CLENBQUM7UUFDdEQsTUFBTSxjQUFjLEdBQUc7WUFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNwRCxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNO1NBQ3RELENBQUM7UUFDRixNQUFNLGtCQUFrQixHQUFHO1lBQzFCLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDdkIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtTQUN4QixDQUFDO1FBRUYsK0RBQStEO1FBQy9ELElBQUksQ0FBQyxVQUFVLENBQUM7WUFDZixhQUFhO1lBQ2IsY0FBYztZQUNkLGtCQUFrQjtZQUNsQixvQkFBb0I7WUFDcEIsa0JBQWtCO1NBQ2xCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25ILENBQUM7SUFFTyxVQUFVLENBQ2pCLGFBQXNDLEVBQ3RDLElBQXFCLEVBQ3JCLE9BQW1DLEVBQ25DLFdBQWtDLEVBQ2xDLElBQW1CO1FBRW5CLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ25ILE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxhQUFvQztRQUNwRCxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztJQUNyQyxDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU8sOEJBQThCO1FBQ3JDLDRGQUE0RjtRQUM1RiwwRkFBMEY7UUFDMUYsMkNBQTJDO1FBQzNDLEVBQUU7UUFDRjs7Ozs7OztXQU9HO1FBQ0gsTUFBTSxpQkFBaUIsR0FBZ0UsS0FBSyxFQUFFLGdCQUFnQixFQUFFLEVBQUU7WUFDakgsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQztRQUNGLE1BQU0sVUFBVSxHQUFHLGFBQWEsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxJQUFJLDRCQUE0QixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEosSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUUzRixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7SUFDRixDQUFDO0lBRVMsNkJBQTZCLENBQUMsS0FBaUI7UUFDeEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBNkMsUUFBUSxDQUFDLENBQUM7UUFDN0csSUFBSSxVQUFVLENBQUMsbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEQsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUN2QixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDcEQsQ0FBQztJQUVPLG1CQUFtQixDQUFDLEdBQVcsRUFBRSxLQUF5QjtRQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUE2QyxRQUFRLENBQUMsQ0FBQztRQUU3RyxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDcEIsSUFBSSxVQUFVLENBQUMsbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbEQsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsVUFBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN0RixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDL0UsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsVUFBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsbUNBQW1DLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDL0UsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFVBQVUsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ2pGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxhQUFhLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDO1lBQ0osSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbkQsYUFBYSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQztZQUN6RixDQUFDO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLGlDQUFpQztRQUNsQyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLGtDQUFrQztRQUNsQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3pDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ1QsR0FBRyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3JDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLENBQUM7UUFFRCxLQUFLLEdBQUcsS0FBSyxJQUFJLGFBQWEsQ0FBQztRQUMvQiw4REFBOEQ7UUFDOUQsR0FBRyxHQUFHLEdBQUcsSUFBSSxLQUFLLENBQUM7UUFDbkIsc0VBQXNFO1FBQ3RFLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQzNFLENBQUM7Q0FDRCxDQUFBO0FBMWFZLG1CQUFtQjtJQWM3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixZQUFBLGNBQWMsQ0FBQTtHQXBCSixtQkFBbUIsQ0EwYS9CIn0=