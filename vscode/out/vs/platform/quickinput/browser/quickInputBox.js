/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { FindInput } from '../../../base/browser/ui/findinput/findInput.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import Severity from '../../../base/common/severity.js';
import './media/quickInput.css';
const $ = dom.$;
export class QuickInputBox extends Disposable {
    constructor(parent, inputBoxStyles, toggleStyles) {
        super();
        this.parent = parent;
        this.onDidChange = (handler) => {
            return this.findInput.onDidChange(handler);
        };
        this.container = dom.append(this.parent, $('.quick-input-box'));
        this.findInput = this._register(new FindInput(this.container, undefined, { label: '', inputBoxStyles, toggleStyles }));
        const input = this.findInput.inputBox.inputElement;
        input.role = 'textbox';
        input.ariaHasPopup = 'menu';
        input.ariaAutoComplete = 'list';
    }
    get onKeyDown() {
        return this.findInput.onKeyDown;
    }
    get onMouseDown() {
        return this.findInput.onMouseDown;
    }
    get value() {
        return this.findInput.getValue();
    }
    set value(value) {
        this.findInput.setValue(value);
    }
    select(range = null) {
        this.findInput.inputBox.select(range);
    }
    getSelection() {
        return this.findInput.inputBox.getSelection();
    }
    isSelectionAtEnd() {
        return this.findInput.inputBox.isSelectionAtEnd();
    }
    setPlaceholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get placeholder() {
        return this.findInput.inputBox.inputElement.getAttribute('placeholder') || '';
    }
    set placeholder(placeholder) {
        this.findInput.inputBox.setPlaceHolder(placeholder);
    }
    get password() {
        return this.findInput.inputBox.inputElement.type === 'password';
    }
    set password(password) {
        this.findInput.inputBox.inputElement.type = password ? 'password' : 'text';
    }
    set enabled(enabled) {
        // We can't disable the input box because it is still used for
        // navigating the list. Instead, we disable the list and the OK
        // so that nothing can be selected.
        // TODO: should this be what we do for all find inputs? Or maybe some _other_ API
        // on findInput to change it to readonly?
        this.findInput.inputBox.inputElement.toggleAttribute('readonly', !enabled);
        // TODO: styles of the quick pick need to be moved to the CSS instead of being in line
        // so things like this can be done in CSS
        // this.findInput.inputBox.inputElement.classList.toggle('disabled', !enabled);
    }
    set toggles(toggles) {
        this.findInput.setAdditionalToggles(toggles);
    }
    get ariaLabel() {
        return this.findInput.inputBox.inputElement.getAttribute('aria-label') || '';
    }
    set ariaLabel(ariaLabel) {
        this.findInput.inputBox.inputElement.setAttribute('aria-label', ariaLabel);
    }
    hasFocus() {
        return this.findInput.inputBox.hasFocus();
    }
    setAttribute(name, value) {
        this.findInput.inputBox.inputElement.setAttribute(name, value);
    }
    removeAttribute(name) {
        this.findInput.inputBox.inputElement.removeAttribute(name);
    }
    showDecoration(decoration) {
        if (decoration === Severity.Ignore) {
            this.findInput.clearMessage();
        }
        else {
            this.findInput.showMessage({ type: decoration === Severity.Info ? 1 /* MessageType.INFO */ : decoration === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */, content: '' });
        }
    }
    stylesForType(decoration) {
        return this.findInput.inputBox.stylesForType(decoration === Severity.Info ? 1 /* MessageType.INFO */ : decoration === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */);
    }
    setFocus() {
        this.findInput.focus();
    }
    layout() {
        this.findInput.inputBox.layout();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEJveC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3F1aWNrSW5wdXRCb3gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFHNUUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sd0JBQXdCLENBQUM7QUFFaEMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUVoQixNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFLNUMsWUFDUyxNQUFtQixFQUMzQixjQUErQixFQUMvQixZQUEyQjtRQUUzQixLQUFLLEVBQUUsQ0FBQztRQUpBLFdBQU0sR0FBTixNQUFNLENBQWE7UUFxQjVCLGdCQUFXLEdBQUcsQ0FBQyxPQUFnQyxFQUFlLEVBQUU7WUFDL0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDLENBQUM7UUFsQkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUs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