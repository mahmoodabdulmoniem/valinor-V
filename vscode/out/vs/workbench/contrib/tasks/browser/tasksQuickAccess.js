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
var TasksQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ITaskService } from '../common/taskService.js';
import { CustomTask, ContributedTask, ConfiguringTask } from '../common/tasks.js';
import { TaskQuickPick } from './taskQuickPick.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isString } from '../../../../base/common/types.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let TasksQuickAccessProvider = class TasksQuickAccessProvider extends PickerQuickAccessProvider {
    static { TasksQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'task '; }
    constructor(extensionService, _taskService, _configurationService, _quickInputService, _notificationService, _dialogService, _themeService, _storageService) {
        super(TasksQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noTaskResults', "No matching tasks")
            }
        });
        this._taskService = _taskService;
        this._configurationService = _configurationService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._themeService = _themeService;
        this._storageService = _storageService;
    }
    async _getPicks(filter, disposables, token) {
        if (token.isCancellationRequested) {
            return [];
        }
        const taskQuickPick = new TaskQuickPick(this._taskService, this._configurationService, this._quickInputService, this._notificationService, this._themeService, this._dialogService, this._storageService);
        const topLevelPicks = await taskQuickPick.getTopLevelEntries();
        const taskPicks = [];
        for (const entry of topLevelPicks.entries) {
            const highlights = matchesFuzzy(filter, entry.label);
            if (!highlights) {
                continue;
            }
            if (entry.type === 'separator') {
                taskPicks.push(entry);
            }
            const task = entry.task;
            const quickAccessEntry = entry;
            quickAccessEntry.highlights = { label: highlights };
            quickAccessEntry.trigger = (index) => {
                if ((index === 1) && (quickAccessEntry.buttons?.length === 2)) {
                    const key = (task && !isString(task)) ? task.getKey() : undefined;
                    if (key) {
                        this._taskService.removeRecentlyUsedTask(key);
                    }
                    return TriggerAction.REFRESH_PICKER;
                }
                else {
                    if (ContributedTask.is(task)) {
                        this._taskService.customize(task, undefined, true);
                    }
                    else if (CustomTask.is(task)) {
                        this._taskService.openConfig(task);
                    }
                    return TriggerAction.CLOSE_PICKER;
                }
            };
            quickAccessEntry.accept = async () => {
                if (isString(task)) {
                    // switch to quick pick and show second level
                    const showResult = await taskQuickPick.show(localize('TaskService.pickRunTask', 'Select the task to run'), undefined, task);
                    if (showResult) {
                        this._taskService.run(showResult, { attachProblemMatcher: true });
                    }
                }
                else {
                    this._taskService.run(await this._toTask(task), { attachProblemMatcher: true });
                }
            };
            taskPicks.push(quickAccessEntry);
        }
        return taskPicks;
    }
    async _toTask(task) {
        if (!ConfiguringTask.is(task)) {
            return task;
        }
        return this._taskService.tryResolveTask(task);
    }
};
TasksQuickAccessProvider = TasksQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, ITaskService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, INotificationService),
    __param(5, IDialogService),
    __param(6, IThemeService),
    __param(7, IStorageService)
], TasksQuickAccessProvider);
export { TasksQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFza3MvYnJvd3Nlci90YXNrc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUF1QixrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsYUFBYSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDaEosT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQVEsTUFBTSwwQkFBMEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUdsRixPQUFPLEVBQUUsYUFBYSxFQUErQixNQUFNLG9CQUFvQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUxRSxJQUFNLHdCQUF3QixH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