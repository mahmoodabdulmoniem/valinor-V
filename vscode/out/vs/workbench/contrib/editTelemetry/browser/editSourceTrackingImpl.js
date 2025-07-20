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
import { reverseOrder, compareBy, numberComparator, sumBy } from '../../../../base/common/arrays.js';
import { IntervalTimer, TimeoutTimer } from '../../../../base/common/async.js';
import { toDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { mapObservableArrayCached, derived, observableSignal, runOnChange, derivedObservableWithCache } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ISCMService } from '../../scm/common/scm.js';
import { ChatArcTelemetrySender, InlineEditArcTelemetrySender } from './arcTelemetrySender.js';
import { CombineStreamedChanges, createDocWithJustReason, DocumentWithSourceAnnotatedEdits, MinimizeEditsProcessor } from './documentWithAnnotatedEdits.js';
import { DocumentEditSourceTracker } from './editTracker.js';
import { sumByCategory } from './utils.js';
let EditSourceTrackingImpl = class EditSourceTrackingImpl extends Disposable {
    constructor(_workspace, _docIsVisible, _statsEnabled, _instantiationService) {
        super();
        this._workspace = _workspace;
        this._docIsVisible = _docIsVisible;
        this._statsEnabled = _statsEnabled;
        this._instantiationService = _instantiationService;
        const scmBridge = this._instantiationService.createInstance(ScmBridge);
        const states = mapObservableArrayCached(this, this._workspace.documents, (doc, store) => {
            const docIsVisible = derived(reader => this._docIsVisible(doc, reader));
            const wasEverVisible = derivedObservableWithCache(this, (reader, lastVal) => lastVal || docIsVisible.read(reader));
            return wasEverVisible.map(v => v ? [doc, store.add(this._instantiationService.createInstance(TrackedDocumentInfo, doc, docIsVisible, scmBridge, this._statsEnabled))] : undefined);
        });
        this.docsState = states.map((entries, reader) => new Map(entries.map(e => e.read(reader)).filter(isDefined)))
            .recomputeInitiallyAndOnChange(this._store);
    }
};
EditSourceTrackingImpl = __decorate([
    __param(3, IInstantiationService)
], EditSourceTrackingImpl);
export { EditSourceTrackingImpl };
let TrackedDocumentInfo = class TrackedDocumentInfo extends Disposable {
    constructor(_doc, docIsVisible, _scm, _statsEnabled, _instantiationService, _telemetryService) {
        super();
        this._doc = _doc;
        this._scm = _scm;
        this._statsEnabled = _statsEnabled;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        // Use the listener service and special events from core to annotate where an edit came from (is async)
        let processedDoc = this._store.add(new DocumentWithSourceAnnotatedEdits(_doc));
        // Combine streaming edits into one and make edit smaller
        processedDoc = this._store.add(this._instantiationService.createInstance((CombineStreamedChanges), processedDoc));
        // Remove common suffix and prefix from edits
        processedDoc = this._store.add(new MinimizeEditsProcessor(processedDoc));
        const docWithJustReason = createDocWithJustReason(processedDoc, this._store);
        const longtermResetSignal = observableSignal('resetSignal');
        let longtermReason = 'closed';
        this.longtermTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            longtermResetSignal.read(reader);
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            reader.store.add(toDisposable(() => {
                // send long term document telemetry
                if (!t.isEmpty()) {
                    this.sendTelemetry('longterm', longtermReason, t);
                }
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
        this._store.add(new IntervalTimer()).cancelAndSet(() => {
            // Reset after 10 hours
            longtermReason = '10hours';
            longtermResetSignal.trigger(undefined);
            longtermReason = 'closed';
        }, 10 * 60 * 60 * 1000);
        (async () => {
            const repo = await this._scm.getRepo(_doc.uri);
            if (this._store.isDisposed) {
                return;
            }
            // Reset on branch change or commit
            if (repo) {
                this._store.add(runOnChange(repo.headCommitHashObs, () => {
                    longtermReason = 'hashChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
                this._store.add(runOnChange(repo.headBranchNameObs, () => {
                    longtermReason = 'branchChange';
                    longtermResetSignal.trigger(undefined);
                    longtermReason = 'closed';
                }));
            }
            this._store.add(this._instantiationService.createInstance(InlineEditArcTelemetrySender, processedDoc, repo));
            this._store.add(this._instantiationService.createInstance(ChatArcTelemetrySender, processedDoc, repo));
        })();
        const resetSignal = observableSignal('resetSignal');
        this.windowedTracker = derived((reader) => {
            if (!this._statsEnabled.read(reader)) {
                return undefined;
            }
            if (!docIsVisible.read(reader)) {
                return undefined;
            }
            resetSignal.read(reader);
            reader.store.add(new TimeoutTimer(() => {
                // Reset after 5 minutes
                resetSignal.trigger(undefined);
            }, 5 * 60 * 1000));
            const t = reader.store.add(new DocumentEditSourceTracker(docWithJustReason, undefined));
            reader.store.add(toDisposable(async () => {
                // send long term document telemetry
                this.sendTelemetry('5minWindow', 'time', t);
                t.dispose();
            }));
            return t;
        }).recomputeInitiallyAndOnChange(this._store);
        this._repo = this._scm.getRepo(_doc.uri);
    }
    async sendTelemetry(mode, trigger, t) {
        const ranges = t.getTrackedRanges();
        if (ranges.length === 0) {
            return;
        }
        const data = this.getTelemetryData(ranges);
        const statsUuid = generateUuid();
        const sourceKeyToRepresentative = new Map();
        for (const r of ranges) {
            sourceKeyToRepresentative.set(r.sourceKey, r.sourceRepresentative);
        }
        const sums = sumByCategory(ranges, r => r.range.length, r => r.sourceKey);
        const entries = Object.entries(sums).filter(([key, value]) => value !== undefined);
        entries.sort(reverseOrder(compareBy(([key, value]) => value, numberComparator)));
        entries.length = mode === 'longterm' ? 30 : 10;
        for (const [key, value] of Object.entries(sums)) {
            if (value === undefined) {
                continue;
            }
            const repr = sourceKeyToRepresentative.get(key);
            const m = t.getChangedCharactersCount(key);
            this._telemetryService.publicLog2('editTelemetry.editSources.details', {
                mode,
                sourceKey: key,
                sourceKeyCleaned: repr.toKey(1, { $extensionId: false, $extensionVersion: false, $modelId: false }),
                extensionId: repr.props.$extensionId,
                extensionVersion: repr.props.$extensionVersion,
                modelId: repr.props.$modelId,
                trigger,
                languageId: this._doc.languageId.get(),
                statsUuid: statsUuid,
                modifiedCount: value,
                deltaModifiedCount: m,
                totalModifiedCount: data.totalModifiedCharactersInFinalState,
            });
        }
        const isTrackedByGit = await data.isTrackedByGit;
        this._telemetryService.publicLog2('editTelemetry.editSources.stats', {
            mode,
            languageId: this._doc.languageId.get(),
            statsUuid: statsUuid,
            nesModifiedCount: data.nesModifiedCount,
            inlineCompletionsCopilotModifiedCount: data.inlineCompletionsCopilotModifiedCount,
            inlineCompletionsNESModifiedCount: data.inlineCompletionsNESModifiedCount,
            otherAIModifiedCount: data.otherAIModifiedCount,
            unknownModifiedCount: data.unknownModifiedCount,
            userModifiedCount: data.userModifiedCount,
            ideModifiedCount: data.ideModifiedCount,
            totalModifiedCharacters: data.totalModifiedCharactersInFinalState,
            externalModifiedCount: data.externalModifiedCount,
            isTrackedByGit: isTrackedByGit ? 1 : 0,
        });
    }
    getTelemetryData(ranges) {
        const getEditCategory = (source) => {
            if (source.category === 'ai' && source.kind === 'nes') {
                return 'nes';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot') {
                return 'inlineCompletionsCopilot';
            }
            if (source.category === 'ai' && source.kind === 'completion' && source.extensionId === 'github.copilot-chat') {
                return 'inlineCompletionsNES';
            }
            if (source.category === 'ai' && source.kind === 'completion') {
                return 'inlineCompletionsOther';
            }
            if (source.category === 'ai') {
                return 'otherAI';
            }
            if (source.category === 'user') {
                return 'user';
            }
            if (source.category === 'ide') {
                return 'ide';
            }
            if (source.category === 'external') {
                return 'external';
            }
            if (source.category === 'unknown') {
                return 'unknown';
            }
            return 'unknown';
        };
        const sums = sumByCategory(ranges, r => r.range.length, r => getEditCategory(r.source));
        const totalModifiedCharactersInFinalState = sumBy(ranges, r => r.range.length);
        return {
            nesModifiedCount: sums.nes ?? 0,
            inlineCompletionsCopilotModifiedCount: sums.inlineCompletionsCopilot ?? 0,
            inlineCompletionsNESModifiedCount: sums.inlineCompletionsNES ?? 0,
            otherAIModifiedCount: sums.otherAI ?? 0,
            userModifiedCount: sums.user ?? 0,
            ideModifiedCount: sums.ide ?? 0,
            unknownModifiedCount: sums.unknown ?? 0,
            externalModifiedCount: sums.external ?? 0,
            totalModifiedCharactersInFinalState,
            languageId: this._doc.languageId.get(),
            isTrackedByGit: this._repo.then(async (repo) => !!repo && !await repo.isIgnored(this._doc.uri)),
        };
    }
};
TrackedDocumentInfo = __decorate([
    __param(4, IInstantiationService),
    __param(5, ITelemetryService)
], TrackedDocumentInfo);
let ScmBridge = class ScmBridge {
    constructor(_scmService) {
        this._scmService = _scmService;
    }
    async getRepo(uri) {
        const repo = this._scmService.getRepository(uri);
        if (!repo) {
            return undefined;
        }
        return new ScmRepoBridge(repo);
    }
};
ScmBridge = __decorate([
    __param(0, ISCMService)
], ScmBridge);
export class ScmRepoBridge {
    constructor(_repo) {
        this._repo = _repo;
        this.headBranchNameObs = derived(reader => this._repo.provider.historyProvider.read(reader)?.historyItemRef.read(reader)?.name);
        this.headCommitHashObs = derived(reader => this._repo.provider.historyProvider.read(reader)?.historyItemRef.read(reader)?.revision);
    }
    async isIgnored(uri) {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvdXJjZVRyYWNraW5nSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFRlbGVtZXRyeS9icm93c2VyL2VkaXRTb3VyY2VUcmFja2luZ0ltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxPQUFPLEVBQXdCLGdCQUFnQixFQUFFLFdBQVcsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNLLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMvRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsdUJBQXVCLEVBQUUsZ0NBQWdDLEVBQTJELHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDck4sT0FBTyxFQUFF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