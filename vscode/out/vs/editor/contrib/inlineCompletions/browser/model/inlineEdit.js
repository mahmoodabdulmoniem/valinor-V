/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class InlineEdit {
    constructor(edit, commands, inlineCompletion) {
        this.edit = edit;
        this.commands = commands;
        this.inlineCompletion = inlineCompletion;
    }
    get range() {
        return this.edit.range;
    }
    get text() {
        return this.edit.text;
    }
    equals(other) {
        return this.edit.equals(other.edit)
            && this.inlineCompletion === other.inlineCompletion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9pbmxpbmVFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxVQUFVO0lBQ3RCLFlBQ2lCLElBQXFCLEVBQ3JCLFFBQTRDLEVBQzVDLGdCQUFzQztRQUZ0QyxTQUFJLEdBQUosSUFBSSxDQUFpQjtRQUNyQixhQUFRLEdBQVIsUUFBUSxDQUFvQztRQUM1QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXNCO0lBQ25ELENBQUM7SUFFTCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBaUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2VBQy9CLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7SUFDdEQsQ0FBQztDQUNEIn0=