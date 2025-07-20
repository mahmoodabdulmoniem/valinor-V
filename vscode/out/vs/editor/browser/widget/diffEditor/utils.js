/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLast } from '../../../../base/common/arraysFind.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunOpts, autorunWithStore, observableValue, transaction } from '../../../../base/common/observable.js';
import { ElementSizeObserver } from '../../config/elementSizeObserver.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextLength } from '../../../common/core/text/textLength.js';
export function joinCombine(arr1, arr2, keySelector, combine) {
    if (arr1.length === 0) {
        return arr2;
    }
    if (arr2.length === 0) {
        return arr1;
    }
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const val1 = arr1[i];
        const val2 = arr2[j];
        const key1 = keySelector(val1);
        const key2 = keySelector(val2);
        if (key1 < key2) {
            result.push(val1);
            i++;
        }
        else if (key1 > key2) {
            result.push(val2);
            j++;
        }
        else {
            result.push(combine(val1, val2));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i]);
        i++;
    }
    while (j < arr2.length) {
        result.push(arr2[j]);
        j++;
    }
    return result;
}
// TODO make utility
export function applyObservableDecorations(editor, decorations) {
    const d = new DisposableStore();
    const decorationsCollection = editor.createDecorationsCollection();
    d.add(autorunOpts({ debugName: () => `Apply decorations from ${decorations.debugName}` }, reader => {
        const d = decorations.read(reader);
        decorationsCollection.set(d);
    }));
    d.add({
        dispose: () => {
            decorationsCollection.clear();
        }
    });
    return d;
}
export function appendRemoveOnDispose(parent, child) {
    parent.appendChild(child);
    return toDisposable(() => {
        child.remove();
    });
}
export function prependRemoveOnDispose(parent, child) {
    parent.prepend(child);
    return toDisposable(() => {
        child.remove();
    });
}
export class ObservableElementSizeObserver extends Disposable {
    get width() { return this._width; }
    get height() { return this._height; }
    get automaticLayout() { return this._automaticLayout; }
    constructor(element, dimension) {
        super();
        this._automaticLayout = false;
        this.elementSizeObserver = this._register(new ElementSizeObserver(element, dimension));
        this._width = observableValue(this, this.elementSizeObserver.getWidth());
        this._height = observableValue(this, this.elementSizeObserver.getHeight());
        this._register(this.elementSizeObserver.onDidChange(e => transaction(tx => {
            /** @description Set width/height from elementSizeObserver */
            this._width.set(this.elementSizeObserver.getWidth(), tx);
            this._height.set(this.elementSizeObserver.getHeight(), tx);
        })));
    }
    observe(dimension) {
        this.elementSizeObserver.observe(dimension);
    }
    setAutomaticLayout(automaticLayout) {
        this._automaticLayout = automaticLayout;
        if (automaticLayout) {
            this.elementSizeObserver.startObserving();
        }
        else {
            this.elementSizeObserver.stopObserving();
        }
    }
}
export function animatedObservable(targetWindow, base, store) {
    let targetVal = base.get();
    let startVal = targetVal;
    let curVal = targetVal;
    const result = observableValue('animatedValue', targetVal);
    let animationStartMs = -1;
    const durationMs = 300;
    let animationFrame = undefined;
    store.add(autorunHandleChanges({
        changeTracker: {
            createChangeSummary: () => ({ animate: false }),
            handleChange: (ctx, s) => {
                if (ctx.didChange(base)) {
                    s.animate = s.animate || ctx.change;
                }
                return true;
            }
        }
    }, (reader, s) => {
        /** @description update value */
        if (animationFrame !== undefined) {
            targetWindow.cancelAnimationFrame(animationFrame);
            animationFrame = undefined;
        }
        startVal = curVal;
        targetVal = base.read(reader);
        animationStartMs = Date.now() - (s.animate ? 0 : durationMs);
        update();
    }));
    function update() {
        const passedMs = Date.now() - animationStartMs;
        curVal = Math.floor(easeOutExpo(passedMs, startVal, targetVal - startVal, durationMs));
        if (passedMs < durationMs) {
            animationFrame = targetWindow.requestAnimationFrame(update);
        }
        else {
            curVal = targetVal;
        }
        result.set(curVal, undefined);
    }
    return result;
}
function easeOutExpo(t, b, c, d) {
    return t === d ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
}
export function deepMerge(source1, source2) {
    const result = {};
    for (const key in source1) {
        result[key] = source1[key];
    }
    for (const key in source2) {
        const source2Value = source2[key];
        if (typeof result[key] === 'object' && source2Value && typeof source2Value === 'object') {
            result[key] = deepMerge(result[key], source2Value);
        }
        else {
            result[key] = source2Value;
        }
    }
    return result;
}
export class ViewZoneOverlayWidget extends Disposable {
    constructor(editor, viewZone, htmlElement) {
        super();
        this._register(new ManagedOverlayWidget(editor, htmlElement));
        this._register(applyStyle(htmlElement, {
            height: viewZone.actualHeight,
            top: viewZone.actualTop,
        }));
    }
}
export class PlaceholderViewZone {
    get afterLineNumber() { return this._afterLineNumber.get(); }
    constructor(_afterLineNumber, heightInPx) {
        this._afterLineNumber = _afterLineNumber;
        this.heightInPx = heightInPx;
        this.domNode = document.createElement('div');
        this._actualTop = observableValue(this, undefined);
        this._actualHeight = observableValue(this, undefined);
        this.actualTop = this._actualTop;
        this.actualHeight = this._actualHeight;
        this.showInHiddenAreas = true;
        this.onChange = this._afterLineNumber;
        this.onDomNodeTop = (top) => {
            this._actualTop.set(top, undefined);
        };
        this.onComputedHeight = (height) => {
            this._actualHeight.set(height, undefined);
        };
    }
}
export class ManagedOverlayWidget {
    static { this._counter = 0; }
    constructor(_editor, _domElement) {
        this._editor = _editor;
        this._domElement = _domElement;
        this._overlayWidgetId = `managedOverlayWidget-${ManagedOverlayWidget._counter++}`;
        this._overlayWidget = {
            getId: () => this._overlayWidgetId,
            getDomNode: () => this._domElement,
            getPosition: () => null
        };
        this._editor.addOverlayWidget(this._overlayWidget);
    }
    dispose() {
        this._editor.removeOverlayWidget(this._overlayWidget);
    }
}
export function applyStyle(domNode, style) {
    return autorun(reader => {
        /** @description applyStyle */
        for (let [key, val] of Object.entries(style)) {
            if (val && typeof val === 'object' && 'read' in val) {
                val = val.read(reader);
            }
            if (typeof val === 'number') {
                val = `${val}px`;
            }
            key = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            domNode.style[key] = val;
        }
    });
}
export function applyViewZones(editor, viewZones, setIsUpdating, zoneIds) {
    const store = new DisposableStore();
    const lastViewZoneIds = [];
    store.add(autorunWithStore((reader, store) => {
        /** @description applyViewZones */
        const curViewZones = viewZones.read(reader);
        const viewZonIdsPerViewZone = new Map();
        const viewZoneIdPerOnChangeObservable = new Map();
        // Add/remove view zones
        if (setIsUpdating) {
            setIsUpdating(true);
        }
        editor.changeViewZones(a => {
            for (const id of lastViewZoneIds) {
                a.removeZone(id);
                zoneIds?.delete(id);
            }
            lastViewZoneIds.length = 0;
            for (const z of curViewZones) {
                const id = a.addZone(z);
                if (z.setZoneId) {
                    z.setZoneId(id);
                }
                lastViewZoneIds.push(id);
                zoneIds?.add(id);
                viewZonIdsPerViewZone.set(z, id);
            }
        });
        if (setIsUpdating) {
            setIsUpdating(false);
        }
        // Layout zone on change
        store.add(autorunHandleChanges({
            changeTracker: {
                createChangeSummary() {
                    return { zoneIds: [] };
                },
                handleChange(context, changeSummary) {
                    const id = viewZoneIdPerOnChangeObservable.get(context.changedObservable);
                    if (id !== undefined) {
                        changeSummary.zoneIds.push(id);
                    }
                    return true;
                },
            }
        }, (reader, changeSummary) => {
            /** @description layoutZone on change */
            for (const vz of curViewZones) {
                if (vz.onChange) {
                    viewZoneIdPerOnChangeObservable.set(vz.onChange, viewZonIdsPerViewZone.get(vz));
                    vz.onChange.read(reader);
                }
            }
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones(a => { for (const id of changeSummary.zoneIds) {
                a.layoutZone(id);
            } });
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        }));
    }));
    store.add({
        dispose() {
            if (setIsUpdating) {
                setIsUpdating(true);
            }
            editor.changeViewZones(a => { for (const id of lastViewZoneIds) {
                a.removeZone(id);
            } });
            zoneIds?.clear();
            if (setIsUpdating) {
                setIsUpdating(false);
            }
        }
    });
    return store;
}
export class DisposableCancellationTokenSource extends CancellationTokenSource {
    dispose() {
        super.dispose(true);
    }
}
export function translatePosition(posInOriginal, mappings) {
    const mapping = findLast(mappings, m => m.original.startLineNumber <= posInOriginal.lineNumber);
    if (!mapping) {
        // No changes before the position
        return Range.fromPositions(posInOriginal);
    }
    if (mapping.original.endLineNumberExclusive <= posInOriginal.lineNumber) {
        const newLineNumber = posInOriginal.lineNumber - mapping.original.endLineNumberExclusive + mapping.modified.endLineNumberExclusive;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (!mapping.innerChanges) {
        // Only for legacy algorithm
        return Range.fromPositions(new Position(mapping.modified.startLineNumber, 1));
    }
    const innerMapping = findLast(mapping.innerChanges, m => m.originalRange.getStartPosition().isBeforeOrEqual(posInOriginal));
    if (!innerMapping) {
        const newLineNumber = posInOriginal.lineNumber - mapping.original.startLineNumber + mapping.modified.startLineNumber;
        return Range.fromPositions(new Position(newLineNumber, posInOriginal.column));
    }
    if (innerMapping.originalRange.containsPosition(posInOriginal)) {
        return innerMapping.modifiedRange;
    }
    else {
        const l = lengthBetweenPositions(innerMapping.originalRange.getEndPosition(), posInOriginal);
        return Range.fromPositions(l.addToPosition(innerMapping.modifiedRange.getEndPosition()));
    }
}
function lengthBetweenPositions(position1, position2) {
    if (position1.lineNumber === position2.lineNumber) {
        return new TextLength(0, position2.column - position1.column);
    }
    else {
        return new TextLength(position2.lineNumber - position1.lineNumber, position2.column - 1);
    }
}
export function filterWithPrevious(arr, filter) {
    let prev;
    return arr.filter(cur => {
        const result = filter(cur, prev);
        prev = cur;
        return result;
    });
}
export class RefCounted {
    static create(value, debugOwner = undefined) {
        return new BaseRefCounted(value, value, debugOwner);
    }
    static createWithDisposable(value, disposable, debugOwner = undefined) {
        const store = new DisposableStore();
        store.add(disposable);
        store.add(value);
        return new BaseRefCounted(value, store, debugOwner);
    }
    static createOfNonDisposable(value, disposable, debugOwner = undefined) {
        return new BaseRefCounted(value, disposable, debugOwner);
    }
}
class BaseRefCounted extends RefCounted {
    constructor(object, _disposable, _debugOwner) {
        super();
        this.object = object;
        this._disposable = _disposable;
        this._debugOwner = _debugOwner;
        this._refCount = 1;
        this._isDisposed = false;
        this._owners = [];
        if (_debugOwner) {
            this._addOwner(_debugOwner);
        }
    }
    _addOwner(debugOwner) {
        if (debugOwner) {
            this._owners.push(debugOwner);
        }
    }
    createNewRef(debugOwner) {
        this._refCount++;
        if (debugOwner) {
            this._addOwner(debugOwner);
        }
        return new ClonedRefCounted(this, debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._decreaseRefCount(this._debugOwner);
    }
    _decreaseRefCount(debugOwner) {
        this._refCount--;
        if (this._refCount === 0) {
            this._disposable.dispose();
        }
        if (debugOwner) {
            const idx = this._owners.indexOf(debugOwner);
            if (idx !== -1) {
                this._owners.splice(idx, 1);
            }
        }
    }
}
class ClonedRefCounted extends RefCounted {
    constructor(_base, _debugOwner) {
        super();
        this._base = _base;
        this._debugOwner = _debugOwner;
        this._isDisposed = false;
    }
    get object() { return this._base.object; }
    createNewRef(debugOwner) {
        return this._base.createNewRef(debugOwner);
    }
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        this._base._decreaseRefCount(this._debugOwner);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBMkIsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUgsT0FBTyxFQUEyRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUM1TSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxNQUFNLFVBQVUsV0FBVyxDQUFJLElBQWtCLEVBQUUsSUFBa0IsRUFBRSxXQUErQixFQUFFLE9BQTRCO0lBQ25JLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdkIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBQ3ZCLElBQUksQ0FBQyxHQUFHLENB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