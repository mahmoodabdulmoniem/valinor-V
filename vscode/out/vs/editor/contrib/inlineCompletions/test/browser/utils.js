/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { Range } from '../../../../common/core/range.js';
import { TextEdit } from '../../../../common/core/edits/textEdit.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { PositionOffsetTransformer } from '../../../../common/core/text/positionToOffset.js';
export class MockInlineCompletionsProvider {
    constructor(enableForwardStability = false) {
        this.enableForwardStability = enableForwardStability;
        this.returnValue = [];
        this.delayMs = 0;
        this.callHistory = new Array();
        this.calledTwiceIn50Ms = false;
        this.lastTimeMs = undefined;
    }
    setReturnValue(value, delayMs = 0) {
        this.returnValue = value ? [value] : [];
        this.delayMs = delayMs;
    }
    setReturnValues(values, delayMs = 0) {
        this.returnValue = values;
        this.delayMs = delayMs;
    }
    getAndClearCallHistory() {
        const history = [...this.callHistory];
        this.callHistory = [];
        return history;
    }
    assertNotCalledTwiceWithin50ms() {
        if (this.calledTwiceIn50Ms) {
            throw new Error('provideInlineCompletions has been called at least twice within 50ms. This should not happen.');
        }
    }
    async provideInlineCompletions(model, position, context, token) {
        const currentTimeMs = new Date().getTime();
        if (this.lastTimeMs && currentTimeMs - this.lastTimeMs < 50) {
            this.calledTwiceIn50Ms = true;
        }
        this.lastTimeMs = currentTimeMs;
        this.callHistory.push({
            position: position.toString(),
            triggerKind: context.triggerKind,
            text: model.getValue()
        });
        const result = new Array();
        for (const v of this.returnValue) {
            const x = { ...v };
            if (!x.range) {
                x.range = model.getFullModelRange();
            }
            result.push(x);
        }
        if (this.delayMs > 0) {
            await timeout(this.delayMs);
        }
        return { items: result, enableForwardStability: this.enableForwardStability };
    }
    disposeInlineCompletions() { }
    handleItemDidShow() { }
}
export class MockSearchReplaceCompletionsProvider {
    constructor() {
        this._map = new Map();
    }
    add(search, replace) {
        this._map.set(search, replace);
    }
    async provideInlineCompletions(model, position, context, token) {
        const text = model.getValue();
        for (const [search, replace] of this._map) {
            const idx = text.indexOf(search);
            // replace idx...idx+text.length with replace
            if (idx !== -1) {
                const range = Range.fromPositions(model.getPositionAt(idx), model.getPositionAt(idx + search.length));
                return {
                    items: [
                        { range, insertText: replace, isInlineEdit: true }
                    ]
                };
            }
        }
        return { items: [] };
    }
    disposeInlineCompletions() { }
    handleItemDidShow() { }
}
export class InlineEditContext extends Disposable {
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        const edit = derived(reader => {
            const state = model.state.read(reader);
            return state ? new TextEdit(state.edits) : undefined;
        });
        this._register(autorun(reader => {
            /** @description update */
            const e = edit.read(reader);
            let view;
            if (e) {
                view = e.toString(this.editor.getValue());
            }
            else {
                view = undefined;
            }
            this.prettyViewStates.push(view);
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
}
export class GhostTextContext extends Disposable {
    get currentPrettyViewState() {
        return this._currentPrettyViewState;
    }
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        this._register(autorun(reader => {
            /** @description update */
            const ghostText = model.primaryGhostText.read(reader);
            let view;
            if (ghostText) {
                view = ghostText.render(this.editor.getValue(), true);
            }
            else {
                view = this.editor.getValue();
            }
            if (this._currentPrettyViewState !== view) {
                this.prettyViewStates.push(view);
            }
            this._currentPrettyViewState = view;
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
    keyboardType(text) {
        this.editor.trigger('keyboard', 'type', { text });
    }
    cursorUp() {
        this.editor.runCommand(CoreNavigationCommands.CursorUp, null);
    }
    cursorRight() {
        this.editor.runCommand(CoreNavigationCommands.CursorRight, null);
    }
    cursorLeft() {
        this.editor.runCommand(CoreNavigationCommands.CursorLeft, null);
    }
    cursorDown() {
        this.editor.runCommand(CoreNavigationCommands.CursorDown, null);
    }
    cursorLineEnd() {
        this.editor.runCommand(CoreNavigationCommands.CursorLineEnd, null);
    }
    leftDelete() {
        this.editor.runCommand(CoreEditingCommands.DeleteLeft, null);
    }
}
export async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    return await runWithFakedTimers({
        useFakeTimers: options.fakeClock,
    }, async () => {
        const disposableStore = new DisposableStore();
        try {
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                if (!options.serviceCollection) {
                    options.serviceCollection = new ServiceCollection();
                }
                options.serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                options.serviceCollection.set(IAccessibilitySignalService, {
                    playSignal: async () => { },
                    isSoundEnabled(signal) { return false; },
                });
                const d = languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, options.provider);
                disposableStore.add(d);
            }
            let result;
            await withAsyncTestCodeEditor(text, options, async (editor, editorViewModel, instantiationService) => {
                const controller = instantiationService.createInstance(InlineCompletionsController, editor);
                controller.testOnlyDisableUi();
                const model = controller.model.get();
                const context = new GhostTextContext(model, editor);
                try {
                    result = await callback({ editor, editorViewModel, model, context, store: disposableStore });
                }
                finally {
                    context.dispose();
                    model.dispose();
                    controller.dispose();
                }
            });
            if (options.provider instanceof MockInlineCompletionsProvider) {
                options.provider.assertNotCalledTwiceWithin50ms();
            }
            return result;
        }
        finally {
            disposableStore.dispose();
        }
    });
}
export class AnnotatedString {
    constructor(src, annotations = ['↓']) {
        const markers = findMarkers(src, annotations);
        this.value = markers.textWithoutMarkers;
        this.markers = markers.results;
    }
    getMarkerOffset(markerIdx = 0) {
        if (markerIdx >= this.markers.length) {
            throw new BugIndicatingError(`Marker index ${markerIdx} out of bounds`);
        }
        return this.markers[markerIdx].idx;
    }
}
function findMarkers(text, markers) {
    const results = [];
    let textWithoutMarkers = '';
    markers.sort((a, b) => b.length - a.length);
    let pos = 0;
    for (let i = 0; i < text.length;) {
        let foundMarker = false;
        for (const marker of markers) {
            if (text.startsWith(marker, i)) {
                results.push({ mark: marker, idx: pos });
                i += marker.length;
                foundMarker = true;
                break;
            }
        }
        if (!foundMarker) {
            textWithoutMarkers += text[i];
            pos++;
            i++;
        }
    }
    return { results, textWithoutMarkers };
}
export class AnnotatedText extends AnnotatedString {
    constructor() {
        super(...arguments);
        this._transformer = new PositionOffsetTransformer(this.value);
    }
    getMarkerPosition(markerIdx = 0) {
        return this._transformer.getPosition(this.getMarkerOffset(markerIdx));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL3Rlc3QvYnJvd3Nlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUlsRyxPQUFPLEVBQXVELHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFMUksT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNoSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUVqRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxN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