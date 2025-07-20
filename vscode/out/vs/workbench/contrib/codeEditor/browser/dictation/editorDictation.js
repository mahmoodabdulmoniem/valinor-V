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
var EditorDictation_1;
import './editorDictation.css';
import { localize, localize2 } from '../../../../../nls.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { HasSpeechProvider, ISpeechService, SpeechToTextInProgress, SpeechToTextStatus } from '../../../speech/common/speechService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { EditorAction2, registerEditorContribution } from '../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { assertReturnsDefined } from '../../../../../base/common/types.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { toAction } from '../../../../../base/common/actions.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isWindows } from '../../../../../base/common/platform.js';
const EDITOR_DICTATION_IN_PROGRESS = new RawContextKey('editorDictation.inProgress', false);
const VOICE_CATEGORY = localize2('voiceCategory', "Voice");
export class EditorDictationStartAction extends EditorAction2 {
    constructor() {
        super({
            id: 'workbench.action.editorDictation.start',
            title: localize2('startDictation', "Start Dictation in Editor"),
            category: VOICE_CATEGORY,
            precondition: ContextKeyExpr.and(HasSpeechProvider, SpeechToTextInProgress.toNegated(), // disable when any speech-to-text is in progress
            EditorContextKeys.readOnly.toNegated() // disable in read-only editors
            ),
            f1: true,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 52 /* KeyCode.KeyV */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                secondary: isWindows ? [
                    512 /* KeyMod.Alt */ | 91 /* KeyCode.Backquote */
                ] : undefined
            }
        });
    }
    runEditorCommand(accessor, editor) {
        const keybindingService = accessor.get(IKeybindingService);
        const holdMode = keybindingService.enableKeybindingHoldMode(this.desc.id);
        if (holdMode) {
            let shouldCallStop = false;
            const handle = setTimeout(() => {
                shouldCallStop = true;
            }, 500);
            holdMode.finally(() => {
                clearTimeout(handle);
                if (shouldCallStop) {
                    EditorDictation.get(editor)?.stop();
                }
            });
        }
        EditorDictation.get(editor)?.start();
    }
}
export class EditorDictationStopAction extends EditorAction2 {
    static { this.ID = 'workbench.action.editorDictation.stop'; }
    constructor() {
        super({
            id: EditorDictationStopAction.ID,
            title: localize2('stopDictation', "Stop Dictation in Editor"),
            category: VOICE_CATEGORY,
            precondition: EDITOR_DICTATION_IN_PROGRESS,
            f1: true,
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100
            }
        });
    }
    runEditorCommand(_accessor, editor) {
        EditorDictation.get(editor)?.stop();
    }
}
export class DictationWidget extends Disposable {
    constructor(editor, keybindingService) {
        super();
        this.editor = editor;
        this.suppressMouseDown = true;
        this.allowEditorOverflow = true;
        this.domNode = document.createElement('div');
        const actionBar = this._register(new ActionBar(this.domNode));
        const stopActionKeybinding = keybindingService.lookupKeybinding(EditorDictationStopAction.ID)?.getLabel();
        actionBar.push(toAction({
            id: EditorDictationStopAction.ID,
            label: stopActionKeybinding ? localize('stopDictationShort1', "Stop Dictation ({0})", stopActionKeybinding) : localize('stopDictationShort2', "Stop Dictation"),
            class: ThemeIcon.asClassName(Codicon.micFilled),
            run: () => EditorDictation.get(editor)?.stop()
        }), { icon: true, label: false, keybinding: stopActionKeybinding });
        this.domNode.classList.add('editor-dictation-widget');
        this.domNode.appendChild(actionBar.domNode);
    }
    getId() {
        return 'editorDictation';
    }
    getDomNode() {
        return this.domNode;
    }
    getPosition() {
        if (!this.editor.hasModel()) {
            return null;
        }
        const selection = this.editor.getSelection();
        return {
            position: selection.getPosition(),
            preference: [
                selection.getPosition().equals(selection.getStartPosition()) ? 1 /* ContentWidgetPositionPreference.ABOVE */ : 2 /* ContentWidgetPositionPreference.BELOW */,
                0 /* ContentWidgetPositionPreference.EXACT */
            ]
        };
    }
    beforeRender() {
        const position = this.editor.getPosition();
        const lineHeight = position ? this.editor.getLineHeightForPosition(position) : this.editor.getOption(75 /* EditorOption.lineHeight */);
        const width = this.editor.getLayoutInfo().contentWidth * 0.7;
        this.domNode.style.setProperty('--vscode-editor-dictation-widget-height', `${lineHeight}px`);
        this.domNode.style.setProperty('--vscode-editor-dictation-widget-width', `${width}px`);
        return null;
    }
    show() {
        this.editor.addContentWidget(this);
    }
    layout() {
        this.editor.layoutContentWidget(this);
    }
    active() {
        this.domNode.classList.add('recording');
    }
    hide() {
        this.domNode.classList.remove('recording');
        this.editor.removeContentWidget(this);
    }
}
let EditorDictation = class EditorDictation extends Disposable {
    static { EditorDictation_1 = this; }
    static { this.ID = 'editorDictation'; }
    static get(editor) {
        return editor.getContribution(EditorDictation_1.ID);
    }
    constructor(editor, speechService, contextKeyService, keybindingService) {
        super();
        this.editor = editor;
        this.speechService = speechService;
        this.sessionDisposables = this._register(new MutableDisposable());
        this.widget = this._register(new DictationWidget(this.editor, keybindingService));
        this.editorDictationInProgress = EDITOR_DICTATION_IN_PROGRESS.bindTo(contextKeyService);
    }
    async start() {
        const disposables = new DisposableStore();
        this.sessionDisposables.value = disposables;
        this.widget.show();
        disposables.add(toDisposable(() => this.widget.hide()));
        this.editorDictationInProgress.set(true);
        disposables.add(toDisposable(() => this.editorDictationInProgress.reset()));
        const collection = this.editor.createDecorationsCollection();
        disposables.add(toDisposable(() => collection.clear()));
        disposables.add(this.editor.onDidChangeCursorPosition(() => this.widget.layout()));
        let previewStart = undefined;
        let lastReplaceTextLength = 0;
        const replaceText = (text, isPreview) => {
            if (!previewStart) {
                previewStart = assertReturnsDefined(this.editor.getPosition());
            }
            const endPosition = new Position(previewStart.lineNumber, previewStart.column + text.length);
            this.editor.executeEdits(EditorDictation_1.ID, [
                EditOperation.replace(Range.fromPositions(previewStart, previewStart.with(undefined, previewStart.column + lastReplaceTextLength)), text)
            ], [
                Selection.fromPositions(endPosition)
            ]);
            if (isPreview) {
                collection.set([
                    {
                        range: Range.fromPositions(previewStart, previewStart.with(undefined, previewStart.column + text.length)),
                        options: {
                            description: 'editor-dictation-preview',
                            inlineClassName: 'ghost-text-decoration-preview'
                        }
                    }
                ]);
            }
            else {
                collection.clear();
            }
            lastReplaceTextLength = text.length;
            if (!isPreview) {
                previewStart = undefined;
                lastReplaceTextLength = 0;
            }
            this.editor.revealPositionInCenterIfOutsideViewport(endPosition);
        };
        const cts = new CancellationTokenSource();
        disposables.add(toDisposable(() => cts.dispose(true)));
        const session = await this.speechService.createSpeechToTextSession(cts.token, 'editor');
        disposables.add(session.onDidChange(e => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            switch (e.status) {
                case SpeechToTextStatus.Started:
                    this.widget.active();
                    break;
                case SpeechToTextStatus.Stopped:
                    disposables.dispose();
                    break;
                case SpeechToTextStatus.Recognizing: {
                    if (!e.text) {
                        return;
                    }
                    replaceText(e.text, true);
                    break;
                }
                case SpeechToTextStatus.Recognized: {
                    if (!e.text) {
                        return;
                    }
                    replaceText(`${e.text} `, false);
                    break;
                }
            }
        }));
    }
    stop() {
        this.sessionDisposables.clear();
    }
};
EditorDictation = EditorDictation_1 = __decorate([
    __param(1, ISpeechService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService)
], EditorDictation);
export { EditorDictation };
registerEditorContribution(EditorDictation.ID, EditorDictation, 4 /* EditorContributionInstantiation.Lazy */);
registerAction2(EditorDictationStartAction);
registerAction2(EditorDictationStopAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRGljdGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvZGljdGF0aW9uL2VkaXRvckRpY3RhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTVELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3ZILE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekksT0FBTyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9JLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBSXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUEr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