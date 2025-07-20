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
import { URI } from '../../../../base/common/uri.js';
import { isEqual } from '../../../../base/common/extpath.js';
import { posix } from '../../../../base/common/path.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { rtrim, startsWithIgnoreCase, equalsIgnoreCase } from '../../../../base/common/strings.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { joinPath, isEqualOrParent, basenameOrAuthority } from '../../../../base/common/resources.js';
import { ExplorerFileNestingTrie } from './explorerFileNestingTrie.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
export class ExplorerModel {
    constructor(contextService, uriIdentityService, fileService, configService, filesConfigService) {
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeRoots = new Emitter();
        const setRoots = () => this._roots = this.contextService.getWorkspace().folders
            .map(folder => new ExplorerItem(folder.uri, fileService, configService, filesConfigService, undefined, true, false, false, false, folder.name));
        setRoots();
        this._listener = this.contextService.onDidChangeWorkspaceFolders(() => {
            setRoots();
            this._onDidChangeRoots.fire();
        });
    }
    get roots() {
        return this._roots;
    }
    get onDidChangeRoots() {
        return this._onDidChangeRoots.event;
    }
    /**
     * Returns an array of child stat from this stat that matches with the provided path.
     * Starts matching from the first root.
     * Will return empty array in case the FileStat does not exist.
     */
    findAll(resource) {
        return coalesce(this.roots.map(root => root.find(resource)));
    }
    /**
     * Returns a FileStat that matches the passed resource.
     * In case multiple FileStat are matching the resource (same folder opened multiple times) returns the FileStat that has the closest root.
     * Will return undefined in case the FileStat does not exist.
     */
    findClosest(resource) {
        const folder = this.contextService.getWorkspaceFolder(resource);
        if (folder) {
            const root = this.roots.find(r => this.uriIdentityService.extUri.isEqual(r.resource, folder.uri));
            if (root) {
                return root.find(resource);
            }
        }
        return null;
    }
    dispose() {
        dispose(this._listener);
    }
}
export class ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory, _isSymbolicLink, _readonly, _locked, _name = basenameOrAuthority(resource), _mtime, _unknown = false) {
        this.resource = resource;
        this.fileService = fileService;
        this.configService = configService;
        this.filesConfigService = filesConfigService;
        this._parent = _parent;
        this._isDirectory = _isDirectory;
        this._isSymbolicLink = _isSymbolicLink;
        this._readonly = _readonly;
        this._locked = _locked;
        this._name = _name;
        this._mtime = _mtime;
        this._unknown = _unknown;
        this.error = undefined;
        this._isExcluded = false;
        // Find
        this.markedAsFindResult = false;
        this._isDirectoryResolved = false;
    }
    get isExcluded() {
        if (this._isExcluded) {
            return true;
        }
        if (!this._parent) {
            return false;
        }
        return this._parent.isExcluded;
    }
    set isExcluded(value) {
        this._isExcluded = value;
    }
    hasChildren(filter) {
        if (this.hasNests) {
            return this.nestedChildren?.some(c => filter(c)) ?? false;
        }
        else {
            return this.isDirectory;
        }
    }
    get hasNests() {
        return !!(this.nestedChildren?.length);
    }
    get isDirectoryResolved() {
        return this._isDirectoryResolved;
    }
    get isSymbolicLink() {
        return !!this._isSymbolicLink;
    }
    get isDirectory() {
        return !!this._isDirectory;
    }
    get isReadonly() {
        return this.filesConfigService.isReadonly(this.resource, { resource: this.resource, name: this.name, readonly: this._readonly, locked: this._locked });
    }
    get mtime() {
        return this._mtime;
    }
    get name() {
        return this._name;
    }
    get isUnknown() {
        return this._unknown;
    }
    get parent() {
        return this._parent;
    }
    get root() {
        if (!this._parent) {
            return this;
        }
        return this._parent.root;
    }
    get children() {
        return new Map();
    }
    updateName(value) {
        // Re-add to parent since the parent has a name map to children and the name might have changed
        this._parent?.removeChild(this);
        this._name = value;
        this._parent?.addChild(this);
    }
    getId() {
        let id = this.root.resource.toString() + '::' + this.resource.toString();
        if (this.isMarkedAsFiltered()) {
            id += '::findFilterResult';
        }
        return id;
    }
    toString() {
        return `ExplorerItem: ${this.name}`;
    }
    get isRoot() {
        return this === this.root;
    }
    static create(fileService, configService, filesConfigService, raw, parent, resolveTo) {
        const stat = new ExplorerItem(raw.resource, fileService, configService, filesConfigService, parent, raw.isDirectory, raw.isSymbolicLink, raw.readonly, raw.locked, raw.name, raw.mtime, !raw.isFile && !raw.isDirectory);
        // Recursively add children if present
        if (stat.isDirectory) {
            // isDirectoryResolved is a very important indicator in the stat model that tells if the folder was fully resolved
            // the folder is fully resolved if either it has a list of children or the client requested this by using the resolveTo
            // array of resource path to resolve.
            stat._isDirectoryResolved = !!raw.children || (!!resolveTo && resolveTo.some((r) => {
                return isEqualOrParent(r, stat.resource);
            }));
            // Recurse into children
            if (raw.children) {
                for (let i = 0, len = raw.children.length; i < len; i++) {
                    const child = ExplorerItem.create(fileService, configService, filesConfigService, raw.children[i], stat, resolveTo);
                    stat.addChild(child);
                }
            }
        }
        return stat;
    }
    /**
     * Merges the stat which was resolved from the disk with the local stat by copying over properties
     * and children. The merge will only consider resolved stat elements to avoid overwriting data which
     * exists locally.
     */
    static mergeLocalWithDisk(disk, local) {
        if (disk.resource.toString() !== local.resource.toString()) {
            return; // Merging only supported for stats with the same resource
        }
        // Stop merging when a folder is not resolved to avoid loosing local data
        const mergingDirectories = disk.isDirectory || local.isDirectory;
        if (mergingDirectories && local._isDirectoryResolved && !disk._isDirectoryResolved) {
            return;
        }
        // Properties
        local.resource = disk.resource;
        if (!local.isRoot) {
            local.updateName(disk.name);
        }
        local._isDirectory = disk.isDirectory;
        local._mtime = disk.mtime;
        local._isDirectoryResolved = disk._isDirectoryResolved;
        local._isSymbolicLink = disk.isSymbolicLink;
        local.error = disk.error;
        // Merge Children if resolved
        if (mergingDirectories && disk._isDirectoryResolved) {
            // Map resource => stat
            const oldLocalChildren = new ResourceMap();
            local.children.forEach(child => {
                oldLocalChildren.set(child.resource, child);
            });
            // Clear current children
            local.children.clear();
            // Merge received children
            disk.children.forEach(diskChild => {
                const formerLocalChild = oldLocalChildren.get(diskChild.resource);
                // Existing child: merge
                if (formerLocalChild) {
                    ExplorerItem.mergeLocalWithDisk(diskChild, formerLocalChild);
                    local.addChild(formerLocalChild);
                    oldLocalChildren.delete(diskChild.resource);
                }
                // New child: add
                else {
                    local.addChild(diskChild);
                }
            });
            oldLocalChildren.forEach(oldChild => {
                if (oldChild instanceof NewExplorerItem) {
                    local.addChild(oldChild);
                }
            });
        }
    }
    /**
     * Adds a child element to this folder.
     */
    addChild(child) {
        // Inherit some parent properties to child
        child._parent = this;
        child.updateResource(false);
        this.children.set(this.getPlatformAwareName(child.name), child);
    }
    getChild(name) {
        return this.children.get(this.getPlatformAwareName(name));
    }
    fetchChildren(sortOrder) {
        const nestingConfig = this.configService.getValue({ resource: this.root.resource }).explorer.fileNesting;
        // fast path when the children can be resolved sync
        if (nestingConfig.enabled && this.nestedChildren) {
            return this.nestedChildren;
        }
        return (async () => {
            if (!this._isDirectoryResolved) {
                // Resolve metadata only when the mtime is needed since this can be expensive
                // Mtime is only used when the sort order is 'modified'
                const resolveMetadata = sortOrder === "modified" /* SortOrder.Modified */;
                this.error = undefined;
                try {
                    const stat = await this.fileService.resolve(this.resource, { resolveSingleChildDescendants: true, resolveMetadata });
                    const resolved = ExplorerItem.create(this.fileService, this.configService, this.filesConfigService, stat, this);
                    ExplorerItem.mergeLocalWithDisk(resolved, this);
                }
                catch (e) {
                    this.error = e;
                    throw e;
                }
                this._isDirectoryResolved = true;
            }
            const items = [];
            if (nestingConfig.enabled) {
                const fileChildren = [];
                const dirChildren = [];
                for (const child of this.children.entries()) {
                    child[1].nestedParent = undefined;
                    if (child[1].isDirectory) {
                        dirChildren.push(child);
                    }
                    else {
                        fileChildren.push(child);
                    }
                }
                const nested = this.fileNester.nest(fileChildren.map(([name]) => name), this.getPlatformAwareName(this.name));
                for (const [fileEntryName, fileEntryItem] of fileChildren) {
                    const nestedItems = nested.get(fileEntryName);
                    if (nestedItems !== undefined) {
                        fileEntryItem.nestedChildren = [];
                        for (const name of nestedItems.keys()) {
                            const child = assertReturnsDefined(this.children.get(name));
                            fileEntryItem.nestedChildren.push(child);
                            child.nestedParent = fileEntryItem;
                        }
                        items.push(fileEntryItem);
                    }
                    else {
                        fileEntryItem.nestedChildren = undefined;
                    }
                }
                for (const [_, dirEntryItem] of dirChildren.values()) {
                    items.push(dirEntryItem);
                }
            }
            else {
                this.children.forEach(child => {
                    items.push(child);
                });
            }
            return items;
        })();
    }
    get fileNester() {
        if (!this.root._fileNester) {
            const nestingConfig = this.configService.getValue({ resource: this.root.resource }).explorer.fileNesting;
            const patterns = Object.entries(nestingConfig.patterns)
                .filter(entry => typeof (entry[0]) === 'string' && typeof (entry[1]) === 'string' && entry[0] && entry[1])
                .map(([parentPattern, childrenPatterns]) => [
                this.getPlatformAwareName(parentPattern.trim()),
                childrenPatterns.split(',').map(p => this.getPlatformAwareName(p.trim().replace(/\u200b/g, '').trim()))
                    .filter(p => p !== '')
            ]);
            this.root._fileNester = new ExplorerFileNestingTrie(patterns);
        }
        return this.root._fileNester;
    }
    /**
     * Removes a child element from this folder.
     */
    removeChild(child) {
        this.nestedChildren = undefined;
        this.children.delete(this.getPlatformAwareName(child.name));
    }
    forgetChildren() {
        this.children.clear();
        this.nestedChildren = undefined;
        this._isDirectoryResolved = false;
        this._fileNester = undefined;
    }
    getPlatformAwareName(name) {
        return this.fileService.hasCapability(this.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */) ? name : name.toLowerCase();
    }
    /**
     * Moves this element under a new parent element.
     */
    move(newParent) {
        this.nestedParent?.removeChild(this);
        this._parent?.removeChild(this);
        newParent.removeChild(this); // make sure to remove any previous version of the file if any
        newParent.addChild(this);
        this.updateResource(true);
    }
    updateResource(recursive) {
        if (this._parent) {
            this.resource = joinPath(this._parent.resource, this.name);
        }
        if (recursive) {
            if (this.isDirectory) {
                this.children.forEach(child => {
                    child.updateResource(true);
                });
            }
        }
    }
    /**
     * Tells this stat that it was renamed. This requires changes to all children of this stat (if any)
     * so that the path property can be updated properly.
     */
    rename(renamedStat) {
        // Merge a subset of Properties that can change on rename
        this.updateName(renamedStat.name);
        this._mtime = renamedStat.mtime;
        // Update Paths including children
        this.updateResource(true);
    }
    /**
     * Returns a child stat from this stat that matches with the provided path.
     * Will return "null" in case the child does not exist.
     */
    find(resource) {
        // Return if path found
        // For performance reasons try to do the comparison as fast as possible
        const ignoreCase = !this.fileService.hasCapability(resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
        if (resource && this.resource.scheme === resource.scheme && equalsIgnoreCase(this.resource.authority, resource.authority) &&
            (ignoreCase ? startsWithIgnoreCase(resource.path, this.resource.path) : resource.path.startsWith(this.resource.path))) {
            return this.findByPath(rtrim(resource.path, posix.sep), this.resource.path.length, ignoreCase);
        }
        return null; //Unable to find
    }
    findByPath(path, index, ignoreCase) {
        if (isEqual(rtrim(this.resource.path, posix.sep), path, ignoreCase)) {
            return this;
        }
        if (this.isDirectory) {
            // Ignore separtor to more easily deduct the next name to search
            while (index < path.length && path[index] === posix.sep) {
                index++;
            }
            let indexOfNextSep = path.indexOf(posix.sep, index);
            if (indexOfNextSep === -1) {
                // If there is no separator take the remainder of the path
                indexOfNextSep = path.length;
            }
            // The name to search is between two separators
            const name = path.substring(index, indexOfNextSep);
            const child = this.children.get(this.getPlatformAwareName(name));
            if (child) {
                // We found a child with the given name, search inside it
                return child.findByPath(path, indexOfNextSep, ignoreCase);
            }
        }
        return null;
    }
    isMarkedAsFiltered() {
        return this.markedAsFindResult;
    }
    markItemAndParentsAsFiltered() {
        this.markedAsFindResult = true;
        this.parent?.markItemAndParentsAsFiltered();
    }
    unmarkItemAndChildren() {
        this.markedAsFindResult = false;
        this.children.forEach(child => child.unmarkItemAndChildren());
    }
}
__decorate([
    memoize
], ExplorerItem.prototype, "children", null);
export class NewExplorerItem extends ExplorerItem {
    constructor(fileService, configService, filesConfigService, parent, isDirectory) {
        super(URI.file(''), fileService, configService, filesConfigService, parent, isDirectory);
        this._isDirectoryResolved = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvY29tbW9uL2V4cGxvcmVyTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUd0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUl4RSxNQUFNLE9BQU8sYUFBYTtJQU16QixZQUNrQixjQUF3QyxFQUN4QyxrQkFBdUMsRUFDeEQsV0FBeUIsRUFDekIsYUFBb0MsRUFDcEMsa0JBQThDO1FBSjdCLG1CQUFjLEdBQWQsY0FB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