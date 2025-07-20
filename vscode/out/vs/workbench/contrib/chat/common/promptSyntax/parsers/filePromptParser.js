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
import { FilePromptContentProvider } from '../contentProviders/filePromptContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
/**
 * Class capable of parsing prompt syntax out of a provided file,
 * including all the nested child file references it may have.
 */
let FilePromptParser = class FilePromptParser extends BasePromptParser {
    constructor(uri, options, instantiationService, envService, logService) {
        const contentsProvider = instantiationService.createInstance(FilePromptContentProvider, uri, options);
        super(contentsProvider, options, instantiationService, envService, logService);
        this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
};
FilePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ILogService)
], FilePromptParser);
export { FilePromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvZmlsZVByb21wdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHVCQUF1QixDQUFDO0FBQy9FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRWhIOzs7R0FHRztBQUNJLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsZ0JBQTJDO0lBQ2hGLFlBQ0MsR0FBUSxFQUNSLE9BQTZCLEVBQ04sb0JBQTJDLEVBQ3BDLFVBQXdDLEVBQ3pELFVBQXVCO1FBRXBDLE1BQU0sZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUvRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGVBQWUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0NBQ0QsQ0FBQTtBQXBCWSxnQkFBZ0I7SUFJMUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsV0FBVyxDQUFBO0dBTkQsZ0JBQWdCLENBb0I1QiJ9