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
import { ProviderInstanceBase } from './providerInstanceBase.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { ProviderInstanceManagerBase } from './providerInstanceManagerBase.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { localize } from '../../../../../../nls.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'prompt-link-diagnostics-provider';
/**
 * Prompt links diagnostics provider for a single text model.
 */
let PromptLinkDiagnosticsProvider = class PromptLinkDiagnosticsProvider extends ProviderInstanceBase {
    constructor(model, promptsService, markerService, fileService) {
        super(model, promptsService);
        this.markerService = markerService;
        this.fileService = fileService;
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async onPromptSettled() {
        // clean up all previously added markers
        this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
        const markers = [];
        const stats = await this.fileService.resolveAll(this.parser.references.map(ref => ({ resource: ref.uri })));
        for (let i = 0; i < stats.length; i++) {
            if (!stats[i].success) {
                markers.push(toMarker(this.parser.references[i], localize('fileNotFound', 'File not found.')));
            }
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.model.uri, markers);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-link-diagnostics:${this.model.uri.path}`;
    }
};
PromptLinkDiagnosticsProvider = __decorate([
    __param(1, IPromptsService),
    __param(2, IMarkerService),
    __param(3, IFileService)
], PromptLinkDiagnosticsProvider);
/**
 * Convert a prompt link with an issue to a marker data.
 *
 * @throws
 *  - if there is no link issue (e.g., `topError` undefined)
 *  - if there is no link range to highlight (e.g., `linkRange` undefined)
 *  - if the original error is of `NotPromptFile` type - we don't want to
 *    show diagnostic markers for non-prompt file links in the prompts
 */
function toMarker(link, message) {
    const { linkRange } = link;
    assertDefined(linkRange, 'Link range must to be defined.');
    return {
        message: message,
        severity: MarkerSeverity.Warning,
        ...linkRange,
    };
}
/**
 * The class that manages creation and disposal of {@link PromptLinkDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export class PromptLinkDiagnosticsInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptLinkDiagnosticsProvider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm9tcHRMaW5rRGlhZ25vc3RpY3NQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSwyQkFBMkIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRixPQUFPLEVBQWUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQ7O0dBRUc7QUFDSCxNQUFNLGdCQUFnQixHQUFHLGtDQUFrQyxDQUFDO0FBRTVEOztHQUVHO0FBQ0gsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxvQkFBb0I7SUFDL0QsWUFDQyxLQUFpQixFQUNBLGNBQStCLEVBQ2YsYUFBNkIsRUFDL0IsV0FBeUI7UUFFeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztRQUhJLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMvQixnQkFBVyxHQUFYLFdBQVcsQ0FBYztJQUd6RCxDQUFDO0lBRUQ7O09BRUc7SUFDZ0IsS0FBSyxDQUFDLGVBQWU7UUFDdkMsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sT0FBTyxHQUFrQixFQUFFLENBQUM7UUFFbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEcsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDM0IsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUNkLE9BQU8sQ0FDUCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLDJCQUEyQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0NBQ0QsQ0FBQTtBQXZDSyw2QkFBNkI7SUFHaEMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0dBTFQsNkJBQTZCLENBdUNsQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBUyxRQUFRLENBQUMsSUFBMEIsRUFBRSxPQUFlO0lBQzVELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFFM0IsYUFBYSxDQUNaLFNBQVMsRUFDVCxnQ0FBZ0MsQ0FDaEMsQ0FBQztJQUdGLE9BQU87UUFDTixPQUFPLEVBQUUsT0FBTztRQUNoQixRQUFRLEVBQUUsY0FBYyxDQUFDLE9BQU87UUFDaEMsR0FBRyxTQUFTO0tBQ1osQ0FBQztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0NBQXFDLFNBQVEsMkJBQTBEO0lBQ25ILElBQXVCLGFBQWE7UUFDbkMsT0FBTyw2QkFBNkIsQ0FBQztJQUN0QyxDQUFDO0NBQ0QifQ==