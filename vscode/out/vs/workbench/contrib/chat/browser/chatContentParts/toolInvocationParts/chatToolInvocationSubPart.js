/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
export class BaseChatToolInvocationSubPart extends Disposable {
    static { this.idPool = 0; }
    constructor(toolInvocation) {
        super();
        this._onNeedsRerender = this._register(new Emitter());
        this.onNeedsRerender = this._onNeedsRerender.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.codeblocksPartId = 'tool-' + (BaseChatToolInvocationSubPart.idPool++);
        if (toolInvocation.kind === 'toolInvocation' && !toolInvocation.isComplete) {
            toolInvocation.isCompletePromise.then(() => this._onNeedsRerender.fire());
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uU3ViUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0VG9vbEludm9jYXRpb25TdWJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFJeEUsTUFBTSxPQUFnQiw2QkFBOEIsU0FBUSxVQUFVO2FBQ3BELFdBQU0sR0FBRyxDQUFDLEFBQUosQ0FBSztJQWE1QixZQUNDLGNBQW1FO1FBRW5FLEtBQUssRUFBRSxDQUFDO1FBYkMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDakQsb0JBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO1FBRXBELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ25ELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFJbEQscUJBQWdCLEdBQUcsT0FBTyxHQUFHLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQU9yRixJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDNUUsY0FBYyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO0lBQ0YsQ0FBQyJ9