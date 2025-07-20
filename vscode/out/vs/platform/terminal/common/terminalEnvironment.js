/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OS } from '../../../base/common/platform.js';
/**
 * Aggressively escape non-windows paths to prepare for being sent to a shell. This will do some
 * escaping inaccurately to be careful about possible script injection via the file path. For
 * example, we're trying to prevent this sort of attack: `/foo/file$(echo evil)`.
 */
export function escapeNonWindowsPath(path, shellType) {
    let newPath = path;
    if (newPath.includes('\\')) {
        newPath = newPath.replace(/\\/g, '\\\\');
    }
    let escapeConfig;
    switch (shellType) {
        case "bash" /* PosixShellType.Bash */:
        case "sh" /* PosixShellType.Sh */:
        case "zsh" /* PosixShellType.Zsh */:
        case "gitbash" /* WindowsShellType.GitBash */:
            escapeConfig = {
                bothQuotes: (path) => `$'${path.replace(/'/g, '\\\'')}'`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        case "fish" /* PosixShellType.Fish */:
            escapeConfig = {
                bothQuotes: (path) => `"${path.replace(/"/g, '\\"')}"`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        case "pwsh" /* GeneralShellType.PowerShell */:
            // PowerShell should be handled separately in preparePathForShell
            // but if we get here, use PowerShell escaping
            escapeConfig = {
                bothQuotes: (path) => `"${path.replace(/"/g, '`"')}"`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\'\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
        default:
            // Default to POSIX shell escaping for unknown shells
            escapeConfig = {
                bothQuotes: (path) => `$'${path.replace(/'/g, '\\\'')}'`,
                singleQuotes: (path) => `'${path.replace(/'/g, '\\\'')}'`,
                noSingleQuotes: (path) => `'${path}'`
            };
            break;
    }
    // Remove dangerous characters except single and double quotes, which we'll escape properly
    const bannedChars = /[\`\$\|\&\>\~\#\!\^\*\;\<]/g;
    newPath = newPath.replace(bannedChars, '');
    // Apply shell-specific escaping based on quote content
    if (newPath.includes('\'') && newPath.includes('"')) {
        return escapeConfig.bothQuotes(newPath);
    }
    else if (newPath.includes('\'')) {
        return escapeConfig.singleQuotes(newPath);
    }
    else {
        return escapeConfig.noSingleQuotes(newPath);
    }
}
/**
 * Collapses the user's home directory into `~` if it exists within the path, this gives a shorter
 * path that is more suitable within the context of a terminal.
 */
export function collapseTildePath(path, userHome, separator) {
    if (!path) {
        return '';
    }
    if (!userHome) {
        return path;
    }
    // Trim the trailing separator from the end if it exists
    if (userHome.match(/[\/\\]$/)) {
        userHome = userHome.slice(0, userHome.length - 1);
    }
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase();
    const normalizedUserHome = userHome.replace(/\\/g, '/').toLowerCase();
    if (!normalizedPath.includes(normalizedUserHome)) {
        return path;
    }
    return `~${separator}${path.slice(userHome.length + 1)}`;
}
/**
 * Sanitizes a cwd string, removing any wrapping quotes and making the Windows drive letter
 * uppercase.
 * @param cwd The directory to sanitize.
 */
export function sanitizeCwd(cwd) {
    // Sanity check that the cwd is not wrapped in quotes (see #160109)
    if (cwd.match(/^['"].*['"]$/)) {
        cwd = cwd.substring(1, cwd.length - 1);
    }
    // Make the drive letter uppercase on Windows (see #9448)
    if (OS === 1 /* OperatingSystem.Windows */ && cwd && cwd[1] === ':') {
        return cwd[0].toUpperCase() + cwd.substring(1);
    }
    return cwd;
}
/**
 * Determines whether the given shell launch config should use the environment variable collection.
 * @param slc The shell launch config to check.
 */
export function shouldUseEnvironmentVariableCollection(slc) {
    return !slc.strictEnv;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbnZpcm9ubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsRW52aXJvbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUd2RTs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUFDLElBQVksRUFBRSxTQUE2QjtJQUMvRSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDbkIsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDNUIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFZRCxJQUFJLFlBQStCLENBQUM7SUFDcEMsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNuQixzQ0FBeUI7UUFDekIsa0NBQXVCO1FBQ3ZCLG9DQUF3QjtRQUN4QjtZQUNDLFlBQVksR0FBRztnQkFDZCxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUc7Z0JBQ3hELFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRztnQkFDekQsY0FBYyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksR0FBRzthQUNyQyxDQUFDO1lBQ0YsTUFBTTtRQUNQO1lBQ0MsWUFBWSxHQUFHO2dCQUNkLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxF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