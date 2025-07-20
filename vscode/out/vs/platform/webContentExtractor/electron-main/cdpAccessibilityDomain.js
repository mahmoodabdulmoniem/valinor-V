/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
//#region Types
import { URI } from '../../../base/common/uri.js';
function createNodeTree(nodes) {
    if (nodes.length === 0) {
        return null;
    }
    // Create a map of node IDs to their corresponding nodes for quick lookup
    const nodeLookup = new Map();
    for (const node of nodes) {
        nodeLookup.set(node.nodeId, node);
    }
    // Helper function to get all non-ignored descendants of a node
    function getNonIgnoredDescendants(nodeId) {
        const node = nodeLookup.get(nodeId);
        if (!node || !node.childIds) {
            return [];
        }
        const result = [];
        for (const childId of node.childIds) {
            const childNode = nodeLookup.get(childId);
            if (!childNode) {
                continue;
            }
            if (childNode.ignored) {
                // If child is ignored, add its non-ignored descendants instead
                result.push(...getNonIgnoredDescendants(childId));
            }
            else {
                // Otherwise, add the child itself
                result.push(childId);
            }
        }
        return result;
    }
    // Create tree nodes only for non-ignored nodes
    const nodeMap = new Map();
    for (const node of nodes) {
        if (!node.ignored) {
            nodeMap.set(node.nodeId, { node, children: [], parent: null });
        }
    }
    // Establish parent-child relationships, bypassing ignored nodes
    for (const node of nodes) {
        if (node.ignored) {
            continue;
        }
        const treeNode = nodeMap.get(node.nodeId);
        if (node.childIds) {
            for (const childId of node.childIds) {
                const childNode = nodeLookup.get(childId);
                if (!childNode) {
                    continue;
                }
                if (childNode.ignored) {
                    // If child is ignored, connect its non-ignored descendants to this node
                    const nonIgnoredDescendants = getNonIgnoredDescendants(childId);
                    for (const descendantId of nonIgnoredDescendants) {
                        const descendantTreeNode = nodeMap.get(descendantId);
                        if (descendantTreeNode) {
                            descendantTreeNode.parent = treeNode;
                            treeNode.children.push(descendantTreeNode);
                        }
                    }
                }
                else {
                    // Normal case: add non-ignored child directly
                    const childTreeNode = nodeMap.get(childId);
                    if (childTreeNode) {
                        childTreeNode.parent = treeNode;
                        treeNode.children.push(childTreeNode);
                    }
                }
            }
        }
    }
    // Find the root node (a node without a parent)
    for (const node of nodeMap.values()) {
        if (!node.parent) {
            return node;
        }
    }
    return null;
}
/**
 * When possible, we will make sure lines are no longer than 80. This is to help
 * certain pieces of software that can't handle long lines.
 */
const LINE_MAX_LENGTH = 80;
/**
 * Converts an accessibility tree represented by AXNode objects into a markdown string.
 *
 * @param uri The URI of the document
 * @param axNodes The array of AXNode objects representing the accessibility tree
 * @returns A markdown representation of the accessibility tree
 */
