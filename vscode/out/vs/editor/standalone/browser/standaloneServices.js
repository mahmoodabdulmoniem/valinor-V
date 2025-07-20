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
import './standaloneCodeEditorService.js';
import './standaloneLayoutService.js';
import '../../../platform/undoRedo/common/undoRedoService.js';
import '../../common/services/languageFeatureDebounce.js';
import '../../common/services/semanticTokensStylingService.js';
import '../../common/services/languageFeaturesService.js';
import '../../browser/services/hoverService/hoverService.js';
import '../../browser/services/inlineCompletionsService.js';
import * as strings from '../../../base/common/strings.js';
import * as dom from '../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../base/browser/keyboardEvent.js';
import { Emitter, Event, ValueWithChangeEvent } from '../../../base/common/event.js';
import { KeyCodeChord, decodeKeybinding } from '../../../base/common/keybindings.js';
import { ImmortalReference, toDisposable, DisposableStore, Disposable, combinedDisposable } from '../../../base/common/lifecycle.js';
import { OS, isLinux, isMacintosh } from '../../../base/common/platform.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { IBulkEditService, ResourceEdit, ResourceTextEdit } from '../../browser/services/bulkEditService.js';
import { isDiffEditorConfigurationKey, isEditorConfigurationKey } from '../../common/config/editorConfigurationSchema.js';
import { EditOperation } from '../../common/core/editOperation.js';
import { Position as Pos } from '../../common/core/position.js';
import { Range } from '../../common/core/range.js';
import { IModelService } from '../../common/services/model.js';
import { ITextModelService } from '../../common/services/resolverService.js';
import { ITextResourceConfigurationService, ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { Configuration, ConfigurationModel, ConfigurationChangeEvent } from '../../../platform/configuration/common/configurationModels.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { createDecorator, IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { AbstractKeybindingService } from '../../../platform/keybinding/common/abstractKeybindingService.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { KeybindingResolver } from '../../../platform/keybinding/common/keybindingResolver.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { ResolvedKeybindingItem } from '../../../platform/keybinding/common/resolvedKeybindingItem.js';
import { USLayoutResolvedKeybinding } from '../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { INotificationService, NoOpNotification, NotificationsFilter } from '../../../platform/notification/common/notification.js';
import { IEditorProgressService, IProgressService } from '../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService, WorkspaceFolder, STANDALONE_EDITOR_WORKSPACE_ID } from '../../../platform/workspace/common/workspace.js';
import { ILayoutService } from '../../../platform/layout/browser/layoutService.js';
import { StandaloneServicesNLS } from '../../common/standaloneStrings.js';
import { basename } from '../../../base/common/resources.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { ConsoleLogger, ILoggerService, ILogService, NullLoggerService } from '../../../platform/log/common/log.js';
import { IWorkspaceTrustManagementService } from '../../../platform/workspace/common/workspaceTrust.js';
import { IContextMenuService, IContextViewService } from '../../../platform/contextview/browser/contextView.js';
import { ContextViewService } from '../../../platform/contextview/browser/contextViewService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { ContextMenuService } from '../../../platform/contextview/browser/contextMenuService.js';
import { getSingletonServiceDescriptors, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { OpenerService } from '../../browser/services/openerService.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { EditorWorkerService } from '../../browser/services/editorWorkerService.js';
import { ILanguageService } from '../../common/languages/language.js';
import { MarkerDecorationsService } from '../../common/services/markerDecorationsService.js';
import { IMarkerDecorationsService } from '../../common/services/markerDecorations.js';
import { ModelService } from '../../common/services/modelService.js';
import { StandaloneQuickInputService } from './quickInput/standaloneQuickInputService.js';
import { StandaloneThemeService } from './standaloneThemeService.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { AccessibilityService } from '../../../platform/accessibility/browser/accessibilityService.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { IMenuService } from '../../../platform/actions/common/actions.js';
import { MenuService } from '../../../platform/actions/common/menuService.js';
import { BrowserClipboardService } from '../../../platform/clipboard/browser/clipboardService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyService } from '../../../platform/contextkey/browser/contextKeyService.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { IListService, ListService } from '../../../platform/list/browser/listService.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../platform/markers/common/markerService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IStorageService, InMemoryStorageService } from '../../../platform/storage/common/storage.js';
import { DefaultConfiguration } from '../../../platform/configuration/common/configurations.js';
import { IAccessibilitySignalService } from '../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { getEditorFeatures } from '../../common/editorFeatures.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { mainWindow } from '../../../base/browser/window.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ITreeSitterLibraryService } from '../../common/services/treeSitter/treeSitterLibraryService.js';
import { StandaloneTreeSitterLibraryService } from './standaloneTreeSitterLibraryService.js';
class SimpleModel {
    constructor(model) {
        this.disposed = false;
        this.model = model;
        this._onWillDispose = new Emitter();
    }
    get onWillDispose() {
        return this._onWillDispose.event;
    }
    resolve() {
        return Promise.resolve();
    }
    get textEditorModel() {
        return this.model;
    }
    createSnapshot() {
        return this.model.createSnapshot();
    }
    isReadonly() {
        return false;
    }
    dispose() {
        this.disposed = true;
        this._onWillDispose.fire();
    }
    isDisposed() {
        return this.disposed;
    }
    isResolved() {
        return true;
    }
    getLanguageId() {
        return this.model.getLanguageId();
    }
}
let StandaloneTextModelService = class StandaloneTextModelService {
    constructor(modelService) {
        this.modelService = modelService;
    }
    createModelReference(resource) {
        const model = this.modelService.getModel(resource);
        if (!model) {
            return Promise.reject(new Error(`Model not found`));
        }
        return Promise.resolve(new ImmortalReference(new SimpleModel(model)));
    }
    registerTextModelContentProvider(scheme, provider) {
        return {
            dispose: function () { }
        };
    }
    canHandleResource(resource) {
        return false;
    }
};
StandaloneTextModelService = __decorate([
    __param(0, IModelService)
], StandaloneTextModelService);
class StandaloneEditorProgressService {
    static { this.NULL_PROGRESS_RUNNER = {
        done: () => { },
        total: () => { },
        worked: () => { }
    }; }
    show() {
        return StandaloneEditorProgressService.NULL_PROGRESS_RUNNER;
    }
    async showWhile(promise, delay) {
        await promise;
    }
}
class StandaloneProgressService {
    withProgress(_options, task, onDidCancel) {
        return task({
            report: () => { },
        });
    }
}
class StandaloneEnvironmentService {
    constructor() {
        this.stateResource = URI.from({ scheme: 'monaco', authority: 'stateResource' });
        this.userRoamingDataHome = URI.from({ scheme: 'monaco', authority: 'userRoamingDataHome' });
        this.keyboardLayoutResource = URI.from({ scheme: 'monaco', authority: 'keyboardLayoutResource' });
        this.argvResource = URI.from({ scheme: 'monaco', authority: 'argvResource' });
        this.untitledWorkspacesHome = URI.from({ scheme: 'monaco', authority: 'untitledWorkspacesHome' });
        this.workspaceStorageHome = URI.from({ scheme: 'monaco', authority: 'workspaceStorageHome' });
        this.localHistoryHome = URI.from({ scheme: 'monaco', authority: 'localHistoryHome' });
        this.cacheHome = URI.from({ scheme: 'monaco', authority: 'cacheHome' });
        this.userDataSyncHome = URI.from({ scheme: 'monaco', authority: 'userDataSyncHome' });
        this.sync = undefined;
        this.continueOn = undefined;
        this.editSessionId = undefined;
        this.debugExtensionHost = { port: null, break: false };
        this.isExtensionDevelopment = false;
        this.disableExtensions = false;
        this.disableExperiments = false;
        this.enableExtensions = undefined;
        this.extensionDevelopmentLocationURI = undefined;
        this.extensionDevelopmentKind = undefined;
        this.extensionTestsLocationURI = undefined;
        this.logsHome = URI.from({ scheme: 'monaco', authority: 'logsHome' });
        this.logLevel = undefined;
        this.extensionLogLevel = undefined;
        this.verbose = false;
        this.isBuilt = false;
        this.disableTelemetry = false;
        this.serviceMachineIdResource = URI.from({ scheme: 'monaco', authority: 'serviceMachineIdResource' });
        this.policyFile = undefined;
    }
}
class StandaloneDialogService {
    constructor() {
        this.onWillShowDialog = Event.None;
        this.onDidShowDialog = Event.None;
    }
    async confirm(confirmation) {
        const confirmed = this.doConfirm(confirmation.message, confirmation.detail);
        return {
            confirmed,
            checkboxChecked: false // unsupported
        };
    }
    doConfirm(message, detail) {
        let messageText = message;
        if (detail) {
            messageText = messageText + '\n\n' + detail;
        }
        return mainWindow.confirm(messageText);
    }
    async prompt(prompt) {
        let result = undefined;
        const confirmed = this.doConfirm(prompt.message, prompt.detail);
        if (confirmed) {
            const promptButtons = [...(prompt.buttons ?? [])];
            if (prompt.cancelButton && typeof prompt.cancelButton !== 'string' && typeof prompt.cancelButton !== 'boolean') {
                promptButtons.push(prompt.cancelButton);
            }
            result = await promptButtons[0]?.run({ checkboxChecked: false });
        }
        return { result };
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    input() {
        return Promise.resolve({ confirmed: false }); // unsupported
    }
    about() {
        return Promise.resolve(undefined);
    }
}
export class StandaloneNotificationService {
    constructor() {
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        switch (notification.severity) {
            case Severity.Error:
                console.error(notification.message);
                break;
            case Severity.Warning:
                console.warn(notification.message);
                break;
            default:
                console.log(notification.message);
                break;
        }
        return StandaloneNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return StandaloneNotificationService.NO_OP;
    }
    status(message, options) {
        return { close: () => { } };
    }
    setFilter(filter) { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
let StandaloneCommandService = class StandaloneCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this._onDidExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [command.handler, ...args]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
};
StandaloneCommandService = __decorate([
    __param(0, IInstantiationService)
], StandaloneCommandService);
export { StandaloneCommandService };
let StandaloneKeybindingService = class StandaloneKeybindingService extends AbstractKeybindingService {
    constructor(contextKeyService, commandService, telemetryService, notificationService, logService, codeEditorService) {
        super(contextKeyService, commandService, telemetryService, notificationService, logService);
        this._cachedResolver = null;
        this._dynamicKeybindings = [];
        this._domNodeListeners = [];
        const addContainer = (domNode) => {
            const disposables = new DisposableStore();
            // for standard keybindings
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                    keyEvent.stopPropagation();
                }
            }));
            // for single modifier chord keybindings (e.g. shift shift)
            disposables.add(dom.addDisposableListener(domNode, dom.EventType.KEY_UP, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                const shouldPreventDefault = this._singleModifierDispatch(keyEvent, keyEvent.target);
                if (shouldPreventDefault) {
                    keyEvent.preventDefault();
                }
            }));
            this._domNodeListeners.push(new DomNodeListeners(domNode, disposables));
        };
        const removeContainer = (domNode) => {
            for (let i = 0; i < this._domNodeListeners.length; i++) {
                const domNodeListeners = this._domNodeListeners[i];
                if (domNodeListeners.domNode === domNode) {
                    this._domNodeListeners.splice(i, 1);
                    domNodeListeners.dispose();
                }
            }
        };
        const addCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(70 /* EditorOption.inDiffEditor */)) {
                return;
            }
            addContainer(codeEditor.getContainerDomNode());
        };
        const removeCodeEditor = (codeEditor) => {
            if (codeEditor.getOption(70 /* EditorOption.inDiffEditor */)) {
                return;
            }
            removeContainer(codeEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onCodeEditorAdd(addCodeEditor));
        this._register(codeEditorService.onCodeEditorRemove(removeCodeEditor));
        codeEditorService.listCodeEditors().forEach(addCodeEditor);
        const addDiffEditor = (diffEditor) => {
            addContainer(diffEditor.getContainerDomNode());
        };
        const removeDiffEditor = (diffEditor) => {
            removeContainer(diffEditor.getContainerDomNode());
        };
        this._register(codeEditorService.onDiffEditorAdd(addDiffEditor));
        this._register(codeEditorService.onDiffEditorRemove(removeDiffEditor));
        codeEditorService.listDiffEditors().forEach(addDiffEditor);
    }
    addDynamicKeybinding(command, keybinding, handler, when) {
        return combinedDisposable(CommandsRegistry.registerCommand(command, handler), this.addDynamicKeybindings([{
                keybinding,
                command,
                when
            }]));
    }
    addDynamicKeybindings(rules) {
        const entries = rules.map((rule) => {
            const keybinding = decodeKeybinding(rule.keybinding, OS);
            return {
                keybinding,
                command: rule.command ?? null,
                commandArgs: rule.commandArgs,
                when: rule.when,
                weight1: 1000,
                weight2: 0,
                extensionId: null,
                isBuiltinExtension: false
            };
        });
        this._dynamicKeybindings = this._dynamicKeybindings.concat(entries);
        this.updateResolver();
        return toDisposable(() => {
            // Search the first entry and remove them all since they will be contiguous
            for (let i = 0; i < this._dynamicKeybindings.length; i++) {
                if (this._dynamicKeybindings[i] === entries[0]) {
                    this._dynamicKeybindings.splice(i, entries.length);
                    this.updateResolver();
                    return;
                }
            }
        });
    }
    updateResolver() {
        this._cachedResolver = null;
        this._onDidUpdateKeybindings.fire();
    }
    _getResolver() {
        if (!this._cachedResolver) {
            const defaults = this._toNormalizedKeybindingItems(KeybindingsRegistry.getDefaultKeybindings(), true);
            const overrides = this._toNormalizedKeybindingItems(this._dynamicKeybindings, false);
            this._cachedResolver = new KeybindingResolver(defaults, overrides, (str) => this._log(str));
        }
        return this._cachedResolver;
    }
    _documentHasFocus() {
        return mainWindow.document.hasFocus();
    }
    _toNormalizedKeybindingItems(items, isDefault) {
        const result = [];
        let resultLen = 0;
        for (const item of items) {
            const when = item.when || undefined;
            const keybinding = item.keybinding;
            if (!keybinding) {
                // This might be a removal keybinding item in user settings => accept it
                result[resultLen++] = new ResolvedKeybindingItem(undefined, item.command, item.commandArgs, when, isDefault, null, false);
            }
            else {
                const resolvedKeybindings = USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
                for (const resolvedKeybinding of resolvedKeybindings) {
                    result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.command, item.commandArgs, when, isDefault, null, false);
                }
            }
        }
        return result;
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const chord = new KeyCodeChord(keyboardEvent.ctrlKey, keyboardEvent.shiftKey, keyboardEvent.altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return new USLayoutResolvedKeybinding([chord], OS);
    }
    resolveUserBinding(userBinding) {
        return [];
    }
    _dumpDebugInfo() {
        return '';
    }
    _dumpDebugInfoJSON() {
        return '';
    }
    registerSchemaContribution(contribution) {
        return Disposable.None;
    }
    /**
     * not yet supported
     */
    enableKeybindingHoldMode(commandId) {
        return undefined;
    }
};
StandaloneKeybindingService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ICommandService),
    __param(2, ITelemetryService),
    __param(3, INotificationService),
    __param(4, ILogService),
    __param(5, ICodeEditorService)
], StandaloneKeybindingService);
export { StandaloneKeybindingService };
class DomNodeListeners extends Disposable {
    constructor(domNode, disposables) {
        super();
        this.domNode = domNode;
        this._register(disposables);
    }
}
function isConfigurationOverrides(thing) {
    return thing
        && typeof thing === 'object'
        && (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
        && (!thing.resource || thing.resource instanceof URI);
}
let StandaloneConfigurationService = class StandaloneConfigurationService {
    constructor(logService) {
        this.logService = logService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        const defaultConfiguration = new DefaultConfiguration(logService);
        this._configuration = new Configuration(defaultConfiguration.reload(), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), ConfigurationModel.createEmptyModel(logService), new ResourceMap(), logService);
        defaultConfiguration.dispose();
    }
    getValue(arg1, arg2) {
        const section = typeof arg1 === 'string' ? arg1 : undefined;
        const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : {};
        return this._configuration.getValue(section, overrides, undefined);
    }
    updateValues(values) {
        const previous = { data: this._configuration.toData() };
        const changedKeys = [];
        for (const entry of values) {
            const [key, value] = entry;
            if (this.getValue(key) === value) {
                continue;
            }
            this._configuration.updateValue(key, value);
            changedKeys.push(key);
        }
        if (changedKeys.length > 0) {
            const configurationChangeEvent = new ConfigurationChangeEvent({ keys: changedKeys, overrides: [] }, previous, this._configuration, undefined, this.logService);
            configurationChangeEvent.source = 8 /* ConfigurationTarget.MEMORY */;
            this._onDidChangeConfiguration.fire(configurationChangeEvent);
        }
        return Promise.resolve();
    }
    updateValue(key, value, arg3, arg4) {
        return this.updateValues([[key, value]]);
    }
    inspect(key, options = {}) {
        return this._configuration.inspect(key, options, undefined);
    }
    keys() {
        return this._configuration.keys(undefined);
    }
    reloadConfiguration() {
        return Promise.resolve(undefined);
    }
    getConfigurationData() {
        const emptyModel = {
            contents: {},
            keys: [],
            overrides: []
        };
        return {
            defaults: emptyModel,
            policy: emptyModel,
            application: emptyModel,
            userLocal: emptyModel,
            userRemote: emptyModel,
            workspace: emptyModel,
            folders: []
        };
    }
};
StandaloneConfigurationService = __decorate([
    __param(0, ILogService)
], StandaloneConfigurationService);
export { StandaloneConfigurationService };
let StandaloneResourceConfigurationService = class StandaloneResourceConfigurationService {
    constructor(configurationService, modelService, languageService) {
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this._onDidChangeConfiguration = new Emitter();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this.configurationService.onDidChangeConfiguration((e) => {
            this._onDidChangeConfiguration.fire({ affectedKeys: e.affectedKeys, affectsConfiguration: (resource, configuration) => e.affectsConfiguration(configuration) });
        });
    }
    getValue(resource, arg2, arg3) {
        const position = Pos.isIPosition(arg2) ? arg2 : null;
        const section = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
        const language = resource ? this.getLanguage(resource, position) : undefined;
        if (typeof section === 'undefined') {
            return this.configurationService.getValue({
                resource,
                overrideIdentifier: language
            });
        }
        return this.configurationService.getValue(section, {
            resource,
            overrideIdentifier: language
        });
    }
    inspect(resource, position, section) {
        const language = resource ? this.getLanguage(resource, position) : undefined;
        return this.configurationService.inspect(section, { resource, overrideIdentifier: language });
    }
    getLanguage(resource, position) {
        const model = this.modelService.getModel(resource);
        if (model) {
            return position ? model.getLanguageIdAtPosition(position.lineNumber, position.column) : model.getLanguageId();
        }
        return this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
    }
    updateValue(resource, key, value, configurationTarget) {
        return this.configurationService.updateValue(key, value, { resource }, configurationTarget);
    }
};
StandaloneResourceConfigurationService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], StandaloneResourceConfigurationService);
let StandaloneResourcePropertiesService = class StandaloneResourcePropertiesService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getEOL(resource, language) {
        const eol = this.configurationService.getValue('files.eol', { overrideIdentifier: language, resource });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return (isLinux || isMacintosh) ? '\n' : '\r\n';
    }
};
StandaloneResourcePropertiesService = __decorate([
    __param(0, IConfigurationService)
], StandaloneResourcePropertiesService);
class StandaloneTelemetryService {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = 'someValue.sessionId';
        this.machineId = 'someValue.machineId';
        this.sqmId = 'someValue.sqmId';
        this.devDeviceId = 'someValue.devDeviceId';
        this.firstSessionDate = 'someValue.firstSessionDate';
        this.sendErrorTelemetry = false;
    }
    setEnabled() { }
    setExperimentProperty() { }
    publicLog() { }
    publicLog2() { }
    publicLogError() { }
    publicLogError2() { }
}
class StandaloneWorkspaceContextService {
    static { this.SCHEME = 'inmemory'; }
    constructor() {
        this._onDidChangeWorkspaceName = new Emitter();
        this.onDidChangeWorkspaceName = this._onDidChangeWorkspaceName.event;
        this._onWillChangeWorkspaceFolders = new Emitter();
        this.onWillChangeWorkspaceFolders = this._onWillChangeWorkspaceFolders.event;
        this._onDidChangeWorkspaceFolders = new Emitter();
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
        this._onDidChangeWorkbenchState = new Emitter();
        this.onDidChangeWorkbenchState = this._onDidChangeWorkbenchState.event;
        const resource = URI.from({ scheme: StandaloneWorkspaceContextService.SCHEME, authority: 'model', path: '/' });
        this.workspace = { id: STANDALONE_EDITOR_WORKSPACE_ID, folders: [new WorkspaceFolder({ uri: resource, name: '', index: 0 })] };
    }
    getCompleteWorkspace() {
        return Promise.resolve(this.getWorkspace());
    }
    getWorkspace() {
        return this.workspace;
    }
    getWorkbenchState() {
        if (this.workspace) {
            if (this.workspace.configuration) {
                return 3 /* WorkbenchState.WORKSPACE */;
            }
            return 2 /* WorkbenchState.FOLDER */;
        }
        return 1 /* WorkbenchState.EMPTY */;
    }
    getWorkspaceFolder(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME ? this.workspace.folders[0] : null;
    }
    isInsideWorkspace(resource) {
        return resource && resource.scheme === StandaloneWorkspaceContextService.SCHEME;
    }
    isCurrentWorkspace(workspaceIdOrFolder) {
        return true;
    }
}
export function updateConfigurationService(configurationService, source, isDiffEditor) {
    if (!source) {
        return;
    }
    if (!(configurationService instanceof StandaloneConfigurationService)) {
        return;
    }
    const toUpdate = [];
    Object.keys(source).forEach((key) => {
        if (isEditorConfigurationKey(key)) {
            toUpdate.push([`editor.${key}`, source[key]]);
        }
        if (isDiffEditor && isDiffEditorConfigurationKey(key)) {
            toUpdate.push([`diffEditor.${key}`, source[key]]);
        }
    });
    if (toUpdate.length > 0) {
        configurationService.updateValues(toUpdate);
    }
}
let StandaloneBulkEditService = class StandaloneBulkEditService {
    constructor(_modelService) {
        this._modelService = _modelService;
        //
    }
    hasPreviewHandler() {
        return false;
    }
    setPreviewHandler() {
        return Disposable.None;
    }
    async apply(editsIn, _options) {
        const edits = Array.isArray(editsIn) ? editsIn : ResourceEdit.convert(editsIn);
        const textEdits = new Map();
        for (const edit of edits) {
            if (!(edit instanceof ResourceTextEdit)) {
                throw new Error('bad edit - only text edits are supported');
            }
            const model = this._modelService.getModel(edit.resource);
            if (!model) {
                throw new Error('bad edit - model not found');
            }
            if (typeof edit.versionId === 'number' && model.getVersionId() !== edit.versionId) {
                throw new Error('bad state - model changed in the meantime');
            }
            let array = textEdits.get(model);
            if (!array) {
                array = [];
                textEdits.set(model, array);
            }
            array.push(EditOperation.replaceMove(Range.lift(edit.textEdit.range), edit.textEdit.text));
        }
        let totalEdits = 0;
        let totalFiles = 0;
        for (const [model, edits] of textEdits) {
            model.pushStackElement();
            model.pushEditOperations([], edits, () => []);
            model.pushStackElement();
            totalFiles += 1;
            totalEdits += edits.length;
        }
        return {
            ariaSummary: strings.format(StandaloneServicesNLS.bulkEditServiceSummary, totalEdits, totalFiles),
            isApplied: totalEdits > 0
        };
    }
};
StandaloneBulkEditService = __decorate([
    __param(0, IModelService)
], StandaloneBulkEditService);
class StandaloneUriLabelService {
    constructor() {
        this.onDidChangeFormatters = Event.None;
    }
    getUriLabel(resource, options) {
        if (resource.scheme === 'file') {
            return resource.fsPath;
        }
        return resource.path;
    }
    getUriBasenameLabel(resource) {
        return basename(resource);
    }
    getWorkspaceLabel(workspace, options) {
        return '';
    }
    getSeparator(scheme, authority) {
        return '/';
    }
    registerFormatter(formatter) {
        throw new Error('Not implemented');
    }
    registerCachedFormatter(formatter) {
        return this.registerFormatter(formatter);
    }
    getHostLabel() {
        return '';
    }
    getHostTooltip() {
        return undefined;
    }
}
let StandaloneContextViewService = class StandaloneContextViewService extends ContextViewService {
    constructor(layoutService, _codeEditorService) {
        super(layoutService);
        this._codeEditorService = _codeEditorService;
    }
    showContextView(delegate, container, shadowRoot) {
        if (!container) {
            const codeEditor = this._codeEditorService.getFocusedCodeEditor() || this._codeEditorService.getActiveCodeEditor();
            if (codeEditor) {
                container = codeEditor.getContainerDomNode();
            }
        }
        return super.showContextView(delegate, container, shadowRoot);
    }
};
StandaloneContextViewService = __decorate([
    __param(0, ILayoutService),
    __param(1, ICodeEditorService)
], StandaloneContextViewService);
class StandaloneWorkspaceTrustManagementService {
    constructor() {
        this._neverEmitter = new Emitter();
        this.onDidChangeTrust = this._neverEmitter.event;
        this.onDidChangeTrustedFolders = this._neverEmitter.event;
        this.workspaceResolved = Promise.resolve();
        this.workspaceTrustInitialized = Promise.resolve();
        this.acceptsOutOfWorkspaceFiles = true;
    }
    isWorkspaceTrusted() {
        return true;
    }
    isWorkspaceTrustForced() {
        return false;
    }
    canSetParentFolderTrust() {
        return false;
    }
    async setParentFolderTrust(trusted) {
        // noop
    }
    canSetWorkspaceTrust() {
        return false;
    }
    async setWorkspaceTrust(trusted) {
        // noop
    }
    getUriTrustInfo(uri) {
        throw new Error('Method not supported.');
    }
    async setUrisTrust(uri, trusted) {
        // noop
    }
    getTrustedUris() {
        return [];
    }
    async setTrustedUris(uris) {
        // noop
    }
    addWorkspaceTrustTransitionParticipant(participant) {
        throw new Error('Method not supported.');
    }
}
class StandaloneLanguageService extends LanguageService {
    constructor() {
        super();
    }
}
class StandaloneLogService extends LogService {
    constructor() {
        super(new ConsoleLogger());
    }
}
let StandaloneContextMenuService = class StandaloneContextMenuService extends ContextMenuService {
    constructor(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService) {
        super(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        this.configure({ blockMouse: false }); // we do not want that in the standalone editor
    }
};
StandaloneContextMenuService = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService),
    __param(2, IContextViewService),
    __param(3, IKeybindingService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], StandaloneContextMenuService);
