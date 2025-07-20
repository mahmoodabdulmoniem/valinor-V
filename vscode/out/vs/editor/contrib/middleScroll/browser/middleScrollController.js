/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, addDisposableListener, n } from '../../../../base/browser/dom.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun, derived, disposableObservableValue, observableValue } from '../../../../base/common/observable.js';
import { observableCodeEditor } from '../../../browser/observableCodeEditor.js';
import { Point } from '../../../common/core/2d/point.js';
import { AnimationFrameScheduler } from '../../inlineCompletions/browser/model/animation.js';
import { appendRemoveOnDispose } from '../../../browser/widget/diffEditor/utils.js';
import './middleScroll.css';
export class MiddleScrollController extends Disposable {
    static { this.ID = 'editor.contrib.middleScroll'; }
    static get(editor) {
        return editor.getContribution(MiddleScrollController.ID);
    }
    constructor(_editor) {
        super();
        this._editor = _editor;
        const obsEditor = observableCodeEditor(this._editor);
        const scrollOnMiddleClick = obsEditor.getOption(170 /* EditorOption.scrollOnMiddleClick */);
        this._register(autorun(reader => {
            if (!scrollOnMiddleClick.read(reader)) {
                return;
            }
            const editorDomNode = obsEditor.domNode.read(reader);
            if (!editorDomNode) {
                return;
            }
            const scrollingSession = reader.store.add(disposableObservableValue('scrollingSession', undefined));
            reader.store.add(this._editor.onMouseDown(e => {
                const session = scrollingSession.get();
                if (session) {
                    scrollingSession.set(undefined, undefined);
                    return;
                }
                if (!e.event.middleButton) {
                    return;
                }
                e.event.stopPropagation();
                e.event.preventDefault();
                const store = new DisposableStore();
                const initialPos = new Point(e.event.posx, e.event.posy);
                const mousePos = observeWindowMousePos(getWindow(editorDomNode), initialPos, store);
                const mouseDeltaAfterThreshold = mousePos.map(v => v.subtract(initialPos).withThreshold(5));
                const editorDomNodeRect = editorDomNode.getBoundingClientRect();
                const initialMousePosInEditor = new Point(initialPos.x - editorDomNodeRect.left, initialPos.y - editorDomNodeRect.top);
                scrollingSession.set({
                    mouseDeltaAfterThreshold,
                    initialMousePosInEditor,
                    didScroll: false,
                    dispose: () => store.dispose(),
                }, undefined);
                store.add(this._editor.onMouseUp(e => {
                    const session = scrollingSession.get();
                    if (session && session.didScroll) {
                        // Only cancel session on release if the user scrolled during it
                        scrollingSession.set(undefined, undefined);
                    }
                }));
                store.add(this._editor.onKeyDown(e => {
                    scrollingSession.set(undefined, undefined);
                }));
            }));
            reader.store.add(autorun(reader => {
                const session = scrollingSession.read(reader);
                if (!session) {
                    return;
                }
                let lastTime = Date.now();
                reader.store.add(autorun(reader => {
                    AnimationFrameScheduler.instance.invalidateOnNextAnimationFrame(reader);
                    const curTime = Date.now();
                    const frameDurationMs = curTime - lastTime;
                    lastTime = curTime;
                    const mouseDelta = session.mouseDeltaAfterThreshold.get();
                    // scroll by mouse delta every 32ms
                    const factor = frameDurationMs / 32;
                    const scrollDelta = mouseDelta.scale(factor);
                    const scrollPos = new Point(this._editor.getScrollLeft(), this._editor.getScrollTop());
                    this._editor.setScrollPosition(toScrollPosition(scrollPos.add(scrollDelta)));
                    if (!scrollDelta.isZero()) {
                        session.didScroll = true;
                    }
                }));
                const directionAttr = derived(reader => {
                    const delta = session.mouseDeltaAfterThreshold.read(reader);
                    let direction = '';
                    direction += (delta.y < 0 ? 'n' : (delta.y > 0 ? 's' : ''));
                    direction += (delta.x < 0 ? 'w' : (delta.x > 0 ? 'e' : ''));
                    return direction;
                });
                reader.store.add(autorun(reader => {
                    editorDomNode.setAttribute('data-scroll-direction', directionAttr.read(reader));
                }));
            }));
            const dotDomElem = reader.store.add(n.div({
                class: ['scroll-editor-on-middle-click-dot', scrollingSession.map(session => session ? '' : 'hidden')],
                style: {
                    left: scrollingSession.map((session) => session ? session.initialMousePosInEditor.x : 0),
                    top: scrollingSession.map((session) => session ? session.initialMousePosInEditor.y : 0),
                }
            }).toDisposableLiveElement());
            reader.store.add(appendRemoveOnDispose(editorDomNode, dotDomElem.element));
            reader.store.add(autorun(reader => {
                const session = scrollingSession.read(reader);
                editorDomNode.classList.toggle('scroll-editor-on-middle-click-editor', !!session);
            }));
        }));
    }
}
function observeWindowMousePos(window, initialPos, store) {
    const val = observableValue('pos', initialPos);
    store.add(addDisposableListener(window, 'mousemove', (e) => {
        val.set(new Point(e.pageX, e.pageY), undefined);
    }));
    return val;
}
function toScrollPosition(p) {
    return {
        scrollLeft: p.x,
        scrollTop: p.y,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxlU2Nyb2xsQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbWlkZGxlU2Nyb2xsL2Jyb3dzZXIvbWlkZGxlU2Nyb2xsQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQWUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sb0JBQW9CLENBQUM7QUFFNUIsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7YUFDOUIsT0FBRSxHQUFHLDZCQUE2QixDQUFDO0lBRTFELE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDN0IsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUF5QixzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNsRixDQUFDO0lBRUQsWUFDa0IsT0FBb0I7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFGUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBSXJDLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFDLElBQUks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