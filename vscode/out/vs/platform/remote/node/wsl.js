/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as os from 'os';
import * as cp from 'child_process';
import { join } from '../../../base/common/path.js';
let hasWSLFeaturePromise;
export async function hasWSLFeatureInstalled(refresh = false) {
    if (hasWSLFeaturePromise === undefined || refresh) {
        hasWSLFeaturePromise = testWSLFeatureInstalled();
    }
    return hasWSLFeaturePromise;
}
async function testWSLFeatureInstalled() {
    const windowsBuildNumber = getWindowsBuildNumber();
    if (windowsBuildNumber === undefined) {
        return false;
    }
    if (windowsBuildNumber >= 22000) {
        const wslExePath = getWSLExecutablePath();
        if (wslExePath) {
            return new Promise(s => {
                try {
                    cp.execFile(wslExePath, ['--status'], err => s(!err));
                }
                catch (e) {
                    s(false);
                }
            });
        }
    }
    else {
        const dllPath = getLxssManagerDllPath();
        if (dllPath) {
            try {
                if ((await fs.promises.stat(dllPath)).isFile()) {
                    return true;
                }
            }
            catch (e) {
            }
        }
    }
    return false;
}
function getWindowsBuildNumber() {
    const osVersion = (/(\d+)\.(\d+)\.(\d+)/g).exec(os.release());
    if (osVersion) {
        return parseInt(osVersion[3]);
    }
    return undefined;
}
function getSystem32Path(subPath) {
    const systemRoot = process.env['SystemRoot'];
    if (systemRoot) {
        const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        return join(systemRoot, is32ProcessOn64Windows ? 'Sysnative' : 'System32', subPath);
    }
    return undefined;
}
function getWSLExecutablePath() {
    return getSystem32Path('wsl.exe');
}
/**
 * In builds < 22000 this dll inidcates that WSL is installed
 */
function getLxssManagerDllPath() {
    return getSystem32Path('lxss\\LxssManager.dll');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3NsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvbm9kZS93c2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDcEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBELElBQUksb0JBQWtELENBQUM7QUFFdkQsTUFBTSxDQUFDLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxPQUFPLEdBQUcsS0FBSztJQUMzRCxJQUFJLG9CQUFvQixLQUFLLFNBQVMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNuRCxvQkFBb0IsR0FBRyx1QkFBdUIsRUFBRSxDQUFDO0lBQ2xELENBQUM7SUFDRCxPQUFPLG9CQUFvQixDQUFDO0FBQzdCLENBQUM7QUFFRCxLQUFLLFVBQVUsdUJBQXVCO0lBQ3JDLE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztJQUNuRCxJQUFJLGtCQUFrQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3RDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELElBQUksa0JBQWtCLElBQUksS0FBSyxFQUFFLENBQUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQztRQUMxQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxPQUFPLENBQVUsQ0FBQyxDQUFDLEVBQUU7Z0JBQy9CLElBQUksQ0FBQztvQkFDSixFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsQ0FBQztnQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNaLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDVixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLE9BQU8sR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3hDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO29CQUNoRCxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLHFCQUFxQjtJQUM3QixNQUFNLFNBQVMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzlELElBQUksU0FBUyxFQUFFLENBQUM7UUFDZixPQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLE9BQWU7SUFDdkMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM3QyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNwRixPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQsU0FBUyxvQkFBb0I7SUFDNUIsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxxQkFBcUI7SUFDN0IsT0FBTyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUNqRCxDQUFDIn0=