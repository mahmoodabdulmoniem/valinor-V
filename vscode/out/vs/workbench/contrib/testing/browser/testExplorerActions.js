/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SymbolNavigationAction } from '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import { ReferencesModel } from '../../../../editor/contrib/gotoSymbol/browser/referencesModel.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, ContextKeyGreaterExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { TestItemTreeElement } from './explorerProjections/index.js';
import * as icons from './icons.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { testConfigurationGroupNames } from '../common/constants.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService, canUseProfileWithTest } from '../common/testProfileService.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, expandAndGetTestById, testsInFile, testsUnderUri } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState } from '../common/testingStates.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const category = Categories.Test;
var ActionOrder;
(function (ActionOrder) {
    // Navigation:
    ActionOrder[ActionOrder["Refresh"] = 10] = "Refresh";
    ActionOrder[ActionOrder["Run"] = 11] = "Run";
    ActionOrder[ActionOrder["Debug"] = 12] = "Debug";
    ActionOrder[ActionOrder["Coverage"] = 13] = "Coverage";
    ActionOrder[ActionOrder["RunContinuous"] = 14] = "RunContinuous";
    ActionOrder[ActionOrder["RunUsing"] = 15] = "RunUsing";
    // Submenu:
    ActionOrder[ActionOrder["Collapse"] = 16] = "Collapse";
    ActionOrder[ActionOrder["ClearResults"] = 17] = "ClearResults";
    ActionOrder[ActionOrder["DisplayMode"] = 18] = "DisplayMode";
    ActionOrder[ActionOrder["Sort"] = 19] = "Sort";
    ActionOrder[ActionOrder["GoToTest"] = 20] = "GoToTest";
    ActionOrder[ActionOrder["HideTest"] = 21] = "HideTest";
    ActionOrder[ActionOrder["ContinuousRunTest"] = 2147483647] = "ContinuousRunTest";
})(ActionOrder || (ActionOrder = {}));
const hasAnyTestProvider = ContextKeyGreaterExpr.create(TestingContextKeys.providerCount.key, 0);
const LABEL_RUN_TESTS = localize2('runSelectedTests', "Run Tests");
const LABEL_DEBUG_TESTS = localize2('debugSelectedTests', "Debug Tests");
const LABEL_COVERAGE_TESTS = localize2('coverageSelectedTests', "Run Tests with Coverage");
export class HideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.hideTest" /* TestCommandId.HideTestAction */,
            title: localize2('hideTest', 'Hide Test'),
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@2',
                when: TestingContextKeys.testItemIsHidden.isEqualTo(false)
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            service.excluded.toggle(element.test, true);
        }
        return Promise.resolve();
    }
}
export class UnhideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideTest" /* TestCommandId.UnhideTestAction */,
            title: localize2('unhideTest', 'Unhide Test'),
            menu: {
                id: MenuId.TestItem,
                order: 21 /* ActionOrder.HideTest */,
                when: TestingContextKeys.testItemIsHidden.isEqualTo(true)
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            if (element instanceof TestItemTreeElement) {
                service.excluded.toggle(element.test, false);
            }
        }
        return Promise.resolve();
    }
}
export class UnhideAllTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideAllTests" /* TestCommandId.UnhideAllTestsAction */,
            title: localize2('unhideAllTests', 'Unhide All Tests'),
        });
    }
    run(accessor) {
        const service = accessor.get(ITestService);
        service.excluded.clear();
        return Promise.resolve();
    }
}
const testItemInlineAndInContext = (order, when) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order,
        when,
    }, {
        id: MenuId.TestItem,
        group: 'builtin@1',
        order,
        when,
    }
];
class RunVisibleAction extends ViewAction {
    constructor(bitset, desc) {
        super({
            ...desc,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.bitset = bitset;
    }
    /**
     * @override
     */
    runInView(accessor, view, ...elements) {
        const { include, exclude } = view.getTreeIncludeExclude(this.bitset, elements.map(e => e.test));
        return accessor.get(ITestService).runTests({
            tests: include,
            exclude,
            group: this.bitset,
        });
    }
}
export class DebugAction extends RunVisibleAction {
    constructor() {
        super(4 /* TestRunProfileBitset.Debug */, {
            id: "testing.debug" /* TestCommandId.DebugAction */,
            title: localize2('debug test', 'Debug Test'),
            icon: icons.testingDebugIcon,
            menu: testItemInlineAndInContext(12 /* ActionOrder.Debug */, TestingContextKeys.hasDebuggableTests.isEqualTo(true)),
        });
    }
}
export class CoverageAction extends RunVisibleAction {
    constructor() {
        super(8 /* TestRunProfileBitset.Coverage */, {
            id: "testing.coverage" /* TestCommandId.RunWithCoverageAction */,
            title: localize2('run with cover test', 'Run Test with Coverage'),
            icon: icons.testingCoverageIcon,
            menu: testItemInlineAndInContext(13 /* ActionOrder.Coverage */, TestingContextKeys.hasCoverableTests.isEqualTo(true)),
        });
    }
}
export class RunUsingProfileAction extends Action2 {
    constructor() {
        super({
            id: "testing.runUsing" /* TestCommandId.RunUsingProfileAction */,
            title: localize2('testing.runUsing', 'Execute Using Profile...'),
            icon: icons.testingDebugIcon,
            menu: {
                id: MenuId.TestItem,
                order: 15 /* ActionOrder.RunUsing */,
                group: 'builtin@2',
                when: TestingContextKeys.hasNonDefaultProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, ...elements) {
        const commandService = acessor.get(ICommandService);
        const testService = acessor.get(ITestService);
        const profile = await commandService.executeCommand('vscode.pickTestProfile', {
            onlyForTest: elements[0].test,
        });
        if (!profile) {
            return;
        }
        testService.runResolvedTests({
            group: profile.group,
            targets: [{
                    profileId: profile.profileId,
                    controllerId: profile.controllerId,
                    testIds: elements.filter(t => canUseProfileWithTest(profile, t.test)).map(t => t.test.item.extId)
                }]
        });
    }
}
export class RunAction extends RunVisibleAction {
    constructor() {
        super(2 /* TestRunProfileBitset.Run */, {
            id: "testing.run" /* TestCommandId.RunAction */,
            title: localize2('run test', 'Run Test'),
            icon: icons.testingRunIcon,
            menu: testItemInlineAndInContext(11 /* ActionOrder.Run */, TestingContextKeys.hasRunnableTests.isEqualTo(true)),
        });
    }
}
export class SelectDefaultTestProfiles extends Action2 {
    constructor() {
        super({
            id: "testing.selectDefaultTestProfiles" /* TestCommandId.SelectDefaultTestProfiles */,
            title: localize2('testing.selectDefaultTestProfiles', 'Select Default Profile'),
            icon: icons.testingUpdateProfiles,
            category,
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profiles = await commands.executeCommand('vscode.pickMultipleTestProfiles', {
            showConfigureButtons: false,
            selected: testProfileService.getGroupDefaultProfiles(onlyGroup),
            onlyGroup,
        });
        if (profiles?.length) {
            testProfileService.setGroupDefaultProfiles(onlyGroup, profiles);
        }
    }
}
export class ContinuousRunTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.toggleContinuousRunForTest" /* TestCommandId.ToggleContinousRunForTest */,
            title: localize2('testing.toggleContinuousRunOn', 'Turn on Continuous Run'),
            icon: icons.testingTurnContinuousRunOn,
            precondition: ContextKeyExpr.or(TestingContextKeys.isContinuousModeOn.isEqualTo(true), TestingContextKeys.isParentRunningContinuously.isEqualTo(false)),
            toggled: {
                condition: TestingContextKeys.isContinuousModeOn.isEqualTo(true),
                icon: icons.testingContinuousIsOn,
                title: localize('testing.toggleContinuousRunOff', 'Turn off Continuous Run'),
            },
            menu: testItemInlineAndInContext(2147483647 /* ActionOrder.ContinuousRunTest */, TestingContextKeys.supportsContinuousRun.isEqualTo(true)),
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        for (const element of elements) {
            const id = element.test.item.extId;
            if (crService.isSpecificallyEnabledFor(id)) {
                crService.stop(id);
                continue;
            }
            crService.start(2 /* TestRunProfileBitset.Run */, id);
        }
    }
}
export class ContinuousRunUsingProfileTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.continuousRunUsingForTest" /* TestCommandId.ContinousRunUsingForTest */,
            title: localize2('testing.startContinuousRunUsing', 'Start Continous Run Using...'),
            icon: icons.testingDebugIcon,
            menu: [
                {
                    id: MenuId.TestItem,
                    order: 14 /* ActionOrder.RunContinuous */,
                    group: 'builtin@2',
                    when: ContextKeyExpr.and(TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(false))
                }
            ],
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        for (const element of elements) {
            const selected = await selectContinuousRunProfiles(crService, notificationService, quickInputService, [{ profiles: profileService.getControllerProfiles(element.test.controllerId) }]);
            if (selected.length) {
                crService.start(selected, element.test.item.extId);
            }
        }
    }
}
export class ConfigureTestProfilesAction extends Action2 {
    constructor() {
        super({
            id: "testing.configureProfile" /* TestCommandId.ConfigureTestProfilesAction */,
            title: localize2('testing.configureProfile', "Configure Test Profiles"),
            icon: icons.testingUpdateProfiles,
            f1: true,
            category,
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasConfigurableProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profile = await commands.executeCommand('vscode.pickTestProfile', {
            placeholder: localize('configureProfile', 'Select a profile to update'),
            showConfigureButtons: false,
            onlyConfigurable: true,
            onlyGroup,
        });
        if (profile) {
            testProfileService.configure(profile.controllerId, profile.profileId);
        }
    }
}
const continuousMenus = (whenIsContinuousOn) => [
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 15 /* ActionOrder.RunUsing */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(whenIsContinuousOn)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.supportsContinuousRun.isEqualTo(true),
    },
];
class StopContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.stopContinuousRun" /* TestCommandId.StopContinousRun */,
            title: localize2('testing.stopContinuous', 'Stop Continuous Run'),
            category,
            icon: icons.testingTurnContinuousRunOff,
            menu: continuousMenus(true),
        });
    }
    run(accessor) {
        accessor.get(ITestingContinuousRunService).stop();
    }
}
function selectContinuousRunProfiles(crs, notificationService, quickInputService, profilesToPickFrom) {
    const items = [];
    for (const { controller, profiles } of profilesToPickFrom) {
        for (const profile of profiles) {
            if (profile.supportsContinuousRun) {
                items.push({
                    label: profile.label || controller?.label.get() || '',
                    description: controller?.label.get(),
                    profile,
                });
            }
        }
    }
    if (items.length === 0) {
        notificationService.info(localize('testing.noProfiles', 'No test continuous run-enabled profiles were found'));
        return Promise.resolve([]);
    }
    // special case: don't bother to quick a pickpick if there's only a single profile
    if (items.length === 1) {
        return Promise.resolve([items[0].profile]);
    }
    const qpItems = [];
    const selectedItems = [];
    const lastRun = crs.lastRunProfileIds;
    items.sort((a, b) => a.profile.group - b.profile.group
        || a.profile.controllerId.localeCompare(b.profile.controllerId)
        || a.label.localeCompare(b.label));
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (i === 0 || items[i - 1].profile.group !== item.profile.group) {
            qpItems.push({ type: 'separator', label: testConfigurationGroupNames[item.profile.group] });
        }
        qpItems.push(item);
        if (lastRun.has(item.profile.profileId)) {
            selectedItems.push(item);
        }
    }
    const disposables = new DisposableStore();
    const quickpick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
    quickpick.title = localize('testing.selectContinuousProfiles', 'Select profiles to run when files change:');
    quickpick.canSelectMany = true;
    quickpick.items = qpItems;
    quickpick.selectedItems = selectedItems;
    quickpick.show();
    return new Promise(resolve => {
        disposables.add(quickpick.onDidAccept(() => {
            resolve(quickpick.selectedItems.map(i => i.profile));
            disposables.dispose();
        }));
        disposables.add(quickpick.onDidHide(() => {
            resolve([]);
            disposables.dispose();
        }));
    });
}
class StartContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.startContinuousRun" /* TestCommandId.StartContinousRun */,
            title: localize2('testing.startContinuous', "Start Continuous Run"),
            category,
            icon: icons.testingTurnContinuousRunOn,
            menu: continuousMenus(false),
        });
    }
    async run(accessor) {
        const crs = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const lastRunProfiles = [...profileService.all()].flatMap(p => p.profiles.filter(p => crs.lastRunProfileIds.has(p.profileId)));
        if (lastRunProfiles.length) {
            return crs.start(lastRunProfiles);
        }
        const selected = await selectContinuousRunProfiles(crs, accessor.get(INotificationService), accessor.get(IQuickInputService), accessor.get(ITestProfileService).all());
        if (selected.length) {
            crs.start(selected);
        }
    }
}
class ExecuteSelectedAction extends ViewAction {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.ViewTitle,
                    order: group === 2 /* TestRunProfileBitset.Run */
                        ? 11 /* ActionOrder.Run */
                        : group === 4 /* TestRunProfileBitset.Debug */
                            ? 12 /* ActionOrder.Debug */
                            : 13 /* ActionOrder.Coverage */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.isRunning.isEqualTo(false), TestingContextKeys.capabilityToContextKey[group].isEqualTo(true))
                }],
            category,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.group = group;
    }
    /**
     * @override
     */
    runInView(accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(this.group);
        return accessor.get(ITestService).runTests({ tests: include, exclude, group: this.group });
    }
}
export class GetSelectedProfiles extends Action2 {
    constructor() {
        super({ id: "testing.getSelectedProfiles" /* TestCommandId.GetSelectedProfiles */, title: localize2('getSelectedProfiles', 'Get Selected Profiles') });
    }
    /**
     * @override
     */
    run(accessor) {
        const profiles = accessor.get(ITestProfileService);
        return [
            ...profiles.getGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */),
            ...profiles.getGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */),
            ...profiles.getGroupDefaultProfiles(8 /* TestRunProfileBitset.Coverage */),
        ].map(p => ({
            controllerId: p.controllerId,
            label: p.label,
            kind: p.group & 8 /* TestRunProfileBitset.Coverage */
                ? 3 /* ExtTestRunProfileKind.Coverage */
                : p.group & 4 /* TestRunProfileBitset.Debug */
                    ? 2 /* ExtTestRunProfileKind.Debug */
                    : 1 /* ExtTestRunProfileKind.Run */,
        }));
    }
}
export class GetExplorerSelection extends ViewAction {
    constructor() {
        super({ id: "_testing.getExplorerSelection" /* TestCommandId.GetExplorerSelection */, title: localize2('getExplorerSelection', 'Get Explorer Selection'), viewId: "workbench.view.testing" /* Testing.ExplorerViewId */ });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(2 /* TestRunProfileBitset.Run */, undefined, 'selected');
        const mapper = (i) => i.item.extId;
        return { include: include.map(mapper), exclude: exclude.map(mapper) };
    }
}
export class RunSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.runSelected" /* TestCommandId.RunSelectedAction */,
            title: LABEL_RUN_TESTS,
            icon: icons.testingRunAllIcon,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.debugSelected" /* TestCommandId.DebugSelectedAction */,
            title: LABEL_DEBUG_TESTS,
            icon: icons.testingDebugAllIcon,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.coverageSelected" /* TestCommandId.CoverageSelectedAction */,
            title: LABEL_COVERAGE_TESTS,
            icon: icons.testingCoverageAllIcon,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
const showDiscoveringWhile = (progress, task) => {
    return progress.withProgress({
        location: 10 /* ProgressLocation.Window */,
        title: localize('discoveringTests', 'Discovering Tests'),
    }, () => task);
};
class RunOrDebugAllTestsAction extends Action2 {
    constructor(options, group, noTestsFoundError) {
        super({
            ...options,
            category,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                }]
        });
        this.group = group;
        this.noTestsFoundError = noTestsFoundError;
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        const notifications = accessor.get(INotificationService);
        const roots = [...testService.collection.rootItems].filter(r => r.children.size
            || r.expand === 1 /* TestItemExpandState.Expandable */ || r.expand === 2 /* TestItemExpandState.BusyExpanding */);
        if (!roots.length) {
            notifications.info(this.noTestsFoundError);
            return;
        }
        await testService.runTests({ tests: roots, group: this.group });
    }
}
export class RunAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.runAll" /* TestCommandId.RunAllAction */,
            title: localize2('runAllTests', 'Run All Tests'),
            icon: icons.testingRunAllIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 31 /* KeyCode.KeyA */),
            },
        }, 2 /* TestRunProfileBitset.Run */, localize('noTestProvider', 'No tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class DebugAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.debugAll" /* TestCommandId.DebugAllAction */,
            title: localize2('debugAllTests', 'Debug All Tests'),
            icon: icons.testingDebugIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */),
            },
        }, 4 /* TestRunProfileBitset.Debug */, localize('noDebugTestProvider', 'No debuggable tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class CoverageAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.coverageAll" /* TestCommandId.RunAllWithCoverageAction */,
            title: localize2('runAllWithCoverage', 'Run All Tests with Coverage'),
            icon: icons.testingCoverageIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */, localize('noCoverageTestProvider', 'No tests with coverage runners found in this workspace. You may need to install a test provider extension'));
    }
}
export class CancelTestRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelRun" /* TestCommandId.CancelTestRunAction */,
            title: localize2('testing.cancelRun', 'Cancel Test Run'),
            icon: icons.testingCancelIcon,
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */),
            },
            menu: [{
                    id: MenuId.ViewTitle,
                    order: 11 /* ActionOrder.Run */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), ContextKeyExpr.equals(TestingContextKeys.isRunning.serialize(), true))
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.isRunning,
                }]
        });
    }
    /**
     * @override
     */
    async run(accessor, resultId, taskId) {
        const resultService = accessor.get(ITestResultService);
        const testService = accessor.get(ITestService);
        if (resultId) {
            testService.cancelTestRun(resultId, taskId);
        }
        else {
            for (const run of resultService.results) {
                if (!run.completedAt) {
                    testService.cancelTestRun(run.id);
                }
            }
        }
    }
}
export class TestingViewAsListAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsList" /* TestCommandId.TestingViewAsListAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsList', 'View as List'),
            toggled: TestingContextKeys.viewMode.isEqualTo("list" /* TestExplorerViewMode.List */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "list" /* TestExplorerViewMode.List */;
    }
}
export class TestingViewAsTreeAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsTree" /* TestCommandId.TestingViewAsTreeAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsTree', 'View as Tree'),
            toggled: TestingContextKeys.viewMode.isEqualTo("true" /* TestExplorerViewMode.Tree */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "true" /* TestExplorerViewMode.Tree */;
    }
}
export class TestingSortByStatusAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByStatus" /* TestCommandId.TestingSortByStatusAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByStatus', 'Sort by Status'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("status" /* TestExplorerViewSorting.ByStatus */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "status" /* TestExplorerViewSorting.ByStatus */;
    }
}
export class TestingSortByLocationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByLocation" /* TestCommandId.TestingSortByLocationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByLocation', 'Sort by Location'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("location" /* TestExplorerViewSorting.ByLocation */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "location" /* TestExplorerViewSorting.ByLocation */;
    }
}
export class TestingSortByDurationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByDuration" /* TestCommandId.TestingSortByDurationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByDuration', 'Sort by Duration'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("duration" /* TestExplorerViewSorting.ByDuration */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "duration" /* TestExplorerViewSorting.ByDuration */;
    }
}
export class ShowMostRecentOutputAction extends Action2 {
    constructor() {
        super({
            id: "testing.showMostRecentOutput" /* TestCommandId.ShowMostRecentOutputAction */,
            title: localize2('testing.showMostRecentOutput', 'Show Output'),
            category,
            icon: Codicon.terminal,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
            },
            precondition: TestingContextKeys.hasAnyResults.isEqualTo(true),
            menu: [{
                    id: MenuId.ViewTitle,
                    order: 16 /* ActionOrder.Collapse */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true)
                }]
        });
    }
    async run(accessor) {
        const viewService = accessor.get(IViewsService);
        const testView = await viewService.openView("workbench.panel.testResults.view" /* Testing.ResultsViewId */, true);
        testView?.showLatestRun();
    }
}
export class CollapseAllAction extends ViewAction {
    constructor() {
        super({
            id: "testing.collapseAll" /* TestCommandId.CollapseAllAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.collapseAll', 'Collapse All Tests'),
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                order: 16 /* ActionOrder.Collapse */,
                group: 'displayAction',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.collapseAll();
    }
}
export class ClearTestResultsAction extends Action2 {
    constructor() {
        super({
            id: "testing.clearTestResults" /* TestCommandId.ClearTestResultsAction */,
            title: localize2('testing.clearResults', 'Clear All Results'),
            category,
            icon: Codicon.clearAll,
            menu: [{
                    id: MenuId.TestPeekTitle,
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                }, {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'displayAction',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
                }, {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.panel.testResults.view" /* Testing.ResultsViewId */)
                }],
        });
    }
    /**
     * @override
     */
    run(accessor) {
        accessor.get(ITestResultService).clear();
    }
}
export class GoToTest extends Action2 {
    constructor() {
        super({
            id: "testing.editFocusedTest" /* TestCommandId.GoToTest */,
            title: localize2('testing.editFocusedTest', 'Go to Test'),
            icon: Codicon.goToFile,
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@1',
                order: 20 /* ActionOrder.GoToTest */,
                when: TestingContextKeys.testItemHasUri.isEqualTo(true),
            },
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                when: FocusedViewContext.isEqualTo("workbench.view.testing" /* Testing.ExplorerViewId */),
                primary: 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */,
            },
        });
    }
    async run(accessor, element, preserveFocus) {
        if (!element) {
            const view = accessor.get(IViewsService).getActiveViewWithId("workbench.view.testing" /* Testing.ExplorerViewId */);
            element = view?.focusedTreeElements[0];
        }
        if (element && element instanceof TestItemTreeElement) {
            accessor.get(ICommandService).executeCommand('vscode.revealTest', element.test.item.extId, preserveFocus);
        }
    }
}
async function getTestsAtCursor(testService, uriIdentityService, uri, position, filter) {
    // testsInFile will descend in the test tree. We assume that as we go
    // deeper, ranges get more specific. We'll want to run all tests whose
    // range is equal to the most specific range we find (see #133519)
    //
    // If we don't find any test whose range contains the position, we pick
    // the closest one before the position. Again, if we find several tests
    // whose range is equal to the closest one, we run them all.
    let bestNodes = [];
    let bestRange;
    let bestNodesBefore = [];
    let bestRangeBefore;
    for await (const test of testsInFile(testService, uriIdentityService, uri)) {
        if (!test.item.range || filter?.(test) === false) {
            continue;
        }
        const irange = Range.lift(test.item.range);
        if (irange.containsPosition(position)) {
            if (bestRange && Range.equalsRange(test.item.range, bestRange)) {
                // check that a parent isn't already included (#180760)
                if (!bestNodes.some(b => TestId.isChild(b.item.extId, test.item.extId))) {
                    bestNodes.push(test);
                }
            }
            else {
                bestRange = irange;
                bestNodes = [test];
            }
        }
        else if (Position.isBefore(irange.getStartPosition(), position)) {
            if (!bestRangeBefore || bestRangeBefore.getStartPosition().isBefore(irange.getStartPosition())) {
                bestRangeBefore = irange;
                bestNodesBefore = [test];
            }
            else if (irange.equalsRange(bestRangeBefore) && !bestNodesBefore.some(b => TestId.isChild(b.item.extId, test.item.extId))) {
                bestNodesBefore.push(test);
            }
        }
    }
    return bestNodes.length ? bestNodes : bestNodesBefore;
}
var EditorContextOrder;
(function (EditorContextOrder) {
    EditorContextOrder[EditorContextOrder["RunAtCursor"] = 0] = "RunAtCursor";
    EditorContextOrder[EditorContextOrder["DebugAtCursor"] = 1] = "DebugAtCursor";
    EditorContextOrder[EditorContextOrder["RunInFile"] = 2] = "RunInFile";
    EditorContextOrder[EditorContextOrder["DebugInFile"] = 3] = "DebugInFile";
    EditorContextOrder[EditorContextOrder["GoToRelated"] = 4] = "GoToRelated";
    EditorContextOrder[EditorContextOrder["PeekRelated"] = 5] = "PeekRelated";
})(EditorContextOrder || (EditorContextOrder = {}));
class ExecuteTestAtCursor extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: hasAnyTestProvider,
                }, {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */ ? 0 /* EditorContextOrder.RunAtCursor */ : 1 /* EditorContextOrder.DebugAtCursor */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                }]
        });
        this.group = group;
    }
    /**
     * @override
     */
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        let editor = codeEditorService.getActiveCodeEditor();
        if (!activeEditorPane || !editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const progressService = accessor.get(IProgressService);
        const configurationService = accessor.get(IConfigurationService);
        const saveBeforeTest = getTestingConfiguration(configurationService, "testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */);
        if (saveBeforeTest) {
            await editorService.save({ editor: activeEditorPane.input, groupId: activeEditorPane.group.id });
            await testService.syncTests();
        }
        // testsInFile will descend in the test tree. We assume that as we go
        // deeper, ranges get more specific. We'll want to run all tests whose
        // range is equal to the most specific range we find (see #133519)
        //
        // If we don't find any test whose range contains the position, we pick
        // the closest one before the position. Again, if we find several tests
        // whose range is equal to the closest one, we run them all.
        const testsToRun = await showDiscoveringWhile(progressService, getTestsAtCursor(testService, uriIdentityService, model.uri, position, test => !!(profileService.capabilitiesForTest(test.item) & this.group)));
        if (testsToRun.length) {
            await testService.runTests({ group: this.group, tests: testsToRun });
            return;
        }
        const relatedTests = await testService.getTestsRelatedToCode(model.uri, position);
        if (relatedTests.length) {
            await testService.runTests({ group: this.group, tests: relatedTests });
            return;
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsAtCursor', "No tests found here"), position);
        }
    }
}
export class RunAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.runAtCursor" /* TestCommandId.RunAtCursor */,
            title: localize2('testing.runAtCursor', 'Run Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 33 /* KeyCode.KeyC */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.debugAtCursor" /* TestCommandId.DebugAtCursor */,
            title: localize2('testing.debugAtCursor', 'Debug Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.coverageAtCursor" /* TestCommandId.CoverageAtCursor */,
            title: localize2('testing.coverageAtCursor', 'Run Test at Cursor with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsUnderUriAction extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.ExplorerContext,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                    group: '6.5_testing',
                    order: (group === 2 /* TestRunProfileBitset.Run */ ? 11 /* ActionOrder.Run */ : 12 /* ActionOrder.Debug */) + 0.1,
                }],
        });
        this.group = group;
    }
    async run(accessor, uri) {
        const testService = accessor.get(ITestService);
        const notificationService = accessor.get(INotificationService);
        const tests = await Iterable.asyncToArray(testsUnderUri(testService, accessor.get(IUriIdentityService), uri));
        if (!tests.length) {
            notificationService.notify({ message: localize('noTests', 'No tests found in the selected file or folder'), severity: Severity.Info });
            return;
        }
        return testService.runTests({ tests, group: this.group });
    }
}
class RunTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.run.uri" /* TestCommandId.RunByUri */,
            title: LABEL_RUN_TESTS,
            category,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
class DebugTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.debug.uri" /* TestCommandId.DebugByUri */,
            title: LABEL_DEBUG_TESTS,
            category,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
class CoverageTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.coverage.uri" /* TestCommandId.CoverageByUri */,
            title: LABEL_COVERAGE_TESTS,
            category,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsInCurrentFile extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                }, {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */ ? 2 /* EditorContextOrder.RunInFile */ : 3 /* EditorContextOrder.DebugInFile */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                }],
        });
        this.group = group;
    }
    async _runByUris(accessor, files) {
        const uriIdentity = accessor.get(IUriIdentityService);
        const testService = accessor.get(ITestService);
        const discovered = [];
        for (const uri of files) {
            for await (const file of testsInFile(testService, uriIdentity, uri, undefined, true)) {
                discovered.push(file);
            }
        }
        if (discovered.length) {
            const r = await testService.runTests({ tests: discovered, group: this.group });
            return { completedAt: r.completedAt };
        }
        return { completedAt: undefined };
    }
    /**
     * @override
     */
    run(accessor, files) {
        if (files?.length) {
            return this._runByUris(accessor, files);
        }
        const uriIdentity = accessor.get(IUriIdentityService);
        let editor = accessor.get(ICodeEditorService).getActiveCodeEditor();
        if (!editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        // Iterate through the entire collection and run any tests that are in the
        // uri. See #138007.
        const queue = [testService.collection.rootIds];
        const discovered = [];
        while (queue.length) {
            for (const id of queue.pop()) {
                const node = testService.collection.getNodeById(id);
                if (uriIdentity.extUri.isEqual(node.item.uri, model.uri)) {
                    discovered.push(node);
                }
                else {
                    queue.push(node.children);
                }
            }
        }
        if (discovered.length) {
            return testService.runTests({
                tests: discovered,
                group: this.group,
            });
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsInFile', "No tests found in this file"), position);
        }
        return undefined;
    }
}
export class RunCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.runCurrentFile" /* TestCommandId.RunCurrentFile */,
            title: localize2('testing.runCurrentFile', 'Run Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 36 /* KeyCode.KeyF */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.debugCurrentFile" /* TestCommandId.DebugCurrentFile */,
            title: localize2('testing.debugCurrentFile', 'Debug Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.coverageCurrentFile" /* TestCommandId.CoverageCurrentFile */,
            title: localize2('testing.coverageCurrentFile', 'Run Tests with Coverage in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
export const discoverAndRunTests = async (collection, progress, ids, runTests) => {
    const todo = Promise.all(ids.map(p => expandAndGetTestById(collection, p)));
    const tests = (await showDiscoveringWhile(progress, todo)).filter(isDefined);
    return tests.length ? await runTests(tests) : undefined;
};
class RunOrDebugExtsByPath extends Action2 {
    /**
     * @override
     */
    async run(accessor, ...args) {
        const testService = accessor.get(ITestService);
        await discoverAndRunTests(accessor.get(ITestService).collection, accessor.get(IProgressService), [...this.getTestExtIdsToRun(accessor, ...args)], tests => this.runTest(testService, tests));
    }
}
class RunOrDebugFailedTests extends RunOrDebugExtsByPath {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: hasAnyTestProvider,
            },
        });
    }
    /**
     * @inheritdoc
     */
    getTestExtIdsToRun(accessor) {
        const { results } = accessor.get(ITestResultService);
        const ids = new Set();
        for (let i = results.length - 1; i >= 0; i--) {
            const resultSet = results[i];
            for (const test of resultSet.tests) {
                if (isFailedState(test.ownComputedState)) {
                    ids.add(test.item.extId);
                }
                else {
                    ids.delete(test.item.extId);
                }
            }
        }
        return ids;
    }
}
class RunOrDebugLastRun extends Action2 {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(hasAnyTestProvider, TestingContextKeys.hasAnyResults.isEqualTo(true)),
            },
        });
    }
    getLastTestRunRequest(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId ? resultService.results.find(r => r.id === runId) : resultService.results[0];
        return lastResult?.request;
    }
    /** @inheritdoc */
    async run(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId ? resultService.results.find(r => r.id === runId) : resultService.results[0];
        if (!lastResult) {
            return;
        }
        const req = lastResult.request;
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const profileExists = (t) => profileService.getControllerProfiles(t.controllerId).some(p => p.profileId === t.profileId);
        await discoverAndRunTests(testService.collection, accessor.get(IProgressService), req.targets.flatMap(t => t.testIds), tests => {
            // If we're requesting a re-run in the same group and have the same profiles
            // as were used before, then use those exactly. Otherwise guess naively.
            if (this.getGroup() & req.group && req.targets.every(profileExists)) {
                return testService.runResolvedTests({
                    targets: req.targets,
                    group: req.group,
                    exclude: req.exclude,
                });
            }
            else {
                return testService.runTests({ tests, group: this.getGroup() });
            }
        });
    }
}
export class ReRunFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.reRunFailTests" /* TestCommandId.ReRunFailedTests */,
            title: localize2('testing.reRunFailTests', 'Rerun Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 2 /* TestRunProfileBitset.Run */,
            tests: internalTests,
        });
    }
}
export class DebugFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.debugFailTests" /* TestCommandId.DebugFailedTests */,
            title: localize2('testing.debugFailTests', 'Debug Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 4 /* TestRunProfileBitset.Debug */,
            tests: internalTests,
        });
    }
}
export class ReRunLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.reRunLastRun" /* TestCommandId.ReRunLastRun */,
            title: localize2('testing.reRunLastRun', 'Rerun Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 2 /* TestRunProfileBitset.Run */;
    }
}
export class DebugLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.debugLastRun" /* TestCommandId.DebugLastRun */,
            title: localize2('testing.debugLastRun', 'Debug Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 4 /* TestRunProfileBitset.Debug */;
    }
}
export class CoverageLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.coverageLastRun" /* TestCommandId.CoverageLastRun */,
            title: localize2('testing.coverageLastRun', 'Rerun Last Run with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 8 /* TestRunProfileBitset.Coverage */;
    }
}
class RunOrDebugFailedFromLastRun extends Action2 {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(hasAnyTestProvider, TestingContextKeys.hasAnyResults.isEqualTo(true)),
            },
        });
    }
    /** @inheritdoc */
    async run(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const testService = accessor.get(ITestService);
        const progressService = accessor.get(IProgressService);
        const lastResult = runId ? resultService.results.find(r => r.id === runId) : resultService.results[0];
        if (!lastResult) {
            return;
        }
        const failedTestIds = new Set();
        for (const test of lastResult.tests) {
            if (isFailedState(test.ownComputedState)) {
                failedTestIds.add(test.item.extId);
            }
        }
        if (failedTestIds.size === 0) {
            return;
        }
        await discoverAndRunTests(testService.collection, progressService, Array.from(failedTestIds), tests => testService.runTests({ tests, group: this.getGroup() }));
    }
}
export class ReRunFailedFromLastRun extends RunOrDebugFailedFromLastRun {
    constructor() {
        super({
            id: "testing.reRunFailedFromLastRun" /* TestCommandId.ReRunFailedFromLastRun */,
            title: localize2('testing.reRunFailedFromLastRun', 'Rerun Failed Tests from Last Run'),
            category,
        });
    }
    getGroup() {
        return 2 /* TestRunProfileBitset.Run */;
    }
}
export class DebugFailedFromLastRun extends RunOrDebugFailedFromLastRun {
    constructor() {
        super({
            id: "testing.debugFailedFromLastRun" /* TestCommandId.DebugFailedFromLastRun */,
            title: localize2('testing.debugFailedFromLastRun', 'Debug Failed Tests from Last Run'),
            category,
        });
    }
    getGroup() {
        return 4 /* TestRunProfileBitset.Debug */;
    }
}
export class SearchForTestExtension extends Action2 {
    constructor() {
        super({
            id: "testing.searchForTestExtension" /* TestCommandId.SearchForTestExtension */,
            title: localize2('testing.searchForTestExtension', 'Search for Test Extension'),
        });
    }
    async run(accessor) {
        accessor.get(IExtensionsWorkbenchService).openSearch('@category:"testing"');
    }
}
export class OpenOutputPeek extends Action2 {
    constructor() {
        super({
            id: "testing.openOutputPeek" /* TestCommandId.OpenOutputPeek */,
            title: localize2('testing.openOutputPeek', 'Peek Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        accessor.get(ITestingPeekOpener).open();
    }
}
export class ToggleInlineTestOutput extends Action2 {
    constructor() {
        super({
            id: "testing.toggleInlineTestOutput" /* TestCommandId.ToggleInlineTestOutput */,
            title: localize2('testing.toggleInlineTestOutput', 'Toggle Inline Test Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        testService.showInlineOutput.value = !testService.showInlineOutput.value;
    }
}
const refreshMenus = (whenIsRefreshing) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.canRefreshTests.isEqualTo(true),
    },
];
export class RefreshTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.refreshTests" /* TestCommandId.RefreshTestsAction */,
            title: localize2('testing.refreshTests', 'Refresh Tests'),
            category,
            icon: icons.testingRefreshTests,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */),
                when: TestingContextKeys.canRefreshTests.isEqualTo(true),
            },
            menu: refreshMenus(false),
        });
    }
    async run(accessor, ...elements) {
        const testService = accessor.get(ITestService);
        const progressService = accessor.get(IProgressService);
        const controllerIds = distinct(elements.filter(isDefined).map(e => e.test.controllerId));
        return progressService.withProgress({ location: "workbench.view.extension.test" /* Testing.ViewletId */ }, async () => {
            if (controllerIds.length) {
                await Promise.all(controllerIds.map(id => testService.refreshTests(id)));
            }
            else {
                await testService.refreshTests();
            }
        });
    }
}
export class CancelTestRefreshAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelTestRefresh" /* TestCommandId.CancelTestRefreshAction */,
            title: localize2('testing.cancelTestRefresh', 'Cancel Test Refresh'),
            category,
            icon: icons.testingCancelRefreshTests,
            menu: refreshMenus(true),
        });
    }
    async run(accessor) {
        accessor.get(ITestService).cancelRefreshTests();
    }
}
export class CleareCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.coverage.close" /* TestCommandId.CoverageClear */,
            title: localize2('testing.clearCoverage', 'Clear Coverage'),
            icon: widgetClose,
            category,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10 /* ActionOrder.Refresh */,
                    when: ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */)
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.isTestCoverageOpen.isEqualTo(true),
                }]
        });
    }
    run(accessor) {
        accessor.get(ITestCoverageService).closeCoverage();
    }
}
export class OpenCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.openCoverage" /* TestCommandId.OpenCoverage */,
            title: localize2('testing.openCoverage', 'Open Coverage'),
            category,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                }]
        });
    }
    run(accessor) {
        const results = accessor.get(ITestResultService).results;
        const task = results.length && results[0].tasks.find(r => r.coverage);
        if (!task) {
            const notificationService = accessor.get(INotificationService);
            notificationService.info(localize('testing.noCoverage', 'No coverage information available on the last test run.'));
            return;
        }
        accessor.get(ITestCoverageService).openCoverage(task, true);
    }
}
class TestNavigationAction extends SymbolNavigationAction {
    runEditorCommand(accessor, editor, ...args) {
        this.testService = accessor.get(ITestService);
        this.uriIdentityService = accessor.get(IUriIdentityService);
        return super.runEditorCommand(accessor, editor, ...args);
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(67 /* EditorOption.gotoLocation */).alternativeTestsCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(67 /* EditorOption.gotoLocation */).multipleTests || 'peek';
    }
}
class GoToRelatedTestAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const tests = await this.testService.getTestsRelatedToCode(model.uri, position, token);
        return new ReferencesModel(tests.map(t => t.item.uri && ({ uri: t.item.uri, range: t.item.range || new Range(1, 1, 1, 1) })).filter(isDefined), localize('relatedTests', 'Related Tests'));
    }
    _getNoResultFoundMessage() {
        return localize('noTestFound', 'No related tests found.');
    }
}
class GoToRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: "testing.goToRelatedTest" /* TestCommandId.GoToRelatedTest */,
            title: localize2('testing.goToRelatedTest', 'Go to Related Test'),
            category,
            precondition: ContextKeyExpr.and(
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), TestingContextKeys.canGoToRelatedTest),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                }]
        });
    }
}
class PeekRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: "testing.peekRelatedTest" /* TestCommandId.PeekRelatedTest */,
            title: localize2('testing.peekToRelatedTest', 'Peek Related Test'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.canGoToRelatedTest, 
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                }]
        });
    }
}
class GoToRelatedCodeAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const testsAtCursor = await getTestsAtCursor(this.testService, this.uriIdentityService, model.uri, position);
        const code = await Promise.all(testsAtCursor.map(t => this.testService.getCodeRelatedToTest(t)));
        return new ReferencesModel(code.flat(), localize('relatedCode', 'Related Code'));
    }
    _getNoResultFoundMessage() {
        return localize('noRelatedCode', 'No related code found.');
    }
}
class GoToRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: "testing.goToRelatedCode" /* TestCommandId.GoToRelatedCode */,
            title: localize2('testing.goToRelatedCode', 'Go to Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                }]
        });
    }
}
class PeekRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: "testing.peekRelatedCode" /* TestCommandId.PeekRelatedCode */,
            title: localize2('testing.peekToRelatedCode', 'Peek Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                }]
        });
    }
}
export const allTestActions = [
    CancelTestRefreshAction,
    CancelTestRunAction,
    CleareCoverage,
    ClearTestResultsAction,
    CollapseAllAction,
    ConfigureTestProfilesAction,
    ContinuousRunTestAction,
    ContinuousRunUsingProfileTestAction,
    CoverageAction,
    CoverageAllAction,
    CoverageAtCursor,
    CoverageCurrentFile,
    CoverageLastRun,
    CoverageSelectedAction,
    CoverageTestsUnderUri,
    DebugAction,
    DebugAllAction,
    DebugAtCursor,
    DebugCurrentFile,
    DebugFailedTests,
    DebugLastRun,
    DebugSelectedAction,
    DebugTestsUnderUri,
    GetExplorerSelection,
    GetSelectedProfiles,
    GoToRelatedCode,
    GoToRelatedTest,
    GoToTest,
    HideTestAction,
    OpenCoverage,
    OpenOutputPeek,
    PeekRelatedCode,
    PeekRelatedTest,
    RefreshTestsAction,
    ReRunFailedTests,
    ReRunLastRun,
    RunAction,
    RunAllAction,
    RunAtCursor,
    RunCurrentFile,
    RunSelectedAction,
    RunTestsUnderUri,
    RunUsingProfileAction,
    SearchForTestExtension,
    SelectDefaultTestProfiles,
    ShowMostRecentOutputAction,
    StartContinuousRunAction,
    StopContinuousRunAction,
    TestingSortByDurationAction,
    TestingSortByLocationAction,
    TestingSortByStatusAction,
    TestingViewAsListAction,
    TestingViewAsTreeAction,
    ToggleInlineTestOutput,
    UnhideAllTestsAction,
    UnhideTestAction,
    ReRunFailedFromLastRun,
    DebugFailedFromLastRun,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RFeHBsb3JlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBRXBILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN0RixPQUFP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