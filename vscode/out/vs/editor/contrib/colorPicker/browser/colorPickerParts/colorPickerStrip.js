/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { GlobalPointerMoveMonitor } from '../../../../../base/browser/globalPointerMoveMonitor.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
const $ = dom.$;
export class Strip extends Disposable {
    constructor(container, model, type) {
        super();
        this.model = model;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onColorFlushed = new Emitter();
        this.onColorFlushed = this._onColorFlushed.event;
        if (type === "standalone" /* ColorPickerWidgetType.Standalone */) {
            this.domNode = dom.append(container, $('.standalone-strip'));
            this.overlay = dom.append(this.domNode, $('.standalone-overlay'));
        }
        else {
            this.domNode = dom.append(container, $('.strip'));
            this.overlay = dom.append(this.domNode, $('.overlay'));
        }
        this.slider = dom.append(this.domNode, $('.slider'));
        this.slider.style.top = `0px`;
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.POINTER_DOWN, e => this.onPointerDown(e)));
        this._register(model.onDidChangeColor(this.onDidChangeColor, this));
        this.layout();
    }
    layout() {
        this.height = this.domNode.offsetHeight - this.slider.offsetHeight;
        const value = this.getValue(this.model.color);
        this.updateSliderPosition(value);
    }
    onDidChangeColor(color) {
        const value = this.getValue(color);
        this.updateSliderPosition(value);
    }
    onPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const monitor = this._register(new GlobalPointerMoveMonitor());
        const origin = dom.getDomNodePagePosition(this.domNode);
        this.domNode.classList.add('grabbing');
        if (e.target !== this.slider) {
            this.onDidChangeTop(e.offsetY);
        }
        monitor.startMonitoring(e.target, e.pointerId, e.buttons, event => this.onDidChangeTop(event.pageY - origin.top), () => null);
        const pointerUpListener = dom.addDisposableListener(e.target.ownerDocument, dom.EventType.POINTER_UP, () => {
            this._onColorFlushed.fire();
            pointerUpListener.dispose();
            monitor.stopMonitoring(true);
            this.domNode.classList.remove('grabbing');
        }, true);
    }
    onDidChangeTop(top) {
        const value = Math.max(0, Math.min(1, 1 - (top / this.height)));
        this.updateSliderPosition(value);
        this._onDidChange.fire(value);
    }
    updateSliderPosition(value) {
        this.slider.style.top = `${(1 - value) * this.height}px`;
    }
}
export class OpacityStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('opacity-strip');
        this.onDidChangeColor(this.model.color);
    }
    onDidChangeColor(color) {
        super.onDidChangeColor(color);
        const { r, g, b } = color.rgba;
        const opaque = new Color(new RGBA(r, g, b, 1));
        const transparent = new Color(new RGBA(r, g, b, 0));
        this.overlay.style.background = `linear-gradient(to bottom, ${opaque} 0%, ${transparent} 100%)`;
    }
    getValue(color) {
        return color.hsva.a;
    }
}
export class HueStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('hue-strip');
    }
    getValue(color) {
        return 1 - (color.hsva.h / 360);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJTdHJpcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvclBpY2tlclBhcnRzL2NvbG9yUGlja2VyU3RyaXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlyRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhCLE1BQU0sT0FBZ0IsS0FBTSxTQUFRLFVBQVU7SUFhN0MsWUFBWSxTQUFzQixFQUFZLEtBQXVCLEVBQUUsSUFBMkI7UUFDakcsS0FBSyxFQUFFLENBQUM7UUFEcUMsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFOcEQsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFDO1FBQzdDLGdCQUFXLEdBQWtCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBRTdDLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUM5QyxtQkFBYyxHQUFnQixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztRQUlqRSxJQUFJLElBQUksd0RBQXFDLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMs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