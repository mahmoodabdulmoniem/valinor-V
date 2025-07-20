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
import { n } from '../../../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderIcon } from '../../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { KeybindingLabel } from '../../../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Codicon } from '../../../../../../../base/common/codicons.js';
import { autorun, constObservable, derived, observableFromEvent, observableValue } from '../../../../../../../base/common/observable.js';
import { OS } from '../../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../../base/common/themables.js';
import { localize } from '../../../../../../../nls.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { nativeHoverDelegate } from '../../../../../../../platform/hover/browser/hover.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { defaultKeybindingLabelStyles } from '../../../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, descriptionForeground, editorActionListForeground, editorHoverBorder, keybindingLabelBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { hideInlineCompletionId, inlineSuggestCommitId, toggleShowCollapsedId } from '../../../controller/commandIds.js';
let GutterIndicatorMenuContent = class GutterIndicatorMenuContent {
    constructor(_model, _close, _editorObs, _contextKeyService, _keybindingService, _commandService) {
        this._model = _model;
        this._close = _close;
        this._editorObs = _editorObs;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._commandService = _commandService;
        this._inlineEditsShowCollapsed = this._editorObs.getOption(71 /* EditorOption.inlineSuggest */).map(s => s.edits.showCollapsed);
    }
    toDisposableLiveElement() {
        return this._createHoverContent().toDisposableLiveElement();
    }
    _createHoverContent() {
        const activeElement = observableValue('active', undefined);
        const createOptionArgs = (options) => {
            return {
                title: options.title,
                icon: options.icon,
                keybinding: typeof options.commandId === 'string' ? this._getKeybinding(options.commandArgs ? undefined : options.commandId) : derived(reader => typeof options.commandId === 'string' ? undefined : this._getKeybinding(options.commandArgs ? undefined : options.commandId.read(reader)).read(reader)),
                isActive: activeElement.map(v => v === options.id),
                onHoverChange: v => activeElement.set(v ? options.id : undefined, undefined),
                onAction: () => {
                    this._close(true);
                    return this._commandService.executeCommand(typeof options.commandId === 'string' ? options.commandId : options.commandId.get(), ...(options.commandArgs ?? []));
                },
            };
        };
        const title = header(this._model.displayName);
        const gotoAndAccept = option(createOptionArgs({
            id: 'gotoAndAccept',
            title: `${localize('goto', "Go To")} / ${localize('accept', "Accept")}`,
            icon: Codicon.check,
            commandId: inlineSuggestCommitId
        }));
        const reject = option(createOptionArgs({
            id: 'reject',
            title: localize('reject', "Reject"),
            icon: Codicon.close,
            commandId: hideInlineCompletionId
        }));
        const extensionCommands = this._model.extensionCommands.map((c, idx) => option(createOptionArgs({
            id: c.command.id + '_' + idx,
            title: c.command.title,
            icon: c.icon ?? Codicon.symbolEvent,
            commandId: c.command.id,
            commandArgs: c.command.arguments
        })));
        const toggleCollapsedMode = this._inlineEditsShowCollapsed.map(showCollapsed => showCollapsed ?
            option(createOptionArgs({
                id: 'showExpanded',
                title: localize('showExpanded', "Show Expanded"),
                icon: Codicon.expandAll,
                commandId: toggleShowCollapsedId
            }))
            : option(createOptionArgs({
                id: 'showCollapsed',
                title: localize('showCollapsed', "Show Collapsed"),
                icon: Codicon.collapseAll,
                commandId: toggleShowCollapsedId
            })));
        const settings = option(createOptionArgs({
            id: 'settings',
            title: localize('settings', "Settings"),
            icon: Codicon.gear,
            commandId: 'workbench.action.openSettings',
            commandArgs: ['@tag:nextEditSuggestions']
        }));
        const actions = this._model.action ? [this._model.action] : [];
        const actionBarFooter = actions.length > 0 ? actionBar(actions.map(action => ({
            id: action.id,
            label: action.title,
            enabled: true,
            run: () => this._commandService.executeCommand(action.id, ...(action.arguments ?? [])),
            class: undefined,
            tooltip: action.tooltip ?? action.title
        })), { hoverDelegate: nativeHoverDelegate /* unable to show hover inside another hover */ }) : undefined;
        return hoverContent([
            title,
            gotoAndAccept,
            reject,
            toggleCollapsedMode,
            settings,
            extensionCommands.length ? separator() : undefined,
            ...extensionCommands,
            actionBarFooter ? separator() : undefined,
            actionBarFooter
        ]);
    }
    _getKeybinding(commandId) {
        if (!commandId) {
            return constObservable(undefined);
        }
        return observableFromEvent(this._contextKeyService.onDidChangeContext, () => this._keybindingService.lookupKeybinding(commandId)); // TODO: use contextkeyservice to use different renderings
    }
};
GutterIndicatorMenuContent = __decorate([
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, ICommandService)
], GutterIndicatorMenuContent);
export { GutterIndicatorMenuContent };
function hoverContent(content) {
    return n.div({
        class: 'content',
        style: {
            margin: 4,
            minWidth: 150,
        }
    }, content);
}
function header(title) {
    return n.div({
        class: 'header',
        style: {
            color: asCssVariable(descriptionForeground),
            fontSize: '12px',
            fontWeight: '600',
            padding: '0 10px',
            lineHeight: 26,
        }
    }, [title]);
}
function option(props) {
    return derived((_reader) => n.div({
        class: ['monaco-menu-option', props.isActive?.map(v => v && 'active')],
        onmouseenter: () => props.onHoverChange?.(true),
        onmouseleave: () => props.onHoverChange?.(false),
        onclick: props.onAction,
        onkeydown: e => {
            if (e.key === 'Enter') {
                props.onAction?.();
            }
        },
        tabIndex: 0,
        style: {
            borderRadius: 3, // same as hover widget border radius
        }
    }, [
        n.elem('span', {
            style: {
                fontSize: 16,
                display: 'flex',
            }
        }, [ThemeIcon.isThemeIcon(props.icon) ? renderIcon(props.icon) : props.icon.map(icon => renderIcon(icon))]),
        n.elem('span', {}, [props.title]),
        n.div({
            style: { marginLeft: 'auto' },
            ref: elem => {
                const keybindingLabel = _reader.store.add(new KeybindingLabel(elem, OS, {
                    disableTitle: true,
                    ...defaultKeybindingLabelStyles,
                    keybindingLabelShadow: undefined,
                    keybindingLabelBackground: asCssVariable(keybindingLabelBackground),
                    keybindingLabelBorder: 'transparent',
                    keybindingLabelBottomBorder: undefined,
                }));
                _reader.store.add(autorun(reader => {
                    keybindingLabel.set(props.keybinding.read(reader));
                }));
            }
        })
    ]));
}
// TODO: make this observable
function actionBar(actions, options) {
    return derived((_reader) => n.div({
        class: ['action-widget-action-bar'],
        style: {
            padding: '0 10px',
        }
    }, [
        n.div({
            ref: elem => {
                const actionBar = _reader.store.add(new ActionBar(elem, options));
                actionBar.push(actions, { icon: false, label: true });
            }
        })
    ]));
}
function separator() {
    return n.div({
        id: 'inline-edit-gutter-indicator-menu-separator',
        class: 'menu-separator',
        style: {
            color: asCssVariable(editorActionListForeground),
            padding: '4px 0',
        }
    }, n.div({
        style: {
            borderBottom: `1px solid ${asCssVariable(editorHoverBorder)}`,
        }
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3V0dGVySW5kaWNhdG9yTWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2NvbXBvbmVudHMvZ3V0dGVySW5kaWNhdG9yTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQTBCLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxTQUFTLEVBQXFCLE1BQU0sNkRBQTZELENBQUM7QUFDM0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUUxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdkUsT0FBTyxFQUFlLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RKLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuRyxPQUFPLEVB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