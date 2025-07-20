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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IPromptsService } from '../service/promptsService.js';
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
/**
 * Provides link references for prompt files.
 */
let PromptLinkProvider = class PromptLinkProvider {
    constructor(promptsService) {
        this.promptsService = promptsService;
    }
    /**
     * Provide list of links for the provided text model.
     */
    async provideLinks(model, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const parser = this.promptsService.getSyntaxParserFor(model);
        assert(parser.isDisposed === false, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const completed = await parser.start(token).settled();
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        const { references } = parser;
        // filter out references that are not valid links
        const links = references
            .map((reference) => {
            const { uri, linkRange } = reference;
            // must always be true because of the filter above
            assertDefined(linkRange, 'Link range must be defined.');
            return {
                range: linkRange,
                url: uri,
            };
        });
        return {
            links,
        };
    }
};
PromptLinkProvider = __decorate([
    __param(0, IPromptsService)
], PromptLinkProvider);
export { PromptLinkProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvbXB0TGlua1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSTVFOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFDOUIsWUFDbUMsY0FBK0I7UUFBL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBRWxFLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxZQUFZLENBQ3hCLEtBQWlCLEVBQ2pCLEtBQXdCO1FBRXhCLE1BQU0sQ0FDTCxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFDOUIsSUFBSSxpQkFBaUIsRUFBRSxDQUN2QixDQUFDO1FBRUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQ0wsTUFBTSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQzNCLHFDQUFxQyxDQUNyQyxDQUFDO1FBRUYsbURBQW1EO1FBQ25ELDhDQUE4QztRQUM5QyxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNqRCxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUU5QixpREFBaUQ7UUFDakQsTUFBTSxLQUFLLEdBQVksVUFBVTthQUMvQixHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUNsQixNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLFNBQVMsQ0FBQztZQUVyQyxrREFBa0Q7WUFDbEQsYUFBYSxDQUNaLFNBQVMsRUFDVCw2QkFBNkIsQ0FDN0IsQ0FBQztZQUVGLE9BQU87Z0JBQ04sS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEdBQUcsRUFBRSxHQUFHO2FBQ1IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTztZQUNOLEtBQUs7U0FDTCxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFyRFksa0JBQWtCO0lBRTVCLFdBQUEsZUFBZSxDQUFBO0dBRkwsa0JBQWtCLENBcUQ5QiJ9