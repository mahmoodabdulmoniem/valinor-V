/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { publishRepository } from './publish.js';
import { DisposableStore, getRepositoryFromUrl } from './util.js';
import { getCommitLink, getLink, getVscodeDevHost } from './links.js';
async function copyVscodeDevLink(gitAPI, useSelection, context, includeRange = true) {
    try {
        const permalink = await getLink(gitAPI, useSelection, true, getVscodeDevHost(), 'headlink', context, includeRange);
        if (permalink) {
            return vscode.env.clipboard.writeText(permalink);
        }
    }
    catch (err) {
        if (!(err instanceof vscode.CancellationError)) {
            vscode.window.showErrorMessage(err.message);
        }
    }
}
async function openVscodeDevLink(gitAPI) {
    try {
        const headlink = await getLink(gitAPI, true, false, getVscodeDevHost(), 'headlink');
        return headlink ? vscode.Uri.parse(headlink) : undefined;
    }
    catch (err) {
        if (!(err instanceof vscode.CancellationError)) {
            vscode.window.showErrorMessage(err.message);
        }
        return undefined;
    }
}
async function openOnGitHub(repository, commit) {
    // Get the unique remotes that contain the commit
    const branches = await repository.getBranches({ contains: commit, remote: true });
    const remoteNames = new Set(branches.filter(b => b.type === 1 /* RefType.RemoteHead */ && b.remote).map(b => b.remote));
    // GitHub remotes that contain the commit
    const remotes = repository.state.remotes
        .filter(r => remoteNames.has(r.name) && r.fetchUrl && getRepositoryFromUrl(r.fetchUrl));
    if (remotes.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t('No GitHub remotes found that contain this commit.'));
        return;
    }
    // upstream -> origin -> first
    const remote = remotes.find(r => r.name === 'upstream')
        ?? remotes.find(r => r.name === 'origin')
        ?? remotes[0];
    const link = getCommitLink(remote.fetchUrl, commit);
    vscode.env.openExternal(vscode.Uri.parse(link));
}
export function registerCommands(gitAPI) {
    const disposables = new DisposableStore();
    disposables.add(vscode.commands.registerCommand('github.publish', async () => {
        try {
            publishRepository(gitAPI);
        }
        catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLink', async (context) => {
        return copyVscodeDevLink(gitAPI, true, context);
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLinkFile', async (context) => {
        return copyVscodeDevLink(gitAPI, false, context);
    }));
    disposables.add(vscode.commands.registerCommand('github.copyVscodeDevLinkWithoutRange', async (context) => {
        return copyVscodeDevLink(gitAPI, true, context, false);
    }));
    disposables.add(vscode.commands.registerCommand('github.openOnGitHub', async (url, historyItemId) => {
        const link = getCommitLink(url, historyItemId);
        vscode.env.openExternal(vscode.Uri.parse(link));
    }));
    disposables.add(vscode.commands.registerCommand('github.graph.openOnGitHub', async (repository, historyItem) => {
        if (!repository || !historyItem) {
            return;
        }
        const apiRepository = gitAPI.repositories.find(r => r.rootUri.fsPath === repository.rootUri?.fsPath);
        if (!apiRepository) {
            return;
        }
        await openOnGitHub(apiRepository, historyItem.id);
    }));
    disposables.add(vscode.commands.registerCommand('github.timeline.openOnGitHub', async (item, uri) => {
        if (!item.id || !uri) {
            return;
        }
        const apiRepository = gitAPI.getRepository(uri);
        if (!apiRepository) {
            return;
        }
        await openOnGitHub(apiRepository, item.id);
    }));
    disposables.add(vscode.commands.registerCommand('github.openOnVscodeDev', async () => {
        return openVscodeDevLink(gitAPI);
    }));
    return disposables;
}
//# sourceMappingURL=commands.js.map