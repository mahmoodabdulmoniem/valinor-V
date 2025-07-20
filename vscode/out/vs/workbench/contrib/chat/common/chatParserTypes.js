/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { revive } from '../../../../base/common/marshalling.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { reviveSerializedAgent } from './chatAgents.js';
import { IDiagnosticVariableEntryFilterData } from './chatVariableEntries.js';
export function getPromptText(request) {
    const message = request.parts.map(r => r.promptText).join('').trimStart();
    const diff = request.text.length - message.length;
    return { message, diff };
}
export class ChatRequestTextPart {
    static { this.Kind = 'text'; }
    constructor(range, editorRange, text) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.kind = ChatRequestTextPart.Kind;
    }
    get promptText() {
        return this.text;
    }
}
// warning, these also show up in a regex in the parser
export const chatVariableLeader = '#';
export const chatAgentLeader = '@';
export const chatSubcommandLeader = '/';
/**
 * An invocation of a static variable that can be resolved by the variable service
 * @deprecated, but kept for backwards compatibility with old persisted chat requests
 */
class ChatRequestVariablePart {
    static { this.Kind = 'var'; }
    constructor(range, editorRange, variableName, variableArg, variableId) {
        this.range = range;
        this.editorRange = editorRange;
        this.variableName = variableName;
        this.variableArg = variableArg;
        this.variableId = variableId;
        this.kind = ChatRequestVariablePart.Kind;
    }
    get text() {
        const argPart = this.variableArg ? `:${this.variableArg}` : '';
        return `${chatVariableLeader}${this.variableName}${argPart}`;
    }
    get promptText() {
        return this.text;
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolPart {
    static { this.Kind = 'tool'; }
    constructor(range, editorRange, toolName, toolId, displayName, icon) {
        this.range = range;
        this.editorRange = editorRange;
        this.toolName = toolName;
        this.toolId = toolId;
        this.displayName = displayName;
        this.icon = icon;
        this.kind = ChatRequestToolPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.toolName}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return { kind: 'tool', id: this.toolId, name: this.toolName, range: this.range, value: undefined, icon: ThemeIcon.isThemeIcon(this.icon) ? this.icon : undefined, fullName: this.displayName };
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolSetPart {
    static { this.Kind = 'toolset'; }
    constructor(range, editorRange, id, name, icon, tools) {
        this.range = range;
        this.editorRange = editorRange;
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.tools = tools;
        this.kind = ChatRequestToolSetPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.name}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return { kind: 'toolset', id: this.id, name: this.name, range: this.range, icon: this.icon, value: this.tools };
    }
}
/**
 * An invocation of an agent that can be resolved by the agent service
 */
export class ChatRequestAgentPart {
    static { this.Kind = 'agent'; }
    constructor(range, editorRange, agent) {
        this.range = range;
        this.editorRange = editorRange;
        this.agent = agent;
        this.kind = ChatRequestAgentPart.Kind;
    }
    get text() {
        return `${chatAgentLeader}${this.agent.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of an agent's subcommand
 */
export class ChatRequestAgentSubcommandPart {
    static { this.Kind = 'subcommand'; }
    constructor(range, editorRange, command) {
        this.range = range;
        this.editorRange = editorRange;
        this.command = command;
        this.kind = ChatRequestAgentSubcommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.command.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashCommandPart {
    static { this.Kind = 'slash'; }
    constructor(range, editorRange, slashCommand) {
        this.range = range;
        this.editorRange = editorRange;
        this.slashCommand = slashCommand;
        this.kind = ChatRequestSlashCommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashPromptPart {
    static { this.Kind = 'prompt'; }
    constructor(range, editorRange, slashPromptCommand) {
        this.range = range;
        this.editorRange = editorRange;
        this.slashPromptCommand = slashPromptCommand;
        this.kind = ChatRequestSlashPromptPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.slashPromptCommand.command}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.slashPromptCommand.command}`;
    }
}
/**
 * An invocation of a dynamic reference like '#file:'
 */
export class ChatRequestDynamicVariablePart {
    static { this.Kind = 'dynamic'; }
    constructor(range, editorRange, text, id, modelDescription, data, fullName, icon, isFile, isDirectory) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.id = id;
        this.modelDescription = modelDescription;
        this.data = data;
        this.fullName = fullName;
        this.icon = icon;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.kind = ChatRequestDynamicVariablePart.Kind;
    }
    get referenceText() {
        return this.text.replace(chatVariableLeader, '');
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        if (this.id === 'vscode.problems') {
            return IDiagnosticVariableEntryFilterData.toEntry(this.data.filter);
        }
        return { kind: this.isDirectory ? 'directory' : this.isFile ? 'file' : 'generic', id: this.id, name: this.referenceText, range: this.range, value: this.data, fullName: this.fullName, icon: this.icon };
    }
}
export function reviveParsedChatRequest(serialized) {
    return {
        text: serialized.text,
        parts: serialized.parts.map(part => {
            if (part.kind === ChatRequestTextPart.Kind) {
                return new ChatRequestTextPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text);
            }
            else if (part.kind === ChatRequestVariablePart.Kind) {
                return new ChatRequestVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.variableName, part.variableArg, part.variableId || '');
            }
            else if (part.kind === ChatRequestToolPart.Kind) {
                return new ChatRequestToolPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.toolName, part.toolId, part.displayName, part.icon);
            }
            else if (part.kind === ChatRequestToolSetPart.Kind) {
                return new ChatRequestToolSetPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.id, part.name, part.icon, part.tools ?? []);
            }
            else if (part.kind === ChatRequestAgentPart.Kind) {
                let agent = part.agent;
                agent = reviveSerializedAgent(agent);
                return new ChatRequestAgentPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, agent);
            }
            else if (part.kind === ChatRequestAgentSubcommandPart.Kind) {
                return new ChatRequestAgentSubcommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.command);
            }
            else if (part.kind === ChatRequestSlashCommandPart.Kind) {
                return new ChatRequestSlashCommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.slashCommand);
            }
            else if (part.kind === ChatRequestSlashPromptPart.Kind) {
                return new ChatRequestSlashPromptPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.slashPromptCommand);
            }
            else if (part.kind === ChatRequestDynamicVariablePart.Kind) {
                return new ChatRequestDynamicVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text, part.id, part.modelDescription, revive(part.data), part.fullName, part.icon, part.isFile, part.isDirectory);
            }
            else {
                throw new Error(`Unknown chat request part: ${part.kind}`);
            }
        })
    };
}
export function extractAgentAndCommand(parsed) {
    const agentPart = parsed.parts.find((r) => r instanceof ChatRequestAgentPart);
    const commandPart = parsed.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
    return { agentPart, commandPart };
}
export function formatChatQuestion(chatAgentService, location, prompt, participant = null, command = null) {
    let question = '';
    if (participant && participant !== chatAgentService.getDefaultAgent(location)?.id) {
        const agent = chatAgentService.getAgent(participant);
        if (!agent) {
            // Refers to agent that doesn't exist
            return undefined;
        }
        question += `${chatAgentLeader}${agent.name} `;
        if (command) {
            question += `${chatSubcommandLeader}${command} `;
        }
    }
    return question + prompt;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0UGFyc2VyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQWdCLFdBQVcsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRWpHLE9BQU8sRUFBd0QscUJBQXFCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQU05RyxPQUFPLEVBQThFLGtDQUFrQyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFrQjFKLE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBMkI7SUFDeEQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzFFLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFFbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUMxQixDQUFDO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjthQUNmLFNBQUksR0FBRyxNQUFNLEFBQVQsQ0FBVTtJQUU5QixZQUFxQixLQUFrQixFQUFXLFdBQW1CLEVBQVcsSUFBWTtRQUF2RSxVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBRG5GLFNBQUksR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7SUFDdUQsQ0FBQztJQUVqRyxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQzs7QUFHRix1REFBdUQ7QUFDdkQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0FBQ3RDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUM7QUFDbkMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBRXhDOzs7R0FHRztBQUNILE1BQU0sdUJBQXVCO2FBQ1osU0FBSSxHQUFHLEtBQUssQUFBUixDQUFTO0lBRTdCLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxZQUFvQixFQUFXLFdBQW1CLEVBQVcsVUFBa0I7UUFBMUksVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsaUJBQVksR0FBWixZQUFZLENBQVE7UUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFXLGVBQVUsR0FBVixVQUFVLENBQVE7UUFEdEosU0FBSSxHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQztJQUNzSCxDQUFDO0lBRXBLLElBQUksSUFBSTtRQUNQLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDL0QsT0FBTyxHQUFHLGtCQUFrQixHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxFQUFFLENBQUM7SUFDOUQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsQixDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFtQjthQUNmLFNBQUksR0FBRyxNQUFNLEFBQVQsQ0FBVTtJQUU5QixZQUFxQixLQUFrQixFQUFXLFdBQW1CLEVBQVcsUUFBZ0IsRUFBVyxNQUFjLEVBQVcsV0FBb0IsRUFBVyxJQUF3QjtRQUF0SyxVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBQVcsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFEbEwsU0FBSSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQztJQUNzSixDQUFDO0lBRWhNLElBQUksSUFBSTtRQUNQLE9BQU8sR0FBRyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNoTSxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUFzQjthQUNsQixTQUFJLEdBQUcsU0FBUyxBQUFaLENBQWE7SUFFakMsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLEVBQVUsRUFBVyxJQUFZLEVBQVcsSUFBZSxFQUFXLEtBQThCO1FBQS9KLFVBQUssR0FBTCxLQUFLLENBQWE7UUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFXLE9BQUUsR0FBRixFQUFFLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVcsU0FBSSxHQUFKLElBQUksQ0FBVztRQUFXLFVBQUssR0FBTCxLQUFLLENBQXlCO1FBRDNLLFNBQUksR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7SUFDNEksQ0FBQztJQUV6TCxJQUFJLElBQUk7UUFDUCxPQUFPLEdBQUcsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2pILENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ2hCLFNBQUksR0FBRyxPQUFPLEFBQVYsQ0FBVztJQUUvQixZQUFxQixLQUFrQixFQUFXLFdBQW1CLEVBQVcsS0FBcUI7UUFBaEYsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFENUYsU0FBSSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQztJQUMrRCxDQUFDO0lBRTFHLElBQUksSUFBSTtRQUVQLE9BQU8sR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjthQUMxQixTQUFJLEdBQUcsWUFBWSxBQUFmLENBQWdCO0lBRXBDLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxPQUEwQjtRQUFyRixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQURqRyxTQUFJLEdBQUcsOEJBQThCLENBQUMsSUFBSSxDQUFDO0lBQzBELENBQUM7SUFFL0csSUFBSSxJQUFJO1FBQ1AsT0FBTyxHQUFHLG9CQUFvQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQzs7QUFHRjs7R0FFRztBQUNILE1BQU0sT0FBTywyQkFBMkI7YUFDdkIsU0FBSSxHQUFHLE9BQU8sQUFBVixDQUFXO0lBRS9CLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxZQUE0QjtRQUF2RixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxpQkFBWSxHQUFaLFlBQVksQ0FBZ0I7UUFEbkcsU0FBSSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQztJQUMrRCxDQUFDO0lBRWpILElBQUksSUFBSTtRQUNQLE9BQU8sR0FBRyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlELENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLEdBQUcsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5RCxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDBCQUEwQjthQUN0QixTQUFJLEdBQUcsUUFBUSxBQUFYLENBQVk7SUFFaEMsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLGtCQUEyQztRQUF0RyxVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXlCO1FBRGxILFNBQUksR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUM7SUFDK0UsQ0FBQztJQUVoSSxJQUFJLElBQUk7UUFDUCxPQUFPLEdBQUcsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BFLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLEdBQUcsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3BFLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sOEJBQThCO2FBQzFCLFNBQUksR0FBRyxTQUFTLEFBQVosQ0FBYTtJQUVqQyxZQUFxQixLQUFrQixFQUFXLFdBQW1CLEVBQVcsSUFBWSxFQUFXLEVBQVUsRUFBVyxnQkFBb0MsRUFBVyxJQUErQixFQUFXLFFBQWlCLEVBQVcsSUFBZ0IsRUFBVyxNQUFnQixFQUFXLFdBQXFCO1FBQXZTLFVBQUssR0FBTCxLQUFLLENBQWE7UUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFXLFNBQUksR0FBSixJQUFJLENBQVE7UUFBVyxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQVcscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFvQjtRQUFXLFNBQUksR0FBSixJQUFJLENBQTJCO1FBQVcsYUFBUSxHQUFSLFFBQVEsQ0FBUztRQUFXLFNBQUksR0FBSixJQUFJLENBQVk7UUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFVO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVU7UUFEblQsU0FBSSxHQUFHLDhCQUE4QixDQUFDLElBQUksQ0FBQztJQUM0USxDQUFDO0lBRWpVLElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELGVBQWU7UUFDZCxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLGtDQUFrQyxDQUFDLE9BQU8sQ0FBRSxJQUFJLENBQUMsSUFBcUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RyxDQUFDO1FBRUQsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMU0sQ0FBQzs7QUFHRixNQUFNLFVBQVUsdUJBQXVCLENBQUMsVUFBOEI7SUFDckUsT0FBTztRQUNOLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtRQUNyQixLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM1QyxPQUFPLElBQUksbUJBQW1CLENBQzdCLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQzFELElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxJQUFJLENBQ1QsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2RCxPQUFPLElBQUksdUJBQXVCLENBQ2pDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQzFELElBQUksQ0FBQyxXQUFXLEVBQ2YsSUFBZ0MsQ0FBQyxZQUFZLEVBQzdDLElBQWdDLENBQUMsV0FBVyxFQUM1QyxJQUFnQyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQ2xELENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDbkQsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNmLElBQTRCLENBQUMsUUFBUSxFQUNyQyxJQUE0QixDQUFDLE1BQU0sRUFDbkMsSUFBNEIsQ0FBQyxXQUFXLEVBQ3hDLElBQTRCLENBQUMsSUFBSSxDQUNsQyxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3RELE9BQU8sSUFBSSxzQkFBc0IsQ0FDaEMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDMUQsSUFBSSxDQUFDLFdBQVcsRUFDZixJQUErQixDQUFDLEVBQUUsRUFDbEMsSUFBK0IsQ0FBQyxJQUFJLEVBQ3BDLElBQStCLENBQUMsSUFBSSxFQUNwQyxJQUErQixDQUFDLEtBQUssSUFBSSxFQUFFLENBQzVDLENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEQsSUFBSSxLQUFLLEdBQUksSUFBNkIsQ0FBQyxLQUFLLENBQUM7Z0JBQ2pELEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFckMsT0FBTyxJQUFJLG9CQUFvQixDQUM5QixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNoQixLQUFLLENBQ0wsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLDhCQUE4QixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM5RCxPQUFPLElBQUksOEJBQThCLENBQ3hDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQzFELElBQUksQ0FBQyxXQUFXLEVBQ2YsSUFBdUMsQ0FBQyxPQUFPLENBQ2hELENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDM0QsT0FBTyxJQUFJLDJCQUEyQixDQUNyQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNmLElBQW9DLENBQUMsWUFBWSxDQUNsRCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzFELE9BQU8sSUFBSSwwQkFBMEIsQ0FDcEMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDMUQsSUFBSSxDQUFDLFdBQVcsRUFDZixJQUFtQyxDQUFDLGtCQUFrQixDQUN2RCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssOEJBQThCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzlELE9BQU8sSUFBSSw4QkFBOEIsQ0FDeEMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDMUQsSUFBSSxDQUFDLFdBQVcsRUFDZixJQUF1QyxDQUFDLElBQUksRUFDNUMsSUFBdUMsQ0FBQyxFQUFFLEVBQzFDLElBQXVDLENBQUMsZ0JBQWdCLEVBQ3pELE1BQU0sQ0FBRSxJQUF1QyxDQUFDLElBQUksQ0FBQyxFQUNwRCxJQUF1QyxDQUFDLFFBQVEsRUFDaEQsSUFBdUMsQ0FBQyxJQUFJLEVBQzVDLElBQXVDLENBQUMsTUFBTSxFQUM5QyxJQUF1QyxDQUFDLFdBQVcsQ0FDcEQsQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDO0tBQ0YsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsTUFBMEI7SUFDaEUsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQTZCLEVBQUUsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsQ0FBQztJQUN6RyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBdUMsRUFBRSxDQUFDLENBQUMsWUFBWSw4QkFBOEIsQ0FBQyxDQUFDO0lBQy9ILE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUM7QUFDbkMsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxnQkFBbUMsRUFBRSxRQUEyQixFQUFFLE1BQWMsRUFBRSxjQUE2QixJQUFJLEVBQUUsVUFBeUIsSUFBSTtJQUNwTCxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDbEIsSUFBSSxXQUFXLElBQUksV0FBVyxLQUFLLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUNuRixNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1oscUNBQXFDO1lBQ3JDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxRQUFRLElBQUksR0FBRyxlQUFlLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDO1FBQy9DLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixRQUFRLElBQUksR0FBRyxvQkFBb0IsR0FBRyxPQUFPLEdBQUcsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sUUFBUSxHQUFHLE1BQU0sQ0FBQztBQUMxQixDQUFDIn0=