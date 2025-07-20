/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap } from '../../../../../../base/common/lifecycle.js';
import { assertNotDisposed } from './observableDisposable.js';
/**
 * Generic cache for object instances. Guarantees to return only non-disposed
 * objects from the {@linkcode get} method. If a requested object is not yet
 * in the cache or is disposed already, the {@linkcode factory} callback is
 * called to create a new object.
 *
 * @throws if {@linkcode factory} callback returns a disposed object.
 *
 * ## Examples
 *
 * ```typescript
 * // a class that will be used as a cache key; the key can be of any
 * // non-nullable type, including primitives like `string` or `number`,
 * // but in this case we use an object pointer as a key
 * class KeyObject {}
 *
 * // a class for testing purposes
 * class TestObject extends ObservableDisposable {
 *   constructor(
 *     public readonly id: KeyObject,
 *   ) {}
 * };
 *
 * // create an object cache instance providing it a factory function that
 * // is responsible for creating new objects based on the provided key if
 * // the cache does not contain the requested object yet or an existing
 * // object is already disposed
 * const cache = new ObjectCache<TestObject, KeyObject>((key) => {
 *   // create a new test object based on the provided key
 *   return new TestObject(key);
 * });
 *
 * // create two keys
 * const key1 = new KeyObject();
 * const key2 = new KeyObject();
 *
 * // get an object from the cache by its key
 * const object1 = cache.get(key1); // returns a new test object
 *
 * // validate that the new object has the correct key
 * assert(
 *   object1.id === key1,
 *   'Object 1 must have correct ID.',
 * );
 *
 * // returns the same cached test object
 * const object2 = cache.get(key1);
 *
 * // validate that the same exact object is returned from the cache
 * assert(
 *   object1 === object2,
 *   'Object 2 the same cached object as object 1.',
 * );
 *
 * // returns a new test object
 * const object3 = cache.get(key2);
 *
 * // validate that the new object has the correct key
 * assert(
 *   object3.id === key2,
 *   'Object 3 must have correct ID.',
 * );
 *
 * assert(
 *   object3 !== object1,
 *   'Object 3 must be a new object.',
 * );
 * ```
 */
export class ObjectCache extends Disposable {
    constructor(factory) {
        super();
        this.factory = factory;
        this.cache = this._register(new DisposableMap());
    }
    /**
     * Get an existing object from the cache. If a requested object is not yet
     * in the cache or is disposed already, the {@linkcode factory} callback is
     * called to create a new object.
     *
     * @throws if {@linkcode factory} callback returns a disposed object.
     * @param key - ID of the object in the cache
     */
    get(key) {
        let object = this.cache.get(key);
        // if object is already disposed, remove it from the cache
        if (object?.isDisposed) {
            this.cache.deleteAndLeak(key);
            object = undefined;
        }
        // if object exists and is not disposed, return it
        if (object) {
            // must always hold true due to the check above
            assertNotDisposed(object, 'Object must not be disposed.');
            return object;
        }
        // create a new object by calling the factory
        object = this.factory(key);
        // newly created object must not be disposed
        assertNotDisposed(object, 'Newly created object must not be disposed.');
        // remove it from the cache automatically on dispose
        object.addDisposables(object.onDispose(() => {
            this.cache.deleteAndLeak(key);
        }));
        this.cache.set(key, object);
        return object;
    }
    /**
     * Remove an object from the cache by its key.
     *
     * @param key ID of the object to remove.
     * @param dispose Whether the removed object must be disposed.
     */
    remove(key, dispose) {
        if (dispose) {
            this.cache.deleteAndDispose(key);
            return this;
        }
        this.cache.deleteAndLeak(key);
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9vYmplY3RDYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBd0IsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVwRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvRUc7QUFDSCxNQUFNLE9BQU8sV0FHWCxTQUFRLFVBQVU7SUFJbkIsWUFDa0IsT0FBc0Q7UUFFdkUsS0FBSyxFQUFFLENBQUM7UUFGUyxZQUFPLEdBQVAsT0FBTyxDQUErQztRQUp2RCxVQUFLLEdBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBTXJDLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksR0FBRyxDQUFDLEdBQVM7UUFDbkIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFakMsMERBQTBEO1FBQzFELElBQUksTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDcEIsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osK0NBQStDO1lBQy9DLGlCQUFpQixDQUNoQixNQUFNLEVBQ04sOEJBQThCLENBQzlCLENBQUM7WUFFRixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCw2Q0FBNkM7UUFDN0MsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFM0IsNENBQTRDO1FBQzVDLGlCQUFpQixDQUNoQixNQUFNLEVBQ04sNENBQTRDLENBQzVDLENBQUM7UUFFRixvREFBb0Q7UUFDcEQsTUFBTSxDQUFDLGNBQWMsQ0FDcEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1QixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLE1BQU0sQ0FBQyxHQUFTLEVBQUUsT0FBZ0I7UUFDeEMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDOUIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==