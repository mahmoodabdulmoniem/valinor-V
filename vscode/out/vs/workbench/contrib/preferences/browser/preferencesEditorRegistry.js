/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
export var Extensions;
(function (Extensions) {
    Extensions.PreferencesEditorPane = 'workbench.registry.preferences.editorPanes';
})(Extensions || (Extensions = {}));
class PreferencesEditorPaneRegistryImpl extends Disposable {
    constructor() {
        super();
        this.descriptors = new Map();
        this._onDidRegisterPreferencesEditorPanes = this._register(new Emitter());
        this.onDidRegisterPreferencesEditorPanes = this._onDidRegisterPreferencesEditorPanes.event;
        this._onDidDeregisterPreferencesEditorPanes = this._register(new Emitter());
        this.onDidDeregisterPreferencesEditorPanes = this._onDidDeregisterPreferencesEditorPanes.event;
    }
    registerPreferencesEditorPane(descriptor) {
        if (this.descriptors.has(descriptor.id)) {
            throw new Error(`PreferencesEditorPane with id ${descriptor.id} already registered`);
        }
        this.descriptors.set(descriptor.id, descriptor);
        this._onDidRegisterPreferencesEditorPanes.fire([descriptor]);
        return {
            dispose: () => {
                if (this.descriptors.delete(descriptor.id)) {
                    this._onDidDeregisterPreferencesEditorPanes.fire([descriptor]);
                }
            }
        };
    }
    getPreferencesEditorPanes() {
        return [...this.descriptors.values()].sort((a, b) => a.order - b.order);
    }
}
Registry.add(Extensions.PreferencesEditorPane, new PreferencesEditorPaneRegistryImpl());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNFZGl0b3JSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9wcmVmZXJlbmNlc0VkaXRvclJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFJbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVFLE1BQU0sS0FBVyxVQUFVLENBRTFCO0FBRkQsV0FBaUIsVUFBVTtJQUNiLGdDQUFxQixHQUFHLDRDQUE0QyxDQUFDO0FBQ25GLENBQUMsRUFGZ0IsVUFBVSxLQUFWLFVBQVUsUUFFMUI7QUF1REQsTUFBTSxpQ0FBa0MsU0FBUSxVQUFVO0lBVXpEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFUUSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUE0QyxDQUFDO1FBRWxFLHlDQUFvQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNDLENBQUMsQ0FBQztRQUNqSCx3Q0FBbUMsR0FBRyxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFDO1FBRTlFLDJDQUFzQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNDLENBQUMsQ0FBQztRQUNuSCwwQ0FBcUMsR0FBRyxJQUFJLENBQUMsc0NBQXNDLENBQUMsS0FBSyxDQUFDO0lBSW5HLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxVQUE0QztRQUN6RSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLFVBQVUsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDN0QsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hFLENBQUM7WUFDRixDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCx5QkFBeUI7UUFDeEIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLENBQUM7Q0FFRDtBQUVELFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixFQUFFLElBQUksaUNBQWlDLEVBQUUsQ0FBQyxDQUFDIn0=