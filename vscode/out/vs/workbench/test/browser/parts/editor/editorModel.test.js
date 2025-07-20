/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { BaseTextEditorModel } from '../../../../common/editor/textEditorModel.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { ITextResourcePropertiesService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestStorageService, TestTextResourcePropertiesService } from '../../../common/workbenchTestServices.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { LanguageDetectionService } from '../../../../services/languageDetection/browser/languageDetectionWorkerServiceImpl.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { TestEditorService, TestEnvironmentService } from '../../workbenchTestServices.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestAccessibilityService } from '../../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ITreeSitterLibraryService } from '../../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { TestTreeSitterLibraryService } from '../../../../../editor/test/common/services/testTreeSitterLibraryService.js';
suite('EditorModel', () => {
    class MyEditorModel extends EditorModel {
    }
    class MyTextEditorModel extends BaseTextEditorModel {
        testCreateTextEditorModel(value, resource, preferredLanguageId) {
            return super.createTextEditorModel(value, resource, preferredLanguageId);
        }
        isReadonly() {
            return false;
        }
    }
    function stubModelService(instantiationService) {
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        instantiationService.stub(IWorkbenchEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(instantiationService.get(IConfigurationService)));
        instantiationService.stub(IDialogService, dialogService);
        instantiationService.stub(INotificationService, notificationService);
        instantiationService.stub(IUndoRedoService, undoRedoService);
        instantiationService.stub(IEditorService, disposables.add(new TestEditorService()));
        instantiationService.stub(IThemeService, new TestThemeService());
        instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
        instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
        instantiationService.stub(ITreeSitterLibraryService, new TestTreeSitterLibraryService());
        return disposables.add(instantiationService.createInstance(ModelService));
    }
    let instantiationService;
    let languageService;
    const disposables = new DisposableStore();
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        languageService = instantiationService.stub(ILanguageService, LanguageService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        let counter = 0;
        const model = disposables.add(new MyEditorModel());
        disposables.add(model.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        await model.resolve();
        assert.strictEqual(model.isDisposed(), false);
        assert.strictEqual(model.isResolved(), true);
        model.dispose();
        assert.strictEqual(counter, 1);
        assert.strictEqual(model.isDisposed(), true);
    });
    test('BaseTextEditorModel', async () => {
        const modelService = stubModelService(instantiationService);
        const model = disposables.add(new MyTextEditorModel(modelService, languageService, disposables.add(instantiationService.createInstance(LanguageDetectionService)), instantiationService.createInstance(TestAccessibilityService)));
        await model.resolve();
        disposables.add(model.testCreateTextEditorModel(createTextBufferFactory('foo'), null, Mimes.text));
        assert.strictEqual(model.isResolved(), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUdyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxv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