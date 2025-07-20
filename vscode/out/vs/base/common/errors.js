/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Avoid circular dependency on EventEmitter by implementing a subset of the interface.
export class ErrorHandler {
    constructor() {
        this.listeners = [];
        this.unexpectedErrorHandler = function (e) {
            setTimeout(() => {
                if (e.stack) {
                    if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
                        throw new ErrorNoTelemetry(e.message + '\n\n' + e.stack);
                    }
                    throw new Error(e.message + '\n\n' + e.stack);
                }
                throw e;
            }, 0);
        };
    }
    addListener(listener) {
        this.listeners.push(listener);
        return () => {
            this._removeListener(listener);
        };
    }
    emit(e) {
        this.listeners.forEach((listener) => {
            listener(e);
        });
    }
    _removeListener(listener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }
    setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
        this.unexpectedErrorHandler = newUnexpectedErrorHandler;
    }
    getUnexpectedErrorHandler() {
        return this.unexpectedErrorHandler;
    }
    onUnexpectedError(e) {
        this.unexpectedErrorHandler(e);
        this.emit(e);
    }
    // For external errors, we don't want the listeners to be called
    onUnexpectedExternalError(e) {
        this.unexpectedErrorHandler(e);
    }
}
export const errorHandler = new ErrorHandler();
/** @skipMangle */
export function setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}
/**
 * Returns if the error is a SIGPIPE error. SIGPIPE errors should generally be
 * logged at most once, to avoid a loop.
 *
 * @see https://github.com/microsoft/vscode-remote-release/issues/6481
 */
export function isSigPipeError(e) {
    if (!e || typeof e !== 'object') {
        return false;
    }
    const cast = e;
    return cast.code === 'EPIPE' && cast.syscall?.toUpperCase() === 'WRITE';
}
/**
 * This function should only be called with errors that indicate a bug in the product.
 * E.g. buggy extensions/invalid user-input/network issues should not be able to trigger this code path.
 * If they are, this indicates there is also a bug in the product.
*/
export function onBugIndicatingError(e) {
    errorHandler.onUnexpectedError(e);
    return undefined;
}
export function onUnexpectedError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedError(e);
    }
    return undefined;
}
export function onUnexpectedExternalError(e) {
    // ignore errors from cancelled promises
    if (!isCancellationError(e)) {
        errorHandler.onUnexpectedExternalError(e);
    }
    return undefined;
}
export function transformErrorForSerialization(error) {
    if (error instanceof Error) {
        const { name, message, cause } = error;
        const stack = error.stacktrace || error.stack;
        return {
            $isError: true,
            name,
            message,
            stack,
            noTelemetry: ErrorNoTelemetry.isErrorNoTelemetry(error),
            cause: cause ? transformErrorForSerialization(cause) : undefined,
            code: error.code
        };
    }
    // return as is
    return error;
}
export function transformErrorFromSerialization(data) {
    let error;
    if (data.noTelemetry) {
        error = new ErrorNoTelemetry();
    }
    else {
        error = new Error();
        error.name = data.name;
    }
    error.message = data.message;
    error.stack = data.stack;
    if (data.code) {
        error.code = data.code;
    }
    if (data.cause) {
        error.cause = transformErrorFromSerialization(data.cause);
    }
    return error;
}
export const canceledName = 'Canceled';
/**
 * Checks if the given error is a promise in canceled state
 */
export function isCancellationError(error) {
    if (error instanceof CancellationError) {
        return true;
    }
    return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
// !!!IMPORTANT!!!
// Do NOT change this class because it is also used as an API-type.
export class CancellationError extends Error {
    constructor() {
        super(canceledName);
        this.name = this.message;
    }
}
export class PendingMigrationError extends Error {
    static { this._name = 'PendingMigrationError'; }
    static is(error) {
        return error instanceof PendingMigrationError || (error instanceof Error && error.name === PendingMigrationError._name);
    }
    constructor(message) {
        super(message);
        this.name = PendingMigrationError._name;
    }
}
/**
 * @deprecated use {@link CancellationError `new CancellationError()`} instead
 */
export function canceled() {
    const error = new Error(canceledName);
    error.name = error.message;
    return error;
}
export function illegalArgument(name) {
    if (name) {
        return new Error(`Illegal argument: ${name}`);
    }
    else {
        return new Error('Illegal argument');
    }
}
export function illegalState(name) {
    if (name) {
        return new Error(`Illegal state: ${name}`);
    }
    else {
        return new Error('Illegal state');
    }
}
export class ReadonlyError extends TypeError {
    constructor(name) {
        super(name ? `${name} is read-only and cannot be changed` : 'Cannot change read-only property');
    }
}
export function getErrorMessage(err) {
    if (!err) {
        return 'Error';
    }
    if (err.message) {
        return err.message;
    }
    if (err.stack) {
        return err.stack.split('\n')[0];
    }
    return String(err);
}
export class NotImplementedError extends Error {
    constructor(message) {
        super('NotImplemented');
        if (message) {
            this.message = message;
        }
    }
}
export class NotSupportedError extends Error {
    constructor(message) {
        super('NotSupported');
        if (message) {
            this.message = message;
        }
    }
}
export class ExpectedError extends Error {
    constructor() {
        super(...arguments);
        this.isExpected = true;
    }
}
/**
 * Error that when thrown won't be logged in telemetry as an unhandled error.
 */
export class ErrorNoTelemetry extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'CodeExpectedError';
    }
    static fromError(err) {
        if (err instanceof ErrorNoTelemetry) {
            return err;
        }
        const result = new ErrorNoTelemetry();
        result.message = err.message;
        result.stack = err.stack;
        return result;
    }
    static isErrorNoTelemetry(err) {
        return err.name === 'CodeExpectedError';
    }
}
/**
 * This error indicates a bug.
 * Do not throw this for invalid user input.
 * Only catch this error to recover gracefully from bugs.
 */
export class BugIndicatingError extends Error {
    constructor(message) {
        super(message || 'An unexpected bug occurred.');
        Object.setPrototypeOf(this, BugIndicatingError.prototype);
        // Because we know for sure only buggy code throws this,
        // we definitely want to break here and fix the bug.
        // debugger;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9lcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsdUZBQXVGO0FBQ3ZGLE1BQU0sT0FBTyxZQUFZO0lBSXhCO1FBRUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFFcEIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFVBQVUsQ0FBTTtZQUM3QyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNiLElBQUksZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUMsTUFBTSxJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDMUQsQ0FBQztvQkFFRCxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztnQkFFRCxNQUFNLENBQUMsQ0FBQztZQUNULENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQztJQUNILENBQUM7SUFFRCxXQUFXLENBQUMsUUFBK0I7UUFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFOUIsT0FBTyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQztJQUNILENBQUM7SUFFTyxJQUFJLENBQUMsQ0FBTTtRQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFD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