const standaloneEditorWorkerDescriptor = {
    esmModuleLocation: undefined,
    label: 'editorWorkerService'
};
let StandaloneEditorWorkerService = class StandaloneEditorWorkerService extends EditorWorkerService {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        super(standaloneEditorWorkerDescriptor, modelService, configurationService, logService, languageConfigurationService, languageFeaturesService);
    }
};
StandaloneEditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], StandaloneEditorWorkerService);
class StandaloneAccessbilitySignalService {
    async playSignal(cue, options) {
    }
    async playSignals(cues) {
    }
    getEnabledState(signal, userGesture, modality) {
        return ValueWithChangeEvent.const(false);
    }
    getDelayMs(signal, modality) {
        return 0;
    }
    isSoundEnabled(cue) {
        return false;
    }
    isAnnouncementEnabled(cue) {
        return false;
    }
    onSoundEnabledChanged(cue) {
        return Event.None;
    }
    async playSound(cue, allowManyInParallel) {
    }
    playSignalLoop(cue) {
        return toDisposable(() => { });
    }
}
registerSingleton(ILogService, StandaloneLogService, 0 /* InstantiationType.Eager */);
registerSingleton(IConfigurationService, StandaloneConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourceConfigurationService, StandaloneResourceConfigurationService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextResourcePropertiesService, StandaloneResourcePropertiesService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceContextService, StandaloneWorkspaceContextService, 0 /* InstantiationType.Eager */);
registerSingleton(ILabelService, StandaloneUriLabelService, 0 /* InstantiationType.Eager */);
registerSingleton(ITelemetryService, StandaloneTelemetryService, 0 /* InstantiationType.Eager */);
registerSingleton(IDialogService, StandaloneDialogService, 0 /* InstantiationType.Eager */);
registerSingleton(IEnvironmentService, StandaloneEnvironmentService, 0 /* InstantiationType.Eager */);
registerSingleton(INotificationService, StandaloneNotificationService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerService, MarkerService, 0 /* InstantiationType.Eager */);
registerSingleton(ILanguageService, StandaloneLanguageService, 0 /* InstantiationType.Eager */);
registerSingleton(IStandaloneThemeService, StandaloneThemeService, 0 /* InstantiationType.Eager */);
registerSingleton(IModelService, ModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IMarkerDecorationsService, MarkerDecorationsService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextKeyService, ContextKeyService, 0 /* InstantiationType.Eager */);
registerSingleton(IProgressService, StandaloneProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorProgressService, StandaloneEditorProgressService, 0 /* InstantiationType.Eager */);
registerSingleton(IStorageService, InMemoryStorageService, 0 /* InstantiationType.Eager */);
registerSingleton(IEditorWorkerService, StandaloneEditorWorkerService, 0 /* InstantiationType.Eager */);
registerSingleton(IBulkEditService, StandaloneBulkEditService, 0 /* InstantiationType.Eager */);
registerSingleton(IWorkspaceTrustManagementService, StandaloneWorkspaceTrustManagementService, 0 /* InstantiationType.Eager */);
registerSingleton(ITextModelService, StandaloneTextModelService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilityService, AccessibilityService, 0 /* InstantiationType.Eager */);
registerSingleton(IListService, ListService, 0 /* InstantiationType.Eager */);
registerSingleton(ICommandService, StandaloneCommandService, 0 /* InstantiationType.Eager */);
registerSingleton(IKeybindingService, StandaloneKeybindingService, 0 /* InstantiationType.Eager */);
registerSingleton(IQuickInputService, StandaloneQuickInputService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextViewService, StandaloneContextViewService, 0 /* InstantiationType.Eager */);
registerSingleton(IOpenerService, OpenerService, 0 /* InstantiationType.Eager */);
registerSingleton(IClipboardService, BrowserClipboardService, 0 /* InstantiationType.Eager */);
registerSingleton(IContextMenuService, StandaloneContextMenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IMenuService, MenuService, 0 /* InstantiationType.Eager */);
registerSingleton(IAccessibilitySignalService, StandaloneAccessbilitySignalService, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterLibraryService, StandaloneTreeSitterLibraryService, 0 /* InstantiationType.Eager */);
registerSingleton(ILoggerService, NullLoggerService, 0 /* InstantiationType.Eager */);
/**
 * We don't want to eagerly instantiate services because embedders get a one time chance
 * to override services when they create the first editor.
 */
