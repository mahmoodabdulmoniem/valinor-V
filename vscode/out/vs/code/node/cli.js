/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { chmodSync, existsSync, readFileSync, statSync, truncateSync, unlinkSync } from 'fs';
import { homedir, release, tmpdir } from 'os';
import { Event } from '../../base/common/event.js';
import { isAbsolute, resolve, join, dirname } from '../../base/common/path.js';
import { isMacintosh, isWindows } from '../../base/common/platform.js';
import { randomPort } from '../../base/common/ports.js';
import { whenDeleted, writeFileSync } from '../../base/node/pfs.js';
import { findFreePort } from '../../base/node/ports.js';
import { watchFileContents } from '../../platform/files/node/watcher/nodejs/nodejsWatcherLib.js';
import { buildHelpMessage, buildStdinMessage, buildVersionMessage, NATIVE_CLI_COMMANDS, OPTIONS } from '../../platform/environment/node/argv.js';
import { addArg, parseCLIProcessArgv } from '../../platform/environment/node/argvHelper.js';
import { getStdinFilePath, hasStdinWithoutTty, readFromStdin, stdinDataListener } from '../../platform/environment/node/stdin.js';
import { createWaitMarkerFileSync } from '../../platform/environment/node/wait.js';
import product from '../../platform/product/common/product.js';
import { CancellationTokenSource } from '../../base/common/cancellation.js';
import { isUNC, randomPath } from '../../base/common/extpath.js';
import { Utils } from '../../platform/profiling/common/profiling.js';
import { FileAccess } from '../../base/common/network.js';
import { cwd } from '../../base/common/process.js';
import { addUNCHostToAllowlist } from '../../base/node/unc.js';
import { URI } from '../../base/common/uri.js';
import { DeferredPromise } from '../../base/common/async.js';
function shouldSpawnCliProcess(argv) {
    return !!argv['install-source']
        || !!argv['list-extensions']
        || !!argv['install-extension']
        || !!argv['uninstall-extension']
        || !!argv['update-extensions']
        || !!argv['locate-extension']
        || !!argv['add-mcp']
        || !!argv['telemetry'];
}
export async function main(argv) {
    let args;
    try {
        args = parseCLIProcessArgv(argv);
    }
    catch (err) {
        console.error(err.message);
        return;
    }
    for (const subcommand of NATIVE_CLI_COMMANDS) {
        if (args[subcommand]) {
            if (!product.tunnelApplicationName) {
                console.error(`'${subcommand}' command not supported in ${product.applicationName}`);
                return;
            }
            const env = {
                ...process.env
            };
            // bootstrap-esm.js determines the electron environment based
            // on the following variable. For the server we need to unset
            // it to prevent importing any electron specific modules.
            // Refs https://github.com/microsoft/vscode/issues/221883
            delete env['ELECTRON_RUN_AS_NODE'];
            const tunnelArgs = argv.slice(argv.indexOf(subcommand) + 1); // all arguments behind `tunnel`
            return new Promise((resolve, reject) => {
                let tunnelProcess;
                const stdio = ['ignore', 'pipe', 'pipe'];
                if (process.env['VSCODE_DEV']) {
                    tunnelProcess = spawn('cargo', ['run', '--', subcommand, ...tunnelArgs], { cwd: join(getAppRoot(), 'cli'), stdio, env });
                }
                else {
                    const appPath = process.platform === 'darwin'
                        // ./Contents/MacOS/Electron => ./Contents/Resources/app/bin/code-tunnel-insiders
                        ? join(dirname(dirname(process.execPath)), 'Resources', 'app')
                        : dirname(process.execPath);
                    const tunnelCommand = join(appPath, 'bin', `${product.tunnelApplicationName}${isWindows ? '.exe' : ''}`);
                    tunnelProcess = spawn(tunnelCommand, [subcommand, ...tunnelArgs], { cwd: cwd(), stdio, env });
                }
                tunnelProcess.stdout.pipe(process.stdout);
                tunnelProcess.stderr.pipe(process.stderr);
                tunnelProcess.on('exit', resolve);
                tunnelProcess.on('error', reject);
            });
        }
    }
    // Help (general)
    if (args.help) {
        const executable = `${product.applicationName}${isWindows ? '.exe' : ''}`;
        console.log(buildHelpMessage(product.nameLong, executable, product.version, OPTIONS));
    }
    // Help (chat)
    else if (args.chat?.help) {
        const executable = `${product.applicationName}${isWindows ? '.exe' : ''}`;
        console.log(buildHelpMessage(product.nameLong, executable, product.version, OPTIONS.chat.options, { isChat: true }));
    }
    // Version Info
    else if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
    }
    // Shell integration
    else if (args['locate-shell-integration-path']) {
        let file;
        switch (args['locate-shell-integration-path']) {
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"`
            case 'bash':
                file = 'shellIntegration-bash.sh';
                break;
            // Usage: `if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }`
            case 'pwsh':
                file = 'shellIntegration.ps1';
                break;
            // Usage: `[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path zsh)"`
            case 'zsh':
                file = 'shellIntegration-rc.zsh';
                break;
            // Usage: `string match -q "$TERM_PROGRAM" "vscode"; and . (code --locate-shell-integration-path fish)`
            case 'fish':
                file = 'shellIntegration.fish';
                break;
            default: throw new Error('Error using --locate-shell-integration-path: Invalid shell type');
        }
        console.log(join(getAppRoot(), 'out', 'vs', 'workbench', 'contrib', 'terminal', 'common', 'scripts', file));
    }
    // Extensions Management
    else if (shouldSpawnCliProcess(args)) {
        // We do not bundle `cliProcessMain.js` into this file because
        // it is rather large and only needed for very few CLI operations.
        // This has the downside that we need to know if we run OSS or
        // built, because our location on disk is different if built.
        let cliProcessMain;
        if (process.env['VSCODE_DEV']) {
            cliProcessMain = './cliProcessMain.js';
        }
        else {
            cliProcessMain = './vs/code/node/cliProcessMain.js';
        }
        const cli = await import(cliProcessMain);
        await cli.main(args);
        return;
    }
    // Write File
    else if (args['file-write']) {
        const argsFile = args._[0];
        if (!argsFile || !isAbsolute(argsFile) || !existsSync(argsFile) || !statSync(argsFile).isFile()) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        let source;
        let target;
        try {
            const argsContents = JSON.parse(readFileSync(argsFile, 'utf8'));
            source = argsContents.source;
            target = argsContents.target;
        }
        catch (error) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        // Windows: set the paths as allowed UNC paths given
        // they are explicitly provided by the user as arguments
        if (isWindows) {
            for (const path of [source, target]) {
                if (typeof path === 'string' && isUNC(path)) {
                    addUNCHostToAllowlist(URI.file(path).authority);
                }
            }
        }
        // Validate
        if (!source || !target || source === target || // make sure source and target are provided and are not the same
            !isAbsolute(source) || !isAbsolute(target) || // make sure both source and target are absolute paths
            !existsSync(source) || !statSync(source).isFile() || // make sure source exists as file
            !existsSync(target) || !statSync(target).isFile() // make sure target exists as file
        ) {
            throw new Error('Using --file-write with invalid arguments.');
        }
        try {
            // Check for readonly status and chmod if so if we are told so
            let targetMode = 0;
            let restoreMode = false;
            if (!!args['file-chmod']) {
                targetMode = statSync(target).mode;
                if (!(targetMode & 0o200 /* File mode indicating writable by owner */)) {
                    chmodSync(target, targetMode | 0o200);
                    restoreMode = true;
                }
            }
            // Write source to target
            const data = readFileSync(source);
            if (isWindows) {
                // On Windows we use a different strategy of saving the file
                // by first truncating the file and then writing with r+ mode.
                // This helps to save hidden files on Windows
                // (see https://github.com/microsoft/vscode/issues/931) and
                // prevent removing alternate data streams
                // (see https://github.com/microsoft/vscode/issues/6363)
                truncateSync(target, 0);
                writeFileSync(target, data, { flag: 'r+' });
            }
            else {
                writeFileSync(target, data);
            }
            // Restore previous mode as needed
            if (restoreMode) {
                chmodSync(target, targetMode);
            }
        }
        catch (error) {
            error.message = `Error using --file-write: ${error.message}`;
            throw error;
        }
    }
    // Just Code
    else {
        const env = {
            ...process.env,
            'ELECTRON_NO_ATTACH_CONSOLE': '1'
        };
        delete env['ELECTRON_RUN_AS_NODE'];
        const processCallbacks = [];
        if (args.verbose) {
            env['ELECTRON_ENABLE_LOGGING'] = '1';
        }
        if (args.verbose || args.status) {
            processCallbacks.push(async (child) => {
                child.stdout?.on('data', (data) => console.log(data.toString('utf8').trim()));
                child.stderr?.on('data', (data) => console.log(data.toString('utf8').trim()));
                await Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
            });
        }
        // Handle --transient option
        if (args['transient']) {
            const tempParentDir = randomPath(tmpdir(), 'vscode');
            const tempUserDataDir = join(tempParentDir, 'data');
            const tempExtensionsDir = join(tempParentDir, 'extensions');
            addArg(argv, '--user-data-dir', tempUserDataDir);
            addArg(argv, '--extensions-dir', tempExtensionsDir);
            console.log(`State is temporarily stored. Relaunch this state with: ${product.applicationName} --user-data-dir "${tempUserDataDir}" --extensions-dir "${tempExtensionsDir}"`);
        }
        const hasReadStdinArg = args._.some(arg => arg === '-') || args.chat?._.some(arg => arg === '-');
        if (hasReadStdinArg) {
            // remove the "-" argument when we read from stdin
            args._ = args._.filter(a => a !== '-');
            argv = argv.filter(a => a !== '-');
        }
        let stdinFilePath;
        if (hasStdinWithoutTty()) {
            // Read from stdin: we require a single "-" argument to be passed in order to start reading from
            // stdin. We do this because there is no reliable way to find out if data is piped to stdin. Just
            // checking for stdin being connected to a TTY is not enough (https://github.com/microsoft/vscode/issues/40351)
            if (hasReadStdinArg) {
                stdinFilePath = getStdinFilePath();
                try {
                    const readFromStdinDone = new DeferredPromise();
                    await readFromStdin(stdinFilePath, !!args.verbose, () => readFromStdinDone.complete());
                    if (!args.wait) {
                        // if `--wait` is not provided, we keep this process alive
                        // for at least as long as the stdin stream is open to
                        // ensure that we read all the data.
                        // the downside is that the Code CLI process will then not
                        // terminate until stdin is closed, but users can always
                        // pass `--wait` to prevent that from happening (this is
                        // actually what we enforced until v1.85.x but then was
                        // changed to not enforce it anymore).
                        // a solution in the future would possibly be to exit, when
                        // the Code process exits. this would require some careful
                        // solution though in case Code is already running and this
                        // is a second instance telling the first instance what to
                        // open.
                        processCallbacks.push(() => readFromStdinDone.p);
                    }
                    if (args.chat) {
                        // Make sure to add tmp file as context to chat
                        addArg(argv, '--add-file', stdinFilePath);
                    }
                    else {
                        // Make sure to open tmp file as editor but ignore
                        // it in the "recently open" list
                        addArg(argv, stdinFilePath);
                        addArg(argv, '--skip-add-to-recently-opened');
                    }
                    console.log(`Reading from stdin via: ${stdinFilePath}`);
                }
                catch (e) {
                    console.log(`Failed to create file to read via stdin: ${e.toString()}`);
                    stdinFilePath = undefined;
                }
            }
            else {
                // If the user pipes data via stdin but forgot to add the "-" argument, help by printing a message
                // if we detect that data flows into via stdin after a certain timeout.
                processCallbacks.push(_ => stdinDataListener(1000).then(dataReceived => {
                    if (dataReceived) {
                        console.log(buildStdinMessage(product.applicationName, !!args.chat));
                    }
                }));
            }
        }
        const isMacOSBigSurOrNewer = isMacintosh && release() > '20.0.0';
        // If we are started with --wait create a random temporary file
        // and pass it over to the starting instance. We can use this file
        // to wait for it to be deleted to monitor that the edited file
        // is closed and then exit the waiting process.
        let waitMarkerFilePath;
        if (args.wait) {
            waitMarkerFilePath = createWaitMarkerFileSync(args.verbose);
            if (waitMarkerFilePath) {
                addArg(argv, '--waitMarkerFilePath', waitMarkerFilePath);
            }
            // When running with --wait, we want to continue running CLI process
            // until either:
            // - the wait marker file has been deleted (e.g. when closing the editor)
            // - the launched process terminates (e.g. due to a crash)
            processCallbacks.push(async (child) => {
                let childExitPromise;
                if (isMacOSBigSurOrNewer) {
                    // On Big Sur, we resolve the following promise only when the child,
                    // i.e. the open command, exited with a signal or error. Otherwise, we
                    // wait for the marker file to be deleted or for the child to error.
                    childExitPromise = new Promise(resolve => {
                        // Only resolve this promise if the child (i.e. open) exited with an error
                        child.on('exit', (code, signal) => {
                            if (code !== 0 || signal) {
                                resolve();
                            }
                        });
                    });
                }
                else {
                    // On other platforms, we listen for exit in case the child exits before the
                    // marker file is deleted.
                    childExitPromise = Event.toPromise(Event.fromNodeEventEmitter(child, 'exit'));
                }
                try {
                    await Promise.race([
                        whenDeleted(waitMarkerFilePath),
                        Event.toPromise(Event.fromNodeEventEmitter(child, 'error')),
                        childExitPromise
                    ]);
                }
                finally {
                    if (stdinFilePath) {
                        unlinkSync(stdinFilePath); // Make sure to delete the tmp stdin file if we have any
                    }
                }
            });
        }
        // If we have been started with `--prof-startup` we need to find free ports to profile
        // the main process, the renderer, and the extension host. We also disable v8 cached data
        // to get better profile traces. Last, we listen on stdout for a signal that tells us to
        // stop profiling.
        if (args['prof-startup']) {
            const profileHost = '127.0.0.1';
            const portMain = await findFreePort(randomPort(), 10, 3000);
            const portRenderer = await findFreePort(portMain + 1, 10, 3000);
            const portExthost = await findFreePort(portRenderer + 1, 10, 3000);
            // fail the operation when one of the ports couldn't be acquired.
            if (portMain * portRenderer * portExthost === 0) {
                throw new Error('Failed to find free ports for profiler. Make sure to shutdown all instances of the editor first.');
            }
            const filenamePrefix = randomPath(homedir(), 'prof');
            addArg(argv, `--inspect-brk=${profileHost}:${portMain}`);
            addArg(argv, `--remote-debugging-port=${profileHost}:${portRenderer}`);
            addArg(argv, `--inspect-brk-extensions=${profileHost}:${portExthost}`);
            addArg(argv, `--prof-startup-prefix`, filenamePrefix);
            addArg(argv, `--no-cached-data`);
            writeFileSync(filenamePrefix, argv.slice(-6).join('|'));
            processCallbacks.push(async (_child) => {
                class Profiler {
                    static async start(name, filenamePrefix, opts) {
                        const profiler = await import('v8-inspect-profiler');
                        let session;
                        try {
                            session = await profiler.startProfiling({ ...opts, host: profileHost });
                        }
                        catch (err) {
                            console.error(`FAILED to start profiling for '${name}' on port '${opts.port}'`);
                        }
                        return {
                            async stop() {
                                if (!session) {
                                    return;
                                }
                                let suffix = '';
                                const result = await session.stop();
                                if (!process.env['VSCODE_DEV']) {
                                    // when running from a not-development-build we remove
                                    // absolute filenames because we don't want to reveal anything
                                    // about users. We also append the `.txt` suffix to make it
                                    // easier to attach these files to GH issues
                                    result.profile = Utils.rewriteAbsolutePaths(result.profile, 'piiRemoved');
                                    suffix = '.txt';
                                }
                                writeFileSync(`${filenamePrefix}.${name}.cpuprofile${suffix}`, JSON.stringify(result.profile, undefined, 4));
                            }
                        };
                    }
                }
                try {
                    // load and start profiler
                    const mainProfileRequest = Profiler.start('main', filenamePrefix, { port: portMain });
                    const extHostProfileRequest = Profiler.start('extHost', filenamePrefix, { port: portExthost, tries: 300 });
                    const rendererProfileRequest = Profiler.start('renderer', filenamePrefix, {
                        port: portRenderer,
                        tries: 200,
                        target: function (targets) {
                            return targets.filter(target => {
                                if (!target.webSocketDebuggerUrl) {
                                    return false;
                                }
                                if (target.type === 'page') {
                                    return target.url.indexOf('workbench/workbench.html') > 0 || target.url.indexOf('workbench/workbench-dev.html') > 0;
                                }
                                else {
                                    return true;
                                }
                            })[0];
                        }
                    });
                    const main = await mainProfileRequest;
                    const extHost = await extHostProfileRequest;
                    const renderer = await rendererProfileRequest;
                    // wait for the renderer to delete the marker file
                    await whenDeleted(filenamePrefix);
                    // stop profiling
                    await main.stop();
                    await renderer.stop();
                    await extHost.stop();
                    // re-create the marker file to signal that profiling is done
                    writeFileSync(filenamePrefix, '');
                }
                catch (e) {
                    console.error('Failed to profile startup. Make sure to quit Code first.');
                }
            });
        }
        const options = {
            detached: true,
            env
        };
        if (!args.verbose) {
            options['stdio'] = 'ignore';
        }
        let child;
        if (!isMacOSBigSurOrNewer) {
            if (!args.verbose && args.status) {
                options['stdio'] = ['ignore', 'pipe', 'ignore']; // restore ability to see output when --status is used
            }
            // We spawn process.execPath directly
            child = spawn(process.execPath, argv.slice(2), options);
        }
        else {
            // On Big Sur, we spawn using the open command to obtain behavior
            // similar to if the app was launched from the dock
            // https://github.com/microsoft/vscode/issues/102975
            // The following args are for the open command itself, rather than for VS Code:
            // -n creates a new instance.
            //    Without -n, the open command re-opens the existing instance as-is.
            // -g starts the new instance in the background.
            //    Later, Electron brings the instance to the foreground.
            //    This way, Mac does not automatically try to foreground the new instance, which causes
            //    focusing issues when the new instance only sends data to a previous instance and then closes.
            const spawnArgs = ['-n', '-g'];
            // -a opens the given application.
            spawnArgs.push('-a', process.execPath); // -a: opens a specific application
            if (args.verbose || args.status) {
                spawnArgs.push('--wait-apps'); // `open --wait-apps`: blocks until the launched app is closed (even if they were already running)
                // The open command only allows for redirecting stderr and stdout to files,
                // so we make it redirect those to temp files, and then use a logger to
                // redirect the file output to the console
                for (const outputType of args.verbose ? ['stdout', 'stderr'] : ['stdout']) {
                    // Tmp file to target output to
                    const tmpName = randomPath(tmpdir(), `code-${outputType}`);
                    writeFileSync(tmpName, '');
                    spawnArgs.push(`--${outputType}`, tmpName);
                    // Listener to redirect content to stdout/stderr
                    processCallbacks.push(async (child) => {
                        try {
                            const stream = outputType === 'stdout' ? process.stdout : process.stderr;
                            const cts = new CancellationTokenSource();
                            child.on('close', () => {
                                // We must dispose the token to stop watching,
                                // but the watcher might still be reading data.
                                setTimeout(() => cts.dispose(true), 200);
                            });
                            await watchFileContents(tmpName, chunk => stream.write(chunk), () => { }, cts.token);
                        }
                        finally {
                            unlinkSync(tmpName);
                        }
                    });
                }
            }
            for (const e in env) {
                // Ignore the _ env var, because the open command
                // ignores it anyway.
                // Pass the rest of the env vars in to fix
                // https://github.com/microsoft/vscode/issues/134696.
                if (e !== '_') {
                    spawnArgs.push('--env');
                    spawnArgs.push(`${e}=${env[e]}`);
                }
            }
            spawnArgs.push('--args', ...argv.slice(2)); // pass on our arguments
            if (env['VSCODE_DEV']) {
                // If we're in development mode, replace the . arg with the
                // vscode source arg. Because the OSS app isn't bundled,
                // it needs the full vscode source arg to launch properly.
                const curdir = '.';
                const launchDirIndex = spawnArgs.indexOf(curdir);
                if (launchDirIndex !== -1) {
                    spawnArgs[launchDirIndex] = resolve(curdir);
                }
            }
            // We already passed over the env variables
            // using the --env flags, so we can leave them out here.
            // Also, we don't need to pass env._, which is different from argv._
            child = spawn('open', spawnArgs, { ...options, env: {} });
        }
        return Promise.all(processCallbacks.map(callback => callback(child)));
    }
}
function getAppRoot() {
    return dirname(FileAccess.asFileUri('').fsPath);
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
main(process.argv)
    .then(() => eventuallyExit(0))
    .then(null, err => {
    console.error(err.message || err.stack || err);
    eventuallyExit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL25vZGUvY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsS0FBSyxFQUE4QixNQUFNLGVBQWUsQ0FBQztBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRTlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0UsT0FBTyxFQUF1QixXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRWpHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqSixPQUFPLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFF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