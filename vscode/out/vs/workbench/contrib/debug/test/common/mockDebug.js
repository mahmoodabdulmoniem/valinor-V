/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AbstractDebugAdapter } from '../../common/abstractDebugAdapter.js';
import { DebugStorage } from '../../common/debugStorage.js';
export class MockDebugService {
    get state() {
        throw new Error('not implemented');
    }
    get onWillNewSession() {
        throw new Error('not implemented');
    }
    get onDidNewSession() {
        throw new Error('not implemented');
    }
    get onDidEndSession() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    getConfigurationManager() {
        throw new Error('not implemented');
    }
    getAdapterManager() {
        throw new Error('Method not implemented.');
    }
    canSetBreakpointsIn(model) {
        throw new Error('Method not implemented.');
    }
    focusStackFrame(focusedStackFrame) {
        throw new Error('not implemented');
    }
    sendAllBreakpoints(session) {
        throw new Error('not implemented');
    }
    sendBreakpoints(modelUri, sourceModified, session) {
        throw new Error('not implemented');
    }
    addBreakpoints(uri, rawBreakpoints) {
        throw new Error('not implemented');
    }
    updateBreakpoints(uri, data, sendOnResourceSaved) {
        throw new Error('not implemented');
    }
    enableOrDisableBreakpoints(enabled) {
        throw new Error('not implemented');
    }
    setBreakpointsActivated() {
        throw new Error('not implemented');
    }
    removeBreakpoints() {
        throw new Error('not implemented');
    }
    addInstructionBreakpoint(opts) {
        throw new Error('Method not implemented.');
    }
    removeInstructionBreakpoints(address) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointCondition(breakpoint, condition) {
        throw new Error('Method not implemented.');
    }
    setExceptionBreakpointsForSession(session, data) {
        throw new Error('Method not implemented.');
    }
    addFunctionBreakpoint() { }
    moveWatchExpression(id, position) { }
    updateFunctionBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeFunctionBreakpoints(id) {
        throw new Error('not implemented');
    }
    addDataBreakpoint() {
        throw new Error('Method not implemented.');
    }
    updateDataBreakpoint(id, update) {
        throw new Error('not implemented');
    }
    removeDataBreakpoints(id) {
        throw new Error('Method not implemented.');
    }
    addReplExpression(name) {
        throw new Error('not implemented');
    }
    removeReplExpressions() { }
    addWatchExpression(name) {
        throw new Error('not implemented');
    }
    renameWatchExpression(id, newName) {
        throw new Error('not implemented');
    }
    removeWatchExpressions(id) { }
    startDebugging(launch, configOrName, options) {
        return Promise.resolve(true);
    }
    restartSession() {
        throw new Error('not implemented');
    }
    stopSession() {
        throw new Error('not implemented');
    }
    getModel() {
        throw new Error('not implemented');
    }
    getViewModel() {
        throw new Error('not implemented');
    }
    sourceIsNotAvailable(uri) { }
    tryToAutoFocusStackFrame(thread) {
        throw new Error('not implemented');
    }
    runTo(uri, lineNumber, column) {
        throw new Error('Method not implemented.');
    }
}
export class MockSession {
    constructor() {
        this.suppressDebugToolbar = false;
        this.suppressDebugStatusbar = false;
        this.suppressDebugView = false;
        this.autoExpandLazyVariables = false;
        this.configuration = { type: 'mock', name: 'mock', request: 'launch' };
        this.unresolvedConfiguration = { type: 'mock', name: 'mock', request: 'launch' };
        this.state = 2 /* State.Stopped */;
        this.capabilities = {};
    }
    dispose() {
    }
    getMemory(memoryReference) {
        throw new Error('Method not implemented.');
    }
    get onDidInvalidateMemory() {
        throw new Error('Not implemented');
    }
    readMemory(memoryReference, offset, count) {
        throw new Error('Method not implemented.');
    }
    writeMemory(memoryReference, offset, data, allowPartial) {
        throw new Error('Method not implemented.');
    }
    cancelCorrelatedTestRun() {
    }
    get compoundRoot() {
        return undefined;
    }
    get saveBeforeRestart() {
        return true;
    }
    get isSimpleUI() {
        return false;
    }
    get lifecycleManagedByParent() {
        return false;
    }
    stepInTargets(frameId) {
        throw new Error('Method not implemented.');
    }
    cancel(_progressId) {
        throw new Error('Method not implemented.');
    }
    breakpointsLocations(uri, lineNumber) {
        throw new Error('Method not implemented.');
    }
    dataBytesBreakpointInfo(address, bytes) {
        throw new Error('Method not implemented.');
    }
    dataBreakpointInfo(name, variablesReference) {
        throw new Error('Method not implemented.');
    }
    sendDataBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    get compact() {
        return false;
    }
    setSubId(subId) {
        throw new Error('Method not implemented.');
    }
    get parentSession() {
        return undefined;
    }
    getReplElements() {
        return [];
    }
    hasSeparateRepl() {
        return true;
    }
    removeReplExpressions() { }
    get onDidChangeReplElements() {
        throw new Error('not implemented');
    }
    addReplExpression(stackFrame, name) {
        return Promise.resolve(undefined);
    }
    appendToRepl(data) { }
    getId() {
        return 'mock';
    }
    getLabel() {
        return 'mockname';
    }
    get name() {
        return 'mockname';
    }
    setName(name) {
        throw new Error('not implemented');
    }
    getSourceForUri(modelUri) {
        throw new Error('not implemented');
    }
    getThread(threadId) {
        throw new Error('not implemented');
    }
    getStoppedDetails() {
        throw new Error('not implemented');
    }
    get onDidCustomEvent() {
        throw new Error('not implemented');
    }
    get onDidLoadedSource() {
        throw new Error('not implemented');
    }
    get onDidChangeState() {
        throw new Error('not implemented');
    }
    get onDidEndAdapter() {
        throw new Error('not implemented');
    }
    get onDidChangeName() {
        throw new Error('not implemented');
    }
    get onDidProgressStart() {
        throw new Error('not implemented');
    }
    get onDidProgressUpdate() {
        throw new Error('not implemented');
    }
    get onDidProgressEnd() {
        throw new Error('not implemented');
    }
    setConfiguration(configuration) { }
    getAllThreads() {
        return [];
    }
    getSource(raw) {
        throw new Error('not implemented');
    }
    getLoadedSources() {
        return Promise.resolve([]);
    }
    completions(frameId, threadId, text, position) {
        throw new Error('not implemented');
    }
    clearThreads(removeThreads, reference) { }
    rawUpdate(data) { }
    initialize(dbgr) {
        throw new Error('Method not implemented.');
    }
    launchOrAttach(config) {
        throw new Error('Method not implemented.');
    }
    restart() {
        throw new Error('Method not implemented.');
    }
    sendBreakpoints(modelUri, bpts, sourceModified) {
        throw new Error('Method not implemented.');
    }
    sendFunctionBreakpoints(fbps) {
        throw new Error('Method not implemented.');
    }
    sendExceptionBreakpoints(exbpts) {
        throw new Error('Method not implemented.');
    }
    sendInstructionBreakpoints(dbps) {
        throw new Error('Method not implemented.');
    }
    getDebugProtocolBreakpoint(breakpointId) {
        throw new Error('Method not implemented.');
    }
    customRequest(request, args) {
        throw new Error('Method not implemented.');
    }
    stackTrace(threadId, startFrame, levels, token) {
        throw new Error('Method not implemented.');
    }
    exceptionInfo(threadId) {
        throw new Error('Method not implemented.');
    }
    scopes(frameId) {
        throw new Error('Method not implemented.');
    }
    variables(variablesReference, threadId, filter, start, count) {
        throw new Error('Method not implemented.');
    }
    evaluate(expression, frameId, context) {
        throw new Error('Method not implemented.');
    }
    restartFrame(frameId, threadId) {
        throw new Error('Method not implemented.');
    }
    next(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepIn(threadId, targetId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepOut(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    stepBack(threadId, granularity) {
        throw new Error('Method not implemented.');
    }
    continue(threadId) {
        throw new Error('Method not implemented.');
    }
    reverseContinue(threadId) {
        throw new Error('Method not implemented.');
    }
    pause(threadId) {
        throw new Error('Method not implemented.');
    }
    terminateThreads(threadIds) {
        throw new Error('Method not implemented.');
    }
    setVariable(variablesReference, name, value) {
        throw new Error('Method not implemented.');
    }
    setExpression(frameId, expression, value) {
        throw new Error('Method not implemented.');
    }
    loadSource(resource) {
        throw new Error('Method not implemented.');
    }
    disassemble(memoryReference, offset, instructionOffset, instructionCount) {
        throw new Error('Method not implemented.');
    }
    terminate(restart = false) {
        throw new Error('Method not implemented.');
    }
    disconnect(restart = false) {
        throw new Error('Method not implemented.');
    }
    gotoTargets(source, line, column) {
        throw new Error('Method not implemented.');
    }
    goto(threadId, targetId) {
        throw new Error('Method not implemented.');
    }
    resolveLocationReference(locationReference) {
        throw new Error('Method not implemented.');
    }
}
export class MockRawSession {
    constructor() {
        this.capabilities = {};
        this.disconnected = false;
        this.sessionLengthInSeconds = 0;
        this.readyForBreakpoints = true;
        this.emittedStopped = true;
        this.onDidStop = null;
    }
    getLengthInSeconds() {
        return 100;
    }
    stackTrace(args) {
        return Promise.resolve({
            seq: 1,
            type: 'response',
            request_seq: 1,
            success: true,
            command: 'stackTrace',
            body: {
                stackFrames: [{
                        id: 1,
                        name: 'mock',
                        line: 5,
                        column: 6
                    }]
            }
        });
    }
    exceptionInfo(args) {
        throw new Error('not implemented');
    }
    launchOrAttach(args) {
        throw new Error('not implemented');
    }
    scopes(args) {
        throw new Error('not implemented');
    }
    variables(args) {
        throw new Error('not implemented');
    }
    evaluate(args) {
        return Promise.resolve(null);
    }
    custom(request, args) {
        throw new Error('not implemented');
    }
    terminate(restart = false) {
        throw new Error('not implemented');
    }
    disconnect(restart) {
        throw new Error('not implemented');
    }
    threads() {
        throw new Error('not implemented');
    }
    stepIn(args) {
        throw new Error('not implemented');
    }
    stepOut(args) {
        throw new Error('not implemented');
    }
    stepBack(args) {
        throw new Error('not implemented');
    }
    continue(args) {
        throw new Error('not implemented');
    }
    reverseContinue(args) {
        throw new Error('not implemented');
    }
    pause(args) {
        throw new Error('not implemented');
    }
    terminateThreads(args) {
        throw new Error('not implemented');
    }
    setVariable(args) {
        throw new Error('not implemented');
    }
    restartFrame(args) {
        throw new Error('not implemented');
    }
    completions(args) {
        throw new Error('not implemented');
    }
    next(args) {
        throw new Error('not implemented');
    }
    source(args) {
        throw new Error('not implemented');
    }
    loadedSources(args) {
        throw new Error('not implemented');
    }
    setBreakpoints(args) {
        throw new Error('not implemented');
    }
    setFunctionBreakpoints(args) {
        throw new Error('not implemented');
    }
    setExceptionBreakpoints(args) {
        throw new Error('not implemented');
    }
}
export class MockDebugAdapter extends AbstractDebugAdapter {
    constructor() {
        super(...arguments);
        this.seq = 0;
        this.pendingResponses = new Map();
    }
    startSession() {
        return Promise.resolve();
    }
    stopSession() {
        return Promise.resolve();
    }
    sendMessage(message) {
        if (message.type === 'request') {
            setTimeout(() => {
                const request = message;
                switch (request.command) {
                    case 'evaluate':
                        this.evaluate(request, request.arguments);
                        return;
                }
                this.sendResponseBody(request, {});
                return;
            }, 0);
        }
        else if (message.type === 'response') {
            const response = message;
            if (this.pendingResponses.has(response.command)) {
                this.pendingResponses.get(response.command).complete(response);
            }
        }
    }
    sendResponseBody(request, body) {
        const response = {
            seq: ++this.seq,
            type: 'response',
            request_seq: request.seq,
            command: request.command,
            success: true,
            body
        };
        this.acceptMessage(response);
    }
    sendEventBody(event, body) {
        const response = {
            seq: ++this.seq,
            type: 'event',
            event,
            body
        };
        this.acceptMessage(response);
    }
    waitForResponseFromClient(command) {
        const deferred = new DeferredPromise();
        if (this.pendingResponses.has(command)) {
            return this.pendingResponses.get(command).p;
        }
        this.pendingResponses.set(command, deferred);
        return deferred.p;
    }
    sendRequestBody(command, args) {
        const response = {
            seq: ++this.seq,
            type: 'request',
            command,
            arguments: args
        };
        this.acceptMessage(response);
    }
    evaluate(request, args) {
        if (args.expression.indexOf('before.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
        this.sendResponseBody(request, {
            result: '=' + args.expression,
            variablesReference: 0
        });
        if (args.expression.indexOf('after.') === 0) {
            this.sendEventBody('output', { output: args.expression });
        }
    }
}
export class MockDebugStorage extends DebugStorage {
    constructor(storageService) {
        super(storageService, undefined, undefined, new NullLogService());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0RlYnVnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2NvbW1vbi9tb2NrRGVidWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBTXRFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUczRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUs1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFNUQsTUFBTSxPQUFPLGdCQUFnQjtJQUc1QixJQUFJLEtBQUs7UUFDUixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxLQUFpQjtRQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELGVBQWUsQ0FBQyxpQkFBOEI7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxPQUF1QjtRQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUFhLEVBQUUsY0FBb0MsRUFBRSxPQUFtQztRQUN2RyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFRLEVBQUUsY0FBaUM7UUFDekQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxHQUFRLEVBQUUsSUFBd0MsRUFBRSxtQkFBNEI7UUFDakcsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxPQUFnQjtRQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELHdCQUF3QixDQUFDLElBQW1DO1FBQzNELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsNEJBQTRCLENBQUMsT0FBZ0I7UUFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCwrQkFBK0IsQ0FBQyxVQUFnQyxFQUFFLFNBQWlCO1FBQ2xGLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsaUNBQWlDLENBQUMsT0FBc0IsRUFBRSxJQUFnRDtRQUN6RyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELHFCQUFxQixLQUFXLENBQUM7SUFFakMsbUJBQW1CLENBQUMsRUFBVSxFQUFFLFFBQWdCLElBQVUsQ0FBQztJQUUzRCx3QkFBd0IsQ0FBQyxFQUFVLEVBQUUsTUFBb0U7UUFDeEcsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxFQUFXO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsRUFBVSxFQUFFLE1BQXFEO1FBQ3JGLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQscUJBQXFCLENBQUMsRUFBdUI7UUFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxJQUFZO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQscUJBQXFCLEtBQVcsQ0FBQztJQUVqQyxrQkFBa0IsQ0FBQyxJQUFhO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQscUJBQXFCLENBQUMsRUFBVSxFQUFFLE9BQWU7UUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxFQUFXLElBQVUsQ0FBQztJQUU3QyxjQUFjLENBQUMsTUFBZSxFQUFFLFlBQStCLEVBQUUsT0FBOEI7UUFDOUYsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxjQUFjO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxXQUFXO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxZQUFZO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxHQUFRLElBQVUsQ0FBQztJQUV4Qyx3QkFBd0IsQ0FBQyxNQUFlO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQixFQUFFLE1BQWU7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFXO0lBQXhCO1FBQ1UseUJBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQzdCLDJCQUFzQixHQUFHLEtBQUssQ0FBQztRQUMvQixzQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDMUIsNEJBQXVCLEdBQUcsS0FBSyxDQUFDO1FBbUd6QyxrQkFBYSxHQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUMzRSw0QkFBdUIsR0FBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUM7UUFDckYsVUFBSyx5QkFBaUI7UUFFdEIsaUJBQVksR0FBK0IsRUFBRSxDQUFDO0lBc0wvQyxDQUFDO0lBM1JBLE9BQU87SUFFUCxDQUFDO0lBRUQsU0FBUyxDQUFDLGVBQXVCO1FBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxVQUFVLENBQUMsZUFBdUIsRUFBRSxNQUFjLEVBQUUsS0FBYTtRQUNoRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFdBQVcsQ0FBQyxlQUF1QixFQUFFLE1BQWMsRUFBRSxJQUFZLEVBQUUsWUFBc0I7UUFDeEYsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCx1QkFBdUI7SUFFdkIsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBZTtRQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELE1BQU0sQ0FBQyxXQUFtQjtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELG9CQUFvQixDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUNoRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELHVCQUF1QixDQUFDLE9BQWUsRUFBRSxLQUFhO1FBQ3JELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsSUFBWSxFQUFFLGtCQUF1QztRQUN2RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQXVCO1FBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBSUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQXlCO1FBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELHFCQUFxQixLQUFXLENBQUM7SUFDakMsSUFBSSx1QkFBdUI7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxVQUF1QixFQUFFLElBQVk7UUFDdEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBeUIsSUFBVSxDQUFDO0lBUWpELEtBQUs7UUFDSixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksSUFBSTtRQUNQLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPLENBQUMsSUFBWTtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUFhO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxDQUFDLFFBQWdCO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFJLG1CQUFtQjtRQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsYUFBeUQsSUFBSSxDQUFDO0lBRS9FLGFBQWE7UUFDWixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLENBQUMsR0FBeUI7UUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFlLEVBQUUsUUFBZ0IsRUFBRSxJQUFZLEVBQUUsUUFBa0I7UUFDOUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxZQUFZLENBQUMsYUFBc0IsRUFBRSxTQUFrQixJQUFVLENBQUM7SUFFbEUsU0FBUyxDQUFDLElBQXFCLElBQVUsQ0FBQztJQUUxQyxVQUFVLENBQUMsSUFBZTtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGNBQWMsQ0FBQyxNQUFlO1FBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsT0FBTztRQUNOLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsZUFBZSxDQUFDLFFBQWEsRUFBRSxJQUFtQixFQUFFLGNBQXVCO1FBQzFFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsdUJBQXVCLENBQUMsSUFBMkI7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCx3QkFBd0IsQ0FBQyxNQUE4QjtRQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELDBCQUEwQixDQUFDLElBQThCO1FBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsMEJBQTBCLENBQUMsWUFBb0I7UUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxhQUFhLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxVQUFVLENBQUMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLE1BQWMsRUFBRSxLQUF3QjtRQUN4RixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELGFBQWEsQ0FBQyxRQUFnQjtRQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELE1BQU0sQ0FBQyxPQUFlO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsU0FBUyxDQUFDLGtCQUEwQixFQUFFLFFBQTRCLEVBQUUsTUFBMkIsRUFBRSxLQUFhLEVBQUUsS0FBYTtRQUM1SCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFFBQVEsQ0FBQyxVQUFrQixFQUFFLE9BQWUsRUFBRSxPQUFnQjtRQUM3RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFlBQVksQ0FBQyxPQUFlLEVBQUUsUUFBZ0I7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxJQUFJLENBQUMsUUFBZ0IsRUFBRSxXQUErQztRQUNyRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELE1BQU0sQ0FBQyxRQUFnQixFQUFFLFFBQWlCLEVBQUUsV0FBK0M7UUFDMUYsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxPQUFPLENBQUMsUUFBZ0IsRUFBRSxXQUErQztRQUN4RSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFFBQVEsQ0FBQyxRQUFnQixFQUFFLFdBQStDO1FBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsUUFBUSxDQUFDLFFBQWdCO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsZUFBZSxDQUFDLFFBQWdCO1FBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWdCO1FBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsU0FBbUI7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxXQUFXLENBQUMsa0JBQTBCLEVBQUUsSUFBWSxFQUFFLEtBQWE7UUFDbEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxhQUFhLENBQUMsT0FBZSxFQUFFLFVBQWtCLEVBQUUsS0FBYTtRQUMvRCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFVBQVUsQ0FBQyxRQUFhO1FBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0QsV0FBVyxDQUFDLGVBQXVCLEVBQUUsTUFBYyxFQUFFLGlCQUF5QixFQUFFLGdCQUF3QjtRQUN2RyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUFPLEdBQUcsS0FBSztRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELFVBQVUsQ0FBQyxPQUFPLEdBQUcsS0FBSztRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUE0QixFQUFFLElBQVksRUFBRSxNQUEyQjtRQUNsRixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNELElBQUksQ0FBQyxRQUFnQixFQUFFLFFBQWdCO1FBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQ0Qsd0JBQXdCLENBQUMsaUJBQXlCO1FBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUEzQjtRQUVDLGlCQUFZLEdBQStCLEVBQUUsQ0FBQztRQUM5QyxpQkFBWSxHQUFHLEtBQUssQ0FBQztRQUNyQiwyQkFBc0IsR0FBVyxDQUFDLENBQUM7UUFFbkMsd0JBQW1CLEdBQUcsSUFBSSxDQUFDO1FBQzNCLG1CQUFjLEdBQUcsSUFBSSxDQUFDO1FBNEhiLGNBQVMsR0FBc0MsSUFBSyxDQUFDO0lBQy9ELENBQUM7SUEzSEEsa0JBQWtCO1FBQ2pCLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUF1QztRQUNqRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDdEIsR0FBRyxFQUFFLENBQUM7WUFDTixJQUFJLEVBQUUsVUFBVTtZQUNoQixXQUFXLEVBQUUsQ0FBQztZQUNkLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLFlBQVk7WUFDckIsSUFBSSxFQUFFO2dCQUNMLFdBQVcsRUFBRSxDQUFDO3dCQUNiLEVBQUUsRUFBRSxDQUFDO3dCQUNMLElBQUksRUFBRSxNQUFNO3dCQUNaLElBQUksRUFBRSxDQUFDO3dCQUNQLE1BQU0sRUFBRSxDQUFDO3FCQUNULENBQUM7YUFDRjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBMEM7UUFDdkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBYTtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFtQztRQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFzQztRQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFxQztRQUM3QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFlLEVBQUUsSUFBUztRQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUFPLEdBQUcsS0FBSztRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFpQjtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFtQztRQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFvQztRQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFxQztRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFxQztRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxJQUE0QztRQUMzRCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFrQztRQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQTZDO1FBQzdELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQXdDO1FBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsWUFBWSxDQUFDLElBQXlDO1FBQ3JELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsV0FBVyxDQUFDLElBQXdDO1FBQ25ELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQWlDO1FBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQW1DO1FBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQTBDO1FBQ3ZELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsY0FBYyxDQUFDLElBQTJDO1FBQ3pELE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsc0JBQXNCLENBQUMsSUFBbUQ7UUFDekUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxJQUFvRDtRQUMzRSxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztDQUdEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLG9CQUFvQjtJQUExRDs7UUFDUyxRQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRVIscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQW1ELENBQUM7SUFzRnZGLENBQUM7SUFwRkEsWUFBWTtRQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFzQztRQUNqRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixNQUFNLE9BQU8sR0FBRyxPQUFnQyxDQUFDO2dCQUNqRCxRQUFRLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDekIsS0FBSyxVQUFVO3dCQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQzt3QkFDMUMsT0FBTztnQkFDVCxDQUFDO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ25DLE9BQU87WUFDUixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sUUFBUSxHQUFHLE9BQWlDLENBQUM7WUFDbkQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDakUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsT0FBOEIsRUFBRSxJQUFTO1FBQ3pELE1BQU0sUUFBUSxHQUEyQjtZQUN4QyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNmLElBQUksRUFBRSxVQUFVO1lBQ2hCLFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRztZQUN4QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJO1NBQ0osQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUFhLEVBQUUsSUFBUztRQUNyQyxNQUFNLFFBQVEsR0FBd0I7WUFDckMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDZixJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUs7WUFDTCxJQUFJO1NBQ0osQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELHlCQUF5QixDQUFDLE9BQWU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQTBCLENBQUM7UUFDL0QsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0MsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxlQUFlLENBQUMsT0FBZSxFQUFFLElBQVM7UUFDekMsTUFBTSxRQUFRLEdBQTBCO1lBQ3ZDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2YsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPO1lBQ1AsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDO1FBQ0YsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsUUFBUSxDQUFDLE9BQThCLEVBQUUsSUFBcUM7UUFDN0UsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRTtZQUM5QixNQUFNLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVO1lBQzdCLGtCQUFrQixFQUFFLENBQUM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFlBQVk7SUFFakQsWUFBWSxjQUErQjtRQUMxQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQWdCLEVBQUUsU0FBZ0IsRUFBRSxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNEIn0=