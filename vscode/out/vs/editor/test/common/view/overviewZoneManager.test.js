/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ColorZone, OverviewRulerZone, OverviewZoneManager } from '../../../common/viewModel/overviewZoneManager.js';
suite('Editor View - OverviewZoneManager', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('pixel ratio 1, dom height 600', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(600);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(1);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 12, but cap is at 6
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(12, 24, 1), //
            new ColorZone(120, 132, 2), // 120 -> 132
            new ColorZone(360, 384, 3), // 360 -> 372 [360 -> 384]
            new ColorZone(588, 600, 4), // 588 -> 600
        ]);
    });
    test('pixel ratio 1, dom height 300', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(300);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(1);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 6, cap is at 6
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(6, 12, 1), //
            new ColorZone(60, 66, 2), // 60 -> 66
            new ColorZone(180, 192, 3), // 180 -> 192
            new ColorZone(294, 300, 4), // 294 -> 300
        ]);
    });
    test('pixel ratio 2, dom height 300', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(300);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(2);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 6, cap is at 12
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(12, 24, 1), //
            new ColorZone(120, 132, 2), // 120 -> 132
            new ColorZone(360, 384, 3), // 360 -> 384
            new ColorZone(588, 600, 4), // 588 -> 600
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdab25lTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdmlldy9vdmVydmlld1pvbmVNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVySCxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBRS9DLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDdEIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksbUJBQW1CLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUNsRixPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDakQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNuQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXpCLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEIsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUs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