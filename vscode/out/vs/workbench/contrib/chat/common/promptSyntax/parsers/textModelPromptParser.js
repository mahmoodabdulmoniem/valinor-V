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
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { BasePromptParser } from './basePromptParser.js';
import { TextModelContentsProvider } from '../contentProviders/textModelContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
/**
 * Class capable of parsing prompt syntax out of a provided text model,
 * including all the nested child file references it may have.
 */
let TextModelPromptParser = class TextModelPromptParser extends BasePromptParser {
    constructor(model, options, instantiationService, envService, logService) {
        const contentsProvider = instantiationService.createInstance(TextModelContentsProvider, model, options);
        super(contentsProvider, options, instantiationService, envService, logService);
        this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `text-model-prompt:${this.uri.path}`;
    }
};
TextModelPromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ILogService)
], TextModelPromptParser);
export { TextModelPromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUHJvbXB0UGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy90ZXh0TW9kZWxQcm9tcHRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUVoSDs7O0dBR0c7QUFDSSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLGdCQUEyQztJQUNyRixZQUNDLEtBQWlCLEVBQ2pCLE9BQTZCLEVBQ04sb0JBQTJDLEVBQ3BDLFVBQXdDLEVBQ3pELFVBQXVCO1FBRXBDLE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUMzRCx5QkFBeUIsRUFDekIsS0FBSyxFQUNMLE9BQU8sQ0FDUCxDQUFDO1FBRUYsS0FBSyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxxQkFBcUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0NBQ0QsQ0FBQTtBQXpCWSxxQkFBcUI7SUFJL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsV0FBVyxDQUFBO0dBTkQscUJBQXFCLENBeUJqQyJ9