export function convertAXTreeToMarkdown(uri, axNodes) {
    const tree = createNodeTree(axNodes);
    if (!tree) {
        return ''; // Return empty string for empty tree
    }
    // Process tree to extract main content and navigation links
    const mainContent = extractMainContent(uri, tree);
    const navLinks = collectNavigationLinks(tree);
    // Combine main content and navigation links
    return mainContent + (navLinks.length > 0 ? '\n\n## Additional Links\n' + navLinks.join('\n') : '');
}
function extractMainContent(uri, tree) {
    const contentBuffer = [];
    processNode(uri, tree, contentBuffer, 0, true);
    return contentBuffer.join('');
}
function processNode(uri, node, buffer, depth, allowWrap) {
    const role = getNodeRole(node.node);
    switch (role) {
        case 'navigation':
            return; // Skip navigation nodes
        case 'heading':
            processHeadingNode(uri, node, buffer, depth);
            return;
        case 'paragraph':
            processParagraphNode(uri, node, buffer, depth, allowWrap);
            return;
        case 'list':
            buffer.push('\n');
            for (const descChild of node.children) {
                processNode(uri, descChild, buffer, depth + 1, true);
            }
            buffer.push('\n');
            return;
        case 'ListMarker':
            // TODO: Should we normalize these ListMarkers to `-` and normal lists?
            buffer.push(getNodeText(node.node, allowWrap));
            return;
        case 'listitem': {
            const tempBuffer = [];
            // Process the children of the list item
            for (const descChild of node.children) {
                processNode(uri, descChild, tempBuffer, depth + 1, true);
            }
            const indent = getLevel(node.node) > 1 ? ' '.repeat(getLevel(node.node)) : '';
            buffer.push(`${indent}${tempBuffer.join('').trim()}\n`);
            return;
        }
        case 'link':
            if (!isNavigationLink(node)) {
                const linkText = getNodeText(node.node, allowWrap);
                const url = getLinkUrl(node.node);
                if (!isSameUriIgnoringQueryAndFragment(uri, node.node)) {
                    buffer.push(`[${linkText}](${url})`);
                }
                else {
                    buffer.push(linkText);
                }
            }
            return;
        case 'StaticText': {
            const staticText = getNodeText(node.node, allowWrap);
            if (staticText) {
                buffer.push(staticText);
            }
            break;
        }
        case 'image': {
            const altText = getNodeText(node.node, allowWrap) || 'Image';
            const imageUrl = getImageUrl(node.node);
            if (imageUrl) {
                buffer.push(`![${altText}](${imageUrl})\n\n`);
            }
            else {
                buffer.push(`[Image: ${altText}]\n\n`);
            }
            break;
        }
        case 'DescriptionList':
            processDescriptionListNode(uri, node, buffer, depth);
            return;
        case 'blockquote':
            buffer.push('> ' + getNodeText(node.node, allowWrap).replace(/\n/g, '\n> ') + '\n\n');
            break;
        // TODO: Is this the correct way to handle the generic role?
        case 'generic':
            buffer.push(' ');
            break;
        case 'code': {
            processCodeNode(uri, node, buffer, depth);
            return;
        }
        case 'pre':
            buffer.push('```\n' + getNodeText(node.node, false) + '\n```\n\n');
            break;
        case 'table':
            processTableNode(node, buffer);
            return;
    }
    // Process children if not already handled in specific cases
    for (const child of node.children) {
        processNode(uri, child, buffer, depth + 1, allowWrap);
    }
}
function getNodeRole(node) {
    return node.role?.value || '';
}
function getNodeText(node, allowWrap) {
    const text = node.name?.value || node.value?.value || '';
    if (!allowWrap) {
        return text;
    }
    if (text.length <= LINE_MAX_LENGTH) {
        return text;
    }
    const chars = text.split('');
    let lastSpaceIndex = -1;
    for (let i = 1; i < chars.length; i++) {
        if (chars[i] === ' ') {
            lastSpaceIndex = i;
        }
        // Check if we reached the line max length, try to break at the last space
        // before the line max length
        if (i % LINE_MAX_LENGTH === 0 && lastSpaceIndex !== -1) {
            // replace the space with a new line
            chars[lastSpaceIndex] = '\n';
            lastSpaceIndex = i;
        }
    }
    return chars.join('');
}
function getLevel(node) {
    const levelProp = node.properties?.find(p => p.name === 'level');
    return levelProp ? Math.min(Number(levelProp.value.value) || 1, 6) : 1;
}
function getLinkUrl(node) {
    // Find URL in properties
    const urlProp = node.properties?.find(p => p.name === 'url');
    return urlProp?.value.value || '#';
}
function getImageUrl(node) {
    // Find URL in properties
    const urlProp = node.properties?.find(p => p.name === 'url');
    return urlProp?.value.value || null;
}
function isNavigationLink(node) {
    // Check if this link is part of navigation
    let current = node;
    while (current) {
        const role = getNodeRole(current.node);
        if (['navigation', 'menu', 'menubar'].includes(role)) {
            return true;
        }
        current = current.parent;
    }
    return false;
}
function isSameUriIgnoringQueryAndFragment(uri, node) {
    // Check if this link is an anchor link
    const link = getLinkUrl(node);
    try {
        const parsed = URI.parse(link);
        return parsed.scheme === uri.scheme && parsed.authority === uri.authority && parsed.path === uri.path;
    }
    catch (e) {
        return false;
    }
}
function processParagraphNode(uri, node, buffer, depth, allowWrap) {
    buffer.push('\n');
    // Process the children of the paragraph
    for (const child of node.children) {
        processNode(uri, child, buffer, depth + 1, allowWrap);
    }
    buffer.push('\n\n');
}
function processHeadingNode(uri, node, buffer, depth) {
    buffer.push('\n');
    const level = getLevel(node.node);
    buffer.push(`${'#'.repeat(level)} `);
    // Process children nodes of the heading
    for (const child of node.children) {
        if (getNodeRole(child.node) === 'StaticText') {
            buffer.push(getNodeText(child.node, false));
        }
        else {
            processNode(uri, child, buffer, depth + 1, false);
        }
    }
    buffer.push('\n\n');
}
function processDescriptionListNode(uri, node, buffer, depth) {
    buffer.push('\n');
    // Process each child of the description list
    for (const child of node.children) {
        if (getNodeRole(child.node) === 'term') {
            buffer.push('- **');
            // Process term nodes
            for (const termChild of child.children) {
                processNode(uri, termChild, buffer, depth + 1, true);
            }
            buffer.push('** ');
        }
        else if (getNodeRole(child.node) === 'definition') {
            // Process description nodes
            for (const descChild of child.children) {
                processNode(uri, descChild, buffer, depth + 1, true);
            }
            buffer.push('\n');
        }
    }
    buffer.push('\n');
}
function processTableNode(node, buffer) {
    buffer.push('\n');
    // Find rows
    const rows = node.children.filter(child => getNodeRole(child.node).includes('row'));
    if (rows.length > 0) {
        // First row as header
        const headerCells = rows[0].children.filter(cell => getNodeRole(cell.node).includes('cell'));
        // Generate header row
        const headerContent = headerCells.map(cell => getNodeText(cell.node, false) || ' ');
        buffer.push('| ' + headerContent.join(' | ') + ' |\n');
        // Generate separator row
        buffer.push('| ' + headerCells.map(() => '---').join(' | ') + ' |\n');
        // Generate data rows
        for (let i = 1; i < rows.length; i++) {
            const dataCells = rows[i].children.filter(cell => getNodeRole(cell.node).includes('cell'));
            const rowContent = dataCells.map(cell => getNodeText(cell.node, false) || ' ');
            buffer.push('| ' + rowContent.join(' | ') + ' |\n');
        }
    }
    buffer.push('\n');
}
function processCodeNode(uri, node, buffer, depth) {
    const tempBuffer = [];
    // Process the children of the code node
    for (const child of node.children) {
        processNode(uri, child, tempBuffer, depth + 1, false);
    }
    const isCodeblock = tempBuffer.some(text => text.includes('\n'));
    if (isCodeblock) {
        buffer.push('\n```\n');
        // Append the processed text to the buffer
        buffer.push(tempBuffer.join(''));
        buffer.push('\n```\n');
    }
    else {
        buffer.push('`');
        let characterCount = 0;
        // Append the processed text to the buffer
        for (const tempItem of tempBuffer) {
            characterCount += tempItem.length;
            if (characterCount > LINE_MAX_LENGTH) {
                buffer.push('\n');
                characterCount = 0;
            }
            buffer.push(tempItem);
            buffer.push('`');
        }
    }
}
function collectNavigationLinks(tree) {
    const links = [];
    collectLinks(tree, links);
    return links;
}
function collectLinks(node, links) {
    const role = getNodeRole(node.node);
    if (role === 'link' && isNavigationLink(node)) {
        const linkText = getNodeText(node.node, true);
        const url = getLinkUrl(node.node);
        const description = node.node.description?.value || '';
        links.push(`- [${linkText}](${url})${description ? ' - ' + description : ''}`);
    }
    // Process children
    for (const child of node.children) {
        collectLinks(child, links);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci9lbGVjdHJvbi1tYWluL2NkcEFjY2Vzc2liaWxpdHlEb21haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsZUFBZTtBQUVmLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQXdEbEQsU0FBUyxjQUFjLENBQUMsS0FBZTtJQUN0QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQseUVBQXlFO0lBQ3pFLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO0lBQzdDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCwrREFBK0Q7SUFDL0QsU0FBUyx3QkFBd0IsQ0FBQyxNQUFjO1FBQy9DLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQyxJ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