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
import { createReadStream, promises } from 'fs';
import * as url from 'url';
import * as cookie from 'cookie';
import * as crypto from 'crypto';
import { isEqualOrParent } from '../../base/common/extpath.js';
import { getMediaMime } from '../../base/common/mime.js';
import { isLinux } from '../../base/common/platform.js';
import { ILogService, LogLevel } from '../../platform/log/common/log.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { extname, dirname, join, normalize, posix, resolve } from '../../base/common/path.js';
import { FileAccess, connectionTokenCookieName, connectionTokenQueryName, Schemas, builtinExtensionsPath } from '../../base/common/network.js';
import { generateUuid } from '../../base/common/uuid.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../platform/request/common/request.js';
import { CancellationToken } from '../../base/common/cancellation.js';
import { URI } from '../../base/common/uri.js';
import { streamToBuffer } from '../../base/common/buffer.js';
import { isString } from '../../base/common/types.js';
import { ICSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
const textMimeType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
};
/**
 * Return an error to the client.
 */
export async function serveError(req, res, errorCode, errorMessage) {
    res.writeHead(errorCode, { 'Content-Type': 'text/plain' });
    res.end(errorMessage);
}
export var CacheControl;
(function (CacheControl) {
    CacheControl[CacheControl["NO_CACHING"] = 0] = "NO_CACHING";
    CacheControl[CacheControl["ETAG"] = 1] = "ETAG";
    CacheControl[CacheControl["NO_EXPIRY"] = 2] = "NO_EXPIRY";
})(CacheControl || (CacheControl = {}));
/**
 * Serve a file at a given path or 404 if the file is missing.
 */
