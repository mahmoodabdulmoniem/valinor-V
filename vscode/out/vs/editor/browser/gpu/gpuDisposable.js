/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFunction } from '../../../base/common/types.js';
export var GPULifecycle;
(function (GPULifecycle) {
    async function requestDevice(fallback) {
        try {
            if (!navigator.gpu) {
                throw new Error('This browser does not support WebGPU');
            }
            const adapter = (await navigator.gpu.requestAdapter());
            if (!adapter) {
                throw new Error('This browser supports WebGPU but it appears to be disabled');
            }
            return wrapDestroyableInDisposable(await adapter.requestDevice());
        }
        catch (e) {
            if (fallback) {
                fallback(e.message);
            }
            throw e;
        }
    }
    GPULifecycle.requestDevice = requestDevice;
    function createBuffer(device, descriptor, initialValues) {
        const buffer = device.createBuffer(descriptor);
        if (initialValues) {
            device.queue.writeBuffer(buffer, 0, (isFunction(initialValues) ? initialValues() : initialValues));
        }
        return wrapDestroyableInDisposable(buffer);
    }
    GPULifecycle.createBuffer = createBuffer;
    function createTexture(device, descriptor) {
        return wrapDestroyableInDisposable(device.createTexture(descriptor));
    }
    GPULifecycle.createTexture = createTexture;
})(GPULifecycle || (GPULifecycle = {}));
function wrapDestroyableInDisposable(value) {
    return {
        object: value,
        dispose: () => value.destroy()
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1RGlzcG9zYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2dwdURpc3Bvc2FibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTNELE1BQU0sS0FBVyxZQUFZLENBOEI1QjtBQTlCRCxXQUFpQixZQUFZO0lBQ3JCLEtBQUssVUFBVSxhQUFhLENBQUMsUUFBb0M7UUFDdkUsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1lBQ3pELENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7WUFDL0UsQ0FBQztZQUNELE9BQU8sMkJBQTJCLENBQUMsTUFBTSxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyQixDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUM7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQWhCcUIsMEJBQWEsZ0JBZ0JsQyxDQUFBO0lBRUQsU0FBZ0IsWUFBWSxDQUFDLE1BQWlCLEVBQUUsVUFBK0IsRUFBRSxhQUFtRDtRQUNuSSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBOEIsQ0FBQyxDQUFDO1FBQ2pJLENBQUM7UUFDRCxPQUFPLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFOZSx5QkFBWSxlQU0zQixDQUFBO0lBRUQsU0FBZ0IsYUFBYSxDQUFDLE1BQWlCLEVBQUUsVUFBZ0M7UUFDaEYsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUZlLDBCQUFhLGdCQUU1QixDQUFBO0FBQ0YsQ0FBQyxFQTlCZ0IsWUFBWSxLQUFaLFlBQVksUUE4QjVCO0FBRUQsU0FBUywyQkFBMkIsQ0FBZ0MsS0FBUTtJQUMzRSxPQUFPO1FBQ04sTUFBTSxFQUFFLEtBQUs7UUFDYixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtLQUM5QixDQUFDO0FBQ0gsQ0FBQyJ9