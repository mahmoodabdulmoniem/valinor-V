/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
// This file used to be a pure JS file and was always
// importing `path` from node.js even though we ship
// our own version of the library and prefer to use
// that.
// However, resolution of user-data-path is critical
// and while our version of `path` is a copy of node.js
// one, you never know. As such, preserve the use of
// the built-in `path` lib for the time being.
// eslint-disable-next-line local/code-import-patterns
import { resolve, isAbsolute, join } from 'path';
const cwd = process.env['VSCODE_CWD'] || process.cwd();
/**
 * Returns the user data path to use with some rules:
 * - respect portable mode
 * - respect VSCODE_APPDATA environment variable
 * - respect --user-data-dir CLI argument
 */
export function getUserDataPath(cliArgs, productName) {
    const userDataPath = doGetUserDataPath(cliArgs, productName);
    const pathsToResolve = [userDataPath];
    // If the user-data-path is not absolute, make
    // sure to resolve it against the passed in
    // current working directory. We cannot use the
    // node.js `path.resolve()` logic because it will
    // not pick up our `VSCODE_CWD` environment variable
    // (https://github.com/microsoft/vscode/issues/120269)
    if (!isAbsolute(userDataPath)) {
        pathsToResolve.unshift(cwd);
    }
    return resolve(...pathsToResolve);
}
function doGetUserDataPath(cliArgs, productName) {
    // 0. Running out of sources has a fixed productName
    if (process.env['VSCODE_DEV']) {
        productName = 'code-oss-dev';
    }
    // 1. Support portable mode
    const portablePath = process.env['VSCODE_PORTABLE'];
    if (portablePath) {
        return join(portablePath, 'user-data');
    }
    // 2. Support global VSCODE_APPDATA environment variable
    let appDataPath = process.env['VSCODE_APPDATA'];
    if (appDataPath) {
        return join(appDataPath, productName);
    }
    // With Electron>=13 --user-data-dir switch will be propagated to
    // all processes https://github.com/electron/electron/blob/1897b14af36a02e9aa7e4d814159303441548251/shell/browser/electron_browser_client.cc#L546-L553
    // Check VSCODE_PORTABLE and VSCODE_APPDATA before this case to get correct values.
    // 3. Support explicit --user-data-dir
    const cliPath = cliArgs['user-data-dir'];
    if (cliPath) {
        return cliPath;
    }
    // 4. Otherwise check per platform
    switch (process.platform) {
        case 'win32':
            appDataPath = process.env['APPDATA'];
            if (!appDataPath) {
                const userProfile = process.env['USERPROFILE'];
                if (typeof userProfile !== 'string') {
                    throw new Error('Windows: Unexpected undefined %USERPROFILE% environment variable');
                }
                appDataPath = join(userProfile, 'AppData', 'Roaming');
            }
            break;
        case 'darwin':
            appDataPath = join(homedir(), 'Library', 'Application Support');
            break;
        case 'linux':
            appDataPath = process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config');
            break;
        default:
            throw new Error('Platform not supported');
    }
    return join(appDataPath, productName);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQYXRoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL3VzZXJEYXRhUGF0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRzdCLHFEQUFxRDtBQUNyRCxvREFBb0Q7QUFDcEQsbURBQW1EO0FBQ25ELFFBQVE7QUFDUixvREFBb0Q7QUFDcEQsdURBQXVEO0FBQ3ZELG9EQUFvRDtBQUNwRCw4Q0FBOEM7QUFDOUMsc0RBQXNEO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUVqRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUV2RDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBeUIsRUFBRSxXQUFtQjtJQUM3RSxNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDN0QsTUFBTSxjQUFjLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUV0Qyw4Q0FBOEM7SUFDOUMsMkNBQTJDO0lBQzNDLCtDQUErQztJQUMvQyxpREFBaUQ7SUFDakQsb0RBQW9EO0lBQ3BELHNEQUFzRDtJQUN0RCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFDL0IsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsT0FBTyxPQUFPLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQztBQUNuQyxDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxPQUF5QixFQUFFLFdBQW1CO0lBRXhFLG9EQUFvRDtJQUNwRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUMvQixXQUFXLEdBQUcsY0FBYyxDQUFDO0lBQzlCLENBQUM7SUFFRCwyQkFBMkI7SUFDM0IsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BELElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCx3REFBd0Q7SUFDeEQsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2hELElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxpRUFBaUU7SUFDakUsc0pBQXNKO0lBQ3RKLG1GQUFtRjtJQUNuRixzQ0FBc0M7SUFDdEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQ3pDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRUQsa0NBQWtDO0lBQ2xDLFFBQVEsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLEtBQUssT0FBTztZQUNYLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO2dCQUNyRixDQUFDO2dCQUVELFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBQ0QsTUFBTTtRQUNQLEtBQUssUUFBUTtZQUNaLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFDaEUsTUFBTTtRQUNQLEtBQUssT0FBTztZQUNYLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzNFLE1BQU07UUFDUDtZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMifQ==