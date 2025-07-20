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
var TestRunElementRenderer_1;
import * as dom from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { count } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isDefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { MenuEntryActionViewItem, fillInActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchCompressibleObjectTree } from '../../../../../platform/list/browser/listService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { widgetClose } from '../../../../../platform/theme/common/iconRegistry.js';
import { getTestItemContextOverlay } from '../explorerProjections/testItemContextOverlay.js';
import * as icons from '../icons.js';
import { renderTestMessageAsText } from '../testMessageColorizer.js';
import { MessageSubject, TaskSubject, TestOutputSubject, getMessageArgs, mapFindTestMessage } from './testResultsSubject.js';
import { ITestCoverageService } from '../../common/testCoverageService.js';
import { ITestExplorerFilterState } from '../../common/testExplorerFilterState.js';
import { ITestProfileService } from '../../common/testProfileService.js';
import { LiveTestResult, maxCountPriority } from '../../common/testResult.js';
import { ITestResultService } from '../../common/testResultService.js';
import { InternalTestItem, testResultStateToContextValues } from '../../common/testTypes.js';
import { TestingContextKeys } from '../../common/testingContextKeys.js';
import { cmpPriority, isFailedState } from '../../common/testingStates.js';
import { buildTestUri } from '../../common/testingUri.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { TestId } from '../../common/testId.js';
class TestResultElement {
    get icon() {
        return icons.testingStatesToIcons.get(this.value.completedAt === undefined
            ? 2 /* TestResultState.Running */
            : maxCountPriority(this.value.counts));
    }
    constructor(value) {
        this.value = value;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'result';
        this.id = value.id;
        this.context = value.id;
        this.label = value.name;
    }
}
const openCoverageLabel = localize('openTestCoverage', 'View Test Coverage');
const closeCoverageLabel = localize('closeTestCoverage', 'Close Test Coverage');
class CoverageElement {
    get label() {
        return this.isOpen ? closeCoverageLabel : openCoverageLabel;
    }
    get icon() {
        return this.isOpen ? widgetClose : icons.testingCoverageReport;
    }
    get isOpen() {
        return this.coverageService.selected.get()?.fromTaskId === this.task.id;
    }
    constructor(results, task, coverageService) {
        this.task = task;
        this.coverageService = coverageService;
        this.type = 'coverage';
        this.id = `coverage-${results.id}/${task.id}`;
        this.onDidChange = Event.fromObservableLight(coverageService.selected);
    }
}
class OlderResultsElement {
    constructor(n) {
        this.n = n;
        this.type = 'older';
        this.onDidChange = Event.None;
        this.label = n === 1
            ? localize('oneOlderResult', '1 older result')
            : localize('nOlderResults', '{0} older results', n);
        this.id = `older-${this.n}`;
    }
}
class TestCaseElement {
    get onDidChange() {
        if (!(this.results instanceof LiveTestResult)) {
            return Event.None;
        }
        return Event.filter(this.results.onChange, e => e.item.item.extId === this.test.item.extId);
    }
    get state() {
        return this.test.tasks[this.taskIndex].state;
    }
    get label() {
        return this.test.item.label;
    }
    get labelWithIcons() {
        return renderLabelWithIcons(this.label);
    }
    get icon() {
        return icons.testingStatesToIcons.get(this.state);
    }
    get outputSubject() {
        return new TestOutputSubject(this.results, this.taskIndex, this.test);
    }
    constructor(results, test, taskIndex) {
        this.results = results;
        this.test = test;
        this.taskIndex = taskIndex;
        this.type = 'test';
        this.id = `${results.id}/${test.item.extId}`;
        const parentId = TestId.fromString(test.item.extId).parentId;
        if (parentId) {
            this.description = '';
            for (const part of parentId.idsToRoot()) {
                if (part.isRoot) {
                    break;
                }
                const test = results.getStateById(part.toString());
                if (!test) {
                    break;
                }
                if (this.description.length) {
                    this.description += ' \u2039 ';
                }
                this.description += test.item.label;
            }
        }
        this.context = {
            $mid: 16 /* MarshalledId.TestItemContext */,
            tests: [InternalTestItem.serialize(test)],
        };
    }
}
class TaskElement {
    get icon() {
        return this.results.tasks[this.index].running ? icons.testingStatesToIcons.get(2 /* TestResultState.Running */) : undefined;
    }
    constructor(results, task, index) {
        this.results = results;
        this.task = task;
        this.index = index;
        this.changeEmitter = new Emitter();
        this.onDidChange = this.changeEmitter.event;
        this.type = 'task';
        this.itemsCache = new CreationCache();
        this.id = `${results.id}/${index}`;
        this.task = results.tasks[index];
        this.context = { resultId: results.id, taskId: this.task.id };
        this.label = this.task.name;
    }
}
class TestMessageElement {
    get onDidChange() {
        if (!(this.result instanceof LiveTestResult)) {
            return Event.None;
        }
        // rerender when the test case changes so it gets retired events
        return Event.filter(this.result.onChange, e => e.item.item.extId === this.test.item.extId);
    }
    get context() {
        return getMessageArgs(this.test, this.message);
    }
    get outputSubject() {
        return new TestOutputSubject(this.result, this.taskIndex, this.test);
    }
    constructor(result, test, taskIndex, messageIndex) {
        this.result = result;
        this.test = test;
        this.taskIndex = taskIndex;
        this.messageIndex = messageIndex;
        this.type = 'message';
        const m = this.message = test.tasks[taskIndex].messages[messageIndex];
        this.location = m.location;
        this.contextValue = m.type === 0 /* TestMessageType.Error */ ? m.contextValue : undefined;
        this.uri = buildTestUri({
            type: 2 /* TestUriType.ResultMessage */,
            messageIndex,
            resultId: result.id,
            taskIndex,
            testExtId: test.item.extId
        });
        this.id = this.uri.toString();
        const asPlaintext = renderTestMessageAsText(m.message);
        const lines = count(asPlaintext.trimEnd(), '\n');
        this.label = firstLine(asPlaintext);
        if (lines > 0) {
            this.description = lines > 1
                ? localize('messageMoreLinesN', '+ {0} more lines', lines)
                : localize('messageMoreLines1', '+ 1 more line');
        }
    }
}
let OutputPeekTree = class OutputPeekTree extends Disposable {
    constructor(container, onDidReveal, options, contextMenuService, results, instantiationService, explorerFilter, coverageService, progressService, telemetryService) {
        super();
        this.contextMenuService = contextMenuService;
        this.disposed = false;
        this.requestReveal = this._register(new Emitter());
        this.onDidRequestReview = this.requestReveal.event;
        this.treeActions = instantiationService.createInstance(TreeActionsProvider, options.showRevealLocationOnMessages, this.requestReveal);
        const diffIdentityProvider = {
            getId(e) {
                return e.id;
            }
        };
        this.tree = this._register(instantiationService.createInstance(WorkbenchCompressibleObjectTree, 'Test Output Peek', container, {
            getHeight: () => 22,
            getTemplateId: () => TestRunElementRenderer.ID,
        }, [instantiationService.createInstance(TestRunElementRenderer, this.treeActions)], {
            compressionEnabled: true,
            hideTwistiesOfChildlessElements: true,
            identityProvider: diffIdentityProvider,
            alwaysConsumeMouseWheel: false,
            sorter: {
                compare(a, b) {
                    if (a instanceof TestCaseElement && b instanceof TestCaseElement) {
                        return cmpPriority(a.state, b.state);
                    }
                    return 0;
                },
            },
            accessibilityProvider: {
                getAriaLabel(element) {
                    return element.ariaLabel || element.label;
                },
                getWidgetAriaLabel() {
                    return localize('testingPeekLabel', 'Test Result Messages');
                }
            }
        }));
        const cc = new CreationCache();
        const getTaskChildren = (taskElem) => {
            const { results, index, itemsCache, task } = taskElem;
            const tests = Iterable.filter(results.tests, test => test.tasks[index].state >= 2 /* TestResultState.Running */ || test.tasks[index].messages.length > 0);
            let result = Iterable.map(tests, test => ({
                element: itemsCache.getOrCreate(test, () => new TestCaseElement(results, test, index)),
                incompressible: true,
                children: getTestChildren(results, test, index),
            }));
            if (task.coverage.get()) {
                result = Iterable.concat(Iterable.single({
                    element: new CoverageElement(results, task, coverageService),
                    collapsible: true,
                    incompressible: true,
                }), result);
            }
            return result;
        };
        const getTestChildren = (result, test, taskIndex) => {
            return test.tasks[taskIndex].messages
                .map((m, messageIndex) => m.type === 0 /* TestMessageType.Error */
                ? { element: cc.getOrCreate(m, () => new TestMessageElement(result, test, taskIndex, messageIndex)), incompressible: false }
                : undefined)
                .filter(isDefined);
        };
        const getResultChildren = (result) => {
            return result.tasks.map((task, taskIndex) => {
                const taskElem = cc.getOrCreate(task, () => new TaskElement(result, task, taskIndex));
                return ({
                    element: taskElem,
                    incompressible: false,
                    collapsible: true,
                    children: getTaskChildren(taskElem),
                });
            });
        };
        const getRootChildren = () => {
            let children = [];
            const older = [];
            for (const result of results.results) {
                if (!children.length && result.tasks.length) {
                    children = getResultChildren(result);
                }
                else if (children) {
                    const element = cc.getOrCreate(result, () => new TestResultElement(result));
                    older.push({
                        element,
                        incompressible: true,
                        collapsible: true,
                        collapsed: this.tree.hasElement(element) ? this.tree.isCollapsed(element) : true,
                        children: getResultChildren(result)
                    });
                }
            }
            if (!children.length) {
                return older;
            }
            if (older.length) {
                children.push({
                    element: new OlderResultsElement(older.length),
                    incompressible: true,
                    collapsible: true,
                    collapsed: true,
                    children: older,
                });
            }
            return children;
        };
        // Queued result updates to prevent spamming CPU when lots of tests are
        // completing and messaging quickly (#142514)
        const taskChildrenToUpdate = new Set();
        const taskChildrenUpdate = this._register(new RunOnceScheduler(() => {
            for (const taskNode of taskChildrenToUpdate) {
                if (this.tree.hasElement(taskNode)) {
                    this.tree.setChildren(taskNode, getTaskChildren(taskNode), { diffIdentityProvider });
                }
            }
            taskChildrenToUpdate.clear();
        }, 300));
        const queueTaskChildrenUpdate = (taskNode) => {
            taskChildrenToUpdate.add(taskNode);
            if (!taskChildrenUpdate.isScheduled()) {
                taskChildrenUpdate.schedule();
            }
        };
        const attachToResults = (result) => {
            const disposable = new DisposableStore();
            disposable.add(result.onNewTask(i => {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
                if (result.tasks.length === 1) {
                    this.requestReveal.fire(new TaskSubject(result, 0)); // reveal the first task in new runs
                }
                // note: tasks are bounded and their lifetime is equivalent to that of
                // the test result, so this doesn't leak indefinitely.
                const task = result.tasks[i];
                disposable.add(autorun(reader => {
                    task.coverage.read(reader); // add it to the autorun
                    queueTaskChildrenUpdate(cc.get(task));
                }));
            }));
            disposable.add(result.onEndTask(index => {
                cc.get(result.tasks[index])?.changeEmitter.fire();
            }));
            disposable.add(result.onChange(e => {
                // try updating the item in each of its tasks
                for (const [index, task] of result.tasks.entries()) {
                    const taskNode = cc.get(task);
                    if (!this.tree.hasElement(taskNode)) {
                        continue;
                    }
                    const itemNode = taskNode.itemsCache.get(e.item);
                    if (itemNode && this.tree.hasElement(itemNode)) {
                        if (e.reason === 2 /* TestResultItemChangeReason.NewMessage */ && e.message.type === 0 /* TestMessageType.Error */) {
                            this.tree.setChildren(itemNode, getTestChildren(result, e.item, index), { diffIdentityProvider });
                        }
                        return;
                    }
                    queueTaskChildrenUpdate(taskNode);
                }
            }));
            disposable.add(result.onComplete(() => {
                cc.get(result)?.changeEmitter.fire();
                disposable.dispose();
            }));
        };
        this._register(results.onResultsChanged(e => {
            // little hack here: a result change can cause the peek to be disposed,
            // but this listener will still be queued. Doing stuff with the tree
            // will cause errors.
            if (this.disposed) {
                return;
            }
            if ('completed' in e) {
                cc.get(e.completed)?.changeEmitter.fire();
            }
            else if ('started' in e) {
                attachToResults(e.started);
            }
            else {
                this.tree.setChildren(null, getRootChildren(), { diffIdentityProvider });
            }
        }));
        const revealItem = (element, preserveFocus) => {
            this.tree.setFocus([element]);
            this.tree.setSelection([element]);
            if (!preserveFocus) {
                this.tree.domFocus();
            }
        };
        this._register(onDidReveal(async ({ subject, preserveFocus = false }) => {
            if (subject instanceof TaskSubject) {
                const resultItem = this.tree.getNode(null).children.find(c => {
                    if (c.element instanceof TaskElement) {
                        return c.element.results.id === subject.result.id && c.element.index === subject.taskIndex;
                    }
                    if (c.element instanceof TestResultElement) {
                        return c.element.id === subject.result.id;
                    }
                    return false;
                });
                if (resultItem) {
                    revealItem(resultItem.element, preserveFocus);
                }
                return;
            }
            const revealElement = subject instanceof TestOutputSubject
                ? cc.get(subject.task)?.itemsCache.get(subject.test)
                : cc.get(subject.message);
            if (!revealElement || !this.tree.hasElement(revealElement)) {
                return;
            }
            const parents = [];
            for (let parent = this.tree.getParentElement(revealElement); parent; parent = this.tree.getParentElement(parent)) {
                parents.unshift(parent);
            }
            for (const parent of parents) {
                this.tree.expand(parent);
            }
            if (this.tree.getRelativeTop(revealElement) === null) {
                this.tree.reveal(revealElement, 0.5);
            }
            revealItem(revealElement, preserveFocus);
        }));
        this._register(this.tree.onDidOpen(async (e) => {
            if (e.element instanceof TestMessageElement) {
                this.requestReveal.fire(new MessageSubject(e.element.result, e.element.test, e.element.taskIndex, e.element.messageIndex));
            }
            else if (e.element instanceof TestCaseElement) {
                const t = e.element;
                const message = mapFindTestMessage(e.element.test, (_t, _m, mesasgeIndex, taskIndex) => new MessageSubject(t.results, t.test, taskIndex, mesasgeIndex));
                this.requestReveal.fire(message || new TestOutputSubject(t.results, 0, t.test));
            }
            else if (e.element instanceof CoverageElement) {
                const task = e.element.task;
                if (e.element.isOpen) {
                    return coverageService.closeCoverage();
                }
                progressService.withProgress({ location: options.locationForProgress }, () => coverageService.openCoverage(task, true));
            }
        }));
        this._register(this.tree.onDidChangeSelection(evt => {
            for (const element of evt.elements) {
                if (element && 'test' in element) {
                    explorerFilter.reveal.set(element.test.item.extId, undefined);
                    break;
                }
            }
        }));
        this._register(explorerFilter.onDidSelectTestInExplorer(testId => {
            if (this.tree.getSelection().some(e => e && 'test' in e && e.test.item.extId === testId)) {
                return;
            }
            for (const node of this.tree.getNode(null).children) {
                if (node.element instanceof TaskElement) {
                    for (const testNode of node.children) {
                        if (testNode.element instanceof TestCaseElement && testNode.element.test.item.extId === testId) {
                            this.tree.setSelection([testNode.element]);
                            if (this.tree.getRelativeTop(testNode.element) === null) {
                                this.tree.reveal(testNode.element, 0.5);
                            }
                            break;
                        }
                    }
                }
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidChangeCollapseState(e => {
            if (e.node.element instanceof OlderResultsElement && !e.node.collapsed) {
                telemetryService.publicLog2('testing.expandOlderResults');
            }
        }));
        this.tree.setChildren(null, getRootChildren());
        for (const result of results.results) {
            if (!result.completedAt && result instanceof LiveTestResult) {
                attachToResults(result);
            }
        }
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    onContextMenu(evt) {
        if (!evt.element) {
            return;
        }
        const actions = this.treeActions.provideActionBar(evt.element);
        this.contextMenuService.showContextMenu({
            getAnchor: () => evt.anchor,
            getActions: () => actions.secondary.length
                ? [...actions.primary, new Separator(), ...actions.secondary]
                : actions.primary,
            getActionsContext: () => evt.element?.context
        });
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
};
OutputPeekTree = __decorate([
    __param(3, IContextMenuService),
    __param(4, ITestResultService),
    __param(5, IInstantiationService),
    __param(6, ITestExplorerFilterState),
    __param(7, ITestCoverageService),
    __param(8, IProgressService),
    __param(9, ITelemetryService)
], OutputPeekTree);
export { OutputPeekTree };
let TestRunElementRenderer = class TestRunElementRenderer {
    static { TestRunElementRenderer_1 = this; }
    static { this.ID = 'testRunElementRenderer'; }
    constructor(treeActions, instantiationService) {
        this.treeActions = treeActions;
        this.instantiationService = instantiationService;
        this.templateId = TestRunElementRenderer_1.ID;
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        const chain = node.element.elements;
        const lastElement = chain[chain.length - 1];
        if ((lastElement instanceof TaskElement || lastElement instanceof TestMessageElement) && chain.length >= 2) {
            this.doRender(chain[chain.length - 2], templateData, lastElement);
        }
        else {
            this.doRender(lastElement, templateData);
        }
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        container.classList.add('testing-stdtree-container');
        const icon = dom.append(container, dom.$('.state'));
        const label = dom.append(container, dom.$('.label'));
        const actionBar = new ActionBar(container, {
            actionViewItemProvider: (action, options) => action instanceof MenuItemAction
                ? this.instantiationService.createInstance(MenuEntryActionViewItem, action, { hoverDelegate: options.hoverDelegate })
                : undefined
        });
        const elementDisposable = new DisposableStore();
        templateDisposable.add(elementDisposable);
        templateDisposable.add(actionBar);
        return {
            icon,
            label,
            actionBar,
            elementDisposable,
            templateDisposable,
        };
    }
    /** @inheritdoc */
    renderElement(element, _index, templateData) {
        this.doRender(element.element, templateData);
    }
    /** @inheritdoc */
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    /** Called to render a new element */
    doRender(element, templateData, subjectElement) {
        templateData.elementDisposable.clear();
        templateData.elementDisposable.add(element.onDidChange(() => this.doRender(element, templateData, subjectElement)));
        this.doRenderInner(element, templateData, subjectElement);
    }
    /** Called, and may be re-called, to render or re-render an element */
    doRenderInner(element, templateData, subjectElement) {
        let { label, labelWithIcons, description } = element;
        if (subjectElement instanceof TestMessageElement) {
            description = subjectElement.label;
            if (element.description) {
                description = `${description} @ ${element.description}`;
            }
        }
        const descriptionElement = description ? dom.$('span.test-label-description', {}, description) : '';
        if (labelWithIcons) {
            dom.reset(templateData.label, ...labelWithIcons, descriptionElement);
        }
        else {
            dom.reset(templateData.label, label, descriptionElement);
        }
        const icon = element.icon;
        templateData.icon.className = `computed-state ${icon ? ThemeIcon.asClassName(icon) : ''}`;
        const actions = this.treeActions.provideActionBar(element);
        templateData.actionBar.clear();
        templateData.actionBar.context = element.context;
        templateData.actionBar.push(actions.primary, { icon: true, label: false });
    }
};
TestRunElementRenderer = TestRunElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], TestRunElementRenderer);
let TreeActionsProvider = class TreeActionsProvider {
    constructor(showRevealLocationOnMessages, requestReveal, contextKeyService, menuService, commandService, testProfileService, editorService) {
        this.showRevealLocationOnMessages = showRevealLocationOnMessages;
        this.requestReveal = requestReveal;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this.commandService = commandService;
        this.testProfileService = testProfileService;
        this.editorService = editorService;
    }
    provideActionBar(element) {
        const test = element instanceof TestCaseElement ? element.test : undefined;
        const capabilities = test ? this.testProfileService.capabilitiesForTest(test.item) : 0;
        const contextKeys = [
            ['peek', "editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */],
            [TestingContextKeys.peekItemType.key, element.type],
        ];
        let id = MenuId.TestPeekElement;
        const primary = [];
        const secondary = [];
        if (element instanceof TaskElement) {
            primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.results, element.index))));
            if (element.task.running) {
                primary.push(new Action('testing.outputPeek.cancel', localize('testing.cancelRun', 'Cancel Test Run'), ThemeIcon.asClassName(icons.testingCancelIcon), undefined, () => this.commandService.executeCommand("testing.cancelRun" /* TestCommandId.CancelTestRunAction */, element.results.id, element.task.id)));
            }
            else {
                primary.push(new Action('testing.outputPeek.rerun', localize('testing.reRunLastRun', 'Rerun Last Run'), ThemeIcon.asClassName(icons.testingRerunIcon), undefined, () => this.commandService.executeCommand("testing.reRunLastRun" /* TestCommandId.ReRunLastRun */, element.results.id)));
                const hasFailedTests = Iterable.some(element.results.tests, test => isFailedState(test.ownComputedState));
                if (hasFailedTests) {
                    primary.push(new Action('testing.outputPeek.rerunFailed', localize('testing.reRunFailedFromLastRun', 'Rerun Failed Tests'), ThemeIcon.asClassName(icons.testingRerunIcon), undefined, () => this.commandService.executeCommand("testing.reRunFailedFromLastRun" /* TestCommandId.ReRunFailedFromLastRun */, element.results.id)));
                }
                primary.push(new Action('testing.outputPeek.debug', localize('testing.debugLastRun', 'Debug Last Run'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand("testing.debugLastRun" /* TestCommandId.DebugLastRun */, element.results.id)));
                if (hasFailedTests) {
                    primary.push(new Action('testing.outputPeek.debugFailed', localize('testing.debugFailedFromLastRun', 'Debug Failed Tests'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand("testing.debugFailedFromLastRun" /* TestCommandId.DebugFailedFromLastRun */, element.results.id)));
                }
            }
        }
        if (element instanceof TestResultElement) {
            // only show if there are no collapsed test nodes that have more specific choices
            if (element.value.tasks.length === 1) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(new TaskSubject(element.value, 0))));
            }
            primary.push(new Action('testing.outputPeek.reRunLastRun', localize('testing.reRunTest', "Rerun Test"), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('testing.reRunLastRun', element.value.id)));
            const hasFailedTests = Iterable.some(element.value.tests, test => isFailedState(test.ownComputedState));
            if (hasFailedTests) {
                primary.push(new Action('testing.outputPeek.rerunFailedResult', localize('testing.reRunFailedFromLastRun', 'Rerun Failed Tests'), ThemeIcon.asClassName(icons.testingRerunIcon), undefined, () => this.commandService.executeCommand("testing.reRunFailedFromLastRun" /* TestCommandId.ReRunFailedFromLastRun */, element.value.id)));
            }
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugLastRun', localize('testing.debugTest', "Debug Test"), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('testing.debugLastRun', element.value.id)));
                if (hasFailedTests) {
                    primary.push(new Action('testing.outputPeek.debugFailedResult', localize('testing.debugFailedFromLastRun', 'Debug Failed Tests'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand("testing.debugFailedFromLastRun" /* TestCommandId.DebugFailedFromLastRun */, element.value.id)));
                }
            }
        }
        if (element instanceof TestCaseElement || element instanceof TestMessageElement) {
            contextKeys.push([TestingContextKeys.testResultOutdated.key, element.test.retired], [TestingContextKeys.testResultState.key, testResultStateToContextValues[element.test.ownComputedState]], ...getTestItemContextOverlay(element.test, capabilities));
            primary.push(new Action('testing.outputPeek.goToTest', localize('testing.goToTest', "Go to Test"), ThemeIcon.asClassName(Codicon.goToFile), undefined, () => this.commandService.executeCommand('vscode.revealTest', element.test.item.extId)));
            const extId = element.test.item.extId;
            if (element.test.tasks[element.taskIndex].messages.some(m => m.type === 1 /* TestMessageType.Output */)) {
                primary.push(new Action('testing.outputPeek.showResultOutput', localize('testing.showResultOutput', "Show Result Output"), ThemeIcon.asClassName(Codicon.terminal), undefined, () => this.requestReveal.fire(element.outputSubject)));
            }
            secondary.push(new Action('testing.outputPeek.revealInExplorer', localize('testing.revealInExplorer', "Reveal in Test Explorer"), ThemeIcon.asClassName(Codicon.listTree), undefined, () => this.commandService.executeCommand('_revealTestInExplorer', extId)));
            if (capabilities & 2 /* TestRunProfileBitset.Run */) {
                primary.push(new Action('testing.outputPeek.runTest', localize('run test', 'Run Test'), ThemeIcon.asClassName(icons.testingRunIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 2 /* TestRunProfileBitset.Run */, extId)));
            }
            if (capabilities & 4 /* TestRunProfileBitset.Debug */) {
                primary.push(new Action('testing.outputPeek.debugTest', localize('debug test', 'Debug Test'), ThemeIcon.asClassName(icons.testingDebugIcon), undefined, () => this.commandService.executeCommand('vscode.runTestsById', 4 /* TestRunProfileBitset.Debug */, extId)));
            }
        }
        if (element instanceof TestMessageElement) {
            id = MenuId.TestMessageContext;
            contextKeys.push([TestingContextKeys.testMessageContext.key, element.contextValue]);
            if (this.showRevealLocationOnMessages && element.location) {
                primary.push(new Action('testing.outputPeek.goToError', localize('testing.goToError', "Go to Error"), ThemeIcon.asClassName(Codicon.debugStackframe), undefined, () => this.editorService.openEditor({
                    resource: element.location.uri,
                    options: {
                        selection: element.location.range,
                        preserveFocus: true,
                    }
                })));
            }
        }
        const contextOverlay = this.contextKeyService.createOverlay(contextKeys);
        const result = { primary, secondary };
        const menu = this.menuService.getMenuActions(id, contextOverlay, { arg: element.context });
        fillInActionBarActions(menu, result, 'inline');
        return result;
    }
};
TreeActionsProvider = __decorate([
    __param(2, IContextKeyService),
    __param(3, IMenuService),
    __param(4, ICommandService),
    __param(5, ITestProfileService),
    __param(6, IEditorService)
], TreeActionsProvider);
class CreationCache {
    constructor() {
        this.v = new WeakMap();
    }
    get(key) {
        return this.v.get(key);
    }
    getOrCreate(ref, factory) {
        const existing = this.v.get(ref);
        if (existing) {
            return existing;
        }
        const fresh = factory();
        this.v.set(ref, fresh);
        return fresh;
    }
}
const firstLine = (str) => {
    const index = str.indexOf('\n');
    return index === -1 ? str : str.slice(0, index);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdHNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdFJlc3VsdHNWaWV3L3Rlc3RSZXN1bHRzVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDbEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFLOUYsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSx1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