/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../platform/quickinput/common/quickAccess.js';
import { QuickHelpNLS } from '../../../common/standaloneStrings.js';
import { HelpQuickAccessProvider } from '../../../../platform/quickinput/browser/helpQuickAccess.js';
Registry.as(Extensions.Quickaccess).registerQuickAccessProvider({
    ctor: HelpQuickAccessProvider,
    prefix: '',
    helpEntries: [{ description: QuickHelpNLS.helpQuickAccessActionLabel }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUhlbHBRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9xdWlja0FjY2Vzcy9zdGFuZGFsb25lSGVscFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQXdCLFVBQVUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVyRyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDckYsSUFBSSxFQUFFLHVCQUF1QjtJQUM3QixNQUFNLEVBQUUsRUFBRTtJQUNWLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0NBQ3ZFLENBQUMsQ0FBQyJ9