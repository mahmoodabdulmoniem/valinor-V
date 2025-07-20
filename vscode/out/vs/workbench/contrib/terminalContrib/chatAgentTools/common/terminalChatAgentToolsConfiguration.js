/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalChatAgentToolsSettingId;
(function (TerminalChatAgentToolsSettingId) {
    TerminalChatAgentToolsSettingId["CoreToolsEnabled"] = "chat.agent.terminal.coreToolsEnabled";
    TerminalChatAgentToolsSettingId["AllowList"] = "chat.agent.terminal.allowList";
    TerminalChatAgentToolsSettingId["DenyList"] = "chat.agent.terminal.denyList";
})(TerminalChatAgentToolsSettingId || (TerminalChatAgentToolsSettingId = {}));
export const terminalChatAgentToolsConfiguration = {
    ["chat.agent.terminal.coreToolsEnabled" /* TerminalChatAgentToolsSettingId.CoreToolsEnabled */]: {
        description: localize('coreToolsEnabled', "Whether the experimental core tools are enabled. This required VS Code to be restarted."),
        type: 'boolean',
        tags: [
            'experimental'
        ],
        default: true,
    },
    ["chat.agent.terminal.allowList" /* TerminalChatAgentToolsSettingId.AllowList */]: {
        markdownDescription: localize('allowList', "A list of commands or regular expressions that allow the run in terminal tool commands to run without explicit approval. These will be matched against the start of a command. A regular expression can be provided by wrapping the string in `/` characters.\n\nExamples:\n- `\"mkdir\"` Will allow all command lines starting with `mkdir`\n- `\"npm run build\"` Will allow all command lines starting with `npm run build`\n- `\"/^git (status|show\\b.*)$/\"` will allow `git status` and all command lines starting with `git show`\n- `\"/.*/\"` will allow all command lines\n\nThis will be overridden by anything that matches an entry in `#chat.agent.terminal.denyList#`."),
        type: 'object',
        additionalProperties: {
            type: 'boolean',
            enum: [
                true,
                false,
            ],
            enumDescriptions: [
                localize('allowList.true', "Allow the pattern."),
                localize('allowList.false', "Do not allow the pattern."),
            ],
            description: localize('allowList.key', "The start of a command to match against. A regular expression can be provided by wrapping the string in `/` characters."),
        },
        tags: [
            'experimental'
        ],
        default: {},
    },
    ["chat.agent.terminal.denyList" /* TerminalChatAgentToolsSettingId.DenyList */]: {
        markdownDescription: localize('denyList', "A list of commands or regular expressions that override matches in `#chat.agent.terminal.allowList#` and force a command line to require explicit approval. This will be matched against the start of a command. A regular expression can be provided by wrapping the string in `/` characters.\n\nExamples:\n- `\"rm\"` will require explicit approval for any command starting with `rm`\n- `\"/^git (push|pull)/\"` will require explicit approval for any command starting with `git push` or `git pull` \n\nThis provides basic protection by preventing certain commands from running automatically, especially those a user would likely want to approve first. It is not intended as a comprehensive security measure or a defense against prompt injection."),
        type: 'object',
        additionalProperties: {
            type: 'boolean',
            enum: [
                true,
                false
            ],
            enumDescriptions: [
                localize('denyList.value.true', "Deny the pattern."),
                localize('denyList.value.false', "Do not deny the pattern."),
            ],
            description: localize('denyList.key', "The start of a command to match against. A regular expression can be provided by wrapping the string in `/` characters.")
        },
        tags: [
            'experimental'
        ],
        default: {
            rm: true,
            rmdir: true,
            del: true,
            kill: true,
            curl: true,
            wget: true,
            eval: true,
            chmod: true,
            chown: true,
            'Remove-Item': true,
        },
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWdlbnRUb29sc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9jb21tb24vdGVybWluYWxDaGF0QWdlbnRUb29sc0NvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE1BQU0sQ0FBTixJQUFrQiwrQkFJakI7QUFKRCxXQUFrQiwrQkFBK0I7SUFDaEQsNEZBQXlELENBQUE7SUFDekQsOEVBQTJDLENBQUE7SUFDM0MsNEVBQXlDLENBQUE7QUFDMUMsQ0FBQyxFQUppQiwrQkFBK0IsS0FBL0IsK0JBQStCLFFBSWhEO0FBUUQsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQW9EO0lBQ25HLCtGQUFrRCxFQUFFO1FBQ25ELFdBQVcsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUseUZBQXlGLENBQUM7UUFDcEksSUFBSSxFQUFFLFNBQVM7UUFDZixJQUFJLEVBQUU7WUFDTCxjQUFjO1NBQ2Q7UUFDRCxPQUFPLEVBQUUsSUFBSTtLQUNiO0lBQ0QsaUZBQTJDLEVBQUU7UUFDNUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSx3cEJBQXdwQixDQUFDO1FBQ3BzQixJQUFJLEVBQUUsUUFBUTtRQUNkLG9CQUFvQixFQUFFO1lBQ3JCLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osS0FBSzthQUNMO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQztnQkFDaEQsUUFBUSxDQUFDLGlCQUFpQixFQUFFLDJCQUEyQixDQUFDO2FBQ3hEO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUseUhBQXlILENBQUM7U0FDaks7UUFDRCxJQUFJLEVBQUU7WUFDTCxjQUFjO1NBQ2Q7UUFDRCxPQUFPLEVBQUUsRUFBRTtLQUNYO0lBQ0QsK0VBQTBDLEVBQUU7UUFDM0MsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxzdUJBQXN1QixDQUFDO1FBQ2p4QixJQUFJLEVBQUUsUUFBUTtRQUNkLG9CQUFvQixFQUFFO1lBQ3JCLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSSxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osS0FBSzthQUNMO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDcEQsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDBCQUEwQixDQUFDO2FBQzVEO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUseUhBQXlILENBQUM7U0FDaEs7UUFDRCxJQUFJLEVBQUU7WUFDTCxjQUFjO1NBQ2Q7UUFDRCxPQUFPLEVBQUU7WUFDUixFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxJQUFJO1lBQ1gsR0FBRyxFQUFFLElBQUk7WUFDVCxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxJQUFJO1lBQ1gsS0FBSyxFQUFFLElBQUk7WUFDWCxhQUFhLEVBQUUsSUFBSTtTQUNuQjtLQUNEO0NBQ0QsQ0FBQyJ9