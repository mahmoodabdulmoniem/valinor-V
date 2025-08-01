"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsDocument = void 0;
const vscode = __importStar(require("vscode"));
const jsonc_parser_1 = require("jsonc-parser");
const extensionsProposals_1 = require("./extensionsProposals");
const OVERRIDE_IDENTIFIER_REGEX = /\[([^\[\]]*)\]/g;
class SettingsDocument {
    constructor(document) {
        this.document = document;
    }
    async provideCompletionItems(position, _token) {
        const location = (0, jsonc_parser_1.getLocation)(this.document.getText(), this.document.offsetAt(position));
        // window.title
        if (location.path[0] === 'window.title') {
            return this.provideWindowTitleCompletionItems(location, position);
        }
        // files.association
        if (location.path[0] === 'files.associations') {
            return this.provideFilesAssociationsCompletionItems(location, position);
        }
        // files.exclude, search.exclude, explorer.autoRevealExclude
        if (location.path[0] === 'files.exclude' || location.path[0] === 'search.exclude' || location.path[0] === 'explorer.autoRevealExclude') {
            return this.provideExcludeCompletionItems(location, position);
        }
        // files.defaultLanguage
        if (location.path[0] === 'files.defaultLanguage') {
            return this.provideLanguageCompletionItems(location, position);
        }
        // workbench.editor.label
        if (location.path[0] === 'workbench.editor.label.patterns') {
            return this.provideEditorLabelCompletionItems(location, position);
        }
        // settingsSync.ignoredExtensions
        if (location.path[0] === 'settingsSync.ignoredExtensions') {
            let ignoredExtensions = [];
            try {
                ignoredExtensions = (0, jsonc_parser_1.parse)(this.document.getText())['settingsSync.ignoredExtensions'];
            }
            catch (e) { /* ignore error */ }
            const range = this.getReplaceRange(location, position);
            return (0, extensionsProposals_1.provideInstalledExtensionProposals)(ignoredExtensions, '', range, true);
        }
        // remote.extensionKind
        if (location.path[0] === 'remote.extensionKind' && location.path.length === 2 && location.isAtPropertyKey) {
            let alreadyConfigured = [];
            try {
                alreadyConfigured = Object.keys((0, jsonc_parser_1.parse)(this.document.getText())['remote.extensionKind']);
            }
            catch (e) { /* ignore error */ }
            const range = this.getReplaceRange(location, position);
            return (0, extensionsProposals_1.provideInstalledExtensionProposals)(alreadyConfigured, location.previousNode ? '' : `: [\n\t"ui"\n]`, range, true);
        }
        // remote.portsAttributes
        if (location.path[0] === 'remote.portsAttributes' && location.path.length === 2 && location.isAtPropertyKey) {
            return this.providePortsAttributesCompletionItem(this.getReplaceRange(location, position));
        }
        return this.provideLanguageOverridesCompletionItems(location, position);
    }
    getReplaceRange(location, position) {
        const node = location.previousNode;
        if (node) {
            const nodeStart = this.document.positionAt(node.offset), nodeEnd = this.document.positionAt(node.offset + node.length);
            if (nodeStart.isBeforeOrEqual(position) && nodeEnd.isAfterOrEqual(position)) {
                return new vscode.Range(nodeStart, nodeEnd);
            }
        }
        return new vscode.Range(position, position);
    }
    isCompletingPropertyValue(location, pos) {
        if (location.isAtPropertyKey) {
            return false;
        }
        const previousNode = location.previousNode;
        if (previousNode) {
            const offset = this.document.offsetAt(pos);
            return offset >= previousNode.offset && offset <= previousNode.offset + previousNode.length;
        }
        return true;
    }
    async provideWindowTitleCompletionItems(location, pos) {
        const completions = [];
        if (!this.isCompletingPropertyValue(location, pos)) {
            return completions;
        }
        let range = this.document.getWordRangeAtPosition(pos, /\$\{[^"\}]*\}?/);
        if (!range || range.start.isEqual(pos) || range.end.isEqual(pos) && this.document.getText(range).endsWith('}')) {
            range = new vscode.Range(pos, pos);
        }
        const getText = (variable) => {
            const text = '${' + variable + '}';
            return location.previousNode ? text : JSON.stringify(text);
        };
        completions.push(this.newSimpleCompletionItem(getText('activeEditorShort'), range, vscode.l10n.t("the file name (e.g. myFile.txt)")));
        completions.push(this.newSimpleCompletionItem(getText('activeEditorMedium'), range, vscode.l10n.t("the path of the file relative to the workspace folder (e.g. myFolder/myFileFolder/myFile.txt)")));
        completions.push(this.newSimpleCompletionItem(getText('activeEditorLong'), range, vscode.l10n.t("the full path of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt)")));
        completions.push(this.newSimpleCompletionItem(getText('activeFolderShort'), range, vscode.l10n.t("the name of the folder the file is contained in (e.g. myFileFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('activeFolderMedium'), range, vscode.l10n.t("the path of the folder the file is contained in, relative to the workspace folder (e.g. myFolder/myFileFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('activeFolderLong'), range, vscode.l10n.t("the full path of the folder the file is contained in (e.g. /Users/Development/myFolder/myFileFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('rootName'), range, vscode.l10n.t("name of the workspace with optional remote name and workspace indicator if applicable (e.g. myFolder, myRemoteFolder [SSH] or myWorkspace (Workspace))")));
        completions.push(this.newSimpleCompletionItem(getText('rootNameShort'), range, vscode.l10n.t("shortened name of the workspace without suffixes (e.g. myFolder or myWorkspace)")));
        completions.push(this.newSimpleCompletionItem(getText('rootPath'), range, vscode.l10n.t("file path of the workspace (e.g. /Users/Development/myWorkspace)")));
        completions.push(this.newSimpleCompletionItem(getText('folderName'), range, vscode.l10n.t("name of the workspace folder the file is contained in (e.g. myFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('folderPath'), range, vscode.l10n.t("file path of the workspace folder the file is contained in (e.g. /Users/Development/myFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('appName'), range, vscode.l10n.t("e.g. VS Code")));
        completions.push(this.newSimpleCompletionItem(getText('remoteName'), range, vscode.l10n.t("e.g. SSH")));
        completions.push(this.newSimpleCompletionItem(getText('dirty'), range, vscode.l10n.t("an indicator for when the active editor has unsaved changes")));
        completions.push(this.newSimpleCompletionItem(getText('separator'), range, vscode.l10n.t("a conditional separator (' - ') that only shows when surrounded by variables with values")));
        completions.push(this.newSimpleCompletionItem(getText('activeRepositoryName'), range, vscode.l10n.t("the name of the active repository (e.g. vscode)")));
        completions.push(this.newSimpleCompletionItem(getText('activeRepositoryBranchName'), range, vscode.l10n.t("the name of the active branch in the active repository (e.g. main)")));
        completions.push(this.newSimpleCompletionItem(getText('activeEditorState'), range, vscode.l10n.t("the state of the active editor (e.g. modified).")));
        return completions;
    }
    async provideEditorLabelCompletionItems(location, pos) {
        const completions = [];
        if (!this.isCompletingPropertyValue(location, pos)) {
            return completions;
        }
        let range = this.document.getWordRangeAtPosition(pos, /\$\{[^"\}]*\}?/);
        if (!range || range.start.isEqual(pos) || range.end.isEqual(pos) && this.document.getText(range).endsWith('}')) {
            range = new vscode.Range(pos, pos);
        }
        const getText = (variable) => {
            const text = '${' + variable + '}';
            return location.previousNode ? text : JSON.stringify(text);
        };
        completions.push(this.newSimpleCompletionItem(getText('dirname'), range, vscode.l10n.t("The parent folder name of the editor (e.g. myFileFolder)")));
        completions.push(this.newSimpleCompletionItem(getText('dirname(1)'), range, vscode.l10n.t("The nth parent folder name of the editor")));
        completions.push(this.newSimpleCompletionItem(getText('filename'), range, vscode.l10n.t("The file name of the editor without its directory or extension (e.g. myFile)")));
        completions.push(this.newSimpleCompletionItem(getText('extname'), range, vscode.l10n.t("The file extension of the editor (e.g. txt)")));
        return completions;
    }
    async provideFilesAssociationsCompletionItems(location, position) {
        const completions = [];
        if (location.path.length === 2) {
            // Key
            if (location.path[1] === '') {
                const range = this.getReplaceRange(location, position);
                completions.push(this.newSnippetCompletionItem({
                    label: vscode.l10n.t("Files with Extension"),
                    documentation: vscode.l10n.t("Map all files matching the glob pattern in their filename to the language with the given identifier."),
                    snippet: location.isAtPropertyKey ? '"*.${1:extension}": "${2:language}"' : '{ "*.${1:extension}": "${2:language}" }',
                    range
                }));
                completions.push(this.newSnippetCompletionItem({
                    label: vscode.l10n.t("Files with Path"),
                    documentation: vscode.l10n.t("Map all files matching the absolute path glob pattern in their path to the language with the given identifier."),
                    snippet: location.isAtPropertyKey ? '"/${1:path to file}/*.${2:extension}": "${3:language}"' : '{ "/${1:path to file}/*.${2:extension}": "${3:language}" }',
                    range
                }));
            }
            else if (this.isCompletingPropertyValue(location, position)) {
                // Value
                return this.provideLanguageCompletionItemsForLanguageOverrides(this.getReplaceRange(location, position));
            }
        }
        return completions;
    }
    async provideExcludeCompletionItems(location, position) {
        const completions = [];
        // Key
        if (location.path.length === 1 || (location.path.length === 2 && location.path[1] === '')) {
            const range = this.getReplaceRange(location, position);
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Files by Extension"),
                documentation: vscode.l10n.t("Match all files of a specific file extension."),
                snippet: location.path.length === 2 ? '"**/*.${1:extension}": true' : '{ "**/*.${1:extension}": true }',
                range
            }));
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Files with Multiple Extensions"),
                documentation: vscode.l10n.t("Match all files with any of the file extensions."),
                snippet: location.path.length === 2 ? '"**/*.{ext1,ext2,ext3}": true' : '{ "**/*.{ext1,ext2,ext3}": true }',
                range
            }));
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Files with Siblings by Name"),
                documentation: vscode.l10n.t("Match files that have siblings with the same name but a different extension."),
                snippet: location.path.length === 2 ? '"**/*.${1:source-extension}": { "when": "$(basename).${2:target-extension}" }' : '{ "**/*.${1:source-extension}": { "when": "$(basename).${2:target-extension}" } }',
                range
            }));
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Folder by Name (Top Level)"),
                documentation: vscode.l10n.t("Match a top level folder with a specific name."),
                snippet: location.path.length === 2 ? '"${1:name}": true' : '{ "${1:name}": true }',
                range
            }));
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Folders with Multiple Names (Top Level)"),
                documentation: vscode.l10n.t("Match multiple top level folders."),
                snippet: location.path.length === 2 ? '"{folder1,folder2,folder3}": true' : '{ "{folder1,folder2,folder3}": true }',
                range
            }));
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Folder by Name (Any Location)"),
                documentation: vscode.l10n.t("Match a folder with a specific name in any location."),
                snippet: location.path.length === 2 ? '"**/${1:name}": true' : '{ "**/${1:name}": true }',
                range
            }));
        }
        // Value
        else if (location.path.length === 2 && this.isCompletingPropertyValue(location, position)) {
            const range = this.getReplaceRange(location, position);
            completions.push(this.newSnippetCompletionItem({
                label: vscode.l10n.t("Files with Siblings by Name"),
                documentation: vscode.l10n.t("Match files that have siblings with the same name but a different extension."),
                snippet: '{ "when": "$(basename).${1:extension}" }',
                range
            }));
        }
        return completions;
    }
    async provideLanguageCompletionItems(location, position) {
        if (location.path.length === 1 && this.isCompletingPropertyValue(location, position)) {
            const range = this.getReplaceRange(location, position);
            const languages = await vscode.languages.getLanguages();
            return [
                this.newSimpleCompletionItem(JSON.stringify('${activeEditorLanguage}'), range, vscode.l10n.t("Use the language of the currently active text editor if any")),
                ...languages.map(l => this.newSimpleCompletionItem(JSON.stringify(l), range))
            ];
        }
        return [];
    }
    async provideLanguageCompletionItemsForLanguageOverrides(range) {
        const languages = await vscode.languages.getLanguages();
        const completionItems = [];
        for (const language of languages) {
            const item = new vscode.CompletionItem(JSON.stringify(language));
            item.kind = vscode.CompletionItemKind.Property;
            item.range = range;
            completionItems.push(item);
        }
        return completionItems;
    }
    async provideLanguageOverridesCompletionItems(location, position) {
        if (location.path.length === 1 && location.isAtPropertyKey && location.previousNode && typeof location.previousNode.value === 'string' && location.previousNode.value.startsWith('[')) {
            const startPosition = this.document.positionAt(location.previousNode.offset + 1);
            const endPosition = startPosition.translate(undefined, location.previousNode.value.length);
            const donotSuggestLanguages = [];
            const languageOverridesRanges = [];
            let matches = OVERRIDE_IDENTIFIER_REGEX.exec(location.previousNode.value);
            let lastLanguageOverrideRange;
            while (matches?.length) {
                lastLanguageOverrideRange = new vscode.Range(this.document.positionAt(location.previousNode.offset + 1 + matches.index), this.document.positionAt(location.previousNode.offset + 1 + matches.index + matches[0].length));
                languageOverridesRanges.push(lastLanguageOverrideRange);
                /* Suggest the configured language if the position is in the match range */
                if (!lastLanguageOverrideRange.contains(position)) {
                    donotSuggestLanguages.push(matches[1].trim());
                }
                matches = OVERRIDE_IDENTIFIER_REGEX.exec(location.previousNode.value);
            }
            const lastLanguageOverrideEndPosition = lastLanguageOverrideRange ? lastLanguageOverrideRange.end : startPosition;
            if (lastLanguageOverrideEndPosition.isBefore(endPosition)) {
                languageOverridesRanges.push(new vscode.Range(lastLanguageOverrideEndPosition, endPosition));
            }
            const languageOverrideRange = languageOverridesRanges.find(range => range.contains(position));
            /**
             *  Skip if suggestions are for first language override range
             *  Since VSCode registers language overrides to the schema, JSON language server does suggestions for first language override.
             */
            if (languageOverrideRange && !languageOverrideRange.isEqual(languageOverridesRanges[0])) {
                const languages = await vscode.languages.getLanguages();
                const completionItems = [];
                for (const language of languages) {
                    if (!donotSuggestLanguages.includes(language)) {
                        const item = new vscode.CompletionItem(`[${language}]`);
                        item.kind = vscode.CompletionItemKind.Property;
                        item.range = languageOverrideRange;
                        completionItems.push(item);
                    }
                }
                return completionItems;
            }
        }
        return [];
    }
    providePortsAttributesCompletionItem(range) {
        return [this.newSnippetCompletionItem({
                label: '\"3000\"',
                documentation: 'Single Port Attribute',
                range,
                snippet: '\n  \"${1:3000}\": {\n    \"label\": \"${2:Application}\",\n    \"onAutoForward\": \"${3:openPreview}\"\n  }\n'
            }),
            this.newSnippetCompletionItem({
                label: '\"5000-6000\"',
                documentation: 'Ranged Port Attribute',
                range,
                snippet: '\n  \"${1:40000-55000}\": {\n    \"onAutoForward\": \"${2:ignore}\"\n  }\n'
            }),
            this.newSnippetCompletionItem({
                label: '\".+\\\\/server.js\"',
                documentation: 'Command Match Port Attribute',
                range,
                snippet: '\n  \"${1:.+\\\\/server.js\}\": {\n    \"label\": \"${2:Application}\",\n    \"onAutoForward\": \"${3:openPreview}\"\n  }\n'
            })
        ];
    }
    newSimpleCompletionItem(text, range, description, insertText) {
        const item = new vscode.CompletionItem(text);
        item.kind = vscode.CompletionItemKind.Value;
        item.detail = description;
        item.insertText = insertText ? insertText : text;
        item.range = range;
        return item;
    }
    newSnippetCompletionItem(o) {
        const item = new vscode.CompletionItem(o.label);
        item.kind = vscode.CompletionItemKind.Value;
        item.documentation = o.documentation;
        item.insertText = new vscode.SnippetString(o.snippet);
        item.range = o.range;
        return item;
    }
}
exports.SettingsDocument = SettingsDocument;
//# sourceMappingURL=settingsDocumentHelper.js.map