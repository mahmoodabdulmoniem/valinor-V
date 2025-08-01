/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class DisposableStore {
    constructor() {
        this.disposables = new Set();
    }
    add(disposable) {
        this.disposables.add(disposable);
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.clear();
    }
}
function decorate(decorator) {
    return (_target, key, descriptor) => {
        let fnKey = null;
        let fn = null;
        if (typeof descriptor.value === 'function') {
            fnKey = 'value';
            fn = descriptor.value;
        }
        else if (typeof descriptor.get === 'function') {
            fnKey = 'get';
            fn = descriptor.get;
        }
        if (!fn || !fnKey) {
            throw new Error('not supported');
        }
        descriptor[fnKey] = decorator(fn, key);
    };
}
function _sequentialize(fn, key) {
    const currentKey = `__$sequence$${key}`;
    return function (...args) {
        const currentPromise = this[currentKey] || Promise.resolve(null);
        const run = async () => await fn.apply(this, args);
        this[currentKey] = currentPromise.then(run, run);
        return this[currentKey];
    };
}
export const sequentialize = decorate(_sequentialize);
export function groupBy(data, compare) {
    const result = [];
    let currentGroup = undefined;
    for (const element of data.slice(0).sort(compare)) {
        if (!currentGroup || compare(currentGroup[0], element) !== 0) {
            currentGroup = [element];
            result.push(currentGroup);
        }
        else {
            currentGroup.push(element);
        }
    }
    return result;
}
export function getRepositoryFromUrl(url) {
    const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/i.exec(url)
        || /^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/i.exec(url);
    return match ? { owner: match[1], repo: match[2] } : undefined;
}
export function getRepositoryFromQuery(query) {
    const match = /^([^/]+)\/([^/]+)$/i.exec(query);
    return match ? { owner: match[1], repo: match[2] } : undefined;
}
export function repositoryHasGitHubRemote(repository) {
    return !!repository.state.remotes.find(remote => remote.fetchUrl ? getRepositoryFromUrl(remote.fetchUrl) : undefined);
}
export function getRepositoryDefaultRemoteUrl(repository) {
    const remotes = repository.state.remotes
        .filter(remote => remote.fetchUrl && getRepositoryFromUrl(remote.fetchUrl));
    if (remotes.length === 0) {
        return undefined;
    }
    // upstream -> origin -> first
    const remote = remotes.find(remote => remote.name === 'upstream')
        ?? remotes.find(remote => remote.name === 'origin')
        ?? remotes[0];
    return remote.fetchUrl;
}
export function getRepositoryDefaultRemote(repository) {
    const fetchUrl = getRepositoryDefaultRemoteUrl(repository);
    return fetchUrl ? getRepositoryFromUrl(fetchUrl) : undefined;
}
//# sourceMappingURL=util.js.map