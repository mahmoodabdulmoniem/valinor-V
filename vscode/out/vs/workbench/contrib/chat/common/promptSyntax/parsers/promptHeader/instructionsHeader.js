/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptApplyToMetadata } from './metadata/applyTo.js';
import { HeaderBase } from './headerBase.js';
/**
 * Header object for instruction files.
 */
export class InstructionsHeader extends HeaderBase {
    handleToken(token) {
        // if the record might be a "applyTo" metadata
        // add it to the list of parsed metadata records
        if (PromptApplyToMetadata.isApplyToRecord(token)) {
            const metadata = new PromptApplyToMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.applyTo = metadata;
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdHJ1Y3Rpb25zSGVhZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvaW5zdHJ1Y3Rpb25zSGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQXFDLE1BQU0saUJBQWlCLENBQUM7QUFtQmhGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQWlDO0lBQ3JELFdBQVcsQ0FBQyxLQUF3QjtRQUN0RCw4Q0FBOEM7UUFDOUMsZ0RBQWdEO1FBQ2hELElBQUkscUJBQXFCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRW5FLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDO1lBRTdCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=