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
var GettingStartedPage_1;
import { $, addDisposableListener, append, clearNode, reset } from '../../../../base/browser/dom.js';
import { renderFormattedText } from '../../../../base/browser/formattedTextRenderer.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { coalesce, equals } from '../../../../base/common/arrays.js';
import { Delayer, Throttler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { splitRecentLabel } from '../../../../base/common/labels.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { OS } from '../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import './media/gettingStarted.css';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService, WillSaveStateReason } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService, firstSessionDateStorageKey } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspacesService, isRecentFolder, isRecentWorkspace } from '../../../../platform/workspaces/common/workspaces.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { OpenFileFolderAction, OpenFolderAction, OpenFolderViaWorkspaceAction } from '../../../browser/actions/workspaceActions.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { WorkbenchStateContext } from '../../../common/contextkeys.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import './gettingStartedColors.js';
import { GettingStartedDetailsRenderer } from './gettingStartedDetailsRenderer.js';
import { gettingStartedCheckedCodicon, gettingStartedUncheckedCodicon } from './gettingStartedIcons.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { IWalkthroughsService, hiddenEntriesConfigurationKey, parseDescription } from './gettingStartedService.js';
import { restoreWalkthroughsConfigurationKey } from './startupPage.js';
import { copilotSettingsMessage, NEW_WELCOME_EXPERIENCE, startEntries } from '../common/gettingStartedContent.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { GettingStartedIndexList } from './gettingStartedList.js';
import { AccessibleViewAction } from '../../accessibility/browser/accessibleViewActions.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { startupExpContext, StartupExperimentGroup } from '../../../services/coreExperimentation/common/coreExperimentationService.js';
const SLIDE_TRANSITION_TIME_MS = 250;
const configurationKey = 'workbench.startupEditor';
export const allWalkthroughsHiddenContext = new RawContextKey('allWalkthroughsHidden', false);
export const inWelcomeContext = new RawContextKey('inWelcome', false);
const parsedStartEntries = startEntries.map((e, i) => ({
    command: e.content.command,
    description: e.description,
    icon: { type: 'icon', icon: e.icon },
    id: e.id,
    order: i,
    title: e.title,
    when: ContextKeyExpr.deserialize(e.when) ?? ContextKeyExpr.true()
}));
const REDUCED_MOTION_KEY = 'workbench.welcomePage.preferReducedMotion';
let GettingStartedPage = class GettingStartedPage extends EditorPane {
    static { GettingStartedPage_1 = this; }
    static { this.ID = 'gettingStartedPage'; }
    constructor(group, commandService, productService, keybindingService, gettingStartedService, configurationService, telemetryService, languageService, fileService, openerService, themeService, storageService, extensionService, instantiationService, notificationService, groupsService, contextService, quickInputService, workspacesService, labelService, hostService, webviewService, workspaceContextService, accessibilityService) {
        super(GettingStartedPage_1.ID, group, telemetryService, themeService, storageService);
        this.commandService = commandService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.gettingStartedService = gettingStartedService;
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.groupsService = groupsService;
        this.quickInputService = quickInputService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.hostService = hostService;
        this.webviewService = webviewService;
        this.workspaceContextService = workspaceContextService;
        this.accessibilityService = accessibilityService;
        this.inProgressScroll = Promise.resolve();
        this.dispatchListeners = new DisposableStore();
        this.stepDisposables = new DisposableStore();
        this.detailsPageDisposables = new DisposableStore();
        this.mediaDisposables = new DisposableStore();
        this.buildSlideThrottle = new Throttler();
        this.hasScrolledToFirstCategory = false;
        this.showFeaturedWalkthrough = true;
        this.currentMediaComponent = undefined;
        this.currentMediaType = undefined;
        this.container = $('.gettingStartedContainer', {
            role: 'document',
            tabindex: 0,
            'aria-label': localize('welcomeAriaLabel', "Overview of how to get up to speed with your editor.")
        });
        this.stepMediaComponent = $('.getting-started-media');
        this.stepMediaComponent.id = generateUuid();
        this.categoriesSlideDisposables = this._register(new DisposableStore());
        this.detailsRenderer = new GettingStartedDetailsRenderer(this.fileService, this.notificationService, this.extensionService, this.languageService);
        this.contextService = this._register(contextService.createScoped(this.container));
        inWelcomeContext.bindTo(this.contextService).set(true);
        this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        this._register(this.dispatchListeners);
        this.buildSlideThrottle = new Throttler();
        const rerender = () => {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
            if (this.currentWalkthrough) {
                const existingSteps = this.currentWalkthrough.steps.map(step => step.id);
                const newCategory = this.gettingStartedCategories.find(category => this.currentWalkthrough?.id === category.id);
                if (newCategory) {
                    const newSteps = newCategory.steps.map(step => step.id);
                    if (!equals(newSteps, existingSteps)) {
                        this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
                    }
                }
            }
            else {
                this.buildSlideThrottle.queue(() => this.buildCategoriesSlide());
            }
        };
        this._register(this.gettingStartedService.onDidAddWalkthrough(rerender));
        this._register(this.gettingStartedService.onDidRemoveWalkthrough(rerender));
        this.recentlyOpened = this.workspacesService.getRecentlyOpened();
        this._register(workspacesService.onDidChangeRecentlyOpened(() => {
            this.recentlyOpened = workspacesService.getRecentlyOpened();
            rerender();
        }));
        this._register(this.gettingStartedService.onDidChangeWalkthrough(category => {
            const ourCategory = this.gettingStartedCategories.find(c => c.id === category.id);
            if (!ourCategory) {
                return;
            }
            ourCategory.title = category.title;
            ourCategory.description = category.description;
            this.container.querySelectorAll(`[x-category-title-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.title);
            this.container.querySelectorAll(`[x-category-description-for="${category.id}"]`).forEach(step => step.innerText = ourCategory.description);
        }));
        this._register(this.gettingStartedService.onDidProgressStep(step => {
            const category = step.category === NEW_WELCOME_EXPERIENCE ? this.gettingStartedService.getWalkthrough(step.category) :
                this.gettingStartedCategories.find(c => c.id === step.category);
            if (!category) {
                throw Error('Could not find category with ID: ' + step.category);
            }
            const ourStep = category.steps.find(_step => _step.id === step.id);
            if (!ourStep) {
                throw Error('Could not find step with ID: ' + step.id);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            if (!ourStep.done && stats.stepsComplete === stats.stepsTotal - 1) {
                this.hideCategory(category.id);
            }
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(REDUCED_MOTION_KEY)) {
                    this.container.classList.toggle('animatable', this.shouldAnimate());
                }
            }));
            ourStep.done = step.done;
            if (category.id === this.currentWalkthrough?.id) {
                const badgeelements = assertReturnsDefined(this.window.document.querySelectorAll(`[data-done-step-id="${step.id}"]`));
                badgeelements.forEach(badgeelement => {
                    if (step.done) {
                        badgeelement.setAttribute('aria-checked', 'true');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'true');
                        badgeelement.classList.remove(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.classList.add('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepDone', "Checkbox for Step {0}: Completed", step.title));
                    }
                    else {
                        badgeelement.setAttribute('aria-checked', 'false');
                        badgeelement.parentElement?.setAttribute('aria-checked', 'false');
                        badgeelement.classList.remove('complete', ...ThemeIcon.asClassNameArray(gettingStartedCheckedCodicon));
                        badgeelement.classList.add(...ThemeIcon.asClassNameArray(gettingStartedUncheckedCodicon));
                        badgeelement.setAttribute('aria-label', localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title));
                    }
                });
            }
            this.updateCategoryProgress();
        }));
        this._register(this.storageService.onWillSaveState((e) => {
            if (e.reason !== WillSaveStateReason.SHUTDOWN) {
                return;
            }
            if (this.workspaceContextService.getWorkspace().folders.length !== 0) {
                return;
            }
            if (!this.editorInput || !this.currentWalkthrough || !this.editorInput.selectedCategory || !this.editorInput.selectedStep) {
                return;
            }
            const editorPane = this.groupsService.activeGroup.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage_1)) {
                return;
            }
            // Save the state of the walkthrough so we can restore it on reload
            const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
            this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }));
    }
    // remove when 'workbench.welcomePage.preferReducedMotion' deprecated
    shouldAnimate() {
        if (this.configurationService.getValue(REDUCED_MOTION_KEY)) {
            return false;
        }
        if (this.accessibilityService.isMotionReduced()) {
            return false;
        }
        return true;
    }
    getWalkthroughCompletionStats(walkthrough) {
        const activeSteps = walkthrough.steps.filter(s => this.contextService.contextMatchesRules(s.when));
        return {
            stepsComplete: activeSteps.filter(s => s.done).length,
            stepsTotal: activeSteps.length,
        };
    }
    async setInput(newInput, options, context, token) {
        this.container.classList.remove('animatable');
        this.editorInput = newInput;
        this.editorInput.showTelemetryNotice = options?.showTelemetryNotice ?? true;
        await super.setInput(newInput, options, context, token);
        await this.buildCategoriesSlide();
        if (this.shouldAnimate()) {
            setTimeout(() => this.container.classList.add('animatable'), 0);
        }
    }
    async makeCategoryVisibleWhenAvailable(categoryID, stepId) {
        this.scrollToCategory(categoryID, stepId);
    }
    registerDispatchListeners() {
        this.dispatchListeners.clear();
        this.container.querySelectorAll('[x-dispatch]').forEach(element => {
            const dispatch = element.getAttribute('x-dispatch') ?? '';
            let command, argument;
            if (dispatch.startsWith('openLink:https')) {
                [command, argument] = ['openLink', dispatch.replace('openLink:', '')];
            }
            else {
                [command, argument] = dispatch.split(':');
            }
            if (command) {
                this.dispatchListeners.add(addDisposableListener(element, 'click', (e) => {
                    e.stopPropagation();
                    this.runDispatchCommand(command, argument);
                }));
                this.dispatchListeners.add(addDisposableListener(element, 'keyup', (e) => {
                    const keyboardEvent = new StandardKeyboardEvent(e);
                    e.stopPropagation();
                    switch (keyboardEvent.keyCode) {
                        case 3 /* KeyCode.Enter */:
                        case 10 /* KeyCode.Space */:
                            this.runDispatchCommand(command, argument);
                            return;
                    }
                }));
            }
        });
    }
    async runDispatchCommand(command, argument) {
        this.commandService.executeCommand('workbench.action.keepEditor');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command, argument, walkthroughId: this.currentWalkthrough?.id });
        switch (command) {
            case 'scrollPrev': {
                this.scrollPrev();
                break;
            }
            case 'skip': {
                this.runSkip();
                break;
            }
            case 'showMoreRecents': {
                this.commandService.executeCommand(OpenRecentAction.ID);
                break;
            }
            case 'seeAllWalkthroughs': {
                await this.openWalkthroughSelector();
                break;
            }
            case 'openFolder': {
                if (this.contextService.contextMatchesRules(ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace')))) {
                    this.commandService.executeCommand(OpenFolderViaWorkspaceAction.ID);
                }
                else {
                    this.commandService.executeCommand('workbench.action.files.openFolder');
                }
                break;
            }
            case 'selectCategory': {
                this.scrollToCategory(argument);
                this.gettingStartedService.markWalkthroughOpened(argument);
                break;
            }
            case 'selectStartEntry': {
                const selected = startEntries.find(e => e.id === argument);
                if (selected) {
                    this.runStepCommand(selected.content.command);
                }
                else {
                    throw Error('could not find start entry with id: ' + argument);
                }
                break;
            }
            case 'hideCategory': {
                this.hideCategory(argument);
                break;
            }
            // Use selectTask over selectStep to keep telemetry consistant:https://github.com/microsoft/vscode/issues/122256
            case 'selectTask': {
                this.selectStep(argument);
                break;
            }
            case 'toggleStepCompletion': {
                this.toggleStepCompletion(argument);
                break;
            }
            case 'allDone': {
                this.markAllStepsComplete();
                break;
            }
            case 'nextSection': {
                const next = this.currentWalkthrough?.next;
                if (next) {
                    this.prevWalkthrough = this.currentWalkthrough;
                    this.scrollToCategory(next);
                }
                else {
                    console.error('Error scrolling to next section of', this.currentWalkthrough);
                }
                break;
            }
            case 'openLink': {
                this.openerService.open(argument);
                break;
            }
            default: {
                console.error('Dispatch to', command, argument, 'not defined');
                break;
            }
        }
    }
    hideCategory(categoryId) {
        const selectedCategory = this.gettingStartedCategories.find(category => category.id === categoryId);
        if (!selectedCategory) {
            throw Error('Could not find category with ID ' + categoryId);
        }
        this.setHiddenCategories([...this.getHiddenCategories().add(categoryId)]);
        this.gettingStartedList?.rerender();
    }
    markAllStepsComplete() {
        if (this.currentWalkthrough) {
            this.currentWalkthrough?.steps.forEach(step => {
                if (!step.done) {
                    this.gettingStartedService.progressStep(step.id);
                }
            });
            this.hideCategory(this.currentWalkthrough?.id);
            this.scrollPrev();
        }
        else {
            throw Error('No walkthrough opened');
        }
    }
    toggleStepCompletion(argument) {
        const stepToggle = assertReturnsDefined(this.currentWalkthrough?.steps.find(step => step.id === argument));
        if (stepToggle.done) {
            this.gettingStartedService.deprogressStep(argument);
        }
        else {
            this.gettingStartedService.progressStep(argument);
        }
    }
    async openWalkthroughSelector() {
        const selection = await this.quickInputService.pick(this.gettingStartedCategories
            .filter(c => this.contextService.contextMatchesRules(c.when))
            .map(x => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        })), { canPickMany: false, matchOnDescription: true, matchOnDetail: true, title: localize('pickWalkthroughs', "Open Walkthrough...") });
        if (selection) {
            this.runDispatchCommand('selectCategory', selection.id);
        }
    }
    getHiddenCategories() {
        return new Set(JSON.parse(this.storageService.get(hiddenEntriesConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
    }
    setHiddenCategories(hidden) {
        this.storageService.store(hiddenEntriesConfigurationKey, JSON.stringify(hidden), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async buildMediaComponent(stepId, forceRebuild = false) {
        if (!this.currentWalkthrough) {
            throw Error('no walkthrough selected');
        }
        const stepToExpand = assertReturnsDefined(this.currentWalkthrough.steps.find(step => step.id === stepId));
        if (!forceRebuild && this.currentMediaComponent === stepId) {
            return;
        }
        this.currentMediaComponent = stepId;
        this.stepDisposables.clear();
        this.stepDisposables.add({
            dispose: () => {
                this.currentMediaComponent = undefined;
            }
        });
        if (this.currentMediaType !== stepToExpand.media.type) {
            this.currentMediaType = stepToExpand.media.type;
            this.mediaDisposables.add(toDisposable(() => {
                this.currentMediaType = undefined;
            }));
            clearNode(this.stepMediaComponent);
            if (stepToExpand.media.type === 'svg') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ title: undefined, options: { disableServiceWorker: true }, contentOptions: {}, extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'markdown') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
            else if (stepToExpand.media.type === 'video') {
                this.webview = this.mediaDisposables.add(this.webviewService.createWebviewElement({ options: {}, contentOptions: { localResourceRoots: [stepToExpand.media.root], allowScripts: true }, title: '', extension: undefined }));
                this.webview.mountTo(this.stepMediaComponent, this.window);
            }
        }
        if (stepToExpand.media.type === 'image') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const mediaElement = $('img');
            clearNode(this.stepMediaComponent);
            this.stepMediaComponent.appendChild(mediaElement);
            mediaElement.setAttribute('alt', media.altText);
            this.updateMediaSourceForColorMode(mediaElement, media.path);
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(() => this.updateMediaSourceForColorMode(mediaElement, media.path)));
        }
        else if (stepToExpand.media.type === 'svg') {
            this.stepsContent.classList.add('image');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            this.webview.setHtml(await this.detailsRenderer.renderSVG(media.path));
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const body = await this.detailsRenderer.renderSVG(media.path);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
            this.stepDisposables.add(addDisposableListener(this.stepMediaComponent, 'click', () => {
                const hrefs = stepToExpand.description.map(lt => lt.nodes.filter((node) => typeof node !== 'string').map(node => node.href)).flat();
                if (hrefs.length === 1) {
                    const href = hrefs[0];
                    if (href.startsWith('http')) {
                        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
                        this.openerService.open(href);
                    }
                }
            }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    this.openerService.open(link, { allowCommands: true });
                }
            }));
        }
        else if (stepToExpand.media.type === 'markdown') {
            this.stepsContent.classList.remove('image');
            this.stepsContent.classList.add('markdown');
            this.stepsContent.classList.remove('video');
            const media = stepToExpand.media;
            const rawHTML = await this.detailsRenderer.renderMarkdown(media.path, media.base);
            this.webview.setHtml(rawHTML);
            const serializedContextKeyExprs = rawHTML.match(/checked-on=\"([^'][^"]*)\"/g)?.map(attr => attr.slice('checked-on="'.length, -1)
                .replace(/&#39;/g, '\'')
                .replace(/&amp;/g, '&'));
            const postTrueKeysMessage = () => {
                const enabledContextKeys = serializedContextKeyExprs?.filter(expr => this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(expr)));
                if (enabledContextKeys) {
                    this.webview.postMessage({
                        enabledContextKeys
                    });
                }
            };
            if (serializedContextKeyExprs) {
                const contextKeyExprs = coalesce(serializedContextKeyExprs.map(expr => ContextKeyExpr.deserialize(expr)));
                const watchingKeys = new Set(contextKeyExprs.flatMap(expr => expr.keys()));
                this.stepDisposables.add(this.contextService.onDidChangeContext(e => {
                    if (e.affectsSome(watchingKeys)) {
                        postTrueKeysMessage();
                    }
                }));
            }
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.webview.onDidClickLink(link => {
                if (matchesScheme(link, Schemas.https) || matchesScheme(link, Schemas.http) || (matchesScheme(link, Schemas.command))) {
                    const toSide = link.startsWith('command:toSide:');
                    if (toSide) {
                        link = link.replace('command:toSide:', 'command:');
                        this.focusSideEditorGroup();
                    }
                    this.openerService.open(link, { allowCommands: true, openToSide: toSide });
                }
            }));
            if (rawHTML.indexOf('<code>') >= 0) {
                // Render again when Theme changes since syntax highlighting of code blocks may have changed
                this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                    const body = await this.detailsRenderer.renderMarkdown(media.path, media.base);
                    if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                        this.webview.setHtml(body);
                        postTrueKeysMessage();
                    }
                }));
            }
            const layoutDelayer = new Delayer(50);
            this.layoutMarkdown = () => {
                layoutDelayer.trigger(() => {
                    this.webview.postMessage({ layoutMeNow: true });
                });
            };
            this.stepDisposables.add(layoutDelayer);
            this.stepDisposables.add({ dispose: () => this.layoutMarkdown = undefined });
            postTrueKeysMessage();
            this.stepDisposables.add(this.webview.onMessage(async (e) => {
                const message = e.message;
                if (message.startsWith('command:')) {
                    this.openerService.open(message, { allowCommands: true });
                }
                else if (message.startsWith('setTheme:')) {
                    const themeId = message.slice('setTheme:'.length);
                    const theme = (await this.themeService.getColorThemes()).find(theme => theme.settingsId === themeId);
                    if (theme) {
                        this.themeService.setColorTheme(theme.id, 2 /* ConfigurationTarget.USER */);
                    }
                }
                else {
                    console.error('Unexpected message', message);
                }
            }));
        }
        else if (stepToExpand.media.type === 'video') {
            this.stepsContent.classList.add('video');
            this.stepsContent.classList.remove('markdown');
            this.stepsContent.classList.remove('image');
            const media = stepToExpand.media;
            const themeType = this.themeService.getColorTheme().type;
            const videoPath = media.path[themeType];
            const videoPoster = media.poster ? media.poster[themeType] : undefined;
            const altText = media.altText ? media.altText : localize('videoAltText', "Video for {0}", stepToExpand.title);
            const rawHTML = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
            this.webview.setHtml(rawHTML);
            let isDisposed = false;
            this.stepDisposables.add(toDisposable(() => { isDisposed = true; }));
            this.stepDisposables.add(this.themeService.onDidColorThemeChange(async () => {
                // Render again since color vars change
                const themeType = this.themeService.getColorTheme().type;
                const videoPath = media.path[themeType];
                const videoPoster = media.poster ? media.poster[themeType] : undefined;
                const body = await this.detailsRenderer.renderVideo(videoPath, videoPoster, altText);
                if (!isDisposed) { // Make sure we weren't disposed of in the meantime
                    this.webview.setHtml(body);
                }
            }));
        }
    }
    async selectStepLoose(id) {
        // Allow passing in id with a category appended or with just the id of the step
        if (id.startsWith(`${this.editorInput.selectedCategory}#`)) {
            this.selectStep(id);
        }
        else {
            const toSelect = this.editorInput.selectedCategory + '#' + id;
            this.selectStep(toSelect);
        }
    }
    provideScreenReaderUpdate() {
        if (this.configurationService.getValue("accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */)) {
            const kbLabel = this.keybindingService.lookupKeybinding(AccessibleViewAction.id)?.getAriaLabel();
            return kbLabel ? localize('acessibleViewHint', "Inspect this in the accessible view ({0}).\n", kbLabel) : localize('acessibleViewHintNoKbOpen', "Inspect this in the accessible view via the command Open Accessible View which is currently not triggerable via keybinding.\n");
        }
        return '';
    }
    async selectStep(id, delayFocus = true) {
        if (id) {
            let stepElement = this.container.querySelector(`[data-step-id="${id}"]`);
            if (!stepElement) {
                // Selected an element that is not in-context, just fallback to whatever.
                stepElement = this.container.querySelector(`[data-step-id]`);
                if (!stepElement) {
                    // No steps around... just ignore.
                    return;
                }
                id = assertReturnsDefined(stepElement.getAttribute('data-step-id'));
            }
            stepElement.parentElement?.querySelectorAll('.expanded').forEach(node => {
                if (node.getAttribute('data-step-id') !== id) {
                    node.classList.remove('expanded');
                    node.setAttribute('aria-expanded', 'false');
                    const codiconElement = node.querySelector('.codicon');
                    if (codiconElement) {
                        codiconElement.removeAttribute('tabindex');
                    }
                }
            });
            setTimeout(() => stepElement.focus(), delayFocus && this.shouldAnimate() ? SLIDE_TRANSITION_TIME_MS : 0);
            this.editorInput.selectedStep = id;
            stepElement.classList.add('expanded');
            stepElement.setAttribute('aria-expanded', 'true');
            this.buildMediaComponent(id, true);
            const codiconElement = stepElement.querySelector('.codicon');
            if (codiconElement) {
                codiconElement.setAttribute('tabindex', '0');
            }
            this.gettingStartedService.progressByEvent('stepSelected:' + id);
            const step = this.currentWalkthrough?.steps?.find(step => step.id === id);
            if (step) {
                stepElement.setAttribute('aria-label', `${this.provideScreenReaderUpdate()} ${step.title}`);
            }
        }
        else {
            this.editorInput.selectedStep = undefined;
        }
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateMediaSourceForColorMode(element, sources) {
        const themeType = this.themeService.getColorTheme().type;
        const src = sources[themeType].toString(true).replace(/ /g, '%20');
        element.srcset = src.toLowerCase().endsWith('.svg') ? src : (src + ' 1.5x');
    }
    createEditor(parent) {
        if (this.detailsPageScrollbar) {
            this.detailsPageScrollbar.dispose();
        }
        if (this.categoriesPageScrollbar) {
            this.categoriesPageScrollbar.dispose();
        }
        this.categoriesSlide = $('.gettingStartedSlideCategories.gettingStartedSlide');
        const prevButton = $('button.prev-button.button-link', { 'x-dispatch': 'scrollPrev' }, $('span.scroll-button.codicon.codicon-chevron-left'), $('span.moreText', {}, localize('goBack', "Go Back")));
        this.stepsSlide = $('.gettingStartedSlideDetails.gettingStartedSlide', {}, prevButton);
        this.stepsContent = $('.gettingStartedDetailsContent', {});
        this.detailsPageScrollbar = this._register(new DomScrollableElement(this.stepsContent, { className: 'full-height-scrollable', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.categoriesPageScrollbar = this._register(new DomScrollableElement(this.categoriesSlide, { className: 'full-height-scrollable categoriesScrollbar', vertical: 2 /* ScrollbarVisibility.Hidden */ }));
        this.stepsSlide.appendChild(this.detailsPageScrollbar.getDomNode());
        const gettingStartedPage = $('.gettingStarted', {}, this.categoriesPageScrollbar.getDomNode(), this.stepsSlide);
        this.container.appendChild(gettingStartedPage);
        this.categoriesPageScrollbar.scanDomNode();
        this.detailsPageScrollbar.scanDomNode();
        parent.appendChild(this.container);
    }
    async buildCategoriesSlide() {
        this.categoriesSlideDisposables.clear();
        const showOnStartupCheckbox = new Toggle({
            icon: Codicon.check,
            actionClassName: 'getting-started-checkbox',
            isChecked: this.configurationService.getValue(configurationKey) === 'welcomePage',
            title: localize('checkboxTitle', "When checked, this page will be shown on startup."),
            ...defaultToggleStyles
        });
        showOnStartupCheckbox.domNode.id = 'showOnStartup';
        const showOnStartupLabel = $('label.caption', { for: 'showOnStartup' }, localize('welcomePage.showOnStartup', "Show welcome page on startup"));
        const onShowOnStartupChanged = () => {
            if (showOnStartupCheckbox.checked) {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupChecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'welcomePage');
            }
            else {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'showOnStartupUnchecked', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.configurationService.updateValue(configurationKey, 'none');
            }
        };
        this.categoriesSlideDisposables.add(showOnStartupCheckbox);
        this.categoriesSlideDisposables.add(showOnStartupCheckbox.onChange(() => {
            onShowOnStartupChanged();
        }));
        this.categoriesSlideDisposables.add(addDisposableListener(showOnStartupLabel, 'click', () => {
            showOnStartupCheckbox.checked = !showOnStartupCheckbox.checked;
            onShowOnStartupChanged();
        }));
        const header = $('.header', {}, $('h1.product-name.caption', {}, this.productService.nameLong), $('p.subtitle.description', {}, localize({ key: 'gettingStarted.editingEvolved', comment: ['Shown as subtitle on the Welcome page.'] }, "Editing evolved")));
        const leftColumn = $('.categories-column.categories-column-left', {});
        const rightColumn = $('.categories-column.categories-column-right', {});
        const startList = this.buildStartList();
        const recentList = this.buildRecentlyOpenedList();
        const gettingStartedList = this.buildGettingStartedWalkthroughsList();
        const footer = $('.footer', {}, $('p.showOnStartup', {}, showOnStartupCheckbox.domNode, showOnStartupLabel));
        const layoutLists = () => {
            if (gettingStartedList.itemCount) {
                this.container.classList.remove('noWalkthroughs');
                reset(rightColumn, gettingStartedList.getDomElement());
            }
            else {
                this.container.classList.add('noWalkthroughs');
                reset(rightColumn);
            }
            setTimeout(() => this.categoriesPageScrollbar?.scanDomNode(), 50);
            layoutRecentList();
        };
        const layoutRecentList = () => {
            if (this.container.classList.contains('noWalkthroughs')) {
                recentList.setLimit(10);
                reset(leftColumn, startList.getDomElement());
                reset(rightColumn, recentList.getDomElement());
            }
            else {
                recentList.setLimit(5);
                reset(leftColumn, startList.getDomElement(), recentList.getDomElement());
            }
        };
        gettingStartedList.onDidChange(layoutLists);
        layoutLists();
        reset(this.categoriesSlide, $('.gettingStartedCategoriesContainer', {}, header, leftColumn, rightColumn, footer));
        this.categoriesPageScrollbar?.scanDomNode();
        this.updateCategoryProgress();
        this.registerDispatchListeners();
        if (this.editorInput.selectedCategory) {
            const showNewExperience = this.editorInput.selectedCategory === NEW_WELCOME_EXPERIENCE;
            this.currentWalkthrough = this.gettingStartedCategories.find(category => category.id === this.editorInput.selectedCategory);
            if (!this.currentWalkthrough) {
                this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
                this.currentWalkthrough = showNewExperience ? this.gettingStartedService.getWalkthrough(this.editorInput.selectedCategory) : this.gettingStartedCategories.find(category => category.id === this.editorInput.selectedCategory);
                if (this.currentWalkthrough) {
                    if (showNewExperience) {
                        this.buildNewCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                    }
                    else {
                        this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                    }
                    this.setSlide('details');
                    return;
                }
            }
            else {
                if (showNewExperience) {
                    this.buildNewCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                }
                else {
                    this.buildCategorySlide(this.editorInput.selectedCategory, this.editorInput.selectedStep);
                }
                this.setSlide('details');
                return;
            }
        }
        const someStepsComplete = this.gettingStartedCategories.some(category => category.steps.find(s => s.done));
        if (this.editorInput.showTelemetryNotice && this.productService.openToWelcomeMainPage) {
            const telemetryNotice = $('p.telemetry-notice');
            this.buildTelemetryFooter(telemetryNotice);
            footer.appendChild(telemetryNotice);
        }
        else if (!this.productService.openToWelcomeMainPage && !someStepsComplete && !this.hasScrolledToFirstCategory && this.showFeaturedWalkthrough) {
            const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) || new Date().toUTCString();
            const daysSinceFirstSession = ((+new Date()) - (+new Date(firstSessionDateString))) / 1000 / 60 / 60 / 24;
            const fistContentBehaviour = daysSinceFirstSession < 1 ? 'openToFirstCategory' : 'index';
            const startupExpValue = startupExpContext.getValue(this.contextService);
            if (fistContentBehaviour === 'openToFirstCategory' && ((!startupExpValue || startupExpValue === '' || startupExpValue === StartupExperimentGroup.Control))) {
                const first = this.gettingStartedCategories.filter(c => !c.when || this.contextService.contextMatchesRules(c.when))[0];
                if (first) {
                    this.hasScrolledToFirstCategory = true;
                    this.currentWalkthrough = first;
                    this.editorInput.selectedCategory = this.currentWalkthrough?.id;
                    this.editorInput.walkthroughPageTitle = this.currentWalkthrough.walkthroughPageTitle;
                    if (first.id === NEW_WELCOME_EXPERIENCE) {
                        this.buildNewCategorySlide(this.editorInput.selectedCategory, undefined);
                    }
                    else {
                        this.buildCategorySlide(this.editorInput.selectedCategory, undefined);
                    }
                    this.setSlide('details', true /* firstLaunch */);
                    return;
                }
            }
        }
        this.setSlide('categories');
    }
    buildRecentlyOpenedList() {
        const renderRecent = (recent) => {
            let fullPath;
            let windowOpenable;
            if (isRecentFolder(recent)) {
                windowOpenable = { folderUri: recent.folderUri };
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.folderUri, { verbose: 2 /* Verbosity.LONG */ });
            }
            else {
                fullPath = recent.label || this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
                windowOpenable = { workspaceUri: recent.workspace.configPath };
            }
            const { name, parentPath } = splitRecentLabel(fullPath);
            const li = $('li');
            const link = $('button.button-link');
            link.innerText = name;
            link.title = fullPath;
            link.setAttribute('aria-label', localize('welcomePage.openFolderWithPath', "Open folder {0} with path {1}", name, parentPath));
            link.addEventListener('click', e => {
                this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'openRecent', argument: undefined, walkthroughId: this.currentWalkthrough?.id });
                this.hostService.openWindow([windowOpenable], {
                    forceNewWindow: e.ctrlKey || e.metaKey,
                    remoteAuthority: recent.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                });
                e.preventDefault();
                e.stopPropagation();
            });
            li.appendChild(link);
            const span = $('span');
            span.classList.add('path');
            span.classList.add('detail');
            span.innerText = parentPath;
            span.title = fullPath;
            li.appendChild(span);
            return li;
        };
        if (this.recentlyOpenedList) {
            this.recentlyOpenedList.dispose();
        }
        const recentlyOpenedList = this.recentlyOpenedList = new GettingStartedIndexList({
            title: localize('recent', "Recent"),
            klass: 'recently-opened',
            limit: 5,
            empty: $('.empty-recent', {}, localize('noRecents', "You have no recent folders,"), $('button.button-link', { 'x-dispatch': 'openFolder' }, localize('openFolder', "open a folder")), localize('toStart', "to start.")),
            more: $('.more', {}, $('button.button-link', {
                'x-dispatch': 'showMoreRecents',
                title: localize('show more recents', "Show All Recent Folders {0}", this.getKeybindingLabel(OpenRecentAction.ID))
            }, localize('showAll', "More..."))),
            renderElement: renderRecent,
            contextService: this.contextService
        });
        recentlyOpenedList.onDidChange(() => this.registerDispatchListeners());
        this.recentlyOpened.then(({ workspaces }) => {
            // Filter out the current workspace
            const workspacesWithID = workspaces
                .filter(recent => !this.workspaceContextService.isCurrentWorkspace(isRecentWorkspace(recent) ? recent.workspace : recent.folderUri))
                .map(recent => ({ ...recent, id: isRecentWorkspace(recent) ? recent.workspace.id : recent.folderUri.toString() }));
            const updateEntries = () => {
                recentlyOpenedList.setEntries(workspacesWithID);
            };
            updateEntries();
            recentlyOpenedList.register(this.labelService.onDidChangeFormatters(() => updateEntries()));
        }).catch(onUnexpectedError);
        return recentlyOpenedList;
    }
    buildStartList() {
        const renderStartEntry = (entry) => $('li', {}, $('button.button-link', {
            'x-dispatch': 'selectStartEntry:' + entry.id,
            title: entry.description + ' ' + this.getKeybindingLabel(entry.command),
        }, this.iconWidgetFor(entry), $('span', {}, entry.title)));
        if (this.startList) {
            this.startList.dispose();
        }
        const startList = this.startList = new GettingStartedIndexList({
            title: localize('start', "Start"),
            klass: 'start-container',
            limit: 10,
            renderElement: renderStartEntry,
            rankElement: e => -e.order,
            contextService: this.contextService
        });
        startList.setEntries(parsedStartEntries);
        startList.onDidChange(() => this.registerDispatchListeners());
        return startList;
    }
    buildGettingStartedWalkthroughsList() {
        const renderGetttingStaredWalkthrough = (category) => {
            const renderNewBadge = (category.newItems || category.newEntry) && !category.isFeatured;
            const newBadge = $('.new-badge', {});
            if (category.newEntry) {
                reset(newBadge, $('.new-category', {}, localize('new', "New")));
            }
            else if (category.newItems) {
                reset(newBadge, $('.new-items', {}, localize({ key: 'newItems', comment: ['Shown when a list of items has changed based on an update from a remote source'] }, "Updated")));
            }
            const featuredBadge = $('.featured-badge', {});
            const descriptionContent = $('.description-content', {});
            if (category.isFeatured && this.showFeaturedWalkthrough) {
                reset(featuredBadge, $('.featured', {}, $('span.featured-icon.codicon.codicon-star-full')));
                reset(descriptionContent, ...renderLabelWithIcons(category.description));
            }
            const titleContent = $('h3.category-title.max-lines-3', { 'x-category-title-for': category.id });
            reset(titleContent, ...renderLabelWithIcons(category.title));
            return $('button.getting-started-category' + (category.isFeatured && this.showFeaturedWalkthrough ? '.featured' : ''), {
                'x-dispatch': 'selectCategory:' + category.id,
                'title': category.description
            }, featuredBadge, $('.main-content', {}, this.iconWidgetFor(category), titleContent, renderNewBadge ? newBadge : $('.no-badge'), $('a.codicon.codicon-close.hide-category-button', {
                'tabindex': 0,
                'x-dispatch': 'hideCategory:' + category.id,
                'title': localize('close', "Hide"),
                'role': 'button',
                'aria-label': localize('closeAriaLabel', "Hide"),
            })), descriptionContent, $('.category-progress', { 'x-data-category-id': category.id, }, $('.progress-bar-outer', { 'role': 'progressbar' }, $('.progress-bar-inner'))));
        };
        if (this.gettingStartedList) {
            this.gettingStartedList.dispose();
        }
        const rankWalkthrough = (e) => {
            let rank = e.order;
            if (e.isFeatured) {
                rank += 7;
            }
            if (e.newEntry) {
                rank += 3;
            }
            if (e.newItems) {
                rank += 2;
            }
            if (e.recencyBonus) {
                rank += 4 * e.recencyBonus;
            }
            if (this.getHiddenCategories().has(e.id)) {
                rank = null;
            }
            return rank;
        };
        const gettingStartedList = this.gettingStartedList = new GettingStartedIndexList({
            title: localize('walkthroughs', "Walkthroughs"),
            klass: 'getting-started',
            limit: 5,
            footer: $('span.button-link.see-all-walkthroughs', { 'x-dispatch': 'seeAllWalkthroughs', 'tabindex': 0 }, localize('showAll', "More...")),
            renderElement: renderGetttingStaredWalkthrough,
            rankElement: rankWalkthrough,
            contextService: this.contextService,
        });
        gettingStartedList.onDidChange(() => {
            const hidden = this.getHiddenCategories();
            const someWalkthroughsHidden = hidden.size || gettingStartedList.itemCount < this.gettingStartedCategories.filter(c => this.contextService.contextMatchesRules(c.when)).length;
            this.container.classList.toggle('someWalkthroughsHidden', !!someWalkthroughsHidden);
            this.registerDispatchListeners();
            allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
            this.updateCategoryProgress();
        });
        gettingStartedList.setEntries(this.gettingStartedCategories);
        allWalkthroughsHiddenContext.bindTo(this.contextService).set(gettingStartedList.itemCount === 0);
        return gettingStartedList;
    }
    layout(size) {
        this.detailsScrollbar?.scanDomNode();
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.startList?.layout(size);
        this.gettingStartedList?.layout(size);
        this.recentlyOpenedList?.layout(size);
        if (this.editorInput?.selectedStep && this.currentMediaType) {
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
        }
        this.layoutMarkdown?.();
        this.container.classList.toggle('height-constrained', size.height <= 600);
        this.container.classList.toggle('width-constrained', size.width <= 400);
        this.container.classList.toggle('width-semi-constrained', size.width <= 950);
        this.container.classList.toggle('new-layout-width-constrained', size.width <= 800);
        this.categoriesPageScrollbar?.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    updateCategoryProgress() {
        this.window.document.querySelectorAll('.category-progress').forEach(element => {
            const categoryID = element.getAttribute('x-data-category-id');
            const category = categoryID === NEW_WELCOME_EXPERIENCE ? this.gettingStartedService.getWalkthrough(categoryID) :
                this.gettingStartedCategories.find(c => c.id === categoryID);
            if (!category) {
                throw Error('Could not find category with ID ' + categoryID);
            }
            const stats = this.getWalkthroughCompletionStats(category);
            const bar = assertReturnsDefined(element.querySelector('.progress-bar-inner'));
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuenow', '' + stats.stepsComplete);
            bar.setAttribute('aria-valuemax', '' + stats.stepsTotal);
            const progress = (stats.stepsComplete / stats.stepsTotal) * 100;
            bar.style.width = `${progress}%`;
            element.parentElement.classList.toggle('no-progress', stats.stepsComplete === 0);
            if (stats.stepsTotal === stats.stepsComplete) {
                bar.title = localize('gettingStarted.allStepsComplete', "All {0} steps complete!", stats.stepsComplete);
            }
            else {
                bar.title = localize('gettingStarted.someStepsComplete', "{0} of {1} steps complete", stats.stepsComplete, stats.stepsTotal);
            }
        });
    }
    async scrollToCategory(categoryID, stepId) {
        if (!this.gettingStartedCategories.some(c => c.id === categoryID)) {
            this.gettingStartedCategories = this.gettingStartedService.getWalkthroughs();
        }
        const ourCategory = categoryID === NEW_WELCOME_EXPERIENCE ? this.gettingStartedService.getWalkthrough(categoryID) :
            this.gettingStartedCategories.find(c => c.id === categoryID);
        if (!ourCategory) {
            throw Error('Could not find category with ID: ' + categoryID);
        }
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            reset(this.stepsContent);
            this.editorInput.selectedCategory = categoryID;
            this.editorInput.selectedStep = stepId;
            this.editorInput.walkthroughPageTitle = ourCategory.walkthroughPageTitle;
            this.currentWalkthrough = ourCategory;
            this.buildCategorySlide(categoryID, stepId);
            this.setSlide('details');
        });
    }
    iconWidgetFor(category) {
        const widget = category.icon.type === 'icon' ? $(ThemeIcon.asCSSSelector(category.icon.icon)) : $('img.category-icon', { src: category.icon.path });
        widget.classList.add('icon-widget');
        return widget;
    }
    focusSideEditorGroup() {
        const fullSize = this.groupsService.getPart(this.group).contentDimension;
        if (!fullSize || fullSize.width <= 700 || this.container.classList.contains('width-constrained') || this.container.classList.contains('width-semi-constrained')) {
            return;
        }
        if (this.groupsService.count === 1) {
            const sideGroup = this.groupsService.addGroup(this.groupsService.groups[0], 3 /* GroupDirection.RIGHT */);
            this.groupsService.activateGroup(sideGroup);
            const gettingStartedSize = Math.floor(fullSize.width / 2);
            const gettingStartedGroup = this.groupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(group => (group.activeEditor instanceof GettingStartedInput));
            this.groupsService.setSize(assertReturnsDefined(gettingStartedGroup), { width: gettingStartedSize, height: fullSize.height });
        }
        const nonGettingStartedGroup = this.groupsService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).find(group => !(group.activeEditor instanceof GettingStartedInput));
        if (nonGettingStartedGroup) {
            this.groupsService.activateGroup(nonGettingStartedGroup);
            nonGettingStartedGroup.focus();
        }
    }
    runStepCommand(href) {
        const isCommand = href.startsWith('command:');
        const toSide = href.startsWith('command:toSide:');
        const command = href.replace(/command:(toSide:)?/, 'command:');
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'runStepAction', argument: href, walkthroughId: this.currentWalkthrough?.id });
        if (toSide) {
            this.focusSideEditorGroup();
        }
        if (isCommand) {
            const commandURI = URI.parse(command);
            // execute as command
            let args = [];
            try {
                args = parse(decodeURIComponent(commandURI.query));
            }
            catch {
                // ignore and retry
                try {
                    args = parse(commandURI.query);
                }
                catch {
                    // ignore error
                }
            }
            if (!Array.isArray(args)) {
                args = [args];
            }
            // If a step is requesting the OpenFolder action to be executed in an empty workspace...
            if ((commandURI.path === OpenFileFolderAction.ID.toString() ||
                commandURI.path === OpenFolderAction.ID.toString()) &&
                this.workspaceContextService.getWorkspace().folders.length === 0) {
                const selectedStepIndex = this.currentWalkthrough?.steps.findIndex(step => step.id === this.editorInput.selectedStep);
                // and there are a few more steps after this step which are yet to be completed...
                if (selectedStepIndex !== undefined &&
                    selectedStepIndex > -1 &&
                    this.currentWalkthrough?.steps.slice(selectedStepIndex + 1).some(step => !step.done)) {
                    const restoreData = { folder: UNKNOWN_EMPTY_WINDOW_WORKSPACE.id, category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
                    // save state to restore after reload
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            this.commandService.executeCommand(commandURI.path, ...args).then(result => {
                const toOpen = result?.openFolder;
                if (toOpen) {
                    if (!URI.isUri(toOpen)) {
                        console.warn('Warn: Running walkthrough command', href, 'yielded non-URI `openFolder` result', toOpen, '. It will be disregarded.');
                        return;
                    }
                    const restoreData = { folder: toOpen.toString(), category: this.editorInput.selectedCategory, step: this.editorInput.selectedStep };
                    this.storageService.store(restoreWalkthroughsConfigurationKey, JSON.stringify(restoreData), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                    this.hostService.openWindow([{ folderUri: toOpen }]);
                }
            });
        }
        else {
            this.openerService.open(command, { allowCommands: true });
        }
        if (!isCommand && (href.startsWith('https://') || href.startsWith('http://'))) {
            this.gettingStartedService.progressByEvent('onLink:' + href);
        }
    }
    buildMarkdownDescription(container, text) {
        while (container.firstChild) {
            container.firstChild.remove();
        }
        for (const linkedText of text) {
            if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                const node = linkedText.nodes[0];
                const buttonContainer = append(container, $('.button-container'));
                const button = new Button(buttonContainer, { title: node.title, supportIcons: true, ...defaultButtonStyles });
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                button.label = node.label;
                button.onDidClick(e => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.runStepCommand(node.href);
                }, null, this.detailsPageDisposables);
                if (isCommand) {
                    const keybinding = this.getKeyBinding(command);
                    if (keybinding) {
                        const shortcutMessage = $('span.shortcut-message', {}, localize('gettingStarted.keyboardTip', 'Tip: Use keyboard shortcut '));
                        container.appendChild(shortcutMessage);
                        const label = new KeybindingLabel(shortcutMessage, OS, { ...defaultKeybindingLabelStyles });
                        label.set(keybinding);
                        this.detailsPageDisposables.add(label);
                    }
                }
                this.detailsPageDisposables.add(button);
            }
            else {
                const p = append(container, $('p'));
                for (const node of linkedText.nodes) {
                    if (typeof node === 'string') {
                        const labelWithIcon = renderLabelWithIcons(node);
                        for (const element of labelWithIcon) {
                            if (typeof element === 'string') {
                                p.appendChild(renderFormattedText(element, { renderCodeSegments: true }, $('span')));
                            }
                            else {
                                p.appendChild(element);
                            }
                        }
                    }
                    else {
                        const nodeWithTitle = matchesScheme(node.href, Schemas.http) || matchesScheme(node.href, Schemas.https) ? { ...node, title: node.href } : node;
                        const link = this.instantiationService.createInstance(Link, p, nodeWithTitle, { opener: (href) => this.runStepCommand(href) });
                        this.detailsPageDisposables.add(link);
                    }
                }
            }
        }
        return container;
    }
    clearInput() {
        this.stepDisposables.clear();
        super.clearInput();
    }
    selectStepByIndex(newIndex, steps, direction) {
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'selectTask', argument: steps[newIndex].id, walkthroughId: this.currentWalkthrough?.id });
        const currentIndex = steps.findIndex(step => step.id === this.editorInput.selectedStep);
        // Update the selected step and build its media
        this.selectSlide(steps[newIndex].id);
        // update footer visibility
        const footer = this.stepsContent.querySelector('.getting-started-footer');
        if (footer && newIndex !== 0) {
            footer.style.display = 'none';
        }
        else if (footer) {
            footer.style.display = 'block';
        }
        this.updateNavButtons(newIndex, steps);
        // Update the active dot
        const dots = this.stepsContent.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            if (index === newIndex) {
                dot.classList.add('active');
            }
            else {
                dot.classList.remove('active');
            }
        });
        if (currentIndex === newIndex) {
            return; // No change
        }
        const slidesContainer = this.stepsContent.querySelector('.step-slides-container');
        if (slidesContainer) {
            // Apply the transform to move the slides
            const slides = slidesContainer.querySelectorAll('.step-slide');
            // First make all slides visible for the animation
            slides.forEach((slide, index) => {
                const slideElement = slide;
                // Position all slides in their starting positions
                if (index === currentIndex) {
                    slideElement.style.display = 'block';
                    slideElement.style.transform = 'translateX(0)';
                }
                else if (index === newIndex) {
                    slideElement.style.display = 'block';
                    slideElement.style.transform = `translateX(${direction < 0 ? '-100%' : '100%'})`;
                }
                else {
                    slideElement.style.display = 'none';
                }
            });
            // Force a reflow to ensure the initial positions are applied
            slidesContainer.getBoundingClientRect();
            // Now animate to the final positions
            setTimeout(() => {
                slides.forEach((slide, index) => {
                    const slideElement = slide;
                    if (index === currentIndex) {
                        slideElement.style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
                        setTimeout(() => {
                            slideElement.style.display = 'none';
                        }, SLIDE_TRANSITION_TIME_MS);
                    }
                    else if (index === newIndex) {
                        slideElement.style.transform = 'translateX(0)';
                    }
                });
            }, 20);
        }
    }
    updateNavButtons(newIndex, steps) {
        const prevButton = this.stepsContent.querySelector('.button-link.navigation.back');
        if (newIndex === 0) {
            if (prevButton) {
                prevButton.classList.add('inactive');
                prevButton.setAttribute('aria-hidden', 'true');
                prevButton.setAttribute('tabindex', '-1');
            }
        }
        else {
            if (prevButton) {
                prevButton.classList.remove('inactive');
                prevButton.removeAttribute('aria-hidden');
                prevButton.removeAttribute('tabindex');
            }
        }
        // Update next button text for final slide
        if (this.nextButton) {
            const isLastSlide = newIndex === steps.length - 1;
            const textNode = this.nextButton.firstChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = isLastSlide
                    ? localize('last', "Start coding")
                    : localize('next', "Next");
            }
            this.nextButton.setAttribute('aria-label', isLastSlide
                ? localize('lastStep', "Start coding")
                : localize('nextStep', "Next"));
        }
    }
    buildNewCategorySlide(categoryID, selectedStep) {
        this.container.classList.add('newSlide');
        if (this.detailsScrollbar) {
            this.detailsScrollbar.dispose();
        }
        this.detailsPageDisposables.clear();
        this.mediaDisposables.clear();
        const category = this.gettingStartedService.getWalkthrough(categoryID);
        if (!category) {
            throw Error('could not find category with ID ' + categoryID);
        }
        // Filter steps based on when context
        const steps = category.steps.filter(step => this.contextService.contextMatchesRules(step.when));
        const groupedSteps = new Map();
        steps.forEach(step => {
            const prefixMatch = step.id.match(/^([^.]+)\./);
            const prefix = prefixMatch ? prefixMatch[1] : step.id;
            if (!groupedSteps.has(prefix)) {
                groupedSteps.set(prefix, []);
            }
            groupedSteps.get(prefix)?.push(step);
        });
        // Create the slide container that will hold all step slides
        const slidesContainer = $('.step-slides-container');
        const navigationContainer = $('.step-dots-container');
        // Add back button
        const prevButton = $('button.button-link.navigation.back', {
            'aria-label': localize('previousStep', "Previous Step"),
            'tabindex': '0'
        }, $('span.codicon.codicon-arrow-left'), localize('back', "Back"));
        const dotsContainer = $('.dots-centered');
        navigationContainer.appendChild(prevButton);
        navigationContainer.appendChild(dotsContainer);
        const allSlides = [];
        groupedSteps.forEach((stepsInGroup, prefix) => {
            if (stepsInGroup.length === 1) {
                allSlides.push({ id: stepsInGroup[0].id, steps: [stepsInGroup[0]] });
            }
            else {
                // For multi-steps, group them into a single slide
                allSlides.push({ id: prefix, steps: stepsInGroup });
            }
        });
        allSlides.forEach((slide, index) => {
            // Create the slide element
            const slideElement = $('.step-slide', { 'data-step': slide.id });
            // Create the content container with flex layout
            const slideContent = $('.step-slide-content');
            // Text content column
            const textContent = $('.step-text-content');
            if (slide.steps.length === 1) {
                // Single step case
                const step = slide.steps[0];
                // Create step title
                const titleElement = $('h3.step-title', { 'x-step-title-for': step.id });
                reset(titleElement, ...renderLabelWithIcons(step.title));
                textContent.appendChild(titleElement);
                // Create step description container
                const descriptionContainer = $('.step-description', { 'x-step-description-for': step.id });
                this.buildMarkdownDescription(descriptionContainer, step.description);
                textContent.appendChild(descriptionContainer);
            }
            else {
                // Multi-step case - group steps with same prefix into a single slide
                const multiStepContainer = $('.multi-step-container');
                slide.steps.forEach((step, i) => {
                    const subStep = $('.sub-step', { 'data-sub-step-id': step.id });
                    this.detailsPageDisposables.add(addDisposableListener(subStep, 'click', () => {
                        this.selectSubStep(step.id);
                    }));
                    this.detailsPageDisposables.add(addDisposableListener(subStep, 'mouseenter', () => {
                        this.selectSubStep(step.id);
                    }));
                    const subStepTitleEl = $('.sub-step-title', {}, ...renderLabelWithIcons(step.title));
                    subStep.appendChild(subStepTitleEl);
                    const subStepDesc = $('.sub-step-description');
                    this.buildMarkdownDescription(subStepDesc, [step.description[0]]);
                    subStep.appendChild(subStepDesc);
                    if (i === 0 || step.id === this.editorInput.selectedStep) {
                        subStep.classList.add('active');
                    }
                    else {
                        subStep.classList.remove('active');
                    }
                    multiStepContainer.appendChild(subStep);
                });
                // Get the linkedText of the lastStep
                const lastStep = slide.steps[slide.steps.length - 1];
                const linkedText = lastStep.description.length > 1 ? lastStep.description[1] : undefined;
                if (linkedText) {
                    const descElement = $('.multi-step-action');
                    this.buildMarkdownDescription(descElement, [linkedText]);
                    multiStepContainer.appendChild(descElement);
                    const actionMessage = $('span.action-message');
                    const updatedText = parseLinkedText(copilotSettingsMessage);
                    this.buildMarkdownDescription(actionMessage, [updatedText]);
                    multiStepContainer.appendChild(actionMessage);
                }
                textContent.appendChild(multiStepContainer);
            }
            // Append text content to the slide
            slideContent.appendChild(textContent);
            slideElement.appendChild(slideContent);
            slidesContainer.appendChild(slideElement);
            // Create dot for this slide
            const dot = $('button.step-dot', {
                'data-step-dot-index': `${index}`,
                'role': 'button'
            });
            // Set the initial active dot
            if (index === 0) {
                dot.classList.add('active');
            }
            dotsContainer.appendChild(dot);
            this.detailsPageDisposables.add(addDisposableListener(dot, 'click', () => {
                const currentIndex = this.getCurrentSlideIndex(allSlides);
                if (currentIndex === index) {
                    return;
                }
                this.selectStepByIndex(index, allSlides.map(s => s.steps[0]), index > currentIndex ? 1 : -1);
            }));
        });
        // Add next button
        this.nextButton = $('button.button-link.navigation.next', {
            'aria-label': localize('nextStep', "Next"),
        }, localize('next', "Next"), $('span.codicon.codicon-arrow-right'));
        navigationContainer.appendChild(this.nextButton);
        this.detailsPageDisposables.add(addDisposableListener(prevButton, 'click', () => {
            const currentIndex = this.getCurrentSlideIndex(allSlides);
            if (currentIndex > 0) {
                this.selectStepByIndex(currentIndex - 1, allSlides.map(s => s.steps[0]), -1);
            }
        }));
        this.detailsPageDisposables.add(addDisposableListener(this.nextButton, 'click', () => {
            const currentIndex = this.getCurrentSlideIndex(allSlides);
            if (currentIndex < allSlides.length - 1) {
                this.selectStepByIndex(currentIndex + 1, allSlides.map(s => s.steps[0]), 1);
            }
            else {
                this.scrollPrev();
            }
        }));
        // Set the current walkthrough and step
        this.currentWalkthrough = category;
        this.editorInput.selectedCategory = categoryID;
        this.editorInput.selectedStep = this.currentWalkthrough.steps[0].id;
        // Category title and description
        const categoryHeader = $('.category-header');
        const categoryTitle = $('h2.category-title', { 'x-category-title-for': category.id });
        reset(categoryTitle, ...renderLabelWithIcons(category.title));
        categoryHeader.appendChild(categoryTitle);
        const descriptionContainer = $('.category-description.description.max-lines-3', { 'x-category-description-for': category.id });
        this.buildMarkdownDescription(descriptionContainer, parseDescription(category.description));
        reset(descriptionContainer, ...renderLabelWithIcons(category.description));
        categoryHeader.appendChild(descriptionContainer);
        const categoryFooter = $('.getting-started-footer');
        if (this.editorInput.showTelemetryNotice && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ && this.productService.enableTelemetry) {
            this.buildTelemetryFooter(categoryFooter);
        }
        // Build the container for the whole slide deck
        const stepsContainer = $('.getting-started-steps-container', {}, categoryHeader, slidesContainer, navigationContainer, categoryFooter);
        // Set up the scroll container
        this.detailsScrollbar = this._register(new DomScrollableElement(stepsContainer, { className: 'steps-container' }));
        const stepListComponent = this.detailsScrollbar.getDomNode();
        // Append to the content area
        reset(this.stepsContent, stepListComponent);
        stepListComponent.tabIndex = 0;
        stepListComponent.focus();
        this.selectStepByIndex(0, this.currentWalkthrough.steps, 1);
        // Add keyboard navigation
        this.detailsPageDisposables.add(addDisposableListener(stepListComponent, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 17 /* KeyCode.RightArrow */) {
                const currentIndex = this.getCurrentSlideIndex(allSlides);
                if (currentIndex < allSlides.length - 1) {
                    this.selectStepByIndex(currentIndex + 1, allSlides.map(s => s.steps[0]), 1);
                }
                else {
                    this.scrollPrev();
                }
            }
            else if (event.keyCode === 15 /* KeyCode.LeftArrow */) {
                const currentIndex = this.getCurrentSlideIndex(allSlides);
                if (currentIndex > 0) {
                    this.selectStepByIndex(currentIndex - 1, allSlides.map(s => s.steps[0]), -1);
                }
            }
            else if (event.keyCode === 16 /* KeyCode.UpArrow */ || event.keyCode === 18 /* KeyCode.DownArrow */) {
                const currentIndex = this.getCurrentSlideIndex(allSlides);
                if (currentIndex > 0) {
                    return;
                }
                this.navigateWithinMultiStepContainer(event.keyCode);
            }
        }));
        // Register listeners for step selection
        this.registerDispatchListeners();
        this.detailsScrollbar.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
    }
    navigateWithinMultiStepContainer(keyCode) {
        const currentElement = this.container.querySelector(`.multi-step-container`);
        if (!currentElement) {
            return;
        }
        const currentSubStep = currentElement.querySelector('.sub-step.active');
        const allElements = Array.from(this.container.querySelectorAll('.sub-step'));
        const currentIndex = currentSubStep ? allElements.indexOf(currentSubStep) : -1;
        let targetElement;
        if (keyCode === 16 /* KeyCode.UpArrow */ && currentIndex > 0) {
            targetElement = allElements[currentIndex - 1];
        }
        else if (keyCode === 18 /* KeyCode.DownArrow */ && currentIndex < allElements.length - 1) {
            targetElement = allElements[currentIndex + 1];
        }
        if (targetElement) {
            const stepId = targetElement.getAttribute('data-sub-step-id');
            this.selectSubStep(stepId);
            targetElement.focus();
        }
    }
    selectSubStep(selectedStepId) {
        this.telemetryService.publicLog2('gettingStarted.ActionExecuted', { command: 'selectTask', argument: selectedStepId, walkthroughId: this.currentWalkthrough?.id });
        if (this.editorInput.selectedStep === selectedStepId) {
            return;
        }
        this.editorInput.selectedStep = selectedStepId;
        const multiStepContainer = this.container.querySelector('.multi-step-container');
        if (!multiStepContainer) {
            return;
        }
        const subSteps = multiStepContainer.querySelectorAll('.sub-step');
        subSteps.forEach(subStepEl => {
            const stepId = subStepEl.getAttribute('data-sub-step-id');
            if (stepId === selectedStepId) {
                subStepEl.classList.add('active');
            }
            else {
                subStepEl.classList.remove('active');
            }
        });
        const prefixMatch = selectedStepId.match(/^([^.]+)\./);
        const prefix = prefixMatch ? prefixMatch[1] : selectedStepId;
        this.selectSlideWithPrefix(selectedStepId, prefix);
        this.gettingStartedService.progressByEvent('stepSelected:' + selectedStepId);
    }
    selectSlideWithPrefix(stepId, prefix) {
        this.editorInput.selectedStep = stepId;
        const step = this.currentWalkthrough?.steps.find(step => step.id === stepId);
        if (!step) {
            return;
        }
        const selectedSlide = this.stepsContent.querySelector(`.step-slide[data-step="${prefix}"]`);
        if (selectedSlide) {
            const selectedSlideContent = selectedSlide.querySelector('.step-slide-content');
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
            selectedSlideContent?.appendChild(this.stepMediaComponent);
            setTimeout(() => selectedSlideContent.focus(), 0);
        }
        this.gettingStartedService.progressByEvent('stepSelected:' + stepId);
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    getCurrentSlideIndex(allSlides) {
        if (!this.editorInput.selectedStep) {
            return 0;
        }
        // Check if the selected step is directly a slide ID
        const directMatch = allSlides.findIndex(slide => slide.id === this.editorInput.selectedStep);
        if (directMatch !== -1) {
            return directMatch;
        }
        // Otherwise, find which slide contains the step as a sub-step
        return allSlides.findIndex(slide => slide.steps.some(step => step.id === this.editorInput.selectedStep));
    }
    selectSlide(stepId) {
        this.editorInput.selectedStep = stepId;
        const step = this.currentWalkthrough?.steps.find(step => step.id === stepId);
        if (!step) {
            return;
        }
        const effectiveStepId = stepId.match(/^([^.]+)\./)?.[1] ?? stepId;
        const selectedSlide = this.stepsContent.querySelector(`.step-slide[data-step="${effectiveStepId}"]`);
        if (selectedSlide) {
            const selectedSlideContent = selectedSlide.querySelector('.step-slide-content');
            this.mediaDisposables.clear();
            this.stepDisposables.clear();
            this.buildMediaComponent(this.editorInput.selectedStep);
            selectedSlideContent?.appendChild(this.stepMediaComponent);
            setTimeout(() => selectedSlideContent.focus(), 0);
        }
        this.gettingStartedService.progressByEvent('stepSelected:' + stepId);
        this.detailsPageScrollbar?.scanDomNode();
        this.detailsScrollbar?.scanDomNode();
    }
    buildCategorySlide(categoryID, selectedStep) {
        this.container.classList.remove('newSlide');
        if (this.detailsScrollbar) {
            this.detailsScrollbar.dispose();
        }
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            // Remove internal extension id specifier from exposed id's
            this.extensionService.activateByEvent(`onWalkthrough:${categoryID.replace(/[^#]+#/, '')}`);
        });
        this.detailsPageDisposables.clear();
        this.mediaDisposables.clear();
        const category = categoryID === NEW_WELCOME_EXPERIENCE ? this.gettingStartedService.getWalkthrough(categoryID) :
            this.gettingStartedCategories.find(category => category.id === categoryID);
        if (!category) {
            throw Error('could not find category with ID ' + categoryID);
        }
        const descriptionContainer = $('.category-description.description.max-lines-3', { 'x-category-description-for': category.id });
        this.buildMarkdownDescription(descriptionContainer, parseDescription(category.description));
        const categoryDescriptorComponent = $('.getting-started-category', {}, $('.category-description-container', {}, $('h2.category-title.max-lines-3', { 'x-category-title-for': category.id }, ...renderLabelWithIcons(category.title)), descriptionContainer));
        const stepListContainer = $('.step-list-container');
        this.detailsPageDisposables.add(addDisposableListener(stepListContainer, 'keydown', (e) => {
            const event = new StandardKeyboardEvent(e);
            const currentStepIndex = () => category.steps.findIndex(e => e.id === this.editorInput.selectedStep);
            if (event.keyCode === 16 /* KeyCode.UpArrow */) {
                const toExpand = category.steps.filter((step, index) => index < currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand.length) {
                    this.selectStep(toExpand[toExpand.length - 1].id, false);
                }
            }
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                const toExpand = category.steps.find((step, index) => index > currentStepIndex() && this.contextService.contextMatchesRules(step.when));
                if (toExpand) {
                    this.selectStep(toExpand.id, false);
                }
            }
        }));
        let renderedSteps = undefined;
        const contextKeysToWatch = new Set(category.steps.flatMap(step => step.when.keys()));
        const buildStepList = () => {
            category.steps.sort((a, b) => a.order - b.order);
            const toRender = category.steps
                .filter(step => this.contextService.contextMatchesRules(step.when));
            if (equals(renderedSteps, toRender, (a, b) => a.id === b.id)) {
                return;
            }
            renderedSteps = toRender;
            reset(stepListContainer, ...renderedSteps
                .map(step => {
                const codicon = $('.codicon' + (step.done ? '.complete' + ThemeIcon.asCSSSelector(gettingStartedCheckedCodicon) : ThemeIcon.asCSSSelector(gettingStartedUncheckedCodicon)), {
                    'data-done-step-id': step.id,
                    'x-dispatch': 'toggleStepCompletion:' + step.id,
                    'role': 'checkbox',
                    'aria-checked': step.done ? 'true' : 'false',
                    'aria-label': step.done
                        ? localize('stepDone', "Checkbox for Step {0}: Completed", step.title)
                        : localize('stepNotDone', "Checkbox for Step {0}: Not completed", step.title),
                });
                const container = $('.step-description-container', { 'x-step-description-for': step.id });
                this.buildMarkdownDescription(container, step.description);
                const stepTitle = $('h3.step-title.max-lines-3', { 'x-step-title-for': step.id });
                reset(stepTitle, ...renderLabelWithIcons(step.title));
                const stepDescription = $('.step-container', {}, stepTitle, container);
                if (step.media.type === 'image') {
                    stepDescription.appendChild($('.image-description', { 'aria-label': localize('imageShowing', "Image showing {0}", step.media.altText) }));
                }
                else if (step.media.type === 'video') {
                    stepDescription.appendChild($('.video-description', { 'aria-label': localize('videoShowing', "Video showing {0}", step.media.altText) }));
                }
                return $('button.getting-started-step', {
                    'x-dispatch': 'selectTask:' + step.id,
                    'data-step-id': step.id,
                    'aria-expanded': 'false',
                    'aria-checked': step.done ? 'true' : 'false',
                    'role': 'button',
                }, codicon, stepDescription);
            }));
        };
        buildStepList();
        this.detailsPageDisposables.add(this.contextService.onDidChangeContext(e => {
            if (e.affectsSome(contextKeysToWatch) && this.currentWalkthrough) {
                buildStepList();
                this.registerDispatchListeners();
                this.selectStep(this.editorInput.selectedStep, false);
            }
        }));
        const showNextCategory = this.gettingStartedCategories.find(_category => _category.id === category.next);
        const stepsContainer = $('.getting-started-detail-container', { 'role': 'list' }, stepListContainer, $('.done-next-container', {}, $('button.button-link.all-done', { 'x-dispatch': 'allDone' }, $('span.codicon.codicon-check-all'), localize('allDone', "Mark Done")), ...(showNextCategory
            ? [$('button.button-link.next', { 'x-dispatch': 'nextSection' }, localize('nextOne', "Next Section"), $('span.codicon.codicon-arrow-right'))]
            : [])));
        this.detailsScrollbar = this._register(new DomScrollableElement(stepsContainer, { className: 'steps-container' }));
        const stepListComponent = this.detailsScrollbar.getDomNode();
        const categoryFooter = $('.getting-started-footer');
        if (this.editorInput.showTelemetryNotice && getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ && this.productService.enableTelemetry) {
            this.buildTelemetryFooter(categoryFooter);
        }
        reset(this.stepsContent, categoryDescriptorComponent, stepListComponent, this.stepMediaComponent, categoryFooter);
        const toExpand = category.steps.find(step => this.contextService.contextMatchesRules(step.when) && !step.done) ?? category.steps[0];
        this.selectStep(selectedStep ?? toExpand.id, !selectedStep);
        this.detailsScrollbar.scanDomNode();
        this.detailsPageScrollbar?.scanDomNode();
        this.registerDispatchListeners();
    }
    buildTelemetryFooter(parent) {
        const mdRenderer = this.instantiationService.createInstance(MarkdownRenderer, {});
        const privacyStatementCopy = localize('privacy statement', "privacy statement");
        const privacyStatementButton = `[${privacyStatementCopy}](command:workbench.action.openPrivacyStatementUrl)`;
        const optOutCopy = localize('optOut', "opt out");
        const optOutButton = `[${optOutCopy}](command:settings.filterByTelemetry)`;
        const text = localize({ key: 'footer', comment: ['fist substitution is "vs code", second is "privacy statement", third is "opt out".'] }, "{0} collects usage data. Read our {1} and learn how to {2}.", this.productService.nameShort, privacyStatementButton, optOutButton);
        const renderedContents = this.detailsPageDisposables.add(mdRenderer.render({ value: text, isTrusted: true }));
        parent.append(renderedContents.element);
    }
    getKeybindingLabel(command) {
        command = command.replace(/^command:/, '');
        const label = this.keybindingService.lookupKeybinding(command)?.getLabel();
        if (!label) {
            return '';
        }
        else {
            return `(${label})`;
        }
    }
    getKeyBinding(command) {
        command = command.replace(/^command:/, '');
        return this.keybindingService.lookupKeybinding(command);
    }
    async scrollPrev() {
        this.inProgressScroll = this.inProgressScroll.then(async () => {
            if (this.prevWalkthrough && this.prevWalkthrough !== this.currentWalkthrough) {
                this.currentWalkthrough = this.prevWalkthrough;
                this.prevWalkthrough = undefined;
                this.makeCategoryVisibleWhenAvailable(this.currentWalkthrough.id);
            }
            else {
                this.currentWalkthrough = undefined;
                this.editorInput.selectedCategory = undefined;
                this.editorInput.selectedStep = undefined;
                this.editorInput.showTelemetryNotice = false;
                this.editorInput.walkthroughPageTitle = undefined;
                if (this.gettingStartedCategories.length !== this.gettingStartedList?.itemCount) {
                    // extensions may have changed in the time since we last displayed the walkthrough list
                    // rebuild the list
                    this.buildCategoriesSlide();
                }
                this.selectStep(undefined);
                this.setSlide('categories');
                this.container.focus();
            }
        });
    }
    runSkip() {
        this.commandService.executeCommand('workbench.action.closeActiveEditor');
    }
    escape() {
        if (this.editorInput.selectedCategory) {
            this.scrollPrev();
        }
        else {
            this.runSkip();
        }
    }
    setSlide(toEnable, firstLaunch = false) {
        const slideManager = assertReturnsDefined(this.container.querySelector('.gettingStarted'));
        if (toEnable === 'categories') {
            slideManager.classList.remove('showDetails');
            slideManager.classList.add('showCategories');
            this.container.querySelector('.prev-button.button-link').style.display = 'none';
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = true);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = false);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = false);
        }
        else {
            slideManager.classList.add('showDetails');
            slideManager.classList.remove('showCategories');
            const prevButton = this.container.querySelector('.prev-button.button-link');
            prevButton.style.display = this.editorInput.showWelcome || this.prevWalkthrough ? 'block' : 'none';
            if (this.editorInput.selectedCategory === NEW_WELCOME_EXPERIENCE) {
                prevButton.style.display = 'none';
            }
            else {
                const moreTextElement = prevButton.querySelector('.moreText');
                moreTextElement.textContent = firstLaunch ? localize('welcome', "Welcome") : localize('goBack', "Go Back");
            }
            this.container.querySelector('.gettingStartedSlideDetails').querySelectorAll('button').forEach(button => button.disabled = false);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('button').forEach(button => button.disabled = true);
            this.container.querySelector('.gettingStartedSlideCategories').querySelectorAll('input').forEach(button => button.disabled = true);
        }
    }
    focus() {
        super.focus();
        const active = this.container.ownerDocument.activeElement;
        let parent = this.container.parentElement;
        while (parent && parent !== active) {
            parent = parent.parentElement;
        }
        if (parent) {
            // Only set focus if there is no other focued element outside this chain.
            // This prevents us from stealing back focus from other focused elements such as quick pick due to delayed load.
            this.container.focus();
        }
    }
};
GettingStartedPage = GettingStartedPage_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IProductService),
    __param(3, IKeybindingService),
    __param(4, IWalkthroughsService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, ILanguageService),
    __param(8, IFileService),
    __param(9, IOpenerService),
    __param(10, IWorkbenchThemeService),
    __param(11, IStorageService),
    __param(12, IExtensionService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IEditorGroupsService),
    __param(16, IContextKeyService),
    __param(17, IQuickInputService),
    __param(18, IWorkspacesService),
    __param(19, ILabelService),
    __param(20, IHostService),
    __param(21, IWebviewService),
    __param(22, IWorkspaceContextService),
    __param(23, IAccessibilityService)
], GettingStartedPage);
export { GettingStartedPage };
export class GettingStartedInputSerializer {
    canSerialize(editorInput) {
        return true;
    }
    serialize(editorInput) {
        return JSON.stringify({ selectedCategory: editorInput.selectedCategory, selectedStep: editorInput.selectedStep });
    }
    deserialize(instantiationService, serializedEditorInput) {
        return instantiationService.invokeFunction(accessor => {
            try {
                const { selectedCategory, selectedStep } = JSON.parse(serializedEditorInput);
                return new GettingStartedInput({ selectedCategory, selectedStep });
            }
            catch { }
            return new GettingStartedInput({});
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFhLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXRFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FB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