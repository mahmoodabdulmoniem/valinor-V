/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const performanceNow = globalThis.performance.now.bind(globalThis.performance);
export class StopWatch {
    static create(highResolution) {
        return new StopWatch(highResolution);
    }
    constructor(highResolution) {
        this._now = highResolution === false ? Date.now : performanceNow;
        this._startTime = this._now();
        this._stopTime = -1;
    }
    stop() {
        this._stopTime = this._now();
    }
    reset() {
        this._startTime = this._now();
        this._stopTime = -1;
    }
    elapsed() {
        if (this._stopTime !== -1) {
            return this._stopTime - this._startTime;
        }
        return this._now() - this._startTime;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcHdhdGNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9zdG9wd2F0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUUvRSxNQUFNLE9BQU8sU0FBUztJQU9kLE1BQU0sQ0FBQyxNQUFNLENBQUMsY0FBd0I7UUFDNUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsWUFBWSxjQUF3QjtRQUNuQyxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztRQUNqRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDekMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDdEMsQ0FBQztDQUNEIn0=