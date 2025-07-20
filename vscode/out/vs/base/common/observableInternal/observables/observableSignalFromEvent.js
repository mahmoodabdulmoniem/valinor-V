/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { transaction } from '../transaction.js';
import { DebugNameData } from '../debugName.js';
import { BaseObservable } from './baseObservable.js';
export function observableSignalFromEvent(owner, event) {
    return new FromEventObservableSignal(typeof owner === 'string' ? owner : new DebugNameData(owner, undefined, undefined), event);
}
class FromEventObservableSignal extends BaseObservable {
    constructor(debugNameDataOrName, event) {
        super();
        this.event = event;
        this.handleEvent = () => {
            transaction((tx) => {
                for (const o of this._observers) {
                    tx.updateObserver(o, this);
                    o.handleChange(this, undefined);
                }
            }, () => this.debugName);
        };
        this.debugName = typeof debugNameDataOrName === 'string'
            ? debugNameDataOrName
            : debugNameDataOrName.getDebugName(this) ?? 'Observable Signal From Event';
    }
    onFirstObserverAdded() {
        this.subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this.subscription.dispose();
        this.subscription = undefined;
    }
    get() {
        // NO OP
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVNpZ25hbEZyb21FdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL29ic2VydmFibGVzL29ic2VydmFibGVTaWduYWxGcm9tRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRWhELE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFckQsTUFBTSxVQUFVLHlCQUF5QixDQUN4QyxLQUEwQixFQUMxQixLQUFpQjtJQUVqQixPQUFPLElBQUkseUJBQXlCLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDakksQ0FBQztBQUVELE1BQU0seUJBQTBCLFNBQVEsY0FBb0I7SUFJM0QsWUFDQyxtQkFBMkMsRUFDMUIsS0FBaUI7UUFFbEMsS0FBSyxFQUFFLENBQUM7UUFGUyxVQUFLLEdBQUwsS0FBSyxDQUFZO1FBWWxCLGdCQUFXLEdBQUcsR0FBRyxFQUFFO1lBQ25DLFdBQVcsQ0FDVixDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUNOLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNqQyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDM0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7WUFDRixDQUFDLEVBQ0QsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FDcEIsQ0FBQztRQUNILENBQUMsQ0FBQztRQW5CRCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sbUJBQW1CLEtBQUssUUFBUTtZQUN2RCxDQUFDLENBQUMsbUJBQW1CO1lBQ3JCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksOEJBQThCLENBQUM7SUFDN0UsQ0FBQztJQUVrQixvQkFBb0I7UUFDdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBY2tCLHFCQUFxQjtRQUN2QyxJQUFJLENBQUMsWUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDO0lBQy9CLENBQUM7SUFFZSxHQUFHO1FBQ2xCLFFBQVE7SUFDVCxDQUFDO0NBQ0QifQ==