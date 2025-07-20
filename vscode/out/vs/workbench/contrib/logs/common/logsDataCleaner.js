/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename, dirname } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { Promises } from '../../../../base/common/async.js';
let LogsDataCleaner = class LogsDataCleaner extends Disposable {
    constructor(environmentService, fileService, lifecycleService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.lifecycleService = lifecycleService;
        this.cleanUpOldLogsSoon();
    }
    cleanUpOldLogsSoon() {
        let handle = setTimeout(async () => {
            handle = undefined;
            const stat = await this.fileService.resolve(dirname(this.environmentService.logsHome));
            if (stat.children) {
                const currentLog = basename(this.environmentService.logsHome);
                const allSessions = stat.children.filter(stat => stat.isDirectory && /^\d{8}T\d{6}$/.test(stat.name));
                const oldSessions = allSessions.sort().filter((d, i) => d.name !== currentLog);
                const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 49));
                Promises.settled(toDelete.map(stat => this.fileService.del(stat.resource, { recursive: true })));
            }
        }, 10 * 1000);
        this.lifecycleService.onWillShutdown(() => {
            if (handle) {
                clearTimeout(handle);
                handle = undefined;
            }
        });
    }
};
LogsDataCleaner = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILifecycleService)
], LogsDataCleaner);
export { LogsDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nc0RhdGFDbGVhbmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2dzL2NvbW1vbi9sb2dzRGF0YUNsZWFuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVyRCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUFFOUMsWUFDZ0Qsa0JBQWdELEVBQ2hFLFdBQXlCLEVBQ3BCLGdCQUFtQztRQUV2RSxLQUFLLEVBQUUsQ0FBQztRQUp1Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQThCO1FBQ2hFLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3BCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFHdkUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLE1BQU0sR0FBd0IsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3ZELE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDbkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdkYsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzlELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUN0RyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQztnQkFDL0UsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM1RSxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xHLENBQUM7UUFDRixDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUU7WUFDekMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JCLE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDcEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUE5QlksZUFBZTtJQUd6QixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxpQkFBaUIsQ0FBQTtHQUxQLGVBQWUsQ0E4QjNCIn0=