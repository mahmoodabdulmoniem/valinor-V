/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TerminalDataBufferer {
    constructor(_callback) {
        this._callback = _callback;
        this._terminalBufferMap = new Map();
    }
    dispose() {
        for (const buffer of this._terminalBufferMap.values()) {
            buffer.dispose();
        }
    }
    startBuffering(id, event, throttleBy = 5) {
        const disposable = event((e) => {
            const data = (typeof e === 'string' ? e : e.data);
            let buffer = this._terminalBufferMap.get(id);
            if (buffer) {
                buffer.data.push(data);
                return;
            }
            const timeoutId = setTimeout(() => this.flushBuffer(id), throttleBy);
            buffer = {
                data: [data],
                timeoutId,
                dispose: () => {
                    clearTimeout(timeoutId);
                    this.flushBuffer(id);
                    disposable.dispose();
                }
            };
            this._terminalBufferMap.set(id, buffer);
        });
        return disposable;
    }
    stopBuffering(id) {
        const buffer = this._terminalBufferMap.get(id);
        buffer?.dispose();
    }
    flushBuffer(id) {
        const buffer = this._terminalBufferMap.get(id);
        if (buffer) {
            this._terminalBufferMap.delete(id);
            this._callback(id, buffer.data.join(''));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxEYXRhQnVmZmVyaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxEYXRhQnVmZmVyaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBV2hHLE1BQU0sT0FBTyxvQkFBb0I7SUFHaEMsWUFBNkIsU0FBNkM7UUFBN0MsY0FBUyxHQUFULFNBQVMsQ0FBb0M7UUFGekQsdUJBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7SUFHNUUsQ0FBQztJQUVELE9BQU87UUFDTixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxFQUFVLEVBQUUsS0FBd0MsRUFBRSxhQUFxQixDQUFDO1FBRTFGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQTZCLEVBQUUsRUFBRTtZQUMxRCxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM3QyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2QixPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sR0FBRztnQkFDUixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ1osU0FBUztnQkFDVCxPQUFPLEVBQUUsR0FBRyxFQUFFO29CQUNiLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDckIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN0QixDQUFDO2FBQ0QsQ0FBQztZQUNGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELGFBQWEsQ0FBQyxFQUFVO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0MsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxXQUFXLENBQUMsRUFBVTtRQUNyQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9