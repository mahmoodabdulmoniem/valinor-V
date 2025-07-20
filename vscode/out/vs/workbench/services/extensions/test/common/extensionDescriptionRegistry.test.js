/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { ExtensionDescriptionRegistry } from '../../common/extensionDescriptionRegistry.js';
suite('ExtensionDescriptionRegistry', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('allow removing and adding the same extension at a different version', () => {
        const idA = new ExtensionIdentifier('a');
        const extensionA1 = desc(idA, '1.0.0');
        const extensionA2 = desc(idA, '2.0.0');
        const basicActivationEventsReader = {
            readActivationEvents: (extensionDescription) => {
                return extensionDescription.activationEvents ?? [];
            }
        };
        const registry = new ExtensionDescriptionRegistry(basicActivationEventsReader, [extensionA1]);
        registry.deltaExtensions([extensionA2], [idA]);
        assert.deepStrictEqual(registry.getAllExtensionDescriptions(), [extensionA2]);
        registry.dispose();
    });
    function desc(id, version, activationEvents = ['*']) {
        return {
            name: id.value,
            publisher: 'test',
            version: '0.0.0',
            engines: { vscode: '^1.0.0' },
            identifier: id,
            extensionLocation: URI.parse(`nothing://nowhere`),
            isBuiltin: false,
            isUnderDevelopment: false,
            isUserBuiltin: false,
            activationEvents,
            main: 'index.js',
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            extensionDependencies: [],
            enabledApiProposals: undefined,
            preRelease: false,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGVzY3JpcHRpb25SZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy90ZXN0L2NvbW1vbi9leHRlbnNpb25EZXNjcmlwdGlvblJlZ2lzdHJ5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXlDLE1BQU0seURBQXlELENBQUM7QUFDckksT0FBTyxFQUFFLDRCQUE0QixFQUEyQixNQUFNLDhDQUE4QyxDQUFDO0FBRXJILEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFFMUMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMscUVBQXFFLEVBQUUsR0FBRyxFQUFFO1FBQ2hGLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDekMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXZDLE1BQU0sMkJBQTJCLEdBQTRCO1lBQzVELG9CQUFvQixFQUFFLENBQUMsb0JBQTJDLEVBQVksRUFBRTtnQkFDL0UsT0FBTyxvQkFBb0IsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUM7WUFDcEQsQ0FBQztTQUNELENBQUM7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLDRCQUE0QixDQUFDLDJCQUEyQixFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUM5RixRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTlFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsSUFBSSxDQUFDLEVBQXVCLEVBQUUsT0FBZSxFQUFFLG1CQUE2QixDQUFDLEdBQUcsQ0FBQztRQUN6RixPQUFPO1lBQ04sSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLO1lBQ2QsU0FBUyxFQUFFLE1BQU07WUFDakIsT0FBTyxFQUFFLE9BQU87WUFDaEIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtZQUM3QixVQUFVLEVBQUUsRUFBRTtZQUNkLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUM7WUFDakQsU0FBUyxFQUFFLEtBQUs7WUFDaEIsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixhQUFhLEVBQUUsS0FBSztZQUNwQixnQkFBZ0I7WUFDaEIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsY0FBYyw0Q0FBMEI7WUFDeEMscUJBQXFCLEVBQUUsRUFBRTtZQUN6QixtQkFBbUIsRUFBRSxTQUFTO1lBQzlCLFVBQVUsRUFBRSxLQUFLO1NBQ2pCLENBQUM7SUFDSCxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMifQ==