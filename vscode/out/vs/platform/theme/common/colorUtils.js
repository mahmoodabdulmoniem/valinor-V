/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../base/common/assert.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
import * as nls from '../../../nls.js';
import { Disposable } from '../../../base/common/lifecycle.js';
/**
 * Returns the css variable name for the given color identifier. Dots (`.`) are replaced with hyphens (`-`) and
 * everything is prefixed with `--vscode-`.
 *
 * @sample `editorSuggestWidget.background` is `--vscode-editorSuggestWidget-background`.
 */
export function asCssVariableName(colorIdent) {
    return `--vscode-${colorIdent.replace(/\./g, '-')}`;
}
export function asCssVariable(color) {
    return `var(${asCssVariableName(color)})`;
}
export function asCssVariableWithDefault(color, defaultCssValue) {
    return `var(${asCssVariableName(color)}, ${defaultCssValue})`;
}
export var ColorTransformType;
(function (ColorTransformType) {
    ColorTransformType[ColorTransformType["Darken"] = 0] = "Darken";
    ColorTransformType[ColorTransformType["Lighten"] = 1] = "Lighten";
    ColorTransformType[ColorTransformType["Transparent"] = 2] = "Transparent";
    ColorTransformType[ColorTransformType["Opaque"] = 3] = "Opaque";
    ColorTransformType[ColorTransformType["OneOf"] = 4] = "OneOf";
    ColorTransformType[ColorTransformType["LessProminent"] = 5] = "LessProminent";
    ColorTransformType[ColorTransformType["IfDefinedThenElse"] = 6] = "IfDefinedThenElse";
    ColorTransformType[ColorTransformType["Mix"] = 7] = "Mix";
})(ColorTransformType || (ColorTransformType = {}));
export function isColorDefaults(value) {
    return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}
// color registry
export const Extensions = {
    ColorContribution: 'base.contributions.colors'
};
export const DEFAULT_COLOR_CONFIG_VALUE = 'default';
class ColorRegistry extends Disposable {
    constructor() {
        super();
        this._onDidChangeSchema = this._register(new Emitter());
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.colorSchema = { type: 'object', properties: {} };
        this.colorReferenceSchema = { type: 'string', enum: [], enumDescriptions: [] };
        this.colorsById = {};
    }
    notifyThemeUpdate(colorThemeData) {
        for (const key of Object.keys(this.colorsById)) {
            const color = colorThemeData.getColor(key);
            if (color) {
                this.colorSchema.properties[key].oneOf[0].defaultSnippets[0].body = `\${1:${Color.Format.CSS.formatHexA(color, true)}}`;
            }
        }
        this._onDidChangeSchema.fire();
    }
    registerColor(id, defaults, description, needsTransparency = false, deprecationMessage) {
        const colorContribution = { id, description, defaults, needsTransparency, deprecationMessage };
        this.colorsById[id] = colorContribution;
        const propertySchema = { type: 'string', format: 'color-hex', defaultSnippets: [{ body: '${1:#ff0000}' }] };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (needsTransparency) {
            propertySchema.pattern = '^#(?:(?<rgba>[0-9a-fA-f]{3}[0-9a-eA-E])|(?:[0-9a-fA-F]{6}(?:(?![fF]{2})(?:[0-9a-fA-F]{2}))))?$';
            propertySchema.patternErrorMessage = nls.localize('transparecyRequired', 'This color must be transparent or it will obscure content');
        }
        this.colorSchema.properties[id] = {
            description,
            oneOf: [
                propertySchema,
                { type: 'string', const: DEFAULT_COLOR_CONFIG_VALUE, description: nls.localize('useDefault', 'Use the default color.') }
            ]
        };
        this.colorReferenceSchema.enum.push(id);
        this.colorReferenceSchema.enumDescriptions.push(description);
        this._onDidChangeSchema.fire();
        return id;
    }
    deregisterColor(id) {
        delete this.colorsById[id];
        delete this.colorSchema.properties[id];
        const index = this.colorReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.colorReferenceSchema.enum.splice(index, 1);
            this.colorReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChangeSchema.fire();
    }
    getColors() {
        return Object.keys(this.colorsById).map(id => this.colorsById[id]);
    }
    resolveDefaultColor(id, theme) {
        const colorDesc = this.colorsById[id];
        if (colorDesc?.defaults) {
            const colorValue = isColorDefaults(colorDesc.defaults) ? colorDesc.defaults[theme.type] : colorDesc.defaults;
            return resolveColorValue(colorValue, theme);
        }
        return undefined;
    }
    getColorSchema() {
        return this.colorSchema;
    }
    getColorReferenceSchema() {
        return this.colorReferenceSchema;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.colorsById).sort(sorter).map(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
    }
}
const colorRegistry = new ColorRegistry();
platform.Registry.add(Extensions.ColorContribution, colorRegistry);
export function registerColor(id, defaults, description, needsTransparency, deprecationMessage) {
    return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}
