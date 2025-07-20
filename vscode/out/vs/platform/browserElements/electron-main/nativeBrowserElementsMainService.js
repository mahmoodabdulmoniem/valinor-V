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
import { BrowserType } from '../common/browserElements.js';
import { webContents } from 'electron';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const INativeBrowserElementsMainService = createDecorator('browserElementsMainService');
let NativeBrowserElementsMainService = class NativeBrowserElementsMainService extends Disposable {
    constructor(windowsMainService, auxiliaryWindowsMainService) {
        super();
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
    }
    get windowId() { throw new Error('Not implemented in electron-main'); }
    async findWebviewTarget(debuggers, windowId, browserType) {
        const { targetInfos } = await debuggers.sendCommand('Target.getTargets');
        let target = undefined;
        const matchingTarget = targetInfos.find((targetInfo) => {
            try {
                const url = new URL(targetInfo.url);
                if (browserType === BrowserType.LiveServer) {
                    return url.searchParams.get('id') && url.searchParams.get('extensionId') === 'ms-vscode.live-server';
                }
                else if (browserType === BrowserType.SimpleBrowser) {
                    return url.searchParams.get('parentId') === windowId.toString() && url.searchParams.get('extensionId') === 'vscode.simple-browser';
                }
                return false;
            }
            catch (err) {
                return false;
            }
        });
        // search for webview via search parameters
        if (matchingTarget) {
            let resultId;
            let url;
            try {
                url = new URL(matchingTarget.url);
                resultId = url.searchParams.get('id');
            }
            catch (e) {
                return undefined;
            }
            target = targetInfos.find((targetInfo) => {
                try {
                    const url = new URL(targetInfo.url);
                    const isLiveServer = browserType === BrowserType.LiveServer && url.searchParams.get('serverWindowId') === resultId;
                    const isSimpleBrowser = browserType === BrowserType.SimpleBrowser && url.searchParams.get('id') === resultId && url.searchParams.has('vscodeBrowserReqId');
                    if (isLiveServer || isSimpleBrowser) {
                        this.currentLocalAddress = url.origin;
                        return true;
                    }
                    return false;
                }
                catch (e) {
                    return false;
                }
            });
            if (target) {
                return target.targetId;
            }
        }
        // fallback: search for webview without parameters based on current origin
        target = targetInfos.find((targetInfo) => {
            try {
                const url = new URL(targetInfo.url);
                return (this.currentLocalAddress === url.origin);
            }
            catch (e) {
                return false;
            }
        });
        if (!target) {
            return undefined;
        }
        return target.targetId;
    }
    async waitForWebviewTargets(debuggers, windowId, browserType) {
        const start = Date.now();
        const timeout = 10000;
        while (Date.now() - start < timeout) {
            const targetId = await this.findWebviewTarget(debuggers, windowId, browserType);
            if (targetId) {
                return targetId;
            }
            // Wait for a short period before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        debuggers.detach();
        return undefined;
    }
    async startDebugSession(windowId, token, browserType, cancelAndDetachId) {
        const window = this.windowById(windowId);
        if (!window?.win) {
            return undefined;
        }
        // Find the simple browser webview
        const allWebContents = webContents.getAllWebContents();
        const simpleBrowserWebview = allWebContents.find(webContent => webContent.id === window.id);
        if (!simpleBrowserWebview) {
            return undefined;
        }
        const debuggers = simpleBrowserWebview.debugger;
        if (!debuggers.isAttached()) {
            debuggers.attach();
        }
        try {
            const matchingTargetId = await this.waitForWebviewTargets(debuggers, windowId, browserType);
            if (!matchingTargetId) {
                if (debuggers.isAttached()) {
                    debuggers.detach();
                }
                throw new Error('No target found');
            }
        }
        catch (e) {
            if (debuggers.isAttached()) {
                debuggers.detach();
            }
            throw new Error('No target found');
        }
        window.win.webContents.on('ipc-message', async (event, channel, closedCancelAndDetachId) => {
            if (channel === `vscode:cancelCurrentSession${cancelAndDetachId}`) {
                if (cancelAndDetachId !== closedCancelAndDetachId) {
                    return;
                }
                if (debuggers.isAttached()) {
                    debuggers.detach();
                }
                if (window.win) {
                    window.win.webContents.removeAllListeners('ipc-message');
                }
            }
        });
    }
    async finishOverlay(debuggers, sessionId) {
        if (debuggers.isAttached() && sessionId) {
            await debuggers.sendCommand('Overlay.setInspectMode', {
                mode: 'none',
                highlightConfig: {
                    showInfo: false,
                    showStyles: false
                }
            }, sessionId);
            await debuggers.sendCommand('Overlay.hideHighlight', {}, sessionId);
            await debuggers.sendCommand('Overlay.disable', {}, sessionId);
            debuggers.detach();
        }
    }
    async getElementData(windowId, rect, token, browserType, cancellationId) {
        const window = this.windowById(windowId);
        if (!window?.win) {
            return undefined;
        }
        // Find the simple browser webview
        const allWebContents = webContents.getAllWebContents();
        const simpleBrowserWebview = allWebContents.find(webContent => webContent.id === window.id);
        if (!simpleBrowserWebview) {
            return undefined;
        }
        const debuggers = simpleBrowserWebview.debugger;
        if (!debuggers.isAttached()) {
            debuggers.attach();
        }
        let targetSessionId = undefined;
        try {
            const targetId = await this.findWebviewTarget(debuggers, windowId, browserType);
            const { sessionId } = await debuggers.sendCommand('Target.attachToTarget', {
                targetId: targetId,
                flatten: true,
            });
            targetSessionId = sessionId;
            await debuggers.sendCommand('DOM.enable', {}, sessionId);
            await debuggers.sendCommand('CSS.enable', {}, sessionId);
            await debuggers.sendCommand('Overlay.enable', {}, sessionId);
            await debuggers.sendCommand('Debugger.enable', {}, sessionId);
            await debuggers.sendCommand('Runtime.enable', {}, sessionId);
            await debuggers.sendCommand('Runtime.evaluate', {
                expression: `(function() {
							const style = document.createElement('style');
							style.id = '__pseudoBlocker__';
							style.textContent = '*::before, *::after { pointer-events: none !important; }';
							document.head.appendChild(style);
						})();`,
            }, sessionId);
            // slightly changed default CDP debugger inspect colors
            await debuggers.sendCommand('Overlay.setInspectMode', {
                mode: 'searchForNode',
                highlightConfig: {
                    showInfo: true,
                    showRulers: false,
                    showStyles: true,
                    showAccessibilityInfo: true,
                    showExtensionLines: false,
                    contrastAlgorithm: 'aa',
                    contentColor: { r: 173, g: 216, b: 255, a: 0.8 },
                    paddingColor: { r: 150, g: 200, b: 255, a: 0.5 },
                    borderColor: { r: 120, g: 180, b: 255, a: 0.7 },
                    marginColor: { r: 200, g: 220, b: 255, a: 0.4 },
                    eventTargetColor: { r: 130, g: 160, b: 255, a: 0.8 },
                    shapeColor: { r: 130, g: 160, b: 255, a: 0.8 },
                    shapeMarginColor: { r: 130, g: 160, b: 255, a: 0.5 },
                    gridHighlightConfig: {
                        rowGapColor: { r: 140, g: 190, b: 255, a: 0.3 },
                        rowHatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                        columnGapColor: { r: 140, g: 190, b: 255, a: 0.3 },
                        columnHatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                        rowLineColor: { r: 120, g: 180, b: 255 },
                        columnLineColor: { r: 120, g: 180, b: 255 },
                        rowLineDash: true,
                        columnLineDash: true
                    },
                    flexContainerHighlightConfig: {
                        containerBorder: {
                            color: { r: 120, g: 180, b: 255 },
                            pattern: 'solid'
                        },
                        itemSeparator: {
                            color: { r: 140, g: 190, b: 255 },
                            pattern: 'solid'
                        },
                        lineSeparator: {
                            color: { r: 140, g: 190, b: 255 },
                            pattern: 'solid'
                        },
                        mainDistributedSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        crossDistributedSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        rowGapSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        },
                        columnGapSpace: {
                            hatchColor: { r: 140, g: 190, b: 255, a: 0.7 },
                            fillColor: { r: 140, g: 190, b: 255, a: 0.4 }
                        }
                    },
                    flexItemHighlightConfig: {
                        baseSizeBox: {
                            hatchColor: { r: 130, g: 170, b: 255, a: 0.6 }
                        },
                        baseSizeBorder: {
                            color: { r: 120, g: 180, b: 255 },
                            pattern: 'solid'
                        },
                        flexibilityArrow: {
                            color: { r: 130, g: 190, b: 255 }
                        }
                    },
                },
            }, sessionId);
        }
        catch (e) {
            debuggers.detach();
            throw new Error('No target found', e);
        }
        if (!targetSessionId) {
            debuggers.detach();
            throw new Error('No target session id found');
        }
        const nodeData = await this.getNodeData(targetSessionId, debuggers, window.win, cancellationId);
        await this.finishOverlay(debuggers, targetSessionId);
        const zoomFactor = simpleBrowserWebview.getZoomFactor();
        const absoluteBounds = {
            x: rect.x + nodeData.bounds.x,
            y: rect.y + nodeData.bounds.y,
            width: nodeData.bounds.width,
            height: nodeData.bounds.height
        };
        const clippedBounds = {
            x: Math.max(absoluteBounds.x, rect.x),
            y: Math.max(absoluteBounds.y, rect.y),
            width: Math.max(0, Math.min(absoluteBounds.x + absoluteBounds.width, rect.x + rect.width) - Math.max(absoluteBounds.x, rect.x)),
            height: Math.max(0, Math.min(absoluteBounds.y + absoluteBounds.height, rect.y + rect.height) - Math.max(absoluteBounds.y, rect.y))
        };
        const scaledBounds = {
            x: clippedBounds.x * zoomFactor,
            y: clippedBounds.y * zoomFactor,
            width: clippedBounds.width * zoomFactor,
            height: clippedBounds.height * zoomFactor
        };
        return { outerHTML: nodeData.outerHTML, computedStyle: nodeData.computedStyle, bounds: scaledBounds };
    }
    async getNodeData(sessionId, debuggers, window, cancellationId) {
        return new Promise((resolve, reject) => {
            const onMessage = async (event, method, params) => {
                if (method === 'Overlay.inspectNodeRequested') {
                    debuggers.off('message', onMessage);
                    await debuggers.sendCommand('Runtime.evaluate', {
                        expression: `(() => {
										const style = document.getElementById('__pseudoBlocker__');
										if (style) style.remove();
									})();`,
                    }, sessionId);
                    const backendNodeId = params?.backendNodeId;
                    if (!backendNodeId) {
                        throw new Error('Missing backendNodeId in inspectNodeRequested event');
                    }
                    try {
                        await debuggers.sendCommand('DOM.getDocument', {}, sessionId);
                        const { nodeIds } = await debuggers.sendCommand('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [backendNodeId] }, sessionId);
                        if (!nodeIds || nodeIds.length === 0) {
                            throw new Error('Failed to get node IDs.');
                        }
                        const nodeId = nodeIds[0];
                        const { model } = await debuggers.sendCommand('DOM.getBoxModel', { nodeId }, sessionId);
                        if (!model) {
                            throw new Error('Failed to get box model.');
                        }
                        const content = model.content;
                        const margin = model.margin;
                        const x = Math.min(margin[0], content[0]);
                        const y = Math.min(margin[1], content[1]) + 32.4; // 32.4 is height of the title bar
                        const width = Math.max(margin[2] - margin[0], content[2] - content[0]);
                        const height = Math.max(margin[5] - margin[1], content[5] - content[1]);
                        const matched = await debuggers.sendCommand('CSS.getMatchedStylesForNode', { nodeId }, sessionId);
                        if (!matched) {
                            throw new Error('Failed to get matched css.');
                        }
                        const formatted = this.formatMatchedStyles(matched);
                        const { outerHTML } = await debuggers.sendCommand('DOM.getOuterHTML', { nodeId }, sessionId);
                        if (!outerHTML) {
                            throw new Error('Failed to get outerHTML.');
                        }
                        resolve({
                            outerHTML,
                            computedStyle: formatted,
                            bounds: { x, y, width, height }
                        });
                    }
                    catch (err) {
                        debuggers.off('message', onMessage);
                        debuggers.detach();
                        reject(err);
                    }
                }
            };
            window.webContents.on('ipc-message', async (event, channel, closedCancellationId) => {
                if (channel === `vscode:cancelElementSelection${cancellationId}`) {
                    if (cancellationId !== closedCancellationId) {
                        return;
                    }
                    debuggers.off('message', onMessage);
                    await this.finishOverlay(debuggers, sessionId);
                    window.webContents.removeAllListeners('ipc-message');
                }
            });
            debuggers.on('message', onMessage);
        });
    }
    formatMatchedStyles(matched) {
        const lines = [];
        // inline
        if (matched.inlineStyle?.cssProperties?.length) {
            lines.push('/* Inline style */');
            lines.push('element {');
            for (const prop of matched.inlineStyle.cssProperties) {
                if (prop.name && prop.value) {
                    lines.push(`  ${prop.name}: ${prop.value};`);
                }
            }
            lines.push('}\n');
        }
        // matched
        if (matched.matchedCSSRules?.length) {
            for (const ruleEntry of matched.matchedCSSRules) {
                const rule = ruleEntry.rule;
                const selectors = rule.selectorList.selectors.map((s) => s.text).join(', ');
                lines.push(`/* Matched Rule from ${rule.origin} */`);
                lines.push(`${selectors} {`);
                for (const prop of rule.style.cssProperties) {
                    if (prop.name && prop.value) {
                        lines.push(`  ${prop.name}: ${prop.value};`);
                    }
                }
                lines.push('}\n');
            }
        }
        // inherited rules
        if (matched.inherited?.length) {
            let level = 1;
            for (const inherited of matched.inherited) {
                const rules = inherited.matchedCSSRules || [];
                for (const ruleEntry of rules) {
                    const rule = ruleEntry.rule;
                    const selectors = rule.selectorList.selectors.map((s) => s.text).join(', ');
                    lines.push(`/* Inherited from ancestor level ${level} (${rule.origin}) */`);
                    lines.push(`${selectors} {`);
                    for (const prop of rule.style.cssProperties) {
                        if (prop.name && prop.value) {
                            lines.push(`  ${prop.name}: ${prop.value};`);
                        }
                    }
                    lines.push('}\n');
                }
                level++;
            }
        }
        return '\n' + lines.join('\n');
    }
    windowById(windowId, fallbackCodeWindowId) {
        return this.codeWindowById(windowId) ?? this.auxiliaryWindowById(windowId) ?? this.codeWindowById(fallbackCodeWindowId);
    }
    codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
NativeBrowserElementsMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IAuxiliaryWindowsMainService)
], NativeBrowserElementsMainService);
export { NativeBrowserElementsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlQnJvd3NlckVsZW1lbnRzTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Jyb3dzZXJFbGVtZW50cy9lbGVjdHJvbi1tYWluL25hdGl2ZUJyb3dzZXJFbGVtZW50c01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQStDLE1BQU0sOEJBQThCLENBQUM7QUFHeEcsT0FBTyxFQUFpQixXQUFXLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHdEQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUcvRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLDRCQUE0QixDQUFDLENBQUM7QUFTM0gsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO0lBSy9ELFlBQ3VDLGtCQUF1QyxFQUM5QiwyQkFBeUQ7UUFHeEcsS0FBSyxFQUFFLENBQUM7UUFKOEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QixnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQThCO0lBSXpHLENBQUM7SUFFRCxJQUFJLFFBQVEsS0FBWSxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTlFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFjLEVBQUUsUUFBZ0IsRUFBRSxXQUF3QjtRQUNqRixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDekUsSUFBSSxNQUFNLEdBQTJDLFNBQVMsQ0FBQztRQUMvRCxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBMkIsRUFBRSxFQUFFO1lBQ3ZFLElBQUksQ0FBQztnQkFDSixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksV0FBVyxLQUFLLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDNUMsT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyx1QkFBdUIsQ0FBQztnQkFDdEcsQ0FBQztxQkFBTSxJQUFJLFdBQVcsS0FBSyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3RELE9BQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLHVCQUF1QixDQUFDO2dCQUNwSSxDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixJQUFJLFFBQTRCLENBQUM7WUFDakMsSUFBSSxHQUFvQixDQUFDO1lBQ3pCLElBQUksQ0FBQztnQkFDSixHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNsQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7WUFDeEMsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUVELE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBMkIsRUFBRSxFQUFFO2dCQUN6RCxJQUFJLENBQUM7b0JBQ0osTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNwQyxNQUFNLFlBQVksR0FBRyxXQUFXLEtBQUssV0FBVyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLFFBQVEsQ0FBQztvQkFDbkgsTUFBTSxlQUFlLEdBQUcsV0FBVyxLQUFLLFdBQVcsQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7b0JBQzNKLElBQUksWUFBWSxJQUFJLGVBQWUsRUFBRSxDQUFDO3dCQUNyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQzt3QkFDdEMsT0FBTyxJQUFJLENBQUM7b0JBQ2IsQ0FBQztvQkFDRCxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsTUFBTSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUEyQixFQUFFLEVBQUU7WUFDekQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQUMsU0FBYyxFQUFFLFFBQWdCLEVBQUUsV0FBd0I7UUFDckYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQztRQUV0QixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsT0FBTyxFQUFFLENBQUM7WUFDckMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNoRixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE9BQU8sUUFBUSxDQUFDO1lBQ2pCLENBQUM7WUFFRCxnREFBZ0Q7WUFDaEQsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ25CLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBNEIsRUFBRSxLQUF3QixFQUFFLFdBQXdCLEVBQUUsaUJBQTBCO1FBQ25JLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUNsQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzNCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUM7UUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzdCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwQixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsUUFBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzdGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO29CQUM1QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BCLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3BDLENBQUM7UUFFRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQzVCLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixDQUFDO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEVBQUU7WUFDMUYsSUFBSSxPQUFPLEtBQUssOEJBQThCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztnQkFDbkUsSUFBSSxpQkFBaUIsS0FBSyx1QkFBdUIsRUFBRSxDQUFDO29CQUNuRCxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsSUFBSSxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztvQkFDNUIsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixDQUFDO2dCQUNELElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNoQixNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDMUQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQWMsRUFBRSxTQUE2QjtRQUNoRSxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEVBQUU7Z0JBQ3JELElBQUksRUFBRSxNQUFNO2dCQUNaLGVBQWUsRUFBRTtvQkFDaEIsUUFBUSxFQUFFLEtBQUs7b0JBQ2YsVUFBVSxFQUFFLEtBQUs7aUJBQ2pCO2FBQ0QsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNkLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM5RCxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQTRCLEVBQUUsSUFBZ0IsRUFBRSxLQUF3QixFQUFFLFdBQXdCLEVBQUUsY0FBdUI7UUFDL0ksTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDdkQsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFNUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQztRQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDN0IsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxJQUFJLGVBQWUsR0FBdUIsU0FBUyxDQUFDO1FBQ3BELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxRQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDakYsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRTtnQkFDMUUsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2FBQ2IsQ0FBQyxDQUFDO1lBRUgsZUFBZSxHQUFHLFNBQVMsQ0FBQztZQUU1QixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN6RCxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN6RCxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzdELE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDOUQsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUU3RCxNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUU7Z0JBQy9DLFVBQVUsRUFBRTs7Ozs7WUFLSjthQUNSLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFFZCx1REFBdUQ7WUFDdkQsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFO2dCQUNyRCxJQUFJLEVBQUUsZUFBZTtnQkFDckIsZUFBZSxFQUFFO29CQUNoQixRQUFRLEVBQUUsSUFBSTtvQkFDZCxVQUFVLEVBQUUsS0FBSztvQkFDakIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLHFCQUFxQixFQUFFLElBQUk7b0JBQzNCLGtCQUFrQixFQUFFLEtBQUs7b0JBQ3pCLGlCQUFpQixFQUFFLElBQUk7b0JBQ3ZCLFlBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQ2hELFlBQVksRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQ2hELFdBQVcsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQy9DLFdBQVcsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQy9DLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtvQkFDcEQsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtvQkFDOUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO29CQUNwRCxtQkFBbUIsRUFBRTt3QkFDcEIsV0FBVyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt3QkFDL0MsYUFBYSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt3QkFDakQsY0FBYyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt3QkFDbEQsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO3dCQUNwRCxZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt3QkFDeEMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7d0JBQzNDLFdBQVcsRUFBRSxJQUFJO3dCQUNqQixjQUFjLEVBQUUsSUFBSTtxQkFDcEI7b0JBQ0QsNEJBQTRCLEVBQUU7d0JBQzdCLGVBQWUsRUFBRTs0QkFDaEIsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQ2pDLE9BQU8sRUFBRSxPQUFPO3lCQUNoQjt3QkFDRCxhQUFhLEVBQUU7NEJBQ2QsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQ2pDLE9BQU8sRUFBRSxPQUFPO3lCQUNoQjt3QkFDRCxhQUFhLEVBQUU7NEJBQ2QsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQ2pDLE9BQU8sRUFBRSxPQUFPO3lCQUNoQjt3QkFDRCxvQkFBb0IsRUFBRTs0QkFDckIsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTs0QkFDOUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt5QkFDN0M7d0JBQ0QscUJBQXFCLEVBQUU7NEJBQ3RCLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQzlDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7eUJBQzdDO3dCQUNELFdBQVcsRUFBRTs0QkFDWixVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFOzRCQUM5QyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO3lCQUM3Qzt3QkFDRCxjQUFjLEVBQUU7NEJBQ2YsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTs0QkFDOUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTt5QkFDN0M7cUJBQ0Q7b0JBQ0QsdUJBQXVCLEVBQUU7d0JBQ3hCLFdBQVcsRUFBRTs0QkFDWixVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO3lCQUM5Qzt3QkFDRCxjQUFjLEVBQUU7NEJBQ2YsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7NEJBQ2pDLE9BQU8sRUFBRSxPQUFPO3lCQUNoQjt3QkFDRCxnQkFBZ0IsRUFBRTs0QkFDakIsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7eUJBQ2pDO3FCQUNEO2lCQUNEO2FBQ0QsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNmLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFckQsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDeEQsTUFBTSxjQUFjLEdBQUc7WUFDdEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQzVCLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU07U0FDOUIsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHO1lBQ3JCLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0gsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEksQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHO1lBQ3BCLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQyxHQUFHLFVBQVU7WUFDL0IsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLEdBQUcsVUFBVTtZQUMvQixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUssR0FBRyxVQUFVO1lBQ3ZDLE1BQU0sRUFBRSxhQUFhLENBQUMsTUFBTSxHQUFHLFVBQVU7U0FDekMsQ0FBQztRQUVGLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUM7SUFDdkcsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBaUIsRUFBRSxTQUFjLEVBQUUsTUFBcUIsRUFBRSxjQUF1QjtRQUNsRyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxLQUFVLEVBQUUsTUFBYyxFQUFFLE1BQWlDLEVBQUUsRUFBRTtnQkFDekYsSUFBSSxNQUFNLEtBQUssOEJBQThCLEVBQUUsQ0FBQztvQkFDL0MsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3BDLE1BQU0sU0FBUyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRTt3QkFDL0MsVUFBVSxFQUFFOzs7ZUFHSDtxQkFDVCxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUVkLE1BQU0sYUFBYSxHQUFHLE1BQU0sRUFBRSxhQUFhLENBQUM7b0JBQzVDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO29CQUN4RSxDQUFDO29CQUVELElBQUksQ0FBQzt3QkFDSixNQUFNLFNBQVMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO3dCQUM5RCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLHFDQUFxQyxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQzt3QkFDdkksSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDOzRCQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7d0JBQzVDLENBQUM7d0JBQ0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUUxQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3hGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDWixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7d0JBQzdDLENBQUM7d0JBRUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQzt3QkFDOUIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQzt3QkFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLGtDQUFrQzt3QkFDcEYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdkUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFeEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ2xHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQzs0QkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7d0JBQy9DLENBQUM7d0JBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNwRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQzdGLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzs0QkFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO3dCQUM3QyxDQUFDO3dCQUVELE9BQU8sQ0FBQzs0QkFDUCxTQUFTOzRCQUNULGFBQWEsRUFBRSxTQUFTOzRCQUN4QixNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7eUJBQy9CLENBQUMsQ0FBQztvQkFDSixDQUFDO29CQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7d0JBQ2QsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7d0JBQ3BDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDbkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNiLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQztZQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxFQUFFO2dCQUNuRixJQUFJLE9BQU8sS0FBSyxnQ0FBZ0MsY0FBYyxFQUFFLEVBQUUsQ0FBQztvQkFDbEUsSUFBSSxjQUFjLEtBQUssb0JBQW9CLEVBQUUsQ0FBQzt3QkFDN0MsT0FBTztvQkFDUixDQUFDO29CQUNELFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNwQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUN0RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxPQUFZO1FBQy9CLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUUzQixTQUFTO1FBQ1QsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNoRCxLQUFLLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4QixLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3RELElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDO1lBQ0YsQ0FBQztZQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsQ0FBQztRQUVELFVBQVU7UUFDVixJQUFJLE9BQU8sQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDckMsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0JBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakYsS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUM7Z0JBQ3JELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxTQUFTLElBQUksQ0FBQyxDQUFDO2dCQUM3QixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQzdDLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29CQUM5QyxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDL0IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2QsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzNDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDO2dCQUM5QyxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUMvQixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO29CQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2pGLEtBQUssQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEtBQUssS0FBSyxJQUFJLENBQUMsTUFBTSxNQUFNLENBQUMsQ0FBQztvQkFDNUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsSUFBSSxDQUFDLENBQUM7b0JBQzdCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDN0MsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDN0IsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQzlDLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQixDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFDO1lBQ1QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFTyxVQUFVLENBQUMsUUFBNEIsRUFBRSxvQkFBNkI7UUFDN0UsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDekgsQ0FBQztJQUVPLGNBQWMsQ0FBQyxRQUE0QjtRQUNsRCxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVPLG1CQUFtQixDQUFDLFFBQTRCO1FBQ3ZELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzFFLENBQUM7Q0FDRCxDQUFBO0FBdmRZLGdDQUFnQztJQU0xQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsNEJBQTRCLENBQUE7R0FQbEIsZ0NBQWdDLENBdWQ1QyJ9