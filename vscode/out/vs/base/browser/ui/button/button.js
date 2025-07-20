/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, EventHelper, EventType, isActiveElement, reset, trackFocus, $ } from '../../dom.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { renderMarkdown, renderAsPlaintext } from '../../markdownRenderer.js';
import { Gesture, EventType as TouchEventType } from '../../touch.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../iconLabel/iconLabels.js';
import { Action } from '../../../common/actions.js';
import { Codicon } from '../../../common/codicons.js';
import { Color } from '../../../common/color.js';
import { Emitter } from '../../../common/event.js';
import { isMarkdownString, markdownStringEqual } from '../../../common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { ThemeIcon } from '../../../common/themables.js';
import './button.css';
import { localize } from '../../../../nls.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { safeSetInnerHtml } from '../../domSanitize.js';
export const unthemedButtonStyles = {
    buttonBackground: '#0E639C',
    buttonHoverBackground: '#006BB3',
    buttonSeparator: Color.white.toString(),
    buttonForeground: Color.white.toString(),
    buttonBorder: undefined,
    buttonSecondaryBackground: undefined,
    buttonSecondaryForeground: undefined,
    buttonSecondaryHoverBackground: undefined
};
// Only allow a very limited set of inline html tags
const buttonSanitizerOptions = Object.freeze({
    allowedTags: {
        override: ['b', 'i', 'u', 'code', 'span'],
    },
    allowedAttributes: {
        override: ['class'],
    },
});
export class Button extends Disposable {
    get onDidClick() { return this._onDidClick.event; }
    get onDidEscape() { return this._onDidEscape.event; }
    constructor(container, options) {
        super();
        this._label = '';
        this._onDidClick = this._register(new Emitter());
        this._onDidEscape = this._register(new Emitter());
        this.options = options;
        this._element = document.createElement('a');
        this._element.classList.add('monaco-button');
        this._element.tabIndex = 0;
        this._element.setAttribute('role', 'button');
        this._element.classList.toggle('secondary', !!options.secondary);
        const background = options.secondary ? options.buttonSecondaryBackground : options.buttonBackground;
        const foreground = options.secondary ? options.buttonSecondaryForeground : options.buttonForeground;
        this._element.style.color = foreground || '';
        this._element.style.backgroundColor = background || '';
        if (options.supportShortLabel) {
            this._labelShortElement = document.createElement('div');
            this._labelShortElement.classList.add('monaco-button-label-short');
            this._element.appendChild(this._labelShortElement);
            this._labelElement = document.createElement('div');
            this._labelElement.classList.add('monaco-button-label');
            this._element.appendChild(this._labelElement);
            this._element.classList.add('monaco-text-button-with-short-label');
        }
        if (typeof options.title === 'string') {
            this.setTitle(options.title);
        }
        if (typeof options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', options.ariaLabel);
        }
        container.appendChild(this._element);
        this.enabled = !options.disabled;
        this._register(Gesture.addTarget(this._element));
        [EventType.CLICK, TouchEventType.Tap].forEach(eventType => {
            this._register(addDisposableListener(this._element, eventType, e => {
                if (!this.enabled) {
                    EventHelper.stop(e);
                    return;
                }
                this._onDidClick.fire(e);
            }));
        });
        this._register(addDisposableListener(this._element, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = false;
            if (this.enabled && (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */))) {
                this._onDidClick.fire(e);
                eventHandled = true;
            }
            else if (event.equals(9 /* KeyCode.Escape */)) {
                this._onDidEscape.fire(e);
                this._element.blur();
                eventHandled = true;
            }
            if (eventHandled) {
                EventHelper.stop(event, true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OVER, e => {
            if (!this._element.classList.contains('disabled')) {
                this.updateBackground(true);
            }
        }));
        this._register(addDisposableListener(this._element, EventType.MOUSE_OUT, e => {
            this.updateBackground(false); // restore standard styles
        }));
        // Also set hover background when button is focused for feedback
        this.focusTracker = this._register(trackFocus(this._element));
        this._register(this.focusTracker.onDidFocus(() => { if (this.enabled) {
            this.updateBackground(true);
        } }));
        this._register(this.focusTracker.onDidBlur(() => { if (this.enabled) {
            this.updateBackground(false);
        } }));
    }
    dispose() {
        super.dispose();
        this._element.remove();
    }
    getContentElements(content) {
        const elements = [];
        for (let segment of renderLabelWithIcons(content)) {
            if (typeof (segment) === 'string') {
                segment = segment.trim();
                // Ignore empty segment
                if (segment === '') {
                    continue;
                }
                // Convert string segments to <span> nodes
                const node = document.createElement('span');
                node.textContent = segment;
                elements.push(node);
            }
            else {
                elements.push(segment);
            }
        }
        return elements;
    }
    updateBackground(hover) {
        let background;
        if (this.options.secondary) {
            background = hover ? this.options.buttonSecondaryHoverBackground : this.options.buttonSecondaryBackground;
        }
        else {
            background = hover ? this.options.buttonHoverBackground : this.options.buttonBackground;
        }
        if (background) {
            this._element.style.backgroundColor = background;
        }
    }
    get element() {
        return this._element;
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) && isMarkdownString(value) && markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        const labelElement = this.options.supportShortLabel ? this._labelElement : this._element;
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, undefined, document.createElement('span'));
            rendered.dispose();
            // Don't include outer `<p>`
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                safeSetInnerHtml(labelElement, root, buttonSanitizerOptions);
            }
            else {
                reset(labelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(labelElement, ...this.getContentElements(value));
            }
            else {
                labelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    get label() {
        return this._label;
    }
    set labelShort(value) {
        if (!this.options.supportShortLabel || !this._labelShortElement) {
            return;
        }
        if (this.options.supportIcons) {
            reset(this._labelShortElement, ...this.getContentElements(value));
        }
        else {
            this._labelShortElement.textContent = value;
        }
    }
    _setAriaLabel() {
        if (typeof this.options.ariaLabel === 'string') {
            this._element.setAttribute('aria-label', this.options.ariaLabel);
        }
        else if (typeof this.options.title === 'string') {
            this._element.setAttribute('aria-label', this.options.title);
        }
    }
    set icon(icon) {
        this._setAriaLabel();
        const oldIcons = Array.from(this._element.classList).filter(item => item.startsWith('codicon-'));
        this._element.classList.remove(...oldIcons);
        this._element.classList.add(...ThemeIcon.asClassNameArray(icon));
    }
    set enabled(value) {
        if (value) {
            this._element.classList.remove('disabled');
            this._element.setAttribute('aria-disabled', String(false));
            this._element.tabIndex = 0;
        }
        else {
            this._element.classList.add('disabled');
            this._element.setAttribute('aria-disabled', String(true));
        }
    }
    get enabled() {
        return !this._element.classList.contains('disabled');
    }
    set checked(value) {
        if (value) {
            this._element.classList.add('checked');
            this._element.setAttribute('aria-checked', 'true');
        }
        else {
            this._element.classList.remove('checked');
            this._element.setAttribute('aria-checked', 'false');
        }
    }
    get checked() {
        return this._element.classList.contains('checked');
    }
    setTitle(title) {
        if (!this._hover && title !== '') {
            this._hover = this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('element'), this._element, title));
        }
        else if (this._hover) {
            this._hover.update(title);
        }
    }
    focus() {
        this._element.focus();
    }
    hasFocus() {
        return isActiveElement(this._element);
    }
}
export class ButtonWithDropdown extends Disposable {
    constructor(container, options) {
        super();
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this.element = document.createElement('div');
        this.element.classList.add('monaco-button-dropdown');
        container.appendChild(this.element);
        if (!options.hoverDelegate) {
            options = { ...options, hoverDelegate: this._register(createInstantHoverDelegate()) };
        }
        this.primaryButton = this._register(new Button(this.element, options));
        this._register(this.primaryButton.onDidClick(e => this._onDidClick.fire(e)));
        this.action = this._register(new Action('primaryAction', renderAsPlaintext(this.primaryButton.label), undefined, true, async () => this._onDidClick.fire(undefined)));
        this.separatorContainer = document.createElement('div');
        this.separatorContainer.classList.add('monaco-button-dropdown-separator');
        this.separator = document.createElement('div');
        this.separatorContainer.appendChild(this.separator);
        this.element.appendChild(this.separatorContainer);
        // Separator styles
        const border = options.buttonBorder;
        if (border) {
            this.separatorContainer.style.borderTop = '1px solid ' + border;
            this.separatorContainer.style.borderBottom = '1px solid ' + border;
        }
        const buttonBackground = options.secondary ? options.buttonSecondaryBackground : options.buttonBackground;
        this.separatorContainer.style.backgroundColor = buttonBackground ?? '';
        this.separator.style.backgroundColor = options.buttonSeparator ?? '';
        this.dropdownButton = this._register(new Button(this.element, { ...options, title: localize("button dropdown more actions", 'More Actions...'), supportIcons: true }));
        this.dropdownButton.element.setAttribute('aria-haspopup', 'true');
        this.dropdownButton.element.setAttribute('aria-expanded', 'false');
        this.dropdownButton.element.classList.add('monaco-dropdown-button');
        this.dropdownButton.icon = Codicon.dropDownButton;
        this._register(this.dropdownButton.onDidClick(e => {
            const actions = Array.isArray(options.actions) ? options.actions : options.actions.getActions();
            options.contextMenuProvider.showContextMenu({
                getAnchor: () => this.dropdownButton.element,
                getActions: () => options.addPrimaryActionToDropdown === false ? [...actions] : [this.action, ...actions],
                actionRunner: options.actionRunner,
                onHide: () => this.dropdownButton.element.setAttribute('aria-expanded', 'false'),
                layer: options.dropdownLayer
            });
            this.dropdownButton.element.setAttribute('aria-expanded', 'true');
        }));
    }
    dispose() {
        super.dispose();
        this.element.remove();
    }
    set label(value) {
        this.primaryButton.label = value;
        this.action.label = value;
    }
    set icon(icon) {
        this.primaryButton.icon = icon;
    }
    set enabled(enabled) {
        this.primaryButton.enabled = enabled;
        this.dropdownButton.enabled = enabled;
        this.element.classList.toggle('disabled', !enabled);
    }
    get enabled() {
        return this.primaryButton.enabled;
    }
    set checked(value) {
        this.primaryButton.checked = value;
    }
    get checked() {
        return this.primaryButton.checked;
    }
    focus() {
        this.primaryButton.focus();
    }
    hasFocus() {
        return this.primaryButton.hasFocus() || this.dropdownButton.hasFocus();
    }
}
export class ButtonWithDescription {
    constructor(container, options) {
        this.options = options;
        this._element = document.createElement('div');
        this._element.classList.add('monaco-description-button');
        this._button = new Button(this._element, options);
        this._descriptionElement = document.createElement('div');
        this._descriptionElement.classList.add('monaco-button-description');
        this._element.appendChild(this._descriptionElement);
        container.appendChild(this._element);
    }
    get onDidClick() {
        return this._button.onDidClick;
    }
    get element() {
        return this._element;
    }
    set label(value) {
        this._button.label = value;
    }
    set icon(icon) {
        this._button.icon = icon;
    }
    get enabled() {
        return this._button.enabled;
    }
    set enabled(enabled) {
        this._button.enabled = enabled;
    }
    set checked(value) {
        this._button.checked = value;
    }
    get checked() {
        return this._button.checked;
    }
    focus() {
        this._button.focus();
    }
    hasFocus() {
        return this._button.hasFocus();
    }
    dispose() {
        this._button.dispose();
    }
    set description(value) {
        if (this.options.supportIcons) {
            reset(this._descriptionElement, ...renderLabelWithIcons(value));
        }
        else {
            this._descriptionElement.textContent = value;
        }
    }
}
export var ButtonBarAlignment;
(function (ButtonBarAlignment) {
    ButtonBarAlignment[ButtonBarAlignment["Horizontal"] = 0] = "Horizontal";
    ButtonBarAlignment[ButtonBarAlignment["Vertical"] = 1] = "Vertical";
})(ButtonBarAlignment || (ButtonBarAlignment = {}));
export class ButtonBar {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this._buttons = [];
        this._buttonStore = new DisposableStore();
    }
    dispose() {
        this._buttonStore.dispose();
    }
    get buttons() {
        return this._buttons;
    }
    clear() {
        this._buttonStore.clear();
        this._buttons.length = 0;
    }
    addButton(options) {
        const button = this._buttonStore.add(new Button(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDescription(options) {
        const button = this._buttonStore.add(new ButtonWithDescription(this.container, options));
        this.pushButton(button);
        return button;
    }
    addButtonWithDropdown(options) {
        const button = this._buttonStore.add(new ButtonWithDropdown(this.container, options));
        this.pushButton(button);
        return button;
    }
    pushButton(button) {
        this._buttons.push(button);
        const index = this._buttons.length - 1;
        this._buttonStore.add(addDisposableListener(button.element, EventType.KEY_DOWN, e => {
            const event = new StandardKeyboardEvent(e);
            let eventHandled = true;
            // Next / Previous Button
            let buttonIndexToFocus;
            if (event.equals(this.options?.alignment === ButtonBarAlignment.Vertical ? 16 /* KeyCode.UpArrow */ : 15 /* KeyCode.LeftArrow */)) {
                buttonIndexToFocus = index > 0 ? index - 1 : this._buttons.length - 1;
            }
            else if (event.equals(this.options?.alignment === ButtonBarAlignment.Vertical ? 18 /* KeyCode.DownArrow */ : 17 /* KeyCode.RightArrow */)) {
                buttonIndexToFocus = index === this._buttons.length - 1 ? 0 : index + 1;
            }
            else {
                eventHandled = false;
            }
            if (eventHandled && typeof buttonIndexToFocus === 'number') {
                this._buttons[buttonIndexToFocus].focus();
                EventHelper.stop(e, true);
            }
        }));
    }
}
/**
 * This is a Button that supports an icon to the left, and markdown to the right, with proper separation and wrapping the markdown label, which Button doesn't do.
 */
export class ButtonWithIcon extends Button {
    get labelElement() { return this._mdlabelElement; }
    constructor(container, options) {
        super(container, options);
        if (options.supportShortLabel) {
            throw new Error('ButtonWithIcon does not support short labels');
        }
        this._element.classList.add('monaco-icon-button');
        this._iconElement = $('');
        this._mdlabelElement = $('.monaco-button-mdlabel');
        this._element.append(this._iconElement, this._mdlabelElement);
    }
    get label() {
        return super.label;
    }
    set label(value) {
        if (this._label === value) {
            return;
        }
        if (isMarkdownString(this._label) && isMarkdownString(value) && markdownStringEqual(this._label, value)) {
            return;
        }
        this._element.classList.add('monaco-text-button');
        if (isMarkdownString(value)) {
            const rendered = renderMarkdown(value, undefined, document.createElement('span'));
            rendered.dispose();
            const root = rendered.element.querySelector('p')?.innerHTML;
            if (root) {
                safeSetInnerHtml(this._mdlabelElement, root, buttonSanitizerOptions);
            }
            else {
                reset(this._mdlabelElement);
            }
        }
        else {
            if (this.options.supportIcons) {
                reset(this._mdlabelElement, ...this.getContentElements(value));
            }
            else {
                this._mdlabelElement.textContent = value;
            }
        }
        let title = '';
        if (typeof this.options.title === 'string') {
            title = this.options.title;
        }
        else if (this.options.title) {
            title = renderAsPlaintext(value);
        }
        this.setTitle(title);
        this._setAriaLabel();
        this._label = value;
    }
    get icon() {
        return super.icon;
    }
    set icon(icon) {
        this._iconElement.classList.value = '';
        this._iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        this._setAriaLabel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvYnV0dG9uL2J1dHRvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBaUIsZUFBZSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUEwQixNQUFNLDRCQUE0QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFzQixPQUFPLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekQs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