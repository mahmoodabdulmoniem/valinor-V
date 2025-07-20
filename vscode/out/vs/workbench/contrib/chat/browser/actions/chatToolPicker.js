/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { diffSets } from '../../../../../base/common/collections.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IMcpRegistry } from '../../../mcp/common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../../../mcp/common/mcpTypes.js';
import { ILanguageModelToolsService, ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
import { ConfigureToolSets } from '../tools/toolSetsContribution.js';
var BucketOrdinal;
(function (BucketOrdinal) {
    BucketOrdinal[BucketOrdinal["User"] = 0] = "User";
    BucketOrdinal[BucketOrdinal["BuiltIn"] = 1] = "BuiltIn";
    BucketOrdinal[BucketOrdinal["Mcp"] = 2] = "Mcp";
    BucketOrdinal[BucketOrdinal["Extension"] = 3] = "Extension";
})(BucketOrdinal || (BucketOrdinal = {}));
function isBucketPick(obj) {
    return Boolean(obj.children);
}
function isToolSetPick(obj) {
    return Boolean(obj.toolset);
}
function isToolPick(obj) {
    return Boolean(obj.tool);
}
function isCallbackPick(obj) {
    return Boolean(obj.run);
}
function isActionableButton(obj) {
    return typeof obj.action === 'function';
}
export async function showToolsPicker(accessor, placeHolder, description, toolsEntries, onUpdate) {
    const quickPickService = accessor.get(IQuickInputService);
    const mcpService = accessor.get(IMcpService);
    const mcpRegistry = accessor.get(IMcpRegistry);
    const commandService = accessor.get(ICommandService);
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    const editorService = accessor.get(IEditorService);
    const mcpWorkbenchService = accessor.get(IMcpWorkbenchService);
    const toolsService = accessor.get(ILanguageModelToolsService);
    const mcpServerByTool = new Map();
    for (const server of mcpService.servers.get()) {
        for (const tool of server.tools.get()) {
            mcpServerByTool.set(tool.id, server);
        }
    }
    const builtinBucket = {
        type: 'item',
        children: [],
        label: localize('defaultBucketLabel', "Built-In"),
        ordinal: 1 /* BucketOrdinal.BuiltIn */,
        picked: false,
    };
    const userBucket = {
        type: 'item',
        children: [],
        label: localize('userBucket', "User Defined Tool Sets"),
        ordinal: 0 /* BucketOrdinal.User */,
        alwaysShow: true,
        picked: false,
    };
    const addMcpPick = { type: 'item', label: localize('addServer', "Add MCP Server..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */) };
    const configureToolSetsPick = { type: 'item', label: localize('configToolSet', "Configure Tool Sets..."), iconClass: ThemeIcon.asClassName(Codicon.gear), pickable: false, run: () => commandService.executeCommand(ConfigureToolSets.ID) };
    const addExpPick = { type: 'item', label: localize('addExtension', "Install Extension..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => extensionsWorkbenchService.openSearch('@tag:language-model-tools') };
    const addPick = {
        type: 'item', label: localize('addAny', "Add More Tools..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: async () => {
            const pick = await quickPickService.pick([addMcpPick, addExpPick], {
                canPickMany: false,
                placeHolder: localize('noTools', "Add tools to chat")
            });
            pick?.run();
        }
    };
    const toolBuckets = new Map();
    if (!toolsEntries) {
        const defaultEntries = new Map();
        for (const tool of toolsService.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                defaultEntries.set(tool, false);
            }
        }
        for (const toolSet of toolsService.toolSets.get()) {
            defaultEntries.set(toolSet, false);
        }
        toolsEntries = defaultEntries;
    }
    for (const [toolSetOrTool, picked] of toolsEntries) {
        let bucket;
        const buttons = [];
        if (toolSetOrTool.source.type === 'mcp') {
            const key = ToolDataSource.toKey(toolSetOrTool.source);
            const { definitionId } = toolSetOrTool.source;
            const mcpServer = mcpService.servers.get().find(candidate => candidate.definition.id === definitionId);
            if (!mcpServer) {
                continue;
            }
            const buttons = [];
            bucket = toolBuckets.get(key) ?? {
                type: 'item',
                label: localize('mcplabel', "MCP Server: {0}", toolSetOrTool.source.label),
                ordinal: 2 /* BucketOrdinal.Mcp */,
                picked: false,
                alwaysShow: true,
                children: [],
                buttons
            };
            toolBuckets.set(key, bucket);
            const collection = mcpRegistry.collections.get().find(c => c.id === mcpServer.collection.id);
            if (collection?.source) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                    action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                });
            }
            else if (collection?.presentation?.origin) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                    action: () => editorService.openEditor({
                        resource: collection.presentation.origin,
                    })
                });
            }
            if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.warning),
                    tooltip: localize('mcpShowOutput', "Show Output"),
                    action: () => mcpServer.showOutput(),
                });
            }
        }
        else if (toolSetOrTool.source.type === 'extension') {
            const key = ToolDataSource.toKey(toolSetOrTool.source);
            bucket = toolBuckets.get(key) ?? {
                type: 'item',
                label: localize('ext', 'Extension: {0}', toolSetOrTool.source.label),
                ordinal: 3 /* BucketOrdinal.Extension */,
                picked: false,
                alwaysShow: true,
                children: []
            };
            toolBuckets.set(key, bucket);
        }
        else if (toolSetOrTool.source.type === 'internal') {
            bucket = builtinBucket;
        }
        else if (toolSetOrTool.source.type === 'user') {
            bucket = userBucket;
            buttons.push({
                iconClass: ThemeIcon.asClassName(Codicon.edit),
                tooltip: localize('editUserBucket', "Edit Tool Set"),
                action: () => {
                    assertType(toolSetOrTool.source.type === 'user');
                    editorService.openEditor({ resource: toolSetOrTool.source.file });
                }
            });
        }
        else {
            assertNever(toolSetOrTool.source);
        }
        if (toolSetOrTool instanceof ToolSet) {
            if (toolSetOrTool.source.type !== 'mcp') { // don't show the MCP toolset
                bucket.children.push({
                    parent: bucket,
                    type: 'item',
                    picked,
                    toolset: toolSetOrTool,
                    label: toolSetOrTool.referenceName,
                    description: toolSetOrTool.description,
                    indented: true,
                    buttons
                });
            }
            else {
                // stash the MCP toolset into the bucket item
                bucket.toolset = toolSetOrTool;
                bucket.picked = picked;
            }
        }
        else if (toolSetOrTool.canBeReferencedInPrompt) {
            bucket.children.push({
                parent: bucket,
                type: 'item',
                picked,
                tool: toolSetOrTool,
                label: toolSetOrTool.toolReferenceName ?? toolSetOrTool.displayName,
                description: toolSetOrTool.userDescription ?? toolSetOrTool.modelDescription,
                indented: true,
            });
        }
    }
    for (const bucket of [builtinBucket, userBucket]) {
        if (bucket.children.length > 0) {
            toolBuckets.set(generateUuid(), bucket);
        }
    }
    // set the checkmarks in the UI:
    // bucket is checked if at least one of the children is checked
    // tool is checked if the bucket is checked or the tool itself is checked
    for (const bucket of toolBuckets.values()) {
        if (bucket.picked) {
            // check all children if the bucket is checked
            for (const child of bucket.children) {
                child.picked = true;
            }
        }
        else {
            // check the bucket if one of the children is checked
            bucket.picked = bucket.children.some(child => child.picked);
        }
    }
    const store = new DisposableStore();
    const picks = [];
    for (const bucket of Array.from(toolBuckets.values()).sort((a, b) => a.ordinal - b.ordinal)) {
        picks.push({
            type: 'separator',
            label: bucket.status
        });
        picks.push(bucket);
        picks.push(...bucket.children.sort((a, b) => a.label.localeCompare(b.label)));
    }
    const picker = store.add(quickPickService.createQuickPick({ useSeparators: true }));
    picker.placeholder = placeHolder;
    picker.ignoreFocusOut = true;
    picker.description = description;
    picker.canSelectMany = true;
    picker.keepScrollPosition = true;
    picker.sortByLabel = false;
    picker.matchOnDescription = true;
    if (picks.length === 0) {
        picker.placeholder = localize('noTools', "Add tools to chat");
        picker.canSelectMany = false;
        picks.push(addMcpPick, addExpPick);
    }
    else {
        picks.push({ type: 'separator' }, configureToolSetsPick, addPick);
    }
    let lastSelectedItems = new Set();
    let ignoreEvent = false;
    const result = new Map();
    const _update = () => {
        ignoreEvent = true;
        try {
            const items = picks.filter((p) => p.type === 'item' && Boolean(p.picked));
            lastSelectedItems = new Set(items);
            picker.selectedItems = items;
            result.clear();
            for (const item of picks) {
                if (item.type !== 'item') {
                    continue;
                }
                if (isToolSetPick(item)) {
                    result.set(item.toolset, item.picked);
                }
                else if (isToolPick(item)) {
                    result.set(item.tool, item.picked);
                }
                else if (isBucketPick(item)) {
                    if (item.toolset) {
                        result.set(item.toolset, item.picked);
                    }
                    for (const child of item.children) {
                        if (isToolSetPick(child)) {
                            result.set(child.toolset, item.picked);
                        }
                        else if (isToolPick(child)) {
                            result.set(child.tool, item.picked);
                        }
                    }
                }
            }
            if (onUpdate) {
                let didChange = toolsEntries.size !== result.size;
                for (const [key, value] of toolsEntries) {
                    if (didChange) {
                        break;
                    }
                    didChange = result.get(key) !== value;
                }
                if (didChange) {
                    onUpdate(result);
                }
            }
        }
        finally {
            ignoreEvent = false;
        }
    };
    _update();
    picker.items = picks;
    picker.show();
    store.add(picker.onDidTriggerItemButton(e => {
        if (isActionableButton(e.button)) {
            e.button.action();
            store.dispose();
        }
    }));
    store.add(picker.onDidChangeSelection(selectedPicks => {
        if (ignoreEvent) {
            return;
        }
        const addPick = selectedPicks.find(isCallbackPick);
        if (addPick) {
            return;
        }
        const { added, removed } = diffSets(lastSelectedItems, new Set(selectedPicks));
        for (const item of added) {
            item.picked = true;
            if (isBucketPick(item)) {
                // add server -> add back tools
                for (const toolPick of item.children) {
                    toolPick.picked = true;
                }
            }
            else if (isToolPick(item) || isToolSetPick(item)) {
                // add server when tool is picked
                item.parent.picked = true;
            }
        }
        for (const item of removed) {
            item.picked = false;
            if (isBucketPick(item)) {
                // removed server -> remove tools
                for (const toolPick of item.children) {
                    toolPick.picked = false;
                }
            }
            else if ((isToolPick(item) || isToolSetPick(item)) && item.parent.children.every(child => !child.picked)) {
                // remove LAST tool -> remove server
                item.parent.picked = false;
            }
        }
        _update();
    }));
    let didAccept = false;
    store.add(picker.onDidAccept(() => {
        const callbackPick = picker.activeItems.find(isCallbackPick);
        if (callbackPick) {
            callbackPick.run();
        }
        else {
            didAccept = true;
        }
    }));
    await Promise.race([Event.toPromise(Event.any(picker.onDidAccept, picker.onDidHide))]);
    store.dispose();
    // in the result, a MCP toolset is only enabled if all tools in the toolset are enabled
    for (const item of toolsService.toolSets.get()) {
        if (item.source.type === 'mcp') {
            const toolsInSet = Array.from(item.getTools());
            result.set(item, toolsInSet.every(tool => result.get(tool)));
        }
    }
    return didAccept ? result : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRUb29sUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU5RixPQUFPLEVBQXFCLGtCQUFrQixFQUF1QyxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQXNCLDJCQUEyQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFM0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBYyxX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