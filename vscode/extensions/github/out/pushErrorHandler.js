/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TextDecoder } from 'util';
import { commands, env, ProgressLocation, Uri, window, workspace, FileType, l10n } from 'vscode';
import { getOctokit } from './auth.js';
import * as path from 'path';
export function isInCodespaces() {
    return env.remoteName === 'codespaces';
}
const PR_TEMPLATE_FILES = [
    { dir: '.', files: ['pull_request_template.md', 'PULL_REQUEST_TEMPLATE.md'] },
    { dir: 'docs', files: ['pull_request_template.md', 'PULL_REQUEST_TEMPLATE.md'] },
    { dir: '.github', files: ['PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE.md'] }
];
const PR_TEMPLATE_DIRECTORY_NAMES = [
    'PULL_REQUEST_TEMPLATE',
    'docs/PULL_REQUEST_TEMPLATE',
    '.github/PULL_REQUEST_TEMPLATE'
];
async function assertMarkdownFiles(dir, files) {
    const dirFiles = await workspace.fs.readDirectory(dir);
    return dirFiles
        .filter(([name, type]) => Boolean(type & FileType.File) && files.indexOf(name) !== -1)
        .map(([name]) => Uri.joinPath(dir, name));
}
async function findMarkdownFilesInDir(uri) {
    const files = await workspace.fs.readDirectory(uri);
    return files
        .filter(([name, type]) => Boolean(type & FileType.File) && path.extname(name) === '.md')
        .map(([name]) => Uri.joinPath(uri, name));
}
/**
 * PR templates can be:
 * - In the root, `docs`, or `.github` folders, called `pull_request_template.md` or `PULL_REQUEST_TEMPLATE.md`
 * - Or, in a `PULL_REQUEST_TEMPLATE` directory directly below the root, `docs`, or `.github` folders, called `*.md`
 *
 * NOTE This method is a modified copy of a method with same name at microsoft/vscode-pull-request-github repository:
 *   https://github.com/microsoft/vscode-pull-request-github/blob/0a0c3c6c21c0b9c2f4d5ffbc3f8c6a825472e9e6/src/github/folderRepositoryManager.ts#L1061
 *
 */
