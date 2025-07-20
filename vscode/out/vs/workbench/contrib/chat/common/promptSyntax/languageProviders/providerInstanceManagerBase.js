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
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../utils/objectCache.js';
import { INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { PromptsConfig } from '../config/config.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * A generic base class that manages creation and disposal of {@link TInstance}
 * objects for each specific editor object that is used for reusable prompt files.
 */
let ProviderInstanceManagerBase = class ProviderInstanceManagerBase extends Disposable {
    constructor(modelService, editorService, instantiationService, configService) {
        super();
        // cache of managed instances
        this.instances = this._register(new ObjectCache((model) => {
            assert(model.isDisposed() === false, 'Text model must not be disposed.');
            // sanity check - the new TS/JS discrepancies regarding fields initialization
            // logic mean that this can be `undefined` during runtime while defined in TS
            assertDefined(this.InstanceClass, 'Instance class field must be defined.');
            const instance = instantiationService.createInstance(this.InstanceClass, model);
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            instance.assertNotDisposed('Created instance must not be disposed.');
            return instance;
        }));
        // if the feature is disabled, do not create any providers
        if (PromptsConfig.enabled(configService) === false) {
            return;
        }
        // subscribe to changes of the active editor
        this._register(editorService.onDidActiveEditorChange(() => {
            const { activeTextEditorControl } = editorService;
            if (activeTextEditorControl === undefined) {
                return;
            }
            this.handleNewEditor(activeTextEditorControl);
        }));
        // handle existing visible text editors
        editorService
            .visibleTextEditorControls
            .forEach(this.handleNewEditor.bind(this));
        // subscribe to "language change" events for all models
        this._register(modelService.onModelLanguageChanged((event) => {
            const { model, oldLanguageId } = event;
            // if language is set to `prompt` or `instructions` language, handle that model
            if (isPromptFileModel(model)) {
                this.instances.get(model);
                return;
            }
            // if the language is changed away from `prompt` or `instructions`,
            // remove and dispose provider for this model
            if (isPromptFile(oldLanguageId)) {
                this.instances.remove(model, true);
                return;
            }
        }));
    }
    /**
     * Initialize a new {@link TInstance} for the given editor.
     */
    handleNewEditor(editor) {
        const model = editor.getModel();
        if (model === null) {
            return this;
        }
        if (isPromptFileModel(model) === false) {
            return this;
        }
        // note! calling `get` also creates a provider if it does not exist;
        // 		and the provider is auto-removed when the editor is disposed
        this.instances.get(model);
        return this;
    }
};
ProviderInstanceManagerBase = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, IConfigurationService)
], ProviderInstanceManagerBase);
export { ProviderInstanceManagerBase };
/**
 * Check if provided language ID is one of the prompt file languages.
 */
function isPromptFile(languageId) {
    return [
        PROMPT_LANGUAGE_ID,
        INSTRUCTIONS_LANGUAGE_ID,
        MODE_LANGUAGE_ID,
    ].includes(languageId);
}
/**
 * Check if a provided model is used for prompt files.
 */
function isPromptFileModel(model) {
    // we support only `text editors` for now so filter out `diff` ones
    if ('modified' in model || 'model' in model) {
        return false;
    }
    if (model.isDisposed()) {
        return false;
    }
    if (isPromptFile(model.getLanguageId()) === false) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXJJbnN0YW5jZU1hbmFnZXJCYXNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvdmlkZXJJbnN0YW5jZU1hbmFnZXJCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUV4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQWN6Rzs7O0dBR0c7QUFDSSxJQUFlLDJCQUEyQixHQUExQyxNQUFlLDJCQUFvRSxTQUFRLFVBQVU7SUFXM0csWUFDZ0IsWUFBMkIsRUFDMUIsYUFBNkIsRUFDdEIsb0JBQTJDLEVBQzNDLGFBQW9DO1FBRTNELEtBQUssRUFBRSxDQUFDO1FBRVIsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUIsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFpQixFQUFFLEVBQUU7WUFDckMsTUFBTSxDQUNMLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxLQUFLLEVBQzVCLGtDQUFrQyxDQUNsQyxDQUFDO1lBRUYsNkVBQTZFO1lBQzdFLDZFQUE2RTtZQUM3RSxhQUFhLENBQ1osSUFBSSxDQUFDLGFBQWEsRUFDbEIsdUNBQXVDLENBQ3ZDLENBQUM7WUFFRixNQUFNLFFBQVEsR0FBYyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlELElBQUksQ0FBQyxhQUFhLEVBQ2xCLEtBQUssQ0FDTCxDQUFDO1lBRUYsK0RBQStEO1lBQy9ELGtFQUFrRTtZQUNsRSxRQUFRLENBQUMsaUJBQWlCLENBQ3pCLHdDQUF3QyxDQUN4QyxDQUFDO1lBRUYsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUVGLDBEQUEwRDtRQUMxRCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDcEQsT0FBTztRQUNSLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3pELE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxHQUFHLGFBQWEsQ0FBQztZQUNsRCxJQUFJLHVCQUF1QixLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMzQyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosdUNBQXVDO1FBQ3ZDLGFBQWE7YUFDWCx5QkFBeUI7YUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFM0MsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDN0MsTUFBTSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFFdkMsK0VBQStFO1lBQy9FLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzFCLE9BQU87WUFDUixDQUFDO1lBRUQsbUVBQW1FO1lBQ25FLDZDQUE2QztZQUM3QyxJQUFJLFlBQVksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxNQUE2QjtRQUNwRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTFCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNELENBQUE7QUE3R3FCLDJCQUEyQjtJQVk5QyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBZkYsMkJBQTJCLENBNkdoRDs7QUFFRDs7R0FFRztBQUNILFNBQVMsWUFBWSxDQUFDLFVBQWtCO0lBQ3ZDLE9BQU87UUFDTixrQkFBa0I7UUFDbEIsd0JBQXdCO1FBQ3hCLGdCQUFnQjtLQUNoQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLEtBQW1CO0lBQzdDLG1FQUFtRTtJQUNuRSxJQUFJLFVBQVUsSUFBSSxLQUFLLElBQUksT0FBTyxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzdDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDbkQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDIn0=