/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFalsyOrEmpty, isNonEmptyArray } from '../../../base/common/arrays.js';
import { DebounceEmitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { MarkerSeverity } from './markers.js';
export const unsupportedSchemas = new Set([
    Schemas.inMemory,
    Schemas.vscodeSourceControl,
    Schemas.walkThrough,
    Schemas.walkThroughSnippet,
    Schemas.vscodeChatCodeBlock,
    Schemas.vscodeTerminal
]);
class DoubleResourceMap {
    constructor() {
        this._byResource = new ResourceMap();
        this._byOwner = new Map();
    }
    set(resource, owner, value) {
        let ownerMap = this._byResource.get(resource);
        if (!ownerMap) {
            ownerMap = new Map();
            this._byResource.set(resource, ownerMap);
        }
        ownerMap.set(owner, value);
        let resourceMap = this._byOwner.get(owner);
        if (!resourceMap) {
            resourceMap = new ResourceMap();
            this._byOwner.set(owner, resourceMap);
        }
        resourceMap.set(resource, value);
    }
    get(resource, owner) {
        const ownerMap = this._byResource.get(resource);
        return ownerMap?.get(owner);
    }
    delete(resource, owner) {
        let removedA = false;
        let removedB = false;
        const ownerMap = this._byResource.get(resource);
        if (ownerMap) {
            removedA = ownerMap.delete(owner);
        }
        const resourceMap = this._byOwner.get(owner);
        if (resourceMap) {
            removedB = resourceMap.delete(resource);
        }
        if (removedA !== removedB) {
            throw new Error('illegal state');
        }
        return removedA && removedB;
    }
    values(key) {
        if (typeof key === 'string') {
            return this._byOwner.get(key)?.values() ?? Iterable.empty();
        }
        if (URI.isUri(key)) {
            return this._byResource.get(key)?.values() ?? Iterable.empty();
        }
        return Iterable.map(Iterable.concat(...this._byOwner.values()), map => map[1]);
    }
}
class MarkerStats {
    constructor(service) {
        this.errors = 0;
        this.infos = 0;
        this.warnings = 0;
        this.unknowns = 0;
        this._data = new ResourceMap();
        this._service = service;
        this._subscription = service.onMarkerChanged(this._update, this);
    }
    dispose() {
        this._subscription.dispose();
    }
    _update(resources) {
        for (const resource of resources) {
            const oldStats = this._data.get(resource);
            if (oldStats) {
                this._substract(oldStats);
            }
            const newStats = this._resourceStats(resource);
            this._add(newStats);
            this._data.set(resource, newStats);
        }
    }
    _resourceStats(resource) {
        const result = { errors: 0, warnings: 0, infos: 0, unknowns: 0 };
        // TODO this is a hack
        if (unsupportedSchemas.has(resource.scheme)) {
            return result;
        }
        for (const { severity } of this._service.read({ resource })) {
            if (severity === MarkerSeverity.Error) {
                result.errors += 1;
            }
            else if (severity === MarkerSeverity.Warning) {
                result.warnings += 1;
            }
            else if (severity === MarkerSeverity.Info) {
                result.infos += 1;
            }
            else {
                result.unknowns += 1;
            }
        }
        return result;
    }
    _substract(op) {
        this.errors -= op.errors;
        this.warnings -= op.warnings;
        this.infos -= op.infos;
        this.unknowns -= op.unknowns;
    }
    _add(op) {
        this.errors += op.errors;
        this.warnings += op.warnings;
        this.infos += op.infos;
        this.unknowns += op.unknowns;
    }
}
export class MarkerService {
    constructor() {
        this._onMarkerChanged = new DebounceEmitter({
            delay: 0,
            merge: MarkerService._merge
        });
        this.onMarkerChanged = this._onMarkerChanged.event;
        this._data = new DoubleResourceMap();
        this._stats = new MarkerStats(this);
        this._filteredResources = new ResourceMap();
    }
    dispose() {
        this._stats.dispose();
        this._onMarkerChanged.dispose();
    }
    getStatistics() {
        return this._stats;
    }
    remove(owner, resources) {
        for (const resource of resources || []) {
            this.changeOne(owner, resource, []);
        }
    }
    changeOne(owner, resource, markerData) {
        if (isFalsyOrEmpty(markerData)) {
            // remove marker for this (owner,resource)-tuple
            const removed = this._data.delete(resource, owner);
            if (removed) {
                this._onMarkerChanged.fire([resource]);
            }
        }
        else {
            // insert marker for this (owner,resource)-tuple
            const markers = [];
            for (const data of markerData) {
                const marker = MarkerService._toMarker(owner, resource, data);
                if (marker) {
                    markers.push(marker);
                }
            }
            this._data.set(resource, owner, markers);
            this._onMarkerChanged.fire([resource]);
        }
    }
    installResourceFilter(resource, reason) {
        let reasons = this._filteredResources.get(resource);
        if (!reasons) {
            reasons = [];
            this._filteredResources.set(resource, reasons);
        }
        reasons.push(reason);
        this._onMarkerChanged.fire([resource]);
        return toDisposable(() => {
            const reasons = this._filteredResources.get(resource);
            if (!reasons) {
                return;
            }
            const reasonIndex = reasons.indexOf(reason);
            if (reasonIndex !== -1) {
                reasons.splice(reasonIndex, 1);
                if (reasons.length === 0) {
                    this._filteredResources.delete(resource);
                }
                this._onMarkerChanged.fire([resource]);
            }
        });
    }
    static _toMarker(owner, resource, data) {
        let { code, severity, message, source, startLineNumber, startColumn, endLineNumber, endColumn, relatedInformation, tags, origin } = data;
        if (!message) {
            return undefined;
        }
        // santize data
        startLineNumber = startLineNumber > 0 ? startLineNumber : 1;
        startColumn = startColumn > 0 ? startColumn : 1;
        endLineNumber = endLineNumber >= startLineNumber ? endLineNumber : startLineNumber;
        endColumn = endColumn > 0 ? endColumn : startColumn;
        return {
            resource,
            owner,
            code,
            severity,
            message,
            source,
            startLineNumber,
            startColumn,
            endLineNumber,
            endColumn,
            relatedInformation,
            tags,
            origin
        };
    }
    changeAll(owner, data) {
        const changes = [];
        // remove old marker
        const existing = this._data.values(owner);
        if (existing) {
            for (const data of existing) {
                const first = Iterable.first(data);
                if (first) {
                    changes.push(first.resource);
                    this._data.delete(first.resource, owner);
                }
            }
        }
        // add new markers
        if (isNonEmptyArray(data)) {
            // group by resource
            const groups = new ResourceMap();
            for (const { resource, marker: markerData } of data) {
                const marker = MarkerService._toMarker(owner, resource, markerData);
                if (!marker) {
                    // filter bad markers
                    continue;
                }
                const array = groups.get(resource);
                if (!array) {
                    groups.set(resource, [marker]);
                    changes.push(resource);
                }
                else {
                    array.push(marker);
                }
            }
            // insert all
            for (const [resource, value] of groups) {
                this._data.set(resource, owner, value);
            }
        }
        if (changes.length > 0) {
            this._onMarkerChanged.fire(changes);
        }
    }
    /**
     * Creates an information marker for filtered resources
     */
    _createFilteredMarker(resource, reasons) {
        const message = reasons.length === 1
            ? localize('filtered', "Problems are paused because: \"{0}\"", reasons[0])
            : localize('filtered.network', "Problems are paused because: \"{0}\" and {1} more", reasons[0], reasons.length - 1);
        return {
            owner: 'markersFilter',
            resource,
            severity: MarkerSeverity.Info,
            message,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        };
    }
    read(filter = Object.create(null)) {
        let { owner, resource, severities, take } = filter;
        if (!take || take < 0) {
            take = -1;
        }
        if (owner && resource) {
            // exactly one owner AND resource
            const reasons = !filter.ignoreResourceFilters ? this._filteredResources.get(resource) : undefined;
            if (reasons?.length) {
                const infoMarker = this._createFilteredMarker(resource, reasons);
                return [infoMarker];
            }
            const data = this._data.get(resource, owner);
            if (!data) {
                return [];
            }
            const result = [];
            for (const marker of data) {
                if (take > 0 && result.length === take) {
                    break;
                }
                const reasons = !filter.ignoreResourceFilters ? this._filteredResources.get(resource) : undefined;
                if (reasons?.length) {
                    result.push(this._createFilteredMarker(resource, reasons));
                }
                else if (MarkerService._accept(marker, severities)) {
                    result.push(marker);
                }
            }
            return result;
        }
        else {
            // of one resource OR owner
            const iterable = !owner && !resource
                ? this._data.values()
                : this._data.values(resource ?? owner);
            const result = [];
            const filtered = new ResourceSet();
            for (const markers of iterable) {
                for (const data of markers) {
                    if (filtered.has(data.resource)) {
                        continue;
                    }
                    if (take > 0 && result.length === take) {
                        break;
                    }
                    const reasons = !filter.ignoreResourceFilters ? this._filteredResources.get(data.resource) : undefined;
                    if (reasons?.length) {
                        result.push(this._createFilteredMarker(data.resource, reasons));
                        filtered.add(data.resource);
                    }
                    else if (MarkerService._accept(data, severities)) {
                        result.push(data);
                    }
                }
            }
            return result;
        }
    }
    static _accept(marker, severities) {
        return severities === undefined || (severities & marker.severity) === marker.severity;
    }
    // --- event debounce logic
    static _merge(all) {
        const set = new ResourceMap();
        for (const array of all) {
            for (const item of array) {
                set.set(item, true);
            }
        }
        return Array.from(set.keys());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWFya2Vycy9jb21tb24vbWFya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUE2RSxjQUFjLEVBQW9CLE1BQU0sY0FBYyxDQUFDO0FBRTNJLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDO0lBQ3pDLE9BQU8sQ0FBQyxRQUFRO0lBQ2hCLE9BQU8sQ0FBQyxtQkFBbUI7SUFDM0IsT0FBTyxDQUFDLFdBQVc7SUFDbkIsT0FBTyxDQUFDLGtCQUFrQjtJQUMxQixPQUFPLENBQUMsbUJBQW1CO0lBQzNCLE9BQU8sQ0FBQyxjQUFjO0NBQ3RCLENBQUMsQ0FBQztBQUVILE1BQU0saUJBQWlCO0lBQXZCO1FBRVMsZ0JBQVcsR0FBRyxJQUFJLFdBQVcsRUFBa0IsQ0FBQztRQUNoRCxhQUFRLEdBQUcsSUFBSSxHQUFH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