/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from './trustedTypes.js';
import { onUnexpectedError } from '../common/errors.js';
import { COI } from '../common/network.js';
import { URI } from '../common/uri.js';
import { WebWorkerClient } from '../common/worker/webWorker.js';
import { Disposable, toDisposable } from '../common/lifecycle.js';
import { coalesce } from '../common/arrays.js';
import { getNLSLanguage, getNLSMessages } from '../../nls.js';
import { Emitter } from '../common/event.js';
// Reuse the trusted types policy defined from worker bootstrap
// when available.
// Refs https://github.com/microsoft/vscode/issues/222193
let ttPolicy;
if (typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope' && globalThis.workerttPolicy !== undefined) {
    ttPolicy = globalThis.workerttPolicy;
}
else {
    ttPolicy = createTrustedTypesPolicy('defaultWorkerFactory', { createScriptURL: value => value });
}
export function createBlobWorker(blobUrl, options) {
    if (!blobUrl.startsWith('blob:')) {
        throw new URIError('Not a blob-url: ' + blobUrl);
    }
    return new Worker(ttPolicy ? ttPolicy.createScriptURL(blobUrl) : blobUrl, { ...options, type: 'module' });
}
function getWorker(descriptor, id) {
    const label = descriptor.label || 'anonymous' + id;
    const monacoEnvironment = globalThis.MonacoEnvironment;
    if (monacoEnvironment) {
        if (typeof monacoEnvironment.getWorker === 'function') {
            return monacoEnvironment.getWorker('workerMain.js', label);
        }
        if (typeof monacoEnvironment.getWorkerUrl === 'function') {
            const workerUrl = monacoEnvironment.getWorkerUrl('workerMain.js', label);
            return new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        }
    }
    const esmWorkerLocation = descriptor.esmModuleLocation;
    if (esmWorkerLocation) {
        const workerUrl = getWorkerBootstrapUrl(label, esmWorkerLocation.toString(true));
        const worker = new Worker(ttPolicy ? ttPolicy.createScriptURL(workerUrl) : workerUrl, { name: label, type: 'module' });
        return whenESMWorkerReady(worker);
    }
    throw new Error(`You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker`);
}
function getWorkerBootstrapUrl(label, workerScriptUrl) {
    if (/^((http:)|(https:)|(file:))/.test(workerScriptUrl) && workerScriptUrl.substring(0, globalThis.origin.length) !== globalThis.origin) {
        // this is the cross-origin case
        // i.e. the webpage is running at a different origin than where the scripts are loaded from
    }
    else {
        const start = workerScriptUrl.lastIndexOf('?');
        const end = workerScriptUrl.lastIndexOf('#', start);
        const params = start > 0
            ? new URLSearchParams(workerScriptUrl.substring(start + 1, ~end ? end : undefined))
            : new URLSearchParams();
        COI.addSearchParam(params, true, true);
        const search = params.toString();
        if (!search) {
            workerScriptUrl = `${workerScriptUrl}#${label}`;
        }
        else {
            workerScriptUrl = `${workerScriptUrl}?${params.toString()}#${label}`;
        }
    }
    // In below blob code, we are using JSON.stringify to ensure the passed
    // in values are not breaking our script. The values may contain string
    // terminating characters (such as ' or ").
    const blob = new Blob([coalesce([
            `/*${label}*/`,
            `globalThis._VSCODE_NLS_MESSAGES = ${JSON.stringify(getNLSMessages())};`,
            `globalThis._VSCODE_NLS_LANGUAGE = ${JSON.stringify(getNLSLanguage())};`,
            `globalThis._VSCODE_FILE_ROOT = ${JSON.stringify(globalThis._VSCODE_FILE_ROOT)};`,
            `const ttPolicy = globalThis.trustedTypes?.createPolicy('defaultWorkerFactory', { createScriptURL: value => value });`,
            `globalThis.workerttPolicy = ttPolicy;`,
            `await import(ttPolicy?.createScriptURL(${JSON.stringify(workerScriptUrl)}) ?? ${JSON.stringify(workerScriptUrl)});`,
            `globalThis.postMessage({ type: 'vscode-worker-ready' });`,
            `/*${label}*/`
        ]).join('')], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}
function whenESMWorkerReady(worker) {
    return new Promise((resolve, reject) => {
        worker.onmessage = function (e) {
            if (e.data.type === 'vscode-worker-ready') {
                worker.onmessage = null;
                resolve(worker);
            }
        };
        worker.onerror = reject;
    });
}
function isPromiseLike(obj) {
    return !!obj && typeof obj.then === 'function';
}
/**
 * A worker that uses HTML5 web workers so that is has
 * its own global scope and its own thread.
 */
class WebWorker extends Disposable {
    static { this.LAST_WORKER_ID = 0; }
    constructor(descriptorOrWorker) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this.id = ++WebWorker.LAST_WORKER_ID;
        const workerOrPromise = (descriptorOrWorker instanceof Worker
            ? descriptorOrWorker :
            'then' in descriptorOrWorker ? descriptorOrWorker
                : getWorker(descriptorOrWorker, this.id));
        if (isPromiseLike(workerOrPromise)) {
            this.worker = workerOrPromise;
        }
        else {
            this.worker = Promise.resolve(workerOrPromise);
        }
        this.postMessage('-please-ignore-', []); // TODO: Eliminate this extra message
        const errorHandler = (ev) => {
            this._onError.fire(ev);
        };
        this.worker.then((w) => {
            w.onmessage = (ev) => {
                this._onMessage.fire(ev.data);
            };
            w.onmessageerror = (ev) => {
                this._onError.fire(ev);
            };
            if (typeof w.addEventListener === 'function') {
                w.addEventListener('error', errorHandler);
            }
        });
        this._register(toDisposable(() => {
            this.worker?.then(w => {
                w.onmessage = null;
                w.onmessageerror = null;
                w.removeEventListener('error', errorHandler);
                w.terminate();
            });
            this.worker = null;
        }));
    }
    getId() {
        return this.id;
    }
    postMessage(message, transfer) {
        this.worker?.then(w => {
            try {
                w.postMessage(message, transfer);
            }
            catch (err) {
                onUnexpectedError(err);
                onUnexpectedError(new Error(`FAILED to post message to worker`, { cause: err }));
            }
        });
    }
}
export class WebWorkerDescriptor {
    constructor(esmModuleLocation, label) {
        this.esmModuleLocation = esmModuleLocation;
        this.label = label;
    }
}
export function createWebWorker(arg0, arg1) {
    const workerDescriptorOrWorker = (URI.isUri(arg0) ? new WebWorkerDescriptor(arg0, arg1) : arg0);
    return new WebWorkerClient(new WebWorker(workerDescriptorOrWorker));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3dlYldvcmtlckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEVBQXlDLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU3QywrREFBK0Q7QUFDL0Qsa0JBQWtCO0FBQ2xCLHlEQUF5RDtBQUN6RCxJQUFJLFFBQXFELENBQUM7QUFDMUQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyw0QkFBNEIsSUFBSyxVQUFrQixDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztJQUNoSyxRQUFRLEdBQUksVUFBa0IsQ0FBQyxjQUFjLENBQUM7QUFDL0MsQ0FBQztLQUFNLENBQUM7SUFDUCxRQUFRLEdBQUcsd0JBQXdCLENBQUMsc0JB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