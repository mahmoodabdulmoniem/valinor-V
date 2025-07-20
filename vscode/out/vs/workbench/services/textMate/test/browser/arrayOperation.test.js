/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MonotonousIndexTransformer } from '../../browser/indexTransformer.js';
import { LengthEdit, LengthReplacement } from '../../../../../editor/common/core/edits/lengthEdit.js';
suite('array operation', () => {
    function seq(start, end) {
        const result = [];
        for (let i = start; i < end; i++) {
            result.push(i);
        }
        return result;
    }
    test('simple', () => {
        const edit = LengthEdit.create([
            LengthReplacement.create(4, 7, 2),
            LengthReplacement.create(8, 8, 2),
            LengthReplacement.create(9, 11, 0),
        ]);
        const arr = seq(0, 15).map(x => `item${x}`);
        const newArr = edit.applyArray(arr, undefined);
        assert.deepStrictEqual(newArr, [
            'item0',
            'item1',
            'item2',
            'item3',
            undefined,
            undefined,
            'item7',
            undefined,
            undefined,
            'item8',
            'item11',
            'item12',
            'item13',
            'item14',
        ]);
        const transformer = new MonotonousIndexTransformer(edit);
        assert.deepStrictEqual(seq(0, 15).map((x) => {
            const t = transformer.transform(x);
            let r = `arr[${x}]: ${arr[x]} -> `;
            if (t !== undefined) {
                r += `newArr[${t}]: ${newArr[t]}`;
            }
            else {
                r += 'undefined';
            }
            return r;
        }), [
            'arr[0]: item0 -> newArr[0]: item0',
            'arr[1]: item1 -> newArr[1]: item1',
            'arr[2]: item2 -> newArr[2]: item2',
            'arr[3]: item3 -> newArr[3]: item3',
            'arr[4]: item4 -> undefined',
            'arr[5]: item5 -> undefined',
            'arr[6]: item6 -> undefined',
            'arr[7]: item7 -> newArr[6]: item7',
            'arr[8]: item8 -> newArr[9]: item8',
            'arr[9]: item9 -> undefined',
            'arr[10]: item10 -> undefined',
            'arr[11]: item11 -> newArr[10]: item11',
            'arr[12]: item12 -> newArr[11]: item12',
            'arr[13]: item13 -> newArr[12]: item13',
            'arr[14]: item14 -> newArr[13]: item14',
        ]);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlPcGVyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL3Rlc3QvYnJvd3Nlci9hcnJheU9wZXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFdEcsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3QixTQUFTLEdBQUcsQ0FBQyxLQUFhLEVBQUUsR0FBVztRQUN0QyxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDOUIsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsT0FBTztZQUNQLE9BQU87WUFDUCxPQUFPO1lBQ1AsT0FBTztZQUNQLFNBQVM7WUFDVCxTQUFTO1lBQ1QsT0FBTztZQUNQLFNBQVM7WUFDVCxTQUFTO1lBQ1QsT0FBTztZQUNQLFFBQVE7WUFDUixRQUFRO1lBQ1IsUUFBUTtZQUNSLFFBQVE7U0FDUixDQUFDLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNuQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ25DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxDQUFDLElBQUksV0FBVyxDQUFDO1lBQ2xCLENBQUM7WUFDRCxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FBQyxFQUNGO1lBQ0MsbUNBQW1DO1lBQ25DLG1DQUFtQztZQUNuQyxtQ0FBbUM7WUFDbkMsbUNBQW1DO1lBQ25DLDRCQUE0QjtZQUM1Qiw0QkFBNEI7WUFDNUIsNEJBQTRCO1lBQzVCLG1DQUFtQztZQUNuQyxtQ0FBbUM7WUFDbkMsNEJBQTRCO1lBQzVCLDhCQUE4QjtZQUM5Qix1Q0FBdUM7WUFDdkMsdUNBQXVDO1lBQ3ZDLHVDQUF1QztZQUN2Qyx1Q0FBdUM7U0FDdkMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDIn0=