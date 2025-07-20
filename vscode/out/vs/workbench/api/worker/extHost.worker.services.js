/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostAuthentication, IExtHostAuthentication } from '../common/extHostAuthentication.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostLogService } from '../common/extHostLogService.js';
import { ExtensionStoragePaths, IExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { ExtHostTelemetry, IExtHostTelemetry } from '../common/extHostTelemetry.js';
import { ExtHostExtensionService } from './extHostExtensionService.js';
// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [true], true));
registerSingleton(IExtHostAuthentication, ExtHostAuthentication, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostExtensionService, ExtHostExtensionService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTelemetry, new SyncDescriptor(ExtHostTelemetry, [true], true));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC53b3JrZXIuc2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvd29ya2VyL2V4dEhvc3Qud29ya2VyLnNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN2RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXZFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFFNUUsaUJBQWlCLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNwRixpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsa0NBQTBCLENBQUM7QUFDMUYsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLGtDQUEwQixDQUFDO0FBQzlGLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixrQ0FBMEIsQ0FBQztBQUMxRixpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMifQ==