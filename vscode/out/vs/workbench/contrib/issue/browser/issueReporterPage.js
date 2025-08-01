/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escape } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
const sendSystemInfoLabel = escape(localize('sendSystemInfo', "Include my system information"));
const sendProcessInfoLabel = escape(localize('sendProcessInfo', "Include my currently running processes"));
const sendWorkspaceInfoLabel = escape(localize('sendWorkspaceInfo', "Include my workspace metadata"));
const sendExtensionsLabel = escape(localize('sendExtensions', "Include my enabled extensions"));
const sendExperimentsLabel = escape(localize('sendExperiments', "Include A/B experiment info"));
const sendExtensionData = escape(localize('sendExtensionData', "Include additional extension info"));
const acknowledgementsLabel = escape(localize('acknowledgements', "I acknowledge that my VS Code version is not updated and this issue may be closed."));
const reviewGuidanceLabel = localize(// intentionally not escaped because of its embedded tags
{
    key: 'reviewGuidanceLabel',
    comment: [
        '{Locked="<a href=\"https://github.com/microsoft/vscode/wiki/Submitting-Bugs-and-Suggestions\" target=\"_blank\">"}',
        '{Locked="</a>"}'
    ]
}, 'Before you report an issue here please <a href="https://github.com/microsoft/vscode/wiki/Submitting-Bugs-and-Suggestions" target="_blank">review the guidance we provide</a>. Please complete the form in English.');
export default () => `
<div id="update-banner" class="issue-reporter-update-banner hidden">
	<span class="update-banner-text" id="update-banner-text">
		<!-- To be dynamically filled -->
	</span>
</div>
<div class="issue-reporter" id="issue-reporter">
	<div id="english" class="input-group hidden">${escape(localize('completeInEnglish', "Please complete the form in English."))}</div>

	<div id="review-guidance-help-text" class="input-group">${reviewGuidanceLabel}</div>

	<div class="section">
		<div class="input-group">
			<label class="inline-label" for="issue-type">${escape(localize('issueTypeLabel', "This is a"))}</label>
			<select id="issue-type" class="inline-form-control">
				<!-- To be dynamically filled -->
			</select>
		</div>

		<div class="input-group" id="problem-source">
			<label class="inline-label" for="issue-source">${escape(localize('issueSourceLabel', "For"))} <span class="required-input">*</span></label>
			<select id="issue-source" class="inline-form-control" required>
				<!-- To be dynamically filled -->
			</select>
			<div id="issue-source-empty-error" class="validation-error hidden" role="alert">${escape(localize('issueSourceEmptyValidation', "An issue source is required."))}</div>
			<div id="problem-source-help-text" class="instructions hidden">${escape(localize('disableExtensionsLabelText', "Try to reproduce the problem after {0}. If the problem only reproduces when extensions are active, it is likely an issue with an extension."))
    .replace('{0}', () => `<span tabIndex=0 role="button" id="disableExtensions" class="workbenchCommand">${escape(localize('disableExtensions', "disabling all extensions and reloading the window"))}</span>`)}
			</div>

			<div id="extension-selection">
				<label class="inline-label" for="extension-selector">${escape(localize('chooseExtension', "Extension"))} <span class="required-input">*</span></label>
				<select id="extension-selector" class="inline-form-control">
					<!-- To be dynamically filled -->
				</select>
				<div id="extension-selection-validation-error" class="validation-error hidden" role="alert">${escape(localize('extensionWithNonstandardBugsUrl', "The issue reporter is unable to create issues for this extension. Please visit {0} to report an issue."))
    .replace('{0}', () => `<span tabIndex=0 role="button" id="extensionBugsLink" class="workbenchCommand"><!-- To be dynamically filled --></span>`)}</div>
				<div id="extension-selection-validation-error-no-url" class="validation-error hidden" role="alert">
					${escape(localize('extensionWithNoBugsUrl', "The issue reporter is unable to create issues for this extension, as it does not specify a URL for reporting issues. Please check the marketplace page of this extension to see if other instructions are available."))}
				</div>
			</div>
		</div>

		<div id="issue-title-container" class="input-group">
			<label class="inline-label" for="issue-title">${escape(localize('issueTitleLabel', "Title"))} <span class="required-input">*</span></label>
			<input id="issue-title" type="text" class="inline-form-control" placeholder="${escape(localize('issueTitleRequired', "Please enter a title."))}" required>
			<div id="issue-title-empty-error" class="validation-error hidden" role="alert">${escape(localize('titleEmptyValidation', "A title is required."))}</div>
			<div id="issue-title-length-validation-error" class="validation-error hidden" role="alert">${escape(localize('titleLengthValidation', "The title is too long."))}</div>
			<small id="similar-issues">
				<!-- To be dynamically filled -->
			</small>
		</div>

	</div>

	<div class="input-group description-section">
		<label for="description" id="issue-description-label">
			<!-- To be dynamically filled -->
		</label>
		<div class="instructions" id="issue-description-subtitle">
			<!-- To be dynamically filled -->
		</div>
		<div class="block-info-text">
			<textarea name="description" id="description" placeholder="${escape(localize('details', "Please enter details."))}" required></textarea>
		</div>
		<div id="description-empty-error" class="validation-error hidden" role="alert">${escape(localize('descriptionEmptyValidation', "A description is required."))}</div>
		<div id="description-short-error" class="validation-error hidden" role="alert">${escape(localize('descriptionTooShortValidation', "Please provide a longer description."))}</div>
	</div>

	<div class="system-info" id="block-container">
		<div class="block block-extension-data">
			<input class="send-extension-data" aria-label="${sendExtensionData}" type="checkbox" id="includeExtensionData" checked/>
			<label class="extension-caption" id="extension-caption" for="includeExtensionData">
				${sendExtensionData}
				<span id="ext-loading" hidden></span>
				<span class="ext-parens" hidden>(</span><a href="#" class="showInfo" id="extension-id">${escape(localize('show', "show"))}</a><span class="ext-parens" hidden>)</span>
				<a id="extension-data-download">${escape(localize('downloadExtensionData', "Download Extension Data"))}</a>
			</label>
			<pre class="block-info" id="extension-data" placeholder="${escape(localize('extensionData', "Extension does not have additional data to include."))}" style="white-space: pre-wrap; user-select: text;">
				<!-- To be dynamically filled -->
			</pre>
		</div>

		<div class="block block-system">
			<input class="sendData" aria-label="${sendSystemInfoLabel}" type="checkbox" id="includeSystemInfo" checked/>
			<label class="caption" for="includeSystemInfo">
				${sendSystemInfoLabel}
				(<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>)
			</label>
			<div class="block-info hidden" style="user-select: text;">
				<!-- To be dynamically filled -->
		</div>
		</div>
		<div class="block block-process">
			<input class="sendData" aria-label="${sendProcessInfoLabel}" type="checkbox" id="includeProcessInfo" checked/>
			<label class="caption" for="includeProcessInfo">
				${sendProcessInfoLabel}
				(<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>)
			</label>
			<pre class="block-info hidden" style="user-select: text;">
				<code>
				<!-- To be dynamically filled -->
				</code>
			</pre>
		</div>
		<div class="block block-workspace">
			<input class="sendData" aria-label="${sendWorkspaceInfoLabel}" type="checkbox" id="includeWorkspaceInfo" checked/>
			<label class="caption" for="includeWorkspaceInfo">
				${sendWorkspaceInfoLabel}
				(<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>)
			</label>
			<pre id="systemInfo" class="block-info hidden" style="user-select: text;">
				<code>
				<!-- To be dynamically filled -->
				</code>
			</pre>
		</div>
		<div class="block block-extensions">
			<input class="sendData" aria-label="${sendExtensionsLabel}" type="checkbox" id="includeExtensions" checked/>
			<label class="caption" for="includeExtensions">
				${sendExtensionsLabel}
				(<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>)
			</label>
			<div id="systemInfo" class="block-info hidden" style="user-select: text;">
				<!-- To be dynamically filled -->
			</div>
		</div>
		<div class="block block-experiments">
			<input class="sendData" aria-label="${sendExperimentsLabel}" type="checkbox" id="includeExperiments" checked/>
			<label class="caption" for="includeExperiments">
				${sendExperimentsLabel}
				(<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>)
			</label>
			<pre class="block-info hidden" style="user-select: text;">
				<!-- To be dynamically filled -->
			</pre>
		</div>
		<div class="block block-acknowledgements hidden" id="version-acknowledgements">
			<input class="sendData" aria-label="${acknowledgementsLabel}" type="checkbox" id="includeAcknowledgement"/>
			<label class="caption" for="includeAcknowledgement">
				${acknowledgementsLabel}
			</label>
		</div>
	</div>
</div>`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclBhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVSZXBvcnRlclBhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDLENBQUM7QUFDM0csTUFBTSxzQkFBc0IsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLCtCQUErQixDQUFDLENBQUMsQ0FBQztBQUN0RyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsK0JBQStCLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7QUFDaEcsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztBQUNyRyxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsb0ZBQW9GLENBQUMsQ0FBQyxDQUFDO0FBQ3pKLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFFLHlEQUF5RDtBQUM5RjtJ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