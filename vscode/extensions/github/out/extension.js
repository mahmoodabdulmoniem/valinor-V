/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commands, Disposable, extensions, l10n, LogLevel, window } from 'vscode';
import { TelemetryReporter } from '@vscode/extension-telemetry';
import { GithubRemoteSourceProvider } from './remoteSourceProvider.js';
import { registerCommands } from './commands.js';
import { GithubCredentialProviderManager } from './credentialProvider.js';
import { DisposableStore, repositoryHasGitHubRemote } from './util.js';
import { GithubPushErrorHandler } from './pushErrorHandler.js';
import { GithubRemoteSourcePublisher } from './remoteSourcePublisher.js';
import { GitHubBranchProtectionProviderManager } from './branchProtection.js';
import { GitHubCanonicalUriProvider } from './canonicalUriProvider.js';
import { VscodeDevShareProvider } from './shareProviders.js';
import { GitHubSourceControlHistoryItemDetailsProvider } from './historyItemDetailsProvider.js';
import { OctokitService } from './auth.js';
export function activate(context) {
    const disposables = [];
    context.subscriptions.push(new Disposable(() => Disposable.from(...disposables).dispose()));
    const logger = window.createOutputChannel('GitHub', { log: true });
    disposables.push(logger);
    const onDidChangeLogLevel = (logLevel) => {
        logger.appendLine(l10n.t('Log level: {0}', LogLevel[logLevel]));
    };
    disposables.push(logger.onDidChangeLogLevel(onDidChangeLogLevel));
    onDidChangeLogLevel(logger.logLevel);
    const { aiKey } = context.extension.packageJSON;
    const telemetryReporter = new TelemetryReporter(aiKey);
    disposables.push(telemetryReporter);
    const octokitService = new OctokitService();
    disposables.push(octokitService);
    disposables.push(initializeGitBaseExtension());
    disposables.push(initializeGitExtension(context, octokitService, telemetryReporter, logger));
}
function initializeGitBaseExtension() {
    const disposables = new DisposableStore();
    const initialize = () => {
        try {
            const gitBaseAPI = gitBaseExtension.getAPI(1);
            disposables.add(gitBaseAPI.registerRemoteSourceProvider(new GithubRemoteSourceProvider()));
        }
        catch (err) {
            console.error('Could not initialize GitHub extension');
            console.warn(err);
        }
    };
    const onDidChangeGitBaseExtensionEnablement = (enabled) => {
        if (!enabled) {
            disposables.dispose();
        }
        else {
            initialize();
        }
    };
    const gitBaseExtension = extensions.getExtension('vscode.git-base').exports;
    disposables.add(gitBaseExtension.onDidChangeEnablement(onDidChangeGitBaseExtensionEnablement));
    onDidChangeGitBaseExtensionEnablement(gitBaseExtension.enabled);
    return disposables;
}
function setGitHubContext(gitAPI, disposables) {
    if (gitAPI.repositories.find(repo => repositoryHasGitHubRemote(repo))) {
        commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
    }
    else {
        const openRepoDisposable = gitAPI.onDidOpenRepository(async (e) => {
            await e.status();
            if (repositoryHasGitHubRemote(e)) {
                commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
                openRepoDisposable.dispose();
            }
        });
        disposables.add(openRepoDisposable);
    }
}
function initializeGitExtension(context, octokitService, telemetryReporter, logger) {
    const disposables = new DisposableStore();
    let gitExtension = extensions.getExtension('vscode.git');
    const initialize = () => {
        gitExtension.activate()
            .then(extension => {
            const onDidChangeGitExtensionEnablement = (enabled) => {
                if (enabled) {
                    const gitAPI = extension.getAPI(1);
                    disposables.add(registerCommands(gitAPI));
                    disposables.add(new GithubCredentialProviderManager(gitAPI));
                    disposables.add(new GitHubBranchProtectionProviderManager(gitAPI, context.globalState, octokitService, logger, telemetryReporter));
                    disposables.add(gitAPI.registerPushErrorHandler(new GithubPushErrorHandler(telemetryReporter)));
                    disposables.add(gitAPI.registerRemoteSourcePublisher(new GithubRemoteSourcePublisher(gitAPI)));
                    disposables.add(gitAPI.registerSourceControlHistoryItemDetailsProvider(new GitHubSourceControlHistoryItemDetailsProvider(gitAPI, octokitService, logger)));
                    disposables.add(new GitHubCanonicalUriProvider(gitAPI));
                    disposables.add(new VscodeDevShareProvider(gitAPI));
                    setGitHubContext(gitAPI, disposables);
                    commands.executeCommand('setContext', 'git-base.gitEnabled', true);
                }
                else {
                    disposables.dispose();
                }
            };
            disposables.add(extension.onDidChangeEnablement(onDidChangeGitExtensionEnablement));
            onDidChangeGitExtensionEnablement(extension.enabled);
        });
    };
    if (gitExtension) {
        initialize();
    }
    else {
        const listener = extensions.onDidChange(() => {
            if (!gitExtension && extensions.getExtension('vscode.git')) {
                gitExtension = extensions.getExtension('vscode.git');
                initialize();
                listener.dispose();
            }
        });
        disposables.add(listener);
    }
    return disposables;
}
//# sourceMappingURL=extension.js.map