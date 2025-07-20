/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorConfiguration } from '../../../browser/config/editorConfiguration.js';
import { EditorFontLigatures, EditorFontVariations } from '../../../common/config/editorOptions.js';
import { FontInfo } from '../../../common/config/fontInfo.js';
import { TestAccessibilityService } from '../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
export class TestConfiguration extends EditorConfiguration {
    constructor(opts) {
        super(false, MenuId.EditorContext, opts, null, new TestAccessibilityService());
    }
    _readEnvConfiguration() {
        const envConfig = this.getRawOptions().envConfig;
        return {
            extraEditorClassName: envConfig?.extraEditorClassName ?? '',
            outerWidth: envConfig?.outerWidth ?? 100,
            outerHeight: envConfig?.outerHeight ?? 100,
            emptySelectionClipboard: envConfig?.emptySelectionClipboard ?? true,
            pixelRatio: envConfig?.pixelRatio ?? 1,
            accessibilitySupport: envConfig?.accessibilitySupport ?? 0 /* AccessibilitySupport.Unknown */,
            editContextSupported: true
        };
    }
    _readFontInfo(styling) {
        return new FontInfo({
            pixelRatio: 1,
            fontFamily: 'mockFont',
            fontWeight: 'normal',
            fontSize: 14,
            fontFeatureSettings: EditorFontLigatures.OFF,
            fontVariationSettings: EditorFontVariations.OFF,
            lineHeight: 19,
            letterSpacing: 1.5,
            isMonospace: true,
            typicalHalfwidthCharacterWidth: 10,
            typicalFullwidthCharacterWidth: 20,
            canUseHalfwidthRightwardsArrow: true,
            spaceWidth: 10,
            middotWidth: 10,
            wsmiddotWidth: 10,
            maxDigitWidth: 10,
        }, true);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29uZmlnL3Rlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBcUIsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRyxPQUFPLEVBQWdCLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV4RSxNQUFNLE9BQU8saUJBQWtCLFNBQVEsbUJBQW1CO0lBRXpELFlBQVksSUFBNkM7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVrQixxQkFBcUI7UUFDdkMsTUFBTSxTQUFTLEdBQUksSUFBSSxDQUFDLGFBQWEsRUFBb0MsQ0FBQyxTQUFTLENBQUM7UUFDcEYsT0FBTztZQUNOLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxvQkFBb0IsSUFBSSxFQUFFO1lBQzNELFVBQVUsRUFBRSxTQUFTLEVBQUUsVUFBVSxJQUFJLEdBQUc7WUFDeEMsV0FBVyxFQUFFLFNBQVMsRUFBRSxXQUFXLElBQUksR0FBRztZQUMxQyx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLElBQUksSUFBSTtZQUNuRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsSUFBSSxDQUFDO1lBQ3RDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSxvQkFBb0Isd0NBQWdDO1lBQ3JGLG9CQUFvQixFQUFFLElBQUk7U0FDMUIsQ0FBQztJQUNILENBQUM7SUFFa0IsYUFBYSxDQUFDLE9BQXFCO1FBQ3JELE9BQU8sSUFBSSxRQUFRLENBQUM7WUFDbkIsVUFBVSxFQUFFLENBQUM7WUFDYixVQUFVLEVBQUUsVUFBVTtZQUN0QixVQUFVLEVBQUUsUUFBUTtZQUNwQixRQUFRLEVBQUUsRUFBRTtZQUNaLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLEdBQUc7WUFDNUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsR0FBRztZQUMvQyxVQUFVLEVBQUUsRUFBRTtZQUNkLGFBQWEsRUFBRSxHQUFHO1lBQ2xCLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLDhCQUE4QixFQUFFLEVBQUU7WUFDbEMsOEJBQThCLEVBQUUsRUFBRTtZQUNsQyw4QkFBOEIsRUFBRSxJQUFJO1lBQ3BDLFVBQVUsRUFBRSxFQUFFO1lBQ2QsV0FBVyxFQUFFLEVBQUU7WUFDZixhQUFhLEVBQUUsRUFBRTtZQUNqQixhQUFhLEVBQUUsRUFBRTtTQUNqQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1YsQ0FBQztDQUNEIn0=