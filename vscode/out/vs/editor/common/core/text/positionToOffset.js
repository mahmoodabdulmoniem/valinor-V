/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StringEdit, StringReplacement } from '../edits/stringEdit.js';
import { TextEdit, TextReplacement } from '../edits/textEdit.js';
import { _setPositionOffsetTransformerDependencies } from './positionToOffsetImpl.js';
import { TextLength } from './textLength.js';
export { PositionOffsetTransformerBase, PositionOffsetTransformer } from './positionToOffsetImpl.js';
_setPositionOffsetTransformerDependencies({
    StringEdit: StringEdit,
    StringReplacement: StringReplacement,
    TextReplacement: TextReplacement,
    TextEdit: TextEdit,
    TextLength: TextLength,
});
// TODO@hediet this is dept and needs to go. See https://github.com/microsoft/vscode/issues/251126.
export function ensureDependenciesAreSet() {
    // Noop
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb25Ub09mZnNldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3RleHQvcG9zaXRpb25Ub09mZnNldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUseUNBQXlDLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFN0MsT0FBTyxFQUFFLDZCQUE2QixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFckcseUNBQXlDLENBQUM7SUFDekMsVUFBVSxFQUFFLFVBQVU7SUFDdEIsaUJBQWlCLEVBQUUsaUJBQWlCO0lBQ3BDLGVBQWUsRUFBRSxlQUFlO0lBQ2hDLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLFVBQVUsRUFBRSxVQUFVO0NBQ3RCLENBQUMsQ0FBQztBQUVILG1HQUFtRztBQUNuRyxNQUFNLFVBQVUsd0JBQXdCO0lBQ3ZDLE9BQU87QUFDUixDQUFDIn0=