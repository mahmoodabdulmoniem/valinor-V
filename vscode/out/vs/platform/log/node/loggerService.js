/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { generateUuid } from '../../../base/common/uuid.js';
import { AbstractLoggerService } from '../common/log.js';
import { SpdLogLogger } from './spdlogLog.js';
export class LoggerService extends AbstractLoggerService {
    doCreateLogger(resource, logLevel, options) {
        return new SpdLogLogger(generateUuid(), resource.fsPath, !options?.donotRotate, !!options?.donotUseFormatters, logLevel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL25vZGUvbG9nZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFxRCxNQUFNLGtCQUFrQixDQUFDO0FBQzVHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU5QyxNQUFNLE9BQU8sYUFBYyxTQUFRLHFCQUFxQjtJQUU3QyxjQUFjLENBQUMsUUFBYSxFQUFFLFFBQWtCLEVBQUUsT0FBd0I7UUFDbkYsT0FBTyxJQUFJLFlBQVksQ0FBQyxZQUFZLEVBQUUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzFILENBQUM7Q0FDRCJ9