/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { join } from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const MCPServerEditorIcon = registerIcon('mcp-server-editor-icon', Codicon.mcp, localize('mcpServerEditorLabelIcon', 'Icon of the MCP Server editor.'));
export class McpServerEditorInput extends EditorInput {
    static { this.ID = 'workbench.mcpServer.input2'; }
    get typeId() {
        return McpServerEditorInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.extension,
            path: join(this.mcpServer.id, 'mcpServer')
        });
    }
    constructor(_mcpServer) {
        super();
        this._mcpServer = _mcpServer;
    }
    get mcpServer() { return this._mcpServer; }
    getName() {
        return localize('extensionsInputName', "MCP Server: {0}", this._mcpServer.label);
    }
    getIcon() {
        return MCPServerEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof McpServerEditorInput && this._mcpServer.name === other._mcpServer.name;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFNlcnZlckVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdqRixNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM7QUFFeEosTUFBTSxPQUFPLG9CQUFxQixTQUFRLFdBQVc7YUFFcEMsT0FBRSxHQUFHLDRCQUE0QixDQUFDO0lBRWxELElBQWEsTUFBTTtRQUNsQixPQUFPLG9CQUFvQixDQUFDLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBYSxZQUFZO1FBQ3hCLE9BQU8sb0ZBQW9FLENBQUM7SUFDN0UsQ0FBQztJQUVELElBQWEsUUFBUTtRQUNwQixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDekIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUM7U0FDMUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFlBQW9CLFVBQStCO1FBQ2xELEtBQUssRUFBRSxDQUFDO1FBRFcsZUFBVSxHQUFWLFVBQVUsQ0FBcUI7SUFFbkQsQ0FBQztJQUVELElBQUksU0FBUyxLQUEwQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBRXZELE9BQU87UUFDZixPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxtQkFBbUIsQ0FBQztJQUM1QixDQUFDO0lBRVEsT0FBTyxDQUFDLEtBQXdDO1FBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxZQUFZLG9CQUFvQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ2hHLENBQUMifQ==