/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'original-fs';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { configurePortable } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { fileURLToPath } from 'url';
import { app, protocol, crashReporter, Menu, contentTracing } from 'electron';
import minimist from 'minimist';
import { product } from './bootstrap-meta.js';
import { parse } from './vs/base/common/jsonc.js';
import { getUserDataPath } from './vs/platform/environment/node/userDataPath.js';
import * as perf from './vs/base/common/performance.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { getUNCHost, addUNCHostToAllowlist } from './vs/base/node/unc.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
perf.mark('code/didStartMain');
perf.mark('code/willLoadMainBundle', {
    // When built, the main bundle is a single JS file with all
    // dependencies inlined. As such, we mark `willLoadMainBundle`
    // as the start of the main bundle loading process.
    startTime: Math.floor(performance.timeOrigin)
});
perf.mark('code/didLoadMainBundle');
// Enable portable support
const portable = configurePortable(product);
const args = parseCLIArgs();
// Configure static command line arguments
const argvConfig = configureCommandlineSwitchesSync(args);
// Enable sandbox globally unless
// 1) disabled via command line using either
//    `--no-sandbox` or `--disable-chromium-sandbox` argument.
// 2) argv.json contains `disable-chromium-sandbox: true`.
if (args['sandbox'] &&
    !args['disable-chromium-sandbox'] &&
    !argvConfig['disable-chromium-sandbox']) {
    app.enableSandbox();
}
else if (app.commandLine.hasSwitch('no-sandbox') &&
    !app.commandLine.hasSwitch('disable-gpu-sandbox')) {
    // Disable GPU sandbox whenever --no-sandbox is used.
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}
else {
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}
// Set userData path before app 'ready' event
const userDataPath = getUserDataPath(args, product.nameShort ?? 'code-oss-dev');
if (process.platform === 'win32') {
    const userDataUNCHost = getUNCHost(userDataPath);
    if (userDataUNCHost) {
        addUNCHostToAllowlist(userDataUNCHost); // enables to use UNC paths in userDataPath
    }
}
app.setPath('userData', userDataPath);
// Resolve code cache path
const codeCachePath = getCodeCachePath();
// Disable default menu (https://github.com/electron/electron/issues/35512)
Menu.setApplicationMenu(null);
// Configure crash reporter
perf.mark('code/willStartCrashReporter');
// If a crash-reporter-directory is specified we store the crash reports
// in the specified directory and don't upload them to the crash server.
//
// Appcenter crash reporting is enabled if
// * enable-crash-reporter runtime argument is set to 'true'
// * --disable-crash-reporter command line parameter is not set
//
// Disable crash reporting in all other cases.
if (args['crash-reporter-directory'] || (argvConfig['enable-crash-reporter'] && !args['disable-crash-reporter'])) {
    configureCrashReporter();
}
perf.mark('code/didStartCrashReporter');
// Set logs path before app 'ready' event if running portable
// to ensure that no 'logs' folder is created on disk at a
// location outside of the portable directory
// (https://github.com/microsoft/vscode/issues/56651)
if (portable && portable.isPortable) {
    app.setAppLogsPath(path.join(userDataPath, 'logs'));
}
// Register custom schemes with privileges
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'vscode-webview',
        privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true, codeCache: true }
    },
    {
        scheme: 'vscode-file',
        privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, codeCache: true }
    }
]);
// Global app listeners
registerListeners();
/**
 * We can resolve the NLS configuration early if it is defined
 * in argv.json before `app.ready` event. Otherwise we can only
 * resolve NLS after `app.ready` event to resolve the OS locale.
 */
