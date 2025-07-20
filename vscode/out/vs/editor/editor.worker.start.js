/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { initialize } from '../base/common/worker/webWorkerBootstrap.js';
import { EditorWorker } from './common/services/editorWebWorker.js';
import { EditorWorkerHost } from './common/services/editorWorkerHost.js';
/**
 * Used by `monaco-editor` to hook up web worker rpc.
 * @skipMangle
 * @internal
 */
export function start(createClient) {
    let client;
    const webWorkerServer = initialize((workerServer) => {
        const editorWorkerHost = EditorWorkerHost.getChannel(workerServer);
        const host = new Proxy({}, {
            get(target, prop, receiver) {
                if (prop === 'then') {
                    // Don't forward the call when the proxy is returned in an async function and the runtime tries to .then it.
                    return undefined;
                }
                if (typeof prop !== 'string') {
                    throw new Error(`Not supported`);
                }
                return (...args) => {
                    return editorWorkerHost.$fhr(prop, args);
                };
            }
        });
        const ctx = {
            host: host,
            getMirrorModels: () => {
                return webWorkerServer.requestHandler.getModels();
            }
        };
        client = createClient(ctx);
        return new EditorWorker(client);
    });
    return client;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLndvcmtlci5zdGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2VkaXRvci53b3JrZXIuc3RhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQWtCLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFekU7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxLQUFLLENBQStDLFlBQXFEO0lBQ3hILElBQUksTUFBMkIsQ0FBQztJQUNoQyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtRQUNuRCxNQUFNLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVuRSxNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUU7WUFDMUIsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUTtnQkFDekIsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQ3JCLDRHQUE0RztvQkFDNUcsT0FBTyxTQUFTLENBQUM7Z0JBQ2xCLENBQUM7Z0JBQ0QsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztnQkFDRCxPQUFPLENBQUMsR0FBRyxJQUFlLEVBQUUsRUFBRTtvQkFDN0IsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMxQyxDQUFDLENBQUM7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxHQUFHLEdBQTBCO1lBQ2xDLElBQUksRUFBRSxJQUFhO1lBQ25CLGVBQWUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JCLE9BQU8sZUFBZSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuRCxDQUFDO1NBQ0QsQ0FBQztRQUVGLE1BQU0sR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFM0IsT0FBTyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sTUFBTyxDQUFDO0FBQ2hCLENBQUMifQ==