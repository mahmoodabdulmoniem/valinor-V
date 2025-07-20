/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { createTerminalLanguageVirtualUri, LspTerminalModelContentProvider } from '../../browser/lspTerminalModelContentProvider.js';
import * as sinon from 'sinon';
import assert from 'assert';
import { URI } from '../../../../../../base/common/uri.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { VSCODE_LSP_TERMINAL_PROMPT_TRACKER } from '../../browser/lspTerminalUtil.js';
suite('LspTerminalModelContentProvider', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let capabilityStore;
    let textModelService;
    let modelService;
    let mockTextModel;
    let lspTerminalModelContentProvider;
    let virtualTerminalDocumentUri;
    let setValueSpy;
    let getValueSpy;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        capabilityStore = store.add(new TerminalCapabilityStore());
        virtualTerminalDocumentUri = URI.from({ scheme: 'vscodeTerminal', path: '/terminal1.py' });
        // Create stubs for the mock text model methods
        setValueSpy = sinon.stub();
        getValueSpy = sinon.stub();
        mockTextModel = {
            setValue: setValueSpy,
            getValue: getValueSpy,
            dispose: sinon.stub(),
            isDisposed: sinon.stub().returns(false)
        };
        // Create a stub for modelService.getModel
        modelService = {};
        modelService.getModel = sinon.stub().callsFake((uri) => {
            return uri.toString() === virtualTerminalDocumentUri.toString() ? mockTextModel : null;
        });
        // Create stub services for instantiation service
        textModelService = {};
        textModelService.registerTextModelContentProvider = sinon.stub().returns({ dispose: sinon.stub() });
        const markerService = {};
        markerService.installResourceFilter = sinon.stub().returns({ dispose: sinon.stub() });
        const languageService = {};
        // Set up the services in the instantiation service
        instantiationService.stub(IModelService, modelService);
        instantiationService.stub(ITextModelService, textModelService);
        instantiationService.stub(IMarkerService, markerService);
        instantiationService.stub(ILanguageService, languageService);
        // Create the provider instance
        lspTerminalModelContentProvider = store.add(instantiationService.createInstance(LspTerminalModelContentProvider, capabilityStore, 1, virtualTerminalDocumentUri, "python" /* GeneralShellType.Python */));
    });
    teardown(() => {
        sinon.restore();
        lspTerminalModelContentProvider?.dispose();
    });
    suite('setContent', () => {
        test('should not call setValue if content is "exit()"', () => {
            lspTerminalModelContentProvider.setContent('exit()');
            assert.strictEqual(setValueSpy.called, false);
        });
        test('should add delimiter when setting content on empty document', () => {
            getValueSpy.returns('');
            lspTerminalModelContentProvider.setContent('print("hello")');
            assert.strictEqual(setValueSpy.calledOnce, true);
            assert.strictEqual(setValueSpy.args[0][0], VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
        });
        test('should update content with delimiter when document already has content', () => {
            const existingContent = 'previous content\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER;
            getValueSpy.returns(existingContent);
            lspTerminalModelContentProvider.setContent('print("hello")');
            assert.strictEqual(setValueSpy.calledOnce, true);
            const expectedContent = 'previous content\n\nprint("hello")\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER;
            assert.strictEqual(setValueSpy.args[0][0], expectedContent);
        });
        test('should sanitize content when delimiter is in the middle of existing content', () => {
            // Simulating a corrupted state where the delimiter is in the middle
            const existingContent = 'previous content\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER + 'some extra text';
            getValueSpy.returns(existingContent);
            lspTerminalModelContentProvider.setContent('print("hello")');
            assert.strictEqual(setValueSpy.calledOnce, true);
            const expectedContent = 'previous content\n\nprint("hello")\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER;
            assert.strictEqual(setValueSpy.args[0][0], expectedContent);
        });
        test('Mac, Linux - createTerminalLanguageVirtualUri should return the correct URI', () => {
            const expectedUri = URI.from({ scheme: Schemas.vscodeTerminal, path: '/terminal1.py' });
            const actualUri = createTerminalLanguageVirtualUri(1, 'py');
            assert.strictEqual(actualUri.toString(), expectedUri.toString());
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwVGVybWluYWxNb2RlbENvbnRlbnRQcm92aWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC90ZXN0L2Jyb3dzZXIvbHNwVGVybWluYWxNb2RlbENvbnRlbnRQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNySSxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQzdILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUd6RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEYsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3QyxN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