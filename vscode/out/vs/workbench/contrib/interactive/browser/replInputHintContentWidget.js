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
var ReplInputHintContentWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { OS } from '../../../../base/common/platform.js';
import { Position } from '../../../../editor/common/core/position.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ReplEditorSettings } from './interactiveCommon.js';
let ReplInputHintContentWidget = class ReplInputHintContentWidget extends Disposable {
    static { ReplInputHintContentWidget_1 = this; }
    static { this.ID = 'replInput.widget.emptyHint'; }
    constructor(editor, configurationService, keybindingService) {
        super();
        this.editor = editor;
        this.configurationService = configurationService;
        this.keybindingService = keybindingService;
        this.ariaLabel = '';
        this._register(this.editor.onDidChangeConfiguration((e) => {
            if (this.domNode && e.hasChanged(59 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        const onDidFocusEditorText = Event.debounce(this.editor.onDidFocusEditorText, () => undefined, 500);
        this._register(onDidFocusEditorText(() => {
            if (this.editor.hasTextFocus() && this.ariaLabel && configurationService.getValue("accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */)) {
                status(this.ariaLabel);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ReplEditorSettings.executeWithShiftEnter)) {
                this.setHint();
            }
        }));
        this.editor.addContentWidget(this);
    }
    getId() {
        return ReplInputHintContentWidget_1.ID;
    }
    getPosition() {
        return {
            position: { lineNumber: 1, column: 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */]
        };
    }
    getDomNode() {
        if (!this.domNode) {
            this.domNode = dom.$('.empty-editor-hint');
            this.domNode.style.width = 'max-content';
            this.domNode.style.paddingLeft = '4px';
            this.setHint();
            this._register(dom.addDisposableListener(this.domNode, 'click', () => {
                this.editor.focus();
            }));
            this.editor.applyFontInfo(this.domNode);
            const lineHeight = this.editor.getLineHeightForPosition(new Position(1, 1));
            this.domNode.style.lineHeight = lineHeight + 'px';
        }
        return this.domNode;
    }
    setHint() {
        if (!this.domNode) {
            return;
        }
        while (this.domNode.firstChild) {
            this.domNode.removeChild(this.domNode.firstChild);
        }
        const hintElement = dom.$('div.empty-hint-text');
        hintElement.style.cursor = 'text';
        hintElement.style.whiteSpace = 'nowrap';
        const keybinding = this.getKeybinding();
        const keybindingHintLabel = keybinding?.getLabel();
        if (keybinding && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to execute. ', keybindingHintLabel);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                const hintPart = dom.$('span', undefined, fragment);
                hintPart.style.fontStyle = 'italic';
                return hintPart;
            });
            hintElement.appendChild(before);
            if (this.label) {
                this.label.dispose();
            }
            this.label = this._register(new KeybindingLabel(hintElement, OS));
            this.label.set(keybinding);
            this.label.element.style.width = 'min-content';
            this.label.element.style.display = 'inline';
            hintElement.appendChild(after);
            this.domNode.append(hintElement);
            const helpKeybinding = this.keybindingService.lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)?.getLabel();
            const helpInfo = helpKeybinding
                ? localize('ReplInputAriaLabelHelp', "Use {0} for accessibility help. ", helpKeybinding)
                : localize('ReplInputAriaLabelHelpNoKb', "Run the Open Accessibility Help command for more information. ");
            this.ariaLabel = actionPart.concat(helpInfo, localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */));
        }
    }
    getKeybinding() {
        const keybindings = this.keybindingService.lookupKeybindings('interactive.execute');
        const shiftEnterConfig = this.configurationService.getValue(ReplEditorSettings.executeWithShiftEnter);
        const hasEnterChord = (kb, modifier = '') => {
            const chords = kb.getDispatchChords();
            const chord = modifier + 'Enter';
            const chordAlt = modifier + '[Enter]';
            return chords.length === 1 && (chords[0] === chord || chords[0] === chordAlt);
        };
        if (shiftEnterConfig) {
            const keybinding = keybindings.find(kb => hasEnterChord(kb, 'shift+'));
            if (keybinding) {
                return keybinding;
            }
        }
        else {
            let keybinding = keybindings.find(kb => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
            keybinding = this.keybindingService.lookupKeybindings('python.execInREPLEnter')
                .find(kb => hasEnterChord(kb));
            if (keybinding) {
                return keybinding;
            }
        }
        return keybindings?.[0];
    }
    dispose() {
        super.dispose();
        this.editor.removeContentWidget(this);
        this.label?.dispose();
    }
};
ReplInputHintContentWidget = ReplInputHintContentWidget_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IKeybindingService)
], ReplInputHintContentWidget);
export { ReplInputHintContentWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbElucHV0SGludENvbnRlbnRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvcmVwbElucHV0SGludENvbnRlbnRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUd6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBR3JELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTs7YUFFakMsT0FBRSxHQUFHLDRCQUE0QixBQUEvQixDQUFnQztJQU0xRCxZQUNrQixNQUFtQixFQUNiLG9CQUE0RCxFQUMvRCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFKUyxXQUFNLEdBQU4sTUFB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