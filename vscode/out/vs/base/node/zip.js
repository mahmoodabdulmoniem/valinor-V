/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createWriteStream, promises } from 'fs';
import { createCancelablePromise, Sequencer } from '../common/async.js';
import * as path from '../common/path.js';
import { assertReturnsDefined } from '../common/types.js';
import { Promises } from './pfs.js';
import * as nls from '../../nls.js';
export const CorruptZipMessage = 'end of central directory record signature not found';
const CORRUPT_ZIP_PATTERN = new RegExp(CorruptZipMessage);
export class ExtractError extends Error {
    constructor(type, cause) {
        let message = cause.message;
        switch (type) {
            case 'CorruptZip':
                message = `Corrupt ZIP: ${message}`;
                break;
        }
        super(message);
        this.type = type;
        this.cause = cause;
    }
}
function modeFromEntry(entry) {
    const attr = entry.externalFileAttributes >> 16 || 33188;
    return [448 /* S_IRWXU */, 56 /* S_IRWXG */, 7 /* S_IRWXO */]
        .map(mask => attr & mask)
        .reduce((a, b) => a + b, attr & 61440 /* S_IFMT */);
}
function toExtractError(err) {
    if (err instanceof ExtractError) {
        return err;
    }
    let type = undefined;
    if (CORRUPT_ZIP_PATTERN.test(err.message)) {
        type = 'CorruptZip';
    }
    return new ExtractError(type, err);
}
function extractEntry(stream, fileName, mode, targetPath, options, token) {
    const dirName = path.dirname(fileName);
    const targetDirName = path.join(targetPath, dirName);
    if (!targetDirName.startsWith(targetPath)) {
        return Promise.reject(new Error(nls.localize('invalid file', "Error extracting {0}. Invalid file.", fileName)));
    }
    const targetFileName = path.join(targetPath, fileName);
    let istream;
    token.onCancellationRequested(() => {
        istream?.destroy();
    });
    return Promise.resolve(promises.mkdir(targetDirName, { recursive: true })).then(() => new Promise((c, e) => {
        if (token.isCancellationRequested) {
            return;
        }
        try {
            istream = createWriteStream(targetFileName, { mode });
            istream.once('close', () => c());
            istream.once('error', e);
            stream.once('error', e);
            stream.pipe(istream);
        }
        catch (error) {
            e(error);
        }
    }));
}
function extractZip(zipfile, targetPath, options, token) {
    let last = createCancelablePromise(() => Promise.resolve());
    let extractedEntriesCount = 0;
    const listener = token.onCancellationRequested(() => {
        last.cancel();
        zipfile.close();
    });
    return new Promise((c, e) => {
        const throttler = new Sequencer();
        const readNextEntry = (token) => {
            if (token.isCancellationRequested) {
                return;
            }
            extractedEntriesCount++;
            zipfile.readEntry();
        };
        zipfile.once('error', e);
        zipfile.once('close', () => last.then(() => {
            if (token.isCancellationRequested || zipfile.entryCount === extractedEntriesCount) {
                c();
            }
            else {
                e(new ExtractError('Incomplete', new Error(nls.localize('incompleteExtract', "Incomplete. Found {0} of {1} entries", extractedEntriesCount, zipfile.entryCount))));
            }
        }, e));
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
            if (token.isCancellationRequested) {
                return;
            }
            if (!options.sourcePathRegex.test(entry.fileName)) {
                readNextEntry(token);
                return;
            }
            const fileName = entry.fileName.replace(options.sourcePathRegex, '');
            // directory file names end with '/'
            if (/\/$/.test(fileName)) {
                const targetFileName = path.join(targetPath, fileName);
                last = createCancelablePromise(token => promises.mkdir(targetFileName, { recursive: true }).then(() => readNextEntry(token)).then(undefined, e));
                return;
            }
            const stream = openZipStream(zipfile, entry);
            const mode = modeFromEntry(entry);
            last = createCancelablePromise(token => throttler.queue(() => stream.then(stream => extractEntry(stream, fileName, mode, targetPath, options, token).then(() => readNextEntry(token)))).then(null, e));
        });
    }).finally(() => listener.dispose());
}
async function openZip(zipFile, lazy = false) {
    const { open } = await import('yauzl');
    return new Promise((resolve, reject) => {
        open(zipFile, lazy ? { lazyEntries: true } : undefined, (error, zipfile) => {
            if (error) {
                reject(toExtractError(error));
            }
            else {
                resolve(assertReturnsDefined(zipfile));
            }
        });
    });
}
function openZipStream(zipFile, entry) {
    return new Promise((resolve, reject) => {
        zipFile.openReadStream(entry, (error, stream) => {
            if (error) {
                reject(toExtractError(error));
            }
            else {
                resolve(assertReturnsDefined(stream));
            }
        });
    });
}
export async function zip(zipPath, files) {
    const { ZipFile } = await import('yazl');
    return new Promise((c, e) => {
        const zip = new ZipFile();
        files.forEach(f => {
            if (f.contents) {
                zip.addBuffer(typeof f.contents === 'string' ? Buffer.from(f.contents, 'utf8') : f.contents, f.path);
            }
            else if (f.localPath) {
                zip.addFile(f.localPath, f.path);
            }
        });
        zip.end();
        const zipStream = createWriteStream(zipPath);
        zip.outputStream.pipe(zipStream);
        zip.outputStream.once('error', e);
        zipStream.once('error', e);
        zipStream.once('finish', () => c(zipPath));
    });
}
export function extract(zipPath, targetPath, options = {}, token) {
    const sourcePathRegex = new RegExp(options.sourcePath ? `^${options.sourcePath}` : '');
    let promise = openZip(zipPath, true);
    if (options.overwrite) {
        promise = promise.then(zipfile => Promises.rm(targetPath).then(() => zipfile));
    }
    return promise.then(zipfile => extractZip(zipfile, targetPath, { sourcePathRegex }, token));
}
function read(zipPath, filePath) {
    return openZip(zipPath).then(zipfile => {
        return new Promise((c, e) => {
            zipfile.on('entry', (entry) => {
                if (entry.fileName === filePath) {
                    openZipStream(zipfile, entry).then(stream => c(stream), err => e(err));
                }
            });
            zipfile.once('close', () => e(new Error(nls.localize('notFound', "{0} not found inside zip.", filePath))));
        });
    });
}
export function buffer(zipPath, filePath) {
    return read(zipPath, filePath).then(stream => {
        return new Promise((c, e) => {
            const buffers = [];
            stream.once('error', e);
            stream.on('data', (b) => buffers.push(b));
            stream.on('end', () => c(Buffer.concat(buffers)));
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvemlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFFOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXhFLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUM7QUFDMUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNwQyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUdwQyxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBVyxxREFBcUQsQ0FBQztBQUMvRixNQUFNLG1CQUFtQixHQUFHLElBQUksTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFrQjFELE1BQU0sT0FBTyxZQUFhLFNBQVEsS0FBSztJQUl0QyxZQUFZLElBQWtDLEVBQUUsS0FBWTtRQUMzRCxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBRTVCLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLFlBQVk7Z0JBQUUsT0FBTyxHQUFHLGdCQUFnQixPQUFPLEVBQUUsQ0FBQztnQkFBQyxNQUFNO1FBQy9ELENBQUM7UUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDZixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUFZO0lBQ2xDLE1BQU0s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