let nlsConfigurationPromise = undefined;
// Use the most preferred OS language for language recommendation.
// The API might return an empty array on Linux, such as when
// the 'C' locale is the user's only configured locale.
// No matter the OS, if the array is empty, default back to 'en'.
const osLocale = processZhLocale((app.getPreferredSystemLanguages()?.[0] ?? 'en').toLowerCase());
const userLocale = getUserDefinedLocale(argvConfig);
if (userLocale) {
    nlsConfigurationPromise = resolveNLSConfiguration({
        userLocale,
        osLocale,
        commit: product.commit,
        userDataPath,
        nlsMetadataPath: __dirname
    });
}
// Pass in the locale to Electron so that the
// Windows Control Overlay is rendered correctly on Windows.
// For now, don't pass in the locale on macOS due to
// https://github.com/microsoft/vscode/issues/167543.
// If the locale is `qps-ploc`, the Microsoft
// Pseudo Language Language Pack is being used.
// In that case, use `en` as the Electron locale.
if (process.platform === 'win32' || process.platform === 'linux') {
    const electronLocale = (!userLocale || userLocale === 'qps-ploc') ? 'en' : userLocale;
    app.commandLine.appendSwitch('lang', electronLocale);
}
// Load our code once ready
app.once('ready', function () {
    if (args['trace']) {
        let traceOptions;
        if (args['trace-memory-infra']) {
            const customCategories = args['trace-category-filter']?.split(',') || [];
            customCategories.push('disabled-by-default-memory-infra', 'disabled-by-default-memory-infra.v8.code_stats');
            traceOptions = {
                included_categories: customCategories,
                excluded_categories: ['*'],
                memory_dump_config: {
                    allowed_dump_modes: ['light', 'detailed'],
                    triggers: [
                        {
                            type: 'periodic_interval',
                            mode: 'detailed',
                            min_time_between_dumps_ms: 10000
                        },
                        {
                            type: 'periodic_interval',
                            mode: 'light',
                            min_time_between_dumps_ms: 1000
                        }
                    ]
                }
            };
        }
        else {
            traceOptions = {
                categoryFilter: args['trace-category-filter'] || '*',
                traceOptions: args['trace-options'] || 'record-until-full,enable-sampling'
            };
        }
        contentTracing.startRecording(traceOptions).finally(() => onReady());
    }
    else {
        onReady();
    }
});
async function onReady() {
    perf.mark('code/mainAppReady');
    try {
        const [, nlsConfig] = await Promise.all([
            mkdirpIgnoreError(codeCachePath),
            resolveNlsConfiguration()
        ]);
        await startup(codeCachePath, nlsConfig);
    }
    catch (error) {
        console.error(error);
    }
}
/**
 * Main startup routine
 */
