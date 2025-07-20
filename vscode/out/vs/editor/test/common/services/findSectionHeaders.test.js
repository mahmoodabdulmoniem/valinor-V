/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { findSectionHeaders } from '../../../common/services/findSectionHeaders.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
class TestSectionHeaderFinderTarget {
    constructor(lines) {
        this.lines = lines;
    }
    getLineCount() {
        return this.lines.length;
    }
    getLineContent(lineNumber) {
        return this.lines[lineNumber - 1];
    }
}
suite('FindSectionHeaders', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('finds simple section headers', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: My Section',
            'another line',
            'MARK: Another Section',
            'last line'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<label>.*)$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 2);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 4);
    });
    test('finds section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            'MARK: -My Section',
            'another line',
            'MARK: - Another Section',
            'last line'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: 'MARK:\\s*(?<separator>-?)\\s*(?<label>.*)$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].hasSeparatorLine, true);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].hasSeparatorLine, true);
    });
    test('finds multi-line section headers with separators', () => {
        const model = new TestSectionHeaderFinderTarget([
            'regular line',
            '// ==========',
            '// My Section',
            '// ==========',
            'code...',
            '// ==========',
            '// Another Section',
            '// ==========',
            'more code...'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'My Section');
        assert.strictEqual(headers[0].range.startLineNumber, 2);
        assert.strictEqual(headers[0].range.endLineNumber, 4);
        assert.strictEqual(headers[1].text, 'Another Section');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles overlapping multi-line section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line starts another header
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
    });
    test('section headers must be in comments when specified', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1', // This one is in a comment
            '// ==========',
            '==========', // This one isn't
            'Section 2',
            '=========='
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^(?:\/\/ )?=+\\n^(?:\/\/ )?(?<label>[^\\n]+?)\\n^(?:\/\/ )?=+$'
        };
        // Both patterns match, but the second one should be filtered out by the token check
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers[0].shouldBeInComments, true);
    });
    test('handles section headers at chunk boundaries', () => {
        // Create enough lines to ensure we cross chunk boundaries
        const lines = [];
        for (let i = 0; i < 150; i++) {
            lines.push('line ' + i);
        }
        // Add headers near the chunk boundary (chunk size is 100)
        lines[97] = '// ==========';
        lines[98] = '// Section 1';
        lines[99] = '// ==========';
        lines[100] = '// ==========';
        lines[101] = '// Section 2';
        lines[102] = '// ==========';
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('handles empty regex gracefully without infinite loop', () => {
        const model = new TestSectionHeaderFinderTarget([
            'line 1',
            'line 2',
            'line 3'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '' // Empty string that would cause infinite loop
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 0, 'Should return no headers for empty regex');
    });
    test('handles whitespace-only regex gracefully without infinite loop', () => {
        const model = new TestSectionHeaderFinderTarget([
            'line 1',
            'line 2',
            'line 3'
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '   ' // Whitespace that would cause infinite loop
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 0, 'Should return no headers for whitespace-only regex');
    });
    test('correctly advances past matches without infinite loop', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            'some code',
            '// ==========',
            '// Section 2',
            '// ==========',
            'more code',
            '// ==========',
            '// Section 3',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3, 'Should find all three section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[2].text, 'Section 3');
    });
    test('handles consecutive section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========',
            '// Section 1',
            '// ==========',
            '// ==========', // This line is both the end of Section 1 and start of Section 2
            '// Section 2',
            '// ==========',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[1].text, 'Section 2');
    });
    test('handles nested separators correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==============',
            '// Major Section',
            '// ==============',
            '',
            '// ----------',
            '// Subsection',
            '// ----------',
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers');
        assert.strictEqual(headers[0].text, 'Major Section');
        assert.strictEqual(headers[1].text, 'Subsection');
    });
    test('handles section headers at chunk boundaries correctly', () => {
        const lines = [];
        // Fill up to near the chunk boundary (chunk size is 100)
        for (let i = 0; i < 97; i++) {
            lines.push(`line ${i}`);
        }
        // Add a section header that would cross the chunk boundary
        lines.push('// =========='); // line 97
        lines.push('// Section 1'); // line 98
        lines.push('// =========='); // line 99
        lines.push('// =========='); // line 100 (chunk boundary)
        lines.push('// Section 2'); // line 101
        lines.push('// =========='); // line 102
        // Add more content after
        for (let i = 103; i < 150; i++) {
            lines.push(`line ${i}`);
        }
        const model = new TestSectionHeaderFinderTarget(lines);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2, 'Should find both section headers across chunk boundary');
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 98);
        assert.strictEqual(headers[0].range.endLineNumber, 100);
        assert.strictEqual(headers[1].text, 'Section 2');
        assert.strictEqual(headers[1].range.startLineNumber, 101);
        assert.strictEqual(headers[1].range.endLineNumber, 103);
    });
    test('handles overlapping section headers without duplicates', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ==========', // Line 1
            '// Section 1', // Line 2 - This is part of first header
            '// ==========', // Line 3 - This is the end of first
            '// Section 2', // Line 4 - This is not a header
            '// ==========', // Line 5
            '// ==========', // Line 6 - Start of second header
            '// Section 3', // Line 7
            '// ===========' // Line 8
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ =+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ =+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 2);
        assert.strictEqual(headers[0].text, 'Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        // assert.strictEqual(headers[1].text, 'Section 2');
        // assert.strictEqual(headers[1].range.startLineNumber, 3);
        // assert.strictEqual(headers[1].range.endLineNumber, 5);
        assert.strictEqual(headers[1].text, 'Section 3');
        assert.strictEqual(headers[1].range.startLineNumber, 6);
        assert.strictEqual(headers[1].range.endLineNumber, 8);
    });
    test('handles partially overlapping multiline section headers correctly', () => {
        const model = new TestSectionHeaderFinderTarget([
            '// ================', // Line 1
            '// Major Section 1', // Line 2
            '// ================', // Line 3
            '// --------', // Line 4 - Start of subsection that overlaps with end of major section
            '// Subsection 1.1', // Line 5
            '// --------', // Line 6
            '// ================', // Line 7
            '// Major Section 2', // Line 8
            '// ================', // Line 9
        ]);
        const options = {
            findRegionSectionHeaders: false,
            findMarkSectionHeaders: true,
            markSectionHeaderRegex: '^\/\/ [-=]+\\n^\/\/ (?<label>[^\\n]+?)\\n^\/\/ [-=]+$'
        };
        const headers = findSectionHeaders(model, options);
        assert.strictEqual(headers.length, 3);
        assert.strictEqual(headers[0].text, 'Major Section 1');
        assert.strictEqual(headers[0].range.startLineNumber, 1);
        assert.strictEqual(headers[0].range.endLineNumber, 3);
        assert.strictEqual(headers[1].text, 'Subsection 1.1');
        assert.strictEqual(headers[1].range.startLineNumber, 4);
        assert.strictEqual(headers[1].range.endLineNumber, 6);
        assert.strictEqual(headers[2].text, 'Major Section 2');
        assert.strictEqual(headers[2].range.startLineNumber, 7);
        assert.strictEqual(headers[2].range.endLineNumber, 9);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9maW5kU2VjdGlvbkhlYWRlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQXdELGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUksT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsTUFBTSw2QkFBNkI7SUFDbEMsWUFBNkIsS0FBZTtRQUFmLFVBQUssR0FBTCxLQUFLLENBQVU7SUFBSSxDQUFDO0lBRWpELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQzFCLENBQUM7SUFFRCxjQUFjLENBQUMsVUFBa0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBRWhDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLDZCQUE2QixDQUFDO1lBQy9DLGNBQWM7WUFDZCxrQkFBa0I7WUFDbEIsY0FBYztZQUNkLHVCQUF1QjtZQUN2QixXQUFXO1NBQ1gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQTZCO1lBQ3pDLHdCQUF3QixFQUFFLEtBQUs7WUFDL0Isc0JBQXNCLEVBQUUsSUFBSTtZQUM1QixzQkFBc0IsRUFBRSx3QkFBd0I7U0FDaEQsQ0FBQztR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