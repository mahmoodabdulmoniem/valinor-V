/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './base/string.js';
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'description';
/**
 * Prompt `description` metadata record inside the prompt header.
 */
export class PromptDescriptionMetadata extends PromptStringMetadata {
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
    static isDescriptionRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVzY3JpcHRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9tZXRhZGF0YS9kZXNjcmlwdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sdURBQXVELENBQUM7QUFFNUc7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUM7QUFFbEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsb0JBQW9CO0lBQ2xFLElBQW9CLFVBQVU7UUFDN0IsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVELFlBQ0MsV0FBOEIsRUFDOUIsVUFBa0I7UUFFbEIsS0FBSyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsS0FBdUI7UUFFdkIsSUFBSSxDQUFDLEtBQUssWUFBWSxpQkFBaUIsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3BELE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDMUMsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0NBQ0QifQ==