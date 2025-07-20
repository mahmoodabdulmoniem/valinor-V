/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { contrastBorder, editorBackground } from '../../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, darken, registerColor } from '../../../../../../../../platform/theme/common/colorUtils.js';
import { FrontMatterHeader } from '../../../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { CssClassModifiers } from '../types.js';
import { FrontMatterMarkerDecoration } from './frontMatterMarkerDecoration.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
/**
 * Decoration CSS class names.
 */
export var CssClassNames;
(function (CssClassNames) {
    CssClassNames["Main"] = ".prompt-front-matter-decoration";
    CssClassNames["Inline"] = ".prompt-front-matter-decoration-inline";
    CssClassNames["MainInactive"] = ".prompt-front-matter-decoration.prompt-decoration-inactive";
    CssClassNames["InlineInactive"] = ".prompt-front-matter-decoration-inline.prompt-decoration-inactive";
})(CssClassNames || (CssClassNames = {}));
/**
 * Main background color of `active` Front Matter header block.
 */
export const BACKGROUND_COLOR = registerColor('prompt.frontMatter.background', { dark: darken(editorBackground, 0.2), light: darken(editorBackground, 0.05), hcDark: contrastBorder, hcLight: contrastBorder }, localize('chat.prompt.frontMatter.background.description', "Background color of a Front Matter header block."));
/**
 * Background color of `inactive` Front Matter header block.
 */
export const INACTIVE_BACKGROUND_COLOR = registerColor('prompt.frontMatter.inactiveBackground', { dark: darken(editorBackground, 0.1), light: darken(editorBackground, 0.025), hcDark: contrastBorder, hcLight: contrastBorder }, localize('chat.prompt.frontMatter.inactiveBackground.description', "Background color of an inactive Front Matter header block."));
/**
 * CSS styles for the decoration.
 */
export const CSS_STYLES = {
    [CssClassNames.Main]: [
        `background-color: ${asCssVariable(BACKGROUND_COLOR)};`,
        'z-index: -1;', // this is required to allow for selections to appear above the decoration background
    ],
    [CssClassNames.MainInactive]: [
        `background-color: ${asCssVariable(INACTIVE_BACKGROUND_COLOR)};`,
    ],
    [CssClassNames.InlineInactive]: [
        'color: var(--vscode-disabledForeground);',
    ],
    ...FrontMatterMarkerDecoration.cssStyles,
};
/**
 * Editor decoration for the Front Matter header token inside a prompt.
 */
export class FrontMatterDecoration extends ReactiveDecorationBase {
    constructor(accessor, token) {
        super(accessor, token);
        this.childDecorators.push(new FrontMatterMarkerDecoration(accessor, token.startMarker), new FrontMatterMarkerDecoration(accessor, token.endMarker));
    }
    setCursorPosition(position) {
        const result = super.setCursorPosition(position);
        for (const marker of this.childDecorators) {
            if ((marker instanceof FrontMatterMarkerDecoration) === false) {
                continue;
            }
            // activate/deactivate markers based on the active state
            // of the main Front Matter header decoration
            marker.activate(this.active);
        }
        return result;
    }
    get classNames() {
        return CssClassNames;
    }
    get isWholeLine() {
        return true;
    }
    get description() {
        return 'Front Matter header decoration.';
    }
    static get cssStyles() {
        return CSS_STYLES;
    }
    /**
     * Whether current decoration class can decorate provided token.
     */
    static handles(token) {
        return token instanceof FrontMatterHeader;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvcmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvZGVjb3JhdGlvbnNQcm92aWRlci9kZWNvcmF0aW9ucy9mcm9udE1hdHRlckRlY29yYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNsSCxPQUFPLEVBQUUsYUFBYSxFQUFtQixNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFcEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDN0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRzNFOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksYUFLWDtBQUxELFdBQVksYUFBYTtJQUN4Qix5REFBd0MsQ0FBQTtJQUN4QyxrRUFBaUQsQ0FBQTtJQUNqRCw0RkFBbUUsQ0FBQTtJQUNuRSxxR0FBdUUsQ0FBQTtBQUN4RSxDQUFDLEVBTFcsYUFBYSxLQUFiLGFBQWEsUUFLeEI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFvQixhQUFhLENBQzdELCtCQUErQixFQUMvQixFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsZ0JBQWdCLEVB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