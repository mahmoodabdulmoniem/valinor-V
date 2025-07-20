/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h, reset } from '../../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableSignal, observableSignalFromEvent, transaction } from '../../../../../base/common/observable.js';
import { MergeEditorLineRange } from '../model/lineRange.js';
export class EditorGutter extends Disposable {
    constructor(_editor, _domNode, itemProvider) {
        super();
        this._editor = _editor;
        this._domNode = _domNode;
        this.itemProvider = itemProvider;
        this.scrollTop = observableFromEvent(this, this._editor.onDidScrollChange, (e) => /** @description editor.onDidScrollChange */ this._editor.getScrollTop());
        this.isScrollTopZero = this.scrollTop.map((scrollTop) => /** @description isScrollTopZero */ scrollTop === 0);
        this.modelAttached = observableFromEvent(this, this._editor.onDidChangeModel, (e) => /** @description editor.onDidChangeModel */ this._editor.hasModel());
        this.editorOnDidChangeViewZones = observableSignalFromEvent('onDidChangeViewZones', this._editor.onDidChangeViewZones);
        this.editorOnDidContentSizeChange = observableSignalFromEvent('onDidContentSizeChange', this._editor.onDidContentSizeChange);
        this.domNodeSizeChanged = observableSignal('domNodeSizeChanged');
        this.views = new Map();
        this._domNode.className = 'gutter monaco-editor';
        const scrollDecoration = this._domNode.appendChild(h('div.scroll-decoration', { role: 'presentation', ariaHidden: 'true', style: { width: '100%' } })
            .root);
        const o = new ResizeObserver(() => {
            transaction(tx => {
                /** @description ResizeObserver: size changed */
                this.domNodeSizeChanged.trigger(tx);
            });
        });
        o.observe(this._domNode);
        this._register(toDisposable(() => o.disconnect()));
        this._register(autorun(reader => {
            /** @description update scroll decoration */
            scrollDecoration.className = this.isScrollTopZero.read(reader) ? '' : 'scroll-decoration';
        }));
        this._register(autorun(reader => /** @description EditorGutter.Render */ this.render(reader)));
    }
    dispose() {
        super.dispose();
        reset(this._domNode);
    }
    render(reader) {
        if (!this.modelAttached.read(reader)) {
            return;
        }
        this.domNodeSizeChanged.read(reader);
        this.editorOnDidChangeViewZones.read(reader);
        this.editorOnDidContentSizeChange.read(reader);
        const scrollTop = this.scrollTop.read(reader);
        const visibleRanges = this._editor.getVisibleRanges();
        const unusedIds = new Set(this.views.keys());
        if (visibleRanges.length > 0) {
            const visibleRange = visibleRanges[0];
            const visibleRange2 = MergeEditorLineRange.fromLength(visibleRange.startLineNumber, visibleRange.endLineNumber - visibleRange.startLineNumber).deltaEnd(1);
            const gutterItems = this.itemProvider.getIntersectingGutterItems(visibleRange2, reader);
            for (const gutterItem of gutterItems) {
                if (!gutterItem.range.intersectsOrTouches(visibleRange2)) {
                    continue;
                }
                unusedIds.delete(gutterItem.id);
                let view = this.views.get(gutterItem.id);
                if (!view) {
                    const viewDomNode = document.createElement('div');
                    this._domNode.appendChild(viewDomNode);
                    const itemView = this.itemProvider.createView(gutterItem, viewDomNode);
                    view = new ManagedGutterItemView(itemView, viewDomNode);
                    this.views.set(gutterItem.id, view);
                }
                else {
                    view.gutterItemView.update(gutterItem);
                }
                const top = gutterItem.range.startLineNumber <= this._editor.getModel().getLineCount()
                    ? this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) - scrollTop
                    : this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) - scrollTop;
                const bottom = this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) - scrollTop;
                const height = bottom - top;
                view.domNode.style.top = `${top}px`;
                view.domNode.style.height = `${height}px`;
                view.gutterItemView.layout(top, height, 0, this._domNode.clientHeight);
            }
        }
        for (const id of unusedIds) {
            const view = this.views.get(id);
            view.gutterItemView.dispose();
            view.domNode.remove();
            this.views.delete(id);
        }
    }
}
class ManagedGutterItemView {
    constructor(gutterItemView, domNode) {
        this.gutterItemView = gutterItemView;
        this.domNode = domNode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3V0dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvZWRpdG9yR3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFXLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTNKLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTdELE1BQU0sT0FBTyxZQUEwRCxTQUFRLFVBQVU7SUFTeEYsWUFDa0IsT0FBeUIsRUFDekIsUUFBcUIsRUFDckIsWUFBb0M7UUFFckQsS0FBSyxFQUFFLENBQUM7UUFKUyxZQUFPLEdBQVAsT0FBTyxDQUFrQjtRQUN6QixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQUdyRCxJQUFJLENBQUMsU0FBUyxHQUFHLG1CQUFtQixDQUFDLElBQUksRUFDeEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFDOUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDRDQUE0QyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQy9FLENBQUM7UUFDRixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxtQ0FBbUMsQ0FBQyxTQUFT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