export var StandaloneServices;
(function (StandaloneServices) {
    const serviceCollection = new ServiceCollection();
    for (const [id, descriptor] of getSingletonServiceDescriptors()) {
        serviceCollection.set(id, descriptor);
    }
    const instantiationService = new InstantiationService(serviceCollection, true);
    serviceCollection.set(IInstantiationService, instantiationService);
    function get(serviceId) {
        if (!initialized) {
            initialize({});
        }
        const r = serviceCollection.get(serviceId);
        if (!r) {
            throw new Error('Missing service ' + serviceId);
        }
        if (r instanceof SyncDescriptor) {
            return instantiationService.invokeFunction((accessor) => accessor.get(serviceId));
        }
        else {
            return r;
        }
    }
    StandaloneServices.get = get;
    let initialized = false;
    const onDidInitialize = new Emitter();
    function initialize(overrides) {
        if (initialized) {
            return instantiationService;
        }
        initialized = true;
        // Add singletons that were registered after this module loaded
        for (const [id, descriptor] of getSingletonServiceDescriptors()) {
            if (!serviceCollection.get(id)) {
                serviceCollection.set(id, descriptor);
            }
        }
        // Initialize the service collection with the overrides, but only if the
        // service was not instantiated in the meantime.
        for (const serviceId in overrides) {
            if (overrides.hasOwnProperty(serviceId)) {
                const serviceIdentifier = createDecorator(serviceId);
                const r = serviceCollection.get(serviceIdentifier);
                if (r instanceof SyncDescriptor) {
                    serviceCollection.set(serviceIdentifier, overrides[serviceId]);
                }
            }
        }
        // Instantiate all editor features
        const editorFeatures = getEditorFeatures();
        for (const feature of editorFeatures) {
            try {
                instantiationService.createInstance(feature);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        onDidInitialize.fire();
        return instantiationService;
    }
    StandaloneServices.initialize = initialize;
    /**
     * Executes callback once services are initialized.
     */
    function withServices(callback) {
        if (initialized) {
            return callback();
        }
        const disposable = new DisposableStore();
        const listener = disposable.add(onDidInitialize.event(() => {
            listener.dispose();
            disposable.add(callback());
        }));
        return disposable;
    }
    StandaloneServices.withServices = withServices;
})(StandaloneServices || (StandaloneServices = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sOEJBQThCLENBQUM7QUFDdEMsT0FBTyxzREFBc0QsQ0FBQztBQUM5RCxPQUFPLGtEQUFrRCxDQUFDO0FBQzFELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8sb0RBQW9ELENBQUM7QUFFNUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUF5QixvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVHLE9BQU8sRUFBc0IsWUFBWSxFQUFjLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckgsT0FBTyxFQUEyQixpQkFBaUIsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlKLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQXFDLGdCQUFnQixFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2hKLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzFILE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sb0NBQW9DLENBQUM7QUFDekYsT0FBTyxFQUFhLFFBQVEsSUFBSSxHQUFHLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBdUQsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsOEJBQThCLEVBQXlDLE1BQU0sb0RBQW9ELENBQUM7QUFDOUssT0FBTyxFQUFFLGdCQUFnQixFQUFrQyxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsSSxPQUFPLEVBQTBFLHFCQUFxQixFQUFpRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3ZPLE9BQU8sRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM1SSxPQUFPLEVBQUUsa0JBQWtCLEVBQXdCLE1BQU0sbURBQW1ELENBQUM7QUFDN0csT0FBTyxFQUFzQyxjQUFjLEVBQXVJLE1BQU0sNkNBQTZDLENBQUM7QUFDdFAsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBcUIsTUFBTSx5REFBeUQsQ0FBQztBQUNwSSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUM3RyxPQUFPLEVBQUUsa0JBQWtCLEVBQWlELE1BQU0sbURBQW1ELENBQUM7QUFDdEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDL0YsT0FBTyxFQUFtQixtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQTRELE1BQU0seUNBQXlDLENBQUM7QUFDbEksT0FBTyxFQUFzQyxvQkFBb0IsRUFBaUMsZ0JBQWdCLEVBQXlFLG1CQUFtQixFQUFpQixNQUFNLHVEQUF1RCxDQUFDO0FBQzdSLE9BQU8sRUFBbUIsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQXVKLE1BQU0sK0NBQStDLENBQUM7QUFDL1EsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3BHLE9BQU8sRUFBc0Usd0JBQXdCLEVBQW9HLGVBQWUsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xULE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdDQUFnQyxFQUFnRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RLLE9BQU8sRUFBRSxtQkFBbUIsRUFBd0IsbUJBQW1CLEVBQW9CLE1BQU0sc0RBQXNELENBQUM7QUFDeEosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSw4QkFBOEIsRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1SSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWhHLE9BQU8sRUFBOEMsMkJBQTJCLEVBQVMsTUFBTSw2RUFBNkUsQ0FBQztBQUM3SyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFpQixtQkFBbUIsRUFBNkIsTUFBTSxxREFBcUQsQ0FBQztBQUNwSSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRTFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTdGLE1BQU0sV0FBVztJQUtoQixZQUFZLEtBQWlCO1FBeUJyQixhQUFRLEdBQUcsS0FBSyxDQUFDO1FBeEJ4QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7SUFDM0MsQ0FBQztJQUVELElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO0lBQ2xDLENBQUM7SUFFTSxPQUFPO1FBQ2IsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQVcsZUFBZTtRQUN6QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDbkIsQ0FBQztJQUVNLGNBQWM7UUFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFFTSxVQUFVO1FBQ2hCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUdNLE9BQU87UUFDYixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUVyQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTSxVQUFVO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEwQjtJQUcvQixZQUNpQyxZQUEyQjtRQUEzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUN4RCxDQUFDO0lBRUUsb0JBQW9CLENBQUMsUUFBYTtRQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVNLGdDQUFnQyxDQUFDLE1BQWMsRUFBRSxRQUFtQztRQUMxRixPQUFPO1lBQ04sT0FBTyxFQUFFLGNBQTBCLENBQUM7U0FDcEMsQ0FBQztJQUNILENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxRQUFhO1FBQ3JDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNELENBQUE7QUExQkssMEJBQTBCO0lBSTdCLFdBQUEsYUFBYSxDQUFBO0dBSlYsMEJBQTBCLENBMEIvQjtBQUVELE1BQU0sK0JBQStCO2FBR3JCLHlCQUFvQixHQUFvQjtRQUN0RCxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztRQUNmLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO1FBQ2hCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0tBQ2pCLENBQUM7SUFJRixJQUFJO1FBQ0gsT0FBTywrQkFBK0IsQ0FBQyxvQkFBb0IsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFxQixFQUFFLEtBQWM7UUFDcEQsTUFBTSxPQUFPLENBQUM7SUFDZixDQUFDOztBQUdGLE1BQU0seUJBQXlCO0lBSTlCLFlBQVksQ0FBSSxRQUF1SSxFQUFFLElBQXdELEVBQUUsV0FBaUU7UUFDblIsT0FBTyxJQUFJLENBQUM7WUFDWCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLDRCQUE0QjtJQUFsQztRQUlVLGtCQUFhLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDaEYsd0JBQW1CLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUM1RiwyQkFBc0IsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xHLGlCQUFZLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDOUUsMkJBQXNCLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNsRyx5QkFBb0IsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLHFCQUFnQixHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdEYsY0FBUyxHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLHFCQUFnQixHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDdEYsU0FBSSxHQUE2QixTQUFTLENBQUM7UUFDM0MsZUFBVSxHQUF3QixTQUFTLENBQUM7UUFDNUMsa0JBQWEsR0FBd0IsU0FBUyxDQUFDO1FBQy9DLHVCQUFrQixHQUE4QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQzdFLDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUN4QyxzQkFBaUIsR0FBdUIsS0FBSyxDQUFDO1FBQzlDLHVCQUFrQixHQUFZLEtBQUssQ0FBQztRQUNwQyxxQkFBZ0IsR0FBbUMsU0FBUyxDQUFDO1FBQzdELG9DQUErQixHQUF1QixTQUFTLENBQUM7UUFDaEUsNkJBQXdCLEdBQWlDLFNBQVMsQ0FBQztRQUNuRSw4QkFBeUIsR0FBcUIsU0FBUyxDQUFDO1FBQ3hELGFBQVEsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0RSxhQUFRLEdBQXdCLFNBQVMsQ0FBQztRQUMxQyxzQkFBaUIsR0FBb0MsU0FBUyxDQUFDO1FBQy9ELFlBQU8sR0FBWSxLQUFLLENBQUM7UUFDekIsWUFBTyxHQUFZLEtBQUssQ0FBQztRQUN6QixxQkFBZ0IsR0FBWSxLQUFLLENBQUM7UUFDbEMsNkJBQXdCLEdBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN0RyxlQUFVLEdBQXFCLFNBQVMsQ0FBQztJQUNuRCxDQUFDO0NBQUE7QUFFRCxNQUFNLHVCQUF1QjtJQUE3QjtRQUlVLHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDOUIsb0JBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBeUR2QyxDQUFDO0lBdkRBLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBMkI7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU1RSxPQUFPO1lBQ04sU0FBUztZQUNULGVBQWUsRUFBRSxLQUFLLENBQUMsY0FBYztTQUNyQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLFNBQVMsQ0FBQyxPQUFlLEVBQUUsTUFBZTtRQUNqRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUM7UUFDMUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLFdBQVcsR0FBRyxXQUFXLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUM3QyxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFLRCxLQUFLLENBQUMsTUFBTSxDQUFJLE1BQStDO1FBQzlELElBQUksTUFBTSxHQUFrQixTQUFTLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxhQUFhLEdBQTJCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxRSxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hILGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3pDLENBQUM7WUFFRCxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFlLEVBQUUsTUFBZTtRQUMxQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFlLEVBQUUsTUFBZTtRQUMxQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFlLEVBQUUsTUFBZTtRQUMzQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYztJQUM3RCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQTZCO0lBQTFDO1FBRVUsc0JBQWlCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFxRHRELENBQUM7YUFqRHdCLFVBQUssR0FBd0IsSUFBSSxnQkFBZ0IsRUFBRSxBQUE5QyxDQUErQztJQUVyRSxJQUFJLENBQUMsT0FBZTtRQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFTSxJQUFJLENBQUMsT0FBZTtRQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFTSxLQUFLLENBQUMsS0FBcUI7UUFDakMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxZQUEyQjtRQUN4QyxRQUFRLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMvQixLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDcEMsTUFBTTtZQUNQLEtBQUssUUFBUSxDQUFDLE9BQU87Z0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuQyxNQUFNO1lBQ1A7Z0JBQ0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2xDLE1BQU07UUFDUixDQUFDO1FBRUQsT0FBTyw2QkFBNkIsQ0FBQyxLQUFLLENBQUM7SUFDNUMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFrQixFQUFFLE9BQWUsRUFBRSxPQUF3QixFQUFFLE9BQXdCO1FBQ3BHLE9BQU8sNkJBQTZCLENBQUMsS0FBSyxDQUFDO0lBQzVDLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBdUIsRUFBRSxPQUErQjtRQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFTSxTQUFTLENBQUMsTUFBdUQsSUFBVSxDQUFDO0lBRTVFLFNBQVMsQ0FBQyxNQUE0QjtRQUM1QyxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUNoQyxDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxZQUFZLENBQUMsUUFBZ0IsSUFBVSxDQUFDOztBQUd6QyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3QjtJQVVwQyxZQUN3QixvQkFBMkM7UUFObEQsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUM7UUFDckQseUJBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUM7UUFDckQseUJBQW9CLEdBQXlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFDOUUsd0JBQW1CLEdBQXlCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7UUFLM0YsSUFBSSxDQUFDLHFCQUFxQixHQUFHLG9CQUFvQixDQUFDO0lBQ25ELENBQUM7SUFFTSxjQUFjLENBQUksRUFBVSxFQUFFLEdBQUcsSUFBVztRQUNsRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBTSxDQUFDO1lBRTVILElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDeEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWhDWSx3QkFBd0I7SUFXbEMsV0FBQSxxQkFBcUIsQ0FBQTtHQVhYLHdCQUF3QixDQWdDcEM7O0FBU00sSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSx5QkFBeUI7SUFLekUsWUFDcUIsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzdCLGdCQUFtQyxFQUNoQyxtQkFBeUMsRUFDbEQsVUFBdUIsRUFDaEIsaUJBQXFDO1FBRXpELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFNUYsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBRTVCLE1BQU0sWUFBWSxHQUFHLENBQUMsT0FBb0IsRUFBRSxFQUFFO1lBQzdDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7WUFFMUMsMkJBQTJCO1lBQzNCLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQWdCLEVBQUUsRUFBRTtnQkFDL0YsTUFBTSxRQUFRLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZFLElBQUksb0JBQW9CLEVBQUUsQ0FBQztvQkFDMUIsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUMxQixRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQzVCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUosMkRBQTJEO1lBQzNELFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQWdCLEVBQUUsRUFBRTtnQkFDN0YsTUFBTSxRQUFRLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDckYsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO29CQUMxQixRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzNCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUosSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQztRQUNGLE1BQU0sZUFBZSxHQUFHLENBQUMsT0FBb0IsRUFBRSxFQUFFO1lBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLGdCQUFnQixDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsVUFBdUIsRUFBRSxFQUFFO1lBQ2pELElBQUksVUFBVSxDQUFDLFNBQVMsb0NBQTJCLEVBQUUsQ0FBQztnQkFDckQsT0FBTztZQUNSLENBQUM7WUFDRCxZQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUM7UUFDRixNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBdUIsRUFBRSxFQUFFO1lBQ3BELElBQUksVUFBVSxDQUFDLFNBQVMsb0NBQTJCLEVBQUUsQ0FBQztnQkFDckQsT0FBTztZQUNSLENBQUM7WUFDRCxlQUFlLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUUzRCxNQUFNLGFBQWEsR0FBRyxDQUFDLFVBQXVCLEVBQUUsRUFBRTtZQUNqRCxZQUFZLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUM7UUFDRixNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBdUIsRUFBRSxFQUFFO1lBQ3BELGVBQWUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDdkUsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxPQUFlLEVBQUUsVUFBa0IsRUFBRSxPQUF3QixFQUFFLElBQXNDO1FBQ2hJLE9BQU8sa0JBQWtCLENBQ3hCLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEVBQ2xELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO2dCQUMzQixVQUFVO2dCQUNWLE9BQU87Z0JBQ1AsSUFBSTthQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSCxDQUFDO0lBRU0scUJBQXFCLENBQUMsS0FBd0I7UUFDcEQsTUFBTSxPQUFPLEdBQXNCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyRCxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELE9BQU87Z0JBQ04sVUFBVTtnQkFDVixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJO2dCQUM3QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsQ0FBQztnQkFDVixXQUFXLEVBQUUsSUFBSTtnQkFDakIsa0JBQWtCLEVBQUUsS0FBSzthQUN6QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVwRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFdEIsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLDJFQUEyRTtZQUMzRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMxRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDaEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNuRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3RCLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRVMsWUFBWTtRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckYsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdCLENBQUM7SUFFUyxpQkFBaUI7UUFDMUIsT0FBTyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxLQUF3QixFQUFFLFNBQWtCO1FBQ2hGLE1BQU0sTUFBTSxHQUE2QixFQUFFLENBQUM7UUFDNUMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTLENBQUM7WUFDcEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUVuQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLHdFQUF3RTtnQkFDeEUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLG1CQUFtQixHQUFHLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDekYsS0FBSyxNQUFNLGtCQUFrQixJQUFJLG1CQUFtQixFQUFFLENBQUM7b0JBQ3RELE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksc0JBQXNCLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNwSSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxVQUFzQjtRQUM5QyxPQUFPLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRU0sb0JBQW9CLENBQUMsYUFBNkI7UUFDeEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQzdCLGFBQWEsQ0FBQyxPQUFPLEVBQ3JCLGFBQWEsQ0FBQyxRQUFRLEVBQ3RCLGFBQWEsQ0FBQyxNQUFNLEVBQ3BCLGFBQWEsQ0FBQyxPQUFPLEVBQ3JCLGFBQWEsQ0FBQyxPQUFPLENBQ3JCLENBQUM7UUFDRixPQUFPLElBQUksMEJBQTBCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsV0FBbUI7UUFDNUMsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU0sY0FBYztRQUNwQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxrQkFBa0I7UUFDeEIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRU0sMEJBQTBCLENBQUMsWUFBMkM7UUFDNUUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNhLHdCQUF3QixDQUFDLFNBQWlCO1FBQ3pELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBck1ZLDJCQUEyQjtJQU1yQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxrQkFBa0IsQ0FBQTtHQVhSLDJCQUEyQixDQXFNdkM7O0FBRUQsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBQ3hDLFlBQ2lCLE9BQW9CLEVBQ3BDLFdBQTRCO1FBRTVCLEtBQUssRUFBRSxDQUFDO1FBSFEsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUlwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7Q0FDRDtBQUVELFNBQVMsd0JBQXdCLENBQUMsS0FBVTtJQUMzQyxPQUFPLEtBQUs7V0FDUixPQUFPLEtBQUssS0FBSyxRQUFRO1dBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksT0FBTyxLQUFLLENBQUMsa0JBQWtCLEtBQUssUUFBUSxDQUFDO1dBQzNFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUVNLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO0lBUzFDLFlBQ2MsVUFBd0M7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQU5yQyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBNkIsQ0FBQztRQUN0RSw2QkFBd0IsR0FBcUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQztRQU9qSCxNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGFBQWEsQ0FDdEMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLEVBQzdCLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUMvQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFDL0Msa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQy9DLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUMvQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFDL0MsSUFBSSxXQUFXLEVBQXNCLEVBQ3JDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUMvQyxJQUFJLFdBQVcsRUFBc0IsRUFDckMsVUFBVSxDQUNWLENBQUM7UUFDRixvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBTUQsUUFBUSxDQUFDLElBQVUsRUFBRSxJQUFVO1FBQzlCLE1BQU0sT0FBTyxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDNUQsTUFBTSxTQUFTLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3JHLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU0sWUFBWSxDQUFDLE1BQXVCO1FBQzFDLE1BQU0sUUFBUSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUV4RCxNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7UUFFakMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUMzQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLFNBQVM7WUFDVixDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLHdCQUF3QixHQUFHLElBQUksd0JBQXdCLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQy9KLHdCQUF3QixDQUFDLE1BQU0scUNBQTZCLENBQUM7WUFDN0QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU0sV0FBVyxDQUFDLEdBQVcsRUFBRSxLQUFVLEVBQUUsSUFBVSxFQUFFLElBQVU7UUFDakUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTSxPQUFPLENBQUksR0FBVyxFQUFFLFVBQW1DLEVBQUU7UUFDbkUsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBSSxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFTSxJQUFJO1FBQ1YsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRU0sbUJBQW1CO1FBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRU0sb0JBQW9CO1FBQzFCLE1BQU0sVUFBVSxHQUF3QjtZQUN2QyxRQUFRLEVBQUUsRUFBRTtZQUNaLElBQUksRUFBRSxFQUFFO1lBQ1IsU0FBUyxFQUFFLEVBQUU7U0FDYixDQUFDO1FBQ0YsT0FBTztZQUNOLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLFdBQVcsRUFBRSxVQUFVO1lBQ3ZCLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLE9BQU8sRUFBRSxFQUFFO1NBQ1gsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBN0ZZLDhCQUE4QjtJQVV4QyxXQUFBLFdBQVcsQ0FBQTtHQVZELDhCQUE4QixDQTZGMUM7O0FBRUQsSUFBTSxzQ0FBc0MsR0FBNUMsTUFBTSxzQ0FBc0M7SUFPM0MsWUFDd0Isb0JBQXFFLEVBQzdFLFlBQTRDLEVBQ3pDLGVBQWtEO1FBRjVCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBZ0M7UUFDNUQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBTnBELDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUF5QyxDQUFDO1FBQ2xGLDZCQUF3QixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFPL0UsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLG9CQUFvQixFQUFFLENBQUMsUUFBYSxFQUFFLGFBQXFCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUssQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBSUQsUUFBUSxDQUFJLFFBQXlCLEVBQUUsSUFBVSxFQUFFLElBQVU7UUFDNUQsTUFBTSxRQUFRLEdBQXFCLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3ZFLE1BQU0sT0FBTyxHQUF1QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3SSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDN0UsSUFBSSxPQUFPLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUk7Z0JBQzVDLFFBQVE7Z0JBQ1Isa0JBQWtCLEVBQUUsUUFBUTthQUM1QixDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFJLE9BQU8sRUFBRTtZQUNyRCxRQUFRO1lBQ1Isa0JBQWtCLEVBQUUsUUFBUTtTQUM1QixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTyxDQUFJLFFBQXlCLEVBQUUsUUFBMEIsRUFBRSxPQUFlO1FBQ2hGLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM3RSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUksT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVPLFdBQVcsQ0FBQyxRQUFhLEVBQUUsUUFBMEI7UUFDNUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvRyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLG9DQUFvQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBYSxFQUFFLEdBQVcsRUFBRSxLQUFVLEVBQUUsbUJBQXlDO1FBQzVGLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUM3RixDQUFDO0NBQ0QsQ0FBQTtBQW5ESyxzQ0FBc0M7SUFRekMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7R0FWYixzQ0FBc0MsQ0FtRDNDO0FBRUQsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBbUM7SUFJeEMsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFFcEYsQ0FBQztJQUVELE1BQU0sQ0FBQyxRQUFhLEVBQUUsUUFBaUI7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN4RyxJQUFJLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3RELE9BQU8sR0FBRyxDQUFDO1FBQ1osQ0FBQztRQUNELE9BQU8sQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ2pELENBQUM7Q0FDRCxDQUFBO0FBaEJLLG1DQUFtQztJQUt0QyxXQUFBLHFCQUFxQixDQUFBO0dBTGxCLG1DQUFtQyxDQWdCeEM7QUFFRCxNQUFNLDBCQUEwQjtJQUFoQztRQUVVLG1CQUFjLCtCQUF1QjtRQUNyQyxjQUFTLEdBQUcscUJBQXFCLENBQUM7UUFDbEMsY0FBUyxHQUFHLHFCQUFxQixDQUFDO1FBQ2xDLFVBQUssR0FBRyxpQkFBaUIsQ0FBQztRQUMxQixnQkFBVyxHQUFHLHVCQUF1QixDQUFDO1FBQ3RDLHFCQUFnQixHQUFHLDRCQUE0QixDQUFDO1FBQ2hELHVCQUFrQixHQUFHLEtBQUssQ0FBQztJQU9yQyxDQUFDO0lBTkEsVUFBVSxLQUFXLENBQUM7SUFDdEIscUJBQXFCLEtBQVcsQ0FBQztJQUNqQyxTQUFTLEtBQUssQ0FBQztJQUNmLFVBQVUsS0FBSyxDQUFDO0lBQ2hCLGNBQWMsS0FBSyxDQUFDO0lBQ3BCLGVBQWUsS0FBSyxDQUFDO0NBQ3JCO0FBRUQsTUFBTSxpQ0FBaUM7YUFJZCxXQUFNLEdBQUcsVUFBVSxBQUFiLENBQWM7SUFnQjVDO1FBZGlCLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDakQsNkJBQXdCLEdBQWdCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7UUFFNUUsa0NBQTZCLEdBQUcsSUFBSSxPQUFPLEVBQW9DLENBQUM7UUFDakYsaUNBQTRCLEdBQTRDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUM7UUFFaEgsaUNBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQWdDLENBQUM7UUFDNUUsZ0NBQTJCLEdBQXdDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUM7UUFFMUcsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQWtCLENBQUM7UUFDNUQsOEJBQXlCLEdBQTBCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFLeEcsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxpQ0FBaUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMvRyxJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsRUFBRSxFQUFFLDhCQUE4QixFQUFFLE9BQU8sRUFBRSxDQUFDLElBQUksZUFBZSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNoSSxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2xDLHdDQUFnQztZQUNqQyxDQUFDO1lBQ0QscUNBQTZCO1FBQzlCLENBQUM7UUFDRCxvQ0FBNEI7SUFDN0IsQ0FBQztJQUVNLGtCQUFrQixDQUFDLFFBQWE7UUFDdEMsT0FBTyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDcEgsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFFBQWE7UUFDckMsT0FBTyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUM7SUFDakYsQ0FBQztJQUVNLGtCQUFrQixDQUFDLG1CQUFrRjtRQUMzRyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7O0FBR0YsTUFBTSxVQUFVLDBCQUEwQixDQUFDLG9CQUEyQyxFQUFFLE1BQVcsRUFBRSxZQUFxQjtJQUN6SCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPO0lBQ1IsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixZQUFZLDhCQUE4QixDQUFDLEVBQUUsQ0FBQztRQUN2RSxPQUFPO0lBQ1IsQ0FBQztJQUNELE1BQU0sUUFBUSxHQUFvQixFQUFFLENBQUM7SUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUNuQyxJQUFJLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsSUFBSSxZQUFZLElBQUksNEJBQTRCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2RCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUNILElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixvQkFBb0IsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0MsQ0FBQztBQUNGLENBQUM7QUFFRCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5QjtJQUc5QixZQUNpQyxhQUE0QjtRQUE1QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUU1RCxFQUFFO0lBQ0gsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQXVDLEVBQUUsUUFBMkI7UUFDL0UsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBRWhFLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ25GLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztZQUM5RCxDQUFDO1lBQ0QsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDWCxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM3QixDQUFDO1lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUYsQ0FBQztRQUdELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLFVBQVUsSUFBSSxDQUFDLENBQUM7WUFDaEIsVUFBVSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDNUIsQ0FBQztRQUVELE9BQU87WUFDTixXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDO1lBQ2pHLFNBQVMsRUFBRSxVQUFVLEdBQUcsQ0FBQztTQUN6QixDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUF4REsseUJBQXlCO0lBSTVCLFdBQUEsYUFBYSxDQUFBO0dBSlYseUJBQXlCLENBd0Q5QjtBQUVELE1BQU0seUJBQXlCO0lBQS9CO1FBSWlCLDBCQUFxQixHQUFpQyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBb0NsRixDQUFDO0lBbENPLFdBQVcsQ0FBQyxRQUFhLEVBQUUsT0FBMEQ7UUFDM0YsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN4QixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxRQUFhO1FBQ2hDLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxTQUFxRixFQUFFLE9BQWdDO1FBQy9JLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVNLFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBa0I7UUFDckQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRU0saUJBQWlCLENBQUMsU0FBaUM7UUFDekQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFTSx1QkFBdUIsQ0FBQyxTQUFpQztRQUMvRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7Q0FDRDtBQUdELElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsa0JBQWtCO0lBRTVELFlBQ2lCLGFBQTZCLEVBQ1Isa0JBQXNDO1FBRTNFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUZnQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO0lBRzVFLENBQUM7SUFFUSxlQUFlLENBQUMsUUFBOEIsRUFBRSxTQUF1QixFQUFFLFVBQW9CO1FBQ3JHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNuSCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixTQUFTLEdBQUcsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMvRCxDQUFDO0NBQ0QsQ0FBQTtBQWxCSyw0QkFBNEI7SUFHL0IsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGtCQUFrQixDQUFBO0dBSmYsNEJBQTRCLENBa0JqQztBQUVELE1BQU0seUNBQXlDO0lBQS9DO1FBR1Msa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBUyxDQUFDO1FBQzdCLHFCQUFnQixHQUFtQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztRQUM1RSw4QkFBeUIsR0FBZ0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFDbEQsc0JBQWlCLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RDLDhCQUF5QixHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM5QywrQkFBMEIsR0FBRyxJQUFJLENBQUM7SUFtQ25ELENBQUM7SUFqQ0Esa0JBQWtCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNELHNCQUFzQjtRQUNyQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFDRCx1QkFBdUI7UUFDdEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQWdCO1FBQzFDLE9BQU87SUFDUixDQUFDO0lBQ0Qsb0JBQW9CO1FBQ25CLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFnQjtRQUN2QyxPQUFPO0lBQ1IsQ0FBQztJQUNELGVBQWUsQ0FBQyxHQUFRO1FBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFVLEVBQUUsT0FBZ0I7UUFDOUMsT0FBTztJQUNSLENBQUM7SUFDRCxjQUFjO1FBQ2IsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBQ0QsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFXO1FBQy9CLE9BQU87SUFDUixDQUFDO0lBQ0Qsc0NBQXNDLENBQUMsV0FBaUQ7UUFDdkYsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRDtBQUVELE1BQU0seUJBQTBCLFNBQVEsZUFBZTtJQUN0RDtRQUNDLEtBQUssRUFBRSxDQUFDO0lBQ1QsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBQzVDO1FBQ0MsS0FBSyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0Q7QUFFRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLGtCQUFrQjtJQUM1RCxZQUNvQixnQkFBbUMsRUFDaEMsbUJBQXlDLEVBQzFDLGtCQUF1QyxFQUN4QyxpQkFBcUMsRUFDM0MsV0FBeUIsRUFDbkIsaUJBQXFDO1FBRXpELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNwSCxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQywrQ0FBK0M7SUFDdkYsQ0FBQztDQUNELENBQUE7QUFaSyw0QkFBNEI7SUFFL0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FQZiw0QkFBNEIsQ0FZakM7QUFFRCxNQUFNLGdDQUFnQyxHQUF5QjtJQUM5RCxpQkFBaUIsRUFBRSxTQUFTO0lBQzVCLEtBQUssRUFBRSxxQkFBcUI7Q0FDNUIsQ0FBQztBQUVGLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsbUJBQW1CO0lBQzlELFlBQ2dCLFlBQTJCLEVBQ1Asb0JBQXVELEVBQzdFLFVBQXVCLEVBQ0wsNEJBQTJELEVBQ2hFLHVCQUFpRDtRQUUzRSxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSw0QkFBNEIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ2hKLENBQUM7Q0FDRCxDQUFBO0FBVkssNkJBQTZCO0lBRWhDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNkJBQTZCLENBQUE7SUFDN0IsV0FBQSx3QkFBd0IsQ0FBQTtHQU5yQiw2QkFBNkIsQ0FVbEM7QUFFRCxNQUFNLG1DQUFtQztJQUV4QyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQXdCLEVBQUUsT0FBVztJQUN0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUEyQjtJQUM3QyxDQUFDO0lBRUQsZUFBZSxDQUFDLE1BQTJCLEVBQUUsV0FBb0IsRUFBRSxRQUE0QztRQUM5RyxPQUFPLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE1BQTJCLEVBQUUsUUFBK0I7UUFDdEUsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsY0FBYyxDQUFDLEdBQXdCO1FBQ3RDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELHFCQUFxQixDQUFDLEdBQXdCO1FBQzdDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELHFCQUFxQixDQUFDLEdBQXdCO1FBQzdDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFVLEVBQUUsbUJBQXlDO0lBQ3JFLENBQUM7SUFDRCxjQUFjLENBQUMsR0FBd0I7UUFDdEMsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNEO0FBT0QsaUJBQWlCLENBQUMsV0FBVyxFQUFFLG9CQUFvQixrQ0FBMEIsQ0FBQztBQUM5RSxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSw4QkFBOEIsa0NBQTBCLENBQUM7QUFDbEcsaUJBQWlCLENBQUMsaUNBQWlDLEVBQUUsc0NBQXNDLGtDQUEwQixDQUFDO0FBQ3RILGlCQUFpQixDQUFDLDhCQUE4QixFQUFFLG1DQUFtQyxrQ0FBMEIsQ0FBQztBQUNoSCxpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSxpQ0FBaUMsa0NBQTBCLENBQUM7QUFDeEcsaUJBQWlCLENBQUMsYUFBYSxFQUFFLHlCQUF5QixrQ0FBMEIsQ0FBQztBQUNyRixpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSwwQkFBMEIsa0NBQTBCLENBQUM7QUFDMUYsaUJBQWlCLENBQUMsY0FBYyxFQUFFLHVCQUF1QixrQ0FBMEIsQ0FBQztBQUNwRixpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSw0QkFBNEIsa0NBQTBCLENBQUM7QUFDOUYsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsNkJBQTZCLGtDQUEwQixDQUFDO0FBQ2hHLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxhQUFhLGtDQUEwQixDQUFDO0FBQzFFLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixrQ0FBMEIsQ0FBQztBQUN4RixpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxzQkFBc0Isa0NBQTBCLENBQUM7QUFDNUYsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFlBQVksa0NBQTBCLENBQUM7QUFDeEUsaUJBQWlCLENBQUMseUJBQXlCLEVBQUUsd0JBQXdCLGtDQUEwQixDQUFDO0FBQ2hHLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixrQ0FBMEIsQ0FBQztBQUNsRixpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSx5QkFBeUIsa0NBQTBCLENBQUM7QUFDeEYsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsK0JBQStCLGtDQUEwQixDQUFDO0FBQ3BHLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxzQkFBc0Isa0NBQTBCLENBQUM7QUFDcEYsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsNkJBQTZCLGtDQUEwQixDQUFDO0FBQ2hHLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLHlCQUF5QixrQ0FBMEIsQ0FBQztBQUN4RixpQkFBaUIsQ0FBQyxnQ0FBZ0MsRUFBRSx5Q0FBeUMsa0NBQTBCLENBQUM7QUFDeEgsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsMEJBQTBCLGtDQUEwQixDQUFDO0FBQzFGLGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixrQ0FBMEIsQ0FBQztBQUN4RixpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxrQ0FBMEIsQ0FBQztBQUN0RSxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLGtDQUEwQixDQUFDO0FBQ3RGLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLDJCQUEyQixrQ0FBMEIsQ0FBQztBQUM1RixpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSwyQkFBMkIsa0NBQTBCLENBQUM7QUFDNUYsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsNEJBQTRCLGtDQUEwQixDQUFDO0FBQzlGLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxhQUFhLGtDQUEwQixDQUFDO0FBQzFFLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixrQ0FBMEIsQ0FBQztBQUN2RixpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSw0QkFBNEIsa0NBQTBCLENBQUM7QUFDOUYsaUJBQWlCLENBQUMsWUFBWSxFQUFFLFdBQVcsa0NBQTBCLENBQUM7QUFDdEUsaUJBQWlCLENBQUMsMkJBQTJCLEVBQUUsbUNBQW1DLGtDQUEwQixDQUFDO0FBQzdHLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLGtDQUFrQyxrQ0FBMEIsQ0FBQztBQUMxRyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLGtDQUEwQixDQUFDO0FBRTlFOzs7R0FHRztBQUNILE1BQU0sS0FBUSxrQkFBa0IsQ0FxRi9CO0FBckZELFdBQWMsa0JBQWtCO0lBRS9CLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO0lBQ2xELEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsSUFBSSw4QkFBOEIsRUFBRSxFQUFFLENBQUM7UUFDakUsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9FLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBRW5FLFNBQWdCLEdBQUcsQ0FBSSxTQUErQjtRQUNyRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksY0FBYyxFQUFFLENBQUM7WUFDakMsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNuRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNGLENBQUM7SUFiZSxzQkFBRyxNQWFsQixDQUFBO0lBRUQsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLE1BQU0sZUFBZSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7SUFDNUMsU0FBZ0IsVUFBVSxDQUFDLFNBQWtDO1FBQzVELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxvQkFBb0IsQ0FBQztRQUM3QixDQUFDO1FBQ0QsV0FBVyxHQUFHLElBQUksQ0FBQztRQUVuQiwrREFBK0Q7UUFDL0QsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxJQUFJLDhCQUE4QixFQUFFLEVBQUUsQ0FBQztZQUNqRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCx3RUFBd0U7UUFDeEUsZ0RBQWdEO1FBQ2hELEtBQUssTUFBTSxTQUFTLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbkMsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNyRCxNQUFNLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLFlBQVksY0FBYyxFQUFFLENBQUM7b0JBQ2pDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDaEUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLE9BQU8sSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUM7Z0JBQ0osb0JBQW9CLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlDLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXZCLE9BQU8sb0JBQW9CLENBQUM7SUFDN0IsQ0FBQztJQXRDZSw2QkFBVSxhQXNDekIsQ0FBQTtJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsWUFBWSxDQUFDLFFBQTJCO1FBQ3ZELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxRQUFRLEVBQUUsQ0FBQztRQUNuQixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUV6QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQzFELFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFiZSwrQkFBWSxlQWEzQixDQUFBO0FBRUYsQ0FBQyxFQXJGYSxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBcUYvQiJ9