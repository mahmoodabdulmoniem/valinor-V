/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Converts a Git Bash absolute path to a Windows absolute path.
 * Examples:
 *   "/"      => "C:\\"
 *   "/c/"    => "C:\\"
 *   "/c/Users/foo" => "C:\\Users\\foo"
 *   "/d/bar" => "D:\\bar"
 */
export function gitBashToWindowsPath(path, driveLetter) {
    // Dynamically determine the system drive (default to 'C:' if not set)
    const systemDrive = (driveLetter || 'C:').toUpperCase();
    // Handle root "/"
    if (path === '/') {
        return `${systemDrive}\\`;
    }
    const match = path.match(/^\/([a-zA-Z])(\/.*)?$/);
    if (match) {
        const drive = match[1].toUpperCase();
        const rest = match[2] ? match[2].replace(/\//g, '\\') : '\\';
        return `${drive}:${rest}`;
    }
    // Fallback: just replace slashes
    return path.replace(/\//g, '\\');
}
/**
 *
 * @param path A Windows-style absolute path (e.g., "C:\Users\foo").
 * Converts it to a Git Bash-style absolute path (e.g., "/c/Users/foo").
 * @returns The Git Bash-style absolute path.
 */
export function windowsToGitBashPath(path) {
    // Convert Windows path (e.g. C:\Users\foo) to Git Bash path (e.g. /c/Users/foo)
    return path
        .replace(/^[a-zA-Z]:\\/, match => `/${match[0].toLowerCase()}/`)
        .replace(/\\/g, '/');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHaXRCYXNoSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbEdpdEJhc2hIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsSUFBWSxFQUFFLFdBQW9CO0lBQ3RFLHNFQUFzRTtJQUN0RSxNQUFNLFdBQVcsR0FBRyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN4RCxrQkFBa0I7SUFDbEIsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDbEIsT0FBTyxHQUFHLFdBQVcsSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDbEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDN0QsT0FBTyxHQUFHLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBQ0QsaUNBQWlDO0lBQ2pDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDbEMsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUFDLElBQVk7SUFDaEQsZ0ZBQWdGO0lBQ2hGLE9BQU8sSUFBSTtTQUNULE9BQU8sQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDO1NBQy9ELE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdkIsQ0FBQyJ9