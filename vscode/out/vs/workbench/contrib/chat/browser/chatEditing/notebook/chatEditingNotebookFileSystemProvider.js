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
var ChatEditingNotebookFileSystemProvider_1;
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { FileType, IFileService } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
import { IChatEditingService } from '../../../common/chatEditingService.js';
import { ChatEditingNotebookSnapshotScheme, deserializeSnapshot } from './chatEditingModifiedNotebookSnapshot.js';
let ChatEditingNotebookFileSystemProviderContrib = class ChatEditingNotebookFileSystemProviderContrib extends Disposable {
    static { this.ID = 'chatEditingNotebookFileSystemProviderContribution'; }
    constructor(fileService, instantiationService) {
        super();
        this.fileService = fileService;
        const fileSystemProvider = instantiationService.createInstance(ChatEditingNotebookFileSystemProvider);
        this._register(this.fileService.registerProvider(ChatEditingNotebookSnapshotScheme, fileSystemProvider));
    }
};
ChatEditingNotebookFileSystemProviderContrib = __decorate([
    __param(0, IFileService),
    __param(1, IInstantiationService)
], ChatEditingNotebookFileSystemProviderContrib);
export { ChatEditingNotebookFileSystemProviderContrib };
let ChatEditingNotebookFileSystemProvider = class ChatEditingNotebookFileSystemProvider {
    static { ChatEditingNotebookFileSystemProvider_1 = this; }
    static { this.registeredFiles = new ResourceMap(); }
    static registerFile(resource, buffer) {
        ChatEditingNotebookFileSystemProvider_1.registeredFiles.set(resource, buffer);
        return {
            dispose() {
                if (ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource) === buffer) {
                    ChatEditingNotebookFileSystemProvider_1.registeredFiles.delete(resource);
                }
            }
        };
    }
    constructor(_chatEditingService, notebookService) {
        this._chatEditingService = _chatEditingService;
        this.notebookService = notebookService;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */ | 16384 /* FileSystemProviderCapabilities.FileAtomicRead */ | 2 /* FileSystemProviderCapabilities.FileReadWrite */;
        this.onDidChangeCapabilities = Event.None;
        this.onDidChangeFile = Event.None;
    }
    watch(_resource, _opts) {
        return Disposable.None;
    }
    async stat(_resource) {
        return {
            type: FileType.File,
            ctime: 0,
            mtime: 0,
            size: 0
        };
    }
    mkdir(_resource) {
        throw new Error('Method not implemented1.');
    }
    readdir(_resource) {
        throw new Error('Method not implemented2.');
    }
    delete(_resource, _opts) {
        throw new Error('Method not implemented3.');
    }
    rename(_from, _to, _opts) {
        throw new Error('Method not implemented4.');
    }
    copy(_from, _to, _opts) {
        throw new Error('Method not implemented5.');
    }
    async readFile(resource) {
        const buffer = ChatEditingNotebookFileSystemProvider_1.registeredFiles.get(resource);
        if (buffer) {
            return buffer.buffer;
        }
        const queryData = JSON.parse(resource.query);
        if (!queryData.viewType) {
            throw new Error('File not found, viewType not found');
        }
        const session = this._chatEditingService.getEditingSession(queryData.sessionId);
        if (!session || !queryData.requestId) {
            throw new Error('File not found, session not found');
        }
        const snapshotEntry = session.getSnapshot(queryData.requestId, queryData.undoStop || undefined, resource);
        if (!snapshotEntry) {
            throw new Error('File not found, snapshot not found');
        }
        const { data } = deserializeSnapshot(snapshotEntry.current);
        const { serializer } = await this.notebookService.withNotebookDataProvider(queryData.viewType);
        return serializer.notebookToData(data).then(s => s.buffer);
    }
    writeFile(__resource, _content, _opts) {
        throw new Error('Method not implemented7.');
    }
    readFileStream(__resource, _opts, _token) {
        throw new Error('Method not implemented8.');
    }
    open(__resource, _opts) {
        throw new Error('Method not implemented9.');
    }
    close(_fd) {
        throw new Error('Method not implemented10.');
    }
    read(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented11.');
    }
    write(_fd, _pos, _data, _offset, _length) {
        throw new Error('Method not implemented12.');
    }
    cloneFile(_from, __to) {
        throw new Error('Method not implemented13.');
    }
};
ChatEditingNotebookFileSystemProvider = ChatEditingNotebookFileSystemProvider_1 = __decorate([
    __param(0, IChatEditingService),
    __param(1, INotebookService)
], ChatEditingNotebookFileSystemProvider);
export { ChatEditingNotebookFileSystemProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0ZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR25FLE9BQU8sRUFBa0MsUUFBUSxFQUFvRyxZQUFZLEVBQWdFLE1BQU0sa0RBQWtELENBQUM7QUFDMVIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHM0csSUFBTSw0Q0FBNEMsR0FBbEQsTUFBTSw0Q0FBNkMsU0FBUSxVQUFVO2FBQ3BFLE9BQUUsR0FBRyxtREFBbUQsQUFBdEQsQ0FBdUQ7SUFDaEUsWUFDZ0MsV0FBeUIsRUFDakMsb0JBQTJDO1FBR2xFLEtBQUssRUFBRSxDQUFDO1FBSnVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBS3hELE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDdEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQUMxRyxDQUFDOztBQVZXLDRDQUE0QztJQUd0RCxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEscUJBQXFCLENBQUE7R0FKWCw0Q0FBNEMsQ0FXeEQ7O0FBSU0sSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7O2FBQ2xDLG9CQUFlLEdBQUcsSUFBSSxXQUFXLEVBQVksQUFBOUIsQ0FBK0I7SUFFdEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFhLEVBQUUsTUFBZ0I7UUFDekQsdUNBQXFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUUsT0FBTztZQUNOLE9BQU87Z0JBQ04sSUFBSSx1Q0FBcUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUNwRix1Q0FBcUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN4RSxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsWUFDc0IsbUJBQXlELEVBQzVELGVBQWtEO1FBRDlCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDM0Msb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBZHJELGlCQUFZLEdBQW1DLDhHQUF1Rix1REFBK0MsQ0FBQztRQWU3TCw0QkFBdUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3JDLG9CQUFlLEdBQWtDLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFGSSxDQUFDO0lBRzFFLEtBQUssQ0FBQyxTQUFjLEVBQUUsS0FBb0I7UUFDekMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQWM7UUFDeEIsT0FBTztZQUNOLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSTtZQUNuQixLQUFLLEVBQUUsQ0FBQztZQUNSLEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxFQUFFLENBQUM7U0FDUCxDQUFDO0lBQ0gsQ0FBQztJQUNELEtBQUssQ0FBQyxTQUFjO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLFNBQWM7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFDRCxNQUFNLENBQUMsU0FBYyxFQUFFLEtBQXlCO1FBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsTUFBTSxDQUFDLEtBQVUsRUFBRSxHQUFRLEVBQUUsS0FBNEI7UUFDeEQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFDRCxJQUFJLENBQUUsS0FBVSxFQUFFLEdBQVEsRUFBRSxLQUE0QjtRQUN2RCxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUNELEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBYTtRQUMzQixNQUFNLE1BQU0sR0FBRyx1Q0FBcUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ25GLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDdEIsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBZ0QsQ0FBQztRQUM1RixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxRQUFRLElBQUksU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0YsT0FBTyxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRUQsU0FBUyxDQUFFLFVBQWUsRUFBRSxRQUFvQixFQUFFLEtBQXdCO1FBQ3pFLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsY0FBYyxDQUFFLFVBQWUsRUFBRSxLQUE2QixFQUFFLE1BQXlCO1FBQ3hGLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQ0QsSUFBSSxDQUFFLFVBQWUsRUFBRSxLQUF1QjtRQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUNELEtBQUssQ0FBRSxHQUFXO1FBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBQ0QsSUFBSSxDQUFFLEdBQVcsRUFBRSxJQUFZLEVBQUUsS0FBaUIsRUFBRSxPQUFlLEVBQUUsT0FBZTtRQUNuRixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUNELEtBQUssQ0FBRSxHQUFXLEVBQUUsSUFBWSxFQUFFLEtBQWlCLEVBQUUsT0FBZSxFQUFFLE9BQWU7UUFDcEYsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRCxTQUFTLENBQUUsS0FBVSxFQUFFLElBQVM7UUFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQzlDLENBQUM7O0FBeEZXLHFDQUFxQztJQWUvQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZ0JBQWdCLENBQUE7R0FoQk4scUNBQXFDLENBeUZqRCJ9