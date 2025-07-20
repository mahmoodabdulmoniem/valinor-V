/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomRange } from '../testUtils/randomRange.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { BaseToken } from '../../../../../../common/promptSyntax/codecs/base/baseToken.js';
import { cloneTokens, randomTokens } from '../testUtils/randomTokens.js';
import { CompositeToken } from '../../../../../../common/promptSyntax/codecs/base/compositeToken.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
suite('CompositeToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * A test token that extends the abstract {@link CompositeToken}
     * class which cannot be instantiated directly.
     */
    class TestCompositeToken extends CompositeToken {
        toString() {
            const tokenStrings = this.children.map((token) => {
                return token.toString();
            });
            return `CompositeToken:\n${tokenStrings.join('\n')})`;
        }
    }
    suite('constructor', () => {
        suite('infers range from the list of tokens', () => {
            test('one token', () => {
                const range = randomRange();
                const token = new TestCompositeToken([
                    new Word(range, 'word'),
                ]);
                assert(token.range.equalsRange(range), 'Expected the range to be equal to the token range.');
            });
            test('multiple tokens', () => {
                const tokens = randomTokens();
                const token = new TestCompositeToken(tokens);
                const expectedRange = Range.fromPositions(tokens[0].range.getStartPosition(), tokens[tokens.length - 1].range.getEndPosition());
                assert(token.range.equalsRange(expectedRange), `Composite token range must be '${expectedRange}', got '${token.range}'.`);
            });
            test('throws if no tokens provided', () => {
                assert.throws(() => {
                    new TestCompositeToken([]);
                });
            });
        });
        test('throws if no tokens provided', () => {
            assert.throws(() => {
                new TestCompositeToken([]);
            });
        });
    });
    test('text', () => {
        const tokens = randomTokens();
        const token = new TestCompositeToken(tokens);
        assert.strictEqual(token.text, BaseToken.render(tokens), 'Must have correct text value.');
    });
    test('tokens', () => {
        const tokens = randomTokens();
        const token = new TestCompositeToken(tokens);
        for (let i = 0; i < tokens.length; i++) {
            assert(token.children[i].equals(tokens[i]), `Token #${i} must be '${tokens[i]}', got '${token.children[i]}'.`);
        }
    });
    suite('equals', () => {
        suite('true', () => {
            test('same child tokens', () => {
                const tokens = randomTokens();
                const token1 = new TestCompositeToken(tokens);
                const token2 = new TestCompositeToken(tokens);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('copied child tokens', () => {
                const tokens = randomTokens();
                const token1 = new TestCompositeToken([...tokens]);
                const token2 = new TestCompositeToken([...tokens]);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('cloned child tokens', () => {
                const tokens = randomTokens();
                const tokens1 = cloneTokens(tokens);
                const tokens2 = cloneTokens(tokens);
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('composite tokens', () => {
                const tokens = randomTokens();
                // ensure there is at least one composite token
                const lastToken = tokens[tokens.length - 1];
                const compositeToken = new TestCompositeToken(randomTokens(randomInt(5, 2), lastToken.range.endLineNumber, lastToken.range.endColumn));
                tokens.push(compositeToken);
                const token1 = new TestCompositeToken([...tokens]);
                const token2 = new TestCompositeToken([...tokens]);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
        });
        suite('false', () => {
            test('unknown children number', () => {
                const token1 = new TestCompositeToken(randomTokens());
                const token2 = new TestCompositeToken(randomTokens());
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('different number of children', () => {
                const tokens1 = randomTokens();
                const tokens2 = randomTokens();
                if (tokens1.length === tokens2.length) {
                    (randomBoolean())
                        ? tokens1.pop()
                        : tokens2.pop();
                }
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('same number of children', () => {
                const tokensCount = randomInt(20, 10);
                const tokens1 = randomTokens(tokensCount);
                const tokens2 = randomTokens(tokensCount);
                assert.strictEqual(tokens1.length, tokens2.length, 'Tokens must have the same number of children for this test to be valid.');
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('unequal composite tokens', () => {
                const tokens = randomTokens();
                // ensure there is at least one composite token
                const lastToken = tokens[tokens.length - 1];
                const compositeToken1 = new TestCompositeToken(randomTokens(randomInt(3, 1), lastToken.range.endLineNumber, lastToken.range.endColumn));
                const compositeToken2 = new TestCompositeToken(randomTokens(randomInt(6, 4), lastToken.range.endLineNumber, lastToken.range.endColumn));
                assert(compositeToken1.equals(compositeToken2) === false, 'Composite tokens must not be equal for this test to be valid.');
                const tokens1 = [...tokens, compositeToken1];
                const tokens2 = [...tokens, compositeToken2];
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlVG9rZW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvdG9rZW5zL2NvbXBvc2l0ZVRva2VuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMzRixPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3RHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRS9HLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQzs7O09BR0c7SUFDSCxNQUFNLGtCQUFtQixTQUFRLGNBQTJCO1FBRTNDLFFBQVE7WUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDaEQsT0FBTyxLQUFLLENB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