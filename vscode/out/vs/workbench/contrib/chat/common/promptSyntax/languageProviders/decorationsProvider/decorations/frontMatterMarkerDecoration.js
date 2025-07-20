/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CssClassModifiers } from '../types.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
/**
 * Decoration CSS class names.
 */
export var CssClassNames;
(function (CssClassNames) {
    CssClassNames["Main"] = ".prompt-front-matter-decoration-marker";
    CssClassNames["Inline"] = ".prompt-front-matter-decoration-marker-inline";
    CssClassNames["MainInactive"] = ".prompt-front-matter-decoration-marker.prompt-decoration-inactive";
    CssClassNames["InlineInactive"] = ".prompt-front-matter-decoration-marker-inline.prompt-decoration-inactive";
})(CssClassNames || (CssClassNames = {}));
/**
 * Editor decoration for a `marker` token of a Front Matter header.
 */
export class FrontMatterMarkerDecoration extends ReactiveDecorationBase {
    /**
     * Activate/deactivate the decoration.
     */
    activate(state) {
        const position = (state === true)
            ? this.token.range.getStartPosition()
            : null;
        this.setCursorPosition(position);
        return this;
    }
    get classNames() {
        return CssClassNames;
    }
    get description() {
        return 'Marker decoration of a Front Matter header.';
    }
    static get cssStyles() {
        return {
            [CssClassNames.Inline]: [
                'color: var(--vscode-disabledForeground);',
            ],
            [CssClassNames.InlineInactive]: [
                'opacity: 0.25;',
            ],
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJNYXJrZXJEZWNvcmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvZGVjb3JhdGlvbnNQcm92aWRlci9kZWNvcmF0aW9ucy9mcm9udE1hdHRlck1hcmtlckRlY29yYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR2hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTNFOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksYUFLWDtBQUxELFdBQVksYUFBYTtJQUN4QixnRUFBK0MsQ0FBQTtJQUMvQyx5RUFBd0QsQ0FBQTtJQUN4RCxtR0FBbUUsQ0FBQTtJQUNuRSw0R0FBdUUsQ0FBQTtBQUN4RSxDQUFDLEVBTFcsYUFBYSxLQUFiLGFBQWEsUUFLeEI7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTywyQkFBNEIsU0FBUSxzQkFBd0Q7SUFDeEc7O09BRUc7SUFDSSxRQUFRLENBQUMsS0FBYztRQUM3QixNQUFNLFFBQVEsR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUM7WUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFO1lBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFUixJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFakMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBdUIsVUFBVTtRQUNoQyxPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRUQsSUFBdUIsV0FBVztRQUNqQyxPQUFPLDZDQUE2QyxDQUFDO0lBQ3RELENBQUM7SUFFTSxNQUFNLEtBQUssU0FBUztRQUMxQixPQUFPO1lBQ04sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3ZCLDBDQUEwQzthQUMxQztZQUNELENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQixnQkFBZ0I7YUFDaEI7U0FDRCxDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=