/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { derived, ObservablePromise } from '../../../../base/common/observable.js';
import { compare } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export function isChatContextPickerPickItem(item) {
    return isObject(item) && typeof item.asAttachment === 'function';
}
/**
 * Helper for use in {@IChatContextPickerItem} that wraps a simple query->promise
 * function into the requisite observable.
 */
export function picksWithPromiseFn(fn) {
    return (query, token) => {
        const promise = derived(reader => {
            const queryValue = query.read(reader);
            const cts = new CancellationTokenSource(token);
            reader.store.add(toDisposable(() => cts.dispose(true)));
            return new ObservablePromise(fn(queryValue, cts.token));
        });
        return promise.map((value, reader) => {
            const result = value.promiseResult.read(reader);
            return { picks: result?.data || [], busy: result === undefined };
        });
    };
}
export const IChatContextPickService = createDecorator('IContextPickService');
export class ChatContextPickService {
    constructor() {
        this._picks = [];
        this.items = this._picks;
    }
    registerChatContextItem(pick) {
        this._picks.push(pick);
        this._picks.sort((a, b) => {
            const valueA = a.ordinal ?? 0;
            const valueB = b.ordinal ?? 0;
            if (valueA === valueB) {
                return compare(a.label, b.label);
            }
            else if (valueA < valueB) {
                return 1;
            }
            else {
                return -1;
            }
        });
        return toDisposable(() => {
            const index = this._picks.indexOf(pick);
            if (index >= 0) {
                this._picks.splice(index, 1);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRQaWNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZXh0UGlja1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFlN0YsTUFBTSxVQUFVLDJCQUEyQixDQUFDLElBQWE7SUFDeEQsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBUSxJQUFtQyxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUM7QUFDbEcsQ0FBQztBQXVDRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsRUFBMkU7SUFDN0csT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUN2QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4RCxPQUFPLElBQUksaUJBQWlCLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNwQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUM7QUFDSCxDQUFDO0FBZUQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUEwQixxQkFBcUIsQ0FBQyxDQUFDO0FBRXZHLE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFJa0IsV0FBTSxHQUE0QixFQUFFLENBQUM7UUFFN0MsVUFBSyxHQUFvQyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBd0IvRCxDQUFDO0lBdEJBLHVCQUF1QixDQUFDLElBQTJCO1FBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDO1lBQzlCLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDO1lBQzlCLElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN2QixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQyxDQUFDO2lCQUFNLElBQUksTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixPQUFPLENBQUMsQ0FBQztZQUNWLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hDLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=