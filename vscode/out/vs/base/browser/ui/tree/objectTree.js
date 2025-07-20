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
import { AbstractTree } from './abstractTree.js';
import { CompressibleObjectTreeModel } from './compressedObjectTreeModel.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { memoize } from '../../../common/decorators.js';
import { Iterable } from '../../../common/iterator.js';
export class ObjectTree extends AbstractTree {
    get onDidChangeCollapseState() { return this.model.onDidChangeCollapseState; }
    constructor(user, container, delegate, renderers, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    rerender(element) {
        if (element === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(element);
    }
    updateElementHeight(element, height) {
        const elementIndex = this.model.getListIndex(element);
        if (elementIndex === -1) {
            return;
        }
        this.view.updateElementHeight(elementIndex, height);
    }
    resort(element, recursive = true) {
        this.model.resort(element, recursive);
    }
    hasElement(element) {
        return this.model.has(element);
    }
    createModel(user, options) {
        return new ObjectTreeModel(user, options);
    }
}
class CompressibleRenderer {
    get compressedTreeNodeProvider() {
        return this._compressedTreeNodeProvider();
    }
    constructor(_compressedTreeNodeProvider, stickyScrollDelegate, renderer) {
        this._compressedTreeNodeProvider = _compressedTreeNodeProvider;
        this.stickyScrollDelegate = stickyScrollDelegate;
        this.renderer = renderer;
        this.templateId = renderer.templateId;
        if (renderer.onDidChangeTwistieState) {
            this.onDidChangeTwistieState = renderer.onDidChangeTwistieState;
        }
    }
    renderTemplate(container) {
        const data = this.renderer.renderTemplate(container);
        return { compressedTreeNode: undefined, data };
    }
    renderElement(node, index, templateData, details) {
        let compressedTreeNode = this.stickyScrollDelegate.getCompressedNode(node);
        if (!compressedTreeNode) {
            compressedTreeNode = this.compressedTreeNodeProvider.getCompressedTreeNode(node.element);
        }
        if (compressedTreeNode.element.elements.length === 1) {
            templateData.compressedTreeNode = undefined;
            this.renderer.renderElement(node, index, templateData.data, details);
        }
        else {
            templateData.compressedTreeNode = compressedTreeNode;
            this.renderer.renderCompressedElements(compressedTreeNode, index, templateData.data, details);
        }
    }
    disposeElement(node, index, templateData, details) {
        if (templateData.compressedTreeNode) {
            this.renderer.disposeCompressedElements?.(templateData.compressedTreeNode, index, templateData.data, details);
        }
        else {
            this.renderer.disposeElement?.(node, index, templateData.data, details);
        }
    }
    disposeTemplate(templateData) {
        this.renderer.disposeTemplate(templateData.data);
    }
    renderTwistie(element, twistieElement) {
        return this.renderer.renderTwistie?.(element, twistieElement) ?? false;
    }
}
__decorate([
    memoize
], CompressibleRenderer.prototype, "compressedTreeNodeProvider", null);
class CompressibleStickyScrollDelegate {
    constructor(modelProvider) {
        this.modelProvider = modelProvider;
        this.compressedStickyNodes = new Map();
    }
    getCompressedNode(node) {
        return this.compressedStickyNodes.get(node);
    }
    constrainStickyScrollNodes(stickyNodes, stickyScrollMaxItemCount, maxWidgetHeight) {
        this.compressedStickyNodes.clear();
        if (stickyNodes.length === 0) {
            return [];
        }
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const stickyNodeBottom = stickyNode.position + stickyNode.height;
            const followingReachesMaxHeight = i + 1 < stickyNodes.length && stickyNodeBottom + stickyNodes[i + 1].height > maxWidgetHeight;
            if (followingReachesMaxHeight || i >= stickyScrollMaxItemCount - 1 && stickyScrollMaxItemCount < stickyNodes.length) {
                const uncompressedStickyNodes = stickyNodes.slice(0, i);
                const overflowingStickyNodes = stickyNodes.slice(i);
                const compressedStickyNode = this.compressStickyNodes(overflowingStickyNodes);
                return [...uncompressedStickyNodes, compressedStickyNode];
            }
        }
        return stickyNodes;
    }
    compressStickyNodes(stickyNodes) {
        if (stickyNodes.length === 0) {
            throw new Error('Can\'t compress empty sticky nodes');
        }
        const compressionModel = this.modelProvider();
        if (!compressionModel.isCompressionEnabled()) {
            return stickyNodes[0];
        }
        // Collect all elements to be compressed
        const elements = [];
        for (let i = 0; i < stickyNodes.length; i++) {
            const stickyNode = stickyNodes[i];
            const compressedNode = compressionModel.getCompressedTreeNode(stickyNode.node.element);
            if (compressedNode.element) {
                // if an element is incompressible, it can't be compressed with it's parent element
                if (i !== 0 && compressedNode.element.incompressible) {
                    break;
                }
                elements.push(...compressedNode.element.elements);
            }
        }
        if (elements.length < 2) {
            return stickyNodes[0];
        }
        // Compress the elements
        const lastStickyNode = stickyNodes[stickyNodes.length - 1];
        const compressedElement = { elements, incompressible: false };
        const compressedNode = { ...lastStickyNode.node, children: [], element: compressedElement };
        const stickyTreeNode = new Proxy(stickyNodes[0].node, {});
        const compressedStickyNode = {
            node: stickyTreeNode,
            startIndex: stickyNodes[0].startIndex,
            endIndex: lastStickyNode.endIndex,
            position: stickyNodes[0].position,
            height: stickyNodes[0].height,
        };
        this.compressedStickyNodes.set(stickyTreeNode, compressedNode);
        return compressedStickyNode;
    }
}
function asObjectTreeOptions(compressedTreeNodeProvider, options) {
    return options && {
        ...options,
        keyboardNavigationLabelProvider: options.keyboardNavigationLabelProvider && {
            getKeyboardNavigationLabel(e) {
                let compressedTreeNode;
                try {
                    compressedTreeNode = compressedTreeNodeProvider().getCompressedTreeNode(e);
                }
                catch {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                if (compressedTreeNode.element.elements.length === 1) {
                    return options.keyboardNavigationLabelProvider.getKeyboardNavigationLabel(e);
                }
                else {
                    return options.keyboardNavigationLabelProvider.getCompressedNodeKeyboardNavigationLabel(compressedTreeNode.element.elements);
                }
            }
        }
    };
}
export class CompressibleObjectTree extends ObjectTree {
    constructor(user, container, delegate, renderers, options = {}) {
        const compressedTreeNodeProvider = () => this;
        const stickyScrollDelegate = new CompressibleStickyScrollDelegate(() => this.model);
        const compressibleRenderers = renderers.map(r => new CompressibleRenderer(compressedTreeNodeProvider, stickyScrollDelegate, r));
        super(user, container, delegate, compressibleRenderers, { ...asObjectTreeOptions(compressedTreeNodeProvider, options), stickyScrollDelegate });
    }
    setChildren(element, children = Iterable.empty(), options) {
        this.model.setChildren(element, children, options);
    }
    createModel(user, options) {
        return new CompressibleObjectTreeModel(user, options);
    }
    updateOptions(optionsUpdate = {}) {
        super.updateOptions(optionsUpdate);
        if (typeof optionsUpdate.compressionEnabled !== 'undefined') {
            this.model.setCompressionEnabled(optionsUpdate.compressionEnabled);
        }
    }
    getCompressedTreeNode(element = null) {
        return this.model.getCompressedTreeNode(element);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvb2JqZWN0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUE2RixNQUFNLG1CQUFtQixDQUFDO0FBQzVJLE9BQU8sRUFBRSwyQkFBMkIsRUFBOEQsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6SSxPQUFPLEVBQW9CLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRXpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUF5QnZELE1BQU0sT0FBTyxVQUEyRCxTQUFRLFlBQTZDO0lBSTVILElBQWEsd0JBQXdCLEtBQThELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7SUFFaEosWUFDb0IsSUFBWSxFQUMvQixTQUFzQixFQUN0QixRQUFpQyxFQUNqQyxTQUErQyxFQUMvQyxVQUE4QyxFQUFFO1FBRWhELEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBb0QsQ0FBQyxDQUFDO1FBTi9FLFNBQUksR0FBSixJQUFJLENBQVE7SUFPaEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFpQixFQUFFLFdBQTRDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUEwQztRQUN0SSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRCxRQUFRLENBQUMsT0FBVztRQUNuQixJQUFJLE9BQU8sS0FBSyxT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