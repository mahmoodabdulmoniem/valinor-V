/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const ITextModelService = createDecorator('textModelService');
export function isResolvedTextEditorModel(model) {
    const candidate = model;
    return !!candidate.textEditorModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3Jlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVFoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFMUYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFDO0FBd0V4RixNQUFNLFVBQVUseUJBQXlCLENBQUMsS0FBdUI7SUFDaEUsTUFBTSxTQUFTLEdBQUcsS0FBaUMsQ0FBQztJQUVwRCxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDO0FBQ3BDLENBQUMifQ==