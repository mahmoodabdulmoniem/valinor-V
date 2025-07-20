/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { DeferredPromise, IntervalTimer } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { canLog, log, LogLevel } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { McpError, MpcResponseError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
/**
 * Request handler for communicating with an MCP server.
 *
 * Handles sending requests and receiving responses, with automatic
 * handling of ping requests and typed client request methods.
 */
export class McpServerRequestHandler extends Disposable {
    set roots(roots) {
        if (!equals(this._roots, roots)) {
            this._roots = roots;
            if (this._hasAnnouncedRoots) {
                this.sendNotification({ method: 'notifications/roots/list_changed' });
                this._hasAnnouncedRoots = false;
            }
        }
    }
    get capabilities() {
        return this._serverInit.capabilities;
    }
    get serverInfo() {
        return this._serverInit.serverInfo;
    }
    get serverInstructions() {
        return this._serverInit.instructions;
    }
    /**
     * Connects to the MCP server and does the initialization handshake.
     * @throws MpcResponseError if the server fails to initialize.
     */
    static async create(instaService, opts, token) {
        const mcp = new McpServerRequestHandler(opts);
        const store = new DisposableStore();
        try {
            const timer = store.add(new IntervalTimer());
            timer.cancelAndSet(() => {
                opts.logger.info('Waiting for server to respond to `initialize` request...');
            }, 5000);
            await instaService.invokeFunction(async (accessor) => {
                const productService = accessor.get(IProductService);
                const initialized = await mcp.sendRequest({
                    method: 'initialize',
                    params: {
                        protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                        capabilities: {
                            roots: { listChanged: true },
                            sampling: opts.createMessageRequestHandler ? {} : undefined,
                            elicitation: opts.elicitationRequestHandler ? {} : undefined,
                        },
                        clientInfo: {
                            name: productService.nameLong,
                            version: productService.version,
                        }
                    }
                }, token);
                mcp._serverInit = initialized;
                mcp._sendLogLevelToServer(opts.logger.getLevel());
                mcp.sendNotification({
                    method: 'notifications/initialized'
                });
            });
            return mcp;
        }
        catch (e) {
            mcp.dispose();
            throw e;
        }
        finally {
            store.dispose();
        }
    }
    constructor({ launch, logger, createMessageRequestHandler, elicitationRequestHandler, requestLogLevel = LogLevel.Debug, }) {
        super();
        this._nextRequestId = 1;
        this._pendingRequests = new Map();
        this._hasAnnouncedRoots = false;
        this._roots = [];
        // Event emitters for server notifications
        this._onDidReceiveCancelledNotification = this._register(new Emitter());
        this.onDidReceiveCancelledNotification = this._onDidReceiveCancelledNotification.event;
        this._onDidReceiveProgressNotification = this._register(new Emitter());
        this.onDidReceiveProgressNotification = this._onDidReceiveProgressNotification.event;
        this._onDidChangeResourceList = this._register(new Emitter());
        this.onDidChangeResourceList = this._onDidChangeResourceList.event;
        this._onDidUpdateResource = this._register(new Emitter());
        this.onDidUpdateResource = this._onDidUpdateResource.event;
        this._onDidChangeToolList = this._register(new Emitter());
        this.onDidChangeToolList = this._onDidChangeToolList.event;
        this._onDidChangePromptList = this._register(new Emitter());
        this.onDidChangePromptList = this._onDidChangePromptList.event;
        this._launch = launch;
        this.logger = logger;
        this._requestLogLevel = requestLogLevel;
        this._createMessageRequestHandler = createMessageRequestHandler;
        this._elicitationRequestHandler = elicitationRequestHandler;
        this._register(launch.onDidReceiveMessage(message => this.handleMessage(message)));
        this._register(autorun(reader => {
            const state = launch.state.read(reader).state;
            // the handler will get disposed when the launch stops, but if we're still
            // create()'ing we need to make sure to cancel the initialize request.
            if (state === 3 /* McpConnectionState.Kind.Error */ || state === 0 /* McpConnectionState.Kind.Stopped */) {
                this.cancelAllRequests();
            }
        }));
        // Listen for log level changes and forward them to the MCP server
        this._register(logger.onDidChangeLogLevel((logLevel) => {
            this._sendLogLevelToServer(logLevel);
        }));
    }
    /**
     * Send a client request to the server and return the response.
     *
     * @param request The request to send
     * @param token Cancellation token
     * @param timeoutMs Optional timeout in milliseconds
     * @returns A promise that resolves with the response
     */
    async sendRequest(request, token = CancellationToken.None) {
        if (this._store.isDisposed) {
            return Promise.reject(new CancellationError());
        }
        const id = this._nextRequestId++;
        // Create the full JSON-RPC request
        const jsonRpcRequest = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id,
            ...request
        };
        const promise = new DeferredPromise();
        // Store the pending request
        this._pendingRequests.set(id, { promise });
        // Set up cancellation
        const cancelListener = token.onCancellationRequested(() => {
            if (!promise.isSettled) {
                this._pendingRequests.delete(id);
                this.sendNotification({ method: 'notifications/cancelled', params: { requestId: id } });
                promise.cancel();
            }
            cancelListener.dispose();
        });
        // Send the request
        this.send(jsonRpcRequest);
        const ret = promise.p.finally(() => {
            cancelListener.dispose();
            this._pendingRequests.delete(id);
        });
        return ret;
    }
    send(mcp) {
        if (canLog(this.logger.getLevel(), this._requestLogLevel)) { // avoid building the string if we don't need to
            log(this.logger, this._requestLogLevel, `[editor -> server] ${JSON.stringify(mcp)}`);
        }
        this._launch.send(mcp);
    }
    /**
     * Handles paginated requests by making multiple requests until all items are retrieved.
     *
     * @param method The method name to call
     * @param getItems Function to extract the array of items from a result
     * @param initialParams Initial parameters
     * @param token Cancellation token
     * @returns Promise with all items combined
     */
    async *sendRequestPaginated(method, getItems, initialParams, token = CancellationToken.None) {
        let nextCursor = undefined;
        do {
            const params = {
                ...initialParams,
                cursor: nextCursor
            };
            const result = await this.sendRequest({ method, params }, token);
            yield getItems(result);
            nextCursor = result.nextCursor;
        } while (nextCursor !== undefined && !token.isCancellationRequested);
    }
    sendNotification(notification) {
        this.send({ ...notification, jsonrpc: MCP.JSONRPC_VERSION });
    }
    /**
     * Handle incoming messages from the server
     */
    handleMessage(message) {
        if (canLog(this.logger.getLevel(), this._requestLogLevel)) { // avoid building the string if we don't need to
            log(this.logger, this._requestLogLevel, `[server -> editor] ${JSON.stringify(message)}`);
        }
        // Handle responses to our requests
        if ('id' in message) {
            if ('result' in message) {
                this.handleResult(message);
            }
            else if ('error' in message) {
                this.handleError(message);
            }
        }
        // Handle requests from the server
        if ('method' in message) {
            if ('id' in message) {
                this.handleServerRequest(message);
            }
            else {
                this.handleServerNotification(message);
            }
        }
    }
    /**
     * Handle successful responses
     */
    handleResult(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.complete(response.result);
        }
    }
    /**
     * Handle error responses
     */
    handleError(response) {
        const request = this._pendingRequests.get(response.id);
        if (request) {
            this._pendingRequests.delete(response.id);
            request.promise.error(new MpcResponseError(response.error.message, response.error.code, response.error.data));
        }
    }
    /**
     * Handle incoming server requests
     */
    async handleServerRequest(request) {
        try {
            let response;
            if (request.method === 'ping') {
                response = this.handlePing(request);
            }
            else if (request.method === 'roots/list') {
                response = this.handleRootsList(request);
            }
            else if (request.method === 'sampling/createMessage' && this._createMessageRequestHandler) {
                response = await this._createMessageRequestHandler(request.params);
            }
            else if (request.method === 'elicitation/create' && this._elicitationRequestHandler) {
                response = await this._elicitationRequestHandler(request.params);
            }
            else {
                throw McpError.methodNotFound(request.method);
            }
            this.respondToRequest(request, response);
        }
        catch (e) {
            if (!(e instanceof McpError)) {
                this.logger.error(`Error handling request ${request.method}:`, e);
                e = McpError.unknown(e);
            }
            const errorResponse = {
                jsonrpc: MCP.JSONRPC_VERSION,
                id: request.id,
                error: {
                    code: e.code,
                    message: e.message,
                    data: e.data,
                }
            };
            this.send(errorResponse);
        }
    }
    /**
     * Handle incoming server notifications
     */
    handleServerNotification(request) {
        switch (request.method) {
            case 'notifications/message':
                return this.handleLoggingNotification(request);
            case 'notifications/cancelled':
                this._onDidReceiveCancelledNotification.fire(request);
                return this.handleCancelledNotification(request);
            case 'notifications/progress':
                this._onDidReceiveProgressNotification.fire(request);
                return;
            case 'notifications/resources/list_changed':
                this._onDidChangeResourceList.fire();
                return;
            case 'notifications/resources/updated':
                this._onDidUpdateResource.fire(request);
                return;
            case 'notifications/tools/list_changed':
                this._onDidChangeToolList.fire();
                return;
            case 'notifications/prompts/list_changed':
                this._onDidChangePromptList.fire();
                return;
        }
    }
    handleCancelledNotification(request) {
        const pendingRequest = this._pendingRequests.get(request.params.requestId);
        if (pendingRequest) {
            this._pendingRequests.delete(request.params.requestId);
            pendingRequest.promise.cancel();
        }
    }
    handleLoggingNotification(request) {
        let contents = typeof request.params.data === 'string' ? request.params.data : JSON.stringify(request.params.data);
        if (request.params.logger) {
            contents = `${request.params.logger}: ${contents}`;
        }
        switch (request.params?.level) {
            case 'debug':
                this.logger.debug(contents);
                break;
            case 'info':
            case 'notice':
                this.logger.info(contents);
                break;
            case 'warning':
                this.logger.warn(contents);
                break;
            case 'error':
            case 'critical':
            case 'alert':
            case 'emergency':
                this.logger.error(contents);
                break;
            default:
                this.logger.info(contents);
                break;
        }
    }
    /**
     * Send a generic response to a request
     */
    respondToRequest(request, result) {
        const response = {
            jsonrpc: MCP.JSONRPC_VERSION,
            id: request.id,
            result
        };
        this.send(response);
    }
    /**
     * Send a response to a ping request
     */
    handlePing(_request) {
        return {};
    }
    /**
     * Send a response to a roots/list request
     */
    handleRootsList(_request) {
        this._hasAnnouncedRoots = true;
        return { roots: this._roots };
    }
    cancelAllRequests() {
        this._pendingRequests.forEach(pending => pending.promise.cancel());
        this._pendingRequests.clear();
    }
    dispose() {
        this.cancelAllRequests();
        super.dispose();
    }
    /**
     * Forwards log level changes to the MCP server if it supports logging
     */
    async _sendLogLevelToServer(logLevel) {
        try {
            // Only send if the server supports logging capabilities
            if (!this.capabilities.logging) {
                return;
            }
            await this.setLevel({ level: mapLogLevelToMcp(logLevel) });
        }
        catch (error) {
            this.logger.error(`Failed to set MCP server log level: ${error}`);
        }
    }
    /**
     * Send an initialize request
     */
    initialize(params, token) {
        return this.sendRequest({ method: 'initialize', params }, token);
    }
    /**
     * List available resources
     */
    listResources(params, token) {
        return Iterable.asyncToArrayFlat(this.listResourcesIterable(params, token));
    }
    /**
     * List available resources (iterable)
     */
    listResourcesIterable(params, token) {
        return this.sendRequestPaginated('resources/list', result => result.resources, params, token);
    }
    /**
     * Read a specific resource
     */
    readResource(params, token) {
        return this.sendRequest({ method: 'resources/read', params }, token);
    }
    /**
     * List available resource templates
     */
    listResourceTemplates(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('resources/templates/list', result => result.resourceTemplates, params, token));
    }
    /**
     * Subscribe to resource updates
     */
    subscribe(params, token) {
        return this.sendRequest({ method: 'resources/subscribe', params }, token);
    }
    /**
     * Unsubscribe from resource updates
     */
    unsubscribe(params, token) {
        return this.sendRequest({ method: 'resources/unsubscribe', params }, token);
    }
    /**
     * List available prompts
     */
    listPrompts(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('prompts/list', result => result.prompts, params, token));
    }
    /**
     * Get a specific prompt
     */
    getPrompt(params, token) {
        return this.sendRequest({ method: 'prompts/get', params }, token);
    }
    /**
     * List available tools
     */
    listTools(params, token) {
        return Iterable.asyncToArrayFlat(this.sendRequestPaginated('tools/list', result => result.tools, params, token));
    }
    /**
     * Call a specific tool
     */
    callTool(params, token) {
        return this.sendRequest({ method: 'tools/call', params }, token);
    }
    /**
     * Set the logging level
     */
    setLevel(params, token) {
        return this.sendRequest({ method: 'logging/setLevel', params }, token);
    }
    /**
     * Find completions for an argument
     */
    complete(params, token) {
        return this.sendRequest({ method: 'completion/complete', params }, token);
    }
}
/**
 * Maps VSCode LogLevel to MCP LoggingLevel
 */
function mapLogLevelToMcp(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace:
            return 'debug'; // MCP doesn't have trace, use debug
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Warning:
            return 'warning';
        case LogLevel.Error:
            return 'error';
        case LogLevel.Off:
            return 'emergency'; // MCP doesn't have off, use emergency
        default:
            return assertNever(logLevel); // Off and other levels are not supported
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyUmVxdWVzdEhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmVyUmVxdWVzdEhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsT0FBTyxFQUFFLE1BQU0sRUFBVyxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXhGLE9BQU8sRUFBeUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQXVCaEQ7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJ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