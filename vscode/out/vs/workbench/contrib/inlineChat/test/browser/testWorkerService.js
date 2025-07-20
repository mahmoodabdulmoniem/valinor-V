var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { mock } from '../../../../../base/test/common/mock.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { assertType } from '../../../../../base/common/types.js';
import { EditorWorker } from '../../../../../editor/common/services/editorWebWorker.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
import { MovedText } from '../../../../../editor/common/diff/linesDiffComputer.js';
import { LineRangeMapping, DetailedLineRangeMapping, RangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { disposableTimeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
let TestWorkerService = class TestWorkerService extends mock() {
    constructor(_modelService) {
        super();
        this._modelService = _modelService;
        this._store = new DisposableStore();
        this._worker = this._store.add(new EditorWorker());
    }
    dispose() {
        this._store.dispose();
    }
    async computeMoreMinimalEdits(resource, edits, pretty) {
        return undefined;
    }
    async computeDiff(original, modified, options, algorithm) {
        await new Promise(resolve => disposableTimeout(() => resolve(), 0, this._store));
        if (this._store.isDisposed) {
            return null;
        }
        const originalModel = this._modelService.getModel(original);
        const modifiedModel = this._modelService.getModel(modified);
        assertType(originalModel);
        assertType(modifiedModel);
        this._worker.$acceptNewModel({
            url: originalModel.uri.toString(),
            versionId: originalModel.getVersionId(),
            lines: originalModel.getLinesContent(),
            EOL: originalModel.getEOL(),
        });
        this._worker.$acceptNewModel({
            url: modifiedModel.uri.toString(),
            versionId: modifiedModel.getVersionId(),
            lines: modifiedModel.getLinesContent(),
            EOL: modifiedModel.getEOL(),
        });
        const result = await this._worker.$computeDiff(originalModel.uri.toString(), modifiedModel.uri.toString(), options, algorithm);
        if (!result) {
            return result;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map(m => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4])))
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), c[4]?.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7])))));
        }
    }
};
TestWorkerService = __decorate([
    __param(0, IModelService)
], TestWorkerService);
export { TestWorkerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFdvcmtlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL3Rlc3RXb3JrZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUtBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUdqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0gsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBR2hGLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsSUFBSSxFQUF3QjtJQUtsRSxZQUEyQixhQUE2QztRQUN2RSxLQUFLLEVBQUUsQ0FBQztRQURtQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUh2RCxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMvQixZQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLEVB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