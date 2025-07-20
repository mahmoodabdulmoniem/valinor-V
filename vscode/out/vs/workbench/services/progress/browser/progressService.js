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
import './media/progressService.css';
import { localize } from '../../../../nls.js';
import { dispose, DisposableStore, Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IProgressService, Progress } from '../../../../platform/progress/common/progress.js';
import { IStatusbarService } from '../../statusbar/browser/statusbar.js';
import { DeferredPromise, RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { ProgressBadge, IActivityService } from '../../activity/common/activity.js';
import { INotificationService, Severity, NotificationPriority, isNotificationSource, NotificationsFilter } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../views/common/viewsService.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { IUserActivityService } from '../../userActivity/common/userActivityService.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
let ProgressService = class ProgressService extends Disposable {
    constructor(activityService, paneCompositeService, viewDescriptorService, viewsService, notificationService, statusbarService, layoutService, keybindingService, userActivityService) {
        super();
        this.activityService = activityService;
        this.paneCompositeService = paneCompositeService;
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.notificationService = notificationService;
        this.statusbarService = statusbarService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.userActivityService = userActivityService;
        this.windowProgressStack = [];
        this.windowProgressStatusEntry = undefined;
    }
    async withProgress(options, originalTask, onDidCancel) {
        const { location } = options;
        const task = async (progress) => {
            const activeLock = this.userActivityService.markActive({ extendOnly: true, whenHeldFor: 15_000 });
            try {
                return await originalTask(progress);
            }
            finally {
                activeLock.dispose();
            }
        };
        const handleStringLocation = (location) => {
            const viewContainer = this.viewDescriptorService.getViewContainerById(location);
            if (viewContainer) {
                const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
                if (viewContainerLocation !== null) {
                    return this.withPaneCompositeProgress(location, viewContainerLocation, task, { ...options, location });
                }
            }
            if (this.viewDescriptorService.getViewDescriptorById(location) !== null) {
                return this.withViewProgress(location, task, { ...options, location });
            }
            throw new Error(`Bad progress location: ${location}`);
        };
        if (typeof location === 'string') {
            return handleStringLocation(location);
        }
        switch (location) {
            case 15 /* ProgressLocation.Notification */: {
                let priority = options.priority;
                if (priority !== NotificationPriority.URGENT) {
                    if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                    else if (isNotificationSource(options.source) && this.notificationService.getFilter(options.source) === NotificationsFilter.ERROR) {
                        priority = NotificationPriority.SILENT;
                    }
                }
                return this.withNotificationProgress({ ...options, location, priority }, task, onDidCancel);
            }
            case 10 /* ProgressLocation.Window */: {
                const type = options.type;
                if (options.command) {
                    // Window progress with command get's shown in the status bar
                    return this.withWindowProgress({ ...options, location, type }, task);
                }
                // Window progress without command can be shown as silent notification
                // which will first appear in the status bar and can then be brought to
                // the front when clicking.
                return this.withNotificationProgress({ delay: 150 /* default for ProgressLocation.Window */, ...options, priority: NotificationPriority.SILENT, location: 15 /* ProgressLocation.Notification */, type }, task, onDidCancel);
            }
            case 1 /* ProgressLocation.Explorer */:
                return this.withPaneCompositeProgress('workbench.view.explorer', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 3 /* ProgressLocation.Scm */:
                return handleStringLocation('workbench.scm');
            case 5 /* ProgressLocation.Extensions */:
                return this.withPaneCompositeProgress('workbench.view.extensions', 0 /* ViewContainerLocation.Sidebar */, task, { ...options, location });
            case 20 /* ProgressLocation.Dialog */:
                return this.withDialogProgress(options, task, onDidCancel);
            default:
                throw new Error(`Bad progress location: ${location}`);
        }
    }
    withWindowProgress(options, callback) {
        const task = [options, new Progress(() => this.updateWindowProgress())];
        const promise = callback(task[1]);
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            this.windowProgressStack.unshift(task);
            this.updateWindowProgress();
            // show progress for at least 150ms
            Promise.all([
                timeout(150),
                promise
            ]).finally(() => {
                const idx = this.windowProgressStack.indexOf(task);
                this.windowProgressStack.splice(idx, 1);
                this.updateWindowProgress();
            });
        }, 150);
        // cancel delay if promise finishes below 150ms
        return promise.finally(() => clearTimeout(delayHandle));
    }
    updateWindowProgress(idx = 0) {
        // We still have progress to show
        if (idx < this.windowProgressStack.length) {
            const [options, progress] = this.windowProgressStack[idx];
            const progressTitle = options.title;
            const progressMessage = progress.value && progress.value.message;
            const progressCommand = options.command;
            let text;
            let title;
            const source = options.source && typeof options.source !== 'string' ? options.source.label : options.source;
            if (progressTitle && progressMessage) {
                // <title>: <message>
                text = localize('progress.text2', "{0}: {1}", progressTitle, progressMessage);
                title = source ? localize('progress.title3', "[{0}] {1}: {2}", source, progressTitle, progressMessage) : text;
            }
            else if (progressTitle) {
                // <title>
                text = progressTitle;
                title = source ? localize('progress.title2', "[{0}]: {1}", source, progressTitle) : text;
            }
            else if (progressMessage) {
                // <message>
                text = progressMessage;
                title = source ? localize('progress.title2', "[{0}]: {1}", source, progressMessage) : text;
            }
            else {
                // no title, no message -> no progress. try with next on stack
                this.updateWindowProgress(idx + 1);
                return;
            }
            const statusEntryProperties = {
                name: localize('status.progress', "Progress Message"),
                text,
                showProgress: options.type || true,
                ariaLabel: text,
                tooltip: stripIcons(title).trim(),
                command: progressCommand
            };
            if (this.windowProgressStatusEntry) {
                this.windowProgressStatusEntry.update(statusEntryProperties);
            }
            else {
                this.windowProgressStatusEntry = this.statusbarService.addEntry(statusEntryProperties, 'status.progress', 0 /* StatusbarAlignment.LEFT */, -Number.MAX_VALUE /* almost last entry */);
            }
        }
        // Progress is done so we remove the status entry
        else {
            this.windowProgressStatusEntry?.dispose();
            this.windowProgressStatusEntry = undefined;
        }
    }
    withNotificationProgress(options, callback, onDidCancel) {
        const progressStateModel = new class extends Disposable {
            get step() { return this._step; }
            get done() { return this._done; }
            constructor() {
                super();
                this._onDidReport = this._register(new Emitter());
                this.onDidReport = this._onDidReport.event;
                this._onWillDispose = this._register(new Emitter());
                this.onWillDispose = this._onWillDispose.event;
                this._step = undefined;
                this._done = false;
                this.promise = callback(this);
                this.promise.finally(() => {
                    this.dispose();
                });
            }
            report(step) {
                this._step = step;
                this._onDidReport.fire(step);
            }
            cancel(choice) {
                onDidCancel?.(choice);
                this.dispose();
            }
            dispose() {
                this._done = true;
                this._onWillDispose.fire();
                super.dispose();
            }
        };
        const createWindowProgress = () => {
            // Create a promise that we can resolve as needed
            // when the outside calls dispose on us
            const promise = new DeferredPromise();
            this.withWindowProgress({
                location: 10 /* ProgressLocation.Window */,
                title: options.title ? parseLinkedText(options.title).toString() : undefined, // convert markdown links => string
                command: 'notifications.showList',
                type: options.type
            }, progress => {
                function reportProgress(step) {
                    if (step.message) {
                        progress.report({
                            message: parseLinkedText(step.message).toString() // convert markdown links => string
                        });
                    }
                }
                // Apply any progress that was made already
                if (progressStateModel.step) {
                    reportProgress(progressStateModel.step);
                }
                // Continue to report progress as it happens
                const onDidReportListener = progressStateModel.onDidReport(step => reportProgress(step));
                promise.p.finally(() => onDidReportListener.dispose());
                // When the progress model gets disposed, we are done as well
                Event.once(progressStateModel.onWillDispose)(() => promise.complete());
                return promise.p;
            });
            // Dispose means completing our promise
            return toDisposable(() => promise.complete());
        };
        const createNotification = (message, priority, increment) => {
            const notificationDisposables = new DisposableStore();
            const primaryActions = options.primaryActions ? Array.from(options.primaryActions) : [];
            const secondaryActions = options.secondaryActions ? Array.from(options.secondaryActions) : [];
            if (options.buttons) {
                options.buttons.forEach((button, index) => {
                    const buttonAction = new class extends Action {
                        constructor() {
                            super(`progress.button.${button}`, button, undefined, true);
                        }
                        async run() {
                            progressStateModel.cancel(index);
                        }
                    };
                    notificationDisposables.add(buttonAction);
                    primaryActions.push(buttonAction);
                });
            }
            if (options.cancellable) {
                const cancelAction = new class extends Action {
                    constructor() {
                        super('progress.cancel', typeof options.cancellable === 'string' ? options.cancellable : localize('cancel', "Cancel"), undefined, true);
                    }
                    async run() {
                        progressStateModel.cancel();
                    }
                };
                notificationDisposables.add(cancelAction);
                primaryActions.push(cancelAction);
            }
            const notification = this.notificationService.notify({
                severity: Severity.Info,
                message: stripIcons(message), // status entries support codicons, but notifications do not (https://github.com/microsoft/vscode/issues/145722)
                source: options.source,
                actions: { primary: primaryActions, secondary: secondaryActions },
                progress: typeof increment === 'number' && increment >= 0 ? { total: 100, worked: increment } : { infinite: true },
                priority
            });
            // Switch to window based progress once the notification
            // changes visibility to hidden and is still ongoing.
            // Remove that window based progress once the notification
            // shows again.
            let windowProgressDisposable = undefined;
            const onVisibilityChange = (visible) => {
                // Clear any previous running window progress
                dispose(windowProgressDisposable);
                // Create new window progress if notification got hidden
                if (!visible && !progressStateModel.done) {
                    windowProgressDisposable = createWindowProgress();
                }
            };
            notificationDisposables.add(notification.onDidChangeVisibility(onVisibilityChange));
            if (priority === NotificationPriority.SILENT) {
                onVisibilityChange(false);
            }
            // Clear upon dispose
            Event.once(notification.onDidClose)(() => {
                notificationDisposables.dispose();
                dispose(windowProgressDisposable);
            });
            return notification;
        };
        const updateProgress = (notification, increment) => {
            if (typeof increment === 'number' && increment >= 0) {
                notification.progress.total(100); // always percentage based
                notification.progress.worked(increment);
            }
            else {
                notification.progress.infinite();
            }
        };
        let notificationHandle;
        let notificationTimeout;
        let titleAndMessage; // hoisted to make sure a delayed notification shows the most recent message
        const updateNotification = (step) => {
            // full message (inital or update)
            if (step?.message && options.title) {
                titleAndMessage = `${options.title}: ${step.message}`; // always prefix with overall title if we have it (https://github.com/microsoft/vscode/issues/50932)
            }
            else {
                titleAndMessage = options.title || step?.message;
            }
            if (!notificationHandle && titleAndMessage) {
                // create notification now or after a delay
                if (typeof options.delay === 'number' && options.delay > 0) {
                    if (notificationTimeout === undefined) {
                        notificationTimeout = setTimeout(() => notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment), options.delay);
                    }
                }
                else {
                    notificationHandle = createNotification(titleAndMessage, options.priority, step?.increment);
                }
            }
            if (notificationHandle) {
                if (titleAndMessage) {
                    notificationHandle.updateMessage(titleAndMessage);
                }
                if (typeof step?.increment === 'number') {
                    updateProgress(notificationHandle, step.increment);
                }
            }
        };
        // Show initially
        updateNotification(progressStateModel.step);
        const listener = progressStateModel.onDidReport(step => updateNotification(step));
        Event.once(progressStateModel.onWillDispose)(() => listener.dispose());
        // Clean up eventually
        (async () => {
            try {
                // with a delay we only wait for the finish of the promise
                if (typeof options.delay === 'number' && options.delay > 0) {
                    await progressStateModel.promise;
                }
                // without a delay we show the notification for at least 800ms
                // to reduce the chance of the notification flashing up and hiding
                else {
                    await Promise.all([timeout(800), progressStateModel.promise]);
                }
            }
            finally {
                clearTimeout(notificationTimeout);
                notificationHandle?.close();
            }
        })();
        return progressStateModel.promise;
    }
    withPaneCompositeProgress(paneCompositeId, viewContainerLocation, task, options) {
        // show in viewlet
        const progressIndicator = this.paneCompositeService.getProgressIndicator(paneCompositeId, viewContainerLocation);
        const promise = progressIndicator ? this.withCompositeProgress(progressIndicator, task, options) : task({ report: () => { } });
        // show on activity bar
        if (viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
            this.showOnActivityBar(paneCompositeId, options, promise);
        }
        return promise;
    }
    withViewProgress(viewId, task, options) {
        // show in viewlet
        const progressIndicator = this.viewsService.getViewProgressIndicator(viewId);
        const promise = progressIndicator ? this.withCompositeProgress(progressIndicator, task, options) : task({ report: () => { } });
        const viewletId = this.viewDescriptorService.getViewContainerByViewId(viewId)?.id;
        if (viewletId === undefined) {
            return promise;
        }
        // show on activity bar
        this.showOnActivityBar(viewletId, options, promise);
        return promise;
    }
    showOnActivityBar(viewletId, options, promise) {
        let activityProgress;
        let delayHandle = setTimeout(() => {
            delayHandle = undefined;
            const handle = this.activityService.showViewContainerActivity(viewletId, { badge: new ProgressBadge(() => '') });
            const startTimeVisible = Date.now();
            const minTimeVisible = 300;
            activityProgress = {
                dispose() {
                    const d = Date.now() - startTimeVisible;
                    if (d < minTimeVisible) {
                        // should at least show for Nms
                        setTimeout(() => handle.dispose(), minTimeVisible - d);
                    }
                    else {
                        // shown long enough
                        handle.dispose();
                    }
                }
            };
        }, options.delay || 300);
        promise.finally(() => {
            clearTimeout(delayHandle);
            dispose(activityProgress);
        });
    }
    withCompositeProgress(progressIndicator, task, options) {
        let discreteProgressRunner = undefined;
        function updateProgress(stepOrTotal) {
            // Figure out whether discrete progress applies
            // by figuring out the "total" progress to show
            // and the increment if any.
            let total = undefined;
            let increment = undefined;
            if (typeof stepOrTotal !== 'undefined') {
                if (typeof stepOrTotal === 'number') {
                    total = stepOrTotal;
                }
                else if (typeof stepOrTotal.increment === 'number') {
                    total = stepOrTotal.total ?? 100; // always percentage based
                    increment = stepOrTotal.increment;
                }
            }
            // Discrete
            if (typeof total === 'number') {
                if (!discreteProgressRunner) {
                    discreteProgressRunner = progressIndicator.show(total, options.delay);
                    promise.catch(() => undefined /* ignore */).finally(() => discreteProgressRunner?.done());
                }
                if (typeof increment === 'number') {
                    discreteProgressRunner.worked(increment);
                }
            }
            // Infinite
            else {
                discreteProgressRunner?.done();
                progressIndicator.showWhile(promise, options.delay);
            }
            return discreteProgressRunner;
        }
        const promise = task({
            report: progress => {
                updateProgress(progress);
            }
        });
        updateProgress(options.total);
        return promise;
    }
    withDialogProgress(options, task, onDidCancel) {
        const disposables = new DisposableStore();
        let dialog;
        let taskCompleted = false;
        const createDialog = (message) => {
            const buttons = options.buttons || [];
            if (!options.sticky) {
                buttons.push(options.cancellable
                    ? (typeof options.cancellable === 'boolean' ? localize('cancel', "Cancel") : options.cancellable)
                    : localize('dismiss', "Dismiss"));
            }
            dialog = new Dialog(this.layoutService.activeContainer, message, buttons, createWorkbenchDialogOptions({
                type: 'pending',
                detail: options.detail,
                cancelId: buttons.length - 1,
                disableCloseAction: options.sticky,
                disableDefaultAction: options.sticky
            }, this.keybindingService, this.layoutService));
            disposables.add(dialog);
            dialog.show().then(dialogResult => {
                // The dialog may close as a result of disposing it after the
                // task has completed. In that case, we do not want to trigger
                // the `onDidCancel` callback.
                // However, if the task is still running, this means that the
                // user has clicked the cancel button and we want to trigger
                // the `onDidCancel` callback.
                if (!taskCompleted) {
                    onDidCancel?.(dialogResult.button);
                }
                dispose(dialog);
            });
            return dialog;
        };
        // In order to support the `delay` option, we use a scheduler
        // that will guard each access to the dialog behind a delay
        // that is either the original delay for one invocation and
        // otherwise runs without delay.
        let delay = options.delay ?? 0;
        let latestMessage = undefined;
        const scheduler = disposables.add(new RunOnceScheduler(() => {
            delay = 0; // since we have run once, we reset the delay
            if (latestMessage && !dialog) {
                dialog = createDialog(latestMessage);
            }
            else if (latestMessage) {
                dialog.updateMessage(latestMessage);
            }
        }, 0));
        const updateDialog = function (message) {
            latestMessage = message;
            // Make sure to only run one dialog update and not multiple
            if (!scheduler.isScheduled()) {
                scheduler.schedule(delay);
            }
        };
        const promise = task({
            report: progress => {
                updateDialog(progress.message);
            }
        });
        promise.finally(() => {
            taskCompleted = true;
            dispose(disposables);
        });
        if (options.title) {
            updateDialog(options.title);
        }
        return promise;
    }
};
ProgressService = __decorate([
    __param(0, IActivityService),
    __param(1, IPaneCompositePartService),
    __param(2, IViewDescriptorService),
    __param(3, IViewsService),
    __param(4, INotificationService),
    __param(5, IStatusbarService),
    __param(6, ILayoutService),
    __param(7, IKeybindingService),
    __param(8, IUserActivityService)
], ProgressService);
export { ProgressService };
registerSingleton(IProgressService, ProgressService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJvZ3Jlc3MvYnJvd3Nlci9wcm9ncmVzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyw2QkFBNkIsQ0FBQztBQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFlLE9BQU8sRUFBRSxlQUFlLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZILE9BQU8sRUFBRSxnQkFBZ0IsRUFBZ0UsUUFBUSxFQUFnSixNQUFNLGtEQUFrRCxDQUFDO0FBQzFTLE9BQU8sRUFBc0IsaUJBQWlCLEVBQTRDLE1BQU0sc0NBQXNDLENBQUM7QUFDdkksT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBdUIsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoTSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVB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