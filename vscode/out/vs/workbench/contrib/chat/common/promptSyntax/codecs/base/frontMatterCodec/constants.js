/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NewLine } from '../linesCodec/tokens/newLine.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { FormFeed, SpacingToken } from '../simpleCodec/tokens/tokens.js';
/**
 * List of valid "space" tokens that are valid between different
 * records of a Front Matter header.
 */
export const VALID_INTER_RECORD_SPACING_TOKENS = Object.freeze([
    SpacingToken, CarriageReturn, NewLine, FormFeed,
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXpFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDOUQsWUFBWSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsUUFBUTtDQUMvQyxDQUFDLENBQUMifQ==