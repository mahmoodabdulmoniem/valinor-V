var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, reset } from '../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { isRemoteDiagnosticError } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProcessService } from '../../../../platform/process/common/process.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { applyZoom } from '../../../../platform/window/electron-browser/window.js';
import { BaseIssueReporterService } from '../browser/baseIssueReporterService.js';
import { IIssueFormService } from '../common/issue.js';
// GitHub has let us know that we could up our limit here to 8k. We chose 7500 to play it safe.
// ref https://github.com/microsoft/vscode/issues/159191
const MAX_URL_LENGTH = 7500;
// Github API and issues on web has a limit of 65536. We chose 65500 to play it safe.
// ref https://github.com/github/issues/issues/12858
const MAX_GITHUB_API_LENGTH = 65500;
let IssueReporter = class IssueReporter extends BaseIssueReporterService {
    constructor(disableExtensions, data, os, product, window, nativeHostService, issueFormService, processService, themeService, fileService, fileDialogService, updateService) {
        super(disableExtensions, data, os, product, window, false, issueFormService, themeService, fileService, fileDialogService);
        this.nativeHostService = nativeHostService;
        this.updateService = updateService;
        this.processService = processService;
        this.processService.getSystemInfo().then(info => {
            this.issueReporterModel.update({ systemInfo: info });
            this.receivedSystemInfo = true;
            this.updateSystemInfo(this.issueReporterModel.getData());
            this.updatePreviewButtonState();
        });
        if (this.data.issueType === 1 /* IssueType.PerformanceIssue */) {
            this.processService.getPerformanceInfo().then(info => {
                this.updatePerformanceInfo(info);
            });
        }
        this.checkForUpdates();
        this.setEventHandlers();
        applyZoom(this.data.zoomLevel, this.window);
        this.updateExperimentsInfo(this.data.experiments);
        this.updateRestrictedMode(this.data.restrictedMode);
        this.updateUnsupportedMode(this.data.isUnsupported);
    }
    async checkForUpdates() {
        const updateState = this.updateService.state;
        if (updateState.type === "ready" /* StateType.Ready */ || updateState.type === "downloaded" /* StateType.Downloaded */) {
            this.needsUpdate = true;
            const includeAcknowledgement = this.getElementById('version-acknowledgements');
            const updateBanner = this.getElementById('update-banner');
            if (updateBanner && includeAcknowledgement) {
                includeAcknowledgement.classList.remove('hidden');
                updateBanner.classList.remove('hidden');
                updateBanner.textContent = localize('updateAvailable', "A new version of {0} is available.", this.product.nameLong);
            }
        }
    }
    setEventHandlers() {
        super.setEventHandlers();
        this.addEventListener('issue-type', 'change', (event) => {
            const issueType = parseInt(event.target.value);
            this.issueReporterModel.update({ issueType: issueType });
            if (issueType === 1 /* IssueType.PerformanceIssue */ && !this.receivedPerformanceInfo) {
                this.processService.getPerformanceInfo().then(info => {
                    this.updatePerformanceInfo(info);
                });
            }
            // Resets placeholder
            const descriptionTextArea = this.getElementById('issue-title');
            if (descriptionTextArea) {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', "Please enter a title");
            }
            this.updatePreviewButtonState();
            this.setSourceOptions();
            this.render();
        });
    }
    async submitToGitHub(issueTitle, issueBody, gitHubDetails) {
        if (issueBody.length > MAX_GITHUB_API_LENGTH) {
            const extensionData = this.issueReporterModel.getData().extensionData;
            if (extensionData) {
                issueBody = issueBody.replace(extensionData, '');
                const date = new Date();
                const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
                const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
                const fileName = `extensionData_${formattedDate}_${formattedTime}.md`;
                try {
                    const downloadPath = await this.fileDialogService.showSaveDialog({
                        title: localize('saveExtensionData', "Save Extension Data"),
                        availableFileSystems: [Schemas.file],
                        defaultUri: joinPath(await this.fileDialogService.defaultFilePath(Schemas.file), fileName),
                    });
                    if (downloadPath) {
                        await this.fileService.writeFile(downloadPath, VSBuffer.fromString(extensionData));
                    }
                }
                catch (e) {
                    console.error('Writing extension data to file failed');
                    return false;
                }
            }
            else {
                console.error('Issue body too large to submit to GitHub');
                return false;
            }
        }
        const url = `https://api.github.com/repos/${gitHubDetails.owner}/${gitHubDetails.repositoryName}/issues`;
        const init = {
            method: 'POST',
            body: JSON.stringify({
                title: issueTitle,
                body: issueBody
            }),
            headers: new Headers({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.data.githubAccessToken}`
            })
        };
        const response = await fetch(url, init);
        if (!response.ok) {
            console.error('Invalid GitHub URL provided.');
            return false;
        }
        const result = await response.json();
        await this.nativeHostService.openExternal(result.html_url);
        this.close();
        return true;
    }
    async createIssue() {
        const selectedExtension = this.issueReporterModel.getData().selectedExtension;
        const hasUri = this.nonGitHubIssueUrl;
        // Short circuit if the extension provides a custom issue handler
        if (hasUri) {
            const url = this.getExtensionBugsUrl();
            if (url) {
                this.hasBeenSubmitted = true;
                await this.nativeHostService.openExternal(url);
                return true;
            }
        }
        if (!this.validateInputs()) {
            // If inputs are invalid, set focus to the first one and add listeners on them
            // to detect further changes
            const invalidInput = this.window.document.getElementsByClassName('invalid-input');
            if (invalidInput.length) {
                invalidInput[0].focus();
            }
            this.addEventListener('issue-title', 'input', _ => {
                this.validateInput('issue-title');
            });
            this.addEventListener('description', 'input', _ => {
                this.validateInput('description');
            });
            this.addEventListener('issue-source', 'change', _ => {
                this.validateInput('issue-source');
            });
            if (this.issueReporterModel.fileOnExtension()) {
                this.addEventListener('extension-selector', 'change', _ => {
                    this.validateInput('extension-selector');
                    this.validateInput('description');
                });
            }
            return false;
        }
        this.hasBeenSubmitted = true;
        const issueTitle = this.getElementById('issue-title').value;
        const issueBody = this.issueReporterModel.serialize();
        let issueUrl = this.getIssueUrl();
        if (!issueUrl) {
            console.error('No issue url found');
            return false;
        }
        if (selectedExtension?.uri) {
            const uri = URI.revive(selectedExtension.uri);
            issueUrl = uri.toString();
        }
        const gitHubDetails = this.parseGitHubUrl(issueUrl);
        const baseUrl = this.getIssueUrlWithTitle(this.getElementById('issue-title').value, issueUrl);
        let url = baseUrl + `&body=${encodeURIComponent(issueBody)}`;
        url = this.addTemplateToUrl(url, gitHubDetails?.owner, gitHubDetails?.repositoryName);
        if (this.data.githubAccessToken && gitHubDetails) {
            if (await this.submitToGitHub(issueTitle, issueBody, gitHubDetails)) {
                return true;
            }
        }
        try {
            if (url.length > MAX_URL_LENGTH || issueBody.length > MAX_GITHUB_API_LENGTH) {
                url = await this.writeToClipboard(baseUrl, issueBody);
                url = this.addTemplateToUrl(url, gitHubDetails?.owner, gitHubDetails?.repositoryName);
            }
        }
        catch (_) {
            console.error('Writing to clipboard failed');
            return false;
        }
        await this.nativeHostService.openExternal(url);
        return true;
    }
    async writeToClipboard(baseUrl, issueBody) {
        const shouldWrite = await this.issueFormService.showClipboardDialog();
        if (!shouldWrite) {
            throw new CancellationError();
        }
        await this.nativeHostService.writeClipboardText(issueBody);
        return baseUrl + `&body=${encodeURIComponent(localize('pasteData', "We have written the needed data into your clipboard because it was too large to send. Please paste."))}`;
    }
    updateSystemInfo(state) {
        const target = this.window.document.querySelector('.block-system .block-info');
        if (target) {
            const systemInfo = state.systemInfo;
            const renderedDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, systemInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'GPU Status'), $('td', undefined, Object.keys(systemInfo.gpuStatus).map(key => `${key}: ${systemInfo.gpuStatus[key]}`).join('\n'))), $('tr', undefined, $('td', undefined, 'Load (avg)'), $('td', undefined, systemInfo.load || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, systemInfo.memory)), $('tr', undefined, $('td', undefined, 'Process Argv'), $('td', undefined, systemInfo.processArgs)), $('tr', undefined, $('td', undefined, 'Screen Reader'), $('td', undefined, systemInfo.screenReader)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, systemInfo.vmHint)));
            reset(target, renderedDataTable);
            systemInfo.remoteData.forEach(remote => {
                target.appendChild($('hr'));
                if (isRemoteDiagnosticError(remote)) {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.hostName)), $('tr', undefined, $('td', undefined, ''), $('td', undefined, remote.errorMessage)));
                    target.appendChild(remoteDataTable);
                }
                else {
                    const remoteDataTable = $('table', undefined, $('tr', undefined, $('td', undefined, 'Remote'), $('td', undefined, remote.latency ? `${remote.hostName} (latency: ${remote.latency.current.toFixed(2)}ms last, ${remote.latency.average.toFixed(2)}ms average)` : remote.hostName)), $('tr', undefined, $('td', undefined, 'OS'), $('td', undefined, remote.machineInfo.os)), $('tr', undefined, $('td', undefined, 'CPUs'), $('td', undefined, remote.machineInfo.cpus || '')), $('tr', undefined, $('td', undefined, 'Memory (System)'), $('td', undefined, remote.machineInfo.memory)), $('tr', undefined, $('td', undefined, 'VM'), $('td', undefined, remote.machineInfo.vmHint)));
                    target.appendChild(remoteDataTable);
                }
            });
        }
    }
    updateRestrictedMode(restrictedMode) {
        this.issueReporterModel.update({ restrictedMode });
    }
    updateUnsupportedMode(isUnsupported) {
        this.issueReporterModel.update({ isUnsupported });
    }
    updateExperimentsInfo(experimentInfo) {
        this.issueReporterModel.update({ experimentInfo });
        const target = this.window.document.querySelector('.block-experiments .block-info');
        if (target) {
            target.textContent = experimentInfo ? experimentInfo : localize('noCurrentExperiments', "No current experiments.");
        }
    }
};
IssueReporter = __decorate([
    __param(5, INativeHostService),
    __param(6, IIssueFormService),
    __param(7, IProcessService),
    __param(8, IThemeService),
    __param(9, IFileService),
    __param(10, IFileDialogService),
    __param(11, IUpdateService)
], IssueReporter);
export { IssueReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLWJyb3dzZXIvaXNzdWVSZXBvcnRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQWEsTUFBTSw4Q0FBOEMsQ0FBQztBQUN6RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1B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