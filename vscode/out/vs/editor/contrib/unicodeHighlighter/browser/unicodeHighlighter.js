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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { InvisibleCharacters, isBasicASCII } from '../../../../base/common/strings.js';
import './unicodeHighlighter.css';
import { EditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { inUntrustedWorkspace, unicodeHighlightConfigKeys } from '../../../common/config/editorOptions.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { UnicodeTextModelHighlighter } from '../../../common/services/unicodeTextModelHighlighter.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { MarkdownHover, renderMarkdownHovers } from '../../hover/browser/markdownHoverParticipant.js';
import { BannerController } from './bannerController.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { safeIntl } from '../../../../base/common/date.js';
import { isModelDecorationInComment, isModelDecorationInString, isModelDecorationVisible } from '../../../common/viewModel/viewModelDecoration.js';
export const warningIcon = registerIcon('extensions-warning-message', Codicon.warning, nls.localize('warningIcon', 'Icon shown with a warning message in the extensions editor.'));
let UnicodeHighlighter = class UnicodeHighlighter extends Disposable {
    static { this.ID = 'editor.contrib.unicodeHighlighter'; }
    constructor(_editor, _editorWorkerService, _workspaceTrustService, instantiationService) {
        super();
        this._editor = _editor;
        this._editorWorkerService = _editorWorkerService;
        this._workspaceTrustService = _workspaceTrustService;
        this._highlighter = null;
        this._bannerClosed = false;
        this._updateState = (state) => {
            if (state && state.hasMore) {
                if (this._bannerClosed) {
                    return;
                }
                // This document contains many non-basic ASCII characters.
                const max = Math.max(state.ambiguousCharacterCount, state.nonBasicAsciiCharacterCount, state.invisibleCharacterCount);
                let data;
                if (state.nonBasicAsciiCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyNonBasicAsciiUnicodeCharacters', 'This document contains many non-basic ASCII unicode characters'),
                        command: new DisableHighlightingOfNonBasicAsciiCharactersAction(),
                    };
                }
                else if (state.ambiguousCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyAmbiguousUnicodeCharacters', 'This document contains many ambiguous unicode characters'),
                        command: new DisableHighlightingOfAmbiguousCharactersAction(),
                    };
                }
                else if (state.invisibleCharacterCount >= max) {
                    data = {
                        message: nls.localize('unicodeHighlighting.thisDocumentHasManyInvisibleUnicodeCharacters', 'This document contains many invisible unicode characters'),
                        command: new DisableHighlightingOfInvisibleCharactersAction(),
                    };
                }
                else {
                    throw new Error('Unreachable');
                }
                this._bannerController.show({
                    id: 'unicodeHighlightBanner',
                    message: data.message,
                    icon: warningIcon,
                    actions: [
                        {
                            label: data.command.shortLabel,
                            href: `command:${data.command.desc.id}`
                        }
                    ],
                    onClose: () => {
                        this._bannerClosed = true;
                    },
                });
            }
            else {
                this._bannerController.hide();
            }
        };
        this._bannerController = this._register(instantiationService.createInstance(BannerController, _editor));
        this._register(this._editor.onDidChangeModel(() => {
            this._bannerClosed = false;
            this._updateHighlighter();
        }));
        this._options = _editor.getOption(141 /* EditorOption.unicodeHighlighting */);
        this._register(_workspaceTrustService.onDidChangeTrust(e => {
            this._updateHighlighter();
        }));
        this._register(_editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(141 /* EditorOption.unicodeHighlighting */)) {
                this._options = _editor.getOption(141 /* EditorOption.unicodeHighlighting */);
                this._updateHighlighter();
            }
        }));
        this._updateHighlighter();
    }
    dispose() {
        if (this._highlighter) {
            this._highlighter.dispose();
            this._highlighter = null;
        }
        super.dispose();
    }
    _updateHighlighter() {
        this._updateState(null);
        if (this._highlighter) {
            this._highlighter.dispose();
            this._highlighter = null;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const options = resolveOptions(this._workspaceTrustService.isWorkspaceTrusted(), this._options);
        if ([
            options.nonBasicASCII,
            options.ambiguousCharacters,
            options.invisibleCharacters,
        ].every((option) => option === false)) {
            // Don't do anything if the feature is fully disabled
            return;
        }
        const highlightOptions = {
            nonBasicASCII: options.nonBasicASCII,
            ambiguousCharacters: options.ambiguousCharacters,
            invisibleCharacters: options.invisibleCharacters,
            includeComments: options.includeComments,
            includeStrings: options.includeStrings,
            allowedCodePoints: Object.keys(options.allowedCharacters).map(c => c.codePointAt(0)),
            allowedLocales: Object.keys(options.allowedLocales).map(locale => {
                if (locale === '_os') {
                    const osLocale = safeIntl.NumberFormat().value.resolvedOptions().locale;
                    return osLocale;
                }
                else if (locale === '_vscode') {
                    return platform.language;
                }
                return locale;
            }),
        };
        if (this._editorWorkerService.canComputeUnicodeHighlights(this._editor.getModel().uri)) {
            this._highlighter = new DocumentUnicodeHighlighter(this._editor, highlightOptions, this._updateState, this._editorWorkerService);
        }
        else {
            this._highlighter = new ViewportUnicodeHighlighter(this._editor, highlightOptions, this._updateState);
        }
    }
    getDecorationInfo(decoration) {
        if (this._highlighter) {
            return this._highlighter.getDecorationInfo(decoration);
        }
        return null;
    }
};
UnicodeHighlighter = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, IWorkspaceTrustManagementService),
    __param(3, IInstantiationService)
], UnicodeHighlighter);
export { UnicodeHighlighter };
function resolveOptions(trusted, options) {
    return {
        nonBasicASCII: options.nonBasicASCII === inUntrustedWorkspace ? !trusted : options.nonBasicASCII,
        ambiguousCharacters: options.ambiguousCharacters,
        invisibleCharacters: options.invisibleCharacters,
        includeComments: options.includeComments === inUntrustedWorkspace ? !trusted : options.includeComments,
        includeStrings: options.includeStrings === inUntrustedWorkspace ? !trusted : options.includeStrings,
        allowedCharacters: options.allowedCharacters,
        allowedLocales: options.allowedLocales,
    };
}
let DocumentUnicodeHighlighter = class DocumentUnicodeHighlighter extends Disposable {
    constructor(_editor, _options, _updateState, _editorWorkerService) {
        super();
        this._editor = _editor;
        this._options = _options;
        this._updateState = _updateState;
        this._editorWorkerService = _editorWorkerService;
        this._model = this._editor.getModel();
        this._decorations = this._editor.createDecorationsCollection();
        this._updateSoon = this._register(new RunOnceScheduler(() => this._update(), 250));
        this._register(this._editor.onDidChangeModelContent(() => {
            this._updateSoon.schedule();
        }));
        this._updateSoon.schedule();
    }
    dispose() {
        this._decorations.clear();
        super.dispose();
    }
    _update() {
        if (this._model.isDisposed()) {
            return;
        }
        if (!this._model.mightContainNonBasicASCII()) {
            this._decorations.clear();
            return;
        }
        const modelVersionId = this._model.getVersionId();
        this._editorWorkerService
            .computedUnicodeHighlights(this._model.uri, this._options)
            .then((info) => {
            if (this._model.isDisposed()) {
                return;
            }
            if (this._model.getVersionId() !== modelVersionId) {
                // model changed in the meantime
                return;
            }
            this._updateState(info);
            const decorations = [];
            if (!info.hasMore) {
                // Don't show decoration if there are too many.
                // In this case, a banner is shown.
                for (const range of info.ranges) {
                    decorations.push({
                        range: range,
                        options: Decorations.instance.getDecorationFromOptions(this._options),
                    });
                }
            }
            this._decorations.set(decorations);
        });
    }
    getDecorationInfo(decoration) {
        if (!this._decorations.has(decoration)) {
            return null;
        }
        const model = this._editor.getModel();
        if (!isModelDecorationVisible(model, decoration)) {
            return null;
        }
        const text = model.getValueInRange(decoration.range);
        return {
            reason: computeReason(text, this._options),
            inComment: isModelDecorationInComment(model, decoration),
            inString: isModelDecorationInString(model, decoration),
        };
    }
};
DocumentUnicodeHighlighter = __decorate([
    __param(3, IEditorWorkerService)
], DocumentUnicodeHighlighter);
class ViewportUnicodeHighlighter extends Disposable {
    constructor(_editor, _options, _updateState) {
        super();
        this._editor = _editor;
        this._options = _options;
        this._updateState = _updateState;
        this._model = this._editor.getModel();
        this._decorations = this._editor.createDecorationsCollection();
        this._updateSoon = this._register(new RunOnceScheduler(() => this._update(), 250));
        this._register(this._editor.onDidLayoutChange(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidScrollChange(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidChangeHiddenAreas(() => {
            this._updateSoon.schedule();
        }));
        this._register(this._editor.onDidChangeModelContent(() => {
            this._updateSoon.schedule();
        }));
        this._updateSoon.schedule();
    }
    dispose() {
        this._decorations.clear();
        super.dispose();
    }
    _update() {
        if (this._model.isDisposed()) {
            return;
        }
        if (!this._model.mightContainNonBasicASCII()) {
            this._decorations.clear();
            return;
        }
        const ranges = this._editor.getVisibleRanges();
        const decorations = [];
        const totalResult = {
            ranges: [],
            ambiguousCharacterCount: 0,
            invisibleCharacterCount: 0,
            nonBasicAsciiCharacterCount: 0,
            hasMore: false,
        };
        for (const range of ranges) {
            const result = UnicodeTextModelHighlighter.computeUnicodeHighlights(this._model, this._options, range);
            for (const r of result.ranges) {
                totalResult.ranges.push(r);
            }
            totalResult.ambiguousCharacterCount += totalResult.ambiguousCharacterCount;
            totalResult.invisibleCharacterCount += totalResult.invisibleCharacterCount;
            totalResult.nonBasicAsciiCharacterCount += totalResult.nonBasicAsciiCharacterCount;
            totalResult.hasMore = totalResult.hasMore || result.hasMore;
        }
        if (!totalResult.hasMore) {
            // Don't show decorations if there are too many.
            // A banner will be shown instead.
            for (const range of totalResult.ranges) {
                decorations.push({ range, options: Decorations.instance.getDecorationFromOptions(this._options) });
            }
        }
        this._updateState(totalResult);
        this._decorations.set(decorations);
    }
    getDecorationInfo(decoration) {
        if (!this._decorations.has(decoration)) {
            return null;
        }
        const model = this._editor.getModel();
        const text = model.getValueInRange(decoration.range);
        if (!isModelDecorationVisible(model, decoration)) {
            return null;
        }
        return {
            reason: computeReason(text, this._options),
            inComment: isModelDecorationInComment(model, decoration),
            inString: isModelDecorationInString(model, decoration),
        };
    }
}
export class UnicodeHighlighterHover {
    constructor(owner, range, decoration) {
        this.owner = owner;
        this.range = range;
        this.decoration = decoration;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
const configureUnicodeHighlightOptionsStr = nls.localize('unicodeHighlight.configureUnicodeHighlightOptions', 'Configure Unicode Highlight Options');
let UnicodeHighlighterHoverParticipant = class UnicodeHighlighterHoverParticipant {
    constructor(_editor, _languageService, _openerService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this.hoverOrdinal = 5;
    }
    computeSync(anchor, lineDecorations) {
        if (!this._editor.hasModel() || anchor.type !== 1 /* HoverAnchorType.Range */) {
            return [];
        }
        const model = this._editor.getModel();
        const unicodeHighlighter = this._editor.getContribution(UnicodeHighlighter.ID);
        if (!unicodeHighlighter) {
            return [];
        }
        const result = [];
        const existedReason = new Set();
        let index = 300;
        for (const d of lineDecorations) {
            const highlightInfo = unicodeHighlighter.getDecorationInfo(d);
            if (!highlightInfo) {
                continue;
            }
            const char = model.getValueInRange(d.range);
            // text refers to a single character.
            const codePoint = char.codePointAt(0);
            const codePointStr = formatCodePointMarkdown(codePoint);
            let reason;
            switch (highlightInfo.reason.kind) {
                case 0 /* UnicodeHighlighterReasonKind.Ambiguous */: {
                    if (isBasicASCII(highlightInfo.reason.confusableWith)) {
                        reason = nls.localize('unicodeHighlight.characterIsAmbiguousASCII', 'The character {0} could be confused with the ASCII character {1}, which is more common in source code.', codePointStr, formatCodePointMarkdown(highlightInfo.reason.confusableWith.codePointAt(0)));
                    }
                    else {
                        reason = nls.localize('unicodeHighlight.characterIsAmbiguous', 'The character {0} could be confused with the character {1}, which is more common in source code.', codePointStr, formatCodePointMarkdown(highlightInfo.reason.confusableWith.codePointAt(0)));
                    }
                    break;
                }
                case 1 /* UnicodeHighlighterReasonKind.Invisible */:
                    reason = nls.localize('unicodeHighlight.characterIsInvisible', 'The character {0} is invisible.', codePointStr);
                    break;
                case 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */:
                    reason = nls.localize('unicodeHighlight.characterIsNonBasicAscii', 'The character {0} is not a basic ASCII character.', codePointStr);
                    break;
            }
            if (existedReason.has(reason)) {
                continue;
            }
            existedReason.add(reason);
            const adjustSettingsArgs = {
                codePoint: codePoint,
                reason: highlightInfo.reason,
                inComment: highlightInfo.inComment,
                inString: highlightInfo.inString,
            };
            const adjustSettings = nls.localize('unicodeHighlight.adjustSettings', 'Adjust settings');
            const uri = `command:${ShowExcludeOptions.ID}?${encodeURIComponent(JSON.stringify(adjustSettingsArgs))}`;
            const markdown = new MarkdownString('', true)
                .appendMarkdown(reason)
                .appendText(' ')
                .appendLink(uri, adjustSettings, configureUnicodeHighlightOptionsStr);
            result.push(new MarkdownHover(this, d.range, [markdown], false, index++));
        }
        return result;
    }
    renderHoverParts(context, hoverParts) {
        return renderMarkdownHovers(context, hoverParts, this._editor, this._languageService, this._openerService);
    }
    getAccessibleContent(hoverPart) {
        return hoverPart.contents.map(c => c.value).join('\n');
    }
};
UnicodeHighlighterHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService)
], UnicodeHighlighterHoverParticipant);
export { UnicodeHighlighterHoverParticipant };
function codePointToHex(codePoint) {
    return `U+${codePoint.toString(16).padStart(4, '0')}`;
}
function formatCodePointMarkdown(codePoint) {
    let value = `\`${codePointToHex(codePoint)}\``;
    if (!InvisibleCharacters.isInvisibleCharacter(codePoint)) {
        // Don't render any control characters or any invisible characters, as they cannot be seen anyways.
        value += ` "${`${renderCodePointAsInlineCode(codePoint)}`}"`;
    }
    return value;
}
function renderCodePointAsInlineCode(codePoint) {
    if (codePoint === 96 /* CharCode.BackTick */) {
        return '`` ` ``';
    }
    return '`' + String.fromCodePoint(codePoint) + '`';
}
function computeReason(char, options) {
    return UnicodeTextModelHighlighter.computeUnicodeHighlightReason(char, options);
}
class Decorations {
    constructor() {
        this.map = new Map();
    }
    static { this.instance = new Decorations(); }
    getDecorationFromOptions(options) {
        return this.getDecoration(!options.includeComments, !options.includeStrings);
    }
    getDecoration(hideInComments, hideInStrings) {
        const key = `${hideInComments}${hideInStrings}`;
        let options = this.map.get(key);
        if (!options) {
            options = ModelDecorationOptions.createDynamic({
                description: 'unicode-highlight',
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                className: 'unicode-highlight',
                showIfCollapsed: true,
                overviewRuler: null,
                minimap: null,
                hideInCommentTokens: hideInComments,
                hideInStringTokens: hideInStrings,
            });
            this.map.set(key, options);
        }
        return options;
    }
}
export class DisableHighlightingInCommentsAction extends EditorAction {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingInComments'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            label: nls.localize2('action.unicodeHighlight.disableHighlightingInComments', "Disable highlighting of characters in comments"),
            precondition: undefined
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingInComments.shortLabel', 'Disable Highlight In Comments');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.includeComments, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingInStringsAction extends EditorAction {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingInStrings'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            label: nls.localize2('action.unicodeHighlight.disableHighlightingInStrings', "Disable highlighting of characters in strings"),
            precondition: undefined
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingInStrings.shortLabel', 'Disable Highlight In Strings');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.includeStrings, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfAmbiguousCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfAmbiguousCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfAmbiguousCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfAmbiguousCharacters', "Disable highlighting of ambiguous characters"),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfAmbiguousCharacters.shortLabel', 'Disable Ambiguous Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.ambiguousCharacters, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfInvisibleCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfInvisibleCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfInvisibleCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfInvisibleCharacters', "Disable highlighting of invisible characters"),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfInvisibleCharacters.shortLabel', 'Disable Invisible Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.invisibleCharacters, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class DisableHighlightingOfNonBasicAsciiCharactersAction extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters'; }
    constructor() {
        super({
            id: DisableHighlightingOfNonBasicAsciiCharactersAction.ID,
            title: nls.localize2('action.unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters', "Disable highlighting of non basic ASCII characters"),
            precondition: undefined,
            f1: false,
        });
        this.shortLabel = nls.localize('unicodeHighlight.disableHighlightingOfNonBasicAsciiCharacters.shortLabel', 'Disable Non ASCII Highlight');
    }
    async run(accessor, editor, args) {
        const configurationService = accessor.get(IConfigurationService);
        if (configurationService) {
            this.runAction(configurationService);
        }
    }
    async runAction(configurationService) {
        await configurationService.updateValue(unicodeHighlightConfigKeys.nonBasicASCII, false, 2 /* ConfigurationTarget.USER */);
    }
}
export class ShowExcludeOptions extends Action2 {
    static { this.ID = 'editor.action.unicodeHighlight.showExcludeOptions'; }
    constructor() {
        super({
            id: ShowExcludeOptions.ID,
            title: nls.localize2('action.unicodeHighlight.showExcludeOptions', "Show Exclude Options"),
            precondition: undefined,
            f1: false,
        });
    }
    async run(accessor, args) {
        const { codePoint, reason, inString, inComment } = args;
        const char = String.fromCodePoint(codePoint);
        const quickPickService = accessor.get(IQuickInputService);
        const configurationService = accessor.get(IConfigurationService);
        function getExcludeCharFromBeingHighlightedLabel(codePoint) {
            if (InvisibleCharacters.isInvisibleCharacter(codePoint)) {
                return nls.localize('unicodeHighlight.excludeInvisibleCharFromBeingHighlighted', 'Exclude {0} (invisible character) from being highlighted', codePointToHex(codePoint));
            }
            return nls.localize('unicodeHighlight.excludeCharFromBeingHighlighted', 'Exclude {0} from being highlighted', `${codePointToHex(codePoint)} "${char}"`);
        }
        const options = [];
        if (reason.kind === 0 /* UnicodeHighlighterReasonKind.Ambiguous */) {
            for (const locale of reason.notAmbiguousInLocales) {
                options.push({
                    label: nls.localize("unicodeHighlight.allowCommonCharactersInLanguage", "Allow unicode characters that are more common in the language \"{0}\".", locale),
                    run: async () => {
                        excludeLocaleFromBeingHighlighted(configurationService, [locale]);
                    },
                });
            }
        }
        options.push({
            label: getExcludeCharFromBeingHighlightedLabel(codePoint),
            run: () => excludeCharFromBeingHighlighted(configurationService, [codePoint])
        });
        if (inComment) {
            const action = new DisableHighlightingInCommentsAction();
            options.push({ label: action.label, run: async () => action.runAction(configurationService) });
        }
        else if (inString) {
            const action = new DisableHighlightingInStringsAction();
            options.push({ label: action.label, run: async () => action.runAction(configurationService) });
        }
        function getTitle(options) {
            return typeof options.desc.title === 'string' ? options.desc.title : options.desc.title.value;
        }
        if (reason.kind === 0 /* UnicodeHighlighterReasonKind.Ambiguous */) {
            const action = new DisableHighlightingOfAmbiguousCharactersAction();
            options.push({ label: getTitle(action), run: async () => action.runAction(configurationService) });
        }
        else if (reason.kind === 1 /* UnicodeHighlighterReasonKind.Invisible */) {
            const action = new DisableHighlightingOfInvisibleCharactersAction();
            options.push({ label: getTitle(action), run: async () => action.runAction(configurationService) });
        }
        else if (reason.kind === 2 /* UnicodeHighlighterReasonKind.NonBasicAscii */) {
            const action = new DisableHighlightingOfNonBasicAsciiCharactersAction();
            options.push({ label: getTitle(action), run: async () => action.runAction(configurationService) });
        }
        else {
            expectNever(reason);
        }
        const result = await quickPickService.pick(options, { title: configureUnicodeHighlightOptionsStr });
        if (result) {
            await result.run();
        }
    }
}
async function excludeCharFromBeingHighlighted(configurationService, charCodes) {
    const existingValue = configurationService.getValue(unicodeHighlightConfigKeys.allowedCharacters);
    let value;
    if ((typeof existingValue === 'object') && existingValue) {
        value = existingValue;
    }
    else {
        value = {};
    }
    for (const charCode of charCodes) {
        value[String.fromCodePoint(charCode)] = true;
    }
    await configurationService.updateValue(unicodeHighlightConfigKeys.allowedCharacters, value, 2 /* ConfigurationTarget.USER */);
}
async function excludeLocaleFromBeingHighlighted(configurationService, locales) {
    const existingValue = configurationService.inspect(unicodeHighlightConfigKeys.allowedLocales).user?.value;
    let value;
    if ((typeof existingValue === 'object') && existingValue) {
        // Copy value, as the existing value is read only
        value = Object.assign({}, existingValue);
    }
    else {
        value = {};
    }
    for (const locale of locales) {
        value[locale] = true;
    }
    await configurationService.updateValue(unicodeHighlightConfigKeys.allowedLocales, value, 2 /* ConfigurationTarget.USER */);
}
function expectNever(value) {
    throw new Error(`Unexpected value: ${value}`);
}
registerAction2(DisableHighlightingOfAmbiguousCharactersAction);
registerAction2(DisableHighlightingOfInvisibleCharactersAction);
registerAction2(DisableHighlightingOfNonBasicAsciiCharactersAction);
registerAction2(ShowExcludeOptions);
registerEditorContribution(UnicodeHighlighter.ID, UnicodeHighlighter, 1 /* EditorContributionInstantiation.AfterFirstRender */);
HoverParticipantRegistry.register(UnicodeHighlighterHoverParticipant);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZUhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi91bmljb2RlSGlnaGxpZ2h0ZXIvYnJvd3Nlci91bmljb2RlSGlnaGxpZ2h0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkYsT0FBTywwQkFBMEIsQ0FBQztBQUVsQyxPQUFPLEVBQUUsWUFBWSxFQUFtQywwQkFBMEIsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuSixPQUFPLEVBQXdCLG9CQUFvQixFQUFpRCwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSWhMLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBcUYsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6TCxPQUFPLEVBQUUsb0JBQW9CLEVBQTRCLE1BQU0sMENBQTBDLENBQUM7QUFDMUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFnQyx3QkFBd0IsRUFBdUYsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoTSxPQUFPLEVBQUUs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