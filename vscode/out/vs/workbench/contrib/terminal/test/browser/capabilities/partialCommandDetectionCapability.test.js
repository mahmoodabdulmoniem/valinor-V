/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepEqual, deepStrictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { PartialCommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/partialCommandDetectionCapability.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
import { Emitter } from '../../../../../../base/common/event.js';
suite('PartialCommandDetectionCapability', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capability;
    let addEvents;
    let onDidExecuteTextEmitter;
    function assertCommands(expectedLines) {
        deepStrictEqual(capability.commands.map(e => e.line), expectedLines);
        deepStrictEqual(addEvents.map(e => e.line), expectedLines);
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80 }));
        onDidExecuteTextEmitter = store.add(new Emitter());
        capability = store.add(new PartialCommandDetectionCapability(xterm, onDidExecuteTextEmitter.event));
        addEvents = [];
        store.add(capability.onCommandFinished(e => addEvents.push(e)));
    });
    test('should not add commands when the cursor position is too close to the left side', async () => {
        assertCommands([]);
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
        await writeP(xterm, 'a');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([]);
    });
    test('should add commands when the cursor position is not too close to the left side', async () => {
        assertCommands([]);
        await writeP(xterm, 'ab');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n\r\n');
        assertCommands([0]);
        await writeP(xterm, 'cd');
        xterm.input('\x0d');
        await writeP(xterm, '\r\n');
        assertCommands([0, 2]);
    });
    test('onDidExecuteText should cause onDidCommandFinished to fire', async () => {
        await writeP(xterm, 'cd');
        onDidExecuteTextEmitter.fire();
        await writeP(xterm, 'pwd');
        onDidExecuteTextEmitter.fire();
        deepEqual(addEvents.length, 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci9jYXBhYmlsaXRpZXMvcGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOEZBQThGLENBQUM7QUFDakosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxLQUFlLENBQUM7SUFDcEIsSUFBSSxVQUE2QyxDQUFDO0lBQ2xELElBQUksU0FBb0IsQ0FBQztJQUN6QixJQUFJLHVCQUFzQyxDQUFDO0lBRTNDLFNBQVMsY0FBYyxDQUFDLGFBQXVCO1FBQzlDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNyRSxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFD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