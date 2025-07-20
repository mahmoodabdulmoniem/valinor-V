/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditTelemetryService } from './editTelemetryService.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { localize } from '../../../../nls.js';
import { EDIT_TELEMETRY_DETAILS_SETTING_ID, EDIT_TELEMETRY_SETTING_ID, EDIT_TELEMETRY_SHOW_DECORATIONS, EDIT_TELEMETRY_SHOW_STATUS_BAR } from './settings.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
registerWorkbenchContribution2('EditTelemetryService', EditTelemetryService, 3 /* WorkbenchPhase.AfterRestored */);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'task',
    order: 100,
    title: localize('editTelemetry', "Edit Telemetry"),
    type: 'object',
    properties: {
        [EDIT_TELEMETRY_SETTING_ID]: {
            markdownDescription: localize('telemetry.editStats.enabled', "Controls whether to enable telemetry for edit statistics (only sends statistics if general telemetry is enabled)."),
            type: 'boolean',
            default: true,
            tags: ['experimental'],
        },
        [EDIT_TELEMETRY_DETAILS_SETTING_ID]: {
            markdownDescription: localize('telemetry.editStats.detailed.enabled', "Controls whether to enable telemetry for detailed edit statistics (only sends statistics if general telemetry is enabled)."),
            type: 'boolean',
            default: false,
            tags: ['experimental', 'onExP'],
        },
        [EDIT_TELEMETRY_SHOW_STATUS_BAR]: {
            markdownDescription: localize('telemetry.editStats.showStatusBar', "Controls whether to show the status bar for edit telemetry."),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
        },
        [EDIT_TELEMETRY_SHOW_DECORATIONS]: {
            markdownDescription: localize('telemetry.editStats.showDecorations', "Controls whether to show decorations for edit telemetry."),
            type: 'boolean',
            default: false,
            tags: ['experimental'],
        },
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFRlbGVtZXRyeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9lZGl0VGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUNuSixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLHlCQUF5QixFQUFFLCtCQUErQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlKLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRyw4QkFBOEIsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsdUNBQStCLENBQUM7QUFFM0csTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN6RyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsTUFBTTtJQUNWLEtBQUssRUFBRSxHQUFHO0lBQ1YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUM7SUFDbEQsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxDQUFDLHlCQUF5QixDQUFDLEVBQUU7WUFDNUIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixFQUFFLG1IQUFtSCxDQUFDO1lBQ2pMLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUM7U0FDdEI7UUFDRCxDQUFDLGlDQUFpQyxDQUFDLEVBQUU7WUFDcEMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLDRIQUE0SCxDQUFDO1lBQ25NLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO1NBQy9CO1FBQ0QsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFO1lBQ2pDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSw2REFBNkQsQ0FBQztZQUNqSSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDO1NBQ3RCO1FBQ0QsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFO1lBQ2xDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSwwREFBMEQsQ0FBQztZQUNoSSxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxLQUFLO1lBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDO1NBQ3RCO0tBQ0Q7Q0FDRCxDQUFDLENBQUMifQ==