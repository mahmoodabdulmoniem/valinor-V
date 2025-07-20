/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
export var OmittedState;
(function (OmittedState) {
    OmittedState[OmittedState["NotOmitted"] = 0] = "NotOmitted";
    OmittedState[OmittedState["Partial"] = 1] = "Partial";
    OmittedState[OmittedState["Full"] = 2] = "Full";
})(OmittedState || (OmittedState = {}));
export var IDiagnosticVariableEntryFilterData;
(function (IDiagnosticVariableEntryFilterData) {
    IDiagnosticVariableEntryFilterData.icon = Codicon.error;
    function fromMarker(marker) {
        return {
            filterUri: marker.resource,
            owner: marker.owner,
            problemMessage: marker.message,
            filterRange: { startLineNumber: marker.startLineNumber, endLineNumber: marker.endLineNumber, startColumn: marker.startColumn, endColumn: marker.endColumn }
        };
    }
    IDiagnosticVariableEntryFilterData.fromMarker = fromMarker;
    function toEntry(data) {
        return {
            id: id(data),
            name: label(data),
            icon: IDiagnosticVariableEntryFilterData.icon,
            value: data,
            kind: 'diagnostic',
            ...data,
        };
    }
    IDiagnosticVariableEntryFilterData.toEntry = toEntry;
    function id(data) {
        return [data.filterUri, data.owner, data.filterSeverity, data.filterRange?.startLineNumber].join(':');
    }
    IDiagnosticVariableEntryFilterData.id = id;
    function label(data) {
        let TrimThreshold;
        (function (TrimThreshold) {
            TrimThreshold[TrimThreshold["MaxChars"] = 30] = "MaxChars";
            TrimThreshold[TrimThreshold["MaxSpaceLookback"] = 10] = "MaxSpaceLookback";
        })(TrimThreshold || (TrimThreshold = {}));
        if (data.problemMessage) {
            if (data.problemMessage.length < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage;
            }
            // Trim the message, on a space if it would not lose too much
            // data (MaxSpaceLookback) or just blindly otherwise.
            const lastSpace = data.problemMessage.lastIndexOf(' ', 30 /* TrimThreshold.MaxChars */);
            if (lastSpace === -1 || lastSpace + 10 /* TrimThreshold.MaxSpaceLookback */ < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage.substring(0, 30 /* TrimThreshold.MaxChars */) + '…';
            }
            return data.problemMessage.substring(0, lastSpace) + '…';
        }
        let labelStr = localize('chat.attachment.problems.all', "All Problems");
        if (data.filterUri) {
            labelStr = localize('chat.attachment.problems.inFile', "Problems in {0}", basename(data.filterUri));
        }
        return labelStr;
    }
    IDiagnosticVariableEntryFilterData.label = label;
})(IDiagnosticVariableEntryFilterData || (IDiagnosticVariableEntryFilterData = {}));
export var IChatRequestVariableEntry;
(function (IChatRequestVariableEntry) {
    /**
     * Returns URI of the passed variant entry. Return undefined if not found.
     */
    function toUri(entry) {
        return URI.isUri(entry.value)
            ? entry.value
            : isLocation(entry.value)
                ? entry.value.uri
                : undefined;
    }
    IChatRequestVariableEntry.toUri = toUri;
})(IChatRequestVariableEntry || (IChatRequestVariableEntry = {}));
export function isImplicitVariableEntry(obj) {
    return obj.kind === 'implicit';
}
export function isPasteVariableEntry(obj) {
    return obj.kind === 'paste';
}
export function isImageVariableEntry(obj) {
    return obj.kind === 'image';
}
export function isNotebookOutputVariableEntry(obj) {
    return obj.kind === 'notebookOutput';
}
export function isElementVariableEntry(obj) {
    return obj.kind === 'element';
}
export function isDiagnosticsVariableEntry(obj) {
    return obj.kind === 'diagnostic';
}
export function isChatRequestFileEntry(obj) {
    return obj.kind === 'file';
}
export function isPromptFileVariableEntry(obj) {
    return obj.kind === 'promptFile';
}
export function isPromptTextVariableEntry(obj) {
    return obj.kind === 'promptText';
}
export function isChatRequestVariableEntry(obj) {
    const entry = obj;
    return typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string';
}
export function isSCMHistoryItemVariableEntry(obj) {
    return obj.kind === 'scmHistoryItem';
}
export var PromptFileVariableKind;
(function (PromptFileVariableKind) {
    PromptFileVariableKind["Instruction"] = "vscode.prompt.instructions.root";
    PromptFileVariableKind["InstructionReference"] = "vscode.prompt.instructions";
    PromptFileVariableKind["PromptFile"] = "vscode.prompt.file";
})(PromptFileVariableKind || (PromptFileVariableKind = {}));
/**
 * Utility to convert a {@link uri} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt instructions references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt instructions references
 * - `vscode.prompt.file__<URI>`: for prompt file references
 *
 * @param uri A resource URI that points to a prompt instructions file.
 * @param kind The kind of the prompt file variable entry.
 */
export function toPromptFileVariableEntry(uri, kind, originLabel, automaticallyAdded = false) {
    //  `id` for all `prompt files` starts with the well-defined part that the copilot extension(or other chatbot) can rely on
    return {
        id: `${kind}__${uri.toString()}`,
        name: `prompt:${basename(uri)}`,
        value: uri,
        kind: 'promptFile',
        modelDescription: 'Prompt instructions file',
        isRoot: kind !== PromptFileVariableKind.InstructionReference,
        originLabel,
        automaticallyAdded
    };
}
export function toPromptTextVariableEntry(content, settingId, automaticallyAdded = false) {
    return {
        id: `vscode.prompt.instructions.text${settingId ? `.${settingId}` : ''}`,
        name: `prompt:text`,
        value: content,
        settingId,
        kind: 'promptText',
        modelDescription: 'Prompt instructions text',
        automaticallyAdded
    };
}
export function toFileVariableEntry(uri, range) {
    return {
        kind: 'file',
        value: range ? { uri, range } : uri,
        id: uri.toString() + (range?.toString() ?? ''),
        name: basename(uri),
    };
}
export class ChatRequestVariableSet {
    constructor(entries) {
        this._ids = new Set();
        this._entries = [];
        if (entries) {
            this.add(...entries);
        }
    }
    add(...entry) {
        for (const e of entry) {
            if (!this._ids.has(e.id)) {
                this._ids.add(e.id);
                this._entries.push(e);
            }
        }
    }
    insertFirst(entry) {
        if (!this._ids.has(entry.id)) {
            this._ids.add(entry.id);
            this._entries.unshift(entry);
        }
    }
    remove(entry) {
        this._ids.delete(entry.id);
        this._entries = this._entries.filter(e => e.id !== entry.id);
    }
    has(entry) {
        return this._ids.has(entry.id);
    }
    asArray() {
        return this._entries.slice(0); // return a copy
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlRW50cmllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFZhcmlhYmxlRW50cmllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdyRCxPQUFPLEVBQUUsVUFBVSxFQUF3QixNQUFNLHdDQUF3QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQXFDOUMsTUFBTSxDQUFOLElBQWtCLFlBSWpCO0FBSkQsV0FBa0IsWUFBWTtJQUM3QiwyREFBVSxDQUFBO0lBQ1YscURBQU8sQ0FBQTtJQUNQLCtDQUFJLENBQUE7QUFDTCxDQUFDLEVBSmlCLFlBQVksS0FBWixZQUFZLFFBSTdCO0FBb0VELE1BQU0sS0FBVyxrQ0FBa0MsQ0FvRGxEO0FBcERELFdBQWlCLGtDQUFrQztJQUNyQyx1Q0FBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFFbEMsU0FBZ0IsVUFBVSxDQUFDLE1BQWU7UUFDekMsT0FBTztZQUNOLFNBQVMsRUFBRSxNQUFNLENBQUMsUUFBUTtZQUMxQixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDbkIsY0FBYyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQzlCLFdBQVcsRUFBRSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVyxF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