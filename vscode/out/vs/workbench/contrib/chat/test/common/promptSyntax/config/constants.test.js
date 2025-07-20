/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getCleanPromptName, isPromptOrInstructionsFile } from '../../../../common/promptSyntax/config/promptFileLocations.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { URI } from '../../../../../../../base/common/uri.js';
suite('Prompt Constants', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('getCleanPromptName', () => {
        test('returns a clean prompt name', () => {
            assert.strictEqual(getCleanPromptName(URI.file('/path/to/my-prompt.prompt.md')), 'my-prompt');
            assert.strictEqual(getCleanPromptName(URI.file('../common.prompt.md')), 'common');
            const expectedPromptName = `some-${randomInt(1000)}`;
            assert.strictEqual(getCleanPromptName(URI.file(`./${expectedPromptName}.prompt.md`)), expectedPromptName);
            assert.strictEqual(getCleanPromptName(URI.file('.github/copilot-instructions.md')), 'copilot-instructions');
            assert.strictEqual(getCleanPromptName(URI.file('/etc/prompts/my-prompt')), 'my-prompt');
            assert.strictEqual(getCleanPromptName(URI.file('../some-folder/frequent.txt')), 'frequent.txt');
            assert.strictEqual(getCleanPromptName(URI.parse('untitled:Untitled-1')), 'Untitled-1');
        });
    });
    suite('isPromptOrInstructionsFile', () => {
        test('returns `true` for prompt files', () => {
            assert(isPromptOrInstructionsFile(URI.file('/path/to/my-prompt.prompt.md')));
            assert(isPromptOrInstructionsFile(URI.file('../common.prompt.md')));
            assert(isPromptOrInstructionsFile(URI.file(`./some-${randomInt(1000)}.prompt.md`)));
            assert(isPromptOrInstructionsFile(URI.file('.github/copilot-instructions.md')));
        });
        test('returns `false` for non-prompt files', () => {
            assert(!isPromptOrInstructionsFile(URI.file('/path/to/my-prompt.prompt.md1')));
            assert(!isPromptOrInstructionsFile(URI.file('../common.md')));
            assert(!isPromptOrInstructionsFile(URI.file(`./some-${randomInt(1000)}.txt`)));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9jb25zdGFudHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDL0gsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc5RCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1lBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQyxFQUM1RCxXQUFXLENBQ1gsQ0FBQztZQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUNuRCxRQUFRLENBQ1IsQ0FBQztZQUVGLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUNqQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssa0JBQWtCLFlBQVksQ0FBQyxDQUFDLEVBQ2pFLGtCQUFrQixDQUNsQixDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEVBQy9ELHNCQUFzQixDQUN0QixDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQ3RELFdBQVcsQ0FDWCxDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQzNELGNBQWMsQ0FDZCxDQUFDO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEVBQ3BELFlBQVksQ0FDWixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQ0wsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQ3BFLENBQUM7WUFFRixNQUFNLENBQ0wsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQzNELENBQUM7WUFFRixNQUFNLENBQ0wsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FDM0UsQ0FBQztZQUVGLE1BQU0sQ0FDTCwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FDdkUsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtZQUNqRCxNQUFNLENBQ0wsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FDdEUsQ0FBQztZQUVGLE1BQU0sQ0FDTCxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FDckQsQ0FBQztZQUVGLE1BQU0sQ0FDTCxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQ3RFLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==