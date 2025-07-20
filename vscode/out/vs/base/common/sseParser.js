/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Chr;
(function (Chr) {
    Chr[Chr["CR"] = 13] = "CR";
    Chr[Chr["LF"] = 10] = "LF";
    Chr[Chr["COLON"] = 58] = "COLON";
    Chr[Chr["SPACE"] = 32] = "SPACE";
})(Chr || (Chr = {}));
/**
 * Parser for Server-Sent Events (SSE) streams.
 */
export class SSEParser {
    /**
     * Creates a new SSE parser.
     * @param onEvent The callback to invoke when an event is dispatched.
     */
    constructor(onEvent) {
        this.dataBuffer = '';
        this.eventTypeBuffer = '';
        this.buffer = [];
        this.endedOnCR = false;
        this.onEventHandler = onEvent;
        this.decoder = new TextDecoder('utf-8');
    }
    /**
     * Gets the last event ID received by this parser.
     */
    getLastEventId() {
        return this.lastEventIdBuffer;
    }
    /**
     * Gets the reconnection time in milliseconds, if one was specified by the server.
     */
    getReconnectionTime() {
        return this.reconnectionTime;
    }
    /**
     * Feeds a chunk of the SSE stream to the parser.
     * @param chunk The chunk to parse as a Uint8Array of UTF-8 encoded data.
     */
    feed(chunk) {
        if (chunk.length === 0) {
            return;
        }
        let offset = 0;
        // If the data stream was bifurcated between a CR and LF, avoid processing the CR as an extra newline
        if (this.endedOnCR && chunk[0] === 10 /* Chr.LF */) {
            offset++;
        }
        this.endedOnCR = false;
        // Process complete lines from the buffer
        while (offset < chunk.length) {
            const indexCR = chunk.indexOf(13 /* Chr.CR */, offset);
            const indexLF = chunk.indexOf(10 /* Chr.LF */, offset);
            const index = indexCR === -1 ? indexLF : (indexLF === -1 ? indexCR : Math.min(indexCR, indexLF));
            if (index === -1) {
                break;
            }
            let str = '';
            for (const buf of this.buffer) {
                str += this.decoder.decode(buf, { stream: true });
            }
            str += this.decoder.decode(chunk.subarray(offset, index));
            this.processLine(str);
            this.buffer.length = 0;
            offset = index + (chunk[index] === 13 /* Chr.CR */ && chunk[index + 1] === 10 /* Chr.LF */ ? 2 : 1);
        }
        if (offset < chunk.length) {
            this.buffer.push(chunk.subarray(offset));
        }
        else {
            this.endedOnCR = chunk[chunk.length - 1] === 13 /* Chr.CR */;
        }
    }
    /**
     * Processes a single line from the SSE stream.
     */
    processLine(line) {
        if (!line.length) {
            this.dispatchEvent();
            return;
        }
        if (line.startsWith(':')) {
            return;
        }
        // Parse the field name and value
        let field;
        let value;
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
            // Line with no colon - the entire line is the field name, value is empty
            field = line;
            value = '';
        }
        else {
            // Line with a colon - split into field name and value
            field = line.substring(0, colonIndex);
            value = line.substring(colonIndex + 1);
            // If value starts with a space, remove it
            if (value.startsWith(' ')) {
                value = value.substring(1);
            }
        }
        this.processField(field, value);
    }
    /**
     * Processes a field with the given name and value.
     */
    processField(field, value) {
        switch (field) {
            case 'event':
                this.eventTypeBuffer = value;
                break;
            case 'data':
                // Append the value to the data buffer, followed by a newline
                this.dataBuffer += value;
                this.dataBuffer += '\n';
                break;
            case 'id':
                // If the field value doesn't contain NULL, set the last event ID buffer
                if (!value.includes('\0')) {
                    this.currentEventId = this.lastEventIdBuffer = value;
                }
                else {
                    this.currentEventId = undefined;
                }
                break;
            case 'retry':
                // If the field value consists only of ASCII digits, set the reconnection time
                if (/^\d+$/.test(value)) {
                    this.reconnectionTime = parseInt(value, 10);
                }
                break;
            // Ignore any other fields
        }
    }
    /**
     * Dispatches the event based on the current buffer states.
     */
    dispatchEvent() {
        // If the data buffer is empty, reset the buffers and return
        if (this.dataBuffer === '') {
            this.dataBuffer = '';
            this.eventTypeBuffer = '';
            return;
        }
        // If the data buffer's last character is a newline, remove it
        if (this.dataBuffer.endsWith('\n')) {
            this.dataBuffer = this.dataBuffer.substring(0, this.dataBuffer.length - 1);
        }
        // Create and dispatch the event
        const event = {
            type: this.eventTypeBuffer || 'message',
            data: this.dataBuffer,
        };
        // Add optional fields if they exist
        if (this.currentEventId !== undefined) {
            event.id = this.currentEventId;
        }
        if (this.reconnectionTime !== undefined) {
            event.retry = this.reconnectionTime;
        }
        // Dispatch the event
        this.onEventHandler(event);
        // Reset the data and event type buffers
        this.reset();
    }
    /**
     * Resets the parser state.
     */
    reset() {
        this.dataBuffer = '';
        this.eventTypeBuffer = '';
        this.currentEventId = undefined;
        // Note: lastEventIdBuffer is not reset as it's used for reconnection
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3NlUGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9zc2VQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFxQ2hHLElBQVcsR0FLVjtBQUxELFdBQVcsR0FBRztJQUNiLDBCQUFPLENBQUE7SUFDUCwwQkFBTyxDQUFBO0lBQ1AsZ0NBQVUsQ0FBQTtJQUNWLGdDQUFVLENBQUE7QUFDWCxDQUFDLEVBTFUsR0FBRyxLQUFILEdBQUcsUUFLYjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFVckI7OztPQUdHO0lBQ0gsWUFBWSxPQUF3QjtRQWI1QixlQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ2hCLG9CQUFlLEdBQUcsRUFBRSxDQUFDO1FBSXJCLFdBQU0sR0FBaUIsRUFBRSxDQUFDO1FBQzFCLGNBQVMsR0FBRyxLQUFLLENBQUM7UUFRekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUM7UUFDOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQy9CLENBQUM7SUFDRDs7T0FFRztJQUNJLG1CQUFtQjtRQUN6QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM5QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksSUFBSSxDQUFDLEtBQWlCO1FBQzVCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUVmLHFHQUFxRztRQUNyRyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxvQkFBVyxFQUFFLENBQUM7WUFDM0MsTUFBTSxFQUFFLENBQUM7UUFDVixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdkIseUNBQXlDO1FBQ3pDLE9BQU8sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxrQkFBUyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxrQkFBUyxNQUFNLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBRyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNqRyxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixNQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNiLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvQixHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbkQsQ0FBQztZQUNELEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sR0FBRyxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLG9CQUFXLElBQUksS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsb0JBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBR0QsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMxQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLG9CQUFXLENBQUM7UUFDckQsQ0FBQztJQUNGLENBQUM7SUFDRDs7T0FFRztJQUNLLFdBQVcsQ0FBQyxJQUFZO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsSUFBSSxLQUFhLENBQUM7UUFDbEIsSUFBSSxLQUFhLENBQUM7UUFFbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLHlFQUF5RTtZQUN6RSxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2IsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNaLENBQUM7YUFBTSxDQUFDO1lBQ1Asc0RBQXNEO1lBQ3RELEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN0QyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFdkMsMENBQTBDO1lBQzFDLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzQixLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDRDs7T0FFRztJQUNLLFlBQVksQ0FBQyxLQUFhLEVBQUUsS0FBYTtRQUNoRCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxPQUFPO2dCQUNYLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO2dCQUM3QixNQUFNO1lBRVAsS0FBSyxNQUFNO2dCQUNWLDZEQUE2RDtnQkFDN0QsSUFBSSxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDO2dCQUN4QixNQUFNO1lBRVAsS0FBSyxJQUFJO2dCQUNSLHdFQUF3RTtnQkFDeEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO2dCQUN0RCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQ0QsTUFBTTtZQUVQLEtBQUssT0FBTztnQkFDWCw4RUFBOEU7Z0JBQzlFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN6QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDN0MsQ0FBQztnQkFDRCxNQUFNO1lBRVAsMEJBQTBCO1FBQzNCLENBQUM7SUFDRixDQUFDO0lBQ0Q7O09BRUc7SUFDSyxhQUFhO1FBQ3BCLDREQUE0RDtRQUM1RCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7WUFDMUIsT0FBTztRQUNSLENBQUM7UUFFRCw4REFBOEQ7UUFDOUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsTUFBTSxLQUFLLEdBQWM7WUFDeEIsSUFBSSxFQUFFLElBQUksQ0FBQyxlQUFlLElBQUksU0FBUztZQUN2QyxJQUFJLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDckIsQ0FBQztRQUVGLG9DQUFvQztRQUNwQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkMsS0FBSyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ2hDLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUNyQyxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0Isd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUs7UUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztRQUNoQyxxRUFBcUU7SUFDdEUsQ0FBQztDQUNEIn0=