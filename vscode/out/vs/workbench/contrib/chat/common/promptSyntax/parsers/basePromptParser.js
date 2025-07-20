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
import { TopError } from './topError.js';
import { ChatModeKind } from '../../constants.js';
import { ModeHeader } from './promptHeader/modeHeader.js';
import { URI } from '../../../../../../base/common/uri.js';
import { PromptToken } from '../codecs/tokens/promptToken.js';
import * as path from '../../../../../../base/common/path.js';
import { ChatPromptCodec } from '../codecs/chatPromptCodec.js';
import { FileReference } from '../codecs/tokens/fileReference.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { InstructionsHeader } from './promptHeader/instructionsHeader.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { PromptVariableWithData } from '../codecs/tokens/promptVariable.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { basename, dirname, joinPath } from '../../../../../../base/common/resources.js';
import { BaseToken } from '../codecs/base/baseToken.js';
import { PromptHeader } from './promptHeader/promptHeader.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { LinesDecoder } from '../codecs/base/linesCodec/linesDecoder.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkdownLink } from '../codecs/base/markdownCodec/tokens/markdownLink.js';
import { MarkdownToken } from '../codecs/base/markdownCodec/tokens/markdownToken.js';
import { FrontMatterHeader } from '../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { ResolveError } from '../../promptFileReferenceErrors.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { Schemas } from '../../../../../../base/common/network.js';
/**
 * Base prompt parser class that provides a common interface for all
 * prompt parsers that are responsible for parsing chat prompt syntax.
 */
let BasePromptParser = class BasePromptParser extends ObservableDisposable {
    /**
     * List of all tokens that were parsed from the prompt contents so far.
     */
    get tokens() {
        return [...this.receivedTokens];
    }
    /**
     * Reference to the prompt header object that holds metadata associated
     * with the prompt.
     */
    get header() {
        return this.promptHeader;
    }
    /**
     * Get contents of the prompt body.
     */
    async getBody() {
        const startLineNumber = (this.header !== undefined)
            ? this.header.range.endLineNumber + 1
            : 1;
        const decoder = new LinesDecoder(await this.promptContentsProvider.contents);
        const tokens = (await decoder.consumeAll())
            .filter(({ range }) => {
            return (range.startLineNumber >= startLineNumber);
        });
        return BaseToken.render(tokens);
    }
    /**
     * Event that is fired when the current prompt parser is settled.
     */
    onSettled(callback) {
        const disposable = this._onSettled.event(callback);
        const streamEnded = (this.stream?.ended && (this.stream.isDisposed === false));
        // if already in the error state or stream has already ended,
        // invoke the callback immediately but asynchronously
        if (streamEnded || this.errorCondition) {
            setTimeout(callback.bind(undefined, this.errorCondition));
            return disposable;
        }
        return disposable;
    }
    /**
     * If file reference resolution fails, this attribute will be set
     * to an error instance that describes the error condition.
     */
    get errorCondition() {
        return this._errorCondition;
    }
    /**
     * Whether file references resolution failed.
     * Set to `undefined` if the `resolve` method hasn't been ever called yet.
     */
    get resolveFailed() {
        if (!this.firstParseResult.gotFirstResult) {
            return undefined;
        }
        return !!this._errorCondition;
    }
    /**
     * Returned promise is resolved when the parser process is settled.
     * The settled state means that the prompt parser stream exists and
     * has ended, or an error condition has been set in case of failure.
     *
     * Furthermore, this function can be called multiple times and will
     * block until the latest prompt contents parsing logic is settled
     * (e.g., for every `onContentChanged` event of the prompt source).
     */
    async settled() {
        assert(this.started, 'Cannot wait on the parser that did not start yet.');
        await this.firstParseResult.promise;
        if (this.errorCondition) {
            return false;
        }
        // by the time when the `firstParseResult` promise is resolved,
        // this object may have been already disposed, hence noop
        if (this.isDisposed) {
            return false;
        }
        assertDefined(this.stream, 'No stream reference found.');
        const completed = await this.stream.settled;
        // if prompt header exists, also wait for it to be settled
        if (this.promptHeader) {
            const headerCompleted = await this.promptHeader.settled;
            if (!headerCompleted) {
                return false;
            }
        }
        return completed;
    }
    constructor(promptContentsProvider, options, instantiationService, envService, logService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.instantiationService = instantiationService;
        this.envService = envService;
        this.logService = logService;
        /**
         * Private field behind the readonly {@link tokens} property.
         */
        this.receivedTokens = [];
        /**
         * List of file references in the current branch of the file reference tree.
         */
        this._references = [];
        /**
         * The event is fired when lines or their content change.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Subscribe to the event that is fired the parser state or contents
         * changes, including changes in the possible prompt child references.
         */
        this.onUpdate = this._onUpdate.event;
        /**
         * Event that is fired when the current prompt parser is settled.
         */
        this._onSettled = this._register(new Emitter());
        /**
         * The promise is resolved when at least one parse result (a stream or
         * an error) has been received from the prompt contents provider.
         */
        this.firstParseResult = new FirstParseResult();
        /**
         * Private attribute to track if the {@link start}
         * method has been already called at least once.
         */
        this.started = false;
        this.options = options;
        this._register(this.promptContentsProvider.onContentChanged((streamOrError) => {
            // process the received message
            this.onContentsChanged(streamOrError);
            // indicate that we've received at least one `onContentChanged` event
            this.firstParseResult.end();
        }));
        // dispose self when contents provider is disposed
        this._register(this.promptContentsProvider.onDispose(this.dispose.bind(this)));
    }
    /**
     * Handler the event event that is triggered when prompt contents change.
     *
     * @param streamOrError Either a binary stream of file contents, or an error object
     * 						that was generated during the reference resolve attempt.
     * @param seenReferences List of parent references that we've have already seen
     * 					 	during the process of traversing the references tree. It's
     * 						used to prevent the tree navigation to fall into an infinite
     * 						references recursion.
     */
    onContentsChanged(streamOrError) {
        // dispose and cleanup the previously received stream
        // object or an error condition, if any received yet
        this.stream?.dispose();
        delete this.stream;
        delete this._errorCondition;
        this.receivedTokens = [];
        // cleanup current prompt header object
        this.promptHeader?.dispose();
        delete this.promptHeader;
        // dispose all currently existing references
        this.disposeReferences();
        // if an error received, set up the error condition and stop
        if (streamOrError instanceof ResolveError) {
            this._errorCondition = streamOrError;
            this._onUpdate.fire();
            // when error received fire the 'onSettled' event immediately
            this._onSettled.fire(streamOrError);
            return;
        }
        // decode the byte stream to a stream of prompt tokens
        this.stream = ChatPromptCodec.decode(streamOrError);
        /**
         * !NOTE! The order of event subscriptions below is critical here because
         *        the `data` event is also starts the stream, hence changing
         *        the order of event subscriptions can lead to race conditions.
         *        See {@link ReadableStreamEvents} for more info.
         */
        // on error or stream end, dispose the stream and fire the update event
        this.stream.on('error', this.onStreamEnd.bind(this, this.stream));
        this.stream.on('end', this.onStreamEnd.bind(this, this.stream));
        // when some tokens received, process and store the references
        this.stream.on('data', (token) => {
            // store all markdown and prompt token references
            if ((token instanceof MarkdownToken) || (token instanceof PromptToken)) {
                this.receivedTokens.push(token);
            }
            // if a prompt header token received, create a new prompt header instance
            if (token instanceof FrontMatterHeader) {
                return this.createHeader(token);
            }
            // try to convert a prompt variable with data token into a file reference
            if (token instanceof PromptVariableWithData) {
                try {
                    this.handleLinkToken(FileReference.from(token));
                }
                catch (error) {
                    // the `FileReference.from` call might throw if the `PromptVariableWithData` token
                    // can not be converted into a valid `#file` reference, hence we ignore the error
                }
            }
            // note! the `isURL` is a simple check and needs to be improved to truly
            // 		 handle only file references, ignoring broken URLs or references
            if (token instanceof MarkdownLink && !token.isURL) {
                this.handleLinkToken(token);
            }
        });
        // calling `start` on a disposed stream throws, so we warn and return instead
        if (this.stream.isDisposed) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] cannot start stream that has been already disposed, aborting`);
            return;
        }
        // start receiving data on the stream
        this.stream.start();
    }
    /**
     * Create header object base on the target prompt file language ID.
     * The language ID is important here, because it defines what type
     * of metadata is valid for a prompt file and what type of related
     * diagnostics we would show to the user.
     */
    createHeader(headerToken) {
        const { languageId } = this.promptContentsProvider;
        if (languageId === PROMPT_LANGUAGE_ID) {
            this.promptHeader = new PromptHeader(headerToken, languageId);
        }
        if (languageId === INSTRUCTIONS_LANGUAGE_ID) {
            this.promptHeader = new InstructionsHeader(headerToken, languageId);
        }
        if (languageId === MODE_LANGUAGE_ID) {
            this.promptHeader = new ModeHeader(headerToken, languageId);
        }
        this.promptHeader?.start();
    }
    /**
     * Handle a new reference token inside prompt contents.
     */
    handleLinkToken(token) {
        let referenceUri;
        if (path.isAbsolute(token.path)) {
            referenceUri = URI.file(token.path);
            if (this.envService.remoteAuthority) {
                referenceUri = referenceUri.with({
                    scheme: Schemas.vscodeRemote,
                    authority: this.envService.remoteAuthority,
                });
            }
        }
        else {
            referenceUri = joinPath(dirname(this.uri), token.path);
        }
        this._references.push(new PromptReference(referenceUri, token));
        this._onUpdate.fire();
        return this;
    }
    /**
     * Handle the `stream` end event.
     *
     * @param stream The stream that has ended.
     * @param error Optional error object if stream ended with an error.
     */
    onStreamEnd(stream, error) {
        // decoders can fire the 'end' event also when they are get disposed,
        // but because we dispose them when a new stream is received, we can
        // safely ignore the event in this case
        if (stream.isDisposed === true) {
            return this;
        }
        if (error) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] received an error on the chat prompt decoder stream: ${error}`);
        }
        this._onUpdate.fire();
        this._onSettled.fire(error);
        return this;
    }
    disposeReferences() {
        this._references.length = 0;
    }
    /**
     * Start the prompt parser.
     */
    start(token) {
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        // if already in the error state that could be set
        // in the constructor, then nothing to do
        if (this.errorCondition) {
            return this;
        }
        this.promptContentsProvider.start(token);
        return this;
    }
    /**
     * Associated URI of the prompt.
     */
    get uri() {
        return this.promptContentsProvider.uri;
    }
    /**
     * Get a list of immediate child references of the prompt.
     */
    get references() {
        return [...this._references];
    }
    /**
     * Valid metadata records defined in the prompt header.
     */
    get metadata() {
        const { promptType } = this.promptContentsProvider;
        if (promptType === 'non-prompt') {
            return null;
        }
        if (this.header === undefined) {
            return { promptType };
        }
        if (this.header instanceof InstructionsHeader || this.header instanceof ModeHeader) {
            return { promptType, ...this.header.metadata };
        }
        const { tools, mode, description, model } = this.header.metadata;
        const result = {};
        if (description !== undefined) {
            result.description = description;
        }
        if (tools !== undefined && mode !== ChatModeKind.Ask && mode !== ChatModeKind.Edit) {
            result.tools = tools;
            result.mode = ChatModeKind.Agent;
        }
        else if (mode !== undefined) {
            result.mode = mode;
        }
        if (model !== undefined) {
            result.model = model;
        }
        return { promptType, ...result };
    }
    /**
     * The top most error of the current reference or any of its
     * possible child reference errors.
     */
    get topError() {
        if (this.errorCondition) {
            return new TopError({
                errorSubject: 'root',
                errorsCount: 1,
                originalError: this.errorCondition,
            });
        }
        return undefined;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt:${this.uri.path}`;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.disposeReferences();
        this.stream?.dispose();
        delete this.stream;
        this.promptHeader?.dispose();
        delete this.promptHeader;
        super.dispose();
    }
};
BasePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ILogService)
], BasePromptParser);
export { BasePromptParser };
/**
 * Prompt reference object represents any reference inside prompt text
 * contents. For instance the file variable(`#file:/path/to/file.md`) or
 * a markdown link(`[#file:file.md](/path/to/file.md)`).
 */
export class PromptReference {
    constructor(uri, token) {
        this.uri = uri;
        this.token = token;
    }
    /**
     * Get the range of the `link` part of the reference.
     */
    get linkRange() {
        // `#file:` references
        if (this.token instanceof FileReference) {
            return this.token.dataRange;
        }
        // `markdown link` references
        if (this.token instanceof MarkdownLink) {
            return this.token.linkRange;
        }
        return undefined;
    }
    /**
     * Type of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get type() {
        if (this.token instanceof FileReference) {
            return 'file';
        }
        if (this.token instanceof MarkdownLink) {
            return 'file';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Subtype of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get subtype() {
        if (this.token instanceof FileReference) {
            return 'prompt';
        }
        if (this.token instanceof MarkdownLink) {
            return 'markdown';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    get range() {
        return this.token.range;
    }
    get path() {
        return this.token.path;
    }
    get text() {
        return this.token.text;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-reference/${this.type}:${this.subtype}/${this.token}`;
    }
}
/**
 * A tiny utility object that helps us to track existence
 * of at least one parse result from the content provider.
 */
class FirstParseResult extends DeferredPromise {
    constructor() {
        super(...arguments);
        /**
         * Private attribute to track if we have
         * received at least one result.
         */
        this._gotResult = false;
    }
    /**
     * Whether we've received at least one result.
     */
    get gotFirstResult() {
        return this._gotResult;
    }
    /**
     * Get underlying promise reference.
     */
    get promise() {
        return this.p;
    }
    /**
     * Complete the underlying promise.
     */
    end() {
        this._gotResult = true;
        super.complete(void 0)
            .catch(() => {
            // the complete method is never fails
            // so we can ignore the error here
        });
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvYmFzZVByb21wdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RCxPQUFPLEtBQUssSUFBSSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSTVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlD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