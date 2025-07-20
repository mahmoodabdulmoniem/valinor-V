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
import { CachedFunction } from '../../../../base/common/cache.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun, mapObservableArrayCached, derived, observableValue, derivedWithSetter, observableSignalFromEvent, observableFromEvent } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { DynamicCssRules } from '../../../../editor/browser/editorDom.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { CodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { EditSourceTrackingImpl } from './editSourceTrackingImpl.js';
import { DataChannelForwardingTelemetryService } from './forwardingTelemetryService.js';
import { EDIT_TELEMETRY_DETAILS_SETTING_ID, EDIT_TELEMETRY_SHOW_DECORATIONS, EDIT_TELEMETRY_SHOW_STATUS_BAR } from './settings.js';
let EditTrackingFeature = class EditTrackingFeature extends Disposable {
    constructor(_workspace, _configurationService, _instantiationService, _statusbarService, _editorGroupsService, _editorService) {
        super();
        this._workspace = _workspace;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._statusbarService = _statusbarService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._showStateInMarkdownDoc = 'editTelemetry.showDebugDetails';
        this._toggleDecorations = 'editTelemetry.toggleDebugDecorations';
        this._editSourceTrackingShowDecorations = makeSettable(observableConfigValue(EDIT_TELEMETRY_SHOW_DECORATIONS, false, this._configurationService));
        this._editSourceTrackingShowStatusBar = observableConfigValue(EDIT_TELEMETRY_SHOW_STATUS_BAR, false, this._configurationService);
        this._editSourceDetailsEnabled = observableConfigValue(EDIT_TELEMETRY_DETAILS_SETTING_ID, false, this._configurationService);
        const onDidAddGroupSignal = observableSignalFromEvent(this, this._editorGroupsService.onDidAddGroup);
        const onDidRemoveGroupSignal = observableSignalFromEvent(this, this._editorGroupsService.onDidRemoveGroup);
        const groups = derived(this, reader => {
            onDidAddGroupSignal.read(reader);
            onDidRemoveGroupSignal.read(reader);
            return this._editorGroupsService.groups;
        });
        const visibleUris = mapObservableArrayCached(this, groups, g => {
            const editors = observableFromEvent(this, g.onDidModelChange, () => g.editors);
            return editors.map(e => e.map(editor => EditorResourceAccessor.getCanonicalUri(editor)));
        }).map((editors, reader) => {
            const map = new Map();
            for (const urisObs of editors) {
                for (const uri of urisObs.read(reader)) {
                    if (isDefined(uri)) {
                        map.set(uri.toString(), uri);
                    }
                }
            }
            return map;
        });
        const instantiationServiceWithInterceptedTelemetry = this._instantiationService.createChild(new ServiceCollection([ITelemetryService, this._instantiationService.createInstance(DataChannelForwardingTelemetryService)]));
        const impl = this._register(instantiationServiceWithInterceptedTelemetry.createInstance(EditSourceTrackingImpl, this._workspace, (doc, reader) => {
            const map = visibleUris.read(reader);
            return map.get(doc.uri.toString()) !== undefined;
        }, this._editSourceDetailsEnabled));
        this._register(autorun((reader) => {
            if (!this._editSourceTrackingShowDecorations.read(reader)) {
                return;
            }
            const visibleEditors = observableFromEvent(this, this._editorService.onDidVisibleEditorsChange, () => this._editorService.visibleTextEditorControls);
            mapObservableArrayCached(this, visibleEditors, (editor, store) => {
                if (editor instanceof CodeEditorWidget) {
                    const obsEditor = observableCodeEditor(editor);
                    const cssStyles = new DynamicCssRules(editor);
                    const decorations = new CachedFunction((source) => {
                        const r = store.add(cssStyles.createClassNameRef({
                            backgroundColor: source.getColor(),
                        }));
                        return r.className;
                    });
                    store.add(obsEditor.setDecorations(derived(reader => {
                        const uri = obsEditor.model.read(reader)?.uri;
                        if (!uri) {
                            return [];
                        }
                        const doc = this._workspace.getDocument(uri);
                        if (!doc) {
                            return [];
                        }
                        const docsState = impl.docsState.read(reader).get(doc);
                        if (!docsState) {
                            return [];
                        }
                        const ranges = (docsState.longtermTracker.read(reader)?.getTrackedRanges(reader)) ?? [];
                        return ranges.map(r => ({
                            range: doc.value.get().getTransformer().getRange(r.range),
                            options: {
                                description: 'editSourceTracking',
                                inlineClassName: decorations.get(r.source),
                            }
                        }));
                    })));
                }
            }).recomputeInitiallyAndOnChange(reader.store);
        }));
        this._register(autorun(reader => {
            if (!this._editSourceTrackingShowStatusBar.read(reader)) {
                return;
            }
            const statusBarItem = reader.store.add(this._statusbarService.addEntry({
                name: '',
                text: '',
                command: this._showStateInMarkdownDoc,
                tooltip: 'Edit Source Tracking',
                ariaLabel: '',
            }, 'editTelemetry', 1 /* StatusbarAlignment.RIGHT */, 100));
            const sumChangedCharacters = derived(reader => {
                const docs = impl.docsState.read(reader);
                let sum = 0;
                for (const state of docs.values()) {
                    const t = state.longtermTracker.read(reader);
                    if (!t) {
                        continue;
                    }
                    const d = state.getTelemetryData(t.getTrackedRanges(reader));
                    sum += d.totalModifiedCharactersInFinalState;
                }
                return sum;
            });
            const tooltipMarkdownString = derived(reader => {
                const docs = impl.docsState.read(reader);
                const docsDataInTooltip = [];
                const editSources = [];
                for (const [doc, state] of docs) {
                    const tracker = state.longtermTracker.read(reader);
                    if (!tracker) {
                        continue;
                    }
                    const trackedRanges = tracker.getTrackedRanges(reader);
                    const data = state.getTelemetryData(trackedRanges);
                    if (data.totalModifiedCharactersInFinalState === 0) {
                        continue; // Don't include unmodified documents in tooltip
                    }
                    editSources.push(...trackedRanges.map(r => r.source));
                    // Filter out unmodified properties as these are not interesting to see in the hover
                    const filteredData = Object.fromEntries(Object.entries(data).filter(([_, value]) => !(typeof value === 'number') || value !== 0));
                    docsDataInTooltip.push([
                        `### ${doc.uri.fsPath}`,
                        '```json',
                        JSON.stringify(filteredData, undefined, '\t'),
                        '```',
                        '\n'
                    ].join('\n'));
                }
                let tooltipContent;
                if (docsDataInTooltip.length === 0) {
                    tooltipContent = 'No modified documents';
                }
                else if (docsDataInTooltip.length <= 3) {
                    tooltipContent = docsDataInTooltip.join('\n\n');
                }
                else {
                    const lastThree = docsDataInTooltip.slice(-3);
                    tooltipContent = '...\n\n' + lastThree.join('\n\n');
                }
                const agenda = this._createEditSourceAgenda(editSources);
                const tooltipWithCommand = new MarkdownString(tooltipContent + '\n\n[View Details](command:' + this._showStateInMarkdownDoc + ')');
                tooltipWithCommand.appendMarkdown('\n\n' + agenda + '\n\nToggle decorations: [Click here](command:' + this._toggleDecorations + ')');
                tooltipWithCommand.isTrusted = { enabledCommands: [this._toggleDecorations] };
                tooltipWithCommand.supportHtml = true;
                return tooltipWithCommand;
            });
            reader.store.add(autorun(reader => {
                statusBarItem.update({
                    name: 'editTelemetry',
                    text: `$(edit) ${sumChangedCharacters.read(reader)} chars inserted`,
                    ariaLabel: `Edit Source Tracking: ${sumChangedCharacters.read(reader)} modified characters`,
                    tooltip: tooltipMarkdownString.read(reader),
                    command: this._showStateInMarkdownDoc,
                });
            }));
            reader.store.add(CommandsRegistry.registerCommand(this._toggleDecorations, () => {
                this._editSourceTrackingShowDecorations.set(!this._editSourceTrackingShowDecorations.get(), undefined);
            }));
        }));
    }
    _createEditSourceAgenda(editSources) {
        // Collect all edit sources from the tracked documents
        const editSourcesSeen = new Set();
        const editSourceInfo = [];
        for (const editSource of editSources) {
            if (!editSourcesSeen.has(editSource.toString())) {
                editSourcesSeen.add(editSource.toString());
                editSourceInfo.push({ name: editSource.toString(), color: editSource.getColor() });
            }
        }
        const agendaItems = editSourceInfo.map(info => `<span style="background-color:${info.color};border-radius:3px;">${info.name}</span>`);
        return agendaItems.join(' ');
    }
};
EditTrackingFeature = __decorate([
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IStatusbarService),
    __param(4, IEditorGroupsService),
    __param(5, IEditorService)
], EditTrackingFeature);
export { EditTrackingFeature };
export function makeSettable(obs) {
    const overrideObs = observableValue('overrideObs', undefined);
    return derivedWithSetter(overrideObs, (reader) => {
        return overrideObs.read(reader) ?? obs.read(reader);
    }, (value, tx) => {
        overrideObs.set(value, tx);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvdXJjZVRyYWNraW5nRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFRlbGVtZXRyeS9icm93c2VyL2VkaXRTb3VyY2VUcmFja2luZ0ZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxPQUFPLEVBQW9DLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pOLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENB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