export async function findPullRequestTemplates(repositoryRootUri) {
    const results = await Promise.allSettled([
        ...PR_TEMPLATE_FILES.map(x => assertMarkdownFiles(Uri.joinPath(repositoryRootUri, x.dir), x.files)),
        ...PR_TEMPLATE_DIRECTORY_NAMES.map(x => findMarkdownFilesInDir(Uri.joinPath(repositoryRootUri, x)))
    ]);
    return results.flatMap(x => x.status === 'fulfilled' && x.value || []);
}
export async function pickPullRequestTemplate(repositoryRootUri, templates) {
    const quickPickItemFromUri = (x) => ({ label: path.relative(repositoryRootUri.path, x.path), template: x });
    const quickPickItems = [
        {
            label: l10n.t('No template'),
            picked: true,
            template: undefined,
        },
        ...templates.map(quickPickItemFromUri)
    ];
    const quickPickOptions = {
        placeHolder: l10n.t('Select the Pull Request template'),
        ignoreFocusOut: true
    };
    const pickedTemplate = await window.showQuickPick(quickPickItems, quickPickOptions);
    return pickedTemplate?.template;
}
class CommandErrorOutputTextDocumentContentProvider {
    constructor() {
        this.items = new Map();
    }
    set(uri, contents) {
        this.items.set(uri.path, contents);
    }
    delete(uri) {
        this.items.delete(uri.path);
    }
    provideTextDocumentContent(uri) {
        return this.items.get(uri.path);
    }
}
export class GithubPushErrorHandler {
    constructor(telemetryReporter) {
        this.telemetryReporter = telemetryReporter;
        this.disposables = [];
        this.commandErrors = new CommandErrorOutputTextDocumentContentProvider();
        this.disposables.push(workspace.registerTextDocumentContentProvider('github-output', this.commandErrors));
    }
    async handlePushError(repository, remote, refspec, error) {
        if (error.gitErrorCode !== "PermissionDenied" /* GitErrorCodes.PermissionDenied */ && error.gitErrorCode !== "PushRejected" /* GitErrorCodes.PushRejected */) {
            return false;
        }
        const remoteUrl = remote.pushUrl || (isInCodespaces() ? remote.fetchUrl : undefined);
        if (!remoteUrl) {
            return false;
        }
        const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\/.]+)/i.exec(remoteUrl);
        if (!match) {
            return false;
        }
        if (/^:/.test(refspec)) {
            return false;
        }
        const [, owner, repo] = match;
        if (error.gitErrorCode === "PermissionDenied" /* GitErrorCodes.PermissionDenied */) {
            await this.handlePermissionDeniedError(repository, remote, refspec, owner, repo);
            /* __GDPR__
                "pushErrorHandler" : {
                    "owner": "lszomoru",
                    "handler": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryReporter.sendTelemetryEvent('pushErrorHandler', { handler: 'PermissionDenied' });
            return true;
        }
        // Push protection
        if (/GH009: Secrets detected!/i.test(error.stderr)) {
            await this.handlePushProtectionError(owner, repo, error.stderr);
            /* __GDPR__
                "pushErrorHandler" : {
                    "owner": "lszomoru",
                    "handler": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryReporter.sendTelemetryEvent('pushErrorHandler', { handler: 'PushRejected.PushProtection' });
            return true;
        }
        /* __GDPR__
            "pushErrorHandler" : {
                "owner": "lszomoru",
                "handler": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        this.telemetryReporter.sendTelemetryEvent('pushErrorHandler', { handler: 'None' });
        return false;
    }
    async handlePermissionDeniedError(repository, remote, refspec, owner, repo) {
        const yes = l10n.t('Create Fork');
        const no = l10n.t('No');
        const askFork = l10n.t('You don\'t have permissions to push to "{0}/{1}" on GitHub. Would you like to create a fork and push to it instead?', owner, repo);
        const answer = await window.showWarningMessage(askFork, { modal: true }, yes, no);
        if (answer !== yes) {
            return;
        }
        const match = /^([^:]*):([^:]*)$/.exec(refspec);
        const localName = match ? match[1] : refspec;
        let remoteName = match ? match[2] : refspec;
        const [octokit, ghRepository] = await window.withProgress({ location: ProgressLocation.Notification, cancellable: false, title: l10n.t('Create GitHub fork') }, async (progress) => {
            progress.report({ message: l10n.t('Forking "{0}/{1}"...', owner, repo), increment: 33 });
            const octokit = await getOctokit();
            // Issue: what if the repo already exists?
            let ghRepository;
            try {
                if (isInCodespaces()) {
                    // Call into the codespaces extension to fork the repository
                    const resp = await commands.executeCommand('github.codespaces.forkRepository');
                    if (!resp) {
                        throw new Error('Unable to fork respository');
                    }
                    ghRepository = resp.repository;
                    if (resp.ref) {
                        let ref = resp.ref;
                        if (ref.startsWith('refs/heads/')) {
                            ref = ref.substr(11);
                        }
                        remoteName = ref;
                    }
                }
                else {
                    const resp = await octokit.repos.createFork({ owner, repo });
                    ghRepository = resp.data;
                }
            }
            catch (ex) {
                console.error(ex);
                throw ex;
            }
            progress.report({ message: l10n.t('Pushing changes...'), increment: 33 });
            // Issue: what if there's already an `upstream` repo?
            await repository.renameRemote(remote.name, 'upstream');
            // Issue: what if there's already another `origin` repo?
            const protocol = workspace.getConfiguration('github').get('gitProtocol');
            const remoteUrl = protocol === 'https' ? ghRepository.clone_url : ghRepository.ssh_url;
            await repository.addRemote('origin', remoteUrl);
            try {
                await repository.fetch('origin', remoteName);
                await repository.setBranchUpstream(localName, `origin/${remoteName}`);
            }
            catch {
                // noop
            }
            await repository.push('origin', localName, true);
            return [octokit, ghRepository];
        });
        // yield
        (async () => {
            const openOnGitHub = l10n.t('Open on GitHub');
            const createPR = l10n.t('Create PR');
            const action = await window.showInformationMessage(l10n.t('The fork "{0}" was successfully created on GitHub.', ghRepository.full_name), openOnGitHub, createPR);
            if (action === openOnGitHub) {
                await commands.executeCommand('vscode.open', Uri.parse(ghRepository.html_url));
            }
            else if (action === createPR) {
                const pr = await window.withProgress({ location: ProgressLocation.Notification, cancellable: false, title: l10n.t('Creating GitHub Pull Request...') }, async (_) => {
                    let title = `Update ${remoteName}`;
                    const head = repository.state.HEAD?.name;
                    let body;
                    if (head) {
                        const commit = await repository.getCommit(head);
                        title = commit.message.split('\n')[0];
                        body = commit.message.slice(title.length + 1).trim();
                    }
                    const templates = await findPullRequestTemplates(repository.rootUri);
                    if (templates.length > 0) {
                        templates.sort((a, b) => a.path.localeCompare(b.path));
                        const template = await pickPullRequestTemplate(repository.rootUri, templates);
                        if (template) {
                            body = new TextDecoder('utf-8').decode(await workspace.fs.readFile(template));
                        }
                    }
                    const { data: pr } = await octokit.pulls.create({
                        owner,
                        repo,
                        title,
                        body,
                        head: `${ghRepository.owner.login}:${remoteName}`,
                        base: ghRepository.default_branch
                    });
                    await repository.setConfig(`branch.${localName}.remote`, 'upstream');
                    await repository.setConfig(`branch.${localName}.merge`, `refs/heads/${remoteName}`);
                    await repository.setConfig(`branch.${localName}.github-pr-owner-number`, `${owner}#${repo}#${pr.number}`);
                    return pr;
                });
                const openPR = l10n.t('Open PR');
                const action = await window.showInformationMessage(l10n.t('The PR "{0}/{1}#{2}" was successfully created on GitHub.', owner, repo, pr.number), openPR);
                if (action === openPR) {
                    await commands.executeCommand('vscode.open', Uri.parse(pr.html_url));
                }
            }
        })();
    }
    async handlePushProtectionError(owner, repo, stderr) {
        // Open command output in an editor
        const timestamp = new Date().getTime();
        const uri = Uri.parse(`github-output:/github-error-${timestamp}`);
        this.commandErrors.set(uri, stderr);
        try {
            const doc = await workspace.openTextDocument(uri);
            await window.showTextDocument(doc);
        }
        finally {
            this.commandErrors.set(uri, stderr);
        }
        // Show dialog
        const learnMore = l10n.t('Learn More');
        const message = l10n.t('Your push to "{0}/{1}" was rejected by GitHub because push protection is enabled and one or more secrets were detected.', owner, repo);
        const answer = await window.showWarningMessage(message, { modal: true }, learnMore);
        if (answer === learnMore) {
            commands.executeCommand('vscode.open', 'https://aka.ms/vscode-github-push-protection');
        }
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
//# sourceMappingURL=pushErrorHandler.js.map