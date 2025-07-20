/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../../../../base/common/assert.js';
import { ObservableDisposable } from '../../../utils/observableDisposable.js';
import { newWriteableStream } from '../../../../../../../../base/common/stream.js';
/**
 * A readable stream of provided objects.
 */
export class ObjectStream extends ObservableDisposable {
    constructor(data, cancellationToken) {
        super();
        this.data = data;
        this.cancellationToken = cancellationToken;
        /**
         * Flag that indicates whether the stream has ended.
         */
        this.ended = false;
        this.stream = newWriteableStream(null);
        if (cancellationToken?.isCancellationRequested) {
            this.end();
            return;
        }
        // send a first batch of data immediately
        this.send(true);
    }
    /**
     * Starts process of sending data to the stream.
     *
     * @param stopAfterFirstSend whether to continue sending data to the stream
     *             or stop sending after the first batch of data is sent instead
     */
    send(stopAfterFirstSend = false) {
        // this method can be called asynchronously by the `setTimeout` utility below, hence
        // the state of the cancellation token or the stream itself might have changed by that time
        if (this.cancellationToken?.isCancellationRequested || this.ended) {
            this.end();
            return;
        }
        this.sendData()
            .then(() => {
            if (this.cancellationToken?.isCancellationRequested || this.ended) {
                this.end();
                return;
            }
            if (stopAfterFirstSend === true) {
                this.stopStream();
                return;
            }
            this.timeoutHandle = setTimeout(this.send.bind(this));
        })
            .catch((error) => {
            this.stream.error(error);
            this.dispose();
        });
    }
    /**
     * Stop the data sending loop.
     */
    stopStream() {
        if (this.timeoutHandle === undefined) {
            return this;
        }
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = undefined;
        return this;
    }
    /**
     * Sends a provided number of objects to the stream.
     */
    async sendData(objectsCount = 25) {
        // send up to 'objectsCount' objects at a time
        while (objectsCount > 0) {
            try {
                const next = this.data.next();
                if (next.done || this.cancellationToken?.isCancellationRequested) {
                    this.end();
                    return;
                }
                await this.stream.write(next.value);
                objectsCount--;
            }
            catch (error) {
                this.stream.error(error);
                this.dispose();
                return;
            }
        }
    }
    /**
     * Ends the stream and stops sending data objects.
     */
    end() {
        if (this.ended) {
            return this;
        }
        this.ended = true;
        this.stopStream();
        this.stream.end();
        return this;
    }
    pause() {
        this.stopStream();
        this.stream.pause();
        return;
    }
    resume() {
        this.send();
        this.stream.resume();
        return;
    }
    destroy() {
        this.dispose();
    }
    removeListener(event, callback) {
        this.stream.removeListener(event, callback);
        return;
    }
    on(event, callback) {
        if (event === 'data') {
            this.stream.on(event, callback);
            // this is the convention of the readable stream, - when
            // the `data` event is registered, the stream is started
            this.send();
            return;
        }
        if (event === 'error') {
            this.stream.on(event, callback);
            return;
        }
        if (event === 'end') {
            this.stream.on(event, callback);
            return;
        }
        assertNever(event, `Unexpected event name '${event}'.`);
    }
    /**
     * Cleanup send interval and destroy the stream.
     */
    dispose() {
        this.stopStream();
        this.stream.destroy();
        super.dispose();
    }
    /**
     * Create new instance of the stream from a provided array.
     */
    static fromArray(array, cancellationToken) {
        return new ObjectStream(arrayToGenerator(array), cancellationToken);
    }
}
/**
 * Create a generator out of a provided array.
 */
export function arrayToGenerator(array) {
    return (function* () {
        for (const item of array) {
            yield item;
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvdXRpbHMvb2JqZWN0U3RyZWFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQW1DLE1BQU0sK0NBQStDLENBQUM7QUFHcEg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBK0IsU0FBUSxvQkFBb0I7SUFpQnZFLFlBQ2tCLElBQTZCLEVBQzdCLGlCQUFxQztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUhTLFNBQUksR0FBSixJQUFJLENBQXlCO1FBQzdCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFsQnZEOztXQUVHO1FBQ0ssVUFBSyxHQUFZLEtBQUssQ0FBQztRQW1COUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FBSSxJQUFJLENBQUMsQ0FBQztRQUUxQyxJQUFJLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1gsT0FBTztRQUNSLENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxJQUFJLENBQ1YscUJBQThCLEtBQUs7UUFFbkMsb0ZBQW9GO1FBQ3BGLDJGQUEyRjtRQUMzRixJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsSUFBSSxJQUFJ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