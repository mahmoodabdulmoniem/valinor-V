/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export const ScreenshotVariableId = 'screenshot-focused-window';
export function convertBufferToScreenshotVariable(buffer) {
    return {
        id: ScreenshotVariableId,
        name: localize('screenshot', 'Screenshot'),
        value: buffer.buffer,
        kind: 'image'
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvc2NyZWVuc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsMkJBQTJCLENBQUM7QUFFaEUsTUFBTSxVQUFVLGlDQUFpQyxDQUFDLE1BQWdCO0lBQ2pFLE9BQU87UUFDTixFQUFFLEVBQUUsb0JBQW9CO1FBQ3hCLElBQUksRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQztRQUMxQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDcEIsSUFBSSxFQUFFLE9BQU87S0FDYixDQUFDO0FBQ0gsQ0FBQyJ9