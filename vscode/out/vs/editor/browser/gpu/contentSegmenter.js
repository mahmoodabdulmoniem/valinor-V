/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
export function createContentSegmenter(lineData, options) {
    if (lineData.isBasicASCII && options.useMonospaceOptimizations) {
        return new AsciiContentSegmenter(lineData);
    }
    return new GraphemeContentSegmenter(lineData);
}
class AsciiContentSegmenter {
    constructor(lineData) {
        this._content = lineData.content;
    }
    getSegmentAtIndex(index) {
        return this._content[index];
    }
    getSegmentData(index) {
        return undefined;
    }
}
/**
 * This is a more modern version of {@link GraphemeIterator}, relying on browser APIs instead of a
 * manual table approach.
 */
class GraphemeContentSegmenter {
    constructor(lineData) {
        this._segments = [];
        const content = lineData.content;
        const segmenter = safeIntl.Segmenter(undefined, { granularity: 'grapheme' }).value;
        const segmentedContent = Array.from(segmenter.segment(content));
        let segmenterIndex = 0;
        for (let x = 0; x < content.length; x++) {
            const segment = segmentedContent[segmenterIndex];
            // No more segments in the string (eg. an emoji is the last segment)
            if (!segment) {
                break;
            }
            // The segment isn't renderable (eg. the tail end of an emoji)
            if (segment.index !== x) {
                this._segments.push(undefined);
                continue;
            }
            segmenterIndex++;
            this._segments.push(segment);
        }
    }
    getSegmentAtIndex(index) {
        return this._segments[index]?.segment;
    }
    getSegmentData(index) {
        return this._segments[index];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFNlZ21lbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L2NvbnRlbnRTZWdtZW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBZ0J4RCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsUUFBK0IsRUFBRSxPQUF3QjtJQUMvRixJQUFJLFFBQVEsQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDaEUsT0FBTyxJQUFJLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFDRCxPQUFPLElBQUksd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUVELE1BQU0scUJBQXFCO0lBRzFCLFlBQVksUUFBK0I7UUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFhO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQWE7UUFDM0IsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSx3QkFBd0I7SUFHN0IsWUFBWSxRQUErQjtRQUYxQixjQUFTLEdBQXFDLEVBQUUsQ0FBQztRQUdqRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ25GLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDaEUsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFakQsb0VBQW9FO1lBQ3BFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxNQUFNO1lBQ1AsQ0FBQztZQUVELDhEQUE4RDtZQUM5RCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQixTQUFTO1lBQ1YsQ0FBQztZQUVELGNBQWMsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsaUJBQWlCLENBQUMsS0FBYTtRQUM5QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUMzQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNEIn0=