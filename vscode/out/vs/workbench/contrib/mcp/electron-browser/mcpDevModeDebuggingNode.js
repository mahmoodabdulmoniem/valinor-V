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
import { timeout } from '../../../../base/common/async.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IDebugService } from '../../debug/common/debug.js';
import { McpDevModeDebugging } from '../common/mcpDevMode.js';
let McpDevModeDebuggingNode = class McpDevModeDebuggingNode extends McpDevModeDebugging {
    constructor(debugService, commandService, _nativeHostService) {
        super(debugService, commandService);
        this._nativeHostService = _nativeHostService;
    }
    async ensureListeningOnPort(port) {
        const deadline = Date.now() + 30_000;
        while (await this._nativeHostService.isPortFree(port) && Date.now() < deadline) {
            await timeout(50);
        }
    }
    getDebugPort() {
        return this._nativeHostService.findFreePort(5000, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */, 2048 /* skip 2048 ports between attempts */);
    }
};
McpDevModeDebuggingNode = __decorate([
    __param(0, IDebugService),
    __param(1, ICommandService),
    __param(2, INativeHostService)
], McpDevModeDebuggingNode);
export { McpDevModeDebuggingNode };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGV2TW9kZURlYnVnZ2luZ05vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9lbGVjdHJvbi1icm93c2VyL21jcERldk1vZGVEZWJ1Z2dpbmdOb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXZELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsbUJBQW1CO0lBQy9ELFlBQ2dCLFlBQTJCLEVBQ3pCLGNBQStCLEVBQ1gsa0JBQXNDO1FBRTNFLEtBQUssQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFGQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO0lBRzVFLENBQUM7SUFFa0IsS0FBSyxDQUFDLHFCQUFxQixDQUFDLElBQVk7UUFDMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUNyQyxPQUFPLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsUUFBUSxFQUFFLENBQUM7WUFDaEYsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFa0IsWUFBWTtRQUM5QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDdkosQ0FBQztDQUNELENBQUE7QUFuQlksdUJBQXVCO0lBRWpDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0dBSlIsdUJBQXVCLENBbUJuQyJ9