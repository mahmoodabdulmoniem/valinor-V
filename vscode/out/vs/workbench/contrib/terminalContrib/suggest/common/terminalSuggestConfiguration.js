/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import product from '../../../../../platform/product/common/product.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
    TerminalSuggestSettingId["SelectionMode"] = "terminal.integrated.suggest.selectionMode";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', "Enables terminal intellisense suggestions (preview) for supported shells ({0}) when {1} is set to {2}.\n\nIf shell integration is installed manually, {3} needs to be set to {4} before calling the shell integration script.", 'PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``, '`true`', '`VSCODE_SUGGEST`', '`1`'),
        type: 'boolean',
        default: product.quality !== 'stable',
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
        type: 'object',
        properties: {},
        default: {
            'pwsh-shell-integration': false,
        },
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', "Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', 'Enable quick suggestions when it\'s unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback.'),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
        tags: ['preview']
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', "Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result."),
        enum: ['never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.never', "Never run on `Enter`."),
            localize('runOnEnter.exactMatch', "Run on `Enter` when the suggestion is typed in its entirety."),
            localize('runOnEnter.exactMatchIgnoreExtension', "Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included."),
            localize('runOnEnter.always', "Always run on `Enter`.")
        ],
        default: 'never',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */]: {
        markdownDescription: localize('terminal.integrated.selectionMode', "Controls how suggestion selection works in the integrated terminal."),
        type: 'string',
        enum: ['partial', 'always', 'never'],
        markdownEnumDescriptions: [
            localize('terminal.integrated.selectionMode.partial', "Partially select a suggestion when automatically triggering IntelliSense. `Tab` can be used to accept the first suggestion, only after navigating the suggestions via `Down` will `Enter` also accept the active suggestion."),
            localize('terminal.integrated.selectionMode.always', "Always select a suggestion when automatically triggering IntelliSense. `Enter` or `Tab` can be used to accept the first suggestion."),
            localize('terminal.integrated.selectionMode.never', "Never select a suggestion when automatically triggering IntelliSense. The list must be navigated via `Down` before `Enter` or `Tab` can be used to accept the active suggestion."),
        ],
        default: 'partial',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize("terminalWindowsExecutableSuggestionSetting", "A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.", windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
        tags: ['preview']
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', "Controls whether the terminal suggestions status bar should be shown."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', "Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms."),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', "Disable the feature."),
            localize('suggest.cdPath.relative', "Enable the feature and use relative paths."),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', "Disable the feature."),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', "Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be will be above the inline suggestion."),
            localize('suggest.inlineSuggestion.alwaysOnTop', "Enable the feature and always put the inline suggestion on top."),
        ],
        default: 'alwaysOnTop',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', "Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
};
let terminalSuggestProvidersConfiguration;
export function registerTerminalSuggestProvidersConfiguration(availableProviders) {
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    const oldProvidersConfiguration = terminalSuggestProvidersConfiguration;
    // Create properties for the providers setting dynamically
    const providersProperties = {};
    const defaultValue = {
        // Always include known built-in providers as defaults even if not yet registered
        'terminal-suggest': true,
        'pwsh-shell-integration': false,
        'lsp': true
    };
    if (availableProviders) {
        for (const providerId of availableProviders) {
            providersProperties[providerId] = {
                type: 'boolean',
                description: localize('suggest.provider.description', "Enable or disable the '{0}' terminal suggestion provider.", providerId),
                default: true
            };
            defaultValue[providerId] = defaultValue[providerId] ?? true;
        }
    }
    // Create the configuration node with dynamic properties
    terminalSuggestProvidersConfiguration = {
        id: 'terminalSuggestProviders',
        order: 100,
        title: localize('terminalSuggestProvidersConfigurationTitle', "Terminal Suggest Providers"),
        type: 'object',
        properties: {
            ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
                restricted: true,
                markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
                type: 'object',
                properties: providersProperties,
                default: defaultValue,
                tags: ['preview'],
            }
        }
    };
    // Update the registry with the new configuration
    registry.updateConfigurations({
        add: [terminalSuggestProvidersConfiguration],
        remove: oldProvidersConfiguration ? [oldProvidersConfiguration] : []
    });
}
// Initial registration with default providers to ensure the setting appears in UI
registerTerminalSuggestProvidersConfiguration(['terminal-suggest', 'builtinPwsh', 'lsp']);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvY29tbW9uL3Rlcm1pbmFsU3VnZ2VzdENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBb0QsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLHVFQUF1RSxDQUFDO0FBQ3hNLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLE9BQU8sTUFBTSxtREFBbUQsQ0FBQztBQUd4RSxNQUFNLENBQU4sSUFBa0Isd0JBWWpCO0FBWkQsV0FBa0Isd0JBQXdCO0lBQ3pDLDJFQUErQyxDQUFBO0lBQy9DLDZGQUFpRSxDQUFBO0lBQ2pFLGlIQUFxRixDQUFBO0lBQ3JGLGlGQUFxRCxDQUFBO0lBQ3JELG1IQUF1RixDQUFBO0lBQ3ZGLCtFQUFtRCxDQUFBO0lBQ25ELHVGQUEyRCxDQUFBO0lBQzNELHlFQUE2QyxDQUFBO0lBQzdDLDZGQUFpRSxDQUFBO0lBQ2pFLDJHQUErRSxDQUFBO0lBQy9FLHVGQUEyRCxDQUFBO0FBQzVELENBQUMsRUFaaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQVl6QztBQUVELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFhO0lBQzNELEtBQUssRUFBSSxrQkFBa0I7SUFDM0IsS0FBSyxFQUFJLGFBQWE7SUFDdEIsS0FBSyxFQUFJLGlCQUFpQjtJQUMxQixLQUFLLEVBQUksZUFBZTtJQUV4QixLQUFLLEVBQUksNEJBQTRCO0lBRXJDLEtBQUssRUFBSSxvQkFBb0I7SUFF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