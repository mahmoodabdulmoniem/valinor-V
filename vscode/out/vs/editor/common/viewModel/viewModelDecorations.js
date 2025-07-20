/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { filterFontDecorations, filterValidationDecorations } from '../config/editorOptions.js';
import { isModelDecorationVisible, ViewModelDecoration } from './viewModelDecoration.js';
import { InlineDecoration } from './inlineDecorations.js';
export class ViewModelDecorations {
    constructor(editorId, model, configuration, linesCollection, coordinatesConverter) {
        this.editorId = editorId;
        this.model = model;
        this.configuration = configuration;
        this._linesCollection = linesCollection;
        this._coordinatesConverter = coordinatesConverter;
        this._decorationsCache = Object.create(null);
        this._cachedModelDecorationsResolver = null;
        this._cachedModelDecorationsResolverViewRange = null;
    }
    _clearCachedModelDecorationsResolver() {
        this._cachedModelDecorationsResolver = null;
        this._cachedModelDecorationsResolverViewRange = null;
    }
    dispose() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    reset() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    onModelDecorationsChanged() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    onLineMappingChanged() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    _getOrCreateViewModelDecoration(modelDecoration) {
        const id = modelDecoration.id;
        let r = this._decorationsCache[id];
        if (!r) {
            const modelRange = modelDecoration.range;
            const options = modelDecoration.options;
            let viewRange;
            if (options.isWholeLine) {
                const start = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.startLineNumber, 1), 0 /* PositionAffinity.Left */, false, true);
                const end = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.endLineNumber, this.model.getLineMaxColumn(modelRange.endLineNumber)), 1 /* PositionAffinity.Right */);
                viewRange = new Range(start.lineNumber, start.column, end.lineNumber, end.column);
            }
            else {
                // For backwards compatibility reasons, we want injected text before any decoration.
                // Thus, move decorations to the right.
                viewRange = this._coordinatesConverter.convertModelRangeToViewRange(modelRange, 1 /* PositionAffinity.Right */);
            }
            r = new ViewModelDecoration(viewRange, options);
            this._decorationsCache[id] = r;
        }
        return r;
    }
    getMinimapDecorationsInRange(range) {
        return this._getDecorationsInRange(range, true, false).decorations;
    }
    getDecorationsViewportData(viewRange) {
        let cacheIsValid = (this._cachedModelDecorationsResolver !== null);
        cacheIsValid = cacheIsValid && (viewRange.equalsRange(this._cachedModelDecorationsResolverViewRange));
        if (!cacheIsValid) {
            this._cachedModelDecorationsResolver = this._getDecorationsInRange(viewRange, false, false);
            this._cachedModelDecorationsResolverViewRange = viewRange;
        }
        return this._cachedModelDecorationsResolver;
    }
    getDecorationsOnLine(lineNumber, onlyMinimapDecorations = false, onlyMarginDecorations = false) {
        const range = new Range(lineNumber, this._linesCollection.getViewLineMinColumn(lineNumber), lineNumber, this._linesCollection.getViewLineMaxColumn(lineNumber));
        return this._getDecorationsInRange(range, onlyMinimapDecorations, onlyMarginDecorations);
    }
    _getDecorationsInRange(viewRange, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelDecorations = this._linesCollection.getDecorationsInRange(viewRange, this.editorId, filterValidationDecorations(this.configuration.options), filterFontDecorations(this.configuration.options), onlyMinimapDecorations, onlyMarginDecorations);
        const startLineNumber = viewRange.startLineNumber;
        const endLineNumber = viewRange.endLineNumber;
        const decorationsInViewport = [];
        let decorationsInViewportLen = 0;
        const inlineDecorations = [];
        for (let j = startLineNumber; j <= endLineNumber; j++) {
            inlineDecorations[j - startLineNumber] = [];
        }
        let hasVariableFonts = false;
        for (let i = 0, len = modelDecorations.length; i < len; i++) {
            const modelDecoration = modelDecorations[i];
            const decorationOptions = modelDecoration.options;
            if (!isModelDecorationVisible(this.model, modelDecoration)) {
                continue;
            }
            const viewModelDecoration = this._getOrCreateViewModelDecoration(modelDecoration);
            const viewRange = viewModelDecoration.range;
            decorationsInViewport[decorationsInViewportLen++] = viewModelDecoration;
            if (decorationOptions.inlineClassName) {
                const inlineDecoration = new InlineDecoration(viewRange, decorationOptions.inlineClassName, decorationOptions.inlineClassNameAffectsLetterSpacing ? 3 /* InlineDecorationType.RegularAffectingLetterSpacing */ : 0 /* InlineDecorationType.Regular */);
                const intersectedStartLineNumber = Math.max(startLineNumber, viewRange.startLineNumber);
                const intersectedEndLineNumber = Math.min(endLineNumber, viewRange.endLineNumber);
                for (let j = intersectedStartLineNumber; j <= intersectedEndLineNumber; j++) {
                    inlineDecorations[j - startLineNumber].push(inlineDecoration);
                }
            }
            if (decorationOptions.beforeContentClassName) {
                if (startLineNumber <= viewRange.startLineNumber && viewRange.startLineNumber <= endLineNumber) {
                    const inlineDecoration = new InlineDecoration(new Range(viewRange.startLineNumber, viewRange.startColumn, viewRange.startLineNumber, viewRange.startColumn), decorationOptions.beforeContentClassName, 1 /* InlineDecorationType.Before */);
                    inlineDecorations[viewRange.startLineNumber - startLineNumber].push(inlineDecoration);
                }
            }
            if (decorationOptions.afterContentClassName) {
                if (startLineNumber <= viewRange.endLineNumber && viewRange.endLineNumber <= endLineNumber) {
                    const inlineDecoration = new InlineDecoration(new Range(viewRange.endLineNumber, viewRange.endColumn, viewRange.endLineNumber, viewRange.endColumn), decorationOptions.afterContentClassName, 2 /* InlineDecorationType.After */);
                    inlineDecorations[viewRange.endLineNumber - startLineNumber].push(inlineDecoration);
                }
            }
            if (decorationOptions.affectsFont) {
                hasVariableFonts = true;
            }
        }
        return {
            decorations: decorationsInViewport,
            inlineDecorations: inlineDecorations,
            hasVariableFonts
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL3ZpZXdNb2RlbERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFJekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHdCQUF3QixDQUFDO0FBcUJoRixNQUFNLE9BQU8sb0JBQW9CO0lBYWhDLFlBQVksUUFBZ0IsRUFBRSxLQUFpQixFQUFFLGFBQW1DLEVBQUUsZUFBZ0MsRUFBRSxvQkFBMkM7UUFDbEssSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztRQUN4QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUM7UUFDbEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLCtCQUErQixHQUFHLElBQUksQ0FBQztRQUM1QyxJQUFJLENBQUMsd0NBQXdDLEdBQUcsSUFBSSxDQUFDO0lBQ3RELENBQUM7SUFFTyxvQ0FBb0M7UUFDM0MsSUFBSSxDQUFDLCtCQUErQixHQUFHLElBQUksQ0FBQztRQUM1QyxJQUFJLENBQUMsd0NBQXdDLEdBQUcsSUFBSSxDQUFDO0lBQ3RELENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsQ0FBQztJQUM3QyxDQUFDO0lBRU0seUJBQXlCO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxDQUFDO0lBQzdDLENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVPLCtCQUErQixDQUFDLGVBQWlDO1FBQ3hFLE1BQU0sRUFBRSxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNSLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUM7WUFDekMsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FBQztZQUN4QyxJQUFJLFNBQWdCLENBQUM7WUFDckIsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxrQ0FBa0MsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxpQ0FBeUIsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM3SixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsa0NBQWtDLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxpQ0FBeUIsQ0FBQztnQkFDak0sU0FBUyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asb0ZBQW9GO2dCQUNwRix1Q0FBdUM7Z0JBQ3ZDLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQztZQUN6RyxDQUFDO1lBQ0QsQ0FBQyxHQUFHLElBQUksbUJBQW1CLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVNLDRCQUE0QixDQUFDLEtBQVk7UUFDL0MsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUM7SUFDcEUsQ0FBQztJQUVNLDBCQUEwQixDQUFDLFNBQWdCO1FBQ2pELElBQUksWUFBWSxHQUFHLENBQUMsSUFBSSxDQUFDLCtCQUErQixLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ25FLFlBQVksR0FBRyxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUM7UUFDdEcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RixJQUFJLENBQUMsd0NBQXdDLEdBQUcsU0FBUyxDQUFDO1FBQzNELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQywrQkFBZ0MsQ0FBQztJQUM5QyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsVUFBa0IsRUFBRSx5QkFBa0MsS0FBSyxFQUFFLHdCQUFpQyxLQUFLO1FBQzlILE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2hLLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxTQUFnQixFQUFFLHNCQUErQixFQUFFLHFCQUE4QjtRQUMvRyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUMxUCxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDO1FBQ2xELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUM7UUFFOUMsTUFBTSxxQkFBcUIsR0FBMEIsRUFBRSxDQUFDO1FBQ3hELElBQUksd0JBQXdCLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0saUJBQWlCLEdBQXlCLEVBQUUsQ0FBQztRQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLGVBQWUsRUFBRSxDQUFDLElBQUksYUFBYSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM3QyxDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0QsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO1lBRWxELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQzVELFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDbEYsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1lBRTVDLHFCQUFxQixDQUFDLHdCQUF3QixFQUFFLENBQUMsR0FBRyxtQkFBbUIsQ0FBQztZQUV4RSxJQUFJLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUN2QyxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLDREQUFvRCxDQUFDLHFDQUE2QixDQUFDLENBQUM7Z0JBQ3ZPLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUN4RixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDbEYsS0FBSyxJQUFJLENBQUMsR0FBRywwQkFBMEIsRUFBRSxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDN0UsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUMvRCxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxlQUFlLElBQUksU0FBUyxDQUFDLGVBQWUsSUFBSSxTQUFTLENBQUMsZUFBZSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNoRyxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQzVDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFDN0csaUJBQWlCLENBQUMsc0JBQXNCLHNDQUV4QyxDQUFDO29CQUNGLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3ZGLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLGVBQWUsSUFBSSxTQUFTLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxhQUFhLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQzVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDNUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUNyRyxpQkFBaUIsQ0FBQyxxQkFBcUIscUNBRXZDLENBQUM7b0JBQ0YsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztnQkFDckYsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNuQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPO1lBQ04sV0FBVyxFQUFFLHFCQUFxQjtZQUNsQyxpQkFBaUIsRUFBRSxpQkFBaUI7WUFDcEMsZ0JBQWdCO1NBQ2hCLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==