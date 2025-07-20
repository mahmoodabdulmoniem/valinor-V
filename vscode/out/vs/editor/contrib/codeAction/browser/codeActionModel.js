/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, TimeoutTimer } from '../../../../base/common/async.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ShowLightbulbIconMode } from '../../../common/config/editorOptions.js';
import { Position } from '../../../common/core/position.js';
import { Selection } from '../../../common/core/selection.js';
import { CodeActionKind, CodeActionTriggerSource } from '../common/types.js';
import { getCodeActions } from './codeAction.js';
export const SUPPORTED_CODE_ACTIONS = new RawContextKey('supportedCodeAction', '');
export const APPLY_FIX_ALL_COMMAND_ID = '_typescript.applyFixAllCodeAction';
class CodeActionOracle extends Disposable {
    constructor(_editor, _markerService, _signalChange, _delay = 250) {
        super();
        this._editor = _editor;
        this._markerService = _markerService;
        this._signalChange = _signalChange;
        this._delay = _delay;
        this._autoTriggerTimer = this._register(new TimeoutTimer());
        this._register(this._markerService.onMarkerChanged(e => this._onMarkerChanges(e)));
        this._register(this._editor.onDidChangeCursorPosition(() => this._tryAutoTrigger()));
    }
    trigger(trigger) {
        const selection = this._getRangeOfSelectionUnlessWhitespaceEnclosed(trigger);
        this._signalChange(selection ? { trigger, selection } : undefined);
    }
    _onMarkerChanges(resources) {
        const model = this._editor.getModel();
        if (model && resources.some(resource => isEqual(resource, model.uri))) {
            this._tryAutoTrigger();
        }
    }
    _tryAutoTrigger() {
        this._autoTriggerTimer.cancelAndSet(() => {
            this.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }, this._delay);
    }
    _getRangeOfSelectionUnlessWhitespaceEnclosed(trigger) {
        if (!this._editor.hasModel()) {
            return undefined;
        }
        const selection = this._editor.getSelection();
        if (trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
            return selection;
        }
        const enabled = this._editor.getOption(73 /* EditorOption.lightbulb */).enabled;
        if (enabled === ShowLightbulbIconMode.Off) {
            return undefined;
        }
        else if (enabled === ShowLightbulbIconMode.On) {
            return selection;
        }
        else if (enabled === ShowLightbulbIconMode.OnCode) {
            const isSelectionEmpty = selection.isEmpty();
            if (!isSelectionEmpty) {
                return selection;
            }
            const model = this._editor.getModel();
            const { lineNumber, column } = selection.getPosition();
            const line = model.getLineContent(lineNumber);
            if (line.length === 0) {
                // empty line
                return undefined;
            }
            else if (column === 1) {
                // look only right
                if (/\s/.test(line[0])) {
                    return undefined;
                }
            }
            else if (column === model.getLineMaxColumn(lineNumber)) {
                // look only left
                if (/\s/.test(line[line.length - 1])) {
                    return undefined;
                }
            }
            else {
                // look left and right
                if (/\s/.test(line[column - 2]) && /\s/.test(line[column - 1])) {
                    return undefined;
                }
            }
        }
        return selection;
    }
}
export var CodeActionsState;
(function (CodeActionsState) {
    let Type;
    (function (Type) {
        Type[Type["Empty"] = 0] = "Empty";
        Type[Type["Triggered"] = 1] = "Triggered";
    })(Type = CodeActionsState.Type || (CodeActionsState.Type = {}));
    CodeActionsState.Empty = { type: 0 /* Type.Empty */ };
    class Triggered {
        constructor(trigger, position, _cancellablePromise) {
            this.trigger = trigger;
            this.position = position;
            this._cancellablePromise = _cancellablePromise;
            this.type = 1 /* Type.Triggered */;
            this.actions = _cancellablePromise.catch((e) => {
                if (isCancellationError(e)) {
                    return emptyCodeActionSet;
                }
                throw e;
            });
        }
        cancel() {
            this._cancellablePromise.cancel();
        }
    }
    CodeActionsState.Triggered = Triggered;
})(CodeActionsState || (CodeActionsState = {}));
const emptyCodeActionSet = Object.freeze({
    allActions: [],
    validActions: [],
    dispose: () => { },
    documentation: [],
    hasAutoFix: false,
    hasAIFix: false,
    allAIFixes: false,
});
export class CodeActionModel extends Disposable {
    constructor(_editor, _registry, _markerService, contextKeyService, _progressService, _configurationService) {
        super();
        this._editor = _editor;
        this._registry = _registry;
        this._markerService = _markerService;
        this._progressService = _progressService;
        this._configurationService = _configurationService;
        this._codeActionOracle = this._register(new MutableDisposable());
        this._state = CodeActionsState.Empty;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this.codeActionsDisposable = this._register(new MutableDisposable());
        this._disposed = false;
        this._supportedCodeActions = SUPPORTED_CODE_ACTIONS.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeModel(() => this._update()));
        this._register(this._editor.onDidChangeModelLanguage(() => this._update()));
        this._register(this._registry.onDidChange(() => this._update()));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(73 /* EditorOption.lightbulb */)) {
                this._update();
            }
        }));
        this._update();
    }
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        super.dispose();
        this.setState(CodeActionsState.Empty, true);
    }
    _settingEnabledNearbyQuickfixes() {
        const model = this._editor?.getModel();
        return this._configurationService ? this._configurationService.getValue('editor.codeActionWidget.includeNearbyQuickFixes', { resource: model?.uri }) : false;
    }
    _update() {
        if (this._disposed) {
            return;
        }
        this._codeActionOracle.value = undefined;
        this.setState(CodeActionsState.Empty);
        const model = this._editor.getModel();
        if (model
            && this._registry.has(model)
            && !this._editor.getOption(103 /* EditorOption.readOnly */)) {
            const supportedActions = this._registry.all(model).flatMap(provider => provider.providedCodeActionKinds ?? []);
            this._supportedCodeActions.set(supportedActions.join(' '));
            this._codeActionOracle.value = new CodeActionOracle(this._editor, this._markerService, trigger => {
                if (!trigger) {
                    this.setState(CodeActionsState.Empty);
                    return;
                }
                const startPosition = trigger.selection.getStartPosition();
                const actions = createCancelablePromise(async (token) => {
                    if (this._settingEnabledNearbyQuickfixes() && trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */ && (trigger.trigger.triggerAction === CodeActionTriggerSource.QuickFix || trigger.trigger.filter?.include?.contains(CodeActionKind.QuickFix))) {
                        const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        this.codeActionsDisposable.value = codeActionSet;
                        const allCodeActions = [...codeActionSet.allActions];
                        if (token.isCancellationRequested) {
                            codeActionSet.dispose();
                            return emptyCodeActionSet;
                        }
                        // Search for quickfixes in the curret code action set.
                        const foundQuickfix = codeActionSet.validActions?.some(action => action.action.kind ? CodeActionKind.QuickFix.contains(new HierarchicalKind(action.action.kind)) : false);
                        const allMarkers = this._markerService.read({ resource: model.uri });
                        if (foundQuickfix) {
                            for (const action of codeActionSet.validActions) {
                                if (action.action.command?.arguments?.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                }
                            }
                            return { validActions: codeActionSet.validActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { this.codeActionsDisposable.value = codeActionSet; } };
                        }
                        else if (!foundQuickfix) {
                            // If markers exist, and there are no quickfixes found or length is zero, check for quickfixes on that line.
                            if (allMarkers.length > 0) {
                                const currPosition = trigger.selection.getPosition();
                                let trackedPosition = currPosition;
                                let distance = Number.MAX_VALUE;
                                const currentActions = [...codeActionSet.validActions];
                                for (const marker of allMarkers) {
                                    const col = marker.endColumn;
                                    const row = marker.endLineNumber;
                                    const startRow = marker.startLineNumber;
                                    // Found quickfix on the same line and check relative distance to other markers
                                    if ((row === currPosition.lineNumber || startRow === currPosition.lineNumber)) {
                                        trackedPosition = new Position(row, col);
                                        const newCodeActionTrigger = {
                                            type: trigger.trigger.type,
                                            triggerAction: trigger.trigger.triggerAction,
                                            filter: { include: trigger.trigger.filter?.include ? trigger.trigger.filter?.include : CodeActionKind.QuickFix },
                                            autoApply: trigger.trigger.autoApply,
                                            context: { notAvailableMessage: trigger.trigger.context?.notAvailableMessage || '', position: trackedPosition }
                                        };
                                        const selectionAsPosition = new Selection(trackedPosition.lineNumber, trackedPosition.column, trackedPosition.lineNumber, trackedPosition.column);
                                        const actionsAtMarker = await getCodeActions(this._registry, model, selectionAsPosition, newCodeActionTrigger, Progress.None, token);
                                        if (token.isCancellationRequested) {
                                            actionsAtMarker.dispose();
                                            return emptyCodeActionSet;
                                        }
                                        if (actionsAtMarker.validActions.length !== 0) {
                                            for (const action of actionsAtMarker.validActions) {
                                                if (action.action.command?.arguments?.some(arg => typeof arg === 'string' && arg.includes(APPLY_FIX_ALL_COMMAND_ID))) {
                                                    action.action.diagnostics = [...allMarkers.filter(marker => marker.relatedInformation)];
                                                }
                                            }
                                            if (codeActionSet.allActions.length === 0) {
                                                allCodeActions.push(...actionsAtMarker.allActions);
                                            }
                                            // Already filtered through to only get quickfixes, so no need to filter again.
                                            if (Math.abs(currPosition.column - col) < distance) {
                                                currentActions.unshift(...actionsAtMarker.validActions);
                                            }
                                            else {
                                                currentActions.push(...actionsAtMarker.validActions);
                                            }
                                        }
                                        distance = Math.abs(currPosition.column - col);
                                    }
                                }
                                const filteredActions = currentActions.filter((action, index, self) => self.findIndex((a) => a.action.title === action.action.title) === index);
                                filteredActions.sort((a, b) => {
                                    if (a.action.isPreferred && !b.action.isPreferred) {
                                        return -1;
                                    }
                                    else if (!a.action.isPreferred && b.action.isPreferred) {
                                        return 1;
                                    }
                                    else if (a.action.isAI && !b.action.isAI) {
                                        return 1;
                                    }
                                    else if (!a.action.isAI && b.action.isAI) {
                                        return -1;
                                    }
                                    else {
                                        return 0;
                                    }
                                });
                                // Only retriggers if actually found quickfix on the same line as cursor
                                return { validActions: filteredActions, allActions: allCodeActions, documentation: codeActionSet.documentation, hasAutoFix: codeActionSet.hasAutoFix, hasAIFix: codeActionSet.hasAIFix, allAIFixes: codeActionSet.allAIFixes, dispose: () => { this.codeActionsDisposable.value = codeActionSet; } };
                            }
                        }
                    }
                    // Case for manual triggers - specifically Source Actions and Refactors
                    if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                        const codeActions = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                        this.codeActionsDisposable.value = codeActions;
                        return codeActions;
                    }
                    const codeActionSet = await getCodeActions(this._registry, model, trigger.selection, trigger.trigger, Progress.None, token);
                    this.codeActionsDisposable.value = codeActionSet;
                    return codeActionSet;
                });
                if (trigger.trigger.type === 1 /* CodeActionTriggerType.Invoke */) {
                    this._progressService?.showWhile(actions, 250);
                }
                const newState = new CodeActionsState.Triggered(trigger.trigger, startPosition, actions);
                let isManualToAutoTransition = false;
                if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
                    // Check if the current state is manual and the new state is automatic
                    isManualToAutoTransition = this._state.trigger.type === 1 /* CodeActionTriggerType.Invoke */ &&
                        newState.type === 1 /* CodeActionsState.Type.Triggered */ &&
                        newState.trigger.type === 2 /* CodeActionTriggerType.Auto */ &&
                        this._state.position !== newState.position;
                }
                // Do not trigger state if current state is manual and incoming state is automatic
                if (!isManualToAutoTransition) {
                    this.setState(newState);
                }
                else {
                    // Reset the new state after getting code actions back.
                    setTimeout(() => {
                        this.setState(newState);
                    }, 500);
                }
            }, undefined);
            this._codeActionOracle.value.trigger({ type: 2 /* CodeActionTriggerType.Auto */, triggerAction: CodeActionTriggerSource.Default });
        }
        else {
            this._supportedCodeActions.reset();
        }
    }
    trigger(trigger) {
        this._codeActionOracle.value?.trigger(trigger);
        this.codeActionsDisposable.dispose();
    }
    setState(newState, skipNotify) {
        if (newState === this._state) {
            return;
        }
        // Cancel old request
        if (this._state.type === 1 /* CodeActionsState.Type.Triggered */) {
            this._state.cancel();
        }
        this._state = newState;
        if (!skipNotify && !this._disposed) {
            this._onDidChangeState.fire(newState);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHL0QsT0FBTyxFQUFtQyxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0SCxPQUFPLEVBQTBCLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXBHLE9BQU8sRUFBZ0IscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxjQUFjLEVBQW9DLHVCQUF1QixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRWpELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFTLHFCQUFxQixFQUFFLEVBQUUsQ0FB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