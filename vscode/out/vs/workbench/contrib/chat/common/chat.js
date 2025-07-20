/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function checkModeOption(mode, option) {
    if (option === undefined) {
        return undefined;
    }
    if (typeof option === 'function') {
        return option(mode);
    }
    return option;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLFVBQVUsZUFBZSxDQUFDLElBQWtCLEVBQUUsTUFBK0Q7SUFDbEgsSUFBSSxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDMUIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNELElBQUksT0FBTyxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyJ9