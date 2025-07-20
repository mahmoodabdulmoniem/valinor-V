/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function _definePolyfillMarks(timeOrigin) {
    const _data = [];
    if (typeof timeOrigin === 'number') {
        _data.push('code/timeOrigin', timeOrigin);
    }
    function mark(name, markOptions) {
        _data.push(name, markOptions?.startTime ?? Date.now());
    }
    function getMarks() {
        const result = [];
        for (let i = 0; i < _data.length; i += 2) {
            result.push({
                name: _data[i],
                startTime: _data[i + 1],
            });
        }
        return result;
    }
    return { mark, getMarks };
}
function _define() {
    // Identify browser environment when following property is not present
    // https://nodejs.org/dist/latest-v16.x/docs/api/perf_hooks.html#performancenodetiming
    // @ts-ignore
    if (typeof performance === 'object' && typeof performance.mark === 'function' && !performance.nodeTiming) {
        // in a browser context, reuse performance-util
        if (typeof performance.timeOrigin !== 'number' && !performance.timing) {
            // safari & webworker: because there is no timeOrigin and no workaround
            // we use the `Date.now`-based polyfill.
            return _definePolyfillMarks();
        }
        else {
            // use "native" performance for mark and getMarks
            return {
                mark(name, markOptions) {
                    performance.mark(name, markOptions);
                },
                getMarks() {
                    let timeOrigin = performance.timeOrigin;
                    if (typeof timeOrigin !== 'number') {
                        // safari: there is no timerOrigin but in renderers there is the timing-property
                        // see https://bugs.webkit.org/show_bug.cgi?id=174862
                        timeOrigin = (performance.timing.navigationStart || performance.timing.redirectStart || performance.timing.fetchStart) ?? 0;
                    }
                    const result = [{ name: 'code/timeOrigin', startTime: Math.round(timeOrigin) }];
                    for (const entry of performance.getEntriesByType('mark')) {
                        result.push({
                            name: entry.name,
                            startTime: Math.round(timeOrigin + entry.startTime)
                        });
                    }
                    return result;
                }
            };
        }
    }
    else if (typeof process === 'object') {
        // node.js: use the normal polyfill but add the timeOrigin
        // from the node perf_hooks API as very first mark
        const timeOrigin = performance?.timeOrigin;
        return _definePolyfillMarks(timeOrigin);
    }
    else {
        // unknown environment
        console.trace('perf-util loaded in UNKNOWN environment');
        return _definePolyfillMarks();
    }
}
function _factory(sharedObj) {
    if (!sharedObj.MonacoPerformanceMarks) {
        sharedObj.MonacoPerformanceMarks = _define();
    }
    return sharedObj.MonacoPerformanceMarks;
}
const perf = _factory(globalThis);
export const mark = perf.mark;
/**
 * Returns all marks, sorted by `startTime`.
 */
export const getMarks = perf.getMarks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3BlcmZvcm1hbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLFNBQVMsb0JBQW9CLENBQUMsVUFBbUI7SUFDaEQsTUFBTSxLQUFLLEdBQXVCLEVBQUUsQ0FBQztJQUNyQyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsSUFBSSxDQUFDLElBQVksRUFBRSxXQUFvQztRQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsU0FBUyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFDRCxTQUFTLFFBQVE7UUFDaEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNYLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN2QixDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUMzQixDQUFDO0FBeUJELFNBQVMsT0FBTztJQUVmLHNFQUFzRTtJQUN0RSxzRkFBc0Y7SUFDdEYsYUFBYTtJ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