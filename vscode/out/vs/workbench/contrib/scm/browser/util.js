/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import * as platform from '../../../../base/common/platform.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { Action } from '../../../../base/common/actions.js';
import { createActionViewItem, getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { equals } from '../../../../base/common/arrays.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { reset } from '../../../../base/browser/dom.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { URI } from '../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { fromNow, safeIntl } from '../../../../base/common/date.js';
import { historyItemHoverAdditionsForeground, historyItemHoverDefaultLabelBackground, historyItemHoverDefaultLabelForeground, historyItemHoverDeletionsForeground, historyItemHoverLabelForeground } from './scmHistory.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
export function isSCMViewService(element) {
    return Array.isArray(element.repositories) && Array.isArray(element.visibleRepositories);
}
export function isSCMRepository(element) {
    return !!element.provider && !!element.input;
}
export function isSCMInput(element) {
    return !!element.validateInput && typeof element.value === 'string';
}
export function isSCMActionButton(element) {
    return element.type === 'actionButton';
}
export function isSCMResourceGroup(element) {
    return !!element.provider && !!element.resources;
}
export function isSCMResource(element) {
    return !!element.sourceUri && isSCMResourceGroup(element.resourceGroup);
}
export function isSCMResourceNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMResourceGroup(element.context);
}
export function isSCMHistoryItemViewModelTreeElement(element) {
    return element.type === 'historyItemViewModel';
}
export function isSCMHistoryItemLoadMoreTreeElement(element) {
    return element.type === 'historyItemLoadMore';
}
export function isSCMHistoryItemChangeViewModelTreeElement(element) {
    return element.type === 'historyItemChangeViewModel';
}
export function isSCMHistoryItemChangeNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMHistoryItemViewModelTreeElement(element.context);
}
const compareActions = (a, b) => {
    if (a instanceof MenuItemAction && b instanceof MenuItemAction) {
        return a.id === b.id && a.enabled === b.enabled && a.hideActions?.isHidden === b.hideActions?.isHidden;
    }
    return a.id === b.id && a.enabled === b.enabled;
};
export function connectPrimaryMenu(menu, callback, primaryGroup) {
    let cachedPrimary = [];
    let cachedSecondary = [];
    const updateActions = () => {
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), primaryGroup);
        if (equals(cachedPrimary, primary, compareActions) && equals(cachedSecondary, secondary, compareActions)) {
            return;
        }
        cachedPrimary = primary;
        cachedSecondary = secondary;
        callback(primary, secondary);
    };
    updateActions();
    return menu.onDidChange(updateActions);
}
export function collectContextMenuActions(menu) {
    return getContextMenuActions(menu.getActions({ shouldForwardArgs: true }), 'inline').secondary;
}
export class StatusBarAction extends Action {
    constructor(command, commandService) {
        super(`statusbaraction{${command.id}}`, command.title, '', true);
        this.command = command;
        this.commandService = commandService;
        this.tooltip = command.tooltip || '';
    }
    run() {
        return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
    }
}
class StatusBarActionViewItem extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
    }
    updateLabel() {
        if (this.options.label && this.label) {
            reset(this.label, ...renderLabelWithIcons(this.action.label));
        }
    }
}
export function getActionViewItemProvider(instaService) {
    return (action, options) => {
        if (action instanceof StatusBarAction) {
            return new StatusBarActionViewItem(action, options);
        }
        return createActionViewItem(instaService, action, options);
    };
}
export function getProviderKey(provider) {
    return `${provider.providerId}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
export function getRepositoryResourceCount(provider) {
    return provider.groups.reduce((r, g) => r + g.resources.length, 0);
}
export function getHistoryItemEditorTitle(historyItem, maxLength = 20) {
    const title = historyItem.subject.length <= maxLength ?
        historyItem.subject : `${historyItem.subject.substring(0, maxLength)}\u2026`;
    return `${historyItem.displayId ?? historyItem.id} - ${title}`;
}
export function getHistoryItemHoverContent(themeService, historyItem) {
    const colorTheme = themeService.getColorTheme();
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    if (historyItem.author) {
        const icon = URI.isUri(historyItem.authorIcon)
            ? `![${historyItem.author}](${historyItem.authorIcon.toString()}|width=20,height=20)`
            : ThemeIcon.isThemeIcon(historyItem.authorIcon)
                ? `$(${historyItem.authorIcon.id})`
                : '$(account)';
        if (historyItem.authorEmail) {
            const emailTitle = localize('emailLinkTitle', "Email");
            markdown.appendMarkdown(`${icon} [**${historyItem.author}**](mailto:${historyItem.authorEmail} "${emailTitle} ${historyItem.author}")`);
        }
        else {
            markdown.appendMarkdown(`${icon} **${historyItem.author}**`);
        }
        if (historyItem.timestamp) {
            const dateFormatter = safeIntl.DateTimeFormat(platform.language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).value;
            markdown.appendMarkdown(`, $(history) ${fromNow(historyItem.timestamp, true, true)} (${dateFormatter.format(historyItem.timestamp)})`);
        }
        markdown.appendMarkdown('\n\n');
    }
    markdown.appendMarkdown(`${historyItem.message.replace(/\r\n|\r|\n/g, '\n\n')}\n\n`);
    if (historyItem.statistics) {
        markdown.appendMarkdown(`---\n\n`);
        markdown.appendMarkdown(`<span>${historyItem.statistics.files === 1 ?
            localize('fileChanged', "{0} file changed", historyItem.statistics.files) :
            localize('filesChanged', "{0} files changed", historyItem.statistics.files)}</span>`);
        if (historyItem.statistics.insertions) {
            const additionsForegroundColor = colorTheme.getColor(historyItemHoverAdditionsForeground);
            markdown.appendMarkdown(`,&nbsp;<span style="color:${additionsForegroundColor};">${historyItem.statistics.insertions === 1 ?
                localize('insertion', "{0} insertion{1}", historyItem.statistics.insertions, '(+)') :
                localize('insertions', "{0} insertions{1}", historyItem.statistics.insertions, '(+)')}</span>`);
        }
        if (historyItem.statistics.deletions) {
            const deletionsForegroundColor = colorTheme.getColor(historyItemHoverDeletionsForeground);
            markdown.appendMarkdown(`,&nbsp;<span style="color:${deletionsForegroundColor};">${historyItem.statistics.deletions === 1 ?
                localize('deletion', "{0} deletion{1}", historyItem.statistics.deletions, '(-)') :
                localize('deletions', "{0} deletions{1}", historyItem.statistics.deletions, '(-)')}</span>`);
        }
    }
    if ((historyItem.references ?? []).length > 0) {
        markdown.appendMarkdown(`\n\n---\n\n`);
        markdown.appendMarkdown((historyItem.references ?? []).map(ref => {
            const labelIconId = ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '';
            const labelBackgroundColor = ref.color ? asCssVariable(ref.color) : asCssVariable(historyItemHoverDefaultLabelBackground);
            const labelForegroundColor = ref.color ? asCssVariable(historyItemHoverLabelForeground) : asCssVariable(historyItemHoverDefaultLabelForeground);
            return `<span style="color:${labelForegroundColor};background-color:${labelBackgroundColor};border-radius:10px;">&nbsp;$(${labelIconId})&nbsp;${ref.name}&nbsp;&nbsp;</span>`;
        }).join('&nbsp;&nbsp;'));
    }
    return { markdown, markdownNotSupportedFallback: historyItem.message };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUdoRSxPQUFPLEVBQVMsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHdkYsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ25KLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUE4QixNQUFNLDBEQUEwRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV4RCxPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLHNDQUFzQyxFQUFFLHNDQUFzQyxFQUFFLG1DQUFtQyxFQUFF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