var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MainThreadChatCodemapper_1;
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { TextEdit } from '../../../editor/common/languages.js';
import { ICodeMapperService } from '../../contrib/chat/common/chatCodeMapperService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
let MainThreadChatCodemapper = class MainThreadChatCodemapper extends Disposable {
    static { MainThreadChatCodemapper_1 = this; }
    static { this._requestHandlePool = 0; }
    constructor(extHostContext, codeMapperService) {
        super();
        this.codeMapperService = codeMapperService;
        this.providers = this._register(new DisposableMap());
        this._responseMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCodeMapper);
    }
    $registerCodeMapperProvider(handle, displayName) {
        const impl = {
            displayName,
            mapCode: async (uiRequest, response, token) => {
                const requestId = String(MainThreadChatCodemapper_1._requestHandlePool++);
                this._responseMap.set(requestId, response);
                const extHostRequest = {
                    requestId,
                    codeBlocks: uiRequest.codeBlocks,
                    chatRequestId: uiRequest.chatRequestId,
                    chatRequestModel: uiRequest.chatRequestModel,
                    chatSessionId: uiRequest.chatSessionId,
                    location: uiRequest.location
                };
                try {
                    return await this._proxy.$mapCode(handle, extHostRequest, token).then((result) => result ?? undefined);
                }
                finally {
                    this._responseMap.delete(requestId);
                }
            }
        };
        const disposable = this.codeMapperService.registerCodeMapperProvider(handle, impl);
        this.providers.set(handle, disposable);
    }
    $unregisterCodeMapperProvider(handle) {
        this.providers.deleteAndDispose(handle);
    }
    $handleProgress(requestId, data) {
        const response = this._responseMap.get(requestId);
        if (response) {
            const edits = data.edits;
            const resource = URI.revive(data.uri);
            if (!edits.length) {
                response.textEdit(resource, []);
            }
            else if (edits.every(TextEdit.isTextEdit)) {
                response.textEdit(resource, edits);
            }
            else {
                response.notebookEdit(resource, edits.map(NotebookDto.fromCellEditOperationDto));
            }
        }
        return Promise.resolve();
    }
};
MainThreadChatCodemapper = MainThreadChatCodemapper_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCodeMapper),
    __param(1, ICodeMapperService)
], MainThreadChatCodemapper);
export { MainThreadChatCodemapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRDb2RlTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENoYXRDb2RlTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFLQSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFnRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQTBCLGNBQWMsRUFBaUQsV0FBVyxFQUE2QixNQUFNLCtCQUErQixDQUFDO0FBQzlLLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUdsRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O2FBSXhDLHVCQUFrQixHQUFXLENBQUMsQUFBWixDQUFhO0lBRzlDLFlBQ0MsY0FBK0IsRUFDWCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFGNkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQVBuRSxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBdUIsQ0FBQyxDQUFDO1FBR3JFLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7UUFPN0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3pFLENB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