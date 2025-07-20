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
var KeybindingEditorDecorationsRenderer_1;
import * as nls from '../../../../nls.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SmartSnippetInserter } from '../common/smartSnippetInserter.js';
import { DefineKeybindingOverlayWidget } from './keybindingWidgets.js';
import { parseTree } from '../../../../base/common/json.js';
import { WindowsNativeResolvedKeybinding } from '../../../services/keybinding/common/windowsKeyboardMapper.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { overviewRulerInfo, overviewRulerError } from '../../../../editor/common/core/editorColorRegistry.js';
import { OverviewRulerLane } from '../../../../editor/common/model.js';
import { KeybindingParser } from '../../../../base/common/keybindingParser.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { DEFINE_KEYBINDING_EDITOR_CONTRIB_ID } from '../../../services/preferences/common/preferences.js';
const NLS_KB_LAYOUT_ERROR_MESSAGE = nls.localize('defineKeybinding.kbLayoutErrorMessage', "You won't be able to produce this key combination under your current keyboard layout.");
let DefineKeybindingEditorContribution = class DefineKeybindingEditorContribution extends Disposable {
    constructor(_editor, _instantiationService, _userDataProfileService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._userDataProfileService = _userDataProfileService;
        this._keybindingDecorationRenderer = this._register(new MutableDisposable());
        this._defineWidget = this._register(this._instantiationService.createInstance(DefineKeybindingOverlayWidget, this._editor));
        this._register(this._editor.onDidChangeModel(e => this._update()));
        this._update();
    }
    _update() {
        this._keybindingDecorationRenderer.value = isInterestingEditorModel(this._editor, this._userDataProfileService)
            // Decorations are shown for the default keybindings.json **and** for the user keybindings.json
            ? this._instantiationService.createInstance(KeybindingEditorDecorationsRenderer, this._editor)
            : undefined;
    }
    showDefineKeybindingWidget() {
        if (isInterestingEditorModel(this._editor, this._userDataProfileService)) {
            this._defineWidget.start().then(keybinding => this._onAccepted(keybinding));
        }
    }
    _onAccepted(keybinding) {
        this._editor.focus();
        if (keybinding && this._editor.hasModel()) {
            const regexp = new RegExp(/\\/g);
            const backslash = regexp.test(keybinding);
            if (backslash) {
                keybinding = keybinding.slice(0, -1) + '\\\\';
            }
            let snippetText = [
                '{',
                '\t"key": ' + JSON.stringify(keybinding) + ',',
                '\t"command": "${1:commandId}",',
                '\t"when": "${2:editorTextFocus}"',
                '}$0'
            ].join('\n');
            const smartInsertInfo = SmartSnippetInserter.insertSnippet(this._editor.getModel(), this._editor.getPosition());
            snippetText = smartInsertInfo.prepend + snippetText + smartInsertInfo.append;
            this._editor.setPosition(smartInsertInfo.position);
            SnippetController2.get(this._editor)?.insert(snippetText, { overwriteBefore: 0, overwriteAfter: 0 });
        }
    }
};
DefineKeybindingEditorContribution = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUserDataProfileService)
], DefineKeybindingEditorContribution);
let KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = class KeybindingEditorDecorationsRenderer extends Disposable {
    constructor(_editor, _keybindingService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._dec = this._editor.createDecorationsCollection();
        this._updateDecorations = this._register(new RunOnceScheduler(() => this._updateDecorationsNow(), 500));
        const model = assertReturnsDefined(this._editor.getModel());
        this._register(model.onDidChangeContent(() => this._updateDecorations.schedule()));
        this._register(this._keybindingService.onDidUpdateKeybindings(() => this._updateDecorations.schedule()));
        this._register({
            dispose: () => {
                this._dec.clear();
                this._updateDecorations.cancel();
            }
        });
        this._updateDecorations.schedule();
    }
    _updateDecorationsNow() {
        const model = assertReturnsDefined(this._editor.getModel());
        const newDecorations = [];
        const root = parseTree(model.getValue());
        if (root && Array.isArray(root.children)) {
            for (let i = 0, len = root.children.length; i < len; i++) {
                const entry = root.children[i];
                const dec = this._getDecorationForEntry(model, entry);
                if (dec !== null) {
                    newDecorations.push(dec);
                }
            }
        }
        this._dec.set(newDecorations);
    }
    _getDecorationForEntry(model, entry) {
        if (!Array.isArray(entry.children)) {
            return null;
        }
        for (let i = 0, len = entry.children.length; i < len; i++) {
            const prop = entry.children[i];
            if (prop.type !== 'property') {
                continue;
            }
            if (!Array.isArray(prop.children) || prop.children.length !== 2) {
                continue;
            }
            const key = prop.children[0];
            if (key.value !== 'key') {
                continue;
            }
            const value = prop.children[1];
            if (value.type !== 'string') {
                continue;
            }
            const resolvedKeybindings = this._keybindingService.resolveUserBinding(value.value);
            if (resolvedKeybindings.length === 0) {
                return this._createDecoration(true, null, null, model, value);
            }
            const resolvedKeybinding = resolvedKeybindings[0];
            let usLabel = null;
            if (resolvedKeybinding instanceof WindowsNativeResolvedKeybinding) {
                usLabel = resolvedKeybinding.getUSLabel();
            }
            if (!resolvedKeybinding.isWYSIWYG()) {
                const uiLabel = resolvedKeybinding.getLabel();
                if (typeof uiLabel === 'string' && value.value.toLowerCase() === uiLabel.toLowerCase()) {
                    // coincidentally, this is actually WYSIWYG
                    return null;
                }
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            if (/abnt_|oem_/.test(value.value)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            const expectedUserSettingsLabel = resolvedKeybinding.getUserSettingsLabel();
            if (typeof expectedUserSettingsLabel === 'string' && !KeybindingEditorDecorationsRenderer_1._userSettingsFuzzyEquals(value.value, expectedUserSettingsLabel)) {
                return this._createDecoration(false, resolvedKeybinding.getLabel(), usLabel, model, value);
            }
            return null;
        }
        return null;
    }
    static _userSettingsFuzzyEquals(a, b) {
        a = a.trim().toLowerCase();
        b = b.trim().toLowerCase();
        if (a === b) {
            return true;
        }
        const aKeybinding = KeybindingParser.parseKeybinding(a);
        const bKeybinding = KeybindingParser.parseKeybinding(b);
        if (aKeybinding === null && bKeybinding === null) {
            return true;
        }
        if (!aKeybinding || !bKeybinding) {
            return false;
        }
        return aKeybinding.equals(bKeybinding);
    }
    _createDecoration(isError, uiLabel, usLabel, model, keyNode) {
        let msg;
        let className;
        let overviewRulerColor;
        if (isError) {
            // this is the error case
            msg = new MarkdownString().appendText(NLS_KB_LAYOUT_ERROR_MESSAGE);
            className = 'keybindingError';
            overviewRulerColor = themeColorFromId(overviewRulerError);
        }
        else {
            // this is the info case
            if (usLabel && uiLabel !== usLabel) {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalAndUSMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholders such that they will be rendered in bold.',
                        'The placeholders will contain a keyboard combination e.g. Ctrl+Shift+/'
                    ]
                }, "**{0}** for your current keyboard layout (**{1}** for US standard).", uiLabel, usLabel));
            }
            else {
                msg = new MarkdownString(nls.localize({
                    key: 'defineKeybinding.kbLayoutLocalMessage',
                    comment: [
                        'Please translate maintaining the stars (*) around the placeholder such that it will be rendered in bold.',
                        'The placeholder will contain a keyboard combination e.g. Ctrl+Shift+/'
                    ]
                }, "**{0}** for your current keyboard layout.", uiLabel));
            }
            className = 'keybindingInfo';
            overviewRulerColor = themeColorFromId(overviewRulerInfo);
        }
        const startPosition = model.getPositionAt(keyNode.offset);
        const endPosition = model.getPositionAt(keyNode.offset + keyNode.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        // icon + highlight + message decoration
        return {
            range: range,
            options: {
                description: 'keybindings-widget',
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                className: className,
                hoverMessage: msg,
                overviewRuler: {
                    color: overviewRulerColor,
                    position: OverviewRulerLane.Right
                }
            }
        };
    }
};
KeybindingEditorDecorationsRenderer = KeybindingEditorDecorationsRenderer_1 = __decorate([
    __param(1, IKeybindingService)
], KeybindingEditorDecorationsRenderer);
export { KeybindingEditorDecorationsRenderer };
function isInterestingEditorModel(editor, userDataProfileService) {
    const model = editor.getModel();
    if (!model) {
        return false;
    }
    return isEqual(model.uri, userDataProfileService.currentProfile.keybindingsResource);
}
registerEditorContribution(DEFINE_KEYBINDING_EDITOR_CONTRIB_ID, DefineKeybindingEditorContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFtQyxNQUFNLGdEQUFnRCxDQUFDO0FBRTdILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxTQUFTLEVBQVEsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVy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