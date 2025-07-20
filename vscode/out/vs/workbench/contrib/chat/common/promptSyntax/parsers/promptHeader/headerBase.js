/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { ObjectStream } from '../../codecs/base/utils/objectStream.js';
import { PromptMetadataError, PromptMetadataWarning } from './diagnostics.js';
import { SimpleToken } from '../../codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterRecord } from '../../codecs/base/frontMatterCodec/tokens/index.js';
import { FrontMatterDecoder } from '../../codecs/base/frontMatterCodec/frontMatterDecoder.js';
import { PromptDescriptionMetadata } from './metadata/description.js';
/**
 * Base class for prompt/instruction/mode headers.
 */
export class HeaderBase extends Disposable {
    /**
     * Data object with all header's metadata records.
     */
    get metadata() {
        const result = {};
        for (const [entryName, entryValue] of Object.entries(this.meta)) {
            if (entryValue?.value === undefined) {
                continue;
            }
            // note! we have to resort to `Object.assign()` here because
            //       the `Object.entries()` call looses type information
            Object.assign(result, {
                [entryName]: entryValue.value,
            });
        }
        return result;
    }
    /**
     * A copy of metadata object with utility classes as values
     * for each of prompt header's record.
     *
     * Please use {@link metadata} instead if all you need to read is
     * the plain "data" object representation of valid metadata records.
     */
    get metadataUtility() {
        return { ...this.meta };
    }
    /**
     * List of all diagnostic issues found while parsing
     * the prompt header.
     */
    get diagnostics() {
        return this.issues;
    }
    /**
     * Full range of the header in the original document.
     */
    get range() {
        return this.token.range;
    }
    constructor(token, languageId) {
        super();
        this.token = token;
        this.languageId = languageId;
        this.issues = [];
        this.meta = {};
        this.recordNames = new Set();
        this.stream = this._register(new FrontMatterDecoder(ObjectStream.fromArray([...token.contentToken.children])));
        this.stream.onData(this.onData.bind(this));
        this.stream.onError(this.onError.bind(this));
    }
    /**
     * Process front matter tokens, converting them into
     * well-known prompt metadata records.
     */
    onData(token) {
        // we currently expect only front matter 'records' for
        // the prompt metadata, hence add diagnostics for all
        // other tokens and ignore them
        if ((token instanceof FrontMatterRecord) === false) {
            // unless its a simple token, in which case we just ignore it
            if (token instanceof SimpleToken) {
                return;
            }
            this.issues.push(new PromptMetadataError(token.range, localize('prompt.header.diagnostics.unexpected-token', "Unexpected token '{0}'.", token.text)));
            return;
        }
        const recordName = token.nameToken.text;
        // if we already have a record with this name,
        // add a warning diagnostic and ignore it
        if (this.recordNames.has(recordName)) {
            this.issues.push(new PromptMetadataWarning(token.range, localize('prompt.header.metadata.diagnostics.duplicate-record', "Duplicate property '{0}' will be ignored.", recordName)));
            return;
        }
        this.recordNames.add(recordName);
        // if the record might be a "description" metadata
        // add it to the list of parsed metadata records
        if (PromptDescriptionMetadata.isDescriptionRecord(token)) {
            const metadata = new PromptDescriptionMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.description = metadata;
            this.recordNames.add(recordName);
            return;
        }
        // pipe the token to the actual implementation class
        // that might to handle it based on the token type
        if (this.handleToken(token)) {
            return;
        }
        // all other records are "unknown" ones
        this.issues.push(new PromptMetadataWarning(token.range, localize('prompt.header.metadata.diagnostics.unknown-record', "Unknown property '{0}' will be ignored.", recordName)));
    }
    /**
     * Process errors from the underlying front matter decoder.
     */
    onError(error) {
        this.issues.push(new PromptMetadataError(this.token.range, localize('prompt.header.diagnostics.parsing-error', "Failed to parse prompt header: {0}", error.message)));
    }
    /**
     * Promise that resolves when parsing process of
     * the prompt header completes.
     */
    get settled() {
        return this.stream.settled;
    }
    /**
     * Starts the parsing process of the prompt header.
     */
    start() {
        this.stream.start();
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhZGVyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL2hlYWRlckJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBS3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFvQixNQUFNLGtCQUFrQixDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixPQUFPLEVBQUUsa0JBQWtCLEVBQTBCLE1BQU0sMERBQTBELENBQUM7QUFDdEgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUE4QnRFOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixVQUVwQixTQUFRLFVBQVU7SUFXbkI7O09BRUc7SUFDSCxJQUFXLFFBQVE7UUFDbEIsTUFBTSxNQUFNLEdBQW9DLEVBQUUsQ0FBQztRQUVuRCxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqRSxJQUFJLFVBQVUsRUFBRSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3JDLFNBQVM7WUFDVixDQUFDO1lBRUQsNERBQTREO1lBQzVELDRE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