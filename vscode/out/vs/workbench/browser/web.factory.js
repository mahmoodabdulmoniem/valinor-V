/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Menu } from './web.api.js';
import { BrowserMain } from './web.main.js';
import { URI } from '../../base/common/uri.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { mark } from '../../base/common/performance.js';
import { MenuId, MenuRegistry } from '../../platform/actions/common/actions.js';
import { DeferredPromise } from '../../base/common/async.js';
import { asArray } from '../../base/common/arrays.js';
let created = false;
const workbenchPromise = new DeferredPromise();
/**
 * Creates the workbench with the provided options in the provided container.
 *
 * @param domElement the container to create the workbench in
 * @param options for setting up the workbench
 */
export function create(domElement, options) {
    // Mark start of workbench
    mark('code/didLoadWorkbenchMain');
    // Assert that the workbench is not created more than once. We currently
    // do not support this and require a full context switch to clean-up.
    if (created) {
        throw new Error('Unable to create the VSCode workbench more than once.');
    }
    else {
        created = true;
    }
    // Register commands if any
    if (Array.isArray(options.commands)) {
        for (const command of options.commands) {
            CommandsRegistry.registerCommand(command.id, (accessor, ...args) => {
                // we currently only pass on the arguments but not the accessor
                // to the command to reduce our exposure of internal API.
                return command.handler(...args);
            });
            // Commands with labels appear in the command palette
            if (command.label) {
                for (const menu of asArray(command.menu ?? Menu.CommandPalette)) {
                    MenuRegistry.appendMenuItem(asMenuId(menu), { command: { id: command.id, title: command.label } });
                }
            }
        }
    }
    // Startup workbench and resolve waiters
    let instantiatedWorkbench = undefined;
    new BrowserMain(domElement, options).open().then(workbench => {
        instantiatedWorkbench = workbench;
        workbenchPromise.complete(workbench);
    });
    return toDisposable(() => {
        if (instantiatedWorkbench) {
            instantiatedWorkbench.shutdown();
        }
        else {
            workbenchPromise.p.then(instantiatedWorkbench => instantiatedWorkbench.shutdown());
        }
    });
}
function asMenuId(menu) {
    switch (menu) {
        case Menu.CommandPalette: return MenuId.CommandPalette;
        case Menu.StatusBarWindowIndicatorMenu: return MenuId.StatusBarWindowIndicatorMenu;
    }
}
export var commands;
(function (commands) {
    /**
     * {@linkcode IWorkbench.commands IWorkbench.commands.executeCommand}
     */
    async function executeCommand(command, ...args) {
        const workbench = await workbenchPromise.p;
        return workbench.commands.executeCommand(command, ...args);
    }
    commands.executeCommand = executeCommand;
})(commands || (commands = {}));
export var logger;
(function (logger) {
    /**
     * {@linkcode IWorkbench.logger IWorkbench.logger.log}
     */
    function log(level, message) {
        workbenchPromise.p.then(workbench => workbench.logger.log(level, message));
    }
    logger.log = log;
})(logger || (logger = {}));
export var env;
(function (env) {
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.retrievePerformanceMarks}
     */
    async function retrievePerformanceMarks() {
        const workbench = await workbenchPromise.p;
        return workbench.env.retrievePerformanceMarks();
    }
    env.retrievePerformanceMarks = retrievePerformanceMarks;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.getUriScheme}
     */
    async function getUriScheme() {
        const workbench = await workbenchPromise.p;
        return workbench.env.getUriScheme();
    }
    env.getUriScheme = getUriScheme;
    /**
     * {@linkcode IWorkbench.env IWorkbench.env.openUri}
     */
    async function openUri(target) {
        const workbench = await workbenchPromise.p;
        return workbench.env.openUri(URI.isUri(target) ? target : URI.from(target));
    }
    env.openUri = openUri;
})(env || (env = {}));
export var window;
(function (window) {
    /**
     * {@linkcode IWorkbench.window IWorkbench.window.withProgress}
     */
    async function withProgress(options, task) {
        const workbench = await workbenchPromise.p;
        return workbench.window.withProgress(options, task);
    }
    window.withProgress = withProgress;
    async function createTerminal(options) {
        const workbench = await workbenchPromise.p;
        workbench.window.createTerminal(options);
    }
    window.createTerminal = createTerminal;
    async function showInformationMessage(message, ...items) {
        const workbench = await workbenchPromise.p;
        return await workbench.window.showInformationMessage(message, ...items);
    }
    window.showInformationMessage = showInformationMessage;
})(window || (window = {}));
export var workspace;
(function (workspace) {
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.didResolveRemoteAuthority}
     */
    async function didResolveRemoteAuthority() {
        const workbench = await workbenchPromise.p;
        await workbench.workspace.didResolveRemoteAuthority();
    }
    workspace.didResolveRemoteAuthority = didResolveRemoteAuthority;
    /**
     * {@linkcode IWorkbench.workspace IWorkbench.workspace.openTunnel}
     */
    async function openTunnel(tunnelOptions) {
        const workbench = await workbenchPromise.p;
        return workbench.workspace.openTunnel(tunnelOptions);
    }
    workspace.openTunnel = openTunnel;
})(workspace || (workspace = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLmZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3dlYi5mYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBc0UsSUFBSSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDNUMsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLdEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQWMsQ0FBQztBQUUzRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxNQUFNLENBQUMsVUFBdUIsRUFBRSxPQUFzQztJQUVyRiwwQkFBMEI7SUFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFFbEMsd0VBQXdFO0lBQ3hFLHFFQUFxRTtJQUNyRSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO0lBQzFFLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FB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