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
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatCollapsibleListContentPart } from '../chatReferencesContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatResultListSubPart = class ChatResultListSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, message, toolDetails, listPool, instantiationService) {
        super(toolInvocation);
        this.codeblocks = [];
        const collapsibleListPart = this._register(instantiationService.createInstance(ChatCollapsibleListContentPart, toolDetails.map(detail => ({
            kind: 'reference',
            reference: detail,
        })), message, context, listPool));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.domNode = collapsibleListPart.domNode;
    }
};
ChatResultListSubPart = __decorate([
    __param(5, IInstantiationService)
], ChatResultListSubPart);
export { ChatResultListSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3VsdExpc3RTdWJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRSZXN1bHRMaXN0U3ViUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUl6RyxPQUFPLEVBQUUsOEJBQThCLEVBQWlELE1BQU0saUNBQWlDLENBQUM7QUFDaEksT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSw2QkFBNkI7SUFJdkUsWUFDQyxjQUFtRSxFQUNuRSxPQUFzQyxFQUN0QyxPQUFpQyxFQUNqQyxXQUFrQyxFQUNsQyxRQUE2QixFQUNOLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFWUCxlQUFVLEdBQXlCLEVBQUUsQ0FBQztRQVlyRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM3RSw4QkFBOEIsRUFDOUIsV0FBVyxDQUFDLEdBQUcsQ0FBMkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELElBQUksRUFBRSxXQUFXO1lBQ2pCLFNBQVMsRUFBRSxNQUFNO1NBQ2pCLENBQUMsQ0FBQyxFQUNILE9BQU8sRUFDUCxPQUFPLEVBQ1AsUUFBUSxDQUNSLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsT0FBTyxHQUFHLG1CQUFtQixDQUFDLE9BQU8sQ0FBQztJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQTNCWSxxQkFBcUI7SUFVL0IsV0FBQSxxQkFBcUIsQ0FBQTtHQVZYLHFCQUFxQixDQTJCakMifQ==