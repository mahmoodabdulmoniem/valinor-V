/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DecorationBase } from './decorationBase.js';
/**
 * Base class for all reactive editor decorations. A reactive decoration
 * is a decoration that can change its appearance based on current cursor
 * position in the editor, hence can "react" to the user's actions.
 */
export class ReactiveDecorationBase extends DecorationBase {
    /**
     * Whether the decoration has changed since the last {@link change}.
     */
    get changed() {
        // if any of the child decorators changed, this object is also
        // considered to be changed
        for (const marker of this.childDecorators) {
            if ((marker instanceof ReactiveDecorationBase) === false) {
                continue;
            }
            if (marker.changed === true) {
                return true;
            }
        }
        return this.didChange;
    }
    constructor(accessor, token) {
        super(accessor, token);
        /**
         * Private field for the {@link changed} property.
         */
        this.didChange = true;
        this.childDecorators = [];
    }
    /**
     * Whether cursor is currently inside the decoration range.
     */
    get active() {
        return true;
        /**
         * Temporarily disable until we have a proper way to get
         * the cursor position inside active editor.
         */
        /**
         * if (!this.cursorPosition) {
         * 	return false;
         * }
         *
         * // when cursor is at the end of a range, the range considered to
         * // not contain the position, but we want to include it
         * const atEnd = (this.range.endLineNumber === this.cursorPosition.lineNumber)
         * 	&& (this.range.endColumn === this.cursorPosition.column);
         *
         * return atEnd || this.range.containsPosition(this.cursorPosition);
         */
    }
    /**
     * Set cursor position and update {@link changed} property if needed.
     */
    setCursorPosition(position) {
        if (this.cursorPosition === position) {
            return false;
        }
        if (this.cursorPosition && position) {
            if (this.cursorPosition.equals(position)) {
                return false;
            }
        }
        const wasActive = this.active;
        this.cursorPosition = position;
        this.didChange = (wasActive !== this.active);
        return this.changed;
    }
    change(accessor) {
        if (this.didChange === false) {
            return this;
        }
        super.change(accessor);
        this.didChange = false;
        for (const marker of this.childDecorators) {
            marker.change(accessor);
        }
        return this;
    }
    remove(accessor) {
        super.remove(accessor);
        for (const marker of this.childDecorators) {
            marker.remove(accessor);
        }
        return this;
    }
    get className() {
        return (this.active)
            ? this.classNames.Main
            : this.classNames.MainInactive;
    }
    get inlineClassName() {
        return (this.active)
            ? this.classNames.Inline
            : this.classNames.InlineInactive;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3RpdmVEZWNvcmF0aW9uQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL2RlY29yYXRpb25zUHJvdmlkZXIvZGVjb3JhdGlvbnMvdXRpbHMvcmVhY3RpdmVEZWNvcmF0aW9uQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFLckQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBZ0Isc0JBR3BCLFNBQVEsY0FBMkM7SUFhcEQ7O09BRUc7SUFDSCxJQUFXLE9BQU87UUFDakIsOERBQThEO1FBQzlELDJCQUEyQjtRQUMzQixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsTUFBTSxZQUFZLHNCQUFzQixDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQzFELFNBQVM7WUFDVixDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM3QixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxZQUNDLFFBQXNCLEVBQ3RCLEtBQW1CO1FBRW5CLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFVeEI7O1dBRUc7UUFDSyxjQUFTLEdBQUcsSUFBSSxDQUFDO1FBWHhCLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFZRDs7T0FFRztJQUNILElBQWMsTUFBTTtRQUNuQixPQUFPLElBQUksQ0FBQztRQUVaOzs7V0FHRztRQUNIOzs7Ozs7Ozs7OztXQVdHO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ksaUJBQWlCLENBQ3ZCLFFBQXFDO1FBRXJDLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLElBQUksUUFBUSxFQUFFLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUM5QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztRQUMvQixJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVlLE1BQU0sQ0FDckIsUUFBeUI7UUFFekIsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdkIsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRWUsTUFBTSxDQUNyQixRQUF5QjtRQUV6QixLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXZCLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQXVCLFNBQVM7UUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSTtZQUN0QixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7SUFDakMsQ0FBQztJQUVELElBQXVCLGVBQWU7UUFDckMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDbkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTTtZQUN4QixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUM7SUFDbkMsQ0FBQztDQUNEIn0=