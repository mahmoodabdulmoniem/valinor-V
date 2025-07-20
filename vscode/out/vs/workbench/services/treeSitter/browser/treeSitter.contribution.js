/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITreeSitterLibraryService } from '../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
import { ITreeSitterThemeService } from '../../../../editor/common/services/treeSitter/treeSitterThemeService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { TreeSitterLibraryService } from './treeSitterLibraryService.js';
import { TreeSitterThemeService } from './treeSitterThemeService.js';
registerSingleton(ITreeSitterLibraryService, TreeSitterLibraryService, 0 /* InstantiationType.Eager */);
registerSingleton(ITreeSitterThemeService, TreeSitterThemeService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90cmVlU2l0dGVyL2Jyb3dzZXIvdHJlZVNpdHRlci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDdEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDbEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXJFLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixrQ0FBMEIsQ0FBQztBQUNoRyxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxzQkFBc0Isa0NBQTBCLENBQUMifQ==