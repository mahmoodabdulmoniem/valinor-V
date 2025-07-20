/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class RateLimiter {
    constructor(timesPerSecond = 5) {
        this.timesPerSecond = timesPerSecond;
        this._lastRun = 0;
        this._minimumTimeBetweenRuns = 1000 / timesPerSecond;
    }
    runIfNotLimited(callback) {
        const now = Date.now();
        if (now - this._lastRun >= this._minimumTimeBetweenRuns) {
            this._lastRun = now;
            callback();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9jb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLFdBQVc7SUFJdkIsWUFBNEIsaUJBQXlCLENBQUM7UUFBMUIsbUJBQWMsR0FBZCxjQUFjLENBQVk7UUFDckQsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDbEIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksR0FBRyxjQUFjLENBQUM7SUFDdEQsQ0FBQztJQUVNLGVBQWUsQ0FBQyxRQUFvQjtRQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQztZQUNwQixRQUFRLEVBQUUsQ0FBQztRQUNaLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==