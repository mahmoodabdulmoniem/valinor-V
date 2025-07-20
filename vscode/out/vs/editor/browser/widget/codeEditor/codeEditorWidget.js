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
var CodeEditorWidget_1;
import '../../services/markerDecorations.js';
import * as dom from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, createEventDeliveryQueue } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import './editor.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { EditorConfiguration } from '../../config/editorConfiguration.js';
import { TabFocus } from '../../config/tabFocus.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { View } from '../../view.js';
import { DOMLineBreaksComputerFactory } from '../../view/domLineBreaksComputer.js';
import { ViewUserInputEvents } from '../../view/viewUserInputEvents.js';
import { CodeEditorContributions } from './codeEditorContributions.js';
import { filterFontDecorations, filterValidationDecorations } from '../../../common/config/editorOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { editorUnnecessaryCodeOpacity } from '../../../common/core/editorColorRegistry.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { InternalEditorAction } from '../../../common/editorAction.js';
import * as editorCommon from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { editorErrorForeground, editorHintForeground, editorInfoForeground, editorWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { TextModelEditSource, EditSources } from '../../../common/textModelEditSource.js';
let CodeEditorWidget = class CodeEditorWidget extends Disposable {
    static { CodeEditorWidget_1 = this; }
    static { this.dropIntoEditorDecorationOptions = ModelDecorationOptions.register({
        description: 'workbench-dnd-target',
        className: 'dnd-target'
    }); }
    //#endregion
    get isSimpleWidget() {
        return this._configuration.isSimpleWidget;
    }
    get contextMenuId() {
        return this._configuration.contextMenuId;
    }
    get contextKeyService() { return this._contextKeyService; }
    constructor(domElement, _options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        //#region Eventing
        this._deliveryQueue = createEventDeliveryQueue();
        this._contributions = this._register(new CodeEditorContributions());
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeModelContent = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelContent = this._onDidChangeModelContent.event;
        this._onDidChangeModelLanguage = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguage = this._onDidChangeModelLanguage.event;
        this._onDidChangeModelLanguageConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguageConfiguration = this._onDidChangeModelLanguageConfiguration.event;
        this._onDidChangeModelOptions = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelOptions = this._onDidChangeModelOptions.event;
        this._onDidChangeModelDecorations = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelDecorations = this._onDidChangeModelDecorations.event;
        this._onDidChangeLineHeight = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeLineHeight = this._onDidChangeLineHeight.event;
        this._onDidChangeFont = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeFont = this._onDidChangeFont.event;
        this._onDidChangeModelTokens = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelTokens = this._onDidChangeModelTokens.event;
        this._onDidChangeConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeCursorPosition = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorPosition = this._onDidChangeCursorPosition.event;
        this._onDidChangeCursorSelection = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorSelection = this._onDidChangeCursorSelection.event;
        this._onDidAttemptReadOnlyEdit = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidAttemptReadOnlyEdit = this._onDidAttemptReadOnlyEdit.event;
        this._onDidLayoutChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidLayoutChange = this._onDidLayoutChange.event;
        this._editorTextFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorText = this._editorTextFocus.onDidChangeToTrue;
        this.onDidBlurEditorText = this._editorTextFocus.onDidChangeToFalse;
        this._editorWidgetFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorWidget = this._editorWidgetFocus.onDidChangeToTrue;
        this.onDidBlurEditorWidget = this._editorWidgetFocus.onDidChangeToFalse;
        this._onWillType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onWillType = this._onWillType.event;
        this._onDidType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidType = this._onDidType.event;
        this._onDidCompositionStart = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionStart = this._onDidCompositionStart.event;
        this._onDidCompositionEnd = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionEnd = this._onDidCompositionEnd.event;
        this._onDidPaste = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidPaste = this._onDidPaste.event;
        this._onMouseUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDown = this._onMouseDown.event;
        this._onMouseDrag = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrag = this._onMouseDrag.event;
        this._onMouseDrop = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrop = this._onMouseDrop.event;
        this._onMouseDropCanceled = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDropCanceled = this._onMouseDropCanceled.event;
        this._onDropIntoEditor = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDropIntoEditor = this._onDropIntoEditor.event;
        this._onContextMenu = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onContextMenu = this._onContextMenu.event;
        this._onMouseMove = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseMove = this._onMouseMove.event;
        this._onMouseLeave = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseLeave = this._onMouseLeave.event;
        this._onMouseWheel = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseWheel = this._onMouseWheel.event;
        this._onKeyUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyUp = this._onKeyUp.event;
        this._onKeyDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyDown = this._onKeyDown.event;
        this._onDidContentSizeChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._onDidScrollChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidScrollChange = this._onDidScrollChange.event;
        this._onDidChangeViewZones = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeViewZones = this._onDidChangeViewZones.event;
        this._onDidChangeHiddenAreas = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeHiddenAreas = this._onDidChangeHiddenAreas.event;
        this._updateCounter = 0;
        this._onWillTriggerEditorOperationEvent = this._register(new Emitter());
        this.onWillTriggerEditorOperationEvent = this._onWillTriggerEditorOperationEvent.event;
        this._onBeginUpdate = this._register(new Emitter());
        this.onBeginUpdate = this._onBeginUpdate.event;
        this._onEndUpdate = this._register(new Emitter());
        this.onEndUpdate = this._onEndUpdate.event;
        this._onBeforeExecuteEdit = this._register(new Emitter());
        this.onBeforeExecuteEdit = this._onBeforeExecuteEdit.event;
        this._actions = new Map();
        this._bannerDomNode = null;
        this._dropIntoEditorDecorations = this.createDecorationsCollection();
        this.inComposition = false;
        codeEditorService.willCreateCodeEditor();
        const options = { ..._options };
        this._domElement = domElement;
        this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        delete options.overflowWidgetsDomNode;
        this._id = (++EDITOR_ID);
        this._decorationTypeKeysToIds = {};
        this._decorationTypeSubtypes = {};
        this._telemetryData = codeEditorWidgetOptions.telemetryData;
        this._configuration = this._register(this._createConfiguration(codeEditorWidgetOptions.isSimpleWidget || false, codeEditorWidgetOptions.contextMenuId ?? (codeEditorWidgetOptions.isSimpleWidget ? MenuId.SimpleEditorContext : MenuId.EditorContext), options, accessibilityService));
        this._register(this._configuration.onDidChange((e) => {
            this._onDidChangeConfiguration.fire(e);
            const options = this._configuration.options;
            if (e.hasChanged(164 /* EditorOption.layoutInfo */)) {
                const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
                this._onDidLayoutChange.fire(layoutInfo);
            }
        }));
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
        if (codeEditorWidgetOptions.contextKeyValues) {
            for (const [key, value] of Object.entries(codeEditorWidgetOptions.contextKeyValues)) {
                this._contextKeyService.createKey(key, value);
            }
        }
        this._notificationService = notificationService;
        this._codeEditorService = codeEditorService;
        this._commandService = commandService;
        this._themeService = themeService;
        this._register(new EditorContextKeysManager(this, this._contextKeyService));
        this._register(new EditorModeContext(this, this._contextKeyService, languageFeaturesService));
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._modelData = null;
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._glyphMarginWidgets = {};
        let contributions;
        if (Array.isArray(codeEditorWidgetOptions.contributions)) {
            contributions = codeEditorWidgetOptions.contributions;
        }
        else {
            contributions = EditorExtensionsRegistry.getEditorContributions();
        }
        this._contributions.initialize(this, contributions, this._instantiationService);
        for (const action of EditorExtensionsRegistry.getEditorActions()) {
            if (this._actions.has(action.id)) {
                onUnexpectedError(new Error(`Cannot have two actions with the same id ${action.id}`));
                continue;
            }
            const internalAction = new InternalEditorAction(action.id, action.label, action.alias, action.metadata, action.precondition ?? undefined, (args) => {
                return this._instantiationService.invokeFunction((accessor) => {
                    return Promise.resolve(action.runEditorCommand(accessor, this, args));
                });
            }, this._contextKeyService);
            this._actions.set(internalAction.id, internalAction);
        }
        const isDropIntoEnabled = () => {
            return !this._configuration.options.get(103 /* EditorOption.readOnly */)
                && this._configuration.options.get(43 /* EditorOption.dropIntoEditor */).enabled;
        };
        this._register(new dom.DragAndDropObserver(this._domElement, {
            onDragOver: e => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this.showDropIndicatorAt(target.position);
                }
            },
            onDrop: async (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                this.removeDropIndicator();
                if (!e.dataTransfer) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this._onDropIntoEditor.fire({ position: target.position, event: e });
                }
            },
            onDragLeave: () => {
                this.removeDropIndicator();
            },
            onDragEnd: () => {
                this.removeDropIndicator();
            },
        }));
        this._codeEditorService.addCodeEditor(this);
    }
    writeScreenReaderContent(reason) {
        this._modelData?.view.writeScreenReaderContent(reason);
    }
    _createConfiguration(isSimpleWidget, contextMenuId, options, accessibilityService) {
        return new EditorConfiguration(isSimpleWidget, contextMenuId, options, this._domElement, accessibilityService);
    }
    getId() {
        return this.getEditorType() + ':' + this._id;
    }
    getEditorType() {
        return editorCommon.EditorType.ICodeEditor;
    }
    dispose() {
        this._codeEditorService.removeCodeEditor(this);
        this._actions.clear();
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._removeDecorationTypes();
        this._postDetachModelCleanup(this._detachModel());
        this._onDidDispose.fire();
        super.dispose();
    }
    invokeWithinContext(fn) {
        return this._instantiationService.invokeFunction(fn);
    }
    updateOptions(newOptions) {
        this._configuration.updateOptions(newOptions || {});
    }
    getOptions() {
        return this._configuration.options;
    }
    getOption(id) {
        return this._configuration.options.get(id);
    }
    getRawOptions() {
        return this._configuration.getRawOptions();
    }
    getOverflowWidgetsDomNode() {
        return this._overflowWidgetsDomNode;
    }
    getConfiguredWordAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(147 /* EditorOption.wordSeparators */), this._configuration.options.get(146 /* EditorOption.wordSegmenterLocales */), position);
    }
    getValue(options = null) {
        if (!this._modelData) {
            return '';
        }
        const preserveBOM = (options && options.preserveBOM) ? true : false;
        let eolPreference = 0 /* EndOfLinePreference.TextDefined */;
        if (options && options.lineEnding && options.lineEnding === '\n') {
            eolPreference = 1 /* EndOfLinePreference.LF */;
        }
        else if (options && options.lineEnding && options.lineEnding === '\r\n') {
            eolPreference = 2 /* EndOfLinePreference.CRLF */;
        }
        return this._modelData.model.getValue(eolPreference, preserveBOM);
    }
    setValue(newValue) {
        try {
            this._beginUpdate();
            if (!this._modelData) {
                return;
            }
            this._modelData.model.setValue(newValue);
        }
        finally {
            this._endUpdate();
        }
    }
    getModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model;
    }
    setModel(_model = null) {
        try {
            this._beginUpdate();
            const model = _model;
            if (this._modelData === null && model === null) {
                // Current model is the new model
                return;
            }
            if (this._modelData && this._modelData.model === model) {
                // Current model is the new model
                return;
            }
            const e = {
                oldModelUrl: this._modelData?.model.uri || null,
                newModelUrl: model?.uri || null
            };
            this._onWillChangeModel.fire(e);
            const hasTextFocus = this.hasTextFocus();
            const detachedModel = this._detachModel();
            this._attachModel(model);
            if (this.hasModel()) {
                // we have a new model (with a new view)!
                if (hasTextFocus) {
                    this.focus();
                }
            }
            else {
                // we have no model (and no view) anymore
                // make sure the outside world knows we are not focused
                this._editorTextFocus.setValue(false);
                this._editorWidgetFocus.setValue(false);
            }
            this._removeDecorationTypes();
            this._onDidChangeModel.fire(e);
            this._postDetachModelCleanup(detachedModel);
            this._contributionsDisposable = this._contributions.onAfterModelAttached();
        }
        finally {
            this._endUpdate();
        }
    }
    _removeDecorationTypes() {
        this._decorationTypeKeysToIds = {};
        if (this._decorationTypeSubtypes) {
            for (const decorationType in this._decorationTypeSubtypes) {
                const subTypes = this._decorationTypeSubtypes[decorationType];
                for (const subType in subTypes) {
                    this._removeDecorationType(decorationType + '-' + subType);
                }
            }
            this._decorationTypeSubtypes = {};
        }
    }
    getVisibleRanges() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRanges();
    }
    getVisibleRangesPlusViewportAboveBelow() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRangesPlusViewportAboveBelow();
    }
    getWhitespaces() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.viewLayout.getWhitespaces();
    }
    static _getVerticalOffsetAfterPosition(modelData, modelLineNumber, modelColumn, includeViewZones) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetAfterLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getTopForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, 1, includeViewZones);
    }
    getTopForPosition(lineNumber, column) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, column, false);
    }
    static _getVerticalOffsetForPosition(modelData, modelLineNumber, modelColumn, includeViewZones = false) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getBottomForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        const maxCol = this._modelData.model.getLineMaxColumn(lineNumber);
        return CodeEditorWidget_1._getVerticalOffsetAfterPosition(this._modelData, lineNumber, maxCol, includeViewZones);
    }
    getLineHeightForPosition(position) {
        if (!this._modelData) {
            return -1;
        }
        const viewModel = this._modelData.viewModel;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const pos = Position.lift(position);
        if (coordinatesConverter.modelPositionIsVisible(pos)) {
            const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(pos);
            return viewModel.viewLayout.getLineHeightForLineNumber(viewPosition.lineNumber);
        }
        return 0;
    }
    setHiddenAreas(ranges, source, forceUpdate) {
        this._modelData?.viewModel.setHiddenAreas(ranges.map(r => Range.lift(r)), source, forceUpdate);
    }
    getVisibleColumnFromPosition(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.visibleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize) + 1;
    }
    getStatusbarColumn(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.toStatusbarColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize);
    }
    getPosition() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getPosition();
    }
    setPosition(position, source = 'api') {
        if (!this._modelData) {
            return;
        }
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.setSelections(source, [{
                selectionStartLineNumber: position.lineNumber,
                selectionStartColumn: position.column,
                positionLineNumber: position.lineNumber,
                positionColumn: position.column
            }]);
    }
    _sendRevealRange(modelRange, verticalType, revealHorizontal, scrollType) {
        if (!this._modelData) {
            return;
        }
        if (!Range.isIRange(modelRange)) {
            throw new Error('Invalid arguments');
        }
        const validatedModelRange = this._modelData.model.validateRange(modelRange);
        const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);
        this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
    }
    revealLine(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLine(lineNumber, revealType, scrollType) {
        if (typeof lineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(lineNumber, 1, lineNumber, 1), revealType, false, scrollType);
    }
    revealPosition(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 0 /* VerticalRevealType.Simple */, true, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    _revealPosition(position, verticalType, revealHorizontal, scrollType) {
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column), verticalType, revealHorizontal, scrollType);
    }
    getSelection() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelection();
    }
    getSelections() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelections();
    }
    setSelection(something, source = 'api') {
        const isSelection = Selection.isISelection(something);
        const isRange = Range.isIRange(something);
        if (!isSelection && !isRange) {
            throw new Error('Invalid arguments');
        }
        if (isSelection) {
            this._setSelectionImpl(something, source);
        }
        else if (isRange) {
            // act as if it was an IRange
            const selection = {
                selectionStartLineNumber: something.startLineNumber,
                selectionStartColumn: something.startColumn,
                positionLineNumber: something.endLineNumber,
                positionColumn: something.endColumn
            };
            this._setSelectionImpl(selection, source);
        }
    }
    _setSelectionImpl(sel, source) {
        if (!this._modelData) {
            return;
        }
        const selection = new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        this._modelData.viewModel.setSelections(source, [selection]);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLines(startLineNumber, endLineNumber, verticalType, scrollType) {
        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(startLineNumber, 1, endLineNumber, 1), verticalType, false, scrollType);
    }
    revealRange(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._revealRange(range, revealVerticalInCenter ? 1 /* VerticalRevealType.Center */ : 0 /* VerticalRevealType.Simple */, revealHorizontal, scrollType);
    }
    revealRangeInCenter(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 6 /* VerticalRevealType.NearTopIfOutsideViewport */, true, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 3 /* VerticalRevealType.Top */, true, scrollType);
    }
    _revealRange(range, verticalType, revealHorizontal, scrollType) {
        if (!Range.isIRange(range)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(Range.lift(range), verticalType, revealHorizontal, scrollType);
    }
    setSelections(ranges, source = 'api', reason = 0 /* CursorChangeReason.NotSet */) {
        if (!this._modelData) {
            return;
        }
        if (!ranges || ranges.length === 0) {
            throw new Error('Invalid arguments');
        }
        for (let i = 0, len = ranges.length; i < len; i++) {
            if (!Selection.isISelection(ranges[i])) {
                throw new Error('Invalid arguments');
            }
        }
        this._modelData.viewModel.setSelections(source, ranges, reason);
    }
    getContentWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentWidth();
    }
    getScrollWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollWidth();
    }
    getScrollLeft() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
    }
    getContentHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentHeight();
    }
    getScrollHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollHeight();
    }
    getScrollTop() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
    }
    setScrollLeft(newScrollLeft, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollLeft !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollLeft: newScrollLeft
        }, scrollType);
    }
    setScrollTop(newScrollTop, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollTop !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollTop: newScrollTop
        }, scrollType);
    }
    setScrollPosition(position, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.viewLayout.setScrollPosition(position, scrollType);
    }
    hasPendingScrollAnimation() {
        if (!this._modelData) {
            return false;
        }
        return this._modelData.viewModel.viewLayout.hasPendingScrollAnimation();
    }
    saveViewState() {
        if (!this._modelData) {
            return null;
        }
        const contributionsState = this._contributions.saveViewState();
        const cursorState = this._modelData.viewModel.saveCursorState();
        const viewState = this._modelData.viewModel.saveState();
        return {
            cursorState: cursorState,
            viewState: viewState,
            contributionsState: contributionsState
        };
    }
    restoreViewState(s) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        const codeEditorState = s;
        if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
            const cursorState = codeEditorState.cursorState;
            if (Array.isArray(cursorState)) {
                if (cursorState.length > 0) {
                    this._modelData.viewModel.restoreCursorState(cursorState);
                }
            }
            else {
                // Backwards compatibility
                this._modelData.viewModel.restoreCursorState([cursorState]);
            }
            this._contributions.restoreViewState(codeEditorState.contributionsState || {});
            const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
            this._modelData.view.restoreState(reducedState);
        }
    }
    handleInitialized() {
        this._getViewModel()?.visibleLinesStabilized();
    }
    onVisible() {
        this._modelData?.view.refreshFocusState();
    }
    onHide() {
        this._modelData?.view.refreshFocusState();
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    getActions() {
        return Array.from(this._actions.values());
    }
    getSupportedActions() {
        let result = this.getActions();
        result = result.filter(action => action.isSupported());
        return result;
    }
    getAction(id) {
        return this._actions.get(id) || null;
    }
    trigger(source, handlerId, payload) {
        payload = payload || {};
        try {
            this._onWillTriggerEditorOperationEvent.fire({ source: source, handlerId: handlerId, payload: payload });
            this._beginUpdate();
            switch (handlerId) {
                case "compositionStart" /* editorCommon.Handler.CompositionStart */:
                    this._startComposition();
                    return;
                case "compositionEnd" /* editorCommon.Handler.CompositionEnd */:
                    this._endComposition(source);
                    return;
                case "type" /* editorCommon.Handler.Type */: {
                    const args = payload;
                    this._type(source, args.text || '');
                    return;
                }
                case "replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replaceCharCnt || 0, 0, 0);
                    return;
                }
                case "compositionType" /* editorCommon.Handler.CompositionType */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0);
                    return;
                }
                case "paste" /* editorCommon.Handler.Paste */: {
                    const args = payload;
                    this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null, args.clipboardEvent);
                    return;
                }
                case "cut" /* editorCommon.Handler.Cut */:
                    this._cut(source);
                    return;
            }
            const action = this.getAction(handlerId);
            if (action) {
                Promise.resolve(action.run(payload)).then(undefined, onUnexpectedError);
                return;
            }
            if (!this._modelData) {
                return;
            }
            if (this._triggerEditorCommand(source, handlerId, payload)) {
                return;
            }
            this._triggerCommand(handlerId, payload);
        }
        finally {
            this._endUpdate();
        }
    }
    _triggerCommand(handlerId, payload) {
        this._commandService.executeCommand(handlerId, payload);
    }
    _startComposition() {
        if (!this._modelData) {
            return;
        }
        this.inComposition = true;
        this._modelData.viewModel.startComposition();
        this._onDidCompositionStart.fire();
    }
    _endComposition(source) {
        if (!this._modelData) {
            return;
        }
        this.inComposition = false;
        this._modelData.viewModel.endComposition(source);
        this._onDidCompositionEnd.fire();
    }
    _type(source, text) {
        if (!this._modelData || text.length === 0) {
            return;
        }
        if (source === 'keyboard') {
            this._onWillType.fire(text);
        }
        this._modelData.viewModel.type(text, source);
        if (source === 'keyboard') {
            this._onDidType.fire(text);
        }
    }
    _compositionType(source, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source);
    }
    _paste(source, text, pasteOnNewLine, multicursorText, mode, clipboardEvent) {
        if (!this._modelData) {
            return;
        }
        const viewModel = this._modelData.viewModel;
        const startPosition = viewModel.getSelection().getStartPosition();
        viewModel.paste(text, pasteOnNewLine, multicursorText, source);
        const endPosition = viewModel.getSelection().getStartPosition();
        if (source === 'keyboard') {
            this._onDidPaste.fire({
                clipboardEvent,
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                languageId: mode
            });
        }
    }
    _cut(source) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.cut(source);
    }
    _triggerEditorCommand(source, handlerId, payload) {
        const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
        if (command) {
            payload = payload || {};
            payload.source = source;
            this._instantiationService.invokeFunction((accessor) => {
                Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
            });
            return true;
        }
        return false;
    }
    _getViewModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel;
    }
    pushUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.pushStackElement();
        return true;
    }
    popUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.popStackElement();
        return true;
    }
    edit(edit, reason) {
        return this.executeEdits(reason, edit.replacements.map(e => ({ range: e.range, text: e.text })), undefined);
    }
    executeEdits(source, edits, endCursorState) {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        let cursorStateComputer;
        if (!endCursorState) {
            cursorStateComputer = () => null;
        }
        else if (Array.isArray(endCursorState)) {
            cursorStateComputer = () => endCursorState;
        }
        else {
            cursorStateComputer = endCursorState;
        }
        let sourceStr;
        let reason;
        if (source instanceof TextModelEditSource) {
            reason = source;
            sourceStr = source.metadata.source;
        }
        else {
            reason = EditSources.unknown({ name: sourceStr });
            sourceStr = source;
        }
        this._onBeforeExecuteEdit.fire({ source: sourceStr ?? undefined });
        this._modelData.viewModel.executeEdits(sourceStr, edits, cursorStateComputer, reason);
        return true;
    }
    executeCommand(source, command) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommand(command, source);
    }
    executeCommands(source, commands) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommands(commands, source);
    }
    createDecorationsCollection(decorations) {
        return new EditorDecorationsCollection(this, decorations);
    }
    changeDecorations(callback) {
        if (!this._modelData) {
            // callback will not be called
            return null;
        }
        return this._modelData.model.changeDecorations(callback, this._id);
    }
    getLineDecorations(lineNumber) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getLineDecorations(lineNumber, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getDecorationsInRange(range) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getDecorationsInRange(range, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getFontSizeAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getFontSizeAtPosition(position);
    }
    /**
     * @deprecated
     */
    deltaDecorations(oldDecorations, newDecorations) {
        if (!this._modelData) {
            return [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            return oldDecorations;
        }
        return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
    }
    removeDecorations(decorationIds) {
        if (!this._modelData || decorationIds.length === 0) {
            return;
        }
        this._modelData.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    setDecorationsByType(description, decorationTypeKey, decorationOptions) {
        const newDecorationsSubTypes = {};
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        this._decorationTypeSubtypes[decorationTypeKey] = newDecorationsSubTypes;
        const newModelDecorations = [];
        for (const decorationOption of decorationOptions) {
            let typeKey = decorationTypeKey;
            if (decorationOption.renderOptions) {
                // identify custom render options by a hash code over all keys and values
                // For custom render options register a decoration type if necessary
                const subType = hash(decorationOption.renderOptions).toString(16);
                // The fact that `decorationTypeKey` appears in the typeKey has no influence
                // it is just a mechanism to get predictable and unique keys (repeatable for the same options and unique across clients)
                typeKey = decorationTypeKey + '-' + subType;
                if (!oldDecorationsSubTypes[subType] && !newDecorationsSubTypes[subType]) {
                    // decoration type did not exist before, register new one
                    this._registerDecorationType(description, typeKey, decorationOption.renderOptions, decorationTypeKey);
                }
                newDecorationsSubTypes[subType] = true;
            }
            const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
            if (decorationOption.hoverMessage) {
                opts.hoverMessage = decorationOption.hoverMessage;
            }
            newModelDecorations.push({ range: decorationOption.range, options: opts });
        }
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        for (const subType in oldDecorationsSubTypes) {
            if (!newDecorationsSubTypes[subType]) {
                this._removeDecorationType(decorationTypeKey + '-' + subType);
            }
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
        return this._decorationTypeKeysToIds[decorationTypeKey] || [];
    }
    setDecorationsByTypeFast(decorationTypeKey, ranges) {
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        for (const subType in oldDecorationsSubTypes) {
            this._removeDecorationType(decorationTypeKey + '-' + subType);
        }
        this._decorationTypeSubtypes[decorationTypeKey] = {};
        const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
        const newModelDecorations = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            newModelDecorations[i] = { range: ranges[i], options: opts };
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
    }
    removeDecorationsByType(decorationTypeKey) {
        // remove decorations for type and sub type
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
        if (oldDecorationsIds) {
            this.changeDecorations(accessor => accessor.deltaDecorations(oldDecorationsIds, []));
        }
        if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeKeysToIds[decorationTypeKey];
        }
        if (this._decorationTypeSubtypes.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeSubtypes[decorationTypeKey];
        }
    }
    getLayoutInfo() {
        const options = this._configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        return layoutInfo;
    }
    createOverviewRuler(cssClassName) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.createOverviewRuler(cssClassName);
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getDomNode() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.domNode.domNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    layout(dimension, postponeRendering = false) {
        this._configuration.observeContainer(dimension);
        if (!postponeRendering) {
            this.render();
        }
    }
    focus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.focus();
    }
    hasTextFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isFocused();
    }
    hasWidgetFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isWidgetFocused();
    }
    addContentWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._contentWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a content widget with the same id:' + widget.getId());
        }
        this._contentWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addContentWidget(widgetData);
        }
    }
    layoutContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutContentWidget(widgetData);
            }
        }
    }
    removeContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            delete this._contentWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeContentWidget(widgetData);
            }
        }
    }
    addOverlayWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting an overlay widget with the same id.');
        }
        this._overlayWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addOverlayWidget(widgetData);
        }
    }
    layoutOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutOverlayWidget(widgetData);
            }
        }
    }
    removeOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            delete this._overlayWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeOverlayWidget(widgetData);
            }
        }
    }
    addGlyphMarginWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._glyphMarginWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a glyph margin widget with the same id.');
        }
        this._glyphMarginWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addGlyphMarginWidget(widgetData);
        }
    }
    layoutGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutGlyphMarginWidget(widgetData);
            }
        }
    }
    removeGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            delete this._glyphMarginWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeGlyphMarginWidget(widgetData);
            }
        }
    }
    changeViewZones(callback) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.change(callback);
    }
    getTargetAtClientPoint(clientX, clientY) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
    }
    getScrolledVisiblePosition(rawPosition) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const options = this._configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const top = CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, position.lineNumber, position.column) - this.getScrollTop();
        const left = this._modelData.view.getOffsetForColumn(position.lineNumber, position.column) + layoutInfo.glyphMarginWidth + layoutInfo.lineNumbersWidth + layoutInfo.decorationsWidth - this.getScrollLeft();
        const height = this.getLineHeightForPosition(position);
        return {
            top: top,
            left: left,
            height
        };
    }
    getOffsetForColumn(lineNumber, column) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return -1;
        }
        return this._modelData.view.getOffsetForColumn(lineNumber, column);
    }
    render(forceRedraw = false) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.viewModel.batchEvents(() => {
            this._modelData.view.render(true, forceRedraw);
        });
    }
    setAriaOptions(options) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.setAriaOptions(options);
    }
    applyFontInfo(target) {
        applyFontInfo(target, this._configuration.options.get(59 /* EditorOption.fontInfo */));
    }
    setBanner(domNode, domNodeHeight) {
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        this._bannerDomNode = domNode;
        this._configuration.setReservedHeight(domNode ? domNodeHeight : 0);
        if (this._bannerDomNode) {
            this._domElement.prepend(this._bannerDomNode);
        }
    }
    _attachModel(model) {
        if (!model) {
            this._modelData = null;
            return;
        }
        const listenersToRemove = [];
        this._domElement.setAttribute('data-mode-id', model.getLanguageId());
        this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
        this._configuration.setModelLineCount(model.getLineCount());
        const attachedView = model.onBeforeAttached();
        const viewModel = new ViewModel(this._id, this._configuration, model, DOMLineBreaksComputerFactory.create(dom.getWindow(this._domElement)), MonospaceLineBreaksComputerFactory.create(this._configuration.options), (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(this._domElement), callback), this.languageConfigurationService, this._themeService, attachedView, {
            batchChanges: (cb) => {
                try {
                    this._beginUpdate();
                    return cb();
                }
                finally {
                    this._endUpdate();
                }
            },
        });
        // Someone might destroy the model from under the editor, so prevent any exceptions by setting a null model
        listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));
        listenersToRemove.push(viewModel.onEvent((e) => {
            switch (e.kind) {
                case 0 /* OutgoingViewModelEventKind.ContentSizeChanged */:
                    this._onDidContentSizeChange.fire(e);
                    break;
                case 1 /* OutgoingViewModelEventKind.FocusChanged */:
                    this._editorTextFocus.setValue(e.hasFocus);
                    break;
                case 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */:
                    this._editorWidgetFocus.setValue(e.hasFocus);
                    break;
                case 3 /* OutgoingViewModelEventKind.ScrollChanged */:
                    this._onDidScrollChange.fire(e);
                    break;
                case 4 /* OutgoingViewModelEventKind.ViewZonesChanged */:
                    this._onDidChangeViewZones.fire();
                    break;
                case 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */:
                    this._onDidChangeHiddenAreas.fire();
                    break;
                case 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */:
                    this._onDidAttemptReadOnlyEdit.fire();
                    break;
                case 7 /* OutgoingViewModelEventKind.CursorStateChanged */: {
                    if (e.reachedMaxCursorCount) {
                        const multiCursorLimit = this.getOption(88 /* EditorOption.multiCursorLimit */);
                        const message = nls.localize('cursors.maximum', "The number of cursors has been limited to {0}. Consider using [find and replace](https://code.visualstudio.com/docs/editor/codebasics#_find-and-replace) for larger changes or increase the editor multi cursor limit setting.", multiCursorLimit);
                        this._notificationService.prompt(Severity.Warning, message, [
                            {
                                label: 'Find and Replace',
                                run: () => {
                                    this._commandService.executeCommand('editor.action.startFindReplaceAction');
                                }
                            },
                            {
                                label: nls.localize('goToSetting', 'Increase Multi Cursor Limit'),
                                run: () => {
                                    this._commandService.executeCommand('workbench.action.openSettings2', {
                                        query: 'editor.multiCursorLimit'
                                    });
                                }
                            }
                        ]);
                    }
                    const positions = [];
                    for (let i = 0, len = e.selections.length; i < len; i++) {
                        positions[i] = e.selections[i].getPosition();
                    }
                    const e1 = {
                        position: positions[0],
                        secondaryPositions: positions.slice(1),
                        reason: e.reason,
                        source: e.source
                    };
                    this._onDidChangeCursorPosition.fire(e1);
                    const e2 = {
                        selection: e.selections[0],
                        secondarySelections: e.selections.slice(1),
                        modelVersionId: e.modelVersionId,
                        oldSelections: e.oldSelections,
                        oldModelVersionId: e.oldModelVersionId,
                        source: e.source,
                        reason: e.reason
                    };
                    this._onDidChangeCursorSelection.fire(e2);
                    break;
                }
                case 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */:
                    this._onDidChangeModelDecorations.fire(e.event);
                    break;
                case 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */:
                    this._domElement.setAttribute('data-mode-id', model.getLanguageId());
                    this._onDidChangeModelLanguage.fire(e.event);
                    break;
                case 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */:
                    this._onDidChangeModelLanguageConfiguration.fire(e.event);
                    break;
                case 11 /* OutgoingViewModelEventKind.ModelContentChanged */:
                    this._onDidChangeModelContent.fire(e.event);
                    break;
                case 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */:
                    this._onDidChangeModelOptions.fire(e.event);
                    break;
                case 13 /* OutgoingViewModelEventKind.ModelTokensChanged */:
                    this._onDidChangeModelTokens.fire(e.event);
                    break;
                case 14 /* OutgoingViewModelEventKind.ModelLineHeightChanged */:
                    this._onDidChangeLineHeight.fire(e.event);
                    break;
                case 15 /* OutgoingViewModelEventKind.ModelFontChangedEvent */:
                    this._onDidChangeFont.fire(e.event);
                    break;
            }
        }));
        const [view, hasRealView] = this._createView(viewModel);
        if (hasRealView) {
            this._domElement.appendChild(view.domNode.domNode);
            let keys = Object.keys(this._contentWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addContentWidget(this._contentWidgets[widgetId]);
            }
            keys = Object.keys(this._overlayWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addOverlayWidget(this._overlayWidgets[widgetId]);
            }
            keys = Object.keys(this._glyphMarginWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addGlyphMarginWidget(this._glyphMarginWidgets[widgetId]);
            }
            view.render(false, true);
            view.domNode.domNode.setAttribute('data-uri', model.uri.toString());
        }
        this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove, attachedView);
    }
    _createView(viewModel) {
        let commandDelegate;
        if (this.isSimpleWidget) {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    this._paste('keyboard', text, pasteOnNewLine, multicursorText, mode);
                },
                type: (text) => {
                    this._type('keyboard', text);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    this._compositionType('keyboard', text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
                },
                startComposition: () => {
                    this._startComposition();
                },
                endComposition: () => {
                    this._endComposition('keyboard');
                },
                cut: () => {
                    this._cut('keyboard');
                }
            };
        }
        else {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    const payload = { text, pasteOnNewLine, multicursorText, mode };
                    this._commandService.executeCommand("paste" /* editorCommon.Handler.Paste */, payload);
                },
                type: (text) => {
                    const payload = { text };
                    this._commandService.executeCommand("type" /* editorCommon.Handler.Type */, payload);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    // Try if possible to go through the existing `replacePreviousChar` command
                    if (replaceNextCharCnt || positionDelta) {
                        // must be handled through the new command
                        const payload = { text, replacePrevCharCnt, replaceNextCharCnt, positionDelta };
                        this._commandService.executeCommand("compositionType" /* editorCommon.Handler.CompositionType */, payload);
                    }
                    else {
                        const payload = { text, replaceCharCnt: replacePrevCharCnt };
                        this._commandService.executeCommand("replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */, payload);
                    }
                },
                startComposition: () => {
                    this._commandService.executeCommand("compositionStart" /* editorCommon.Handler.CompositionStart */, {});
                },
                endComposition: () => {
                    this._commandService.executeCommand("compositionEnd" /* editorCommon.Handler.CompositionEnd */, {});
                },
                cut: () => {
                    this._commandService.executeCommand("cut" /* editorCommon.Handler.Cut */, {});
                }
            };
        }
        const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
        viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
        viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
        viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
        viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
        viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
        viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
        viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
        viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
        viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
        viewUserInputEvents.onMouseDropCanceled = (e) => this._onMouseDropCanceled.fire(e);
        viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);
        const view = new View(this._domElement, this.getId(), commandDelegate, this._configuration, this._themeService.getColorTheme(), viewModel, viewUserInputEvents, this._overflowWidgetsDomNode, this._instantiationService);
        return [view, true];
    }
    _postDetachModelCleanup(detachedModel) {
        detachedModel?.removeAllDecorationsWithOwnerId(this._id);
    }
    _detachModel() {
        this._contributionsDisposable?.dispose();
        this._contributionsDisposable = undefined;
        if (!this._modelData) {
            return null;
        }
        const model = this._modelData.model;
        const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;
        this._modelData.dispose();
        this._modelData = null;
        this._domElement.removeAttribute('data-mode-id');
        if (removeDomNode && this._domElement.contains(removeDomNode)) {
            removeDomNode.remove();
        }
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        return model;
    }
    _registerDecorationType(description, key, options, parentTypeKey) {
        this._codeEditorService.registerDecorationType(description, key, options, parentTypeKey, this);
    }
    _removeDecorationType(key) {
        this._codeEditorService.removeDecorationType(key);
    }
    _resolveDecorationOptions(typeKey, writable) {
        return this._codeEditorService.resolveDecorationOptions(typeKey, writable);
    }
    getTelemetryData() {
        return this._telemetryData;
    }
    hasModel() {
        return (this._modelData !== null);
    }
    showDropIndicatorAt(position) {
        const newDecorations = [{
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: CodeEditorWidget_1.dropIntoEditorDecorationOptions
            }];
        this._dropIntoEditorDecorations.set(newDecorations);
        this.revealPosition(position, 1 /* editorCommon.ScrollType.Immediate */);
    }
    removeDropIndicator() {
        this._dropIntoEditorDecorations.clear();
    }
    setContextValue(key, value) {
        this._contextKeyService.createKey(key, value);
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._onBeginUpdate.fire();
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._onEndUpdate.fire();
        }
    }
};
CodeEditorWidget = CodeEditorWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ICodeEditorService),
    __param(5, ICommandService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], CodeEditorWidget);
