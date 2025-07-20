/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptMetadataRecord } from './record.js';
import { localize } from '../../../../../../../../../nls.js';
import { PromptMetadataError } from '../../diagnostics.js';
import { FrontMatterSequence } from '../../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterString } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Base class for all metadata records with a `string` value.
 */
export class PromptStringMetadata extends PromptMetadataRecord {
    /**
     * String value of a metadata record.
     */
    get value() {
        return this.valueToken?.cleanText;
    }
    constructor(expectedRecordName, recordToken, languageId) {
        super(expectedRecordName, recordToken, languageId);
    }
    /**
     * Validate the metadata record has a 'string' value.
     */
    validate() {
        const { valueToken } = this.recordToken;
        // validate that the record value is a string or a generic sequence
        // of tokens that can be interpreted as a string without quotes
        const isString = (valueToken instanceof FrontMatterString);
        const isSequence = (valueToken instanceof FrontMatterSequence);
        if (isString || isSequence) {
            this.valueToken = valueToken;
            return this.issues;
        }
        this.issues.push(new PromptMetadataError(valueToken.range, localize('prompt.header.metadata.string.diagnostics.invalid-value-type', "The '{0}' metadata must be a '{1}', got '{2}'.", this.recordName, 'string', valueToken.valueTypeName.toString())));
        delete this.valueToken;
        return this.issues;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvbWV0YWRhdGEvYmFzZS9zdHJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQTRCLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDN0csT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRWhIOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixvQkFBcUIsU0FBUSxvQkFBNEI7SUFNOUU7O09BRUc7SUFDSCxJQUFvQixLQUFLO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUM7SUFDbkMsQ0FBQztJQUVELFlBQ0Msa0JBQTBCLEVBQzFCLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUV4QyxtRUFBbUU7UUFDbkUsK0RBQStEO1FBQy9ELE1BQU0sUUFBUSxHQUFHLENBQUMsVUFBVSxZQUFZLGlCQUFpQixDQUFDLENBQUM7UUFDM0QsTUFBTSxVQUFVLEdBQUcsQ0FBQyxVQUFVLFlBQVksbUJBQW1CLENBQUMsQ0FBQztRQUMvRCxJQUFJLFFBQVEsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLElBQUksbUJBQW1CLENBQ3RCLFVBQVUsQ0FBQyxLQUFLLEVBQ2hCLFFBQVEsQ0FDUCw4REFBOEQsRUFDOUQsZ0RBQWdELEVBQ2hELElBQUksQ0FBQyxVQUFVLEVBQ2YsUUFBUSxFQUNSLFVBQVUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQ25DLENBQ0QsQ0FDRCxDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0QifQ==