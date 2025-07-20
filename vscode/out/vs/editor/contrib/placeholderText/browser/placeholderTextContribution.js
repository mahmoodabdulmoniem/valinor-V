/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../base/browser/dom.js';
import { structuralEquals } from '../../../../base/common/equals.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, constObservable, derivedObservableWithCache, derivedOpts, derived } from '../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
/**
 * Use the editor option to set the placeholder text.
*/
export class PlaceholderTextContribution extends Disposable {
    static get(editor) {
        return editor.getContribution(PlaceholderTextContribution.ID);
    }
    static { this.ID = 'editor.contrib.placeholderText'; }
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._editorObs = observableCodeEditor(this._editor);
        this._placeholderText = this._editorObs.getOption(99 /* EditorOption.placeholder */);
        this._state = derivedOpts({ owner: this, equalsFn: structuralEquals }, reader => {
            const p = this._placeholderText.read(reader);
            if (!p) {
                return undefined;
            }
            if (!this._editorObs.valueIsEmpty.read(reader)) {
                return undefined;
            }
            return { placeholder: p };
        });
        this._shouldViewBeAlive = isOrWasTrue(this, reader => this._state.read(reader)?.placeholder !== undefined);
        this._view = derived((reader) => {
            if (!this._shouldViewBeAlive.read(reader)) {
                return;
            }
            const element = h('div.editorPlaceholder');
            reader.store.add(autorun(reader => {
                const data = this._state.read(reader);
                const shouldBeVisibile = data?.placeholder !== undefined;
                element.root.style.display = shouldBeVisibile ? 'block' : 'none';
                element.root.innerText = data?.placeholder ?? '';
            }));
            reader.store.add(autorun(reader => {
                const info = this._editorObs.layoutInfo.read(reader);
                element.root.style.left = `${info.contentLeft}px`;
                element.root.style.width = (info.contentWidth - info.verticalScrollbarWidth) + 'px';
                element.root.style.top = `${this._editor.getTopForLineNumber(0)}px`;
            }));
            reader.store.add(autorun(reader => {
                element.root.style.fontFamily = this._editorObs.getOption(58 /* EditorOption.fontFamily */).read(reader);
                element.root.style.fontSize = this._editorObs.getOption(61 /* EditorOption.fontSize */).read(reader) + 'px';
                element.root.style.lineHeight = this._editorObs.getOption(75 /* EditorOption.lineHeight */).read(reader) + 'px';
            }));
            reader.store.add(this._editorObs.createOverlayWidget({
                allowEditorOverflow: false,
                minContentWidthInPx: constObservable(0),
                position: constObservable(null),
                domNode: element.root,
            }));
        });
        this._view.recomputeInitiallyAndOnChange(this._store);
    }
}
function isOrWasTrue(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => {
        if (lastValue === true) {
            return true;
        }
        return fn(reader);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0Q29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wbGFjZWhvbGRlclRleHQvYnJvd3Nlci9wbGFjZWhvbGRlclRleHRDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBYywwQkFBMEIsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBRXJLLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSWhGOztFQUVFO0FBQ0YsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFDbkQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQThCLDJCQUEyQixDQUFDLEVBQUUsQ0FBRSxDQUFDO0lBQzdGLENBQUM7YUFFc0IsT0FBRSxHQUFHLGdDQUFnQyxDQUFDO0lBVzdELFlBQ2tCLE9BQW9CO1FBRXJDLEtBQUssRUFBRSxDQUFDO1FBRlMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUdyQyxJQUFJLENBQUMsVUFBVSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLG1DQUEwQixDQUFDO1FBQzVFLElBQUksQ0FBQyxN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