/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, DisposableMap, DisposableStore, IDisposable } from '../../../../../base/common/lifecycle.js';
import { Throttler } from '../../../../../base/common/async.js';
import { URI } from '../../../../../base/common/uri.js';
import { ConfigurationTarget } from '../../../../../platform/configuration/common/configuration.js';
import { StorageScope } from '../../../../../platform/storage/common/storage.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { McpServerDefinition, McpServerTransportType, IMcpWorkbenchService, IMcpConfigPath, IWorkbenchMcpServer } from '../mcpTypes.js';
import { IMcpDiscovery } from './mcpDiscovery.js';
import { mcpConfigurationSection } from '../mcpConfiguration.js';
import { posix as pathPosix, win32 as pathWin32, sep as pathSep } from '../../../../../base/common/path.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { getMcpServerMapping } from '../mcpConfigFileUtils.js';
import { Location } from '../../../../../editor/common/languages.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ILocalMcpServer } from '../../../../../platform/mcp/common/mcpManagement.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { isWindows, OperatingSystem } from '../../../../../base/common/platform.js';

export class InstalledMcpServersDiscovery extends Disposable implements IMcpDiscovery {

	private readonly collectionDisposables = this._register(new DisposableMap<string, IDisposable>());

	constructor(
		@IMcpWorkbenchService private readonly mcpWorkbenchService: IMcpWorkbenchService,
		@IMcpRegistry private readonly mcpRegistry: IMcpRegistry,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@ITextModelService private readonly textModelService: ITextModelService,
	) {
		super();
	}

	public start(): void {
		const throttler = this._register(new Throttler());
		this._register(this.mcpWorkbenchService.onChange(() => throttler.queue(() => this.sync())));
		this.sync();
	}

	private async getServerIdMapping(resource: URI, pathToServers: string[]): Promise<Map<string, Location>> {
		const store = new DisposableStore();
		try {
			const ref = await this.textModelService.createModelReference(resource);
			store.add(ref);
			const serverIdMapping = getMcpServerMapping({ model: ref.object.textEditorModel, pathToServers });
			return serverIdMapping;
		} catch {
			return new Map();
		} finally {
			store.dispose();
		}
	}

	private async sync(): Promise<void> {
		try {
			const remoteEnv = await this.remoteAgentService.getEnvironment();
			const collections = new Map<string, [IMcpConfigPath | undefined, McpServerDefinition[], IWorkbenchMcpServer]>();
			const mcpConfigPathInfos = new ResourceMap<Promise<IMcpConfigPath & { locations: Map<string, Location> } | undefined>>();
			for (const server of this.mcpWorkbenchService.local) {
				if (!server.local) {
					continue;
				}

				let mcpConfigPathPromise = mcpConfigPathInfos.get(server.local.mcpResource);
				if (!mcpConfigPathPromise) {
					mcpConfigPathPromise = (async (local: ILocalMcpServer) => {
						const mcpConfigPath = this.mcpWorkbenchService.getMcpConfigPath(local);
						const locations = mcpConfigPath?.uri ? await this.getServerIdMapping(mcpConfigPath?.uri, mcpConfigPath.section ? [...mcpConfigPath.section, 'servers'] : ['servers']) : new Map();
						return mcpConfigPath ? { ...mcpConfigPath, locations } : undefined;
					})(server.local);
					mcpConfigPathInfos.set(server.local.mcpResource, mcpConfigPathPromise);
				}

				const config = server.local.config;
				const mcpConfigPath = await mcpConfigPathPromise;
				const collectionId = `mcp.config.${mcpConfigPath ? mcpConfigPath.id : 'unknown'}`;

				let definitions = collections.get(collectionId);
				if (!definitions) {
					definitions = [mcpConfigPath, [], server];
					collections.set(collectionId, definitions);
				}

				const { isAbsolute, join, sep } = mcpConfigPath?.remoteAuthority && remoteEnv
					? (remoteEnv.os === OperatingSystem.Windows ? pathWin32 : pathPosix)
					: (isWindows ? pathWin32 : pathPosix);
				const fsPathForRemote = (uri: URI) => {
					const fsPathLocal = uri.fsPath;
					return fsPathLocal.replaceAll(pathSep, sep);
				};

				definitions[1].push({
					id: `${collectionId}.${server.local.name}`,
					label: server.local.name,
					launch: config.type === 'http' ? {
						type: McpServerTransportType.HTTP,
						uri: URI.parse(config.url),
						headers: Object.entries(config.headers || {}),
					} : {
						type: McpServerTransportType.Stdio,
						command: config.command,
						args: config.args || [],
						env: config.env || {},
						envFile: config.envFile,
						cwd: config.cwd
							// if the cwd is defined in a workspace folder but not absolute (and not
							// a variable or tilde-expansion) then resolve it in the workspace folder
							// if the cwd is defined in a workspace folder but not absolute (and not
							// a variable or tilde-expansion) then resolve it in the workspace folder
							? (!isAbsolute(config.cwd) && !config.cwd.startsWith('~') && !config.cwd.startsWith('${') && mcpConfigPath?.workspaceFolder
								? join(fsPathForRemote(mcpConfigPath.workspaceFolder.uri), config.cwd)
								: config.cwd)
							: mcpConfigPath?.workspaceFolder
								? fsPathForRemote(mcpConfigPath.workspaceFolder.uri)
								: undefined,
					},
					roots: mcpConfigPath?.workspaceFolder ? [mcpConfigPath.workspaceFolder.uri] : undefined,
					variableReplacement: {
						folder: mcpConfigPath?.workspaceFolder,
						section: mcpConfigurationSection,
						target: mcpConfigPath?.target ?? ConfigurationTarget.USER,
					},
					devMode: config.dev,
					presentation: {
						order: mcpConfigPath?.order,
						origin: mcpConfigPath?.locations.get(server.local.name)
					}
				});
			}

			for (const [id, [mcpConfigPath, serverDefinitions]] of collections) {
				this.collectionDisposables.deleteAndDispose(id);
				this.collectionDisposables.set(id, this.mcpRegistry.registerCollection({
					id,
					label: mcpConfigPath?.label ?? '',
					presentation: {
						order: serverDefinitions[0]?.presentation?.order,
						origin: mcpConfigPath?.uri,
					},
					remoteAuthority: mcpConfigPath?.remoteAuthority ?? null,
					serverDefinitions: observableValue(this, serverDefinitions),
					isTrustedByDefault: true,
					configTarget: mcpConfigPath?.target ?? ConfigurationTarget.USER,
					scope: mcpConfigPath?.scope ?? StorageScope.PROFILE,
				}));
			}
			for (const [id] of this.collectionDisposables) {
				if (!collections.has(id)) {
					this.collectionDisposables.deleteAndDispose(id);
				}
			}

		} catch (error) {
			this.collectionDisposables.clearAndDisposeAll();
		}
	}
}
