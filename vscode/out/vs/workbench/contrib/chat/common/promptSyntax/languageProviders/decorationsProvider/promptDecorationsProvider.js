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
import { IPromptsService } from '../../service/promptsService.js';
import { ProviderInstanceBase } from '../providerInstanceBase.js';
import { FrontMatterDecoration } from './decorations/frontMatterDecoration.js';
import { toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { ProviderInstanceManagerBase } from '../providerInstanceManagerBase.js';
import { registerThemingParticipant } from '../../../../../../../platform/theme/common/themeService.js';
import { ReactiveDecorationBase } from './decorations/utils/reactiveDecorationBase.js';
/**
 * List of all supported decorations.
 */
const SUPPORTED_DECORATIONS = Object.freeze([
    FrontMatterDecoration,
]);
/**
 * Prompt syntax decorations provider for text models.
 */
let PromptDecorator = class PromptDecorator extends ProviderInstanceBase {
    constructor(model, promptsService) {
        super(model, promptsService);
        /**
         * Currently active decorations.
         */
        this.decorations = [];
        this.watchCursorPosition();
    }
    async onPromptSettled(_error) {
        // by the time the promise above completes, either this object
        // or the text model might be already has been disposed
        if (this.isDisposed || this.model.isDisposed()) {
            return;
        }
        this.addDecorations();
        return;
    }
    /**
     * Get the current cursor position inside an active editor.
     * Note! Currently not implemented because the provider is disabled, and
     *       we need to do some refactoring to get accurate cursor position.
     */
    get cursorPosition() {
        if (this.model.isDisposed()) {
            return null;
        }
        return null;
    }
    /**
     * Watch editor cursor position and update reactive decorations accordingly.
     */
    watchCursorPosition() {
        const interval = setInterval(() => {
            const { cursorPosition } = this;
            const changedDecorations = [];
            for (const decoration of this.decorations) {
                if ((decoration instanceof ReactiveDecorationBase) === false) {
                    continue;
                }
                if (decoration.setCursorPosition(cursorPosition) === true) {
                    changedDecorations.push(decoration);
                }
            }
            if (changedDecorations.length === 0) {
                return;
            }
            this.changeModelDecorations(changedDecorations);
        }, 25);
        this._register(toDisposable(() => {
            clearInterval(interval);
        }));
        return this;
    }
    /**
     * Update existing decorations.
     */
    changeModelDecorations(decorations) {
        this.model.changeDecorations((accessor) => {
            for (const decoration of decorations) {
                decoration.change(accessor);
            }
        });
        return this;
    }
    /**
     * Add decorations for all prompt tokens.
     */
    addDecorations() {
        this.model.changeDecorations((accessor) => {
            const { tokens } = this.parser;
            // remove all existing decorations
            for (const decoration of this.decorations.splice(0)) {
                decoration.remove(accessor);
            }
            // then add new decorations based on the current tokens
            for (const token of tokens) {
                for (const Decoration of SUPPORTED_DECORATIONS) {
                    if (Decoration.handles(token) === false) {
                        continue;
                    }
                    this.decorations.push(new Decoration(accessor, token));
                    break;
                }
            }
        });
        return this;
    }
    /**
     * Remove all existing decorations.
     */
    removeAllDecorations() {
        if (this.decorations.length === 0) {
            return this;
        }
        this.model.changeDecorations((accessor) => {
            for (const decoration of this.decorations.splice(0)) {
                decoration.remove(accessor);
            }
        });
        return this;
    }
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.removeAllDecorations();
        super.dispose();
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `text-model-prompt-decorator:${this.model.uri.path}`;
    }
};
PromptDecorator = __decorate([
    __param(1, IPromptsService)
], PromptDecorator);
export { PromptDecorator };
/**
 * Register CSS styles of the supported decorations.
 */
registerThemingParticipant((_theme, collector) => {
    for (const Decoration of SUPPORTED_DECORATIONS) {
        for (const [className, styles] of Object.entries(Decoration.cssStyles)) {
            collector.addRule(`.monaco-editor ${className} { ${styles.join(' ')} }`);
        }
    }
});
/**
 * Provider for prompt syntax decorators on text models.
 */
export class PromptDecorationsProviderInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptDecorator;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RGVjb3JhdGlvbnNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL2RlY29yYXRpb25zUHJvdmlkZXIvcHJvbXB0RGVjb3JhdGlvbnNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRzdFLE9BQU8sRUFBRSwyQkFBMkIsRUFBa0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUV4RyxPQUFPLEVBQUUsc0JBQXNCLEVBQXFCLE1BQU0sK0NBQStDLENBQUM7QUFRMUc7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQixHQUFpRCxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3pGLHFCQUFxQjtDQUNyQixDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNJLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEsb0JBQW9CO0lBTXhELFlBQ0MsS0FBaUIsRUFDQSxjQUErQjtRQUVoRCxLQUFLLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBVDlCOztXQUVHO1FBQ2MsZ0JBQVcsR0FBZ0MsRUFBRSxDQUFDO1FBUTlELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFa0IsS0FBSyxDQUFDLGVBQWUsQ0FDdkMsTUFBYztRQUVkLDhEQUE4RDtRQUM5RCx1REFBdUQ7UUFDdkQsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNoRCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV0QixPQUFPO0lBQ1IsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxJQUFZLGNBQWM7UUFDekIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSyxtQkFBbUI7UUFDMUIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNqQyxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBRWhDLE1BQU0sa0JBQWtCLEdBQXdCLEVBQUUsQ0FBQztZQUNuRCxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLFVBQVUsWUFBWSxzQkFBc0IsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO29CQUM5RCxTQUFTO2dCQUNWLENBQUM7Z0JBRUQsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQzNELGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDckMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNqRCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFUCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDaEMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNLLHNCQUFzQixDQUM3QixXQUF5QztRQUV6QyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDdEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7T0FFRztJQUNLLGNBQWM7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBRS9CLGtDQUFrQztZQUNsQyxLQUFLLE1BQU0sVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUVELHVEQUF1RDtZQUN2RCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUM1QixLQUFLLE1BQU0sVUFBVSxJQUFJLHFCQUFxQixFQUFFLENBQUM7b0JBQ2hELElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQzt3QkFDekMsU0FBUztvQkFDVixDQUFDO29CQUVELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUNwQixJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQy9CLENBQUM7b0JBQ0YsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSyxvQkFBb0I7UUFDM0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsS0FBSyxNQUFNLFVBQVUsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM1QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLCtCQUErQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0NBQ0QsQ0FBQTtBQXZKWSxlQUFlO0lBUXpCLFdBQUEsZUFBZSxDQUFBO0dBUkwsZUFBZSxDQXVKM0I7O0FBRUQ7O0dBRUc7QUFDSCwwQkFBMEIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtJQUNoRCxLQUFLLE1BQU0sVUFBVSxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDeEUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsU0FBUyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILE1BQU0sT0FBTyx3Q0FBeUMsU0FBUSwyQkFBNEM7SUFDekcsSUFBdUIsYUFBYTtRQUNuQyxPQUFPLGVBQWUsQ0FBQztJQUN4QixDQUFDO0NBQ0QifQ==