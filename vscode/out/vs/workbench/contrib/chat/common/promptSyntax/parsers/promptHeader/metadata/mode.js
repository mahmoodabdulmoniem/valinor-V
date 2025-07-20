/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatModeKind } from '../../../../constants.js';
import { PromptEnumMetadata } from './base/enum.js';
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'mode';
/**
 * Prompt `mode` metadata record inside the prompt header.
 */
export class PromptModeMetadata extends PromptEnumMetadata {
    constructor(recordToken, languageId) {
        super([ChatModeKind.Ask, ChatModeKind.Edit, ChatModeKind.Agent], RECORD_NAME, recordToken, languageId);
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `mode`.
     */
    static isModeRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21ldGFkYXRhL21vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSx1REFBdUQsQ0FBQztBQUU1Rzs7R0FFRztBQUNILE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQztBQUUzQjs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxrQkFBZ0M7SUFDdkUsWUFDQyxXQUE4QixFQUM5QixVQUFrQjtRQUVsQixLQUFLLENBQ0osQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUN6RCxXQUFXLEVBQ1gsV0FBVyxFQUNYLFVBQVUsQ0FDVixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLEtBQXVCO1FBRXZCLElBQUksQ0FBQyxLQUFLLFlBQVksaUJBQWlCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=