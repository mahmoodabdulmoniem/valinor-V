/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as performance from '../../../base/common/performance.js';
import { createApiFactoryAndRegisterActors } from '../common/extHost.api.impl.js';
import { RequireInterceptor } from '../common/extHostRequireInterceptor.js';
import { connectProxyResolver } from './proxyResolver.js';
import { AbstractExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostDownloadService } from './extHostDownloadService.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { ExtensionRuntime } from '../common/extHostTypes.js';
import { CLIServer } from './extHostCLIServer.js';
import { realpathSync } from '../../../base/node/pfs.js';
import { ExtHostConsoleForwarder } from './extHostConsoleForwarder.js';
import { ExtHostDiskFileSystemProvider } from './extHostDiskFileSystemProvider.js';
import nodeModule from 'node:module';
import { assertType } from '../../../base/common/types.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { BidirectionalMap } from '../../../base/common/map.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
const require = nodeModule.createRequire(import.meta.url);
class NodeModuleRequireInterceptor extends RequireInterceptor {
    _installInterceptor() {
        const that = this;
        const node_module = require('module');
        const originalLoad = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            request = applyAlternatives(request);
            if (!that._factories.has(request)) {
                return originalLoad.apply(this, arguments);
            }
            return that._factories.get(request).load(request, URI.file(realpathSync(parent.filename)), request => originalLoad.apply(this, [request, parent, isMain]));
        };
        const originalLookup = node_module._resolveLookupPaths;
        node_module._resolveLookupPaths = (request, parent) => {
            return originalLookup.call(this, applyAlternatives(request), parent);
        };
        const originalResolveFilename = node_module._resolveFilename;
        node_module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
            if (request === 'vsda' && Array.isArray(options?.paths) && options.paths.length === 0) {
                // ESM: ever since we moved to ESM, `require.main` will be `undefined` for extensions
                // Some extensions have been using `require.resolve('vsda', { paths: require.main.paths })`
                // to find the `vsda` module in our app root. To be backwards compatible with this pattern,
                // we help by filling in the `paths` array with the node modules paths of the current module.
                options.paths = node_module._nodeModulePaths(import.meta.dirname);
            }
            return originalResolveFilename.call(this, request, parent, isMain, options);
        };
        const applyAlternatives = (request) => {
            for (const alternativeModuleName of that._alternatives) {
                const alternative = alternativeModuleName(request);
                if (alternative) {
                    request = alternative;
                    break;
                }
            }
            return request;
        };
    }
}
class NodeModuleESMInterceptor extends RequireInterceptor {
    constructor() {
        super(...arguments);
        this._store = new DisposableStore();
    }
    static _createDataUri(scriptContent) {
        return `data:text/javascript;base64,${Buffer.from(scriptContent).toString('base64')}`;
    }
    // This string is a script that runs in the loader thread of NodeJS.
    static { this._loaderScript = `
	let lookup;
	export const initialize = async (context) => {
		let requestIds = 0;
		const { port } = context;
		const pendingRequests = new Map();
		port.onmessage = (event) => {
			const { id, url } = event.data;
			pendingRequests.get(id)?.(url);
		};
		lookup = url => {
			// debugger;
			const myId = requestIds++;
			return new Promise((resolve) => {
				pendingRequests.set(myId, resolve);
				port.postMessage({ id: myId, url, });
			});
		};
	};
	export const resolve = async (specifier, context, nextResolve) => {
		if (specifier !== 'vscode' || !context.parentURL) {
			return nextResolve(specifier, context);
		}
		const otherUrl = await lookup(context.parentURL);
		return {
			url: otherUrl,
			shortCircuit: true,
		};
	};`; }
    static { this._vscodeImportFnName = `_VSCODE_IMPORT_VSCODE_API`; }
    dispose() {
        this._store.dispose();
    }
    _installInterceptor() {
        const apiInstances = new BidirectionalMap();
        const apiImportDataUrl = new Map();
        // define a global function that can be used to get API instances given a random key
        Object.defineProperty(globalThis, NodeModuleESMInterceptor._vscodeImportFnName, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: (key) => {
                return apiInstances.getKey(key);
            }
        });
        const { port1, port2 } = new MessageChannel();
        let apiModuleFactory;
        // this is a workaround for the fact that the layer checker does not understand
        // that onmessage is NodeJS API here
        const port1LayerCheckerWorkaround = port1;
        port1LayerCheckerWorkaround.onmessage = (e) => {
            // Get the vscode-module factory - which is the same logic that's also used by
            // the CommonJS require interceptor
            if (!apiModuleFactory) {
                apiModuleFactory = this._factories.get('vscode');
                assertType(apiModuleFactory);
            }
            const { id, url } = e.data;
            const uri = URI.parse(url);
            // Get or create the API instance. The interface is per extension and extensions are
            // looked up by the uri (e.data.url) and path containment.
            const apiInstance = apiModuleFactory.load('_not_used', uri, () => { throw new Error('CANNOT LOAD MODULE from here.'); });
            let key = apiInstances.get(apiInstance);
            if (!key) {
                key = generateUuid();
                apiInstances.set(apiInstance, key);
            }
            // Create and cache a data-url which is the import script for the API instance
            let scriptDataUrlSrc = apiImportDataUrl.get(key);
            if (!scriptDataUrlSrc) {
                const jsCode = `const _vscodeInstance = globalThis.${NodeModuleESMInterceptor._vscodeImportFnName}('${key}');\n\n${Object.keys(apiInstance).map((name => `export const ${name} = _vscodeInstance['${name}'];`)).join('\n')}`;
                scriptDataUrlSrc = NodeModuleESMInterceptor._createDataUri(jsCode);
                apiImportDataUrl.set(key, scriptDataUrlSrc);
            }
            port1.postMessage({
                id,
                url: scriptDataUrlSrc
            });
        };
        nodeModule.register(NodeModuleESMInterceptor._createDataUri(NodeModuleESMInterceptor._loaderScript), {
            parentURL: import.meta.url,
            data: { port: port2 },
            transferList: [port2],
        });
        this._store.add(toDisposable(() => {
            port1.close();
            port2.close();
        }));
    }
}
export class ExtHostExtensionService extends AbstractExtHostExtensionService {
    constructor() {
        super(...arguments);
        this.extensionRuntime = ExtensionRuntime.Node;
    }
    async _beforeAlmostReadyToRunExtensions() {
        // make sure console.log calls make it to the render
        this._instaService.createInstance(ExtHostConsoleForwarder);
        // initialize API and register actors
        const extensionApiFactory = this._instaService.invokeFunction(createApiFactoryAndRegisterActors);
        // Register Download command
        this._instaService.createInstance(ExtHostDownloadService);
        // Register CLI Server for ipc
        if (this._initData.remote.isRemote && this._initData.remote.authority) {
            const cliServer = this._instaService.createInstance(CLIServer);
            process.env['VSCODE_IPC_HOOK_CLI'] = cliServer.ipcHandlePath;
        }
        // Register local file system shortcut
        this._instaService.createInstance(ExtHostDiskFileSystemProvider);
        // Module loading tricks
        await this._instaService.createInstance(NodeModuleRequireInterceptor, extensionApiFactory, { mine: this._myRegistry, all: this._globalRegistry })
            .install();
        // ESM loading tricks
        await this._store.add(this._instaService.createInstance(NodeModuleESMInterceptor, extensionApiFactory, { mine: this._myRegistry, all: this._globalRegistry }))
            .install();
        performance.mark('code/extHost/didInitAPI');
        // Do this when extension service exists, but extensions are not being activated yet.
        const configProvider = await this._extHostConfiguration.getConfigProvider();
        await connectProxyResolver(this._extHostWorkspace, configProvider, this, this._logService, this._mainThreadTelemetryProxy, this._initData, this._store);
        performance.mark('code/extHost/didInitProxyResolver');
    }
    _getEntryPoint(extensionDescription) {
        return extensionDescription.main;
    }
    async _doLoadModule(extension, module, activationTimesBuilder, mode) {
        if (module.scheme !== Schemas.file) {
            throw new Error(`Cannot load URI: '${module}', must be of file-scheme`);
        }
        let r = null;
        activationTimesBuilder.codeLoadingStart();
        this._logService.trace(`ExtensionService#loadModule [${mode}] -> ${module.toString(true)}`);
        this._logService.flush();
        const extensionId = extension?.identifier.value;
        if (extension) {
            await this._extHostLocalizationService.initializeLocalizedMessages(extension);
        }
        try {
            if (extensionId) {
                performance.mark(`code/extHost/willLoadExtensionCode/${extensionId}`);
            }
            if (mode === 'esm') {
                r = await import(module.toString(true));
            }
            else {
                r = require(module.fsPath);
            }
        }
        finally {
            if (extensionId) {
                performance.mark(`code/extHost/didLoadExtensionCode/${extensionId}`);
            }
            activationTimesBuilder.codeLoadingStop();
        }
        return r;
    }
    async _loadCommonJSModule(extension, module, activationTimesBuilder) {
        return this._doLoadModule(extension, module, activationTimesBuilder, 'cjs');
    }
    async _loadESMModule(extension, module, activationTimesBuilder) {
        return this._doLoadModule(extension, module, activationTimesBuilder, 'esm');
    }
    async $setRemoteEnvironment(env) {
        if (!this._initData.remote.isRemote) {
            return;
        }
        for (const key in env) {
            const value = env[key];
            if (value === null) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0RXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2xGLE9BQU8sRUFBc0Isa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkYsT0FBTyxVQUFVLE1BQU0sYUFBYSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1B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