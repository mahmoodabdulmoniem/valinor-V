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
import { groupBy } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { extUri } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
import { IDiagnosticVariableEntryFilterData } from '../../chat/common/chatVariableEntries.js';
let MarkerChatContextPick = class MarkerChatContextPick {
    constructor(_markerService, _labelService) {
        this._markerService = _markerService;
        this._labelService = _labelService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.diagnstic', 'Problems...');
        this.icon = Codicon.error;
        this.ordinal = -100;
    }
    asPicker() {
        const markers = this._markerService.read({ severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info });
        const grouped = groupBy(markers, (a, b) => extUri.compare(a.resource, b.resource));
        const severities = new Set();
        const items = [];
        let pickCount = 0;
        for (const group of grouped) {
            const resource = group[0].resource;
            items.push({ type: 'separator', label: this._labelService.getUriLabel(resource, { relative: true }) });
            for (const marker of group) {
                pickCount++;
                severities.add(marker.severity);
                items.push({
                    label: marker.message,
                    description: localize('markers.panel.at.ln.col.number', "[Ln {0}, Col {1}]", '' + marker.startLineNumber, '' + marker.startColumn),
                    asAttachment() {
                        return IDiagnosticVariableEntryFilterData.toEntry(IDiagnosticVariableEntryFilterData.fromMarker(marker));
                    }
                });
            }
        }
        items.unshift({
            label: localize('markers.panel.allErrors', 'All Problems'),
            asAttachment() {
                return IDiagnosticVariableEntryFilterData.toEntry({
                    filterSeverity: MarkerSeverity.Info
                });
            },
        });
        return {
            placeholder: localize('chatContext.diagnstic.placeholder', 'Select a problem to attach'),
            picks: Promise.resolve(items)
        };
    }
};
MarkerChatContextPick = __decorate([
    __param(0, IMarkerService),
    __param(1, ILabelService)
], MarkerChatContextPick);
let MarkerChatContextContribution = class MarkerChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chat.markerChatContextContribution'; }
    constructor(contextPickService, instantiationService) {
        super();
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(MarkerChatContextPick)));
    }
};
MarkerChatContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService)
], MarkerChatContextContribution);
export { MarkerChatContextContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0NoYXRDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc0NoYXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHaEcsT0FBTyxFQUFzRCx1QkFBdUIsRUFBc0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvSixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU5RixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQU8xQixZQUNpQixjQUErQyxFQUNoRCxhQUE2QztRQUQzQixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDL0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUFQcEQsU0FBSSxHQUFHLFlBQVksQ0FBQztRQUNwQixVQUFLLEdBQUcsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3pELFNBQUks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