export { CodeEditorWidget };
let EDITOR_ID = 0;
class ModelData {
    constructor(model, viewModel, view, hasRealView, listenersToRemove, attachedView) {
        this.model = model;
        this.viewModel = viewModel;
        this.view = view;
        this.hasRealView = hasRealView;
        this.listenersToRemove = listenersToRemove;
        this.attachedView = attachedView;
    }
    dispose() {
        dispose(this.listenersToRemove);
        this.model.onBeforeDetached(this.attachedView);
        if (this.hasRealView) {
            this.view.dispose();
        }
        this.viewModel.dispose();
    }
}
var BooleanEventValue;
(function (BooleanEventValue) {
    BooleanEventValue[BooleanEventValue["NotSet"] = 0] = "NotSet";
    BooleanEventValue[BooleanEventValue["False"] = 1] = "False";
    BooleanEventValue[BooleanEventValue["True"] = 2] = "True";
})(BooleanEventValue || (BooleanEventValue = {}));
export class BooleanEventEmitter extends Disposable {
    constructor(_emitterOptions) {
        super();
        this._emitterOptions = _emitterOptions;
        this._onDidChangeToTrue = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToTrue = this._onDidChangeToTrue.event;
        this._onDidChangeToFalse = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToFalse = this._onDidChangeToFalse.event;
        this._value = 0 /* BooleanEventValue.NotSet */;
    }
    setValue(_value) {
        const value = (_value ? 2 /* BooleanEventValue.True */ : 1 /* BooleanEventValue.False */);
        if (this._value === value) {
            return;
        }
        this._value = value;
        if (this._value === 2 /* BooleanEventValue.True */) {
            this._onDidChangeToTrue.fire();
        }
        else if (this._value === 1 /* BooleanEventValue.False */) {
            this._onDidChangeToFalse.fire();
        }
    }
}
/**
 * A regular event emitter that also makes sure contributions are instantiated if necessary
 */
