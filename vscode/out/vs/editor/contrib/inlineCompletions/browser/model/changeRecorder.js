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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { canLog, ILoggerService, LogLevel } from '../../../../../platform/log/common/log.js';
import { CodeEditorWidget } from '../../../../browser/widget/codeEditor/codeEditorWidget.js';
import { StructuredLogger } from '../structuredLogger.js';
let TextModelChangeRecorder = class TextModelChangeRecorder extends Disposable {
    constructor(_editor, _instantiationService, _loggerService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._loggerService = _loggerService;
        this._structuredLogger = this._register(this._instantiationService.createInstance(StructuredLogger.cast(), 'editor.inlineSuggest.logChangeReason.commandId'));
        const logger = this._loggerService?.createLogger('textModelChanges', { hidden: false, name: 'Text Model Changes Reason' });
        const loggingLevel = observableFromEvent(this, logger.onDidChangeLogLevel, () => logger.getLevel());
        this._register(autorun(reader => {
            if (!canLog(loggingLevel.read(reader), LogLevel.Trace)) {
                return;
            }
            reader.store.add(this._editor.onDidChangeModelContent((e) => {
                if (this._editor.getModel()?.uri.scheme === 'output') {
                    return;
                }
                logger.trace('onDidChangeModelContent: ' + e.detailedReasons.map(r => r.toKey(Number.MAX_VALUE)).join(', '));
            }));
        }));
        this._register(autorun(reader => {
            if (!(this._editor instanceof CodeEditorWidget)) {
                return;
            }
            if (!this._structuredLogger.isEnabled.read(reader)) {
                return;
            }
            reader.store.add(this._editor.onDidChangeModelContent(e => {
                const tm = this._editor.getModel();
                if (!tm) {
                    return;
                }
                const reason = e.detailedReasons[0];
                const data = {
                    ...reason.metadata,
                    sourceId: 'TextModel.setChangeReason',
                    source: reason.metadata.source,
                    time: Date.now(),
                    modelUri: tm.uri,
                    modelVersion: tm.getVersionId(),
                };
                setTimeout(() => {
                    // To ensure that this reaches the extension host after the content change event.
                    // (Without the setTimeout, I observed this command being called before the content change event arrived)
                    this._structuredLogger.log(data);
                }, 0);
            }));
        }));
    }
};
TextModelChangeRecorder = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILoggerService)
], TextModelChangeRecorder);
export { TextModelChangeRecorder };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlUmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvY2hhbmdlUmVjb3JkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUU3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM3RixPQUFPLEVBQWdFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFTakgsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBR3RELFlBQ2tCLE9BQW9CLEVBQ0cscUJBQTRDLEVBQ25ELGNBQThCO1FBRS9ELEtBQUssRUFBRSxDQUFDO1FBSlMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNHLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDbkQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBSS9ELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFpRSxFQUN2SyxnREFBZ0QsQ0FDaEQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGNB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