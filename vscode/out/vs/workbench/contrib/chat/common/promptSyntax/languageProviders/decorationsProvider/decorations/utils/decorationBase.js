/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ModelDecorationOptions } from '../../../../../../../../../editor/common/model/textModel.js';
/**
 * Base class for all editor decorations.
 */
export class DecorationBase {
    /**
     * Indicates whether the decoration spans the whole line(s).
     */
    get isWholeLine() {
        return false;
    }
    /**
     * Hover message of the decoration.
     */
    get hoverMessage() {
        return null;
    }
    constructor(accessor, token) {
        this.token = token;
        this.id = accessor.addDecoration(this.range, this.decorationOptions);
    }
    /**
     * Range of the decoration.
     */
    get range() {
        return this.token.range;
    }
    /**
     * Changes the decoration in the editor.
     */
    change(accessor) {
        accessor.changeDecorationOptions(this.id, this.decorationOptions);
        return this;
    }
    /**
     * Removes associated editor decoration(s).
     */
    remove(accessor) {
        accessor.removeDecoration(this.id);
        return this;
    }
    /**
     * Get editor decoration options for this decorator.
     */
    get decorationOptions() {
        return ModelDecorationOptions.createDynamic({
            description: this.description,
            hoverMessage: this.hoverMessage,
            className: this.className,
            inlineClassName: this.inlineClassName,
            isWholeLine: this.isWholeLine,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            shouldFillLineOnLineBreak: true,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9kZWNvcmF0aW9uc1Byb3ZpZGVyL2RlY29yYXRpb25zL3V0aWxzL2RlY29yYXRpb25CYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRXJHOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixjQUFjO0lBbUJuQzs7T0FFRztJQUNILElBQWMsV0FBVztRQUN4QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNILElBQWMsWUFBWTtRQUN6QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFPRCxZQUNDLFFBQXNCLEVBQ0gsS0FBbUI7UUFBbkIsVUFBSyxHQUFMLEtBQUssQ0FBYztRQUV0QyxJQUFJLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FDWixRQUF5QjtRQUV6QixRQUFRLENBQUMsdUJBQXVCLENBQy9CLElBQUksQ0FBQyxFQUFFLEVBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQ1osUUFBeUI7UUFFekIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVuQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVksaUJBQWlCO1FBQzVCLE9BQU8sc0JBQXNCLENBQUMsYUFBYSxDQUFDO1lBQzNDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUNyQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsVUFBVSw0REFBb0Q7WUFDOUQseUJBQXlCLEVBQUUsSUFBSTtTQUMvQixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==