/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../../../base/common/assert.js';
import { PromptMetadataError, PromptMetadataWarning } from '../../diagnostics.js';
/**
 * Abstract class for all metadata records in the prompt header.
 */
export class PromptMetadataRecord {
    /**
     * Full range of the metadata's record text in the prompt header.
     */
    get range() {
        return this.recordToken.range;
    }
    constructor(expectedRecordName, recordToken, languageId) {
        this.expectedRecordName = expectedRecordName;
        this.recordToken = recordToken;
        this.languageId = languageId;
        // validate that the record name has the expected name
        const recordName = recordToken.nameToken.text;
        assert(recordName === expectedRecordName, `Record name must be '${expectedRecordName}', got '${recordName}'.`);
        this.issues = [];
    }
    /**
     * Name of the metadata record.
     */
    get recordName() {
        return this.recordToken.nameToken.text;
    }
    /**
     * List of all diagnostic issues related to this metadata record.
     */
    get diagnostics() {
        return this.issues;
    }
    /**
     * List of all `error` issue diagnostics.
     */
    get errorDiagnostics() {
        return this.diagnostics
            .filter((diagnostic) => {
            return (diagnostic instanceof PromptMetadataError);
        });
    }
    /**
     * List of all `warning` issue diagnostics.
     */
    get warningDiagnostics() {
        return this.diagnostics
            .filter((diagnostic) => {
            return (diagnostic instanceof PromptMetadataWarning);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3JkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvbWV0YWRhdGEvYmFzZS9yZWNvcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTFFLE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQXdCNUc7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLG9CQUFvQjtJQU96Qzs7T0FFRztJQUNILElBQVcsS0FBSztRQUNmLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7SUFDL0IsQ0FBQztJQUVELFlBQ29CLGtCQUEwQixFQUMxQixXQUE4QixFQUM5QixVQUFrQjtRQUZsQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFDMUIsZ0JBQVcsR0FBWCxXQUFXLENBQW1CO1FBQzlCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFFckMsc0RBQXNEO1FBQ3RELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQzlDLE1BQU0sQ0FDTCxVQUFVLEtBQUssa0JBQWtCLEVBQ2pDLHdCQUF3QixrQkFBa0IsV0FBVyxVQUFVLElBQUksQ0FDbkUsQ0FBQztRQUVGLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztJQUN4QyxDQUFDO0lBUUQ7O09BRUc7SUFDSCxJQUFXLFdBQVc7UUFDckIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFPRDs7T0FFRztJQUNILElBQVcsZ0JBQWdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFdBQVc7YUFDckIsTUFBTSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDdEIsT0FBTyxDQUFDLFVBQVUsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxrQkFBa0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsV0FBVzthQUNyQixNQUFNLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUN0QixPQUFPLENBQUMsVUFBVSxZQUFZLHFCQUFxQixDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0QifQ==