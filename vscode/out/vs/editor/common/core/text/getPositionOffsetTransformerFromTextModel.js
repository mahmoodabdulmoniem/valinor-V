/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PositionOffsetTransformerBase } from './positionToOffset.js';
export function getPositionOffsetTransformerFromTextModel(textModel) {
    return new PositionOffsetTransformerWithTextModel(textModel);
}
class PositionOffsetTransformerWithTextModel extends PositionOffsetTransformerBase {
    constructor(_textModel) {
        super();
        this._textModel = _textModel;
    }
    getOffset(position) {
        return this._textModel.getOffsetAt(position);
    }
    getPosition(offset) {
        return this._textModel.getPositionAt(offset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0UG9zaXRpb25PZmZzZXRUcmFuc2Zvcm1lckZyb21UZXh0TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS90ZXh0L2dldFBvc2l0aW9uT2Zmc2V0VHJhbnNmb3JtZXJGcm9tVGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXRFLE1BQU0sVUFBVSx5Q0FBeUMsQ0FBQyxTQUFxQjtJQUM5RSxPQUFPLElBQUksc0NBQXNDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDOUQsQ0FBQztBQUVELE1BQU0sc0NBQXVDLFNBQVEsNkJBQTZCO0lBQ2pGLFlBQTZCLFVBQXNCO1FBQ2xELEtBQUssRUFBRSxDQUFDO1FBRG9CLGVBQVUsR0FBVixVQUFVLENBQVk7SUFFbkQsQ0FBQztJQUVRLFNBQVMsQ0FBQyxRQUFrQjtRQUNwQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFUSxXQUFXLENBQUMsTUFBYztRQUNsQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRCJ9