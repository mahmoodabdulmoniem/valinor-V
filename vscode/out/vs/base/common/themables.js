/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from './codicons.js';
export var ThemeColor;
(function (ThemeColor) {
    function isThemeColor(obj) {
        return !!obj && typeof obj === 'object' && typeof obj.id === 'string';
    }
    ThemeColor.isThemeColor = isThemeColor;
})(ThemeColor || (ThemeColor = {}));
export function themeColorFromId(id) {
    return { id };
}
export var ThemeIcon;
(function (ThemeIcon) {
    ThemeIcon.iconNameSegment = '[A-Za-z0-9]+';
    ThemeIcon.iconNameExpression = '[A-Za-z0-9-]+';
    ThemeIcon.iconModifierExpression = '~[A-Za-z]+';
    ThemeIcon.iconNameCharacter = '[A-Za-z0-9~-]';
    const ThemeIconIdRegex = new RegExp(`^(${ThemeIcon.iconNameExpression})(${ThemeIcon.iconModifierExpression})?$`);
    function asClassNameArray(icon) {
        const match = ThemeIconIdRegex.exec(icon.id);
        if (!match) {
            return asClassNameArray(Codicon.error);
        }
        const [, id, modifier] = match;
        const classNames = ['codicon', 'codicon-' + id];
        if (modifier) {
            classNames.push('codicon-modifier-' + modifier.substring(1));
        }
        return classNames;
    }
    ThemeIcon.asClassNameArray = asClassNameArray;
    function asClassName(icon) {
        return asClassNameArray(icon).join(' ');
    }
    ThemeIcon.asClassName = asClassName;
    function asCSSSelector(icon) {
        return '.' + asClassNameArray(icon).join('.');
    }
    ThemeIcon.asCSSSelector = asCSSSelector;
    function isThemeIcon(obj) {
        return !!obj && typeof obj === 'object' && typeof obj.id === 'string' && (typeof obj.color === 'undefined' || ThemeColor.isThemeColor(obj.color));
    }
    ThemeIcon.isThemeIcon = isThemeIcon;
    const _regexFromString = new RegExp(`^\\$\\((${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?)\\)$`);
    function fromString(str) {
        const match = _regexFromString.exec(str);
        if (!match) {
            return undefined;
        }
        const [, name] = match;
        return { id: name };
    }
    ThemeIcon.fromString = fromString;
    function fromId(id) {
        return { id };
    }
    ThemeIcon.fromId = fromId;
    function modify(icon, modifier) {
        let id = icon.id;
        const tildeIndex = id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            id = id.substring(0, tildeIndex);
        }
        if (modifier) {
            id = `${id}~${modifier}`;
        }
        return { id };
    }
    ThemeIcon.modify = modify;
    function getModifier(icon) {
        const tildeIndex = icon.id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            return icon.id.substring(tildeIndex + 1);
        }
        return undefined;
    }
    ThemeIcon.getModifier = getModifier;
    function isEqual(ti1, ti2) {
        return ti1.id === ti2.id && ti1.color?.id === ti2.color?.id;
    }
    ThemeIcon.isEqual = isEqual;
})(ThemeIcon || (ThemeIcon = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWFibGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90aGVtYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQVV4QyxNQUFNLEtBQVcsVUFBVSxDQUkxQjtBQUpELFdBQWlCLFVBQVU7SUFDMUIsU0FBZ0IsWUFBWSxDQUFDLEdBQVk7UUFDeEMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFvQixHQUFJLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQztJQUNyRixDQUFDO0lBRmUsdUJBQVksZUFFM0IsQ0FBQTtBQUNGLENBQUMsRUFKZ0IsVUFBVSxLQUFWLFVBQVUsUUFJMUI7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsRUFBbUI7SUFDbkQsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO0FBQ2YsQ0FBQztBQVFELE1BQU0sS0FBVyxTQUFTLENBd0V6QjtBQXhFRCxXQUFpQixTQUFTO0lBQ1oseUJBQWUsR0FBRyxjQUFjLENBQUM7SUFDakMsNEJBQWtCLEdBQUcsZUFBZSxDQUFDO0lBQ3JDLGdDQUFzQixHQUFHLFlBQVksQ0FBQztJQUN0QywyQkFBaUIsR0FBRyxlQUFlLENBQUM7SUFFakQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLFVBQUEsa0JBQWtCLEtBQUssVUFBQSxzQkFBc0IsS0FBSyxDQUFDLENBQUM7SUFFN0YsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBZTtRQUMvQyxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxLQUFLLEVB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