export async function serveFile(filePath, cacheControl, logService, req, res, responseHeaders) {
    try {
        const stat = await promises.stat(filePath); // throws an error if file doesn't exist
        if (cacheControl === 1 /* CacheControl.ETAG */) {
            // Check if file modified since
            const etag = `W/"${[stat.ino, stat.size, stat.mtime.getTime()].join('-')}"`; // weak validator (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                return void res.end();
            }
            responseHeaders['Etag'] = etag;
        }
        else if (cacheControl === 2 /* CacheControl.NO_EXPIRY */) {
            responseHeaders['Cache-Control'] = 'public, max-age=31536000';
        }
        else if (cacheControl === 0 /* CacheControl.NO_CACHING */) {
            responseHeaders['Cache-Control'] = 'no-store';
        }
        responseHeaders['Content-Type'] = textMimeType[extname(filePath)] || getMediaMime(filePath) || 'text/plain';
        res.writeHead(200, responseHeaders);
        // Data
        createReadStream(filePath).pipe(res);
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            logService.error(error);
            console.error(error.toString());
        }
        else {
            console.error(`File not found: ${filePath}`);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return void res.end('Not found');
    }
}
const APP_ROOT = dirname(FileAccess.asFileUri('').fsPath);
const STATIC_PATH = `/static`;
const CALLBACK_PATH = `/callback`;
const WEB_EXTENSION_PATH = `/web-extension-resource`;
let WebClientServer = class WebClientServer {
    constructor(_connectionToken, _basePath, _productPath, _environmentService, _logService, _requestService, _productService, _cssDevService) {
        this._connectionToken = _connectionToken;
        this._basePath = _basePath;
        this._productPath = _productPath;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._requestService = _requestService;
        this._productService = _productService;
        this._cssDevService = _cssDevService;
        this._webExtensionResourceUrlTemplate = this._productService.extensionsGallery?.resourceUrlTemplate ? URI.parse(this._productService.extensionsGallery.resourceUrlTemplate) : undefined;
    }
    /**
     * Handle web resources (i.e. only needed by the web client).
     * **NOTE**: This method is only invoked when the server has web bits.
     * **NOTE**: This method is only invoked after the connection token has been validated.
     * @param parsedUrl The URL to handle, including base and product path
     * @param pathname The pathname of the URL, without base and product path
     */
    async handle(req, res, parsedUrl, pathname) {
        try {
            if (pathname.startsWith(STATIC_PATH) && pathname.charCodeAt(STATIC_PATH.length) === 47 /* CharCode.Slash */) {
                return this._handleStatic(req, res, pathname.substring(STATIC_PATH.length));
            }
            if (pathname === '/') {
                return this._handleRoot(req, res, parsedUrl);
            }
            if (pathname === CALLBACK_PATH) {
                // callback support
                return this._handleCallback(res);
            }
            if (pathname.startsWith(WEB_EXTENSION_PATH) && pathname.charCodeAt(WEB_EXTENSION_PATH.length) === 47 /* CharCode.Slash */) {
                // extension resource support
                return this._handleWebExtensionResource(req, res, pathname.substring(WEB_EXTENSION_PATH.length));
            }
            return serveError(req, res, 404, 'Not found.');
        }
        catch (error) {
            this._logService.error(error);
            console.error(error.toString());
            return serveError(req, res, 500, 'Internal Server Error.');
        }
    }
    /**
     * Handle HTTP requests for /static/*
     * @param resourcePath The path after /static/
     */
    async _handleStatic(req, res, resourcePath) {
        const headers = Object.create(null);
        // Strip the this._staticRoute from the path
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const filePath = join(APP_ROOT, normalizedPathname); // join also normalizes the path
        if (!isEqualOrParent(filePath, APP_ROOT, !isLinux)) {
            return serveError(req, res, 400, `Bad request.`);
        }
        return serveFile(filePath, this._environmentService.isBuilt ? 2 /* CacheControl.NO_EXPIRY */ : 1 /* CacheControl.ETAG */, this._logService, req, res, headers);
    }
    _getResourceURLTemplateAuthority(uri) {
        const index = uri.authority.indexOf('.');
        return index !== -1 ? uri.authority.substring(index + 1) : undefined;
    }
    /**
     * Handle extension resources
     * @param resourcePath The path after /web-extension-resource/
     */
    async _handleWebExtensionResource(req, res, resourcePath) {
        if (!this._webExtensionResourceUrlTemplate) {
            return serveError(req, res, 500, 'No extension gallery service configured.');
        }
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const path = normalize(normalizedPathname);
        const uri = URI.parse(path).with({
            scheme: this._webExtensionResourceUrlTemplate.scheme,
            authority: path.substring(0, path.indexOf('/')),
            path: path.substring(path.indexOf('/') + 1)
        });
        if (this._getResourceURLTemplateAuthority(this._webExtensionResourceUrlTemplate) !== this._getResourceURLTemplateAuthority(uri)) {
            return serveError(req, res, 403, 'Request Forbidden');
        }
        const headers = {};
        const setRequestHeader = (header) => {
            const value = req.headers[header];
            if (value && (isString(value) || value[0])) {
                headers[header] = isString(value) ? value : value[0];
            }
            else if (header !== header.toLowerCase()) {
                setRequestHeader(header.toLowerCase());
            }
        };
        setRequestHeader('X-Client-Name');
        setRequestHeader('X-Client-Version');
        setRequestHeader('X-Machine-Id');
        setRequestHeader('X-Client-Commit');
        const context = await this._requestService.request({
            type: 'GET',
            url: uri.toString(true),
            headers
        }, CancellationToken.None);
        const status = context.res.statusCode || 500;
        if (status !== 200) {
            let text = null;
            try {
                text = await asTextOrError(context);
            }
            catch (error) { /* Ignore */ }
            return serveError(req, res, status, text || `Request failed with status ${status}`);
        }
        const responseHeaders = Object.create(null);
        const setResponseHeader = (header) => {
            const value = context.res.headers[header];
            if (value) {
                responseHeaders[header] = value;
            }
            else if (header !== header.toLowerCase()) {
                setResponseHeader(header.toLowerCase());
            }
        };
        setResponseHeader('Cache-Control');
        setResponseHeader('Content-Type');
        res.writeHead(200, responseHeaders);
        const buffer = await streamToBuffer(context.stream);
        return void res.end(buffer.buffer);
    }
    /**
     * Handle HTTP requests for /
     */
    async _handleRoot(req, res, parsedUrl) {
        const getFirstHeader = (headerName) => {
            const val = req.headers[headerName];
            return Array.isArray(val) ? val[0] : val;
        };
        // Prefix routes with basePath for clients
        const basePath = getFirstHeader('x-forwarded-prefix') || this._basePath;
        const queryConnectionToken = parsedUrl.query[connectionTokenQueryName];
        if (typeof queryConnectionToken === 'string') {
            // We got a connection token as a query parameter.
            // We want to have a clean URL, so we strip it
            const responseHeaders = Object.create(null);
            responseHeaders['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, queryConnectionToken, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */
            });
            const newQuery = Object.create(null);
            for (const key in parsedUrl.query) {
                if (key !== connectionTokenQueryName) {
                    newQuery[key] = parsedUrl.query[key];
                }
            }
            const newLocation = url.format({ pathname: basePath, query: newQuery });
            responseHeaders['Location'] = newLocation;
            res.writeHead(302, responseHeaders);
            return void res.end();
        }
        const replacePort = (host, port) => {
            const index = host?.indexOf(':');
            if (index !== -1) {
                host = host?.substring(0, index);
            }
            host += `:${port}`;
            return host;
        };
        const useTestResolver = (!this._environmentService.isBuilt && this._environmentService.args['use-test-resolver']);
        let remoteAuthority = (useTestResolver
            ? 'test+test'
            : (getFirstHeader('x-original-host') || getFirstHeader('x-forwarded-host') || req.headers.host));
        if (!remoteAuthority) {
            return serveError(req, res, 400, `Bad request.`);
        }
        const forwardedPort = getFirstHeader('x-forwarded-port');
        if (forwardedPort) {
            remoteAuthority = replacePort(remoteAuthority, forwardedPort);
        }
        function asJSON(value) {
            return JSON.stringify(value).replace(/"/g, '&quot;');
        }
        let _wrapWebWorkerExtHostInIframe = undefined;
        if (this._environmentService.args['enable-smoke-test-driver']) {
            // integration tests run at a time when the built output is not yet published to the CDN
            // so we must disable the iframe wrapping because the iframe URL will give a 404
            _wrapWebWorkerExtHostInIframe = false;
        }
        if (this._logService.getLevel() === LogLevel.Trace) {
            ['x-original-host', 'x-forwarded-host', 'x-forwarded-port', 'host'].forEach(header => {
                const value = getFirstHeader(header);
                if (value) {
                    this._logService.trace(`[WebClientServer] ${header}: ${value}`);
                }
            });
            this._logService.trace(`[WebClientServer] Request URL: ${req.url}, basePath: ${basePath}, remoteAuthority: ${remoteAuthority}`);
        }
        const staticRoute = posix.join(basePath, this._productPath, STATIC_PATH);
        const callbackRoute = posix.join(basePath, this._productPath, CALLBACK_PATH);
        const webExtensionRoute = posix.join(basePath, this._productPath, WEB_EXTENSION_PATH);
        const resolveWorkspaceURI = (defaultLocation) => defaultLocation && URI.file(resolve(defaultLocation)).with({ scheme: Schemas.vscodeRemote, authority: remoteAuthority });
        const filePath = FileAccess.asFileUri(`vs/code/browser/workbench/workbench${this._environmentService.isBuilt ? '' : '-dev'}.html`).fsPath;
        const authSessionInfo = !this._environmentService.isBuilt && this._environmentService.args['github-auth'] ? {
            id: generateUuid(),
            providerId: 'github',
            accessToken: this._environmentService.args['github-auth'],
            scopes: [['user:email'], ['repo']]
        } : undefined;
        const productConfiguration = {
            embedderIdentifier: 'server-distro',
            extensionsGallery: this._webExtensionResourceUrlTemplate && this._productService.extensionsGallery ? {
                ...this._productService.extensionsGallery,
                resourceUrlTemplate: this._webExtensionResourceUrlTemplate.with({
                    scheme: 'http',
                    authority: remoteAuthority,
                    path: `${webExtensionRoute}/${this._webExtensionResourceUrlTemplate.authority}${this._webExtensionResourceUrlTemplate.path}`
                }).toString(true)
            } : undefined
        };
        const proposedApi = this._environmentService.args['enable-proposed-api'];
        if (proposedApi?.length) {
            productConfiguration.extensionsEnabledWithApiProposalVersion ??= [];
            productConfiguration.extensionsEnabledWithApiProposalVersion.push(...proposedApi);
        }
        if (!this._environmentService.isBuilt) {
            try {
                const productOverrides = JSON.parse((await promises.readFile(join(APP_ROOT, 'product.overrides.json'))).toString());
                Object.assign(productConfiguration, productOverrides);
            }
            catch (err) { /* Ignore Error */ }
        }
        const workbenchWebConfiguration = {
            remoteAuthority,
            serverBasePath: basePath,
            _wrapWebWorkerExtHostInIframe,
            developmentOptions: { enableSmokeTestDriver: this._environmentService.args['enable-smoke-test-driver'] ? true : undefined, logLevel: this._logService.getLevel() },
            settingsSyncOptions: !this._environmentService.isBuilt && this._environmentService.args['enable-sync'] ? { enabled: true } : undefined,
            enableWorkspaceTrust: !this._environmentService.args['disable-workspace-trust'],
            folderUri: resolveWorkspaceURI(this._environmentService.args['default-folder']),
            workspaceUri: resolveWorkspaceURI(this._environmentService.args['default-workspace']),
            productConfiguration,
            callbackRoute: callbackRoute
        };
        const cookies = cookie.parse(req.headers.cookie || '');
        const locale = cookies['vscode.nls.locale'] || req.headers['accept-language']?.split(',')[0]?.toLowerCase() || 'en';
        let WORKBENCH_NLS_BASE_URL;
        let WORKBENCH_NLS_URL;
        if (!locale.startsWith('en') && this._productService.nlsCoreBaseUrl) {
            WORKBENCH_NLS_BASE_URL = this._productService.nlsCoreBaseUrl;
            WORKBENCH_NLS_URL = `${WORKBENCH_NLS_BASE_URL}${this._productService.commit}/${this._productService.version}/${locale}/nls.messages.js`;
        }
        else {
            WORKBENCH_NLS_URL = ''; // fallback will apply
        }
        const values = {
            WORKBENCH_WEB_CONFIGURATION: asJSON(workbenchWebConfiguration),
            WORKBENCH_AUTH_SESSION: authSessionInfo ? asJSON(authSessionInfo) : '',
            WORKBENCH_WEB_BASE_URL: staticRoute,
            WORKBENCH_NLS_URL,
            WORKBENCH_NLS_FALLBACK_URL: `${staticRoute}/out/nls.messages.js`
        };
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: The server needs to send along all CSS modules so that the client can construct the
        // DEV: import-map.
        // DEV ---------------------------------------------------------------------------------------
        if (this._cssDevService.isEnabled) {
            const cssModules = await this._cssDevService.getCssModules();
            values['WORKBENCH_DEV_CSS_MODULES'] = JSON.stringify(cssModules);
        }
        if (useTestResolver) {
            const bundledExtensions = [];
            for (const extensionPath of ['vscode-test-resolver', 'github-authentication']) {
                const packageJSON = JSON.parse((await promises.readFile(FileAccess.asFileUri(`${builtinExtensionsPath}/${extensionPath}/package.json`).fsPath)).toString());
                bundledExtensions.push({ extensionPath, packageJSON });
            }
            values['WORKBENCH_BUILTIN_EXTENSIONS'] = asJSON(bundledExtensions);
        }
        let data;
        try {
            const workbenchTemplate = (await promises.readFile(filePath)).toString();
            data = workbenchTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? 'undefined');
        }
        catch (e) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return void res.end('Not found');
        }
        const webWorkerExtensionHostIframeScriptSHA = 'sha256-2Q+j4hfT09+1+imS46J2YlkCtHWQt0/BE79PXjJ0ZJ8=';
        const cspDirectives = [
            'default-src \'self\';',
            'img-src \'self\' https: data: blob:;',
            'media-src \'self\';',
            `script-src 'self' 'unsafe-eval' ${WORKBENCH_NLS_BASE_URL ?? ''} blob: 'nonce-1nline-m4p' ${this._getScriptCspHashes(data).join(' ')} '${webWorkerExtensionHostIframeScriptSHA}' 'sha256-/r7rqQ+yrxt57sxLuQ6AMYcy/lUpvAIzHjIJt/OeLWU=' ${useTestResolver ? '' : `http://${remoteAuthority}`};`, // the sha is the same as in src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html
            'child-src \'self\';',
            `frame-src 'self' https://*.vscode-cdn.net data:;`,
            'worker-src \'self\' data: blob:;',
            'style-src \'self\' \'unsafe-inline\';',
            'connect-src \'self\' ws: wss: https:;',
            'font-src \'self\' blob:;',
            'manifest-src \'self\';'
        ].join(' ');
        const headers = {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives
        };
        if (this._connectionToken.type !== 0 /* ServerConnectionTokenType.None */) {
            // At this point we know the client has a valid cookie
            // and we want to set it prolong it to ensure that this
            // client is valid for another 1 week at least
            headers['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, this._connectionToken.value, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */
            });
        }
        res.writeHead(200, headers);
        return void res.end(data);
    }
    _getScriptCspHashes(content) {
        // Compute the CSP hashes for line scripts. Uses regex
        // which means it isn't 100% good.
        const regex = /<script>([\s\S]+?)<\/script>/img;
        const result = [];
        let match;
        while (match = regex.exec(content)) {
            const hasher = crypto.createHash('sha256');
            // This only works on Windows if we strip `\r` from `\r\n`.
            const script = match[1].replace(/\r\n/g, '\n');
            const hash = hasher
                .update(Buffer.from(script))
                .digest().toString('base64');
            result.push(`'sha256-${hash}'`);
        }
        return result;
    }
    /**
     * Handle HTTP requests for /callback
     */
    async _handleCallback(res) {
        const filePath = FileAccess.asFileUri('vs/code/browser/workbench/callback.html').fsPath;
        const data = (await promises.readFile(filePath)).toString();
        const cspDirectives = [
            'default-src \'self\';',
            'img-src \'self\' https: data: blob:;',
            'media-src \'none\';',
            `script-src 'self' ${this._getScriptCspHashes(data).join(' ')};`,
            'style-src \'self\' \'unsafe-inline\';',
            'font-src \'self\' blob:;'
        ].join(' ');
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives
        });
        return void res.end(data);
    }
};
WebClientServer = __decorate([
    __param(3, IServerEnvironmentService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IProductService),
    __param(7, ICSSDevelopmentService)
], WebClientServer);
export { WebClientServer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ2xpZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS93ZWJDbGllbnRTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztBQUVoRCxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQztBQUMzQixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlGLE9BQU8sRUFBRSxVQUFVLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0ksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUs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