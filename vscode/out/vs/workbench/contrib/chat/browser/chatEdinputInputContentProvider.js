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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
let ChatInputBoxContentProvider = class ChatInputBoxContentProvider extends Disposable {
    constructor(textModelService, modelService, languageService) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this._register(textModelService.registerTextModelContentProvider(Schemas.vscodeChatInput, this));
    }
    async provideTextContent(resource) {
        const existing = this.modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        return this.modelService.createModel('', this.languageService.createById('chatinput'), resource);
    }
};
ChatInputBoxContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService),
    __param(2, ILanguageService)
], ChatInputBoxContentProvider);
export { ChatInputBoxContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaW5wdXRJbnB1dENvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGlucHV0SW5wdXRDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRzlHLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUMxRCxZQUNvQixnQkFBbUMsRUFDdEIsWUFBMkIsRUFDeEIsZUFBaUM7UUFFcEUsS0FBSyxFQUFFLENBQUM7UUFId0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBR3BFLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7Q0FDRCxDQUFBO0FBakJZLDJCQUEyQjtJQUVyQyxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLDJCQUEyQixDQWlCdkMifQ==