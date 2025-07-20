/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { normalizeDriveLetter } from '../../../../../../base/common/labels.js';
import { basenameOrAuthority } from '../../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { CellUri } from '../../../common/notebookCommon.js';
export const NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST = [
    'text/plain',
    'text/html',
    'application/vnd.code.notebook.error',
    'application/vnd.code.notebook.stdout',
    'application/x.notebook.stdout',
    'application/x.notebook.stream',
    'application/vnd.code.notebook.stderr',
    'application/x.notebook.stderr',
    'image/png',
    'image/jpeg',
    'image/svg',
];
export function createNotebookOutputVariableEntry(outputViewModel, mimeType, notebookEditor) {
    // get the cell index
    const cellFromViewModelHandle = outputViewModel.cellViewModel.handle;
    const notebookModel = notebookEditor.textModel;
    const cell = notebookEditor.getCellByHandle(cellFromViewModelHandle);
    if (!cell || cell.outputsViewModels.length === 0 || !notebookModel) {
        return;
    }
    // uri of the cell
    const notebookUri = notebookModel.uri;
    const cellUri = cell.uri;
    const cellIndex = notebookModel.cells.indexOf(cell.model);
    // get the output index
    const outputId = outputViewModel?.model.outputId;
    let outputIndex = 0;
    if (outputId !== undefined) {
        // find the output index
        outputIndex = cell.outputsViewModels.findIndex(output => {
            return output.model.outputId === outputId;
        });
    }
    // construct the URI using the cell uri and output index
    const outputCellUri = CellUri.generateCellOutputUriWithIndex(notebookUri, cellUri, outputIndex);
    const fileName = normalizeDriveLetter(basenameOrAuthority(notebookUri));
    const l = {
        value: outputCellUri,
        id: outputCellUri.toString(),
        name: localize('notebookOutputCellLabel', "{0} • Cell {1} • Output {2}", fileName, `${cellIndex + 1}`, `${outputIndex + 1}`),
        icon: mimeType === 'application/vnd.code.notebook.error' ? ThemeIcon.fromId('error') : undefined,
        kind: 'notebookOutput',
        outputIndex,
        mimeType
    };
    return l;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDaGF0VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jaGF0L25vdGVib29rQ2hhdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzVELE1BQU0sQ0FBQyxNQUFNLGtEQUFrRCxHQUFHO0lBQ2pFLFlBQVk7SUFDWixXQUFXO0lBQ1gscUNBQXFDO0lBQ3JDLHNDQUFzQztJQUN0QywrQkFBK0I7SUFDL0IsK0JBQStCO0lBQy9CLHNDQUFzQztJQUN0QywrQkFBK0I7SUFDL0IsV0FBVztJQUNYLFlBQVk7SUFDWixXQUFXO0NBQ1gsQ0FBQztBQUVGLE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxlQUFxQyxFQUFFLFFBQWdCLEVBQUUsY0FBK0I7SUFFekkscUJBQXFCO0lBQ3JCLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7SUFDckUsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQztJQUMvQyxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDckUsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BFLE9BQU87SUFDUixDQUFDO0lBQ0Qsa0JBQWtCO0lBQ2xCLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUM7SUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUN6QixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUQsdUJBQXVCO0lBQ3ZCLE1BQU0sUUFBUSxHQUFHLGVBQWUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDO0lBQ2pELElBQUksV0FBVyxHQUFXLENBQUMsQ0FBQztJQUM1QixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM1Qix3QkFBd0I7UUFDeEIsV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDdkQsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUM7UUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsd0RBQXdEO0lBQ3hELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ2hHLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFFeEUsTUFBTSxDQUFDLEdBQWlDO1FBQ3ZDLEtBQUssRUFBRSxhQUFhO1FBQ3BCLEVBQUUsRUFBRSxhQUFhLENBQUMsUUFBUSxFQUFFO1FBQzVCLElBQUksRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsNkJBQTZCLEVBQUUsUUFBUSxFQUFFLEdBQUcsU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsV0FBVyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVILElBQUksRUFBRSxRQUFRLEtBQUsscUNBQXFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDaEcsSUFBSSxFQUFFLGdCQUFnQjtRQUN0QixXQUFXO1FBQ1gsUUFBUTtLQUNSLENBQUM7SUFFRixPQUFPLENBQUMsQ0FBQztBQUNWLENBQUMifQ==