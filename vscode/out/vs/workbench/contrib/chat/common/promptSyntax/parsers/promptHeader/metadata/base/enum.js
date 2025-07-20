/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './string.js';
import { localize } from '../../../../../../../../../nls.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { isOneOf } from '../../../../../../../../../base/common/types.js';
import { PromptMetadataError } from '../../diagnostics.js';
import { FrontMatterSequence } from '../../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterString } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Enum type is the special case of the {@link PromptStringMetadata string}
 * type that can take only a well-defined set of {@link validValues}.
 */
export class PromptEnumMetadata extends PromptStringMetadata {
    constructor(validValues, expectedRecordName, recordToken, languageId) {
        super(expectedRecordName, recordToken, languageId);
        this.validValues = validValues;
    }
    /**
     * Valid enum value or 'undefined'.
     */
    get value() {
        return this.enumValue;
    }
    /**
     * Validate the metadata record has an allowed value.
     */
    validate() {
        super.validate();
        if (this.valueToken === undefined) {
            return this.issues;
        }
        // sanity check for our expectations about the validate call
        assert(this.valueToken instanceof FrontMatterString
            || this.valueToken instanceof FrontMatterSequence, `Record token must be 'string', got '${this.valueToken}'.`);
        const { cleanText } = this.valueToken;
        if (isOneOf(cleanText, this.validValues)) {
            this.enumValue = cleanText;
            return this.issues;
        }
        this.issues.push(new PromptMetadataError(this.valueToken.range, localize('prompt.header.metadata.enum.diagnostics.invalid-value', "The '{0}' metadata must be one of {1}, got '{2}'.", this.recordName, this.validValues
            .map((value) => {
            return `'${value}'`;
        }).join(' | '), cleanText)));
        delete this.valueToken;
        return this.issues;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21ldGFkYXRhL2Jhc2UvZW51bS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUUsT0FBTyxFQUE0QixtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzdHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVoSDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLGtCQUVwQixTQUFRLG9CQUFvQjtJQUM3QixZQUNrQixXQUFvQyxFQUNyRCxrQkFBMEIsRUFDMUIsV0FBOEIsRUFDOUIsVUFBa0I7UUFFbEIsS0FBSyxDQUFDLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUxsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBeUI7SUFNdEQsQ0FBQztJQU1EOztPQUVHO0lBQ0gsSUFBb0IsS0FBSztRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFakIsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNwQixDQUFDO1FBRUQsNERBQTREO1FBQzVELE1BQU0sQ0FDTCxJQUFJLENBQUMsVUFBVSxZQUFZLGlCQUFpQjtlQUN6QyxJQUFJLENBQUMsVUFBVSxZQUFZLG1CQUFtQixFQUNqRCx1Q0FBdUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUMxRCxDQUFDO1FBRUYsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDdEMsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBRTNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNwQixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2YsSUFBSSxtQkFBbUIsQ0FDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQ3JCLFFBQVEsQ0FDUCx1REFBdUQsRUFDdkQsbURBQW1ELEVBQ25ELElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFdBQVc7YUFDZCxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNkLE9BQU8sSUFBSSxLQUFLLEdBQUcsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQ2YsU0FBUyxDQUNULENBQ0QsQ0FDRCxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0QifQ==