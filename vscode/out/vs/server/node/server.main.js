/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import * as fs from 'fs';
import { FileAccess } from '../../base/common/network.js';
import { run as runCli } from './remoteExtensionHostAgentCli.js';
import { createServer as doCreateServer } from './remoteExtensionHostAgentServer.js';
import { parseArgs } from '../../platform/environment/node/argv.js';
import { join, dirname } from '../../base/common/path.js';
import { performance } from 'perf_hooks';
import { serverOptions } from './serverEnvironmentService.js';
import product from '../../platform/product/common/product.js';
import * as perf from '../../base/common/performance.js';
perf.mark('code/server/codeLoaded');
global.vscodeServerCodeLoadedTime = performance.now();
const errorReporter = {
    onMultipleValues: (id, usedValue) => {
        console.error(`Option '${id}' can only be defined once. Using value ${usedValue}.`);
    },
    onEmptyValue: (id) => {
        console.error(`Ignoring option '${id}': Value must not be empty.`);
    },
    onUnknownOption: (id) => {
        console.error(`Ignoring option '${id}': not supported for server.`);
    },
    onDeprecatedOption: (deprecatedOption, message) => {
        console.warn(`Option '${deprecatedOption}' is deprecated: ${message}`);
    }
};
const args = parseArgs(process.argv.slice(2), serverOptions, errorReporter);
const REMOTE_DATA_FOLDER = args['server-data-dir'] || process.env['VSCODE_AGENT_FOLDER'] || join(os.homedir(), product.serverDataFolderName || '.vscode-remote');
const USER_DATA_PATH = join(REMOTE_DATA_FOLDER, 'data');
const APP_SETTINGS_HOME = join(USER_DATA_PATH, 'User');
const GLOBAL_STORAGE_HOME = join(APP_SETTINGS_HOME, 'globalStorage');
const LOCAL_HISTORY_HOME = join(APP_SETTINGS_HOME, 'History');
const MACHINE_SETTINGS_HOME = join(USER_DATA_PATH, 'Machine');
args['user-data-dir'] = USER_DATA_PATH;
const APP_ROOT = dirname(FileAccess.asFileUri('').fsPath);
const BUILTIN_EXTENSIONS_FOLDER_PATH = join(APP_ROOT, 'extensions');
args['builtin-extensions-dir'] = BUILTIN_EXTENSIONS_FOLDER_PATH;
args['extensions-dir'] = args['extensions-dir'] || join(REMOTE_DATA_FOLDER, 'extensions');
[REMOTE_DATA_FOLDER, args['extensions-dir'], USER_DATA_PATH, APP_SETTINGS_HOME, MACHINE_SETTINGS_HOME, GLOBAL_STORAGE_HOME, LOCAL_HISTORY_HOME].forEach(f => {
    try {
        if (!fs.existsSync(f)) {
            fs.mkdirSync(f, { mode: 0o700 });
        }
    }
    catch (err) {
        console.error(err);
    }
});
/**
 * invoked by server-main.js
 */
export function spawnCli() {
    runCli(args, REMOTE_DATA_FOLDER, serverOptions);
}
/**
 * invoked by server-main.js
 */
export function createServer(address) {
    return doCreateServer(address, args, REMOTE_DATA_FOLDER);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLm1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3NlcnZlci5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXpCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxJQUFJLE1BQU0sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLElBQUksY0FBYyxFQUFjLE1BQU0scUNBQXFDLENBQUM7QUFDakcsT0FBTyxFQUFFLFNBQVMsRUFBaUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sT0FBTyxNQUFNLDBDQUEwQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxJQUFJLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQzlCLE1BQU8sQ0FBQywwQkFBMEIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFN0QsTUFBTSxhQUFhLEdBQWtCO0lBQ3BDLGdCQUFnQixFQUFFLENBQUMsRUFBVSxFQUFFLFNBQWlCLEVBQUUsRUFBRTtRQUNuRCxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSwyQ0FBMkMsU0FBUyxHQUFHLENBQUMsQ0FBQztJ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