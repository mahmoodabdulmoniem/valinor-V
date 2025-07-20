/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { Text } from '../../../../../../common/promptSyntax/codecs/base/textToken.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertNever } from '../../../../../../../../../base/common/assert.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { Space, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
/**
 * Test utility to clone a list of provided tokens.
 */
export function cloneTokens(tokens) {
    const clonedTokens = [];
    for (const token of tokens) {
        if (token instanceof NewLine) {
            clonedTokens.push(new NewLine(token.range));
            continue;
        }
        if (token instanceof Space) {
            clonedTokens.push(new Space(token.range));
            continue;
        }
        if (token instanceof Word) {
            clonedTokens.push(new Word(token.range, token.text));
            continue;
        }
        if (token instanceof Text) {
            clonedTokens.push(new Text(cloneTokens(token.children)));
            continue;
        }
        assertNever(token, `Unexpected token type '${token}'.`);
    }
    for (let i = 0; i < tokens.length; i++) {
        assert(tokens[i].equals(clonedTokens[i]), `Original and cloned tokens #${i} must be equal.`);
        assert(tokens[i] !== clonedTokens[i], `Original and cloned tokens #${i} must not be strict equal.`);
    }
    return clonedTokens;
}
/**
 * Test utility to generate a number of random tokens.
 */
export function randomTokens(tokenCount = randomInt(20, 10), startLine = randomInt(100, 1), startColumn = randomInt(100, 1)) {
    const tokens = [];
    let tokensLeft = tokenCount;
    while (tokensLeft > 0) {
        const caseNumber = randomInt(7, 1);
        switch (caseNumber) {
            case 1:
            case 2: {
                tokens.push(new NewLine(new Range(startLine, startColumn, startLine, startColumn + 1)));
                startLine++;
                startColumn = 1;
                break;
            }
            case 3:
            case 4: {
                tokens.push(new Space(new Range(startLine, startColumn, startLine, startColumn + 1)));
                startColumn++;
                break;
            }
            case 5:
            case 6: {
                const text = `word${randomInt(Number.MAX_SAFE_INTEGER, 1)}`;
                const endColumn = startColumn + text.length;
                tokens.push(new Word(new Range(startLine, startColumn, startLine, endColumn), text));
                startColumn = endColumn;
                break;
            }
            case 7: {
                const token = new Text(randomTokens(randomInt(3, 1), startLine, startColumn));
                tokens.push(token);
                startLine = token.range.endLineNumber;
                startColumn = token.range.endColumn;
                break;
            }
            default: {
                throw new Error(`Unexpected random token generation case number: '${caseNumber}'`);
            }
        }
        tokensLeft--;
    }
    return tokens;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS90ZXN0VXRpbHMvcmFuZG9tVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFPN0c7O0dBRUc7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLE1BQWdCO0lBQzNDLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQztJQUVsQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzVCLElBQUksS0FBSyxZQUFZLE9BQU8sRUFBRSxDQUFDO1lBQzlCLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDNUMsU0FBUztRQUNWLENBQUM7UUFFRCxJQUFJLEtBQUssWUFBWSxLQUFLLEVBQUUsQ0FBQztZQUM1QixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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