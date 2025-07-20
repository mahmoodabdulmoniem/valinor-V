/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
export class TerminalQuickFixService {
    get providers() { return this._providers; }
    constructor() {
        this._selectors = new Map();
        this._providers = new Map();
        this._pendingProviders = new Map();
        this._onDidRegisterProvider = new Emitter();
        this.onDidRegisterProvider = this._onDidRegisterProvider.event;
        this._onDidRegisterCommandSelector = new Emitter();
        this.onDidRegisterCommandSelector = this._onDidRegisterCommandSelector.event;
        this._onDidUnregisterProvider = new Emitter();
        this.onDidUnregisterProvider = this._onDidUnregisterProvider.event;
        this.extensionQuickFixes = new Promise((r) => quickFixExtensionPoint.setHandler(fixes => {
            r(fixes.filter(c => isProposedApiEnabled(c.description, 'terminalQuickFixProvider')).map(c => {
                if (!c.value) {
                    return [];
                }
                return c.value.map(fix => { return { ...fix, extensionIdentifier: c.description.identifier.value }; });
            }).flat());
        }));
        this.extensionQuickFixes.then(selectors => {
            for (const selector of selectors) {
                this.registerCommandSelector(selector);
            }
        });
    }
    registerCommandSelector(selector) {
        this._selectors.set(selector.id, selector);
        this._onDidRegisterCommandSelector.fire(selector);
        // Check if there's a pending provider for this selector
        const pendingProvider = this._pendingProviders.get(selector.id);
        if (pendingProvider) {
            this._pendingProviders.delete(selector.id);
            this._providers.set(selector.id, pendingProvider);
            this._onDidRegisterProvider.fire({ selector, provider: pendingProvider });
        }
    }
    registerQuickFixProvider(id, provider) {
        // This is more complicated than it looks like it should be because we need to return an
        // IDisposable synchronously but we must await ITerminalContributionService.quickFixes
        // asynchronously before actually registering the provider.
        let disposed = false;
        this.extensionQuickFixes.then(() => {
            if (disposed) {
                return;
            }
            const selector = this._selectors.get(id);
            if (selector) {
                // Selector is already available, register immediately
                this._providers.set(id, provider);
                this._onDidRegisterProvider.fire({ selector, provider });
            }
            else {
                // Selector not yet available, store provider as pending
                this._pendingProviders.set(id, provider);
            }
        });
        return toDisposable(() => {
            disposed = true;
            this._providers.delete(id);
            this._pendingProviders.delete(id);
            const selector = this._selectors.get(id);
            if (selector) {
                this._selectors.delete(id);
                this._onDidUnregisterProvider.fire(selector.id);
            }
        });
    }
}
const quickFixExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'terminalQuickFixes',
    defaultExtensionKind: ['workspace'],
    activationEventsGenerator: (terminalQuickFixes, result) => {
        for (const quickFixContrib of terminalQuickFixes ?? []) {
            result.push(`onTerminalQuickFixRequest:${quickFixContrib.id}`);
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.terminalQuickFixes', 'Contributes terminal quick fixes.'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'commandLineMatcher', 'outputMatcher', 'commandExitResult'],
            defaultSnippets: [{
                    body: {
                        id: '$1',
                        commandLineMatcher: '$2',
                        outputMatcher: '$3',
                        exitStatus: '$4'
                    }
                }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.id', "The ID of the quick fix provider"),
                    type: 'string',
                },
                commandLineMatcher: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandLineMatcher', "A regular expression or string to test the command line against"),
                    type: 'string',
                },
                outputMatcher: {
                    markdownDescription: localize('vscode.extension.contributes.terminalQuickFixes.outputMatcher', "A regular expression or string to match a single line of the output against, which provides groups to be referenced in terminalCommand and uri.\n\nFor example:\n\n `lineMatcher: /git push --set-upstream origin (?<branchName>[^\s]+)/;`\n\n`terminalCommand: 'git push --set-upstream origin ${group:branchName}';`\n"),
                    type: 'object',
                    required: ['lineMatcher', 'anchor', 'offset', 'length'],
                    properties: {
                        lineMatcher: {
                            description: 'A regular expression or string to test the command line against',
                            type: 'string'
                        },
                        anchor: {
                            description: 'Where the search should begin in the buffer',
                            enum: ['top', 'bottom']
                        },
                        offset: {
                            description: 'The number of lines vertically from the anchor in the buffer to start matching against',
                            type: 'number'
                        },
                        length: {
                            description: 'The number of rows to match against, this should be as small as possible for performance reasons',
                            type: 'number'
                        }
                    }
                },
                commandExitResult: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.commandExitResult', "The command exit result to match on"),
                    enum: ['success', 'error'],
                    enumDescriptions: [
                        'The command exited with an exit code of zero.',
                        'The command exited with a non-zero exit code.'
                    ]
                },
                kind: {
                    description: localize('vscode.extension.contributes.terminalQuickFixes.kind', "The kind of the resulting quick fix. This changes how the quick fix is presented. Defaults to {0}.", '`"fix"`'),
                    enum: ['default', 'explain'],
                    enumDescriptions: [
                        'A high confidence quick fix.',
                        'An explanation of the problem.'
                    ]
                }
            },
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0ZpeFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0ZpeC9icm93c2VyL3Rlcm1pbmFsUXVpY2tGaXhTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRWxHLE1BQU0sT0FBTyx1QkFBdUI7SUFNbkMsSUFBSSxTQUFTLEtBQTZDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFhbkY7UUFoQlEsZUFBVSxHQUEwQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRTlELGVBQVUsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUcvRCxzQkFBaUIsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU3RCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBcUMsQ0FBQztRQUNsRiwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBQ2xELGtDQUE2QixHQUFHLElBQUksT0FBTyxFQUE0QixDQUFDO1FBQ2hGLGlDQUE0QixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUM7UUFDaEUsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQztRQUN6RCw0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