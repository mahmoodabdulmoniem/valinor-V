/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { publishRepository } from './publish.js';
export class GithubRemoteSourcePublisher {
    constructor(gitAPI) {
        this.gitAPI = gitAPI;
        this.name = 'GitHub';
        this.icon = 'github';
    }
    publishRepository(repository) {
        return publishRepository(this.gitAPI, repository);
    }
}
//# sourceMappingURL=remoteSourcePublisher.js.map