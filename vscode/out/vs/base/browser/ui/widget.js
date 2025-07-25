/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../dom.js';
import { StandardKeyboardEvent } from '../keyboardEvent.js';
import { StandardMouseEvent } from '../mouseEvent.js';
import { Gesture } from '../touch.js';
import { Disposable } from '../../common/lifecycle.js';
export class Widget extends Disposable {
    onclick(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.CLICK, (e) => listener(new StandardMouseEvent(dom.getWindow(domNode), e))));
    }
    onmousedown(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.MOUSE_DOWN, (e) => listener(new StandardMouseEvent(dom.getWindow(domNode), e))));
    }
    onmouseover(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.MOUSE_OVER, (e) => listener(new StandardMouseEvent(dom.getWindow(domNode), e))));
    }
    onmouseleave(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.MOUSE_LEAVE, (e) => listener(new StandardMouseEvent(dom.getWindow(domNode), e))));
    }
    onkeydown(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.KEY_DOWN, (e) => listener(new StandardKeyboardEvent(e))));
    }
    onkeyup(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.KEY_UP, (e) => listener(new StandardKeyboardEvent(e))));
    }
    oninput(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.INPUT, listener));
    }
    onblur(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.BLUR, listener));
    }
    onfocus(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.FOCUS, listener));
    }
    onchange(domNode, listener) {
        this._register(dom.addDisposableListener(domNode, dom.EventType.CHANGE, listener));
    }
    ignoreGesture(domNode) {
        return Gesture.ignoreTarget(domNode);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvd2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM1RSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSwyQkFBMkIsQ0FBQztBQUVwRSxNQUFNLE9BQWdCLE1BQU8sU0FBUSxVQUFVO0lBRXBDLE9BQU8sQ0FBQyxPQUFvQixFQUFFLFFBQWtDO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQWEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6SixDQUFDO0lBRVMsV0FBVyxDQUFDLE9BQW9CLEVBQUUsUUFBa0M7UUFDN0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBYSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxD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