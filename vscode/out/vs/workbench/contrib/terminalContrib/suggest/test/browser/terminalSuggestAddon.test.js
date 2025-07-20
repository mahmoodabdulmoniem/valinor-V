/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { isInlineCompletionSupported } from '../../browser/terminalSuggestAddon.js';
suite('Terminal Suggest Addon - Inline Completion, Shell Type Support', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should return true for supported shell types', () => {
        strictEqual(isInlineCompletionSupported("bash" /* PosixShellType.Bash */), true);
        strictEqual(isInlineCompletionSupported("zsh" /* PosixShellType.Zsh */), true);
        strictEqual(isInlineCompletionSupported("fish" /* PosixShellType.Fish */), true);
        strictEqual(isInlineCompletionSupported("pwsh" /* GeneralShellType.PowerShell */), true);
        strictEqual(isInlineCompletionSupported("gitbash" /* WindowsShellType.GitBash */), true);
    });
    test('should return false for unsupported shell types', () => {
        strictEqual(isInlineCompletionSupported("nu" /* GeneralShellType.NuShell */), false);
        strictEqual(isInlineCompletionSupported("julia" /* GeneralShellType.Julia */), false);
        strictEqual(isInlineCompletionSupported("node" /* GeneralShellType.Node */), false);
        strictEqual(isInlineCompletionSupported("python" /* GeneralShellType.Python */), false);
        strictEqual(isInlineCompletionSupported("sh" /* PosixShellType.Sh */), false);
        strictEqual(isInlineCompletionSupported("csh" /* PosixShellType.Csh */), false);
        strictEqual(isInlineCompletionSupported("ksh" /* PosixShellType.Ksh */), false);
        strictEqual(isInlineCompletionSupported("cmd" /* WindowsShellType.CommandPrompt */), false);
        strictEqual(isInlineCompletionSupported("wsl" /* WindowsShellType.Wsl */), false);
        strictEqual(isInlineCompletionSupported("python" /* GeneralShellType.Python */), false);
        strictEqual(isInlineCompletionSupported(undefined), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3Rlcm1pbmFsU3VnZ2VzdEFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVwRixLQUFLLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO0lBQzVFLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtRQUN6RCxXQUFXLENBQUMsMkJBQTJCLGtDQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQywyQkFBMkIsZ0NBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkUsV0FBVyxDQUFDLDJCQUEyQixrQ0FBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwRSxXQUFXLENBQUMsMkJBQTJCLDBDQUE2QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVFLFdBQVcsQ0FBQywyQkFBMkIsMENBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzVELFdBQVcsQ0FBQywyQkFBMkIscUNBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUUsV0FBVyxDQUFDLDJCQUEyQixzQ0FBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxXQUFXLENBQUMsMkJBQTJCLG9DQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZFLFdBQVcsQ0FBQywyQkFBMkIsd0NBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekUsV0FBVyxDQUFDLDJCQUEyQiw4QkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRSxXQUFXLENBQUMsMkJBQTJCLGdDQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQywyQkFBMkIsZ0NBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsV0FBVyxDQUFDLDJCQUEyQiw0Q0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRixXQUFXLENBQUMsMkJBQTJCLGtDQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLFdBQVcsQ0FBQywyQkFBMkIsd0NBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekUsV0FBVyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==