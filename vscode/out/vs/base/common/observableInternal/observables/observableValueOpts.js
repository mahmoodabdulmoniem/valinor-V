/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from '../debugName.js';
import { strictEquals } from '../commonFacade/deps.js';
import { ObservableValue } from './observableValue.js';
import { LazyObservableValue } from './lazyObservableValue.js';
export function observableValueOpts(options, initialValue) {
    if (options.lazy) {
        return new LazyObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
    }
    return new ObservableValue(new DebugNameData(options.owner, options.debugName, undefined), initialValue, options.equalsFn ?? strictEquals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVZhbHVlT3B0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL29ic2VydmFibGVzL29ic2VydmFibGVWYWx1ZU9wdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNoRSxPQUFPLEVBQW9CLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUUvRCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLE9BR0MsRUFDRCxZQUFlO0lBRWYsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlELFlBQVksRUFDWixPQUFPLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FDaEMsQ0FBQztJQUNILENBQUM7SUFDRCxPQUFPLElBQUksZUFBZSxDQUN6QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlELFlBQVksRUFDWixPQUFPLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FDaEMsQ0FBQztBQUNILENBQUMifQ==