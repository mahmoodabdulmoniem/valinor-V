/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
export class ChatToolInvocation {
    get isComplete() {
        return this._isComplete;
    }
    get isCompletePromise() {
        return this._isCompleteDeferred.p;
    }
    get confirmed() {
        return this._confirmDeferred;
    }
    get isConfirmed() {
        return this._isConfirmed;
    }
    get resultDetails() {
        return this._resultDetails;
    }
    constructor(preparedInvocation, toolData, toolCallId) {
        this.toolCallId = toolCallId;
        this.kind = 'toolInvocation';
        this._isComplete = false;
        this._isCompleteDeferred = new DeferredPromise();
        this._confirmDeferred = new DeferredPromise();
        this.progress = observableValue(this, { progress: 0 });
        const defaultMessage = localize('toolInvocationMessage', "Using {0}", `"${toolData.displayName}"`);
        const invocationMessage = preparedInvocation?.invocationMessage ?? defaultMessage;
        this.invocationMessage = invocationMessage;
        this.pastTenseMessage = preparedInvocation?.pastTenseMessage;
        this.originMessage = preparedInvocation?.originMessage;
        this._confirmationMessages = preparedInvocation?.confirmationMessages;
        this.presentation = preparedInvocation?.presentation;
        this.toolSpecificData = preparedInvocation?.toolSpecificData;
        this.toolId = toolData.id;
        if (!this._confirmationMessages) {
            // No confirmation needed
            this._isConfirmed = true;
            this._confirmDeferred.complete(true);
        }
        this._confirmDeferred.p.then(confirmed => {
            this._isConfirmed = confirmed;
            this._confirmationMessages = undefined;
        });
        this._isCompleteDeferred.p.then(() => {
            this._isComplete = true;
        });
    }
    complete(result) {
        if (result?.toolResultMessage) {
            this.pastTenseMessage = result.toolResultMessage;
        }
        this._resultDetails = result?.toolResultDetails;
        this._isCompleteDeferred.complete();
    }
    get confirmationMessages() {
        return this._confirmationMessages;
    }
    acceptProgress(step) {
        const prev = this.progress.get();
        this.progress.set({
            progress: step.increment ? (prev.progress + step.increment) : prev.progress,
            message: step.message,
        }, undefined);
    }
    toJSON() {
        return {
            kind: 'toolInvocationSerialized',
            presentation: this.presentation,
            invocationMessage: this.invocationMessage,
            pastTenseMessage: this.pastTenseMessage,
            originMessage: this.originMessage,
            isConfirmed: this._isConfirmed,
            isComplete: this._isComplete,
            resultDetails: this._resultDetails,
            toolSpecificData: this.toolSpecificData,
            toolCallId: this.toolCallId,
            toolId: this.toolId,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0UHJvZ3Jlc3NUeXBlcy9jaGF0VG9vbEludm9jYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFJakQsTUFBTSxPQUFPLGtCQUFrQjtJQUk5QixJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQ3pCLENBQUM7SUFHRCxJQUFXLGlCQUFpQjtRQUMzQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUdELElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM5QixDQUFDO0lBR0QsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBR0QsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBYUQsWUFBWSxrQkFBdUQsRUFBRSxRQUFtQixFQUFrQixVQUFrQjtRQUFsQixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBdEM1RyxTQUFJLEdBQXFCLGdCQUFnQixDQUFDO1FBRWxELGdCQUFXLEdBQUcsS0FBSyxDQUFDO1FBS3BCLHdCQUFtQixHQUFHLElBQUksZUFBZSxFQUFRLENBQUM7UUFLbEQscUJBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQVcsQ0FBQztR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