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
import { localize } from '../../../../nls.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
var Constants;
(function (Constants) {
    Constants[Constants["SamplingRetentionDays"] = 7] = "SamplingRetentionDays";
    Constants[Constants["MsPerDay"] = 86400000] = "MsPerDay";
    Constants[Constants["SamplingRetentionMs"] = 604800000] = "SamplingRetentionMs";
    Constants[Constants["SamplingLastNMessage"] = 30] = "SamplingLastNMessage";
})(Constants || (Constants = {}));
const samplingMemento = observableMemento({
    defaultValue: new Map(),
    key: 'mcp.sampling.logs',
    toStorage: v => JSON.stringify(Array.from(v.entries())),
    fromStorage: v => new Map(JSON.parse(v)),
});
let McpSamplingLog = class McpSamplingLog extends Disposable {
    constructor(_storageService) {
        super();
        this._storageService = _storageService;
        this._logs = {};
    }
    has(server) {
        const storage = this._getLogStorageForServer(server);
        return storage.get().has(server.definition.id);
    }
    get(server) {
        const storage = this._getLogStorageForServer(server);
        return storage.get().get(server.definition.id);
    }
    getAsText(server) {
        const storage = this._getLogStorageForServer(server);
        const record = storage.get().get(server.definition.id);
        if (!record) {
            return '';
        }
        const parts = [];
        const total = record.bins.reduce((sum, value) => sum + value, 0);
        parts.push(localize('mcp.sampling.rpd', '{0} total requests in the last 7 days.', total));
        parts.push(this._formatRecentRequests(record));
        return parts.join('\n');
    }
    _formatRecentRequests(data) {
        if (!data.lastReqs.length) {
            return '\nNo recent requests.';
        }
        const result = [];
        for (let i = 0; i < data.lastReqs.length; i++) {
            const { request, response, at, model } = data.lastReqs[i];
            result.push(`\n[${i + 1}] ${new Date(at).toISOString()} ${model}`);
            result.push('  Request:');
            for (const msg of request) {
                const role = msg.role.padEnd(9);
                let content = '';
                if ('text' in msg.content && msg.content.type === 'text') {
                    content = msg.content.text;
                }
                else if ('data' in msg.content) {
                    content = `[${msg.content.type} data: ${msg.content.mimeType}]`;
                }
                result.push(`    ${role}: ${content}`);
            }
            result.push('  Response:');
            result.push(`    ${response}`);
        }
        return result.join('\n');
    }
    async add(server, request, response, model) {
        const now = Date.now();
        const utcOrdinal = Math.floor(now / 86400000 /* Constants.MsPerDay */);
        const storage = this._getLogStorageForServer(server);
        const next = new Map(storage.get());
        let record = next.get(server.definition.id);
        if (!record) {
            record = {
                head: utcOrdinal,
                bins: Array.from({ length: 7 /* Constants.SamplingRetentionDays */ }, () => 0),
                lastReqs: [],
            };
        }
        else {
            // Shift bins back by daysSinceHead, dropping old days
            for (let i = 0; i < (utcOrdinal - record.head) && i < 7 /* Constants.SamplingRetentionDays */; i++) {
                record.bins.pop();
                record.bins.unshift(0);
            }
            record.head = utcOrdinal;
        }
        // Increment the current day's bin (head)
        record.bins[0]++;
        record.lastReqs.unshift({ request, response, at: now, model });
        while (record.lastReqs.length > 30 /* Constants.SamplingLastNMessage */) {
            record.lastReqs.pop();
        }
        next.set(server.definition.id, record);
        storage.set(next, undefined);
    }
    _getLogStorageForServer(server) {
        const scope = server.readDefinitions().get().collection?.scope ?? 1 /* StorageScope.WORKSPACE */;
        return this._logs[scope] ??= this._register(samplingMemento(scope, 1 /* StorageTarget.MACHINE */, this._storageService));
    }
};
McpSamplingLog = __decorate([
    __param(0, IStorageService)
], McpSamplingLog);
export { McpSamplingLog };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdMb2cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2FtcGxpbmdMb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUk5RyxJQUFXLFNBS1Y7QUFMRCxXQUFXLFNBQVM7SUFDbkIsMkVBQXlCLENBQUE7SUFDekIsd0RBQThCLENBQUE7SUFDOUIsK0VBQXNELENBQUE7SUFDdEQsMEVBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQUxVLFNBQVMsS0FBVCxTQUFTLFFBS25CO0FBV0QsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQTJDO0lBQ25GLFlBQVksRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN2QixHQUFHLEVBQUUsbUJBQW1CO0lBQ3hCLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUN2RCxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3hDLENBQUMsQ0FBQztBQUVJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBRzdDLFlBQ2tCLGVBQWlEO1FB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