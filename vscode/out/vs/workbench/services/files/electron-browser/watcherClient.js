/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDelayedChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { AbstractUniversalWatcherClient } from '../../../../platform/files/common/watcher.js';
export class UniversalWatcherClient extends AbstractUniversalWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging, utilityProcessWorkerWorkbenchService) {
        super(onFileChanges, onLogMessage, verboseLogging);
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.init();
    }
    createWatcher(disposables) {
        const watcher = ProxyChannel.toService(getDelayedChannel((async () => {
            // Acquire universal watcher via utility process worker
            //
            // We explicitly do not add the worker as a disposable
            // because we need to call `stop` on disposal to prevent
            // a crash on shutdown (see below).
            //
            // The utility process worker services ensures to terminate
            // the process automatically when the window closes or reloads.
            const { client, onDidTerminate } = disposables.add(await this.utilityProcessWorkerWorkbenchService.createWorker({
                moduleId: 'vs/platform/files/node/watcher/watcherMain',
                type: 'fileWatcher',
                name: 'file-watcher'
            }));
            // React on unexpected termination of the watcher process
            // by listening to the `onDidTerminate` event. We do not
            // consider an exit code of `0` as abnormal termination.
            onDidTerminate.then(({ reason }) => {
                if (reason?.code === 0) {
                    this.trace(`terminated by itself with code ${reason.code}, signal: ${reason.signal}`);
                }
                else {
                    this.onError(`terminated by itself unexpectedly with code ${reason?.code}, signal: ${reason?.signal} (ETERM)`);
                }
            });
            return client.getChannel('watcher');
        })()));
        return watcher;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2ZpbGVzL2VsZWN0cm9uLWJyb3dzZXIvd2F0Y2hlckNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFM0YsT0FBTyxFQUFFLDhCQUE4QixFQUFrQyxNQUFNLDhDQUE4QyxDQUFDO0FBRzlILE1BQU0sT0FBTyxzQkFBdUIsU0FBUSw4QkFBOEI7SUFFekUsWUFDQyxhQUErQyxFQUMvQyxZQUF3QyxFQUN4QyxjQUF1QixFQUNOLG9DQUEyRTtRQUU1RixLQUFLLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUZsQyx5Q0FBb0MsR0FBcEMsb0NBQW9DLENBQXVDO1FBSTVGLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFFa0IsYUFBYSxDQUFDLFdBQTRCO1FBQzVELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQW9CLGlCQUFpQixDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFFdkYsdURBQXVEO1lBQ3ZELEVBQUU7WUFDRixzREFBc0Q7WUFDdEQsd0RBQXdEO1lBQ3hELG1DQUFtQztZQUNuQyxFQUFFO1lBQ0YsMkRBQTJEO1lBQzNELCtEQUErRDtZQUMvRCxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsb0NBQW9DLENBQUMsWUFBWSxDQUFDO2dCQUMvRyxRQUFRLEVBQUUsNENBQTRDO2dCQUN0RCxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsSUFBSSxFQUFFLGNBQWM7YUFDcEIsQ0FBQyxDQUFDLENBQUM7WUFFSix5REFBeUQ7WUFDekQsd0RBQXdEO1lBQ3hELHdEQUF3RDtZQUV4RCxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUNsQyxJQUFJLE1BQU0sRUFBRSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsa0NBQWtDLE1BQU0sQ0FBQyxJQUFJLGFBQWEsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3ZGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLCtDQUErQyxNQUFNLEVBQUUsSUFBSSxhQUFhLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQyxDQUFDO2dCQUNoSCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFUCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0NBQ0QifQ==