/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { BaseToken } from '../../../../../../common/promptSyntax/codecs/base/baseToken.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { randomRange, randomRangeNotEqualTo } from '../testUtils/randomRange.js';
import { CarriageReturn } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { WELL_KNOWN_TOKENS } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/simpleDecoder.js';
import { At, Colon, DollarSign, ExclamationMark, Hash, LeftAngleBracket, LeftBracket, LeftCurlyBrace, RightAngleBracket, RightBracket, RightCurlyBrace, Slash, Space, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
/**
 * List of simple tokens to randomly select from
 * in the {@link randomSimpleToken} utility.
 */
const TOKENS = Object.freeze([
    ...WELL_KNOWN_TOKENS,
    CarriageReturn,
    NewLine,
]);
/**
 * Generates a random {@link SimpleToken} instance.
 */
function randomSimpleToken() {
    const index = randomInt(TOKENS.length - 1);
    const Constructor = TOKENS[index];
    assertDefined(Constructor, `Cannot find a constructor object for a well-known token at index '${index}'.`);
    return new Constructor(randomRange());
}
suite('BaseToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('render()', () => {
        /**
         * Note! Range of tokens is ignored by the render method, that's
         *       why we generate random ranges for each token in this test.
         */
        test('a list of tokens', () => {
            const tests = [
                ['/textoftheword$#', [
                        new Slash(randomRange()),
                        new Word(randomRange(), 'textoftheword'),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                    ]],
                ['<:👋helou👋:>', [
                        new LeftAngleBracket(randomRange()),
                        new Colon(randomRange()),
                        new Word(randomRange(), '👋helou👋'),
                        new Colon(randomRange()),
                        new RightAngleBracket(randomRange()),
                    ]],
                [' {$#[ !@! ]#$} ', [
                        new Space(randomRange()),
                        new LeftCurlyBrace(randomRange()),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                        new LeftBracket(randomRange()),
                        new Space(randomRange()),
                        new ExclamationMark(randomRange()),
                        new At(randomRange()),
                        new ExclamationMark(randomRange()),
                        new Space(randomRange()),
                        new RightBracket(randomRange()),
                        new Hash(randomRange()),
                        new DollarSign(randomRange()),
                        new RightCurlyBrace(randomRange()),
                        new Space(randomRange()),
                    ]],
            ];
            for (const test of tests) {
                const [expectedText, tokens] = test;
                assert.strictEqual(expectedText, BaseToken.render(tokens), 'Must correctly render tokens.');
            }
        });
        test('accepts tokens delimiter', () => {
            // couple of different delimiters to try
            const delimiter = (randomBoolean())
                ? ', '
                : ' | ';
            const tests = [
                [`/${delimiter}textoftheword${delimiter}$${delimiter}#`, [
                        new Slash(randomRange()),
                        new Word(randomRange(), 'textoftheword'),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                    ]],
                [`<${delimiter}:${delimiter}👋helou👋${delimiter}:${delimiter}>`, [
                        new LeftAngleBracket(randomRange()),
                        new Colon(randomRange()),
                        new Word(randomRange(), '👋helou👋'),
                        new Colon(randomRange()),
                        new RightAngleBracket(randomRange()),
                    ]],
            ];
            for (const test of tests) {
                const [expectedText, tokens] = test;
                assert.strictEqual(expectedText, BaseToken.render(tokens, delimiter), 'Must correctly render tokens with a custom delimiter.');
            }
        });
        test('an empty list of tokens', () => {
            assert.strictEqual('', BaseToken.render([]), `Must correctly render and empty list of tokens.`);
        });
    });
    suite('fullRange()', () => {
        suite('throws', () => {
            test('if empty list provided', () => {
                assert.throws(() => {
                    BaseToken.fullRange([]);
                });
            });
            test('if start line number of the first token is greater than one of the last token', () => {
                assert.throws(() => {
                    const lastToken = randomSimpleToken();
                    // generate a first token
                    //  starting line number that is
                    // greater than the start line number of the last token
                    const startLineNumber = lastToken.range.startLineNumber + randomInt(10, 1);
                    const firstToken = new Colon(new Range(startLineNumber, lastToken.range.startColumn, startLineNumber, lastToken.range.startColumn + 1));
                    BaseToken.fullRange([
                        firstToken,
                        // tokens in the middle are ignored, so we
                        // generate random ones to fill the gap
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        // -
                        lastToken,
                    ]);
                });
            });
            test('if start line numbers are equal and end of the first token is greater than the start of the last token', () => {
                assert.throws(() => {
                    const firstToken = randomSimpleToken();
                    const lastToken = new Hash(new Range(firstToken.range.startLineNumber, firstToken.range.endColumn - 1, firstToken.range.startLineNumber + randomInt(10), firstToken.range.endColumn));
                    BaseToken.fullRange([
                        firstToken,
                        // tokens in the middle are ignored, so we
                        // generate random ones to fill the gap
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        // -
                        lastToken,
                    ]);
                });
            });
        });
    });
    suite('withRange()', () => {
        test('updates token range', () => {
            class TestToken extends BaseToken {
                get text() {
                    throw new Error('Method not implemented.');
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const rangeBefore = randomRange();
            const token = new TestToken(rangeBefore);
            assert(token.range.equalsRange(rangeBefore), 'Token range must be unchanged before updating.');
            const rangeAfter = randomRangeNotEqualTo(rangeBefore);
            token.withRange(rangeAfter);
            assert(token.range.equalsRange(rangeAfter), `Token range must be to the new '${rangeAfter}' one.`);
        });
    });
    suite('collapseRangeToStart()', () => {
        test('collapses token range to the start position', () => {
            class TestToken extends BaseToken {
                get text() {
                    throw new Error('Method not implemented.');
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const startLineNumber = randomInt(10, 1);
            const startColumnNumber = randomInt(10, 1);
            const range = new Range(startLineNumber, startColumnNumber, startLineNumber + randomInt(10, 1), startColumnNumber + randomInt(10, 1));
            const token = new TestToken(range);
            assert(token.range.isEmpty() === false, 'Token range must not be empty before collapsing.');
            token.collapseRangeToStart();
            assert(token.range.isEmpty(), 'Token range must be empty after collapsing.');
            assert.strictEqual(token.range.startLineNumber, startLineNumber, 'Token range start line number must not change.');
            assert.strictEqual(token.range.startColumn, startColumnNumber, 'Token range start column number must not change.');
            assert.strictEqual(token.range.endLineNumber, startLineNumber, 'Token range end line number must be equal to line start number.');
            assert.strictEqual(token.range.endColumn, startColumnNumber, 'Token range end column number must be equal to column start number.');
        });
    });
    suite('equals()', () => {
        test('true', () => {
            class TestToken extends BaseToken {
                constructor(range, value) {
                    super(range);
                    this.value = value;
                }
                get text() {
                    return this.value;
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const text = 'contents';
            const startLineNumber = randomInt(100, 1);
            const startColumnNumber = randomInt(100, 1);
            const range = new Range(startLineNumber, startColumnNumber, startLineNumber, startColumnNumber + text.length);
            const token1 = new TestToken(range, text);
            const token2 = new TestToken(range, text);
            assert(token1.equals(token2), `Token of type '${token1.constructor.name}' must be equal to token of type '${token2.constructor.name}'.`);
            assert(token2.equals(token1), `Token of type '${token2.constructor.name}' must be equal to token of type '${token1.constructor.name}'.`);
        });
        suite('false', () => {
            suite('different constructor', () => {
                test('same base class', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
                test('child', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends TestToken1 {
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
                test('different direct ancestor', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken3 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends TestToken3 {
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
            });
            test('different text', () => {
                class TestToken extends BaseToken {
                    constructor(value) {
                        super(new Range(1, 1, 1, 1 + value.length));
                        this.value = value;
                    }
                    get text() {
                        return this.value;
                    }
                    toString() {
                        throw new Error('Method not implemented.');
                    }
                }
                const token1 = new TestToken('text1');
                const token2 = new TestToken('text2');
                assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
            });
            test('different range', () => {
                class TestToken extends BaseToken {
                    get text() {
                        return 'some text value';
                    }
                    toString() {
                        throw new Error('Method not implemented.');
                    }
                }
                const range1 = randomRange();
                const token1 = new TestToken(range1);
                const range2 = randomRangeNotEqualTo(range1);
                const token2 = new TestToken(range2);
                assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3Rva2Vucy9iYXNlVG9rZW4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDekcsT0FBTyxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQztBQUN2SCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQWdCLGlCQUFpQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFFakksT0FBTyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0s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