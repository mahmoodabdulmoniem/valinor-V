/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isStandalone } from '../../../base/browser/browser.js';
import { addDisposableListener } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { posix } from '../../../base/common/path.js';
import { isEqual } from '../../../base/common/resources.js';
import { ltrim } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import product from '../../../platform/product/common/product.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../platform/window/common/window.js';
import { create } from '../../../workbench/workbench.web.main.internal.js';
class TransparentCrypto {
    async seal(data) {
        return data;
    }
    async unseal(data) {
        return data;
    }
}
var AESConstants;
(function (AESConstants) {
    AESConstants["ALGORITHM"] = "AES-GCM";
    AESConstants[AESConstants["KEY_LENGTH"] = 256] = "KEY_LENGTH";
    AESConstants[AESConstants["IV_LENGTH"] = 12] = "IV_LENGTH";
})(AESConstants || (AESConstants = {}));
class NetworkError extends Error {
    constructor(inner) {
        super(inner.message);
        this.name = inner.name;
        this.stack = inner.stack;
    }
}
class ServerKeyedAESCrypto {
    /**
     * Gets whether the algorithm is supported; requires a secure context
     */
    static supported() {
        return !!crypto.subtle;
    }
    constructor(authEndpoint) {
        this.authEndpoint = authEndpoint;
    }
    async seal(data) {
        // Get a new key and IV on every change, to avoid the risk of reusing the same key and IV pair with AES-GCM
        // (see also: https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#properties)
        const iv = mainWindow.crypto.getRandomValues(new Uint8Array(12 /* AESConstants.IV_LENGTH */));
        // crypto.getRandomValues isn't a good-enough PRNG to generate crypto keys, so we need to use crypto.subtle.generateKey and export the key instead
        const clientKeyObj = await mainWindow.crypto.subtle.generateKey({ name: "AES-GCM" /* AESConstants.ALGORITHM */, length: 256 /* AESConstants.KEY_LENGTH */ }, true, ['encrypt', 'decrypt']);
        const clientKey = new Uint8Array(await mainWindow.crypto.subtle.exportKey('raw', clientKeyObj));
        const key = await this.getKey(clientKey);
        const dataUint8Array = new TextEncoder().encode(data);
        const cipherText = await mainWindow.crypto.subtle.encrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv }, key, dataUint8Array);
        // Base64 encode the result and store the ciphertext, the key, and the IV in localStorage
        // Note that the clientKey and IV don't need to be secret
        const result = new Uint8Array([...clientKey, ...iv, ...new Uint8Array(cipherText)]);
        return encodeBase64(VSBuffer.wrap(result));
    }
    async unseal(data) {
        // encrypted should contain, in order: the key (32-byte), the IV for AES-GCM (12-byte) and the ciphertext (which has the GCM auth tag at the end)
        // Minimum length must be 44 (key+IV length) + 16 bytes (1 block encrypted with AES - regardless of key size)
        const dataUint8Array = decodeBase64(data);
        if (dataUint8Array.byteLength < 60) {
            throw Error('Invalid length for the value for credentials.crypto');
        }
        const keyLength = 256 /* AESConstants.KEY_LENGTH */ / 8;
        const clientKey = dataUint8Array.slice(0, keyLength);
        const iv = dataUint8Array.slice(keyLength, keyLength + 12 /* AESConstants.IV_LENGTH */);
        const cipherText = dataUint8Array.slice(keyLength + 12 /* AESConstants.IV_LENGTH */);
        // Do the decryption and parse the result as JSON
        const key = await this.getKey(clientKey.buffer);
        const decrypted = await mainWindow.crypto.subtle.decrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv: iv.buffer }, key, cipherText.buffer);
        return new TextDecoder().decode(new Uint8Array(decrypted));
    }
    /**
     * Given a clientKey, returns the CryptoKey object that is used to encrypt/decrypt the data.
     * The actual key is (clientKey XOR serverKey)
     */
    async getKey(clientKey) {
        if (!clientKey || clientKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
            throw Error('Invalid length for clientKey');
        }
        const serverKey = await this.getServerKeyPart();
        const keyData = new Uint8Array(256 /* AESConstants.KEY_LENGTH */ / 8);
        for (let i = 0; i < keyData.byteLength; i++) {
            keyData[i] = clientKey[i] ^ serverKey[i];
        }
        return mainWindow.crypto.subtle.importKey('raw', keyData, {
            name: "AES-GCM" /* AESConstants.ALGORITHM */,
            length: 256 /* AESConstants.KEY_LENGTH */,
        }, true, ['encrypt', 'decrypt']);
    }
    async getServerKeyPart() {
        if (this.serverKey) {
            return this.serverKey;
        }
        let attempt = 0;
        let lastError;
        while (attempt <= 3) {
            try {
                const res = await fetch(this.authEndpoint, { credentials: 'include', method: 'POST' });
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                const serverKey = new Uint8Array(await res.arrayBuffer());
                if (serverKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
                    throw Error(`The key retrieved by the server is not ${256 /* AESConstants.KEY_LENGTH */} bit long.`);
                }
                this.serverKey = serverKey;
                return this.serverKey;
            }
            catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                attempt++;
                // exponential backoff
                await new Promise(resolve => setTimeout(resolve, attempt * attempt * 100));
            }
        }
        if (lastError) {
            throw new NetworkError(lastError);
        }
        throw new Error('Unknown error');
    }
}
export class LocalStorageSecretStorageProvider {
    constructor(crypto) {
        this.crypto = crypto;
        this.storageKey = 'secrets.provider';
        this.type = 'persisted';
        this.secretsPromise = this.load();
    }
    async load() {
        const record = this.loadAuthSessionFromElement();
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
            try {
                const decrypted = JSON.parse(await this.crypto.unseal(encrypted));
                return { ...record, ...decrypted };
            }
            catch (err) {
                // TODO: send telemetry
                console.error('Failed to decrypt secrets from localStorage', err);
                if (!(err instanceof NetworkError)) {
                    localStorage.removeItem(this.storageKey);
                }
            }
        }
        return record;
    }
    loadAuthSessionFromElement() {
        let authSessionInfo;
        const authSessionElement = mainWindow.document.getElementById('vscode-workbench-auth-session');
        const authSessionElementAttribute = authSessionElement ? authSessionElement.getAttribute('data-settings') : undefined;
        if (authSessionElementAttribute) {
            try {
                authSessionInfo = JSON.parse(authSessionElementAttribute);
            }
            catch (error) { /* Invalid session is passed. Ignore. */ }
        }
        if (!authSessionInfo) {
            return {};
        }
        const record = {};
        // Settings Sync Entry
        record[`${product.urlProtocol}.loginAccount`] = JSON.stringify(authSessionInfo);
        // Auth extension Entry
        if (authSessionInfo.providerId !== 'github') {
            console.error(`Unexpected auth provider: ${authSessionInfo.providerId}. Expected 'github'.`);
            return record;
        }
        const authAccount = JSON.stringify({ extensionId: 'vscode.github-authentication', key: 'github.auth' });
        record[authAccount] = JSON.stringify(authSessionInfo.scopes.map(scopes => ({
            id: authSessionInfo.id,
            scopes,
            accessToken: authSessionInfo.accessToken
        })));
        return record;
    }
    async get(key) {
        const secrets = await this.secretsPromise;
        return secrets[key];
    }
    async set(key, value) {
        const secrets = await this.secretsPromise;
        secrets[key] = value;
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async delete(key) {
        const secrets = await this.secretsPromise;
        delete secrets[key];
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async keys() {
        const secrets = await this.secretsPromise;
        return Object.keys(secrets) || [];
    }
    async save() {
        try {
            const encrypted = await this.crypto.seal(JSON.stringify(await this.secretsPromise));
            localStorage.setItem(this.storageKey, encrypted);
        }
        catch (err) {
            console.error(err);
        }
    }
}
class LocalStorageURLCallbackProvider extends Disposable {
    static { this.REQUEST_ID = 0; }
    static { this.QUERY_KEYS = [
        'scheme',
        'authority',
        'path',
        'query',
        'fragment'
    ]; }
    constructor(_callbackRoute) {
        super();
        this._callbackRoute = _callbackRoute;
        this._onCallback = this._register(new Emitter());
        this.onCallback = this._onCallback.event;
        this.pendingCallbacks = new Set();
        this.lastTimeChecked = Date.now();
        this.checkCallbacksTimeout = undefined;
    }
    create(options = {}) {
        const id = ++LocalStorageURLCallbackProvider.REQUEST_ID;
        const queryParams = [`vscode-reqid=${id}`];
        for (const key of LocalStorageURLCallbackProvider.QUERY_KEYS) {
            const value = options[key];
            if (value) {
                queryParams.push(`vscode-${key}=${encodeURIComponent(value)}`);
            }
        }
        // TODO@joao remove eventually
        // https://github.com/microsoft/vscode-dev/issues/62
        // https://github.com/microsoft/vscode/blob/159479eb5ae451a66b5dac3c12d564f32f454796/extensions/github-authentication/src/githubServer.ts#L50-L50
        if (!(options.authority === 'vscode.github-authentication' && options.path === '/dummy')) {
            const key = `vscode-web.url-callbacks[${id}]`;
            localStorage.removeItem(key);
            this.pendingCallbacks.add(id);
            this.startListening();
        }
        return URI.parse(mainWindow.location.href).with({ path: this._callbackRoute, query: queryParams.join('&') });
    }
    startListening() {
        if (this.onDidChangeLocalStorageDisposable) {
            return;
        }
        this.onDidChangeLocalStorageDisposable = addDisposableListener(mainWindow, 'storage', () => this.onDidChangeLocalStorage());
    }
    stopListening() {
        this.onDidChangeLocalStorageDisposable?.dispose();
        this.onDidChangeLocalStorageDisposable = undefined;
    }
    // this fires every time local storage changes, but we
    // don't want to check more often than once a second
    async onDidChangeLocalStorage() {
        const ellapsed = Date.now() - this.lastTimeChecked;
        if (ellapsed > 1000) {
            this.checkCallbacks();
        }
        else if (this.checkCallbacksTimeout === undefined) {
            this.checkCallbacksTimeout = setTimeout(() => {
                this.checkCallbacksTimeout = undefined;
                this.checkCallbacks();
            }, 1000 - ellapsed);
        }
    }
    checkCallbacks() {
        let pendingCallbacks;
        for (const id of this.pendingCallbacks) {
            const key = `vscode-web.url-callbacks[${id}]`;
            const result = localStorage.getItem(key);
            if (result !== null) {
                try {
                    this._onCallback.fire(URI.revive(JSON.parse(result)));
                }
                catch (error) {
                    console.error(error);
                }
                pendingCallbacks = pendingCallbacks ?? new Set(this.pendingCallbacks);
                pendingCallbacks.delete(id);
                localStorage.removeItem(key);
            }
        }
        if (pendingCallbacks) {
            this.pendingCallbacks = pendingCallbacks;
            if (this.pendingCallbacks.size === 0) {
                this.stopListening();
            }
        }
        this.lastTimeChecked = Date.now();
    }
}
class WorkspaceProvider {
    static { this.QUERY_PARAM_EMPTY_WINDOW = 'ew'; }
    static { this.QUERY_PARAM_FOLDER = 'folder'; }
    static { this.QUERY_PARAM_WORKSPACE = 'workspace'; }
    static { this.QUERY_PARAM_PAYLOAD = 'payload'; }
    static create(config) {
        let foundWorkspace = false;
        let workspace;
        let payload = Object.create(null);
        const query = new URL(document.location.href).searchParams;
        query.forEach((value, key) => {
            switch (key) {
                // Folder
                case WorkspaceProvider.QUERY_PARAM_FOLDER:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = { folderUri: URI.from({ scheme: Schemas.vscodeRemote, path: value, authority: config.remoteAuthority }) };
                    }
                    else {
                        workspace = { folderUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Workspace
                case WorkspaceProvider.QUERY_PARAM_WORKSPACE:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = { workspaceUri: URI.from({ scheme: Schemas.vscodeRemote, path: value, authority: config.remoteAuthority }) };
                    }
                    else {
                        workspace = { workspaceUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Empty
                case WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW:
                    workspace = undefined;
                    foundWorkspace = true;
                    break;
                // Payload
                case WorkspaceProvider.QUERY_PARAM_PAYLOAD:
                    try {
                        payload = parse(value); // use marshalling#parse() to revive potential URIs
                    }
                    catch (error) {
                        console.error(error); // possible invalid JSON
                    }
                    break;
            }
        });
        // If no workspace is provided through the URL, check for config
        // attribute from server
        if (!foundWorkspace) {
            if (config.folderUri) {
                workspace = { folderUri: URI.revive(config.folderUri) };
            }
            else if (config.workspaceUri) {
                workspace = { workspaceUri: URI.revive(config.workspaceUri) };
            }
        }
        return new WorkspaceProvider(workspace, payload, config);
    }
    constructor(workspace, payload, config) {
        this.workspace = workspace;
        this.payload = payload;
        this.config = config;
        this.trusted = true;
    }
    async open(workspace, options) {
        if (options?.reuse && !options.payload && this.isSame(this.workspace, workspace)) {
            return true; // return early if workspace and environment is not changing and we are reusing window
        }
        const targetHref = this.createTargetUrl(workspace, options);
        if (targetHref) {
            if (options?.reuse) {
                mainWindow.location.href = targetHref;
                return true;
            }
            else {
                let result;
                if (isStandalone()) {
                    result = mainWindow.open(targetHref, '_blank', 'toolbar=no'); // ensures to open another 'standalone' window!
                }
                else {
                    result = mainWindow.open(targetHref);
                }
                return !!result;
            }
        }
        return false;
    }
    createTargetUrl(workspace, options) {
        // Empty
        let targetHref = undefined;
        if (!workspace) {
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW}=true`;
        }
        // Folder
        else if (isFolderToOpen(workspace)) {
            const queryParamFolder = this.encodeWorkspacePath(workspace.folderUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_FOLDER}=${queryParamFolder}`;
        }
        // Workspace
        else if (isWorkspaceToOpen(workspace)) {
            const queryParamWorkspace = this.encodeWorkspacePath(workspace.workspaceUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_WORKSPACE}=${queryParamWorkspace}`;
        }
        // Append payload if any
        if (options?.payload) {
            targetHref += `&${WorkspaceProvider.QUERY_PARAM_PAYLOAD}=${encodeURIComponent(JSON.stringify(options.payload))}`;
        }
        return targetHref;
    }
    encodeWorkspacePath(uri) {
        if (this.config.remoteAuthority && uri.scheme === Schemas.vscodeRemote) {
            // when connected to a remote and having a folder
            // or workspace for that remote, only use the path
            // as query value to form shorter, nicer URLs.
            // however, we still need to `encodeURIComponent`
            // to ensure to preserve special characters, such
            // as `+` in the path.
            return encodeURIComponent(`${posix.sep}${ltrim(uri.path, posix.sep)}`).replaceAll('%2F', '/');
        }
        return encodeURIComponent(uri.toString(true));
    }
    isSame(workspaceA, workspaceB) {
        if (!workspaceA || !workspaceB) {
            return workspaceA === workspaceB; // both empty
        }
        if (isFolderToOpen(workspaceA) && isFolderToOpen(workspaceB)) {
            return isEqual(workspaceA.folderUri, workspaceB.folderUri); // same workspace
        }
        if (isWorkspaceToOpen(workspaceA) && isWorkspaceToOpen(workspaceB)) {
            return isEqual(workspaceA.workspaceUri, workspaceB.workspaceUri); // same workspace
        }
        return false;
    }
    hasRemote() {
        if (this.workspace) {
            if (isFolderToOpen(this.workspace)) {
                return this.workspace.folderUri.scheme === Schemas.vscodeRemote;
            }
            if (isWorkspaceToOpen(this.workspace)) {
                return this.workspace.workspaceUri.scheme === Schemas.vscodeRemote;
            }
        }
        return true;
    }
}
function readCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return undefined;
}
(function () {
    // Find config by checking for DOM
    const configElement = mainWindow.document.getElementById('vscode-workbench-web-configuration');
    const configElementAttribute = configElement ? configElement.getAttribute('data-settings') : undefined;
    if (!configElement || !configElementAttribute) {
        throw new Error('Missing web configuration element');
    }
    const config = JSON.parse(configElementAttribute);
    const secretStorageKeyPath = readCookie('vscode-secret-key-path');
    const secretStorageCrypto = secretStorageKeyPath && ServerKeyedAESCrypto.supported()
        ? new ServerKeyedAESCrypto(secretStorageKeyPath) : new TransparentCrypto();
    // Create workbench
    create(mainWindow.document.body, {
        ...config,
        windowIndicator: config.windowIndicator ?? { label: '$(remote)', tooltip: `${product.nameShort} Web` },
        settingsSyncOptions: config.settingsSyncOptions ? { enabled: config.settingsSyncOptions.enabled, } : undefined,
        workspaceProvider: WorkspaceProvider.create(config),
        urlCallbackProvider: new LocalStorageURLCallbackProvider(config.callbackRoute),
        secretStorageProvider: config.remoteAuthority && !secretStorageKeyPath
            ? undefined /* with a remote without embedder-preferred storage, store on the remote */
            : new LocalStorageSecretStorageProvider(secretStorageCrypto),
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2Jyb3dzZXIvd29ya2JlbmNoL3dvcmtiZW5jaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUk5RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFPM0UsTUFBTSxpQkFBaUI7SUFFdEIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWTtRQUN4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELElBQVcsWUFJVjtBQUpELFdBQVcsWUFBWTtJQUN0QixxQ0FBcUIsQ0FBQTtJQUNyQiw2REFBZ0IsQ0FBQTtJQUNoQiwwREFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUpVLFlBQVksS0FBWixZQUFZLFFBSXRCO0FBRUQsTUFBTSxZQUFhLFNBQVEsS0FBSztJQUUvQixZQUFZLEtBQVk7UUFDdkIsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQzFCLENBQUM7Q0FDRDtBQUVELE1BQU0sb0JBQW9CO0lBSXpCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFNBQVM7UUFDZixPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxZQUE2QixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFJLENBQUM7SUFFdEQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFZO1FBQ3RCLDJHQUEyRztRQUMzRyx1RkFBdUY7UUFDdkYsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxVQUFVLGlDQUF3QixDQUFDLENBQUM7UUFDckYsa0pBQWtKO1FBQ2xKLE1BQU0sWUFBWSxHQUFHLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUM5RCxFQUFFLElBQUksRUFBRSxzQ0FBK0IsRUFBRSxNQUFNLEVBQUUsaUNBQWdDLEVBQUUsRUFDbkYsSUFBSSxFQUNKLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUN0QixDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDaEcsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sY0FBYyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sVUFBVSxHQUFnQixNQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDckUsRUFBRSxJQUFJLEVBQUUsc0NBQStCLEVBQUUsRUFBRSxFQUFFLEVBQzdDLEdBQUcsRUFDSCxjQUFjLENBQ2QsQ0FBQztRQUVGLHlGQUF5RjtRQUN6Rix5REFBeUQ7UUFDekQsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxHQUFHLFNBQVMsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRixPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWTtRQUN4QixpSkFBaUo7UUFDakosNkdBQTZHO1FBQzdHLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxQyxJQUFJLGNBQWMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDcEMsTUFBTSxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsb0NBQTBCLENBQUMsQ0FBQztRQUM5QyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLEVBQUUsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxTQUFTLGtDQUF5QixDQUFDLENBQUM7UUFDL0UsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLGtDQUF5QixDQUFDLENBQUM7UUFFNUUsaURBQWlEO1FBQ2pELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ3ZELEVBQUUsSUFBSSxFQUFFLHNDQUErQixFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBaUMsRUFBRSxFQUNuRixHQUFHLEVBQ0gsVUFBVSxDQUFDLE1BQWlDLENBQzVDLENBQUM7UUFFRixPQUFPLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVEOzs7T0FHRztJQUNLLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBcUI7UUFDekMsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsVUFBVSxLQUFLLG9DQUEwQixDQUFDLEVBQUUsQ0FBQztZQUN4RSxNQUFNLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLG9DQUEwQixDQUFDLENBQUMsQ0FBQztRQUU1RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFFLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBQzVDLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FDeEMsS0FBSyxFQUNMLE9BQU8sRUFDUDtZQUNDLElBQUksRUFBRSxzQ0FBK0I7WUFDckMsTUFBTSxFQUFFLGlDQUFnQztTQUN4QyxFQUNELElBQUksRUFDSixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDdEIsQ0FBQztJQUNILENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCO1FBQzdCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QixDQUFDO1FBRUQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksU0FBNEIsQ0FBQztRQUVqQyxPQUFPLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxTQUFTLENBQUMsVUFBVSxLQUFLLG9DQUEwQixDQUFDLEVBQUUsQ0FBQztvQkFDMUQsTUFBTSxLQUFLLENBQUMsMENBQTBDLGlDQUF1QixZQUFZLENBQUMsQ0FBQztnQkFDNUYsQ0FBQztnQkFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztnQkFFM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3ZCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLFNBQVMsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxRCxPQUFPLEVBQUUsQ0FBQztnQkFFVixzQkFBc0I7Z0JBQ3RCLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQ0FBaUM7SUFRN0MsWUFDa0IsTUFBNEI7UUFBNUIsV0FBTSxHQUFOLE1BQU0sQ0FBc0I7UUFQN0IsZUFBVSxHQUFHLGtCQUFrQixDQUFDO1FBSWpELFNBQUksR0FBMEMsV0FBVyxDQUFDO1FBS3pELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTyxLQUFLLENBQUMsSUFBSTtRQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUVqRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDO2dCQUNKLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUVsRSxPQUFPLEVBQUUsR0FBRyxNQUFNLEVBQUUsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2xFLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxZQUFZLENBQUMsRUFBRSxDQUFDO29CQUNwQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLElBQUksZUFBaUYsQ0FBQztRQUN0RixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDL0YsTUFBTSwyQkFBMkIsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDdEgsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQztnQkFDSixlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDLENBQUMsd0NBQXdDLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUM7UUFFMUMsc0JBQXNCO1FBQ3RCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxXQUFXLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFaEYsdUJBQXVCO1FBQ3ZCLElBQUksZUFBZSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixlQUFlLENBQUMsVUFBVSxzQkFBc0IsQ0FBQyxDQUFDO1lBQzdGLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxXQUFXLEVBQUUsOEJBQThCLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7UUFDeEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFFLEVBQUUsRUFBRSxlQUFlLENBQUMsRUFBRTtZQUN0QixNQUFNO1lBQ04sV0FBVyxFQUFFLGVBQWUsQ0FBQyxXQUFXO1NBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQVc7UUFDcEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDO1FBRTFDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQ25DLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFXO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUMxQyxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQixJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0MsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQzFDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BGLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sK0JBQWdDLFNBQVEsVUFBVTthQUV4QyxlQUFVLEdBQUcsQ0FBQyxBQUFKLENBQUs7YUFFZixlQUFVLEdBQStEO1FBQ3ZGLFFBQVE7UUFDUixXQUFXO1FBQ1gsTUFBTTtRQUNOLE9BQU87UUFDUCxVQUFVO0tBQ1YsQUFOd0IsQ0FNdkI7SUFVRixZQUE2QixjQUFzQjtRQUNsRCxLQUFLLEVBQUUsQ0FBQztRQURvQixtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQVJsQyxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQU8sQ0FBQyxDQUFDO1FBQ3pELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUVyQyxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3JDLG9CQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLDBCQUFxQixHQUF3QixTQUFTLENBQUM7SUFLL0QsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFrQyxFQUFFO1FBQzFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsK0JBQStCLENBQUMsVUFBVSxDQUFDO1FBQ3hELE1BQU0sV0FBVyxHQUFhLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFckQsS0FBSyxNQUFNLEdBQUcsSUFBSSwrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM5RCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFM0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoRSxDQUFDO1FBQ0YsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixvREFBb0Q7UUFDcEQsaUpBQWlKO1FBQ2pKLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEtBQUssOEJBQThCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzFGLE1BQU0sR0FBRyxHQUFHLDRCQUE0QixFQUFFLEdBQUcsQ0FBQztZQUM5QyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUcsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7SUFDN0gsQ0FBQztJQUVPLGFBQWE7UUFDcEIsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxTQUFTLENBQUM7SUFDcEQsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxvREFBb0Q7SUFDNUMsS0FBSyxDQUFDLHVCQUF1QjtRQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUVuRCxJQUFJLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdkIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUM1QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkIsQ0FBQyxFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQztRQUNyQixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxnQkFBeUMsQ0FBQztRQUU5QyxLQUFLLE1BQU0sRUFBRSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sR0FBRyxHQUFHLDRCQUE0QixFQUFFLEdBQUcsQ0FBQztZQUM5QyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXpDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUM7b0JBQ0osSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN0QixDQUFDO2dCQUVELGdCQUFnQixHQUFHLGdCQUFnQixJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN0RSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVCLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1lBRXpDLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDbkMsQ0FBQzs7QUFHRixNQUFNLGlCQUFpQjthQUVQLDZCQUF3QixHQUFHLElBQUksQUFBUCxDQUFRO2FBQ2hDLHVCQUFrQixHQUFHLFFBQVEsQUFBWCxDQUFZO2FBQzlCLDBCQUFxQixHQUFHLFdBQVcsQUFBZCxDQUFlO2FBRXBDLHdCQUFtQixHQUFHLFNBQVMsQUFBWixDQUFhO0lBRS9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBbUc7UUFDaEgsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzNCLElBQUksU0FBcUIsQ0FBQztRQUMxQixJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxDQUFDO1FBQzNELEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDNUIsUUFBUSxHQUFHLEVBQUUsQ0FBQztnQkFFYixTQUFTO2dCQUNULEtBQUssaUJBQWlCLENBQUMsa0JBQWtCO29CQUN4QyxJQUFJLE1BQU0sQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0QsZ0RBQWdEO3dCQUNoRCxrREFBa0Q7d0JBQ2xELGlEQUFpRDt3QkFDakQsU0FBUyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUN2SCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsU0FBUyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDN0MsQ0FBQztvQkFDRCxjQUFjLEdBQUcsSUFBSSxDQUFDO29CQUN0QixNQUFNO2dCQUVQLFlBQVk7Z0JBQ1osS0FBSyxpQkFBaUIsQ0FBQyxxQkFBcUI7b0JBQzNDLElBQUksTUFBTSxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMzRCxnREFBZ0Q7d0JBQ2hELGtEQUFrRDt3QkFDbEQsaURBQWlEO3dCQUNqRCxTQUFTLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQzFILENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxTQUFTLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNoRCxDQUFDO29CQUNELGNBQWMsR0FBRyxJQUFJLENBQUM7b0JBQ3RCLE1BQU07Z0JBRVAsUUFBUTtnQkFDUixLQUFLLGlCQUFpQixDQUFDLHdCQUF3QjtvQkFDOUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztvQkFDdEIsY0FBYyxHQUFHLElBQUksQ0FBQztvQkFDdEIsTUFBTTtnQkFFUCxVQUFVO2dCQUNWLEtBQUssaUJBQWlCLENBQUMsbUJBQW1CO29CQUN6QyxJQUFJLENBQUM7d0JBQ0osT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG1EQUFtRDtvQkFDNUUsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsd0JBQXdCO29CQUMvQyxDQUFDO29CQUNELE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxnRUFBZ0U7UUFDaEUsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEIsU0FBUyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDekQsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDaEMsU0FBUyxHQUFHLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDL0QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBSUQsWUFDVSxTQUFxQixFQUNyQixPQUFlLEVBQ1AsTUFBcUM7UUFGN0MsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNyQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ1AsV0FBTSxHQUFOLE1BQU0sQ0FBK0I7UUFMOUMsWUFBTyxHQUFHLElBQUksQ0FBQztJQU94QixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFxQixFQUFFLE9BQStDO1FBQ2hGLElBQUksT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbEYsT0FBTyxJQUFJLENBQUMsQ0FBQyxzRkFBc0Y7UUFDcEcsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQ3BCLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztnQkFDdEMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxNQUFNLENBQUM7Z0JBQ1gsSUFBSSxZQUFZLEVBQUUsRUFBRSxDQUFDO29CQUNwQixNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsK0NBQStDO2dCQUM5RyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7Z0JBRUQsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQXFCLEVBQUUsT0FBK0M7UUFFN0YsUUFBUTtRQUNSLElBQUksVUFBVSxHQUF1QixTQUFTLENBQUM7UUFDL0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLFVBQVUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLGlCQUFpQixDQUFDLHdCQUF3QixPQUFPLENBQUM7UUFDNUgsQ0FBQztRQUVELFNBQVM7YUFDSixJQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN2RSxVQUFVLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxrQkFBa0IsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3JJLENBQUM7UUFFRCxZQUFZO2FBQ1AsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM3RSxVQUFVLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxxQkFBcUIsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzNJLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDdEIsVUFBVSxJQUFJLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2xILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNuQixDQUFDO0lBRU8sbUJBQW1CLENBQUMsR0FBUTtRQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBRXhFLGlEQUFpRDtZQUNqRCxrREFBa0Q7WUFDbEQsOENBQThDO1lBQzlDLGlEQUFpRDtZQUNqRCxpREFBaUQ7WUFDakQsc0JBQXNCO1lBRXRCLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsT0FBTyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVPLE1BQU0sQ0FBQyxVQUFzQixFQUFFLFVBQXNCO1FBQzVELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQyxPQUFPLFVBQVUsS0FBSyxVQUFVLENBQUMsQ0FBQyxhQUFhO1FBQ2hELENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtRQUM5RSxDQUFDO1FBRUQsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3BFLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1FBQ3BGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUM7WUFDakUsQ0FBQztZQUVELElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUM7WUFDcEUsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7O0FBR0YsU0FBUyxVQUFVLENBQUMsSUFBWTtJQUMvQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlCLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxDQUFDO0lBRUEsa0NBQWtDO0lBQ2xDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFDL0YsTUFBTSxzQkFBc0IsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUN2RyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUF1SCxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDdEssTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNsRSxNQUFNLG1CQUFtQixHQUFHLG9CQUFvQixJQUFJLG9CQUFvQixDQUFDLFNBQVMsRUFBRTtRQUNuRixDQUFDLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7SUFFNUUsbUJBQW1CO0lBQ25CLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtRQUNoQyxHQUFHLE1BQU07UUFDVCxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWUsSUFBSSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsTUFBTSxFQUFFO1FBQ3RHLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTO1FBQzlHLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDbkQsbUJBQW1CLEVBQUUsSUFBSSwrQkFBK0IsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQzlFLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxlQUFlLElBQUksQ0FBQyxvQkFBb0I7WUFDckUsQ0FBQyxDQUFDLFNBQVMsQ0FBQywyRUFBMkU7WUFDdkYsQ0FBQyxDQUFDLElBQUksaUNBQWlDLENBQUMsbUJBQW1CLENBQUM7S0FDN0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLEVBQUUsQ0FBQyJ9