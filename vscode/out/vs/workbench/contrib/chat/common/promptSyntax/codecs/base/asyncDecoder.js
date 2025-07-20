/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
/**
 * Asynchronous iterator wrapper for a decoder.
 */
export class AsyncDecoder extends Disposable {
    /**
     * @param decoder The decoder instance to wrap.
     *
     * Note! Assumes ownership of the `decoder` object, hence will `dispose`
     * 		 it when the decoder stream is ended.
     */
    constructor(decoder) {
        super();
        this.decoder = decoder;
        // Buffer of messages that have been decoded but not yet consumed.
        this.messages = [];
        this._register(decoder);
    }
    /**
     * Async iterator implementation.
     */
    async *[Symbol.asyncIterator]() {
        // callback is called when `data` or `end` event is received
        const callback = (data) => {
            if (data !== undefined) {
                this.messages.push(data);
            }
            else {
                this.decoder.removeListener('data', callback);
                this.decoder.removeListener('end', callback);
            }
            // is the promise resolve callback is present,
            // then call it and remove the reference
            if (this.resolveOnNewEvent) {
                this.resolveOnNewEvent();
                delete this.resolveOnNewEvent;
            }
        };
        /**
         * !NOTE! The order of event subscriptions below is critical here because
         *        the `data` event is also starts the stream, hence changing
         *        the order of event subscriptions can lead to race conditions.
         *        See {@link ReadableStreamEvents} for more info.
         */
        this.decoder.on('end', callback);
        this.decoder.on('data', callback);
        // start flowing the decoder stream
        this.decoder.start();
        while (true) {
            const maybeMessage = this.messages.shift();
            if (maybeMessage !== undefined) {
                yield maybeMessage;
                continue;
            }
            // if no data available and stream ended, we're done
            if (this.decoder.ended) {
                this.dispose();
                return null;
            }
            // stream isn't ended so wait for the new
            // `data` or `end` event to be received
            await new Promise((resolve) => {
                this.resolveOnNewEvent = resolve;
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvYXN5bmNEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUczRTs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUFvRyxTQUFRLFVBQVU7SUFZbEk7Ozs7O09BS0c7SUFDSCxZQUNrQixPQUEwQjtRQUUzQyxLQUFLLEVBQUUsQ0FBQztRQUZTLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBbEI1QyxrRUFBa0U7UUFDakQsYUFBUSxHQUFRLEVBQUUsQ0FBQztRQXFCbkMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUM7UUFDNUIsNERBQTREO1FBQzVELE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBUSxFQUFFLEVBQUU7WUFDN0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBRUQsOENBQThDO1lBQzlDLHdDQUF3QztZQUN4QyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDekIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGOzs7OztXQUtHO1FBRUgsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVsQyxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVyQixPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMzQyxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxZQUFZLENBQUM7Z0JBQ25CLFNBQVM7WUFDVixDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUVmLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELHlDQUF5QztZQUN6Qyx1Q0FBdUM7WUFDdkMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FDRCJ9