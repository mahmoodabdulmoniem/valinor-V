/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import { isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
/**
 * This code is also used by standalone cli's. Avoid adding any other dependencies.
 */
const helpCategories = {
    o: localize('optionsUpperCase', "Options"),
    e: localize('extensionsManagement', "Extensions Management"),
    t: localize('troubleshooting', "Troubleshooting"),
    m: localize('mcp', "Model Context Protocol")
};
export const NATIVE_CLI_COMMANDS = ['tunnel', 'serve-web'];
export const OPTIONS = {
    'chat': {
        type: 'subcommand',
        description: 'Pass in a prompt to run in a chat session in the current working directory.',
        options: {
            '_': { type: 'string[]', description: localize('prompt', "The prompt to use as chat.") },
            'mode': { type: 'string', cat: 'o', alias: 'm', args: 'mode', description: localize('chatMode', "The mode to use for the chat session. Available options: 'ask', 'edit', 'agent', or the identifier of a custom mode. Defaults to 'agent'.") },
            'add-file': { type: 'string[]', cat: 'o', alias: 'a', args: 'path', description: localize('addFile', "Add files as context to the chat session.") },
            'maximize': { type: 'boolean', cat: 'o', description: localize('chatMaximize', "Maximize the chat session view.") },
            'reuse-window': { type: 'boolean', cat: 'o', alias: 'r', description: localize('reuseWindowForChat', "Force to use the last active window for the chat session.") },
            'new-window': { type: 'boolean', cat: 'o', alias: 'n', description: localize('newWindowForChat', "Force to open an empty window for the chat session.") },
            'help': { type: 'boolean', alias: 'h', description: localize('help', "Print usage.") }
        }
    },
    'serve-web': {
        type: 'subcommand',
        description: 'Run a server that displays the editor UI in browsers.',
        options: {
            'cli-data-dir': { type: 'string', args: 'dir', description: localize('cliDataDir', "Directory where CLI metadata should be stored.") },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
        }
    },
    'tunnel': {
        type: 'subcommand',
        description: 'Make the current machine accessible from vscode.dev or other machines through a secure tunnel.',
        options: {
            'cli-data-dir': { type: 'string', args: 'dir', description: localize('cliDataDir', "Directory where CLI metadata should be stored.") },
            'disable-telemetry': { type: 'boolean' },
            'telemetry-level': { type: 'string' },
            user: {
                type: 'subcommand',
                options: {
                    login: {
                        type: 'subcommand',
                        options: {
                            provider: { type: 'string' },
                            'access-token': { type: 'string' }
                        }
                    }
                }
            }
        }
    },
    'diff': { type: 'boolean', cat: 'o', alias: 'd', args: ['file', 'file'], description: localize('diff', "Compare two files with each other.") },
    'merge': { type: 'boolean', cat: 'o', alias: 'm', args: ['path1', 'path2', 'base', 'result'], description: localize('merge', "Perform a three-way merge by providing paths for two modified versions of a file, the common origin of both modified versions and the output file to save merge results.") },
    'add': { type: 'boolean', cat: 'o', alias: 'a', args: 'folder', description: localize('add', "Add folder(s) to the last active window.") },
    'remove': { type: 'boolean', cat: 'o', args: 'folder', description: localize('remove', "Remove folder(s) from the last active window.") },
    'goto': { type: 'boolean', cat: 'o', alias: 'g', args: 'file:line[:character]', description: localize('goto', "Open a file at the path on the specified line and character position.") },
    'new-window': { type: 'boolean', cat: 'o', alias: 'n', description: localize('newWindow', "Force to open a new window.") },
    'reuse-window': { type: 'boolean', cat: 'o', alias: 'r', description: localize('reuseWindow', "Force to open a file or folder in an already opened window.") },
    'wait': { type: 'boolean', cat: 'o', alias: 'w', description: localize('wait', "Wait for the files to be closed before returning.") },
    'waitMarkerFilePath': { type: 'string' },
    'locale': { type: 'string', cat: 'o', args: 'locale', description: localize('locale', "The locale to use (e.g. en-US or zh-TW).") },
    'user-data-dir': { type: 'string', cat: 'o', args: 'dir', description: localize('userDataDir', "Specifies the directory that user data is kept in. Can be used to open multiple distinct instances of Code.") },
    'profile': { type: 'string', 'cat': 'o', args: 'profileName', description: localize('profileName', "Opens the provided folder or workspace with the given profile and associates the profile with the workspace. If the profile does not exist, a new empty one is created.") },
    'help': { type: 'boolean', cat: 'o', alias: 'h', description: localize('help', "Print usage.") },
    'extensions-dir': { type: 'string', deprecates: ['extensionHomePath'], cat: 'e', args: 'dir', description: localize('extensionHomePath', "Set the root path for extensions.") },
    'extensions-download-dir': { type: 'string' },
    'builtin-extensions-dir': { type: 'string' },
    'list-extensions': { type: 'boolean', cat: 'e', description: localize('listExtensions', "List the installed extensions.") },
    'show-versions': { type: 'boolean', cat: 'e', description: localize('showVersions', "Show versions of installed extensions, when using --list-extensions.") },
    'category': { type: 'string', allowEmptyValue: true, cat: 'e', description: localize('category', "Filters installed extensions by provided category, when using --list-extensions."), args: 'category' },
    'install-extension': { type: 'string[]', cat: 'e', args: 'ext-id | path', description: localize('installExtension', "Installs or updates an extension. The argument is either an extension id or a path to a VSIX. The identifier of an extension is '${publisher}.${name}'. Use '--force' argument to update to latest version. To install a specific version provide '@${version}'. For example: 'vscode.csharp@1.2.3'.") },
    'pre-release': { type: 'boolean', cat: 'e', description: localize('install prerelease', "Installs the pre-release version of the extension, when using --install-extension") },
    'uninstall-extension': { type: 'string[]', cat: 'e', args: 'ext-id', description: localize('uninstallExtension', "Uninstalls an extension.") },
    'update-extensions': { type: 'boolean', cat: 'e', description: localize('updateExtensions', "Update the installed extensions.") },
    'enable-proposed-api': { type: 'string[]', allowEmptyValue: true, cat: 'e', args: 'ext-id', description: localize('experimentalApis', "Enables proposed API features for extensions. Can receive one or more extension IDs to enable individually.") },
    'add-mcp': { type: 'string[]', cat: 'm', args: 'json', description: localize('addMcp', "Adds a Model Context Protocol server definition to the user profile. Accepts JSON input in the form '{\"name\":\"server-name\",\"command\":...}'") },
    'version': { type: 'boolean', cat: 't', alias: 'v', description: localize('version', "Print version.") },
    'verbose': { type: 'boolean', cat: 't', global: true, description: localize('verbose', "Print verbose output (implies --wait).") },
    'log': { type: 'string[]', cat: 't', args: 'level', global: true, description: localize('log', "Log level to use. Default is 'info'. Allowed values are 'critical', 'error', 'warn', 'info', 'debug', 'trace', 'off'. You can also configure the log level of an extension by passing extension id and log level in the following format: '${publisher}.${name}:${logLevel}'. For example: 'vscode.csharp:trace'. Can receive one or more such entries.") },
    'status': { type: 'boolean', alias: 's', cat: 't', description: localize('status', "Print process usage and diagnostics information.") },
    'prof-startup': { type: 'boolean', cat: 't', description: localize('prof-startup', "Run CPU profiler during startup.") },
    'prof-append-timers': { type: 'string' },
    'prof-duration-markers': { type: 'string[]' },
    'prof-duration-markers-file': { type: 'string' },
    'no-cached-data': { type: 'boolean' },
    'prof-startup-prefix': { type: 'string' },
    'prof-v8-extensions': { type: 'boolean' },
    'disable-extensions': { type: 'boolean', deprecates: ['disableExtensions'], cat: 't', description: localize('disableExtensions', "Disable all installed extensions. This option is not persisted and is effective only when the command opens a new window.") },
    'disable-extension': { type: 'string[]', cat: 't', args: 'ext-id', description: localize('disableExtension', "Disable the provided extension. This option is not persisted and is effective only when the command opens a new window.") },
    'sync': { type: 'string', cat: 't', description: localize('turn sync', "Turn sync on or off."), args: ['on | off'] },
    'inspect-extensions': { type: 'string', allowEmptyValue: true, deprecates: ['debugPluginHost'], args: 'port', cat: 't', description: localize('inspect-extensions', "Allow debugging and profiling of extensions. Check the developer tools for the connection URI.") },
    'inspect-brk-extensions': { type: 'string', allowEmptyValue: true, deprecates: ['debugBrkPluginHost'], args: 'port', cat: 't', description: localize('inspect-brk-extensions', "Allow debugging and profiling of extensions with the extension host being paused after start. Check the developer tools for the connection URI.") },
    'disable-lcd-text': { type: 'boolean', cat: 't', description: localize('disableLCDText', "Disable LCD font rendering.") },
    'disable-gpu': { type: 'boolean', cat: 't', description: localize('disableGPU', "Disable GPU hardware acceleration.") },
    'disable-chromium-sandbox': { type: 'boolean', cat: 't', description: localize('disableChromiumSandbox', "Use this option only when there is requirement to launch the application as sudo user on Linux or when running as an elevated user in an applocker environment on Windows.") },
    'sandbox': { type: 'boolean' },
    'locate-shell-integration-path': { type: 'string', cat: 't', args: ['shell'], description: localize('locateShellIntegrationPath', "Print the path to a terminal shell integration script. Allowed values are 'bash', 'pwsh', 'zsh' or 'fish'.") },
    'telemetry': { type: 'boolean', cat: 't', description: localize('telemetry', "Shows all telemetry events which VS code collects.") },
    'remote': { type: 'string', allowEmptyValue: true },
    'folder-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'file-uri': { type: 'string[]', cat: 'o', args: 'uri' },
    'locate-extension': { type: 'string[]' },
    'extensionDevelopmentPath': { type: 'string[]' },
    'extensionDevelopmentKind': { type: 'string[]' },
    'extensionTestsPath': { type: 'string' },
    'extensionEnvironment': { type: 'string' },
    'debugId': { type: 'string' },
    'debugRenderer': { type: 'boolean' },
    'inspect-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-brk-ptyhost': { type: 'string', allowEmptyValue: true },
    'inspect-search': { type: 'string', deprecates: ['debugSearch'], allowEmptyValue: true },
    'inspect-brk-search': { type: 'string', deprecates: ['debugBrkSearch'], allowEmptyValue: true },
    'inspect-sharedprocess': { type: 'string', allowEmptyValue: true },
    'inspect-brk-sharedprocess': { type: 'string', allowEmptyValue: true },
    'export-default-configuration': { type: 'string' },
    'install-source': { type: 'string' },
    'enable-smoke-test-driver': { type: 'boolean' },
    'logExtensionHostCommunication': { type: 'boolean' },
    'skip-release-notes': { type: 'boolean' },
    'skip-welcome': { type: 'boolean' },
    'disable-telemetry': { type: 'boolean' },
    'disable-updates': { type: 'boolean' },
    'transient': { type: 'boolean' },
    'use-inmemory-secretstorage': { type: 'boolean', deprecates: ['disable-keytar'] },
    'password-store': { type: 'string' },
    'disable-workspace-trust': { type: 'boolean' },
    'disable-crash-reporter': { type: 'boolean' },
    'crash-reporter-directory': { type: 'string' },
    'crash-reporter-id': { type: 'string' },
    'skip-add-to-recently-opened': { type: 'boolean' },
    'open-url': { type: 'boolean' },
    'file-write': { type: 'boolean' },
    'file-chmod': { type: 'boolean' },
    'install-builtin-extension': { type: 'string[]' },
    'force': { type: 'boolean' },
    'do-not-sync': { type: 'boolean' },
    'do-not-include-pack-dependencies': { type: 'boolean' },
    'trace': { type: 'boolean' },
    'trace-memory-infra': { type: 'boolean' },
    'trace-category-filter': { type: 'string' },
    'trace-options': { type: 'string' },
    'preserve-env': { type: 'boolean' },
    'force-user-env': { type: 'boolean' },
    'force-disable-user-env': { type: 'boolean' },
    'open-devtools': { type: 'boolean' },
    'disable-gpu-sandbox': { type: 'boolean' },
    'logsPath': { type: 'string' },
    '__enable-file-policy': { type: 'boolean' },
    'editSessionId': { type: 'string' },
    'continueOn': { type: 'string' },
    'enable-coi': { type: 'boolean' },
    'unresponsive-sample-interval': { type: 'string' },
    'unresponsive-sample-period': { type: 'string' },
    'enable-rdp-display-tracking': { type: 'boolean' },
    'disable-layout-restore': { type: 'boolean' },
    'disable-experiments': { type: 'boolean' },
    'startup-experiment-group': { type: 'string', cat: 't', args: 'control|maximizedChat|splitEmptyEditorChat|splitWelcomeChat', description: localize('startupExperimentGroup', "Override the startup experiment group.") },
    // chromium flags
    'no-proxy-server': { type: 'boolean' },
    // Minimist incorrectly parses keys that start with `--no`
    // https://github.com/substack/minimist/blob/aeb3e27dae0412de5c0494e9563a5f10c82cc7a9/index.js#L118-L121
    // If --no-sandbox is passed via cli wrapper it will be treated as --sandbox which is incorrect, we use
    // the alias here to make sure --no-sandbox is always respected.
    // For https://github.com/microsoft/vscode/issues/128279
    'no-sandbox': { type: 'boolean', alias: 'sandbox' },
    'proxy-server': { type: 'string' },
    'proxy-bypass-list': { type: 'string' },
    'proxy-pac-url': { type: 'string' },
    'js-flags': { type: 'string' }, // chrome js flags
    'inspect': { type: 'string', allowEmptyValue: true },
    'inspect-brk': { type: 'string', allowEmptyValue: true },
    'nolazy': { type: 'boolean' }, // node inspect
    'force-device-scale-factor': { type: 'string' },
    'force-renderer-accessibility': { type: 'boolean' },
    'ignore-certificate-errors': { type: 'boolean' },
    'allow-insecure-localhost': { type: 'boolean' },
    'log-net-log': { type: 'string' },
    'vmodule': { type: 'string' },
    '_urls': { type: 'string[]' },
    'disable-dev-shm-usage': { type: 'boolean' },
    'profile-temp': { type: 'boolean' },
    'ozone-platform': { type: 'string' },
    'enable-tracing': { type: 'string' },
    'trace-startup-format': { type: 'string' },
    'trace-startup-file': { type: 'string' },
    'trace-startup-duration': { type: 'string' },
    'xdg-portal-required-version': { type: 'string' },
    _: { type: 'string[]' } // main arguments
};
const ignoringReporter = {
    onUnknownOption: () => { },
    onMultipleValues: () => { },
    onEmptyValue: () => { },
    onDeprecatedOption: () => { }
};
export function parseArgs(args, options, errorReporter = ignoringReporter) {
    // Find the first non-option arg, which also isn't the value for a previous `--flag`
    const firstPossibleCommand = args.find((a, i) => a.length > 0 && a[0] !== '-' && options.hasOwnProperty(a) && options[a].type === 'subcommand');
    const alias = {};
    const stringOptions = ['_'];
    const booleanOptions = [];
    const globalOptions = {};
    let command = undefined;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (optionId === firstPossibleCommand) {
                command = o;
            }
        }
        else {
            if (o.alias) {
                alias[optionId] = o.alias;
            }
            if (o.type === 'string' || o.type === 'string[]') {
                stringOptions.push(optionId);
                if (o.deprecates) {
                    stringOptions.push(...o.deprecates);
                }
            }
            else if (o.type === 'boolean') {
                booleanOptions.push(optionId);
                if (o.deprecates) {
                    booleanOptions.push(...o.deprecates);
                }
            }
            if (o.global) {
                globalOptions[optionId] = o;
            }
        }
    }
    if (command && firstPossibleCommand) {
        const options = globalOptions;
        for (const optionId in command.options) {
            options[optionId] = command.options[optionId];
        }
        const newArgs = args.filter(a => a !== firstPossibleCommand);
        const reporter = errorReporter.getSubcommandReporter ? errorReporter.getSubcommandReporter(firstPossibleCommand) : undefined;
        const subcommandOptions = parseArgs(newArgs, options, reporter);
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            [firstPossibleCommand]: subcommandOptions,
            _: []
        };
    }
    // remove aliases to avoid confusion
    const parsedArgs = minimist(args, { string: stringOptions, boolean: booleanOptions, alias });
    const cleanedArgs = {};
    const remainingArgs = parsedArgs;
    // https://github.com/microsoft/vscode/issues/58177, https://github.com/microsoft/vscode/issues/106617
    cleanedArgs._ = parsedArgs._.map(arg => String(arg)).filter(arg => arg.length > 0);
    delete remainingArgs._;
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            continue;
        }
        if (o.alias) {
            delete remainingArgs[o.alias];
        }
        let val = remainingArgs[optionId];
        if (o.deprecates) {
            for (const deprecatedId of o.deprecates) {
                if (remainingArgs.hasOwnProperty(deprecatedId)) {
                    if (!val) {
                        val = remainingArgs[deprecatedId];
                        if (val) {
                            errorReporter.onDeprecatedOption(deprecatedId, o.deprecationMessage || localize('deprecated.useInstead', 'Use {0} instead.', optionId));
                        }
                    }
                    delete remainingArgs[deprecatedId];
                }
            }
        }
        if (typeof val !== 'undefined') {
            if (o.type === 'string[]') {
                if (!Array.isArray(val)) {
                    val = [val];
                }
                if (!o.allowEmptyValue) {
                    const sanitized = val.filter((v) => v.length > 0);
                    if (sanitized.length !== val.length) {
                        errorReporter.onEmptyValue(optionId);
                        val = sanitized.length > 0 ? sanitized : undefined;
                    }
                }
            }
            else if (o.type === 'string') {
                if (Array.isArray(val)) {
                    val = val.pop(); // take the last
                    errorReporter.onMultipleValues(optionId, val);
                }
                else if (!val && !o.allowEmptyValue) {
                    errorReporter.onEmptyValue(optionId);
                    val = undefined;
                }
            }
            cleanedArgs[optionId] = val;
            if (o.deprecationMessage) {
                errorReporter.onDeprecatedOption(optionId, o.deprecationMessage);
            }
        }
        delete remainingArgs[optionId];
    }
    for (const key in remainingArgs) {
        errorReporter.onUnknownOption(key);
    }
    return cleanedArgs;
}
function formatUsage(optionId, option) {
    let args = '';
    if (option.args) {
        if (Array.isArray(option.args)) {
            args = ` <${option.args.join('> <')}>`;
        }
        else {
            args = ` <${option.args}>`;
        }
    }
    if (option.alias) {
        return `-${option.alias} --${optionId}${args}`;
    }
    return `--${optionId}${args}`;
}
// exported only for testing
export function formatOptions(options, columns) {
    const usageTexts = [];
    for (const optionId in options) {
        const o = options[optionId];
        const usageText = formatUsage(optionId, o);
        usageTexts.push([usageText, o.description]);
    }
    return formatUsageTexts(usageTexts, columns);
}
function formatUsageTexts(usageTexts, columns) {
    const maxLength = usageTexts.reduce((previous, e) => Math.max(previous, e[0].length), 12);
    const argLength = maxLength + 2 /*left padding*/ + 1 /*right padding*/;
    if (columns - argLength < 25) {
        // Use a condensed version on narrow terminals
        return usageTexts.reduce((r, ut) => r.concat([`  ${ut[0]}`, `      ${ut[1]}`]), []);
    }
    const descriptionColumns = columns - argLength - 1;
    const result = [];
    for (const ut of usageTexts) {
        const usage = ut[0];
        const wrappedDescription = wrapText(ut[1], descriptionColumns);
        const keyPadding = indent(argLength - usage.length - 2 /*left padding*/);
        result.push('  ' + usage + keyPadding + wrappedDescription[0]);
        for (let i = 1; i < wrappedDescription.length; i++) {
            result.push(indent(argLength) + wrappedDescription[i]);
        }
    }
    return result;
}
function indent(count) {
    return ' '.repeat(count);
}
function wrapText(text, columns) {
    const lines = [];
    while (text.length) {
        let index = text.length < columns ? text.length : text.lastIndexOf(' ', columns);
        if (index === 0) {
            index = columns;
        }
        const line = text.slice(0, index).trim();
        text = text.slice(index).trimStart();
        lines.push(line);
    }
    return lines;
}
export function buildHelpMessage(productName, executableName, version, options, capabilities) {
    const columns = (process.stdout).isTTY && (process.stdout).columns || 80;
    const inputFiles = capabilities?.noInputFiles ? '' : capabilities?.isChat ? ` [${localize('cliPrompt', 'prompt')}]` : ` [${localize('paths', 'paths')}...]`;
    const subcommand = capabilities?.isChat ? ' chat' : '';
    const help = [`${productName} ${version}`];
    help.push('');
    help.push(`${localize('usage', "Usage")}: ${executableName}${subcommand} [${localize('options', "options")}]${inputFiles}`);
    help.push('');
    if (capabilities?.noPipe !== true) {
        help.push(buildStdinMessage(executableName, capabilities?.isChat));
        help.push('');
    }
    const optionsByCategory = {};
    const subcommands = [];
    for (const optionId in options) {
        const o = options[optionId];
        if (o.type === 'subcommand') {
            if (o.description) {
                subcommands.push({ command: optionId, description: o.description });
            }
        }
        else if (o.description && o.cat) {
            let optionsByCat = optionsByCategory[o.cat];
            if (!optionsByCat) {
                optionsByCategory[o.cat] = optionsByCat = {};
            }
            optionsByCat[optionId] = o;
        }
    }
    for (const helpCategoryKey in optionsByCategory) {
        const key = helpCategoryKey;
        const categoryOptions = optionsByCategory[key];
        if (categoryOptions) {
            help.push(helpCategories[key]);
            help.push(...formatOptions(categoryOptions, columns));
            help.push('');
        }
    }
    if (subcommands.length) {
        help.push(localize('subcommands', "Subcommands"));
        help.push(...formatUsageTexts(subcommands.map(s => [s.command, s.description]), columns));
        help.push('');
    }
    return help.join('\n');
}
export function buildStdinMessage(executableName, isChat) {
    let example;
    if (isWindows) {
        if (isChat) {
            example = `echo Hello World | ${executableName} chat <prompt> -`;
        }
        else {
            example = `echo Hello World | ${executableName} -`;
        }
    }
    else {
        if (isChat) {
            example = `ps aux | grep code | ${executableName} chat <prompt> -`;
        }
        else {
            example = `ps aux | grep code | ${executableName} -`;
        }
    }
    return localize('stdinUsage', "To read from stdin, append '-' (e.g. '{0}')", example);
}
export function buildVersionMessage(version, commit) {
    return `${version || localize('unknownVersion', "Unknown version")}\n${commit || localize('unknownCommit', "Unknown commit")}\n${process.arch}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS9hcmd2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzNDOztHQUVHO0FBQ0gsTUFBTSxjQUFjLEdBQUc7SUFDdEIsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLENBQUM7SUFDMUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx1QkFBdUIsQ0FBQztJQUM1RCxDQUFDLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO0lBQ2pELENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLHdCQUF3QixDQUFDO0NBQzVDLENBQUM7QUE2QkYsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFVLENBQUM7QUFFcEUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFtRDtJQUN0RSxNQUFNLEVBQUU7UUFDUCxJQUFJLEVBQUUsWUFBWTtRQUNsQixXQUFXLEVBQUUsNkVBQTZFO1FBQzFGLE9BQU8sRUFBRTtZQUNSLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsNEJBQTRCLENBQUMsRUFBRTtZQUN4RixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUs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