class InteractionEmitter extends Emitter {
    constructor(_contributions, deliveryQueue) {
        super({ deliveryQueue });
        this._contributions = _contributions;
    }
    fire(event) {
        this._contributions.onBeforeInteractionEvent();
        super.fire(event);
    }
}
class EditorContextKeysManager extends Disposable {
    constructor(editor, contextKeyService) {
        super();
        this._editor = editor;
        contextKeyService.createKey('editorId', editor.getId());
        this._editorSimpleInput = EditorContextKeys.editorSimpleInput.bindTo(contextKeyService);
        this._editorFocus = EditorContextKeys.focus.bindTo(contextKeyService);
        this._textInputFocus = EditorContextKeys.textInputFocus.bindTo(contextKeyService);
        this._editorTextFocus = EditorContextKeys.editorTextFocus.bindTo(contextKeyService);
        this._tabMovesFocus = EditorContextKeys.tabMovesFocus.bindTo(contextKeyService);
        this._editorReadonly = EditorContextKeys.readOnly.bindTo(contextKeyService);
        this._inDiffEditor = EditorContextKeys.inDiffEditor.bindTo(contextKeyService);
        this._editorColumnSelection = EditorContextKeys.columnSelection.bindTo(contextKeyService);
        this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.bindTo(contextKeyService);
        this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.bindTo(contextKeyService);
        this._canUndo = EditorContextKeys.canUndo.bindTo(contextKeyService);
        this._canRedo = EditorContextKeys.canRedo.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
        this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
        this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._tabMovesFocus.set(tabFocusMode)));
        this._updateFromConfig();
        this._updateFromSelection();
        this._updateFromFocus();
        this._updateFromModel();
        this._editorSimpleInput.set(this._editor.isSimpleWidget);
    }
    _updateFromConfig() {
        const options = this._editor.getOptions();
        this._tabMovesFocus.set(options.get(163 /* EditorOption.tabFocusMode */) || TabFocus.getTabFocusMode());
        this._editorReadonly.set(options.get(103 /* EditorOption.readOnly */));
        this._inDiffEditor.set(options.get(70 /* EditorOption.inDiffEditor */));
        this._editorColumnSelection.set(options.get(28 /* EditorOption.columnSelection */));
    }
    _updateFromSelection() {
        const selections = this._editor.getSelections();
        if (!selections) {
            this._hasMultipleSelections.reset();
            this._hasNonEmptySelection.reset();
        }
        else {
            this._hasMultipleSelections.set(selections.length > 1);
            this._hasNonEmptySelection.set(selections.some(s => !s.isEmpty()));
        }
    }
    _updateFromFocus() {
        this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
        this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
        this._textInputFocus.set(this._editor.hasTextFocus());
    }
    _updateFromModel() {
        const model = this._editor.getModel();
        this._canUndo.set(Boolean(model && model.canUndo()));
        this._canRedo.set(Boolean(model && model.canRedo()));
    }
}
export class EditorModeContext extends Disposable {
    constructor(_editor, _contextKeyService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._languageFeaturesService = _languageFeaturesService;
        this._langId = EditorContextKeys.languageId.bindTo(_contextKeyService);
        this._hasCompletionItemProvider = EditorContextKeys.hasCompletionItemProvider.bindTo(_contextKeyService);
        this._hasCodeActionsProvider = EditorContextKeys.hasCodeActionsProvider.bindTo(_contextKeyService);
        this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.bindTo(_contextKeyService);
        this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.bindTo(_contextKeyService);
        this._hasDeclarationProvider = EditorContextKeys.hasDeclarationProvider.bindTo(_contextKeyService);
        this._hasImplementationProvider = EditorContextKeys.hasImplementationProvider.bindTo(_contextKeyService);
        this._hasTypeDefinitionProvider = EditorContextKeys.hasTypeDefinitionProvider.bindTo(_contextKeyService);
        this._hasHoverProvider = EditorContextKeys.hasHoverProvider.bindTo(_contextKeyService);
        this._hasDocumentHighlightProvider = EditorContextKeys.hasDocumentHighlightProvider.bindTo(_contextKeyService);
        this._hasDocumentSymbolProvider = EditorContextKeys.hasDocumentSymbolProvider.bindTo(_contextKeyService);
        this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.bindTo(_contextKeyService);
        this._hasRenameProvider = EditorContextKeys.hasRenameProvider.bindTo(_contextKeyService);
        this._hasSignatureHelpProvider = EditorContextKeys.hasSignatureHelpProvider.bindTo(_contextKeyService);
        this._hasInlayHintsProvider = EditorContextKeys.hasInlayHintsProvider.bindTo(_contextKeyService);
        this._hasDocumentFormattingProvider = EditorContextKeys.hasDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasDocumentSelectionFormattingProvider = EditorContextKeys.hasDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentFormattingProvider = EditorContextKeys.hasMultipleDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentSelectionFormattingProvider = EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._isInEmbeddedEditor = EditorContextKeys.isInEmbeddedEditor.bindTo(_contextKeyService);
        const update = () => this._update();
        // update when model/mode changes
        this._register(_editor.onDidChangeModel(update));
        this._register(_editor.onDidChangeModelLanguage(update));
        // update when registries change
        this._register(_languageFeaturesService.completionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeActionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeLensProvider.onDidChange(update));
        this._register(_languageFeaturesService.definitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.declarationProvider.onDidChange(update));
        this._register(_languageFeaturesService.implementationProvider.onDidChange(update));
        this._register(_languageFeaturesService.typeDefinitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.hoverProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentHighlightProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentSymbolProvider.onDidChange(update));
        this._register(_languageFeaturesService.referenceProvider.onDidChange(update));
        this._register(_languageFeaturesService.renameProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.signatureHelpProvider.onDidChange(update));
        this._register(_languageFeaturesService.inlayHintsProvider.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    reset() {
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.reset();
            this._hasCompletionItemProvider.reset();
            this._hasCodeActionsProvider.reset();
            this._hasCodeLensProvider.reset();
            this._hasDefinitionProvider.reset();
            this._hasDeclarationProvider.reset();
            this._hasImplementationProvider.reset();
            this._hasTypeDefinitionProvider.reset();
            this._hasHoverProvider.reset();
            this._hasDocumentHighlightProvider.reset();
            this._hasDocumentSymbolProvider.reset();
            this._hasReferenceProvider.reset();
            this._hasRenameProvider.reset();
            this._hasDocumentFormattingProvider.reset();
            this._hasDocumentSelectionFormattingProvider.reset();
            this._hasSignatureHelpProvider.reset();
            this._isInEmbeddedEditor.reset();
        });
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            this.reset();
            return;
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.set(model.getLanguageId());
            this._hasCompletionItemProvider.set(this._languageFeaturesService.completionProvider.has(model));
            this._hasCodeActionsProvider.set(this._languageFeaturesService.codeActionProvider.has(model));
            this._hasCodeLensProvider.set(this._languageFeaturesService.codeLensProvider.has(model));
            this._hasDefinitionProvider.set(this._languageFeaturesService.definitionProvider.has(model));
            this._hasDeclarationProvider.set(this._languageFeaturesService.declarationProvider.has(model));
            this._hasImplementationProvider.set(this._languageFeaturesService.implementationProvider.has(model));
            this._hasTypeDefinitionProvider.set(this._languageFeaturesService.typeDefinitionProvider.has(model));
            this._hasHoverProvider.set(this._languageFeaturesService.hoverProvider.has(model));
            this._hasDocumentHighlightProvider.set(this._languageFeaturesService.documentHighlightProvider.has(model));
            this._hasDocumentSymbolProvider.set(this._languageFeaturesService.documentSymbolProvider.has(model));
            this._hasReferenceProvider.set(this._languageFeaturesService.referenceProvider.has(model));
            this._hasRenameProvider.set(this._languageFeaturesService.renameProvider.has(model));
            this._hasSignatureHelpProvider.set(this._languageFeaturesService.signatureHelpProvider.has(model));
            this._hasInlayHintsProvider.set(this._languageFeaturesService.inlayHintsProvider.has(model));
            this._hasDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.has(model) || this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasMultipleDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.all(model).length + this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._hasMultipleDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._isInEmbeddedEditor.set(model.uri.scheme === Schemas.walkThroughSnippet || model.uri.scheme === Schemas.vscodeChatCodeBlock);
        });
    }
}
class EditorDecorationsCollection {
    get length() {
        return this._decorationIds.length;
    }
    constructor(_editor, decorations) {
        this._editor = _editor;
        this._decorationIds = [];
        this._isChangingDecorations = false;
        if (Array.isArray(decorations) && decorations.length > 0) {
            this.set(decorations);
        }
    }
    onDidChange(listener, thisArgs, disposables) {
        return this._editor.onDidChangeModelDecorations((e) => {
            if (this._isChangingDecorations) {
                return;
            }
            listener.call(thisArgs, e);
        }, disposables);
    }
    getRange(index) {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (index >= this._decorationIds.length) {
            return null;
        }
        return this._editor.getModel().getDecorationRange(this._decorationIds[index]);
    }
    getRanges() {
        if (!this._editor.hasModel()) {
            return [];
        }
        const model = this._editor.getModel();
        const result = [];
        for (const decorationId of this._decorationIds) {
            const range = model.getDecorationRange(decorationId);
            if (range) {
                result.push(range);
            }
        }
        return result;
    }
    has(decoration) {
        return this._decorationIds.includes(decoration.id);
    }
    clear() {
        if (this._decorationIds.length === 0) {
            // nothing to do
            return;
        }
        this.set([]);
    }
    set(newDecorations) {
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                this._decorationIds = accessor.deltaDecorations(this._decorationIds, newDecorations);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return this._decorationIds;
    }
    append(newDecorations) {
        let newDecorationIds = [];
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                newDecorationIds = accessor.deltaDecorations([], newDecorations);
                this._decorationIds = this._decorationIds.concat(newDecorationIds);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return newDecorationIds;
    }
}
const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);
function getSquigglySVGData(color) {
    return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}
