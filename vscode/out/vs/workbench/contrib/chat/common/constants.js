/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["UseFileStorage"] = "chat.useFileStorage";
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
    ChatConfiguration["EditRequests"] = "chat.editRequests";
    ChatConfiguration["EnableMath"] = "chat.math.enabled";
    ChatConfiguration["CheckpointsEnabled"] = "chat.checkpoints.enabled";
})(ChatConfiguration || (ChatConfiguration = {}));
/**
 * The "kind" of the chat mode- "Agent" for custom modes.
 */
export var ChatModeKind;
(function (ChatModeKind) {
    ChatModeKind["Ask"] = "ask";
    ChatModeKind["Edit"] = "edit";
    ChatModeKind["Agent"] = "agent";
})(ChatModeKind || (ChatModeKind = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatModeKind.Ask:
        case ChatModeKind.Edit:
        case ChatModeKind.Agent:
            return mode;
        default:
            return undefined;
    }
}
export function isChatMode(mode) {
    return !!validateChatMode(mode);
}
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    ChatAgentLocation["Panel"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    ChatAgentLocation["Editor"] = "editor";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Panel;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.Editor;
        }
        return ChatAgentLocation.Panel;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxDQUFOLElBQVksaUJBUVg7QUFSRCxXQUFZLGlCQUFpQjtJQUM1QiwyREFBc0MsQ0FBQTtJQUN0Qyx3REFBbUMsQ0FBQTtJQUNuQywwREFBcUMsQ0FBQTtJQUNyQywwRUFBcUQsQ0FBQTtJQUNyRCx1REFBa0MsQ0FBQTtJQUNsQyxxREFBZ0MsQ0FBQTtJQUNoQyxvRUFBK0MsQ0FBQTtBQUNoRCxDQUFDLEVBUlcsaUJBQWlCLEtBQWpCLGlCQUFpQixRQVE1QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksWUFJWDtBQUpELFdBQVksWUFBWTtJQUN2QiwyQkFBVyxDQUFBO0lBQ1gsNkJBQWEsQ0FBQTtJQUNiLCtCQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUpXLFlBQVksS0FBWixZQUFZLFFBSXZCO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQWE7SUFDN0MsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNkLEtBQUssWUFBWSxDQUFDLEdBQUcsQ0FBQztRQUN0QixLQUFLLFlBQVksQ0FBQyxJQUFJLENBQUM7UUFDdkIsS0FBSyxZQUFZLENBQUMsS0FBSztZQUN0QixPQUFPLElBQW9CLENBQUM7UUFDN0I7WUFDQyxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBYTtJQUN2QyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqQyxDQUFDO0FBSUQsTUFBTSxDQUFOLElBQVksaUJBS1g7QUFMRCxXQUFZLGlCQUFpQjtJQUM1QixvQ0FBZSxDQUFBO0lBQ2YsMENBQXFCLENBQUE7SUFDckIsMENBQXFCLENBQUE7SUFDckIsc0NBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUxXLGlCQUFpQixLQUFqQixpQkFBaUIsUUFLNUI7QUFFRCxXQUFpQixpQkFBaUI7SUFDakMsU0FBZ0IsT0FBTyxDQUFDLEtBQTBDO1FBQ2pFLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDO1lBQzdDLEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7WUFDbkQsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztZQUNuRCxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsTUFBTSxDQUFDO1FBQ2hELENBQUM7UUFDRCxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQztJQUNoQyxDQUFDO0lBUmUseUJBQU8sVUFRdEIsQ0FBQTtBQUNGLENBQUMsRUFWZ0IsaUJBQWlCLEtBQWpCLGlCQUFpQixRQVVqQyJ9