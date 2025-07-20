/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
import { PromptStringMetadata } from './base/string.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'model';
export class PromptModelMetadata extends PromptStringMetadata {
    get recordName() {
        return RECORD_NAME;
    }
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `description`.
     */
    static isModelRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9tZXRhZGF0YS9tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sdURBQXVELENBQUM7QUFDNUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFeEQ7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUM7QUFFNUIsTUFBTSxPQUFPLG1CQUFvQixTQUFRLG9CQUFvQjtJQUM1RCxJQUFvQixVQUFVO1FBQzdCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxZQUNDLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQXVCO1FBQ2xELElBQUksQ0FBQyxLQUFLLFlBQVksaUJBQWlCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=