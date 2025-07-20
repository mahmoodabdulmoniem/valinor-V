/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { resolveCommonProperties } from '../../../../platform/telemetry/common/commonProperties.js';
import { firstSessionDateStorageKey, lastSessionDateStorageKey } from '../../../../platform/telemetry/common/telemetry.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
export function resolveWorkbenchCommonProperties(storageService, release, hostname, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, process, releaseDate, remoteAuthority) {
    const result = resolveCommonProperties(release, hostname, process.arch, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, releaseDate);
    const firstSessionDate = storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    const lastSessionDate = storageService.get(lastSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    // __GDPR__COMMON__ "common.version.shell" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.version.shell'] = process.versions?.['electron'];
    // __GDPR__COMMON__ "common.version.renderer" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.version.renderer'] = process.versions?.['chrome'];
    // __GDPR__COMMON__ "common.firstSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.firstSessionDate'] = firstSessionDate;
    // __GDPR__COMMON__ "common.lastSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.lastSessionDate'] = lastSessionDate || '';
    // __GDPR__COMMON__ "common.isNewSession" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isNewSession'] = !lastSessionDate ? '1' : '0';
    // __GDPR__COMMON__ "common.remoteAuthority" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.remoteAuthority'] = cleanRemoteAuthority(remoteAuthority);
    // __GDPR__COMMON__ "common.cli" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.cli'] = !!process.env['VSCODE_CLI'];
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RlbGVtZXRyeS9jb21tb24vd29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQXFCLDBCQUEwQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFHL0YsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxjQUErQixFQUMvQixPQUFlLEVBQ2YsUUFBZ0IsRUFDaEIsTUFBMEIsRUFDMUIsT0FBMkIsRUFDM0IsU0FBaUIsRUFDakIsS0FBYSxFQUNiLFdBQW1CLEVBQ25CLG1CQUE0QixFQUM1QixPQUFxQixFQUNyQixXQUErQixFQUMvQixlQUF3QjtJQUV4QixNQUFNLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUMxSixNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLG9DQUE0QixDQUFDO0lBQ25HLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLG9DQUE0QixDQUFDO0lBRWpHLHNIQUFzSDtJQUN0SCxNQUFNLENBQUMsc0JBQXNCLENBQUMsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDaEUseUhBQXlIO0lBQ3pILE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNqRSxtSEFBbUg7SUFDbkgsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsZ0JBQWdCLENBQUM7SUFDckQsa0hBQWtIO0lBQ2xILE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLGVBQWUsSUFBSSxFQUFFLENBQUM7SUFDekQsK0dBQStHO0lBQy9HLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUM3RCx3SEFBd0g7SUFDeEgsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDekUsc0dBQXNHO0lBQ3RHLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUVuRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==