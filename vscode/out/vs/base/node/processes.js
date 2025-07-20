/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cp from 'child_process';
import { promises } from 'fs';
import { getCaseInsensitive } from '../common/objects.js';
import * as path from '../common/path.js';
import * as Platform from '../common/platform.js';
import * as processCommon from '../common/process.js';
import { Source, TerminateResponseCode } from '../common/processes.js';
import * as Types from '../common/types.js';
import * as pfs from './pfs.js';
import { FileAccess } from '../common/network.js';
export { Source, TerminateResponseCode };
export function getWindowsShell(env = processCommon.env) {
    return env['comspec'] || 'cmd.exe';
}
// Wrapper around process.send() that will queue any messages if the internal node.js
// queue is filled with messages and only continue sending messages when the internal
// queue is free again to consume messages.
// On Windows we always wait for the send() method to return before sending the next message
// to workaround https://github.com/nodejs/node/issues/7657 (IPC can freeze process)
export function createQueuedSender(childProcess) {
    let msgQueue = [];
    let useQueue = false;
    const send = function (msg) {
        if (useQueue) {
            msgQueue.push(msg); // add to the queue if the process cannot handle more messages
            return;
        }
        const result = childProcess.send(msg, (error) => {
            if (error) {
                console.error(error); // unlikely to happen, best we can do is log this error
            }
            useQueue = false; // we are good again to send directly without queue
            // now send all the messages that we have in our queue and did not send yet
            if (msgQueue.length > 0) {
                const msgQueueCopy = msgQueue.slice(0);
                msgQueue = [];
                msgQueueCopy.forEach(entry => send(entry));
            }
        });
        if (!result || Platform.isWindows /* workaround https://github.com/nodejs/node/issues/7657 */) {
            useQueue = true;
        }
    };
    return { send };
}
async function fileExistsDefault(path) {
    if (await pfs.Promises.exists(path)) {
        let statValue;
        try {
            statValue = await promises.stat(path);
        }
        catch (e) {
            if (e.message.startsWith('EACCES')) {
                // it might be symlink
                statValue = await promises.lstat(path);
            }
        }
        return statValue ? !statValue.isDirectory() : false;
    }
    return false;
}
export async function findExecutable(command, cwd, paths, env = processCommon.env, fileExists = fileExistsDefault) {
    // If we have an absolute path then we take it.
    if (path.isAbsolute(command)) {
        return await fileExists(command) ? command : undefined;
    }
    if (cwd === undefined) {
        cwd = processCommon.cwd();
    }
    const dir = path.dirname(command);
    if (dir !== '.') {
        // We have a directory and the directory is relative (see above). Make the path absolute
        // to the current working directory.
        const fullPath = path.join(cwd, command);
        return await fileExists(fullPath) ? fullPath : undefined;
    }
    const envPath = getCaseInsensitive(env, 'PATH');
    if (paths === undefined && Types.isString(envPath)) {
        paths = envPath.split(path.delimiter);
    }
    // No PATH environment. Make path absolute to the cwd.
    if (paths === undefined || paths.length === 0) {
        const fullPath = path.join(cwd, command);
        return await fileExists(fullPath) ? fullPath : undefined;
    }
    // We have a simple file name. We get the path variable from the env
    // and try to find the executable on the path.
    for (const pathEntry of paths) {
        // The path entry is absolute.
        let fullPath;
        if (path.isAbsolute(pathEntry)) {
            fullPath = path.join(pathEntry, command);
        }
        else {
            fullPath = path.join(cwd, pathEntry, command);
        }
        if (Platform.isWindows) {
            const pathExt = getCaseInsensitive(env, 'PATHEXT') || '.COM;.EXE;.BAT;.CMD';
            const pathExtsFound = pathExt.split(';').map(async (ext) => {
                const withExtension = fullPath + ext;
                return await fileExists(withExtension) ? withExtension : undefined;
            });
            for (const foundPromise of pathExtsFound) {
                const found = await foundPromise;
                if (found) {
                    return found;
                }
            }
        }
        if (await fileExists(fullPath)) {
            return fullPath;
        }
    }
    const fullPath = path.join(cwd, command);
    return await fileExists(fullPath) ? fullPath : undefined;
}
/**
 * Kills a process and all its children.
 * @param pid the process id to kill
 * @param forceful whether to forcefully kill the process (default: false). Note
 * that on Windows, terminal processes can _only_ be killed forcefully and this
 * will throw when not forceful.
 */
export async function killTree(pid, forceful = false) {
    let child;
    if (Platform.isWindows) {
        const windir = process.env['WINDIR'] || 'C:\\Windows';
        const taskKill = path.join(windir, 'System32', 'taskkill.exe');
        const args = ['/T'];
        if (forceful) {
            args.push('/F');
        }
        args.push('/PID', String(pid));
        child = cp.spawn(taskKill, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    }
    else {
        const killScript = FileAccess.asFileUri('vs/base/node/terminateProcess.sh').fsPath;
        child = cp.spawn('/bin/sh', [killScript, String(pid), forceful ? '9' : '15'], { stdio: ['ignore', 'pipe', 'pipe'] });
    }
    return new Promise((resolve, reject) => {
        const stdout = [];
        child.stdout.on('data', (data) => stdout.push(data));
        child.stderr.on('data', (data) => stdout.push(data));
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`taskkill exited with code ${code}: ${Buffer.concat(stdout).toString()}`));
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcHJvY2Vzc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBUyxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQztBQUMxQyxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sS0FBSyxhQUFhLE1BQU0sc0JBQXNCLENBQUM7QUFDdEQsT0FBTyxFQUErQixNQUFNLEVBQWtDLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEksT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFbEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBbUYsQ0FBQztBQU8xSCxNQUFNLFVBQVUsZUFBZSxDQUFDLE1BQU0sYUFBYSxDQUFDLEdBQW1DO0lBQ3RGLE9BQU8sR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztBQUNwQyxDQUFDO0FBTUQscUZBQXFGO0FBQ3JGLHFGQUFxRjtBQUNyRiwyQ0FBMkM7QUFDM0MsNEZBQTRGO0FBQzVGLG9GQUFvRjtBQUNwRixNQUFNLFVBQVUsa0JBQWtCLENBQUMsWUFBNkI7SUFDL0QsSUFBSSxRQUFRLEdBQWEsRUFBRSxDQUFDO0lBQzVCLElBQUksUUFBUSxHQUFHLEtB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