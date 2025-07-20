/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { waitForState } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { assertType } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { IMultiDiffSourceResolverService } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ChatEditingService } from '../../browser/chatEditing/chatEditingServiceImpl.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatService } from '../../common/chatServiceImpl.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { ChatTransferService, IChatTransferService } from '../../common/chatTransferService.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { NullLanguageModelsService } from '../common/languageModels.js';
import { MockChatVariablesService } from '../common/mockChatVariables.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { TestWorkerService } from '../../../inlineChat/test/browser/testWorkerService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../../editor/common/core/position.js';
function getAgentData(id) {
    return {
        name: id,
        id: id,
        extensionId: nullExtensionDescription.identifier,
        extensionPublisherId: '',
        publisherDisplayName: '',
        extensionDisplayName: '',
        locations: [ChatAgentLocation.Panel],
        modes: [ChatModeKind.Ask],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
}
suite('ChatEditingService', function () {
    const store = new DisposableStore();
    let editingService;
    let chatService;
    let textModelService;
    setup(function () {
        const collection = new ServiceCollection();
        collection.set(IWorkbenchAssignmentService, new NullWorkbenchAssignmentService());
        collection.set(IChatAgentService, new SyncDescriptor(ChatAgentService));
        collection.set(IChatVariablesService, new MockChatVariablesService());
        collection.set(IChatSlashCommandService, new class extends mock() {
        });
        collection.set(IChatTransferService, new SyncDescriptor(ChatTransferService));
        collection.set(IChatEditingService, new SyncDescriptor(ChatEditingService));
        collection.set(IEditorWorkerService, new SyncDescriptor(TestWorkerService));
        collection.set(IChatService, new SyncDescriptor(ChatService));
        collection.set(ILanguageModelsService, new SyncDescriptor(NullLanguageModelsService));
        collection.set(IMultiDiffSourceResolverService, new class extends mock() {
            registerResolver(_resolver) {
                return Disposable.None;
            }
        });
        collection.set(INotebookService, new class extends mock() {
            getNotebookTextModel(_uri) {
                return undefined;
            }
            hasSupportedNotebooks(_resource) {
                return false;
            }
        });
        const insta = store.add(store.add(workbenchInstantiationService(undefined, store)).createChild(collection));
        store.add(insta.get(IEditorWorkerService));
        const value = insta.get(IChatEditingService);
        assert.ok(value instanceof ChatEditingService);
        editingService = value;
        chatService = insta.get(IChatService);
        const chatAgentService = insta.get(IChatAgentService);
        const agent = {
            async invoke(request, progress, history, token) {
                return {};
            },
        };
        store.add(chatAgentService.registerAgent('testAgent', { ...getAgentData('testAgent'), isDefault: true }));
        store.add(chatAgentService.registerAgentImplementation('testAgent', agent));
        textModelService = insta.get(ITextModelService);
        const modelService = insta.get(IModelService);
        store.add(textModelService.registerTextModelContentProvider('test', {
            async provideTextContent(resource) {
                return store.add(modelService.createModel(resource.path.repeat(10), null, resource, false));
            },
        }));
    });
    teardown(() => {
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('create session', async function () {
        assert.ok(editingService);
        const model = chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        const session = await editingService.createEditingSession(model, true);
        assert.strictEqual(session.chatSessionId, model.sessionId);
        assert.strictEqual(session.isGlobalEditingSession, true);
        await assertThrowsAsync(async () => {
            // DUPE not allowed
            await editingService.createEditingSession(model);
        });
        session.dispose();
        model.dispose();
    });
    test('create session, file entry & isCurrentlyBeingModifiedBy', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'HelloWorld' });
        const model = chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        const session = await model.editingSessionObs?.promise;
        if (!session) {
            assert.fail('session not created');
        }
        const chatRequest = model?.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
        assertType(chatRequest.response);
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: false });
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }], done: false });
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits: [], done: true });
        const entry = await waitForState(session.entries.map(value => value.find(a => isEqual(a.modifiedURI, uri))));
        assert.ok(isEqual(entry.modifiedURI, uri));
        await waitForState(entry.isCurrentlyBeingModifiedBy.map(value => value === chatRequest.response));
        assert.ok(entry.isCurrentlyBeingModifiedBy.get() === chatRequest.response);
        const unset = waitForState(entry.isCurrentlyBeingModifiedBy.map(res => res === undefined));
        chatRequest.response.complete();
        await unset;
        await entry.reject();
        model.dispose();
    });
    async function idleAfterEdit(session, model, uri, edits) {
        const isStreaming = waitForState(session.state.map(s => s === 1 /* ChatEditingSessionState.StreamingEdits */), Boolean);
        const chatRequest = model.addRequest({ text: '', parts: [] }, { variables: [] }, 0);
        assertType(chatRequest.response);
        chatRequest.response.updateContent({ kind: 'textEdit', uri, edits, done: true });
        const entry = await waitForState(session.entries.map(value => value.find(a => isEqual(a.modifiedURI, uri))));
        assert.ok(isEqual(entry.modifiedURI, uri));
        chatRequest.response.complete();
        await isStreaming;
        const isIdle = waitForState(session.state.map(s => s === 2 /* ChatEditingSessionState.Idle */), Boolean);
        await isIdle;
        return entry;
    }
    test('mirror typing outside -> accept', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'abc\n' });
        const model = store.add(chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        const session = await model.editingSessionObs?.promise;
        assertType(session, 'session not created');
        const entry = await idleAfterEdit(session, model, uri, [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }]);
        const original = store.add(await textModelService.createModelReference(entry.originalURI)).object.textEditorModel;
        const modified = store.add(await textModelService.createModelReference(entry.modifiedURI)).object.textEditorModel;
        assert.strictEqual(entry.state.get(), 0 /* ModifiedFileEntryState.Modified */);
        assert.strictEqual(original.getValue(), 'abc\n'.repeat(10));
        assert.strictEqual(modified.getValue(), 'FarBoo\n' + 'abc\n'.repeat(10));
        modified.pushEditOperations(null, [EditOperation.insert(new Position(3, 1), 'USER_TYPE\n')], () => null);
        assert.ok(modified.getValue().includes('USER_TYPE'));
        assert.ok(original.getValue().includes('USER_TYPE'));
        await entry.accept();
        assert.strictEqual(modified.getValue(), original.getValue());
        assert.strictEqual(entry.state.get(), 1 /* ModifiedFileEntryState.Accepted */);
        assert.ok(modified.getValue().includes('FarBoo'));
        assert.ok(original.getValue().includes('FarBoo'));
    });
    test('mirror typing outside -> reject', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'abc\n' });
        const model = store.add(chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        const session = await model.editingSessionObs?.promise;
        assertType(session, 'session not created');
        const entry = await idleAfterEdit(session, model, uri, [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }]);
        const original = store.add(await textModelService.createModelReference(entry.originalURI)).object.textEditorModel;
        const modified = store.add(await textModelService.createModelReference(entry.modifiedURI)).object.textEditorModel;
        assert.strictEqual(entry.state.get(), 0 /* ModifiedFileEntryState.Modified */);
        assert.strictEqual(original.getValue(), 'abc\n'.repeat(10));
        assert.strictEqual(modified.getValue(), 'FarBoo\n' + 'abc\n'.repeat(10));
        modified.pushEditOperations(null, [EditOperation.insert(new Position(3, 1), 'USER_TYPE\n')], () => null);
        assert.ok(modified.getValue().includes('USER_TYPE'));
        assert.ok(original.getValue().includes('USER_TYPE'));
        await entry.reject();
        assert.strictEqual(modified.getValue(), original.getValue());
        assert.strictEqual(entry.state.get(), 2 /* ModifiedFileEntryState.Rejected */);
        assert.ok(!modified.getValue().includes('FarBoo'));
        assert.ok(!original.getValue().includes('FarBoo'));
    });
    test('NO mirror typing inside -> accept', async function () {
        assert.ok(editingService);
        const uri = URI.from({ scheme: 'test', path: 'abc\n' });
        const model = store.add(chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None));
        const session = await model.editingSessionObs?.promise;
        assertType(session, 'session not created');
        const entry = await idleAfterEdit(session, model, uri, [{ range: new Range(1, 1, 1, 1), text: 'FarBoo\n' }]);
        const original = store.add(await textModelService.createModelReference(entry.originalURI)).object.textEditorModel;
        const modified = store.add(await textModelService.createModelReference(entry.modifiedURI)).object.textEditorModel;
        assert.strictEqual(entry.state.get(), 0 /* ModifiedFileEntryState.Modified */);
        assert.strictEqual(original.getValue(), 'abc\n'.repeat(10));
        assert.strictEqual(modified.getValue(), 'FarBoo\n' + 'abc\n'.repeat(10));
        modified.pushEditOperations(null, [EditOperation.replace(new Range(1, 2, 1, 7), 'ooBar')], () => null);
        assert.ok(modified.getValue().includes('FooBar'));
        assert.ok(!original.getValue().includes('FooBar')); // typed in the AI edits, DO NOT transpose
        await entry.accept();
        assert.strictEqual(modified.getValue(), original.getValue());
        assert.strictEqual(entry.state.get(), 1 /* ModifiedFileEntryState.Accepted */);
        assert.ok(modified.getValue().includes('FooBar'));
        assert.ok(original.getValue().includes('FooBar'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRFZGl0aW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkRB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QWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV2RyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsMENBQTBDO1FBRTlGLE1BQU0sS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsMENBQWtDLENBQUM7UUFFdkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9