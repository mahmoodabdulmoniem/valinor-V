/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './base/string.js';
import { localize } from '../../../../../../../../nls.js';
import { INSTRUCTIONS_LANGUAGE_ID } from '../../../promptTypes.js';
import { isEmptyPattern, parse, splitGlobAware } from '../../../../../../../../base/common/glob.js';
import { PromptMetadataError, PromptMetadataWarning } from '../diagnostics.js';
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'applyTo';
/**
 * Prompt `applyTo` metadata record inside the prompt header.
 */
export class PromptApplyToMetadata extends PromptStringMetadata {
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    get recordName() {
        return RECORD_NAME;
    }
    validate() {
        super.validate();
        // if we don't have a value token, validation must
        // has failed already so nothing to do more
        if (this.valueToken === undefined) {
            return this.issues;
        }
        // the applyTo metadata makes sense only for 'instruction' prompts
        if (this.languageId !== INSTRUCTIONS_LANGUAGE_ID) {
            this.issues.push(new PromptMetadataError(this.range, localize('prompt.header.metadata.string.diagnostics.invalid-language', "The '{0}' header property is only valid in instruction files.", this.recordName)));
            delete this.valueToken;
            return this.issues;
        }
        const { cleanText } = this.valueToken;
        // warn user if specified glob pattern is not valid
        if (this.isValidGlob(cleanText) === false) {
            this.issues.push(new PromptMetadataWarning(this.valueToken.range, localize('prompt.header.metadata.applyTo.diagnostics.non-valid-glob', "Invalid glob pattern '{0}'.", cleanText)));
            delete this.valueToken;
            return this.issues;
        }
        return this.issues;
    }
    /**
     * Check if a provided string contains a valid glob pattern.
     */
    isValidGlob(pattern) {
        try {
            const patterns = splitGlobAware(pattern, ',');
            if (patterns.length === 0) {
                return false;
            }
            for (const pattern of patterns) {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    return false;
                }
            }
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `applyTo`.
     */
    static isApplyToRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlUby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21ldGFkYXRhL2FwcGx5VG8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BHLE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQW9CLE1BQU0sdURBQXVELENBQUM7QUFFNUc7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUM7QUFFOUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsb0JBQW9CO0lBQzlELFlBQ0MsV0FBOEIsRUFDOUIsVUFBa0I7UUFFbEIsS0FBSyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELElBQW9CLFVBQVU7UUFDN0IsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVlLFFBQVE7UUFDdkIsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWpCLGtEQUFrRDtRQUNsRCwyQ0FBMkM7UUFDM0MsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNwQixDQUFDO1FBRUQsa0VBQWtFO1FBQ2xFLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLElBQUksbUJBQW1CLENBQ3RCLElBQUksQ0FBQyxLQUFLLEVBQ1YsUUFBUSxDQUNQLDREQUE0RCxFQUM1RCwrREFBK0QsRUFDL0QsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUNELENBQ0QsQ0FBQztZQUVGLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBRXRDLG1EQUFtRDtRQUNuRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2YsSUFBSSxxQkFBcUIsQ0FDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQ3JCLFFBQVEsQ0FDUCwyREFBMkQsRUFDM0QsNkJBQTZCLEVBQzdCLFNBQVMsQ0FDVCxDQUNELENBQ0QsQ0FBQztZQUVGLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxXQUFXLENBQ2xCLE9BQWU7UUFFZixJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1lBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFFaEMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNqQyxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUFDLE9BQU8sTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE1BQU0sQ0FBQyxlQUFlLENBQzVCLEtBQXVCO1FBRXZCLElBQUksQ0FBQyxLQUFLLFlBQVksaUJBQWlCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=