/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LineRange } from '../../core/ranges/lineRange.js';
import { derivedOpts, observableSignal, observableValueOpts } from '../../../../base/common/observable.js';
import { equalsIfDefined, itemEquals, itemsEquals } from '../../../../base/common/equals.js';
/**
 * @internal
 */
export class AttachedViews {
    constructor() {
        this._onDidChangeVisibleRanges = new Emitter();
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._views = new Set();
        this._viewsChanged = observableSignal(this);
        this.visibleLineRanges = derivedOpts({
            owner: this,
            equalsFn: itemsEquals(itemEquals())
        }, reader => {
            this._viewsChanged.read(reader);
            const ranges = LineRange.joinMany([...this._views].map(view => view.state.read(reader)?.visibleLineRanges ?? []));
            return ranges;
        });
    }
    attachView() {
        const view = new AttachedViewImpl((state) => {
            this._onDidChangeVisibleRanges.fire({ view, state });
        });
        this._views.add(view);
        this._viewsChanged.trigger(undefined);
        return view;
    }
    detachView(view) {
        this._views.delete(view);
        this._onDidChangeVisibleRanges.fire({ view, state: undefined });
        this._viewsChanged.trigger(undefined);
    }
}
/**
 * @internal
 */
export class AttachedViewState {
    constructor(visibleLineRanges, stabilized) {
        this.visibleLineRanges = visibleLineRanges;
        this.stabilized = stabilized;
    }
    equals(other) {
        if (this === other) {
            return true;
        }
        if (!equals(this.visibleLineRanges, other.visibleLineRanges, (a, b) => a.equals(b))) {
            return false;
        }
        if (this.stabilized !== other.stabilized) {
            return false;
        }
        return true;
    }
}
class AttachedViewImpl {
    get state() { return this._state; }
    constructor(handleStateChange) {
        this.handleStateChange = handleStateChange;
        this._state = observableValueOpts({ owner: this, equalsFn: equalsIfDefined((a, b) => a.equals(b)) }, undefined);
    }
    setVisibleLines(visibleLines, stabilized) {
        const visibleLineRanges = visibleLines.map((line) => new LineRange(line.startLineNumber, line.endLineNumber + 1));
        const state = new AttachedViewState(visibleLineRanges, stabilized);
        this._state.set(state, undefined, undefined);
        this.handleStateChange(state);
    }
}
export class AttachedViewHandler extends Disposable {
    get lineRanges() { return this._lineRanges; }
    constructor(_refreshTokens) {
        super();
        this._refreshTokens = _refreshTokens;
        this.runner = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._computedLineRanges = [];
        this._lineRanges = [];
    }
    update() {
        if (equals(this._computedLineRanges, this._lineRanges, (a, b) => a.equals(b))) {
            return;
        }
        this._computedLineRanges = this._lineRanges;
        this._refreshTokens();
    }
    handleStateChange(state) {
        this._lineRanges = state.visibleLineRanges;
        if (state.stabilized) {
            this.runner.cancel();
            this.update();
        }
        else {
            this.runner.schedule();
        }
    }
}
export class AbstractSyntaxTokenBackend extends Disposable {
    get backgroundTokenizationState() {
        return this._backgroundTokenizationState;
    }
    constructor(_languageIdCodec, _textModel) {
        super();
        this._languageIdCodec = _languageIdCodec;
        this._textModel = _textModel;
        this._onDidChangeTokens = this._register(new Emitter());
        /** @internal, should not be exposed by the text model! */
        this.onDidChangeTokens = this._onDidChangeTokens.event;
    }
    tokenizeIfCheap(lineNumber) {
        if (this.isCheapToTokenize(lineNumber)) {
            this.forceTokenization(lineNumber);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTeW50YXhUb2tlbkJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5zL2Fic3RyYWN0U3ludGF4VG9rZW5CYWNrZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQVEzRCxPQUFPLEVBQUUsV0FBVyxFQUFvQyxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdJLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFTekI7UUFSaUIsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQWlFLENBQUM7UUFDMUcsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztRQUUvRCxXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFDckMsa0JBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUt2RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDO1lBQ3BDLEtBQUssRUFBRSxJQUFJO1lBQ1gsUUFBUSxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUNu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