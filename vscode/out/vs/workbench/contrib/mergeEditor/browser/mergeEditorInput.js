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
var MergeEditorInput_1;
import { assertFn } from '../../../../base/common/assert.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput } from '../../../common/editor.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { AbstractTextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { TempFileMergeEditorModeFactory, WorkspaceMergeEditorModeFactory } from './mergeEditorInputModel.js';
import { MergeEditorTelemetry } from './telemetry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export class MergeEditorInputData {
    constructor(uri, title, detail, description) {
        this.uri = uri;
        this.title = title;
        this.detail = detail;
        this.description = description;
    }
}
let MergeEditorInput = class MergeEditorInput extends AbstractTextResourceEditorInput {
    static { MergeEditorInput_1 = this; }
    static { this.ID = 'mergeEditor.Input'; }
    get useWorkingCopy() {
        return this.configurationService.getValue('mergeEditor.useWorkingCopy') ?? false;
    }
    constructor(base, input1, input2, result, _instaService, editorService, textFileService, labelService, fileService, configurationService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService, logService) {
        super(result, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
        this._instaService = _instaService;
        this.configurationService = configurationService;
        this.logService = logService;
        this._focusedEditor = 'result';
        this.closeHandler = {
            showConfirm: () => this._inputModel?.shouldConfirmClose() ?? false,
            confirm: async (editors) => {
                assertFn(() => editors.every(e => e.editor instanceof MergeEditorInput_1));
                const inputModels = editors.map(e => e.editor._inputModel).filter(isDefined);
                return await this._inputModel.confirmClose(inputModels);
            },
        };
        this.mergeEditorModeFactory = this._instaService.createInstance(this.useWorkingCopy
            ? TempFileMergeEditorModeFactory
            : WorkspaceMergeEditorModeFactory, this._instaService.createInstance(MergeEditorTelemetry));
    }
    dispose() {
        super.dispose();
    }
    get typeId() {
        return MergeEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    get capabilities() {
        let capabilities = super.capabilities | 256 /* EditorInputCapabilities.MultipleEditors */;
        if (this.useWorkingCopy) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    getName() {
        return localize('name', "Merging: {0}", super.getName());
    }
    async resolve() {
        if (!this._inputModel) {
            const inputModel = this._register(await this.mergeEditorModeFactory.createInputModel({
                base: this.base,
                input1: this.input1,
                input2: this.input2,
                result: this.result,
            }));
            this._inputModel = inputModel;
            this._register(autorun(reader => {
                /** @description fire dirty event */
                inputModel.isDirty.read(reader);
                this._onDidChangeDirty.fire();
            }));
            await this._inputModel.model.onInitialized;
        }
        return this._inputModel;
    }
    async accept() {
        await this._inputModel?.accept();
    }
    async save(group, options) {
        await this._inputModel?.save(options);
        return undefined;
    }
    toUntyped() {
        return {
            input1: { resource: this.input1.uri, label: this.input1.title, description: this.input1.description, detail: this.input1.detail },
            input2: { resource: this.input2.uri, label: this.input2.title, description: this.input2.description, detail: this.input2.detail },
            base: { resource: this.base },
            result: { resource: this.result },
            options: {
                override: this.typeId
            }
        };
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof MergeEditorInput_1) {
            return isEqual(this.base, otherInput.base)
                && isEqual(this.input1.uri, otherInput.input1.uri)
                && isEqual(this.input2.uri, otherInput.input2.uri)
                && isEqual(this.result, otherInput.result);
        }
        if (isResourceMergeEditorInput(otherInput)) {
            return (this.editorId === otherInput.options?.override || otherInput.options?.override === undefined)
                && isEqual(this.base, otherInput.base.resource)
                && isEqual(this.input1.uri, otherInput.input1.resource)
                && isEqual(this.input2.uri, otherInput.input2.resource)
                && isEqual(this.result, otherInput.result.resource);
        }
        return false;
    }
    async revert(group, options) {
        return this._inputModel?.revert(options);
    }
    // ---- FileEditorInput
    isDirty() {
        return this._inputModel?.isDirty.get() ?? false;
    }
    setLanguageId(languageId, source) {
        this._inputModel?.model.setLanguageId(languageId, source);
    }
    /**
     * Updates the focused editor and triggers a name change event
     */
    updateFocusedEditor(editor) {
        if (this._focusedEditor !== editor) {
            this._focusedEditor = editor;
            this.logService.trace('alertFocusedEditor', editor);
            alertFocusedEditor(editor);
        }
    }
};
MergeEditorInput = MergeEditorInput_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IEditorService),
    __param(6, ITextFileService),
    __param(7, ILabelService),
    __param(8, IFileService),
    __param(9, IConfigurationService),
    __param(10, IFilesConfigurationService),
    __param(11, ITextResourceConfigurationService),
    __param(12, ICustomEditorLabelService),
    __param(13, ILogService)
], MergeEditorInput);
export { MergeEditorInput };
function alertFocusedEditor(editor) {
    switch (editor) {
        case 'input1':
            alert(localize('mergeEditor.input1', "Incoming, Left Input"));
            break;
        case 'input2':
            alert(localize('mergeEditor.input2', "Current, Right Input"));
            break;
        case 'result':
            alert(localize('mergeEditor.result', "Merge Result"));
            break;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFN0QsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLDBCQUEwQixFQUFzRSwwQkFBMEIsRUFBdUIsTUFBTSwyQkFBMkIsQ0FBQztBQUU1TCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRyxPQUFPLEVBQTBCLDhCQUE4QixFQUFFLCtCQUErQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDckksT0FBTyxFQUFF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