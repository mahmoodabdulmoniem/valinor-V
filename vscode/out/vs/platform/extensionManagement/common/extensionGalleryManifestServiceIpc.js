/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Barrier } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IProductService } from '../../product/common/productService.js';
import { ExtensionGalleryManifestService } from './extensionGalleryManifestService.js';
let ExtensionGalleryManifestIPCService = class ExtensionGalleryManifestIPCService extends ExtensionGalleryManifestService {
    get extensionGalleryManifestStatus() {
        return this._extensionGalleryManifest ? "available" /* ExtensionGalleryManifestStatus.Available */ : "unavailable" /* ExtensionGalleryManifestStatus.Unavailable */;
    }
    constructor(server, productService) {
        super(productService);
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this._onDidChangeExtensionGalleryManifestStatus = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifestStatus = this._onDidChangeExtensionGalleryManifestStatus.event;
        this.barrier = new Barrier();
        server.registerChannel('extensionGalleryManifest', {
            listen: () => Event.None,
            call: async (context, command, args) => {
                switch (command) {
                    case 'setExtensionGalleryManifest': return Promise.resolve(this.setExtensionGalleryManifest(args[0]));
                }
                throw new Error('Invalid call');
            }
        });
    }
    async getExtensionGalleryManifest() {
        await this.barrier.wait();
        return this._extensionGalleryManifest ?? null;
    }
    setExtensionGalleryManifest(manifest) {
        this._extensionGalleryManifest = manifest;
        this._onDidChangeExtensionGalleryManifest.fire(manifest);
        this._onDidChangeExtensionGalleryManifestStatus.fire(this.extensionGalleryManifestStatus);
        this.barrier.open();
    }
};
ExtensionGalleryManifestIPCService = __decorate([
    __param(1, IProductService)
], ExtensionGalleryManifestIPCService);
export { ExtensionGalleryManifestIPCService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFekUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEYsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSwrQkFBK0I7SUFhdEYsSUFBYSw4QkFBOEI7UUFDMUMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyw0REFBMEMsQ0FBQywrREFBMkMsQ0FBQztJQUMvSCxDQUFDO0lBRUQsWUFDQyxNQUFzQixFQUNMLGNBQStCO1FBRWhELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQWpCZix5Q0FBb0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFvQyxDQUFDLENBQUM7UUFDN0Ysd0NBQW1DLEdBQUcsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQztRQUVoRywrQ0FBMEMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFrQyxDQUFDLENBQUM7UUFDakcsOENBQXlDLEdBQUcsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLEtBQUssQ0FBQztRQUduRyxZQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQVd4QyxNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFO1lBQ2xELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSTtZQUN4QixJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQVksRUFBRSxPQUFlLEVBQUUsSUFBVSxFQUFnQixFQUFFO2dCQUN2RSxRQUFRLE9BQU8sRUFBRSxDQUFDO29CQUNqQixLQUFLLDZCQUE2QixDQUFDLENBQUMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2RyxDQUFDO2dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDakMsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsMkJBQTJCO1FBQ3pDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQyx5QkFBeUIsSUFBSSxJQUFJLENBQUM7SUFDL0MsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFFBQTBDO1FBQzdFLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxRQUFRLENBQUM7UUFDMUMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsMENBQTBDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzFGLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDckIsQ0FBQztDQUVELENBQUE7QUE3Q1ksa0NBQWtDO0lBbUI1QyxXQUFBLGVBQWUsQ0FBQTtHQW5CTCxrQ0FBa0MsQ0E2QzlDIn0=