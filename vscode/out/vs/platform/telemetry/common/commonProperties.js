/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinuxSnap, platform, PlatformToString } from '../../../base/common/platform.js';
import { env, platform as nodePlatform } from '../../../base/common/process.js';
import { generateUuid } from '../../../base/common/uuid.js';
function getPlatformDetail(hostname) {
    if (platform === 2 /* Platform.Linux */ && /^penguin(\.|$)/i.test(hostname)) {
        return 'chromebook';
    }
    return undefined;
}
export function resolveCommonProperties(release, hostname, arch, commit, version, machineId, sqmId, devDeviceId, isInternalTelemetry, releaseDate, product) {
    const result = Object.create(null);
    // __GDPR__COMMON__ "common.machineId" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    result['common.machineId'] = machineId;
    // __GDPR__COMMON__ "common.sqmId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.sqmId'] = sqmId;
    // __GDPR__COMMON__ "common.devDeviceId" : { "endPoint": "SqmMachineId", "classification": "EndUserPseudonymizedInformation", "purpose": "BusinessInsight" }
    result['common.devDeviceId'] = devDeviceId;
    // __GDPR__COMMON__ "sessionID" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['sessionID'] = generateUuid() + Date.now();
    // __GDPR__COMMON__ "commitHash" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['commitHash'] = commit;
    // __GDPR__COMMON__ "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['version'] = version;
    // __GDPR__COMMON__ "common.releaseDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.releaseDate'] = releaseDate;
    // __GDPR__COMMON__ "common.platformVersion" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platformVersion'] = (release || '').replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3');
    // __GDPR__COMMON__ "common.platform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platform'] = PlatformToString(platform);
    // __GDPR__COMMON__ "common.nodePlatform" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodePlatform'] = nodePlatform;
    // __GDPR__COMMON__ "common.nodeArch" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.nodeArch'] = arch;
    // __GDPR__COMMON__ "common.product" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.product'] = product || 'desktop';
    if (isInternalTelemetry) {
        // __GDPR__COMMON__ "common.msftInternal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        result['common.msftInternal'] = isInternalTelemetry;
    }
    // dynamic properties which value differs on each call
    let seq = 0;
    const startTime = Date.now();
    Object.defineProperties(result, {
        // __GDPR__COMMON__ "timestamp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        'timestamp': {
            get: () => new Date(),
            enumerable: true
        },
        // __GDPR__COMMON__ "common.timesincesessionstart" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.timesincesessionstart': {
            get: () => Date.now() - startTime,
            enumerable: true
        },
        // __GDPR__COMMON__ "common.sequence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.sequence': {
            get: () => seq++,
            enumerable: true
        }
    });
    if (isLinuxSnap) {
        // __GDPR__COMMON__ "common.snap" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.snap'] = 'true';
    }
    const platformDetail = getPlatformDetail(hostname);
    if (platformDetail) {
        // __GDPR__COMMON__ "common.platformDetail" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        result['common.platformDetail'] = platformDetail;
    }
    return result;
}
export function verifyMicrosoftInternalDomain(domainList) {
    const userDnsDomain = env['USERDNSDOMAIN'];
    if (!userDnsDomain) {
        return false;
    }
    const domain = userDnsDomain.toLowerCase();
    return domainList.some(msftDomain => domain === msftDomain);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi9jb21tb25Qcm9wZXJ0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFZLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDckcsT0FBTyxFQUFFLEdBQUcsRUFBRSxRQUFRLElBQUksWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRzVELFNBQVMsaUJBQWlCLENBQUMsUUFBZ0I7SUFDMUMsSUFBSSxRQUFRLDJCQUFtQixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3JFLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxPQUFlLEVBQ2YsUUFBZ0IsRUFDaEIsSUFBWSxFQUNaLE1BQTBCLEVBQzFCLE9BQTJCLEVBQzNCLFNBQTZCLEVBQzdCLEtBQXlCLEVBQ3pCLFdBQStCLEVBQy9CLG1CQUE0QixFQUM1QixXQUErQixFQUMvQixPQUFnQjtJQUVoQixNQUFNLE1BQU0sR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0RCwySkFBMko7SUFDM0osTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsU0FBUyxDQUFDO0lBQ3ZDLHNKQUFzSjtJQUN0SixNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQy9CLDRKQUE0SjtJQUM1SixNQUFNLENBQUMs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