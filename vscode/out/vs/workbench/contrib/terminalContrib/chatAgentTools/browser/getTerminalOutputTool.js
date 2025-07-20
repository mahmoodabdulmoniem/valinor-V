/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ToolDataSource } from '../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const GetTerminalOutputToolData = {
    id: 'get_terminal_output2',
    toolReferenceName: 'getTerminalOutput2',
    displayName: localize('getTerminalOutputTool.displayName', 'Get Terminal Output'),
    modelDescription: 'Get the output of a terminal command previously started with run_in_terminal2',
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The ID of the terminal command output to check.'
            },
        },
        required: [
            'id',
        ]
    }
};
export class GetTerminalOutputTool extends Disposable {
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize('bg.progressive', "Checking background terminal output"),
            pastTenseMessage: localize('bg.past', "Checked background terminal output"),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        return {
            content: [{
                    kind: 'text',
                    value: `Output of terminal ${args.id}:\n${RunInTerminalTool.getBackgroundOutput(args.id)}`
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGVybWluYWxPdXRwdXRUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9nZXRUZXJtaW5hbE91dHB1dFRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUE2TCxNQUFNLG1EQUFtRCxDQUFDO0FBQzlRLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTNELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFjO0lBQ25ELEVBQUUsRUFBRSxzQkFBc0I7SUFDMUIsaUJBQWlCLEVBQUUsb0JBQW9CO0lBQ3ZDLFdBQVcsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUscUJBQXFCLENBQUM7SUFDakYsZ0JBQWdCLEVBQUUsK0VBQStFO0lBQ2pHLE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUTtJQUMvQixXQUFXLEVBQUU7UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsaURBQWlEO2FBQzlEO1NBQ0Q7UUFDRCxRQUFRLEVBQUU7WUFDVCxJQUFJO1NBQ0o7S0FDRDtDQUNELENBQUM7QUFNRixNQUFNLE9BQU8scUJBQXNCLFNBQVEsVUFBVTtJQUNwRCxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBMEMsRUFBRSxLQUF3QjtRQUMvRixPQUFPO1lBQ04saUJBQWlCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixFQUFFLHFDQUFxQyxDQUFDO1lBQ3BGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsb0NBQW9DLENBQUM7U0FDM0UsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQTJCLEVBQUUsWUFBaUMsRUFBRSxTQUF1QixFQUFFLEtBQXdCO1FBQzdILE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxVQUEyQyxDQUFDO1FBQ3BFLE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQztvQkFDVCxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsc0JBQXNCLElBQUksQ0FBQyxFQUFFLE1BQU0saUJBQWlCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2lCQUMxRixDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7Q0FDRCJ9