/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../base/common/assert.js';
import { isOneOf } from '../../../../../../../base/common/types.js';
/**
 * Mocks an `TObject` with the provided `overrides`.
 *
 * If you need to mock an `Service`, please use {@link mockService}
 * instead which provides better type safety guarantees for the case.
 *
 * @throws Reading non-overridden property or function on `TObject` throws an error.
 */
export function mockObject(overrides) {
    // ensure that the overrides object cannot be modified afterward
    overrides = Object.freeze(overrides);
    const keys = [];
    for (const key in overrides) {
        if (Object.hasOwn(overrides, key)) {
            keys.push(key);
        }
    }
    const mocked = new Proxy({}, {
        get: (_target, key) => {
            assert(isOneOf(key, keys), `The '${key}' is not mocked.`);
            // note! it's ok to type assert here, because of the explicit runtime
            //       assertion  above
            return overrides[key];
        },
    });
    // note! it's ok to type assert here, because of the runtime checks in
    //       the `Proxy` getter
    return mocked;
}
/**
 * Mocks provided service with the provided `overrides`.
 * Same as more generic {@link mockObject} utility, but with
 * the service constraint on the `TService` type.
 *
 * @throws Reading non-overridden property or function
 * 		   on `TService` throws an error.
 */
export function mockService(overrides) {
    return mockObject(overrides);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvbW9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBSXBFOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUN6QixTQUEyQjtJQUUzQixnRUFBZ0U7SUFDaEUsU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFckMsTUFBTSxJQUFJLEdBQStCLEVBQUUsQ0FBQztJQUM1QyxLQUFLLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQzdCLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQVcsSUFBSSxLQUFLLENBQy9CLEVBQUUsRUFDRjtRQUNDLEdBQUcsRUFBRSxDQUNKLE9BQWdCLEVBQ2hCLEdBQTZCLEVBQ2hCLEVBQUU7WUFDZixNQUFNLENBQ0wsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFDbEIsUUFBUSxHQUFHLGtCQUFrQixDQUM3QixDQUFDO1lBRUYscUVBQXFFO1lBQ3JFLHlCQUF5QjtZQUN6QixPQUFPLFNBQVMsQ0FBQyxHQUFRLENBQWUsQ0FBQztRQUMxQyxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0lBRUosc0VBQXNFO0lBQ3RFLDJCQUEyQjtJQUMzQixPQUFPLE1BQWlCLENBQUM7QUFDMUIsQ0FBQztBQVNEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUMxQixTQUE0QjtJQUU1QixPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QixDQUFDIn0=