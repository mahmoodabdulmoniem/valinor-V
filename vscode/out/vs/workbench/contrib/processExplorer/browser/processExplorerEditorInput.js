/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
const processExplorerEditorIcon = registerIcon('process-explorer-editor-label-icon', Codicon.serverProcess, localize('processExplorerEditorLabelIcon', 'Icon of the process explorer editor label.'));
export class ProcessExplorerEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = ProcessExplorerEditorInput.RESOURCE;
    }
    static { this.ID = 'workbench.editor.processExplorer'; }
    static { this.RESOURCE = URI.from({
        scheme: 'process-explorer',
        path: 'default'
    }); }
    static get instance() {
        if (!ProcessExplorerEditorInput._instance || ProcessExplorerEditorInput._instance.isDisposed()) {
            ProcessExplorerEditorInput._instance = new ProcessExplorerEditorInput();
        }
        return ProcessExplorerEditorInput._instance;
    }
    get typeId() { return ProcessExplorerEditorInput.ID; }
    get editorId() { return ProcessExplorerEditorInput.ID; }
    get capabilities() { return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */; }
    getName() {
        return localize('processExplorerInputName', "Process Explorer");
    }
    getIcon() {
        return processExplorerEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof ProcessExplorerEditorInput;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Byb2Nlc3NFeHBsb3Jlci9icm93c2VyL3Byb2Nlc3NFeHBsb3JlckVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEUsTUFBTSx5QkFBeUIsR0FBRyxZQUFZLENBQUMsb0NBQW9DLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsNENBQTRDLENBQUMsQ0FBQyxDQUFDO0FBRXRNLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxXQUFXO0lBQTNEOztRQXdCVSxhQUFRLEdBQUcsMEJBQTBCLENBQUMsUUFBUSxDQUFDO0lBaUJ6RCxDQUFDO2FBdkNnQixPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXNDO2FBRXhDLGFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ25DLE1BQU0sRUFBRSxrQkFBa0I7UUFDMUIsSUFBSSxFQUFFLFNBQVM7S0FDZixDQUFDLEFBSHNCLENBR3JCO0lBR0gsTUFBTSxLQUFLLFFBQVE7UUFDbEIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsSUFBSSwwQkFBMEIsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNoRywwQkFBMEIsQ0FBQyxTQUFTLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1FBQ3pFLENBQUM7UUFFRCxPQUFPLDBCQUEwQixDQUFDLFNBQVMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsSUFBYSxNQUFNLEtBQWEsT0FBTywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXZFLElBQWEsUUFBUSxLQUF5QixPQUFPLDBCQUEwQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFckYsSUFBYSxZQUFZLEtBQThCLE9BQU8sb0ZBQW9FLENBQUMsQ0FBQyxDQUFDO0lBSTVILE9BQU87UUFDZixPQUFPLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyx5QkFBeUIsQ0FBQztJQUNsQyxDQUFDO0lBRVEsT0FBTyxDQUFDLEtBQXdDO1FBQ3hELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxZQUFZLDBCQUEwQixDQUFDO0lBQ3BELENBQUMifQ==