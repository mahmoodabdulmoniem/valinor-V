/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var ExtensionGalleryResourceType;
(function (ExtensionGalleryResourceType) {
    ExtensionGalleryResourceType["ExtensionQueryService"] = "ExtensionQueryService";
    ExtensionGalleryResourceType["ExtensionLatestVersionUri"] = "ExtensionLatestVersionUriTemplate";
    ExtensionGalleryResourceType["ExtensionStatisticsUri"] = "ExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["WebExtensionStatisticsUri"] = "WebExtensionStatisticsUriTemplate";
    ExtensionGalleryResourceType["PublisherViewUri"] = "PublisherViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionDetailsViewUri"] = "ExtensionDetailsViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionRatingViewUri"] = "ExtensionRatingViewUriTemplate";
    ExtensionGalleryResourceType["ExtensionResourceUri"] = "ExtensionResourceUriTemplate";
    ExtensionGalleryResourceType["ContactSupportUri"] = "ContactSupportUri";
})(ExtensionGalleryResourceType || (ExtensionGalleryResourceType = {}));
export var Flag;
(function (Flag) {
    Flag["None"] = "None";
    Flag["IncludeVersions"] = "IncludeVersions";
    Flag["IncludeFiles"] = "IncludeFiles";
    Flag["IncludeCategoryAndTags"] = "IncludeCategoryAndTags";
    Flag["IncludeSharedAccounts"] = "IncludeSharedAccounts";
    Flag["IncludeVersionProperties"] = "IncludeVersionProperties";
    Flag["ExcludeNonValidated"] = "ExcludeNonValidated";
    Flag["IncludeInstallationTargets"] = "IncludeInstallationTargets";
    Flag["IncludeAssetUri"] = "IncludeAssetUri";
    Flag["IncludeStatistics"] = "IncludeStatistics";
    Flag["IncludeLatestVersionOnly"] = "IncludeLatestVersionOnly";
    Flag["Unpublished"] = "Unpublished";
    Flag["IncludeNameConflictInfo"] = "IncludeNameConflictInfo";
    Flag["IncludeLatestPrereleaseAndStableVersionOnly"] = "IncludeLatestPrereleaseAndStableVersionOnly";
})(Flag || (Flag = {}));
export var ExtensionGalleryManifestStatus;
(function (ExtensionGalleryManifestStatus) {
    ExtensionGalleryManifestStatus["Available"] = "available";
    ExtensionGalleryManifestStatus["RequiresSignIn"] = "requiresSignIn";
    ExtensionGalleryManifestStatus["AccessDenied"] = "accessDenied";
    ExtensionGalleryManifestStatus["Unavailable"] = "unavailable";
})(ExtensionGalleryManifestStatus || (ExtensionGalleryManifestStatus = {}));
export const IExtensionGalleryManifestService = createDecorator('IExtensionGalleryManifestService');
export function getExtensionGalleryManifestResourceUri(manifest, type) {
    const [name, version] = type.split('/');
    for (const resource of manifest.resources) {
        const [r, v] = resource.type.split('/');
        if (r !== name) {
            continue;
        }
        if (!version || v === version) {
            return resource.id;
        }
        break;
    }
    return undefined;
}
export const ExtensionGalleryServiceUrlConfigKey = 'extensions.gallery.serviceUrl';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25HYWxsZXJ5TWFuaWZlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTlFLE1BQU0sQ0FBTixJQUFrQiw0QkFVakI7QUFWRCxXQUFrQiw0QkFBNEI7SUFDN0MsK0VBQStDLENBQUE7SUFDL0MsK0ZBQStELENBQUE7SUFDL0QseUZBQXlELENBQUE7SUFDekQsK0ZBQStELENBQUE7SUFDL0QsNkVBQTZDLENBQUE7SUFDN0MsMkZBQTJELENBQUE7SUFDM0QseUZBQXlELENBQUE7SUFDekQscUZBQXFELENBQUE7SUFDckQsdUVBQXVDLENBQUE7QUFDeEMsQ0FBQyxFQVZpQiw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBVTdDO0FBRUQsTUFBTSxDQUFOLElBQWtCLElBZWpCO0FBZkQsV0FBa0IsSUFBSTtJQUNyQixxQkFBYSxDQUFBO0lBQ2IsMkNBQW1DLENBQUE7SUFDbkMscUNBQTZCLENBQUE7SUFDN0IseURBQWlELENBQUE7SUFDakQsdURBQStDLENBQUE7SUFDL0MsNkRBQXFELENBQUE7SUFDckQsbURBQTJDLENBQUE7SUFDM0MsaUVBQXlELENBQUE7SUFDekQsMkNBQW1DLENBQUE7SUFDbkMsK0NBQXVDLENBQUE7SUFDdkMsNkRBQXFELENBQUE7SUFDckQsbUNBQTJCLENBQUE7SUFDM0IsMkRBQW1ELENBQUE7SUFDbkQsbUdBQTJGLENBQUE7QUFDNUYsQ0FBQyxFQWZpQixJQUFJLEtBQUosSUFBSSxRQWVyQjtBQWdDRCxNQUFNLENBQU4sSUFBa0IsOEJBS2pCO0FBTEQsV0FBa0IsOEJBQThCO0lBQy9DLHlEQUF1QixDQUFBO0lBQ3ZCLG1FQUFpQyxDQUFBO0lBQ2pDLCtEQUE2QixDQUFBO0lBQzdCLDZEQUEyQixDQUFBO0FBQzVCLENBQUMsRUFMaUIsOEJBQThCLEtBQTlCLDhCQUE4QixRQUsvQztBQUVELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLGVBQWUsQ0FBbUMsa0NBQWtDLENBQUMsQ0FBQztBQVd0SSxNQUFNLFVBQVUsc0NBQXNDLENBQUMsUUFBbUMsRUFBRSxJQUFZO0lBQ3ZHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxLQUFLLE1BQU0sUUFBUSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMzQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2hCLFNBQVM7UUFDVixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDL0IsT0FBTyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3BCLENBQUM7UUFDRCxNQUFNO0lBQ1AsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRywrQkFBK0IsQ0FBQyJ9