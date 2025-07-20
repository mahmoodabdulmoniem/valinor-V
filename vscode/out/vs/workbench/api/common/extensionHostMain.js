/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as errors from '../../../base/common/errors.js';
import * as performance from '../../../base/common/performance.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { RPCProtocol } from '../../services/extensions/common/rpcProtocol.js';
import { ExtensionError } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { getSingletonServiceDescriptors } from '../../../platform/instantiation/common/extensions.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { IExtHostRpcService, ExtHostRpcService } from './extHostRpcService.js';
import { IURITransformerService, URITransformerService } from './extHostUriTransformerService.js';
import { IExtHostExtensionService, IHostUtils } from './extHostExtensionService.js';
import { IExtHostTelemetry } from './extHostTelemetry.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
export class ErrorHandler {
    static async installEarlyHandler(accessor) {
        // increase number of stack frames (from 10, https://github.com/v8/v8/wiki/Stack-Trace-API)
        Error.stackTraceLimit = 100;
        // does NOT dependent of extension information, can be installed immediately, and simply forwards
        // to the log service and main thread errors
        const logService = accessor.get(ILogService);
        const rpcService = accessor.get(IExtHostRpcService);
        const mainThreadErrors = rpcService.getProxy(MainContext.MainThreadErrors);
        errors.setUnexpectedErrorHandler(err => {
            logService.error(err);
            const data = errors.transformErrorForSerialization(err);
            mainThreadErrors.$onUnexpectedError(data);
        });
    }
    static async installFullHandler(accessor) {
        // uses extension knowledges to correlate errors with extensions
        const logService = accessor.get(ILogService);
        const rpcService = accessor.get(IExtHostRpcService);
        const extensionService = accessor.get(IExtHostExtensionService);
        const extensionTelemetry = accessor.get(IExtHostTelemetry);
        const apiDeprecationService = accessor.get(IExtHostApiDeprecationService);
        const mainThreadExtensions = rpcService.getProxy(MainContext.MainThreadExtensionService);
        const mainThreadErrors = rpcService.getProxy(MainContext.MainThreadErrors);
        const extensionsRegistry = await extensionService.getExtensionRegistry();
        const extensionsMap = await extensionService.getExtensionPathIndex();
        const extensionErrors = new WeakMap();
        // PART 1
        // set the prepareStackTrace-handle and use it as a side-effect to associate errors
        // with extensions - this works by looking up callsites in the extension path index
        function prepareStackTraceAndFindExtension(error, stackTrace) {
            if (extensionErrors.has(error)) {
                return extensionErrors.get(error).stack;
            }
            let stackTraceMessage = '';
            let extension;
            let fileName;
            for (const call of stackTrace) {
                stackTraceMessage += `\n\tat ${call.toString()}`;
                fileName = call.getFileName();
                if (!extension && fileName) {
                    extension = extensionsMap.findSubstr(URI.file(fileName));
                }
            }
            const result = `${error.name || 'Error'}: ${error.message || ''}${stackTraceMessage}`;
            extensionErrors.set(error, { extensionIdentifier: extension?.identifier, stack: result });
            return result;
        }
        const _wasWrapped = Symbol('prepareStackTrace wrapped');
        let _prepareStackTrace = prepareStackTraceAndFindExtension;
        Object.defineProperty(Error, 'prepareStackTrace', {
            configurable: false,
            get() {
                return _prepareStackTrace;
            },
            set(v) {
                if (v === prepareStackTraceAndFindExtension || !v || v[_wasWrapped]) {
                    _prepareStackTrace = v || prepareStackTraceAndFindExtension;
                    return;
                }
                _prepareStackTrace = function (error, stackTrace) {
                    prepareStackTraceAndFindExtension(error, stackTrace);
                    return v.call(Error, error, stackTrace);
                };
                Object.assign(_prepareStackTrace, { [_wasWrapped]: true });
            },
        });
        // PART 2
        // set the unexpectedErrorHandler and check for extensions that have been identified as
        // having caused the error. Note that the runtime order is actually reversed, the code
        // below accesses the stack-property which triggers the code above
        errors.setUnexpectedErrorHandler(err => {
            if (!errors.PendingMigrationError.is(err)) {
                logService.error(err);
            }
            const errorData = errors.transformErrorForSerialization(err);
            let extension;
            if (err instanceof ExtensionError) {
                extension = err.extension;
            }
            else {
                const stackData = extensionErrors.get(err);
                extension = stackData?.extensionIdentifier;
            }
            if (!extension) {
                return;
            }
            if (errors.PendingMigrationError.is(err)) {
                // report pending migration via the API deprecation service which (1) informs the extensions author during
                // dev-time and (2) collects telemetry so that we can reach out too
                const extensionDesc = extensionsRegistry.getExtensionDescription(extension);
                if (extensionDesc) {
                    apiDeprecationService.report(err.name, extensionDesc, `${err.message}\n FROM: ${err.stack}`);
                }
            }
            else {
                mainThreadExtensions.$onExtensionRuntimeError(extension, errorData);
                const reported = extensionTelemetry.onExtensionError(extension, err);
                logService.trace('forwarded error to extension?', reported, extension);
            }
        });
        errors.errorHandler.addListener(err => {
            mainThreadErrors.$onUnexpectedError(err);
        });
    }
}
export class ExtensionHostMain {
    constructor(protocol, initData, hostUtils, uriTransformer, messagePorts) {
        this._hostUtils = hostUtils;
        this._rpcProtocol = new RPCProtocol(protocol, null, uriTransformer);
        // ensure URIs are transformed and revived
        initData = ExtensionHostMain._transform(initData, this._rpcProtocol);
        // bootstrap services
        const services = new ServiceCollection(...getSingletonServiceDescriptors());
        services.set(IExtHostInitDataService, { _serviceBrand: undefined, ...initData, messagePorts });
        services.set(IExtHostRpcService, new ExtHostRpcService(this._rpcProtocol));
        services.set(IURITransformerService, new URITransformerService(uriTransformer));
        services.set(IHostUtils, hostUtils);
        const instaService = new InstantiationService(services, true);
        instaService.invokeFunction(ErrorHandler.installEarlyHandler);
        // ugly self - inject
        this._logService = instaService.invokeFunction(accessor => accessor.get(ILogService));
        performance.mark(`code/extHost/didCreateServices`);
        if (this._hostUtils.pid) {
            this._logService.info(`Extension host with pid ${this._hostUtils.pid} started`);
        }
        else {
            this._logService.info(`Extension host started`);
        }
        this._logService.trace('initData', initData);
        // ugly self - inject
        // must call initialize *after* creating the extension service
        // because `initialize` itself creates instances that depend on it
        this._extensionService = instaService.invokeFunction(accessor => accessor.get(IExtHostExtensionService));
        this._extensionService.initialize();
        // install error handler that is extension-aware
        instaService.invokeFunction(ErrorHandler.installFullHandler);
    }
    async asBrowserUri(uri) {
        const mainThreadExtensionsProxy = this._rpcProtocol.getProxy(MainContext.MainThreadExtensionService);
        return URI.revive(await mainThreadExtensionsProxy.$asBrowserUri(uri));
    }
    terminate(reason) {
        this._extensionService.terminate(reason);
    }
    static _transform(initData, rpcProtocol) {
        initData.extensions.allExtensions.forEach((ext) => {
            ext.extensionLocation = URI.revive(rpcProtocol.transformIncomingURIs(ext.extensionLocation));
        });
        initData.environment.appRoot = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.appRoot));
        const extDevLocs = initData.environment.extensionDevelopmentLocationURI;
        if (extDevLocs) {
            initData.environment.extensionDevelopmentLocationURI = extDevLocs.map(url => URI.revive(rpcProtocol.transformIncomingURIs(url)));
        }
        initData.environment.extensionTestsLocationURI = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.extensionTestsLocationURI));
        initData.environment.globalStorageHome = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.globalStorageHome));
        initData.environment.workspaceStorageHome = URI.revive(rpcProtocol.transformIncomingURIs(initData.environment.workspaceStorageHome));
        initData.nlsBaseUrl = URI.revive(rpcProtocol.transformIncomingURIs(initData.nlsBaseUrl));
        initData.logsLocation = URI.revive(rpcProtocol.transformIncomingURIs(initData.logsLocation));
        initData.workspace = rpcProtocol.transformIncomingURIs(initData.workspace);
        return initData;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdE1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dGVuc2lvbkhvc3RNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHbEQsT0FBTyxFQUFFLFdBQVcsRUFBMEIsTUFBTSx1QkFBdUIsQ0FBQztBQUU1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBOEMsTUFBTSxtREFBbUQsQ0FBQztBQUMvSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVCQUF1QixD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