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
var FrameCodeRenderer_1, MissingCodeRenderer_1, SkippedRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { assertNever } from '../../../../base/common/assert.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, transaction } from '../../../../base/common/observable.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ClickLinkGesture } from '../../../../editor/contrib/gotoSymbol/browser/link/clickLinkGesture.js';
import { localize, localize2 } from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { makeStackFrameColumnDecoration, TOP_STACK_FRAME_DECORATION } from './callStackEditorContribution.js';
import './media/callStackWidget.css';
export class CallStackFrame {
    constructor(name, source, line = 1, column = 1) {
        this.name = name;
        this.source = source;
        this.line = line;
        this.column = column;
    }
}
export class SkippedCallFrames {
    constructor(label, load) {
        this.label = label;
        this.load = load;
    }
}
export class CustomStackFrame {
    constructor() {
        this.showHeader = observableValue('CustomStackFrame.showHeader', true);
    }
}
class WrappedCallStackFrame extends CallStackFrame {
    constructor(original) {
        super(original.name, original.source, original.line, original.column);
        this.editorHeight = observableValue('WrappedCallStackFrame.height', this.source ? 100 : 0);
        this.collapsed = observableValue('WrappedCallStackFrame.collapsed', false);
        this.height = derived(reader => {
            return this.collapsed.read(reader) ? CALL_STACK_WIDGET_HEADER_HEIGHT : CALL_STACK_WIDGET_HEADER_HEIGHT + this.editorHeight.read(reader);
        });
    }
}
class WrappedCustomStackFrame {
    constructor(original) {
        this.original = original;
        this.collapsed = observableValue('WrappedCallStackFrame.collapsed', false);
        this.height = derived(reader => {
            const headerHeight = this.original.showHeader.read(reader) ? CALL_STACK_WIDGET_HEADER_HEIGHT : 0;
            return this.collapsed.read(reader) ? headerHeight : headerHeight + this.original.height.read(reader);
        });
    }
}
const isFrameLike = (item) => item instanceof WrappedCallStackFrame || item instanceof WrappedCustomStackFrame;
const WIDGET_CLASS_NAME = 'multiCallStackWidget';
/**
 * A reusable widget that displays a call stack as a series of editors. Note
 * that this both used in debug's exception widget as well as in the testing
 * call stack view.
 */
