/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptMetadataRecord } from './base/record.js';
import { localize } from '../../../../../../../../nls.js';
import { PromptMetadataError, PromptMetadataWarning } from '../diagnostics.js';
import { FrontMatterSequence } from '../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterArray, FrontMatterRecord, FrontMatterString } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'tools';
/**
 * Prompt `tools` metadata record inside the prompt header.
 */
export class PromptToolsMetadata extends PromptMetadataRecord {
    /**
     * List of all valid tool names that were found in
     * this metadata record.
     */
    get value() {
        if (this.validToolNames === undefined) {
            return [];
        }
        return [...this.validToolNames.keys()];
    }
    get recordName() {
        return RECORD_NAME;
    }
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    /**
     * Validate the metadata record and collect all issues
     * related to its content.
     */
    validate() {
        const { valueToken } = this.recordToken;
        // validate that the record value is an array
        if ((valueToken instanceof FrontMatterArray) === false) {
            this.issues.push(new PromptMetadataError(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.invalid-value-type', "Must be an array of tool names, got '{0}'.", valueToken.valueTypeName.toString())));
            delete this.valueToken;
            return this.issues;
        }
        this.valueToken = valueToken;
        // validate that all array items
        this.validToolNames = new Map();
        for (const item of this.valueToken.items) {
            this.issues.push(...this.validateToolName(item, this.validToolNames));
        }
        return this.issues;
    }
    getToolRange(toolName) {
        return this.validToolNames?.get(toolName);
    }
    /**
     * Validate an individual provided value token that is used
     * for a tool name.
     */
    validateToolName(valueToken, validToolNames) {
        const issues = [];
        // tool name must be a quoted or an unquoted 'string'
        if ((valueToken instanceof FrontMatterString) === false &&
            (valueToken instanceof FrontMatterSequence) === false) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.invalid-tool-name-type', "Unexpected tool name '{0}', expected a string literal.", valueToken.text)));
            return issues;
        }
        const cleanToolName = valueToken.cleanText.trim();
        // the tool name should not be empty
        if (cleanToolName.length === 0) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.empty-tool-name', "Tool name cannot be empty.")));
            return issues;
        }
        // the tool name should not be duplicated
        if (validToolNames.has(cleanToolName)) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.duplicate-tool-name', "Duplicate tool name '{0}'.", cleanToolName)));
            return issues;
        }
        validToolNames.set(cleanToolName, valueToken.range);
        return issues;
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `tools`.
     */
    static isToolsRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9tZXRhZGF0YS90b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUE0QixtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBMkMsTUFBTSx1REFBdUQsQ0FBQztBQUd4Szs7R0FFRztBQUNILE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQztBQUU1Qjs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxvQkFBOEI7SUFFdEU7OztPQUdHO0lBQ0gsSUFBb0IsS0FBSztRQUN4QixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkMsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxJQUFvQixVQUFVO1FBQzdCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFlRCxZQUNDLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lB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