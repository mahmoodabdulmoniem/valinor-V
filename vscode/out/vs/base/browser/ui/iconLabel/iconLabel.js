/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './iconlabel.css';
import * as dom from '../../dom.js';
import * as css from '../../cssValue.js';
import { HighlightedLabel } from '../highlightedlabel/highlightedLabel.js';
import { Disposable } from '../../../common/lifecycle.js';
import { equals } from '../../../common/objects.js';
import { Range } from '../../../common/range.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
class FastLabelNode {
    constructor(_element) {
        this._element = _element;
    }
    get element() {
        return this._element;
    }
    set textContent(content) {
        if (this.disposed || content === this._textContent) {
            return;
        }
        this._textContent = content;
        this._element.textContent = content;
    }
    set classNames(classNames) {
        if (this.disposed || equals(classNames, this._classNames)) {
            return;
        }
        this._classNames = classNames;
        this._element.classList.value = '';
        this._element.classList.add(...classNames);
    }
    set empty(empty) {
        if (this.disposed || empty === this._empty) {
            return;
        }
        this._empty = empty;
        this._element.style.marginLeft = empty ? '0' : '';
    }
    dispose() {
        this.disposed = true;
    }
}
export class IconLabel extends Disposable {
    constructor(container, options) {
        super();
        this.customHovers = new Map();
        this.creationOptions = options;
        this.domNode = this._register(new FastLabelNode(dom.append(container, dom.$('.monaco-icon-label'))));
        this.labelContainer = dom.append(this.domNode.element, dom.$('.monaco-icon-label-container'));
        this.nameContainer = dom.append(this.labelContainer, dom.$('span.monaco-icon-name-container'));
        if (options?.supportHighlights || options?.supportIcons) {
            this.nameNode = this._register(new LabelWithHighlights(this.nameContainer, !!options.supportIcons));
        }
        else {
            this.nameNode = new Label(this.nameContainer);
        }
        this.hoverDelegate = options?.hoverDelegate ?? getDefaultHoverDelegate('mouse');
    }
    get element() {
        return this.domNode.element;
    }
    setLabel(label, description, options) {
        const labelClasses = ['monaco-icon-label'];
        const containerClasses = ['monaco-icon-label-container'];
        let ariaLabel = '';
        if (options) {
            if (options.extraClasses) {
                labelClasses.push(...options.extraClasses);
            }
            if (options.italic) {
                labelClasses.push('italic');
            }
            if (options.strikethrough) {
                labelClasses.push('strikethrough');
            }
            if (options.disabledCommand) {
                containerClasses.push('disabled');
            }
            if (options.title) {
                if (typeof options.title === 'string') {
                    ariaLabel += options.title;
                }
                else {
                    ariaLabel += label;
                }
            }
        }
        const existingIconNode = this.domNode.element.querySelector('.monaco-icon-label-iconpath');
        if (options?.iconPath) {
            let iconNode;
            if (!existingIconNode || !(dom.isHTMLElement(existingIconNode))) {
                iconNode = dom.$('.monaco-icon-label-iconpath');
                this.domNode.element.prepend(iconNode);
            }
            else {
                iconNode = existingIconNode;
            }
            iconNode.style.backgroundImage = css.asCSSUrl(options?.iconPath);
            iconNode.style.backgroundRepeat = 'no-repeat';
            iconNode.style.backgroundPosition = 'center';
            iconNode.style.backgroundSize = 'contain';
        }
        else if (existingIconNode) {
            existingIconNode.remove();
        }
        this.domNode.classNames = labelClasses;
        this.domNode.element.setAttribute('aria-label', ariaLabel);
        this.labelContainer.classList.value = '';
        this.labelContainer.classList.add(...containerClasses);
        this.setupHover(options?.descriptionTitle ? this.labelContainer : this.element, options?.title);
        this.nameNode.setLabel(label, options);
        if (description || this.descriptionNode) {
            const descriptionNode = this.getOrCreateDescriptionNode();
            if (descriptionNode instanceof HighlightedLabel) {
                descriptionNode.set(description || '', options ? options.descriptionMatches : undefined, undefined, options?.labelEscapeNewLines);
                this.setupHover(descriptionNode.element, options?.descriptionTitle);
            }
            else {
                descriptionNode.textContent = description && options?.labelEscapeNewLines ? HighlightedLabel.escapeNewLines(description, []) : (description || '');
                this.setupHover(descriptionNode.element, options?.descriptionTitle || '');
                descriptionNode.empty = !description;
            }
        }
        if (options?.suffix || this.suffixNode) {
            const suffixNode = this.getOrCreateSuffixNode();
            suffixNode.textContent = options?.suffix ?? '';
        }
    }
    setupHover(htmlElement, tooltip) {
        const previousCustomHover = this.customHovers.get(htmlElement);
        if (previousCustomHover) {
            previousCustomHover.dispose();
            this.customHovers.delete(htmlElement);
        }
        if (!tooltip) {
            htmlElement.removeAttribute('title');
            return;
        }
        let hoverTarget = htmlElement;
        if (this.creationOptions?.hoverTargetOverride) {
            if (!dom.isAncestor(htmlElement, this.creationOptions.hoverTargetOverride)) {
                throw new Error('hoverTargetOverrride must be an ancestor of the htmlElement');
            }
            hoverTarget = this.creationOptions.hoverTargetOverride;
        }
        const hoverDisposable = getBaseLayerHoverDelegate().setupManagedHover(this.hoverDelegate, hoverTarget, tooltip);
        if (hoverDisposable) {
            this.customHovers.set(htmlElement, hoverDisposable);
        }
    }
    dispose() {
        super.dispose();
        for (const disposable of this.customHovers.values()) {
            disposable.dispose();
        }
        this.customHovers.clear();
    }
    getOrCreateSuffixNode() {
        if (!this.suffixNode) {
            const suffixContainer = this._register(new FastLabelNode(dom.after(this.nameContainer, dom.$('span.monaco-icon-suffix-container'))));
            this.suffixNode = this._register(new FastLabelNode(dom.append(suffixContainer.element, dom.$('span.label-suffix'))));
        }
        return this.suffixNode;
    }
    getOrCreateDescriptionNode() {
        if (!this.descriptionNode) {
            const descriptionContainer = this._register(new FastLabelNode(dom.append(this.labelContainer, dom.$('span.monaco-icon-description-container'))));
            if (this.creationOptions?.supportDescriptionHighlights) {
                this.descriptionNode = this._register(new HighlightedLabel(dom.append(descriptionContainer.element, dom.$('span.label-description')), { supportIcons: !!this.creationOptions.supportIcons }));
            }
            else {
                this.descriptionNode = this._register(new FastLabelNode(dom.append(descriptionContainer.element, dom.$('span.label-description'))));
            }
        }
        return this.descriptionNode;
    }
}
class Label {
    constructor(container) {
        this.container = container;
        this.label = undefined;
        this.singleLabel = undefined;
    }
    setLabel(label, options) {
        if (this.label === label && equals(this.options, options)) {
            return;
        }
        this.label = label;
        this.options = options;
        if (typeof label === 'string') {
            if (!this.singleLabel) {
                this.container.innerText = '';
                this.container.classList.remove('multiple');
                this.singleLabel = dom.append(this.container, dom.$('a.label-name', { id: options?.domId }));
            }
            this.singleLabel.textContent = label;
        }
        else {
            this.container.innerText = '';
            this.container.classList.add('multiple');
            this.singleLabel = undefined;
            for (let i = 0; i < label.length; i++) {
                const l = label[i];
                const id = options?.domId && `${options?.domId}_${i}`;
                dom.append(this.container, dom.$('a.label-name', { id, 'data-icon-label-count': label.length, 'data-icon-label-index': i, 'role': 'treeitem' }, l));
                if (i < label.length - 1) {
                    dom.append(this.container, dom.$('span.label-separator', undefined, options?.separator || '/'));
                }
            }
        }
    }
}
function splitMatches(labels, separator, matches) {
    if (!matches) {
        return undefined;
    }
    let labelStart = 0;
    return labels.map(label => {
        const labelRange = { start: labelStart, end: labelStart + label.length };
        const result = matches
            .map(match => Range.intersect(labelRange, match))
            .filter(range => !Range.isEmpty(range))
            .map(({ start, end }) => ({ start: start - labelStart, end: end - labelStart }));
        labelStart = labelRange.end + separator.length;
        return result;
    });
}
class LabelWithHighlights extends Disposable {
    constructor(container, supportIcons) {
        super();
        this.container = container;
        this.supportIcons = supportIcons;
        this.label = undefined;
        this.singleLabel = undefined;
    }
    setLabel(label, options) {
        if (this.label === label && equals(this.options, options)) {
            return;
        }
        this.label = label;
        this.options = options;
        if (typeof label === 'string') {
            if (!this.singleLabel) {
                this.container.innerText = '';
                this.container.classList.remove('multiple');
                this.singleLabel = this._register(new HighlightedLabel(dom.append(this.container, dom.$('a.label-name', { id: options?.domId })), { supportIcons: this.supportIcons }));
            }
            this.singleLabel.set(label, options?.matches, undefined, options?.labelEscapeNewLines);
        }
        else {
            this.container.innerText = '';
            this.container.classList.add('multiple');
            this.singleLabel = undefined;
            const separator = options?.separator || '/';
            const matches = splitMatches(label, separator, options?.matches);
            for (let i = 0; i < label.length; i++) {
                const l = label[i];
                const m = matches ? matches[i] : undefined;
                const id = options?.domId && `${options?.domId}_${i}`;
                const name = dom.$('a.label-name', { id, 'data-icon-label-count': label.length, 'data-icon-label-index': i, 'role': 'treeitem' });
                const highlightedLabel = this._register(new HighlightedLabel(dom.append(this.container, name), { supportIcons: this.supportIcons }));
                highlightedLabel.set(l, m, undefined, options?.labelEscapeNewLines);
                if (i < label.length - 1) {
                    dom.append(name, dom.$('span.label-separator', undefined, separator));
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvaWNvbkxhYmVsL2ljb25MYWJlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxHQUFHLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHM0UsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUE0QnZFLE1BQU0sYUFBYTtJQU1sQixZQUFvQixRQUFxQjtRQUFyQixhQUFRLEdBQVIsUUFBUSxDQUFhO0lBQ3pDLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksV0FBVyxDQUFDLE9BQWU7UUFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEQsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUM1QixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUM7SUFDckMsQ0FBQztJ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