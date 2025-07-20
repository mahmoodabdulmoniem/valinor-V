/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PartialFrontMatterArray } from './frontMatterArray.js';
import { PartialFrontMatterRecord } from './frontMatterRecord/frontMatterRecord.js';
import { PartialFrontMatterRecordName } from './frontMatterRecord/frontMatterRecordName.js';
import { PartialFrontMatterRecordNameWithDelimiter } from './frontMatterRecord/frontMatterRecordNameWithDelimiter.js';
import { PartialFrontMatterSequence } from './frontMatterSequence.js';
import { PartialFrontMatterString } from './frontMatterString.js';
import { PartialFrontMatterValue } from './frontMatterValue.js';
export class FrontMatterParserFactory {
    createRecord(tokens) {
        return new PartialFrontMatterRecord(this, tokens);
    }
    createRecordName(startToken) {
        return new PartialFrontMatterRecordName(this, startToken);
    }
    createRecordNameWithDelimiter(tokens) {
        return new PartialFrontMatterRecordNameWithDelimiter(this, tokens);
    }
    createArray(startToken) {
        return new PartialFrontMatterArray(this, startToken);
    }
    createValue(shouldStop) {
        return new PartialFrontMatterValue(this, shouldStop);
    }
    createString(startToken) {
        return new PartialFrontMatterString(startToken);
    }
    createSequence(shouldStop) {
        return new PartialFrontMatterSequence(shouldStop);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJQYXJzZXJGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9wYXJzZXJzL2Zyb250TWF0dGVyUGFyc2VyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM1RixPQUFPLEVBQUUseUNBQXlDLEVBQWtCLE1BQU0sMkRBQTJELENBQUM7QUFDdEksT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFaEUsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxZQUFZLENBQUMsTUFBMkQ7UUFDdkUsT0FBTyxJQUFJLHdCQUF3QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsVUFBZ0I7UUFDaEMsT0FBTyxJQUFJLDRCQUE0QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBQ0QsNkJBQTZCLENBQUMsTUFBd0Q7UUFDckYsT0FBTyxJQUFJLHlDQUF5QyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBQ0QsV0FBVyxDQUFDLFVBQXVCO1FBQ2xDLE9BQU8sSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNELFdBQVcsQ0FBQyxVQUF5QztRQUNwRCxPQUFPLElBQUksdUJBQXVCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFDRCxZQUFZLENBQUMsVUFBdUI7UUFDbkMsT0FBTyxJQUFJLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFDRCxjQUFjLENBQUMsVUFBeUM7UUFDdkQsT0FBTyxJQUFJLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRCJ9