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
import './media/processExplorer.css';
import { localize } from '../../../../nls.js';
import { $, append, getDocument } from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { isRemoteDiagnosticError } from '../../../../platform/diagnostics/common/diagnostics.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { WorkbenchDataTree } from '../../../../platform/list/browser/listService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { Delayer } from '../../../../base/common/async.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { isWeb } from '../../../../base/common/platform.js';
const DEBUG_FLAGS_PATTERN = /\s--inspect(?:-brk|port)?=(?<port>\d+)?/;
const DEBUG_PORT_PATTERN = /\s--inspect-port=(?<port>\d+)/;
function isMachineProcessInformation(item) {
    const candidate = item;
    return !!candidate?.name && !!candidate?.rootProcess;
}
function isProcessInformation(item) {
    const candidate = item;
    return !!candidate?.processRoots;
}
function isProcessItem(item) {
    const candidate = item;
    return typeof candidate?.pid === 'number';
}
class ProcessListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId(element) {
        if (isProcessItem(element)) {
            return 'process';
        }
        if (isMachineProcessInformation(element)) {
            return 'machine';
        }
        if (isRemoteDiagnosticError(element)) {
            return 'error';
        }
        if (isProcessInformation(element)) {
            return 'header';
        }
        return '';
    }
}
class ProcessTreeDataSource {
    hasChildren(element) {
        if (isRemoteDiagnosticError(element)) {
            return false;
        }
        if (isProcessItem(element)) {
            return !!element.children?.length;
        }
        return true;
    }
    getChildren(element) {
        if (isProcessItem(element)) {
            return element.children ?? [];
        }
        if (isRemoteDiagnosticError(element)) {
            return [];
        }
        if (isProcessInformation(element)) {
            if (element.processRoots.length > 1) {
                return element.processRoots; // If there are multiple process roots, return these, otherwise go directly to the root process
            }
            if (element.processRoots.length > 0) {
                return [element.processRoots[0].rootProcess];
            }
            return [];
        }
        if (isMachineProcessInformation(element)) {
            return [element.rootProcess];
        }
        return element.processes ? [element.processes] : [];
    }
}
function createRow(container, extraClass) {
    const row = append(container, $('.row'));
    if (extraClass) {
        row.classList.add(extraClass);
    }
    const name = append(row, $('.cell.name'));
    const cpu = append(row, $('.cell.cpu'));
    const memory = append(row, $('.cell.memory'));
    const pid = append(row, $('.cell.pid'));
    return { name, cpu, memory, pid };
}
class ProcessHeaderTreeRenderer {
    constructor() {
        this.templateId = 'header';
    }
    renderTemplate(container) {
        container.parentElement.parentElement.querySelector('.monaco-tl-twistie').classList.add('force-no-twistie'); // hack, but no API for hiding twistie on tree
        return createRow(container, 'header');
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = localize('processName', "Process Name");
        templateData.cpu.textContent = localize('processCpu', "CPU (%)");
        templateData.pid.textContent = localize('processPid', "PID");
        templateData.memory.textContent = localize('processMemory', "Memory (MB)");
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class MachineRenderer {
    constructor() {
        this.templateId = 'machine';
    }
    renderTemplate(container) {
        return createRow(container);
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = node.element.name;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
class ErrorRenderer {
    constructor() {
        this.templateId = 'error';
    }
    renderTemplate(container) {
        return createRow(container);
    }
    renderElement(node, index, templateData) {
        templateData.name.textContent = node.element.errorMessage;
    }
    disposeTemplate(templateData) {
        // Nothing to do
    }
}
let ProcessItemHover = class ProcessItemHover extends Disposable {
    constructor(container, hoverService) {
        super();
        this.content = '';
        this.hover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), container, this.content));
    }
    update(content) {
        if (this.content !== content) {
            this.content = content;
            this.hover.update(content);
        }
    }
};
ProcessItemHover = __decorate([
    __param(1, IHoverService)
], ProcessItemHover);
let ProcessRenderer = class ProcessRenderer {
    constructor(model, hoverService) {
        this.model = model;
        this.hoverService = hoverService;
        this.templateId = 'process';
    }
    renderTemplate(container) {
        const row = createRow(container);
        return {
            name: row.name,
            cpu: row.cpu,
            memory: row.memory,
            pid: row.pid,
            hover: new ProcessItemHover(row.name, this.hoverService)
        };
    }
    renderElement(node, index, templateData) {
        const { element } = node;
        const pid = element.pid.toFixed(0);
        templateData.name.textContent = this.model.getName(element.pid, element.name);
        templateData.cpu.textContent = element.load.toFixed(0);
        templateData.memory.textContent = (element.mem / ByteSize.MB).toFixed(0);
        templateData.pid.textContent = pid;
        templateData.pid.parentElement.id = `pid-${pid}`;
        templateData.hover?.update(element.cmd);
    }
    disposeTemplate(templateData) {
        templateData.hover?.dispose();
    }
};
ProcessRenderer = __decorate([
    __param(1, IHoverService)
], ProcessRenderer);
class ProcessAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('processExplorer', "Process Explorer");
    }
    getAriaLabel(element) {
        if (isProcessItem(element) || isMachineProcessInformation(element)) {
            return element.name;
        }
        if (isRemoteDiagnosticError(element)) {
            return element.hostName;
        }
        return null;
    }
}
class ProcessIdentityProvider {
    getId(element) {
        if (isProcessItem(element)) {
            return element.pid.toString();
        }
        if (isRemoteDiagnosticError(element)) {
            return element.hostName;
        }
        if (isProcessInformation(element)) {
            return 'processes';
        }
        if (isMachineProcessInformation(element)) {
            return element.name;
        }
        return 'header';
    }
}
//#endregion
let ProcessExplorerControl = class ProcessExplorerControl extends Disposable {
    constructor(instantiationService, productService, contextMenuService, commandService, clipboardService) {
        super();
        this.instantiationService = instantiationService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.commandService = commandService;
        this.clipboardService = clipboardService;
        this.dimensions = undefined;
        this.delayer = this._register(new Delayer(1000));
        this.model = new ProcessExplorerModel(this.productService);
    }
    create(container) {
        this.createProcessTree(container);
        this.update();
    }
    createProcessTree(container) {
        container.classList.add('process-explorer');
        container.id = 'process-explorer';
        const renderers = [
            this.instantiationService.createInstance(ProcessRenderer, this.model),
            new ProcessHeaderTreeRenderer(),
            new MachineRenderer(),
            new ErrorRenderer()
        ];
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchDataTree), 'processExplorer', container, new ProcessListDelegate(), renderers, new ProcessTreeDataSource(), {
            accessibilityProvider: new ProcessAccessibilityProvider(),
            identityProvider: new ProcessIdentityProvider(),
            expandOnlyOnTwistieClick: true,
            renderIndentGuides: RenderIndentGuides.OnHover
        }));
        this._register(this.tree.onKeyDown(e => this.onTreeKeyDown(e)));
        this._register(this.tree.onContextMenu(e => this.onTreeContextMenu(container, e)));
        this.tree.setInput(this.model);
        this.layoutTree();
    }
    async onTreeKeyDown(e) {
        const event = new StandardKeyboardEvent(e);
        if (event.keyCode === 35 /* KeyCode.KeyE */ && event.altKey) {
            const selectionPids = this.getSelectedPids();
            await Promise.all(selectionPids.map(pid => this.killProcess?.(pid, 'SIGTERM')));
        }
    }
    onTreeContextMenu(container, e) {
        if (!isProcessItem(e.element)) {
            return;
        }
        const item = e.element;
        const pid = Number(item.pid);
        const actions = [];
        if (typeof this.killProcess === 'function') {
            actions.push(toAction({ id: 'killProcess', label: localize('killProcess', "Kill Process"), run: () => this.killProcess?.(pid, 'SIGTERM') }));
            actions.push(toAction({ id: 'forceKillProcess', label: localize('forceKillProcess', "Force Kill Process"), run: () => this.killProcess?.(pid, 'SIGKILL') }));
            actions.push(new Separator());
        }
        actions.push(toAction({
            id: 'copy',
            label: localize('copy', "Copy"),
            run: () => {
                const selectionPids = this.getSelectedPids();
                if (!selectionPids?.includes(pid)) {
                    selectionPids.length = 0; // If the selection does not contain the right clicked item, copy the right clicked item only.
                    selectionPids.push(pid);
                }
                const rows = selectionPids?.map(e => getDocument(container).getElementById(`pid-${e}`)).filter(e => !!e);
                if (rows) {
                    const text = rows.map(e => e.innerText).filter(e => !!e);
                    this.clipboardService.writeText(text.join('\n'));
                }
            }
        }));
        actions.push(toAction({
            id: 'copyAll',
            label: localize('copyAll', "Copy All"),
            run: () => {
                const processList = getDocument(container).getElementById('process-explorer');
                if (processList) {
                    this.clipboardService.writeText(processList.innerText);
                }
            }
        }));
        if (this.isDebuggable(item.cmd)) {
            actions.push(new Separator());
            actions.push(toAction({ id: 'debug', label: localize('debug', "Debug"), run: () => this.attachTo(item) }));
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => actions
        });
    }
    isDebuggable(cmd) {
        if (isWeb) {
            return false;
        }
        const matches = DEBUG_FLAGS_PATTERN.exec(cmd);
        return (matches && matches.groups.port !== '0') || cmd.indexOf('node ') >= 0 || cmd.indexOf('node.exe') >= 0;
    }
    attachTo(item) {
        const config = {
            type: 'node',
            request: 'attach',
            name: `process ${item.pid}`
        };
        let matches = DEBUG_FLAGS_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port);
        }
        else {
            config.processId = String(item.pid); // no port -> try to attach via pid (send SIGUSR1)
        }
        // a debug-port=n or inspect-port=n overrides the port
        matches = DEBUG_PORT_PATTERN.exec(item.cmd);
        if (matches) {
            config.port = Number(matches.groups.port); // override port
        }
        this.commandService.executeCommand('debug.startFromConfig', config);
    }
    getSelectedPids() {
        return coalesce(this.tree?.getSelection()?.map(e => {
            if (!isProcessItem(e)) {
                return undefined;
            }
            return e.pid;
        }) ?? []);
    }
    async update() {
        const { processes, pidToNames } = await this.resolveProcesses();
        this.model.update(processes, pidToNames);
        this.tree?.updateChildren();
        this.layoutTree();
        this.delayer.trigger(() => this.update());
    }
    focus() {
        this.tree?.domFocus();
    }
    layout(dimension) {
        this.dimensions = dimension;
        this.layoutTree();
    }
    layoutTree() {
        if (this.dimensions && this.tree) {
            this.tree.layout(this.dimensions.height, this.dimensions.width);
        }
    }
};
ProcessExplorerControl = __decorate([
    __param(0, IInstantiationService),
    __param(1, IProductService),
    __param(2, IContextMenuService),
    __param(3, ICommandService),
    __param(4, IClipboardService)
], ProcessExplorerControl);
export { ProcessExplorerControl };
let ProcessExplorerModel = class ProcessExplorerModel {
    constructor(productService) {
        this.productService = productService;
        this.processes = { processRoots: [] };
        this.mapPidToName = new Map();
    }
    update(processRoots, pidToNames) {
        // PID to Names
        this.mapPidToName.clear();
        for (const [pid, name] of pidToNames) {
            this.mapPidToName.set(pid, name);
        }
        // Processes
        processRoots.forEach((info, index) => {
            if (isProcessItem(info.rootProcess)) {
                info.rootProcess.name = index === 0 ? this.productService.applicationName : 'remote-server';
            }
        });
        this.processes = { processRoots };
    }
    getName(pid, fallback) {
        return this.mapPidToName.get(pid) ?? fallback;
    }
};
ProcessExplorerModel = __decorate([
    __param(0, IProductService)
], ProcessExplorerModel);
let BrowserProcessExplorerControl = class BrowserProcessExplorerControl extends ProcessExplorerControl {
    constructor(container, instantiationService, productService, contextMenuService, commandService, clipboardService, remoteAgentService, labelService) {
        super(instantiationService, productService, contextMenuService, commandService, clipboardService);
        this.remoteAgentService = remoteAgentService;
        this.labelService = labelService;
        this.create(container);
    }
    async resolveProcesses() {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return { pidToNames: [], processes: [] };
        }
        const processes = [];
        const hostName = this.labelService.getHostLabel(Schemas.vscodeRemote, connection.remoteAuthority);
        const result = await this.remoteAgentService.getDiagnosticInfo({ includeProcesses: true });
        if (result) {
            if (isRemoteDiagnosticError(result)) {
                processes.push({ name: result.hostName, rootProcess: result });
            }
            else if (result.processes) {
                processes.push({ name: hostName, rootProcess: result.processes });
            }
        }
        return { pidToNames: [], processes };
    }
};
BrowserProcessExplorerControl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IProductService),
    __param(3, IContextMenuService),
    __param(4, ICommandService),
    __param(5, IClipboardService),
    __param(6, IRemoteAgentService),
    __param(7, ILabelService)
], BrowserProcessExplorerControl);
export { BrowserProcessExplorerControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJvY2Vzc0V4cGxvcmVyL2Jyb3dzZXIvcHJvY2Vzc0V4cGxvcmVyQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDZCQUE2QixDQUFDO0FBQ3JDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBYSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUlsRixPQUFPLEVBQTBCLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFXLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsTUFBTSxtQkFBbUIsR0FBRyx5Q0FBeUMsQ0FBQztBQUN0RSxNQUFNLGtCQUFrQixHQUFHLCtCQUErQixDQUFDO0FBaUIzRCxTQUFTLDJCQUEyQixDQUFDLElBQWE7SUFDakQsTUFBTSxTQUFTLEdBQUcsSUFBOEMsQ0FBQztJQUVqRSxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDO0FBQ3RELENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQWE7SUFDMUMsTUFBTSxTQUFTLEdBQUcsSUFBdUMsQ0FBQztJQUUxRCxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDO0FBQ2xDLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFhO0lBQ25DLE1BQU0sU0FBUyxHQUFHLElBQStCLENBQUM7SUFFbEQsT0FBTyxPQUFPLFNBQVMsRUFBRSxHQUFHLEtBQUssUUFBUSxDQUFDO0FBQzNDLENBQUM7QUFFRCxNQUFNLG1CQUFtQjtJQUV4QixTQUFTO1FBQ1IsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWdHO1FBQzdHLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztDQUNEO0FBRUQsTUFBTSxxQkFBcUI7SUFFMUIsV0FBVyxDQUFDLE9BQStHO1FBQzFILElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDO1FBQ25DLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBK0c7UUFDMUgsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLE9BQU8sQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBSSxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLCtGQUErRjtZQUM3SCxDQUFDO1lBRUQsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUVELE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDckQsQ0FBQztDQUNEO0FBRUQsU0FBUyxTQUFTLENBQUMsU0FBc0IsRUFBRSxVQUFtQjtJQUM3RCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDMUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUN4QyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzlDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFFeEMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ25DLENBQUM7QUFhRCxNQUFNLHlCQUF5QjtJQUEvQjtRQUVVLGVBQVUsR0FBVyxRQUFRLENBQUM7SUFrQnhDLENBQUM7SUFoQkEsY0FBYyxDQUFDLFNBQXNCO1FBQ25DLFNBQVMsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBa0IsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyw4Q0FBOEM7UUFFL0ssT0FBTyxTQUFTLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBMEMsRUFBRSxLQUFhLEVBQUUsWUFBc0M7UUFDOUcsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN4RSxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pFLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXFCO1FBQ3BDLGdCQUFnQjtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGVBQWU7SUFBckI7UUFFVSxlQUFVLEdBQVcsU0FBUyxDQUFDO0lBYXpDLENBQUM7SUFYQSxjQUFjLENBQUMsU0FBc0I7UUFDcEMsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFpRCxFQUFFLEtBQWEsRUFBRSxZQUFxQztRQUNwSCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUNuRCxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXFDO1FBQ3BELGdCQUFnQjtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLGFBQWE7SUFBbkI7UUFFVSxlQUFVLEdBQVcsT0FBTyxDQUFDO0lBYXZDLENBQUM7SUFYQSxjQUFjLENBQUMsU0FBc0I7UUFDcEMsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUE2QyxFQUFFLEtBQWEsRUFBRSxZQUFxQztRQUNoSCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUMzRCxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXFDO1FBQ3BELGdCQUFnQjtJQUNqQixDQUFDO0NBQ0Q7QUFFRCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFLeEMsWUFDQyxTQUFzQixFQUNQLFlBQTJCO1FBRTFDLEtBQUssRUFBRSxDQUFDO1FBTkQsWUFBTyxHQUFHLEVBQUUsQ0FBQztRQVFwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4SCxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQWU7UUFDckIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXBCSyxnQkFBZ0I7SUFPbkIsV0FBQSxhQUFhLENBQUE7R0FQVixnQkFBZ0IsQ0FvQnJCO0FBRUQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTtJQUlwQixZQUNTLEtBQTJCLEVBQ3BCLFlBQTRDO1FBRG5ELFVBQUssR0FBTCxLQUFLLENBQXNCO1FBQ0gsaUJBQVksR0FBWixZQUFZLENBQWU7UUFKbkQsZUFBVSxHQUFXLFNBQVMsQ0FBQztJQUtwQyxDQUFDO0lBRUwsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVqQyxPQUFPO1lBQ04sSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1lBQ1osTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO1lBQ2xCLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNaLEtBQUssRUFBRSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQztTQUN4RCxDQUFDO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFrQyxFQUFFLEtBQWEsRUFBRSxZQUFzQztRQUN0RyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXpCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5DLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlFLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztRQUNuQyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWMsQ0FBQyxFQUFFLEdBQUcsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVsRCxZQUFZLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFzQztRQUNyRCxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQy9CLENBQUM7Q0FDRCxDQUFBO0FBdENLLGVBQWU7SUFNbEIsV0FBQSxhQUFhLENBQUE7R0FOVixlQUFlLENBc0NwQjtBQUVELE1BQU0sNEJBQTRCO0lBRWpDLGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxZQUFZLENBQUMsT0FBMEU7UUFDdEYsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDckIsQ0FBQztRQUVELElBQUksdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDekIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBRUQsTUFBTSx1QkFBdUI7SUFFNUIsS0FBSyxDQUFDLE9BQTBFO1FBQy9FLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsT0FBTyxXQUFXLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDckIsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7Q0FDRDtBQUVELFlBQVk7QUFFTCxJQUFlLHNCQUFzQixHQUFyQyxNQUFlLHNCQUF1QixTQUFRLFVBQVU7SUFTOUQsWUFDd0Isb0JBQTRELEVBQ2xFLGNBQWdELEVBQzVDLGtCQUF3RCxFQUM1RCxjQUFnRCxFQUM5QyxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFOZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNqRCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDM0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUMzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDN0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQVpoRSxlQUFVLEdBQTBCLFNBQVMsQ0FBQztRQUtyQyxZQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBVzVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUtTLE1BQU0sQ0FBQyxTQUFzQjtRQUN0QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFbEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFNBQXNCO1FBQy9DLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDNUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQztRQUVsQyxNQUFNLFNBQVMsR0FBRztZQUNqQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ3JFLElBQUkseUJBQXlCLEVBQUU7WUFDL0IsSUFBSSxlQUFlLEVBQUU7WUFDckIsSUFBSSxhQUFhLEVBQUU7U0FDbkIsQ0FBQztRQUVGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUNsRSxDQUFBLGlCQUF1SSxDQUFBLEVBQ3ZJLGlCQUFpQixFQUNqQixTQUFTLEVBQ1QsSUFBSSxtQkFBbUIsRUFBRSxFQUN6QixTQUFTLEVBQ1QsSUFBSSxxQkFBcUIsRUFBRSxFQUMzQjtZQUNDLHFCQUFxQixFQUFFLElBQUksNEJBQTRCLEVBQUU7WUFDekQsZ0JBQWdCLEVBQUUsSUFBSSx1QkFBdUIsRUFBRTtZQUMvQyx3QkFBd0IsRUFBRSxJQUFJO1lBQzlCLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLE9BQU87U0FDOUMsQ0FBQyxDQUFDLENBQUM7UUFFTCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRW5GLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBZ0I7UUFDM0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxJQUFJLEtBQUssQ0FBQyxPQUFPLDBCQUFpQixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0MsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFNBQXNCLEVBQUUsQ0FBdUk7UUFDeEwsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdkIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU3QixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUM7UUFFOUIsSUFBSSxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdJLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUU3SixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDckIsRUFBRSxFQUFFLE1BQU07WUFDVixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7WUFDL0IsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBRTdDLElBQUksQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsOEZBQThGO29CQUN4SCxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QixDQUFDO2dCQUVELE1BQU0sSUFBSSxHQUFHLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekcsSUFBSSxJQUFJLEVBQUUsQ0FBQztvQkFDVixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDekQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNyQixFQUFFLEVBQUUsU0FBUztZQUNiLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztZQUN0QyxHQUFHLEVBQUUsR0FBRyxFQUFFO2dCQUNULE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDOUUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3hELENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzVHLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1lBQ3ZDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUN6QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztTQUN6QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sWUFBWSxDQUFDLEdBQVc7UUFDL0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUU5QyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFPLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9HLENBQUM7SUFFTyxRQUFRLENBQUMsSUFBaUI7UUFDakMsTUFBTSxNQUFNLEdBQXVGO1lBQ2xHLElBQUksRUFBRSxNQUFNO1lBQ1osT0FBTyxFQUFFLFFBQVE7WUFDakIsSUFBSSxFQUFFLFdBQVcsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUMzQixDQUFDO1FBRUYsSUFBSSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtEQUFrRDtRQUN4RixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRU8sZUFBZTtRQUN0QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsRCxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFFRCxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDZCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTTtRQUNuQixNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFFaEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRWxCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQW9CO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBRTVCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRU8sVUFBVTtRQUNqQixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBck1xQixzQkFBc0I7SUFVekMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0dBZEUsc0JBQXNCLENBcU0zQzs7QUFFRCxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQU16QixZQUE2QixjQUF1QztRQUEvQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFKcEUsY0FBUyxHQUF3QixFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUVyQyxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBRWMsQ0FBQztJQUV6RSxNQUFNLENBQUMsWUFBMEMsRUFBRSxVQUE4QjtRQUVoRixlQUFlO1FBQ2YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUUxQixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxZQUFZO1FBQ1osWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUNwQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztZQUM3RixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsWUFBWSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFXLEVBQUUsUUFBZ0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUM7SUFDL0MsQ0FBQztDQUNELENBQUE7QUE5Qkssb0JBQW9CO0lBTVosV0FBQSxlQUFlLENBQUE7R0FOdkIsb0JBQW9CLENBOEJ6QjtBQUVNLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsc0JBQXNCO0lBRXhFLFlBQ0MsU0FBc0IsRUFDQyxvQkFBMkMsRUFDakQsY0FBK0IsRUFDM0Isa0JBQXVDLEVBQzNDLGNBQStCLEVBQzdCLGdCQUFtQyxFQUNoQixrQkFBdUMsRUFDN0MsWUFBMkI7UUFFM0QsS0FBSyxDQUFDLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUg1RCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzdDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBSTNELElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVrQixLQUFLLENBQUMsZ0JBQWdCO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMzRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQzFDLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBMEUsRUFBRSxDQUFDO1FBRTVGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2xHLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRixJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDaEUsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDN0IsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUM7SUFDdEMsQ0FBQztDQUNELENBQUE7QUFyQ1ksNkJBQTZCO0lBSXZDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0dBVkgsNkJBQTZCLENBcUN6QyJ9