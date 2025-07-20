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
import { AsyncIterableProducer } from '../../../../base/common/async.js';
import { CachedFunction } from '../../../../base/common/cache.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue, runOnChange } from '../../../../base/common/observable.js';
import { AnnotatedStringEdit } from '../../../../editor/common/core/edits/stringEdit.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { AsyncReader, AsyncReaderEndOfStream, mapObservableDelta } from './utils.js';
/**
 * Creates a document that is a delayed copy of the original document,
 * but with edits annotated with the source of the edit.
*/
export class DocumentWithSourceAnnotatedEdits extends Disposable {
    constructor(_originalDoc) {
        super();
        this._originalDoc = _originalDoc;
        const v = this.value = observableValue(this, _originalDoc.value.get());
        this._register(runOnChange(this._originalDoc.value, (val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => {
                const editSourceData = new EditSourceData(e.reason);
                return e.mapData(() => editSourceData);
            }));
            v.set(val, undefined, { edit: eComposed });
        }));
    }
    waitForQueue() {
        return Promise.resolve();
    }
}
/**
 * Only joins touching edits if the source and the metadata is the same (e.g. requestUuids must be equal).
*/
export class EditSourceData {
    constructor(editReason) {
        this.editReason = editReason;
        this.key = this.editReason.toKey(1);
        this.source = EditSourceBase.create(this.editReason);
    }
    join(data) {
        if (this.editReason !== data.editReason) {
            return undefined;
        }
        return this;
    }
    toEditSourceData() {
        return new EditKeySourceData(this.key, this.source, this.editReason);
    }
}
export class EditKeySourceData {
    constructor(key, source, representative) {
        this.key = key;
        this.source = source;
        this.representative = representative;
    }
    join(data) {
        if (this.key !== data.key) {
            return undefined;
        }
        if (this.source !== data.source) {
            return undefined;
        }
        // The representatives could be different! (But equal modulo key)
        return this;
    }
}
export class EditSourceBase {
    static { this._cache = new CachedFunction({ getCacheKey: v => v.toString() }, (arg) => arg); }
    static create(reason) {
        const data = reason.metadata;
        switch (data.source) {
            case 'reloadFromDisk':
                return this._cache.get(new ExternalEditSource());
            case 'inlineCompletionPartialAccept':
            case 'inlineCompletionAccept': {
                const type = 'type' in data ? data.type : undefined;
                if ('$nes' in data && data.$nes) {
                    return this._cache.get(new InlineSuggestEditSource('nes', data.$extensionId ?? '', type));
                }
                return this._cache.get(new InlineSuggestEditSource('completion', data.$extensionId ?? '', type));
            }
            case 'snippet':
                return this._cache.get(new IdeEditSource('suggest'));
            case 'unknown':
                if (!data.name) {
                    return this._cache.get(new UnknownEditSource());
                }
                switch (data.name) {
                    case 'formatEditsCommand':
                        return this._cache.get(new IdeEditSource('format'));
                }
                return this._cache.get(new UnknownEditSource());
            case 'Chat.applyEdits':
                return this._cache.get(new ChatEditSource('sidebar'));
            case 'inlineChat.applyEdits':
                return this._cache.get(new ChatEditSource('inline'));
            case 'cursor':
                return this._cache.get(new UserEditSource());
            default:
                return this._cache.get(new UnknownEditSource());
        }
    }
}
export class InlineSuggestEditSource extends EditSourceBase {
    constructor(kind, extensionId, type) {
        super();
        this.kind = kind;
        this.extensionId = extensionId;
        this.type = type;
        this.category = 'ai';
        this.feature = 'inlineSuggest';
    }
    toString() { return `${this.category}/${this.feature}/${this.kind}/${this.extensionId}/${this.type}`; }
    getColor() { return '#00ff0033'; }
}
class ChatEditSource extends EditSourceBase {
    constructor(kind) {
        super();
        this.kind = kind;
        this.category = 'ai';
        this.feature = 'chat';
    }
    toString() { return `${this.category}/${this.feature}/${this.kind}`; }
    getColor() { return '#00ff0066'; }
}
class IdeEditSource extends EditSourceBase {
    constructor(feature) {
        super();
        this.feature = feature;
        this.category = 'ide';
    }
    toString() { return `${this.category}/${this.feature}`; }
    getColor() { return this.feature === 'format' ? '#0000ff33' : '#80808033'; }
}
class UserEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'user';
    }
    toString() { return this.category; }
    getColor() { return '#d3d3d333'; }
}
/** Caused by external tools that trigger a reload from disk */
class ExternalEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'external';
    }
    toString() { return this.category; }
    getColor() { return '#009ab254'; }
}
class UnknownEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'unknown';
    }
    toString() { return this.category; }
    getColor() { return '#ff000033'; }
}
let CombineStreamedChanges = class CombineStreamedChanges extends Disposable {
    constructor(_originalDoc, _diffService) {
        super();
        this._originalDoc = _originalDoc;
        this._diffService = _diffService;
        this._runStore = this._register(new DisposableStore());
        this._runQueue = Promise.resolve();
        this.value = this._value = observableValue(this, _originalDoc.value.get());
        this._restart();
        this._diffService.computeStringEditFromDiff('foo', 'last.value.value', { maxComputationTimeMs: 500 }, 'advanced');
    }
    async _restart() {
        this._runStore.clear();
        const iterator = iterateChangesFromObservable(this._originalDoc.value, this._runStore)[Symbol.asyncIterator]();
        const p = this._runQueue;
        this._runQueue = this._runQueue.then(() => this._run(iterator));
        await p;
    }
    async _run(iterator) {
        const reader = new AsyncReader(iterator);
        while (true) {
            let peeked = await reader.peek();
            if (peeked === AsyncReaderEndOfStream) {
                return;
            }
            else if (isChatEdit(peeked)) {
                const first = peeked;
                let last = first;
                let chatEdit = AnnotatedStringEdit.empty;
                do {
                    reader.readSyncOrThrow();
                    last = peeked;
                    chatEdit = chatEdit.compose(AnnotatedStringEdit.compose(peeked.change.map(c => c.edit)));
                    if (!await reader.waitForBufferTimeout(1000)) {
                        break;
                    }
                    peeked = reader.peekSyncOrThrow();
                } while (peeked !== AsyncReaderEndOfStream && isChatEdit(peeked));
                if (!chatEdit.isEmpty()) {
                    const data = chatEdit.replacements[0].data;
                    const diffEdit = await this._diffService.computeStringEditFromDiff(first.prevValue.value, last.value.value, { maxComputationTimeMs: 500 }, 'advanced');
                    const edit = diffEdit.mapData(_e => data);
                    this._value.set(last.value, undefined, { edit });
                }
            }
            else {
                reader.readSyncOrThrow();
                const e = AnnotatedStringEdit.compose(peeked.change.map(c => c.edit));
                this._value.set(peeked.value, undefined, { edit: e });
            }
        }
    }
    async waitForQueue() {
        await this._originalDoc.waitForQueue();
        await this._restart();
    }
};
CombineStreamedChanges = __decorate([
    __param(1, IEditorWorkerService)
], CombineStreamedChanges);
export { CombineStreamedChanges };
function isChatEdit(next) {
    return next.change.every(c => c.edit.replacements.every(e => {
        if (e.data.source.category === 'ai' && e.data.source.feature === 'chat') {
            return true;
        }
        return false;
    }));
}
function iterateChangesFromObservable(obs, store) {
    return new AsyncIterableProducer((e) => {
        store.add(runOnChange(obs, (value, prevValue, change) => {
            e.emitOne({ value, prevValue, change: change });
        }));
        return new Promise((res) => {
            store.add(toDisposable(() => {
                res(undefined);
            }));
        });
    });
}
export class MinimizeEditsProcessor extends Disposable {
    constructor(_originalDoc) {
        super();
        this._originalDoc = _originalDoc;
        const v = this.value = observableValue(this, _originalDoc.value.get());
        let prevValue = this._originalDoc.value.get().value;
        this._register(runOnChange(this._originalDoc.value, (val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => e.edit));
            const e = eComposed.removeCommonSuffixAndPrefix(prevValue);
            prevValue = val.value;
            v.set(val, undefined, { edit: e });
        }));
    }
    async waitForQueue() {
        await this._originalDoc.waitForQueue();
    }
}
/**
 * Removing the metadata allows touching edits from the same source to merged, even if they were caused by different actions (e.g. two user edits).
 */
export function createDocWithJustReason(docWithAnnotatedEdits, store) {
    const docWithJustReason = {
        value: mapObservableDelta(docWithAnnotatedEdits.value, edit => ({ edit: edit.edit.mapData(d => d.data.toEditSourceData()) }), store),
        waitForQueue: () => docWithAnnotatedEdits.waitForQueue(),
    };
    return docWithJustReason;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRXaXRoQW5ub3RhdGVkRWRpdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9kb2N1bWVudFdpdGhBbm5vdGF0ZWRFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUE4QyxlQUFlLEVBQW1CLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxtQkFBbUIsRUFBYSxNQUFNLG9EQUFvRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFPckY7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLFVBQVU7SUFHL0QsWUFBNkIsWUFBaUM7UUFDN0QsS0FBSyxFQUFFLENBQUM7UUFEb0IsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBRzdELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVB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