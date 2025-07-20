/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { computeDefaultDocumentColors } from '../../../common/languages/defaultDocumentColorsComputer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('Default Document Colors Computer', () => {
    class TestDocumentModel {
        constructor(content) {
            this.content = content;
        }
        getValue() {
            return this.content;
        }
        positionAt(offset) {
            const lines = this.content.substring(0, offset).split('\n');
            return {
                lineNumber: lines.length,
                column: lines[lines.length - 1].length + 1
            };
        }
        findMatches(regex) {
            return [...this.content.matchAll(regex)];
        }
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Hex colors in strings should be detected', () => {
        // Test case from issue: hex color inside string is not detected
        const model = new TestDocumentModel("const color = '#ff0000';");
        const colors = computeDefaultDocumentColors(model);
        assert.strictEqual(colors.length, 1, 'Should detect one hex color');
        assert.strictEqual(colors[0].color.red, 1, 'Red component should be 1 (255/255)');
        assert.strictEqual(colors[0].color.green, 0, 'Green component should be 0');
        assert.strictEqual(colors[0].color.blue, 0, 'Blue component should be 0');
        assert.strictEqual(colors[0].color.alpha, 1, 'Alpha should be 1');
    });
    test('Hex colors in double quotes should be detected', () => {
        const model = new TestDocumentModel('const color = "#00ff00";');
        const colors = computeDefaultDocumentColors(model);
        assert.strictEqual(colors.length, 1, 'Should detect one hex color');
        assert.strictEqual(colors[0].color.red, 0, 'Red component should be 0');
        assert.strictEqual(colors[0].color.green, 1, 'Green component should be 1 (255/255)');
        assert.strictEqual(colors[0].color.blue, 0, 'Blue component should be 0');
    });
    test('Multiple hex colors in array should be detected', () => {
        const model = new TestDocumentModel("const colors = ['#ff0000', '#00ff00', '#0000ff'];");
        const colors = computeDefaultDocumentColors(model);
        assert.strictEqual(colors.length, 3, 'Should detect three hex colors');
        // First color: red
        assert.strictEqual(colors[0].color.red, 1, 'First color red component should be 1');
        assert.strictEqual(colors[0].color.green, 0, 'First color green component should be 0');
        assert.strictEqual(colors[0].color.blue, 0, 'First color blue component should be 0');
        // Second color: green
        assert.strictEqual(colors[1].color.red, 0, 'Second color red component should be 0');
        assert.strictEqual(colors[1].color.green, 1, 'Second color green component should be 1');
        assert.strictEqual(colors[1].color.blue, 0, 'Second color blue component should be 0');
        // Third color: blue
        assert.strictEqual(colors[2].color.red, 0, 'Third color red component should be 0');
        assert.strictEqual(colors[2].color.green, 0, 'Third color green component should be 0');
        assert.strictEqual(colors[2].color.blue, 1, 'Third color blue component should be 1');
    });
    test('Existing functionality should still work', () => {
        // Test cases that were already working
        const testCases = [
            { content: "const color = ' #ff0000';", name: 'hex with space before' },
            { content: '#ff0000', name: 'hex at start of line' },
            { content: '  #ff0000', name: 'hex with whitespace before' }
        ];
        testCases.forEach(testCase => {
            const model = new TestDocumentModel(testCase.content);
            const colors = computeDefaultDocumentColors(model);
            assert.strictEqual(colors.length, 1, `Should still detect ${testCase.name}`);
        });
    });
    test('8-digit hex colors should also work', () => {
        const model = new TestDocumentModel("const color = '#ff0000ff';");
        const colors = computeDefaultDocumentColors(model);
        assert.strictEqual(colors.length, 1, 'Should detect one 8-digit hex color');
        assert.strictEqual(colors[0].color.red, 1, 'Red component should be 1');
        assert.strictEqual(colors[0].color.green, 0, 'Green component should be 0');
        assert.strictEqual(colors[0].color.blue, 0, 'Blue component should be 0');
        assert.strictEqual(colors[0].color.alpha, 1, 'Alpha should be 1 (ff/255)');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JzQ29tcHV0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL2xhbmd1YWdlcy9kZWZhdWx0RG9jdW1lbnRDb2xvcnNDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7SUFFOUMsTUFBTSxpQkFBaUI7UUFDdEIsWUFBb0IsT0FBZTtZQUFmLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFBSSxDQUFDO1FBRXhDLFFBQVE7WUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDckIsQ0FBQztRQUVELFVBQVUsQ0FBQyxNQUFjO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUQsT0FBTztnQkFDTixVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ3hCLE1BQU0sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQzthQUMxQyxDQUFDO1FBQ0gsQ0FBQztRQUVELFdBQVcsQ0FBQyxLQUFhO1lBQ3hCLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQztLQUNEO0lBRUQsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELGdFQUFnRTtRQUNoRSxNQUFNLEtBQUssR0FBRyxJQUFJLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDaEUsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNoRSxNQUFNLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUM7SUFDM0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzVELE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsbURBQW1ELENBQUMsQ0FBQztRQUN6RixNQUFNLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFFdkUsbUJBQW1CO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLHVDQUF1QyxDQUFDLENBQUM7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztRQUN4RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBRXRGLHNCQUFzQjtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3JGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztRQUV2RixvQkFBb0I7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsdUNBQXVDLENBQUMsQ0FBQztRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7SUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELHVDQUF1QztRQUN2QyxNQUFNLFNBQVMsR0FBRztZQUNqQixFQUFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDdkUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNwRCxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1NBQzVELENBQUM7UUFFRixTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsdUJBQXVCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUNsRSxNQUFNLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=