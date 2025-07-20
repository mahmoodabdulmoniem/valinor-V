/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isPowerShell } from './runInTerminalHelpers.js';
// Derived from https://github.com/microsoft/vscode/blob/315b0949786b3807f05cb6acd13bf0029690a052/extensions/terminal-suggest/src/tokens.ts#L14-L18
// Some of these can match the same string, so the order matters. Always put the more specific one
// first (eg. >> before >)
const shellTypeResetChars = new Map([
    ['sh', ['&>>', '2>>', '>>', '2>', '&>', '||', '&&', '|&', '<<', '&', ';', '{', '>', '<', '|']],
    ['zsh', ['<<<', '2>>', '&>>', '>>', '2>', '&>', '<(', '<>', '||', '&&', '|&', '&', ';', '{', '<<', '<(', '>', '<', '|']],
    ['pwsh', ['*>>', '2>>', '>>', '2>', '&&', '*>', '>', '<', '|', ';', '!', '&']],
]);
export function splitCommandLineIntoSubCommands(commandLine, envShell, envOS) {
    let shellType;
    const envShellWithoutExe = envShell.replace(/\.exe$/, '');
    if (isPowerShell(envShell, envOS)) {
        shellType = 'pwsh';
    }
    else {
        switch (envShellWithoutExe) {
            case 'zsh':
                shellType = 'zsh';
                break;
            default:
                shellType = 'sh';
                break;
        }
    }
    const subCommands = [commandLine];
    const resetChars = shellTypeResetChars.get(shellType);
    if (resetChars) {
        for (const chars of resetChars) {
            for (let i = 0; i < subCommands.length; i++) {
                const subCommand = subCommands[i];
                if (subCommand.includes(chars)) {
                    subCommands.splice(i, 1, ...subCommand.split(chars).map(e => e.trim()));
                    i--;
                }
            }
        }
    }
    return subCommands;
}
export function extractInlineSubCommands(commandLine, envShell, envOS) {
    const inlineCommands = [];
    const shellType = isPowerShell(envShell, envOS) ? 'pwsh' : 'sh';
    /**
     * Extract command substitutions that start with a specific prefix and are enclosed in parentheses
     * Handles nested parentheses correctly
     */
    function extractWithPrefix(text, prefix) {
        const results = [];
        let i = 0;
        while (i < text.length) {
            const startIndex = text.indexOf(prefix, i);
            if (startIndex === -1) {
                break;
            }
            const contentStart = startIndex + prefix.length;
            if (contentStart >= text.length || text[contentStart] !== '(') {
                i = startIndex + 1;
                continue;
            }
            // Find the matching closing parenthesis, handling nested parentheses
            let parenCount = 1;
            let j = contentStart + 1;
            while (j < text.length && parenCount > 0) {
                if (text[j] === '(') {
                    parenCount++;
                }
                else if (text[j] === ')') {
                    parenCount--;
                }
                j++;
            }
            if (parenCount === 0) {
                // Found matching closing parenthesis
                const innerCommand = text.substring(contentStart + 1, j - 1).trim();
                if (innerCommand) {
                    results.push(innerCommand);
                    // Recursively extract nested inline commands
                    results.push(...extractInlineSubCommands(innerCommand, envShell, envOS));
                }
            }
            i = startIndex + 1;
        }
        return results;
    }
    /**
     * Extract backtick command substitutions (legacy POSIX)
     */
    function extractBackticks(text) {
        const results = [];
        let i = 0;
        while (i < text.length) {
            const startIndex = text.indexOf('`', i);
            if (startIndex === -1) {
                break;
            }
            const endIndex = text.indexOf('`', startIndex + 1);
            if (endIndex === -1) {
                break;
            }
            const innerCommand = text.substring(startIndex + 1, endIndex).trim();
            if (innerCommand) {
                results.push(innerCommand);
                // Recursively extract nested inline commands
                results.push(...extractInlineSubCommands(innerCommand, envShell, envOS));
            }
            i = endIndex + 1;
        }
        return results;
    }
    if (shellType === 'pwsh') {
        // PowerShell command substitution patterns
        inlineCommands.push(...extractWithPrefix(commandLine, '$')); // $(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '@')); // @(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '&')); // &(command)
    }
    else {
        // POSIX shell (bash, zsh, sh) command substitution patterns
        inlineCommands.push(...extractWithPrefix(commandLine, '$')); // $(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '<')); // <(command) - process substitution
        inlineCommands.push(...extractWithPrefix(commandLine, '>')); // >(command) - process substitution
        inlineCommands.push(...extractBackticks(commandLine)); // `command`
    }
    return new Set(inlineCommands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3N1YkNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUV6RCxtSkFBbUo7QUFDbkosa0dBQWtHO0FBQ2xHLDBCQUEwQjtBQUMxQixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxDQUFrQztJQUNwRSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDOUYsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4SCxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUs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