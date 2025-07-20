/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const privateSymbol = Symbol('TextModelEditSource');
export class TextModelEditSource {
    constructor(metadata, _privateCtorGuard) {
        this.metadata = metadata;
    }
    toString() {
        return `${this.metadata.source}`;
    }
    getType() {
        const metadata = this.metadata;
        switch (metadata.source) {
            case 'cursor':
                return metadata.kind;
            case 'inlineCompletionAccept':
                return metadata.source + (metadata.$nes ? ':nes' : '');
            case 'unknown':
                return metadata.name || 'unknown';
            default:
                return metadata.source;
        }
    }
    /**
     * Converts the metadata to a key string.
     * Only includes properties/values that have `level` many `$` prefixes or less.
    */
    toKey(level, filter = {}) {
        const metadata = this.metadata;
        const keys = Object.entries(metadata).filter(([key, value]) => {
            const filterVal = filter[key];
            if (filterVal !== undefined) {
                return filterVal;
            }
            const prefixCount = (key.match(/\$/g) || []).length;
            return prefixCount <= level && value !== undefined && value !== null && value !== '';
        }).map(([key, value]) => `${key}:${value}`);
        return keys.join('-');
    }
    get props() {
        return this.metadata;
    }
}
function createEditSource(metadata) {
    return new TextModelEditSource(metadata, privateSymbol);
}
export const EditSources = {
    unknown(data) {
        return createEditSource({
            source: 'unknown',
            name: data.name,
        });
    },
    rename: () => createEditSource({ source: 'rename' }),
    chatApplyEdits(data) {
        return createEditSource({
            source: 'Chat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
        });
    },
    chatUndoEdits: () => createEditSource({ source: 'Chat.undoEdits' }),
    chatReset: () => createEditSource({ source: 'Chat.reset' }),
    inlineCompletionAccept(data) {
        return createEditSource({
            source: 'inlineCompletionAccept',
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
        });
    },
    inlineCompletionPartialAccept(data) {
        return createEditSource({
            source: 'inlineCompletionPartialAccept',
            type: data.type,
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
        });
    },
    inlineChatApplyEdit(data) {
        return createEditSource({
            source: 'inlineChat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
        });
    },
    reloadFromDisk: () => createEditSource({ source: 'reloadFromDisk' }),
    cursor(data) {
        return createEditSource({
            source: 'cursor',
            kind: data.kind,
            detailedSource: data.detailedSource,
        });
    },
    setValue: () => createEditSource({ source: 'setValue' }),
    eolChange: () => createEditSource({ source: 'eolChange' }),
    applyEdits: () => createEditSource({ source: 'applyEdits' }),
    snippet: () => createEditSource({ source: 'snippet' }),
    suggest: (data) => createEditSource({ source: 'suggest', ...toProperties(data.providerId) }),
    codeAction: (data) => createEditSource({ source: 'codeAction', $kind: data.kind, ...toProperties(data.providerId) })
};
function toProperties(version) {
    if (!version) {
        return {};
    }
    return {
        $extensionId: version.extensionId,
        $extensionVersion: version.extensionVersion,
        $providerId: version.providerId,
    };
}
function avoidPathRedaction(str) {
    if (str === undefined) {
        return undefined;
    }
    // To avoid false-positive file path redaction.
    return str.replaceAll('/', '|');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRWRpdFNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90ZXh0TW9kZWxFZGl0U291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBRXBELE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDaUIsUUFBc0MsRUFDdEQsaUJBQXVDO1FBRHZCLGFBQVEsR0FBUixRQUFRLENBQThCO0lBRW5ELENBQUM7SUFFRSxRQUFRO1FBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVNLE9BQU87UUFDYixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLFFBQVEsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pCLEtBQUssUUFBUTtnQkFDWixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7WUFDdEIsS0FBSyx3QkFBd0I7Z0JBQzVCLE9BQU8sUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEQsS0FBSyxTQUFTO2dCQUNiLE9BQU8sUUFBUSxDQUFDLElBQUksSUFBSSxTQUFTLENBQUM7WUFDbkM7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRUQ7OztNQUdFO0lBQ0ssS0FBSyxDQUFDLEtBQWEsRUFBRSxTQUFtRSxFQUFFO1FBQ2hHLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDL0IsTUFBTSxJQUFJLEdB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