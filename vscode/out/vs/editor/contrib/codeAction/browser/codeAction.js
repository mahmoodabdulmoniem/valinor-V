/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce, equals, isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, isCancellationError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import * as languages from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IModelService } from '../../../common/services/model.js';
import { EditSources } from '../../../common/textModelEditSource.js';
import { TextModelCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { CodeActionItem, CodeActionKind, CodeActionTriggerSource, filtersAction, mayIncludeActionsOfKind } from '../common/types.js';
export const codeActionCommandId = 'editor.action.codeAction';
export const quickFixCommandId = 'editor.action.quickFix';
export const autoFixCommandId = 'editor.action.autoFix';
export const refactorCommandId = 'editor.action.refactor';
export const refactorPreviewCommandId = 'editor.action.refactor.preview';
export const sourceActionCommandId = 'editor.action.sourceAction';
export const organizeImportsCommandId = 'editor.action.organizeImports';
export const fixAllCommandId = 'editor.action.fixAll';
const CODE_ACTION_SOUND_APPLIED_DURATION = 1000;
class ManagedCodeActionSet extends Disposable {
    static codeActionsPreferredComparator(a, b) {
        if (a.isPreferred && !b.isPreferred) {
            return -1;
        }
        else if (!a.isPreferred && b.isPreferred) {
            return 1;
        }
        else {
            return 0;
        }
    }
    static codeActionsComparator({ action: a }, { action: b }) {
        if (a.isAI && !b.isAI) {
            return 1;
        }
        else if (!a.isAI && b.isAI) {
            return -1;
        }
        if (isNonEmptyArray(a.diagnostics)) {
            return isNonEmptyArray(b.diagnostics) ? ManagedCodeActionSet.codeActionsPreferredComparator(a, b) : -1;
        }
        else if (isNonEmptyArray(b.diagnostics)) {
            return 1;
        }
        else {
            return ManagedCodeActionSet.codeActionsPreferredComparator(a, b); // both have no diagnostics
        }
    }
    constructor(actions, documentation, disposables) {
        super();
        this.documentation = documentation;
        this._register(disposables);
        this.allActions = [...actions].sort(ManagedCodeActionSet.codeActionsComparator);
        this.validActions = this.allActions.filter(({ action }) => !action.disabled);
    }
    get hasAutoFix() {
        return this.validActions.some(({ action: fix }) => !!fix.kind && CodeActionKind.QuickFix.contains(new HierarchicalKind(fix.kind)) && !!fix.isPreferred);
    }
    get hasAIFix() {
        return this.validActions.some(({ action: fix }) => !!fix.isAI);
    }
    get allAIFixes() {
        return this.validActions.every(({ action: fix }) => !!fix.isAI);
    }
}
const emptyCodeActionsResponse = { actions: [], documentation: undefined };
export async function getCodeActions(registry, model, rangeOrSelection, trigger, progress, token) {
    const filter = trigger.filter || {};
    const notebookFilter = {
        ...filter,
        excludes: [...(filter.excludes || []), CodeActionKind.Notebook],
    };
    const codeActionContext = {
        only: filter.include?.value,
        trigger: trigger.type,
    };
    const cts = new TextModelCancellationTokenSource(model, token);
    // if the trigger is auto (autosave, lightbulb, etc), we should exclude notebook codeActions
    const excludeNotebookCodeActions = (trigger.type === 2 /* languages.CodeActionTriggerType.Auto */);
    const providers = getCodeActionProviders(registry, model, (excludeNotebookCodeActions) ? notebookFilter : filter);
    const disposables = new DisposableStore();
    const promises = providers.map(async (provider) => {
        const handle = setTimeout(() => progress.report(provider), 1250);
        try {
            const providedCodeActions = await provider.provideCodeActions(model, rangeOrSelection, codeActionContext, cts.token);
            if (cts.token.isCancellationRequested) {
                providedCodeActions?.dispose();
                return emptyCodeActionsResponse;
            }
            if (providedCodeActions) {
                disposables.add(providedCodeActions);
            }
            const filteredActions = (providedCodeActions?.actions || []).filter(action => action && filtersAction(filter, action));
            const documentation = getDocumentationFromProvider(provider, filteredActions, filter.include);
            return {
                actions: filteredActions.map(action => new CodeActionItem(action, provider)),
                documentation
            };
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            onUnexpectedExternalError(err);
            return emptyCodeActionsResponse;
        }
        finally {
            clearTimeout(handle);
        }
    });
    const listener = registry.onDidChange(() => {
        const newProviders = registry.all(model);
        if (!equals(newProviders, providers)) {
            cts.cancel();
        }
    });
    try {
        const actions = await Promise.all(promises);
        const allActions = actions.map(x => x.actions).flat();
        const allDocumentation = [
            ...coalesce(actions.map(x => x.documentation)),
            ...getAdditionalDocumentationForShowingActions(registry, model, trigger, allActions)
        ];
        const managedCodeActionSet = new ManagedCodeActionSet(allActions, allDocumentation, disposables);
        disposables.add(managedCodeActionSet);
        return managedCodeActionSet;
    }
    catch (err) {
        disposables.dispose();
        throw err;
    }
    finally {
        listener.dispose();
        cts.dispose();
    }
}
function getCodeActionProviders(registry, model, filter) {
    return registry.all(model)
        // Don't include providers that we know will not return code actions of interest
        .filter(provider => {
        if (!provider.providedCodeActionKinds) {
            // We don't know what type of actions this provider will return.
            return true;
        }
        return provider.providedCodeActionKinds.some(kind => mayIncludeActionsOfKind(filter, new HierarchicalKind(kind)));
    });
}
function* getAdditionalDocumentationForShowingActions(registry, model, trigger, actionsToShow) {
    if (model && actionsToShow.length) {
        for (const provider of registry.all(model)) {
            if (provider._getAdditionalMenuItems) {
                yield* provider._getAdditionalMenuItems?.({ trigger: trigger.type, only: trigger.filter?.include?.value }, actionsToShow.map(item => item.action));
            }
        }
    }
}
function getDocumentationFromProvider(provider, providedCodeActions, only) {
    if (!provider.documentation) {
        return undefined;
    }
    const documentation = provider.documentation.map(entry => ({ kind: new HierarchicalKind(entry.kind), command: entry.command }));
    if (only) {
        let currentBest;
        for (const entry of documentation) {
            if (entry.kind.contains(only)) {
                if (!currentBest) {
                    currentBest = entry;
                }
                else {
                    // Take best match
                    if (currentBest.kind.contains(entry.kind)) {
                        currentBest = entry;
                    }
                }
            }
        }
        if (currentBest) {
            return currentBest?.command;
        }
    }
    // Otherwise, check to see if any of the provided actions match.
    for (const action of providedCodeActions) {
        if (!action.kind) {
            continue;
        }
        for (const entry of documentation) {
            if (entry.kind.contains(new HierarchicalKind(action.kind))) {
                return entry.command;
            }
        }
    }
    return undefined;
}
export var ApplyCodeActionReason;
(function (ApplyCodeActionReason) {
    ApplyCodeActionReason["OnSave"] = "onSave";
    ApplyCodeActionReason["FromProblemsView"] = "fromProblemsView";
    ApplyCodeActionReason["FromCodeActions"] = "fromCodeActions";
    ApplyCodeActionReason["FromAILightbulb"] = "fromAILightbulb";
    ApplyCodeActionReason["FromProblemsHover"] = "fromProblemsHover";
})(ApplyCodeActionReason || (ApplyCodeActionReason = {}));
export async function applyCodeAction(accessor, item, codeActionReason, options, token = CancellationToken.None) {
    const bulkEditService = accessor.get(IBulkEditService);
    const commandService = accessor.get(ICommandService);
    const telemetryService = accessor.get(ITelemetryService);
    const notificationService = accessor.get(INotificationService);
    const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
    telemetryService.publicLog2('codeAction.applyCodeAction', {
        codeActionTitle: item.action.title,
        codeActionKind: item.action.kind,
        codeActionIsPreferred: !!item.action.isPreferred,
        reason: codeActionReason,
    });
    accessibilitySignalService.playSignal(AccessibilitySignal.codeActionTriggered);
    await item.resolve(token);
    if (token.isCancellationRequested) {
        return;
    }
    if (item.action.edit?.edits.length) {
        const result = await bulkEditService.apply(item.action.edit, {
            editor: options?.editor,
            label: item.action.title,
            quotableLabel: item.action.title,
            code: 'undoredo.codeAction',
            respectAutoSaveConfig: codeActionReason !== ApplyCodeActionReason.OnSave,
            showPreview: options?.preview,
            reason: EditSources.codeAction({ kind: item.action.kind, providerId: languages.ProviderId.fromExtensionId(item.provider?.extensionId) }),
        });
        if (!result.isApplied) {
            return;
        }
    }
    if (item.action.command) {
        try {
            await commandService.executeCommand(item.action.command.id, ...(item.action.command.arguments || []));
        }
        catch (err) {
            const message = asMessage(err);
            notificationService.error(typeof message === 'string'
                ? message
                : nls.localize('applyCodeActionFailed', "An unknown error occurred while applying the code action"));
        }
    }
    // ensure the start sound and end sound do not overlap
    setTimeout(() => accessibilitySignalService.playSignal(AccessibilitySignal.codeActionApplied), CODE_ACTION_SOUND_APPLIED_DURATION);
}
function asMessage(err) {
    if (typeof err === 'string') {
        return err;
    }
    else if (err instanceof Error && typeof err.message === 'string') {
        return err.message;
    }
    else {
        return undefined;
    }
}
CommandsRegistry.registerCommand('_executeCodeActionProvider', async function (accessor, resource, rangeOrSelection, kind, itemResolveCount) {
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const { codeActionProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const validatedRangeOrSelection = Selection.isISelection(rangeOrSelection)
        ? Selection.liftSelection(rangeOrSelection)
        : Range.isIRange(rangeOrSelection)
            ? model.validateRange(rangeOrSelection)
            : undefined;
    if (!validatedRangeOrSelection) {
        throw illegalArgument();
    }
    const include = typeof kind === 'string' ? new HierarchicalKind(kind) : undefined;
    const codeActionSet = await getCodeActions(codeActionProvider, model, validatedRangeOrSelection, { type: 1 /* languages.CodeActionTriggerType.Invoke */, triggerAction: CodeActionTriggerSource.Default, filter: { includeSourceActions: true, include } }, Progress.None, CancellationToken.None);
    const resolving = [];
    const resolveCount = Math.min(codeActionSet.validActions.length, typeof itemResolveCount === 'number' ? itemResolveCount : 0);
    for (let i = 0; i < resolveCount; i++) {
        resolving.push(codeActionSet.validActions[i].resolve(CancellationToken.None));
    }
    try {
        await Promise.all(resolving);
        return codeActionSet.validActions.map(item => item.action);
    }
    finally {
        setTimeout(() => codeActionSet.dispose(), 100);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi9icm93c2VyL2NvZGVBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEosT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXJHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENB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