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
import { assert } from '../../../../../../base/common/assert.js';
import { cancelPreviousCalls } from '../../../../../../base/common/decorators/cancelPreviousCalls.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { FailedToResolveContentsStream, ResolveError } from '../../promptFileReferenceErrors.js';
import { INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../promptTypes.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
/**
 * Base class for prompt contents providers. Classes that extend this one are responsible to:
 *
 * - implement the {@link getContentsStream} method to provide the contents stream
 *   of a prompt; this method should throw a `ResolveError` or its derivative if the contents
 *   cannot be parsed for any reason
 * - fire a {@link TChangeEvent} event on the {@link onChangeEmitter} event when
 * 	 prompt contents change
 * - misc:
 *   - provide the {@link uri} property that represents the URI of a prompt that
 *     the contents are for
 *   - implement the {@link toString} method to return a string representation of this
 *     provider type to aid with debugging/tracing
 */
export class PromptContentsProviderBase extends ObservableDisposable {
    /**
     * Prompt contents stream.
     */
    get contents() {
        return this.getContentsStream('full');
    }
    /**
     * Prompt type used to determine how to interpret file contents.
     */
    get promptType() {
        const { languageId } = this;
        if (languageId === PROMPT_LANGUAGE_ID) {
            return PromptsType.prompt;
        }
        if (languageId === INSTRUCTIONS_LANGUAGE_ID) {
            return PromptsType.instructions;
        }
        if (languageId === MODE_LANGUAGE_ID) {
            return PromptsType.mode;
        }
        return 'non-prompt';
    }
    constructor(options) {
        super();
        /**
         * Internal event emitter for the prompt contents change event. Classes that extend
         * this abstract class are responsible to use this emitter to fire the contents change
         * event when the prompt contents get modified.
         */
        this.onChangeEmitter = this._register(new Emitter());
        /**
         * Event emitter for the prompt contents change event.
         * See {@link onContentChanged} for more details.
         */
        this.onContentChangedEmitter = this._register(new Emitter());
        /**
         * Event that fires when the prompt contents change. The event is either
         * a `VSBufferReadableStream` stream with changed contents or an instance of
         * the `ResolveError` class representing a parsing failure case.
         *
         * `Note!` this field is meant to be used by the external consumers of the prompt
         *         contents provider that the classes that extend this abstract class.
         *         Please use the {@link onChangeEmitter} event to provide a change
         *         event in your prompt contents implementation instead.
         */
        this.onContentChanged = this.onContentChangedEmitter.event;
        this.options = options;
    }
    /**
     * Internal common implementation of the event that should be fired when
     * prompt contents change.
     */
    onContentsChanged(event, cancellationToken) {
        const promise = (cancellationToken?.isCancellationRequested)
            ? Promise.reject(new CancellationError())
            : this.getContentsStream(event, cancellationToken);
        promise
            .then((stream) => {
            if (cancellationToken?.isCancellationRequested || this.isDisposed) {
                stream.destroy();
                throw new CancellationError();
            }
            this.onContentChangedEmitter.fire(stream);
        })
            .catch((error) => {
            if (error instanceof ResolveError) {
                this.onContentChangedEmitter.fire(error);
                return;
            }
            this.onContentChangedEmitter.fire(new FailedToResolveContentsStream(this.uri, error));
        });
        return this;
    }
    /**
     * Start producing the prompt contents data.
     */
    start(token) {
        assert(!this.isDisposed, 'Cannot start contents provider that was already disposed.');
        // `'full'` means "everything has changed"
        this.onContentsChanged('full', token);
        // subscribe to the change event emitted by a child class
        this._register(this.onChangeEmitter.event(this.onContentsChanged, this));
        return this;
    }
}
__decorate([
    cancelPreviousCalls
], PromptContentsProviderBase.prototype, "onContentsChanged", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29udGVudHNQcm92aWRlckJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL3Byb21wdENvbnRlbnRzUHJvdmlkZXJCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQXlCeEU7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUNILE1BQU0sT0FBZ0IsMEJBRXBCLFNBQVEsb0JBQW9CO0lBTzdCOztPQUVHO0lBQ0gsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsVUFBVTtRQUNwQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTVCLElBQUksVUFBVSxLQUFLLGtCQUFrQixFQUFFLENBQUM7WUFDdkMsT0FBTyxXQUFX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