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
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { TextModelContentsProvider } from '../contentProviders/textModelContentsProvider.js';
import { FilePromptContentProvider } from '../contentProviders/filePromptContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
/**
 * Get prompt contents provider object based on the prompt type.
 */
function getContentsProvider(uri, options, modelService, instaService) {
    const model = modelService.getModel(uri);
    if (model) {
        return instaService.createInstance(TextModelContentsProvider, model, options);
    }
    return instaService.createInstance(FilePromptContentProvider, uri, options);
}
/**
 * General prompt parser class that automatically infers a prompt
 * contents provider type by the type of provided prompt URI.
 */
let PromptParser = class PromptParser extends BasePromptParser {
    constructor(uri, options, logService, modelService, instaService, envService) {
        const contentsProvider = getContentsProvider(uri, options, modelService, instaService);
        super(contentsProvider, options, instaService, envService, logService);
        this.contentsProvider = this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        const { sourceName } = this.contentsProvider;
        return `prompt-parser:${sourceName}:${this.uri.path}`;
    }
};
PromptParser = __decorate([
    __param(2, ILogService),
    __param(3, IModelService),
    __param(4, IInstantiationService),
    __param(5, IWorkbenchEnvironmentService)
], PromptParser);
export { PromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDN0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFaEg7O0dBRUc7QUFDSCxTQUFTLG1CQUFtQixDQUMzQixHQUFRLEVBQ1IsT0FBdUMsRUFDdkMsWUFBMkIsRUFDM0IsWUFBbUM7SUFFbkMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsT0FBTyxZQUFZLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBQ0QsT0FBTyxZQUFZLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3RSxDQUFDO0FBRUQ7OztHQUdHO0FBQ0ksSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLGdCQUF5QztJQU0xRSxZQUNDLEdBQVEsRUFDUixPQUE2QixFQUNoQixVQUF1QixFQUNyQixZQUEyQixFQUNuQixZQUFtQyxFQUM1QixVQUF3QztRQUV0RSxNQUFNLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRXZGLEtBQUssQ0FDSixnQkFBZ0IsRUFDaEIsT0FBTyxFQUNQLFlBQVksRUFDWixVQUFVLEVBQ1YsVUFBVSxDQUNWLENBQUM7UUFFRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUU3QyxPQUFPLGlCQUFpQixVQUFVLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2RCxDQUFDO0NBQ0QsQ0FBQTtBQW5DWSxZQUFZO0lBU3RCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsNEJBQTRCLENBQUE7R0FabEIsWUFBWSxDQW1DeEIifQ==