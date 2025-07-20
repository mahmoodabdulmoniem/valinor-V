/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
/**
 * Token that represents an `array` value in a Front Matter header.
 */
export class FrontMatterArray extends FrontMatterValueToken {
    constructor() {
        super(...arguments);
        /**
         * Name of the `array` value type.
         */
        this.valueTypeName = 'array';
    }
    /**
     * List of the array items.
     */
    get items() {
        const result = [];
        for (const token of this.children) {
            if (token instanceof FrontMatterValueToken) {
                result.push(token);
            }
        }
        return result;
    }
    toString() {
        const itemsString = BaseToken.render(this.items, ', ');
        return `front-matter-array(${itemsString})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJBcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvdG9rZW5zL2Zyb250TWF0dGVyQXJyYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxxQkFBcUIsRUFBdUIsTUFBTSx1QkFBdUIsQ0FBQztBQUVuRjs7R0FFRztBQUNILE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxxQkFJcEM7SUFKRjs7UUFLQzs7V0FFRztRQUNzQixrQkFBYSxHQUFHLE9BQU8sQ0FBQztJQXNCbEQsQ0FBQztJQXBCQTs7T0FFRztJQUNILElBQVcsS0FBSztRQUNmLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQztRQUVsQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxJQUFJLEtBQUssWUFBWSxxQkFBcUIsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRWUsUUFBUTtRQUN2QixNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdkQsT0FBTyxzQkFBc0IsV0FBVyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxRCxDQUFDO0NBQ0QifQ==