export function getColorRegistry() {
    return colorRegistry;
}
// ----- color functions
export function executeTransform(transform, theme) {
    switch (transform.op) {
        case 0 /* ColorTransformType.Darken */:
            return resolveColorValue(transform.value, theme)?.darken(transform.factor);
        case 1 /* ColorTransformType.Lighten */:
            return resolveColorValue(transform.value, theme)?.lighten(transform.factor);
        case 2 /* ColorTransformType.Transparent */:
            return resolveColorValue(transform.value, theme)?.transparent(transform.factor);
        case 7 /* ColorTransformType.Mix */: {
            const primaryColor = resolveColorValue(transform.color, theme) || Color.transparent;
            const otherColor = resolveColorValue(transform.with, theme) || Color.transparent;
            return primaryColor.mix(otherColor, transform.ratio);
        }
        case 3 /* ColorTransformType.Opaque */: {
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return resolveColorValue(transform.value, theme);
            }
            return resolveColorValue(transform.value, theme)?.makeOpaque(backgroundColor);
        }
        case 4 /* ColorTransformType.OneOf */:
            for (const candidate of transform.values) {
                const color = resolveColorValue(candidate, theme);
                if (color) {
                    return color;
                }
            }
            return undefined;
        case 6 /* ColorTransformType.IfDefinedThenElse */:
            return resolveColorValue(theme.defines(transform.if) ? transform.then : transform.else, theme);
        case 5 /* ColorTransformType.LessProminent */: {
            const from = resolveColorValue(transform.value, theme);
            if (!from) {
                return undefined;
            }
            const backgroundColor = resolveColorValue(transform.background, theme);
            if (!backgroundColor) {
                return from.transparent(transform.factor * transform.transparency);
            }
            return from.isDarkerThan(backgroundColor)
                ? Color.getLighterColor(from, backgroundColor, transform.factor).transparent(transform.transparency)
                : Color.getDarkerColor(from, backgroundColor, transform.factor).transparent(transform.transparency);
        }
        default:
            throw assertNever(transform);
    }
}
export function darken(colorValue, factor) {
    return { op: 0 /* ColorTransformType.Darken */, value: colorValue, factor };
}
export function lighten(colorValue, factor) {
    return { op: 1 /* ColorTransformType.Lighten */, value: colorValue, factor };
}
export function transparent(colorValue, factor) {
    return { op: 2 /* ColorTransformType.Transparent */, value: colorValue, factor };
}
export function opaque(colorValue, background) {
    return { op: 3 /* ColorTransformType.Opaque */, value: colorValue, background };
}
export function oneOf(...colorValues) {
    return { op: 4 /* ColorTransformType.OneOf */, values: colorValues };
}
export function ifDefinedThenElse(ifArg, thenArg, elseArg) {
    return { op: 6 /* ColorTransformType.IfDefinedThenElse */, if: ifArg, then: thenArg, else: elseArg };
}
export function lessProminent(colorValue, backgroundColorValue, factor, transparency) {
    return { op: 5 /* ColorTransformType.LessProminent */, value: colorValue, background: backgroundColorValue, factor, transparency };
}
// ----- implementation
/**
 * @param colorValue Resolve a color value in the context of a theme
 */
export function resolveColorValue(colorValue, theme) {
    if (colorValue === null) {
        return undefined;
    }
    else if (typeof colorValue === 'string') {
        if (colorValue[0] === '#') {
            return Color.fromHex(colorValue);
        }
        return theme.getColor(colorValue);
    }
    else if (colorValue instanceof Color) {
        return colorValue;
    }
    else if (typeof colorValue === 'object') {
        return executeTransform(colorValue, theme);
    }
    return undefined;
}
export const workbenchColorsSchemaId = 'vscode://schemas/workbench-colors';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(workbenchColorsSchemaId, colorRegistry.getColorSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workbenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2NvbG9yVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsT0FBTyxFQUE2QixVQUFVLElBQUksY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0gsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQWMvRDs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxVQUEyQjtJQUM1RCxPQUFPLFlBQVksVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUNyRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxLQUFzQjtJQUNuRCxPQUFPLE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUMzQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQXNCLEVBQUUsZUFBdUI7SUFDdkYsT0FBTyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLGVBQWUsR0FBRyxDQUFDO0FBQy9ELENBQUM7QUFFRCxNQUFNLENBQU4sSUFBa0Is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