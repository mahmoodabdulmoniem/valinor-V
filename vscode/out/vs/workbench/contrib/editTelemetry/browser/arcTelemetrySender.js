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
import { sumBy } from '../../../../base/common/arrays.js';
import { TimeoutTimer } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { runOnChange } from '../../../../base/common/observable.js';
import { LineEdit } from '../../../../editor/common/core/edits/lineEdit.js';
import { AnnotatedStringEdit, BaseStringEdit } from '../../../../editor/common/core/edits/stringEdit.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ArcTracker } from './arcTracker.js';
import { createDocWithJustReason } from './documentWithAnnotatedEdits.js';
let InlineEditArcTelemetrySender = class InlineEditArcTelemetrySender extends Disposable {
    constructor(docWithAnnotatedEdits, scmRepoBridge, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._register(runOnChange(docWithAnnotatedEdits.value, (_val, _prev, changes) => {
            const edit = AnnotatedStringEdit.compose(changes.map(c => c.edit));
            if (!edit.replacements.some(r => r.data.editReason.metadata.source === 'inlineCompletionAccept')) {
                return;
            }
            if (!edit.replacements.every(r => r.data.editReason.metadata.source === 'inlineCompletionAccept')) {
                onUnexpectedError(new Error('ArcTelemetrySender: Not all edits are inline completion accept edits!'));
                return;
            }
            if (edit.replacements[0].data.editReason.metadata.source !== 'inlineCompletionAccept') {
                return;
            }
            const data = edit.replacements[0].data.editReason.metadata;
            const docWithJustReason = createDocWithJustReason(docWithAnnotatedEdits, this._store);
            const reporter = this._instantiationService.createInstance(ArcTelemetryReporter, [0, 30, 120, 300, 600, 900].map(s => s * 1000), _prev, docWithJustReason, scmRepoBridge, edit, res => {
                res.telemetryService.publicLog2('editTelemetry.reportInlineEditArc', {
                    extensionId: data.$extensionId ?? '',
                    extensionVersion: data.$extensionVersion ?? '',
                    opportunityId: data.$$requestUuid ?? 'unknown',
                    didBranchChange: res.didBranchChange ? 1 : 0,
                    timeDelayMs: res.timeDelayMs,
                    arc: res.arc,
                    originalCharCount: res.originalCharCount,
                    originalLineCount: res.originalLineCount,
                    currentLineCount: res.currentLineCount,
                    originalDeletedLineCount: res.originalDeletedLineCount,
                    currentDeletedLineCount: res.currentDeletedLineCount,
                });
            });
            this._register(toDisposable(() => {
                reporter.cancel();
            }));
        }));
    }
};
InlineEditArcTelemetrySender = __decorate([
    __param(2, IInstantiationService)
], InlineEditArcTelemetrySender);
export { InlineEditArcTelemetrySender };
let ChatArcTelemetrySender = class ChatArcTelemetrySender extends Disposable {
    constructor(docWithAnnotatedEdits, scmRepoBridge, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._register(runOnChange(docWithAnnotatedEdits.value, (_val, _prev, changes) => {
            const edit = AnnotatedStringEdit.compose(changes.map(c => c.edit));
            const supportedSource = new Set(['Chat.applyEdits']);
            if (!edit.replacements.some(r => supportedSource.has(r.data.editReason.metadata.source))) {
                return;
            }
            if (!edit.replacements.every(r => supportedSource.has(r.data.editReason.metadata.source))) {
                onUnexpectedError(new Error(`ArcTelemetrySender: Not all edits are ${edit.replacements[0].data.editReason.metadata.source}!`));
                return;
            }
            const data = edit.replacements[0].data.editReason;
            const docWithJustReason = createDocWithJustReason(docWithAnnotatedEdits, this._store);
            const reporter = this._instantiationService.createInstance(ArcTelemetryReporter, [0, 60, 300].map(s => s * 1000), _prev, docWithJustReason, scmRepoBridge, edit, res => {
                res.telemetryService.publicLog2('editTelemetry.reportEditArc', {
                    sourceKeyCleaned: data.toKey(Number.MAX_SAFE_INTEGER, {
                        $extensionId: false,
                        $extensionVersion: false,
                        $$requestUuid: false,
                        $$sessionId: false,
                        $$requestId: false,
                        $modelId: false,
                    }),
                    extensionId: data.props.$extensionId,
                    extensionVersion: data.props.$extensionVersion,
                    opportunityId: data.props.$$requestUuid,
                    sessionId: data.props.$$sessionId,
                    requestId: data.props.$$requestId,
                    modelId: data.props.$modelId,
                    didBranchChange: res.didBranchChange ? 1 : 0,
                    timeDelayMs: res.timeDelayMs,
                    arc: res.arc,
                    originalCharCount: res.originalCharCount,
                    originalLineCount: res.originalLineCount,
                    currentLineCount: res.currentLineCount,
                    originalDeletedLineCount: res.originalDeletedLineCount,
                });
            });
            this._register(toDisposable(() => {
                reporter.cancel();
            }));
        }));
    }
};
ChatArcTelemetrySender = __decorate([
    __param(2, IInstantiationService)
], ChatArcTelemetrySender);
export { ChatArcTelemetrySender };
let ArcTelemetryReporter = class ArcTelemetryReporter {
    constructor(_timesMs, _documentValueBeforeTrackedEdit, _document, 
    // _markedEdits -> document.value
    _gitRepo, _trackedEdit, _sendTelemetryEvent, _telemetryService) {
        this._timesMs = _timesMs;
        this._documentValueBeforeTrackedEdit = _documentValueBeforeTrackedEdit;
        this._document = _document;
        this._gitRepo = _gitRepo;
        this._trackedEdit = _trackedEdit;
        this._sendTelemetryEvent = _sendTelemetryEvent;
        this._telemetryService = _telemetryService;
        this._store = new DisposableStore();
        this._arcTracker = new ArcTracker(this._documentValueBeforeTrackedEdit, this._trackedEdit);
        this._store.add(runOnChange(this._document.value, (_val, _prevVal, changes) => {
            const edit = BaseStringEdit.composeOrUndefined(changes.map(c => c.edit));
            if (edit) {
                this._arcTracker.handleEdits(edit);
            }
        }));
        this._initialLineCounts = this._getLineCountInfo();
        this._initialBranchName = this._gitRepo?.headBranchNameObs.get();
        for (let i = 0; i < this._timesMs.length; i++) {
            const timeMs = this._timesMs[i];
            if (timeMs <= 0) {
                this._report(timeMs);
            }
            else {
                this._reportAfter(timeMs, i === this._timesMs.length - 1 ? () => {
                    this._store.dispose();
                } : undefined);
            }
        }
    }
    _getLineCountInfo() {
        const e = this._arcTracker.getTrackedEdit();
        const le = LineEdit.fromEdit(e, this._documentValueBeforeTrackedEdit);
        const deletedLineCount = sumBy(le.replacements, r => r.lineRange.length);
        const insertedLineCount = sumBy(le.getNewLineRanges(), r => r.length);
        return {
            deletedLineCounts: deletedLineCount,
            insertedLineCounts: insertedLineCount,
        };
    }
    _reportAfter(timeoutMs, cb) {
        const timer = new TimeoutTimer(() => {
            this._report(timeoutMs);
            timer.dispose();
            if (cb) {
                cb();
            }
        }, timeoutMs);
        this._store.add(timer);
    }
    _report(timeMs) {
        const currentBranch = this._gitRepo?.headBranchNameObs.get();
        const didBranchChange = currentBranch !== this._initialBranchName;
        const currentLineCounts = this._getLineCountInfo();
        this._sendTelemetryEvent({
            telemetryService: this._telemetryService,
            timeDelayMs: timeMs,
            didBranchChange,
            arc: this._arcTracker.getAcceptedRestrainedCharactersCount(),
            originalCharCount: this._arcTracker.getOriginalCharacterCount(),
            currentLineCount: currentLineCounts.insertedLineCounts,
            currentDeletedLineCount: currentLineCounts.deletedLineCounts,
            originalLineCount: this._initialLineCounts.insertedLineCounts,
            originalDeletedLineCount: this._initialLineCounts.deletedLineCounts,
        });
    }
    cancel() {
        this._store.dispose();
    }
};
ArcTelemetryReporter = __decorate([
    __param(6, ITelemetryService)
], ArcTelemetryReporter);
export { ArcTelemetryReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjVGVsZW1ldHJ5U2VuZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0VGVsZW1ldHJ5L2Jyb3dzZXIvYXJjVGVsZW1ldHJ5U2VuZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLFdBQVcsRUFBeUIsTUFBTSx1Q0FBdUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXpHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3QyxPQUFPLEVBQStDLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHaEgsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO0lBQzNELFlBQ0MscUJBQWtFLEVBQ2xFLGFBQXdDLEVBQ0EscUJBQTRDO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBRmdDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFJcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUNoRixNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRW5FLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssd0JBQXdCLENBQUMsRUFBRSxDQUFDO2dCQUNsRyxPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssd0JBQXdCLENBQUMsRUFBRSxDQUFDO2dCQUNuRyxpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyx1RUFBdUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RHLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyx3QkFBd0IsRUFBRSxDQUFDO2dCQUN2RixPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUM7WUFFM0QsTUFBTSxpQkFBaUIsR0FBRyx1QkFBdUIsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNyTCxHQUFHLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQTRCNUIsbUNBQW1DLEVBQUU7b0JBQ3ZDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxJQUFJLEVBQUU7b0JBQ3BDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxFQUFFO29CQUM5QyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsSUFBSSxTQUFTO29CQUM5QyxlQUFlLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVc7b0JBQzVCLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztvQkFDWixpQkFBaUIsRUFBRSxHQUFHLENBQUMsaUJBQWlCO29CQUN4QyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsaUJBQWlCO29CQUN4QyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsZ0JBQWdCO29CQUN0Qyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsd0JBQXdCO29CQUN0RCx1QkFBdUIsRUFBRSxHQUFHLENBQUMsdUJBQXVCO2lCQUNwRCxDQUFDLENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtnQkFDaEMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNELENBQUE7QUF6RVksNEJBQTRCO0lBSXRDLFdBQUEscUJBQXFCLENBQUE7R0FKWCw0QkFBNEIsQ0F5RXhDOztBQUVNLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQUNyRCxZQUNDLHFCQUFrRSxFQUNsRSxhQUF3QyxFQUNBLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUZnQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSXBGLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDaEYsTUFBTSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUVuRSxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUVyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFGLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMzRixpQkFBaUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9ILE9BQU87WUFDUixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1lBRWxELE1BQU0saUJBQWlCLEdBQUcsdUJBQXVCLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDdEssR0FBRyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FvQzVCLDZCQUE2QixFQUFFO29CQUNqQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRTt3QkFDckQsWUFBWSxFQUFFLEtBQUs7d0JBQ25CLGlCQUFpQixFQUFFLEtBQUs7d0JBQ3hCLGFBQWEsRUFBRSxLQUFLO3dCQUNwQixXQUFXLEVBQUUsS0FBSzt3QkFDbEIsV0FBVyxFQUFFLEtBQUs7d0JBQ2xCLFFBQVEsRUFBRSxLQUFLO3FCQUNmLENBQUM7b0JBQ0YsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWTtvQkFDcEMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUI7b0JBQzlDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWE7b0JBQ3ZDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVc7b0JBQ2pDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVc7b0JBQ2pDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVE7b0JBRTVCLGVBQWUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVDLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVztvQkFDNUIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO29CQUNaLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxpQkFBaUI7b0JBRXhDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxpQkFBaUI7b0JBQ3hDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxnQkFBZ0I7b0JBQ3RDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyx3QkFBd0I7aUJBQ3RELENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUNoQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QsQ0FBQTtBQTVGWSxzQkFBc0I7SUFJaEMsV0FBQSxxQkFBcUIsQ0FBQTtHQUpYLHNCQUFzQixDQTRGbEM7O0FBZ0JNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBT2hDLFlBQ2tCLFFBQWtCLEVBQ2xCLCtCQUEyQyxFQUMzQyxTQUFpRjtJQUNsRyxpQ0FBaUM7SUFDaEIsUUFBbUMsRUFDbkMsWUFBNEIsRUFDNUIsbUJBQXFELEVBRW5ELGlCQUFxRDtRQVJ2RCxhQUFRLEdBQVIsUUFBUSxDQUFVO1FBQ2xCLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBWTtRQUMzQyxjQUFTLEdBQVQsU0FBUyxDQUF3RTtRQUVqRixhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQUNuQyxpQkFBWSxHQUFaLFlBQVksQ0FBZ0I7UUFDNUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFrQztRQUVsQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBZnhELFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBaUIvQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFM0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUM3RSxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFbkQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFakUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoQyxJQUFJLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFO29CQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2hCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pFLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLE9BQU87WUFDTixpQkFBaUIsRUFBRSxnQkFBZ0I7WUFDbkMsa0JBQWtCLEVBQUUsaUJBQWlCO1NBQ3JDLENBQUM7SUFDSCxDQUFDO0lBRU8sWUFBWSxDQUFDLFNBQWlCLEVBQUUsRUFBZTtRQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDUixFQUFFLEVBQUUsQ0FBQztZQUNOLENBQUM7UUFDRixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRU8sT0FBTyxDQUFDLE1BQWM7UUFDN0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM3RCxNQUFNLGVBQWUsR0FBRyxhQUFhLEtBQUssSUFBSSxDQUFDLGtCQUFrQixDQUFDO1FBQ2xFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFbkQsSUFBSSxDQUFDLG1CQUFtQixDQUFDO1lBQ3hCLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDeEMsV0FBVyxFQUFFLE1BQU07WUFDbkIsZUFBZTtZQUNmLEdBQUcsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLG9DQUFvQyxFQUFFO1lBQzVELGlCQUFpQixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUU7WUFFL0QsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsa0JBQWtCO1lBQ3RELHVCQUF1QixFQUFFLGlCQUFpQixDQUFDLGlCQUFpQjtZQUM1RCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCO1lBQzdELHdCQUF3QixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUI7U0FDbkUsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLE1BQU07UUFDWixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCxDQUFBO0FBeEZZLG9CQUFvQjtJQWdCOUIsV0FBQSxpQkFBaUIsQ0FBQTtHQWhCUCxvQkFBb0IsQ0F3RmhDIn0=