async function startup(codeCachePath, nlsConfig) {
    process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfig);
    process.env['VSCODE_CODE_CACHE_PATH'] = codeCachePath || '';
    // Bootstrap ESM
    await bootstrapESM();
    // Load Main
    await import('./vs/code/electron-main/main.js');
    perf.mark('code/didRunMainBundle');
}
function configureCommandlineSwitchesSync(cliArgs) {
    const SUPPORTED_ELECTRON_SWITCHES = [
        // alias from us for --disable-gpu
        'disable-hardware-acceleration',
        // override for the color profile to use
        'force-color-profile',
        // disable LCD font rendering, a Chromium flag
        'disable-lcd-text',
        // bypass any specified proxy for the given semi-colon-separated list of hosts
        'proxy-bypass-list'
    ];
    if (process.platform === 'linux') {
        // Force enable screen readers on Linux via this flag
        SUPPORTED_ELECTRON_SWITCHES.push('force-renderer-accessibility');
        // override which password-store is used on Linux
        SUPPORTED_ELECTRON_SWITCHES.push('password-store');
    }
    const SUPPORTED_MAIN_PROCESS_SWITCHES = [
        // Persistently enable proposed api via argv.json: https://github.com/microsoft/vscode/issues/99775
        'enable-proposed-api',
        // Log level to use. Default is 'info'. Allowed values are 'error', 'warn', 'info', 'debug', 'trace', 'off'.
        'log-level',
        // Use an in-memory storage for secrets
        'use-inmemory-secretstorage',
        // Enables display tracking to restore maximized windows under RDP: https://github.com/electron/electron/issues/47016
        'enable-rdp-display-tracking'
    ];
    // Read argv config
    const argvConfig = readArgvConfigSync();
    Object.keys(argvConfig).forEach(argvKey => {
        const argvValue = argvConfig[argvKey];
        // Append Electron flags to Electron
        if (SUPPORTED_ELECTRON_SWITCHES.indexOf(argvKey) !== -1) {
            if (argvValue === true || argvValue === 'true') {
                if (argvKey === 'disable-hardware-acceleration') {
                    app.disableHardwareAcceleration(); // needs to be called explicitly
                }
                else {
                    app.commandLine.appendSwitch(argvKey);
                }
            }
            else if (typeof argvValue === 'string' && argvValue) {
                if (argvKey === 'password-store') {
                    // Password store
                    // TODO@TylerLeonhardt: Remove this migration in 3 months
                    let migratedArgvValue = argvValue;
                    if (argvValue === 'gnome' || argvValue === 'gnome-keyring') {
                        migratedArgvValue = 'gnome-libsecret';
                    }
                    app.commandLine.appendSwitch(argvKey, migratedArgvValue);
                }
                else {
                    app.commandLine.appendSwitch(argvKey, argvValue);
                }
            }
        }
        // Append main process flags to process.argv
        else if (SUPPORTED_MAIN_PROCESS_SWITCHES.indexOf(argvKey) !== -1) {
            switch (argvKey) {
                case 'enable-proposed-api':
                    if (Array.isArray(argvValue)) {
                        argvValue.forEach(id => id && typeof id === 'string' && process.argv.push('--enable-proposed-api', id));
                    }
                    else {
                        console.error(`Unexpected value for \`enable-proposed-api\` in argv.json. Expected array of extension ids.`);
                    }
                    break;
                case 'log-level':
                    if (typeof argvValue === 'string') {
                        process.argv.push('--log', argvValue);
                    }
                    else if (Array.isArray(argvValue)) {
                        for (const value of argvValue) {
                            process.argv.push('--log', value);
                        }
                    }
                    break;
                case 'use-inmemory-secretstorage':
                    if (argvValue) {
                        process.argv.push('--use-inmemory-secretstorage');
                    }
                    break;
                case 'enable-rdp-display-tracking':
                    if (argvValue) {
                        process.argv.push('--enable-rdp-display-tracking');
                    }
                    break;
            }
        }
    });
    // Following features are enabled from the runtime:
    // `DocumentPolicyIncludeJSCallStacksInCrashReports` - https://www.electronjs.org/docs/latest/api/web-frame-main#framecollectjavascriptcallstack-experimental
    // `EarlyEstablishGpuChannel` - Refs https://issues.chromium.org/issues/40208065
    // `EstablishGpuChannelAsync` - Refs https://issues.chromium.org/issues/40208065
    const featuresToEnable = `DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EstablishGpuChannelAsync,${app.commandLine.getSwitchValue('enable-features')}`;
    app.commandLine.appendSwitch('enable-features', featuresToEnable);
    // Following features are disabled from the runtime:
    // `CalculateNativeWinOcclusion` - Disable native window occlusion tracker (https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ)
    const featuresToDisable = `CalculateNativeWinOcclusion,${app.commandLine.getSwitchValue('disable-features')}`;
    app.commandLine.appendSwitch('disable-features', featuresToDisable);
    // Blink features to configure.
    // `FontMatchingCTMigration` - Siwtch font matching on macOS to Appkit (Refs https://github.com/microsoft/vscode/issues/224496#issuecomment-2270418470).
    // `StandardizedBrowserZoom` - Disable zoom adjustment for bounding box (https://github.com/microsoft/vscode/issues/232750#issuecomment-2459495394)
    const blinkFeaturesToDisable = `FontMatchingCTMigration,StandardizedBrowserZoom,${app.commandLine.getSwitchValue('disable-blink-features')}`;
    app.commandLine.appendSwitch('disable-blink-features', blinkFeaturesToDisable);
    // Support JS Flags
    const jsFlags = getJSFlags(cliArgs);
    if (jsFlags) {
        app.commandLine.appendSwitch('js-flags', jsFlags);
    }
    // Use portal version 4 that supports current_folder option
    // to address https://github.com/microsoft/vscode/issues/213780
    // Runtime sets the default version to 3, refs https://github.com/electron/electron/pull/44426
    app.commandLine.appendSwitch('xdg-portal-required-version', '4');
    return argvConfig;
}
function readArgvConfigSync() {
    // Read or create the argv.json config file sync before app('ready')
    const argvConfigPath = getArgvConfigPath();
    let argvConfig = undefined;
    try {
        argvConfig = parse(fs.readFileSync(argvConfigPath).toString());
    }
    catch (error) {
        if (error && error.code === 'ENOENT') {
            createDefaultArgvConfigSync(argvConfigPath);
        }
        else {
            console.warn(`Unable to read argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
        }
    }
    // Fallback to default
    if (!argvConfig) {
        argvConfig = {};
    }
    return argvConfig;
}
function createDefaultArgvConfigSync(argvConfigPath) {
    try {
        // Ensure argv config parent exists
        const argvConfigPathDirname = path.dirname(argvConfigPath);
        if (!fs.existsSync(argvConfigPathDirname)) {
            fs.mkdirSync(argvConfigPathDirname);
        }
        // Default argv content
        const defaultArgvConfigContent = [
            '// This configuration file allows you to pass permanent command line arguments to VS Code.',
            '// Only a subset of arguments is currently supported to reduce the likelihood of breaking',
            '// the installation.',
            '//',
            '// PLEASE DO NOT CHANGE WITHOUT UNDERSTANDING THE IMPACT',
            '//',
            '// NOTE: Changing this file requires a restart of VS Code.',
            '{',
            '	// Use software rendering instead of hardware accelerated rendering.',
            '	// This can help in cases where you see rendering issues in VS Code.',
            '	// "disable-hardware-acceleration": true',
            '}'
        ];
        // Create initial argv.json with default content
        fs.writeFileSync(argvConfigPath, defaultArgvConfigContent.join('\n'));
    }
    catch (error) {
        console.error(`Unable to create argv.json configuration file in ${argvConfigPath}, falling back to defaults (${error})`);
    }
}
function getArgvConfigPath() {
    const vscodePortable = process.env['VSCODE_PORTABLE'];
    if (vscodePortable) {
        return path.join(vscodePortable, 'argv.json');
    }
    let dataFolderName = product.dataFolderName;
    if (process.env['VSCODE_DEV']) {
        dataFolderName = `${dataFolderName}-dev`;
    }
    return path.join(os.homedir(), dataFolderName, 'argv.json');
}
function configureCrashReporter() {
    let crashReporterDirectory = args['crash-reporter-directory'];
    let submitURL = '';
    if (crashReporterDirectory) {
        crashReporterDirectory = path.normalize(crashReporterDirectory);
        if (!path.isAbsolute(crashReporterDirectory)) {
            console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory must be absolute.`);
            app.exit(1);
        }
        if (!fs.existsSync(crashReporterDirectory)) {
            try {
                fs.mkdirSync(crashReporterDirectory, { recursive: true });
            }
            catch (error) {
                console.error(`The path '${crashReporterDirectory}' specified for --crash-reporter-directory does not seem to exist or cannot be created.`);
                app.exit(1);
            }
        }
        // Crashes are stored in the crashDumps directory by default, so we
        // need to change that directory to the provided one
        console.log(`Found --crash-reporter-directory argument. Setting crashDumps directory to be '${crashReporterDirectory}'`);
        app.setPath('crashDumps', crashReporterDirectory);
    }
    // Otherwise we configure the crash reporter from product.json
    else {
        const appCenter = product.appCenter;
        if (appCenter) {
            const isWindows = (process.platform === 'win32');
            const isLinux = (process.platform === 'linux');
            const isDarwin = (process.platform === 'darwin');
            const crashReporterId = argvConfig['crash-reporter-id'];
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (crashReporterId && uuidPattern.test(crashReporterId)) {
                if (isWindows) {
                    switch (process.arch) {
                        case 'x64':
                            submitURL = appCenter['win32-x64'];
                            break;
                        case 'arm64':
                            submitURL = appCenter['win32-arm64'];
                            break;
                    }
                }
                else if (isDarwin) {
                    if (product.darwinUniversalAssetId) {
                        submitURL = appCenter['darwin-universal'];
                    }
                    else {
                        switch (process.arch) {
                            case 'x64':
                                submitURL = appCenter['darwin'];
                                break;
                            case 'arm64':
                                submitURL = appCenter['darwin-arm64'];
                                break;
                        }
                    }
                }
                else if (isLinux) {
                    submitURL = appCenter['linux-x64'];
                }
                submitURL = submitURL.concat('&uid=', crashReporterId, '&iid=', crashReporterId, '&sid=', crashReporterId);
                // Send the id for child node process that are explicitly starting crash reporter.
                // For vscode this is ExtensionHost process currently.
                const argv = process.argv;
                const endOfArgsMarkerIndex = argv.indexOf('--');
                if (endOfArgsMarkerIndex === -1) {
                    argv.push('--crash-reporter-id', crashReporterId);
                }
                else {
                    // if the we have an argument "--" (end of argument marker)
                    // we cannot add arguments at the end. rather, we add
                    // arguments before the "--" marker.
                    argv.splice(endOfArgsMarkerIndex, 0, '--crash-reporter-id', crashReporterId);
                }
            }
        }
    }
    // Start crash reporter for all processes
    const productName = (product.crashReporter ? product.crashReporter.productName : undefined) || product.nameShort;
    const companyName = (product.crashReporter ? product.crashReporter.companyName : undefined) || 'Microsoft';
    const uploadToServer = Boolean(!process.env['VSCODE_DEV'] && submitURL && !crashReporterDirectory);
    crashReporter.start({
        companyName,
        productName: process.env['VSCODE_DEV'] ? `${productName} Dev` : productName,
        submitURL,
        uploadToServer,
        compress: true
    });
}
function getJSFlags(cliArgs) {
    const jsFlags = [];
    // Add any existing JS flags we already got from the command line
    if (cliArgs['js-flags']) {
        jsFlags.push(cliArgs['js-flags']);
    }
    if (process.platform === 'linux') {
        // Fix cppgc crash on Linux with 16KB page size.
        // Refs https://issues.chromium.org/issues/378017037
        // The fix from https://github.com/electron/electron/commit/6c5b2ef55e08dc0bede02384747549c1eadac0eb
        // only affects non-renderer process.
        // The following will ensure that the flag will be
        // applied to the renderer process as well.
        // TODO(deepak1556): Remove this once we update to
        // Chromium >= 134.
        jsFlags.push('--nodecommit_pooled_pages');
    }
    return jsFlags.length > 0 ? jsFlags.join(' ') : null;
}
function parseCLIArgs() {
    return minimist(process.argv, {
        string: [
            'user-data-dir',
            'locale',
            'js-flags',
            'crash-reporter-directory'
        ],
        boolean: [
            'disable-chromium-sandbox',
        ],
        default: {
            'sandbox': true
        },
        alias: {
            'no-sandbox': 'sandbox'
        }
    });
}
function registerListeners() {
    /**
     * macOS: when someone drops a file to the not-yet running VSCode, the open-file event fires even before
     * the app-ready event. We listen very early for open-file and remember this upon startup as path to open.
     */
    const macOpenFiles = [];
    globalThis['macOpenFiles'] = macOpenFiles;
    app.on('open-file', function (event, path) {
        macOpenFiles.push(path);
    });
    /**
     * macOS: react to open-url requests.
     */
    const openUrls = [];
    const onOpenUrl = function (event, url) {
        event.preventDefault();
        openUrls.push(url);
    };
    app.on('will-finish-launching', function () {
        app.on('open-url', onOpenUrl);
    });
    globalThis['getOpenUrls'] = function () {
        app.removeListener('open-url', onOpenUrl);
        return openUrls;
    };
}
function getCodeCachePath() {
    // explicitly disabled via CLI args
    if (process.argv.indexOf('--no-cached-data') > 0) {
        return undefined;
    }
    // running out of sources
    if (process.env['VSCODE_DEV']) {
        return undefined;
    }
    // require commit id
    const commit = product.commit;
    if (!commit) {
        return undefined;
    }
    return path.join(userDataPath, 'CachedData', commit);
}
async function mkdirpIgnoreError(dir) {
    if (typeof dir === 'string') {
        try {
            await fs.promises.mkdir(dir, { recursive: true });
            return dir;
        }
        catch (error) {
            // ignore
        }
    }
    return undefined;
}
//#region NLS Support
function processZhLocale(appLocale) {
    if (appLocale.startsWith('zh')) {
        const region = appLocale.split('-')[1];
        // On Windows and macOS, Chinese languages returned by
        // app.getPreferredSystemLanguages() start with zh-hans
        // for Simplified Chinese or zh-hant for Traditional Chinese,
        // so we can easily determine whether to use Simplified or Traditional.
        // However, on Linux, Chinese languages returned by that same API
        // are of the form zh-XY, where XY is a country code.
        // For China (CN), Singapore (SG), and Malaysia (MY)
        // country codes, assume they use Simplified Chinese.
        // For other cases, assume they use Traditional.
        if (['hans', 'cn', 'sg', 'my'].includes(region)) {
            return 'zh-cn';
        }
        return 'zh-tw';
    }
    return appLocale;
}
/**
 * Resolve the NLS configuration
 */
