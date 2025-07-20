/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { ResourceQueue, timeout } from '../common/async.js';
import { isEqualOrParent, isRootOrDriveLetter, randomPath } from '../common/extpath.js';
import { normalizeNFC } from '../common/normalization.js';
import { basename, dirname, join, normalize, sep } from '../common/path.js';
import { isLinux, isMacintosh, isWindows } from '../common/platform.js';
import { extUriBiasedIgnorePathCase } from '../common/resources.js';
import { URI } from '../common/uri.js';
import { rtrim } from '../common/strings.js';
//#region rimraf
export var RimRafMode;
(function (RimRafMode) {
    /**
     * Slow version that unlinks each file and folder.
     */
    RimRafMode[RimRafMode["UNLINK"] = 0] = "UNLINK";
    /**
     * Fast version that first moves the file/folder
     * into a temp directory and then deletes that
     * without waiting for it.
     */
    RimRafMode[RimRafMode["MOVE"] = 1] = "MOVE";
})(RimRafMode || (RimRafMode = {}));
async function rimraf(path, mode = RimRafMode.UNLINK, moveToPath) {
    if (isRootOrDriveLetter(path)) {
        throw new Error('rimraf - will refuse to recursively delete root');
    }
    // delete: via rm
    if (mode === RimRafMode.UNLINK) {
        return rimrafUnlink(path);
    }
    // delete: via move
    return rimrafMove(path, moveToPath);
}
async function rimrafMove(path, moveToPath = randomPath(tmpdir())) {
    try {
        try {
            await fs.promises.rename(path, moveToPath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return; // ignore - path to delete did not exist
            }
            return rimrafUnlink(path); // otherwise fallback to unlink
        }
        // Delete but do not return as promise
        rimrafUnlink(moveToPath).catch(error => { });
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
async function rimrafUnlink(path) {
    return fs.promises.rm(path, { recursive: true, force: true, maxRetries: 3 });
}
async function readdir(path, options) {
    try {
        return await doReaddir(path, options);
    }
    catch (error) {
        // TODO@bpasero workaround for #252361 that should be removed
        // once the upstream issue in node.js is resolved
        if (error.code === 'ENOENT' && isWindows && isRootOrDriveLetter(path)) {
            try {
                return await doReaddir(path.slice(0, -1), options);
            }
            catch (e) {
                // ignore
            }
        }
        throw error;
    }
}
async function doReaddir(path, options) {
    return handleDirectoryChildren(await (options ? safeReaddirWithFileTypes(path) : fs.promises.readdir(path)));
}
async function safeReaddirWithFileTypes(path) {
    try {
        return await fs.promises.readdir(path, { withFileTypes: true });
    }
    catch (error) {
        console.warn('[node.js fs] readdir with filetypes failed with error: ', error);
    }
    // Fallback to manually reading and resolving each
    // children of the folder in case we hit an error
    // previously.
    // This can only really happen on exotic file systems
    // such as explained in #115645 where we get entries
    // from `readdir` that we can later not `lstat`.
    const result = [];
    const children = await readdir(path);
    for (const child of children) {
        let isFile = false;
        let isDirectory = false;
        let isSymbolicLink = false;
        try {
            const lstat = await fs.promises.lstat(join(path, child));
            isFile = lstat.isFile();
            isDirectory = lstat.isDirectory();
            isSymbolicLink = lstat.isSymbolicLink();
        }
        catch (error) {
            console.warn('[node.js fs] unexpected error from lstat after readdir: ', error);
        }
        result.push({
            name: child,
            isFile: () => isFile,
            isDirectory: () => isDirectory,
            isSymbolicLink: () => isSymbolicLink
        });
    }
    return result;
}
function handleDirectoryChildren(children) {
    return children.map(child => {
        // Mac: uses NFD unicode form on disk, but we want NFC
        // See also https://github.com/nodejs/node/issues/2165
        if (typeof child === 'string') {
            return isMacintosh ? normalizeNFC(child) : child;
        }
        child.name = isMacintosh ? normalizeNFC(child.name) : child.name;
        return child;
    });
}
/**
 * A convenience method to read all children of a path that
 * are directories.
 */
async function readDirsInDir(dirPath) {
    const children = await readdir(dirPath);
    const directories = [];
    for (const child of children) {
        if (await SymlinkSupport.existsDirectory(join(dirPath, child))) {
            directories.push(child);
        }
    }
    return directories;
}
//#endregion
//#region whenDeleted()
/**
 * A `Promise` that resolves when the provided `path`
 * is deleted from disk.
 */
export function whenDeleted(path, intervalMs = 1000) {
    return new Promise(resolve => {
        let running = false;
        const interval = setInterval(() => {
            if (!running) {
                running = true;
                fs.access(path, err => {
                    running = false;
                    if (err) {
                        clearInterval(interval);
                        resolve(undefined);
                    }
                });
            }
        }, intervalMs);
    });
}
//#endregion
//#region Methods with symbolic links support
export var SymlinkSupport;
(function (SymlinkSupport) {
    /**
     * Resolves the `fs.Stats` of the provided path. If the path is a
     * symbolic link, the `fs.Stats` will be from the target it points
     * to. If the target does not exist, `dangling: true` will be returned
     * as `symbolicLink` value.
     */
    async function stat(path) {
        // First stat the link
        let lstats;
        try {
            lstats = await fs.promises.lstat(path);
            // Return early if the stat is not a symbolic link at all
            if (!lstats.isSymbolicLink()) {
                return { stat: lstats };
            }
        }
        catch (error) {
            /* ignore - use stat() instead */
        }
        // If the stat is a symbolic link or failed to stat, use fs.stat()
        // which for symbolic links will stat the target they point to
        try {
            const stats = await fs.promises.stat(path);
            return { stat: stats, symbolicLink: lstats?.isSymbolicLink() ? { dangling: false } : undefined };
        }
        catch (error) {
            // If the link points to a nonexistent file we still want
            // to return it as result while setting dangling: true flag
            if (error.code === 'ENOENT' && lstats) {
                return { stat: lstats, symbolicLink: { dangling: true } };
            }
            // Windows: workaround a node.js bug where reparse points
            // are not supported (https://github.com/nodejs/node/issues/36790)
            if (isWindows && error.code === 'EACCES') {
                try {
                    const stats = await fs.promises.stat(await fs.promises.readlink(path));
                    return { stat: stats, symbolicLink: { dangling: false } };
                }
                catch (error) {
                    // If the link points to a nonexistent file we still want
                    // to return it as result while setting dangling: true flag
                    if (error.code === 'ENOENT' && lstats) {
                        return { stat: lstats, symbolicLink: { dangling: true } };
                    }
                    throw error;
                }
            }
            throw error;
        }
    }
    SymlinkSupport.stat = stat;
    /**
     * Figures out if the `path` exists and is a file with support
     * for symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsFile(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isFile() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsFile = existsFile;
    /**
     * Figures out if the `path` exists and is a directory with support for
     * symlinks.
     *
     * Note: this will return `false` for a symlink that exists on
     * disk but is dangling (pointing to a nonexistent path).
     *
     * Use `exists` if you only care about the path existing on disk
     * or not without support for symbolic links.
     */
    async function existsDirectory(path) {
        try {
            const { stat, symbolicLink } = await SymlinkSupport.stat(path);
            return stat.isDirectory() && symbolicLink?.dangling !== true;
        }
        catch (error) {
            // Ignore, path might not exist
        }
        return false;
    }
    SymlinkSupport.existsDirectory = existsDirectory;
})(SymlinkSupport || (SymlinkSupport = {}));
//#endregion
//#region Write File
// According to node.js docs (https://nodejs.org/docs/v14.16.0/api/fs.html#fs_fs_writefile_file_data_options_callback)
// it is not safe to call writeFile() on the same path multiple times without waiting for the callback to return.
// Therefor we use a Queue on the path that is given to us to sequentialize calls to the same path properly.
const writeQueues = new ResourceQueue();
function writeFile(path, data, options) {
    return writeQueues.queueFor(URI.file(path), () => {
        const ensuredOptions = ensureWriteOptions(options);
        return new Promise((resolve, reject) => doWriteFileAndFlush(path, data, ensuredOptions, error => error ? reject(error) : resolve()));
    }, extUriBiasedIgnorePathCase);
}
let canFlush = true;
export function configureFlushOnWrite(enabled) {
    canFlush = enabled;
}
// Calls fs.writeFile() followed by a fs.sync() call to flush the changes to disk
// We do this in cases where we want to make sure the data is really on disk and
// not in some cache.
//
// See https://github.com/nodejs/node/blob/v5.10.0/lib/fs.js#L1194
function doWriteFileAndFlush(path, data, options, callback) {
    if (!canFlush) {
        return fs.writeFile(path, data, { mode: options.mode, flag: options.flag }, callback);
    }
    // Open the file with same flags and mode as fs.writeFile()
    fs.open(path, options.flag, options.mode, (openError, fd) => {
        if (openError) {
            return callback(openError);
        }
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFile(fd, data, writeError => {
            if (writeError) {
                return fs.close(fd, () => callback(writeError)); // still need to close the handle on error!
            }
            // Flush contents (not metadata) of the file to disk
            // https://github.com/microsoft/vscode/issues/9589
            fs.fdatasync(fd, (syncError) => {
                // In some exotic setups it is well possible that node fails to sync
                // In that case we disable flushing and warn to the console
                if (syncError) {
                    console.warn('[node.js fs] fdatasync is now disabled for this session because it failed: ', syncError);
                    configureFlushOnWrite(false);
                }
                return fs.close(fd, closeError => callback(closeError));
            });
        });
    });
}
/**
 * Same as `fs.writeFileSync` but with an additional call to
 * `fs.fdatasyncSync` after writing to ensure changes are
 * flushed to disk.
 *
 * @deprecated always prefer async variants over sync!
 */
export function writeFileSync(path, data, options) {
    const ensuredOptions = ensureWriteOptions(options);
    if (!canFlush) {
        return fs.writeFileSync(path, data, { mode: ensuredOptions.mode, flag: ensuredOptions.flag });
    }
    // Open the file with same flags and mode as fs.writeFile()
    const fd = fs.openSync(path, ensuredOptions.flag, ensuredOptions.mode);
    try {
        // It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
        fs.writeFileSync(fd, data);
        // Flush contents (not metadata) of the file to disk
        try {
            fs.fdatasyncSync(fd); // https://github.com/microsoft/vscode/issues/9589
        }
        catch (syncError) {
            console.warn('[node.js fs] fdatasyncSync is now disabled for this session because it failed: ', syncError);
            configureFlushOnWrite(false);
        }
    }
    finally {
        fs.closeSync(fd);
    }
}
function ensureWriteOptions(options) {
    if (!options) {
        return { mode: 0o666 /* default node.js mode for files */, flag: 'w' };
    }
    return {
        mode: typeof options.mode === 'number' ? options.mode : 0o666 /* default node.js mode for files */,
        flag: typeof options.flag === 'string' ? options.flag : 'w'
    };
}
//#endregion
//#region Move / Copy
/**
 * A drop-in replacement for `fs.rename` that:
 * - allows to move across multiple disks
 * - attempts to retry the operation for certain error codes on Windows
 */
async function rename(source, target, windowsRetryTimeout = 60000) {
    if (source === target) {
        return; // simulate node.js behaviour here and do a no-op if paths match
    }
    try {
        if (isWindows && typeof windowsRetryTimeout === 'number') {
            // On Windows, a rename can fail when either source or target
            // is locked by AV software.
            await renameWithRetry(source, target, Date.now(), windowsRetryTimeout);
        }
        else {
            await fs.promises.rename(source, target);
        }
    }
    catch (error) {
        // In two cases we fallback to classic copy and delete:
        //
        // 1.) The EXDEV error indicates that source and target are on different devices
        // In this case, fallback to using a copy() operation as there is no way to
        // rename() between different devices.
        //
        // 2.) The user tries to rename a file/folder that ends with a dot. This is not
        // really possible to move then, at least on UNC devices.
        if (source.toLowerCase() !== target.toLowerCase() && error.code === 'EXDEV' || source.endsWith('.')) {
            await copy(source, target, { preserveSymlinks: false /* copying to another device */ });
            await rimraf(source, RimRafMode.MOVE);
        }
        else {
            throw error;
        }
    }
}
async function renameWithRetry(source, target, startTime, retryTimeout, attempt = 0) {
    try {
        return await fs.promises.rename(source, target);
    }
    catch (error) {
        if (error.code !== 'EACCES' && error.code !== 'EPERM' && error.code !== 'EBUSY') {
            throw error; // only for errors we think are temporary
        }
        if (Date.now() - startTime >= retryTimeout) {
            console.error(`[node.js fs] rename failed after ${attempt} retries with error: ${error}`);
            throw error; // give up after configurable timeout
        }
        if (attempt === 0) {
            let abortRetry = false;
            try {
                const { stat } = await SymlinkSupport.stat(target);
                if (!stat.isFile()) {
                    abortRetry = true; // if target is not a file, EPERM error may be raised and we should not attempt to retry
                }
            }
            catch (error) {
                // Ignore
            }
            if (abortRetry) {
                throw error;
            }
        }
        // Delay with incremental backoff up to 100ms
        await timeout(Math.min(100, attempt * 10));
        // Attempt again
        return renameWithRetry(source, target, startTime, retryTimeout, attempt + 1);
    }
}
/**
 * Recursively copies all of `source` to `target`.
 *
 * The options `preserveSymlinks` configures how symbolic
 * links should be handled when encountered. Set to
 * `false` to not preserve them and `true` otherwise.
 */
async function copy(source, target, options) {
    return doCopy(source, target, { root: { source, target }, options, handledSourcePaths: new Set() });
}
// When copying a file or folder, we want to preserve the mode
// it had and as such provide it when creating. However, modes
// can go beyond what we expect (see link below), so we mask it.
// (https://github.com/nodejs/node-v0.x-archive/issues/3045#issuecomment-4862588)
const COPY_MODE_MASK = 0o777;
async function doCopy(source, target, payload) {
    // Keep track of paths already copied to prevent
    // cycles from symbolic links to cause issues
    if (payload.handledSourcePaths.has(source)) {
        return;
    }
    else {
        payload.handledSourcePaths.add(source);
    }
    const { stat, symbolicLink } = await SymlinkSupport.stat(source);
    // Symlink
    if (symbolicLink) {
        // Try to re-create the symlink unless `preserveSymlinks: false`
        if (payload.options.preserveSymlinks) {
            try {
                return await doCopySymlink(source, target, payload);
            }
            catch (error) {
                // in any case of an error fallback to normal copy via dereferencing
            }
        }
        if (symbolicLink.dangling) {
            return; // skip dangling symbolic links from here on (https://github.com/microsoft/vscode/issues/111621)
        }
    }
    // Folder
    if (stat.isDirectory()) {
        return doCopyDirectory(source, target, stat.mode & COPY_MODE_MASK, payload);
    }
    // File or file-like
    else {
        return doCopyFile(source, target, stat.mode & COPY_MODE_MASK);
    }
}
async function doCopyDirectory(source, target, mode, payload) {
    // Create folder
    await fs.promises.mkdir(target, { recursive: true, mode });
    // Copy each file recursively
    const files = await readdir(source);
    for (const file of files) {
        await doCopy(join(source, file), join(target, file), payload);
    }
}
async function doCopyFile(source, target, mode) {
    // Copy file
    await fs.promises.copyFile(source, target);
    // restore mode (https://github.com/nodejs/node/issues/1104)
    await fs.promises.chmod(target, mode);
}
async function doCopySymlink(source, target, payload) {
    // Figure out link target
    let linkTarget = await fs.promises.readlink(source);
    // Special case: the symlink points to a target that is
    // actually within the path that is being copied. In that
    // case we want the symlink to point to the target and
    // not the source
    if (isEqualOrParent(linkTarget, payload.root.source, !isLinux)) {
        linkTarget = join(payload.root.target, linkTarget.substr(payload.root.source.length + 1));
    }
    // Create symlink
    await fs.promises.symlink(linkTarget, target);
}
//#endregion
//#region Path resolvers
/**
 * Given an absolute, normalized, and existing file path 'realcase' returns the
 * exact path that the file has on disk.
 * On a case insensitive file system, the returned path might differ from the original
 * path by character casing.
 * On a case sensitive file system, the returned path will always be identical to the
 * original path.
 * In case of errors, null is returned. But you cannot use this function to verify that
 * a path exists.
 *
 * realcase does not handle '..' or '.' path segments and it does not take the locale into account.
 */
export async function realcase(path, token) {
    if (isLinux) {
        // This method is unsupported on OS that have case sensitive
        // file system where the same path can exist in different forms
        // (see also https://github.com/microsoft/vscode/issues/139709)
        return path;
    }
    const dir = dirname(path);
    if (path === dir) { // end recursion
        return path;
    }
    const name = (basename(path) /* can be '' for windows drive letters */ || path).toLowerCase();
    try {
        if (token?.isCancellationRequested) {
            return null;
        }
        const entries = await Promises.readdir(dir);
        const found = entries.filter(e => e.toLowerCase() === name); // use a case insensitive search
        if (found.length === 1) {
            // on a case sensitive filesystem we cannot determine here, whether the file exists or not, hence we need the 'file exists' precondition
            const prefix = await realcase(dir, token); // recurse
            if (prefix) {
                return join(prefix, found[0]);
            }
        }
        else if (found.length > 1) {
            // must be a case sensitive $filesystem
            const ix = found.indexOf(name);
            if (ix >= 0) { // case sensitive
                const prefix = await realcase(dir, token); // recurse
                if (prefix) {
                    return join(prefix, found[ix]);
                }
            }
        }
    }
    catch (error) {
        // silently ignore error
    }
    return null;
}
async function realpath(path) {
    try {
        // DO NOT USE `fs.promises.realpath` here as it internally
        // calls `fs.native.realpath` which will result in subst
        // drives to be resolved to their target on Windows
        // https://github.com/microsoft/vscode/issues/118562
        return await promisify(fs.realpath)(path);
    }
    catch (error) {
        // We hit an error calling fs.realpath(). Since fs.realpath() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        await fs.promises.access(normalizedPath, fs.constants.R_OK);
        return normalizedPath;
    }
}
/**
 * @deprecated always prefer async variants over sync!
 */
export function realpathSync(path) {
    try {
        return fs.realpathSync(path);
    }
    catch (error) {
        // We hit an error calling fs.realpathSync(). Since fs.realpathSync() is doing some path normalization
        // we now do a similar normalization and then try again if we can access the path with read
        // permissions at least. If that succeeds, we return that path.
        // fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
        // to not resolve links but to simply see if the path is read accessible or not.
        const normalizedPath = normalizePath(path);
        fs.accessSync(normalizedPath, fs.constants.R_OK); // throws in case of an error
        return normalizedPath;
    }
}
function normalizePath(path) {
    return rtrim(normalize(path), sep);
}
//#endregion
//#region Promise based fs methods
/**
 * Some low level `fs` methods provided as `Promises` similar to
 * `fs.promises` but with notable differences, either implemented
 * by us or by restoring the original callback based behavior.
 *
 * At least `realpath` is implemented differently in the promise
 * based implementation compared to the callback based one. The
 * promise based implementation actually calls `fs.realpath.native`.
 * (https://github.com/microsoft/vscode/issues/118562)
 */
export const Promises = new class {
    //#region Implemented by node.js
    get read() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes read, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesRead, buffer });
                });
            });
        };
    }
    get write() {
        // Not using `promisify` here for a reason: the return
        // type is not an object as indicated by TypeScript but
        // just the bytes written, so we create our own wrapper.
        return (fd, buffer, offset, length, position) => {
            return new Promise((resolve, reject) => {
                fs.write(fd, buffer, offset, length, position, (err, bytesWritten, buffer) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ bytesWritten, buffer });
                });
            });
        };
    }
    get fdatasync() { return promisify(fs.fdatasync); } // not exposed as API in 22.x yet
    get open() { return promisify(fs.open); } // changed to return `FileHandle` in promise API
    get close() { return promisify(fs.close); } // not exposed as API due to the `FileHandle` return type of `open`
    get ftruncate() { return promisify(fs.ftruncate); } // not exposed as API in 22.x yet
    //#endregion
    //#region Implemented by us
    async exists(path) {
        try {
            await fs.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    get readdir() { return readdir; }
    get readDirsInDir() { return readDirsInDir; }
    get writeFile() { return writeFile; }
    get rm() { return rimraf; }
    get rename() { return rename; }
    get copy() { return copy; }
    get realpath() { return realpath; } // `fs.promises.realpath` will use `fs.realpath.native` which we do not want
};
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGZzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcGZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNqQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXZDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUU3QyxnQkFBZ0I7QUFFaEIsTUFBTSxDQUFOLElBQVksVUFhWDtBQWJELFdBQVksVUFBVTtJQUVyQjs7T0FFRztJQUNILCtDQUFNLENBQUE7SUFFTjs7OztPQUlHO0lBQ0gsMkNBQUksQ0FBQTtBQUNMLENBQUMsRUFiVyxVQUFVLEtBQVYsVUFBVSxRQWFyQjtBQWNELEtBQUssVUFBVSxNQUFN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