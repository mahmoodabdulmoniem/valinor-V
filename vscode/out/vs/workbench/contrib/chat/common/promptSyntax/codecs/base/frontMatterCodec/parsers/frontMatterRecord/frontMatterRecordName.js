/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { FrontMatterRecordName } from '../../tokens/index.js';
import { Colon, Word, Dash, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
/**
 * Tokens that can be used inside a record name.
 */
const VALID_NAME_TOKENS = [Word, Dash];
/**
 * Parser for a `name` part of a Front Matter record.
 *
 * E.g., `'name'` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export class PartialFrontMatterRecordName extends ParserBase {
    constructor(factory, startToken) {
        super([startToken]);
        this.factory = factory;
    }
    accept(token) {
        for (const ValidToken of VALID_NAME_TOKENS) {
            if (token instanceof ValidToken) {
                this.currentTokens.push(token);
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
        }
        // once name is followed by a "space" token or a "colon", we have the full
        // record name hence can transition to the next parser
        if ((token instanceof Colon) || (token instanceof SpacingToken)) {
            const recordName = new FrontMatterRecordName(this.currentTokens);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.factory.createRecordNameWithDelimiter([recordName, token]),
                wasTokenConsumed: true,
            };
        }
        // in all other cases fail due to the unexpected token type for a record name
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecordName.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmROYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9wYXJzZXJzL2Zyb250TWF0dGVyUmVjb3JkL2Zyb250TWF0dGVyUmVjb3JkTmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQXlCLE1BQU0sdUJBQXVCLENBQUM7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQTJCLE1BQU0sb0NBQW9DLENBQUM7QUFHNUc7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBT3ZDOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFVBQXlDO0lBQzFGLFlBQ2tCLE9BQWlDLEVBQ2xELFVBQWdCO1FBRWhCLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFISCxZQUFPLEdBQVAsT0FBTyxDQUEwQjtJQUluRCxDQUFDO0lBR00sTUFBTSxDQUFDLEtBQTBCO1FBQ3ZDLEtBQUssTUFBTSxVQUFVLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUM1QyxJQUFJLEtBQUssWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRS9CLE9BQU87b0JBQ04sTUFBTSxFQUFFLFNBQVM7b0JBQ2pCLFVBQVUsRUFBRSxJQUFJO29CQUNoQixnQkFBZ0IsRUFBRSxJQUFJO2lCQUN0QixDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLFlBQVksWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUNqRSxNQUFNLFVBQVUsR0FBRyxJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVqRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDM0UsZ0JBQWdCLEVBQUUsSUFBSTthQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUVELDZFQUE2RTtRQUM3RSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsZ0JBQWdCLEVBQUUsS0FBSztTQUN2QixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBakNPO0lBRE4saUJBQWlCOzBEQWlDakIifQ==