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
var ExplorerTestCoverageBars_1;
import { h } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { getTestingConfiguration, observeTestingConfiguration } from '../common/configuration.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { safeIntl } from '../../../../base/common/date.js';
let ManagedTestCoverageBars = class ManagedTestCoverageBars extends Disposable {
    /** Gets whether coverage is currently visible for the resource. */
    get visible() {
        return !!this._coverage;
    }
    constructor(options, configurationService, hoverService) {
        super();
        this.options = options;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.el = new Lazy(() => {
            if (this.options.compact) {
                const el = h('.test-coverage-bars.compact', [
                    h('.tpc@overall'),
                    h('.bar@tpcBar'),
                ]);
                this.attachHover(el.tpcBar, getOverallHoverText);
                return el;
            }
            else {
                const el = h('.test-coverage-bars', [
                    h('.tpc@overall'),
                    h('.bar@statement'),
                    h('.bar@function'),
                    h('.bar@branch'),
                ]);
                this.attachHover(el.statement, stmtCoverageText);
                this.attachHover(el.function, fnCoverageText);
                this.attachHover(el.branch, branchCoverageText);
                return el;
            }
        });
        this.visibleStore = this._register(new DisposableStore());
        this.customHovers = [];
    }
    attachHover(target, factory) {
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), target, () => this._coverage && factory(this._coverage)));
    }
    setCoverageInfo(coverage) {
        const ds = this.visibleStore;
        if (!coverage) {
            if (this._coverage) {
                this._coverage = undefined;
                this.customHovers.forEach(c => c.hide());
                ds.clear();
            }
            return;
        }
        if (!this._coverage) {
            const root = this.el.value.root;
            ds.add(toDisposable(() => root.remove()));
            this.options.container.appendChild(root);
            ds.add(this.configurationService.onDidChangeConfiguration(c => {
                if (!this._coverage) {
                    return;
                }
                if (c.affectsConfiguration("testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */) || c.affectsConfiguration("testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */)) {
                    this.doRender(this._coverage);
                }
            }));
        }
        this._coverage = coverage;
        this.doRender(coverage);
    }
    doRender(coverage) {
        const el = this.el.value;
        const precision = this.options.compact ? 0 : 2;
        const thresholds = getTestingConfiguration(this.configurationService, "testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */);
        const overallStat = coverUtils.calculateDisplayedStat(coverage, getTestingConfiguration(this.configurationService, "testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */));
        if (this.options.overall !== false) {
            el.overall.textContent = coverUtils.displayPercent(overallStat, precision);
        }
        else {
            el.overall.style.display = 'none';
        }
        if ('tpcBar' in el) { // compact mode
            renderBar(el.tpcBar, overallStat, false, thresholds);
        }
        else {
            renderBar(el.statement, coverUtils.percent(coverage.statement), coverage.statement.total === 0, thresholds);
            renderBar(el.function, coverage.declaration && coverUtils.percent(coverage.declaration), coverage.declaration?.total === 0, thresholds);
            renderBar(el.branch, coverage.branch && coverUtils.percent(coverage.branch), coverage.branch?.total === 0, thresholds);
        }
    }
};
ManagedTestCoverageBars = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService)
], ManagedTestCoverageBars);
export { ManagedTestCoverageBars };
const barWidth = 16;
const renderBar = (bar, pct, isZero, thresholds) => {
    if (pct === undefined) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'block';
    bar.style.width = `${barWidth}px`;
    // this is floored so the bar is only completely filled at 100% and not 99.9%
    bar.style.setProperty('--test-bar-width', `${Math.floor(pct * 16)}px`);
    if (isZero) {
        bar.style.color = 'currentColor';
        bar.style.opacity = '0.5';
        return;
    }
    bar.style.color = coverUtils.getCoverageColor(pct, thresholds);
    bar.style.opacity = '1';
};
const nf = safeIntl.NumberFormat();
const stmtCoverageText = (coverage) => localize('statementCoverage', '{0}/{1} statements covered ({2})', nf.value.format(coverage.statement.covered), nf.value.format(coverage.statement.total), coverUtils.displayPercent(coverUtils.percent(coverage.statement)));
const fnCoverageText = (coverage) => coverage.declaration && localize('functionCoverage', '{0}/{1} functions covered ({2})', nf.value.format(coverage.declaration.covered), nf.value.format(coverage.declaration.total), coverUtils.displayPercent(coverUtils.percent(coverage.declaration)));
const branchCoverageText = (coverage) => coverage.branch && localize('branchCoverage', '{0}/{1} branches covered ({2})', nf.value.format(coverage.branch.covered), nf.value.format(coverage.branch.total), coverUtils.displayPercent(coverUtils.percent(coverage.branch)));
const getOverallHoverText = (coverage) => {
    const str = [
        stmtCoverageText(coverage),
        fnCoverageText(coverage),
        branchCoverageText(coverage),
    ].filter(isDefined).join('\n\n');
    return {
        markdown: new MarkdownString().appendText(str),
        markdownNotSupportedFallback: str
    };
};
/**
 * Renders test coverage bars for a resource in the given container. It will
 * not render anything unless a test coverage report has been opened.
 */
let ExplorerTestCoverageBars = class ExplorerTestCoverageBars extends ManagedTestCoverageBars {
    static { ExplorerTestCoverageBars_1 = this; }
    static { this.hasRegistered = false; }
    static register() {
        if (this.hasRegistered) {
            return;
        }
        this.hasRegistered = true;
        Registry.as("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */).register({
            create(insta, container) {
                return insta.createInstance(ExplorerTestCoverageBars_1, { compact: true, container });
            },
        });
    }
    constructor(options, configurationService, hoverService, testCoverageService) {
        super(options, configurationService, hoverService);
        this.resource = observableValue(this, undefined);
        const isEnabled = observeTestingConfiguration(configurationService, "testing.showCoverageInExplorer" /* TestingConfigKeys.ShowCoverageInExplorer */);
        this._register(autorun(async (reader) => {
            let info;
            const coverage = testCoverageService.selected.read(reader);
            if (coverage && isEnabled.read(reader)) {
                const resource = this.resource.read(reader);
                if (resource) {
                    info = coverage.getComputedForUri(resource);
                }
            }
            this.setCoverageInfo(info);
        }));
    }
    /** @inheritdoc */
    setResource(resource, transaction) {
        this.resource.set(resource, transaction);
    }
    setCoverageInfo(coverage) {
        super.setCoverageInfo(coverage);
        this.options.container?.classList.toggle('explorer-item-with-test-coverage', this.visible);
    }
};
ExplorerTestCoverageBars = ExplorerTestCoverageBars_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService),
    __param(3, ITestCoverageService)
], ExplorerTestCoverageBars);
export { ExplorerTestCoverageBars };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlQmFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RDb3ZlcmFnZUJhcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVwRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBZ0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEtBQUssVUFBVSxNQUFNLCtCQUErQixDQUFDO0FBQzVELE9BQU8sRUFBb0QsdUJBQXVCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVwSixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVB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