async function resolveNlsConfiguration() {
    // First, we need to test a user defined locale.
    // If it fails we try the app locale.
    // If that fails we fall back to English.
    const nlsConfiguration = nlsConfigurationPromise ? await nlsConfigurationPromise : undefined;
    if (nlsConfiguration) {
        return nlsConfiguration;
    }
    // Try to use the app locale which is only valid
    // after the app ready event has been fired.
    let userLocale = app.getLocale();
    if (!userLocale) {
        return {
            userLocale: 'en',
            osLocale,
            resolvedLanguage: 'en',
            defaultMessagesFile: path.join(__dirname, 'nls.messages.json'),
            // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
            locale: 'en',
            availableLanguages: {}
        };
    }
    // See above the comment about the loader and case sensitiveness
    userLocale = processZhLocale(userLocale.toLowerCase());
    return resolveNLSConfiguration({
        userLocale,
        osLocale,
        commit: product.commit,
        userDataPath,
        nlsMetadataPath: __dirname
    });
}
/**
 * Language tags are case insensitive however an ESM loader is case sensitive
 * To make this work on case preserving & insensitive FS we do the following:
 * the language bundles have lower case language tags and we always lower case
 * the locale we receive from the user or OS.
 */
function getUserDefinedLocale(argvConfig) {
    const locale = args['locale'];
    if (locale) {
        return locale.toLowerCase(); // a directly provided --locale always wins
    }
    return typeof argvConfig?.locale === 'string' ? argvConfig.locale.toLowerCase() : undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsibWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzlFLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUkxRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcs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