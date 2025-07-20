/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { assertNever } from '../../../../../../../base/common/assert.js';
import { PromptMetadataDiagnostic, PromptMetadataError, PromptMetadataWarning } from '../../../../common/promptSyntax/parsers/promptHeader/diagnostics.js';
/**
 * Base class for all expected diagnostics used in the unit tests.
 */
class ExpectedDiagnostic extends PromptMetadataDiagnostic {
    /**
     * Validate that the provided diagnostic is equal to this object.
     */
    validateEqual(other) {
        this.validateTypesEqual(other);
        assert.strictEqual(this.message, other.message, `Expected message '${this.message}', got '${other.message}'.`);
        assert(this.range
            .equalsRange(other.range), `Expected range '${this.range}', got '${other.range}'.`);
    }
    /**
     * Validate that the provided diagnostic is of the same
     * diagnostic type as this object.
     */
    validateTypesEqual(other) {
        if (other instanceof PromptMetadataWarning) {
            assert(this instanceof ExpectedDiagnosticWarning, `Expected a warning diagnostic object, got '${other}'.`);
            return;
        }
        if (other instanceof PromptMetadataError) {
            assert(this instanceof ExpectedDiagnosticError, `Expected a error diagnostic object, got '${other}'.`);
            return;
        }
        assertNever(other, `Unknown diagnostic type '${other}'.`);
    }
}
/**
 * Expected warning diagnostic object for testing purposes.
 */
export class ExpectedDiagnosticWarning extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `expected-diagnostic/warning(${this.message})${this.range}`;
    }
}
/**
 * Expected error diagnostic object for testing purposes.
 */
export class ExpectedDiagnosticError extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `expected-diagnostic/error(${this.message})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWREaWFnbm9zdGljLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvZXhwZWN0ZWREaWFnbm9zdGljLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFlLE1BQU0scUVBQXFFLENBQUM7QUFFeEs7O0dBRUc7QUFDSCxNQUFlLGtCQUFtQixTQUFRLHdCQUF3QjtJQUNqRTs7T0FFRztJQUNJLGFBQWEsQ0FBQyxLQUFrQjtRQUN0QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxDQUFDLE9BQU8sRUFDWixLQUFLLENBQUMsT0FBTyxFQUNiLHFCQUFxQixJQUFJLENBQUMsT0FBTyxXQUFXLEtBQUssQ0FBQyxPQUFPLElBQUksQ0FDN0QsQ0FBQztRQUVGLE1BQU0sQ0FDTCxJQUFJLENBQUMsS0FBSzthQUNSLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQzFCLG1CQUFtQixJQUFJLENBQUMsS0FBSyxXQUFXLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FDdkQsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSyxrQkFBa0IsQ0FBQyxLQUFrQjtRQUM1QyxJQUFJLEtBQUssWUFBWSxxQkFBcUIsRUFBRSxDQUFDO1lBQzVDLE1BQU0sQ0FDTCxJQUFJLFlBQVkseUJBQXlCLEVBQ3pDLDhDQUE4QyxLQUFLLElBQUksQ0FDdkQsQ0FBQztZQUVGLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxLQUFLLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQ0wsSUFBSSxZQUFZLHVCQUF1QixFQUN2Qyw0Q0FBNEMsS0FBSyxJQUFJLENBQ3JELENBQUM7WUFFRixPQUFPO1FBQ1IsQ0FBQztRQUVELFdBQVcsQ0FDVixLQUFLLEVBQ0wsNEJBQTRCLEtBQUssSUFBSSxDQUNyQyxDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsa0JBQWtCO0lBQ2hFOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLCtCQUErQixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNwRSxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxrQkFBa0I7SUFDOUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sNkJBQTZCLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xFLENBQUM7Q0FDRCJ9