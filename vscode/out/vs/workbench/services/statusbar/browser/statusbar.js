/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IStatusbarService = createDecorator('statusbarService');
export var StatusbarAlignment;
(function (StatusbarAlignment) {
    StatusbarAlignment[StatusbarAlignment["LEFT"] = 0] = "LEFT";
    StatusbarAlignment[StatusbarAlignment["RIGHT"] = 1] = "RIGHT";
})(StatusbarAlignment || (StatusbarAlignment = {}));
export function isStatusbarEntryLocation(thing) {
    const candidate = thing;
    return typeof candidate?.location?.id === 'string' && typeof candidate.alignment === 'number';
}
export function isStatusbarEntryPriority(thing) {
    const candidate = thing;
    return (typeof candidate?.primary === 'number' || isStatusbarEntryLocation(candidate?.primary)) && typeof candidate?.secondary === 'number';
}
export const ShowTooltipCommand = {
    id: 'statusBar.entry.showTooltip',
    title: ''
};
export const StatusbarEntryKinds = ['standard', 'warning', 'error', 'prominent', 'remote', 'offline'];
export function isTooltipWithCommands(thing) {
    const candidate = thing;
    return !!candidate?.content && Array.isArray(candidate?.commands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3RhdHVzYmFyL2Jyb3dzZXIvc3RhdHVzYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQXlCLE1BQU0sNERBQTRELENBQUM7QUFTcEgsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFDO0FBdUJ4RixNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLDJEQUFJLENBQUE7SUFDSiw2REFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBNEJELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFjO0lBQ3RELE1BQU0sU0FBUyxHQUFHLEtBQTRDLENBQUM7SUFFL0QsT0FBTyxPQUFPLFNBQVMsRUFBRSxRQUFRLEVBQUUsRUFBRSxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDO0FBQy9GLENBQUM7QUF5QkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWM7SUFDdEQsTUFBTSxTQUFTLEdBQUcsS0FBNEMsQ0FBQztJQUUvRCxPQUFPLENBQUMsT0FBTyxTQUFTLEVBQUUsT0FBTyxLQUFLLFFBQVEsSUFBSSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxPQUFPLFNBQVMsRUFBRSxTQUFTLEtBQUssUUFBUSxDQUFDO0FBQzdJLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBWTtJQUMxQyxFQUFFLEVBQUUsNkJBQTZCO0lBQ2pDLEtBQUssRUFBRSxFQUFFO0NBQ1QsQ0FBQztBQVVGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUF5QixDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFTNUgsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEtBQWM7SUFDbkQsTUFBTSxTQUFTLEdBQUcsS0FBeUMsQ0FBQztJQUU1RCxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ25FLENBQUMifQ==