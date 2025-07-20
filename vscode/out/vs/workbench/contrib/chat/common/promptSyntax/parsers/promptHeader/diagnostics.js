/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Diagnostics object that hold information about some issue
 * related to the prompt header metadata.
 */
export class PromptMetadataDiagnostic {
    constructor(range, message) {
        this.range = range;
        this.message = message;
    }
}
/**
 * Diagnostics object that hold information about some
 * non-fatal issue related to the prompt header metadata.
 */
export class PromptMetadataWarning extends PromptMetadataDiagnostic {
    toString() {
        return `warning(${this.message})${this.range}`;
    }
}
/**
 * Diagnostics object that hold information about some
 * fatal issue related to the prompt header metadata.
 */
export class PromptMetadataError extends PromptMetadataDiagnostic {
    toString() {
        return `error(${this.message})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9kaWFnbm9zdGljcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRzs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLHdCQUF3QjtJQUM3QyxZQUNpQixLQUFZLEVBQ1osT0FBZTtRQURmLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQzVCLENBQUM7Q0FNTDtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxxQkFBc0IsU0FBUSx3QkFBd0I7SUFDbEQsUUFBUTtRQUN2QixPQUFPLFdBQVcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEQsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLHdCQUF3QjtJQUNoRCxRQUFRO1FBQ3ZCLE9BQU8sU0FBUyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0NBQ0QifQ==