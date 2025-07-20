/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
export class TestAccessibilityService {
    constructor() {
        this.onDidChangeScreenReaderOptimized = Event.None;
        this.onDidChangeReducedMotion = Event.None;
    }
    isScreenReaderOptimized() { return false; }
    isMotionReduced() { return true; }
    alwaysUnderlineAccessKeys() { return Promise.resolve(false); }
    setAccessibilitySupport(accessibilitySupport) { }
    getAccessibilitySupport() { return 0 /* AccessibilitySupport.Unknown */; }
    alert(message) { }
    status(message) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEFjY2Vzc2liaWxpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY2Nlc3NpYmlsaXR5L3Rlc3QvY29tbW9uL3Rlc3RBY2Nlc3NpYmlsaXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHekQsTUFBTSxPQUFPLHdCQUF3QjtJQUFyQztRQUlDLHFDQUFnQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDOUMsNkJBQXdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQVN2QyxDQUFDO0lBUEEsdUJBQXVCLEtBQWMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BELGVBQWUsS0FBYyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0MseUJBQXlCLEtBQXVCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEYsdUJBQXVCLENBQUMsb0JBQTBDLElBQVUsQ0FBQztJQUM3RSx1QkFBdUIsS0FBMkIsNENBQW9DLENBQUMsQ0FBQztJQUN4RixLQUFLLENBQUMsT0FBZSxJQUFVLENBQUM7SUFDaEMsTUFBTSxDQUFDLE9BQWUsSUFBVSxDQUFDO0NBQ2pDIn0=