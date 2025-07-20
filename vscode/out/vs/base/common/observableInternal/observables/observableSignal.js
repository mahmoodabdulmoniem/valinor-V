/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { transaction } from '../transaction.js';
import { DebugNameData } from '../debugName.js';
import { BaseObservable } from './baseObservable.js';
export function observableSignal(debugNameOrOwner) {
    if (typeof debugNameOrOwner === 'string') {
        return new ObservableSignal(debugNameOrOwner);
    }
    else {
        return new ObservableSignal(undefined, debugNameOrOwner);
    }
}
class ObservableSignal extends BaseObservable {
    get debugName() {
        return new DebugNameData(this._owner, this._debugName, undefined).getDebugName(this) ?? 'Observable Signal';
    }
    toString() {
        return this.debugName;
    }
    constructor(_debugName, _owner) {
        super();
        this._debugName = _debugName;
        this._owner = _owner;
    }
    trigger(tx, change) {
        if (!tx) {
            transaction(tx => {
                this.trigger(tx, change);
            }, () => `Trigger signal ${this.debugName}`);
            return;
        }
        for (const o of this._observers) {
            tx.updateObserver(o, this);
            o.handleChange(this, change);
        }
    }
    get() {
        // NO OP
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVNpZ25hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL29ic2VydmFibGVzL29ic2VydmFibGVTaWduYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFTckQsTUFBTSxVQUFVLGdCQUFnQixDQUFnQixnQkFBaUM7SUFDaEYsSUFBSSxPQUFPLGdCQUFnQixLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzFDLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBUyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxJQUFJLGdCQUFnQixDQUFTLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7QUFDRixDQUFDO0FBTUQsTUFBTSxnQkFBMEIsU0FBUSxjQUE2QjtJQUNwRSxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLG1CQUFtQixDQUFDO0lBQzdHLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRUQsWUFDa0IsVUFBOEIsRUFDOUIsTUFBZTtRQUVoQyxLQUFLLEVBQUUsQ0FBQztRQUhTLGVBQVUsR0FBVixVQUFVLENBQW9CO1FBQzlCLFdBQU0sR0FBTixNQUFNLENBQVM7SUFHakMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxFQUE0QixFQUFFLE1BQWU7UUFDM0QsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ1QsV0FBVyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxQixDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsa0JBQWtCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFZSxHQUFHO1FBQ2xCLFFBQVE7SUFDVCxDQUFDO0NBQ0QifQ==