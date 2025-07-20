/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { SpacingToken, SimpleToken, Space, Tab, VerticalTab } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
suite('SimpleToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('SpacingToken', () => {
        test('extends \'SimpleToken\'', () => {
            class TestClass extends SpacingToken {
                get text() {
                    throw new Error('Method not implemented.');
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const token = new TestClass(new Range(1, 1, 1, 1));
            assert(token instanceof SimpleToken, 'SpacingToken must extend SimpleToken.');
        });
    });
    suite('Space', () => {
        test('extends \'SpacingToken\'', () => {
            const token = new Space(new Range(1, 1, 1, 2));
            assert(token instanceof SimpleToken, 'Space must extend SpacingToken.');
        });
    });
    suite('Tab', () => {
        test('extends \'SpacingToken\'', () => {
            const token = new Tab(new Range(1, 1, 1, 2));
            assert(token instanceof SimpleToken, 'Tab must extend SpacingToken.');
        });
    });
    suite('VerticalTab', () => {
        test('extends \'SpacingToken\'', () => {
            const token = new VerticalTab(new Range(1, 1, 1, 2));
            assert(token instanceof SimpleToken, 'VerticalTab must extend SpacingToken.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlVG9rZW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvdG9rZW5zL3NpbXBsZVRva2VuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBRXBKLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDMUIsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtZQUNwQyxNQUFNLFNBQVUsU0FBUSxZQUFZO2dCQUNuQyxJQUFvQixJQUFJO29CQUN2QixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7Z0JBQzVDLENBQUM7Z0JBQ2UsUUFBUTtvQkFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO2dCQUM1QyxDQUFDO2FBQ0Q7WUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FDTCxLQUFLLFlBQVksV0FBVyxFQUM1Qix1Q0FBdUMsQ0FDdkMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtRQUNuQixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFL0MsTUFBTSxDQUNMLEtBQUssWUFBWSxXQUFXLEVBQzVCLGlDQUFpQyxDQUNqQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU3QyxNQUFNLENBQ0wsS0FBSyxZQUFZLFdBQVcsRUFDNUIsK0JBQStCLENBQy9CLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDekIsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtZQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJELE1BQU0sQ0FDTCxLQUFLLFlBQVksV0FBVyxFQUM1Qix1Q0FBdUMsQ0FDdkMsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9