const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);
function getDotDotDotSVGData(color) {
    return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}
registerThemingParticipant((theme, collector) => {
    const errorForeground = theme.getColor(editorErrorForeground);
    if (errorForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-error" /* ClassName.EditorErrorDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-error-decoration: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}"); }`);
    }
    const warningForeground = theme.getColor(editorWarningForeground);
    if (warningForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-warning" /* ClassName.EditorWarningDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-warning-decoration: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}"); }`);
    }
    const infoForeground = theme.getColor(editorInfoForeground);
    if (infoForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-info" /* ClassName.EditorInfoDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-info-decoration: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}"); }`);
    }
    const hintForeground = theme.getColor(editorHintForeground);
    if (hintForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-hint" /* ClassName.EditorHintDecoration */} { background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat bottom left; }`);
        collector.addRule(`:root { --monaco-editor-hint-decoration: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}"); }`);
    }
    const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
    if (unnecessaryForeground) {
        collector.addRule(`.monaco-editor.showUnused .${"squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */} { opacity: ${unnecessaryForeground.rgba.a}; }`);
        collector.addRule(`:root { --monaco-editor-unnecessary-decoration-opacity: ${unnecessaryForeground.rgba.a}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2NvZGVFZGl0b3IvY29kZUVkaXRvcldpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxxQ0FBcUMsQ0FBQztBQUM3QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBSXZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQTZDLHdCQUF3QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEksT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQWdDLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLGNBQWMsQ0FBQztBQUN0QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUE4QixNQUFNLHFDQUFxQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQWtDLE1BQU0sMkJBQTJCLENBQUM7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFrRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1B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