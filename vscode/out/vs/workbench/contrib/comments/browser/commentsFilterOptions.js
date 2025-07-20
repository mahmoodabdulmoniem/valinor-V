/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import * as strings from '../../../../base/common/strings.js';
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    constructor(filter, showResolved, showUnresolved) {
        this.filter = filter;
        this.showResolved = true;
        this.showUnresolved = true;
        filter = filter.trim();
        this.showResolved = showResolved;
        this.showUnresolved = showUnresolved;
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNGaWx0ZXJPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzRmlsdGVyT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVcsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFGLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFFOUQsTUFBTSxPQUFPLGFBQWE7YUFFVCxZQUFPLEdBQVksYUFBYSxBQUF6QixDQUEwQjthQUNqQyxtQkFBYyxHQUFZLFlBQVksQUFBeEIsQ0FBeUI7SUFNdkQsWUFDVSxNQUFjLEVBQ3ZCLFlBQXFCLEVBQ3JCLGNBQXVCO1FBRmQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUxmLGlCQUFZLEdBQVksSUFBSSxDQUFDO1FBQzdCLG1CQUFjLEdBQVksSUFBSSxDQUFDO1FBUXZDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFFckMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDM0YsQ0FBQyJ9