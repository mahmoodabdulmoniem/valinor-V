/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import * as errors from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { combinedDisposable } from '../../../base/common/lifecycle.js';
import { Schemas, matchesScheme } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { TextEditorCursorStyle } from '../../../editor/common/config/editorOptions.js';
import { score, targetsNotebooks } from '../../../editor/common/languageSelector.js';
import * as languageConfiguration from '../../../editor/common/languages/languageConfiguration.js';
import { OverviewRulerLane } from '../../../editor/common/model.js';
import { ExtensionError, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import * as files from '../../../platform/files/common/files.js';
import { ILogService, ILoggerService, LogLevel } from '../../../platform/log/common/log.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { TelemetryTrustedValue } from '../../../platform/telemetry/common/telemetryUtils.js';
import { EditSessionIdentityMatch } from '../../../platform/workspace/common/editSessions.js';
import { DebugConfigurationProviderTriggerKind } from '../../contrib/debug/common/debug.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExcludeSettingOptions, TextSearchCompleteMessageType, TextSearchContext2, TextSearchMatch2, AISearchKeyword } from '../../services/search/common/searchExtTypes.js';
import { CandidatePortSource, ExtHostContext, MainContext } from './extHost.protocol.js';
import { ExtHostRelatedInformation } from './extHostAiRelatedInformation.js';
import { ExtHostApiCommands } from './extHostApiCommands.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { IExtHostAuthentication } from './extHostAuthentication.js';
import { ExtHostBulkEdits } from './extHostBulkEdits.js';
import { ExtHostChatAgents2 } from './extHostChatAgents2.js';
import { ExtHostChatStatus } from './extHostChatStatus.js';
import { ExtHostClipboard } from './extHostClipboard.js';
import { ExtHostEditorInsets } from './extHostCodeInsets.js';
import { ExtHostCodeMapper } from './extHostCodeMapper.js';
import { IExtHostCommands } from './extHostCommands.js';
import { createExtHostComments } from './extHostComments.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { ExtHostCustomEditors } from './extHostCustomEditors.js';
import { IExtHostDataChannels } from './extHostDataChannels.js';
import { IExtHostDebugService } from './extHostDebugService.js';
import { IExtHostDecorations } from './extHostDecorations.js';
import { ExtHostDiagnostics } from './extHostDiagnostics.js';
import { ExtHostDialogs } from './extHostDialogs.js';
import { ExtHostDocumentContentProvider } from './extHostDocumentContentProviders.js';
import { ExtHostDocumentSaveParticipant } from './extHostDocumentSaveParticipant.js';
import { ExtHostDocuments } from './extHostDocuments.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { ExtHostEmbeddings } from './extHostEmbedding.js';
import { ExtHostAiEmbeddingVector } from './extHostEmbeddingVector.js';
import { Extension, IExtHostExtensionService } from './extHostExtensionService.js';
import { ExtHostFileSystem } from './extHostFileSystem.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { ExtHostFileSystemEventService } from './extHostFileSystemEventService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ExtHostInteractive } from './extHostInteractive.js';
import { ExtHostLabelService } from './extHostLabelService.js';
import { ExtHostLanguageFeatures } from './extHostLanguageFeatures.js';
import { ExtHostLanguageModelTools } from './extHostLanguageModelTools.js';
import { IExtHostLanguageModels } from './extHostLanguageModels.js';
import { ExtHostLanguages } from './extHostLanguages.js';
import { IExtHostLocalizationService } from './extHostLocalizationService.js';
import { IExtHostManagedSockets } from './extHostManagedSockets.js';
import { IExtHostMpcService } from './extHostMcp.js';
import { ExtHostMessageService } from './extHostMessageService.js';
import { ExtHostNotebookController } from './extHostNotebook.js';
import { ExtHostNotebookDocumentSaveParticipant } from './extHostNotebookDocumentSaveParticipant.js';
import { ExtHostNotebookDocuments } from './extHostNotebookDocuments.js';
import { ExtHostNotebookEditors } from './extHostNotebookEditors.js';
import { ExtHostNotebookKernels } from './extHostNotebookKernels.js';
import { ExtHostNotebookRenderers } from './extHostNotebookRenderers.js';
import { IExtHostOutputService } from './extHostOutput.js';
import { ExtHostProfileContentHandlers } from './extHostProfileContentHandler.js';
import { IExtHostProgress } from './extHostProgress.js';
import { ExtHostQuickDiff } from './extHostQuickDiff.js';
import { createExtHostQuickOpen } from './extHostQuickOpen.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostSCM } from './extHostSCM.js';
import { IExtHostSearch } from './extHostSearch.js';
import { IExtHostSecretState } from './extHostSecretState.js';
import { ExtHostShare } from './extHostShare.js';
import { ExtHostSpeech } from './extHostSpeech.js';
import { ExtHostStatusBar } from './extHostStatusBar.js';
import { IExtHostStorage } from './extHostStorage.js';
import { IExtensionStoragePaths } from './extHostStoragePaths.js';
import { IExtHostTask } from './extHostTask.js';
import { ExtHostTelemetryLogger, IExtHostTelemetry, isNewAppInstall } from './extHostTelemetry.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostTerminalShellIntegration } from './extHostTerminalShellIntegration.js';
import { IExtHostTesting } from './extHostTesting.js';
import { ExtHostEditors } from './extHostTextEditors.js';
import { ExtHostTheming } from './extHostTheming.js';
import { ExtHostTimeline } from './extHostTimeline.js';
import { ExtHostTreeViews } from './extHostTreeViews.js';
import { IExtHostTunnelService } from './extHostTunnelService.js';
import * as typeConverters from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { ExtHostUriOpeners } from './extHostUriOpener.js';
import { IURITransformerService } from './extHostUriTransformerService.js';
import { IExtHostUrlsService } from './extHostUrls.js';
import { ExtHostWebviews } from './extHostWebview.js';
import { ExtHostWebviewPanels } from './extHostWebviewPanels.js';
import { ExtHostWebviewViews } from './extHostWebviewView.js';
import { IExtHostWindow } from './extHostWindow.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { ExtHostAiSettingsSearch } from './extHostAiSettingsSearch.js';
import { IExtHostChatSessions } from './extHostChatSessions.js';
/**
 * This method instantiates and returns the extension API surface
 */
export function createApiFactoryAndRegisterActors(accessor) {
    // services
    const initData = accessor.get(IExtHostInitDataService);
    const extHostFileSystemInfo = accessor.get(IExtHostFileSystemInfo);
    const extHostConsumerFileSystem = accessor.get(IExtHostConsumerFileSystem);
    const extensionService = accessor.get(IExtHostExtensionService);
    const extHostWorkspace = accessor.get(IExtHostWorkspace);
    const extHostTelemetry = accessor.get(IExtHostTelemetry);
    const extHostConfiguration = accessor.get(IExtHostConfiguration);
    const uriTransformer = accessor.get(IURITransformerService);
    const rpcProtocol = accessor.get(IExtHostRpcService);
    const extHostStorage = accessor.get(IExtHostStorage);
    const extensionStoragePaths = accessor.get(IExtensionStoragePaths);
    const extHostLoggerService = accessor.get(ILoggerService);
    const extHostLogService = accessor.get(ILogService);
    const extHostTunnelService = accessor.get(IExtHostTunnelService);
    const extHostApiDeprecation = accessor.get(IExtHostApiDeprecationService);
    const extHostWindow = accessor.get(IExtHostWindow);
    const extHostUrls = accessor.get(IExtHostUrlsService);
    const extHostSecretState = accessor.get(IExtHostSecretState);
    const extHostEditorTabs = accessor.get(IExtHostEditorTabs);
    const extHostManagedSockets = accessor.get(IExtHostManagedSockets);
    const extHostProgress = accessor.get(IExtHostProgress);
    const extHostAuthentication = accessor.get(IExtHostAuthentication);
    const extHostLanguageModels = accessor.get(IExtHostLanguageModels);
    const extHostMcp = accessor.get(IExtHostMpcService);
    const extHostDataChannels = accessor.get(IExtHostDataChannels);
    const extHostChatSessions = accessor.get(IExtHostChatSessions);
    // register addressable instances
    rpcProtocol.set(ExtHostContext.ExtHostFileSystemInfo, extHostFileSystemInfo);
    rpcProtocol.set(ExtHostContext.ExtHostLogLevelServiceShape, extHostLoggerService);
    rpcProtocol.set(ExtHostContext.ExtHostWorkspace, extHostWorkspace);
    rpcProtocol.set(ExtHostContext.ExtHostConfiguration, extHostConfiguration);
    rpcProtocol.set(ExtHostContext.ExtHostExtensionService, extensionService);
    rpcProtocol.set(ExtHostContext.ExtHostStorage, extHostStorage);
    rpcProtocol.set(ExtHostContext.ExtHostTunnelService, extHostTunnelService);
    rpcProtocol.set(ExtHostContext.ExtHostWindow, extHostWindow);
    rpcProtocol.set(ExtHostContext.ExtHostUrls, extHostUrls);
    rpcProtocol.set(ExtHostContext.ExtHostSecretState, extHostSecretState);
    rpcProtocol.set(ExtHostContext.ExtHostTelemetry, extHostTelemetry);
    rpcProtocol.set(ExtHostContext.ExtHostEditorTabs, extHostEditorTabs);
    rpcProtocol.set(ExtHostContext.ExtHostManagedSockets, extHostManagedSockets);
    rpcProtocol.set(ExtHostContext.ExtHostProgress, extHostProgress);
    rpcProtocol.set(ExtHostContext.ExtHostAuthentication, extHostAuthentication);
    rpcProtocol.set(ExtHostContext.ExtHostChatProvider, extHostLanguageModels);
    rpcProtocol.set(ExtHostContext.ExtHostDataChannels, extHostDataChannels);
    rpcProtocol.set(ExtHostContext.ExtHostChatSessions, extHostChatSessions);
    // automatically create and register addressable instances
    const extHostDecorations = rpcProtocol.set(ExtHostContext.ExtHostDecorations, accessor.get(IExtHostDecorations));
    const extHostDocumentsAndEditors = rpcProtocol.set(ExtHostContext.ExtHostDocumentsAndEditors, accessor.get(IExtHostDocumentsAndEditors));
    const extHostCommands = rpcProtocol.set(ExtHostContext.ExtHostCommands, accessor.get(IExtHostCommands));
    const extHostTerminalService = rpcProtocol.set(ExtHostContext.ExtHostTerminalService, accessor.get(IExtHostTerminalService));
    const extHostTerminalShellIntegration = rpcProtocol.set(ExtHostContext.ExtHostTerminalShellIntegration, accessor.get(IExtHostTerminalShellIntegration));
    const extHostDebugService = rpcProtocol.set(ExtHostContext.ExtHostDebugService, accessor.get(IExtHostDebugService));
    const extHostSearch = rpcProtocol.set(ExtHostContext.ExtHostSearch, accessor.get(IExtHostSearch));
    const extHostTask = rpcProtocol.set(ExtHostContext.ExtHostTask, accessor.get(IExtHostTask));
    const extHostOutputService = rpcProtocol.set(ExtHostContext.ExtHostOutputService, accessor.get(IExtHostOutputService));
    const extHostLocalization = rpcProtocol.set(ExtHostContext.ExtHostLocalization, accessor.get(IExtHostLocalizationService));
    // manually create and register addressable instances
    const extHostDocuments = rpcProtocol.set(ExtHostContext.ExtHostDocuments, new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
    const extHostDocumentContentProviders = rpcProtocol.set(ExtHostContext.ExtHostDocumentContentProviders, new ExtHostDocumentContentProvider(rpcProtocol, extHostDocumentsAndEditors, extHostLogService));
    const extHostDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostDocumentSaveParticipant, new ExtHostDocumentSaveParticipant(extHostLogService, extHostDocuments, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostNotebook = rpcProtocol.set(ExtHostContext.ExtHostNotebook, new ExtHostNotebookController(rpcProtocol, extHostCommands, extHostDocumentsAndEditors, extHostDocuments, extHostConsumerFileSystem, extHostSearch, extHostLogService));
    const extHostNotebookDocuments = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocuments, new ExtHostNotebookDocuments(extHostNotebook));
    const extHostNotebookEditors = rpcProtocol.set(ExtHostContext.ExtHostNotebookEditors, new ExtHostNotebookEditors(extHostLogService, extHostNotebook));
    const extHostNotebookKernels = rpcProtocol.set(ExtHostContext.ExtHostNotebookKernels, new ExtHostNotebookKernels(rpcProtocol, initData, extHostNotebook, extHostCommands, extHostLogService));
    const extHostNotebookRenderers = rpcProtocol.set(ExtHostContext.ExtHostNotebookRenderers, new ExtHostNotebookRenderers(rpcProtocol, extHostNotebook));
    const extHostNotebookDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostNotebookDocumentSaveParticipant, new ExtHostNotebookDocumentSaveParticipant(extHostLogService, extHostNotebook, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
    const extHostEditors = rpcProtocol.set(ExtHostContext.ExtHostEditors, new ExtHostEditors(rpcProtocol, extHostDocumentsAndEditors));
    const extHostTreeViews = rpcProtocol.set(ExtHostContext.ExtHostTreeViews, new ExtHostTreeViews(rpcProtocol.getProxy(MainContext.MainThreadTreeViews), extHostCommands, extHostLogService));
    const extHostEditorInsets = rpcProtocol.set(ExtHostContext.ExtHostEditorInsets, new ExtHostEditorInsets(rpcProtocol.getProxy(MainContext.MainThreadEditorInsets), extHostEditors, initData.remote));
    const extHostDiagnostics = rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, new ExtHostDiagnostics(rpcProtocol, extHostLogService, extHostFileSystemInfo, extHostDocumentsAndEditors));
    const extHostLanguages = rpcProtocol.set(ExtHostContext.ExtHostLanguages, new ExtHostLanguages(rpcProtocol, extHostDocuments, extHostCommands.converter, uriTransformer));
    const extHostLanguageFeatures = rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, new ExtHostLanguageFeatures(rpcProtocol, uriTransformer, extHostDocuments, extHostCommands, extHostDiagnostics, extHostLogService, extHostApiDeprecation, extHostTelemetry));
    const extHostCodeMapper = rpcProtocol.set(ExtHostContext.ExtHostCodeMapper, new ExtHostCodeMapper(rpcProtocol));
    const extHostFileSystem = rpcProtocol.set(ExtHostContext.ExtHostFileSystem, new ExtHostFileSystem(rpcProtocol, extHostLanguageFeatures));
    const extHostFileSystemEvent = rpcProtocol.set(ExtHostContext.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpcProtocol, extHostLogService, extHostDocumentsAndEditors));
    const extHostQuickOpen = rpcProtocol.set(ExtHostContext.ExtHostQuickOpen, createExtHostQuickOpen(rpcProtocol, extHostWorkspace, extHostCommands));
    const extHostSCM = rpcProtocol.set(ExtHostContext.ExtHostSCM, new ExtHostSCM(rpcProtocol, extHostCommands, extHostDocuments, extHostLogService));
    const extHostQuickDiff = rpcProtocol.set(ExtHostContext.ExtHostQuickDiff, new ExtHostQuickDiff(rpcProtocol, uriTransformer));
    const extHostShare = rpcProtocol.set(ExtHostContext.ExtHostShare, new ExtHostShare(rpcProtocol, uriTransformer));
    const extHostComment = rpcProtocol.set(ExtHostContext.ExtHostComments, createExtHostComments(rpcProtocol, extHostCommands, extHostDocuments));
    const extHostLabelService = rpcProtocol.set(ExtHostContext.ExtHostLabelService, new ExtHostLabelService(rpcProtocol));
    const extHostTheming = rpcProtocol.set(ExtHostContext.ExtHostTheming, new ExtHostTheming(rpcProtocol));
    const extHostTimeline = rpcProtocol.set(ExtHostContext.ExtHostTimeline, new ExtHostTimeline(rpcProtocol, extHostCommands));
    const extHostWebviews = rpcProtocol.set(ExtHostContext.ExtHostWebviews, new ExtHostWebviews(rpcProtocol, initData.remote, extHostWorkspace, extHostLogService, extHostApiDeprecation));
    const extHostWebviewPanels = rpcProtocol.set(ExtHostContext.ExtHostWebviewPanels, new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, extHostWorkspace));
    const extHostCustomEditors = rpcProtocol.set(ExtHostContext.ExtHostCustomEditors, new ExtHostCustomEditors(rpcProtocol, extHostDocuments, extensionStoragePaths, extHostWebviews, extHostWebviewPanels));
    const extHostWebviewViews = rpcProtocol.set(ExtHostContext.ExtHostWebviewViews, new ExtHostWebviewViews(rpcProtocol, extHostWebviews));
    const extHostTesting = rpcProtocol.set(ExtHostContext.ExtHostTesting, accessor.get(IExtHostTesting));
    const extHostUriOpeners = rpcProtocol.set(ExtHostContext.ExtHostUriOpeners, new ExtHostUriOpeners(rpcProtocol));
    const extHostProfileContentHandlers = rpcProtocol.set(ExtHostContext.ExtHostProfileContentHandlers, new ExtHostProfileContentHandlers(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostInteractive, new ExtHostInteractive(rpcProtocol, extHostNotebook, extHostDocumentsAndEditors, extHostCommands, extHostLogService));
    const extHostLanguageModelTools = rpcProtocol.set(ExtHostContext.ExtHostLanguageModelTools, new ExtHostLanguageModelTools(rpcProtocol, extHostLanguageModels));
    const extHostChatAgents2 = rpcProtocol.set(ExtHostContext.ExtHostChatAgents2, new ExtHostChatAgents2(rpcProtocol, extHostLogService, extHostCommands, extHostDocuments, extHostLanguageModels, extHostDiagnostics, extHostLanguageModelTools));
    const extHostAiRelatedInformation = rpcProtocol.set(ExtHostContext.ExtHostAiRelatedInformation, new ExtHostRelatedInformation(rpcProtocol));
    const extHostAiEmbeddingVector = rpcProtocol.set(ExtHostContext.ExtHostAiEmbeddingVector, new ExtHostAiEmbeddingVector(rpcProtocol));
    const extHostAiSettingsSearch = rpcProtocol.set(ExtHostContext.ExtHostAiSettingsSearch, new ExtHostAiSettingsSearch(rpcProtocol));
    const extHostStatusBar = rpcProtocol.set(ExtHostContext.ExtHostStatusBar, new ExtHostStatusBar(rpcProtocol, extHostCommands.converter));
    const extHostSpeech = rpcProtocol.set(ExtHostContext.ExtHostSpeech, new ExtHostSpeech(rpcProtocol));
    const extHostEmbeddings = rpcProtocol.set(ExtHostContext.ExtHostEmbeddings, new ExtHostEmbeddings(rpcProtocol));
    rpcProtocol.set(ExtHostContext.ExtHostMcp, accessor.get(IExtHostMpcService));
    // Check that no named customers are missing
    const expected = Object.values(ExtHostContext);
    rpcProtocol.assertRegistered(expected);
    // Other instances
    const extHostBulkEdits = new ExtHostBulkEdits(rpcProtocol, extHostDocumentsAndEditors);
    const extHostClipboard = new ExtHostClipboard(rpcProtocol);
    const extHostMessageService = new ExtHostMessageService(rpcProtocol, extHostLogService);
    const extHostDialogs = new ExtHostDialogs(rpcProtocol);
    const extHostChatStatus = new ExtHostChatStatus(rpcProtocol);
    // Register API-ish commands
    ExtHostApiCommands.register(extHostCommands);
    return function (extension, extensionInfo, configProvider) {
        // Wraps an event with error handling and telemetry so that we know what extension fails
        // handling events. This will prevent us from reporting this as "our" error-telemetry and
        // allows for better blaming
        function _asExtensionEvent(actual) {
            return (listener, thisArgs, disposables) => {
                const handle = actual(e => {
                    try {
                        listener.call(thisArgs, e);
                    }
                    catch (err) {
                        errors.onUnexpectedExternalError(new ExtensionError(extension.identifier, err, 'FAILED to handle event'));
                    }
                });
                disposables?.push(handle);
                return handle;
            };
        }
        // Check document selectors for being overly generic. Technically this isn't a problem but
        // in practice many extensions say they support `fooLang` but need fs-access to do so. Those
        // extension should specify then the `file`-scheme, e.g. `{ scheme: 'fooLang', language: 'fooLang' }`
        // We only inform once, it is not a warning because we just want to raise awareness and because
        // we cannot say if the extension is doing it right or wrong...
        const checkSelector = (function () {
            let done = !extension.isUnderDevelopment;
            function informOnce() {
                if (!done) {
                    extHostLogService.info(`Extension '${extension.identifier.value}' uses a document selector without scheme. Learn more about this: https://go.microsoft.com/fwlink/?linkid=872305`);
                    done = true;
                }
            }
            return function perform(selector) {
                if (Array.isArray(selector)) {
                    selector.forEach(perform);
                }
                else if (typeof selector === 'string') {
                    informOnce();
                }
                else {
                    const filter = selector; // TODO: microsoft/TypeScript#42768
                    if (typeof filter.scheme === 'undefined') {
                        informOnce();
                    }
                    if (typeof filter.exclusive === 'boolean') {
                        checkProposedApiEnabled(extension, 'documentFiltersExclusive');
                    }
                }
                return selector;
            };
        })();
        const authentication = {
            getSession(providerId, scopes, options) {
                if ((typeof options?.forceNewSession === 'object' && options.forceNewSession.learnMore) ||
                    (typeof options?.createIfNone === 'object' && options.createIfNone.learnMore)) {
                    checkProposedApiEnabled(extension, 'authLearnMore');
                }
                if (options?.authorizationServer) {
                    checkProposedApiEnabled(extension, 'authIssuers');
                }
                return extHostAuthentication.getSession(extension, providerId, scopes, options);
            },
            getAccounts(providerId) {
                return extHostAuthentication.getAccounts(providerId);
            },
            // TODO: remove this after GHPR and Codespaces move off of it
            async hasSession(providerId, scopes) {
                checkProposedApiEnabled(extension, 'authSession');
                return !!(await extHostAuthentication.getSession(extension, providerId, scopes, { silent: true }));
            },
            get onDidChangeSessions() {
                return _asExtensionEvent(extHostAuthentication.getExtensionScopedSessionsEvent(extension.identifier.value));
            },
            registerAuthenticationProvider(id, label, provider, options) {
                if (options?.supportedAuthorizationServers) {
                    checkProposedApiEnabled(extension, 'authIssuers');
                }
                return extHostAuthentication.registerAuthenticationProvider(id, label, provider, options);
            }
        };
        // namespace: commands
        const commands = {
            registerCommand(id, command, thisArgs) {
                return extHostCommands.registerCommand(true, id, command, thisArgs, undefined, extension);
            },
            registerTextEditorCommand(id, callback, thisArg) {
                return extHostCommands.registerCommand(true, id, (...args) => {
                    const activeTextEditor = extHostEditors.getActiveTextEditor();
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    return activeTextEditor.edit((edit) => {
                        callback.apply(thisArg, [activeTextEditor, edit, ...args]);
                    }).then((result) => {
                        if (!result) {
                            extHostLogService.warn('Edits from command ' + id + ' were not applied.');
                        }
                    }, (err) => {
                        extHostLogService.warn('An error occurred while running command ' + id, err);
                    });
                }, undefined, undefined, extension);
            },
            registerDiffInformationCommand: (id, callback, thisArg) => {
                checkProposedApiEnabled(extension, 'diffCommand');
                return extHostCommands.registerCommand(true, id, async (...args) => {
                    const activeTextEditor = extHostDocumentsAndEditors.activeEditor(true);
                    if (!activeTextEditor) {
                        extHostLogService.warn('Cannot execute ' + id + ' because there is no active text editor.');
                        return undefined;
                    }
                    const diff = await extHostEditors.getDiffInformation(activeTextEditor.id);
                    callback.apply(thisArg, [diff, ...args]);
                }, undefined, undefined, extension);
            },
            executeCommand(id, ...args) {
                return extHostCommands.executeCommand(id, ...args);
            },
            getCommands(filterInternal = false) {
                return extHostCommands.getCommands(filterInternal);
            }
        };
        // namespace: env
        const env = {
            get machineId() { return initData.telemetryInfo.machineId; },
            get sessionId() { return initData.telemetryInfo.sessionId; },
            get language() { return initData.environment.appLanguage; },
            get appName() { return initData.environment.appName; },
            get appRoot() { return initData.environment.appRoot?.fsPath ?? ''; },
            get appHost() { return initData.environment.appHost; },
            get uriScheme() { return initData.environment.appUriScheme; },
            get clipboard() { return extHostClipboard.value; },
            get shell() {
                return extHostTerminalService.getDefaultShell(false);
            },
            get onDidChangeShell() {
                return _asExtensionEvent(extHostTerminalService.onDidChangeShell);
            },
            get isTelemetryEnabled() {
                return extHostTelemetry.getTelemetryConfiguration();
            },
            get onDidChangeTelemetryEnabled() {
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryEnabled);
            },
            get telemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return extHostTelemetry.getTelemetryDetails();
            },
            get onDidChangeTelemetryConfiguration() {
                checkProposedApiEnabled(extension, 'telemetry');
                return _asExtensionEvent(extHostTelemetry.onDidChangeTelemetryConfiguration);
            },
            get isNewAppInstall() {
                return isNewAppInstall(initData.telemetryInfo.firstSessionDate);
            },
            createTelemetryLogger(sender, options) {
                ExtHostTelemetryLogger.validateSender(sender);
                return extHostTelemetry.instantiateLogger(extension, sender, options);
            },
            openExternal(uri, options) {
                return extHostWindow.openUri(uri, {
                    allowTunneling: !!initData.remote.authority,
                    allowContributedOpeners: options?.allowContributedOpeners,
                });
            },
            async asExternalUri(uri) {
                if (uri.scheme === initData.environment.appUriScheme) {
                    return extHostUrls.createAppUri(uri);
                }
                try {
                    return await extHostWindow.asExternalUri(uri, { allowTunneling: !!initData.remote.authority });
                }
                catch (err) {
                    if (matchesScheme(uri, Schemas.http) || matchesScheme(uri, Schemas.https)) {
                        return uri;
                    }
                    throw err;
                }
            },
            get remoteName() {
                return getRemoteName(initData.remote.authority);
            },
            get remoteAuthority() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.remote.authority;
            },
            get uiKind() {
                return initData.uiKind;
            },
            get logLevel() {
                return extHostLogService.getLevel();
            },
            get onDidChangeLogLevel() {
                return _asExtensionEvent(extHostLogService.onDidChangeLogLevel);
            },
            get appQuality() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.quality;
            },
            get appCommit() {
                checkProposedApiEnabled(extension, 'resolvers');
                return initData.commit;
            },
            getDataChannel(channelId) {
                checkProposedApiEnabled(extension, 'dataChannels');
                return extHostDataChannels.createDataChannel(extension, channelId);
            }
        };
        if (!initData.environment.extensionTestsLocationURI) {
            // allow to patch env-function when running tests
            Object.freeze(env);
        }
        // namespace: tests
        const tests = {
            createTestController(provider, label, refreshHandler) {
                return extHostTesting.createTestController(extension, provider, label, refreshHandler);
            },
            createTestObserver() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.createTestObserver();
            },
            runTests(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.runTests(provider);
            },
            registerTestFollowupProvider(provider) {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.registerTestFollowupProvider(provider);
            },
            get onDidChangeTestResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return _asExtensionEvent(extHostTesting.onResultsChanged);
            },
            get testResults() {
                checkProposedApiEnabled(extension, 'testObserver');
                return extHostTesting.results;
            },
        };
        // namespace: extensions
        const extensionKind = initData.remote.isRemote
            ? extHostTypes.ExtensionKind.Workspace
            : extHostTypes.ExtensionKind.UI;
        const extensions = {
            getExtension(extensionId, includeFromDifferentExtensionHosts) {
                if (!isProposedApiEnabled(extension, 'extensionsAny')) {
                    includeFromDifferentExtensionHosts = false;
                }
                const mine = extensionInfo.mine.getExtensionDescription(extensionId);
                if (mine) {
                    return new Extension(extensionService, extension.identifier, mine, extensionKind, false);
                }
                if (includeFromDifferentExtensionHosts) {
                    const foreign = extensionInfo.all.getExtensionDescription(extensionId);
                    if (foreign) {
                        return new Extension(extensionService, extension.identifier, foreign, extensionKind /* TODO@alexdima THIS IS WRONG */, true);
                    }
                }
                return undefined;
            },
            get all() {
                const result = [];
                for (const desc of extensionInfo.mine.getAllExtensionDescriptions()) {
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind, false));
                }
                return result;
            },
            get allAcrossExtensionHosts() {
                checkProposedApiEnabled(extension, 'extensionsAny');
                const local = new ExtensionIdentifierSet(extensionInfo.mine.getAllExtensionDescriptions().map(desc => desc.identifier));
                const result = [];
                for (const desc of extensionInfo.all.getAllExtensionDescriptions()) {
                    const isFromDifferentExtensionHost = !local.has(desc.identifier);
                    result.push(new Extension(extensionService, extension.identifier, desc, extensionKind /* TODO@alexdima THIS IS WRONG */, isFromDifferentExtensionHost));
                }
                return result;
            },
            get onDidChange() {
                if (isProposedApiEnabled(extension, 'extensionsAny')) {
                    return _asExtensionEvent(Event.any(extensionInfo.mine.onDidChange, extensionInfo.all.onDidChange));
                }
                return _asExtensionEvent(extensionInfo.mine.onDidChange);
            }
        };
        // namespace: languages
        const languages = {
            createDiagnosticCollection(name) {
                return extHostDiagnostics.createDiagnosticCollection(extension.identifier, name);
            },
            get onDidChangeDiagnostics() {
                return _asExtensionEvent(extHostDiagnostics.onDidChangeDiagnostics);
            },
            getDiagnostics: (resource) => {
                return extHostDiagnostics.getDiagnostics(resource);
            },
            getLanguages() {
                return extHostLanguages.getLanguages();
            },
            setTextDocumentLanguage(document, languageId) {
                return extHostLanguages.changeLanguage(document.uri, languageId);
            },
            match(selector, document) {
                const interalSelector = typeConverters.LanguageSelector.from(selector);
                let notebook;
                if (targetsNotebooks(interalSelector)) {
                    notebook = extHostNotebook.notebookDocuments.find(value => value.apiNotebook.getCells().find(c => c.document === document))?.apiNotebook;
                }
                return score(interalSelector, document.uri, document.languageId, true, notebook?.uri, notebook?.notebookType);
            },
            registerCodeActionsProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerCodeActionProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerDocumentPasteEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentPasteEditProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerCodeLensProvider(selector, provider) {
                return extHostLanguageFeatures.registerCodeLensProvider(extension, checkSelector(selector), provider);
            },
            registerDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerDeclarationProvider(selector, provider) {
                return extHostLanguageFeatures.registerDeclarationProvider(extension, checkSelector(selector), provider);
            },
            registerImplementationProvider(selector, provider) {
                return extHostLanguageFeatures.registerImplementationProvider(extension, checkSelector(selector), provider);
            },
            registerTypeDefinitionProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeDefinitionProvider(extension, checkSelector(selector), provider);
            },
            registerHoverProvider(selector, provider) {
                return extHostLanguageFeatures.registerHoverProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerEvaluatableExpressionProvider(selector, provider) {
                return extHostLanguageFeatures.registerEvaluatableExpressionProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerInlineValuesProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlineValuesProvider(extension, checkSelector(selector), provider, extension.identifier);
            },
            registerDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerMultiDocumentHighlightProvider(selector, provider) {
                return extHostLanguageFeatures.registerMultiDocumentHighlightProvider(extension, checkSelector(selector), provider);
            },
            registerLinkedEditingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerLinkedEditingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerReferenceProvider(selector, provider) {
                return extHostLanguageFeatures.registerReferenceProvider(extension, checkSelector(selector), provider);
            },
            registerRenameProvider(selector, provider) {
                return extHostLanguageFeatures.registerRenameProvider(extension, checkSelector(selector), provider);
            },
            registerNewSymbolNamesProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'newSymbolNamesProvider');
                return extHostLanguageFeatures.registerNewSymbolNamesProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentSymbolProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentSymbolProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerWorkspaceSymbolProvider(provider) {
                return extHostLanguageFeatures.registerWorkspaceSymbolProvider(extension, provider);
            },
            registerDocumentFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerDocumentRangeFormattingEditProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentRangeFormattingEditProvider(extension, checkSelector(selector), provider);
            },
            registerOnTypeFormattingEditProvider(selector, provider, firstTriggerCharacter, ...moreTriggerCharacters) {
                return extHostLanguageFeatures.registerOnTypeFormattingEditProvider(extension, checkSelector(selector), provider, [firstTriggerCharacter].concat(moreTriggerCharacters));
            },
            registerDocumentSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerDocumentRangeSemanticTokensProvider(selector, provider, legend) {
                return extHostLanguageFeatures.registerDocumentRangeSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
            },
            registerSignatureHelpProvider(selector, provider, firstItem, ...remaining) {
                if (typeof firstItem === 'object') {
                    return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, firstItem);
                }
                return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, typeof firstItem === 'undefined' ? [] : [firstItem, ...remaining]);
            },
            registerCompletionItemProvider(selector, provider, ...triggerCharacters) {
                return extHostLanguageFeatures.registerCompletionItemProvider(extension, checkSelector(selector), provider, triggerCharacters);
            },
            registerInlineCompletionItemProvider(selector, provider, metadata) {
                if (provider.handleDidShowCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (provider.handleDidPartiallyAcceptCompletionItem) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                if (metadata) {
                    checkProposedApiEnabled(extension, 'inlineCompletionsAdditions');
                }
                return extHostLanguageFeatures.registerInlineCompletionsProvider(extension, checkSelector(selector), provider, metadata);
            },
            registerDocumentLinkProvider(selector, provider) {
                return extHostLanguageFeatures.registerDocumentLinkProvider(extension, checkSelector(selector), provider);
            },
            registerColorProvider(selector, provider) {
                return extHostLanguageFeatures.registerColorProvider(extension, checkSelector(selector), provider);
            },
            registerFoldingRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerFoldingRangeProvider(extension, checkSelector(selector), provider);
            },
            registerSelectionRangeProvider(selector, provider) {
                return extHostLanguageFeatures.registerSelectionRangeProvider(extension, selector, provider);
            },
            registerCallHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerCallHierarchyProvider(extension, selector, provider);
            },
            registerTypeHierarchyProvider(selector, provider) {
                return extHostLanguageFeatures.registerTypeHierarchyProvider(extension, selector, provider);
            },
            setLanguageConfiguration: (language, configuration) => {
                return extHostLanguageFeatures.setLanguageConfiguration(extension, language, configuration);
            },
            getTokenInformationAtPosition(doc, pos) {
                checkProposedApiEnabled(extension, 'tokenInformation');
                return extHostLanguages.tokenAtPosition(doc, pos);
            },
            registerInlayHintsProvider(selector, provider) {
                return extHostLanguageFeatures.registerInlayHintsProvider(extension, selector, provider);
            },
            createLanguageStatusItem(id, selector) {
                return extHostLanguages.createLanguageStatusItem(extension, id, selector);
            },
            registerDocumentDropEditProvider(selector, provider, metadata) {
                return extHostLanguageFeatures.registerDocumentOnDropEditProvider(extension, selector, provider, metadata);
            }
        };
        // namespace: window
        const window = {
            get activeTextEditor() {
                return extHostEditors.getActiveTextEditor();
            },
            get visibleTextEditors() {
                return extHostEditors.getVisibleTextEditors();
            },
            get activeTerminal() {
                return extHostTerminalService.activeTerminal;
            },
            get terminals() {
                return extHostTerminalService.terminals;
            },
            async showTextDocument(documentOrUri, columnOrOptions, preserveFocus) {
                if (URI.isUri(documentOrUri) && documentOrUri.scheme === Schemas.vscodeRemote && !documentOrUri.authority) {
                    extHostApiDeprecation.report('workspace.showTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                }
                const document = await (URI.isUri(documentOrUri)
                    ? Promise.resolve(workspace.openTextDocument(documentOrUri))
                    : Promise.resolve(documentOrUri));
                return extHostEditors.showTextDocument(document, columnOrOptions, preserveFocus);
            },
            createTextEditorDecorationType(options) {
                return extHostEditors.createTextEditorDecorationType(extension, options);
            },
            onDidChangeActiveTextEditor(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeActiveTextEditor)(listener, thisArg, disposables);
            },
            onDidChangeVisibleTextEditors(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeVisibleTextEditors)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorOptions(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorOptions)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            onDidChangeTextEditorViewColumn(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorViewColumn)(listener, thisArg, disposables);
            },
            onDidChangeTextEditorDiffInformation(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'textEditorDiffInformation');
                return _asExtensionEvent(extHostEditors.onDidChangeTextEditorDiffInformation)(listener, thisArg, disposables);
            },
            onDidCloseTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidCloseTerminal)(listener, thisArg, disposables);
            },
            onDidOpenTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidOpenTerminal)(listener, thisArg, disposables);
            },
            onDidChangeActiveTerminal(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeActiveTerminal)(listener, thisArg, disposables);
            },
            onDidChangeTerminalDimensions(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDimensions');
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalDimensions)(listener, thisArg, disposables);
            },
            onDidChangeTerminalState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalService.onDidChangeTerminalState)(listener, thisArg, disposables);
            },
            onDidWriteTerminalData(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalDataWriteEvent');
                return _asExtensionEvent(extHostTerminalService.onDidWriteTerminalData)(listener, thisArg, disposables);
            },
            onDidExecuteTerminalCommand(listener, thisArg, disposables) {
                checkProposedApiEnabled(extension, 'terminalExecuteCommandEvent');
                return _asExtensionEvent(extHostTerminalService.onDidExecuteTerminalCommand)(listener, thisArg, disposables);
            },
            onDidChangeTerminalShellIntegration(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidChangeTerminalShellIntegration)(listener, thisArg, disposables);
            },
            onDidStartTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidStartTerminalShellExecution)(listener, thisArg, disposables);
            },
            onDidEndTerminalShellExecution(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTerminalShellIntegration.onDidEndTerminalShellExecution)(listener, thisArg, disposables);
            },
            get state() {
                return extHostWindow.getState();
            },
            onDidChangeWindowState(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostWindow.onDidChangeWindowState)(listener, thisArg, disposables);
            },
            showInformationMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Info, message, rest[0], rest.slice(1));
            },
            showWarningMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Warning, message, rest[0], rest.slice(1));
            },
            showErrorMessage(message, ...rest) {
                return extHostMessageService.showMessage(extension, Severity.Error, message, rest[0], rest.slice(1));
            },
            showQuickPick(items, options, token) {
                return extHostQuickOpen.showQuickPick(extension, items, options, token);
            },
            showWorkspaceFolderPick(options) {
                return extHostQuickOpen.showWorkspaceFolderPick(options);
            },
            showInputBox(options, token) {
                return extHostQuickOpen.showInput(options, token);
            },
            showOpenDialog(options) {
                return extHostDialogs.showOpenDialog(options);
            },
            showSaveDialog(options) {
                return extHostDialogs.showSaveDialog(options);
            },
            createStatusBarItem(alignmentOrId, priorityOrAlignment, priorityArg) {
                let id;
                let alignment;
                let priority;
                if (typeof alignmentOrId === 'string') {
                    id = alignmentOrId;
                    alignment = priorityOrAlignment;
                    priority = priorityArg;
                }
                else {
                    alignment = alignmentOrId;
                    priority = priorityOrAlignment;
                }
                return extHostStatusBar.createStatusBarEntry(extension, id, alignment, priority);
            },
            setStatusBarMessage(text, timeoutOrThenable) {
                return extHostStatusBar.setStatusBarMessage(text, timeoutOrThenable);
            },
            withScmProgress(task) {
                extHostApiDeprecation.report('window.withScmProgress', extension, `Use 'withProgress' instead.`);
                return extHostProgress.withProgress(extension, { location: extHostTypes.ProgressLocation.SourceControl }, (progress, token) => task({ report(n) { } }));
            },
            withProgress(options, task) {
                return extHostProgress.withProgress(extension, options, task);
            },
            createOutputChannel(name, options) {
                return extHostOutputService.createOutputChannel(name, options, extension);
            },
            createWebviewPanel(viewType, title, showOptions, options) {
                return extHostWebviewPanels.createWebviewPanel(extension, viewType, title, showOptions, options);
            },
            createWebviewTextEditorInset(editor, line, height, options) {
                checkProposedApiEnabled(extension, 'editorInsets');
                return extHostEditorInsets.createWebviewEditorInset(editor, line, height, options, extension);
            },
            createTerminal(nameOrOptions, shellPath, shellArgs) {
                if (typeof nameOrOptions === 'object') {
                    if ('pty' in nameOrOptions) {
                        return extHostTerminalService.createExtensionTerminal(nameOrOptions);
                    }
                    return extHostTerminalService.createTerminalFromOptions(nameOrOptions);
                }
                return extHostTerminalService.createTerminal(nameOrOptions, shellPath, shellArgs);
            },
            registerTerminalLinkProvider(provider) {
                return extHostTerminalService.registerLinkProvider(provider);
            },
            registerTerminalProfileProvider(id, provider) {
                return extHostTerminalService.registerProfileProvider(extension, id, provider);
            },
            registerTerminalCompletionProvider(provider, ...triggerCharacters) {
                checkProposedApiEnabled(extension, 'terminalCompletionProvider');
                return extHostTerminalService.registerTerminalCompletionProvider(extension, provider, ...triggerCharacters);
            },
            registerTerminalQuickFixProvider(id, provider) {
                checkProposedApiEnabled(extension, 'terminalQuickFixProvider');
                return extHostTerminalService.registerTerminalQuickFixProvider(id, extension.identifier.value, provider);
            },
            registerTreeDataProvider(viewId, treeDataProvider) {
                return extHostTreeViews.registerTreeDataProvider(viewId, treeDataProvider, extension);
            },
            createTreeView(viewId, options) {
                return extHostTreeViews.createTreeView(viewId, options, extension);
            },
            registerWebviewPanelSerializer: (viewType, serializer) => {
                return extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializer);
            },
            registerCustomEditorProvider: (viewType, provider, options = {}) => {
                return extHostCustomEditors.registerCustomEditorProvider(extension, viewType, provider, options);
            },
            registerFileDecorationProvider(provider) {
                return extHostDecorations.registerFileDecorationProvider(provider, extension);
            },
            registerUriHandler(handler) {
                return extHostUrls.registerUriHandler(extension, handler);
            },
            createQuickPick() {
                return extHostQuickOpen.createQuickPick(extension);
            },
            createInputBox() {
                return extHostQuickOpen.createInputBox(extension);
            },
            get activeColorTheme() {
                return extHostTheming.activeColorTheme;
            },
            onDidChangeActiveColorTheme(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostTheming.onDidChangeActiveColorTheme)(listener, thisArg, disposables);
            },
            registerWebviewViewProvider(viewId, provider, options) {
                return extHostWebviewViews.registerWebviewViewProvider(extension, viewId, provider, options?.webviewOptions);
            },
            get activeNotebookEditor() {
                return extHostNotebook.activeNotebookEditor;
            },
            onDidChangeActiveNotebookEditor(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebook.onDidChangeActiveNotebookEditor)(listener, thisArgs, disposables);
            },
            get visibleNotebookEditors() {
                return extHostNotebook.visibleNotebookEditors;
            },
            get onDidChangeVisibleNotebookEditors() {
                return _asExtensionEvent(extHostNotebook.onDidChangeVisibleNotebookEditors);
            },
            onDidChangeNotebookEditorSelection(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorSelection)(listener, thisArgs, disposables);
            },
            onDidChangeNotebookEditorVisibleRanges(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostNotebookEditors.onDidChangeNotebookEditorVisibleRanges)(listener, thisArgs, disposables);
            },
            showNotebookDocument(document, options) {
                return extHostNotebook.showNotebookDocument(document, options);
            },
            registerExternalUriOpener(id, opener, metadata) {
                checkProposedApiEnabled(extension, 'externalUriOpener');
                return extHostUriOpeners.registerExternalUriOpener(extension.identifier, id, opener, metadata);
            },
            registerProfileContentHandler(id, handler) {
                checkProposedApiEnabled(extension, 'profileContentHandlers');
                return extHostProfileContentHandlers.registerProfileContentHandler(extension, id, handler);
            },
            registerQuickDiffProvider(selector, quickDiffProvider, id, label, rootUri) {
                checkProposedApiEnabled(extension, 'quickDiffProvider');
                return extHostQuickDiff.registerQuickDiffProvider(extension, checkSelector(selector), quickDiffProvider, id, label, rootUri);
            },
            get tabGroups() {
                return extHostEditorTabs.tabGroups;
            },
            registerShareProvider(selector, provider) {
                checkProposedApiEnabled(extension, 'shareProvider');
                return extHostShare.registerShareProvider(checkSelector(selector), provider);
            },
            get nativeHandle() {
                checkProposedApiEnabled(extension, 'nativeWindowHandle');
                return extHostWindow.nativeHandle;
            },
            createChatStatusItem: (id) => {
                checkProposedApiEnabled(extension, 'chatStatusItem');
                return extHostChatStatus.createChatStatusItem(extension, id);
            },
        };
        // namespace: workspace
        const workspace = {
            get rootPath() {
                extHostApiDeprecation.report('workspace.rootPath', extension, `Please use 'workspace.workspaceFolders' instead. More details: https://aka.ms/vscode-eliminating-rootpath`);
                return extHostWorkspace.getPath();
            },
            set rootPath(value) {
                throw new errors.ReadonlyError('rootPath');
            },
            getWorkspaceFolder(resource) {
                return extHostWorkspace.getWorkspaceFolder(resource);
            },
            get workspaceFolders() {
                return extHostWorkspace.getWorkspaceFolders();
            },
            get name() {
                return extHostWorkspace.name;
            },
            set name(value) {
                throw new errors.ReadonlyError('name');
            },
            get workspaceFile() {
                return extHostWorkspace.workspaceFile;
            },
            set workspaceFile(value) {
                throw new errors.ReadonlyError('workspaceFile');
            },
            updateWorkspaceFolders: (index, deleteCount, ...workspaceFoldersToAdd) => {
                return extHostWorkspace.updateWorkspaceFolders(extension, index, deleteCount || 0, ...workspaceFoldersToAdd);
            },
            onDidChangeWorkspaceFolders: function (listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostWorkspace.onDidChangeWorkspace)(listener, thisArgs, disposables);
            },
            asRelativePath: (pathOrUri, includeWorkspace) => {
                return extHostWorkspace.getRelativePath(pathOrUri, includeWorkspace);
            },
            findFiles: (include, exclude, maxResults, token) => {
                // Note, undefined/null have different meanings on "exclude"
                return extHostWorkspace.findFiles(include, exclude, maxResults, extension.identifier, token);
            },
            findFiles2: (filePattern, options, token) => {
                checkProposedApiEnabled(extension, 'findFiles2');
                return extHostWorkspace.findFiles2(filePattern, options, extension.identifier, token);
            },
            findTextInFiles: (query, optionsOrCallback, callbackOrToken, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles');
                let options;
                let callback;
                if (typeof optionsOrCallback === 'object') {
                    options = optionsOrCallback;
                    callback = callbackOrToken;
                }
                else {
                    options = {};
                    callback = optionsOrCallback;
                    token = callbackOrToken;
                }
                return extHostWorkspace.findTextInFiles(query, options || {}, callback, extension.identifier, token);
            },
            findTextInFiles2: (query, options, token) => {
                checkProposedApiEnabled(extension, 'findTextInFiles2');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostWorkspace.findTextInFiles2(query, options, extension.identifier, token);
            },
            save: (uri) => {
                return extHostWorkspace.save(uri);
            },
            saveAs: (uri) => {
                return extHostWorkspace.saveAs(uri);
            },
            saveAll: (includeUntitled) => {
                return extHostWorkspace.saveAll(includeUntitled);
            },
            applyEdit(edit, metadata) {
                return extHostBulkEdits.applyWorkspaceEdit(edit, extension, metadata);
            },
            createFileSystemWatcher: (pattern, optionsOrIgnoreCreate, ignoreChange, ignoreDelete) => {
                const options = {
                    ignoreCreateEvents: Boolean(optionsOrIgnoreCreate),
                    ignoreChangeEvents: Boolean(ignoreChange),
                    ignoreDeleteEvents: Boolean(ignoreDelete),
                };
                return extHostFileSystemEvent.createFileSystemWatcher(extHostWorkspace, configProvider, extension, pattern, options);
            },
            get textDocuments() {
                return extHostDocuments.getAllDocumentData().map(data => data.document);
            },
            set textDocuments(value) {
                throw new errors.ReadonlyError('textDocuments');
            },
            openTextDocument(uriOrFileNameOrOptions, options) {
                let uriPromise;
                options = (options ?? uriOrFileNameOrOptions);
                if (typeof uriOrFileNameOrOptions === 'string') {
                    uriPromise = Promise.resolve(URI.file(uriOrFileNameOrOptions));
                }
                else if (URI.isUri(uriOrFileNameOrOptions)) {
                    uriPromise = Promise.resolve(uriOrFileNameOrOptions);
                }
                else if (!options || typeof options === 'object') {
                    uriPromise = extHostDocuments.createDocumentData(options);
                }
                else {
                    throw new Error('illegal argument - uriOrFileNameOrOptions');
                }
                return uriPromise.then(uri => {
                    extHostLogService.trace(`openTextDocument from ${extension.identifier}`);
                    if (uri.scheme === Schemas.vscodeRemote && !uri.authority) {
                        extHostApiDeprecation.report('workspace.openTextDocument', extension, `A URI of 'vscode-remote' scheme requires an authority.`);
                    }
                    return extHostDocuments.ensureDocumentData(uri, options).then(documentData => {
                        return documentData.document;
                    });
                });
            },
            onDidOpenTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidAddDocument)(listener, thisArgs, disposables);
            },
            onDidCloseTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidRemoveDocument)(listener, thisArgs, disposables);
            },
            onDidChangeTextDocument: (listener, thisArgs, disposables) => {
                if (isProposedApiEnabled(extension, 'textDocumentChangeReason')) {
                    return _asExtensionEvent(extHostDocuments.onDidChangeDocumentWithReason)(listener, thisArgs, disposables);
                }
                return _asExtensionEvent(extHostDocuments.onDidChangeDocument)(listener, thisArgs, disposables);
            },
            onDidSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocuments.onDidSaveDocument)(listener, thisArgs, disposables);
            },
            onWillSaveTextDocument: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostDocumentSaveParticipant.getOnWillSaveTextDocumentEvent(extension))(listener, thisArgs, disposables);
            },
            get notebookDocuments() {
                return extHostNotebook.notebookDocuments.map(d => d.apiNotebook);
            },
            async openNotebookDocument(uriOrType, content) {
                let uri;
                if (URI.isUri(uriOrType)) {
                    uri = uriOrType;
                    await extHostNotebook.openNotebookDocument(uriOrType);
                }
                else if (typeof uriOrType === 'string') {
                    uri = URI.revive(await extHostNotebook.createNotebookDocument({ viewType: uriOrType, content }));
                }
                else {
                    throw new Error('Invalid arguments');
                }
                return extHostNotebook.getNotebookDocument(uri).apiNotebook;
            },
            onDidSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidSaveNotebookDocument)(listener, thisArg, disposables);
            },
            onDidChangeNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocuments.onDidChangeNotebookDocument)(listener, thisArg, disposables);
            },
            onWillSaveNotebookDocument(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostNotebookDocumentSaveParticipant.getOnWillSaveNotebookDocumentEvent(extension))(listener, thisArg, disposables);
            },
            get onDidOpenNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidOpenNotebookDocument);
            },
            get onDidCloseNotebookDocument() {
                return _asExtensionEvent(extHostNotebook.onDidCloseNotebookDocument);
            },
            registerNotebookSerializer(viewType, serializer, options, registration) {
                return extHostNotebook.registerNotebookSerializer(extension, viewType, serializer, options, isProposedApiEnabled(extension, 'notebookLiveShare') ? registration : undefined);
            },
            onDidChangeConfiguration: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(configProvider.onDidChangeConfiguration)(listener, thisArgs, disposables);
            },
            getConfiguration(section, scope) {
                scope = arguments.length === 1 ? undefined : scope;
                return configProvider.getConfiguration(section, scope, extension);
            },
            registerTextDocumentContentProvider(scheme, provider) {
                return extHostDocumentContentProviders.registerTextDocumentContentProvider(scheme, provider);
            },
            registerTaskProvider: (type, provider) => {
                extHostApiDeprecation.report('window.registerTaskProvider', extension, `Use the corresponding function on the 'tasks' namespace instead`);
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            registerFileSystemProvider(scheme, provider, options) {
                return combinedDisposable(extHostFileSystem.registerFileSystemProvider(extension, scheme, provider, options), extHostConsumerFileSystem.addFileSystemProvider(scheme, provider, options));
            },
            get fs() {
                return extHostConsumerFileSystem.value;
            },
            registerFileSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider');
                return extHostSearch.registerFileSearchProviderOld(scheme, provider);
            },
            registerTextSearchProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider');
                return extHostSearch.registerTextSearchProviderOld(scheme, provider);
            },
            registerAITextSearchProvider: (scheme, provider) => {
                // there are some dependencies on textSearchProvider, so we need to check for both
                checkProposedApiEnabled(extension, 'aiTextSearchProvider');
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerAITextSearchProvider(scheme, provider);
            },
            registerFileSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'fileSearchProvider2');
                return extHostSearch.registerFileSearchProvider(scheme, provider);
            },
            registerTextSearchProvider2: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'textSearchProvider2');
                return extHostSearch.registerTextSearchProvider(scheme, provider);
            },
            registerRemoteAuthorityResolver: (authorityPrefix, resolver) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.registerRemoteAuthorityResolver(authorityPrefix, resolver);
            },
            registerResourceLabelFormatter: (formatter) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extHostLabelService.$registerResourceLabelFormatter(formatter);
            },
            getRemoteExecServer: (authority) => {
                checkProposedApiEnabled(extension, 'resolvers');
                return extensionService.getRemoteExecServer(authority);
            },
            onDidCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidCreateFile)(listener, thisArg, disposables);
            },
            onDidDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidDeleteFile)(listener, thisArg, disposables);
            },
            onDidRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.onDidRenameFile)(listener, thisArg, disposables);
            },
            onWillCreateFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillCreateFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillDeleteFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillDeleteFileEvent(extension))(listener, thisArg, disposables);
            },
            onWillRenameFiles: (listener, thisArg, disposables) => {
                return _asExtensionEvent(extHostFileSystemEvent.getOnWillRenameFileEvent(extension))(listener, thisArg, disposables);
            },
            openTunnel: (forward) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.openTunnel(extension, forward).then(value => {
                    if (!value) {
                        throw new Error('cannot open tunnel');
                    }
                    return value;
                });
            },
            get tunnels() {
                checkProposedApiEnabled(extension, 'tunnels');
                return extHostTunnelService.getTunnels();
            },
            onDidChangeTunnels: (listener, thisArg, disposables) => {
                checkProposedApiEnabled(extension, 'tunnels');
                return _asExtensionEvent(extHostTunnelService.onDidChangeTunnels)(listener, thisArg, disposables);
            },
            registerPortAttributesProvider: (portSelector, provider) => {
                checkProposedApiEnabled(extension, 'portsAttributes');
                return extHostTunnelService.registerPortsAttributesProvider(portSelector, provider);
            },
            registerTunnelProvider: (tunnelProvider, information) => {
                checkProposedApiEnabled(extension, 'tunnelFactory');
                return extHostTunnelService.registerTunnelProvider(tunnelProvider, information);
            },
            registerTimelineProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'timeline');
                return extHostTimeline.registerTimelineProvider(scheme, provider, extension.identifier, extHostCommands.converter);
            },
            get isTrusted() {
                return extHostWorkspace.trusted;
            },
            requestWorkspaceTrust: (options) => {
                checkProposedApiEnabled(extension, 'workspaceTrust');
                return extHostWorkspace.requestWorkspaceTrust(options);
            },
            onDidGrantWorkspaceTrust: (listener, thisArgs, disposables) => {
                return _asExtensionEvent(extHostWorkspace.onDidGrantWorkspaceTrust)(listener, thisArgs, disposables);
            },
            registerEditSessionIdentityProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return extHostWorkspace.registerEditSessionIdentityProvider(scheme, provider);
            },
            onWillCreateEditSessionIdentity: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'editSessionIdentityProvider');
                return _asExtensionEvent(extHostWorkspace.getOnWillCreateEditSessionIdentityEvent(extension))(listener, thisArgs, disposables);
            },
            registerCanonicalUriProvider: (scheme, provider) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.registerCanonicalUriProvider(scheme, provider);
            },
            getCanonicalUri: (uri, options, token) => {
                checkProposedApiEnabled(extension, 'canonicalUriProvider');
                return extHostWorkspace.provideCanonicalUri(uri, options, token);
            },
            decode(content, options) {
                return extHostWorkspace.decode(content, options);
            },
            encode(content, options) {
                return extHostWorkspace.encode(content, options);
            }
        };
        // namespace: scm
        const scm = {
            get inputBox() {
                extHostApiDeprecation.report('scm.inputBox', extension, `Use 'SourceControl.inputBox' instead`);
                return extHostSCM.getLastInputBox(extension); // Strict null override - Deprecated api
            },
            createSourceControl(id, label, rootUri, parent) {
                if (parent) {
                    checkProposedApiEnabled(extension, 'scmProviderOptions');
                }
                return extHostSCM.createSourceControl(extension, id, label, rootUri, parent);
            }
        };
        // namespace: comments
        const comments = {
            createCommentController(id, label) {
                return extHostComment.createCommentController(extension, id, label);
            }
        };
        // namespace: debug
        const debug = {
            get activeDebugSession() {
                return extHostDebugService.activeDebugSession;
            },
            get activeDebugConsole() {
                return extHostDebugService.activeDebugConsole;
            },
            get breakpoints() {
                return extHostDebugService.breakpoints;
            },
            get activeStackItem() {
                return extHostDebugService.activeStackItem;
            },
            registerDebugVisualizationProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationProvider(extension, id, provider);
            },
            registerDebugVisualizationTreeProvider(id, provider) {
                checkProposedApiEnabled(extension, 'debugVisualization');
                return extHostDebugService.registerDebugVisualizationTree(extension, id, provider);
            },
            onDidStartDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidStartDebugSession)(listener, thisArg, disposables);
            },
            onDidTerminateDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidTerminateDebugSession)(listener, thisArg, disposables);
            },
            onDidChangeActiveDebugSession(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveDebugSession)(listener, thisArg, disposables);
            },
            onDidReceiveDebugSessionCustomEvent(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidReceiveDebugSessionCustomEvent)(listener, thisArg, disposables);
            },
            onDidChangeBreakpoints(listener, thisArgs, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeBreakpoints)(listener, thisArgs, disposables);
            },
            onDidChangeActiveStackItem(listener, thisArg, disposables) {
                return _asExtensionEvent(extHostDebugService.onDidChangeActiveStackItem)(listener, thisArg, disposables);
            },
            registerDebugConfigurationProvider(debugType, provider, triggerKind) {
                return extHostDebugService.registerDebugConfigurationProvider(debugType, provider, triggerKind || DebugConfigurationProviderTriggerKind.Initial);
            },
            registerDebugAdapterDescriptorFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterDescriptorFactory(extension, debugType, factory);
            },
            registerDebugAdapterTrackerFactory(debugType, factory) {
                return extHostDebugService.registerDebugAdapterTrackerFactory(debugType, factory);
            },
            startDebugging(folder, nameOrConfig, parentSessionOrOptions) {
                if (!parentSessionOrOptions || (typeof parentSessionOrOptions === 'object' && 'configuration' in parentSessionOrOptions)) {
                    return extHostDebugService.startDebugging(folder, nameOrConfig, { parentSession: parentSessionOrOptions });
                }
                return extHostDebugService.startDebugging(folder, nameOrConfig, parentSessionOrOptions || {});
            },
            stopDebugging(session) {
                return extHostDebugService.stopDebugging(session);
            },
            addBreakpoints(breakpoints) {
                return extHostDebugService.addBreakpoints(breakpoints);
            },
            removeBreakpoints(breakpoints) {
                return extHostDebugService.removeBreakpoints(breakpoints);
            },
            asDebugSourceUri(source, session) {
                return extHostDebugService.asDebugSourceUri(source, session);
            }
        };
        const tasks = {
            registerTaskProvider: (type, provider) => {
                return extHostTask.registerTaskProvider(extension, type, provider);
            },
            fetchTasks: (filter) => {
                return extHostTask.fetchTasks(filter);
            },
            executeTask: (task) => {
                return extHostTask.executeTask(extension, task);
            },
            get taskExecutions() {
                return extHostTask.taskExecutions;
            },
            onDidStartTask: (listener, thisArgs, disposables) => {
                const wrappedListener = (event) => {
                    if (!isProposedApiEnabled(extension, 'taskExecutionTerminal')) {
                        if (event?.execution?.terminal !== undefined) {
                            event.execution.terminal = undefined;
                        }
                    }
                    const eventWithExecution = {
                        ...event,
                        execution: event.execution
                    };
                    return listener.call(thisArgs, eventWithExecution);
                };
                return _asExtensionEvent(extHostTask.onDidStartTask)(wrappedListener, thisArgs, disposables);
            },
            onDidEndTask: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTask)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidStartTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProcess: (listeners, thisArgs, disposables) => {
                return _asExtensionEvent(extHostTask.onDidEndTaskProcess)(listeners, thisArgs, disposables);
            },
            onDidStartTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidStartTaskProblemMatchers)(listeners, thisArgs, disposables);
            },
            onDidEndTaskProblemMatchers: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'taskProblemMatcherStatus');
                return _asExtensionEvent(extHostTask.onDidEndTaskProblemMatchers)(listeners, thisArgs, disposables);
            }
        };
        // namespace: notebook
        const notebooks = {
            createNotebookController(id, notebookType, label, handler, rendererScripts) {
                return extHostNotebookKernels.createNotebookController(extension, id, notebookType, label, handler, isProposedApiEnabled(extension, 'notebookMessaging') ? rendererScripts : undefined);
            },
            registerNotebookCellStatusBarItemProvider: (notebookType, provider) => {
                return extHostNotebook.registerNotebookCellStatusBarItemProvider(extension, notebookType, provider);
            },
            createRendererMessaging(rendererId) {
                return extHostNotebookRenderers.createRendererMessaging(extension, rendererId);
            },
            createNotebookControllerDetectionTask(notebookType) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.createNotebookControllerDetectionTask(extension, notebookType);
            },
            registerKernelSourceActionProvider(notebookType, provider) {
                checkProposedApiEnabled(extension, 'notebookKernelSource');
                return extHostNotebookKernels.registerKernelSourceActionProvider(extension, notebookType, provider);
            },
        };
        // namespace: l10n
        const l10n = {
            t(...params) {
                if (typeof params[0] === 'string') {
                    const key = params.shift();
                    // We have either rest args which are Array<string | number | boolean> or an array with a single Record<string, any>.
                    // This ensures we get a Record<string | number, any> which will be formatted correctly.
                    const argsFormatted = !params || typeof params[0] !== 'object' ? params : params[0];
                    return extHostLocalization.getMessage(extension.identifier.value, { message: key, args: argsFormatted });
                }
                return extHostLocalization.getMessage(extension.identifier.value, params[0]);
            },
            get bundle() {
                return extHostLocalization.getBundle(extension.identifier.value);
            },
            get uri() {
                return extHostLocalization.getBundleUri(extension.identifier.value);
            }
        };
        // namespace: interactive
        const interactive = {
            transferActiveChat(toWorkspace) {
                checkProposedApiEnabled(extension, 'interactive');
                return extHostChatAgents2.transferActiveChat(toWorkspace);
            }
        };
        // namespace: ai
        const ai = {
            getRelatedInformation(query, types) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.getRelatedInformation(extension, query, types);
            },
            registerRelatedInformationProvider(type, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiRelatedInformation.registerRelatedInformationProvider(extension, type, provider);
            },
            registerEmbeddingVectorProvider(model, provider) {
                checkProposedApiEnabled(extension, 'aiRelatedInformation');
                return extHostAiEmbeddingVector.registerEmbeddingVectorProvider(extension, model, provider);
            },
            registerSettingsSearchProvider(provider) {
                checkProposedApiEnabled(extension, 'aiSettingsSearch');
                return extHostAiSettingsSearch.registerSettingsSearchProvider(extension, provider);
            }
        };
        // namespace: chatregisterMcpServerDefinitionProvider
        const chat = {
            registerMappedEditsProvider(_selector, _provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                // no longer supported
                return { dispose() { } };
            },
            registerMappedEditsProvider2(provider) {
                checkProposedApiEnabled(extension, 'mappedEditsProvider');
                return extHostCodeMapper.registerMappedEditsProvider(extension, provider);
            },
            createChatParticipant(id, handler) {
                return extHostChatAgents2.createChatAgent(extension, id, handler);
            },
            createDynamicChatParticipant(id, dynamicProps, handler) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.createDynamicChatAgent(extension, id, dynamicProps, handler);
            },
            registerChatParticipantDetectionProvider(provider) {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return extHostChatAgents2.registerChatParticipantDetectionProvider(extension, provider);
            },
            registerRelatedFilesProvider(provider, metadata) {
                checkProposedApiEnabled(extension, 'chatEditing');
                return extHostChatAgents2.registerRelatedFilesProvider(extension, provider, metadata);
            },
            onDidDisposeChatSession: (listeners, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'chatParticipantPrivate');
                return _asExtensionEvent(extHostChatAgents2.onDidDisposeChatSession)(listeners, thisArgs, disposables);
            },
            registerChatSessionsProvider(provider) {
                checkProposedApiEnabled(extension, 'chatSessionsProvider');
                return extHostChatSessions.registerChatSessionsProvider(provider);
            },
        };
        // namespace: lm
        const lm = {
            selectChatModels: (selector) => {
                return extHostLanguageModels.selectLanguageModels(extension, selector ?? {});
            },
            onDidChangeChatModels: (listener, thisArgs, disposables) => {
                return extHostLanguageModels.onDidChangeProviders(listener, thisArgs, disposables);
            },
            registerChatModelProvider: (id, provider, metadata) => {
                checkProposedApiEnabled(extension, 'chatProvider');
                return extHostLanguageModels.registerLanguageModel(extension, id, provider, metadata);
            },
            // --- embeddings
            get embeddingModels() {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.embeddingsModels;
            },
            onDidChangeEmbeddingModels: (listener, thisArgs, disposables) => {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.onDidChange(listener, thisArgs, disposables);
            },
            registerEmbeddingsProvider(embeddingsModel, provider) {
                checkProposedApiEnabled(extension, 'embeddings');
                return extHostEmbeddings.registerEmbeddingsProvider(extension, embeddingsModel, provider);
            },
            async computeEmbeddings(embeddingsModel, input, token) {
                checkProposedApiEnabled(extension, 'embeddings');
                if (typeof input === 'string') {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
                else {
                    return extHostEmbeddings.computeEmbeddings(embeddingsModel, input, token);
                }
            },
            registerTool(name, tool) {
                return extHostLanguageModelTools.registerTool(extension, name, tool);
            },
            invokeTool(name, parameters, token) {
                return extHostLanguageModelTools.invokeTool(extension, name, parameters, token);
            },
            get tools() {
                return extHostLanguageModelTools.getTools(extension);
            },
            fileIsIgnored(uri, token) {
                return extHostLanguageModels.fileIsIgnored(extension, uri, token);
            },
            registerIgnoredFileProvider(provider) {
                return extHostLanguageModels.registerIgnoredFileProvider(extension, provider);
            },
            registerMcpServerDefinitionProvider(id, provider) {
                return extHostMcp.registerMcpConfigurationProvider(extension, id, provider);
            },
            onDidChangeChatRequestTools(...args) {
                checkProposedApiEnabled(extension, 'chatParticipantAdditions');
                return _asExtensionEvent(extHostChatAgents2.onDidChangeChatRequestTools)(...args);
            }
        };
        // namespace: speech
        const speech = {
            registerSpeechProvider(id, provider) {
                checkProposedApiEnabled(extension, 'speech');
                return extHostSpeech.registerProvider(extension.identifier, id, provider);
            }
        };
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            version: initData.version,
            // namespaces
            ai,
            authentication,
            commands,
            comments,
            chat,
            debug,
            env,
            extensions,
            interactive,
            l10n,
            languages,
            lm,
            notebooks,
            scm,
            speech,
            tasks,
            tests,
            window,
            workspace,
            // types
            Breakpoint: extHostTypes.Breakpoint,
            TerminalOutputAnchor: extHostTypes.TerminalOutputAnchor,
            ChatResultFeedbackKind: extHostTypes.ChatResultFeedbackKind,
            ChatVariableLevel: extHostTypes.ChatVariableLevel,
            ChatCompletionItem: extHostTypes.ChatCompletionItem,
            ChatReferenceDiagnostic: extHostTypes.ChatReferenceDiagnostic,
            CallHierarchyIncomingCall: extHostTypes.CallHierarchyIncomingCall,
            CallHierarchyItem: extHostTypes.CallHierarchyItem,
            CallHierarchyOutgoingCall: extHostTypes.CallHierarchyOutgoingCall,
            CancellationError: errors.CancellationError,
            CancellationTokenSource: CancellationTokenSource,
            CandidatePortSource: CandidatePortSource,
            CodeAction: extHostTypes.CodeAction,
            CodeActionKind: extHostTypes.CodeActionKind,
            CodeActionTriggerKind: extHostTypes.CodeActionTriggerKind,
            CodeLens: extHostTypes.CodeLens,
            Color: extHostTypes.Color,
            ColorInformation: extHostTypes.ColorInformation,
            ColorPresentation: extHostTypes.ColorPresentation,
            ColorThemeKind: extHostTypes.ColorThemeKind,
            CommentMode: extHostTypes.CommentMode,
            CommentState: extHostTypes.CommentState,
            CommentThreadCollapsibleState: extHostTypes.CommentThreadCollapsibleState,
            CommentThreadState: extHostTypes.CommentThreadState,
            CommentThreadApplicability: extHostTypes.CommentThreadApplicability,
            CommentThreadFocus: extHostTypes.CommentThreadFocus,
            CompletionItem: extHostTypes.CompletionItem,
            CompletionItemKind: extHostTypes.CompletionItemKind,
            CompletionItemTag: extHostTypes.CompletionItemTag,
            CompletionList: extHostTypes.CompletionList,
            CompletionTriggerKind: extHostTypes.CompletionTriggerKind,
            ConfigurationTarget: extHostTypes.ConfigurationTarget,
            CustomExecution: extHostTypes.CustomExecution,
            DebugAdapterExecutable: extHostTypes.DebugAdapterExecutable,
            DebugAdapterInlineImplementation: extHostTypes.DebugAdapterInlineImplementation,
            DebugAdapterNamedPipeServer: extHostTypes.DebugAdapterNamedPipeServer,
            DebugAdapterServer: extHostTypes.DebugAdapterServer,
            DebugConfigurationProviderTriggerKind: DebugConfigurationProviderTriggerKind,
            DebugConsoleMode: extHostTypes.DebugConsoleMode,
            DebugVisualization: extHostTypes.DebugVisualization,
            DecorationRangeBehavior: extHostTypes.DecorationRangeBehavior,
            Diagnostic: extHostTypes.Diagnostic,
            DiagnosticRelatedInformation: extHostTypes.DiagnosticRelatedInformation,
            DiagnosticSeverity: extHostTypes.DiagnosticSeverity,
            DiagnosticTag: extHostTypes.DiagnosticTag,
            Disposable: extHostTypes.Disposable,
            DocumentHighlight: extHostTypes.DocumentHighlight,
            DocumentHighlightKind: extHostTypes.DocumentHighlightKind,
            MultiDocumentHighlight: extHostTypes.MultiDocumentHighlight,
            DocumentLink: extHostTypes.DocumentLink,
            DocumentSymbol: extHostTypes.DocumentSymbol,
            EndOfLine: extHostTypes.EndOfLine,
            EnvironmentVariableMutatorType: extHostTypes.EnvironmentVariableMutatorType,
            EvaluatableExpression: extHostTypes.EvaluatableExpression,
            InlineValueText: extHostTypes.InlineValueText,
            InlineValueVariableLookup: extHostTypes.InlineValueVariableLookup,
            InlineValueEvaluatableExpression: extHostTypes.InlineValueEvaluatableExpression,
            InlineCompletionTriggerKind: extHostTypes.InlineCompletionTriggerKind,
            InlineCompletionsDisposeReasonKind: extHostTypes.InlineCompletionsDisposeReasonKind,
            EventEmitter: Emitter,
            ExtensionKind: extHostTypes.ExtensionKind,
            ExtensionMode: extHostTypes.ExtensionMode,
            ExternalUriOpenerPriority: extHostTypes.ExternalUriOpenerPriority,
            FileChangeType: extHostTypes.FileChangeType,
            FileDecoration: extHostTypes.FileDecoration,
            FileDecoration2: extHostTypes.FileDecoration,
            FileSystemError: extHostTypes.FileSystemError,
            FileType: files.FileType,
            FilePermission: files.FilePermission,
            FoldingRange: extHostTypes.FoldingRange,
            FoldingRangeKind: extHostTypes.FoldingRangeKind,
            FunctionBreakpoint: extHostTypes.FunctionBreakpoint,
            InlineCompletionItem: extHostTypes.InlineSuggestion,
            InlineCompletionList: extHostTypes.InlineSuggestionList,
            Hover: extHostTypes.Hover,
            VerboseHover: extHostTypes.VerboseHover,
            HoverVerbosityAction: extHostTypes.HoverVerbosityAction,
            IndentAction: languageConfiguration.IndentAction,
            Location: extHostTypes.Location,
            MarkdownString: extHostTypes.MarkdownString,
            OverviewRulerLane: OverviewRulerLane,
            ParameterInformation: extHostTypes.ParameterInformation,
            PortAutoForwardAction: extHostTypes.PortAutoForwardAction,
            Position: extHostTypes.Position,
            ProcessExecution: extHostTypes.ProcessExecution,
            ProgressLocation: extHostTypes.ProgressLocation,
            QuickInputButtonLocation: extHostTypes.QuickInputButtonLocation,
            QuickInputButtons: extHostTypes.QuickInputButtons,
            Range: extHostTypes.Range,
            RelativePattern: extHostTypes.RelativePattern,
            Selection: extHostTypes.Selection,
            SelectionRange: extHostTypes.SelectionRange,
            SemanticTokens: extHostTypes.SemanticTokens,
            SemanticTokensBuilder: extHostTypes.SemanticTokensBuilder,
            SemanticTokensEdit: extHostTypes.SemanticTokensEdit,
            SemanticTokensEdits: extHostTypes.SemanticTokensEdits,
            SemanticTokensLegend: extHostTypes.SemanticTokensLegend,
            ShellExecution: extHostTypes.ShellExecution,
            ShellQuoting: extHostTypes.ShellQuoting,
            SignatureHelp: extHostTypes.SignatureHelp,
            SignatureHelpTriggerKind: extHostTypes.SignatureHelpTriggerKind,
            SignatureInformation: extHostTypes.SignatureInformation,
            SnippetString: extHostTypes.SnippetString,
            SourceBreakpoint: extHostTypes.SourceBreakpoint,
            StandardTokenType: extHostTypes.StandardTokenType,
            StatusBarAlignment: extHostTypes.StatusBarAlignment,
            SymbolInformation: extHostTypes.SymbolInformation,
            SymbolKind: extHostTypes.SymbolKind,
            SymbolTag: extHostTypes.SymbolTag,
            Task: extHostTypes.Task,
            TaskEventKind: extHostTypes.TaskEventKind,
            TaskGroup: extHostTypes.TaskGroup,
            TaskPanelKind: extHostTypes.TaskPanelKind,
            TaskRevealKind: extHostTypes.TaskRevealKind,
            TaskScope: extHostTypes.TaskScope,
            TerminalLink: extHostTypes.TerminalLink,
            TerminalQuickFixTerminalCommand: extHostTypes.TerminalQuickFixCommand,
            TerminalQuickFixOpener: extHostTypes.TerminalQuickFixOpener,
            TerminalLocation: extHostTypes.TerminalLocation,
            TerminalProfile: extHostTypes.TerminalProfile,
            TerminalExitReason: extHostTypes.TerminalExitReason,
            TerminalShellExecutionCommandLineConfidence: extHostTypes.TerminalShellExecutionCommandLineConfidence,
            TerminalCompletionItem: extHostTypes.TerminalCompletionItem,
            TerminalCompletionItemKind: extHostTypes.TerminalCompletionItemKind,
            TerminalCompletionList: extHostTypes.TerminalCompletionList,
            TerminalShellType: extHostTypes.TerminalShellType,
            TextDocumentSaveReason: extHostTypes.TextDocumentSaveReason,
            TextEdit: extHostTypes.TextEdit,
            SnippetTextEdit: extHostTypes.SnippetTextEdit,
            TextEditorCursorStyle: TextEditorCursorStyle,
            TextEditorChangeKind: extHostTypes.TextEditorChangeKind,
            TextEditorLineNumbersStyle: extHostTypes.TextEditorLineNumbersStyle,
            TextEditorRevealType: extHostTypes.TextEditorRevealType,
            TextEditorSelectionChangeKind: extHostTypes.TextEditorSelectionChangeKind,
            SyntaxTokenType: extHostTypes.SyntaxTokenType,
            TextDocumentChangeReason: extHostTypes.TextDocumentChangeReason,
            ThemeColor: extHostTypes.ThemeColor,
            ThemeIcon: extHostTypes.ThemeIcon,
            TreeItem: extHostTypes.TreeItem,
            TreeItemCheckboxState: extHostTypes.TreeItemCheckboxState,
            TreeItemCollapsibleState: extHostTypes.TreeItemCollapsibleState,
            TypeHierarchyItem: extHostTypes.TypeHierarchyItem,
            UIKind: UIKind,
            Uri: URI,
            ViewColumn: extHostTypes.ViewColumn,
            WorkspaceEdit: extHostTypes.WorkspaceEdit,
            // proposed api types
            DocumentPasteTriggerKind: extHostTypes.DocumentPasteTriggerKind,
            DocumentDropEdit: extHostTypes.DocumentDropEdit,
            DocumentDropOrPasteEditKind: extHostTypes.DocumentDropOrPasteEditKind,
            DocumentPasteEdit: extHostTypes.DocumentPasteEdit,
            InlayHint: extHostTypes.InlayHint,
            InlayHintLabelPart: extHostTypes.InlayHintLabelPart,
            InlayHintKind: extHostTypes.InlayHintKind,
            RemoteAuthorityResolverError: extHostTypes.RemoteAuthorityResolverError,
            ResolvedAuthority: extHostTypes.ResolvedAuthority,
            ManagedResolvedAuthority: extHostTypes.ManagedResolvedAuthority,
            SourceControlInputBoxValidationType: extHostTypes.SourceControlInputBoxValidationType,
            ExtensionRuntime: extHostTypes.ExtensionRuntime,
            TimelineItem: extHostTypes.TimelineItem,
            NotebookRange: extHostTypes.NotebookRange,
            NotebookCellKind: extHostTypes.NotebookCellKind,
            NotebookCellExecutionState: extHostTypes.NotebookCellExecutionState,
            NotebookCellData: extHostTypes.NotebookCellData,
            NotebookData: extHostTypes.NotebookData,
            NotebookRendererScript: extHostTypes.NotebookRendererScript,
            NotebookCellStatusBarAlignment: extHostTypes.NotebookCellStatusBarAlignment,
            NotebookEditorRevealType: extHostTypes.NotebookEditorRevealType,
            NotebookCellOutput: extHostTypes.NotebookCellOutput,
            NotebookCellOutputItem: extHostTypes.NotebookCellOutputItem,
            CellErrorStackFrame: extHostTypes.CellErrorStackFrame,
            NotebookCellStatusBarItem: extHostTypes.NotebookCellStatusBarItem,
            NotebookControllerAffinity: extHostTypes.NotebookControllerAffinity,
            NotebookControllerAffinity2: extHostTypes.NotebookControllerAffinity2,
            NotebookEdit: extHostTypes.NotebookEdit,
            NotebookKernelSourceAction: extHostTypes.NotebookKernelSourceAction,
            NotebookVariablesRequestKind: extHostTypes.NotebookVariablesRequestKind,
            PortAttributes: extHostTypes.PortAttributes,
            LinkedEditingRanges: extHostTypes.LinkedEditingRanges,
            TestResultState: extHostTypes.TestResultState,
            TestRunRequest: extHostTypes.TestRunRequest,
            TestMessage: extHostTypes.TestMessage,
            TestMessageStackFrame: extHostTypes.TestMessageStackFrame,
            TestTag: extHostTypes.TestTag,
            TestRunProfileKind: extHostTypes.TestRunProfileKind,
            TextSearchCompleteMessageType: TextSearchCompleteMessageType,
            DataTransfer: extHostTypes.DataTransfer,
            DataTransferItem: extHostTypes.DataTransferItem,
            TestCoverageCount: extHostTypes.TestCoverageCount,
            FileCoverage: extHostTypes.FileCoverage,
            StatementCoverage: extHostTypes.StatementCoverage,
            BranchCoverage: extHostTypes.BranchCoverage,
            DeclarationCoverage: extHostTypes.DeclarationCoverage,
            WorkspaceTrustState: extHostTypes.WorkspaceTrustState,
            LanguageStatusSeverity: extHostTypes.LanguageStatusSeverity,
            QuickPickItemKind: extHostTypes.QuickPickItemKind,
            InputBoxValidationSeverity: extHostTypes.InputBoxValidationSeverity,
            TabInputText: extHostTypes.TextTabInput,
            TabInputTextDiff: extHostTypes.TextDiffTabInput,
            TabInputTextMerge: extHostTypes.TextMergeTabInput,
            TabInputCustom: extHostTypes.CustomEditorTabInput,
            TabInputNotebook: extHostTypes.NotebookEditorTabInput,
            TabInputNotebookDiff: extHostTypes.NotebookDiffEditorTabInput,
            TabInputWebview: extHostTypes.WebviewEditorTabInput,
            TabInputTerminal: extHostTypes.TerminalEditorTabInput,
            TabInputInteractiveWindow: extHostTypes.InteractiveWindowInput,
            TabInputChat: extHostTypes.ChatEditorTabInput,
            TabInputTextMultiDiff: extHostTypes.TextMultiDiffTabInput,
            TelemetryTrustedValue: TelemetryTrustedValue,
            LogLevel: LogLevel,
            EditSessionIdentityMatch: EditSessionIdentityMatch,
            InteractiveSessionVoteDirection: extHostTypes.InteractiveSessionVoteDirection,
            ChatCopyKind: extHostTypes.ChatCopyKind,
            ChatEditingSessionActionOutcome: extHostTypes.ChatEditingSessionActionOutcome,
            InteractiveEditorResponseFeedbackKind: extHostTypes.InteractiveEditorResponseFeedbackKind,
            DebugStackFrame: extHostTypes.DebugStackFrame,
            DebugThread: extHostTypes.DebugThread,
            RelatedInformationType: extHostTypes.RelatedInformationType,
            SpeechToTextStatus: extHostTypes.SpeechToTextStatus,
            TextToSpeechStatus: extHostTypes.TextToSpeechStatus,
            PartialAcceptTriggerKind: extHostTypes.PartialAcceptTriggerKind,
            InlineCompletionEndOfLifeReasonKind: extHostTypes.InlineCompletionEndOfLifeReasonKind,
            KeywordRecognitionStatus: extHostTypes.KeywordRecognitionStatus,
            ChatImageMimeType: extHostTypes.ChatImageMimeType,
            ChatResponseMarkdownPart: extHostTypes.ChatResponseMarkdownPart,
            ChatResponseFileTreePart: extHostTypes.ChatResponseFileTreePart,
            ChatResponseAnchorPart: extHostTypes.ChatResponseAnchorPart,
            ChatResponseProgressPart: extHostTypes.ChatResponseProgressPart,
            ChatResponseProgressPart2: extHostTypes.ChatResponseProgressPart2,
            ChatResponseReferencePart: extHostTypes.ChatResponseReferencePart,
            ChatResponseReferencePart2: extHostTypes.ChatResponseReferencePart,
            ChatResponseCodeCitationPart: extHostTypes.ChatResponseCodeCitationPart,
            ChatResponseCodeblockUriPart: extHostTypes.ChatResponseCodeblockUriPart,
            ChatResponseWarningPart: extHostTypes.ChatResponseWarningPart,
            ChatResponseTextEditPart: extHostTypes.ChatResponseTextEditPart,
            ChatResponseNotebookEditPart: extHostTypes.ChatResponseNotebookEditPart,
            ChatResponseMarkdownWithVulnerabilitiesPart: extHostTypes.ChatResponseMarkdownWithVulnerabilitiesPart,
            ChatResponseCommandButtonPart: extHostTypes.ChatResponseCommandButtonPart,
            ChatResponseConfirmationPart: extHostTypes.ChatResponseConfirmationPart,
            ChatResponseMovePart: extHostTypes.ChatResponseMovePart,
            ChatResponseExtensionsPart: extHostTypes.ChatResponseExtensionsPart,
            ChatPrepareToolInvocationPart: extHostTypes.ChatPrepareToolInvocationPart,
            ChatResponseReferencePartStatusKind: extHostTypes.ChatResponseReferencePartStatusKind,
            ChatRequestTurn: extHostTypes.ChatRequestTurn,
            ChatRequestTurn2: extHostTypes.ChatRequestTurn,
            ChatResponseTurn: extHostTypes.ChatResponseTurn,
            ChatLocation: extHostTypes.ChatLocation,
            ChatRequestEditorData: extHostTypes.ChatRequestEditorData,
            ChatRequestNotebookData: extHostTypes.ChatRequestNotebookData,
            ChatReferenceBinaryData: extHostTypes.ChatReferenceBinaryData,
            ChatRequestEditedFileEventKind: extHostTypes.ChatRequestEditedFileEventKind,
            LanguageModelChatMessageRole: extHostTypes.LanguageModelChatMessageRole,
            LanguageModelChatMessage: extHostTypes.LanguageModelChatMessage,
            LanguageModelChatMessage2: extHostTypes.LanguageModelChatMessage2,
            LanguageModelToolResultPart: extHostTypes.LanguageModelToolResultPart,
            LanguageModelToolResultPart2: extHostTypes.LanguageModelToolResultPart2,
            LanguageModelTextPart: extHostTypes.LanguageModelTextPart,
            LanguageModelToolCallPart: extHostTypes.LanguageModelToolCallPart,
            LanguageModelError: extHostTypes.LanguageModelError,
            LanguageModelToolResult: extHostTypes.LanguageModelToolResult,
            LanguageModelToolResult2: extHostTypes.LanguageModelToolResult2,
            LanguageModelDataPart: extHostTypes.LanguageModelDataPart,
            LanguageModelToolExtensionSource: extHostTypes.LanguageModelToolExtensionSource,
            LanguageModelToolMCPSource: extHostTypes.LanguageModelToolMCPSource,
            ExtendedLanguageModelToolResult: extHostTypes.ExtendedLanguageModelToolResult,
            PreparedTerminalToolInvocation: extHostTypes.PreparedTerminalToolInvocation,
            LanguageModelChatToolMode: extHostTypes.LanguageModelChatToolMode,
            LanguageModelPromptTsxPart: extHostTypes.LanguageModelPromptTsxPart,
            NewSymbolName: extHostTypes.NewSymbolName,
            NewSymbolNameTag: extHostTypes.NewSymbolNameTag,
            NewSymbolNameTriggerKind: extHostTypes.NewSymbolNameTriggerKind,
            ExcludeSettingOptions: ExcludeSettingOptions,
            TextSearchContext2: TextSearchContext2,
            TextSearchMatch2: TextSearchMatch2,
            AISearchKeyword: AISearchKeyword,
            TextSearchCompleteMessageTypeNew: TextSearchCompleteMessageType,
            ChatErrorLevel: extHostTypes.ChatErrorLevel,
            McpHttpServerDefinition: extHostTypes.McpHttpServerDefinition,
            McpStdioServerDefinition: extHostTypes.McpStdioServerDefinition,
            SettingsSearchResultKind: extHostTypes.SettingsSearchResultKind
        };
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC5hcGkuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdC5hcGkuaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RSxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sS0FBSyxxQkFBcUIsTUFBTSwyREFBMkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLHNCQUFzQixFQUF5QixNQUFNLG1EQUFtRCxDQUFDO0FBQ2xJLE9BQU8sS0FBSyxLQUFLLE1BQU0seUNBQXlDLENBQUM7QUFFakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdE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