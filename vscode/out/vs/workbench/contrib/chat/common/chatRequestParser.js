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
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestSlashPromptPart, ChatRequestTextPart, ChatRequestToolPart, ChatRequestToolSetPart, chatAgentLeader, chatSubcommandLeader, chatVariableLeader } from './chatParserTypes.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatModeKind } from './constants.js';
import { IPromptsService } from './promptSyntax/service/promptsService.js';
const agentReg = /^@([\w_\-\.]+)(?=(\s|$|\b))/i; // An @-agent
const variableReg = /^#([\w_\-]+)(:\d+)?(?=(\s|$|\b))/i; // A #-variable with an optional numeric : arg (@response:2)
const slashReg = /^\/([\p{L}_\-\.:]+)(?=(\s|$|\b))/iu; // A / command
let ChatRequestParser = class ChatRequestParser {
    constructor(agentService, variableService, slashCommandService, promptsService) {
        this.agentService = agentService;
        this.variableService = variableService;
        this.slashCommandService = slashCommandService;
        this.promptsService = promptsService;
    }
    parseChatRequest(sessionId, message, location = ChatAgentLocation.Panel, context) {
        const parts = [];
        const references = this.variableService.getDynamicVariables(sessionId); // must access this list before any async calls
        const toolsByName = new Map(this.variableService.getSelectedTools(sessionId)
            .filter(t => t.canBeReferencedInPrompt && t.toolReferenceName)
            .map(t => [t.toolReferenceName, t]));
        const toolSetsByName = new Map(this.variableService.getSelectedToolSets(sessionId)
            .map(t => [t.referenceName, t]));
        let lineNumber = 1;
        let column = 1;
        for (let i = 0; i < message.length; i++) {
            const previousChar = message.charAt(i - 1);
            const char = message.charAt(i);
            let newPart;
            if (previousChar.match(/\s/) || i === 0) {
                if (char === chatVariableLeader) {
                    newPart = this.tryToParseVariable(message.slice(i), i, new Position(lineNumber, column), parts, toolsByName, toolSetsByName);
                }
                else if (char === chatAgentLeader) {
                    newPart = this.tryToParseAgent(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                else if (char === chatSubcommandLeader) {
                    newPart = this.tryToParseSlashCommand(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                if (!newPart) {
                    newPart = this.tryToParseDynamicVariable(message.slice(i), i, new Position(lineNumber, column), references);
                }
            }
            if (newPart) {
                if (i !== 0) {
                    // Insert a part for all the text we passed over, then insert the new parsed part
                    const previousPart = parts.at(-1);
                    const previousPartEnd = previousPart?.range.endExclusive ?? 0;
                    const previousPartEditorRangeEndLine = previousPart?.editorRange.endLineNumber ?? 1;
                    const previousPartEditorRangeEndCol = previousPart?.editorRange.endColumn ?? 1;
                    parts.push(new ChatRequestTextPart(new OffsetRange(previousPartEnd, i), new Range(previousPartEditorRangeEndLine, previousPartEditorRangeEndCol, lineNumber, column), message.slice(previousPartEnd, i)));
                }
                parts.push(newPart);
            }
            if (char === '\n') {
                lineNumber++;
                column = 1;
            }
            else {
                column++;
            }
        }
        const lastPart = parts.at(-1);
        const lastPartEnd = lastPart?.range.endExclusive ?? 0;
        if (lastPartEnd < message.length) {
            parts.push(new ChatRequestTextPart(new OffsetRange(lastPartEnd, message.length), new Range(lastPart?.editorRange.endLineNumber ?? 1, lastPart?.editorRange.endColumn ?? 1, lineNumber, column), message.slice(lastPartEnd, message.length)));
        }
        return {
            parts,
            text: message,
        };
    }
    tryToParseAgent(message, fullMessage, offset, position, parts, location, context) {
        const nextAgentMatch = message.match(agentReg);
        if (!nextAgentMatch) {
            return;
        }
        const [full, name] = nextAgentMatch;
        const agentRange = new OffsetRange(offset, offset + full.length);
        const agentEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        let agents = this.agentService.getAgentsByName(name);
        if (!agents.length) {
            const fqAgent = this.agentService.getAgentByFullyQualifiedId(name);
            if (fqAgent) {
                agents = [fqAgent];
            }
        }
        // If there is more than one agent with this name, and the user picked it from the suggest widget, then the selected agent should be in the
        // context and we use that one.
        const agent = agents.length > 1 && context?.selectedAgent ?
            context.selectedAgent :
            agents.find((a) => a.locations.includes(location));
        if (!agent) {
            return;
        }
        if (context?.mode && !agent.modes.includes(context.mode)) {
            return;
        }
        if (parts.some(p => p instanceof ChatRequestAgentPart)) {
            // Only one agent allowed
            return;
        }
        // The agent must come first
        if (parts.some(p => (p instanceof ChatRequestTextPart && p.text.trim() !== '') || !(p instanceof ChatRequestAgentPart))) {
            return;
        }
        const previousPart = parts.at(-1);
        const previousPartEnd = previousPart?.range.endExclusive ?? 0;
        const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
        if (textSincePreviousPart.trim() !== '') {
            return;
        }
        return new ChatRequestAgentPart(agentRange, agentEditorRange, agent);
    }
    tryToParseVariable(message, offset, position, parts, toolsByName, toolSetsByName) {
        const nextVariableMatch = message.match(variableReg);
        if (!nextVariableMatch) {
            return;
        }
        const [full, name] = nextVariableMatch;
        const varRange = new OffsetRange(offset, offset + full.length);
        const varEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const tool = toolsByName.get(name);
        if (tool) {
            return new ChatRequestToolPart(varRange, varEditorRange, name, tool.id, tool.displayName, tool.icon);
        }
        const toolset = toolSetsByName.get(name);
        if (toolset) {
            const value = Array.from(toolset.getTools()).map(t => new ChatRequestToolPart(varRange, varEditorRange, t.toolReferenceName ?? t.displayName, t.id, t.displayName, t.icon).toVariableEntry());
            return new ChatRequestToolSetPart(varRange, varEditorRange, toolset.id, toolset.referenceName, toolset.icon, value);
        }
        return;
    }
    tryToParseSlashCommand(remainingMessage, fullMessage, offset, position, parts, location, context) {
        const nextSlashMatch = remainingMessage.match(slashReg);
        if (!nextSlashMatch) {
            return;
        }
        if (parts.some(p => !(p instanceof ChatRequestAgentPart) && !(p instanceof ChatRequestTextPart && p.text.trim() === ''))) {
            // no other part than agent or non-whitespace text allowed: that also means no other slash command
            return;
        }
        // only whitespace after the last part
        const previousPart = parts.at(-1);
        const previousPartEnd = previousPart?.range.endExclusive ?? 0;
        const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
        if (textSincePreviousPart.trim() !== '') {
            return;
        }
        const [full, command] = nextSlashMatch;
        const slashRange = new OffsetRange(offset, offset + full.length);
        const slashEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const usedAgent = parts.find((p) => p instanceof ChatRequestAgentPart);
        if (usedAgent) {
            const subCommand = usedAgent.agent.slashCommands.find(c => c.name === command);
            if (subCommand) {
                // Valid agent subcommand
                return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
            }
        }
        else {
            const slashCommands = this.slashCommandService.getCommands(location, context?.mode ?? ChatModeKind.Ask);
            const slashCommand = slashCommands.find(c => c.command === command);
            if (slashCommand) {
                // Valid standalone slash command
                return new ChatRequestSlashCommandPart(slashRange, slashEditorRange, slashCommand);
            }
            else {
                // check for with default agent for this location
                const defaultAgent = this.agentService.getDefaultAgent(location, context?.mode);
                const subCommand = defaultAgent?.slashCommands.find(c => c.name === command);
                if (subCommand) {
                    // Valid default agent subcommand
                    return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
                }
            }
            // if there's no agent, check if it's a prompt command
            const promptCommand = this.promptsService.asPromptSlashCommand(command);
            if (promptCommand) {
                return new ChatRequestSlashPromptPart(slashRange, slashEditorRange, promptCommand);
            }
        }
        return;
    }
    tryToParseDynamicVariable(message, offset, position, references) {
        const refAtThisPosition = references.find(r => r.range.startLineNumber === position.lineNumber &&
            r.range.startColumn === position.column);
        if (refAtThisPosition) {
            const length = refAtThisPosition.range.endColumn - refAtThisPosition.range.startColumn;
            const text = message.substring(0, length);
            const range = new OffsetRange(offset, offset + length);
            return new ChatRequestDynamicVariablePart(range, refAtThisPosition.range, text, refAtThisPosition.id, refAtThisPosition.modelDescription, refAtThisPosition.data, refAtThisPosition.fullName, refAtThisPosition.icon, refAtThisPosition.isFile, refAtThisPosition.isDirectory);
        }
        return;
    }
};
ChatRequestParser = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatVariablesService),
    __param(2, IChatSlashCommandService),
    __param(3, IPromptsService)
], ChatRequestParser);
export { ChatRequestParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRSZXF1ZXN0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuRixPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsOEJBQThCLEVBQUUsMkJBQTJCLEVBQUUsMEJBQTBCLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQThDLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzlWLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTNFLE1BQU0sUUFBUSxHQUFHLDhCQUE4QixDQUFDLENBQUMsYUFBYTtBQUM5RCxNQUFNLFdBQVcsR0FBRyxtQ0FBbUMsQ0FBQyxDQUFDLDREQUE0RDtBQUNySCxNQUFNLFFBQVEsR0FBRyxvQ0FBb0MsQ0FBQyxDQUFDLGNBQWM7QUFROUQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFDN0IsWUFDcUMsWUFBK0IsRUFDM0IsZUFBc0MsRUFDbkMsbUJBQTZDLEVBQ3RELGNBQStCO1FBSDdCLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUMzQixvQkFBZSxHQUFmLGVBQWUsQ0FBdUI7UUFDbkMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEwQjtRQUN0RCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFDOUQsQ0FBQztJQUVMLGdCQUFnQixDQUFDLFNBQWlCLEVBQUUsT0FBZSxFQUFFLFdBQThCLGlCQUFpQixDQUFDLEtBQUssRUFBRSxPQUE0QjtRQUN2SSxNQUFNLEtBQUssR0FBNkIsRUFBRSxDQUFDO1FBQzNDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQywrQ0FBK0M7UUFDdkgsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQW9CLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO2FBQzdGLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUM7YUFDN0QsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXZDLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFrQixJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQzthQUNqRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxPQUEyQyxDQUFDO1lBQ2hELElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLElBQUksSUFBSSxLQUFLLGtCQUFrQixFQUFFLENBQUM7b0JBQ2pDLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQzlILENBQUM7cUJBQU0sSUFBSSxJQUFJLEtBQUssZUFBZSxFQUFFLENBQUM7b0JBQ3JDLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDMUgsQ0FBQztxQkFBTSxJQUFJLElBQUksS0FBSyxvQkFBb0IsRUFBRSxDQUFDO29CQUMxQyxPQUFPLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDakksQ0FBQztnQkFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQzdHLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDYixpRkFBaUY7b0JBQ2pGLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEMsTUFBTSxlQUFlLEdBQUcsWUFBWSxFQUFFLEtBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDO29CQUM5RCxNQUFNLDhCQUE4QixHQUFHLFlBQVksRUFBRSxXQUFXLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQztvQkFDcEYsTUFBTSw2QkFBNkIsR0FBRyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUM7b0JBQy9FLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxtQkFBbUIsQ0FDakMsSUFBSSxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUNuQyxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSw2QkFBNkIsRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQzVGLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztnQkFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFFRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNaLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEVBQUUsQ0FBQztZQUNWLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sV0FBVyxHQUFHLFFBQVEsRUFBRSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUN0RCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLG1CQUFtQixDQUNqQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUM1QyxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLGFBQWEsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxTQUFTLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFDN0csT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsT0FBTztZQUNOLEtBQUs7WUFDTCxJQUFJLEVBQUUsT0FBTztTQUNiLENBQUM7SUFDSCxDQUFDO0lBRU8sZUFBZSxDQUFDLE9BQWUsRUFBRSxXQUFtQixFQUFFLE1BQWMsRUFBRSxRQUFtQixFQUFFLEtBQW9DLEVBQUUsUUFBMkIsRUFBRSxPQUF1QztRQUM1TSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ3BDLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0gsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25FLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEIsQ0FBQztRQUNGLENBQUM7UUFFRCwySUFBMkk7UUFDM0ksK0JBQStCO1FBQy9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMxRCxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztZQUN4RCx5QkFBeUI7WUFDekIsT0FBTztRQUNSLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksbUJBQW1CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3pILE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sZUFBZSxHQUFHLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztRQUM5RCxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pFLElBQUkscUJBQXFCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDekMsT0FBTztRQUNSLENBQUM7UUFFRCxPQUFPLElBQUksb0JBQW9CLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUFlLEVBQUUsTUFBYyxFQUFFLFFBQW1CLEVBQUUsS0FBNEMsRUFBRSxXQUEyQyxFQUFFLGNBQTRDO1FBQ3ZOLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsaUJBQWlCLENBQUM7UUFDdkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFM0gsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxJQUFJLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEcsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztZQUM5TCxPQUFPLElBQUksc0JBQXNCLENBQUMsUUFBUSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNySCxDQUFDO1FBRUQsT0FBTztJQUNSLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxnQkFBd0IsRUFBRSxXQUFtQixFQUFFLE1BQWMsRUFBRSxRQUFtQixFQUFFLEtBQTRDLEVBQUUsUUFBMkIsRUFBRSxPQUE0QjtRQUN6TixNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksbUJBQW1CLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUgsa0dBQWtHO1lBQ2xHLE9BQU87UUFDUixDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLGVBQWUsR0FBRyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUM7UUFDOUQsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RSxJQUFJLHFCQUFxQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxjQUFjLENBQUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUU3SCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUE2QixFQUFFLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLENBQUM7UUFDbEcsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLENBQUM7WUFDL0UsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIseUJBQXlCO2dCQUN6QixPQUFPLElBQUksOEJBQThCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3JGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hHLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxDQUFDO1lBQ3BFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLGlDQUFpQztnQkFDakMsT0FBTyxJQUFJLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNwRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaURBQWlEO2dCQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNoRixNQUFNLFVBQVUsR0FBRyxZQUFZLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDLENBQUM7Z0JBQzdFLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLGlDQUFpQztvQkFDakMsT0FBTyxJQUFJLDhCQUE4QixDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDckYsQ0FBQztZQUNGLENBQUM7WUFFRCxzREFBc0Q7WUFDdEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixPQUFPLElBQUksMEJBQTBCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3BGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTztJQUNSLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxPQUFlLEVBQUUsTUFBYyxFQUFFLFFBQW1CLEVBQUUsVUFBMkM7UUFDbEksTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzdDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FBQyxVQUFVO1lBQy9DLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO1lBQ3ZGLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFDdkQsT0FBTyxJQUFJLDhCQUE4QixDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaFIsQ0FBQztRQUVELE9BQU87SUFDUixDQUFDO0NBQ0QsQ0FBQTtBQTVOWSxpQkFBaUI7SUFFM0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxlQUFlLENBQUE7R0FMTCxpQkFBaUIsQ0E0TjdCIn0=