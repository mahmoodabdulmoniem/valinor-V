/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { activityErrorBadgeBackground, activityErrorBadgeForeground, badgeBackground, badgeForeground, chartsGreen, chartsRed, contrastBorder, diffInserted, diffRemoved, editorBackground, editorErrorForeground, editorForeground, editorInfoForeground, opaque, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
export const testingColorIconFailed = registerColor('testing.iconFailed', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D'
}, localize('testing.iconFailed', "Color for the 'failed' icon in the test explorer."));
export const testingColorIconErrored = registerColor('testing.iconErrored', {
    dark: '#f14c4c',
    light: '#f14c4c',
    hcDark: '#f14c4c',
    hcLight: '#B5200D'
}, localize('testing.iconErrored', "Color for the 'Errored' icon in the test explorer."));
export const testingColorIconPassed = registerColor('testing.iconPassed', {
    dark: '#73c991',
    light: '#73c991',
    hcDark: '#73c991',
    hcLight: '#007100'
}, localize('testing.iconPassed', "Color for the 'passed' icon in the test explorer."));
export const testingColorRunAction = registerColor('testing.runAction', testingColorIconPassed, localize('testing.runAction', "Color for 'run' icons in the editor."));
export const testingColorIconQueued = registerColor('testing.iconQueued', '#cca700', localize('testing.iconQueued', "Color for the 'Queued' icon in the test explorer."));
export const testingColorIconUnset = registerColor('testing.iconUnset', '#848484', localize('testing.iconUnset', "Color for the 'Unset' icon in the test explorer."));
export const testingColorIconSkipped = registerColor('testing.iconSkipped', '#848484', localize('testing.iconSkipped', "Color for the 'Skipped' icon in the test explorer."));
export const testingPeekBorder = registerColor('testing.peekBorder', {
    dark: editorErrorForeground,
    light: editorErrorForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingMessagePeekBorder = registerColor('testing.messagePeekBorder', {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.messagePeekBorder', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingPeekHeaderBackground = registerColor('testing.peekHeaderBackground', {
    dark: transparent(editorErrorForeground, 0.1),
    light: transparent(editorErrorForeground, 0.1),
    hcDark: null,
    hcLight: null
}, localize('testing.peekBorder', 'Color of the peek view borders and arrow.'));
export const testingPeekMessageHeaderBackground = registerColor('testing.messagePeekHeaderBackground', {
    dark: transparent(editorInfoForeground, 0.1),
    light: transparent(editorInfoForeground, 0.1),
    hcDark: null,
    hcLight: null
}, localize('testing.messagePeekHeaderBackground', 'Color of the peek view borders and arrow when peeking a logged message.'));
export const testingCoveredBackground = registerColor('testing.coveredBackground', {
    dark: diffInserted,
    light: diffInserted,
    hcDark: null,
    hcLight: null
}, localize('testing.coveredBackground', 'Background color of text that was covered.'));
export const testingCoveredBorder = registerColor('testing.coveredBorder', {
    dark: transparent(testingCoveredBackground, 0.75),
    light: transparent(testingCoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.coveredBorder', 'Border color of text that was covered.'));
export const testingCoveredGutterBackground = registerColor('testing.coveredGutterBackground', {
    dark: transparent(diffInserted, 0.6),
    light: transparent(diffInserted, 0.6),
    hcDark: chartsGreen,
    hcLight: chartsGreen
}, localize('testing.coveredGutterBackground', 'Gutter color of regions where code was covered.'));
export const testingUncoveredBranchBackground = registerColor('testing.uncoveredBranchBackground', {
    dark: opaque(transparent(diffRemoved, 2), editorBackground),
    light: opaque(transparent(diffRemoved, 2), editorBackground),
    hcDark: null,
    hcLight: null
}, localize('testing.uncoveredBranchBackground', 'Background of the widget shown for an uncovered branch.'));
export const testingUncoveredBackground = registerColor('testing.uncoveredBackground', {
    dark: diffRemoved,
    light: diffRemoved,
    hcDark: null,
    hcLight: null
}, localize('testing.uncoveredBackground', 'Background color of text that was not covered.'));
export const testingUncoveredBorder = registerColor('testing.uncoveredBorder', {
    dark: transparent(testingUncoveredBackground, 0.75),
    light: transparent(testingUncoveredBackground, 0.75),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('testing.uncoveredBorder', 'Border color of text that was not covered.'));
export const testingUncoveredGutterBackground = registerColor('testing.uncoveredGutterBackground', {
    dark: transparent(diffRemoved, 1.5),
    light: transparent(diffRemoved, 1.5),
    hcDark: chartsRed,
    hcLight: chartsRed
}, localize('testing.uncoveredGutterBackground', 'Gutter color of regions where code not covered.'));
export const testingCoverCountBadgeBackground = registerColor('testing.coverCountBadgeBackground', badgeBackground, localize('testing.coverCountBadgeBackground', 'Background for the badge indicating execution count'));
export const testingCoverCountBadgeForeground = registerColor('testing.coverCountBadgeForeground', badgeForeground, localize('testing.coverCountBadgeForeground', 'Foreground for the badge indicating execution count'));
const messageBadgeBackground = registerColor('testing.message.error.badgeBackground', activityErrorBadgeBackground, localize('testing.message.error.badgeBackground', 'Background color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeBorder', messageBadgeBackground, localize('testing.message.error.badgeBorder', 'Border color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.badgeForeground', activityErrorBadgeForeground, localize('testing.message.error.badgeForeground', 'Text color of test error messages shown inline in the editor.'));
registerColor('testing.message.error.lineBackground', null, localize('testing.message.error.marginBackground', 'Margin color beside error messages shown inline in the editor.'));
registerColor('testing.message.info.decorationForeground', transparent(editorForeground, 0.5), localize('testing.message.info.decorationForeground', 'Text color of test info messages shown inline in the editor.'));
registerColor('testing.message.info.lineBackground', null, localize('testing.message.info.marginBackground', 'Margin color beside info messages shown inline in the editor.'));
export const testStatesToIconColors = {
    [6 /* TestResultState.Errored */]: testingColorIconErrored,
    [4 /* TestResultState.Failed */]: testingColorIconFailed,
    [3 /* TestResultState.Passed */]: testingColorIconPassed,
    [1 /* TestResultState.Queued */]: testingColorIconQueued,
    [0 /* TestResultState.Unset */]: testingColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingColorIconSkipped,
};
export const testingRetiredColorIconErrored = registerColor('testing.iconErrored.retired', transparent(testingColorIconErrored, 0.7), localize('testing.iconErrored.retired', "Retired color for the 'Errored' icon in the test explorer."));
export const testingRetiredColorIconFailed = registerColor('testing.iconFailed.retired', transparent(testingColorIconFailed, 0.7), localize('testing.iconFailed.retired', "Retired color for the 'failed' icon in the test explorer."));
export const testingRetiredColorIconPassed = registerColor('testing.iconPassed.retired', transparent(testingColorIconPassed, 0.7), localize('testing.iconPassed.retired', "Retired color for the 'passed' icon in the test explorer."));
export const testingRetiredColorIconQueued = registerColor('testing.iconQueued.retired', transparent(testingColorIconQueued, 0.7), localize('testing.iconQueued.retired', "Retired color for the 'Queued' icon in the test explorer."));
export const testingRetiredColorIconUnset = registerColor('testing.iconUnset.retired', transparent(testingColorIconUnset, 0.7), localize('testing.iconUnset.retired', "Retired color for the 'Unset' icon in the test explorer."));
export const testingRetiredColorIconSkipped = registerColor('testing.iconSkipped.retired', transparent(testingColorIconSkipped, 0.7), localize('testing.iconSkipped.retired', "Retired color for the 'Skipped' icon in the test explorer."));
export const testStatesToRetiredIconColors = {
    [6 /* TestResultState.Errored */]: testingRetiredColorIconErrored,
    [4 /* TestResultState.Failed */]: testingRetiredColorIconFailed,
    [3 /* TestResultState.Passed */]: testingRetiredColorIconPassed,
    [1 /* TestResultState.Queued */]: testingRetiredColorIconQueued,
    [0 /* TestResultState.Unset */]: testingRetiredColorIconUnset,
    [5 /* TestResultState.Skipped */]: testingRetiredColorIconSkipped,
};
registerThemingParticipant((theme, collector) => {
    const editorBg = theme.getColor(editorBackground);
    collector.addRule(`
	.coverage-deco-inline.coverage-deco-hit.coverage-deco-hovered {
		background: ${theme.getColor(testingCoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingCoveredBorder)?.transparent(2)};
	}
	.coverage-deco-inline.coverage-deco-miss.coverage-deco-hovered {
		background: ${theme.getColor(testingUncoveredBackground)?.transparent(1.3)};
		outline-color: ${theme.getColor(testingUncoveredBorder)?.transparent(2)};
	}
		`);
    if (editorBg) {
        const missBadgeBackground = theme.getColor(testingUncoveredBackground)?.transparent(2).makeOpaque(editorBg);
        const errorBadgeBackground = theme.getColor(messageBadgeBackground)?.makeOpaque(editorBg);
        collector.addRule(`
			.coverage-deco-branch-miss-indicator::before {
				border-color: ${missBadgeBackground?.transparent(1.3)};
				background-color: ${missBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner{
				background: ${errorBadgeBackground};
			}
			.monaco-workbench .test-error-content-widget .inner .arrow svg {
				fill: ${errorBadgeBackground};
			}
		`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90aGVtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDRCQUE0QixFQUFFLGVBQWUsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFWLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRy9GLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRTtJQUN6RSxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG1EQUFtRCxDQUFDLENBQUMsQ0FBQztBQUV4RixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUMscUJBQXFCLEVBQUU7SUFDM0UsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsU0FBUztJQUNqQixPQUFPLEVBQUUsU0FBUztDQUNsQixFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxvREFBb0QsQ0FBQyxDQUFDLENBQUM7QUFFMUYsTUFBTSxDQUFD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