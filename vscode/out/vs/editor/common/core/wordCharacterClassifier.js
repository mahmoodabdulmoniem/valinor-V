/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
import { LRUCache } from '../../../base/common/map.js';
import { CharacterClassifier } from './characterClassifier.js';
export var WordCharacterClass;
(function (WordCharacterClass) {
    WordCharacterClass[WordCharacterClass["Regular"] = 0] = "Regular";
    WordCharacterClass[WordCharacterClass["Whitespace"] = 1] = "Whitespace";
    WordCharacterClass[WordCharacterClass["WordSeparator"] = 2] = "WordSeparator";
})(WordCharacterClass || (WordCharacterClass = {}));
export class WordCharacterClassifier extends CharacterClassifier {
    constructor(wordSeparators, intlSegmenterLocales) {
        super(0 /* WordCharacterClass.Regular */);
        this._segmenter = null;
        this._cachedLine = null;
        this._cachedSegments = [];
        this.intlSegmenterLocales = intlSegmenterLocales;
        if (this.intlSegmenterLocales.length > 0) {
            this._segmenter = safeIntl.Segmenter(this.intlSegmenterLocales, { granularity: 'word' });
        }
        else {
            this._segmenter = null;
        }
        for (let i = 0, len = wordSeparators.length; i < len; i++) {
            this.set(wordSeparators.charCodeAt(i), 2 /* WordCharacterClass.WordSeparator */);
        }
        this.set(32 /* CharCode.Space */, 1 /* WordCharacterClass.Whitespace */);
        this.set(9 /* CharCode.Tab */, 1 /* WordCharacterClass.Whitespace */);
    }
    findPrevIntlWordBeforeOrAtOffset(line, offset) {
        let candidate = null;
        for (const segment of this._getIntlSegmenterWordsOnLine(line)) {
            if (segment.index > offset) {
                break;
            }
            candidate = segment;
        }
        return candidate;
    }
    findNextIntlWordAtOrAfterOffset(lineContent, offset) {
        for (const segment of this._getIntlSegmenterWordsOnLine(lineContent)) {
            if (segment.index < offset) {
                continue;
            }
            return segment;
        }
        return null;
    }
    _getIntlSegmenterWordsOnLine(line) {
        if (!this._segmenter) {
            return [];
        }
        // Check if the line has changed from the previous call
        if (this._cachedLine === line) {
            return this._cachedSegments;
        }
        // Update the cache with the new line
        this._cachedLine = line;
        this._cachedSegments = this._filterWordSegments(this._segmenter.value.segment(line));
        return this._cachedSegments;
    }
    _filterWordSegments(segments) {
        const result = [];
        for (const segment of segments) {
            if (this._isWordLike(segment)) {
                result.push(segment);
            }
        }
        return result;
    }
    _isWordLike(segment) {
        if (segment.isWordLike) {
            return true;
        }
        return false;
    }
}
const wordClassifierCache = new LRUCache(10);
export function getMapForWordSeparators(wordSeparators, intlSegmenterLocales) {
    const key = `${wordSeparators}/${intlSegmenterLocales.join(',')}`;
    let result = wordClassifierCache.get(key);
    if (!result) {
        result = new WordCharacterClassifier(wordSeparators, intlSegmenterLocales);
        wordClassifierCache.set(key, result);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZENoYXJhY3RlckNsYXNzaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS93b3JkQ2hhcmFjdGVyQ2xhc3NpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE1BQU0sQ0FBTixJQUFrQixrQkFJakI7QUFKRCxXQUFrQixrQkFBa0I7SUFDbkMsaUVBQVcsQ0FBQTtJQUNYLHVFQUFjLENBQUE7SUFDZCw2RUFBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFJbkM7QUFFRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsbUJBQXVDO0lBT25GLFlBQVksY0FBc0IsRUFBRSxvQkFBeUQ7UUFDNUYsS0FBSyxvQ0FBNEIsQ0FBQztRQUxsQixlQUFVLEdBQWdDLElBQUksQ0FBQztRQUN4RCxnQkFBVyxHQUFrQixJQUFJLENBQUM7UUFDbEMsb0JBQWUsR0FBMEIsRUFBRSxDQUFDO1FBSW5ELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQztRQUNqRCxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxD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