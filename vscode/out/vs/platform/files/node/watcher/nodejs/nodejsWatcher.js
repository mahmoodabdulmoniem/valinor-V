/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { patternsEquals } from '../../../../../base/common/glob.js';
import { BaseWatcher } from '../baseWatcher.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { NodeJSFileWatcherLibrary } from './nodejsWatcherLib.js';
import { ThrottledWorker } from '../../../../../base/common/async.js';
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
export class NodeJSWatcher extends BaseWatcher {
    get watchers() { return this._watchers.values(); }
    constructor(recursiveWatcher) {
        super();
        this.recursiveWatcher = recursiveWatcher;
        this.onDidError = Event.None;
        this._watchers = new Map();
        this.worker = this._register(new MutableDisposable());
    }
    async doWatch(requests) {
        // Figure out duplicates to remove from the requests
        requests = this.removeDuplicateRequests(requests);
        // Figure out which watchers to start and which to stop
        const requestsToStart = [];
        const watchersToStop = new Set(Array.from(this.watchers));
        for (const request of requests) {
            const watcher = this._watchers.get(this.requestToWatcherKey(request));
            if (watcher && patternsEquals(watcher.request.excludes, request.excludes) && patternsEquals(watcher.request.includes, request.includes)) {
                watchersToStop.delete(watcher); // keep watcher
            }
            else {
                requestsToStart.push(request); // start watching
            }
        }
        // Logging
        if (requestsToStart.length) {
            this.trace(`Request to start watching: ${requestsToStart.map(request => this.requestToString(request)).join(',')}`);
        }
        if (watchersToStop.size) {
            this.trace(`Request to stop watching: ${Array.from(watchersToStop).map(watcher => this.requestToString(watcher.request)).join(',')}`);
        }
        // Stop the worker
        this.worker.clear();
        // Stop watching as instructed
        for (const watcher of watchersToStop) {
            this.stopWatching(watcher);
        }
        // Start watching as instructed
        this.createWatchWorker().work(requestsToStart);
    }
    createWatchWorker() {
        // We see very large amount of non-recursive file watcher requests
        // in large workspaces. To prevent the overhead of starting thousands
        // of watchers at once, we use a throttled worker to distribute this
        // work over time.
        this.worker.value = new ThrottledWorker({
            maxWorkChunkSize: 100, // only start 100 watchers at once before...
            throttleDelay: 100, // ...resting for 100ms until we start watchers again...
            maxBufferedWork: Number.MAX_VALUE // ...and never refuse any work.
        }, requests => {
            for (const request of requests) {
                this.startWatching(request);
            }
        });
        return this.worker.value;
    }
    requestToWatcherKey(request) {
        return typeof request.correlationId === 'number' ? request.correlationId : this.pathToWatcherKey(request.path);
    }
    pathToWatcherKey(path) {
        return isLinux ? path : path.toLowerCase() /* ignore path casing */;
    }
    startWatching(request) {
        // Start via node.js lib
        const instance = new NodeJSFileWatcherLibrary(request, this.recursiveWatcher, changes => this._onDidChangeFile.fire(changes), () => this._onDidWatchFail.fire(request), msg => this._onDidLogMessage.fire(msg), this.verboseLogging);
        // Remember as watcher instance
        const watcher = { request, instance };
        this._watchers.set(this.requestToWatcherKey(request), watcher);
    }
    async stop() {
        await super.stop();
        for (const watcher of this.watchers) {
            this.stopWatching(watcher);
        }
    }
    stopWatching(watcher) {
        this.trace(`stopping file watcher`, watcher);
        this._watchers.delete(this.requestToWatcherKey(watcher.request));
        watcher.instance.dispose();
    }
    removeDuplicateRequests(requests) {
        const mapCorrelationtoRequests = new Map();
        // Ignore requests for the same paths that have the same correlation
        for (const request of requests) {
            let requestsForCorrelation = mapCorrelationtoRequests.get(request.correlationId);
            if (!requestsForCorrelation) {
                requestsForCorrelation = new Map();
                mapCorrelationtoRequests.set(request.correlationId, requestsForCorrelation);
            }
            const path = this.pathToWatcherKey(request.path);
            if (requestsForCorrelation.has(path)) {
                this.trace(`ignoring a request for watching who's path is already watched: ${this.requestToString(request)}`);
            }
            requestsForCorrelation.set(path, request);
        }
        return Array.from(mapCorrelationtoRequests.values()).map(requests => Array.from(requests.values())).flat();
    }
    async setVerboseLogging(enabled) {
        super.setVerboseLogging(enabled);
        for (const watcher of this.watchers) {
            watcher.instance.setVerboseLogging(enabled);
        }
    }
    trace(message, watcher) {
        if (this.verboseLogging) {
            this._onDidLogMessage.fire({ type: 'trace', message: this.toMessage(message, watcher) });
        }
    }
    warn(message) {
        this._onDidLogMessage.fire({ type: 'warn', message: this.toMessage(message) });
    }
    toMessage(message, watcher) {
        return watcher ? `[File Watcher (node.js)] ${message} (${this.requestToString(watcher.request)})` : `[File Watcher (node.js)] ${message}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL25vZGVqcy9ub2RlanNXYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFlNUUsTUFBTSxPQUFPLGFBQWMsU0FBUSxXQUFXO0lBSzdDLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFJbEQsWUFBK0IsZ0JBQTREO1FBQzFGLEtBQUssRUFBRSxDQUFDO1FBRHNCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBNEM7UUFQbEYsZUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFFaEIsY0FBUyxHQUFHLElBQUksR0FBRyxFQUEyRSxDQUFDO1FBRy9GLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQThDLENBQUMsQ0FBQztJQUk5RyxDQUFDO0lBRWtCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBcUM7UUFFckUsb0RBQW9EO1FBQ3BE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