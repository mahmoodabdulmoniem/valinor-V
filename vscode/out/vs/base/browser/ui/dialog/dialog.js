/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './dialog.css';
import { localize } from '../../../../nls.js';
import { $, addDisposableListener, addStandardDisposableListener, clearNode, EventHelper, EventType, getWindow, hide, isActiveElement, isAncestor, show } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { ActionBar } from '../actionbar/actionbar.js';
import { ButtonBar, ButtonBarAlignment, ButtonWithDescription, ButtonWithDropdown } from '../button/button.js';
import { Checkbox } from '../toggle/toggle.js';
import { InputBox } from '../inputbox/inputBox.js';
import { Action, toAction } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { ThemeIcon } from '../../../common/themables.js';
import { mnemonicButtonLabel } from '../../../common/labels.js';
import { Disposable, toDisposable } from '../../../common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../common/platform.js';
import { isActionProvider } from '../dropdown/dropdown.js';
export var DialogContentsAlignment;
(function (DialogContentsAlignment) {
    /**
     * Dialog contents align from left to right (icon, message, buttons on a separate row).
     *
     * Note: this is the default alignment for dialogs.
     */
    DialogContentsAlignment[DialogContentsAlignment["Horizontal"] = 0] = "Horizontal";
    /**
     * Dialog contents align from top to bottom (icon, message, buttons stack on top of each other)
     */
    DialogContentsAlignment[DialogContentsAlignment["Vertical"] = 1] = "Vertical";
})(DialogContentsAlignment || (DialogContentsAlignment = {}));
export class Dialog extends Disposable {
    constructor(container, message, buttons, options) {
        super();
        this.container = container;
        this.message = message;
        this.options = options;
        // Modal background blocker
        this.modalElement = this.container.appendChild($(`.monaco-dialog-modal-block.dimmed`));
        this._register(addStandardDisposableListener(this.modalElement, EventType.CLICK, e => {
            if (e.target === this.modalElement) {
                this.element.focus(); // guide users back into the dialog if clicked elsewhere
            }
        }));
        // Dialog Box
        this.shadowElement = this.modalElement.appendChild($('.dialog-shadow'));
        this.element = this.shadowElement.appendChild($('.monaco-dialog-box'));
        if (options.alignment === DialogContentsAlignment.Vertical) {
            this.element.classList.add('align-vertical');
        }
        if (options.extraClasses) {
            this.element.classList.add(...options.extraClasses);
        }
        this.element.setAttribute('role', 'dialog');
        this.element.tabIndex = -1;
        hide(this.element);
        // Footer
        if (this.options.renderFooter) {
            this.footerContainer = this.element.appendChild($('.dialog-footer-row'));
            const customFooter = this.footerContainer.appendChild($('#monaco-dialog-footer.dialog-footer'));
            this.options.renderFooter(customFooter);
            for (const el of this.footerContainer.querySelectorAll('a')) {
                el.tabIndex = 0;
            }
        }
        // Buttons
        this.buttonStyles = options.buttonStyles;
        if (Array.isArray(buttons) && buttons.length > 0) {
            this.buttons = buttons;
        }
        else if (!this.options.disableDefaultAction) {
            this.buttons = [localize('ok', "OK")];
        }
        else {
            this.buttons = [];
        }
        const buttonsRowElement = this.element.appendChild($('.dialog-buttons-row'));
        this.buttonsContainer = buttonsRowElement.appendChild($('.dialog-buttons'));
        // Message
        const messageRowElement = this.element.appendChild($('.dialog-message-row'));
        this.iconElement = messageRowElement.appendChild($('#monaco-dialog-icon.dialog-icon'));
        this.iconElement.setAttribute('aria-label', this.getIconAriaLabel());
        this.messageContainer = messageRowElement.appendChild($('.dialog-message-container'));
        if (this.options.detail || this.options.renderBody) {
            const messageElement = this.messageContainer.appendChild($('.dialog-message'));
            const messageTextElement = messageElement.appendChild($('#monaco-dialog-message-text.dialog-message-text'));
            messageTextElement.innerText = this.message;
        }
        this.messageDetailElement = this.messageContainer.appendChild($('#monaco-dialog-message-detail.dialog-message-detail'));
        if (this.options.detail || !this.options.renderBody) {
            this.messageDetailElement.innerText = this.options.detail ? this.options.detail : message;
        }
        else {
            this.messageDetailElement.style.display = 'none';
        }
        if (this.options.renderBody) {
            const customBody = this.messageContainer.appendChild($('#monaco-dialog-message-body.dialog-message-body'));
            this.options.renderBody(customBody);
            for (const el of this.messageContainer.querySelectorAll('a')) {
                el.tabIndex = 0;
            }
        }
        // Inputs
        if (this.options.inputs) {
            this.inputs = this.options.inputs.map(input => {
                const inputRowElement = this.messageContainer.appendChild($('.dialog-message-input'));
                const inputBox = this._register(new InputBox(inputRowElement, undefined, {
                    placeholder: input.placeholder,
                    type: input.type ?? 'text',
                    inputBoxStyles: options.inputBoxStyles
                }));
                if (input.value) {
                    inputBox.value = input.value;
                }
                return inputBox;
            });
        }
        else {
            this.inputs = [];
        }
        // Checkbox
        if (this.options.checkboxLabel) {
            const checkboxRowElement = this.messageContainer.appendChild($('.dialog-checkbox-row'));
            const checkbox = this.checkbox = this._register(new Checkbox(this.options.checkboxLabel, !!this.options.checkboxChecked, options.checkboxStyles));
            checkboxRowElement.appendChild(checkbox.domNode);
            const checkboxMessageElement = checkboxRowElement.appendChild($('.dialog-checkbox-message'));
            checkboxMessageElement.innerText = this.options.checkboxLabel;
            this._register(addDisposableListener(checkboxMessageElement, EventType.CLICK, () => checkbox.checked = !checkbox.checked));
        }
        // Toolbar
        const toolbarRowElement = this.element.appendChild($('.dialog-toolbar-row'));
        this.toolbarContainer = toolbarRowElement.appendChild($('.dialog-toolbar'));
        this.applyStyles();
    }
    getIconAriaLabel() {
        let typeLabel = localize('dialogInfoMessage', 'Info');
        switch (this.options.type) {
            case 'error':
                typeLabel = localize('dialogErrorMessage', 'Error');
                break;
            case 'warning':
                typeLabel = localize('dialogWarningMessage', 'Warning');
                break;
            case 'pending':
                typeLabel = localize('dialogPendingMessage', 'In Progress');
                break;
            case 'none':
            case 'info':
            case 'question':
            default:
                break;
        }
        return typeLabel;
    }
    updateMessage(message) {
        this.messageDetailElement.innerText = message;
    }
    async show() {
        this.focusToReturn = this.container.ownerDocument.activeElement;
        return new Promise(resolve => {
            clearNode(this.buttonsContainer);
            const close = () => {
                resolve({
                    button: this.options.cancelId || 0,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined
                });
                return;
            };
            this._register(toDisposable(close));
            const buttonBar = this.buttonBar = this._register(new ButtonBar(this.buttonsContainer, { alignment: this.options?.alignment === DialogContentsAlignment.Vertical ? ButtonBarAlignment.Vertical : ButtonBarAlignment.Horizontal }));
            const buttonMap = this.rearrangeButtons(this.buttons, this.options.cancelId);
            const onButtonClick = (index) => {
                resolve({
                    button: buttonMap[index].index,
                    checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                    values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                });
            };
            // Buttons
            buttonMap.forEach((_, index) => {
                const primary = buttonMap[index].index === 0;
                let button;
                const buttonOptions = this.options.buttonOptions?.[buttonMap[index]?.index];
                if (primary && this.options?.primaryButtonDropdown) {
                    const actions = isActionProvider(this.options.primaryButtonDropdown.actions) ? this.options.primaryButtonDropdown.actions.getActions() : this.options.primaryButtonDropdown.actions;
                    button = this._register(buttonBar.addButtonWithDropdown({
                        ...this.options.primaryButtonDropdown,
                        ...this.buttonStyles,
                        dropdownLayer: 2600, // ensure the dropdown is above the dialog
                        actions: actions.map(action => toAction({
                            ...action,
                            run: async () => {
                                await action.run();
                                onButtonClick(index);
                            }
                        }))
                    }));
                }
                else if (buttonOptions?.sublabel) {
                    button = this._register(buttonBar.addButtonWithDescription({ secondary: !primary, ...this.buttonStyles }));
                }
                else {
                    button = this._register(buttonBar.addButton({ secondary: !primary, ...this.buttonStyles }));
                }
                if (buttonOptions?.styleButton) {
                    buttonOptions.styleButton(button);
                }
                button.label = mnemonicButtonLabel(buttonMap[index].label, true);
                if (button instanceof ButtonWithDescription) {
                    if (buttonOptions?.sublabel) {
                        button.description = buttonOptions?.sublabel;
                    }
                }
                this._register(button.onDidClick(e => {
                    if (e) {
                        EventHelper.stop(e);
                    }
                    onButtonClick(index);
                }));
            });
            // Handle keyboard events globally: Tab, Arrow-Left/Right
            const window = getWindow(this.container);
            this._register(addDisposableListener(window, 'keydown', e => {
                const evt = new StandardKeyboardEvent(e);
                if (evt.equals(512 /* KeyMod.Alt */)) {
                    evt.preventDefault();
                }
                if (evt.equals(3 /* KeyCode.Enter */)) {
                    // Enter in input field should OK the dialog
                    if (this.inputs.some(input => input.hasFocus())) {
                        EventHelper.stop(e);
                        resolve({
                            button: buttonMap.find(button => button.index !== this.options.cancelId)?.index ?? 0,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                        });
                    }
                    return; // leave default handling
                }
                // Cmd+D (trigger the "no"/"do not save"-button) (macOS only)
                if (isMacintosh && evt.equals(2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */)) {
                    EventHelper.stop(e);
                    const noButton = buttonMap.find(button => button.index === 1 && button.index !== this.options.cancelId);
                    if (noButton) {
                        resolve({
                            button: noButton.index,
                            checkboxChecked: this.checkbox ? this.checkbox.checked : undefined,
                            values: this.inputs.length > 0 ? this.inputs.map(input => input.value) : undefined
                        });
                    }
                    return; // leave default handling
                }
                if (evt.equals(10 /* KeyCode.Space */)) {
                    return; // leave default handling
                }
                let eventHandled = false;
                // Focus: Next / Previous
                if (evt.equals(2 /* KeyCode.Tab */) || evt.equals(17 /* KeyCode.RightArrow */) || evt.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */) || evt.equals(15 /* KeyCode.LeftArrow */)) {
                    // Build a list of focusable elements in their visual order
                    const focusableElements = [];
                    let focusedIndex = -1;
                    if (this.messageContainer) {
                        const links = this.messageContainer.querySelectorAll('a');
                        for (const link of links) {
                            focusableElements.push(link);
                            if (isActiveElement(link)) {
                                focusedIndex = focusableElements.length - 1;
                            }
                        }
                    }
                    for (const input of this.inputs) {
                        focusableElements.push(input);
                        if (input.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.checkbox) {
                        focusableElements.push(this.checkbox);
                        if (this.checkbox.hasFocus()) {
                            focusedIndex = focusableElements.length - 1;
                        }
                    }
                    if (this.buttonBar) {
                        for (const button of this.buttonBar.buttons) {
                            if (button instanceof ButtonWithDropdown) {
                                focusableElements.push(button.primaryButton);
                                if (button.primaryButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                                focusableElements.push(button.dropdownButton);
                                if (button.dropdownButton.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                            else {
                                focusableElements.push(button);
                                if (button.hasFocus()) {
                                    focusedIndex = focusableElements.length - 1;
                                }
                            }
                        }
                    }
                    if (this.footerContainer) {
                        const links = this.footerContainer.querySelectorAll('a');
                        for (const link of links) {
                            focusableElements.push(link);
                            if (isActiveElement(link)) {
                                focusedIndex = focusableElements.length - 1;
                            }
                        }
                    }
                    // Focus next element (with wrapping)
                    if (evt.equals(2 /* KeyCode.Tab */) || evt.equals(17 /* KeyCode.RightArrow */)) {
                        const newFocusedIndex = (focusedIndex + 1) % focusableElements.length;
                        focusableElements[newFocusedIndex].focus();
                    }
                    // Focus previous element (with wrapping)
                    else {
                        if (focusedIndex === -1) {
                            focusedIndex = focusableElements.length; // default to focus last element if none have focus
                        }
                        let newFocusedIndex = focusedIndex - 1;
                        if (newFocusedIndex === -1) {
                            newFocusedIndex = focusableElements.length - 1;
                        }
                        focusableElements[newFocusedIndex].focus();
                    }
                    eventHandled = true;
                }
                if (eventHandled) {
                    EventHelper.stop(e, true);
                }
                else if (this.options.keyEventProcessor) {
                    this.options.keyEventProcessor(evt);
                }
            }, true));
            this._register(addDisposableListener(window, 'keyup', e => {
                EventHelper.stop(e, true);
                const evt = new StandardKeyboardEvent(e);
                if (!this.options.disableCloseAction && evt.equals(9 /* KeyCode.Escape */)) {
                    close();
                }
            }, true));
            // Detect focus out
            this._register(addDisposableListener(this.element, 'focusout', e => {
                if (!!e.relatedTarget && !!this.element) {
                    if (!isAncestor(e.relatedTarget, this.element)) {
                        this.focusToReturn = e.relatedTarget;
                        if (e.target) {
                            e.target.focus();
                            EventHelper.stop(e, true);
                        }
                    }
                }
            }, false));
            const spinModifierClassName = 'codicon-modifier-spin';
            this.iconElement.classList.remove(...ThemeIcon.asClassNameArray(Codicon.dialogError), ...ThemeIcon.asClassNameArray(Codicon.dialogWarning), ...ThemeIcon.asClassNameArray(Codicon.dialogInfo), ...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
            if (this.options.icon) {
                this.iconElement.classList.add(...ThemeIcon.asClassNameArray(this.options.icon));
            }
            else {
                switch (this.options.type) {
                    case 'error':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogError));
                        break;
                    case 'warning':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogWarning));
                        break;
                    case 'pending':
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.loading), spinModifierClassName);
                        break;
                    case 'none':
                        this.iconElement.classList.add('no-codicon');
                        break;
                    case 'info':
                    case 'question':
                    default:
                        this.iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.dialogInfo));
                        break;
                }
            }
            if (!this.options.disableCloseAction && !this.options.disableCloseButton) {
                const actionBar = this._register(new ActionBar(this.toolbarContainer, {}));
                const action = this._register(new Action('dialog.close', localize('dialogClose', "Close Dialog"), ThemeIcon.asClassName(Codicon.dialogClose), true, async () => {
                    resolve({
                        button: this.options.cancelId || 0,
                        checkboxChecked: this.checkbox ? this.checkbox.checked : undefined
                    });
                }));
                actionBar.push(action, { icon: true, label: false });
            }
            this.applyStyles();
            this.element.setAttribute('aria-modal', 'true');
            this.element.setAttribute('aria-labelledby', 'monaco-dialog-icon monaco-dialog-message-text');
            this.element.setAttribute('aria-describedby', 'monaco-dialog-icon monaco-dialog-message-text monaco-dialog-message-detail monaco-dialog-message-body monaco-dialog-footer');
            show(this.element);
            // Focus first element (input or button)
            if (this.inputs.length > 0) {
                this.inputs[0].focus();
                this.inputs[0].select();
            }
            else {
                buttonMap.forEach((value, index) => {
                    if (value.index === 0) {
                        buttonBar.buttons[index].focus();
                    }
                });
            }
        });
    }
    applyStyles() {
        const style = this.options.dialogStyles;
        const fgColor = style.dialogForeground;
        const bgColor = style.dialogBackground;
        const shadowColor = style.dialogShadow ? `0 0px 8px ${style.dialogShadow}` : '';
        const border = style.dialogBorder ? `1px solid ${style.dialogBorder}` : '';
        const linkFgColor = style.textLinkForeground;
        this.shadowElement.style.boxShadow = shadowColor;
        this.element.style.color = fgColor ?? '';
        this.element.style.backgroundColor = bgColor ?? '';
        this.element.style.border = border;
        if (linkFgColor) {
            for (const el of [...this.messageContainer.getElementsByTagName('a'), ...this.footerContainer?.getElementsByTagName('a') ?? []]) {
                el.style.color = linkFgColor;
            }
        }
        let color;
        switch (this.options.type) {
            case 'none':
                break;
            case 'error':
                color = style.errorIconForeground;
                break;
            case 'warning':
                color = style.warningIconForeground;
                break;
            default:
                color = style.infoIconForeground;
                break;
        }
        if (color) {
            this.iconElement.style.color = color;
        }
    }
    dispose() {
        super.dispose();
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = undefined;
        }
        if (this.focusToReturn && isAncestor(this.focusToReturn, this.container.ownerDocument.body)) {
            this.focusToReturn.focus();
            this.focusToReturn = undefined;
        }
    }
    rearrangeButtons(buttons, cancelId) {
        // Maps each button to its current label and old index
        // so that when we move them around it's not a problem
        const buttonMap = buttons.map((label, index) => ({ label, index }));
        if (buttons.length < 2 || this.options.alignment === DialogContentsAlignment.Vertical) {
            return buttonMap; // only need to rearrange if there are 2+ buttons and the alignment is left-to-right
        }
        if (isMacintosh || isLinux) {
            // Linux: the GNOME HIG (https://developer.gnome.org/hig/patterns/feedback/dialogs.html?highlight=dialog)
            // recommend the following:
            // "Always ensure that the cancel button appears first, before the affirmative button. In left-to-right
            //  locales, this is on the left. This button order ensures that users become aware of, and are reminded
            //  of, the ability to cancel prior to encountering the affirmative button."
            // macOS: the HIG (https://developer.apple.com/design/human-interface-guidelines/components/presentation/alerts)
            // recommend the following:
            // "Place buttons where people expect. In general, place the button people are most likely to choose on the trailing side in a
            //  row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the
            //  top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.splice(1, 0, cancelButton);
            }
            buttonMap.reverse();
        }
        else if (isWindows) {
            // Windows: the HIG (https://learn.microsoft.com/en-us/windows/win32/uxguide/win-dialog-box)
            // recommend the following:
            // "One of the following sets of concise commands: Yes/No, Yes/No/Cancel, [Do it]/Cancel,
            //  [Do it]/[Don't do it], [Do it]/[Don't do it]/Cancel."
            if (typeof cancelId === 'number' && buttonMap[cancelId]) {
                const cancelButton = buttonMap.splice(cancelId, 1)[0];
                buttonMap.push(cancelButton);
            }
        }
        return buttonMap;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvZGlhbG9nL2RpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGNBQWMsQ0FBQztBQUN0QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzlLLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFzRCxNQUFNLHFCQUFxQixDQUFDO0FBQ25LLE9BQU8sRUFBbUIsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDaEUsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFekQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztB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