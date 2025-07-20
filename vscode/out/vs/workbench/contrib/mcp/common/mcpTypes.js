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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { decodeHex, encodeHex, VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { MCP } from './modelContextProtocol.js';
export const extensionMcpCollectionPrefix = 'ext.';
export function extensionPrefixedIdentifier(identifier, id) {
    return ExtensionIdentifier.toKey(identifier) + '/' + id;
}
export var McpCollectionSortOrder;
(function (McpCollectionSortOrder) {
    McpCollectionSortOrder[McpCollectionSortOrder["WorkspaceFolder"] = 0] = "WorkspaceFolder";
    McpCollectionSortOrder[McpCollectionSortOrder["Workspace"] = 100] = "Workspace";
    McpCollectionSortOrder[McpCollectionSortOrder["User"] = 200] = "User";
    McpCollectionSortOrder[McpCollectionSortOrder["Extension"] = 300] = "Extension";
    McpCollectionSortOrder[McpCollectionSortOrder["Filesystem"] = 400] = "Filesystem";
    McpCollectionSortOrder[McpCollectionSortOrder["RemoteBoost"] = -50] = "RemoteBoost";
})(McpCollectionSortOrder || (McpCollectionSortOrder = {}));
export var McpCollectionDefinition;
(function (McpCollectionDefinition) {
    function equals(a, b) {
        return a.id === b.id
            && a.remoteAuthority === b.remoteAuthority
            && a.label === b.label
            && a.isTrustedByDefault === b.isTrustedByDefault;
    }
    McpCollectionDefinition.equals = equals;
})(McpCollectionDefinition || (McpCollectionDefinition = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinition.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            id: def.id,
            label: def.label,
            cacheNonce: def.cacheNonce,
            launch: McpServerLaunch.fromSerialized(def.launch),
            variableReplacement: def.variableReplacement ? McpServerDefinitionVariableReplacement.fromSerialized(def.variableReplacement) : undefined,
        };
    }
    McpServerDefinition.fromSerialized = fromSerialized;
    function equals(a, b) {
        return a.id === b.id
            && a.label === b.label
            && arraysEqual(a.roots, b.roots, (a, b) => a.toString() === b.toString())
            && objectsEqual(a.launch, b.launch)
            && objectsEqual(a.presentation, b.presentation)
            && objectsEqual(a.variableReplacement, b.variableReplacement)
            && objectsEqual(a.devMode, b.devMode);
    }
    McpServerDefinition.equals = equals;
})(McpServerDefinition || (McpServerDefinition = {}));
export var McpServerDefinitionVariableReplacement;
(function (McpServerDefinitionVariableReplacement) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinitionVariableReplacement.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            section: def.section,
            folder: def.folder ? { ...def.folder, uri: URI.revive(def.folder.uri) } : undefined,
            target: def.target,
        };
    }
    McpServerDefinitionVariableReplacement.fromSerialized = fromSerialized;
})(McpServerDefinitionVariableReplacement || (McpServerDefinitionVariableReplacement = {}));
export var LazyCollectionState;
(function (LazyCollectionState) {
    LazyCollectionState[LazyCollectionState["HasUnknown"] = 0] = "HasUnknown";
    LazyCollectionState[LazyCollectionState["LoadingUnknown"] = 1] = "LoadingUnknown";
    LazyCollectionState[LazyCollectionState["AllKnown"] = 2] = "AllKnown";
})(LazyCollectionState || (LazyCollectionState = {}));
export const IMcpService = createDecorator('IMcpService');
export const isMcpResourceTemplate = (obj) => {
    return obj.template !== undefined;
};
export const isMcpResource = (obj) => {
    return obj.mcpUri !== undefined;
};
export var McpServerCacheState;
(function (McpServerCacheState) {
    /** Tools have not been read before */
    McpServerCacheState[McpServerCacheState["Unknown"] = 0] = "Unknown";
    /** Tools were read from the cache */
    McpServerCacheState[McpServerCacheState["Cached"] = 1] = "Cached";
    /** Tools were read from the cache or live, but they may be outdated. */
    McpServerCacheState[McpServerCacheState["Outdated"] = 2] = "Outdated";
    /** Tools are refreshing for the first time */
    McpServerCacheState[McpServerCacheState["RefreshingFromUnknown"] = 3] = "RefreshingFromUnknown";
    /** Tools are refreshing and the current tools are cached */
    McpServerCacheState[McpServerCacheState["RefreshingFromCached"] = 4] = "RefreshingFromCached";
    /** Tool state is live, server is connected */
    McpServerCacheState[McpServerCacheState["Live"] = 5] = "Live";
})(McpServerCacheState || (McpServerCacheState = {}));
export const mcpPromptReplaceSpecialChars = (s) => s.replace(/[^a-z0-9_.-]/gi, '_');
export const mcpPromptPrefix = (definition) => `/mcp.` + mcpPromptReplaceSpecialChars(definition.label);
export var McpServerTransportType;
(function (McpServerTransportType) {
    /** A command-line MCP server communicating over standard in/out */
    McpServerTransportType[McpServerTransportType["Stdio"] = 1] = "Stdio";
    /** An MCP server that uses Server-Sent Events */
    McpServerTransportType[McpServerTransportType["HTTP"] = 2] = "HTTP";
})(McpServerTransportType || (McpServerTransportType = {}));
export var McpServerLaunch;
(function (McpServerLaunch) {
    function toSerialized(launch) {
        return launch;
    }
    McpServerLaunch.toSerialized = toSerialized;
    function fromSerialized(launch) {
        switch (launch.type) {
            case 2 /* McpServerTransportType.HTTP */:
                return { type: launch.type, uri: URI.revive(launch.uri), headers: launch.headers };
            case 1 /* McpServerTransportType.Stdio */:
                return {
                    type: launch.type,
                    cwd: launch.cwd,
                    command: launch.command,
                    args: launch.args,
                    env: launch.env,
                    envFile: launch.envFile,
                };
        }
    }
    McpServerLaunch.fromSerialized = fromSerialized;
})(McpServerLaunch || (McpServerLaunch = {}));
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export var McpConnectionState;
(function (McpConnectionState) {
    let Kind;
    (function (Kind) {
        Kind[Kind["Stopped"] = 0] = "Stopped";
        Kind[Kind["Starting"] = 1] = "Starting";
        Kind[Kind["Running"] = 2] = "Running";
        Kind[Kind["Error"] = 3] = "Error";
    })(Kind = McpConnectionState.Kind || (McpConnectionState.Kind = {}));
    McpConnectionState.toString = (s) => {
        switch (s.state) {
            case 0 /* Kind.Stopped */:
                return localize('mcpstate.stopped', 'Stopped');
            case 1 /* Kind.Starting */:
                return localize('mcpstate.starting', 'Starting');
            case 2 /* Kind.Running */:
                return localize('mcpstate.running', 'Running');
            case 3 /* Kind.Error */:
                return localize('mcpstate.error', 'Error {0}', s.message);
            default:
                assertNever(s);
        }
    };
    McpConnectionState.toKindString = (s) => {
        switch (s) {
            case 0 /* Kind.Stopped */:
                return 'stopped';
            case 1 /* Kind.Starting */:
                return 'starting';
            case 2 /* Kind.Running */:
                return 'running';
            case 3 /* Kind.Error */:
                return 'error';
            default:
                assertNever(s);
        }
    };
    /** Returns if the MCP state is one where starting a new server is valid */
    McpConnectionState.canBeStarted = (s) => s === 3 /* Kind.Error */ || s === 0 /* Kind.Stopped */;
    /** Gets whether the state is a running state. */
    McpConnectionState.isRunning = (s) => !McpConnectionState.canBeStarted(s.state);
})(McpConnectionState || (McpConnectionState = {}));
export class MpcResponseError extends Error {
    constructor(message, code, data) {
        super(`MPC ${code}: ${message}`);
        this.code = code;
        this.data = data;
    }
}
export class McpConnectionFailedError extends Error {
}
export var McpServerInstallState;
(function (McpServerInstallState) {
    McpServerInstallState[McpServerInstallState["Installing"] = 0] = "Installing";
    McpServerInstallState[McpServerInstallState["Installed"] = 1] = "Installed";
    McpServerInstallState[McpServerInstallState["Uninstalling"] = 2] = "Uninstalling";
    McpServerInstallState[McpServerInstallState["Uninstalled"] = 3] = "Uninstalled";
})(McpServerInstallState || (McpServerInstallState = {}));
export var McpServerEditorTab;
(function (McpServerEditorTab) {
    McpServerEditorTab["Readme"] = "readme";
    McpServerEditorTab["Manifest"] = "manifest";
    McpServerEditorTab["Configuration"] = "configuration";
})(McpServerEditorTab || (McpServerEditorTab = {}));
export const IMcpWorkbenchService = createDecorator('IMcpWorkbenchService');
let McpServerContainers = class McpServerContainers extends Disposable {
    constructor(containers, mcpWorkbenchService) {
        super();
        this.containers = containers;
        this._register(mcpWorkbenchService.onChange(this.update, this));
    }
    set mcpServer(extension) {
        this.containers.forEach(c => c.mcpServer = extension);
    }
    update(server) {
        for (const container of this.containers) {
            if (server && container.mcpServer) {
                if (server.name === container.mcpServer.name) {
                    container.mcpServer = server;
                }
            }
            else {
                container.update();
            }
        }
    }
};
McpServerContainers = __decorate([
    __param(1, IMcpWorkbenchService)
], McpServerContainers);
export { McpServerContainers };
export const McpServersGalleryEnabledContext = new RawContextKey('mcpServersGalleryEnabled', false);
export const HasInstalledMcpServersContext = new RawContextKey('hasInstalledMcpServers', true);
export const InstalledMcpServersViewId = 'workbench.views.mcp.installed';
export const mcpServerIcon = registerIcon('mcp-server', Codicon.mcp, localize('mcpServer', 'Icon used for the MCP server.'));
export var McpResourceURI;
(function (McpResourceURI) {
    McpResourceURI.scheme = 'mcp-resource';
    // Random placeholder for empty authorities, otherwise they're represente as
    // `scheme//path/here` in the URI which would get normalized to `scheme/path/here`.
    const emptyAuthorityPlaceholder = 'dylo78gyp'; // chosen by a fair dice roll. Guaranteed to be random.
    function fromServer(def, resourceURI) {
        if (typeof resourceURI === 'string') {
            resourceURI = URI.parse(resourceURI);
        }
        return resourceURI.with({
            scheme: McpResourceURI.scheme,
            authority: encodeHex(VSBuffer.fromString(def.id)),
            path: ['', resourceURI.scheme, resourceURI.authority || emptyAuthorityPlaceholder].join('/') + resourceURI.path,
        });
    }
    McpResourceURI.fromServer = fromServer;
    function toServer(uri) {
        if (typeof uri === 'string') {
            uri = URI.parse(uri);
        }
        if (uri.scheme !== McpResourceURI.scheme) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const parts = uri.path.split('/');
        if (parts.length < 3) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const [, serverScheme, authority, ...path] = parts;
        // URI cannot correctly stringify empty authorities (#250905) so we use URL instead to construct
        const url = new URL(`${serverScheme}://${authority.toLowerCase() === emptyAuthorityPlaceholder ? '' : authority}`);
        url.pathname = path.length ? ('/' + path.join('/')) : '';
        url.search = uri.query;
        url.hash = uri.fragment;
        return {
            definitionId: decodeHex(uri.authority).toString(),
            resourceURL: url,
        };
    }
    McpResourceURI.toServer = toServer;
})(McpResourceURI || (McpResourceURI = {}));
/** Warning: this enum is cached in `mcpServer.ts` and all changes MUST only be additive. */
export var McpCapability;
(function (McpCapability) {
    McpCapability[McpCapability["Logging"] = 1] = "Logging";
    McpCapability[McpCapability["Completions"] = 2] = "Completions";
    McpCapability[McpCapability["Prompts"] = 4] = "Prompts";
    McpCapability[McpCapability["PromptsListChanged"] = 8] = "PromptsListChanged";
    McpCapability[McpCapability["Resources"] = 16] = "Resources";
    McpCapability[McpCapability["ResourcesSubscribe"] = 32] = "ResourcesSubscribe";
    McpCapability[McpCapability["ResourcesListChanged"] = 64] = "ResourcesListChanged";
    McpCapability[McpCapability["Tools"] = 128] = "Tools";
    McpCapability[McpCapability["ToolsListChanged"] = 256] = "ToolsListChanged";
})(McpCapability || (McpCapability = {}));
export const IMcpSamplingService = createDecorator('IMcpServerSampling');
export class McpError extends Error {
    static methodNotFound(method) {
        return new McpError(MCP.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
    static notAllowed() {
        return new McpError(-32000, 'The user has denied permission to call this method.');
    }
    static unknown(e) {
        const mcpError = new McpError(MCP.INTERNAL_ERROR, `Unknown error: ${e.stack}`);
        mcpError.cause = e;
        return mcpError;
    }
    constructor(code, message, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}
export var McpToolName;
(function (McpToolName) {
    McpToolName["Prefix"] = "mcp_";
    McpToolName[McpToolName["MaxPrefixLen"] = 18] = "MaxPrefixLen";
    McpToolName[McpToolName["MaxLength"] = 64] = "MaxLength";
})(McpToolName || (McpToolName = {}));
export const IMcpElicitationService = createDecorator('IMcpElicitationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBTWpGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUdoRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUM7QUFFbkQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFVBQStCLEVBQUUs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