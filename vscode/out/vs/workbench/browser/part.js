/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/part.css';
import { Component } from '../common/component.js';
import { Dimension, size, getActiveDocument, prepend } from '../../base/browser/dom.js';
import { Emitter } from '../../base/common/event.js';
import { assertReturnsDefined } from '../../base/common/types.js';
import { toDisposable } from '../../base/common/lifecycle.js';
/**
 * Parts are layed out in the workbench and have their own layout that
 * arranges an optional title and mandatory content area to show content.
 */
export class Part extends Component {
    get dimension() { return this._dimension; }
    get contentPosition() { return this._contentPosition; }
    constructor(id, options, themeService, storageService, layoutService) {
        super(id, themeService, storageService);
        this.options = options;
        this.layoutService = layoutService;
        this._onDidVisibilityChange = this._register(new Emitter());
        this.onDidVisibilityChange = this._onDidVisibilityChange.event;
        //#region ISerializableView
        this._onDidChange = this._register(new Emitter());
        this._register(layoutService.registerPart(this));
    }
    onThemeChange(theme) {
        // only call if our create() method has been called
        if (this.parent) {
            super.onThemeChange(theme);
        }
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to create title and content area of the part.
     */
    create(parent, options) {
        this.parent = parent;
        this.titleArea = this.createTitleArea(parent, options);
        this.contentArea = this.createContentArea(parent, options);
        this.partLayout = new PartLayout(this.options, this.contentArea);
        this.updateStyles();
    }
    /**
     * Returns the overall part container.
     */
    getContainer() {
        return this.parent;
    }
    /**
     * Subclasses override to provide a title area implementation.
     */
    createTitleArea(parent, options) {
        return undefined;
    }
    /**
     * Returns the title area container.
     */
    getTitleArea() {
        return this.titleArea;
    }
    /**
     * Subclasses override to provide a content area implementation.
     */
    createContentArea(parent, options) {
        return undefined;
    }
    /**
     * Returns the content area container.
     */
    getContentArea() {
        return this.contentArea;
    }
    /**
     * Sets the header area
     */
    setHeaderArea(headerContainer) {
        if (this.headerArea) {
            throw new Error('Header already exists');
        }
        if (!this.parent || !this.titleArea) {
            return;
        }
        prepend(this.parent, headerContainer);
        headerContainer.classList.add('header-or-footer');
        headerContainer.classList.add('header');
        this.headerArea = headerContainer;
        this.partLayout?.setHeaderVisibility(true);
        this.relayout();
    }
    /**
     * Sets the footer area
     */
    setFooterArea(footerContainer) {
        if (this.footerArea) {
            throw new Error('Footer already exists');
        }
        if (!this.parent || !this.titleArea) {
            return;
        }
        this.parent.appendChild(footerContainer);
        footerContainer.classList.add('header-or-footer');
        footerContainer.classList.add('footer');
        this.footerArea = footerContainer;
        this.partLayout?.setFooterVisibility(true);
        this.relayout();
    }
    /**
     * removes the header area
     */
    removeHeaderArea() {
        if (this.headerArea) {
            this.headerArea.remove();
            this.headerArea = undefined;
            this.partLayout?.setHeaderVisibility(false);
            this.relayout();
        }
    }
    /**
     * removes the footer area
     */
    removeFooterArea() {
        if (this.footerArea) {
            this.footerArea.remove();
            this.footerArea = undefined;
            this.partLayout?.setFooterVisibility(false);
            this.relayout();
        }
    }
    relayout() {
        if (this.dimension && this.contentPosition) {
            this.layout(this.dimension.width, this.dimension.height, this.contentPosition.top, this.contentPosition.left);
        }
    }
    /**
     * Layout title and content area in the given dimension.
     */
    layoutContents(width, height) {
        const partLayout = assertReturnsDefined(this.partLayout);
        return partLayout.layout(width, height);
    }
    get onDidChange() { return this._onDidChange.event; }
    layout(width, height, top, left) {
        this._dimension = new Dimension(width, height);
        this._contentPosition = { top, left };
    }
    setVisible(visible) {
        this._onDidVisibilityChange.fire(visible);
    }
}
class PartLayout {
    static { this.HEADER_HEIGHT = 35; }
    static { this.TITLE_HEIGHT = 35; }
    static { this.Footer_HEIGHT = 35; }
    constructor(options, contentArea) {
        this.options = options;
        this.contentArea = contentArea;
        this.headerVisible = false;
        this.footerVisible = false;
    }
    layout(width, height) {
        // Title Size: Width (Fill), Height (Variable)
        let titleSize;
        if (this.options.hasTitle) {
            titleSize = new Dimension(width, Math.min(height, PartLayout.TITLE_HEIGHT));
        }
        else {
            titleSize = Dimension.None;
        }
        // Header Size: Width (Fill), Height (Variable)
        let headerSize;
        if (this.headerVisible) {
            headerSize = new Dimension(width, Math.min(height, PartLayout.HEADER_HEIGHT));
        }
        else {
            headerSize = Dimension.None;
        }
        // Footer Size: Width (Fill), Height (Variable)
        let footerSize;
        if (this.footerVisible) {
            footerSize = new Dimension(width, Math.min(height, PartLayout.Footer_HEIGHT));
        }
        else {
            footerSize = Dimension.None;
        }
        let contentWidth = width;
        if (this.options && typeof this.options.borderWidth === 'function') {
            contentWidth -= this.options.borderWidth(); // adjust for border size
        }
        // Content Size: Width (Fill), Height (Variable)
        const contentSize = new Dimension(contentWidth, height - titleSize.height - headerSize.height - footerSize.height);
        // Content
        if (this.contentArea) {
            size(this.contentArea, contentSize.width, contentSize.height);
        }
        return { headerSize, titleSize, contentSize, footerSize };
    }
    setFooterVisibility(visible) {
        this.footerVisible = visible;
    }
    setHeaderVisibility(visible) {
        this.headerVisible = visible;
    }
}
export class MultiWindowParts extends Component {
    constructor() {
        super(...arguments);
        this._parts = new Set();
    }
    get parts() { return Array.from(this._parts); }
    registerPart(part) {
        this._parts.add(part);
        return toDisposable(() => this.unregisterPart(part));
    }
    unregisterPart(part) {
        this._parts.delete(part);
    }
    getPart(container) {
        return this.getPartByDocument(container.ownerDocument);
    }
    getPartByDocument(document) {
        if (this._parts.size > 1) {
            for (const part of this._parts) {
                if (part.element?.ownerDocument === document) {
                    return part;
                }
            }
        }
        return this.mainPart;
    }
    get activePart() {
        return this.getPartByDocument(getActiveDocument());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGtCQUFrQixDQUFDO0FBQzFCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBYyxpQkFBaUIsRUFBRSxPQUFPLEVBQWdCLE1BQU0sMkJBQTJCLENBQUM7QUFHbEgsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQWMzRTs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLElBQUssU0FBUSxTQUFTO0lBRzNDLElBQUksU0FBUyxLQUE0QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBR2xFLElBQUksZUFBZSxLQUErQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7SUFZakYsWUFDQyxFQUFVLEVBQ0YsT0FBcUIsRUFDN0IsWUFBMkIsRUFDM0IsY0FBK0IsRUFDWixhQUFzQztRQUV6RCxLQUFLLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUxoQyxZQUFPLEdBQVAsT0FBTyxDQUFjO1FBR1Ysa0JBQWEsR0FBYixhQUFhLENBQXlCO1FBZmhELDJCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFDO1FBQ2pFLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7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