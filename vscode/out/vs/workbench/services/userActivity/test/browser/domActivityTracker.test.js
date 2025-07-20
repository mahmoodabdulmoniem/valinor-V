/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { DomActivityTracker } from '../../browser/domActivityTracker.js';
import { UserActivityService } from '../../common/userActivityService.js';
suite('DomActivityTracker', () => {
    let uas;
    let insta;
    let clock;
    const maxTimeToBecomeIdle = 3 * 30_000; // (MIN_INTERVALS_WITHOUT_ACTIVITY + 1) * CHECK_INTERVAL;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        clock = sinon.useFakeTimers();
        insta = store.add(new TestInstantiationService());
        uas = store.add(new UserActivityService(insta));
        store.add(new DomActivityTracker(uas));
    });
    teardown(() => {
        clock.restore();
    });
    test('marks inactive on no input', () => {
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
    });
    test('preserves activity state when active', () => {
        assert.equal(uas.isActive, true);
        const div = 10;
        for (let i = 0; i < div; i++) {
            document.dispatchEvent(new MouseEvent('keydown'));
            clock.tick(maxTimeToBecomeIdle / div);
        }
        assert.equal(uas.isActive, true);
    });
    test('restores active state', () => {
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
        document.dispatchEvent(new MouseEvent('keydown'));
        assert.equal(uas.isActive, true);
        clock.tick(maxTimeToBecomeIdle);
        assert.equal(uas.isActive, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tQWN0aXZpdHlUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyQWN0aXZpdHkvdGVzdC9icm93c2VyL2RvbUFjdGl2aXR5VHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUxRSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLElBQUksR0FBd0IsQ0FBQztJQUM3QixJQUFJLEtBQStCLENBQUM7SUFDcEMsSUFBSSxLQUE0QixDQUFDO0lBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLHlEQUF5RDtJQUNqRyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlCLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFHSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlCLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRWxDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=