/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ViewLineOptions {
    constructor(config, themeType) {
        this.themeType = themeType;
        const options = config.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        this.renderWhitespace = options.get(112 /* EditorOption.renderWhitespace */);
        this.experimentalWhitespaceRendering = options.get(47 /* EditorOption.experimentalWhitespaceRendering */);
        this.renderControlCharacters = options.get(107 /* EditorOption.renderControlCharacters */);
        this.spaceWidth = fontInfo.spaceWidth;
        this.middotWidth = fontInfo.middotWidth;
        this.wsmiddotWidth = fontInfo.wsmiddotWidth;
        this.useMonospaceOptimizations = (fontInfo.isMonospace
            && !options.get(40 /* EditorOption.disableMonospaceOptimizations */));
        this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
        this.lineHeight = options.get(75 /* EditorOption.lineHeight */);
        this.stopRenderingLineAfter = options.get(132 /* EditorOption.stopRenderingLineAfter */);
        this.fontLigatures = options.get(60 /* EditorOption.fontLigatures */);
        this.verticalScrollbarSize = options.get(116 /* EditorOption.scrollbar */).verticalScrollbarSize;
        this.useGpu = options.get(46 /* EditorOption.experimentalGpuAcceleration */) === 'on';
    }
    equals(other) {
        return (this.themeType === other.themeType
            && this.renderWhitespace === other.renderWhitespace
            && this.experimentalWhitespaceRendering === other.experimentalWhitespaceRendering
            && this.renderControlCharacters === other.renderControlCharacters
            && this.spaceWidth === other.spaceWidth
            && this.middotWidth === other.middotWidth
            && this.wsmiddotWidth === other.wsmiddotWidth
            && this.useMonospaceOptimizations === other.useMonospaceOptimizations
            && this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
            && this.lineHeight === other.lineHeight
            && this.stopRenderingLineAfter === other.stopRenderingLineAfter
            && this.fontLigatures === other.fontLigatures
            && this.verticalScrollbarSize === other.verticalScrollbarSize
            && this.useGpu === other.useGpu);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzL3ZpZXdMaW5lT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sZUFBZTtJQWdCM0IsWUFBWSxNQUE0QixFQUFFLFNBQXNCO1FBQy9ELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDL0IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0NBQXVCLENBQUM7UUFDcEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHlDQUErQixDQUFDO1FBQ25FLElBQUksQ0FBQywrQkFBK0IsR0FBRyxPQUFPLENBQUMsR0FBRyx1REFBOEMsQ0FBQztRQUNqRyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0RBQXNDLENBQUM7UUFDakYsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQztRQUN4QyxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUM7UUFDNUMsSUFBSSxDQUFDLHlCQUF5QixHQUFHLENBQ2hDLFFBQVEsQ0FBQyxXQUFXO2VBQ2pCLENBQUMsT0FBTyxDQUFDLEdBQUcscURBQTRDLENBQzNELENBQUM7UUFDRixJQUFJLENBQUMsOEJBQThCLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixDQUFDO1FBQzlFLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFDdkQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLCtDQUFxQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcscUNBQTRCLENBQUM7UUFDN0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGtDQUF3QixDQUFDLHFCQUFxQixDQUFDO1FBQ3ZGLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsbURBQTBDLEtBQUssSUFBSSxDQUFDO0lBQzlFLENBQUM7SUFFTSxNQUFNLENBQUMsS0FBc0I7UUFDbkMsT0FBTyxDQUNOLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVM7ZUFDL0IsSUFBSSxDQUFDLGdCQUFnQixLQUFLLEtBQUssQ0FBQyxnQkFBZ0I7ZUFDaEQsSUFBSSxDQUFDLCtCQUErQixLQUFLLEtBQUssQ0FBQywrQkFBK0I7ZUFDOUUsSUFBSSxDQUFDLHVCQUF1QixLQUFLLEtBQUssQ0FBQyx1QkFBdUI7ZUFDOUQsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVTtlQUNwQyxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQyxXQUFXO2VBQ3RDLElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWE7ZUFDMUMsSUFBSSxDQUFDLHlCQUF5QixLQUFLLEtBQUssQ0FBQyx5QkFBeUI7ZUFDbEUsSUFBSSxDQUFDLDhCQUE4QixLQUFLLEtBQUssQ0FBQyw4QkFBOEI7ZUFDNUUsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUMsVUFBVTtlQUNwQyxJQUFJLENBQUMsc0JBQXNCLEtBQUssS0FBSyxDQUFDLHNCQUFzQjtlQUM1RCxJQUFJLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxhQUFhO2VBQzFDLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxLQUFLLENBQUMscUJBQXFCO2VBQzFELElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FDL0IsQ0FBQztJQUNILENBQUM7Q0FDRCJ9