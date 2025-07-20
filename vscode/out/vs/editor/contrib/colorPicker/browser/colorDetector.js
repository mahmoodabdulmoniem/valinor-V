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
var ColorDetector_1;
import { createCancelablePromise, TimeoutTimer } from '../../../../base/common/async.js';
import { RGBA } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { noBreakWhitespace } from '../../../../base/common/strings.js';
import { DynamicCssRules } from '../../../browser/editorDom.js';
import { Range } from '../../../common/core/range.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeatureDebounceService } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { getColors } from './color.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export const ColorDecorationInjectedTextMarker = Object.create({});
let ColorDetector = class ColorDetector extends Disposable {
    static { ColorDetector_1 = this; }
    static { this.ID = 'editor.contrib.colorDetector'; }
    static { this.RECOMPUTE_TIME = 1000; } // ms
    constructor(_editor, _configurationService, _languageFeaturesService, languageFeatureDebounceService) {
        super();
        this._editor = _editor;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._localToDispose = this._register(new DisposableStore());
        this._decorationsIds = [];
        this._colorDatas = new Map();
        this._decoratorLimitReporter = this._register(new DecoratorLimitReporter());
        this._colorDecorationClassRefs = this._register(new DisposableStore());
        this._colorDecoratorIds = this._editor.createDecorationsCollection();
        this._ruleFactory = new DynamicCssRules(this._editor);
        this._debounceInformation = languageFeatureDebounceService.for(_languageFeaturesService.colorProvider, 'Document Colors', { min: ColorDetector_1.RECOMPUTE_TIME });
        this._register(_editor.onDidChangeModel(() => {
            this._isColorDecoratorsEnabled = this.isEnabled();
            this.updateColors();
        }));
        this._register(_editor.onDidChangeModelLanguage(() => this.updateColors()));
        this._register(_languageFeaturesService.colorProvider.onDidChange(() => this.updateColors()));
        this._register(_editor.onDidChangeConfiguration((e) => {
            const prevIsEnabled = this._isColorDecoratorsEnabled;
            this._isColorDecoratorsEnabled = this.isEnabled();
            this._defaultColorDecoratorsEnablement = this._editor.getOption(166 /* EditorOption.defaultColorDecorators */);
            const updatedColorDecoratorsSetting = prevIsEnabled !== this._isColorDecoratorsEnabled || e.hasChanged(27 /* EditorOption.colorDecoratorsLimit */);
            const updatedDefaultColorDecoratorsSetting = e.hasChanged(166 /* EditorOption.defaultColorDecorators */);
            if (updatedColorDecoratorsSetting || updatedDefaultColorDecoratorsSetting) {
                if (this._isColorDecoratorsEnabled) {
                    this.updateColors();
                }
                else {
                    this.removeAllDecorations();
                }
            }
        }));
        this._timeoutTimer = null;
        this._computePromise = null;
        this._isColorDecoratorsEnabled = this.isEnabled();
        this._defaultColorDecoratorsEnablement = this._editor.getOption(166 /* EditorOption.defaultColorDecorators */);
        this.updateColors();
    }
    isEnabled() {
        const model = this._editor.getModel();
        if (!model) {
            return false;
        }
        const languageId = model.getLanguageId();
        // handle deprecated settings. [languageId].colorDecorators.enable
        const deprecatedConfig = this._configurationService.getValue(languageId);
        if (deprecatedConfig && typeof deprecatedConfig === 'object') {
            const colorDecorators = deprecatedConfig['colorDecorators']; // deprecatedConfig.valueOf('.colorDecorators.enable');
            if (colorDecorators && colorDecorators['enable'] !== undefined && !colorDecorators['enable']) {
                return colorDecorators['enable'];
            }
        }
        return this._editor.getOption(26 /* EditorOption.colorDecorators */);
    }
    get limitReporter() {
        return this._decoratorLimitReporter;
    }
    static get(editor) {
        return editor.getContribution(this.ID);
    }
    dispose() {
        this.stop();
        this.removeAllDecorations();
        super.dispose();
    }
    updateColors() {
        this.stop();
        if (!this._isColorDecoratorsEnabled) {
            return;
        }
        const model = this._editor.getModel();
        if (!model || !this._languageFeaturesService.colorProvider.has(model)) {
            return;
        }
        this._localToDispose.add(this._editor.onDidChangeModelContent(() => {
            if (!this._timeoutTimer) {
                this._timeoutTimer = new TimeoutTimer();
                this._timeoutTimer.cancelAndSet(() => {
                    this._timeoutTimer = null;
                    this.beginCompute();
                }, this._debounceInformation.get(model));
            }
        }));
        this.beginCompute();
    }
    async beginCompute() {
        this._computePromise = createCancelablePromise(async (token) => {
            const model = this._editor.getModel();
            if (!model) {
                return [];
            }
            const sw = new StopWatch(false);
            const colors = await getColors(this._languageFeaturesService.colorProvider, model, token, this._defaultColorDecoratorsEnablement);
            this._debounceInformation.update(model, sw.elapsed());
            return colors;
        });
        try {
            const colors = await this._computePromise;
            this.updateDecorations(colors);
            this.updateColorDecorators(colors);
            this._computePromise = null;
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    stop() {
        if (this._timeoutTimer) {
            this._timeoutTimer.cancel();
            this._timeoutTimer = null;
        }
        if (this._computePromise) {
            this._computePromise.cancel();
            this._computePromise = null;
        }
        this._localToDispose.clear();
    }
    updateDecorations(colorDatas) {
        const decorations = colorDatas.map(c => ({
            range: {
                startLineNumber: c.colorInfo.range.startLineNumber,
                startColumn: c.colorInfo.range.startColumn,
                endLineNumber: c.colorInfo.range.endLineNumber,
                endColumn: c.colorInfo.range.endColumn
            },
            options: ModelDecorationOptions.EMPTY
        }));
        this._editor.changeDecorations((changeAccessor) => {
            this._decorationsIds = changeAccessor.deltaDecorations(this._decorationsIds, decorations);
            this._colorDatas = new Map();
            this._decorationsIds.forEach((id, i) => this._colorDatas.set(id, colorDatas[i]));
        });
    }
    updateColorDecorators(colorData) {
        this._colorDecorationClassRefs.clear();
        const decorations = [];
        const limit = this._editor.getOption(27 /* EditorOption.colorDecoratorsLimit */);
        for (let i = 0; i < colorData.length && decorations.length < limit; i++) {
            const { red, green, blue, alpha } = colorData[i].colorInfo.color;
            const rgba = new RGBA(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255), alpha);
            const color = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
            const ref = this._colorDecorationClassRefs.add(this._ruleFactory.createClassNameRef({
                backgroundColor: color
            }));
            decorations.push({
                range: {
                    startLineNumber: colorData[i].colorInfo.range.startLineNumber,
                    startColumn: colorData[i].colorInfo.range.startColumn,
                    endLineNumber: colorData[i].colorInfo.range.endLineNumber,
                    endColumn: colorData[i].colorInfo.range.endColumn
                },
                options: {
                    description: 'colorDetector',
                    before: {
                        content: noBreakWhitespace,
                        inlineClassName: `${ref.className} colorpicker-color-decoration`,
                        inlineClassNameAffectsLetterSpacing: true,
                        attachedData: ColorDecorationInjectedTextMarker
                    }
                }
            });
        }
        const limited = limit < colorData.length ? limit : false;
        this._decoratorLimitReporter.update(colorData.length, limited);
        this._colorDecoratorIds.set(decorations);
    }
    removeAllDecorations() {
        this._editor.removeDecorations(this._decorationsIds);
        this._decorationsIds = [];
        this._colorDecoratorIds.clear();
        this._colorDecorationClassRefs.clear();
    }
    getColorData(position) {
        const model = this._editor.getModel();
        if (!model) {
            return null;
        }
        const decorations = model
            .getDecorationsInRange(Range.fromPositions(position, position))
            .filter(d => this._colorDatas.has(d.id));
        if (decorations.length === 0) {
            return null;
        }
        return this._colorDatas.get(decorations[0].id);
    }
    isColorDecoration(decoration) {
        return this._colorDecoratorIds.has(decoration);
    }
};
ColorDetector = ColorDetector_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, ILanguageFeaturesService),
    __param(3, ILanguageFeatureDebounceService)
], ColorDetector);
export { ColorDetector };
export class DecoratorLimitReporter extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._computed = 0;
        this._limited = false;
    }
    get computed() {
        return this._computed;
    }
    get limited() {
        return this._limited;
    }
    update(computed, limited) {
        if (computed !== this._computed || limited !== this._limited) {
            this._computed = computed;
            this._limited = limited;
            this._onDidChange.fire();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvckRldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQStCLCtCQUErQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFNBQVMsRUFBYyxNQUFNLFlBQVksQ0FBQztBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FB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