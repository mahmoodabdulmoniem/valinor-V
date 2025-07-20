/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ArrayQueue } from '../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import * as strings from '../../../base/common/strings.js';
import { EDITOR_FONT_DEFAULTS, filterValidationDecorations, filterFontDecorations } from '../config/editorOptions.js';
import { CursorsController } from '../cursor/cursor.js';
import { CursorConfiguration } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { TextDirection } from '../model.js';
import * as textModelEvents from '../textModelEvents.js';
import { TokenizationRegistry } from '../languages.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { tokenizeLineToHTML } from '../languages/textToHtmlTokenizer.js';
import * as viewEvents from '../viewEvents.js';
import { ViewLayout } from '../viewLayout/viewLayout.js';
import { MinimapTokensColorTracker } from './minimapTokensColorTracker.js';
import { MinimapLinesRenderingData, OverviewRulerDecorationsGroup, ViewLineRenderingData } from '../viewModel.js';
import { ViewModelDecorations } from './viewModelDecorations.js';
import { FocusChangedEvent, HiddenAreasChangedEvent, ModelContentChangedEvent, ModelDecorationsChangedEvent, ModelFontChangedEvent, ModelLanguageChangedEvent, ModelLanguageConfigurationChangedEvent, ModelLineHeightChangedEvent, ModelOptionsChangedEvent, ModelTokensChangedEvent, ReadOnlyEditAttemptEvent, ScrollChangedEvent, ViewModelEventDispatcher, ViewZonesChangedEvent, WidgetFocusChangedEvent } from '../viewModelEventDispatcher.js';
import { ViewModelLinesFromModelAsIs, ViewModelLinesFromProjectedModel } from './viewModelLines.js';
import { GlyphMarginLanesModel } from './glyphLanesModel.js';
const USE_IDENTITY_LINES_COLLECTION = true;
export class ViewModel extends Disposable {
    constructor(editorId, configuration, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, scheduleAtNextAnimationFrame, languageConfigurationService, _themeService, _attachedView, _transactionalTarget) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        this._themeService = _themeService;
        this._attachedView = _attachedView;
        this._transactionalTarget = _transactionalTarget;
        this.hiddenAreasModel = new HiddenAreasModel();
        this.previousHiddenAreas = [];
        this._editorId = editorId;
        this._configuration = configuration;
        this.model = model;
        this._eventDispatcher = new ViewModelEventDispatcher();
        this.onEvent = this._eventDispatcher.onEvent;
        this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
        this._updateConfigurationViewLineCount = this._register(new RunOnceScheduler(() => this._updateConfigurationViewLineCountNow(), 0));
        this._hasFocus = false;
        this._viewportStart = ViewportStart.create(this.model);
        this.glyphLanes = new GlyphMarginLanesModel(0);
        if (USE_IDENTITY_LINES_COLLECTION && this.model.isTooLargeForTokenization()) {
            this._lines = new ViewModelLinesFromModelAsIs(this.model);
        }
        else {
            const options = this._configuration.options;
            const fontInfo = options.get(59 /* EditorOption.fontInfo */);
            const wrappingStrategy = options.get(155 /* EditorOption.wrappingStrategy */);
            const wrappingInfo = options.get(165 /* EditorOption.wrappingInfo */);
            const wrappingIndent = options.get(154 /* EditorOption.wrappingIndent */);
            const wordBreak = options.get(145 /* EditorOption.wordBreak */);
            const wrapOnEscapedLineFeeds = options.get(159 /* EditorOption.wrapOnEscapedLineFeeds */);
            this._lines = new ViewModelLinesFromProjectedModel(this._editorId, this.model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, this.model.getOptions().tabSize, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds);
        }
        this.coordinatesConverter = this._lines.createCoordinatesConverter();
        this._cursor = this._register(new CursorsController(model, this, this.coordinatesConverter, this.cursorConfig));
        this.viewLayout = this._register(new ViewLayout(this._configuration, this.getLineCount(), this._getCustomLineHeights(), scheduleAtNextAnimationFrame));
        this._register(this.viewLayout.onDidScroll((e) => {
            if (e.scrollTopChanged) {
                this._handleVisibleLinesChanged();
            }
            if (e.scrollTopChanged) {
                this._viewportStart.invalidate();
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewScrollChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ScrollChangedEvent(e.oldScrollWidth, e.oldScrollLeft, e.oldScrollHeight, e.oldScrollTop, e.scrollWidth, e.scrollLeft, e.scrollHeight, e.scrollTop));
        }));
        this._register(this.viewLayout.onDidContentSizeChange((e) => {
            this._eventDispatcher.emitOutgoingEvent(e);
        }));
        this._decorations = new ViewModelDecorations(this._editorId, this.model, this._configuration, this._lines, this.coordinatesConverter);
        this._registerModelEvents();
        this._register(this._configuration.onDidChangeFast((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                this._onConfigurationChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        }));
        this._register(MinimapTokensColorTracker.getInstance().onDidChange(() => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensColorsChangedEvent());
        }));
        this._register(this._themeService.onDidColorThemeChange((theme) => {
            this._invalidateDecorationsColorCache();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewThemeChangedEvent(theme));
        }));
        this._updateConfigurationViewLineCountNow();
    }
    dispose() {
        // First remove listeners, as disposing the lines might end up sending
        // model decoration changed events ... and we no longer care about them ...
        super.dispose();
        this._decorations.dispose();
        this._lines.dispose();
        this._viewportStart.dispose();
        this._eventDispatcher.dispose();
    }
    createLineBreaksComputer() {
        return this._lines.createLineBreaksComputer();
    }
    addViewEventHandler(eventHandler) {
        this._eventDispatcher.addViewEventHandler(eventHandler);
    }
    removeViewEventHandler(eventHandler) {
        this._eventDispatcher.removeViewEventHandler(eventHandler);
    }
    _getCustomLineHeights() {
        const allowVariableLineHeights = this._configuration.options.get(5 /* EditorOption.allowVariableLineHeights */);
        if (!allowVariableLineHeights) {
            return [];
        }
        const decorations = this.model.getCustomLineHeightsDecorations(this._editorId);
        return decorations.map((d) => {
            const lineNumber = d.range.startLineNumber;
            const viewRange = this.coordinatesConverter.convertModelRangeToViewRange(new Range(lineNumber, 1, lineNumber, this.model.getLineMaxColumn(lineNumber)));
            return {
                decorationId: d.id,
                startLineNumber: viewRange.startLineNumber,
                endLineNumber: viewRange.endLineNumber,
                lineHeight: d.options.lineHeight || 0
            };
        });
    }
    _updateConfigurationViewLineCountNow() {
        this._configuration.setViewLineCount(this._lines.getViewLineCount());
    }
    getModelVisibleRanges() {
        const linesViewportData = this.viewLayout.getLinesViewportData();
        const viewVisibleRange = new Range(linesViewportData.startLineNumber, this.getLineMinColumn(linesViewportData.startLineNumber), linesViewportData.endLineNumber, this.getLineMaxColumn(linesViewportData.endLineNumber));
        const modelVisibleRanges = this._toModelVisibleRanges(viewVisibleRange);
        return modelVisibleRanges;
    }
    visibleLinesStabilized() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, true);
    }
    _handleVisibleLinesChanged() {
        const modelVisibleRanges = this.getModelVisibleRanges();
        this._attachedView.setVisibleLines(modelVisibleRanges, false);
    }
    setHasFocus(hasFocus) {
        this._hasFocus = hasFocus;
        this._cursor.setHasFocus(hasFocus);
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewFocusChangedEvent(hasFocus));
        this._eventDispatcher.emitOutgoingEvent(new FocusChangedEvent(!hasFocus, hasFocus));
    }
    setHasWidgetFocus(hasWidgetFocus) {
        this._eventDispatcher.emitOutgoingEvent(new WidgetFocusChangedEvent(!hasWidgetFocus, hasWidgetFocus));
    }
    onCompositionStart() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionStartEvent());
    }
    onCompositionEnd() {
        this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewCompositionEndEvent());
    }
    _captureStableViewport() {
        // We might need to restore the current start view range, so save it (if available)
        // But only if the scroll position is not at the top of the file
        if (this._viewportStart.isValid && this.viewLayout.getCurrentScrollTop() > 0) {
            const previousViewportStartViewPosition = new Position(this._viewportStart.viewLineNumber, this.getLineMinColumn(this._viewportStart.viewLineNumber));
            const previousViewportStartModelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(previousViewportStartViewPosition);
            return new StableViewport(previousViewportStartModelPosition, this._viewportStart.startLineDelta);
        }
        return new StableViewport(null, 0);
    }
    _onConfigurationChanged(eventsCollector, e) {
        const stableViewport = this._captureStableViewport();
        const options = this._configuration.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const wrappingStrategy = options.get(155 /* EditorOption.wrappingStrategy */);
        const wrappingInfo = options.get(165 /* EditorOption.wrappingInfo */);
        const wrappingIndent = options.get(154 /* EditorOption.wrappingIndent */);
        const wordBreak = options.get(145 /* EditorOption.wordBreak */);
        if (this._lines.setWrappingSettings(fontInfo, wrappingStrategy, wrappingInfo.wrappingColumn, wrappingIndent, wordBreak)) {
            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
            this._cursor.onLineMappingChanged(eventsCollector);
            this._decorations.onLineMappingChanged();
            this.viewLayout.onFlushed(this.getLineCount(), this._getCustomLineHeights());
            this._updateConfigurationViewLineCount.schedule();
        }
        if (e.hasChanged(103 /* EditorOption.readOnly */)) {
            // Must read again all decorations due to readOnly filtering
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        if (e.hasChanged(111 /* EditorOption.renderValidationDecorations */)) {
            this._decorations.reset();
            eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
        }
        eventsCollector.emitViewEvent(new viewEvents.ViewConfigurationChangedEvent(e));
        this.viewLayout.onConfigurationChanged(e);
        stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
        if (CursorConfiguration.shouldRecreate(e)) {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
        }
    }
    _registerModelEvents() {
        this._register(this.model.onDidChangeContentOrInjectedText((e) => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                let hadOtherModelChange = false;
                let hadModelLineChangeThatChangedLineMapping = false;
                const changes = (e instanceof textModelEvents.InternalModelContentChangeEvent ? e.rawContentChangedEvent.changes : e.changes);
                const versionId = (e instanceof textModelEvents.InternalModelContentChangeEvent ? e.rawContentChangedEvent.versionId : null);
                // Do a first pass to compute line mappings, and a second pass to actually interpret them
                const lineBreaksComputer = this._lines.createLineBreaksComputer();
                for (const change of changes) {
                    switch (change.changeType) {
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            for (let lineIdx = 0; lineIdx < change.detail.length; lineIdx++) {
                                const line = change.detail[lineIdx];
                                let injectedText = change.injectedTexts[lineIdx];
                                if (injectedText) {
                                    injectedText = injectedText.filter(element => (!element.ownerId || element.ownerId === this._editorId));
                                }
                                lineBreaksComputer.addRequest(line, injectedText, null);
                            }
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            let injectedText = null;
                            if (change.injectedText) {
                                injectedText = change.injectedText.filter(element => (!element.ownerId || element.ownerId === this._editorId));
                            }
                            lineBreaksComputer.addRequest(change.detail, injectedText, null);
                            break;
                        }
                    }
                }
                const lineBreaks = lineBreaksComputer.finalize();
                const lineBreakQueue = new ArrayQueue(lineBreaks);
                for (const change of changes) {
                    switch (change.changeType) {
                        case 1 /* textModelEvents.RawContentChangedType.Flush */: {
                            this._lines.onModelFlushed();
                            eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                            this._decorations.reset();
                            this.viewLayout.onFlushed(this.getLineCount(), this._getCustomLineHeights());
                            hadOtherModelChange = true;
                            break;
                        }
                        case 3 /* textModelEvents.RawContentChangedType.LinesDeleted */: {
                            const linesDeletedEvent = this._lines.onModelLinesDeleted(versionId, change.fromLineNumber, change.toLineNumber);
                            if (linesDeletedEvent !== null) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 4 /* textModelEvents.RawContentChangedType.LinesInserted */: {
                            const insertedLineBreaks = lineBreakQueue.takeCount(change.detail.length);
                            const linesInsertedEvent = this._lines.onModelLinesInserted(versionId, change.fromLineNumber, change.toLineNumber, insertedLineBreaks);
                            if (linesInsertedEvent !== null) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            hadOtherModelChange = true;
                            break;
                        }
                        case 2 /* textModelEvents.RawContentChangedType.LineChanged */: {
                            const changedLineBreakData = lineBreakQueue.dequeue();
                            const [lineMappingChanged, linesChangedEvent, linesInsertedEvent, linesDeletedEvent] = this._lines.onModelLineChanged(versionId, change.lineNumber, changedLineBreakData);
                            hadModelLineChangeThatChangedLineMapping = lineMappingChanged;
                            if (linesChangedEvent) {
                                eventsCollector.emitViewEvent(linesChangedEvent);
                            }
                            if (linesInsertedEvent) {
                                eventsCollector.emitViewEvent(linesInsertedEvent);
                                this.viewLayout.onLinesInserted(linesInsertedEvent.fromLineNumber, linesInsertedEvent.toLineNumber);
                            }
                            if (linesDeletedEvent) {
                                eventsCollector.emitViewEvent(linesDeletedEvent);
                                this.viewLayout.onLinesDeleted(linesDeletedEvent.fromLineNumber, linesDeletedEvent.toLineNumber);
                            }
                            break;
                        }
                        case 5 /* textModelEvents.RawContentChangedType.EOLChanged */: {
                            // Nothing to do. The new version will be accepted below
                            break;
                        }
                    }
                }
                if (versionId !== null) {
                    this._lines.acceptVersionId(versionId);
                }
                this.viewLayout.onHeightMaybeChanged();
                if (!hadOtherModelChange && hadModelLineChangeThatChangedLineMapping) {
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                }
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            // Update the configuration and reset the centered view line
            const viewportStartWasValid = this._viewportStart.isValid;
            this._viewportStart.invalidate();
            this._configuration.setModelLineCount(this.model.getLineCount());
            this._updateConfigurationViewLineCountNow();
            // Recover viewport
            if (!this._hasFocus && this.model.getAttachedEditorCount() >= 2 && viewportStartWasValid) {
                const modelRange = this.model._getTrackedRange(this._viewportStart.modelTrackedRange);
                if (modelRange) {
                    const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelRange.getStartPosition());
                    const viewPositionTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
                    this.viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this._viewportStart.startLineDelta }, 1 /* ScrollType.Immediate */);
                }
            }
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                if (e instanceof textModelEvents.InternalModelContentChangeEvent) {
                    eventsCollector.emitOutgoingEvent(new ModelContentChangedEvent(e.contentChangedEvent));
                }
                this._cursor.onModelContentChanged(eventsCollector, e);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
            this._handleVisibleLinesChanged();
        }));
        const allowVariableLineHeights = this._configuration.options.get(5 /* EditorOption.allowVariableLineHeights */);
        if (allowVariableLineHeights) {
            this._register(this.model.onDidChangeLineHeight((e) => {
                const filteredChanges = e.changes.filter((change) => change.ownerId === this._editorId || change.ownerId === 0);
                this.viewLayout.changeSpecialLineHeights((accessor) => {
                    for (const change of filteredChanges) {
                        const { decorationId, lineNumber, lineHeight } = change;
                        const viewRange = this.coordinatesConverter.convertModelRangeToViewRange(new Range(lineNumber, 1, lineNumber, this.model.getLineMaxColumn(lineNumber)));
                        if (lineHeight !== null) {
                            accessor.insertOrChangeCustomLineHeight(decorationId, viewRange.startLineNumber, viewRange.endLineNumber, lineHeight);
                        }
                        else {
                            accessor.removeCustomLineHeight(decorationId);
                        }
                    }
                });
                // recreate the model event using the filtered changes
                if (filteredChanges.length > 0) {
                    const filteredEvent = new textModelEvents.ModelLineHeightChangedEvent(filteredChanges);
                    this._eventDispatcher.emitOutgoingEvent(new ModelLineHeightChangedEvent(filteredEvent));
                }
            }));
        }
        const allowVariableFonts = this._configuration.options.get(171 /* EditorOption.effectiveAllowVariableFonts */);
        if (allowVariableFonts) {
            this._register(this.model.onDidChangeFont((e) => {
                const filteredChanges = e.changes.filter((change) => change.ownerId === this._editorId || change.ownerId === 0);
                // recreate the model event using the filtered changes
                if (filteredChanges.length > 0) {
                    const filteredEvent = new textModelEvents.ModelFontChangedEvent(filteredChanges);
                    this._eventDispatcher.emitOutgoingEvent(new ModelFontChangedEvent(filteredEvent));
                }
            }));
        }
        this._register(this.model.onDidChangeTokens((e) => {
            const viewRanges = [];
            for (let j = 0, lenJ = e.ranges.length; j < lenJ; j++) {
                const modelRange = e.ranges[j];
                const viewStartLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.fromLineNumber, 1)).lineNumber;
                const viewEndLineNumber = this.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.toLineNumber, this.model.getLineMaxColumn(modelRange.toLineNumber))).lineNumber;
                viewRanges[j] = {
                    fromLineNumber: viewStartLineNumber,
                    toLineNumber: viewEndLineNumber
                };
            }
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewTokensChangedEvent(viewRanges));
            this._eventDispatcher.emitOutgoingEvent(new ModelTokensChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguageConfiguration((e) => {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewLanguageConfigurationEvent());
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageConfigurationChangedEvent(e));
        }));
        this._register(this.model.onDidChangeLanguage((e) => {
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelLanguageChangedEvent(e));
        }));
        this._register(this.model.onDidChangeOptions((e) => {
            // A tab size change causes a line mapping changed event => all view parts will repaint OK, no further event needed here
            if (this._lines.setTabSize(this.model.getOptions().tabSize)) {
                try {
                    const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                    eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                    eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                    this._cursor.onLineMappingChanged(eventsCollector);
                    this._decorations.onLineMappingChanged();
                    this.viewLayout.onFlushed(this.getLineCount(), this._getCustomLineHeights());
                }
                finally {
                    this._eventDispatcher.endEmitViewEvents();
                }
                this._updateConfigurationViewLineCount.schedule();
            }
            this.cursorConfig = new CursorConfiguration(this.model.getLanguageId(), this.model.getOptions(), this._configuration, this.languageConfigurationService);
            this._cursor.updateConfiguration(this.cursorConfig);
            this._eventDispatcher.emitOutgoingEvent(new ModelOptionsChangedEvent(e));
        }));
        this._register(this.model.onDidChangeDecorations((e) => {
            this._decorations.onModelDecorationsChanged();
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewDecorationsChangedEvent(e));
            this._eventDispatcher.emitOutgoingEvent(new ModelDecorationsChangedEvent(e));
        }));
    }
    getFontSizeAtPosition(position) {
        const allowVariableFonts = this._configuration.options.get(171 /* EditorOption.effectiveAllowVariableFonts */);
        if (!allowVariableFonts) {
            return null;
        }
        const fontDecorations = this.model.getFontDecorationsInRange(Range.fromPositions(position), this._editorId);
        let fontSize = this._configuration.options.get(59 /* EditorOption.fontInfo */).fontSize + 'px';
        for (const fontDecoration of fontDecorations) {
            if (fontDecoration.options.fontSize) {
                fontSize = fontDecoration.options.fontSize;
                break;
            }
        }
        return fontSize;
    }
    /**
     * @param forceUpdate If true, the hidden areas will be updated even if the new ranges are the same as the previous ranges.
     * This is because the model might have changed, which resets the hidden areas, but not the last cached value.
     * This needs a better fix in the future.
    */
    setHiddenAreas(ranges, source, forceUpdate) {
        this.hiddenAreasModel.setHiddenAreas(source, ranges);
        const mergedRanges = this.hiddenAreasModel.getMergedRanges();
        if (mergedRanges === this.previousHiddenAreas && !forceUpdate) {
            return;
        }
        this.previousHiddenAreas = mergedRanges;
        const stableViewport = this._captureStableViewport();
        let lineMappingChanged = false;
        try {
            const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
            lineMappingChanged = this._lines.setHiddenAreas(mergedRanges);
            if (lineMappingChanged) {
                eventsCollector.emitViewEvent(new viewEvents.ViewFlushedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewLineMappingChangedEvent());
                eventsCollector.emitViewEvent(new viewEvents.ViewDecorationsChangedEvent(null));
                this._cursor.onLineMappingChanged(eventsCollector);
                this._decorations.onLineMappingChanged();
                this.viewLayout.onFlushed(this.getLineCount(), this._getCustomLineHeights());
                this.viewLayout.onHeightMaybeChanged();
            }
            const firstModelLineInViewPort = stableViewport.viewportStartModelPosition?.lineNumber;
            const firstModelLineIsHidden = firstModelLineInViewPort && mergedRanges.some(range => range.startLineNumber <= firstModelLineInViewPort && firstModelLineInViewPort <= range.endLineNumber);
            if (!firstModelLineIsHidden) {
                stableViewport.recoverViewportStart(this.coordinatesConverter, this.viewLayout);
            }
        }
        finally {
            this._eventDispatcher.endEmitViewEvents();
        }
        this._updateConfigurationViewLineCount.schedule();
        if (lineMappingChanged) {
            this._eventDispatcher.emitOutgoingEvent(new HiddenAreasChangedEvent());
        }
    }
    getVisibleRangesPlusViewportAboveBelow() {
        const layoutInfo = this._configuration.options.get(164 /* EditorOption.layoutInfo */);
        const lineHeight = this._configuration.options.get(75 /* EditorOption.lineHeight */);
        const linesAround = Math.max(20, Math.round(layoutInfo.height / lineHeight));
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = Math.max(1, partialData.completelyVisibleStartLineNumber - linesAround);
        const endViewLineNumber = Math.min(this.getLineCount(), partialData.completelyVisibleEndLineNumber + linesAround);
        return this._toModelVisibleRanges(new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber)));
    }
    getVisibleRanges() {
        const visibleViewRange = this.getCompletelyVisibleViewRange();
        return this._toModelVisibleRanges(visibleViewRange);
    }
    getHiddenAreas() {
        return this._lines.getHiddenAreas();
    }
    _toModelVisibleRanges(visibleViewRange) {
        const visibleRange = this.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        const hiddenAreas = this._lines.getHiddenAreas();
        if (hiddenAreas.length === 0) {
            return [visibleRange];
        }
        const result = [];
        let resultLen = 0;
        let startLineNumber = visibleRange.startLineNumber;
        let startColumn = visibleRange.startColumn;
        const endLineNumber = visibleRange.endLineNumber;
        const endColumn = visibleRange.endColumn;
        for (let i = 0, len = hiddenAreas.length; i < len; i++) {
            const hiddenStartLineNumber = hiddenAreas[i].startLineNumber;
            const hiddenEndLineNumber = hiddenAreas[i].endLineNumber;
            if (hiddenEndLineNumber < startLineNumber) {
                continue;
            }
            if (hiddenStartLineNumber > endLineNumber) {
                continue;
            }
            if (startLineNumber < hiddenStartLineNumber) {
                result[resultLen++] = new Range(startLineNumber, startColumn, hiddenStartLineNumber - 1, this.model.getLineMaxColumn(hiddenStartLineNumber - 1));
            }
            startLineNumber = hiddenEndLineNumber + 1;
            startColumn = 1;
        }
        if (startLineNumber < endLineNumber || (startLineNumber === endLineNumber && startColumn < endColumn)) {
            result[resultLen++] = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
        }
        return result;
    }
    getCompletelyVisibleViewRange() {
        const partialData = this.viewLayout.getLinesViewportData();
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    getCompletelyVisibleViewRangeAtScrollTop(scrollTop) {
        const partialData = this.viewLayout.getLinesViewportDataAtScrollTop(scrollTop);
        const startViewLineNumber = partialData.completelyVisibleStartLineNumber;
        const endViewLineNumber = partialData.completelyVisibleEndLineNumber;
        return new Range(startViewLineNumber, this.getLineMinColumn(startViewLineNumber), endViewLineNumber, this.getLineMaxColumn(endViewLineNumber));
    }
    saveState() {
        const compatViewState = this.viewLayout.saveState();
        const scrollTop = compatViewState.scrollTop;
        const firstViewLineNumber = this.viewLayout.getLineNumberAtVerticalOffset(scrollTop);
        const firstPosition = this.coordinatesConverter.convertViewPositionToModelPosition(new Position(firstViewLineNumber, this.getLineMinColumn(firstViewLineNumber)));
        const firstPositionDeltaTop = this.viewLayout.getVerticalOffsetForLineNumber(firstViewLineNumber) - scrollTop;
        return {
            scrollLeft: compatViewState.scrollLeft,
            firstPosition: firstPosition,
            firstPositionDeltaTop: firstPositionDeltaTop
        };
    }
    reduceRestoreState(state) {
        if (typeof state.firstPosition === 'undefined') {
            // This is a view state serialized by an older version
            return this._reduceRestoreStateCompatibility(state);
        }
        const modelPosition = this.model.validatePosition(state.firstPosition);
        const viewPosition = this.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        const scrollTop = this.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber) - state.firstPositionDeltaTop;
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: scrollTop
        };
    }
    _reduceRestoreStateCompatibility(state) {
        return {
            scrollLeft: state.scrollLeft,
            scrollTop: state.scrollTopWithoutViewZones
        };
    }
    getTabSize() {
        return this.model.getOptions().tabSize;
    }
    getLineCount() {
        return this._lines.getViewLineCount();
    }
    /**
     * Gives a hint that a lot of requests are about to come in for these line numbers.
     */
    setViewport(startLineNumber, endLineNumber, centeredLineNumber) {
        this._viewportStart.update(this, startLineNumber);
    }
    getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber) {
        return this._lines.getActiveIndentGuide(lineNumber, minLineNumber, maxLineNumber);
    }
    getLinesIndentGuides(startLineNumber, endLineNumber) {
        return this._lines.getViewLinesIndentGuides(startLineNumber, endLineNumber);
    }
    getBracketGuidesInRangeByLine(startLineNumber, endLineNumber, activePosition, options) {
        return this._lines.getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition, options);
    }
    getLineContent(lineNumber) {
        return this._lines.getViewLineContent(lineNumber);
    }
    getLineLength(lineNumber) {
        return this._lines.getViewLineLength(lineNumber);
    }
    getLineMinColumn(lineNumber) {
        return this._lines.getViewLineMinColumn(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        return this._lines.getViewLineMaxColumn(lineNumber);
    }
    getLineFirstNonWhitespaceColumn(lineNumber) {
        const result = strings.firstNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 1;
    }
    getLineLastNonWhitespaceColumn(lineNumber) {
        const result = strings.lastNonWhitespaceIndex(this.getLineContent(lineNumber));
        if (result === -1) {
            return 0;
        }
        return result + 2;
    }
    getMinimapDecorationsInRange(range) {
        return this._decorations.getMinimapDecorationsInRange(range);
    }
    getDecorationsInViewport(visibleRange) {
        return this._decorations.getDecorationsViewportData(visibleRange).decorations;
    }
    getInjectedTextAt(viewPosition) {
        return this._lines.getInjectedTextAt(viewPosition);
    }
    _getTextDirection(lineNumber, decorations) {
        let rtlCount = 0;
        for (const decoration of decorations) {
            const range = decoration.range;
            if (range.startLineNumber > lineNumber || range.endLineNumber < lineNumber) {
                continue;
            }
            const textDirection = decoration.options.textDirection;
            if (textDirection === TextDirection.RTL) {
                rtlCount++;
            }
            else if (textDirection === TextDirection.LTR) {
                rtlCount--;
            }
        }
        return rtlCount > 0 ? TextDirection.RTL : TextDirection.LTR;
    }
    getTextDirection(lineNumber) {
        const decorationsCollection = this._decorations.getDecorationsOnLine(lineNumber);
        return this._getTextDirection(lineNumber, decorationsCollection.decorations);
    }
    getViewportViewLineRenderingData(visibleRange, lineNumber) {
        const viewportDecorationsCollection = this._decorations.getDecorationsViewportData(visibleRange);
        const inlineDecorations = viewportDecorationsCollection.inlineDecorations[lineNumber - visibleRange.startLineNumber];
        return this._getViewLineRenderingData(lineNumber, inlineDecorations, viewportDecorationsCollection.hasVariableFonts, viewportDecorationsCollection.decorations);
    }
    getViewLineRenderingData(lineNumber) {
        const decorationsCollection = this._decorations.getDecorationsOnLine(lineNumber);
        return this._getViewLineRenderingData(lineNumber, decorationsCollection.inlineDecorations[0], decorationsCollection.hasVariableFonts, decorationsCollection.decorations);
    }
    _getViewLineRenderingData(lineNumber, inlineDecorations, hasVariableFonts, decorations) {
        const mightContainRTL = this.model.mightContainRTL();
        const mightContainNonBasicASCII = this.model.mightContainNonBasicASCII();
        const tabSize = this.getTabSize();
        const lineData = this._lines.getViewLineData(lineNumber);
        if (lineData.inlineDecorations) {
            inlineDecorations = [
                ...inlineDecorations,
                ...lineData.inlineDecorations.map(d => d.toInlineDecoration(lineNumber))
            ];
        }
        return new ViewLineRenderingData(lineData.minColumn, lineData.maxColumn, lineData.content, lineData.continuesWithWrappedLine, mightContainRTL, mightContainNonBasicASCII, lineData.tokens, inlineDecorations, tabSize, lineData.startVisibleColumn, this._getTextDirection(lineNumber, decorations), hasVariableFonts);
    }
    getViewLineData(lineNumber) {
        return this._lines.getViewLineData(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        const result = this._lines.getViewLinesData(startLineNumber, endLineNumber, needed);
        return new MinimapLinesRenderingData(this.getTabSize(), result);
    }
    getAllOverviewRulerDecorations(theme) {
        const decorations = this.model.getOverviewRulerDecorations(this._editorId, filterValidationDecorations(this._configuration.options), filterFontDecorations(this._configuration.options));
        const result = new OverviewRulerDecorations();
        for (const decoration of decorations) {
            const decorationOptions = decoration.options;
            const opts = decorationOptions.overviewRuler;
            if (!opts) {
                continue;
            }
            const lane = opts.position;
            if (lane === 0) {
                continue;
            }
            const color = opts.getColor(theme.value);
            const viewStartLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.startLineNumber, decoration.range.startColumn);
            const viewEndLineNumber = this.coordinatesConverter.getViewLineNumberOfModelPosition(decoration.range.endLineNumber, decoration.range.endColumn);
            result.accept(color, decorationOptions.zIndex, viewStartLineNumber, viewEndLineNumber, lane);
        }
        return result.asArray;
    }
    _invalidateDecorationsColorCache() {
        const decorations = this.model.getOverviewRulerDecorations();
        for (const decoration of decorations) {
            const opts1 = decoration.options.overviewRuler;
            opts1?.invalidateCachedColor();
            const opts2 = decoration.options.minimap;
            opts2?.invalidateCachedColor();
        }
    }
    getValueInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueInRange(modelRange, eol);
    }
    getValueLengthInRange(range, eol) {
        const modelRange = this.coordinatesConverter.convertViewRangeToModelRange(range);
        return this.model.getValueLengthInRange(modelRange, eol);
    }
    modifyPosition(position, offset) {
        const modelPosition = this.coordinatesConverter.convertViewPositionToModelPosition(position);
        const resultModelPosition = this.model.modifyPosition(modelPosition, offset);
        return this.coordinatesConverter.convertModelPositionToViewPosition(resultModelPosition);
    }
    deduceModelPositionRelativeToViewPosition(viewAnchorPosition, deltaOffset, lineFeedCnt) {
        const modelAnchor = this.coordinatesConverter.convertViewPositionToModelPosition(viewAnchorPosition);
        if (this.model.getEOL().length === 2) {
            // This model uses CRLF, so the delta must take that into account
            if (deltaOffset < 0) {
                deltaOffset -= lineFeedCnt;
            }
            else {
                deltaOffset += lineFeedCnt;
            }
        }
        const modelAnchorOffset = this.model.getOffsetAt(modelAnchor);
        const resultOffset = modelAnchorOffset + deltaOffset;
        return this.model.getPositionAt(resultOffset);
    }
    getPlainTextToCopy(modelRanges, emptySelectionClipboard, forceCRLF) {
        const newLineCharacter = forceCRLF ? '\r\n' : this.model.getEOL();
        modelRanges = modelRanges.slice(0);
        modelRanges.sort(Range.compareRangesUsingStarts);
        let hasEmptyRange = false;
        let hasNonEmptyRange = false;
        for (const range of modelRanges) {
            if (range.isEmpty()) {
                hasEmptyRange = true;
            }
            else {
                hasNonEmptyRange = true;
            }
        }
        if (!hasNonEmptyRange) {
            // all ranges are empty
            if (!emptySelectionClipboard) {
                return '';
            }
            const modelLineNumbers = modelRanges.map((r) => r.startLineNumber);
            let result = '';
            for (let i = 0; i < modelLineNumbers.length; i++) {
                if (i > 0 && modelLineNumbers[i - 1] === modelLineNumbers[i]) {
                    continue;
                }
                result += this.model.getLineContent(modelLineNumbers[i]) + newLineCharacter;
            }
            return result;
        }
        if (hasEmptyRange && emptySelectionClipboard) {
            // mixed empty selections and non-empty selections
            const result = [];
            let prevModelLineNumber = 0;
            for (const modelRange of modelRanges) {
                const modelLineNumber = modelRange.startLineNumber;
                if (modelRange.isEmpty()) {
                    if (modelLineNumber !== prevModelLineNumber) {
                        result.push(this.model.getLineContent(modelLineNumber));
                    }
                }
                else {
                    result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
                }
                prevModelLineNumber = modelLineNumber;
            }
            return result.length === 1 ? result[0] : result;
        }
        const result = [];
        for (const modelRange of modelRanges) {
            if (!modelRange.isEmpty()) {
                result.push(this.model.getValueInRange(modelRange, forceCRLF ? 2 /* EndOfLinePreference.CRLF */ : 0 /* EndOfLinePreference.TextDefined */));
            }
        }
        return result.length === 1 ? result[0] : result;
    }
    getRichTextToCopy(modelRanges, emptySelectionClipboard) {
        const languageId = this.model.getLanguageId();
        if (languageId === PLAINTEXT_LANGUAGE_ID) {
            return null;
        }
        if (modelRanges.length !== 1) {
            // no multiple selection support at this time
            return null;
        }
        let range = modelRanges[0];
        if (range.isEmpty()) {
            if (!emptySelectionClipboard) {
                // nothing to copy
                return null;
            }
            const lineNumber = range.startLineNumber;
            range = new Range(lineNumber, this.model.getLineMinColumn(lineNumber), lineNumber, this.model.getLineMaxColumn(lineNumber));
        }
        const fontInfo = this._configuration.options.get(59 /* EditorOption.fontInfo */);
        const colorMap = this._getColorMap();
        const hasBadChars = (/[:;\\\/<>]/.test(fontInfo.fontFamily));
        const useDefaultFontFamily = (hasBadChars || fontInfo.fontFamily === EDITOR_FONT_DEFAULTS.fontFamily);
        let fontFamily;
        if (useDefaultFontFamily) {
            fontFamily = EDITOR_FONT_DEFAULTS.fontFamily;
        }
        else {
            fontFamily = fontInfo.fontFamily;
            fontFamily = fontFamily.replace(/"/g, '\'');
            const hasQuotesOrIsList = /[,']/.test(fontFamily);
            if (!hasQuotesOrIsList) {
                const needsQuotes = /[+ ]/.test(fontFamily);
                if (needsQuotes) {
                    fontFamily = `'${fontFamily}'`;
                }
            }
            fontFamily = `${fontFamily}, ${EDITOR_FONT_DEFAULTS.fontFamily}`;
        }
        return {
            mode: languageId,
            html: (`<div style="`
                + `color: ${colorMap[1 /* ColorId.DefaultForeground */]};`
                + `background-color: ${colorMap[2 /* ColorId.DefaultBackground */]};`
                + `font-family: ${fontFamily};`
                + `font-weight: ${fontInfo.fontWeight};`
                + `font-size: ${fontInfo.fontSize}px;`
                + `line-height: ${fontInfo.lineHeight}px;`
                + `white-space: pre;`
                + `">`
                + this._getHTMLToCopy(range, colorMap)
                + '</div>')
        };
    }
    _getHTMLToCopy(modelRange, colorMap) {
        const startLineNumber = modelRange.startLineNumber;
        const startColumn = modelRange.startColumn;
        const endLineNumber = modelRange.endLineNumber;
        const endColumn = modelRange.endColumn;
        const tabSize = this.getTabSize();
        let result = '';
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineTokens = this.model.tokenization.getLineTokens(lineNumber);
            const lineContent = lineTokens.getLineContent();
            const startOffset = (lineNumber === startLineNumber ? startColumn - 1 : 0);
            const endOffset = (lineNumber === endLineNumber ? endColumn - 1 : lineContent.length);
            if (lineContent === '') {
                result += '<br>';
            }
            else {
                result += tokenizeLineToHTML(lineContent, lineTokens.inflate(), colorMap, startOffset, endOffset, tabSize, platform.isWindows);
            }
        }
        return result;
    }
    _getColorMap() {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = ['#000000'];
        if (colorMap) {
            for (let i = 1, len = colorMap.length; i < len; i++) {
                result[i] = Color.Format.CSS.formatHex(colorMap[i]);
            }
        }
        return result;
    }
    //#region cursor operations
    getPrimaryCursorState() {
        return this._cursor.getPrimaryCursorState();
    }
    getLastAddedCursorIndex() {
        return this._cursor.getLastAddedCursorIndex();
    }
    getCursorStates() {
        return this._cursor.getCursorStates();
    }
    setCursorStates(source, reason, states) {
        return this._withViewEventsCollector(eventsCollector => this._cursor.setStates(eventsCollector, source, reason, states));
    }
    getCursorColumnSelectData() {
        return this._cursor.getCursorColumnSelectData();
    }
    getCursorAutoClosedCharacters() {
        return this._cursor.getAutoClosedCharacters();
    }
    setCursorColumnSelectData(columnSelectData) {
        this._cursor.setCursorColumnSelectData(columnSelectData);
    }
    getPrevEditOperationType() {
        return this._cursor.getPrevEditOperationType();
    }
    setPrevEditOperationType(type) {
        this._cursor.setPrevEditOperationType(type);
    }
    getSelection() {
        return this._cursor.getSelection();
    }
    getSelections() {
        return this._cursor.getSelections();
    }
    getPosition() {
        return this._cursor.getPrimaryCursorState().modelState.position;
    }
    setSelections(source, selections, reason = 0 /* CursorChangeReason.NotSet */) {
        this._withViewEventsCollector(eventsCollector => this._cursor.setSelections(eventsCollector, source, selections, reason));
    }
    saveCursorState() {
        return this._cursor.saveState();
    }
    restoreCursorState(states) {
        this._withViewEventsCollector(eventsCollector => this._cursor.restoreState(eventsCollector, states));
    }
    _executeCursorEdit(callback) {
        if (this._cursor.context.cursorConfig.readOnly) {
            // we cannot edit when read only...
            this._eventDispatcher.emitOutgoingEvent(new ReadOnlyEditAttemptEvent());
            return;
        }
        this._withViewEventsCollector(callback);
    }
    executeEdits(source, edits, cursorStateComputer, reason) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeEdits(eventsCollector, source, edits, cursorStateComputer, reason));
    }
    startComposition() {
        this._executeCursorEdit(eventsCollector => this._cursor.startComposition(eventsCollector));
    }
    endComposition(source) {
        this._executeCursorEdit(eventsCollector => this._cursor.endComposition(eventsCollector, source));
    }
    type(text, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.type(eventsCollector, text, source));
    }
    compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.compositionType(eventsCollector, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source));
    }
    paste(text, pasteOnNewLine, multicursorText, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.paste(eventsCollector, text, pasteOnNewLine, multicursorText, source));
    }
    cut(source) {
        this._executeCursorEdit(eventsCollector => this._cursor.cut(eventsCollector, source));
    }
    executeCommand(command, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeCommand(eventsCollector, command, source));
    }
    executeCommands(commands, source) {
        this._executeCursorEdit(eventsCollector => this._cursor.executeCommands(eventsCollector, commands, source));
    }
    revealAllCursors(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector(eventsCollector => this._cursor.revealAll(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealPrimaryCursor(source, revealHorizontal, minimalReveal = false) {
        this._withViewEventsCollector(eventsCollector => this._cursor.revealPrimary(eventsCollector, source, minimalReveal, 0 /* viewEvents.VerticalRevealType.Simple */, revealHorizontal, 0 /* ScrollType.Smooth */));
    }
    revealTopMostCursor(source) {
        const viewPosition = this._cursor.getTopMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealBottomMostCursor(source) {
        const viewPosition = this._cursor.getBottomMostViewPosition();
        const viewRange = new Range(viewPosition.lineNumber, viewPosition.column, viewPosition.lineNumber, viewPosition.column);
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, 0 /* viewEvents.VerticalRevealType.Simple */, true, 0 /* ScrollType.Smooth */)));
    }
    revealRange(source, revealHorizontal, viewRange, verticalType, scrollType) {
        this._withViewEventsCollector(eventsCollector => eventsCollector.emitViewEvent(new viewEvents.ViewRevealRangeRequestEvent(source, false, viewRange, null, verticalType, revealHorizontal, scrollType)));
    }
    //#endregion
    //#region viewLayout
    changeWhitespace(callback) {
        const hadAChange = this.viewLayout.changeWhitespace(callback);
        if (hadAChange) {
            this._eventDispatcher.emitSingleViewEvent(new viewEvents.ViewZonesChangedEvent());
            this._eventDispatcher.emitOutgoingEvent(new ViewZonesChangedEvent());
        }
    }
    //#endregion
    _withViewEventsCollector(callback) {
        return this._transactionalTarget.batchChanges(() => {
            try {
                const eventsCollector = this._eventDispatcher.beginEmitViewEvents();
                return callback(eventsCollector);
            }
            finally {
                this._eventDispatcher.endEmitViewEvents();
            }
        });
    }
    batchEvents(callback) {
        this._withViewEventsCollector(() => { callback(); });
    }
    normalizePosition(position, affinity) {
        return this._lines.normalizePosition(position, affinity);
    }
    /**
     * Gets the column at which indentation stops at a given line.
     * @internal
    */
    getLineIndentColumn(lineNumber) {
        return this._lines.getLineIndentColumn(lineNumber);
    }
}
class ViewportStart {
    static create(model) {
        const viewportStartLineTrackedRange = model._setTrackedRange(null, new Range(1, 1, 1, 1), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        return new ViewportStart(model, 1, false, viewportStartLineTrackedRange, 0);
    }
    get viewLineNumber() {
        return this._viewLineNumber;
    }
    get isValid() {
        return this._isValid;
    }
    get modelTrackedRange() {
        return this._modelTrackedRange;
    }
    get startLineDelta() {
        return this._startLineDelta;
    }
    constructor(_model, _viewLineNumber, _isValid, _modelTrackedRange, _startLineDelta) {
        this._model = _model;
        this._viewLineNumber = _viewLineNumber;
        this._isValid = _isValid;
        this._modelTrackedRange = _modelTrackedRange;
        this._startLineDelta = _startLineDelta;
    }
    dispose() {
        this._model._setTrackedRange(this._modelTrackedRange, null, 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
    }
    update(viewModel, startLineNumber) {
        const position = viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(startLineNumber, viewModel.getLineMinColumn(startLineNumber)));
        const viewportStartLineTrackedRange = viewModel.model._setTrackedRange(this._modelTrackedRange, new Range(position.lineNumber, position.column, position.lineNumber, position.column), 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */);
        const viewportStartLineTop = viewModel.viewLayout.getVerticalOffsetForLineNumber(startLineNumber);
        const scrollTop = viewModel.viewLayout.getCurrentScrollTop();
        this._viewLineNumber = startLineNumber;
        this._isValid = true;
        this._modelTrackedRange = viewportStartLineTrackedRange;
        this._startLineDelta = scrollTop - viewportStartLineTop;
    }
    invalidate() {
        this._isValid = false;
    }
}
class OverviewRulerDecorations {
    constructor() {
        this._asMap = Object.create(null);
        this.asArray = [];
    }
    accept(color, zIndex, startLineNumber, endLineNumber, lane) {
        const prevGroup = this._asMap[color];
        if (prevGroup) {
            const prevData = prevGroup.data;
            const prevLane = prevData[prevData.length - 3];
            const prevEndLineNumber = prevData[prevData.length - 1];
            if (prevLane === lane && prevEndLineNumber + 1 >= startLineNumber) {
                // merge into prev
                if (endLineNumber > prevEndLineNumber) {
                    prevData[prevData.length - 1] = endLineNumber;
                }
                return;
            }
            // push
            prevData.push(lane, startLineNumber, endLineNumber);
        }
        else {
            const group = new OverviewRulerDecorationsGroup(color, zIndex, [lane, startLineNumber, endLineNumber]);
            this._asMap[color] = group;
            this.asArray.push(group);
        }
    }
}
class HiddenAreasModel {
    constructor() {
        this.hiddenAreas = new Map();
        this.shouldRecompute = false;
        this.ranges = [];
    }
    setHiddenAreas(source, ranges) {
        const existing = this.hiddenAreas.get(source);
        if (existing && rangeArraysEqual(existing, ranges)) {
            return;
        }
        this.hiddenAreas.set(source, ranges);
        this.shouldRecompute = true;
    }
    /**
     * The returned array is immutable.
    */
    getMergedRanges() {
        if (!this.shouldRecompute) {
            return this.ranges;
        }
        this.shouldRecompute = false;
        const newRanges = Array.from(this.hiddenAreas.values()).reduce((r, hiddenAreas) => mergeLineRangeArray(r, hiddenAreas), []);
        if (rangeArraysEqual(this.ranges, newRanges)) {
            return this.ranges;
        }
        this.ranges = newRanges;
        return this.ranges;
    }
}
function mergeLineRangeArray(arr1, arr2) {
    const result = [];
    let i = 0;
    let j = 0;
    while (i < arr1.length && j < arr2.length) {
        const item1 = arr1[i];
        const item2 = arr2[j];
        if (item1.endLineNumber < item2.startLineNumber - 1) {
            result.push(arr1[i++]);
        }
        else if (item2.endLineNumber < item1.startLineNumber - 1) {
            result.push(arr2[j++]);
        }
        else {
            const startLineNumber = Math.min(item1.startLineNumber, item2.startLineNumber);
            const endLineNumber = Math.max(item1.endLineNumber, item2.endLineNumber);
            result.push(new Range(startLineNumber, 1, endLineNumber, 1));
            i++;
            j++;
        }
    }
    while (i < arr1.length) {
        result.push(arr1[i++]);
    }
    while (j < arr2.length) {
        result.push(arr2[j++]);
    }
    return result;
}
function rangeArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (!arr1[i].equalsRange(arr2[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Maintain a stable viewport by trying to keep the first line in the viewport constant.
 */
class StableViewport {
    constructor(viewportStartModelPosition, startLineDelta) {
        this.viewportStartModelPosition = viewportStartModelPosition;
        this.startLineDelta = startLineDelta;
    }
    recoverViewportStart(coordinatesConverter, viewLayout) {
        if (!this.viewportStartModelPosition) {
            return;
        }
        const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(this.viewportStartModelPosition);
        const viewPositionTop = viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
        viewLayout.setScrollPosition({ scrollTop: viewPositionTop + this.startLineDelta }, 1 /* ScrollType.Immediate */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvdmlld01vZGVsSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RSxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUEyQyxvQkFBb0IsRUFBRSwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQy9KLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBeUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVoSSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSXpDLE9BQU8sRUFBa0osYUFBYSxFQUEwQixNQUFNLGFBQWEsQ0FBQztBQUdwTixPQUFPLEtBQUssZUFBZSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBR3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXpFLE9BQU8sS0FBSyxVQUFVLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3pELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRzNFLE9BQU8sRUFBb0UseUJBQXlCLEVBQUUsNkJBQTZCLEVBQWdCLHFCQUFxQixFQUF1QixNQUFNLGlCQUFpQixDQUFDO0FBQ3ZOLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSx3QkFBd0IsRUFBRSw0QkFBNEIsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsRUFBRSxzQ0FBc0MsRUFBRSwyQkFBMkIsRUFBRSx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBMEIsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQTRCLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeGUsT0FBTyxFQUFtQiwyQkFBMkIsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRXJILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBTTdELE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDO0FBRTNDLE1BQU0sT0FBTyxTQUFVLFNBQVEsVUFBVTtJQWtCeEMsWUFDQyxRQUFnQixFQUNoQixhQUFtQyxFQUNuQyxLQUFpQixFQUNqQiw0QkFBd0QsRUFDeEQsa0NBQThELEVBQzlELDRCQUFtRSxFQUNsRCw0QkFBMkQsRUFDM0QsYUFBNEIsRUFDNUIsYUFBNEIsRUFDNUIsb0JBQXNDO1FBRXZELEtBQUssRUFBRSxDQUFDO1FBTFMsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUMzRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM1Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWtCO1FBK2N2QyxxQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDbkQsd0JBQW1CLEdBQXFCLEVBQUUsQ0FBQztRQTVjbEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUN2RCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3pKLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwSSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvQyxJQUFJLDZCQUE2QixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO1lBRTdFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFM0QsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUM1QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQztZQUNwRCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHlDQUErQixDQUFDO1lBQ3BFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLHFDQUEyQixDQUFDO1lBQzVELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxHQUFHLHVDQUE2QixDQUFDO1lBQ2hFLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF3QixDQUFDO1lBQ3RELE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsK0NBQXFDLENBQUM7WUFFaEYsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGdDQUFnQyxDQUNqRCxJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyxLQUFLLEVBQ1YsNEJBQTRCLEVBQzVCLGtDQUFrQyxFQUNsQyxRQUFRLEVBQ1IsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLEVBQy9CLGdCQUFnQixFQUNoQixZQUFZLENBQUMsY0FBYyxFQUMzQixjQUFjLEVBQ2QsU0FBUyxFQUNULHNCQUFzQixDQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLENBQUM7UUFFckUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFaEgsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLDRCQUE0QixDQUFDLENBQUMsQ0FBQztRQUV2SixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEQsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDeEIsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDbkMsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEMsQ0FBQztZQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGtCQUFrQixDQUM3RCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUNwRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsU0FBUyxDQUN4RCxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDM0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUV0SSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xELENBQUM7b0JBQVMsQ0FBQztnQkFDVixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMzQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUN2RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNqRSxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVlLE9BQU87UUFDdEIsc0VBQXNFO1FBQ3RFLDJFQUEyRTtRQUMzRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFTSx3QkFBd0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFlBQThCO1FBQ3hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRU0sc0JBQXNCLENBQUMsWUFBOEI7UUFDM0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLCtDQUF1QyxDQUFDO1FBQ3hHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQy9CLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzVCLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO1lBQzNDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4SixPQUFPO2dCQUNOLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRTtnQkFDbEIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxlQUFlO2dCQUMxQyxhQUFhLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQ3RDLFVBQVUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxDQUFDO2FBQ3JDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxvQ0FBb0M7UUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU8scUJBQXFCO1FBQzVCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQ2pFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxLQUFLLENBQ2pDLGlCQUFpQixDQUFDLGVBQWUsRUFDakMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxFQUN4RCxpQkFBaUIsQ0FBQyxhQUFhLEVBQy9CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FDdEQsQ0FBQztRQUNGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDeEUsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDeEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3hELElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFTSxXQUFXLENBQUMsUUFBaUI7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLElBQUksVUFBVSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRU0saUJBQWlCLENBQUMsY0FBdUI7UUFDL0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksdUJBQXVCLENBQUMsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN2RyxDQUFDO0lBRU0sa0JBQWtCO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVNLGdCQUFnQjtRQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsbUZBQW1GO1FBQ25GLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5RSxNQUFNLGlDQUFpQyxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDdEosTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsaUNBQWlDLENBQUMsQ0FBQztZQUMzSSxPQUFPLElBQUksY0FBYyxDQUFDLGtDQUFrQyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUNELE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxlQUF5QyxFQUFFLENBQTRCO1FBQ3RHLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3JELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO1FBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcseUNBQStCLENBQUM7UUFDcEUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcscUNBQTJCLENBQUM7UUFDNUQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsdUNBQTZCLENBQUM7UUFDaEUsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXdCLENBQUM7UUFFdEQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3pILGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1lBQzVFLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQztZQUU3RSxJQUFJLENBQUMsaUNBQWlDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLFVBQVUsaUNBQXVCLEVBQUUsQ0FBQztZQUN6Qyw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUMxQixlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLFVBQVUsb0RBQTBDLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFCLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBRUQsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFaEYsSUFBSSxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDekosSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckQsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0I7UUFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEUsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUVwRSxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztnQkFDaEMsSUFBSSx3Q0FBd0MsR0FBRyxLQUFLLENBQUM7Z0JBRXJELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxZQUFZLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM5SCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsWUFBWSxlQUFlLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUU3SCx5RkFBeUY7Z0JBQ3pGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUNsRSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUM5QixRQUFRLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDM0IsZ0VBQXdELENBQUMsQ0FBQyxDQUFDOzRCQUMxRCxLQUFLLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQ0FDakUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQ0FDcEMsSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQ0FDakQsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQ0FDbEIsWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dDQUN6RyxDQUFDO2dDQUNELGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUN6RCxDQUFDOzRCQUNELE1BQU07d0JBQ1AsQ0FBQzt3QkFDRCw4REFBc0QsQ0FBQyxDQUFDLENBQUM7NEJBQ3hELElBQUksWUFBWSxHQUE4QyxJQUFJLENBQUM7NEJBQ25FLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dDQUN6QixZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNoSCxDQUFDOzRCQUNELGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQzs0QkFDakUsTUFBTTt3QkFDUCxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDakQsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBRWxELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQzlCLFFBQVEsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUMzQix3REFBZ0QsQ0FBQyxDQUFDLENBQUM7NEJBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7NEJBQzdCLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDOzRCQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDOzRCQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQzs0QkFDN0UsbUJBQW1CLEdBQUcsSUFBSSxDQUFDOzRCQUMzQixNQUFNO3dCQUNQLENBQUM7d0JBQ0QsK0RBQXVELENBQUMsQ0FBQyxDQUFDOzRCQUN6RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDOzRCQUNqSCxJQUFJLGlCQUFpQixLQUFLLElBQUksRUFBRSxDQUFDO2dDQUNoQyxlQUFlLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0NBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDbEcsQ0FBQzs0QkFDRCxtQkFBbUIsR0FBRyxJQUFJLENBQUM7NEJBQzNCLE1BQU07d0JBQ1AsQ0FBQzt3QkFDRCxnRUFBd0QsQ0FBQyxDQUFDLENBQUM7NEJBQzFELE1BQU0sa0JBQWtCLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDOzRCQUMxRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOzRCQUN2SSxJQUFJLGtCQUFrQixLQUFLLElBQUksRUFBRSxDQUFDO2dDQUNqQyxlQUFlLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0NBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDckcsQ0FBQzs0QkFDRCxtQkFBbUIsR0FBRyxJQUFJLENBQUM7NEJBQzNCLE1BQU07d0JBQ1AsQ0FBQzt3QkFDRCw4REFBc0QsQ0FBQyxDQUFDLENBQUM7NEJBQ3hELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRyxDQUFDOzRCQUN2RCxNQUFNLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsR0FDbkYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDOzRCQUNwRix3Q0FBd0MsR0FBRyxrQkFBa0IsQ0FBQzs0QkFDOUQsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dDQUN2QixlQUFlLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7NEJBQ2xELENBQUM7NEJBQ0QsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dDQUN4QixlQUFlLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0NBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDckcsQ0FBQzs0QkFDRCxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0NBQ3ZCLGVBQWUsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQ0FDakQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDOzRCQUNsRyxDQUFDOzRCQUNELE1BQU07d0JBQ1AsQ0FBQzt3QkFDRCw2REFBcUQsQ0FBQyxDQUFDLENBQUM7NEJBQ3ZELHdEQUF3RDs0QkFDeEQsTUFBTTt3QkFDUCxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLFNBQVMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUV2QyxJQUFJLENBQUMsbUJBQW1CLElBQUksd0NBQXdDLEVBQUUsQ0FBQztvQkFDdEUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFVBQVUsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUM7b0JBQzVFLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDaEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUMxQyxDQUFDO1lBQ0YsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzNDLENBQUM7WUFFRCw0REFBNEQ7WUFDNUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztZQUMxRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDO1lBRTVDLG1CQUFtQjtZQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUM7Z0JBQzFGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUN0RixJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztvQkFDakgsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ2hHLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsRUFBRSxTQUFTLEVBQUUsZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLCtCQUF1QixDQUFDO2dCQUM5SCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQztnQkFDSixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDcEUsSUFBSSxDQUFDLFlBQVksZUFBZSxDQUFDLCtCQUErQixFQUFFLENBQUM7b0JBQ2xFLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hGLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEQsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzNDLENBQUM7WUFFRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLCtDQUF1QyxDQUFDO1FBQ3hHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDckQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUVoSCxJQUFJLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsUUFBbUMsRUFBRSxFQUFFO29CQUNoRixLQUFLLE1BQU0sTUFBTSxJQUFJLGVBQWUsRUFBRSxDQUFDO3dCQUN0QyxNQUFNLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUM7d0JBQ3hELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDeEosSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7NEJBQ3pCLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO3dCQUN2SCxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDO3dCQUMvQyxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsc0RBQXNEO2dCQUN0RCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ2hDLE1BQU0sYUFBYSxHQUFHLElBQUksZUFBZSxDQUFDLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUN2RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2dCQUN6RixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsb0RBQTBDLENBQUM7UUFDckcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNoSCxzREFBc0Q7Z0JBQ3RELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxlQUFlLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLENBQUM7b0JBQ2pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQ25GLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2pELE1BQU0sVUFBVSxHQUF1RCxFQUFFLENBQUM7WUFDMUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztnQkFDaEosTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO2dCQUMvTCxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUc7b0JBQ2YsY0FBYyxFQUFFLG1CQUFtQjtvQkFDbkMsWUFBWSxFQUFFLGlCQUFpQjtpQkFDL0IsQ0FBQztZQUNILENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNoRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxDQUFDO1lBQzNGLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUN6SixJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSxzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDekosSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUkseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbEQsd0hBQXdIO1lBQ3hILElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxJQUFJLENBQUM7b0JBQ0osTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQ3BFLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO29CQUNqRSxlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQztvQkFDNUUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO29CQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RSxDQUFDO3dCQUFTLENBQUM7b0JBQ1YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzNDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25ELENBQUM7WUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDekosSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUksd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFLTSxxQkFBcUIsQ0FBQyxRQUFtQjtRQUMvQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsb0RBQTBDLENBQUM7UUFDckcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RyxJQUFJLFFBQVEsR0FBVyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDOUYsS0FBSyxNQUFNLGNBQWMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUM5QyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3JDLFFBQVEsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFDM0MsTUFBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVEOzs7O01BSUU7SUFDSyxjQUFjLENBQUMsTUFBZSxFQUFFLE1BQWdCLEVBQUUsV0FBcUI7UUFDN0UsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDckQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzdELElBQUksWUFBWSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9ELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFlBQVksQ0FBQztRQUV4QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUVyRCxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMvQixJQUFJLENBQUM7WUFDSixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNwRSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5RCxJQUFJLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3hCLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRSxlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQztnQkFDNUUsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RSxJQUFJLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDeEMsQ0FBQztZQUVELE1BQU0sd0JBQXdCLEdBQUcsY0FBYyxDQUFDLDBCQUEwQixFQUFFLFVBQVUsQ0FBQztZQUN2RixNQUFNLHNCQUFzQixHQUFHLHdCQUF3QixJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsZUFBZSxJQUFJLHdCQUF3QixJQUFJLHdCQUF3QixJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1TCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDN0IsY0FBYyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakYsQ0FBQztRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsaUNBQWlDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFbEQsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVNLHNDQUFzQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLG1DQUF5QixDQUFDO1FBQzVFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFDNUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzNELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLGdDQUFnQyxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEVBQUUsV0FBVyxDQUFDLDhCQUE4QixHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBRWxILE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUMxQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFDL0QsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQzNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztRQUM5RCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU8scUJBQXFCLENBQUMsZ0JBQXVCO1FBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFakQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQVksRUFBRSxDQUFDO1FBQzNCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUNsQixJQUFJLGVBQWUsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDO1FBQ25ELElBQUksV0FBVyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUM7UUFDM0MsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQztRQUNqRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFDO1FBQ3pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN4RCxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1lBRXpELElBQUksbUJBQW1CLEdBQUcsZUFBZSxFQUFFLENBQUM7Z0JBQzNDLFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxxQkFBcUIsR0FBRyxhQUFhLEVBQUUsQ0FBQztnQkFDM0MsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLGVBQWUsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO2dCQUM3QyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FDOUIsZUFBZSxFQUFFLFdBQVcsRUFDNUIscUJBQXFCLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLENBQ2pGLENBQUM7WUFDSCxDQUFDO1lBQ0QsZUFBZSxHQUFHLG1CQUFtQixHQUFHLENBQUMsQ0FBQztZQUMxQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLENBQUM7UUFFRCxJQUFJLGVBQWUsR0FBRyxhQUFhLElBQUksQ0FBQyxlQUFlLEtBQUssYUFBYSxJQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3ZHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUM5QixlQUFlLEVBQUUsV0FBVyxFQUM1QixhQUFhLEVBQUUsU0FBUyxDQUN4QixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLDZCQUE2QjtRQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDM0QsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLENBQUMsZ0NBQWdDLENBQUM7UUFDekUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsOEJBQThCLENBQUM7UUFFckUsT0FBTyxJQUFJLEtBQUssQ0FDZixtQkFBbUIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFDL0QsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQzNELENBQUM7SUFDSCxDQUFDO0lBRU0sd0NBQXdDLENBQUMsU0FBaUI7UUFDaEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvRSxNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUN6RSxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQztRQUVyRSxPQUFPLElBQUksS0FBSyxDQUNmLG1CQUFtQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUMvRCxpQkFBaUIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsQ0FDM0QsQ0FBQztJQUNILENBQUM7SUFFTSxTQUFTO1FBQ2YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVwRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDO1FBQzVDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNyRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsSUFBSSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xLLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLFNBQVMsQ0FBQztRQUU5RyxPQUFPO1lBQ04sVUFBVSxFQUFFLGVBQWUsQ0FBQyxVQUFVO1lBQ3RDLGFBQWEsRUFBRSxhQUFhO1lBQzVCLHFCQUFxQixFQUFFLHFCQUFxQjtTQUM1QyxDQUFDO0lBQ0gsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEtBQWlCO1FBQzFDLElBQUksT0FBTyxLQUFLLENBQUMsYUFBYSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2hELHNEQUFzRDtZQUN0RCxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdkUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtDQUFrQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQztRQUN4SCxPQUFPO1lBQ04sVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLFNBQVMsRUFBRSxTQUFTO1NBQ3BCLENBQUM7SUFDSCxDQUFDO0lBRU8sZ0NBQWdDLENBQUMsS0FBaUI7UUFDekQsT0FBTztZQUNOLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtZQUM1QixTQUFTLEVBQUUsS0FBSyxDQUFDLHlCQUEwQjtTQUMzQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLFVBQVU7UUFDakIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUN4QyxDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxXQUFXLENBQUMsZUFBdUIsRUFBRSxhQUFxQixFQUFFLGtCQUEwQjtRQUM1RixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVNLG9CQUFvQixDQUFDLFVBQWtCLEVBQUUsYUFBcUIsRUFBRSxhQUFxQjtRQUMzRixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRU0sb0JBQW9CLENBQUMsZUFBdUIsRUFBRSxhQUFxQjtRQUN6RSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFTSw2QkFBNkIsQ0FBQyxlQUF1QixFQUFFLGFBQXFCLEVBQUUsY0FBZ0MsRUFBRSxPQUE0QjtRQUNsSixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMseUJBQXlCLENBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVNLGNBQWMsQ0FBQyxVQUFrQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxVQUFrQjtRQUN0QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVNLGdCQUFnQixDQUFDLFVBQWtCO1FBQ3pDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsVUFBa0I7UUFDekMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFTSwrQkFBK0IsQ0FBQyxVQUFrQjtRQUN4RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2hGLElBQUksTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0QsT0FBTyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxVQUFrQjtRQUN2RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQy9FLElBQUksTUFBTSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBQ0QsT0FBTyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFTSw0QkFBNEIsQ0FBQyxLQUFZO1FBQy9DLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRU0sd0JBQXdCLENBQUMsWUFBbUI7UUFDbEQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsQ0FBQztJQUMvRSxDQUFDO0lBRU0saUJBQWlCLENBQUMsWUFBc0I7UUFDOUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxVQUFrQixFQUFFLFdBQWtDO1FBQy9FLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztRQUVqQixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7WUFDL0IsSUFBSSxLQUFLLENBQUMsZUFBZSxHQUFHLFVBQVUsSUFBSSxLQUFLLENBQUMsYUFBYSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUM1RSxTQUFTO1lBQ1YsQ0FBQztZQUNELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1lBQ3ZELElBQUksYUFBYSxLQUFLLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDekMsUUFBUSxFQUFFLENBQUM7WUFDWixDQUFDO2lCQUFNLElBQUksYUFBYSxLQUFLLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDaEQsUUFBUSxFQUFFLENBQUM7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQztJQUM3RCxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsVUFBa0I7UUFDekMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRU0sZ0NBQWdDLENBQUMsWUFBbUIsRUFBRSxVQUFrQjtRQUM5RSxNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDakcsTUFBTSxpQkFBaUIsR0FBRyw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JILE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSw2QkFBNkIsQ0FBQyxnQkFBZ0IsRUFBRSw2QkFBNkIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNqSyxDQUFDO0lBRU0sd0JBQXdCLENBQUMsVUFBa0I7UUFDakQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pGLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxSyxDQUFDO0lBRU8seUJBQXlCLENBQUMsVUFBa0IsRUFBRSxpQkFBcUMsRUFBRSxnQkFBeUIsRUFBRSxXQUFrQztRQUN6SixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3JELE1BQU0seUJBQXlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQ3pFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV6RCxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2hDLGlCQUFpQixHQUFHO2dCQUNuQixHQUFHLGlCQUFpQjtnQkFDcEIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ3JDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FDaEM7YUFDRCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxxQkFBcUIsQ0FDL0IsUUFBUSxDQUFDLFNBQVMsRUFDbEIsUUFBUSxDQUFDLFNBQVMsRUFDbEIsUUFBUSxDQUFDLE9BQU8sRUFDaEIsUUFBUSxDQUFDLHdCQUF3QixFQUNqQyxlQUFlLEVBQ2YseUJBQXlCLEVBQ3pCLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsaUJBQWlCLEVBQ2pCLE9BQU8sRUFDUCxRQUFRLENBQUMsa0JBQWtCLEVBQzNCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQy9DLGdCQUFnQixDQUNoQixDQUFDO0lBQ0gsQ0FBQztJQUVNLGVBQWUsQ0FBQyxVQUFrQjtRQUN4QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSw0QkFBNEIsQ0FBQyxlQUF1QixFQUFFLGFBQXFCLEVBQUUsTUFBaUI7UUFDcEcsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BGLE9BQU8sSUFBSSx5QkFBeUIsQ0FDbkMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUNqQixNQUFNLENBQ04sQ0FBQztJQUNILENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxLQUFrQjtRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekwsTUFBTSxNQUFNLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQzlDLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDdEMsTUFBTSxpQkFBaUIsR0FBMkIsVUFBVSxDQUFDLE9BQU8sQ0FBQztZQUNyRSxNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUM7WUFDN0MsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLFNBQVM7WUFDVixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUNuQyxJQUFJLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsU0FBUztZQUNWLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZKLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdDQUFnQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFakosTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDdkIsQ0FBQztJQUVPLGdDQUFnQztRQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDN0QsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBd0MsVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFDcEYsS0FBSyxFQUFFLHFCQUFxQixFQUFFLENBQUM7WUFDL0IsTUFBTSxLQUFLLEdBQWtDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3hFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRU0sZUFBZSxDQUFDLEtBQVksRUFBRSxHQUF3QjtRQUM1RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVNLHFCQUFxQixDQUFDLEtBQVksRUFBRSxHQUF3QjtRQUNsRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0sY0FBYyxDQUFDLFFBQWtCLEVBQUUsTUFBYztRQUN2RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0YsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDN0UsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRU0seUNBQXlDLENBQUMsa0JBQTRCLEVBQUUsV0FBbUIsRUFBRSxXQUFtQjtRQUN0SCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RDLGlFQUFpRTtZQUNqRSxJQUFJLFdBQVcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsV0FBVyxJQUFJLFdBQVcsQ0FBQztZQUM1QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsV0FBVyxJQUFJLFdBQVcsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUQsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLEdBQUcsV0FBVyxDQUFDO1FBQ3JELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLGtCQUFrQixDQUFDLFdBQW9CLEVBQUUsdUJBQWdDLEVBQUUsU0FBa0I7UUFDbkcsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVsRSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRWpELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztRQUM3QixLQUFLLE1BQU0sS0FBSyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3JCLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDdEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLHVCQUF1QjtZQUN2QixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFbkUsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM5RCxTQUFTO2dCQUNWLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7WUFDN0UsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksYUFBYSxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDOUMsa0RBQWtEO1lBQ2xELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztZQUM1QixJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQztZQUM1QixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDO2dCQUNuRCxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO29CQUMxQixJQUFJLGVBQWUsS0FBSyxtQkFBbUIsRUFBRSxDQUFDO3dCQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDLGtDQUEwQixDQUFDLHdDQUFnQyxDQUFDLENBQUMsQ0FBQztnQkFDN0gsQ0FBQztnQkFDRCxtQkFBbUIsR0FBRyxlQUFlLENBQUM7WUFDdkMsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ2pELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDLGtDQUEwQixDQUFDLHdDQUFnQyxDQUFDLENBQUMsQ0FBQztZQUM3SCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ2pELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxXQUFvQixFQUFFLHVCQUFnQztRQUM5RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlDLElBQUksVUFBVSxLQUFLLHFCQUFxQixFQUFFLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlCLDZDQUE2QztZQUM3QyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDOUIsa0JBQWtCO2dCQUNsQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDO1lBQ3pDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzdILENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLGdDQUF1QixDQUFDO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNyQyxNQUFNLFdBQVcsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsVUFBVSxLQUFLLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RHLElBQUksVUFBa0IsQ0FBQztRQUN2QixJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsVUFBVSxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQztRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ2pDLFVBQVUsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzVDLElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLFVBQVUsR0FBRyxJQUFJLFVBQVUsR0FBRyxDQUFDO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztZQUNELFVBQVUsR0FBRyxHQUFHLFVBQVUsS0FBSyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksRUFBRSxVQUFVO1lBQ2hCLElBQUksRUFBRSxDQUNMLGNBQWM7a0JBQ1osVUFBVSxRQUFRLG1DQUEyQixHQUFHO2tCQUNoRCxxQkFBcUIsUUFBUSxtQ0FBMkIsR0FBRztrQkFDM0QsZ0JBQWdCLFVBQVUsR0FBRztrQkFDN0IsZ0JBQWdCLFFBQVEsQ0FBQyxVQUFVLEdBQUc7a0JBQ3RDLGNBQWMsUUFBUSxDQUFDLFFBQVEsS0FBSztrQkFDcEMsZ0JBQWdCLFFBQVEsQ0FBQyxVQUFVLEtBQUs7a0JBQ3hDLG1CQUFtQjtrQkFDbkIsSUFBSTtrQkFDSixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7a0JBQ3BDLFFBQVEsQ0FDVjtTQUNELENBQUM7SUFDSCxDQUFDO0lBRU8sY0FBYyxDQUFDLFVBQWlCLEVBQUUsUUFBa0I7UUFDM0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQztRQUNuRCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQzNDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQztRQUV2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFFbEMsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBRWhCLEtBQUssSUFBSSxVQUFVLEdBQUcsZUFBZSxFQUFFLFVBQVUsSUFBSSxhQUFhLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDckUsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sV0FBVyxHQUFHLENBQUMsVUFBVSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0UsTUFBTSxTQUFTLEdBQUcsQ0FBQyxVQUFVLEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFdEYsSUFBSSxXQUFXLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sSUFBSSxNQUFNLENBQUM7WUFDbEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEksQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxZQUFZO1FBQ25CLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3BELE1BQU0sTUFBTSxHQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDckMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELDJCQUEyQjtJQUVwQixxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUNNLHVCQUF1QjtRQUM3QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBQ00sZUFBZTtRQUNyQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUNNLGVBQWUsQ0FBQyxNQUFpQyxFQUFFLE1BQTBCLEVBQUUsTUFBbUM7UUFDeEgsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzFILENBQUM7SUFDTSx5QkFBeUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDakQsQ0FBQztJQUNNLDZCQUE2QjtRQUNuQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBQ00seUJBQXlCLENBQUMsZ0JBQW1DO1FBQ25FLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBQ00sd0JBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFDTSx3QkFBd0IsQ0FBQyxJQUF1QjtRQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFDTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNwQyxDQUFDO0lBQ00sYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDckMsQ0FBQztJQUNNLFdBQVc7UUFDakIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztJQUNqRSxDQUFDO0lBQ00sYUFBYSxDQUFDLE1BQWlDLEVBQUUsVUFBaUMsRUFBRSxNQUFNLG9DQUE0QjtRQUM1SCxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzNILENBQUM7SUFDTSxlQUFlO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBQ00sa0JBQWtCLENBQUMsTUFBc0I7UUFDL0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFFBQTZEO1FBQ3ZGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hELG1DQUFtQztZQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7WUFDeEUsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUNNLFlBQVksQ0FBQyxNQUFpQyxFQUFFLEtBQXVDLEVBQUUsbUJBQXlDLEVBQUUsTUFBMkI7UUFDckssSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwSSxDQUFDO0lBQ00sZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBQ00sY0FBYyxDQUFDLE1BQWtDO1FBQ3ZELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFDTSxJQUFJLENBQUMsSUFBWSxFQUFFLE1BQWtDO1FBQzNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDO0lBQ00sZUFBZSxDQUFDLElBQVksRUFBRSxrQkFBMEIsRUFBRSxrQkFBMEIsRUFBRSxhQUFxQixFQUFFLE1BQWtDO1FBQ3JKLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDaEssQ0FBQztJQUNNLEtBQUssQ0FBQyxJQUFZLEVBQUUsY0FBdUIsRUFBRSxlQUE2QyxFQUFFLE1BQWtDO1FBQ3BJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2hJLENBQUM7SUFDTSxHQUFHLENBQUMsTUFBa0M7UUFDNUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUNNLGNBQWMsQ0FBQyxPQUFpQixFQUFFLE1BQWtDO1FBQzFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMzRyxDQUFDO0lBQ00sZUFBZSxDQUFDLFFBQW9CLEVBQUUsTUFBa0M7UUFDOUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdHLENBQUM7SUFDTSxnQkFBZ0IsQ0FBQyxNQUFpQyxFQUFFLGdCQUF5QixFQUFFLGdCQUF5QixLQUFLO1FBQ25ILElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLEVBQUUsYUFBYSxnREFBd0MsZ0JBQWdCLDRCQUFvQixDQUFDLENBQUM7SUFDN0wsQ0FBQztJQUNNLG1CQUFtQixDQUFDLE1BQWlDLEVBQUUsZ0JBQXlCLEVBQUUsZ0JBQXlCLEtBQUs7UUFDdEgsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxhQUFhLGdEQUF3QyxnQkFBZ0IsNEJBQW9CLENBQUMsQ0FBQztJQUNqTSxDQUFDO0lBQ00sbUJBQW1CLENBQUMsTUFBaUM7UUFDM0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4SCxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksZ0RBQXdDLElBQUksNEJBQW9CLENBQUMsQ0FBQyxDQUFDO0lBQzVOLENBQUM7SUFDTSxzQkFBc0IsQ0FBQyxNQUFpQztRQUM5RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hILElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxnREFBd0MsSUFBSSw0QkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFDNU4sQ0FBQztJQUNNLFdBQVcsQ0FBQyxNQUFpQyxFQUFFLGdCQUF5QixFQUFFLFNBQWdCLEVBQUUsWUFBMkMsRUFBRSxVQUFzQjtRQUNySyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLElBQUksVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pNLENBQUM7SUFFRCxZQUFZO0lBRVosb0JBQW9CO0lBQ2IsZ0JBQWdCLENBQUMsUUFBdUQ7UUFDOUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUM7WUFDbEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7SUFDRixDQUFDO0lBQ0QsWUFBWTtJQUVKLHdCQUF3QixDQUFJLFFBQTBEO1FBQzdGLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDbEQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUNwRSxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNsQyxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDM0MsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUFvQjtRQUN0QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLEdBQUcsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsUUFBa0IsRUFBRSxRQUEwQjtRQUMvRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRDs7O01BR0U7SUFDRixtQkFBbUIsQ0FBQyxVQUFrQjtRQUNyQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBU0QsTUFBTSxhQUFhO0lBRVgsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFpQjtRQUNyQyxNQUFNLDZCQUE2QixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLDZEQUFxRCxDQUFDO1FBQzlJLE9BQU8sSUFBSSxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELElBQVcsY0FBYztRQUN4QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQVcsT0FBTztRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQVcsaUJBQWlCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFXLGNBQWM7UUFDeEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdCLENBQUM7SUFFRCxZQUNrQixNQUFrQixFQUMzQixlQUF1QixFQUN2QixRQUFpQixFQUNqQixrQkFBMEIsRUFDMUIsZUFBdUI7UUFKZCxXQUFNLEdBQU4sTUFBTSxDQUFZO1FBQzNCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDakIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBQzFCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO0lBQzVCLENBQUM7SUFFRSxPQUFPO1FBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSw2REFBcUQsQ0FBQztJQUNqSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQXFCLEVBQUUsZUFBdUI7UUFDM0QsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGtDQUFrQyxDQUFDLElBQUksUUFBUSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9KLE1BQU0sNkJBQTZCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyw2REFBcUQsQ0FBQztRQUMzTyxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEcsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRTdELElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyw2QkFBNkIsQ0FBQztRQUN4RCxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQztJQUN6RCxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHdCQUF3QjtJQUE5QjtRQUVrQixXQUFNLEdBQXVELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekYsWUFBTyxHQUFvQyxFQUFFLENBQUM7SUF5QnhELENBQUM7SUF2Qk8sTUFBTSxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsZUFBdUIsRUFBRSxhQUFxQixFQUFFLElBQVk7UUFDeEcsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVyQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztZQUNoQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3hELElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxpQkFBaUIsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ25FLGtCQUFrQjtnQkFDbEIsSUFBSSxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDO2dCQUMvQyxDQUFDO2dCQUNELE9BQU87WUFDUixDQUFDO1lBRUQsT0FBTztZQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNyRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFHLElBQUksNkJBQTZCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUN2RyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxnQkFBZ0I7SUFBdEI7UUFDa0IsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztRQUNuRCxvQkFBZSxHQUFHLEtBQUssQ0FBQztRQUN4QixXQUFNLEdBQVksRUFBRSxDQUFDO0lBMEI5QixDQUFDO0lBeEJBLGNBQWMsQ0FBQyxNQUFlLEVBQUUsTUFBZTtRQUM5QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRUQ7O01BRUU7SUFDRixlQUFlO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM1SCxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLG1CQUFtQixDQUFDLElBQWEsRUFBRSxJQUFhO0lBQ3hELE1BQU0sTUFBTSxHQUFZLEVBQUUsQ0FBQztJQUMzQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDM0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0QixJQUFJLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQzthQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0UsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN6RSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0QsQ0FBQyxFQUFFLENBQUM7WUFDSixDQUFDLEVBQUUsQ0FBQztRQUNMLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFhLEVBQUUsSUFBYTtJQUNyRCxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLGNBQWM7SUFDbkIsWUFDaUIsMEJBQTJDLEVBQzNDLGNBQXNCO1FBRHRCLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBaUI7UUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQVE7SUFDbkMsQ0FBQztJQUVFLG9CQUFvQixDQUFDLG9CQUEyQyxFQUFFLFVBQXNCO1FBQzlGLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN0QyxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLGtDQUFrQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzlHLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyw4QkFBOEIsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0YsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsU0FBUyxFQUFFLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLCtCQUF1QixDQUFDO0lBQzFHLENBQUM7Q0FDRCJ9