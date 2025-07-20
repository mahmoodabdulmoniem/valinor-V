/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let previouslyRecommededInSession = false;
const terminalCommands = [
    {
        commands: [
            new RegExp(/^python3? -m pip install(\b)/),
            new RegExp(/^pip3? install(\b)/),
        ],
        tags: ['python environment'],
    },
    {
        commands: [
            new RegExp(/^python3? -m jupyter(\b)/),
            new RegExp(/^python3? -m pip install\b.*jupyter\b.*/),
            new RegExp(/^pip3? install\b.*jupyter\b.*/),
            new RegExp(/^jupyter(\b)/), // jupyter lab, jupyer notebook, jupyter nbconvert, etc.
        ],
        tags: ['python environment', 'jupyter environment'],
    }
];
export function getRecommendedToolsOverRunInTerminal(commandLine, languageModelToolsService) {
    const tools = languageModelToolsService.getTools();
    if (!tools || previouslyRecommededInSession) {
        return;
    }
    const recommendedTools = new Set();
    const messages = [
        `The terminal command '${commandLine}' was not executed.`,
        `Try using some of the following tools instead of running a Terminal Command (if unable to use one of these tools as an alternative then run the same terminal command again):`,
    ];
    for (const terminalCommand of terminalCommands) {
        if (!terminalCommand.commands.some((condition) => condition.test(commandLine))) {
            continue;
        }
        const tagsToSearchFor = terminalCommand.tags;
        Array.from(tools)
            .filter(t => tagsToSearchFor.some(tag => t.tags?.includes(tag)))
            .forEach(tool => {
            recommendedTools.add(tool.id);
        });
    }
    recommendedTools.forEach(toolName => {
        messages.push(`- ${toolName}`);
    });
    if (recommendedTools.size) {
        previouslyRecommededInSession = true;
        return {
            content: [{
                    kind: 'text',
                    value: messages.join('  \n')
                }],
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWx0ZXJuYXRpdmVSZWNvbW1lbmRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvYWx0ZXJuYXRpdmVSZWNvbW1lbmRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxJQUFJLDZCQUE2QixHQUFHLEtBQUssQ0FBQztBQUUxQyxNQUFNLGdCQUFnQixHQUE2QztJQUNsRTtRQUNDLFFBQVEsRUFBRTtZQUNULElBQUksTUFBTSxDQUFDLDhCQUE4QixDQUFDO1lBQzFDLElBQUksTUFBTSxDQUFDLG9CQUFvQixDQUFDO1NBQ2hDO1FBQ0QsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7S0FDNUI7SUFDRDtRQUNDLFFBQVEsRUFBRTtZQUNULElBQUksTUFBTSxDQUFDLDBCQUEwQixDQUFDO1lBQ3RDLElBQUksTUFBTSxDQUFDLHlDQUF5QyxDQUFDO1lBQ3JELElBQUksTUFBTSxDQUFDLCtCQUErQixDQUFDO1lBQzNDLElBQUksTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLHdEQUF3RDtTQUNwRjtRQUNELElBQUksRUFBRSxDQUFDLG9CQUFvQixFQUFFLHFCQUFxQixDQUFDO0tBQ25EO0NBQ0QsQ0FBQztBQUVGLE1BQU0sVUFBVSxvQ0FBb0MsQ0FBQyxXQUFtQixFQUFFLHlCQUFxRDtJQUM5SCxNQUFNLEtBQUssR0FBRyx5QkFBeUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNuRCxJQUFJLENBQUMsS0FBSyxJQUFJLDZCQUE2QixFQUFFLENBQUM7UUFDN0MsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDM0MsTUFBTSxRQUFRLEdBQWE7UUFDMUIseUJBQXlCLFdBQVcscUJBQXFCO1FBQ3pELCtLQUErSztLQUMvSyxDQUFDO0lBQ0YsS0FBSyxNQUFNLGVBQWUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEYsU0FBUztRQUNWLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDO1FBQzdDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2FBQ2YsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2YsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztJQUVMLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDbkMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNCLDZCQUE2QixHQUFHLElBQUksQ0FBQztRQUNyQyxPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUM7b0JBQ1QsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2lCQUM1QixDQUFDO1NBQ0YsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDIn0=