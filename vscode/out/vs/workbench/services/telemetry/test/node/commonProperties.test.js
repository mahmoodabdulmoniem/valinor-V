/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { release, hostname } from 'os';
import { resolveWorkbenchCommonProperties } from '../../common/workbenchCommonProperties.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Telemetry - common properties', function () {
    const commit = (undefined);
    const version = (undefined);
    const date = undefined;
    let testStorageService;
    teardown(() => {
        testStorageService.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testStorageService = new InMemoryStorageService();
    });
    test('default', function () {
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process, date);
        assert.ok('commitHash' in props);
        assert.ok('sessionID' in props);
        assert.ok('timestamp' in props);
        assert.ok('common.platform' in props);
        assert.ok('common.nodePlatform' in props);
        assert.ok('common.nodeArch' in props);
        assert.ok('common.timesincesessionstart' in props);
        assert.ok('common.sequence' in props);
        // assert.ok('common.version.shell' in first.data); // only when running on electron
        // assert.ok('common.version.renderer' in first.data);
        assert.ok('common.platformVersion' in props, 'platformVersion');
        assert.ok('version' in props);
        assert.ok('common.releaseDate' in props);
        assert.ok('common.firstSessionDate' in props, 'firstSessionDate');
        assert.ok('common.lastSessionDate' in props, 'lastSessionDate'); // conditional, see below, 'lastSessionDate'ow
        assert.ok('common.isNewSession' in props, 'isNewSession');
        // machine id et al
        assert.ok('common.machineId' in props, 'machineId');
    });
    test('lastSessionDate when available', function () {
        testStorageService.store('telemetry.lastSessionDate', new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process, date);
        assert.ok('common.lastSessionDate' in props); // conditional, see below
        assert.ok('common.isNewSession' in props);
        assert.strictEqual(props['common.isNewSession'], '0');
    });
    test('values chance on ask', async function () {
        const props = resolveWorkbenchCommonProperties(testStorageService, release(), hostname(), commit, version, 'someMachineId', 'someSqmId', 'somedevDeviceId', false, process, date);
        let value1 = props['common.sequence'];
        let value2 = props['common.sequence'];
        assert.ok(value1 !== value2, 'seq');
        value1 = props['timestamp'];
        value2 = props['timestamp'];
        assert.ok(value1 !== value2, 'timestamp');
        value1 = props['common.timesincesessionstart'];
        await timeout(10);
        value2 = props['common.timesincesessionstart'];
        assert.ok(value1 !== value2, 'timesincesessionstart');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uUHJvcGVydGllcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVsZW1ldHJ5L3Rlc3Qvbm9kZS9jb21tb25Qcm9wZXJ0aWVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzdGLE9BQU8sRUFBZ0Isc0JBQXNCLEVBQWlCLE1BQU0sbURBQW1ELENBQUM7QUFDeEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLEtBQUssQ0FBQywrQkFBK0IsRUFBRTtJQUN0QyxNQUFNLE1BQU0sR0FBVyxDQUFDLFNBQVMsQ0FBRSxDQUFDO0lBQ3BDLE1BQU0sT0FBTyxHQUFXLENBQUMsU0FBUyxDQUFFLENBQUM7SUFDckMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3ZCLElBQUksa0JBQTBDLENBQUM7SUFFL0MsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQWtCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO0lBQ25ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFNBQVMsRUFBRTtRQUNmLE1BQU0sS0FBSyxHQUFH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QUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVwQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sR0FBRyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUMvQyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixNQUFNLEdBQUcsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDdkQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9