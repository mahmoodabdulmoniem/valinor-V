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
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
/**
 * Abstract base class for all reusable prompt file providers.
 */
let ProviderInstanceBase = class ProviderInstanceBase extends ObservableDisposable {
    constructor(model, promptsService) {
        super();
        this.model = model;
        this.parser = promptsService.getSyntaxParserFor(model);
        this._register(this.parser.onDispose(this.dispose.bind(this)));
        let cancellationSource = new CancellationTokenSource();
        this._register(this.parser.onSettled((error) => {
            cancellationSource.dispose(true);
            cancellationSource = new CancellationTokenSource();
            this.onPromptSettled(error, cancellationSource.token);
        }));
        this.parser.start();
    }
};
ProviderInstanceBase = __decorate([
    __param(1, IPromptsService)
], ProviderInstanceBase);
export { ProviderInstanceBase };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXJJbnN0YW5jZUJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm92aWRlckluc3RhbmNlQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLDhCQUE4QixDQUFDO0FBRTlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUUzRzs7R0FFRztBQUNJLElBQWUsb0JBQW9CLEdBQW5DLE1BQWUsb0JBQXFCLFNBQVEsb0JBQW9CO0lBZ0J0RSxZQUNvQixLQUFpQixFQUNuQixjQUErQjtRQUVoRCxLQUFLLEVBQUUsQ0FBQztRQUhXLFVBQUssR0FBTCxLQUFLLENBQVk7UUFLcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUM5QyxDQUFDO1FBRUYsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7UUFDdkQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQy9CLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQyxrQkFBa0IsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFFbkQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQztDQUNELENBQUE7QUF4Q3FCLG9CQUFvQjtJQWtCdkMsV0FBQSxlQUFlLENBQUE7R0FsQkksb0JBQW9CLENBd0N6QyJ9