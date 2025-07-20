/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var ExplorerExtensions;
(function (ExplorerExtensions) {
    ExplorerExtensions["FileContributionRegistry"] = "workbench.registry.explorer.fileContributions";
})(ExplorerExtensions || (ExplorerExtensions = {}));
class ExplorerFileContributionRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidRegisterDescriptor = this._register(new Emitter());
        this.onDidRegisterDescriptor = this._onDidRegisterDescriptor.event;
        this.descriptors = [];
    }
    /** @inheritdoc */
    register(descriptor) {
        this.descriptors.push(descriptor);
        this._onDidRegisterDescriptor.fire(descriptor);
    }
    /**
     * Creates a new instance of all registered contributions.
     */
    create(insta, container, store) {
        return this.descriptors.map(d => {
            const i = d.create(insta, container);
            store.add(i);
            return i;
        });
    }
}
export const explorerFileContribRegistry = new ExplorerFileContributionRegistry();
Registry.add("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */, explorerFileContribRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9leHBsb3JlckZpbGVDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFnQyxNQUFNLHNDQUFzQyxDQUFDO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxNQUFNLENBQU4sSUFBa0Isa0JBRWpCO0FBRkQsV0FBa0Isa0JBQWtCO0lBQ25DLGdHQUEwRSxDQUFBO0FBQzNFLENBQUMsRUFGaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQUVuQztBQXlCRCxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFBekQ7O1FBQ2tCLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXVDLENBQUMsQ0FBQztRQUMvRiw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDO1FBRTdELGdCQUFXLEdBQTBDLEVBQUUsQ0FBQztJQWtCMUUsQ0FBQztJQWhCQSxrQkFBa0I7SUFDWCxRQUFRLENBQUMsVUFBK0M7UUFDOUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBNEIsRUFBRSxTQUFzQixFQUFFLEtBQXNCO1FBQ3pGLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGdDQUFnQyxFQUFFLENBQUM7QUFDbEYsUUFBUSxDQUFDLEdBQUcsb0dBQThDLDJCQUEyQixDQUFDLENBQUMifQ==