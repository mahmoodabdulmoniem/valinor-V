/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { FrontMatterBoolean } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
suite('FrontMatterBoolean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('equals()', () => {
        suite('base case', () => {
            test('true', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'true'
                    : 'TRUE';
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                assert.strictEqual(boolean.value, true, 'Must have correct boolean value.');
                assert(boolean.equals(other), 'Booleans must be equal.');
            });
            test('false', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'false'
                    : 'FALSE';
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), booleanText));
                assert.strictEqual(boolean.value, false, 'Must have correct boolean value.');
                assert(boolean.equals(other), 'Booleans must be equal.');
            });
        });
        suite('non-boolean token', () => {
            suite('word token', () => {
                test('true', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'true'
                        : 'TRUE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                    const other = new Word(new Range(1, 1, 1, 5), booleanText);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
                test('false', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'false'
                        : 'FALSE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 6), booleanText));
                    const other = new Word(new Range(1, 2, 1, 2 + 6), booleanText);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
            });
            suite('sequence token', () => {
                test('true', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'true'
                        : 'TRUE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                    const other = new FrontMatterSequence([
                        new Word(new Range(1, 1, 1, 5), booleanText),
                    ]);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
                test('false', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'false'
                        : 'FALSE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 6), booleanText));
                    const other = new FrontMatterSequence([
                        new Word(new Range(1, 2, 1, 2 + 6), booleanText),
                    ]);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
            });
        });
        suite('different range', () => {
            test('true', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'true'
                    : 'TRUE';
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 4), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(3, 2, 3, 2 + 4), booleanText));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
            test('false', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'false'
                    : 'FALSE';
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 5), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(4, 15, 4, 15 + 5), booleanText));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
        });
        suite('different text', () => {
            test('true', () => {
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'true'));
                const other = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'True'));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
            test('false', () => {
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), 'FALSE'));
                const other = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), 'false'));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
        });
        test('throws if cannot be converted to a boolean', () => {
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'true1'));
            });
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(2, 5, 2, 5 + 6), 'fal se'));
            });
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(20, 4, 20, 4 + 1), '1'));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJCb29sZWFuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyRGVjb2Rlci9mcm9udE1hdHRlckJvb2xlYW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDeEgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0dBQWtHLENBQUM7QUFFdkksS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUNqQiwyQ0FBMkM7Z0JBQzNDLE1BQU0sV0FBVyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BDLENBQUMsQ0FBQyxNQUFNO29CQUNSLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBRVYsTUFBTSxPQUFPLEdBQUcsSUFBSSxrQkFBa0IsQ0FDckMsSUFBSSxJ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