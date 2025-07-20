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
/* eslint-disable local/code-no-native-private */
import { URI } from '../../../base/common/uri.js';
import { asPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import * as types from './extHostTypes.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
import { IExtHostDocumentsAndEditors } from './extHostDocumentsAndEditors.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IExtHostTerminalService } from './extHostTerminalService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../base/common/network.js';
import * as Platform from '../../../base/common/platform.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostApiDeprecationService } from './extHostApiDeprecationService.js';
import { USER_TASKS_GROUP_KEY } from '../../contrib/tasks/common/tasks.js';
import { ErrorNoTelemetry, NotSupportedError } from '../../../base/common/errors.js';
import { asArray } from '../../../base/common/arrays.js';
var TaskDefinitionDTO;
(function (TaskDefinitionDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskDefinitionDTO.to = to;
})(TaskDefinitionDTO || (TaskDefinitionDTO = {}));
var TaskPresentationOptionsDTO;
(function (TaskPresentationOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    TaskPresentationOptionsDTO.to = to;
})(TaskPresentationOptionsDTO || (TaskPresentationOptionsDTO = {}));
var ProcessExecutionOptionsDTO;
(function (ProcessExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ProcessExecutionOptionsDTO.to = to;
})(ProcessExecutionOptionsDTO || (ProcessExecutionOptionsDTO = {}));
var ProcessExecutionDTO;
(function (ProcessExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && !!candidate.process;
        }
        else {
            return false;
        }
    }
    ProcessExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {
            process: value.process,
            args: value.args
        };
        if (value.options) {
            result.options = ProcessExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ProcessExecutionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return new types.ProcessExecution(value.process, value.args, value.options);
    }
    ProcessExecutionDTO.to = to;
})(ProcessExecutionDTO || (ProcessExecutionDTO = {}));
var ShellExecutionOptionsDTO;
(function (ShellExecutionOptionsDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.from = from;
    function to(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return value;
    }
    ShellExecutionOptionsDTO.to = to;
})(ShellExecutionOptionsDTO || (ShellExecutionOptionsDTO = {}));
var ShellExecutionDTO;
(function (ShellExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && (!!candidate.commandLine || !!candidate.command);
        }
        else {
            return false;
        }
    }
    ShellExecutionDTO.is = is;
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        const result = {};
        if (value.commandLine !== undefined) {
            result.commandLine = value.commandLine;
        }
        else {
            result.command = value.command;
            result.args = value.args;
        }
        if (value.options) {
            result.options = ShellExecutionOptionsDTO.from(value.options);
        }
        return result;
    }
    ShellExecutionDTO.from = from;
    function to(value) {
        if (value === undefined || value === null || (value.command === undefined && value.commandLine === undefined)) {
            return undefined;
        }
        if (value.commandLine) {
            return new types.ShellExecution(value.commandLine, value.options);
        }
        else {
            return new types.ShellExecution(value.command, value.args ? value.args : [], value.options);
        }
    }
    ShellExecutionDTO.to = to;
})(ShellExecutionDTO || (ShellExecutionDTO = {}));
export var CustomExecutionDTO;
(function (CustomExecutionDTO) {
    function is(value) {
        if (value) {
            const candidate = value;
            return candidate && candidate.customExecution === 'customExecution';
        }
        else {
            return false;
        }
    }
    CustomExecutionDTO.is = is;
    function from(value) {
        return {
            customExecution: 'customExecution'
        };
    }
    CustomExecutionDTO.from = from;
    function to(taskId, providedCustomExeutions) {
        return providedCustomExeutions.get(taskId);
    }
    CustomExecutionDTO.to = to;
})(CustomExecutionDTO || (CustomExecutionDTO = {}));
export var TaskHandleDTO;
(function (TaskHandleDTO) {
    function from(value, workspaceService) {
        let folder;
        if (value.scope !== undefined && typeof value.scope !== 'number') {
            folder = value.scope.uri;
        }
        else if (value.scope !== undefined && typeof value.scope === 'number') {
            if ((value.scope === types.TaskScope.Workspace) && workspaceService && workspaceService.workspaceFile) {
                folder = workspaceService.workspaceFile;
            }
            else {
                folder = USER_TASKS_GROUP_KEY;
            }
        }
        return {
            id: value._id,
            workspaceFolder: folder
        };
    }
    TaskHandleDTO.from = from;
})(TaskHandleDTO || (TaskHandleDTO = {}));
var TaskGroupDTO;
(function (TaskGroupDTO) {
    function from(value) {
        if (value === undefined || value === null) {
            return undefined;
        }
        return { _id: value.id, isDefault: value.isDefault };
    }
    TaskGroupDTO.from = from;
})(TaskGroupDTO || (TaskGroupDTO = {}));
export var TaskDTO;
(function (TaskDTO) {
    function fromMany(tasks, extension) {
        if (tasks === undefined || tasks === null) {
            return [];
        }
        const result = [];
        for (const task of tasks) {
            const converted = from(task, extension);
            if (converted) {
                result.push(converted);
            }
        }
        return result;
    }
    TaskDTO.fromMany = fromMany;
    function from(value, extension) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (value.execution instanceof types.ProcessExecution) {
            execution = ProcessExecutionDTO.from(value.execution);
        }
        else if (value.execution instanceof types.ShellExecution) {
            execution = ShellExecutionDTO.from(value.execution);
        }
        else if (value.execution && value.execution instanceof types.CustomExecution) {
            execution = CustomExecutionDTO.from(value.execution);
        }
        const definition = TaskDefinitionDTO.from(value.definition);
        let scope;
        if (value.scope) {
            if (typeof value.scope === 'number') {
                scope = value.scope;
            }
            else {
                scope = value.scope.uri;
            }
        }
        else {
            // To continue to support the deprecated task constructor that doesn't take a scope, we must add a scope here:
            scope = types.TaskScope.Workspace;
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = {
            _id: value._id,
            definition,
            name: value.name,
            source: {
                extensionId: extension.identifier.value,
                label: value.source,
                scope: scope
            },
            execution: execution,
            isBackground: value.isBackground,
            group: TaskGroupDTO.from(value.group),
            presentationOptions: TaskPresentationOptionsDTO.from(value.presentationOptions),
            problemMatchers: asArray(value.problemMatchers),
            hasDefinedMatchers: value.hasDefinedMatchers,
            runOptions: value.runOptions ? value.runOptions : { reevaluateOnRerun: true },
            detail: value.detail
        };
        return result;
    }
    TaskDTO.from = from;
    async function to(value, workspace, providedCustomExeutions) {
        if (value === undefined || value === null) {
            return undefined;
        }
        let execution;
        if (ProcessExecutionDTO.is(value.execution)) {
            execution = ProcessExecutionDTO.to(value.execution);
        }
        else if (ShellExecutionDTO.is(value.execution)) {
            execution = ShellExecutionDTO.to(value.execution);
        }
        else if (CustomExecutionDTO.is(value.execution)) {
            execution = CustomExecutionDTO.to(value._id, providedCustomExeutions);
        }
        const definition = TaskDefinitionDTO.to(value.definition);
        let scope;
        if (value.source) {
            if (value.source.scope !== undefined) {
                if (typeof value.source.scope === 'number') {
                    scope = value.source.scope;
                }
                else {
                    scope = await workspace.resolveWorkspaceFolder(URI.revive(value.source.scope));
                }
            }
            else {
                scope = types.TaskScope.Workspace;
            }
        }
        if (!definition || !scope) {
            return undefined;
        }
        const result = new types.Task(definition, scope, value.name, value.source.label, execution, value.problemMatchers);
        if (value.isBackground !== undefined) {
            result.isBackground = value.isBackground;
        }
        if (value.group !== undefined) {
            result.group = types.TaskGroup.from(value.group._id);
            if (result.group && value.group.isDefault) {
                result.group = new types.TaskGroup(result.group.id, result.group.label);
                if (value.group.isDefault === true) {
                    result.group.isDefault = value.group.isDefault;
                }
            }
        }
        if (value.presentationOptions) {
            result.presentationOptions = TaskPresentationOptionsDTO.to(value.presentationOptions);
        }
        if (value._id) {
            result._id = value._id;
        }
        if (value.detail) {
            result.detail = value.detail;
        }
        return result;
    }
    TaskDTO.to = to;
})(TaskDTO || (TaskDTO = {}));
var TaskFilterDTO;
(function (TaskFilterDTO) {
    function from(value) {
        return value;
    }
    TaskFilterDTO.from = from;
    function to(value) {
        if (!value) {
            return undefined;
        }
        return Object.assign(Object.create(null), value);
    }
    TaskFilterDTO.to = to;
})(TaskFilterDTO || (TaskFilterDTO = {}));
class TaskExecutionImpl {
    #tasks;
    constructor(tasks, _id, _task) {
        this._id = _id;
        this._task = _task;
        this.#tasks = tasks;
    }
    get task() {
        return this._task;
    }
    terminate() {
        this.#tasks.terminateTask(this);
    }
    fireDidStartProcess(value) {
    }
    fireDidEndProcess(value) {
    }
    get terminal() {
        return this._terminal;
    }
    set terminal(term) {
        this._terminal = term;
    }
}
let ExtHostTaskBase = class ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        this._onDidExecuteTask = new Emitter();
        this._onDidTerminateTask = new Emitter();
        this._onDidTaskProcessStarted = new Emitter();
        this._onDidTaskProcessEnded = new Emitter();
        this._onDidStartTaskProblemMatchers = new Emitter();
        this._onDidEndTaskProblemMatchers = new Emitter();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTask);
        this._workspaceProvider = workspaceService;
        this._editorService = editorService;
        this._configurationService = configurationService;
        this._terminalService = extHostTerminalService;
        this._handleCounter = 0;
        this._handlers = new Map();
        this._taskExecutions = new Map();
        this._taskExecutionPromises = new Map();
        this._providedCustomExecutions2 = new Map();
        this._notProvidedCustomExecutions = new Set();
        this._activeCustomExecutions2 = new Map();
        this._logService = logService;
        this._deprecationService = deprecationService;
        this._proxy.$registerSupportedExecutions(true);
    }
    registerTaskProvider(extension, type, provider) {
        if (!provider) {
            return new types.Disposable(() => { });
        }
        const handle = this.nextHandle();
        this._handlers.set(handle, { type, provider, extension });
        this._proxy.$registerTaskProvider(handle, type);
        return new types.Disposable(() => {
            this._handlers.delete(handle);
            this._proxy.$unregisterTaskProvider(handle);
        });
    }
    registerTaskSystem(scheme, info) {
        this._proxy.$registerTaskSystem(scheme, info);
    }
    fetchTasks(filter) {
        return this._proxy.$fetchTasks(TaskFilterDTO.from(filter)).then(async (values) => {
            const result = [];
            for (const value of values) {
                const task = await TaskDTO.to(value, this._workspaceProvider, this._providedCustomExecutions2);
                if (task) {
                    result.push(task);
                }
            }
            return result;
        });
    }
    get taskExecutions() {
        const result = [];
        this._taskExecutions.forEach(value => result.push(value));
        return result;
    }
    terminateTask(execution) {
        if (!(execution instanceof TaskExecutionImpl)) {
            throw new Error('No valid task execution provided');
        }
        return this._proxy.$terminateTask(execution._id);
    }
    get onDidStartTask() {
        return this._onDidExecuteTask.event;
    }
    async $onDidStartTask(execution, terminalId, resolvedDefinition) {
        const customExecution = this._providedCustomExecutions2.get(execution.id);
        if (customExecution) {
            // Clone the custom execution to keep the original untouched. This is important for multiple runs of the same task.
            this._activeCustomExecutions2.set(execution.id, customExecution);
            this._terminalService.attachPtyToTerminal(terminalId, await customExecution.callback(resolvedDefinition));
        }
        this._lastStartedTask = execution.id;
        const taskExecution = await this.getTaskExecution(execution);
        const terminal = this._terminalService.getTerminalById(terminalId)?.value;
        if (taskExecution) {
            taskExecution.terminal = terminal;
        }
        this._onDidExecuteTask.fire({
            execution: taskExecution
        });
    }
    get onDidEndTask() {
        return this._onDidTerminateTask.event;
    }
    async $OnDidEndTask(execution) {
        if (!this._taskExecutionPromises.has(execution.id)) {
            // Event already fired by the main thread
            // See https://github.com/microsoft/vscode/commit/aaf73920aeae171096d205efb2c58804a32b6846
            return;
        }
        const _execution = await this.getTaskExecution(execution);
        this._taskExecutionPromises.delete(execution.id);
        this._taskExecutions.delete(execution.id);
        this.customExecutionComplete(execution);
        this._onDidTerminateTask.fire({
            execution: _execution
        });
    }
    get onDidStartTaskProcess() {
        return this._onDidTaskProcessStarted.event;
    }
    async $onDidStartTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessStarted.fire({
            execution: execution,
            processId: value.processId
        });
    }
    get onDidEndTaskProcess() {
        return this._onDidTaskProcessEnded.event;
    }
    async $onDidEndTaskProcess(value) {
        const execution = await this.getTaskExecution(value.id);
        this._onDidTaskProcessEnded.fire({
            execution: execution,
            exitCode: value.exitCode
        });
    }
    get onDidStartTaskProblemMatchers() {
        return this._onDidStartTaskProblemMatchers.event;
    }
    async $onDidStartTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidStartTaskProblemMatchers.fire({ execution });
    }
    get onDidEndTaskProblemMatchers() {
        return this._onDidEndTaskProblemMatchers.event;
    }
    async $onDidEndTaskProblemMatchers(value) {
        let execution;
        try {
            execution = await this.getTaskExecution(value.execution.id);
        }
        catch (error) {
            // The task execution is not available anymore
            return;
        }
        this._onDidEndTaskProblemMatchers.fire({ execution, hasErrors: value.hasErrors });
    }
    $provideTasks(handle, validTypes) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        // Set up a list of task ID promises that we can wait on
        // before returning the provided tasks. The ensures that
        // our task IDs are calculated for any custom execution tasks.
        // Knowing this ID ahead of time is needed because when a task
        // start event is fired this is when the custom execution is called.
        // The task start event is also the first time we see the ID from the main
        // thread, which is too late for us because we need to save an map
        // from an ID to the custom execution function. (Kind of a cart before the horse problem).
        const taskIdPromises = [];
        const fetchPromise = asPromise(() => handler.provider.provideTasks(CancellationToken.None)).then(value => {
            return this.provideTasksInternal(validTypes, taskIdPromises, handler, value);
        });
        return new Promise((resolve) => {
            fetchPromise.then((result) => {
                Promise.all(taskIdPromises).then(() => {
                    resolve(result);
                });
            });
        });
    }
    async $resolveTask(handle, taskDTO) {
        const handler = this._handlers.get(handle);
        if (!handler) {
            return Promise.reject(new Error('no handler found'));
        }
        if (taskDTO.definition.type !== handler.type) {
            throw new Error(`Unexpected: Task of type [${taskDTO.definition.type}] cannot be resolved by provider of type [${handler.type}].`);
        }
        const task = await TaskDTO.to(taskDTO, this._workspaceProvider, this._providedCustomExecutions2);
        if (!task) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        const resolvedTask = await handler.provider.resolveTask(task, CancellationToken.None);
        if (!resolvedTask) {
            return;
        }
        this.checkDeprecation(resolvedTask, handler);
        const resolvedTaskDTO = TaskDTO.from(resolvedTask, handler.extension);
        if (!resolvedTaskDTO) {
            throw new Error('Unexpected: Task cannot be resolved.');
        }
        if (resolvedTask.definition !== task.definition) {
            throw new Error('Unexpected: The resolved task definition must be the same object as the original task definition. The task definition cannot be changed.');
        }
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            await this.addCustomExecution(resolvedTaskDTO, resolvedTask, true);
        }
        return await this.resolveTaskInternal(resolvedTaskDTO);
    }
    nextHandle() {
        return this._handleCounter++;
    }
    async addCustomExecution(taskDTO, task, isProvided) {
        const taskId = await this._proxy.$createTaskId(taskDTO);
        if (!isProvided && !this._providedCustomExecutions2.has(taskId)) {
            this._notProvidedCustomExecutions.add(taskId);
            // Also add to active executions when not coming from a provider to prevent timing issue.
            this._activeCustomExecutions2.set(taskId, task.execution);
        }
        this._providedCustomExecutions2.set(taskId, task.execution);
    }
    async getTaskExecution(execution, task) {
        if (typeof execution === 'string') {
            const taskExecution = this._taskExecutionPromises.get(execution);
            if (!taskExecution) {
                throw new ErrorNoTelemetry('Unexpected: The specified task is missing an execution');
            }
            return taskExecution;
        }
        const result = this._taskExecutionPromises.get(execution.id);
        if (result) {
            return result;
        }
        let executionPromise;
        if (!task) {
            executionPromise = TaskDTO.to(execution.task, this._workspaceProvider, this._providedCustomExecutions2).then(t => {
                if (!t) {
                    throw new ErrorNoTelemetry('Unexpected: Task does not exist.');
                }
                return new TaskExecutionImpl(this, execution.id, t);
            });
        }
        else {
            executionPromise = Promise.resolve(new TaskExecutionImpl(this, execution.id, task));
        }
        this._taskExecutionPromises.set(execution.id, executionPromise);
        return executionPromise.then(taskExecution => {
            this._taskExecutions.set(execution.id, taskExecution);
            return taskExecution;
        });
    }
    checkDeprecation(task, handler) {
        const tTask = task;
        if (tTask._deprecated) {
            this._deprecationService.report('Task.constructor', handler.extension, 'Use the Task constructor that takes a `scope` instead.');
        }
    }
    customExecutionComplete(execution) {
        const extensionCallback2 = this._activeCustomExecutions2.get(execution.id);
        if (extensionCallback2) {
            this._activeCustomExecutions2.delete(execution.id);
        }
        // Technically we don't really need to do this, however, if an extension
        // is executing a task through "executeTask" over and over again
        // with different properties in the task definition, then the map of executions
        // could grow indefinitely, something we don't want.
        if (this._notProvidedCustomExecutions.has(execution.id) && (this._lastStartedTask !== execution.id)) {
            this._providedCustomExecutions2.delete(execution.id);
            this._notProvidedCustomExecutions.delete(execution.id);
        }
        const iterator = this._notProvidedCustomExecutions.values();
        let iteratorResult = iterator.next();
        while (!iteratorResult.done) {
            if (!this._activeCustomExecutions2.has(iteratorResult.value) && (this._lastStartedTask !== iteratorResult.value)) {
                this._providedCustomExecutions2.delete(iteratorResult.value);
                this._notProvidedCustomExecutions.delete(iteratorResult.value);
            }
            iteratorResult = iterator.next();
        }
    }
};
ExtHostTaskBase = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], ExtHostTaskBase);
export { ExtHostTaskBase };
let WorkerExtHostTask = class WorkerExtHostTask extends ExtHostTaskBase {
    constructor(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService) {
        super(extHostRpc, initData, workspaceService, editorService, configurationService, extHostTerminalService, logService, deprecationService);
        this.registerTaskSystem(Schemas.vscodeRemote, {
            scheme: Schemas.vscodeRemote,
            authority: '',
            platform: Platform.PlatformToString(0 /* Platform.Platform.Web */)
        });
    }
    async executeTask(extension, task) {
        if (!task.execution) {
            throw new Error('Tasks to execute must include an execution');
        }
        const dto = TaskDTO.from(task, extension);
        if (dto === undefined) {
            throw new Error('Task is not valid');
        }
        // If this task is a custom execution, then we need to save it away
        // in the provided custom execution map that is cleaned up after the
        // task is executed.
        if (CustomExecutionDTO.is(dto.execution)) {
            await this.addCustomExecution(dto, task, false);
        }
        else {
            throw new NotSupportedError();
        }
        // Always get the task execution first to prevent timing issues when retrieving it later
        const execution = await this.getTaskExecution(await this._proxy.$getTaskExecution(dto), task);
        this._proxy.$executeTask(dto).catch(error => { throw new Error(error); });
        return execution;
    }
    provideTasksInternal(validTypes, taskIdPromises, handler, value) {
        const taskDTOs = [];
        if (value) {
            for (const task of value) {
                this.checkDeprecation(task, handler);
                if (!task.definition || !validTypes[task.definition.type]) {
                    const source = task.source ? task.source : 'No task source';
                    this._logService.warn(`The task [${source}, ${task.name}] uses an undefined task type. The task will be ignored in the future.`);
                }
                const taskDTO = TaskDTO.from(task, handler.extension);
                if (taskDTO && CustomExecutionDTO.is(taskDTO.execution)) {
                    taskDTOs.push(taskDTO);
                    // The ID is calculated on the main thread task side, so, let's call into it here.
                    // We need the task id's pre-computed for custom task executions because when OnDidStartTask
                    // is invoked, we have to be able to map it back to our data.
                    taskIdPromises.push(this.addCustomExecution(taskDTO, task, true));
                }
                else {
                    this._logService.warn('Only custom execution tasks supported.');
                }
            }
        }
        return {
            tasks: taskDTOs,
            extension: handler.extension
        };
    }
    async resolveTaskInternal(resolvedTaskDTO) {
        if (CustomExecutionDTO.is(resolvedTaskDTO.execution)) {
            return resolvedTaskDTO;
        }
        else {
            this._logService.warn('Only custom execution tasks supported.');
        }
        return undefined;
    }
    async $resolveVariables(uriComponents, toResolve) {
        const result = {
            process: undefined,
            variables: Object.create(null)
        };
        return result;
    }
    async $jsonTasksSupported() {
        return false;
    }
    async $findExecutable(command, cwd, paths) {
        return undefined;
    }
};
WorkerExtHostTask = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWorkspace),
    __param(3, IExtHostDocumentsAndEditors),
    __param(4, IExtHostConfiguration),
    __param(5, IExtHostTerminalService),
    __param(6, ILogService),
    __param(7, IExtHostApiDeprecationService)
], WorkerExtHostTask);
export { WorkerExtHostTask };
export const IExtHostTask = createDecorator('IExtHostTask');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRhc2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUYXNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsT0FBTyxFQUFFLFdBQVcsRUFBeUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRixPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUdyRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQXNCekQsSUFBVSxpQkFBaUIsQ0FhMUI7QUFiRCxXQUFVLGlCQUFpQjtJQUMxQixTQUFnQixJQUFJLENBQUMsS0FBNEI7UUFDaEQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBTGUsc0JBQUksT0FLbkIsQ0FBQTtJQUNELFNBQWdCLEVBQUUsQ0FBQyxLQUErQjtRQUNqRCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFMZSxvQkFBRSxLQUtqQixDQUFBO0FBQ0YsQ0FBQyxFQWJTLGlCQUFpQixLQUFqQixpQkFBaUIsUUFhMUI7QUFFRCxJQUFVLDBCQUEwQixDQWFuQztBQWJELFdBQVUsMEJBQTBCO0lBQ25DLFNBQWdCLElBQUksQ0FBQyxLQUFxQztRQUN6RCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFMZSwrQkFBSSxPQUtuQixDQUFBO0lBQ0QsU0FBZ0IsRUFBRSxDQUFDLEtBQXdDO1FBQzFELElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUxlLDZCQUFFLEtBS2pCLENBQUE7QUFDRixDQUFDLEVBYlMsMEJBQTBCLEtBQTFCLDBCQUEwQixRQWFuQztBQUVELElBQVUsMEJBQTBCLENBYW5DO0FBYkQsV0FBVSwwQkFBMEI7SUFDbkMsU0FBZ0IsSUFBSSxDQUFDLEtBQXFDO1FBQ3pELElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUxlLCtCQUFJLE9BS25CLENBQUE7SUFDRCxTQUFnQixFQUFFLENBQUMsS0FBd0M7UUFDMUQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBTGUsNkJBQUUsS0FLakIsQ0FBQTtBQUNGLENBQUMsRUFiUywwQkFBMEIsS0FBMUIsMEJBQTBCLFFBYW5DO0FBRUQsSUFBVSxtQkFBbUIsQ0E0QjVCO0FBNUJELFdBQVUsbUJBQW1CO0lBQzVCLFNBQWdCLEVBQUUsQ0FBQyxLQUFvRztRQUN0SCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxTQUFTLEdBQUcsS0FBbUMsQ0FBQztZQUN0RCxPQUFPLFNBQVMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztRQUN6QyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFQZSxzQkFBRSxLQU9qQixDQUFBO0lBQ0QsU0FBZ0IsSUFBSSxDQUFDLEtBQThCO1FBQ2xELElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUErQjtZQUMxQyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1NBQ2hCLENBQUM7UUFDRixJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixNQUFNLENBQUMsT0FBTyxHQUFHLDBCQUEwQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQVplLHdCQUFJLE9BWW5CLENBQUE7SUFDRCxTQUFnQixFQUFFLENBQUMsS0FBaUM7UUFDbkQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFMZSxzQkFBRSxLQUtqQixDQUFBO0FBQ0YsQ0FBQyxFQTVCUyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBNEI1QjtBQUVELElBQVUsd0JBQXdCLENBYWpDO0FBYkQsV0FBVSx3QkFBd0I7SUFDakMsU0FBZ0IsSUFBSSxDQUFDLEtBQW1DO1FBQ3ZELElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUxlLDZCQUFJLE9BS25CLENBQUE7SUFDRCxTQUFnQixFQUFFLENBQUMsS0FBc0M7UUFDeEQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBTGUsMkJBQUUsS0FLakIsQ0FBQTtBQUNGLENBQUMsRUFiUyx3QkFBd0IsS0FBeEIsd0JBQXdCLFFBYWpDO0FBRUQsSUFBVSxpQkFBaUIsQ0FvQzFCO0FBcENELFdBQVUsaUJBQWlCO0lBQzFCLFNBQWdCLEVBQUUsQ0FBQyxLQUFvRztRQUN0SCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsTUFBTSxTQUFTLEdBQUcsS0FBaUMsQ0FBQztZQUNwRCxPQUFPLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBUGUsb0JBQUUsS0FPakIsQ0FBQTtJQUNELFNBQWdCLElBQUksQ0FBQyxLQUE0QjtRQUNoRCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBNkIsRUFDeEMsQ0FBQztRQUNGLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNyQyxNQUFNLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzFCLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixNQUFNLENBQUMsT0FBTyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQWhCZSxzQkFBSSxPQWdCbkIsQ0FBQTtJQUNELFNBQWdCLEVBQUUsQ0FBQyxLQUErQjtRQUNqRCxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMvRyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsT0FBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUYsQ0FBQztJQUNGLENBQUM7SUFUZSxvQkFBRSxLQVNqQixDQUFBO0FBQ0YsQ0FBQyxFQXBDUyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBb0MxQjtBQUVELE1BQU0sS0FBVyxrQkFBa0IsQ0FtQmxDO0FBbkJELFdBQWlCLGtCQUFrQjtJQUNsQyxTQUFnQixFQUFFLENBQUMsS0FBb0c7UUFDdEgsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sU0FBUyxHQUFHLEtBQWtDLENBQUM7WUFDckQsT0FBTyxTQUFTLElBQUksU0FBUyxDQUFDLGVBQWUsS0FBSyxpQkFBaUIsQ0FBQztRQUNyRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFQZSxxQkFBRSxLQU9qQixDQUFBO0lBRUQsU0FBZ0IsSUFBSSxDQUFDLEtBQTZCO1FBQ2pELE9BQU87WUFDTixlQUFlLEVBQUUsaUJBQWlCO1NBQ2xDLENBQUM7SUFDSCxDQUFDO0lBSmUsdUJBQUksT0FJbkIsQ0FBQTtJQUVELFNBQWdCLEVBQUUsQ0FBQyxNQUFjLEVBQUUsdUJBQTJEO1FBQzdGLE9BQU8sdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFGZSxxQkFBRSxLQUVqQixDQUFBO0FBQ0YsQ0FBQyxFQW5CZ0Isa0JBQWtCLEtBQWxCLGtCQUFrQixRQW1CbEM7QUFHRCxNQUFNLEtBQVcsYUFBYSxDQWlCN0I7QUFqQkQsV0FBaUIsYUFBYTtJQUM3QixTQUFnQixJQUFJLENBQUMsS0FBaUIsRUFBRSxnQkFBb0M7UUFDM0UsSUFBSSxNQUE4QixDQUFDO1FBQ25DLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxTQUFTLElBQUksT0FBTyxLQUFLLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xFLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUMxQixDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdkcsTUFBTSxHQUFHLGdCQUFnQixDQUFDLGFBQWEsQ0FBQztZQUN6QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLG9CQUFvQixDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTztZQUNOLEVBQUUsRUFBRSxLQUFLLENBQUMsR0FBSTtZQUNkLGVBQWUsRUFBRSxNQUFPO1NBQ3hCLENBQUM7SUFDSCxDQUFDO0lBZmUsa0JBQUksT0FlbkIsQ0FBQTtBQUNGLENBQUMsRUFqQmdCLGFBQWEsS0FBYixhQUFhLFFBaUI3QjtBQUNELElBQVUsWUFBWSxDQU9yQjtBQVBELFdBQVUsWUFBWTtJQUNyQixTQUFnQixJQUFJLENBQUMsS0FBdUI7UUFDM0MsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdEQsQ0FBQztJQUxlLGlCQUFJLE9BS25CLENBQUE7QUFDRixDQUFDLEVBUFMsWUFBWSxLQUFaLFlBQVksUUFPckI7QUFFRCxNQUFNLEtBQVcsT0FBTyxDQW1IdkI7QUFuSEQsV0FBaUIsT0FBTztJQUN2QixTQUFnQixRQUFRLENBQUMsS0FBb0IsRUFBRSxTQUFnQztRQUM5RSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFxQixFQUFFLENBQUM7UUFDcEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQVplLGdCQUFRLFdBWXZCLENBQUE7SUFFRCxTQUFnQixJQUFJLENBQUMsS0FBa0IsRUFBRSxTQUFnQztRQUN4RSxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxJQUFJLFNBQXdHLENBQUM7UUFDN0csSUFBSSxLQUFLLENBQUMsU0FBUyxZQUFZLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZELFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLFlBQVksS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzVELFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxJQUFJLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLFNBQVMsWUFBWSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDaEYsU0FBUyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBd0IsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBeUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRyxJQUFJLEtBQTZCLENBQUM7UUFDbEMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3JDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ3JCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsOEdBQThHO1lBQzlHLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBbUI7WUFDOUIsR0FBRyxFQUFHLEtBQW9CLENBQUMsR0FBSTtZQUMvQixVQUFVO1lBQ1YsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRTtnQkFDUCxXQUFXLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLO2dCQUN2QyxLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU07Z0JBQ25CLEtBQUssRUFBRSxLQUFLO2FBQ1o7WUFDRCxTQUFTLEVBQUUsU0FBVTtZQUNyQixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7WUFDaEMsS0FBSyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQXlCLENBQUM7WUFDekQsbUJBQW1CLEVBQUUsMEJBQTBCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQztZQUMvRSxlQUFlLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7WUFDL0Msa0JBQWtCLEVBQUcsS0FBb0IsQ0FBQyxrQkFBa0I7WUFDNUQsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFO1lBQzdFLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtTQUNwQixDQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBL0NlLFlBQUksT0ErQ25CLENBQUE7SUFDTSxLQUFLLFVBQVUsRUFBRSxDQUFDLEtBQWlDLEVBQUUsU0FBb0MsRUFBRSx1QkFBMkQ7UUFDNUosSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsSUFBSSxTQUE0RixDQUFDO1FBQ2pHLElBQUksbUJBQW1CLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzdDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7YUFBTSxJQUFJLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxTQUFTLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxDQUFDO2FBQU0sSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbkQsU0FBUyxHQUFHLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFzQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdGLElBQUksS0FBZ0csQ0FBQztRQUNyRyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQzVDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDNUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssR0FBRyxNQUFNLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDaEYsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwSCxJQUFJLEtBQUssQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsTUFBTSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDL0IsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JELElBQUksTUFBTSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN4RSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztnQkFDaEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsbUJBQW1CLEdBQUcsMEJBQTBCLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBRSxDQUFDO1FBQ3hGLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUN4QixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzlCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFuRHFCLFVBQUUsS0FtRHZCLENBQUE7QUFDRixDQUFDLEVBbkhnQixPQUFPLEtBQVAsT0FBTyxRQW1IdkI7QUFFRCxJQUFVLGFBQWEsQ0FXdEI7QUFYRCxXQUFVLGFBQWE7SUFDdEIsU0FBZ0IsSUFBSSxDQUFDLEtBQW9DO1FBQ3hELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUZlLGtCQUFJLE9BRW5CLENBQUE7SUFFRCxTQUFnQixFQUFFLENBQUMsS0FBMkI7UUFDN0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFMZSxnQkFBRSxLQUtqQixDQUFBO0FBQ0YsQ0FBQyxFQVhTLGFBQWEsS0FBYixhQUFhLFFBV3RCO0FBRUQsTUFBTSxpQkFBaUI7SUFFYixNQUFNLENBQWtCO0lBR2pDLFlBQVksS0FBc0IsRUFBVyxHQUFXLEVBQW1CLEtBQWtCO1FBQWhELFFBQUcsR0FBSCxHQUFHLENBQVE7UUFBbUIsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUM1RixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBVyxJQUFJO1FBQ2QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFTSxTQUFTO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVNLG1CQUFtQixDQUFDLEtBQW1DO0lBQzlELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQztJQUMxRCxDQUFDO0lBRUQsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBVyxRQUFRLENBQUMsSUFBaUM7UUFDcEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDdkIsQ0FBQztDQUNEO0FBUU0sSUFBZSxlQUFlLEdBQTlCLE1BQWUsZUFBZTtJQTBCcEMsWUFDcUIsVUFBOEIsRUFDekIsUUFBaUMsRUFDdkMsZ0JBQW1DLEVBQ3pCLGFBQTBDLEVBQ2hELG9CQUEyQyxFQUN6QyxzQkFBK0MsRUFDM0QsVUFBdUIsRUFDTCxrQkFBaUQ7UUFoQjlELHNCQUFpQixHQUFtQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQztRQUN6Rix3QkFBbUIsR0FBaUMsSUFBSSxPQUFPLEVBQXVCLENBQUM7UUFFdkYsNkJBQXdCLEdBQTBDLElBQUksT0FBTyxFQUFnQyxDQUFDO1FBQzlHLDJCQUFzQixHQUF3QyxJQUFJLE9BQU8sRUFBOEIsQ0FBQztRQUN4RyxtQ0FBOEIsR0FBbUQsSUFBSSxPQUFPLEVBQXlDLENBQUM7UUFDdEksaUNBQTRCLEdBQWlELElBQUksT0FBTyxFQUF1QyxDQUFDO1FBWWxKLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDO1FBQzNDLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFDO1FBQ3BDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7UUFDL0MsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUNoRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBQzVELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztRQUM1RSxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7UUFDM0UsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDdEQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksR0FBRyxFQUFpQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQztRQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxTQUFnQyxFQUFFLElBQVksRUFBRSxRQUE2QjtRQUN4RyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRCxPQUFPLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxNQUFjLEVBQUUsSUFBOEI7UUFDdkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVNLFVBQVUsQ0FBQyxNQUEwQjtRQUMzQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hGLE1BQU0sTUFBTSxHQUFrQixFQUFFLENBQUM7WUFDakMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7Z0JBQy9GLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ1YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkIsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUlELElBQVcsY0FBYztRQUN4QixNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFDO1FBQzFDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzFELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxTQUErQjtRQUNuRCxJQUFJLENBQUMsQ0FBQyxTQUFTLFlBQVksaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBRSxTQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFRCxJQUFXLGNBQWM7UUFDeEIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQWtDLEVBQUUsVUFBa0IsRUFBRSxrQkFBNEM7UUFDaEksTUFBTSxlQUFlLEdBQXNDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdHLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsbUhBQW1IO1lBQ25ILElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDM0csQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBRXJDLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDO1FBQzFFLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsYUFBYSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7WUFDM0IsU0FBUyxFQUFFLGFBQWE7U0FDeEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7SUFDdkMsQ0FBQztJQUVNLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBa0M7UUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDcEQseUNBQXlDO1lBQ3pDLDBGQUEwRjtZQUMxRixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQztZQUM3QixTQUFTLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsSUFBVyxxQkFBcUI7UUFDL0IsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO0lBQzVDLENBQUM7SUFFTSxLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBbUM7UUFDdEUsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUM7WUFDbEMsU0FBUyxFQUFFLFNBQVM7WUFDcEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1NBQzFCLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFXLG1CQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztJQUVNLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFpQztRQUNsRSxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQztZQUNoQyxTQUFTLEVBQUUsU0FBUztZQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDeEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQVcsNkJBQTZCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQztJQUNsRCxDQUFDO0lBRU0sS0FBSyxDQUFDLDhCQUE4QixDQUFDLEtBQW9DO1FBQy9FLElBQUksU0FBUyxDQUFDO1FBQ2QsSUFBSSxDQUFDO1lBQ0osU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsOENBQThDO1lBQzlDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELElBQVcsMkJBQTJCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUNoRCxDQUFDO0lBRU0sS0FBSyxDQUFDLDRCQUE0QixDQUFDLEtBQWtDO1FBQzNFLElBQUksU0FBUyxDQUFDO1FBQ2QsSUFBSSxDQUFDO1lBQ0osU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsOENBQThDO1lBQzlDLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUlNLGFBQWEsQ0FBQyxNQUFjLEVBQUUsVUFBc0M7UUFDMUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELHdEQUF3RDtRQUN4RCw4REFBOEQ7UUFDOUQsOERBQThEO1FBQzlELG9FQUFvRTtRQUNwRSwwRUFBMEU7UUFDMUUsa0VBQWtFO1FBQ2xFLDBGQUEwRjtRQUMxRixNQUFNLGNBQWMsR0FBb0IsRUFBRSxDQUFDO1FBQzNDLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN4RyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUM5QixZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDckMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqQixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBSU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFjLEVBQUUsT0FBdUI7UUFDaEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLDZDQUE2QyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztRQUNwSSxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDakcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0RixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbkIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTdDLE1BQU0sZUFBZSxHQUErQixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsSUFBSSxZQUFZLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLDBJQUEwSSxDQUFDLENBQUM7UUFDN0osQ0FBQztRQUVELElBQUksa0JBQWtCLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELE9BQU8sTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUlPLFVBQVU7UUFDakIsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVTLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUF1QixFQUFFLElBQWlCLEVBQUUsVUFBbUI7UUFDakcsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUMseUZBQXlGO1lBQ3pGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUF5QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEYsQ0FBQztRQUNELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUF5QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVTLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUEyQyxFQUFFLElBQWtCO1FBQy9GLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1lBQ3RGLENBQUM7WUFDRCxPQUFPLGFBQWEsQ0FBQztRQUN0QixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQTJDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JHLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUM7UUFFRCxJQUFJLGdCQUE0QyxDQUFDO1FBQ2pELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNoSCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ1IsTUFBTSxJQUFJLGdCQUFnQixDQUFDLGtDQUFrQyxDQUFDLENBQUM7Z0JBQ2hFLENBQUM7Z0JBQ0QsT0FBTyxJQUFJLGlCQUFpQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JELENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDUCxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDaEUsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN0RCxPQUFPLGFBQWEsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUyxnQkFBZ0IsQ0FBQyxJQUFpQixFQUFFLE9BQW9CO1FBQ2pFLE1BQU0sS0FBSyxHQUFJLElBQW1CLENBQUM7UUFDbkMsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLHdEQUF3RCxDQUFDLENBQUM7UUFDbEksQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxTQUFrQztRQUNqRSxNQUFNLGtCQUFrQixHQUF1QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELHdFQUF3RTtRQUN4RSxnRUFBZ0U7UUFDaEUsK0VBQStFO1FBQy9FLG9EQUFvRDtRQUNwRCxJQUFJLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixLQUFLLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3JHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDNUQsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixLQUFLLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsSCxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEUsQ0FBQztZQUNELGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7Q0FLRCxDQUFBO0FBOVZxQixlQUFlO0lBMkJsQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNkJBQTZCLENBQUE7R0FsQ1YsZUFBZSxDQThWcEM7O0FBRU0sSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxlQUFlO0lBQ3JELFlBQ3FCLFVBQThCLEVBQ3pCLFFBQWlDLEVBQ3ZDLGdCQUFtQyxFQUN6QixhQUEwQyxFQUNoRCxvQkFBMkMsRUFDekMsc0JBQStDLEVBQzNELFVBQXVCLEVBQ0wsa0JBQWlEO1FBRWhGLEtBQUssQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxvQkFBb0IsRUFBRSxzQkFBc0IsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtZQUM3QyxNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDNUIsU0FBUyxFQUFFLEVBQUU7WUFDYixRQUFRLEVBQUUsUUFBUSxDQUFDLGdCQUFnQiwrQkFBdUI7U0FDMUQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEtBQUssQ0FBQyxXQUFXLENBQUMsU0FBZ0MsRUFBRSxJQUFpQjtRQUMzRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUsb0VBQW9FO1FBQ3BFLG9CQUFvQjtRQUNwQixJQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDL0IsQ0FBQztRQUVELHdGQUF3RjtRQUN4RixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsTUFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFUyxvQkFBb0IsQ0FBQyxVQUFzQyxFQUFFLGNBQStCLEVBQUUsT0FBb0IsRUFBRSxLQUF1QztRQUNwSyxNQUFNLFFBQVEsR0FBcUIsRUFBRSxDQUFDO1FBQ3RDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO29CQUM1RCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLE1BQU0sS0FBSyxJQUFJLENBQUMsSUFBSSx3RUFBd0UsQ0FBQyxDQUFDO2dCQUNsSSxDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUErQixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2xGLElBQUksT0FBTyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDekQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDdkIsa0ZBQWtGO29CQUNsRiw0RkFBNEY7b0JBQzVGLDZEQUE2RDtvQkFDN0QsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNuRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsQ0FBQztnQkFDakUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTztZQUNOLEtBQUssRUFBRSxRQUFRO1lBQ2YsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1NBQzVCLENBQUM7SUFDSCxDQUFDO0lBRVMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLGVBQStCO1FBQ2xFLElBQUksa0JBQWtCLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3RELE9BQU8sZUFBZSxDQUFDO1FBQ3hCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxhQUE0QixFQUFFLFNBQTJGO1FBQ3ZKLE1BQU0sTUFBTSxHQUFHO1lBQ2QsT0FBTyxFQUFXLFNBQW1CO1lBQ3JDLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztTQUM5QixDQUFDO1FBQ0YsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU0sS0FBSyxDQUFDLG1CQUFtQjtRQUMvQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTSxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQWUsRUFBRSxHQUF3QixFQUFFLEtBQTRCO1FBQ25HLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7Q0FDRCxDQUFBO0FBaEdZLGlCQUFpQjtJQUUzQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNkJBQTZCLENBQUE7R0FUbkIsaUJBQWlCLENBZ0c3Qjs7QUFFRCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFlLGNBQWMsQ0FBQyxDQUFDIn0=