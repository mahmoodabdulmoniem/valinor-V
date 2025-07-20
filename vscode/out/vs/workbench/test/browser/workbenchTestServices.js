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
import { FileEditorInput } from '../../contrib/files/browser/editors/fileEditorInput.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { basename, isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditorInput } from '../../common/editor/editorInput.js';
import { EditorExtensions, EditorExtensions as Extensions } from '../../common/editor.js';
import { DEFAULT_EDITOR_PART_OPTIONS } from '../../browser/parts/editor/editor.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { TextModelResolverService } from '../../services/textmodelResolver/common/textModelResolverService.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IUntitledTextEditorService, UntitledTextEditorService } from '../../services/untitled/common/untitledTextEditorService.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../services/lifecycle/common/lifecycle.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { LanguageService } from '../../../editor/common/services/languageService.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { ITextFileService } from '../../services/textfile/common/textfiles.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IHistoryService } from '../../services/history/common/history.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { TestWorkspace } from '../../../platform/workspace/test/common/testWorkspace.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService } from '../../../editor/common/services/textResourceConfiguration.js';
import { Position as EditorPosition } from '../../../editor/common/core/position.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService, MockKeybindingService } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { Range } from '../../../editor/common/core/range.js';
import { IDialogService, IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IDecorationsService } from '../../services/decorations/common/decorations.js';
import { toDisposable, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { EditorPaneDescriptor } from '../../browser/editor.js';
import { ILoggerService, ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { LabelService } from '../../services/label/common/labelService.js';
import { bufferToStream, VSBuffer } from '../../../base/common/buffer.js';
import { Schemas } from '../../../base/common/network.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import product from '../../../platform/product/common/product.js';
import { IHostService } from '../../services/host/browser/host.js';
import { IWorkingCopyService, WorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService, FilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { BrowserWorkbenchEnvironmentService } from '../../services/environment/browser/environmentService.js';
import { BrowserTextFileService } from '../../services/textfile/browser/browserTextFileService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { createTextBufferFactoryFromStream } from '../../../editor/common/model/textModel.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { IProgressService, Progress } from '../../../platform/progress/common/progress.js';
import { IWorkingCopyFileService, WorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { TextFileEditorModel } from '../../services/textfile/common/textFileEditorModel.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { EditorPane } from '../../browser/parts/editor/editorPane.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { CodeEditorService } from '../../services/editor/browser/codeEditorService.js';
import { MainEditorPart } from '../../browser/parts/editor/editorPart.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { QuickInputService } from '../../services/quickinput/browser/quickInputService.js';
import { IListService } from '../../../platform/list/browser/listService.js';
import { win32, posix } from '../../../base/common/path.js';
import { TestContextService, TestStorageService, TestTextResourcePropertiesService, TestExtensionService, TestProductService, createFileStat, TestLoggerService, TestWorkspaceTrustManagementService, TestWorkspaceTrustRequestService, TestMarkerService, TestHistoryService } from '../common/workbenchTestServices.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { newWriteableStream } from '../../../base/common/stream.js';
import { EncodingOracle } from '../../services/textfile/browser/textFileService.js';
import { UTF16le, UTF16be, UTF8_with_bom } from '../../services/textfile/common/encoding.js';
import { ColorScheme } from '../../../platform/theme/common/theme.js';
import { Iterable } from '../../../base/common/iterator.js';
import { InMemoryWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackupService.js';
import { BrowserWorkingCopyBackupService } from '../../services/workingCopy/browser/workingCopyBackupService.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { TextResourceEditor } from '../../browser/parts/editor/textResourceEditor.js';
import { TestCodeEditor } from '../../../editor/test/browser/testCodeEditor.js';
import { TextFileEditor } from '../../contrib/files/browser/editors/textFileEditor.js';
import { TextResourceEditorInput } from '../../common/editor/textResourceEditorInput.js';
import { UntitledTextEditorInput } from '../../services/untitled/common/untitledTextEditorInput.js';
import { SideBySideEditor } from '../../browser/parts/editor/sideBySideEditor.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../platform/workspace/common/workspaceTrust.js';
import { ITerminalLogService } from '../../../platform/terminal/common/terminal.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService } from '../../contrib/terminal/browser/terminal.js';
import { assertReturnsDefined, upcast } from '../../../base/common/types.js';
import { ITerminalProfileResolverService, ITerminalProfileService } from '../../contrib/terminal/common/terminal.js';
import { EditorResolverService } from '../../services/editor/browser/editorResolverService.js';
import { FILE_EDITOR_INPUT_ID } from '../../contrib/files/common/files.js';
import { IEditorResolverService } from '../../services/editor/common/editorResolverService.js';
import { IWorkingCopyEditorService, WorkingCopyEditorService } from '../../services/workingCopy/common/workingCopyEditorService.js';
import { IElevatedFileService } from '../../services/files/common/elevatedFileService.js';
import { BrowserElevatedFileService } from '../../services/files/browser/elevatedFileService.js';
import { IEditorWorkerService } from '../../../editor/common/services/editorWorker.js';
import { ResourceMap } from '../../../base/common/map.js';
import { SideBySideEditorInput } from '../../common/editor/sideBySideEditorInput.js';
import { ITextEditorService, TextEditorService } from '../../services/textfile/common/textEditorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { env } from '../../../base/common/process.js';
import { isValidBasename } from '../../../base/common/extpath.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../editor/common/services/languageFeaturesService.js';
import { TextEditorPaneSelection } from '../../browser/parts/editor/textEditor.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { TestEditorWorkerService } from '../../../editor/test/common/services/testEditorWorkerService.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { ILanguageDetectionService } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { IUserDataProfilesService, toUserDataProfile, UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { Codicon } from '../../../base/common/codicons.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { EditorParts } from '../../browser/parts/editor/editorParts.js';
import { mainWindow } from '../../../base/browser/window.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IEditorPaneService } from '../../services/editor/common/editorPaneService.js';
import { EditorPaneService } from '../../services/editor/browser/editorPaneService.js';
import { IContextMenuService, IContextViewService } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { CustomEditorLabelService, ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
import { TerminalConfigurationService } from '../../contrib/terminal/browser/terminalConfigurationService.js';
import { TerminalLogService } from '../../../platform/terminal/common/terminalLogService.js';
import { IEnvironmentVariableService } from '../../contrib/terminal/common/environmentVariable.js';
import { EnvironmentVariableService } from '../../contrib/terminal/common/environmentVariableService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../platform/hover/test/browser/nullHoverService.js';
import { IActionViewItemService, NullActionViewItemService } from '../../../platform/actions/browser/actionViewItemService.js';
import { ITreeSitterLibraryService } from '../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { TestTreeSitterLibraryService } from '../../../editor/test/common/services/testTreeSitterLibraryService.js';
export function createFileEditorInput(instantiationService, resource) {
    return instantiationService.createInstance(FileEditorInput, resource, undefined, undefined, undefined, undefined, undefined, undefined);
}
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    }
});
export class TestTextResourceEditor extends TextResourceEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, {}));
    }
}
export class TestTextFileEditor extends TextFileEditor {
    createEditorControl(parent, configuration) {
        this.editorControl = this._register(this.instantiationService.createInstance(TestCodeEditor, parent, configuration, { contributions: [] }));
    }
    setSelection(selection, reason) {
        this._options = selection ? upcast({ selection }) : undefined;
        this._onDidChangeSelection.fire({ reason });
    }
    getSelection() {
        const options = this.options;
        if (!options) {
            return undefined;
        }
        const textSelection = options.selection;
        if (!textSelection) {
            return undefined;
        }
        return new TextEditorPaneSelection(new Selection(textSelection.startLineNumber, textSelection.startColumn, textSelection.endLineNumber ?? textSelection.startLineNumber, textSelection.endColumn ?? textSelection.startColumn));
    }
}
export class TestWorkingCopyService extends WorkingCopyService {
    testUnregisterWorkingCopy(workingCopy) {
        return super.unregisterWorkingCopy(workingCopy);
    }
}
export function workbenchInstantiationService(overrides, disposables = new DisposableStore()) {
    const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([ILifecycleService, disposables.add(new TestLifecycleService())], [IActionViewItemService, new SyncDescriptor(NullActionViewItemService)])));
    instantiationService.stub(IProductService, TestProductService);
    instantiationService.stub(IEditorWorkerService, new TestEditorWorkerService());
    instantiationService.stub(IWorkingCopyService, disposables.add(new TestWorkingCopyService()));
    const environmentService = overrides?.environmentService ? overrides.environmentService(instantiationService) : TestEnvironmentService;
    instantiationService.stub(IEnvironmentService, environmentService);
    instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
    instantiationService.stub(ILogService, new NullLogService());
    const contextKeyService = overrides?.contextKeyService ? overrides.contextKeyService(instantiationService) : instantiationService.createInstance(MockContextKeyService);
    instantiationService.stub(IContextKeyService, contextKeyService);
    instantiationService.stub(IProgressService, new TestProgressService());
    const workspaceContextService = new TestContextService(TestWorkspace);
    instantiationService.stub(IWorkspaceContextService, workspaceContextService);
    const configService = overrides?.configurationService ? overrides.configurationService(instantiationService) : new TestConfigurationService({
        files: {
            participants: {
                timeout: 60000
            }
        }
    });
    instantiationService.stub(IConfigurationService, configService);
    const textResourceConfigurationService = new TestTextResourceConfigurationService(configService);
    instantiationService.stub(ITextResourceConfigurationService, textResourceConfigurationService);
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
    instantiationService.stub(IRemoteAgentService, new TestRemoteAgentService());
    instantiationService.stub(ILanguageDetectionService, new TestLanguageDetectionService());
    instantiationService.stub(IPathService, overrides?.pathService ? overrides.pathService(instantiationService) : new TestPathService());
    const layoutService = new TestLayoutService();
    instantiationService.stub(IWorkbenchLayoutService, layoutService);
    instantiationService.stub(IDialogService, new TestDialogService());
    const accessibilityService = new TestAccessibilityService();
    instantiationService.stub(IAccessibilityService, accessibilityService);
    instantiationService.stub(IAccessibilitySignalService, {
        playSignal: async () => { },
        isSoundEnabled(signal) { return false; },
    });
    instantiationService.stub(IFileDialogService, instantiationService.createInstance(TestFileDialogService));
    instantiationService.stub(ILanguageService, disposables.add(instantiationService.createInstance(LanguageService)));
    instantiationService.stub(ILanguageFeaturesService, new LanguageFeaturesService());
    instantiationService.stub(ILanguageFeatureDebounceService, instantiationService.createInstance(LanguageFeatureDebounceService));
    instantiationService.stub(IHistoryService, new TestHistoryService());
    instantiationService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(configService));
    instantiationService.stub(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
    const themeService = new TestThemeService();
    instantiationService.stub(IThemeService, themeService);
    instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
    instantiationService.stub(ITreeSitterLibraryService, new TestTreeSitterLibraryService());
    instantiationService.stub(IModelService, disposables.add(instantiationService.createInstance(ModelService)));
    const fileService = overrides?.fileService ? overrides.fileService(instantiationService) : disposables.add(new TestFileService());
    instantiationService.stub(IFileService, fileService);
    instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
    const markerService = new TestMarkerService();
    instantiationService.stub(IMarkerService, markerService);
    instantiationService.stub(IFilesConfigurationService, disposables.add(instantiationService.createInstance(TestFilesConfigurationService)));
    const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(instantiationService.createInstance(UserDataProfilesService)));
    instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
    instantiationService.stub(IWorkingCopyBackupService, overrides?.workingCopyBackupService ? overrides?.workingCopyBackupService(instantiationService) : disposables.add(new TestWorkingCopyBackupService()));
    instantiationService.stub(ITelemetryService, NullTelemetryService);
    instantiationService.stub(INotificationService, new TestNotificationService());
    instantiationService.stub(IUntitledTextEditorService, disposables.add(instantiationService.createInstance(UntitledTextEditorService)));
    instantiationService.stub(IMenuService, new TestMenuService());
    const keybindingService = new MockKeybindingService();
    instantiationService.stub(IKeybindingService, keybindingService);
    instantiationService.stub(IDecorationsService, new TestDecorationsService());
    instantiationService.stub(IExtensionService, new TestExtensionService());
    instantiationService.stub(IWorkingCopyFileService, disposables.add(instantiationService.createInstance(WorkingCopyFileService)));
    instantiationService.stub(ITextFileService, overrides?.textFileService ? overrides.textFileService(instantiationService) : disposables.add(instantiationService.createInstance(TestTextFileService)));
    instantiationService.stub(IHostService, instantiationService.createInstance(TestHostService));
    instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
    instantiationService.stub(ILoggerService, disposables.add(new TestLoggerService(TestEnvironmentService.logsHome)));
    const editorGroupService = new TestEditorGroupsService([new TestEditorGroupView(0)]);
    instantiationService.stub(IEditorGroupsService, editorGroupService);
    instantiationService.stub(ILabelService, disposables.add(instantiationService.createInstance(LabelService)));
    const editorService = overrides?.editorService ? overrides.editorService(instantiationService) : disposables.add(new TestEditorService(editorGroupService));
    instantiationService.stub(IEditorService, editorService);
    instantiationService.stub(IEditorPaneService, new EditorPaneService());
    instantiationService.stub(IWorkingCopyEditorService, disposables.add(instantiationService.createInstance(WorkingCopyEditorService)));
    instantiationService.stub(IEditorResolverService, disposables.add(instantiationService.createInstance(EditorResolverService)));
    const textEditorService = overrides?.textEditorService ? overrides.textEditorService(instantiationService) : disposables.add(instantiationService.createInstance(TextEditorService));
    instantiationService.stub(ITextEditorService, textEditorService);
    instantiationService.stub(ICodeEditorService, disposables.add(new CodeEditorService(editorService, themeService, configService)));
    instantiationService.stub(IPaneCompositePartService, disposables.add(new TestPaneCompositeService()));
    instantiationService.stub(IListService, new TestListService());
    instantiationService.stub(IContextViewService, disposables.add(instantiationService.createInstance(ContextViewService)));
    instantiationService.stub(IContextMenuService, disposables.add(instantiationService.createInstance(ContextMenuService)));
    instantiationService.stub(IQuickInputService, disposables.add(new QuickInputService(configService, instantiationService, keybindingService, contextKeyService, themeService, layoutService)));
    instantiationService.stub(IWorkspacesService, new TestWorkspacesService());
    instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
    instantiationService.stub(IWorkspaceTrustRequestService, disposables.add(new TestWorkspaceTrustRequestService(false)));
    instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
    instantiationService.stub(ITerminalEditorService, new TestTerminalEditorService());
    instantiationService.stub(ITerminalGroupService, new TestTerminalGroupService());
    instantiationService.stub(ITerminalProfileService, new TestTerminalProfileService());
    instantiationService.stub(ITerminalProfileResolverService, new TestTerminalProfileResolverService());
    instantiationService.stub(ITerminalConfigurationService, disposables.add(instantiationService.createInstance(TestTerminalConfigurationService)));
    instantiationService.stub(ITerminalLogService, disposables.add(instantiationService.createInstance(TerminalLogService)));
    instantiationService.stub(IEnvironmentVariableService, disposables.add(instantiationService.createInstance(EnvironmentVariableService)));
    instantiationService.stub(IElevatedFileService, new BrowserElevatedFileService());
    instantiationService.stub(IRemoteSocketFactoryService, new RemoteSocketFactoryService());
    instantiationService.stub(ICustomEditorLabelService, disposables.add(new CustomEditorLabelService(configService, workspaceContextService)));
    instantiationService.stub(IHoverService, NullHoverService);
    return instantiationService;
}
let TestServiceAccessor = class TestServiceAccessor {
    constructor(lifecycleService, textFileService, textEditorService, workingCopyFileService, filesConfigurationService, contextService, modelService, fileService, fileDialogService, dialogService, workingCopyService, editorService, editorPaneService, environmentService, pathService, editorGroupService, editorResolverService, languageService, textModelResolverService, untitledTextEditorService, testConfigurationService, workingCopyBackupService, hostService, quickInputService, labelService, logService, uriIdentityService, instantitionService, notificationService, workingCopyEditorService, instantiationService, elevatedFileService, workspaceTrustRequestService, decorationsService, progressService) {
        this.lifecycleService = lifecycleService;
        this.textFileService = textFileService;
        this.textEditorService = textEditorService;
        this.workingCopyFileService = workingCopyFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.contextService = contextService;
        this.modelService = modelService;
        this.fileService = fileService;
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.workingCopyService = workingCopyService;
        this.editorService = editorService;
        this.editorPaneService = editorPaneService;
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.editorGroupService = editorGroupService;
        this.editorResolverService = editorResolverService;
        this.languageService = languageService;
        this.textModelResolverService = textModelResolverService;
        this.untitledTextEditorService = untitledTextEditorService;
        this.testConfigurationService = testConfigurationService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.hostService = hostService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.logService = logService;
        this.uriIdentityService = uriIdentityService;
        this.instantitionService = instantitionService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.instantiationService = instantiationService;
        this.elevatedFileService = elevatedFileService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.decorationsService = decorationsService;
        this.progressService = progressService;
    }
};
TestServiceAccessor = __decorate([
    __param(0, ILifecycleService),
    __param(1, ITextFileService),
    __param(2, ITextEditorService),
    __param(3, IWorkingCopyFileService),
    __param(4, IFilesConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IModelService),
    __param(7, IFileService),
    __param(8, IFileDialogService),
    __param(9, IDialogService),
    __param(10, IWorkingCopyService),
    __param(11, IEditorService),
    __param(12, IEditorPaneService),
    __param(13, IWorkbenchEnvironmentService),
    __param(14, IPathService),
    __param(15, IEditorGroupsService),
    __param(16, IEditorResolverService),
    __param(17, ILanguageService),
    __param(18, ITextModelService),
    __param(19, IUntitledTextEditorService),
    __param(20, IConfigurationService),
    __param(21, IWorkingCopyBackupService),
    __param(22, IHostService),
    __param(23, IQuickInputService),
    __param(24, ILabelService),
    __param(25, ILogService),
    __param(26, IUriIdentityService),
    __param(27, IInstantiationService),
    __param(28, INotificationService),
    __param(29, IWorkingCopyEditorService),
    __param(30, IInstantiationService),
    __param(31, IElevatedFileService),
    __param(32, IWorkspaceTrustRequestService),
    __param(33, IDecorationsService),
    __param(34, IProgressService)
], TestServiceAccessor);
export { TestServiceAccessor };
let TestTextFileService = class TestTextFileService extends BrowserTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService);
        this.readStreamError = undefined;
        this.writeError = undefined;
    }
    setReadStreamErrorOnce(error) {
        this.readStreamError = error;
    }
    async readStream(resource, options) {
        if (this.readStreamError) {
            const error = this.readStreamError;
            this.readStreamError = undefined;
            throw error;
        }
        const content = await this.fileService.readFileStream(resource, options);
        return {
            resource: content.resource,
            name: content.name,
            mtime: content.mtime,
            ctime: content.ctime,
            etag: content.etag,
            encoding: 'utf8',
            value: await createTextBufferFactoryFromStream(content.value),
            size: 10,
            readonly: false,
            locked: false
        };
    }
    setWriteErrorOnce(error) {
        this.writeError = error;
    }
    async write(resource, value, options) {
        if (this.writeError) {
            const error = this.writeError;
            this.writeError = undefined;
            throw error;
        }
        return super.write(resource, value, options);
    }
};
TestTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, ILogService),
    __param(16, IElevatedFileService),
    __param(17, IDecorationsService)
], TestTextFileService);
export { TestTextFileService };
export class TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {
    get encoding() {
        if (!this._testEncoding) {
            this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
        }
        return this._testEncoding;
    }
}
export class TestEncodingOracle extends EncodingOracle {
    get encodingOverrides() {
        return [
            { extension: 'utf16le', encoding: UTF16le },
            { extension: 'utf16be', encoding: UTF16be },
            { extension: 'utf8bom', encoding: UTF8_with_bom }
        ];
    }
    set encodingOverrides(overrides) { }
}
class TestEnvironmentServiceWithArgs extends BrowserWorkbenchEnvironmentService {
    constructor() {
        super(...arguments);
        this.args = [];
    }
}
export const TestEnvironmentService = new TestEnvironmentServiceWithArgs('', URI.file('tests').with({ scheme: 'vscode-tests' }), Object.create(null), TestProductService);
export class TestProgressService {
    withProgress(options, task, onDidCancel) {
        return task(Progress.None);
    }
}
export class TestDecorationsService {
    constructor() {
        this.onDidChangeDecorations = Event.None;
    }
    registerDecorationsProvider(_provider) { return Disposable.None; }
    getDecoration(_uri, _includeChildren, _overwrite) { return undefined; }
}
export class TestMenuService {
    createMenu(_id, _scopedKeybindingService) {
        return {
            onDidChange: Event.None,
            dispose: () => undefined,
            getActions: () => []
        };
    }
    getMenuActions(id, contextKeyService, options) {
        throw new Error('Method not implemented.');
    }
    getMenuContexts(id) {
        throw new Error('Method not implemented.');
    }
    resetHiddenStates() {
        // nothing
    }
}
let TestFileDialogService = class TestFileDialogService {
    constructor(pathService) {
        this.pathService = pathService;
    }
    async defaultFilePath(_schemeFilter) { return this.pathService.userHome(); }
    async defaultFolderPath(_schemeFilter) { return this.pathService.userHome(); }
    async defaultWorkspacePath(_schemeFilter) { return this.pathService.userHome(); }
    async preferredHome(_schemeFilter) { return this.pathService.userHome(); }
    pickFileFolderAndOpen(_options) { return Promise.resolve(0); }
    pickFileAndOpen(_options) { return Promise.resolve(0); }
    pickFolderAndOpen(_options) { return Promise.resolve(0); }
    pickWorkspaceAndOpen(_options) { return Promise.resolve(0); }
    setPickFileToSave(path) { this.fileToSave = path; }
    pickFileToSave(defaultUri, availableFileSystems) { return Promise.resolve(this.fileToSave); }
    showSaveDialog(_options) { return Promise.resolve(undefined); }
    showOpenDialog(_options) { return Promise.resolve(undefined); }
    setConfirmResult(result) { this.confirmResult = result; }
    showSaveConfirm(fileNamesOrResources) { return Promise.resolve(this.confirmResult); }
};
TestFileDialogService = __decorate([
    __param(0, IPathService)
], TestFileDialogService);
export { TestFileDialogService };
export class TestLayoutService {
    constructor() {
        this.openedDefaultEditors = false;
        this.mainContainerDimension = { width: 800, height: 600 };
        this.activeContainerDimension = { width: 800, height: 600 };
        this.mainContainerOffset = { top: 0, quickPickTop: 0 };
        this.activeContainerOffset = { top: 0, quickPickTop: 0 };
        this.mainContainer = mainWindow.document.body;
        this.containers = [mainWindow.document.body];
        this.activeContainer = mainWindow.document.body;
        this.onDidChangeZenMode = Event.None;
        this.onDidChangeMainEditorCenteredLayout = Event.None;
        this.onDidChangeWindowMaximized = Event.None;
        this.onDidChangePanelPosition = Event.None;
        this.onDidChangePanelAlignment = Event.None;
        this.onDidChangePartVisibility = Event.None;
        this.onDidLayoutMainContainer = Event.None;
        this.onDidLayoutActiveContainer = Event.None;
        this.onDidLayoutContainer = Event.None;
        this.onDidChangeNotificationsVisibility = Event.None;
        this.onDidAddContainer = Event.None;
        this.onDidChangeActiveContainer = Event.None;
        this.onDidChangeAuxiliaryBarMaximized = Event.None;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
    }
    layout() { }
    isRestored() { return true; }
    hasFocus(_part) { return false; }
    focusPart(_part) { }
    hasMainWindowBorder() { return false; }
    getMainWindowBorderRadius() { return undefined; }
    isVisible(_part) { return true; }
    getContainer() { return mainWindow.document.body; }
    whenContainerStylesLoaded() { return undefined; }
    isTitleBarHidden() { return false; }
    isStatusBarHidden() { return false; }
    isActivityBarHidden() { return false; }
    setActivityBarHidden(_hidden) { }
    setBannerHidden(_hidden) { }
    isSideBarHidden() { return false; }
    async setEditorHidden(_hidden) { }
    async setSideBarHidden(_hidden) { }
    async setAuxiliaryBarHidden(_hidden) { }
    async setPartHidden(_hidden, part) { }
    isPanelHidden() { return false; }
    async setPanelHidden(_hidden) { }
    toggleMaximizedPanel() { }
    isPanelMaximized() { return false; }
    toggleMaximizedAuxiliaryBar() { }
    setAuxiliaryBarMaximized(maximized) { return false; }
    isAuxiliaryBarMaximized() { return false; }
    getMenubarVisibility() { throw new Error('not implemented'); }
    toggleMenuBar() { }
    getSideBarPosition() { return 0; }
    getPanelPosition() { return 0; }
    getPanelAlignment() { return 'center'; }
    async setPanelPosition(_position) { }
    async setPanelAlignment(_alignment) { }
    addClass(_clazz) { }
    removeClass(_clazz) { }
    getMaximumEditorDimensions() { throw new Error('not implemented'); }
    toggleZenMode() { }
    isMainEditorLayoutCentered() { return false; }
    centerMainEditorLayout(_active) { }
    resizePart(_part, _sizeChangeWidth, _sizeChangeHeight) { }
    getSize(part) { throw new Error('Method not implemented.'); }
    setSize(part, size) { throw new Error('Method not implemented.'); }
    registerPart(part) { return Disposable.None; }
    isWindowMaximized(targetWindow) { return false; }
    updateWindowMaximizedState(targetWindow, maximized) { }
    getVisibleNeighborPart(part, direction) { return undefined; }
    focus() { }
}
const activeViewlet = {};
export class TestPaneCompositeService extends Disposable {
    constructor() {
        super();
        this.parts = new Map();
        this.parts.set(1 /* ViewContainerLocation.Panel */, new TestPanelPart());
        this.parts.set(0 /* ViewContainerLocation.Sidebar */, new TestSideBarPart());
        this.onDidPaneCompositeOpen = Event.any(...([1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map(loc => Event.map(this.parts.get(loc).onDidPaneCompositeOpen, composite => { return { composite, viewContainerLocation: loc }; }))));
        this.onDidPaneCompositeClose = Event.any(...([1 /* ViewContainerLocation.Panel */, 0 /* ViewContainerLocation.Sidebar */].map(loc => Event.map(this.parts.get(loc).onDidPaneCompositeClose, composite => { return { composite, viewContainerLocation: loc }; }))));
    }
    openPaneComposite(id, viewContainerLocation, focus) {
        return this.getPartByLocation(viewContainerLocation).openPaneComposite(id, focus);
    }
    getActivePaneComposite(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getActivePaneComposite();
    }
    getPaneComposite(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposite(id);
    }
    getPaneComposites(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getPaneComposites();
    }
    getProgressIndicator(id, viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getProgressIndicator(id);
    }
    hideActivePaneComposite(viewContainerLocation) {
        this.getPartByLocation(viewContainerLocation).hideActivePaneComposite();
    }
    getLastActivePaneCompositeId(viewContainerLocation) {
        return this.getPartByLocation(viewContainerLocation).getLastActivePaneCompositeId();
    }
    getPinnedPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getVisiblePaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPaneCompositeIds(viewContainerLocation) {
        throw new Error('Method not implemented.');
    }
    getPartByLocation(viewContainerLocation) {
        return assertReturnsDefined(this.parts.get(viewContainerLocation));
    }
}
export class TestSideBarPart {
    constructor() {
        this.onDidViewletRegisterEmitter = new Emitter();
        this.onDidViewletDeregisterEmitter = new Emitter();
        this.onDidViewletOpenEmitter = new Emitter();
        this.onDidViewletCloseEmitter = new Emitter();
        this.partId = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = this.onDidViewletOpenEmitter.event;
        this.onDidPaneCompositeClose = this.onDidViewletCloseEmitter.event;
    }
    openPaneComposite(id, focus) { return Promise.resolve(undefined); }
    getPaneComposites() { return []; }
    getAllViewlets() { return []; }
    getActivePaneComposite() { return activeViewlet; }
    getDefaultViewletId() { return 'workbench.view.explorer'; }
    getPaneComposite(id) { return undefined; }
    getProgressIndicator(id) { return undefined; }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() { return undefined; }
    dispose() { }
    getPinnedPaneCompositeIds() { return []; }
    getVisiblePaneCompositeIds() { return []; }
    getPaneCompositeIds() { return []; }
    layout(width, height, top, left) { }
}
export class TestPanelPart {
    constructor() {
        this.element = undefined;
        this.minimumWidth = 0;
        this.maximumWidth = 0;
        this.minimumHeight = 0;
        this.maximumHeight = 0;
        this.onDidChange = Event.None;
        this.onDidPaneCompositeOpen = new Emitter().event;
        this.onDidPaneCompositeClose = new Emitter().event;
        this.partId = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
    }
    async openPaneComposite(id, focus) { return undefined; }
    getPaneComposite(id) { return activeViewlet; }
    getPaneComposites() { return []; }
    getPinnedPaneCompositeIds() { return []; }
    getVisiblePaneCompositeIds() { return []; }
    getPaneCompositeIds() { return []; }
    getActivePaneComposite() { return activeViewlet; }
    setPanelEnablement(id, enabled) { }
    dispose() { }
    getProgressIndicator(id) { return null; }
    hideActivePaneComposite() { }
    getLastActivePaneCompositeId() { return undefined; }
    layout(width, height, top, left) { }
}
export class TestViewsService {
    constructor() {
        this.onDidChangeViewContainerVisibility = new Emitter().event;
        this.onDidChangeViewVisibilityEmitter = new Emitter();
        this.onDidChangeViewVisibility = this.onDidChangeViewVisibilityEmitter.event;
        this.onDidChangeFocusedViewEmitter = new Emitter();
        this.onDidChangeFocusedView = this.onDidChangeFocusedViewEmitter.event;
    }
    isViewContainerVisible(id) { return true; }
    isViewContainerActive(id) { return true; }
    getVisibleViewContainer() { return null; }
    openViewContainer(id, focus) { return Promise.resolve(null); }
    closeViewContainer(id) { }
    isViewVisible(id) { return true; }
    getActiveViewWithId(id) { return null; }
    getViewWithId(id) { return null; }
    openView(id, focus) { return Promise.resolve(null); }
    closeView(id) { }
    getViewProgressIndicator(id) { return null; }
    getActiveViewPaneContainerWithId(id) { return null; }
    getFocusedViewName() { return ''; }
    getFocusedView() { return null; }
}
export class TestEditorGroupsService {
    constructor(groups = []) {
        this.groups = groups;
        this.parts = [this];
        this.windowId = mainWindow.vscodeWindowId;
        this.onDidCreateAuxiliaryEditorPart = Event.None;
        this.onDidChangeActiveGroup = Event.None;
        this.onDidActivateGroup = Event.None;
        this.onDidAddGroup = Event.None;
        this.onDidRemoveGroup = Event.None;
        this.onDidMoveGroup = Event.None;
        this.onDidChangeGroupIndex = Event.None;
        this.onDidChangeGroupLabel = Event.None;
        this.onDidChangeGroupLocked = Event.None;
        this.onDidChangeGroupMaximized = Event.None;
        this.onDidLayout = Event.None;
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidScroll = Event.None;
        this.onWillDispose = Event.None;
        this.orientation = 0 /* GroupOrientation.HORIZONTAL */;
        this.isReady = true;
        this.whenReady = Promise.resolve(undefined);
        this.whenRestored = Promise.resolve(undefined);
        this.hasRestorableState = false;
        this.contentDimension = { width: 800, height: 600 };
        this.mainPart = this;
    }
    get activeGroup() { return this.groups[0]; }
    get sideGroup() { return this.groups[0]; }
    get count() { return this.groups.length; }
    getPart(group) { return this; }
    saveWorkingSet(name) { throw new Error('Method not implemented.'); }
    getWorkingSets() { throw new Error('Method not implemented.'); }
    applyWorkingSet(workingSet, options) { throw new Error('Method not implemented.'); }
    deleteWorkingSet(workingSet) { throw new Error('Method not implemented.'); }
    getGroups(_order) { return this.groups; }
    getGroup(identifier) { return this.groups.find(group => group.id === identifier); }
    getLabel(_identifier) { return 'Group 1'; }
    findGroup(_scope, _source, _wrap) { throw new Error('not implemented'); }
    activateGroup(_group) { throw new Error('not implemented'); }
    restoreGroup(_group) { throw new Error('not implemented'); }
    getSize(_group) { return { width: 100, height: 100 }; }
    setSize(_group, _size) { }
    arrangeGroups(_arrangement) { }
    toggleMaximizeGroup() { }
    hasMaximizedGroup() { throw new Error('not implemented'); }
    toggleExpandGroup() { }
    applyLayout(_layout) { }
    getLayout() { throw new Error('not implemented'); }
    setGroupOrientation(_orientation) { }
    addGroup(_location, _direction) { throw new Error('not implemented'); }
    removeGroup(_group) { }
    moveGroup(_group, _location, _direction) { throw new Error('not implemented'); }
    mergeGroup(_group, _target, _options) { throw new Error('not implemented'); }
    mergeAllGroups(_group, _options) { throw new Error('not implemented'); }
    copyGroup(_group, _location, _direction) { throw new Error('not implemented'); }
    centerLayout(active) { }
    isLayoutCentered() { return false; }
    createEditorDropTarget(container, delegate) { return Disposable.None; }
    registerContextKeyProvider(_provider) { throw new Error('not implemented'); }
    getScopedInstantiationService(part) { throw new Error('Method not implemented.'); }
    enforcePartOptions(options) { return Disposable.None; }
    registerEditorPart(part) { return Disposable.None; }
    createAuxiliaryEditorPart() { throw new Error('Method not implemented.'); }
}
export class TestEditorGroupView {
    constructor(id) {
        this.id = id;
        this.windowId = mainWindow.vscodeWindowId;
        this.groupsView = undefined;
        this.selectedEditors = [];
        this.editors = [];
        this.whenRestored = Promise.resolve(undefined);
        this.isEmpty = true;
        this.onWillDispose = Event.None;
        this.onDidModelChange = Event.None;
        this.onWillCloseEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidFocus = Event.None;
        this.onDidChange = Event.None;
        this.onWillMoveEditor = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidActiveEditorChange = Event.None;
    }
    getEditors(_order) { return []; }
    findEditors(_resource) { return []; }
    getEditorByIndex(_index) { throw new Error('not implemented'); }
    getIndexOfEditor(_editor) { return -1; }
    isFirst(editor) { return false; }
    isLast(editor) { return false; }
    openEditor(_editor, _options) { throw new Error('not implemented'); }
    openEditors(_editors) { throw new Error('not implemented'); }
    isPinned(_editor) { return false; }
    isSticky(_editor) { return false; }
    isTransient(_editor) { return false; }
    isActive(_editor) { return false; }
    setSelection(_activeSelectedEditor, _inactiveSelectedEditors) { throw new Error('not implemented'); }
    isSelected(_editor) { return false; }
    contains(candidate) { return false; }
    moveEditor(_editor, _target, _options) { return true; }
    moveEditors(_editors, _target) { return true; }
    copyEditor(_editor, _target, _options) { }
    copyEditors(_editors, _target) { }
    async closeEditor(_editor, options) { return true; }
    async closeEditors(_editors, options) { return true; }
    closeAllEditors(options) { return true; }
    async replaceEditors(_editors) { }
    pinEditor(_editor) { }
    stickEditor(editor) { }
    unstickEditor(editor) { }
    lock(locked) { }
    focus() { }
    get scopedContextKeyService() { throw new Error('not implemented'); }
    setActive(_isActive) { }
    notifyIndexChanged(_index) { }
    notifyLabelChanged(_label) { }
    dispose() { }
    toJSON() { return Object.create(null); }
    layout(_width, _height) { }
    relayout() { }
    createEditorActions(_menuDisposable) { throw new Error('not implemented'); }
}
export class TestEditorGroupAccessor {
    constructor() {
        this.label = '';
        this.windowId = mainWindow.vscodeWindowId;
        this.groups = [];
        this.partOptions = { ...DEFAULT_EDITOR_PART_OPTIONS };
        this.onDidChangeEditorPartOptions = Event.None;
        this.onDidVisibilityChange = Event.None;
    }
    getGroup(identifier) { throw new Error('Method not implemented.'); }
    getGroups(order) { throw new Error('Method not implemented.'); }
    activateGroup(identifier) { throw new Error('Method not implemented.'); }
    restoreGroup(identifier) { throw new Error('Method not implemented.'); }
    addGroup(location, direction) { throw new Error('Method not implemented.'); }
    mergeGroup(group, target, options) { throw new Error('Method not implemented.'); }
    moveGroup(group, location, direction) { throw new Error('Method not implemented.'); }
    copyGroup(group, location, direction) { throw new Error('Method not implemented.'); }
    removeGroup(group) { throw new Error('Method not implemented.'); }
    arrangeGroups(arrangement, target) { throw new Error('Method not implemented.'); }
    toggleMaximizeGroup(group) { throw new Error('Method not implemented.'); }
    toggleExpandGroup(group) { throw new Error('Method not implemented.'); }
}
export class TestEditorService extends Disposable {
    get activeTextEditorControl() { return this._activeTextEditorControl; }
    set activeTextEditorControl(value) { this._activeTextEditorControl = value; }
    get activeEditor() { return this._activeEditor; }
    set activeEditor(value) { this._activeEditor = value; }
    getVisibleTextEditorControls(order) { return this.visibleTextEditorControls; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        this.onDidActiveEditorChange = Event.None;
        this.onDidVisibleEditorsChange = Event.None;
        this.onDidEditorsChange = Event.None;
        this.onWillOpenEditor = Event.None;
        this.onDidCloseEditor = Event.None;
        this.onDidOpenEditorFail = Event.None;
        this.onDidMostRecentlyActiveEditorsChange = Event.None;
        this.editors = [];
        this.mostRecentlyActiveEditors = [];
        this.visibleEditorPanes = [];
        this.visibleTextEditorControls = [];
        this.visibleEditors = [];
        this.count = this.editors.length;
    }
    createScoped(editorGroupsContainer) { return this; }
    getEditors() { return []; }
    findEditors() { return []; }
    async openEditor(editor, optionsOrGroup, group) {
        // openEditor takes ownership of the input, register it to the TestEditorService
        // so it's not marked as leaked during tests.
        if ('dispose' in editor) {
            this._register(editor);
        }
        return undefined;
    }
    async closeEditor(editor, options) { }
    async closeEditors(editors, options) { }
    doResolveEditorOpenRequest(editor) {
        if (!this.editorGroupService) {
            return undefined;
        }
        return [this.editorGroupService.activeGroup, editor, undefined];
    }
    openEditors(_editors, _group) { throw new Error('not implemented'); }
    isOpened(_editor) { return false; }
    isVisible(_editor) { return false; }
    replaceEditors(_editors, _group) { return Promise.resolve(undefined); }
    save(editors, options) { throw new Error('Method not implemented.'); }
    saveAll(options) { throw new Error('Method not implemented.'); }
    revert(editors, options) { throw new Error('Method not implemented.'); }
    revertAll(options) { throw new Error('Method not implemented.'); }
}
export class TestFileService {
    constructor() {
        this._onDidFilesChange = new Emitter();
        this._onDidRunOperation = new Emitter();
        this._onDidChangeFileSystemProviderCapabilities = new Emitter();
        this._onWillActivateFileSystemProvider = new Emitter();
        this.onWillActivateFileSystemProvider = this._onWillActivateFileSystemProvider.event;
        this.onDidWatchError = Event.None;
        this.content = 'Hello Html';
        this.readonly = false;
        this.notExistsSet = new ResourceMap();
        this.readShouldThrowError = undefined;
        this.writeShouldThrowError = undefined;
        this.onDidChangeFileSystemProviderRegistrations = Event.None;
        this.providers = new Map();
        this.watches = [];
    }
    get onDidFilesChange() { return this._onDidFilesChange.event; }
    fireFileChanges(event) { this._onDidFilesChange.fire(event); }
    get onDidRunOperation() { return this._onDidRunOperation.event; }
    fireAfterOperation(event) { this._onDidRunOperation.fire(event); }
    get onDidChangeFileSystemProviderCapabilities() { return this._onDidChangeFileSystemProviderCapabilities.event; }
    fireFileSystemProviderCapabilitiesChangeEvent(event) { this._onDidChangeFileSystemProviderCapabilities.fire(event); }
    setContent(content) { this.content = content; }
    getContent() { return this.content; }
    getLastReadFileUri() { return this.lastReadFileUri; }
    async resolve(resource, _options) {
        return createFileStat(resource, this.readonly);
    }
    stat(resource) {
        return this.resolve(resource, { resolveMetadata: true });
    }
    async realpath(resource) {
        return resource;
    }
    async resolveAll(toResolve) {
        const stats = await Promise.all(toResolve.map(resourceAndOption => this.resolve(resourceAndOption.resource, resourceAndOption.options)));
        return stats.map(stat => ({ stat, success: true }));
    }
    async exists(_resource) { return !this.notExistsSet.has(_resource); }
    async readFile(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: VSBuffer.fromString(this.content)
        };
    }
    async readFileStream(resource, options) {
        if (this.readShouldThrowError) {
            throw this.readShouldThrowError;
        }
        this.lastReadFileUri = resource;
        return {
            ...createFileStat(resource, this.readonly),
            value: bufferToStream(VSBuffer.fromString(this.content))
        };
    }
    async writeFile(resource, bufferOrReadable, options) {
        await timeout(0);
        if (this.writeShouldThrowError) {
            throw this.writeShouldThrowError;
        }
        return createFileStat(resource, this.readonly);
    }
    move(_source, _target, _overwrite) { return Promise.resolve(null); }
    copy(_source, _target, _overwrite) { return Promise.resolve(null); }
    async cloneFile(_source, _target) { }
    createFile(_resource, _content, _options) { return Promise.resolve(null); }
    createFolder(_resource) { return Promise.resolve(null); }
    registerProvider(scheme, provider) {
        this.providers.set(scheme, provider);
        return toDisposable(() => this.providers.delete(scheme));
    }
    getProvider(scheme) {
        return this.providers.get(scheme);
    }
    async activateProvider(_scheme) {
        this._onWillActivateFileSystemProvider.fire({ scheme: _scheme, join: () => { } });
    }
    async canHandleResource(resource) { return this.hasProvider(resource); }
    hasProvider(resource) { return resource.scheme === Schemas.file || this.providers.has(resource.scheme); }
    listCapabilities() {
        return [
            { scheme: Schemas.file, capabilities: 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ },
            ...Iterable.map(this.providers, ([scheme, p]) => { return { scheme, capabilities: p.capabilities }; })
        ];
    }
    hasCapability(resource, capability) {
        if (capability === 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ && isLinux) {
            return true;
        }
        const provider = this.getProvider(resource.scheme);
        return !!(provider && (provider.capabilities & capability));
    }
    async del(_resource, _options) { }
    createWatcher(resource, options) {
        return {
            onDidChange: Event.None,
            dispose: () => { }
        };
    }
    watch(_resource) {
        this.watches.push(_resource);
        return toDisposable(() => this.watches.splice(this.watches.indexOf(_resource), 1));
    }
    getWriteEncoding(_resource) { return { encoding: 'utf8', hasBOM: false }; }
    dispose() { }
    async canCreateFile(source, options) { return true; }
    async canMove(source, target, overwrite) { return true; }
    async canCopy(source, target, overwrite) { return true; }
    async canDelete(resource, options) { return true; }
}
export class TestWorkingCopyBackupService extends InMemoryWorkingCopyBackupService {
    constructor() {
        super();
        this.resolved = new Set();
    }
    parseBackupContent(textBufferFactory) {
        const textBuffer = textBufferFactory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
        const lineCount = textBuffer.getLineCount();
        const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
        return textBuffer.getValueInRange(range, 0 /* EndOfLinePreference.TextDefined */);
    }
    async resolve(identifier) {
        this.resolved.add(identifier);
        return super.resolve(identifier);
    }
}
export function toUntypedWorkingCopyId(resource) {
    return toTypedWorkingCopyId(resource, '');
}
export function toTypedWorkingCopyId(resource, typeId = 'testBackupTypeId') {
    return { typeId, resource };
}
export class InMemoryTestWorkingCopyBackupService extends BrowserWorkingCopyBackupService {
    constructor() {
        const disposables = new DisposableStore();
        const environmentService = TestEnvironmentService;
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        disposables.add(fileService.registerProvider(Schemas.file, disposables.add(new InMemoryFileSystemProvider())));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new InMemoryFileSystemProvider())));
        super(new TestContextService(TestWorkspace), environmentService, fileService, logService);
        this.backupResourceJoiners = [];
        this.discardBackupJoiners = [];
        this.discardedBackups = [];
        this._register(disposables);
    }
    testGetFileService() {
        return this.fileService;
    }
    joinBackupResource() {
        return new Promise(resolve => this.backupResourceJoiners.push(resolve));
    }
    joinDiscardBackup() {
        return new Promise(resolve => this.discardBackupJoiners.push(resolve));
    }
    async backup(identifier, content, versionId, meta, token) {
        await super.backup(identifier, content, versionId, meta, token);
        while (this.backupResourceJoiners.length) {
            this.backupResourceJoiners.pop()();
        }
    }
    async discardBackup(identifier) {
        await super.discardBackup(identifier);
        this.discardedBackups.push(identifier);
        while (this.discardBackupJoiners.length) {
            this.discardBackupJoiners.pop()();
        }
    }
    async getBackupContents(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const fileContents = await this.fileService.readFile(backupResource);
        return fileContents.value.toString();
    }
}
export class TestLifecycleService extends Disposable {
    constructor() {
        super(...arguments);
        this.usePhases = false;
        this.whenStarted = new DeferredPromise();
        this.whenReady = new DeferredPromise();
        this.whenRestored = new DeferredPromise();
        this.whenEventually = new DeferredPromise();
        this.willShutdown = false;
        this._onBeforeShutdown = this._register(new Emitter());
        this._onBeforeShutdownError = this._register(new Emitter());
        this._onShutdownVeto = this._register(new Emitter());
        this._onWillShutdown = this._register(new Emitter());
        this._onDidShutdown = this._register(new Emitter());
        this.shutdownJoiners = [];
    }
    get phase() { return this._phase; }
    set phase(value) {
        this._phase = value;
        if (value === 1 /* LifecyclePhase.Starting */) {
            this.whenStarted.complete();
        }
        else if (value === 2 /* LifecyclePhase.Ready */) {
            this.whenReady.complete();
        }
        else if (value === 3 /* LifecyclePhase.Restored */) {
            this.whenRestored.complete();
        }
        else if (value === 4 /* LifecyclePhase.Eventually */) {
            this.whenEventually.complete();
        }
    }
    async when(phase) {
        if (!this.usePhases) {
            return;
        }
        if (phase === 1 /* LifecyclePhase.Starting */) {
            await this.whenStarted.p;
        }
        else if (phase === 2 /* LifecyclePhase.Ready */) {
            await this.whenReady.p;
        }
        else if (phase === 3 /* LifecyclePhase.Restored */) {
            await this.whenRestored.p;
        }
        else if (phase === 4 /* LifecyclePhase.Eventually */) {
            await this.whenEventually.p;
        }
    }
    get onBeforeShutdown() { return this._onBeforeShutdown.event; }
    get onBeforeShutdownError() { return this._onBeforeShutdownError.event; }
    get onShutdownVeto() { return this._onShutdownVeto.event; }
    get onWillShutdown() { return this._onWillShutdown.event; }
    get onDidShutdown() { return this._onDidShutdown.event; }
    fireShutdown(reason = 2 /* ShutdownReason.QUIT */) {
        this.shutdownJoiners = [];
        this._onWillShutdown.fire({
            join: p => {
                this.shutdownJoiners.push(typeof p === 'function' ? p() : p);
            },
            joiners: () => [],
            force: () => { },
            token: CancellationToken.None,
            reason
        });
    }
    fireBeforeShutdown(event) { this._onBeforeShutdown.fire(event); }
    fireWillShutdown(event) { this._onWillShutdown.fire(event); }
    async shutdown() {
        this.fireShutdown();
    }
}
export class TestBeforeShutdownEvent {
    constructor() {
        this.reason = 1 /* ShutdownReason.CLOSE */;
    }
    veto(value) {
        this.value = value;
    }
    finalVeto(vetoFn) {
        this.value = vetoFn();
        this.finalValue = vetoFn;
    }
}
export class TestWillShutdownEvent {
    constructor() {
        this.value = [];
        this.joiners = () => [];
        this.reason = 1 /* ShutdownReason.CLOSE */;
        this.token = CancellationToken.None;
    }
    join(promise, joiner) {
        this.value.push(typeof promise === 'function' ? promise() : promise);
    }
    force() { }
}
export class TestTextResourceConfigurationService {
    constructor(configurationService = new TestConfigurationService()) {
        this.configurationService = configurationService;
    }
    onDidChangeConfiguration() {
        return { dispose() { } };
    }
    getValue(resource, arg2, arg3) {
        const position = EditorPosition.isIPosition(arg2) ? arg2 : null;
        const section = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
        return this.configurationService.getValue(section, { resource });
    }
    inspect(resource, position, section) {
        return this.configurationService.inspect(section, { resource });
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value);
    }
}
export class RemoteFileSystemProvider {
    constructor(wrappedFsp, remoteAuthority) {
        this.wrappedFsp = wrappedFsp;
        this.remoteAuthority = remoteAuthority;
        this.capabilities = this.wrappedFsp.capabilities;
        this.onDidChangeCapabilities = this.wrappedFsp.onDidChangeCapabilities;
        this.onDidChangeFile = Event.map(this.wrappedFsp.onDidChangeFile, changes => changes.map(c => {
            return {
                type: c.type,
                resource: c.resource.with({ scheme: Schemas.vscodeRemote, authority: this.remoteAuthority }),
            };
        }));
    }
    watch(resource, opts) { return this.wrappedFsp.watch(this.toFileResource(resource), opts); }
    stat(resource) { return this.wrappedFsp.stat(this.toFileResource(resource)); }
    mkdir(resource) { return this.wrappedFsp.mkdir(this.toFileResource(resource)); }
    readdir(resource) { return this.wrappedFsp.readdir(this.toFileResource(resource)); }
    delete(resource, opts) { return this.wrappedFsp.delete(this.toFileResource(resource), opts); }
    rename(from, to, opts) { return this.wrappedFsp.rename(this.toFileResource(from), this.toFileResource(to), opts); }
    copy(from, to, opts) { return this.wrappedFsp.copy(this.toFileResource(from), this.toFileResource(to), opts); }
    readFile(resource) { return this.wrappedFsp.readFile(this.toFileResource(resource)); }
    writeFile(resource, content, opts) { return this.wrappedFsp.writeFile(this.toFileResource(resource), content, opts); }
    open(resource, opts) { return this.wrappedFsp.open(this.toFileResource(resource), opts); }
    close(fd) { return this.wrappedFsp.close(fd); }
    read(fd, pos, data, offset, length) { return this.wrappedFsp.read(fd, pos, data, offset, length); }
    write(fd, pos, data, offset, length) { return this.wrappedFsp.write(fd, pos, data, offset, length); }
    readFileStream(resource, opts, token) { return this.wrappedFsp.readFileStream(this.toFileResource(resource), opts, token); }
    toFileResource(resource) { return resource.with({ scheme: Schemas.file, authority: '' }); }
}
export class TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider {
    get capabilities() {
        return 2 /* FileSystemProviderCapabilities.FileReadWrite */
            | 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */
            | 16 /* FileSystemProviderCapabilities.FileReadStream */;
    }
    readFileStream(resource) {
        const BUFFER_SIZE = 64 * 1024;
        const stream = newWriteableStream(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).buffer);
        (async () => {
            try {
                const data = await this.readFile(resource);
                let offset = 0;
                while (offset < data.length) {
                    await timeout(0);
                    await stream.write(data.subarray(offset, offset + BUFFER_SIZE));
                    offset += BUFFER_SIZE;
                }
                await timeout(0);
                stream.end();
            }
            catch (error) {
                stream.end(error);
            }
        })();
        return stream;
    }
}
export const productService = { _serviceBrand: undefined, ...product };
export class TestHostService {
    constructor() {
        this._hasFocus = true;
        this._onDidChangeFocus = new Emitter();
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeWindow = new Emitter();
        this.onDidChangeActiveWindow = this._onDidChangeWindow.event;
        this.onDidChangeFullScreen = Event.None;
        this.colorScheme = ColorScheme.DARK;
        this.onDidChangeColorScheme = Event.None;
    }
    get hasFocus() { return this._hasFocus; }
    async hadLastFocus() { return this._hasFocus; }
    setFocus(focus) {
        this._hasFocus = focus;
        this._onDidChangeFocus.fire(this._hasFocus);
    }
    async restart() { }
    async reload() { }
    async close() { }
    async withExpectedShutdown(expectedShutdownTask) {
        return await expectedShutdownTask();
    }
    async focus() { }
    async moveTop() { }
    async getCursorScreenPoint() { return undefined; }
    async openWindow(arg1, arg2) { }
    async toggleFullScreen() { }
    async getScreenshot(rect) { return undefined; }
    async getNativeWindowHandle(_windowId) { return undefined; }
}
export class TestFilesConfigurationService extends FilesConfigurationService {
    testOnFilesConfigurationChange(configuration) {
        super.onFilesConfigurationChange(configuration, true);
    }
}
export class TestReadonlyTextFileEditorModel extends TextFileEditorModel {
    isReadonly() {
        return true;
    }
}
export class TestEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
    }
    get typeId() {
        return this._typeId;
    }
    get editorId() {
        return this._typeId;
    }
    resolve() {
        return Promise.resolve(null);
    }
}
export function registerTestEditor(id, inputs, serializerInputId) {
    const disposables = new DisposableStore();
    class TestEditor extends EditorPane {
        constructor(group) {
            super(id, group, NullTelemetryService, new TestThemeService(), disposables.add(new TestStorageService()));
            this._scopedContextKeyService = new MockContextKeyService();
        }
        async setInput(input, options, context, token) {
            super.setInput(input, options, context, token);
            await input.resolve();
        }
        getId() { return id; }
        layout() { }
        createEditor() { }
        get scopedContextKeyService() {
            return this._scopedContextKeyService;
        }
    }
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestEditor, id, 'Test Editor Control'), inputs));
    if (serializerInputId) {
        class EditorsObserverTestEditorInputSerializer {
            canSerialize(editorInput) {
                return true;
            }
            serialize(editorInput) {
                const testEditorInput = editorInput;
                const testInput = {
                    resource: testEditorInput.resource.toString()
                };
                return JSON.stringify(testInput);
            }
            deserialize(instantiationService, serializedEditorInput) {
                const testInput = JSON.parse(serializedEditorInput);
                return new TestFileEditorInput(URI.parse(testInput.resource), serializerInputId);
            }
        }
        disposables.add(Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(serializerInputId, EditorsObserverTestEditorInputSerializer));
    }
    return disposables;
}
export function registerTestFileEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextFileEditor, TestTextFileEditor.ID, 'Text File Editor'), [new SyncDescriptor(FileEditorInput)]));
    return disposables;
}
export function registerTestResourceEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TestTextResourceEditor, TestTextResourceEditor.ID, 'Text Editor'), [
        new SyncDescriptor(UntitledTextEditorInput),
        new SyncDescriptor(TextResourceEditorInput)
    ]));
    return disposables;
}
export function registerTestSideBySideEditor() {
    const disposables = new DisposableStore();
    disposables.add(Registry.as(Extensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SideBySideEditor, SideBySideEditor.ID, 'Text Editor'), [
        new SyncDescriptor(SideBySideEditorInput)
    ]));
    return disposables;
}
export class TestFileEditorInput extends EditorInput {
    constructor(resource, _typeId) {
        super();
        this.resource = resource;
        this._typeId = _typeId;
        this.gotDisposed = false;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.gotReverted = false;
        this.dirty = false;
        this.fails = false;
        this.disableToUntyped = false;
        this._capabilities = 0 /* EditorInputCapabilities.None */;
        this.movedEditor = undefined;
        this.moveDisabledReason = undefined;
        this.preferredResource = this.resource;
    }
    get typeId() { return this._typeId; }
    get editorId() { return this._typeId; }
    get capabilities() { return this._capabilities; }
    set capabilities(capabilities) {
        if (this._capabilities !== capabilities) {
            this._capabilities = capabilities;
            this._onDidChangeCapabilities.fire();
        }
    }
    resolve() { return !this.fails ? Promise.resolve(null) : Promise.reject(new Error('fails')); }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof EditorInput) {
            return !!(other?.resource && this.resource.toString() === other.resource.toString() && other instanceof TestFileEditorInput && other.typeId === this.typeId);
        }
        return isEqual(this.resource, other.resource) && (this.editorId === other.options?.override || other.options?.override === undefined);
    }
    setPreferredResource(resource) { }
    async setEncoding(encoding) { }
    getEncoding() { return undefined; }
    setPreferredName(name) { }
    setPreferredDescription(description) { }
    setPreferredEncoding(encoding) { }
    setPreferredContents(contents) { }
    setLanguageId(languageId, source) { }
    setPreferredLanguageId(languageId) { }
    setForceOpenAsBinary() { }
    setFailToOpen() {
        this.fails = true;
    }
    async save(groupId, options) {
        this.gotSaved = true;
        this.dirty = false;
        return this;
    }
    async saveAs(groupId, options) {
        this.gotSavedAs = true;
        return this;
    }
    async revert(group, options) {
        this.gotReverted = true;
        this.gotSaved = false;
        this.gotSavedAs = false;
        this.dirty = false;
    }
    toUntyped() {
        if (this.disableToUntyped) {
            return undefined;
        }
        return { resource: this.resource };
    }
    setModified() { this.modified = true; }
    isModified() {
        return this.modified === undefined ? this.dirty : this.modified;
    }
    setDirty() { this.dirty = true; }
    isDirty() {
        return this.dirty;
    }
    isResolved() { return false; }
    dispose() {
        super.dispose();
        this.gotDisposed = true;
    }
    async rename() { return this.movedEditor; }
    setMoveDisabled(reason) {
        this.moveDisabledReason = reason;
    }
    canMove(sourceGroup, targetGroup) {
        if (typeof this.moveDisabledReason === 'string') {
            return this.moveDisabledReason;
        }
        return super.canMove(sourceGroup, targetGroup);
    }
}
export class TestSingletonFileEditorInput extends TestFileEditorInput {
    get capabilities() { return 8 /* EditorInputCapabilities.Singleton */; }
}
export class TestEditorPart extends MainEditorPart {
    constructor() {
        super(...arguments);
        this.mainPart = this;
        this.parts = [this];
        this.onDidCreateAuxiliaryEditorPart = Event.None;
    }
    testSaveState() {
        return super.saveState();
    }
    clearState() {
        const workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(workspaceMemento)) {
            delete workspaceMemento[key];
        }
        const profileMemento = this.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const key of Object.keys(profileMemento)) {
            delete profileMemento[key];
        }
    }
    registerEditorPart(part) {
        return Disposable.None;
    }
    createAuxiliaryEditorPart() {
        throw new Error('Method not implemented.');
    }
    getScopedInstantiationService(part) {
        throw new Error('Method not implemented.');
    }
    getPart(group) { return this; }
    saveWorkingSet(name) { throw new Error('Method not implemented.'); }
    getWorkingSets() { throw new Error('Method not implemented.'); }
    applyWorkingSet(workingSet, options) { throw new Error('Method not implemented.'); }
    deleteWorkingSet(workingSet) { throw new Error('Method not implemented.'); }
    registerContextKeyProvider(provider) { throw new Error('Method not implemented.'); }
}
export class TestEditorParts extends EditorParts {
    createMainEditorPart() {
        this.testMainPart = this.instantiationService.createInstance(TestEditorPart, this);
        return this.testMainPart;
    }
}
export async function createEditorParts(instantiationService, disposables) {
    const parts = instantiationService.createInstance(TestEditorParts);
    const part = disposables.add(parts).testMainPart;
    part.create(document.createElement('div'));
    part.layout(1080, 800, 0, 0);
    await parts.whenReady;
    return parts;
}
export async function createEditorPart(instantiationService, disposables) {
    return (await createEditorParts(instantiationService, disposables)).testMainPart;
}
export class TestListService {
    constructor() {
        this.lastFocusedList = undefined;
    }
    register() {
        return Disposable.None;
    }
}
export class TestPathService {
    constructor(fallbackUserHome = URI.from({ scheme: Schemas.file, path: '/' }), defaultUriScheme = Schemas.file) {
        this.fallbackUserHome = fallbackUserHome;
        this.defaultUriScheme = defaultUriScheme;
    }
    hasValidBasename(resource, arg2, name) {
        if (typeof arg2 === 'string' || typeof arg2 === 'undefined') {
            return isValidBasename(arg2 ?? basename(resource));
        }
        return isValidBasename(name ?? basename(resource));
    }
    get path() { return Promise.resolve(isWindows ? win32 : posix); }
    userHome(options) {
        return options?.preferLocal ? this.fallbackUserHome : Promise.resolve(this.fallbackUserHome);
    }
    get resolvedUserHome() { return this.fallbackUserHome; }
    async fileURI(path) {
        return URI.file(path);
    }
}
export function getLastResolvedFileStat(model) {
    const candidate = model;
    return candidate?.lastResolvedFileStat;
}
export class TestWorkspacesService {
    constructor() {
        this.onDidChangeRecentlyOpened = Event.None;
    }
    async createUntitledWorkspace(folders, remoteAuthority) { throw new Error('Method not implemented.'); }
    async deleteUntitledWorkspace(workspace) { }
    async addRecentlyOpened(recents) { }
    async removeRecentlyOpened(workspaces) { }
    async clearRecentlyOpened() { }
    async getRecentlyOpened() { return { files: [], workspaces: [] }; }
    async getDirtyWorkspaces() { return []; }
    async enterWorkspace(path) { throw new Error('Method not implemented.'); }
    async getWorkspaceIdentifier(workspacePath) { throw new Error('Method not implemented.'); }
}
export class TestTerminalInstanceService {
    constructor() {
        this.onDidCreateInstance = Event.None;
        this.onDidRegisterBackend = Event.None;
    }
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile, cwd) { throw new Error('Method not implemented.'); }
    preparePathForTerminalAsync(path, executable, title, shellType, remoteAuthority) { throw new Error('Method not implemented.'); }
    createInstance(options, target) { throw new Error('Method not implemented.'); }
    async getBackend(remoteAuthority) { throw new Error('Method not implemented.'); }
    didRegisterBackend(backend) { throw new Error('Method not implemented.'); }
    getRegisteredBackends() { throw new Error('Method not implemented.'); }
}
export class TestTerminalEditorService {
    constructor() {
        this.instances = [];
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    openEditor(instance, editorOptions) { throw new Error('Method not implemented.'); }
    detachInstance(instance) { throw new Error('Method not implemented.'); }
    splitInstance(instanceToSplit, shellLaunchConfig) { throw new Error('Method not implemented.'); }
    revealActiveEditor(preserveFocus) { throw new Error('Method not implemented.'); }
    resolveResource(instance) { throw new Error('Method not implemented.'); }
    reviveInput(deserializedInput) { throw new Error('Method not implemented.'); }
    getInputFromResource(resource) { throw new Error('Method not implemented.'); }
    setActiveInstance(instance) { throw new Error('Method not implemented.'); }
    focusActiveInstance() { throw new Error('Method not implemented.'); }
    focusInstance(instance) { throw new Error('Method not implemented.'); }
    getInstanceFromResource(resource) { throw new Error('Method not implemented.'); }
    focusFindWidget() { throw new Error('Method not implemented.'); }
    hideFindWidget() { throw new Error('Method not implemented.'); }
    findNext() { throw new Error('Method not implemented.'); }
    findPrevious() { throw new Error('Method not implemented.'); }
}
export class TestTerminalGroupService {
    constructor() {
        this.instances = [];
        this.groups = [];
        this.activeGroupIndex = 0;
        this.lastAccessedMenu = 'inline-tab';
        this.onDidChangeActiveGroup = Event.None;
        this.onDidDisposeGroup = Event.None;
        this.onDidShow = Event.None;
        this.onDidChangeGroups = Event.None;
        this.onDidChangePanelOrientation = Event.None;
        this.onDidDisposeInstance = Event.None;
        this.onDidFocusInstance = Event.None;
        this.onDidChangeInstanceCapability = Event.None;
        this.onDidChangeActiveInstance = Event.None;
        this.onDidChangeInstances = Event.None;
    }
    createGroup(instance) { throw new Error('Method not implemented.'); }
    getGroupForInstance(instance) { throw new Error('Method not implemented.'); }
    moveGroup(source, target) { throw new Error('Method not implemented.'); }
    moveGroupToEnd(source) { throw new Error('Method not implemented.'); }
    moveInstance(source, target, side) { throw new Error('Method not implemented.'); }
    unsplitInstance(instance) { throw new Error('Method not implemented.'); }
    joinInstances(instances) { throw new Error('Method not implemented.'); }
    instanceIsSplit(instance) { throw new Error('Method not implemented.'); }
    getGroupLabels() { throw new Error('Method not implemented.'); }
    setActiveGroupByIndex(index) { throw new Error('Method not implemented.'); }
    setActiveGroupToNext() { throw new Error('Method not implemented.'); }
    setActiveGroupToPrevious() { throw new Error('Method not implemented.'); }
    setActiveInstanceByIndex(terminalIndex) { throw new Error('Method not implemented.'); }
    setContainer(container) { throw new Error('Method not implemented.'); }
    showPanel(focus) { throw new Error('Method not implemented.'); }
    hidePanel() { throw new Error('Method not implemented.'); }
    focusTabs() { throw new Error('Method not implemented.'); }
    focusHover() { throw new Error('Method not implemented.'); }
    setActiveInstance(instance) { throw new Error('Method not implemented.'); }
    focusActiveInstance() { throw new Error('Method not implemented.'); }
    focusInstance(instance) { throw new Error('Method not implemented.'); }
    getInstanceFromResource(resource) { throw new Error('Method not implemented.'); }
    focusFindWidget() { throw new Error('Method not implemented.'); }
    hideFindWidget() { throw new Error('Method not implemented.'); }
    findNext() { throw new Error('Method not implemented.'); }
    findPrevious() { throw new Error('Method not implemented.'); }
    updateVisibility() { throw new Error('Method not implemented.'); }
}
export class TestTerminalProfileService {
    constructor() {
        this.availableProfiles = [];
        this.contributedProfiles = [];
        this.profilesReady = Promise.resolve();
        this.onDidChangeAvailableProfiles = Event.None;
    }
    getPlatformKey() { throw new Error('Method not implemented.'); }
    refreshAvailableProfiles() { throw new Error('Method not implemented.'); }
    getDefaultProfileName() { throw new Error('Method not implemented.'); }
    getDefaultProfile() { throw new Error('Method not implemented.'); }
    getContributedDefaultProfile(shellLaunchConfig) { throw new Error('Method not implemented.'); }
    registerContributedProfile(args) { throw new Error('Method not implemented.'); }
    getContributedProfileProvider(extensionIdentifier, id) { throw new Error('Method not implemented.'); }
    registerTerminalProfileProvider(extensionIdentifier, id, profileProvider) { throw new Error('Method not implemented.'); }
}
export class TestTerminalProfileResolverService {
    constructor() {
        this.defaultProfileName = '';
    }
    resolveIcon(shellLaunchConfig) { }
    async resolveShellLaunchConfig(shellLaunchConfig, options) { }
    async getDefaultProfile(options) { return { path: '/default', profileName: 'Default', isDefault: true }; }
    async getDefaultShell(options) { return '/default'; }
    async getDefaultShellArgs(options) { return []; }
    getDefaultIcon() { return Codicon.terminal; }
    async getEnvironment() { return env; }
    getSafeConfigValue(key, os) { return undefined; }
    getSafeConfigValueFullKey(key) { return undefined; }
    createProfileFromShellAndShellArgs(shell, shellArgs) { throw new Error('Method not implemented.'); }
}
export class TestTerminalConfigurationService extends TerminalConfigurationService {
    get fontMetrics() { return this._fontMetrics; }
    setConfig(config) { this._config = config; }
}
export class TestQuickInputService {
    constructor() {
        this.onShow = Event.None;
        this.onHide = Event.None;
        this.currentQuickInput = undefined;
        this.quickAccess = undefined;
    }
    async pick(picks, options, token) {
        if (Array.isArray(picks)) {
            return { label: 'selectedPick', description: 'pick description', value: 'selectedPick' };
        }
        else {
            return undefined;
        }
    }
    async input(options, token) { return options ? 'resolved' + options.prompt : 'resolved'; }
    createQuickPick() { throw new Error('not implemented.'); }
    createInputBox() { throw new Error('not implemented.'); }
    createQuickWidget() { throw new Error('Method not implemented.'); }
    focus() { throw new Error('not implemented.'); }
    toggle() { throw new Error('not implemented.'); }
    navigate(next, quickNavigate) { throw new Error('not implemented.'); }
    accept() { throw new Error('not implemented.'); }
    back() { throw new Error('not implemented.'); }
    cancel() { throw new Error('not implemented.'); }
    setAlignment(alignment) { throw new Error('not implemented.'); }
    toggleHover() { throw new Error('not implemented.'); }
}
class TestLanguageDetectionService {
    isEnabledForLanguage(languageId) { return false; }
    async detectLanguage(resource, supportedLangs) { return undefined; }
}
export class TestRemoteAgentService {
    getConnection() { return null; }
    async getEnvironment() { return null; }
    async getRawEnvironment() { return null; }
    async getExtensionHostExitInfo(reconnectionToken) { return null; }
    async getDiagnosticInfo(options) { return undefined; }
    async updateTelemetryLevel(telemetryLevel) { }
    async logTelemetry(eventName, data) { }
    async flushTelemetry() { }
    async getRoundTripTime() { return undefined; }
    async endConnection() { }
}
export class TestRemoteExtensionsScannerService {
    async whenExtensionsReady() { return { failed: [] }; }
    scanExtensions() { throw new Error('Method not implemented.'); }
}
export class TestWorkbenchExtensionEnablementService {
    constructor() {
        this.onEnablementChanged = Event.None;
    }
    getEnablementState(extension) { return 11 /* EnablementState.EnabledGlobally */; }
    getEnablementStates(extensions, workspaceTypeOverrides) { return []; }
    getDependenciesEnablementStates(extension) { return []; }
    canChangeEnablement(extension) { return true; }
    canChangeWorkspaceEnablement(extension) { return true; }
    isEnabled(extension) { return true; }
    isEnabledEnablementState(enablementState) { return true; }
    isDisabledGlobally(extension) { return false; }
    async setEnablement(extensions, state) { return []; }
    async updateExtensionsEnablementsWhenWorkspaceTrustChanges() { }
}
export class TestWorkbenchExtensionManagementService {
    constructor() {
        this.onInstallExtension = Event.None;
        this.onDidInstallExtensions = Event.None;
        this.onUninstallExtension = Event.None;
        this.onDidUninstallExtension = Event.None;
        this.onDidUpdateExtensionMetadata = Event.None;
        this.onProfileAwareInstallExtension = Event.None;
        this.onProfileAwareDidInstallExtensions = Event.None;
        this.onProfileAwareUninstallExtension = Event.None;
        this.onProfileAwareDidUninstallExtension = Event.None;
        this.onDidProfileAwareUninstallExtensions = Event.None;
        this.onProfileAwareDidUpdateExtensionMetadata = Event.None;
        this.onDidChangeProfile = Event.None;
        this.onDidEnableExtensions = Event.None;
        this.preferPreReleases = true;
    }
    installVSIX(location, manifest, installOptions) {
        throw new Error('Method not implemented.');
    }
    installFromLocation(location) {
        throw new Error('Method not implemented.');
    }
    installGalleryExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async updateFromGallery(gallery, extension, installOptions) { return extension; }
    zip(extension) {
        throw new Error('Method not implemented.');
    }
    getManifest(vsix) {
        throw new Error('Method not implemented.');
    }
    install(vsix, options) {
        throw new Error('Method not implemented.');
    }
    isAllowed() { return true; }
    async canInstall(extension) { return true; }
    installFromGallery(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstall(extension, options) {
        throw new Error('Method not implemented.');
    }
    uninstallExtensions(extensions) {
        throw new Error('Method not implemented.');
    }
    async getInstalled(type) { return []; }
    getExtensionsControlManifest() {
        throw new Error('Method not implemented.');
    }
    async updateMetadata(local, metadata) { return local; }
    registerParticipant(pariticipant) { }
    async getTargetPlatform() { return "undefined" /* TargetPlatform.UNDEFINED */; }
    async cleanUp() { }
    download() {
        throw new Error('Method not implemented.');
    }
    copyExtensions() { throw new Error('Not Supported'); }
    toggleApplicationScope() { throw new Error('Not Supported'); }
    installExtensionsFromProfile() { throw new Error('Not Supported'); }
    whenProfileChanged(from, to) { throw new Error('Not Supported'); }
    getInstalledWorkspaceExtensionLocations() { throw new Error('Method not implemented.'); }
    getInstalledWorkspaceExtensions() { throw new Error('Method not implemented.'); }
    installResourceExtension() { throw new Error('Method not implemented.'); }
    getExtensions() { throw new Error('Method not implemented.'); }
    resetPinnedStateForAllUserExtensions(pinned) { throw new Error('Method not implemented.'); }
    getInstallableServers(extension) { throw new Error('Method not implemented.'); }
    isPublisherTrusted(extension) { return false; }
    getTrustedPublishers() { return []; }
    trustPublishers() { }
    untrustPublishers() { }
    async requestPublisherTrust(extensions) { }
}
export class TestUserDataProfileService {
    constructor() {
        this.onDidChangeCurrentProfile = Event.None;
        this.currentProfile = toUserDataProfile('test', 'test', URI.file('tests').with({ scheme: 'vscode-tests' }), URI.file('tests').with({ scheme: 'vscode-tests' }));
    }
    async updateCurrentProfile() { }
}
export class TestWebExtensionsScannerService {
    constructor() {
        this.onDidChangeProfile = Event.None;
    }
    async scanSystemExtensions() { return []; }
    async scanUserExtensions() { return []; }
    async scanExtensionsUnderDevelopment() { return []; }
    async copyExtensions() {
        throw new Error('Method not implemented.');
    }
    scanExistingExtension(extensionLocation, extensionType) {
        throw new Error('Method not implemented.');
    }
    addExtension(location, metadata) {
        throw new Error('Method not implemented.');
    }
    addExtensionFromGallery(galleryExtension, metadata) {
        throw new Error('Method not implemented.');
    }
    removeExtension() {
        throw new Error('Method not implemented.');
    }
    updateMetadata(extension, metaData, profileLocation) {
        throw new Error('Method not implemented.');
    }
    scanExtensionManifest(extensionLocation) {
        throw new Error('Method not implemented.');
    }
}
export async function workbenchTeardown(instantiationService) {
    return instantiationService.invokeFunction(async (accessor) => {
        const workingCopyService = accessor.get(IWorkingCopyService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        for (const workingCopy of workingCopyService.workingCopies) {
            await workingCopy.revert();
        }
        for (const group of editorGroupService.groups) {
            await group.closeAllEditors();
        }
        for (const group of editorGroupService.groups) {
            editorGroupService.removeGroup(group);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3dvcmtiZW5jaFRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDbkgsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFrQixpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQUNwSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakUsT0FBTyxFQUF5USxnQkFBZ0IsRUFBMEYsZ0JBQWdCLElBQUksVUFBVSxFQUE4TCxNQUFNLHdCQUF3QixDQUFDO0FBQ3JuQixPQUFPLEVBQW1GLDJCQUEyQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEssT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQThCLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0gsT0FBTyxFQUFFLHFCQUFxQixFQUE0QyxNQUFNLHlEQUF5RCxDQUFDO0FBQzFJLE9BQU8sRUFBRSx1QkFBdUIsRUFBbUQsTUFBTSxnREFBZ0QsQ0FBQztBQUMxSSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRUFB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