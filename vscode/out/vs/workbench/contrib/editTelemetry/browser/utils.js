/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../base/common/async.js';
import { observableValue, runOnChange, transaction } from '../../../../base/common/observable.js';
export function sumByCategory(items, getValue, getCategory) {
    return items.reduce((acc, item) => {
        const category = getCategory(item);
        acc[category] = (acc[category] || 0) + getValue(item);
        return acc;
    }, {});
}
export function mapObservableDelta(obs, mapFn, store) {
    const obsResult = observableValue('mapped', obs.get());
    store.add(runOnChange(obs, (value, _prevValue, changes) => {
        transaction(tx => {
            for (const c of changes) {
                obsResult.set(value, tx, mapFn(c));
            }
        });
    }));
    return obsResult;
}
export const AsyncReaderEndOfStream = Symbol('AsyncReaderEndOfStream');
export class AsyncReader {
    get endOfStream() { return this._buffer.length === 0 && this._atEnd; }
    constructor(_source) {
        this._source = _source;
        this._buffer = [];
        this._atEnd = false;
    }
    async _extendBuffer() {
        if (this._atEnd) {
            return;
        }
        if (!this._extendBufferPromise) {
            this._extendBufferPromise = (async () => {
                const { value, done } = await this._source.next();
                this._extendBufferPromise = undefined;
                if (done) {
                    this._atEnd = true;
                }
                else {
                    this._buffer.push(value);
                }
            })();
        }
        await this._extendBufferPromise;
    }
    async peek() {
        if (this._buffer.length === 0 && !this._atEnd) {
            await this._extendBuffer();
        }
        if (this._buffer.length === 0) {
            return AsyncReaderEndOfStream;
        }
        return this._buffer[0];
    }
    peekSyncOrThrow() {
        if (this._buffer.length === 0) {
            if (this._atEnd) {
                return AsyncReaderEndOfStream;
            }
            throw new Error('No more elements');
        }
        return this._buffer[0];
    }
    readSyncOrThrow() {
        if (this._buffer.length === 0) {
            if (this._atEnd) {
                return AsyncReaderEndOfStream;
            }
            throw new Error('No more elements');
        }
        return this._buffer.shift();
    }
    async peekNextTimeout(timeoutMs) {
        if (this._buffer.length === 0 && !this._atEnd) {
            await raceTimeout(this._extendBuffer(), timeoutMs);
        }
        if (this._atEnd) {
            return AsyncReaderEndOfStream;
        }
        if (this._buffer.length === 0) {
            return undefined;
        }
        return this._buffer[0];
    }
    async waitForBufferTimeout(timeoutMs) {
        if (this._buffer.length > 0 || this._atEnd) {
            return true;
        }
        const result = await raceTimeout(this._extendBuffer().then(() => true), timeoutMs);
        return result !== undefined;
    }
    async read() {
        if (this._buffer.length === 0 && !this._atEnd) {
            await this._extendBuffer();
        }
        if (this._buffer.length === 0) {
            return AsyncReaderEndOfStream;
        }
        return this._buffer.shift();
    }
    async readWhile(predicate, callback) {
        do {
            const piece = await this.peek();
            if (piece === AsyncReaderEndOfStream) {
                break;
            }
            if (!predicate(piece)) {
                break;
            }
            await this.read(); // consume
            await callback(piece);
        } while (true);
    }
    async consumeToEnd() {
        while (!this.endOfStream) {
            await this.read();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0QsT0FBTyxFQUF5QixlQUFlLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXpILE1BQU0sVUFBVSxhQUFhLENBQThCLEtBQW1CLEVBQUUsUUFBNkIsRUFBRSxXQUFtQztJQUNqSixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDakMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDLEVBQUUsRUFBc0MsQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFDRCxNQUFNLFVBQVUsa0JBQWtCLENBQXVCLEdBQXFDLEVBQUUsS0FBbUMsRUFBRSxLQUFzQjtJQUMxSixNQUFNLFNBQVMsR0FBRyxlQUFlLENBQWUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDekQsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2hCLEtBQUss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