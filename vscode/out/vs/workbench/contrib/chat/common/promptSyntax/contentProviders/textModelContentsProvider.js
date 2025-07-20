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
var TextModelContentsProvider_1;
import { TextModel } from '../../../../../../editor/common/model/textModel.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { objectStreamFromTextModel } from '../codecs/base/utils/objectStreamFromTextModel.js';
import { FilePromptContentProvider } from './filePromptContentsProvider.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
/**
 * Prompt contents provider for a {@link ITextModel} instance.
 */
let TextModelContentsProvider = TextModelContentsProvider_1 = class TextModelContentsProvider extends PromptContentsProviderBase {
    /**
     * URI component of the prompt associated with this contents provider.
     */
    get uri() {
        return this.model.uri;
    }
    get sourceName() {
        return 'text-model';
    }
    get languageId() {
        return this.options.languageId ?? this.model.getLanguageId();
    }
    constructor(model, options, instantiationService) {
        super(options);
        this.model = model;
        this.instantiationService = instantiationService;
        this._register(this.model.onWillDispose(this.dispose.bind(this)));
        if (options.updateOnChange) {
            this._register(this.model.onDidChangeContent(this.onChangeEmitter.fire.bind(this.onChangeEmitter)));
        }
    }
    /**
     * Creates a stream of binary data from the text model based on the changes
     * listed in the provided event.
     *
     * Note! this method implements a basic logic which does not take into account
     * 		 the `_event` argument for incremental updates. This needs to be improved.
     *
     * @param _event - event that describes the changes in the text model; `'full'` is
     * 				   the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        return objectStreamFromTextModel(this.model, cancellationToken);
    }
    createNew(promptContentsSource, options) {
        if (promptContentsSource instanceof TextModel) {
            return this.instantiationService.createInstance(TextModelContentsProvider_1, promptContentsSource, options);
        }
        return this.instantiationService.createInstance(FilePromptContentProvider, promptContentsSource.uri, options);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `text-model-prompt-contents-provider:${this.uri.path}`;
    }
};
TextModelContentsProvider = TextModelContentsProvider_1 = __decorate([
    __param(2, IInstantiationService)
], TextModelContentsProvider);
export { TextModelContentsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQ29udGVudHNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvdGV4dE1vZGVsQ29udGVudHNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFNaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVFLE9BQU8sRUFBa0MsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUc3Rzs7R0FFRztBQUNJLElBQU0seUJBQXlCLGlDQUEvQixNQUFNLHlCQUEwQixTQUFRLDBCQUFxRDtJQUNuRzs7T0FFRztJQUNILElBQVcsR0FBRztRQUNiLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQW9CLFVBQVU7UUFDN0IsT0FBTyxZQUFZLENBQUM7SUFDckIsQ0FBQztJQUVELElBQW9CLFVBQVU7UUFDN0IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzlELENBQUM7SUFFRCxZQUNrQixLQUFpQixFQUNsQyxPQUF1QyxFQUNDLG9CQUEyQztRQUVuRixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFKRSxVQUFLLEdBQUwsS0FBSyxDQUFZO1FBRU0seUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUluRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckcsQ0FBQztJQUNGLENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ2dCLEtBQUssQ0FBQyxpQkFBaUIsQ0FDekMsTUFBMEMsRUFDMUMsaUJBQXFDO1FBRXJDLE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFZSxTQUFTLENBQ3hCLG9CQUE4QyxFQUM5QyxPQUF1QztRQUV2QyxJQUFJLG9CQUFvQixZQUFZLFNBQVMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDOUMsMkJBQXlCLEVBQ3pCLG9CQUFvQixFQUNwQixPQUFPLENBQ1AsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlDLHlCQUF5QixFQUN6QixvQkFBb0IsQ0FBQyxHQUFHLEVBQ3hCLE9BQU8sQ0FDUCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLHVDQUF1QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9ELENBQUM7Q0FDRCxDQUFBO0FBeEVZLHlCQUF5QjtJQW1CbkMsV0FBQSxxQkFBcUIsQ0FBQTtHQW5CWCx5QkFBeUIsQ0F3RXJDIn0=