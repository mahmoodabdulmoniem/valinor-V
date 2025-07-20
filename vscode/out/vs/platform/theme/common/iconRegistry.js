/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getCodiconFontCharacters } from '../../../base/common/codiconsUtil.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Emitter } from '../../../base/common/event.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
import { Disposable } from '../../../base/common/lifecycle.js';
//  ------ API types
// icon registry
export const Extensions = {
    IconContribution: 'base.contributions.icons'
};
export var IconContribution;
(function (IconContribution) {
    function getDefinition(contribution, registry) {
        let definition = contribution.defaults;
        while (ThemeIcon.isThemeIcon(definition)) {
            const c = iconRegistry.getIcon(definition.id);
            if (!c) {
                return undefined;
            }
            definition = c.defaults;
        }
        return definition;
    }
    IconContribution.getDefinition = getDefinition;
})(IconContribution || (IconContribution = {}));
export var IconFontDefinition;
(function (IconFontDefinition) {
    function toJSONObject(iconFont) {
        return {
            weight: iconFont.weight,
            style: iconFont.style,
            src: iconFont.src.map(s => ({ format: s.format, location: s.location.toString() }))
        };
    }
    IconFontDefinition.toJSONObject = toJSONObject;
    function fromJSONObject(json) {
        const stringOrUndef = (s) => isString(s) ? s : undefined;
        if (json && Array.isArray(json.src) && json.src.every((s) => isString(s.format) && isString(s.location))) {
            return {
                weight: stringOrUndef(json.weight),
                style: stringOrUndef(json.style),
                src: json.src.map((s) => ({ format: s.format, location: URI.parse(s.location) }))
            };
        }
        return undefined;
    }
    IconFontDefinition.fromJSONObject = fromJSONObject;
})(IconFontDefinition || (IconFontDefinition = {}));
// regexes for validation of font properties
export const fontIdRegex = /^([\w_-]+)$/;
export const fontStyleRegex = /^(normal|italic|(oblique[ \w\s-]+))$/;
export const fontWeightRegex = /^(normal|bold|lighter|bolder|(\d{0-1000}))$/;
export const fontSizeRegex = /^([\w_.%+-]+)$/;
export const fontFormatRegex = /^woff|woff2|truetype|opentype|embedded-opentype|svg$/;
export const fontColorRegex = /^#[0-9a-fA-F]{0,6}$/;
export const fontIdErrorMessage = localize('schema.fontId.formatError', 'The font ID must only contain letters, numbers, underscores and dashes.');
class IconRegistry extends Disposable {
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.iconSchema = {
            definitions: {
                icons: {
                    type: 'object',
                    properties: {
                        fontId: { type: 'string', description: localize('iconDefinition.fontId', 'The id of the font to use. If not set, the font that is defined first is used.'), pattern: fontIdRegex.source, patternErrorMessage: fontIdErrorMessage },
                        fontCharacter: { type: 'string', description: localize('iconDefinition.fontCharacter', 'The font character associated with the icon definition.') }
                    },
                    additionalProperties: false,
                    defaultSnippets: [{ body: { fontCharacter: '\\\\e030' } }]
                }
            },
            type: 'object',
            properties: {}
        };
        this.iconReferenceSchema = { type: 'string', pattern: `^${ThemeIcon.iconNameExpression}$`, enum: [], enumDescriptions: [] };
        this.iconsById = {};
        this.iconFontsById = {};
    }
    registerIcon(id, defaults, description, deprecationMessage) {
        const existing = this.iconsById[id];
        if (existing) {
            if (description && !existing.description) {
                existing.description = description;
                this.iconSchema.properties[id].markdownDescription = `${description} $(${id})`;
                const enumIndex = this.iconReferenceSchema.enum.indexOf(id);
                if (enumIndex !== -1) {
                    this.iconReferenceSchema.enumDescriptions[enumIndex] = description;
                }
                this._onDidChange.fire();
            }
            return existing;
        }
        const iconContribution = { id, description, defaults, deprecationMessage };
        this.iconsById[id] = iconContribution;
        const propertySchema = { $ref: '#/definitions/icons' };
        if (deprecationMessage) {
            propertySchema.deprecationMessage = deprecationMessage;
        }
        if (description) {
            propertySchema.markdownDescription = `${description}: $(${id})`;
        }
        this.iconSchema.properties[id] = propertySchema;
        this.iconReferenceSchema.enum.push(id);
        this.iconReferenceSchema.enumDescriptions.push(description || '');
        this._onDidChange.fire();
        return { id };
    }
    deregisterIcon(id) {
        delete this.iconsById[id];
        delete this.iconSchema.properties[id];
        const index = this.iconReferenceSchema.enum.indexOf(id);
        if (index !== -1) {
            this.iconReferenceSchema.enum.splice(index, 1);
            this.iconReferenceSchema.enumDescriptions.splice(index, 1);
        }
        this._onDidChange.fire();
    }
    getIcons() {
        return Object.keys(this.iconsById).map(id => this.iconsById[id]);
    }
    getIcon(id) {
        return this.iconsById[id];
    }
    getIconSchema() {
        return this.iconSchema;
    }
    getIconReferenceSchema() {
        return this.iconReferenceSchema;
    }
    registerIconFont(id, definition) {
        const existing = this.iconFontsById[id];
        if (existing) {
            return existing;
        }
        this.iconFontsById[id] = definition;
        this._onDidChange.fire();
        return definition;
    }
    deregisterIconFont(id) {
        delete this.iconFontsById[id];
    }
    getIconFont(id) {
        return this.iconFontsById[id];
    }
    toString() {
        const sorter = (i1, i2) => {
            return i1.id.localeCompare(i2.id);
        };
        const classNames = (i) => {
            while (ThemeIcon.isThemeIcon(i.defaults)) {
                i = this.iconsById[i.defaults.id];
            }
            return `codicon codicon-${i ? i.id : ''}`;
        };
        const reference = [];
        reference.push(`| preview     | identifier                        | default codicon ID                | description`);
        reference.push(`| ----------- | --------------------------------- | --------------------------------- | --------------------------------- |`);
        const contributions = Object.keys(this.iconsById).map(key => this.iconsById[key]);
        for (const i of contributions.filter(i => !!i.description).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|${ThemeIcon.isThemeIcon(i.defaults) ? i.defaults.id : i.id}|${i.description || ''}|`);
        }
        reference.push(`| preview     | identifier                        `);
        reference.push(`| ----------- | --------------------------------- |`);
        for (const i of contributions.filter(i => !ThemeIcon.isThemeIcon(i.defaults)).sort(sorter)) {
            reference.push(`|<i class="${classNames(i)}"></i>|${i.id}|`);
        }
        return reference.join('\n');
    }
}
const iconRegistry = new IconRegistry();
platform.Registry.add(Extensions.IconContribution, iconRegistry);
export function registerIcon(id, defaults, description, deprecationMessage) {
    return iconRegistry.registerIcon(id, defaults, description, deprecationMessage);
}
export function getIconRegistry() {
    return iconRegistry;
}
function initialize() {
    const codiconFontCharacters = getCodiconFontCharacters();
    for (const icon in codiconFontCharacters) {
        const fontCharacter = '\\' + codiconFontCharacters[icon].toString(16);
        iconRegistry.registerIcon(icon, { fontCharacter });
    }
}
initialize();
export const iconsSchemaId = 'vscode://schemas/icons';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(iconsSchemaId, iconRegistry.getIconSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(iconsSchemaId), 200);
iconRegistry.onDidChange(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//setTimeout(_ => console.log(iconRegistry.toString()), 5000);
// common icons
export const widgetClose = registerIcon('widget-close', Codicon.close, localize('widgetClose', 'Icon for the close action in widgets.'));
export const gotoPreviousLocation = registerIcon('goto-previous-location', Codicon.arrowUp, localize('previousChangeIcon', 'Icon for goto previous editor location.'));
export const gotoNextLocation = registerIcon('goto-next-location', Codicon.arrowDown, localize('nextChangeIcon', 'Icon for goto next editor location.'));
export const syncing = ThemeIcon.modify(Codicon.sync, 'spin');
export const spinningLoading = ThemeIcon.modify(Codicon.loading, 'spin');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vaWNvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFrQixNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsVUFBVSxJQUFJLGNBQWMsRUFBNkIsTUFBTSxzREFBc0QsQ0FBQztBQUMvSCxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxvQkFBb0I7QUFHcEIsZ0JBQWdCO0FBQ2hCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixnQkFBZ0IsRUFBRSwwQkFBMEI7Q0FDNUMsQ0FBQztBQWlCRixNQUFNLEtBQVcsZ0JBQWdCLENBWWhDO0FBWkQsV0FBaUIsZ0JBQWdCO0lBQ2hDLFNBQWdCLGFBQWEsQ0FBQyxZQUE4QixFQUFFLFFBQXVCO1FBQ3BGLElBQUksVUFBVSxHQUFHLFlBQVksQ0FB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