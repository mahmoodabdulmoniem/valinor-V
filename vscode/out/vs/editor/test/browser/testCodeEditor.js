/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { mock } from '../../../base/test/common/mock.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../browser/widget/codeEditor/codeEditorWidget.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../common/services/languageFeaturesService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { IModelService } from '../../common/services/model.js';
import { ModelService } from '../../common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { TestConfiguration } from './config/testConfiguration.js';
import { TestCodeEditorService, TestCommandService } from './editorTestServices.js';
import { TestLanguageConfigurationService } from '../common/modes/testLanguageConfigurationService.js';
import { TestEditorWorkerService } from '../common/services/testEditorWorkerService.js';
import { TestTextResourcePropertiesService } from '../common/services/testTextResourcePropertiesService.js';
import { instantiateTextModel } from '../common/testTextModel.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../platform/clipboard/test/common/testClipboardService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { MockContextKeyService, MockKeybindingService } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILoggerService, ILogService, NullLoggerService, NullLogService } from '../../../platform/log/common/log.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { NullOpenerService } from '../../../platform/opener/test/common/nullOpenerService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryServiceShape } from '../../../platform/telemetry/common/telemetryUtils.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { ITreeSitterLibraryService } from '../../common/services/treeSitter/treeSitterLibraryService.js';
import { TestTreeSitterLibraryService } from '../common/services/testTreeSitterLibraryService.js';
import { IInlineCompletionsService, InlineCompletionsService } from '../../browser/services/inlineCompletionsService.js';
export class TestCodeEditor extends CodeEditorWidget {
    constructor() {
        super(...arguments);
        this._hasTextFocus = false;
    }
    //#region testing overrides
    _createConfiguration(isSimpleWidget, contextMenuId, options) {
        return new TestConfiguration(options);
    }
    _createView(viewModel) {
        // Never create a view
        return [null, false];
    }
    setHasTextFocus(hasTextFocus) {
        this._hasTextFocus = hasTextFocus;
    }
    hasTextFocus() {
        return this._hasTextFocus;
    }
    //#endregion
    //#region Testing utils
    getViewModel() {
        return this._modelData ? this._modelData.viewModel : undefined;
    }
    registerAndInstantiateContribution(id, ctor) {
        const r = this._instantiationService.createInstance(ctor, this);
        this._contributions.set(id, r);
        return r;
    }
    registerDisposable(disposable) {
        this._register(disposable);
    }
    runCommand(command, args) {
        return this._instantiationService.invokeFunction((accessor) => {
            return command.runEditorCommand(accessor, this, args);
        });
    }
    runAction(action, args) {
        return this._instantiationService.invokeFunction((accessor) => {
            return action.run(accessor, this, args);
        });
    }
}
class TestEditorDomElement {
    constructor() {
        this.parentElement = null;
        this.ownerDocument = document;
        this.document = document;
    }
    setAttribute(attr, value) { }
    removeAttribute(attr) { }
    hasAttribute(attr) { return false; }
    getAttribute(attr) { return undefined; }
    addEventListener(event) { }
    removeEventListener(event) { }
}
export function withTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
export async function withAsyncTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
function isTextModel(arg) {
    return Boolean(arg && arg.uri);
}
function _withTestCodeEditor(arg, options, callback) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    // create a model if necessary
    let model;
    if (isTextModel(arg)) {
        model = arg;
    }
    else {
        model = disposables.add(instantiateTextModel(instantiationService, Array.isArray(arg) ? arg.join('\n') : arg));
    }
    const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, options));
    const viewModel = editor.getViewModel();
    viewModel.setHasFocus(true);
    const result = callback(editor, editor.getViewModel(), instantiationService);
    if (result) {
        return result.then(() => disposables.dispose());
    }
    disposables.dispose();
}
export function createCodeEditorServices(disposables, services = new ServiceCollection()) {
    const serviceIdentifiers = [];
    const define = (id, ctor) => {
        if (!services.has(id)) {
            services.set(id, new SyncDescriptor(ctor));
        }
        serviceIdentifiers.push(id);
    };
    const defineInstance = (id, instance) => {
        if (!services.has(id)) {
            services.set(id, instance);
        }
        serviceIdentifiers.push(id);
    };
    define(IAccessibilityService, TestAccessibilityService);
    define(IKeybindingService, MockKeybindingService);
    define(IClipboardService, TestClipboardService);
    define(IEditorWorkerService, TestEditorWorkerService);
    defineInstance(IOpenerService, NullOpenerService);
    define(INotificationService, TestNotificationService);
    define(IDialogService, TestDialogService);
    define(IUndoRedoService, UndoRedoService);
    define(ILanguageService, LanguageService);
    define(ILanguageConfigurationService, TestLanguageConfigurationService);
    define(IConfigurationService, TestConfigurationService);
    define(ITextResourcePropertiesService, TestTextResourcePropertiesService);
    define(IThemeService, TestThemeService);
    define(ILogService, NullLogService);
    define(IModelService, ModelService);
    define(ICodeEditorService, TestCodeEditorService);
    define(IContextKeyService, MockContextKeyService);
    define(ICommandService, TestCommandService);
    define(ITelemetryService, NullTelemetryServiceShape);
    define(ILoggerService, NullLoggerService);
    define(IEnvironmentService, class extends mock() {
        constructor() {
            super(...arguments);
            this.isBuilt = true;
            this.isExtensionDevelopment = false;
        }
    });
    define(ILanguageFeatureDebounceService, LanguageFeatureDebounceService);
    define(ILanguageFeaturesService, LanguageFeaturesService);
    define(ITreeSitterLibraryService, TestTreeSitterLibraryService);
    define(IInlineCompletionsService, InlineCompletionsService);
    const instantiationService = disposables.add(new TestInstantiationService(services, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = services.get(id);
            if (typeof instanceOrDescriptor.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
export function createTestCodeEditor(model, options = {}) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    const editor = instantiateTestCodeEditor(instantiationService, model || null, options);
    editor.registerDisposable(disposables);
    return editor;
}
export function instantiateTestCodeEditor(instantiationService, model, options = {}) {
    const codeEditorWidgetOptions = {
        contributions: []
    };
    const editor = instantiationService.createInstance(TestCodeEditor, new TestEditorDomElement(), options, codeEditorWidgetOptions);
    if (typeof options.hasTextFocus === 'undefined') {
        options.hasTextFocus = true;
    }
    editor.setHasTextFocus(options.hasTextFocus);
    editor.setModel(model);
    const viewModel = editor.getViewModel();
    viewModel?.setHasFocus(options.hasTextFocus);
    return editor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdGVzdENvZGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFakYsT0FBTyxFQUFFLGdCQUFnQixFQUE0QixNQUFNLHFEQUFxRCxDQUFDO0FBR2pILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25JLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FB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