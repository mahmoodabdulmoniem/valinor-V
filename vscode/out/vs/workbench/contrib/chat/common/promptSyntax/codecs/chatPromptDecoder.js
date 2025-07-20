/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './tokens/promptToken.js';
import { PartialPromptAtMention } from './parsers/promptAtMentionParser.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { PartialPromptSlashCommand } from './parsers/promptSlashCommandParser.js';
import { BaseDecoder } from './base/baseDecoder.js';
import { At } from './base/simpleCodec/tokens/at.js';
import { Hash } from './base/simpleCodec/tokens/hash.js';
import { Slash } from './base/simpleCodec/tokens/slash.js';
import { DollarSign } from './base/simpleCodec/tokens/dollarSign.js';
import { PartialPromptVariableName, PartialPromptVariableWithData } from './parsers/promptVariableParser.js';
import { MarkdownDecoder } from './base/markdownCodec/markdownDecoder.js';
import { PartialPromptTemplateVariable, PartialPromptTemplateVariableStart } from './parsers/promptTemplateVariableParser.js';
/**
 * Decoder for the common chatbot prompt message syntax.
 * For instance, the file references `#file:./path/file.md` are handled by this decoder.
 */
export class ChatPromptDecoder extends BaseDecoder {
    constructor(stream) {
        super(new MarkdownDecoder(stream));
    }
    onStreamData(token) {
        // prompt `#variables` always start with the `#` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof Hash) && !this.current) {
            this.current = new PartialPromptVariableName(token);
            return;
        }
        // prompt `@mentions` always start with the `@` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof At) && !this.current) {
            this.current = new PartialPromptAtMention(token);
            return;
        }
        // prompt `/commands` always start with the `/` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof Slash) && !this.current) {
            this.current = new PartialPromptSlashCommand(token);
            return;
        }
        // prompt `${template:variables}` always start with the `$` character,
        // hence initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof DollarSign) && !this.current) {
            this.current = new PartialPromptTemplateVariableStart(token);
            return;
        }
        // if current parser was not yet initiated, - we are in the general "text"
        // parsing mode, therefore re-emit the token immediately and continue
        if (!this.current) {
            this._onData.fire(token);
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        // process the parse result next
        switch (parseResult.result) {
            // in the case of success there might be 2 cases:
            //   1) parsing fully completed and an instance of `PromptToken` is returned back,
            //      in this case, emit the parsed token (e.g., a `link`) and reset the current
            //      parser object reference so a new parsing process can be initiated next
            //   2) parsing is still in progress and the next parser object is returned, hence
            //      we need to replace the current parser object with a new one and continue
            case 'success': {
                const { nextParser } = parseResult;
                if (nextParser instanceof PromptToken) {
                    this._onData.fire(nextParser);
                    delete this.current;
                }
                else {
                    this.current = nextParser;
                }
                break;
            }
            // in the case of failure, reset the current parser object
            case 'failure': {
                // if failed to parse a sequence of a tokens, re-emit the tokens accumulated
                // so far then reset the current parser object
                this.reEmitCurrentTokens();
                break;
            }
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        try {
            // if there is no currently active parser object present, nothing to do
            if (this.current === undefined) {
                return;
            }
            // otherwise try to convert unfinished parser object to a token
            if (this.current instanceof PartialPromptVariableName) {
                this._onData.fire(this.current.asPromptVariable());
                return;
            }
            if (this.current instanceof PartialPromptVariableWithData) {
                this._onData.fire(this.current.asPromptVariableWithData());
                return;
            }
            if (this.current instanceof PartialPromptAtMention) {
                this._onData.fire(this.current.asPromptAtMention());
                return;
            }
            if (this.current instanceof PartialPromptSlashCommand) {
                this._onData.fire(this.current.asPromptSlashCommand());
                return;
            }
            assert((this.current instanceof PartialPromptTemplateVariableStart) === false, 'Incomplete template variable token.');
            if (this.current instanceof PartialPromptTemplateVariable) {
                this._onData.fire(this.current.asPromptTemplateVariable());
                return;
            }
            assertNever(this.current, `Unknown parser object '${this.current}'`);
        }
        catch (_error) {
            // if failed to convert current parser object to a token,
            // re-emit the tokens accumulated so far
            this.reEmitCurrentTokens();
        }
        finally {
            delete this.current;
            super.onStreamEnd();
        }
    }
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    reEmitCurrentTokens() {
        if (this.current === undefined) {
            return;
        }
        for (const token of this.current.tokens) {
            this._onData.fire(token);
        }
        delete this.current;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvY2hhdFByb21wdERlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBS3RELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXBELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFrQixNQUFNLHlDQUF5QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxrQ0FBa0MsRUFBaUMsTUFBTSwyQ0FBMkMsQ0FBQztBQVE3Sjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsV0FBNkM7SUFVbkYsWUFDQyxNQUFnQztRQUVoQyxLQUFLLENBQUMsSUFBSSxlQUFlLENBQUMs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