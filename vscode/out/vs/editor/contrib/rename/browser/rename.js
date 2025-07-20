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
var RenameController_1;
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { raceCancellation } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { NewSymbolNameTriggerKind } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextResourceConfigurationService } from '../../../common/services/textResourceConfiguration.js';
import { EditSources } from '../../../common/textModelEditSource.js';
import { EditorStateCancellationTokenSource } from '../../editorState/browser/editorState.js';
import { MessageController } from '../../message/browser/messageController.js';
import { CONTEXT_RENAME_INPUT_VISIBLE, RenameWidget } from './renameWidget.js';
class RenameSkeleton {
    constructor(model, position, registry) {
        this.model = model;
        this.position = position;
        this._providerRenameIdx = 0;
        this._providers = registry.ordered(model);
    }
    hasProvider() {
        return this._providers.length > 0;
    }
    async resolveRenameLocation(token) {
        const rejects = [];
        for (this._providerRenameIdx = 0; this._providerRenameIdx < this._providers.length; this._providerRenameIdx++) {
            const provider = this._providers[this._providerRenameIdx];
            if (!provider.resolveRenameLocation) {
                break;
            }
            const res = await provider.resolveRenameLocation(this.model, this.position, token);
            if (!res) {
                continue;
            }
            if (res.rejectReason) {
                rejects.push(res.rejectReason);
                continue;
            }
            return res;
        }
        // we are here when no provider prepared a location which means we can
        // just rely on the word under cursor and start with the first provider
        this._providerRenameIdx = 0;
        const word = this.model.getWordAtPosition(this.position);
        if (!word) {
            return {
                range: Range.fromPositions(this.position),
                text: '',
                rejectReason: rejects.length > 0 ? rejects.join('\n') : undefined
            };
        }
        return {
            range: new Range(this.position.lineNumber, word.startColumn, this.position.lineNumber, word.endColumn),
            text: word.word,
            rejectReason: rejects.length > 0 ? rejects.join('\n') : undefined
        };
    }
    async provideRenameEdits(newName, token) {
        return this._provideRenameEdits(newName, this._providerRenameIdx, [], token);
    }
    async _provideRenameEdits(newName, i, rejects, token) {
        const provider = this._providers[i];
        if (!provider) {
            return {
                edits: [],
                rejectReason: rejects.join('\n')
            };
        }
        const result = await provider.provideRenameEdits(this.model, this.position, newName, token);
        if (!result) {
            return this._provideRenameEdits(newName, i + 1, rejects.concat(nls.localize('no result', "No result.")), token);
        }
        else if (result.rejectReason) {
            return this._provideRenameEdits(newName, i + 1, rejects.concat(result.rejectReason), token);
        }
        return result;
    }
}
export async function rename(registry, model, position, newName) {
    const skeleton = new RenameSkeleton(model, position, registry);
    const loc = await skeleton.resolveRenameLocation(CancellationToken.None);
    if (loc?.rejectReason) {
        return { edits: [], rejectReason: loc.rejectReason };
    }
    return skeleton.provideRenameEdits(newName, CancellationToken.None);
}
// ---  register actions and commands
let RenameController = class RenameController {
    static { RenameController_1 = this; }
    static { this.ID = 'editor.contrib.renameController'; }
    static get(editor) {
        return editor.getContribution(RenameController_1.ID);
    }
    constructor(editor, _instaService, _notificationService, _bulkEditService, _progressService, _logService, _configService, _languageFeaturesService) {
        this.editor = editor;
        this._instaService = _instaService;
        this._notificationService = _notificationService;
        this._bulkEditService = _bulkEditService;
        this._progressService = _progressService;
        this._logService = _logService;
        this._configService = _configService;
        this._languageFeaturesService = _languageFeaturesService;
        this._disposableStore = new DisposableStore();
        this._cts = new CancellationTokenSource();
        this._renameWidget = this._disposableStore.add(this._instaService.createInstance(RenameWidget, this.editor, ['acceptRenameInput', 'acceptRenameInputWithPreview']));
    }
    dispose() {
        this._disposableStore.dispose();
        this._cts.dispose(true);
    }
    async run() {
        const trace = this._logService.trace.bind(this._logService, '[rename]');
        // set up cancellation token to prevent reentrant rename, this
        // is the parent to the resolve- and rename-tokens
        this._cts.dispose(true);
        this._cts = new CancellationTokenSource();
        if (!this.editor.hasModel()) {
            trace('editor has no model');
            return undefined;
        }
        const position = this.editor.getPosition();
        const skeleton = new RenameSkeleton(this.editor.getModel(), position, this._languageFeaturesService.renameProvider);
        if (!skeleton.hasProvider()) {
            trace('skeleton has no provider');
            return undefined;
        }
        // part 1 - resolve rename location
        const cts1 = new EditorStateCancellationTokenSource(this.editor, 4 /* CodeEditorStateFlag.Position */ | 1 /* CodeEditorStateFlag.Value */, undefined, this._cts.token);
        let loc;
        try {
            trace('resolving rename location');
            const resolveLocationOperation = skeleton.resolveRenameLocation(cts1.token);
            this._progressService.showWhile(resolveLocationOperation, 250);
            loc = await resolveLocationOperation;
            trace('resolved rename location');
        }
        catch (e) {
            if (e instanceof CancellationError) {
                trace('resolve rename location cancelled', JSON.stringify(e, null, '\t'));
            }
            else {
                trace('resolve rename location failed', e instanceof Error ? e : JSON.stringify(e, null, '\t'));
                if (typeof e === 'string' || isMarkdownString(e)) {
                    MessageController.get(this.editor)?.showMessage(e || nls.localize('resolveRenameLocationFailed', "An unknown error occurred while resolving rename location"), position);
                }
            }
            return undefined;
        }
        finally {
            cts1.dispose();
        }
        if (!loc) {
            trace('returning early - no loc');
            return undefined;
        }
        if (loc.rejectReason) {
            trace(`returning early - rejected with reason: ${loc.rejectReason}`, loc.rejectReason);
            MessageController.get(this.editor)?.showMessage(loc.rejectReason, position);
            return undefined;
        }
        if (cts1.token.isCancellationRequested) {
            trace('returning early - cts1 cancelled');
            return undefined;
        }
        // part 2 - do rename at location
        const cts2 = new EditorStateCancellationTokenSource(this.editor, 4 /* CodeEditorStateFlag.Position */ | 1 /* CodeEditorStateFlag.Value */, loc.range, this._cts.token);
        const model = this.editor.getModel(); // @ulugbekna: assumes editor still has a model, otherwise, cts1 should've been cancelled
        const newSymbolNamesProviders = this._languageFeaturesService.newSymbolNamesProvider.all(model);
        const resolvedNewSymbolnamesProviders = await Promise.all(newSymbolNamesProviders.map(async (p) => [p, await p.supportsAutomaticNewSymbolNamesTriggerKind ?? false]));
        const requestRenameSuggestions = (triggerKind, cts) => {
            let providers = resolvedNewSymbolnamesProviders.slice();
            if (triggerKind === NewSymbolNameTriggerKind.Automatic) {
                providers = providers.filter(([_, supportsAutomatic]) => supportsAutomatic);
            }
            return providers.map(([p,]) => p.provideNewSymbolNames(model, loc.range, triggerKind, cts));
        };
        trace('creating rename input field and awaiting its result');
        const supportPreview = this._bulkEditService.hasPreviewHandler() && this._configService.getValue(this.editor.getModel().uri, 'editor.rename.enablePreview');
        const inputFieldResult = await this._renameWidget.getInput(loc.range, loc.text, supportPreview, newSymbolNamesProviders.length > 0 ? requestRenameSuggestions : undefined, cts2);
        trace('received response from rename input field');
        // no result, only hint to focus the editor or not
        if (typeof inputFieldResult === 'boolean') {
            trace(`returning early - rename input field response - ${inputFieldResult}`);
            if (inputFieldResult) {
                this.editor.focus();
            }
            cts2.dispose();
            return undefined;
        }
        this.editor.focus();
        trace('requesting rename edits');
        const renameOperation = raceCancellation(skeleton.provideRenameEdits(inputFieldResult.newName, cts2.token), cts2.token).then(async (renameResult) => {
            if (!renameResult) {
                trace('returning early - no rename edits result');
                return;
            }
            if (!this.editor.hasModel()) {
                trace('returning early - no model after rename edits are provided');
                return;
            }
            if (renameResult.rejectReason) {
                trace(`returning early - rejected with reason: ${renameResult.rejectReason}`);
                this._notificationService.info(renameResult.rejectReason);
                return;
            }
            // collapse selection to active end
            this.editor.setSelection(Range.fromPositions(this.editor.getSelection().getPosition()));
            trace('applying edits');
            this._bulkEditService.apply(renameResult, {
                editor: this.editor,
                showPreview: inputFieldResult.wantsPreview,
                label: nls.localize('label', "Renaming '{0}' to '{1}'", loc?.text, inputFieldResult.newName),
                code: 'undoredo.rename',
                quotableLabel: nls.localize('quotableLabel', "Renaming {0} to {1}", loc?.text, inputFieldResult.newName),
                respectAutoSaveConfig: true,
                reason: EditSources.rename(),
            }).then(result => {
                trace('edits applied');
                if (result.ariaSummary) {
                    alert(nls.localize('aria', "Successfully renamed '{0}' to '{1}'. Summary: {2}", loc.text, inputFieldResult.newName, result.ariaSummary));
                }
            }).catch(err => {
                trace(`error when applying edits ${JSON.stringify(err, null, '\t')}`);
                this._notificationService.error(nls.localize('rename.failedApply', "Rename failed to apply edits"));
                this._logService.error(err);
            });
        }, err => {
            trace('error when providing rename edits', JSON.stringify(err, null, '\t'));
            this._notificationService.error(nls.localize('rename.failed', "Rename failed to compute edits"));
            this._logService.error(err);
        }).finally(() => {
            cts2.dispose();
        });
        trace('returning rename operation');
        this._progressService.showWhile(renameOperation, 250);
        return renameOperation;
    }
    acceptRenameInput(wantsPreview) {
        this._renameWidget.acceptInput(wantsPreview);
    }
    cancelRenameInput() {
        this._renameWidget.cancelInput(true, 'cancelRenameInput command');
    }
    focusNextRenameSuggestion() {
        this._renameWidget.focusNextRenameSuggestion();
    }
    focusPreviousRenameSuggestion() {
        this._renameWidget.focusPreviousRenameSuggestion();
    }
};
RenameController = RenameController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IBulkEditService),
    __param(4, IEditorProgressService),
    __param(5, ILogService),
    __param(6, ITextResourceConfigurationService),
    __param(7, ILanguageFeaturesService)
], RenameController);
// ---- action implementation
export class RenameAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.rename',
            label: nls.localize2('rename.label', "Rename Symbol"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasRenameProvider),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 60 /* KeyCode.F2 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.1
            }
        });
    }
    runCommand(accessor, args) {
        const editorService = accessor.get(ICodeEditorService);
        const [uri, pos] = Array.isArray(args) && args || [undefined, undefined];
        if (URI.isUri(uri) && Position.isIPosition(pos)) {
            return editorService.openCodeEditor({ resource: uri }, editorService.getActiveCodeEditor()).then(editor => {
                if (!editor) {
                    return;
                }
                editor.setPosition(pos);
                editor.invokeWithinContext(accessor => {
                    this.reportTelemetry(accessor, editor);
                    return this.run(accessor, editor);
                });
            }, onUnexpectedError);
        }
        return super.runCommand(accessor, args);
    }
    run(accessor, editor) {
        const logService = accessor.get(ILogService);
        const controller = RenameController.get(editor);
        if (controller) {
            logService.trace('[RenameAction] got controller, running...');
            return controller.run();
        }
        logService.trace('[RenameAction] returning early - controller missing');
        return Promise.resolve();
    }
}
registerEditorContribution(RenameController.ID, RenameController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(RenameAction);
const RenameCommand = EditorCommand.bindToContribution(RenameController.get);
registerEditorCommand(new RenameCommand({
    id: 'acceptRenameInput',
    precondition: CONTEXT_RENAME_INPUT_VISIBLE,
    handler: x => x.acceptRenameInput(false),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 3 /* KeyCode.Enter */
    }
}));
registerEditorCommand(new RenameCommand({
    id: 'acceptRenameInputWithPreview',
    precondition: ContextKeyExpr.and(CONTEXT_RENAME_INPUT_VISIBLE, ContextKeyExpr.has('config.editor.rename.enablePreview')),
    handler: x => x.acceptRenameInput(true),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.focus, ContextKeyExpr.not('isComposing')),
        primary: 2048 /* KeyMod.CtrlCmd */ + 3 /* KeyCode.Enter */
    }
}));
registerEditorCommand(new RenameCommand({
    id: 'cancelRenameInput',
    precondition: CONTEXT_RENAME_INPUT_VISIBLE,
    handler: x => x.cancelRenameInput(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
registerAction2(class FocusNextRenameSuggestion extends Action2 {
    constructor() {
        super({
            id: 'focusNextRenameSuggestion',
            title: {
                ...nls.localize2('focusNextRenameSuggestion', "Focus Next Rename Suggestion"),
            },
            precondition: CONTEXT_RENAME_INPUT_VISIBLE,
            keybinding: [
                {
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
                }
            ]
        });
    }
    run(accessor) {
        const currentEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!currentEditor) {
            return;
        }
        const controller = RenameController.get(currentEditor);
        if (!controller) {
            return;
        }
        controller.focusNextRenameSuggestion();
    }
});
registerAction2(class FocusPreviousRenameSuggestion extends Action2 {
    constructor() {
        super({
            id: 'focusPreviousRenameSuggestion',
            title: {
                ...nls.localize2('focusPreviousRenameSuggestion', "Focus Previous Rename Suggestion"),
            },
            precondition: CONTEXT_RENAME_INPUT_VISIBLE,
            keybinding: [
                {
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 100 /* KeybindingWeight.EditorContrib */ + 99,
                }
            ]
        });
    }
    run(accessor) {
        const currentEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!currentEditor) {
            return;
        }
        const controller = RenameController.get(currentEditor);
        if (!controller) {
            return;
        }
        controller.focusPreviousRenameSuggestion();
    }
});
// ---- api bridge command
registerModelAndPositionCommand('_executeDocumentRenameProvider', function (accessor, model, position, ...args) {
    const [newName] = args;
    assertType(typeof newName === 'string');
    const { renameProvider } = accessor.get(ILanguageFeaturesService);
    return rename(renameProvider, model, position, newName);
});
registerModelAndPositionCommand('_executePrepareRename', async function (accessor, model, position) {
    const { renameProvider } = accessor.get(ILanguageFeaturesService);
    const skeleton = new RenameSkeleton(model, position, renameProvider);
    const loc = await skeleton.resolveRenameLocation(CancellationToken.None);
    if (loc?.rejectReason) {
        throw new Error(loc.rejectReason);
    }
    return loc;
});
//todo@jrieken use editor options world
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        'editor.rename.enablePreview': {
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            description: nls.localize('enablePreview', "Enable/disable the ability to preview changes before renaming"),
            default: true,
            type: 'boolean'
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9yZW5hbWUvYnJvd3Nlci9yZW5hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFzQixVQUFVLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDNUksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FB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