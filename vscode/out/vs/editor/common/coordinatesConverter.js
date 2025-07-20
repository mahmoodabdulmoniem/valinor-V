/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class IdentityCoordinatesConverter {
    constructor(model) {
        this._model = model;
    }
    _validPosition(pos) {
        return this._model.validatePosition(pos);
    }
    _validRange(range) {
        return this._model.validateRange(range);
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._validPosition(viewPosition);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._validRange(viewRange);
    }
    validateViewPosition(_viewPosition, expectedModelPosition) {
        return this._validPosition(expectedModelPosition);
    }
    validateViewRange(_viewRange, expectedModelRange) {
        return this._validRange(expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition) {
        return this._validPosition(modelPosition);
    }
    convertModelRangeToViewRange(modelRange) {
        return this._validRange(modelRange);
    }
    modelPositionIsVisible(modelPosition) {
        const lineCount = this._model.getLineCount();
        if (modelPosition.lineNumber < 1 || modelPosition.lineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    modelRangeIsVisible(modelRange) {
        const lineCount = this._model.getLineCount();
        if (modelRange.startLineNumber < 1 || modelRange.startLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        if (modelRange.endLineNumber < 1 || modelRange.endLineNumber > lineCount) {
            // invalid arguments
            return false;
        }
        return true;
    }
    getModelLineViewLineCount(modelLineNumber) {
        return 1;
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return modelLineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29vcmRpbmF0ZXNDb252ZXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29vcmRpbmF0ZXNDb252ZXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUE0QmhHLE1BQU0sT0FBTyw0QkFBNEI7SUFJeEMsWUFBWSxLQUFpQjtRQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBRU8sY0FBYyxDQUFDLEdBQWE7UUFDbkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTyxXQUFXLENBQUMsS0FBWTtRQUMvQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCwrQ0FBK0M7SUFFeEMsa0NBQWtDLENBQUMsWUFBc0I7UUFDL0QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFTSw0QkFBNEIsQ0FBQyxTQUFnQjtRQUNuRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLG9CQUFvQixDQUFDLGFBQXVCLEVBQUUscUJBQStCO1FBQ25GLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxVQUFpQixFQUFFLGtCQUF5QjtRQUNwRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsK0NBQStDO0lBRXhDLGtDQUFrQyxDQUFDLGFBQXVCO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU0sNEJBQTRCLENBQUMsVUFBaUI7UUFDcEQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTSxzQkFBc0IsQ0FBQyxhQUF1QjtRQUNwRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQzdDLElBQUksYUFBYSxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLFVBQVUsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUMxRSxvQkFBb0I7WUFDcEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0sbUJBQW1CLENBQUMsVUFBaUI7UUFDM0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM3QyxJQUFJLFVBQVUsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxlQUFlLEdBQUcsU0FBUyxFQUFFLENBQUM7WUFDOUUsb0JBQW9CO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksVUFBVSxDQUFDLGFBQWEsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLGFBQWEsR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUMxRSxvQkFBb0I7WUFDcEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU0seUJBQXlCLENBQUMsZUFBdUI7UUFDdkQsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRU0sZ0NBQWdDLENBQUMsZUFBdUIsRUFBRSxXQUFtQjtRQUNuRixPQUFPLGVBQWUsQ0FBQztJQUN4QixDQUFDO0NBQ0QifQ==