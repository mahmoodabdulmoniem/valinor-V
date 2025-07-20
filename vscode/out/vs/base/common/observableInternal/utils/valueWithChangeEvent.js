/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../commonFacade/deps.js';
import { observableFromEvent } from '../observables/observableFromEvent.js';
export class ValueWithChangeEventFromObservable {
    constructor(observable) {
        this.observable = observable;
    }
    get onDidChange() {
        return Event.fromObservableLight(this.observable);
    }
    get value() {
        return this.observable.get();
    }
}
export function observableFromValueWithChangeEvent(owner, value) {
    if (value instanceof ValueWithChangeEventFromObservable) {
        return value.observable;
    }
    return observableFromEvent(owner, value.onDidChange, () => value.value);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsdWVXaXRoQ2hhbmdlRXZlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlscy92YWx1ZVdpdGhDaGFuZ2VFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUF5QixNQUFNLHlCQUF5QixDQUFDO0FBRXZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTVFLE1BQU0sT0FBTyxrQ0FBa0M7SUFDOUMsWUFBNEIsVUFBMEI7UUFBMUIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7SUFDdEQsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzlCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxrQ0FBa0MsQ0FBSSxLQUFpQixFQUFFLEtBQStCO0lBQ3ZHLElBQUksS0FBSyxZQUFZLGtDQUFrQyxFQUFFLENBQUM7UUFDekQsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxPQUFPLG1CQUFtQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6RSxDQUFDIn0=