let CallStackWidget = class CallStackWidget extends Disposable {
    get onDidChangeContentHeight() {
        return this.list.onDidChangeContentHeight;
    }
    get onDidScroll() {
        return this.list.onDidScroll;
    }
    get contentHeight() {
        return this.list.contentHeight;
    }
    constructor(container, containingEditor, instantiationService) {
        super();
        this.layoutEmitter = this._register(new Emitter());
        this.currentFramesDs = this._register(new DisposableStore());
        container.classList.add(WIDGET_CLASS_NAME);
        this._register(toDisposable(() => container.classList.remove(WIDGET_CLASS_NAME)));
        this.list = this._register(instantiationService.createInstance(WorkbenchList, 'TestResultStackWidget', container, new StackDelegate(), [
            instantiationService.createInstance(FrameCodeRenderer, containingEditor, this.layoutEmitter.event),
            instantiationService.createInstance(MissingCodeRenderer),
            instantiationService.createInstance(CustomRenderer),
            instantiationService.createInstance(SkippedRenderer, (i) => this.loadFrame(i)),
        ], {
            multipleSelectionSupport: false,
            mouseSupport: false,
            keyboardSupport: false,
            setRowLineHeight: false,
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: instantiationService.createInstance(StackAccessibilityProvider),
        }));
    }
    /** Replaces the call frames display in the view. */
    setFrames(frames) {
        // cancel any existing load
        this.currentFramesDs.clear();
        this.cts = new CancellationTokenSource();
        this._register(toDisposable(() => this.cts.dispose(true)));
        this.list.splice(0, this.list.length, this.mapFrames(frames));
    }
    layout(height, width) {
        this.list.layout(height, width);
        this.layoutEmitter.fire();
    }
    collapseAll() {
        transaction(tx => {
            for (let i = 0; i < this.list.length; i++) {
                const frame = this.list.element(i);
                if (isFrameLike(frame)) {
                    frame.collapsed.set(true, tx);
                }
            }
        });
    }
    async loadFrame(replacing) {
        if (!this.cts) {
            return;
        }
        const frames = await replacing.load(this.cts.token);
        if (this.cts.token.isCancellationRequested) {
            return;
        }
        const index = this.list.indexOf(replacing);
        this.list.splice(index, 1, this.mapFrames(frames));
    }
    mapFrames(frames) {
        const result = [];
        for (const frame of frames) {
            if (frame instanceof SkippedCallFrames) {
                result.push(frame);
                continue;
            }
            const wrapped = frame instanceof CustomStackFrame
                ? new WrappedCustomStackFrame(frame) : new WrappedCallStackFrame(frame);
            result.push(wrapped);
            this.currentFramesDs.add(autorun(reader => {
                const height = wrapped.height.read(reader);
                const idx = this.list.indexOf(wrapped);
                if (idx !== -1) {
                    this.list.updateElementHeight(idx, height);
                }
            }));
        }
        return result;
    }
};
CallStackWidget = __decorate([
    __param(2, IInstantiationService)
], CallStackWidget);
export { CallStackWidget };
let StackAccessibilityProvider = class StackAccessibilityProvider {
    constructor(labelService) {
        this.labelService = labelService;
    }
    getAriaLabel(e) {
        if (e instanceof SkippedCallFrames) {
            return e.label;
        }
        if (e instanceof WrappedCustomStackFrame) {
            return e.original.label;
        }
        if (e instanceof CallStackFrame) {
            if (e.source && e.line) {
                return localize({
                    comment: ['{0} is an extension-defined label, then line number and filename'],
                    key: 'stackTraceLabel',
                }, '{0}, line {1} in {2}', e.name, e.line, this.labelService.getUriLabel(e.source, { relative: true }));
            }
            return e.name;
        }
        assertNever(e);
    }
    getWidgetAriaLabel() {
        return localize('stackTrace', 'Stack Trace');
    }
};
StackAccessibilityProvider = __decorate([
    __param(0, ILabelService)
], StackAccessibilityProvider);
class StackDelegate {
    getHeight(element) {
        if (element instanceof CallStackFrame || element instanceof WrappedCustomStackFrame) {
            return element.height.get();
        }
        if (element instanceof SkippedCallFrames) {
            return CALL_STACK_WIDGET_HEADER_HEIGHT;
        }
        assertNever(element);
    }
    getTemplateId(element) {
        if (element instanceof CallStackFrame) {
            return element.source ? FrameCodeRenderer.templateId : MissingCodeRenderer.templateId;
        }
        if (element instanceof SkippedCallFrames) {
            return SkippedRenderer.templateId;
        }
        if (element instanceof WrappedCustomStackFrame) {
            return CustomRenderer.templateId;
        }
        assertNever(element);
    }
}
const editorOptions = {
    scrollBeyondLastLine: false,
    scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        handleMouseWheel: false,
        useShadows: false,
    },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
    overviewRulerBorder: false,
    stickyScroll: { enabled: false },
    minimap: { enabled: false },
    readOnly: true,
    automaticLayout: false,
};
const makeFrameElements = () => dom.h('div.multiCallStackFrame', [
    dom.h('div.header@header', [
        dom.h('div.collapse-button@collapseButton'),
        dom.h('div.title.show-file-icons@title'),
        dom.h('div.actions@actions'),
    ]),
    dom.h('div.editorParent', [
        dom.h('div.editorContainer@editor'),
    ])
]);
export const CALL_STACK_WIDGET_HEADER_HEIGHT = 24;
let AbstractFrameRenderer = class AbstractFrameRenderer {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    renderTemplate(container) {
        const elements = makeFrameElements();
        container.appendChild(elements.root);
        const templateStore = new DisposableStore();
        container.classList.add('multiCallStackFrameContainer');
        templateStore.add(toDisposable(() => {
            container.classList.remove('multiCallStackFrameContainer');
            elements.root.remove();
        }));
        const label = templateStore.add(this.instantiationService.createInstance(ResourceLabel, elements.title, {}));
        const collapse = templateStore.add(new Button(elements.collapseButton, {}));
        const contentId = generateUuid();
        elements.editor.id = contentId;
        elements.editor.role = 'region';
        elements.collapseButton.setAttribute('aria-controls', contentId);
        return this.finishRenderTemplate({
            container,
            decorations: [],
            elements,
            label,
            collapse,
            elementStore: templateStore.add(new DisposableStore()),
            templateStore,
        });
    }
    renderElement(element, index, template) {
        const { elementStore } = template;
        elementStore.clear();
        const item = element;
        this.setupCollapseButton(item, template);
    }
    setupCollapseButton(item, { elementStore, elements, collapse }) {
        elementStore.add(autorun(reader => {
            collapse.element.className = '';
            const collapsed = item.collapsed.read(reader);
            collapse.icon = collapsed ? Codicon.chevronRight : Codicon.chevronDown;
            collapse.element.ariaExpanded = String(!collapsed);
            elements.root.classList.toggle('collapsed', collapsed);
        }));
        const toggleCollapse = () => item.collapsed.set(!item.collapsed.get(), undefined);
        elementStore.add(collapse.onDidClick(toggleCollapse));
        elementStore.add(dom.addDisposableListener(elements.title, 'click', toggleCollapse));
    }
    disposeElement(element, index, templateData) {
        templateData.elementStore.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateStore.dispose();
    }
};
AbstractFrameRenderer = __decorate([
    __param(0, IInstantiationService)
], AbstractFrameRenderer);
const CONTEXT_LINES = 2;
/** Renderer for a normal stack frame where code is available. */
let FrameCodeRenderer = class FrameCodeRenderer extends AbstractFrameRenderer {
    static { FrameCodeRenderer_1 = this; }
    static { this.templateId = 'f'; }
    constructor(containingEditor, onLayout, modelService, instantiationService) {
        super(instantiationService);
        this.containingEditor = containingEditor;
        this.onLayout = onLayout;
        this.modelService = modelService;
        this.templateId = FrameCodeRenderer_1.templateId;
    }
    finishRenderTemplate(data) {
        // override default e.g. language contributions, only allow users to click
        // on code in the call stack to go to its source location
        const contributions = [{
                id: ClickToLocationContribution.ID,
                instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */,
                ctor: ClickToLocationContribution,
            }];
        const editor = this.containingEditor
            ? this.instantiationService.createInstance(EmbeddedCodeEditorWidget, data.elements.editor, editorOptions, { isSimpleWidget: true, contributions }, this.containingEditor)
            : this.instantiationService.createInstance(CodeEditorWidget, data.elements.editor, editorOptions, { isSimpleWidget: true, contributions });
        data.templateStore.add(editor);
        const toolbar = data.templateStore.add(this.instantiationService.createInstance(MenuWorkbenchToolBar, data.elements.actions, MenuId.DebugCallStackToolbar, {
            menuOptions: { shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => createActionViewItem(this.instantiationService, action, options),
        }));
        return { ...data, editor, toolbar };
    }
    renderElement(element, index, template) {
        super.renderElement(element, index, template);
        const { elementStore, editor } = template;
        const item = element;
        const uri = item.source;
        template.label.element.setFile(uri);
        const cts = new CancellationTokenSource();
        elementStore.add(toDisposable(() => cts.dispose(true)));
        this.modelService.createModelReference(uri).then(reference => {
            if (cts.token.isCancellationRequested) {
                return reference.dispose();
            }
            elementStore.add(reference);
            editor.setModel(reference.object.textEditorModel);
            this.setupEditorAfterModel(item, template);
            this.setupEditorLayout(item, template);
        });
    }
    setupEditorLayout(item, { elementStore, container, editor }) {
        const layout = () => {
            const prev = editor.getContentHeight();
            editor.layout({ width: container.clientWidth, height: prev });
            const next = editor.getContentHeight();
            if (next !== prev) {
                editor.layout({ width: container.clientWidth, height: next });
            }
            item.editorHeight.set(next, undefined);
        };
        elementStore.add(editor.onDidChangeModelDecorations(layout));
        elementStore.add(editor.onDidChangeModelContent(layout));
        elementStore.add(editor.onDidChangeModelOptions(layout));
        elementStore.add(this.onLayout(layout));
        layout();
    }
    setupEditorAfterModel(item, template) {
        const range = Range.fromPositions({
            column: item.column ?? 1,
            lineNumber: item.line ?? 1,
        });
        template.toolbar.context = { uri: item.source, range };
        template.editor.setHiddenAreas([
            Range.fromPositions({ column: 1, lineNumber: 1 }, { column: 1, lineNumber: Math.max(1, item.line - CONTEXT_LINES - 1) }),
            Range.fromPositions({ column: 1, lineNumber: item.line + CONTEXT_LINES + 1 }, { column: 1, lineNumber: 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */ }),
        ]);
        template.editor.changeDecorations(accessor => {
            for (const d of template.decorations) {
                accessor.removeDecoration(d);
            }
            template.decorations.length = 0;
            const beforeRange = range.setStartPosition(range.startLineNumber, 1);
            const hasCharactersBefore = !!template.editor.getModel()?.getValueInRange(beforeRange).trim();
            const decoRange = range.setEndPosition(range.startLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            template.decorations.push(accessor.addDecoration(decoRange, makeStackFrameColumnDecoration(!hasCharactersBefore)));
            template.decorations.push(accessor.addDecoration(decoRange, TOP_STACK_FRAME_DECORATION));
        });
        item.editorHeight.set(template.editor.getContentHeight(), undefined);
    }
};
FrameCodeRenderer = FrameCodeRenderer_1 = __decorate([
    __param(2, ITextModelService),
    __param(3, IInstantiationService)
], FrameCodeRenderer);
/** Renderer for a call frame that's missing a URI */
let MissingCodeRenderer = class MissingCodeRenderer {
    static { MissingCodeRenderer_1 = this; }
    static { this.templateId = 'm'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.templateId = MissingCodeRenderer_1.templateId;
    }
    renderTemplate(container) {
        const elements = makeFrameElements();
        elements.root.classList.add('missing');
        container.appendChild(elements.root);
        const label = this.instantiationService.createInstance(ResourceLabel, elements.title, {});
        return { elements, label };
    }
    renderElement(element, _index, templateData) {
        const cast = element;
        templateData.label.element.setResource({
            name: cast.name,
            description: localize('stackFrameLocation', 'Line {0} column {1}', cast.line, cast.column),
            range: { startLineNumber: cast.line, startColumn: cast.column, endColumn: cast.column, endLineNumber: cast.line },
        }, {
            icon: Codicon.fileBinary,
        });
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
        templateData.elements.root.remove();
    }
};
MissingCodeRenderer = MissingCodeRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], MissingCodeRenderer);
/** Renderer for a call frame that's missing a URI */
class CustomRenderer extends AbstractFrameRenderer {
    constructor() {
        super(...arguments);
        this.templateId = CustomRenderer.templateId;
    }
    static { this.templateId = 'c'; }
    finishRenderTemplate(data) {
        return data;
    }
    renderElement(element, index, template) {
        super.renderElement(element, index, template);
        const item = element;
        const { elementStore, container, label } = template;
        label.element.setResource({ name: item.original.label }, { icon: item.original.icon });
        elementStore.add(autorun(reader => {
            template.elements.header.style.display = item.original.showHeader.read(reader) ? '' : 'none';
        }));
        elementStore.add(autorunWithStore((reader, store) => {
            if (!item.collapsed.read(reader)) {
                store.add(item.original.render(container));
            }
        }));
        const actions = item.original.renderActions?.(template.elements.actions);
        if (actions) {
            elementStore.add(actions);
        }
    }
}
/** Renderer for a button to load more call frames */
let SkippedRenderer = class SkippedRenderer {
    static { SkippedRenderer_1 = this; }
    static { this.templateId = 's'; }
    constructor(loadFrames, notificationService) {
        this.loadFrames = loadFrames;
        this.notificationService = notificationService;
        this.templateId = SkippedRenderer_1.templateId;
    }
    renderTemplate(container) {
        const store = new DisposableStore();
        const button = new Button(container, { title: '', ...defaultButtonStyles });
        const data = { button, store };
        store.add(button);
        store.add(button.onDidClick(() => {
            if (!data.current || !button.enabled) {
                return;
            }
            button.enabled = false;
            this.loadFrames(data.current).catch(e => {
                this.notificationService.error(localize('failedToLoadFrames', 'Failed to load stack frames: {0}', e.message));
            });
        }));
        return data;
    }
    renderElement(element, index, templateData) {
        const cast = element;
        templateData.button.enabled = true;
        templateData.button.label = cast.label;
        templateData.current = cast;
    }
    disposeTemplate(templateData) {
        templateData.store.dispose();
    }
};
SkippedRenderer = SkippedRenderer_1 = __decorate([
    __param(1, INotificationService)
], SkippedRenderer);
/** A simple contribution that makes all data in the editor clickable to go to the location */
let ClickToLocationContribution = class ClickToLocationContribution extends Disposable {
    static { this.ID = 'clickToLocation'; }
    constructor(editor, editorService) {
        super();
        this.editor = editor;
        this.linkDecorations = editor.createDecorationsCollection();
        this._register(toDisposable(() => this.linkDecorations.clear()));
        const clickLinkGesture = this._register(new ClickLinkGesture(editor));
        this._register(clickLinkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this.onMove(mouseEvent);
        }));
        this._register(clickLinkGesture.onExecute((e) => {
            const model = this.editor.getModel();
            if (!this.current || !model) {
                return;
            }
            editorService.openEditor({
                resource: model.uri,
                options: {
                    selection: Range.fromPositions(new Position(this.current.line, this.current.word.startColumn)),
                    selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
                },
            }, e.hasSideBySideModifier ? SIDE_GROUP : undefined);
        }));
    }
    onMove(mouseEvent) {
        if (!mouseEvent.hasTriggerModifier) {
            return this.clear();
        }
        const position = mouseEvent.target.position;
        const word = position && this.editor.getModel()?.getWordAtPosition(position);
        if (!word) {
            return this.clear();
        }
        const prev = this.current?.word;
        if (prev && prev.startColumn === word.startColumn && prev.endColumn === word.endColumn && prev.word === word.word) {
            return;
        }
        this.current = { word, line: position.lineNumber };
        this.linkDecorations.set([{
                range: new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                options: {
                    description: 'call-stack-go-to-file-link',
                    inlineClassName: 'call-stack-go-to-file-link',
                },
            }]);
    }
    clear() {
        this.linkDecorations.clear();
        this.current = undefined;
    }
};
ClickToLocationContribution = __decorate([
    __param(1, IEditorService)
], ClickToLocationContribution);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'callStackWidget.goToFile',
            title: localize2('goToFile', 'Open File'),
            icon: Codicon.goToFile,
            menu: {
                id: MenuId.DebugCallStackToolbar,
                order: 22,
                group: 'navigation',
            },
        });
    }
    async run(accessor, { uri, range }) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            resource: uri,
            options: {
                selection: range,
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2NhbGxTdGFja1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFvQyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFJM0osT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBRXBILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUF1QixNQUFNLHdFQUF3RSxDQUFDO0FBQy9ILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDdkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDOUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUcsT0FBTyw2QkFBNkIsQ0FBQztBQUdyQyxNQUFNLE9BQU8sY0FBYztJQUMxQixZQUNpQixJQUFZLEVBQ1osTUFBWSxFQUNaLE9BQU8sQ0FBQyxFQUNSLFNBQVMsQ0FBQztRQUhWLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixXQUFNLEdBQU4sTUFBTSxDQUFNO1FBQ1osU0FBSSxHQUFKLElBQUksQ0FBSTtRQUNSLFdBQU0sR0FBTixNQUFNLENBQUk7SUFDdkIsQ0FBQztDQUNMO0FBRUQsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixZQUNpQixLQUFhLEVBQ2IsSUFBNEQ7UUFENUQsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFNBQUksR0FBSixJQUFJLENBQXdEO0lBQ3pFLENBQUM7Q0FDTDtBQUVELE1BQU0sT0FBZ0IsZ0JBQWdCO0lBQXRDO1FBQ2lCLGVBQVUsR0FBRyxlQUFlLENBQUMsNkJBQTZCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFNbkYsQ0FBQztDQUFBO0FBU0QsTUFBTSxxQkFBc0IsU0FBUSxjQUFjO0lBUWpELFlBQVksUUFBd0I7UUFDbkMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQVJ2RCxpQkFBWSxHQUFHLGVBQWUsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLGNBQVMsR0FBRyxlQUFlLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdEUsV0FBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekksQ0FBQyxDQUFDLENBQUM7SUFJSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLHVCQUF1QjtJQVE1QixZQUE0QixRQUEwQjtRQUExQixhQUFRLEdBQVIsUUFBUSxDQUFrQjtRQVB0QyxjQUFTLEdBQUcsZUFBZSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXRFLFdBQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDekMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pHLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RyxDQUFDLENBQUMsQ0FBQztJQUV1RCxDQUFDO0NBQzNEO0FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFhLEVBQTBCLEVBQUUsQ0FDN0QsSUFBSSxZQUFZLHFCQUFxQixJQUFJLElBQUksWUFBWSx1QkFBdUIsQ0FBQztBQUlsRixNQUFNLGlCQUFpQixHQUFHLHNCQUFzQixDQUFDO0FBRWpEOzs7O0dBSUc7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUFNOUMsSUFBVyx3QkFBd0I7UUFDbEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDO0lBQzNDLENBQUM7SUFFRCxJQUFXLFdBQVc7UUFDckIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDaEMsQ0FBQztJQUVELFlBQ0MsU0FBc0IsRUFDdEIsZ0JBQXlDLEVBQ2xCLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQztRQXJCUSxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3BELG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFzQnhFLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEYsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDN0QsYUFBYSxFQUNiLHVCQUF1QixFQUN2QixTQUFTLEVBQ1QsSUFBSSxhQUFhLEVBQUUsRUFDbkI7WUFDQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7WUFDbEcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDO1lBQ3hELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7WUFDbkQsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5RSxFQUNEO1lBQ0Msd0JBQXdCLEVBQUUsS0FBSztZQUMvQixZQUFZLEVBQUUsS0FBSztZQUNuQixlQUFlLEVBQUUsS0FBSztZQUN0QixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLHVCQUF1QixFQUFFLEtBQUs7WUFDOUIscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDO1NBQ3RGLENBQzBCLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRUQsb0RBQW9EO0lBQzdDLFNBQVMsQ0FBQyxNQUF1QjtRQUN2QywyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU0sTUFBTSxDQUFDLE1BQWUsRUFBRSxLQUFjO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFTSxXQUFXO1FBQ2pCLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3hCLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQTRCO1FBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDZixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BELElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUM1QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyxTQUFTLENBQUMsTUFBdUI7UUFDeEMsTUFBTSxNQUFNLEdBQWUsRUFBRSxDQUFDO1FBQzlCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7WUFDNUIsSUFBSSxLQUFLLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkIsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLFlBQVksZ0JBQWdCO2dCQUNoRCxDQUFDLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6RSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXJCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0NBQ0QsQ0FBQTtBQWpIWSxlQUFlO0lBcUJ6QixXQUFBLHFCQUFxQixDQUFBO0dBckJYLGVBQWUsQ0FpSDNCOztBQUVELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTBCO0lBQy9CLFlBQTRDLFlBQTJCO1FBQTNCLGlCQUFZLEdBQVosWUFBWSxDQUFlO0lBQUksQ0FBQztJQUU1RSxZQUFZLENBQUMsQ0FBVztRQUN2QixJQUFJLENBQUMsWUFBWSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNoQixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksdUJBQXVCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxjQUFjLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4QixPQUFPLFFBQVEsQ0FBQztvQkFDZixPQUFPLEVBQUUsQ0FBQyxrRUFBa0UsQ0FBQztvQkFDN0UsR0FBRyxFQUFFLGlCQUFpQjtpQkFDdEIsRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekcsQ0FBQztZQUVELE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNmLENBQUM7UUFFRCxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEIsQ0FBQztJQUNELGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNELENBQUE7QUE1QkssMEJBQTBCO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0dBRHJCLDBCQUEwQixDQTRCL0I7QUFFRCxNQUFNLGFBQWE7SUFDbEIsU0FBUyxDQUFDLE9BQWlCO1FBQzFCLElBQUksT0FBTyxZQUFZLGNBQWMsSUFBSSxPQUFPLFlBQVksdUJBQXVCLEVBQUUsQ0FBQztZQUNyRixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLGlCQUFpQixFQUFFLENBQUM7WUFDMUMsT0FBTywrQkFBK0IsQ0FBQztRQUN4QyxDQUFDO1FBRUQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBaUI7UUFDOUIsSUFBSSxPQUFPLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDdkMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQztRQUN2RixDQUFDO1FBQ0QsSUFBSSxPQUFPLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLGVBQWUsQ0FBQyxVQUFVLENBQUM7UUFDbkMsQ0FBQztRQUNELElBQUksT0FBTyxZQUFZLHVCQUF1QixFQUFFLENBQUM7WUFDaEQsT0FBTyxjQUFjLENBQUMsVUFBVSxDQUFDO1FBQ2xDLENBQUM7UUFFRCxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBT0QsTUFBTSxhQUFhLEdBQW1CO0lBQ3JDLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsU0FBUyxFQUFFO1FBQ1YsUUFBUSxFQUFFLFFBQVE7UUFDbEIsVUFBVSxFQUFFLFFBQVE7UUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztRQUN2QixVQUFVLEVBQUUsS0FBSztLQUNqQjtJQUNELGtCQUFrQixFQUFFLENBQUM7SUFDckIsb0JBQW9CLEVBQUUsSUFBSTtJQUMxQixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7SUFDaEMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtJQUMzQixRQUFRLEVBQUUsSUFBSTtJQUNkLGVBQWUsRUFBRSxLQUFLO0NBQ3RCLENBQUM7QUFFRixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMseUJBQXlCLEVBQUU7SUFDaEUsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRTtRQUMxQixHQUFHLENBQUMsQ0FBQyxDQUFDLG9DQUFvQyxDQUFDO1FBQzNDLEdBQUcsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUM7UUFDeEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztLQUM1QixDQUFDO0lBRUYsR0FBRyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsRUFBRTtRQUN6QixHQUFHLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDO0tBQ25DLENBQUM7Q0FDRixDQUFDLENBQUM7QUFFSCxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxFQUFFLENBQUM7QUFZbEQsSUFBZSxxQkFBcUIsR0FBcEMsTUFBZSxxQkFBcUI7SUFHbkMsWUFDMkMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDbEYsQ0FBQztJQUVMLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3JDLFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBR3JDLE1BQU0sYUFBYSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDNUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUN4RCxhQUFhLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbkMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUMzRCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RSxNQUFNLFNBQVMsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUNqQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFDL0IsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1FBQ2hDLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVqRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztZQUNoQyxTQUFTO1lBQ1QsV0FBVyxFQUFFLEVBQUU7WUFDZixRQUFRO1lBQ1IsS0FBSztZQUNMLFFBQVE7WUFDUixZQUFZLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3RELGFBQWE7U0FDYixDQUFDLENBQUM7SUFDSixDQUFDO0lBSUQsYUFBYSxDQUFDLE9BQWlCLEVBQUUsS0FBYSxFQUFFLFFBQVc7UUFDMUQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLFFBQVEsQ0FBQztRQUNsQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsTUFBTSxJQUFJLEdBQUcsT0FBeUIsQ0FBQztRQUV2QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxJQUFvQixFQUFFLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUs7UUFDeEYsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQ3ZFLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRixZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUN0RCxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxjQUFjLENBQUMsT0FBaUIsRUFBRSxLQUFhLEVBQUUsWUFBZTtRQUMvRCxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBZTtRQUM5QixZQUFZLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RDLENBQUM7Q0FDRCxDQUFBO0FBckVjLHFCQUFxQjtJQUlqQyxXQUFBLHFCQUFxQixDQUFBO0dBSlQscUJBQXFCLENBcUVuQztBQUVELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztBQUV4QixpRUFBaUU7QUFDakUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxxQkFBeUM7O2FBQ2pELGVBQVUsR0FBRyxHQUFHLEFBQU4sQ0FBTztJQUl4QyxZQUNrQixnQkFBeUMsRUFDekMsUUFBcUIsRUFDbkIsWUFBZ0QsRUFDNUMsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBTFgscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtRQUN6QyxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ0YsaUJBQVksR0FBWixZQUFZLENBQW1CO1FBTHBELGVBQVUsR0FBRyxtQkFBaUIsQ0FBQyxVQUFVLENBQUM7SUFTMUQsQ0FBQztJQUVrQixvQkFBb0IsQ0FBQyxJQUF3QztRQUMvRSwwRUFBMEU7UUFDMUUseURBQXlEO1FBQ3pELE1BQU0sYUFBYSxHQUFxQyxDQUFDO2dCQUN4RCxFQUFFLEVBQUUsMkJBQTJCLENBQUMsRUFBRTtnQkFDbEMsYUFBYSxnRUFBd0Q7Z0JBQ3JFLElBQUksRUFBRSwyQkFBcUQ7YUFDM0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGdCQUFnQjtZQUNuQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDekMsd0JBQXdCLEVBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUNwQixhQUFhLEVBQ2IsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUN2QyxJQUFJLENBQUMsZ0JBQWdCLENBQ3JCO1lBQ0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3pDLGdCQUFnQixFQUNoQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDcEIsYUFBYSxFQUNiLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FDdkMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRS9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLHFCQUFxQixFQUFFO1lBQzFKLFdBQVcsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRTtZQUN4QyxzQkFBc0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDO1NBQzdHLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxFQUFFLEdBQUcsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQWlCLEVBQUUsS0FBYSxFQUFFLFFBQTRCO1FBQ3BGLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUU5QyxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQztRQUUxQyxNQUFNLElBQUksR0FBRyxPQUFnQyxDQUFDO1FBQzlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFPLENBQUM7UUFFekIsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUMxQyxZQUFZLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1RCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsQ0FBQztZQUVELFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDNUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxJQUEyQixFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQXNCO1FBQzdHLE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNuQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFFOUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMvRCxDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQztRQUNGLFlBQVksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDN0QsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6RCxZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pELFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sRUFBRSxDQUFDO0lBQ1YsQ0FBQztJQUVPLHFCQUFxQixDQUFDLElBQTJCLEVBQUUsUUFBNEI7UUFDdEYsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUNqQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDO1lBQ3hCLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUV2RCxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztZQUM5QixLQUFLLENBQUMsYUFBYSxDQUNsQixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUM1QixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQ3JFO1lBQ0QsS0FBSyxDQUFDLGFBQWEsQ0FDbEIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsR0FBRyxDQUFDLEVBQUUsRUFDeEQsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsbURBQWtDLEVBQUUsQ0FDM0Q7U0FDRCxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzVDLEtBQUssTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUVoQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyRSxNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5RixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxlQUFlLG9EQUFtQyxDQUFDO1lBRWhHLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQy9DLFNBQVMsRUFDVCw4QkFBOEIsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQ3BELENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQy9DLFNBQVMsRUFDVCwwQkFBMEIsQ0FDMUIsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdEUsQ0FBQzs7QUFsSUksaUJBQWlCO0lBUXBCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQVRsQixpQkFBaUIsQ0FtSXRCO0FBT0QscURBQXFEO0FBQ3JELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COzthQUNELGVBQVUsR0FBRyxHQUFHLEFBQU4sQ0FBTztJQUd4QyxZQUFtQyxvQkFBNEQ7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUYvRSxlQUFVLEdBQUcscUJBQW1CLENBQUMsVUFBVSxDQUFDO0lBRXVDLENBQUM7SUFFcEcsY0FBYyxDQUFDLFNBQXNCO1FBQ3BDLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDckMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWlCLEVBQUUsTUFBYyxFQUFFLFlBQWtDO1FBQ2xGLE1BQU0sSUFBSSxHQUFHLE9BQXlCLENBQUM7UUFDdkMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQ3RDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzFGLEtBQUssRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFO1NBQ2pILEVBQUU7WUFDRixJQUFJLEVBQUUsT0FBTyxDQUFDLFVBQVU7U0FDeEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFrQztRQUNqRCxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzdCLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JDLENBQUM7O0FBNUJJLG1CQUFtQjtJQUlYLFdBQUEscUJBQXFCLENBQUE7R0FKN0IsbUJBQW1CLENBNkJ4QjtBQUVELHFEQUFxRDtBQUNyRCxNQUFNLGNBQWUsU0FBUSxxQkFBeUQ7SUFBdEY7O1FBRWlCLGVBQVUsR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDO0lBNkJ4RCxDQUFDO2FBOUJ1QixlQUFVLEdBQUcsR0FBRyxBQUFOLENBQU87SUFHckIsb0JBQW9CLENBQUMsSUFBd0M7UUFDL0UsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQWlCLEVBQUUsS0FBYSxFQUFFLFFBQTRDO1FBQ3BHLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUU5QyxNQUFNLElBQUksR0FBRyxPQUFrQyxDQUFDO1FBQ2hELE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLFFBQVEsQ0FBQztRQUVwRCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUV2RixZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNqQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDOUYsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLFlBQVksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6RSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQzs7QUFTRixxREFBcUQ7QUFDckQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTs7YUFDRyxlQUFVLEdBQUcsR0FBRyxBQUFOLENBQU87SUFHeEMsWUFDa0IsVUFBMEQsRUFDckQsbUJBQTBEO1FBRC9ELGVBQVUsR0FBVixVQUFVLENBQWdEO1FBQ3BDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFKakUsZUFBVSxHQUFHLGlCQUFlLENBQUMsVUFBVSxDQUFDO0lBS3BELENBQUM7SUFFTCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sSUFBSSxHQUF5QixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUVyRCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xCLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU87WUFDUixDQUFDO1lBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUN2QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxrQ0FBa0MsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMvRyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxhQUFhLENBQUMsT0FBaUIsRUFBRSxLQUFhLEVBQUUsWUFBa0M7UUFDakYsTUFBTSxJQUFJLEdBQUcsT0FBNEIsQ0FBQztRQUMxQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDbkMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN2QyxZQUFZLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQWtDO1FBQ2pELFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDOUIsQ0FBQzs7QUF0Q0ksZUFBZTtJQU1sQixXQUFBLG9CQUFvQixDQUFBO0dBTmpCLGVBQWUsQ0F1Q3BCO0FBRUQsOEZBQThGO0FBQzlGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTthQUM1QixPQUFFLEdBQUcsaUJBQWlCLEFBQXBCLENBQXFCO0lBSTlDLFlBQ2tCLE1BQW1CLEVBQ3BCLGFBQTZCO1FBRTdDLEtBQUssRUFBRSxDQUFDO1FBSFMsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUlwQyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFdEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxFQUFFLEVBQUU7WUFDNUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzdCLE9BQU87WUFDUixDQUFDO1lBRUQsYUFBYSxDQUFDLFVBQVUsQ0FBQztnQkFDeEIsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHO2dCQUNuQixPQUFPLEVBQUU7b0JBQ1IsU0FBUyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQzlGLG1CQUFtQiwrREFBdUQ7aUJBQzFFO2FBQ0QsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxNQUFNLENBQUMsVUFBK0I7UUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUM1QyxNQUFNLElBQUksR0FBRyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7UUFDaEMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNuSCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNuRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN6QixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDNUYsT0FBTyxFQUFFO29CQUNSLFdBQVcsRUFBRSw0QkFBNEI7b0JBQ3pDLGVBQWUsRUFBRSw0QkFBNEI7aUJBQzdDO2FBQ0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSztRQUNaLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7SUFDMUIsQ0FBQzs7QUEvREksMkJBQTJCO0lBTzlCLFdBQUEsY0FBYyxDQUFBO0dBUFgsMkJBQTJCLENBZ0VoQztBQUVELGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ3pDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtZQUN0QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxxQkFBcUI7Z0JBQ2hDLEtBQUssRUFBRSxFQUFFO2dCQUNULEtBQUssRUFBRSxZQUFZO2FBQ25CO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQVk7UUFDN0QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7WUFDOUIsUUFBUSxFQUFFLEdBQUc7WUFDYixPQUFPLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLG1CQUFtQiwrREFBdUQ7YUFDMUU7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=