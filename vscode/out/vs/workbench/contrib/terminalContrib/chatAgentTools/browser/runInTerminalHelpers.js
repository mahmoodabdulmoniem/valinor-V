/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { posix as pathPosix, win32 as pathWin32 } from '../../../../../base/common/path.js';
import { removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
export function isPowerShell(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^(?:powershell|pwsh)(?:-preview)?$/i.test(pathWin32.basename(envShell).replace(/\.exe$/i, ''));
    }
    return /^(?:powershell|pwsh)(?:-preview)?$/.test(pathPosix.basename(envShell));
}
// Maximum output length to prevent context overflow
const MAX_OUTPUT_LENGTH = 60000; // ~60KB limit to keep context manageable
const TRUNCATION_MESSAGE = '\n\n[... MIDDLE OF OUTPUT TRUNCATED ...]\n\n';
export function sanitizeTerminalOutput(output) {
    let sanitized = removeAnsiEscapeCodes(output)
        // Trim trailing \r\n characters
        .trimEnd();
    // Truncate if output is too long to prevent context overflow
    if (sanitized.length > MAX_OUTPUT_LENGTH) {
        const truncationMessageLength = TRUNCATION_MESSAGE.length;
        const availableLength = MAX_OUTPUT_LENGTH - truncationMessageLength;
        const startLength = Math.floor(availableLength * 0.4); // Keep 40% from start
        const endLength = availableLength - startLength; // Keep 60% from end
        const startPortion = sanitized.substring(0, startLength);
        const endPortion = sanitized.substring(sanitized.length - endLength);
        sanitized = startPortion + TRUNCATION_MESSAGE + endPortion;
    }
    return sanitized;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbEhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3J1bkluVGVybWluYWxIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU5RSxNQUFNLFVBQVUsWUFBWSxDQUFDLFFBQWdCLEVBQUUsRUFBbUI7SUFDakUsSUFBSSxFQUFFLG9DQUE0QixFQUFFLENBQUM7UUFDcEMsT0FBTyxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFeEcsQ0FBQztJQUNELE9BQU8sb0NBQW9DLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNoRixDQUFDO0FBRUQsb0RBQW9EO0FBQ3BELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLENBQUMseUNBQXlDO0FBQzFFLE1BQU0sa0JBQWtCLEdBQUcsOENBQThDLENBQUM7QUFFMUUsTUFBTSxVQUFVLHNCQUFzQixDQUFDLE1BQWM7SUFDcEQsSUFBSSxTQUFTLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDO1FBQzVDLGdDQUFnQztTQUMvQixPQUFPLEVBQUUsQ0FBQztJQUVaLDZEQUE2RDtJQUM3RCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQyxNQUFNLHVCQUF1QixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUMxRCxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsR0FBRyx1QkFBdUIsQ0FBQztRQUNwRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtRQUM3RSxNQUFNLFNBQVMsR0FBRyxlQUFlLEdBQUcsV0FBVyxDQUFDLENBQUMsb0JBQW9CO1FBRXJFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztRQUVyRSxTQUFTLEdBQUcsWUFBWSxHQUFHLGtCQUFrQixHQUFHLFVBQVUsQ0FBQztJQUM1RCxDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyJ9