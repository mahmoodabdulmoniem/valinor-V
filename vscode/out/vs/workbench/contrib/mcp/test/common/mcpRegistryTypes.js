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
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LogLevel, NullLogger } from '../../../../../platform/log/common/log.js';
import { McpServerConnection } from '../../common/mcpServerConnection.js';
import { MCP } from '../../common/modelContextProtocol.js';
/**
 * Implementation of IMcpMessageTransport for testing purposes.
 * Allows tests to easily send/receive messages and control the connection state.
 */
export class TestMcpMessageTransport extends Disposable {
    constructor() {
        super();
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._stateValue = observableValue('testTransportState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this.state = this._stateValue;
        this._sentMessages = [];
        this.setResponder('initialize', () => ({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 1, // The handler uses 1 for the first request
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                serverInfo: {
                    name: 'Test MCP Server',
                    version: '1.0.0',
                },
                capabilities: {
                    resources: {
                        supportedTypes: ['text/plain'],
                    },
                    tools: {
                        supportsCancellation: true,
                    }
                }
            }
        }));
    }
    /**
     * Set a responder function for a specific method.
     * The responder receives the sent message and should return a response object,
     * which will be simulated as a server response.
     */
    setResponder(method, responder) {
        if (!this._responders) {
            this._responders = new Map();
        }
        this._responders.set(method, responder);
    }
    /**
     * Send a message through the transport.
     */
    send(message) {
        this._sentMessages.push(message);
        if (this._responders && 'method' in message && typeof message.method === 'string') {
            const responder = this._responders.get(message.method);
            if (responder) {
                const response = responder(message);
                if (response) {
                    setTimeout(() => this.simulateReceiveMessage(response));
                }
            }
        }
    }
    /**
     * Stop the transport.
     */
    stop() {
        this._stateValue.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    // Test Helper Methods
    /**
     * Simulate receiving a message from the server.
     */
    simulateReceiveMessage(message) {
        this._onDidReceiveMessage.fire(message);
    }
    /**
     * Simulates a reply to an 'initialized' request.
     */
    simulateInitialized() {
        if (!this._sentMessages.length) {
            throw new Error('initialize was not called yet');
        }
        this.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: this.getSentMessages()[0].id,
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                capabilities: {
                    tools: {},
                },
                serverInfo: {
                    name: 'Test Server',
                    version: '1.0.0'
                },
            }
        });
    }
    /**
     * Simulate a log event.
     */
    simulateLog(message) {
        this._onDidLog.fire({ level: LogLevel.Info, message });
    }
    /**
     * Set the connection state.
     */
    setConnectionState(state) {
        this._stateValue.set(state, undefined);
    }
    /**
     * Get all messages that have been sent.
     */
    getSentMessages() {
        return [...this._sentMessages];
    }
    /**
     * Clear the sent messages history.
     */
    clearSentMessages() {
        this._sentMessages.length = 0;
    }
}
let TestMcpRegistry = class TestMcpRegistry {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.makeTestTransport = () => new TestMcpMessageTransport();
        this.onDidChangeInputs = Event.None;
        this.collections = observableValue(this, [{
                id: 'test-collection',
                remoteAuthority: null,
                label: 'Test Collection',
                configTarget: 2 /* ConfigurationTarget.USER */,
                serverDefinitions: observableValue(this, [{
                        id: 'test-server',
                        label: 'Test Server',
                        launch: { type: 1 /* McpServerTransportType.Stdio */, command: 'echo', args: ['Hello MCP'], env: {}, envFile: undefined, cwd: undefined },
                    }]),
                isTrustedByDefault: true,
                scope: -1 /* StorageScope.APPLICATION */,
            }]);
        this.delegates = observableValue(this, [{
                priority: 0,
                canStart: () => true,
                start: () => {
                    const t = this.makeTestTransport();
                    setTimeout(() => t.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ }));
                    return t;
                },
                waitForInitialProviderPromises: () => Promise.resolve(),
            }]);
        this.lazyCollectionState = observableValue(this, 2 /* LazyCollectionState.AllKnown */);
    }
    collectionToolPrefix(collection) {
        return observableValue(this, `mcp-${collection.id}-`);
    }
    getServerDefinition(collectionRef, definitionRef) {
        const collectionObs = this.collections.map(cols => cols.find(c => c.id === collectionRef.id));
        return collectionObs.map((collection, reader) => {
            const server = collection?.serverDefinitions.read(reader).find(s => s.id === definitionRef.id);
            return { collection, server };
        });
    }
    discoverCollections() {
        throw new Error('Method not implemented.');
    }
    registerDelegate(delegate) {
        throw new Error('Method not implemented.');
    }
    registerCollection(collection) {
        throw new Error('Method not implemented.');
    }
    resetTrust() {
        throw new Error('Method not implemented.');
    }
    getTrust(collection) {
        throw new Error('Method not implemented.');
    }
    clearSavedInputs(scope, inputId) {
        throw new Error('Method not implemented.');
    }
    editSavedInput(inputId, folderData, configSection, target) {
        throw new Error('Method not implemented.');
    }
    setSavedInput(inputId, target, value) {
        throw new Error('Method not implemented.');
    }
    getSavedInputs(scope) {
        throw new Error('Method not implemented.');
    }
    resolveConnection(options) {
        const collection = this.collections.get().find(c => c.id === options.collectionRef.id);
        const definition = collection?.serverDefinitions.get().find(d => d.id === options.definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found: ${options.collectionRef.id}, ${options.definitionRef.id}`);
        }
        const del = this.delegates.get()[0];
        return Promise.resolve(new McpServerConnection(collection, definition, del, definition.launch, new NullLogger(), this._instantiationService));
    }
};
TestMcpRegistry = __decorate([
    __param(0, IInstantiationService)
], TestMcpRegistry);
export { TestMcpRegistry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFJlZ2lzdHJ5VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFLakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTNEOzs7R0FHRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFVO0lBWXREO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFaUSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBd0MsQ0FBQyxDQUFDO1FBQ2pGLGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztRQUUvQix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUM7UUFDMUUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztRQUVyRCxnQkFBVyxHQUFHLGVBQWUsQ0FBcUIsb0JBQW9CLEVBQUUsRUFBRSxL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