/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { distinct } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import * as semver from '../../../base/common/semver/semver.js';
import { CancellationError, getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { isWeb, platform } from '../../../base/common/platform.js';
import { arch } from '../../../base/common/process.js';
import { isBoolean, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { isOfflineError } from '../../../base/parts/request/common/request.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { getTargetPlatform, isNotWebExtensionInWebTargetPlatform, isTargetPlatformCompatible, toTargetPlatform, WEB_EXTENSION_TAG, ExtensionGalleryError, IAllowedExtensionsService, EXTENSION_IDENTIFIER_REGEX } from './extensionManagement.js';
import { adoptToGalleryExtensionId, areSameExtensions, getGalleryExtensionId, getGalleryExtensionTelemetryData } from './extensionManagementUtil.js';
import { areApiProposalsCompatible, isEngineValid } from '../../extensions/common/extensionValidator.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, asTextOrError, IRequestService, isSuccess } from '../../request/common/request.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { format2 } from '../../../base/common/strings.js';
import { getExtensionGalleryManifestResourceUri, IExtensionGalleryManifestService } from './extensionGalleryManifest.js';
import { TelemetryTrustedValue } from '../../telemetry/common/telemetryUtils.js';
const CURRENT_TARGET_PLATFORM = isWeb ? "web" /* TargetPlatform.WEB */ : getTargetPlatform(platform, arch);
const SEARCH_ACTIVITY_HEADER_NAME = 'X-Market-Search-Activity-Id';
const ACTIVITY_HEADER_NAME = 'Activityid';
const SERVER_HEADER_NAME = 'Server';
const END_END_ID_HEADER_NAME = 'X-Vss-E2eid';
const REQUEST_TIME_OUT = 10_000;
const AssetType = {
    Icon: 'Microsoft.VisualStudio.Services.Icons.Default',
    Details: 'Microsoft.VisualStudio.Services.Content.Details',
    Changelog: 'Microsoft.VisualStudio.Services.Content.Changelog',
    Manifest: 'Microsoft.VisualStudio.Code.Manifest',
    VSIX: 'Microsoft.VisualStudio.Services.VSIXPackage',
    License: 'Microsoft.VisualStudio.Services.Content.License',
    Repository: 'Microsoft.VisualStudio.Services.Links.Source',
    Signature: 'Microsoft.VisualStudio.Services.VsixSignature'
};
const PropertyType = {
    Dependency: 'Microsoft.VisualStudio.Code.ExtensionDependencies',
    ExtensionPack: 'Microsoft.VisualStudio.Code.ExtensionPack',
    Engine: 'Microsoft.VisualStudio.Code.Engine',
    PreRelease: 'Microsoft.VisualStudio.Code.PreRelease',
    EnabledApiProposals: 'Microsoft.VisualStudio.Code.EnabledApiProposals',
    LocalizedLanguages: 'Microsoft.VisualStudio.Code.LocalizedLanguages',
    WebExtension: 'Microsoft.VisualStudio.Code.WebExtension',
    SponsorLink: 'Microsoft.VisualStudio.Code.SponsorLink',
    SupportLink: 'Microsoft.VisualStudio.Services.Links.Support',
    ExecutesCode: 'Microsoft.VisualStudio.Code.ExecutesCode',
    Private: 'PrivateMarketplace',
};
const DefaultPageSize = 10;
const DefaultQueryState = {
    pageNumber: 1,
    pageSize: DefaultPageSize,
    sortBy: "NoneOrRelevance" /* SortBy.NoneOrRelevance */,
    sortOrder: 0 /* SortOrder.Default */,
    flags: [],
    criteria: [],
    assetTypes: []
};
var VersionKind;
(function (VersionKind) {
    VersionKind[VersionKind["Release"] = 0] = "Release";
    VersionKind[VersionKind["Prerelease"] = 1] = "Prerelease";
    VersionKind[VersionKind["Latest"] = 2] = "Latest";
})(VersionKind || (VersionKind = {}));
class Query {
    constructor(state = DefaultQueryState) {
        this.state = state;
    }
    get pageNumber() { return this.state.pageNumber; }
    get pageSize() { return this.state.pageSize; }
    get sortBy() { return this.state.sortBy; }
    get sortOrder() { return this.state.sortOrder; }
    get flags() { return this.state.flags; }
    get criteria() { return this.state.criteria; }
    get assetTypes() { return this.state.assetTypes; }
    get source() { return this.state.source; }
    get searchText() {
        const criterium = this.state.criteria.filter(criterium => criterium.filterType === "SearchText" /* FilterType.SearchText */)[0];
        return criterium && criterium.value ? criterium.value : '';
    }
    withPage(pageNumber, pageSize = this.state.pageSize) {
        return new Query({ ...this.state, pageNumber, pageSize });
    }
    withFilter(filterType, ...values) {
        const criteria = [
            ...this.state.criteria,
            ...values.length ? values.map(value => ({ filterType, value })) : [{ filterType }]
        ];
        return new Query({ ...this.state, criteria });
    }
    withSortBy(sortBy) {
        return new Query({ ...this.state, sortBy });
    }
    withSortOrder(sortOrder) {
        return new Query({ ...this.state, sortOrder });
    }
    withFlags(...flags) {
        return new Query({ ...this.state, flags: distinct(flags) });
    }
    withAssetTypes(...assetTypes) {
        return new Query({ ...this.state, assetTypes });
    }
    withSource(source) {
        return new Query({ ...this.state, source });
    }
}
function getStatistic(statistics, name) {
    const result = (statistics || []).filter(s => s.statisticName === name)[0];
    return result ? result.value : 0;
}
function getCoreTranslationAssets(version) {
    const coreTranslationAssetPrefix = 'Microsoft.VisualStudio.Code.Translation.';
    const result = version.files.filter(f => f.assetType.indexOf(coreTranslationAssetPrefix) === 0);
    return result.reduce((result, file) => {
        const asset = getVersionAsset(version, file.assetType);
        if (asset) {
            result.push([file.assetType.substring(coreTranslationAssetPrefix.length), asset]);
        }
        return result;
    }, []);
}
function getRepositoryAsset(version) {
    if (version.properties) {
        const results = version.properties.filter(p => p.key === AssetType.Repository);
        const gitRegExp = new RegExp('((git|ssh|http(s)?)|(git@[\\w.]+))(:(//)?)([\\w.@:/\\-~]+)(.git)(/)?');
        const uri = results.filter(r => gitRegExp.test(r.value))[0];
        return uri ? { uri: uri.value, fallbackUri: uri.value } : null;
    }
    return getVersionAsset(version, AssetType.Repository);
}
function getDownloadAsset(version) {
    return {
        // always use fallbackAssetUri for download asset to hit the Marketplace API so that downloads are counted
        uri: `${version.fallbackAssetUri}/${AssetType.VSIX}?redirect=true${version.targetPlatform ? `&targetPlatform=${version.targetPlatform}` : ''}`,
        fallbackUri: `${version.fallbackAssetUri}/${AssetType.VSIX}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`
    };
}
function getVersionAsset(version, type) {
    const result = version.files.filter(f => f.assetType === type)[0];
    return result ? {
        uri: `${version.assetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`,
        fallbackUri: `${version.fallbackAssetUri}/${type}${version.targetPlatform ? `?targetPlatform=${version.targetPlatform}` : ''}`
    } : null;
}
function getExtensions(version, property) {
    const values = version.properties ? version.properties.filter(p => p.key === property) : [];
    const value = values.length > 0 && values[0].value;
    return value ? value.split(',').map(v => adoptToGalleryExtensionId(v)) : [];
}
function getEngine(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.Engine) : [];
    return (values.length > 0 && values[0].value) || '';
}
function isPreReleaseVersion(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.PreRelease) : [];
    return values.length > 0 && values[0].value === 'true';
}
function hasPreReleaseForExtension(id, productService) {
    return productService.extensionProperties?.[id.toLowerCase()]?.hasPrereleaseVersion;
}
function getExcludeVersionRangeForExtension(id, productService) {
    return productService.extensionProperties?.[id.toLowerCase()]?.excludeVersionRange;
}
function isPrivateExtension(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.Private) : [];
    return values.length > 0 && values[0].value === 'true';
}
function executesCode(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.ExecutesCode) : [];
    return values.length > 0 ? values[0].value === 'true' : undefined;
}
function getEnabledApiProposals(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.EnabledApiProposals) : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getLocalizedLanguages(version) {
    const values = version.properties ? version.properties.filter(p => p.key === PropertyType.LocalizedLanguages) : [];
    const value = (values.length > 0 && values[0].value) || '';
    return value ? value.split(',') : [];
}
function getSponsorLink(version) {
    return version.properties?.find(p => p.key === PropertyType.SponsorLink)?.value;
}
function getSupportLink(version) {
    return version.properties?.find(p => p.key === PropertyType.SupportLink)?.value;
}
function getIsPreview(flags) {
    return flags.indexOf('preview') !== -1;
}
function getTargetPlatformForExtensionVersion(version) {
    return version.targetPlatform ? toTargetPlatform(version.targetPlatform) : "undefined" /* TargetPlatform.UNDEFINED */;
}
function getAllTargetPlatforms(rawGalleryExtension) {
    const allTargetPlatforms = distinct(rawGalleryExtension.versions.map(getTargetPlatformForExtensionVersion));
    // Is a web extension only if it has WEB_EXTENSION_TAG
    const isWebExtension = !!rawGalleryExtension.tags?.includes(WEB_EXTENSION_TAG);
    // Include Web Target Platform only if it is a web extension
    const webTargetPlatformIndex = allTargetPlatforms.indexOf("web" /* TargetPlatform.WEB */);
    if (isWebExtension) {
        if (webTargetPlatformIndex === -1) {
            // Web extension but does not has web target platform -> add it
            allTargetPlatforms.push("web" /* TargetPlatform.WEB */);
        }
    }
    else {
        if (webTargetPlatformIndex !== -1) {
            // Not a web extension but has web target platform -> remove it
            allTargetPlatforms.splice(webTargetPlatformIndex, 1);
        }
    }
    return allTargetPlatforms;
}
export function sortExtensionVersions(versions, preferredTargetPlatform) {
    /* It is expected that versions from Marketplace are sorted by version. So we are just sorting by preferred targetPlatform */
    for (let index = 0; index < versions.length; index++) {
        const version = versions[index];
        if (version.version === versions[index - 1]?.version) {
            let insertionIndex = index;
            const versionTargetPlatform = getTargetPlatformForExtensionVersion(version);
            /* put it at the beginning */
            if (versionTargetPlatform === preferredTargetPlatform) {
                while (insertionIndex > 0 && versions[insertionIndex - 1].version === version.version) {
                    insertionIndex--;
                }
            }
            if (insertionIndex !== index) {
                versions.splice(index, 1);
                versions.splice(insertionIndex, 0, version);
            }
        }
    }
    return versions;
}
function setTelemetry(extension, index, querySource) {
    /* __GDPR__FRAGMENT__
    "GalleryExtensionTelemetryData2" : {
        "index" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
        "querySource": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "queryActivityId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    }
    */
    extension.telemetryData = { index, querySource, queryActivityId: extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME] };
}
function toExtension(galleryExtension, version, allTargetPlatforms, extensionGalleryManifest, productService, queryContext) {
    const latestVersion = galleryExtension.versions[0];
    const assets = {
        manifest: getVersionAsset(version, AssetType.Manifest),
        readme: getVersionAsset(version, AssetType.Details),
        changelog: getVersionAsset(version, AssetType.Changelog),
        license: getVersionAsset(version, AssetType.License),
        repository: getRepositoryAsset(version),
        download: getDownloadAsset(version),
        icon: getVersionAsset(version, AssetType.Icon),
        signature: getVersionAsset(version, AssetType.Signature),
        coreTranslations: getCoreTranslationAssets(version)
    };
    const detailsViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, galleryExtension.linkType ?? "ExtensionDetailsViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionDetailsViewUri */);
    const publisherViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, galleryExtension.publisher.linkType ?? "PublisherViewUriTemplate" /* ExtensionGalleryResourceType.PublisherViewUri */);
    const ratingViewUri = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, galleryExtension.ratingLinkType ?? "ExtensionRatingViewUriTemplate" /* ExtensionGalleryResourceType.ExtensionRatingViewUri */);
    const id = getGalleryExtensionId(galleryExtension.publisher.publisherName, galleryExtension.extensionName);
    return {
        type: 'gallery',
        identifier: {
            id,
            uuid: galleryExtension.extensionId
        },
        name: galleryExtension.extensionName,
        version: version.version,
        displayName: galleryExtension.displayName,
        publisherId: galleryExtension.publisher.publisherId,
        publisher: galleryExtension.publisher.publisherName,
        publisherDisplayName: galleryExtension.publisher.displayName,
        publisherDomain: galleryExtension.publisher.domain ? { link: galleryExtension.publisher.domain, verified: !!galleryExtension.publisher.isDomainVerified } : undefined,
        publisherSponsorLink: getSponsorLink(latestVersion),
        description: galleryExtension.shortDescription ?? '',
        installCount: getStatistic(galleryExtension.statistics, 'install'),
        rating: getStatistic(galleryExtension.statistics, 'averagerating'),
        ratingCount: getStatistic(galleryExtension.statistics, 'ratingcount'),
        categories: galleryExtension.categories || [],
        tags: galleryExtension.tags || [],
        releaseDate: Date.parse(galleryExtension.releaseDate),
        lastUpdated: Date.parse(galleryExtension.lastUpdated),
        allTargetPlatforms,
        assets,
        properties: {
            dependencies: getExtensions(version, PropertyType.Dependency),
            extensionPack: getExtensions(version, PropertyType.ExtensionPack),
            engine: getEngine(version),
            enabledApiProposals: getEnabledApiProposals(version),
            localizedLanguages: getLocalizedLanguages(version),
            targetPlatform: getTargetPlatformForExtensionVersion(version),
            isPreReleaseVersion: isPreReleaseVersion(version),
            executesCode: executesCode(version)
        },
        hasPreReleaseVersion: hasPreReleaseForExtension(id, productService) ?? isPreReleaseVersion(latestVersion),
        hasReleaseVersion: true,
        private: isPrivateExtension(latestVersion),
        preview: getIsPreview(galleryExtension.flags),
        isSigned: !!assets.signature,
        queryContext,
        supportLink: getSupportLink(latestVersion),
        detailsLink: detailsViewUri ? format2(detailsViewUri, { publisher: galleryExtension.publisher.publisherName, name: galleryExtension.extensionName }) : undefined,
        publisherLink: publisherViewUri ? format2(publisherViewUri, { publisher: galleryExtension.publisher.publisherName }) : undefined,
        ratingLink: ratingViewUri ? format2(ratingViewUri, { publisher: galleryExtension.publisher.publisherName, name: galleryExtension.extensionName }) : undefined,
    };
}
let AbstractExtensionGalleryService = class AbstractExtensionGalleryService {
    constructor(storageService, assignmentService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        this.assignmentService = assignmentService;
        this.requestService = requestService;
        this.logService = logService;
        this.environmentService = environmentService;
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.productService = productService;
        this.configurationService = configurationService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.extensionsControlUrl = productService.extensionsGallery?.controlUrl;
        this.unpkgResourceApi = productService.extensionsGallery?.extensionUrlTemplate;
        this.extensionsEnabledWithApiProposalVersion = productService.extensionsEnabledWithApiProposalVersion?.map(id => id.toLowerCase()) ?? [];
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, this.environmentService, this.configurationService, this.fileService, storageService, this.telemetryService);
    }
    isEnabled() {
        return this.extensionGalleryManifestService.extensionGalleryManifestStatus === "available" /* ExtensionGalleryManifestStatus.Available */;
    }
    async getExtensions(extensionInfos, arg1, arg2) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        const options = CancellationToken.isCancellationToken(arg1) ? {} : arg1;
        const token = CancellationToken.isCancellationToken(arg1) ? arg1 : arg2;
        const resourceApi = await this.getResourceApi(extensionGalleryManifest);
        const result = resourceApi
            ? await this.getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token)
            : await this.getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token);
        const uuids = result.map(r => r.identifier.uuid);
        const extensionInfosByName = [];
        for (const e of extensionInfos) {
            if (e.uuid && !uuids.includes(e.uuid)) {
                extensionInfosByName.push({ ...e, uuid: undefined });
            }
        }
        if (extensionInfosByName.length) {
            // report telemetry data for additional query
            this.telemetryService.publicLog2('galleryService:additionalQueryByName', {
                count: extensionInfosByName.length
            });
            const extensions = await this.getExtensionsUsingQueryApi(extensionInfosByName, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getResourceApi(extensionGalleryManifest) {
        const value = await this.assignmentService?.getTreatment('extensions.gallery.useResourceApi') ?? 'marketplace';
        if (value === 'unpkg' && this.unpkgResourceApi) {
            return { uri: this.unpkgResourceApi };
        }
        const latestVersionResource = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionLatestVersionUriTemplate" /* ExtensionGalleryResourceType.ExtensionLatestVersionUri */);
        if (latestVersionResource) {
            return {
                uri: latestVersionResource,
                fallback: this.unpkgResourceApi
            };
        }
        return undefined;
    }
    async getExtensionsUsingQueryApi(extensionInfos, options, extensionGalleryManifest, token) {
        const names = [], ids = [], includePreRelease = [], versions = [];
        let isQueryForReleaseVersionFromPreReleaseVersion = true;
        for (const extensionInfo of extensionInfos) {
            if (extensionInfo.uuid) {
                ids.push(extensionInfo.uuid);
            }
            else {
                names.push(extensionInfo.id);
            }
            if (extensionInfo.version) {
                versions.push({ id: extensionInfo.id, uuid: extensionInfo.uuid, version: extensionInfo.version });
            }
            else {
                includePreRelease.push({ id: extensionInfo.id, uuid: extensionInfo.uuid, includePreRelease: !!extensionInfo.preRelease });
            }
            isQueryForReleaseVersionFromPreReleaseVersion = isQueryForReleaseVersionFromPreReleaseVersion && (!!extensionInfo.hasPreRelease && !extensionInfo.preRelease);
        }
        if (!ids.length && !names.length) {
            return [];
        }
        let query = new Query().withPage(1, extensionInfos.length);
        if (ids.length) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, ...ids);
        }
        if (names.length) {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, ...names);
        }
        if (options.queryAllVersions) {
            query = query.withFlags(...query.flags, "IncludeVersions" /* Flag.IncludeVersions */);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const { extensions } = await this.queryGalleryExtensions(query, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            includePreRelease,
            versions,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? { version: this.productService.version, date: this.productService.date },
            isQueryForReleaseVersionFromPreReleaseVersion
        }, extensionGalleryManifest, token);
        if (options.source) {
            extensions.forEach((e, index) => setTelemetry(e, index, options.source));
        }
        return extensions;
    }
    async getExtensionsUsingResourceApi(extensionInfos, options, resourceApi, extensionGalleryManifest, token) {
        const result = [];
        const toQuery = [];
        const toFetchLatest = [];
        for (const extensionInfo of extensionInfos) {
            if (!EXTENSION_IDENTIFIER_REGEX.test(extensionInfo.id)) {
                continue;
            }
            if (extensionInfo.version) {
                toQuery.push(extensionInfo);
            }
            else {
                toFetchLatest.push(extensionInfo);
            }
        }
        await Promise.allSettled(toFetchLatest.map(async (extensionInfo) => {
            let galleryExtension;
            try {
                try {
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.uri, extensionGalleryManifest, token);
                }
                catch (error) {
                    if (!resourceApi.fallback) {
                        throw error;
                    }
                    // fallback to unpkg
                    this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id} from ${resourceApi.uri}. Trying the fallback ${resourceApi.fallback}`, getErrorMessage(error));
                    this.telemetryService.publicLog2('galleryService:fallbacktounpkg', {
                        extension: extensionInfo.id,
                        preRelease: !!extensionInfo.preRelease,
                        compatible: !!options.compatible
                    });
                    galleryExtension = await this.getLatestGalleryExtension(extensionInfo, options, resourceApi.fallback, extensionGalleryManifest, token);
                }
                if (galleryExtension === 'NOT_FOUND') {
                    if (extensionInfo.uuid) {
                        // Fallback to query if extension with UUID is not found. Probably extension is renamed.
                        toQuery.push(extensionInfo);
                    }
                    return;
                }
                if (galleryExtension) {
                    result.push(galleryExtension);
                }
            }
            catch (error) {
                // fallback to query
                this.logService.error(`Error while getting the latest version for the extension ${extensionInfo.id}.`, getErrorMessage(error));
                this.telemetryService.publicLog2('galleryService:fallbacktoquery', {
                    extension: extensionInfo.id,
                    preRelease: !!extensionInfo.preRelease,
                    compatible: !!options.compatible,
                    fromFallback: !!resourceApi.fallback
                });
                toQuery.push(extensionInfo);
            }
        }));
        if (toQuery.length) {
            const extensions = await this.getExtensionsUsingQueryApi(toQuery, options, extensionGalleryManifest, token);
            result.push(...extensions);
        }
        return result;
    }
    async getLatestGalleryExtension(extensionInfo, options, resourceUriTemplate, extensionGalleryManifest, token) {
        const [publisher, name] = extensionInfo.id.split('.');
        const uri = URI.parse(format2(resourceUriTemplate, { publisher, name }));
        const rawGalleryExtension = await this.getLatestRawGalleryExtension(extensionInfo.id, uri, token);
        if (!rawGalleryExtension) {
            return 'NOT_FOUND';
        }
        const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
        const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
            targetPlatform: options.targetPlatform ?? CURRENT_TARGET_PLATFORM,
            compatible: !!options.compatible,
            productVersion: options.productVersion ?? {
                version: this.productService.version,
                date: this.productService.date
            },
            version: extensionInfo.preRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */
        }, allTargetPlatforms);
        if (rawGalleryExtensionVersion) {
            return toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, this.productService);
        }
        return null;
    }
    async getCompatibleExtension(extension, includePreRelease, targetPlatform, productVersion = { version: this.productService.version, date: this.productService.date }) {
        if (isNotWebExtensionInWebTargetPlatform(extension.allTargetPlatforms, targetPlatform)) {
            return null;
        }
        if (await this.isExtensionCompatible(extension, includePreRelease, targetPlatform)) {
            return extension;
        }
        if (this.allowedExtensionsService.isAllowed({ id: extension.identifier.id, publisherDisplayName: extension.publisherDisplayName }) !== true) {
            return null;
        }
        const result = await this.getExtensions([{
                ...extension.identifier,
                preRelease: includePreRelease,
                hasPreRelease: extension.hasPreReleaseVersion,
            }], {
            compatible: true,
            productVersion,
            queryAllVersions: true,
            targetPlatform,
        }, CancellationToken.None);
        return result[0] ?? null;
    }
    async isExtensionCompatible(extension, includePreRelease, targetPlatform, productVersion = { version: this.productService.version, date: this.productService.date }) {
        return this.isValidVersion({
            id: extension.identifier.id,
            version: extension.version,
            isPreReleaseVersion: extension.properties.isPreReleaseVersion,
            targetPlatform: extension.properties.targetPlatform,
            manifestAsset: extension.assets.manifest,
            engine: extension.properties.engine,
            enabledApiProposals: extension.properties.enabledApiProposals
        }, {
            targetPlatform,
            compatible: true,
            productVersion,
            version: includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */
        }, extension.publisherDisplayName, extension.allTargetPlatforms);
    }
    async isValidVersion(extension, { targetPlatform, compatible, productVersion, version }, publisherDisplayName, allTargetPlatforms) {
        const hasPreRelease = hasPreReleaseForExtension(extension.id, this.productService);
        const excludeVersionRange = getExcludeVersionRangeForExtension(extension.id, this.productService);
        if (extension.isPreReleaseVersion && hasPreRelease === false /* Skip if hasPreRelease is not defined for this extension */) {
            return false;
        }
        if (excludeVersionRange && semver.satisfies(extension.version, excludeVersionRange)) {
            return false;
        }
        // Specific version
        if (isString(version)) {
            if (extension.version !== version) {
                return false;
            }
        }
        // Prerelease or release version kind
        else if (version === 0 /* VersionKind.Release */ || version === 1 /* VersionKind.Prerelease */) {
            if (extension.isPreReleaseVersion !== (version === 1 /* VersionKind.Prerelease */)) {
                return false;
            }
        }
        if (!isTargetPlatformCompatible(extension.targetPlatform, allTargetPlatforms, targetPlatform)) {
            return false;
        }
        if (compatible) {
            if (this.allowedExtensionsService.isAllowed({ id: extension.id, publisherDisplayName, version: extension.version, prerelease: extension.isPreReleaseVersion, targetPlatform: extension.targetPlatform }) !== true) {
                return false;
            }
            if (!this.areApiProposalsCompatible(extension.id, extension.enabledApiProposals)) {
                return false;
            }
            if (!(await this.isEngineValid(extension.id, extension.version, extension.engine, extension.manifestAsset, productVersion))) {
                return false;
            }
        }
        return true;
    }
    areApiProposalsCompatible(extensionId, enabledApiProposals) {
        if (!enabledApiProposals) {
            return true;
        }
        if (!this.extensionsEnabledWithApiProposalVersion.includes(extensionId.toLowerCase())) {
            return true;
        }
        return areApiProposalsCompatible(enabledApiProposals);
    }
    async isEngineValid(extensionId, version, engine, manifestAsset, productVersion) {
        if (!engine) {
            if (!manifestAsset) {
                this.logService.error(`Missing engine and manifest asset for the extension ${extensionId} with version ${version}`);
                return false;
            }
            try {
                this.telemetryService.publicLog2('galleryService:engineFallback', { extension: extensionId, extensionVersion: version });
                const headers = { 'Accept-Encoding': 'gzip' };
                const context = await this.getAsset(extensionId, manifestAsset, AssetType.Manifest, version, { headers });
                const manifest = await asJson(context);
                if (!manifest) {
                    this.logService.error(`Manifest was not found for the extension ${extensionId} with version ${version}`);
                    return false;
                }
                engine = manifest.engines.vscode;
            }
            catch (error) {
                this.logService.error(`Error while getting the engine for the version ${version}.`, getErrorMessage(error));
                return false;
            }
        }
        return isEngineValid(engine, productVersion.version, productVersion.date);
    }
    async query(options, token) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let text = options.text || '';
        const pageSize = options.pageSize ?? 50;
        let query = new Query()
            .withPage(1, pageSize);
        if (text) {
            // Use category filter instead of "category:themes"
            text = text.replace(/\bcategory:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedCategory, category) => {
                query = query.withFilter("Category" /* FilterType.Category */, category || quotedCategory);
                return '';
            });
            // Use tag filter instead of "tag:debuggers"
            text = text.replace(/\btag:("([^"]*)"|([^"]\S*))(\s+|\b|$)/g, (_, quotedTag, tag) => {
                query = query.withFilter("Tag" /* FilterType.Tag */, tag || quotedTag);
                return '';
            });
            // Use featured filter
            text = text.replace(/\bfeatured(\s+|\b|$)/g, () => {
                query = query.withFilter("Featured" /* FilterType.Featured */);
                return '';
            });
            text = text.trim();
            if (text) {
                text = text.length < 200 ? text : text.substring(0, 200);
                query = query.withFilter("SearchText" /* FilterType.SearchText */, text);
            }
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === "NoneOrRelevance" /* SortBy.NoneOrRelevance */)) {
                query = query.withSortBy("NoneOrRelevance" /* SortBy.NoneOrRelevance */);
            }
        }
        else {
            if (extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === "InstallCount" /* SortBy.InstallCount */)) {
                query = query.withSortBy("InstallCount" /* SortBy.InstallCount */);
            }
        }
        if (options.sortBy && extensionGalleryManifest.capabilities.extensionQuery.sorting?.some(c => c.name === options.sortBy)) {
            query = query.withSortBy(options.sortBy);
        }
        if (typeof options.sortOrder === 'number') {
            query = query.withSortOrder(options.sortOrder);
        }
        if (options.source) {
            query = query.withSource(options.source);
        }
        const runQuery = async (query, token) => {
            const { extensions, total } = await this.queryGalleryExtensions(query, { targetPlatform: CURRENT_TARGET_PLATFORM, compatible: false, includePreRelease: !!options.includePreRelease, productVersion: options.productVersion ?? { version: this.productService.version, date: this.productService.date } }, extensionGalleryManifest, token);
            extensions.forEach((e, index) => setTelemetry(e, ((query.pageNumber - 1) * query.pageSize) + index, options.source));
            return { extensions, total };
        };
        const { extensions, total } = await runQuery(query, token);
        const getPage = async (pageIndex, ct) => {
            if (ct.isCancellationRequested) {
                throw new CancellationError();
            }
            const { extensions } = await runQuery(query.withPage(pageIndex + 1), ct);
            return extensions;
        };
        return { firstPage: extensions, total, pageSize: query.pageSize, getPage };
    }
    async queryGalleryExtensions(query, criteria, extensionGalleryManifest, token) {
        if (this.productService.quality !== 'stable'
            && (await this.assignmentService?.getTreatment('useLatestPrereleaseAndStableVersionFlag'))) {
            return this.queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token);
        }
        return this.queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token);
    }
    async queryGalleryExtensionsWithAllVersionsAsFallback(query, criteria, extensionGalleryManifest, token) {
        const flags = query.flags;
        /**
         * If both version flags (IncludeLatestVersionOnly and IncludeVersions) are included, then only include latest versions (IncludeLatestVersionOnly) flag.
         */
        if (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) && query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeVersions" /* Flag.IncludeVersions */));
        }
        /**
         * If version flags (IncludeLatestVersionOnly and IncludeVersions) are not included, default is to query for latest versions (IncludeLatestVersionOnly).
         */
        if (!query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) && !query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            query = query.withFlags(...query.flags, "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        }
        /**
         * If versions criteria exist or every requested extension is for release version and has a pre-release version, then remove latest flags and add all versions flag.
         */
        if (criteria.versions?.length || criteria.isQueryForReleaseVersionFromPreReleaseVersion) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const hasAllVersions = !query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */);
        if (hasAllVersions) {
            const extensions = [];
            for (const rawGalleryExtension of rawGalleryExtensions) {
                const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
                const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
                const includePreRelease = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
                const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                    compatible: criteria.compatible,
                    targetPlatform: criteria.targetPlatform,
                    productVersion: criteria.productVersion,
                    version: criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                        ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */)
                }, allTargetPlatforms);
                if (rawGalleryExtensionVersion) {
                    extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, this.productService, context));
                }
            }
            return { extensions, total };
        }
        const result = [];
        const needAllVersions = new Map();
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
            const includePreRelease = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease;
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({ id: extensionIdentifier.id, publisherDisplayName: rawGalleryExtension.publisher.displayName }) !== true) {
                    continue;
                }
            }
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version: criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                    ?? (includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */)
            }, allTargetPlatforms);
            const extension = rawGalleryExtensionVersion ? toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, this.productService, context) : null;
            if (!extension
                /** Need all versions if the extension is a pre-release version but
                 * 		- the query is to look for a release version or
                 * 		- the extension has no release version
                 * Get all versions to get or check the release version
                */
                || (extension.properties.isPreReleaseVersion && (!includePreRelease || !extension.hasReleaseVersion))
                /**
                 * Need all versions if the extension is a release version with a different target platform than requested and also has a pre-release version
                 * Because, this is a platform specific extension and can have a newer release version supporting this platform.
                 * See https://github.com/microsoft/vscode/issues/139628
                */
                || (!extension.properties.isPreReleaseVersion && extension.properties.targetPlatform !== criteria.targetPlatform && extension.hasPreReleaseVersion)) {
                needAllVersions.set(rawGalleryExtension.extensionId, index);
            }
            else {
                result.push([index, extension]);
            }
        }
        if (needAllVersions.size) {
            const stopWatch = new StopWatch();
            const query = new Query()
                .withFlags(...flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */)
                .withPage(1, needAllVersions.size)
                .withFilter("ExtensionId" /* FilterType.ExtensionId */, ...needAllVersions.keys());
            const { extensions } = await this.queryGalleryExtensions(query, criteria, extensionGalleryManifest, token);
            this.telemetryService.publicLog2('galleryService:additionalQuery', {
                duration: stopWatch.elapsed(),
                count: needAllVersions.size
            });
            for (const extension of extensions) {
                const index = needAllVersions.get(extension.identifier.uuid);
                result.push([index, extension]);
            }
        }
        return { extensions: result.sort((a, b) => a[0] - b[0]).map(([, extension]) => extension), total };
    }
    async queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag(query, criteria, extensionGalleryManifest, token) {
        /**
         * If versions criteria exist, then remove latest flags and add all versions flag.
        */
        if (criteria.versions?.length) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ && flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * If the query does not specify all versions flag, handle latest versions.
         */
        else if (!query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */)) {
            const includeLatest = isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : criteria.includePreRelease.every(({ includePreRelease }) => includePreRelease);
            query = includeLatest ? query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) : query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */), "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */);
        }
        /**
         * If all versions flag is set, remove latest flags.
         */
        if (query.flags.includes("IncludeVersions" /* Flag.IncludeVersions */) && (query.flags.includes("IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */) || query.flags.includes("IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */))) {
            query = query.withFlags(...query.flags.filter(flag => flag !== "IncludeLatestVersionOnly" /* Flag.IncludeLatestVersionOnly */ && flag !== "IncludeLatestPrereleaseAndStableVersionOnly" /* Flag.IncludeLatestPrereleaseAndStableVersionOnly */), "IncludeVersions" /* Flag.IncludeVersions */);
        }
        /**
         * Add necessary extension flags
         */
        query = query.withFlags(...query.flags, "IncludeAssetUri" /* Flag.IncludeAssetUri */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeStatistics" /* Flag.IncludeStatistics */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */);
        const { galleryExtensions: rawGalleryExtensions, total, context } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, token);
        const extensions = [];
        for (let index = 0; index < rawGalleryExtensions.length; index++) {
            const rawGalleryExtension = rawGalleryExtensions[index];
            const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
            const allTargetPlatforms = getAllTargetPlatforms(rawGalleryExtension);
            if (criteria.compatible) {
                // Skip looking for all versions if requested for a web-compatible extension and it is not a web extension.
                if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
                    continue;
                }
                // Skip looking for all versions if the extension is not allowed.
                if (this.allowedExtensionsService.isAllowed({ id: extensionIdentifier.id, publisherDisplayName: rawGalleryExtension.publisher.displayName }) !== true) {
                    continue;
                }
            }
            const version = criteria.versions?.find(extensionIdentifierWithVersion => areSameExtensions(extensionIdentifierWithVersion, extensionIdentifier))?.version
                ?? ((isBoolean(criteria.includePreRelease) ? criteria.includePreRelease : !!criteria.includePreRelease.find(extensionIdentifierWithPreRelease => areSameExtensions(extensionIdentifierWithPreRelease, extensionIdentifier))?.includePreRelease) ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */);
            const rawGalleryExtensionVersion = await this.getRawGalleryExtensionVersion(rawGalleryExtension, {
                compatible: criteria.compatible,
                targetPlatform: criteria.targetPlatform,
                productVersion: criteria.productVersion,
                version
            }, allTargetPlatforms);
            if (rawGalleryExtensionVersion) {
                extensions.push(toExtension(rawGalleryExtension, rawGalleryExtensionVersion, allTargetPlatforms, extensionGalleryManifest, this.productService, context));
            }
        }
        return { extensions, total };
    }
    async getRawGalleryExtensionVersion(rawGalleryExtension, criteria, allTargetPlatforms) {
        const extensionIdentifier = { id: getGalleryExtensionId(rawGalleryExtension.publisher.publisherName, rawGalleryExtension.extensionName), uuid: rawGalleryExtension.extensionId };
        const rawGalleryExtensionVersions = sortExtensionVersions(rawGalleryExtension.versions, criteria.targetPlatform);
        if (criteria.compatible && isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, criteria.targetPlatform)) {
            return null;
        }
        const version = isString(criteria.version) ? criteria.version : undefined;
        for (let index = 0; index < rawGalleryExtensionVersions.length; index++) {
            const rawGalleryExtensionVersion = rawGalleryExtensionVersions[index];
            if (await this.isValidVersion({
                id: extensionIdentifier.id,
                version: rawGalleryExtensionVersion.version,
                isPreReleaseVersion: isPreReleaseVersion(rawGalleryExtensionVersion),
                targetPlatform: getTargetPlatformForExtensionVersion(rawGalleryExtensionVersion),
                engine: getEngine(rawGalleryExtensionVersion),
                manifestAsset: getVersionAsset(rawGalleryExtensionVersion, AssetType.Manifest),
                enabledApiProposals: getEnabledApiProposals(rawGalleryExtensionVersion)
            }, criteria, rawGalleryExtension.publisher.displayName, allTargetPlatforms)) {
                return rawGalleryExtensionVersion;
            }
            if (version && rawGalleryExtensionVersion.version === version) {
                return null;
            }
        }
        if (version || criteria.compatible) {
            return null;
        }
        /**
         * Fallback: Return the latest version
         * This can happen when the extension does not have a release version or does not have a version compatible with the given target platform.
         */
        return rawGalleryExtension.versions[0];
    }
    async queryRawGalleryExtensions(query, extensionGalleryManifest, token) {
        const extensionsQueryApi = getExtensionGalleryManifestResourceUri(extensionGalleryManifest, "ExtensionQueryService" /* ExtensionGalleryResourceType.ExtensionQueryService */);
        if (!extensionsQueryApi) {
            throw new Error('No extension gallery query service configured.');
        }
        query = query
            /* Always exclude non validated extensions */
            .withFlags(...query.flags, "ExcludeNonValidated" /* Flag.ExcludeNonValidated */)
            .withFilter("Target" /* FilterType.Target */, 'Microsoft.VisualStudio.Code');
        const unpublishedFlag = extensionGalleryManifest.capabilities.extensionQuery.flags?.find(f => f.name === "Unpublished" /* Flag.Unpublished */);
        /* Always exclude unpublished extensions */
        if (unpublishedFlag) {
            query = query.withFilter("ExcludeWithFlags" /* FilterType.ExcludeWithFlags */, String(unpublishedFlag.value));
        }
        const data = JSON.stringify({
            filters: [
                {
                    criteria: query.criteria.reduce((criteria, c) => {
                        const criterium = extensionGalleryManifest.capabilities.extensionQuery.filtering?.find(f => f.name === c.filterType);
                        if (criterium) {
                            criteria.push({
                                filterType: criterium.value,
                                value: c.value,
                            });
                        }
                        return criteria;
                    }, []),
                    pageNumber: query.pageNumber,
                    pageSize: query.pageSize,
                    sortBy: extensionGalleryManifest.capabilities.extensionQuery.sorting?.find(s => s.name === query.sortBy)?.value,
                    sortOrder: query.sortOrder,
                }
            ],
            assetTypes: query.assetTypes,
            flags: query.flags.reduce((flags, flag) => {
                const flagValue = extensionGalleryManifest.capabilities.extensionQuery.flags?.find(f => f.name === flag);
                if (flagValue) {
                    flags |= flagValue.value;
                }
                return flags;
            }, 0)
        });
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            'Accept': 'application/json;api-version=3.0-preview.1',
            'Accept-Encoding': 'gzip',
            'Content-Length': String(data.length),
        };
        const stopWatch = new StopWatch();
        let context, errorCode, total = 0;
        try {
            context = await this.requestService.request({
                type: 'POST',
                url: extensionsQueryApi,
                data,
                headers
            }, token);
            if (context.res.statusCode && context.res.statusCode >= 400 && context.res.statusCode < 500) {
                return { galleryExtensions: [], total };
            }
            const result = await asJson(context);
            if (result) {
                const r = result.results[0];
                const galleryExtensions = r.extensions;
                const resultCount = r.resultMetadata && r.resultMetadata.filter(m => m.metadataType === 'ResultCount')[0];
                total = resultCount && resultCount.metadataItems.filter(i => i.name === 'TotalCount')[0].count || 0;
                return {
                    galleryExtensions,
                    total,
                    context: context.res.headers['activityid'] ? {
                        [SEARCH_ACTIVITY_HEADER_NAME]: context.res.headers['activityid']
                    } : {}
                };
            }
            return { galleryExtensions: [], total };
        }
        catch (e) {
            if (isCancellationError(e)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
                throw e;
            }
            else {
                const errorMessage = getErrorMessage(e);
                errorCode = isOfflineError(e)
                    ? "Offline" /* ExtensionGalleryErrorCode.Offline */
                    : errorMessage.startsWith('XHR timeout')
                        ? "Timeout" /* ExtensionGalleryErrorCode.Timeout */
                        : "Failed" /* ExtensionGalleryErrorCode.Failed */;
                throw new ExtensionGalleryError(errorMessage, errorCode);
            }
        }
        finally {
            this.telemetryService.publicLog2('galleryService:query', {
                filterTypes: query.criteria.map(criterium => criterium.filterType),
                flags: query.flags,
                sortBy: query.sortBy,
                sortOrder: String(query.sortOrder),
                pageNumber: String(query.pageNumber),
                source: query.source,
                searchTextLength: query.searchText.length,
                requestBodySize: String(data.length),
                duration: stopWatch.elapsed(),
                success: !!context && isSuccess(context),
                responseBodySize: context?.res.headers['Content-Length'],
                statusCode: context ? String(context.res.statusCode) : undefined,
                errorCode,
                count: String(total),
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    getHeaderValue(headers, name) {
        const headerValue = headers?.[name.toLowerCase()];
        const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
        return value ? new TelemetryTrustedValue(value) : undefined;
    }
    async getLatestRawGalleryExtension(extension, uri, token) {
        let errorCode;
        const stopWatch = new StopWatch();
        let context;
        try {
            const commonHeaders = await this.commonHeadersPromise;
            const headers = {
                ...commonHeaders,
                'Content-Type': 'application/json',
                'Accept': 'application/json;api-version=7.2-preview',
                'Accept-Encoding': 'gzip',
            };
            context = await this.requestService.request({
                type: 'GET',
                url: uri.toString(true),
                headers,
                timeout: REQUEST_TIME_OUT
            }, token);
            if (context.res.statusCode === 404) {
                errorCode = 'NotFound';
                return null;
            }
            if (context.res.statusCode && context.res.statusCode !== 200) {
                errorCode = `GalleryServiceError:` + context.res.statusCode;
                throw new Error('Unexpected HTTP response: ' + context.res.statusCode);
            }
            const result = await asJson(context);
            if (!result) {
                errorCode = 'NoData';
            }
            return result;
        }
        catch (error) {
            if (isCancellationError(error)) {
                errorCode = "Cancelled" /* ExtensionGalleryErrorCode.Cancelled */;
            }
            else if (isOfflineError(error)) {
                errorCode = "Offline" /* ExtensionGalleryErrorCode.Offline */;
            }
            else if (getErrorMessage(error).startsWith('XHR timeout')) {
                errorCode = "Timeout" /* ExtensionGalleryErrorCode.Timeout */;
            }
            else if (!errorCode) {
                errorCode = "Failed" /* ExtensionGalleryErrorCode.Failed */;
            }
            throw error;
        }
        finally {
            this.telemetryService.publicLog2('galleryService:getLatest', {
                extension,
                host: uri.authority,
                duration: stopWatch.elapsed(),
                errorCode,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
        }
    }
    async reportStatistic(publisher, name, version, type) {
        const manifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!manifest) {
            return undefined;
        }
        let url;
        if (isWeb) {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "WebExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.WebExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, { publisher, name, version, statTypeValue: type === "install" /* StatisticType.Install */ ? '1' : '3' });
        }
        else {
            const resource = getExtensionGalleryManifestResourceUri(manifest, "ExtensionStatisticsUriTemplate" /* ExtensionGalleryResourceType.ExtensionStatisticsUri */);
            if (!resource) {
                return;
            }
            url = format2(resource, { publisher, name, version, statTypeName: type });
        }
        const Accept = isWeb ? 'api-version=6.1-preview.1' : '*/*;api-version=4.0-preview.1';
        const commonHeaders = await this.commonHeadersPromise;
        const headers = { ...commonHeaders, Accept };
        try {
            await this.requestService.request({
                type: 'POST',
                url,
                headers
            }, CancellationToken.None);
        }
        catch (error) { /* Ignore */ }
    }
    async download(extension, location, operation) {
        this.logService.trace('ExtensionGalleryService#download', extension.identifier.id);
        const data = getGalleryExtensionTelemetryData(extension);
        const startTime = new Date().getTime();
        const operationParam = operation === 2 /* InstallOperation.Install */ ? 'install' : operation === 3 /* InstallOperation.Update */ ? 'update' : '';
        const downloadAsset = operationParam ? {
            uri: `${extension.assets.download.uri}${URI.parse(extension.assets.download.uri).query ? '&' : '?'}${operationParam}=true`,
            fallbackUri: `${extension.assets.download.fallbackUri}${URI.parse(extension.assets.download.fallbackUri).query ? '&' : '?'}${operationParam}=true`
        } : extension.assets.download;
        const headers = extension.queryContext?.[SEARCH_ACTIVITY_HEADER_NAME] ? { [SEARCH_ACTIVITY_HEADER_NAME]: extension.queryContext[SEARCH_ACTIVITY_HEADER_NAME] } : undefined;
        const context = await this.getAsset(extension.identifier.id, downloadAsset, AssetType.VSIX, extension.version, headers ? { headers } : undefined);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
        /* __GDPR__
            "galleryService:downloadVSIX" : {
                "owner": "sandy081",
                "duration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "${include}": [
                    "${GalleryExtensionTelemetryData}"
                ]
            }
        */
        this.telemetryService.publicLog('galleryService:downloadVSIX', { ...data, duration: new Date().getTime() - startTime });
    }
    async downloadSignatureArchive(extension, location) {
        if (!extension.assets.signature) {
            throw new Error('No signature asset found');
        }
        this.logService.trace('ExtensionGalleryService#downloadSignatureArchive', extension.identifier.id);
        const context = await this.getAsset(extension.identifier.id, extension.assets.signature, AssetType.Signature, extension.version);
        try {
            await this.fileService.writeFile(location, context.stream);
        }
        catch (error) {
            try {
                await this.fileService.del(location);
            }
            catch (e) {
                /* ignore */
                this.logService.warn(`Error while deleting the file ${location.toString()}`, getErrorMessage(e));
            }
            throw new ExtensionGalleryError(getErrorMessage(error), "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */);
        }
    }
    async getReadme(extension, token) {
        if (extension.assets.readme) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.readme, AssetType.Details, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getManifest(extension, token) {
        if (extension.assets.manifest) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.manifest, AssetType.Manifest, extension.version, {}, token);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getCoreTranslation(extension, languageId) {
        const asset = extension.assets.coreTranslations.filter(t => t[0] === languageId.toUpperCase())[0];
        if (asset) {
            const context = await this.getAsset(extension.identifier.id, asset[1], asset[0], extension.version);
            const text = await asTextOrError(context);
            return text ? JSON.parse(text) : null;
        }
        return null;
    }
    async getChangelog(extension, token) {
        if (extension.assets.changelog) {
            const context = await this.getAsset(extension.identifier.id, extension.assets.changelog, AssetType.Changelog, extension.version, {}, token);
            const content = await asTextOrError(context);
            return content || '';
        }
        return '';
    }
    async getAllVersions(extensionIdentifier) {
        return this.getVersions(extensionIdentifier);
    }
    async getAllCompatibleVersions(extensionIdentifier, includePreRelease, targetPlatform) {
        return this.getVersions(extensionIdentifier, { version: includePreRelease ? 2 /* VersionKind.Latest */ : 0 /* VersionKind.Release */, targetPlatform });
    }
    async getVersions(extensionIdentifier, onlyCompatible) {
        const extensionGalleryManifest = await this.extensionGalleryManifestService.getExtensionGalleryManifest();
        if (!extensionGalleryManifest) {
            throw new Error('No extension gallery service configured.');
        }
        let query = new Query()
            .withFlags("IncludeVersions" /* Flag.IncludeVersions */, "IncludeCategoryAndTags" /* Flag.IncludeCategoryAndTags */, "IncludeFiles" /* Flag.IncludeFiles */, "IncludeVersionProperties" /* Flag.IncludeVersionProperties */)
            .withPage(1, 1);
        if (extensionIdentifier.uuid) {
            query = query.withFilter("ExtensionId" /* FilterType.ExtensionId */, extensionIdentifier.uuid);
        }
        else {
            query = query.withFilter("ExtensionName" /* FilterType.ExtensionName */, extensionIdentifier.id);
        }
        const { galleryExtensions } = await this.queryRawGalleryExtensions(query, extensionGalleryManifest, CancellationToken.None);
        if (!galleryExtensions.length) {
            return [];
        }
        const allTargetPlatforms = getAllTargetPlatforms(galleryExtensions[0]);
        if (onlyCompatible && isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, onlyCompatible.targetPlatform)) {
            return [];
        }
        const versions = [];
        const productVersion = { version: this.productService.version, date: this.productService.date };
        await Promise.all(galleryExtensions[0].versions.map(async (version) => {
            try {
                if ((await this.isValidVersion({
                    id: extensionIdentifier.id,
                    version: version.version,
                    isPreReleaseVersion: isPreReleaseVersion(version),
                    targetPlatform: getTargetPlatformForExtensionVersion(version),
                    engine: getEngine(version),
                    manifestAsset: getVersionAsset(version, AssetType.Manifest),
                    enabledApiProposals: getEnabledApiProposals(version)
                }, {
                    compatible: !!onlyCompatible,
                    productVersion,
                    targetPlatform: onlyCompatible?.targetPlatform ?? CURRENT_TARGET_PLATFORM,
                    version: onlyCompatible?.version ?? version.version
                }, galleryExtensions[0].publisher.displayName, allTargetPlatforms))) {
                    versions.push(version);
                }
            }
            catch (error) { /* Ignore error and skip version */ }
        }));
        const result = [];
        const seen = new Set();
        for (const version of sortExtensionVersions(versions, onlyCompatible?.targetPlatform ?? CURRENT_TARGET_PLATFORM)) {
            if (!seen.has(version.version)) {
                seen.add(version.version);
                result.push({ version: version.version, date: version.lastUpdated, isPreReleaseVersion: isPreReleaseVersion(version) });
            }
        }
        return result;
    }
    async getAsset(extension, asset, assetType, extensionVersion, options = {}, token = CancellationToken.None) {
        const commonHeaders = await this.commonHeadersPromise;
        const baseOptions = { type: 'GET' };
        const headers = { ...commonHeaders, ...(options.headers || {}) };
        options = { ...options, ...baseOptions, headers };
        const url = asset.uri;
        const fallbackUrl = asset.fallbackUri;
        const firstOptions = { ...options, url, timeout: REQUEST_TIME_OUT };
        let context;
        try {
            context = await this.requestService.request(firstOptions, token);
            if (context.res.statusCode === 200) {
                return context;
            }
            const message = await asTextOrError(context);
            throw new Error(`Expected 200, got back ${context.res.statusCode} instead.\n\n${message}`);
        }
        catch (err) {
            if (isCancellationError(err)) {
                throw err;
            }
            const message = getErrorMessage(err);
            this.telemetryService.publicLog2('galleryService:cdnFallback', {
                extension,
                assetType,
                message,
                extensionVersion,
                server: this.getHeaderValue(context?.res.headers, SERVER_HEADER_NAME),
                activityId: this.getHeaderValue(context?.res.headers, ACTIVITY_HEADER_NAME),
                endToEndId: this.getHeaderValue(context?.res.headers, END_END_ID_HEADER_NAME),
            });
            const fallbackOptions = { ...options, url: fallbackUrl, timeout: REQUEST_TIME_OUT };
            return this.requestService.request(fallbackOptions, token);
        }
    }
    async getExtensionsControlManifest() {
        if (!this.isEnabled()) {
            throw new Error('No extension gallery service configured.');
        }
        if (!this.extensionsControlUrl) {
            return { malicious: [], deprecated: {}, search: [], autoUpdate: {} };
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: this.extensionsControlUrl,
            timeout: REQUEST_TIME_OUT
        }, CancellationToken.None);
        if (context.res.statusCode !== 200) {
            throw new Error('Could not get extensions report.');
        }
        const result = await asJson(context);
        const malicious = [];
        const deprecated = {};
        const search = [];
        const autoUpdate = result?.autoUpdate ?? {};
        if (result) {
            for (const id of result.malicious) {
                if (!isString(id)) {
                    continue;
                }
                const publisherOrExtension = EXTENSION_IDENTIFIER_REGEX.test(id) ? { id } : id;
                malicious.push({ extensionOrPublisher: publisherOrExtension, learnMoreLink: result.learnMoreLinks?.[id] });
            }
            if (result.migrateToPreRelease) {
                for (const [unsupportedPreReleaseExtensionId, preReleaseExtensionInfo] of Object.entries(result.migrateToPreRelease)) {
                    if (!preReleaseExtensionInfo.engine || isEngineValid(preReleaseExtensionInfo.engine, this.productService.version, this.productService.date)) {
                        deprecated[unsupportedPreReleaseExtensionId.toLowerCase()] = {
                            disallowInstall: true,
                            extension: {
                                id: preReleaseExtensionInfo.id,
                                displayName: preReleaseExtensionInfo.displayName,
                                autoMigrate: { storage: !!preReleaseExtensionInfo.migrateStorage },
                                preRelease: true
                            }
                        };
                    }
                }
            }
            if (result.deprecated) {
                for (const [deprecatedExtensionId, deprecationInfo] of Object.entries(result.deprecated)) {
                    if (deprecationInfo) {
                        deprecated[deprecatedExtensionId.toLowerCase()] = isBoolean(deprecationInfo) ? {} : deprecationInfo;
                    }
                }
            }
            if (result.search) {
                for (const s of result.search) {
                    search.push(s);
                }
            }
        }
        return { malicious, deprecated, search, autoUpdate };
    }
};
AbstractExtensionGalleryService = __decorate([
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, IEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, IFileService),
    __param(7, IProductService),
    __param(8, IConfigurationService),
    __param(9, IAllowedExtensionsService),
    __param(10, IExtensionGalleryManifestService)
], AbstractExtensionGalleryService);
export { AbstractExtensionGalleryService };
let ExtensionGalleryService = class ExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(storageService, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryService = __decorate([
    __param(0, IStorageService),
    __param(1, IRequestService),
    __param(2, ILogService),
    __param(3, IEnvironmentService),
    __param(4, ITelemetryService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IConfigurationService),
    __param(8, IAllowedExtensionsService),
    __param(9, IExtensionGalleryManifestService)
], ExtensionGalleryService);
export { ExtensionGalleryService };
let ExtensionGalleryServiceWithNoStorageService = class ExtensionGalleryServiceWithNoStorageService extends AbstractExtensionGalleryService {
    constructor(requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(undefined, undefined, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
ExtensionGalleryServiceWithNoStorageService = __decorate([
    __param(0, IRequestService),
    __param(1, ILogService),
    __param(2, IEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IFileService),
    __param(5, IProductService),
    __param(6, IConfigurationService),
    __param(7, IAllowedExtensionsService),
    __param(8, IExtensionGalleryManifestService)
], ExtensionGalleryServiceWithNoStorageService);
export { ExtensionGalleryServiceWithNoStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkdhbGxlcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV6RyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQThDLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBNk4sb0NBQW9DLEVBQUUsMEJBQTBCLEVBQTBDLGdCQUFnQixFQUFFLGlCQUFpQixFQUFxRSxxQkFBcUIsRUFBOEMseUJBQXlCLEVBQUUsMEJBQTBCLEVBQThDLE1BQU0sMEJBQTBC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