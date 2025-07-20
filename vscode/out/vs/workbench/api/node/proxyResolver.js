/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { LogLevel as LogServiceLevel } from '../../../platform/log/common/log.js';
import { LogLevel, createHttpPatch, createProxyResolver, createTlsPatch, createNetPatch, loadSystemCertificates } from '@vscode/proxy-agent';
import { createRequire } from 'node:module';
import { lookupKerberosAuthorization } from '../../../platform/request/node/requestService.js';
import * as proxyAgent from '@vscode/proxy-agent';
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');
const tls = require('tls');
const net = require('net');
const systemCertificatesV2Default = false;
const useElectronFetchDefault = false;
export function connectProxyResolver(extHostWorkspace, configProvider, extensionService, extHostLogService, mainThreadTelemetry, initData, disposables) {
    const isRemote = initData.remote.isRemote;
    const useHostProxyDefault = initData.environment.useHostProxy ?? !isRemote;
    const fallbackToLocalKerberos = useHostProxyDefault;
    const loadLocalCertificates = useHostProxyDefault;
    const isUseHostProxyEnabled = () => !isRemote || configProvider.getConfiguration('http').get('useLocalProxyConfiguration', useHostProxyDefault);
    const params = {
        resolveProxy: url => extHostWorkspace.resolveProxy(url),
        lookupProxyAuthorization: lookupProxyAuthorization.bind(undefined, extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, {}, {}, initData.remote.isRemote, fallbackToLocalKerberos),
        getProxyURL: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxy'),
        getProxySupport: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxySupport') || 'off',
        getNoProxyConfig: () => getExtHostConfigValue(configProvider, isRemote, 'http.noProxy') || [],
        isAdditionalFetchSupportEnabled: () => getExtHostConfigValue(configProvider, isRemote, 'http.fetchAdditionalSupport', true),
        addCertificatesV1: () => certSettingV1(configProvider, isRemote),
        addCertificatesV2: () => certSettingV2(configProvider, isRemote),
        log: extHostLogService,
        getLogLevel: () => {
            const level = extHostLogService.getLevel();
            switch (level) {
                case LogServiceLevel.Trace: return LogLevel.Trace;
                case LogServiceLevel.Debug: return LogLevel.Debug;
                case LogServiceLevel.Info: return LogLevel.Info;
                case LogServiceLevel.Warning: return LogLevel.Warning;
                case LogServiceLevel.Error: return LogLevel.Error;
                case LogServiceLevel.Off: return LogLevel.Off;
                default: return never(level);
            }
            function never(level) {
                extHostLogService.error('Unknown log level', level);
                return LogLevel.Debug;
            }
        },
        proxyResolveTelemetry: () => { },
        isUseHostProxyEnabled,
        loadAdditionalCertificates: async () => {
            const promises = [];
            if (initData.remote.isRemote) {
                promises.push(loadSystemCertificates({ log: extHostLogService }));
            }
            if (loadLocalCertificates) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading certificates from main process');
                const certs = extHostWorkspace.loadCertificates(); // Loading from main process to share cache.
                certs.then(certs => extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loaded certificates from main process', certs.length));
                promises.push(certs);
            }
            // Using https.globalAgent because it is shared with proxy.test.ts and mutable.
            if (initData.environment.extensionTestsLocationURI && https.globalAgent.testCertificates?.length) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading test certificates');
                promises.push(Promise.resolve(https.globalAgent.testCertificates));
            }
            return (await Promise.all(promises)).flat();
        },
        env: process.env,
    };
    const { resolveProxyWithRequest, resolveProxyURL } = createProxyResolver(params);
    const target = proxyAgent.default || proxyAgent;
    target.resolveProxyURL = resolveProxyURL;
    patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables);
    const lookup = createPatchedModules(params, resolveProxyWithRequest);
    return configureModuleLoading(extensionService, lookup);
}
const unsafeHeaders = [
    'content-length',
    'host',
    'trailer',
    'te',
    'upgrade',
    'cookie2',
    'keep-alive',
    'transfer-encoding',
    'set-cookie',
];
function patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables) {
    if (!globalThis.__vscodeOriginalFetch) {
        const originalFetch = globalThis.fetch;
        globalThis.__vscodeOriginalFetch = originalFetch;
        const patchedFetch = proxyAgent.createFetchPatch(params, originalFetch, resolveProxyURL);
        globalThis.__vscodePatchedFetch = patchedFetch;
        let useElectronFetch = false;
        if (!initData.remote.isRemote) {
            useElectronFetch = configProvider.getConfiguration('http').get('electronFetch', useElectronFetchDefault);
            disposables.add(configProvider.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('http.electronFetch')) {
                    useElectronFetch = configProvider.getConfiguration('http').get('electronFetch', useElectronFetchDefault);
                }
            }));
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
        globalThis.fetch = async function fetch(input, init) {
            function getRequestProperty(name) {
                return init && name in init ? init[name] : typeof input === 'object' && 'cache' in input ? input[name] : undefined;
            }
            // Limitations: https://github.com/electron/electron/pull/36733#issuecomment-1405615494
            // net.fetch fails on manual redirect: https://github.com/electron/electron/issues/43715
            const urlString = typeof input === 'string' ? input : 'cache' in input ? input.url : input.toString();
            const isDataUrl = urlString.startsWith('data:');
            if (isDataUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'data');
            }
            const isBlobUrl = urlString.startsWith('blob:');
            if (isBlobUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'blob');
            }
            const isManualRedirect = getRequestProperty('redirect') === 'manual';
            if (isManualRedirect) {
                recordFetchFeatureUse(mainThreadTelemetry, 'manualRedirect');
            }
            const integrity = getRequestProperty('integrity');
            if (integrity) {
                recordFetchFeatureUse(mainThreadTelemetry, 'integrity');
            }
            if (!useElectronFetch || isDataUrl || isBlobUrl || isManualRedirect || integrity) {
                const response = await patchedFetch(input, init);
                monitorResponseProperties(mainThreadTelemetry, response, urlString);
                return response;
            }
            // Unsupported headers: https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/cpp/header_util.cc;l=32;drc=ee7299f8961a1b05a3554efcc496b6daa0d7f6e1
            if (init?.headers) {
                const headers = new Headers(init.headers);
                for (const header of unsafeHeaders) {
                    headers.delete(header);
                }
                init = { ...init, headers };
            }
            // Support for URL: https://github.com/electron/electron/issues/43712
            const electronInput = input instanceof URL ? input.toString() : input;
            const electron = require('electron');
            const response = await electron.net.fetch(electronInput, init);
            monitorResponseProperties(mainThreadTelemetry, response, urlString);
            return response;
        };
    }
}
function monitorResponseProperties(mainThreadTelemetry, response, urlString) {
    const originalUrl = response.url;
    Object.defineProperty(response, 'url', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'url');
            return originalUrl || urlString;
        }
    });
    const originalType = response.type;
    Object.defineProperty(response, 'type', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'typeProperty');
            return originalType !== 'default' ? originalType : 'basic';
        }
    });
}
const fetchFeatureUse = {
    url: 0,
    typeProperty: 0,
    data: 0,
    blob: 0,
    integrity: 0,
    manualRedirect: 0,
};
let timer;
const enableFeatureUseTelemetry = false;
function recordFetchFeatureUse(mainThreadTelemetry, feature) {
    if (enableFeatureUseTelemetry && !fetchFeatureUse[feature]++) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            mainThreadTelemetry.$publicLog2('fetchFeatureUse', fetchFeatureUse);
        }, 10000); // collect additional features for 10 seconds
        timer.unref?.();
    }
}
function createPatchedModules(params, resolveProxy) {
    function mergeModules(module, patch) {
        const target = module.default || module;
        target.__vscodeOriginal = Object.assign({}, target);
        return Object.assign(target, patch);
    }
    return {
        http: mergeModules(http, createHttpPatch(params, http, resolveProxy)),
        https: mergeModules(https, createHttpPatch(params, https, resolveProxy)),
        net: mergeModules(net, createNetPatch(params, net)),
        tls: mergeModules(tls, createTlsPatch(params, tls))
    };
}
function certSettingV1(configProvider, isRemote) {
    return !getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates');
}
function certSettingV2(configProvider, isRemote) {
    return !!getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates');
}
const modulesCache = new Map();
function configureModuleLoading(extensionService, lookup) {
    return extensionService.getExtensionPathIndex()
        .then(extensionPaths => {
        const node_module = require('module');
        const original = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            if (request === 'net') {
                return lookup.net;
            }
            if (request === 'tls') {
                return lookup.tls;
            }
            if (request !== 'http' && request !== 'https' && request !== 'undici') {
                return original.apply(this, arguments);
            }
            const ext = extensionPaths.findSubstr(URI.file(parent.filename));
            let cache = modulesCache.get(ext);
            if (!cache) {
                modulesCache.set(ext, cache = {});
            }
            if (!cache[request]) {
                if (request === 'undici') {
                    const undici = original.apply(this, arguments);
                    proxyAgent.patchUndici(undici);
                    cache[request] = undici;
                }
                else {
                    const mod = lookup[request];
                    cache[request] = { ...mod }; // Copy to work around #93167.
                }
            }
            return cache[request];
        };
    });
}
async function lookupProxyAuthorization(extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, proxyAuthenticateCache, basicAuthCache, isRemote, fallbackToLocalKerberos, proxyURL, proxyAuthenticate, state) {
    const cached = proxyAuthenticateCache[proxyURL];
    if (proxyAuthenticate) {
        proxyAuthenticateCache[proxyURL] = proxyAuthenticate;
    }
    extHostLogService.trace('ProxyResolver#lookupProxyAuthorization callback', `proxyURL:${proxyURL}`, `proxyAuthenticate:${proxyAuthenticate}`, `proxyAuthenticateCache:${cached}`);
    const header = proxyAuthenticate || cached;
    const authenticate = Array.isArray(header) ? header : typeof header === 'string' ? [header] : [];
    sendTelemetry(mainThreadTelemetry, authenticate, isRemote);
    if (authenticate.some(a => /^(Negotiate|Kerberos)( |$)/i.test(a)) && !state.kerberosRequested) {
        state.kerberosRequested = true;
        try {
            const spnConfig = getExtHostConfigValue(configProvider, isRemote, 'http.proxyKerberosServicePrincipal');
            const response = await lookupKerberosAuthorization(proxyURL, spnConfig, extHostLogService, 'ProxyResolver#lookupProxyAuthorization');
            return 'Negotiate ' + response;
        }
        catch (err) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication failed', err);
        }
        if (isRemote && fallbackToLocalKerberos) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication lookup on host', `proxyURL:${proxyURL}`);
            const auth = await extHostWorkspace.lookupKerberosAuthorization(proxyURL);
            if (auth) {
                return 'Negotiate ' + auth;
            }
        }
    }
    const basicAuthHeader = authenticate.find(a => /^Basic( |$)/i.test(a));
    if (basicAuthHeader) {
        try {
            const cachedAuth = basicAuthCache[proxyURL];
            if (cachedAuth) {
                if (state.basicAuthCacheUsed) {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication deleting cached credentials', `proxyURL:${proxyURL}`);
                    delete basicAuthCache[proxyURL];
                }
                else {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication using cached credentials', `proxyURL:${proxyURL}`);
                    state.basicAuthCacheUsed = true;
                    return cachedAuth;
                }
            }
            state.basicAuthAttempt = (state.basicAuthAttempt || 0) + 1;
            const realm = / realm="([^"]+)"/i.exec(basicAuthHeader)?.[1];
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication lookup', `proxyURL:${proxyURL}`, `realm:${realm}`);
            const url = new URL(proxyURL);
            const authInfo = {
                scheme: 'basic',
                host: url.hostname,
                port: Number(url.port),
                realm: realm || '',
                isProxy: true,
                attempt: state.basicAuthAttempt,
            };
            const credentials = await extHostWorkspace.lookupAuthorization(authInfo);
            if (credentials) {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
                const auth = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                basicAuthCache[proxyURL] = auth;
                return auth;
            }
            else {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received no credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
            }
        }
        catch (err) {
            extHostLogService.error('ProxyResolver#lookupProxyAuthorization Basic authentication failed', err);
        }
    }
    return undefined;
}
let telemetrySent = false;
const enableProxyAuthenticationTelemetry = false;
function sendTelemetry(mainThreadTelemetry, authenticate, isRemote) {
    if (!enableProxyAuthenticationTelemetry || telemetrySent || !authenticate.length) {
        return;
    }
    telemetrySent = true;
    mainThreadTelemetry.$publicLog2('proxyAuthenticationRequest', {
        authenticationType: authenticate.map(a => a.split(' ')[0]).join(','),
        extensionHostType: isRemote ? 'remote' : 'local',
    });
}
function getExtHostConfigValue(configProvider, isRemote, key, fallback) {
    if (isRemote) {
        return configProvider.getConfiguration().get(key) ?? fallback;
    }
    const values = configProvider.getConfiguration().inspect(key);
    return values?.globalLocalValue ?? values?.defaultValue ?? fallback;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL3Byb3h5UmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBZSxRQUFRLElBQUksZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUF5QyxjQUFjLEVBQUUsc0JBQXNCLEVBQTJCLE1BQU0scUJBQXFCLENBQUM7QUFHN00sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUc1QyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMvRixPQUFPLEtBQUssVUFBVSxNQUFNLHFCQUFxQixDQUFDO0FBRWxELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9DLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxHQUFHLEdBQW1CLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFM0IsTUFBTSwyQkFBMkIsR0FBRyxLQUFLLENBQUM7QUFDMUMsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUM7QUFFdEMsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxnQkFBMkMsRUFDM0MsY0FBcUMsRUFDckMsZ0JBQXlDLEVBQ3pDLGlCQUE4QixFQUM5QixtQkFBNkMsRUFDN0MsUUFBZ0MsRUFDaEMsV0FBNEI7SUFHNUIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDMUMsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUMzRSxNQUFNLHVCQUF1QixHQUFHLG1CQUFtQixDQUFDO0lBQ3BELE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7SUFDbEQsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFVLDRCQUE0QixFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDekosTUFBTSxNQUFNLEdBQXFCO1FBQ2hDLFlBQVksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7UUFDdkQsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQztRQUN2TSxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQVMsY0FBYyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUM7UUFDeEYsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFzQixjQUFjLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixDQUFDLElBQUksS0FBSztRQUN6SCxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBVyxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUU7UUFDdkcsK0JBQStCLEVBQUUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQVUsY0FBYyxFQUFFLFFBQVEsRUFBRSw2QkFBNkIsRUFBRSxJQUFJLENBQUM7UUFDcEksaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUM7UUFDaEUsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUM7UUFDaEUsR0FBRyxFQUFFLGlCQUFpQjtRQUN0QixXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ2pCLE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLFFBQVEsS0FBSyxFQUFFLENBQUM7Z0JBQ2YsS0FBSyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDO2dCQUNsRCxLQUFLLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ2xELEtBQUssZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDaEQsS0FBSyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDO2dCQUN0RCxLQUFLLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ2xELEtBQUssZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFDOUMsT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELFNBQVMsS0FBSyxDQUFDLEtBQVk7Z0JBQzFCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDcEQsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBQ0QscUJBQXFCLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztRQUNoQyxxQkFBcUI7UUFDckIsMEJBQTBCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEMsTUFBTSxRQUFRLEdBQXdCLEVBQUUsQ0FBQztZQUN6QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQztZQUNELElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGtGQUFrRixDQUFDLENBQUM7Z0JBQzVHLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyw0Q0FBNEM7Z0JBQy9GLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsaUZBQWlGLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzlJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEIsQ0FBQztZQUNELCtFQUErRTtZQUMvRSxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMseUJBQXlCLElBQUssS0FBSyxDQUFDLFdBQW1CLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzNHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO2dCQUMvRixRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUUsS0FBSyxDQUFDLFdBQW1CLENBQUMsZ0JBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLENBQUM7WUFDRCxPQUFPLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0MsQ0FBQztRQUNELEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztLQUNoQixDQUFDO0lBQ0YsTUFBTSxFQUFFLHVCQUF1QixFQUFFLGVBQWUsRUFBRSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2pGLE1BQU0sTUFBTSxHQUFJLFVBQWtCLENBQUMsT0FBTyxJQUFJLFVBQVUsQ0FBQztJQUN6RCxNQUFNLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztJQUV6QyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFdEcsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDckUsT0FBTyxzQkFBc0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN6RCxDQUFDO0FBRUQsTUFBTSxhQUFhLEdBQUc7SUFDckIsZ0JBQWdCO0lBQ2hCLE1BQU07SUFDTixTQUFTO0lBQ1QsSUFBSTtJQUNKLFNBQVM7SUFDVCxTQUFTO0lBQ1QsWUFBWTtJQUNaLG1CQUFtQjtJQUNuQixZQUFZO0NBQ1osQ0FBQztBQUVGLFNBQVMsZ0JBQWdCLENBQUMsTUFBd0IsRUFBRSxjQUFxQyxFQUFFLG1CQUE2QyxFQUFFLFFBQWdDLEVBQUUsZUFBNkQsRUFBRSxXQUE0QjtJQUN0USxJQUFJLENBQUUsVUFBa0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFDdEMsVUFBa0IsQ0FBQyxxQkFBcUIsR0FBRyxhQUFhLENBQUM7UUFDMUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDeEYsVUFBa0IsQ0FBQyxvQkFBb0IsR0FBRyxZQUFZLENBQUM7UUFDeEQsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0IsZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBVSxlQUFlLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUNsSCxXQUFXLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO29CQUNsRCxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFVLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO2dCQUNuSCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCw2REFBNkQ7UUFDN0QsVUFBVSxDQUFDLEtBQUssR0FBRyxLQUFLLFVBQVUsS0FBSyxDQUFDLEtBQTZCLEVBQUUsSUFBa0I7WUFDeEYsU0FBUyxrQkFBa0IsQ0FBQyxJQUF1QztnQkFDbEUsT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDcEgsQ0FBQztZQUNELHVGQUF1RjtZQUN2Rix3RkFBd0Y7WUFDeEYsTUFBTSxTQUFTLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN0RyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDcEQsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEQsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwRCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxRQUFRLENBQUM7WUFDckUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzlELENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNsRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3pELENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLElBQUksU0FBUyxJQUFJLFNBQVMsSUFBSSxnQkFBZ0IsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDbEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNqRCx5QkFBeUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ3BFLE9BQU8sUUFBUSxDQUFDO1lBQ2pCLENBQUM7WUFDRCw2S0FBNks7WUFDN0ssSUFBSSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDeEIsQ0FBQztnQkFDRCxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUM3QixDQUFDO1lBQ0QscUVBQXFFO1lBQ3JFLE1BQU0sYUFBYSxHQUFHLEtBQUssWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3RFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNyQyxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvRCx5QkFBeUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLG1CQUE2QyxFQUFFLFFBQWtCLEVBQUUsU0FBaUI7SUFDdEgsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQztJQUNqQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUU7UUFDdEMsR0FBRztZQUNGLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xELE9BQU8sV0FBVyxJQUFJLFNBQVMsQ0FBQztRQUNqQyxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztJQUNuQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUU7UUFDdkMsR0FBRztZQUNGLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzNELE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDNUQsQ0FBQztLQUNELENBQUMsQ0FBQztBQUNKLENBQUM7QUFzQkQsTUFBTSxlQUFlLEdBQXlCO0lBQzdDLEdBQUcsRUFBRSxDQUFDO0lBQ04sWUFBWSxFQUFFLENBQUM7SUFDZixJQUFJLEVBQUUsQ0FBQztJQUNQLElBQUksRUFBRSxDQUFDO0lBQ1AsU0FBUyxFQUFFLENBQUM7SUFDWixjQUFjLEVBQUUsQ0FBQztDQUNqQixDQUFDO0FBRUYsSUFBSSxLQUEwQixDQUFDO0FBQy9CLE1BQU0seUJBQXlCLEdBQUcsS0FBSyxDQUFDO0FBQ3hDLFNBQVMscUJBQXFCLENBQUMsbUJBQTZDLEVBQUUsT0FBcUM7SUFDbEgsSUFBSSx5QkFBeUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBQ0QsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsbUJBQW1CLENBQUMsV0FBVyxDQUFzRCxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMxSCxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyw2Q0FBNkM7UUFDdkQsS0FBbUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO0lBQ2hELENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxNQUF3QixFQUFFLFlBQXFDO0lBRTVGLFNBQVMsWUFBWSxDQUFDLE1BQVcsRUFBRSxLQUFVO1FBQzVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwRCxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckUsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDeEUsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRCxHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsY0FBcUMsRUFBRSxRQUFpQjtJQUM5RSxPQUFPLENBQUMscUJBQXFCLENBQVUsY0FBYyxFQUFFLFFBQVEsRUFBRSx3Q0FBd0MsRUFBRSwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBVSxjQUFjLEVBQUUsUUFBUSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDbE8sQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLGNBQXFDLEVBQUUsUUFBaUI7SUFDOUUsT0FBTyxDQUFDLENBQUMscUJBQXFCLENBQVUsY0FBYyxFQUFFLFFBQVEsRUFBRSx3Q0FBd0MsRUFBRSwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBVSxjQUFjLEVBQUUsUUFBUSxFQUFFLHlCQUF5QixDQUFDLENBQUM7QUFDbk8sQ0FBQztBQUVELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUErRyxDQUFDO0FBQzVJLFNBQVMsc0JBQXNCLENBQUMsZ0JBQXlDLEVBQUUsTUFBK0M7SUFDekgsT0FBTyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRTtTQUM3QyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7UUFDdEIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFDbkMsV0FBVyxDQUFDLEtBQUssR0FBRyxTQUFTLElBQUksQ0FBQyxPQUFlLEVBQUUsTUFBNEIsRUFBRSxNQUFlO1lBQy9GLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDbkIsQ0FBQztZQUVELElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDbkIsQ0FBQztZQUVELElBQUksT0FBTyxLQUFLLE1BQU0sSUFBSSxPQUFPLEtBQUssT0FBTyxJQUFJLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkUsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNyQixJQUFJLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQy9DLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQy9CLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ3pCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQzVCLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBUSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7Z0JBQ2pFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsS0FBSyxVQUFVLHdCQUF3QixDQUN0QyxnQkFBMkMsRUFDM0MsaUJBQThCLEVBQzlCLG1CQUE2QyxFQUM3QyxjQUFxQyxFQUNyQyxzQkFBcUUsRUFDckUsY0FBa0QsRUFDbEQsUUFBaUIsRUFDakIsdUJBQWdDLEVBQ2hDLFFBQWdCLEVBQ2hCLGlCQUFnRCxFQUNoRCxLQUErRjtJQUUvRixNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsc0JBQXNCLENBQUMsUUFBUSxDQUFDLEdBQUcsaUJBQWlCLENBQUM7SUFDdEQsQ0FBQztJQUNELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxZQUFZLFFBQVEsRUFBRSxFQUFFLHFCQUFxQixpQkFBaUIsRUFBRSxFQUFFLDBCQUEwQixNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ2pMLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixJQUFJLE1BQU0sQ0FBQztJQUMzQyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ2pHLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDM0QsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMvRixLQUFLLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBRS9CLElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUFHLHFCQUFxQixDQUFTLGNBQWMsRUFBRSxRQUFRLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztZQUNoSCxNQUFNLFFBQVEsR0FBRyxNQUFNLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztZQUNySSxPQUFPLFlBQVksR0FBRyxRQUFRLENBQUM7UUFDaEMsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUVELElBQUksUUFBUSxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDekMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLCtFQUErRSxFQUFFLFlBQVksUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNqSSxNQUFNLElBQUksR0FBRyxNQUFNLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFFLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxZQUFZLEdBQUcsSUFBSSxDQUFDO1lBQzVCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDOUIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLHlGQUF5RixFQUFFLFlBQVksUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDM0ksT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsc0ZBQXNGLEVBQUUsWUFBWSxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUN4SSxLQUFLLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO29CQUNoQyxPQUFPLFVBQVUsQ0FBQztnQkFDbkIsQ0FBQztZQUNGLENBQUM7WUFDRCxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNELE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxvRUFBb0UsRUFBRSxZQUFZLFFBQVEsRUFBRSxFQUFFLFNBQVMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUN4SSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QixNQUFNLFFBQVEsR0FBYTtnQkFDMUIsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRO2dCQUNsQixJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDbEIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0I7YUFDL0IsQ0FBQztZQUNGLE1BQU0sV0FBVyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGtGQUFrRixFQUFFLFlBQVksUUFBUSxFQUFFLEVBQUUsU0FBUyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUN0SixNQUFNLElBQUksR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLElBQUksV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMxRyxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNoQyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMscUZBQXFGLEVBQUUsWUFBWSxRQUFRLEVBQUUsRUFBRSxTQUFTLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDMUosQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsaUJBQWlCLENBQUMsS0FBSyxDQUFDLG9FQUFvRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BHLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQWNELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztBQUMxQixNQUFNLGtDQUFrQyxHQUFHLEtBQUssQ0FBQztBQUNqRCxTQUFTLGFBQWEsQ0FBQyxtQkFBNkMsRUFBRSxZQUFzQixFQUFFLFFBQWlCO0lBQzlHLElBQUksQ0FBQyxrQ0FBa0MsSUFBSSxhQUFhLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDbEYsT0FBTztJQUNSLENBQUM7SUFDRCxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBRXJCLG1CQUFtQixDQUFDLFdBQVcsQ0FBOEQsNEJBQTRCLEVBQUU7UUFDMUgsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3BFLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPO0tBQ2hELENBQUMsQ0FBQztBQUNKLENBQUM7QUFJRCxTQUFTLHFCQUFxQixDQUFJLGNBQXFDLEVBQUUsUUFBaUIsRUFBRSxHQUFXLEVBQUUsUUFBWTtJQUNwSCxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2QsT0FBTyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUksR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDO0lBQ2xFLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBd0MsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3RHLE9BQU8sTUFBTSxFQUFFLGdCQUFnQixJQUFJLE1BQU0sRUFBRSxZQUFZLElBQUksUUFBUSxDQUFDO0FBQ3JFLENBQUMifQ==