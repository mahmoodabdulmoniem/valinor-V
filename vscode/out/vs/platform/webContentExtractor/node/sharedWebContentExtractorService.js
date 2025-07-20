/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
export class SharedWebContentExtractorService {
    async readImage(uri, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        try {
            const response = await fetch(uri.toString(true), {
                headers: {
                    'Accept': 'image/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType?.startsWith('image/') || !/(webp|jpg|jpeg|gif|png|bmp)$/i.test(contentType)) {
                return undefined;
            }
            const content = VSBuffer.wrap(await response /* workaround https://github.com/microsoft/TypeScript/issues/61826 */.bytes());
            return content;
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkV2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3Ivbm9kZS9zaGFyZWRXZWJDb250ZW50RXh0cmFjdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFLMUQsTUFBTSxPQUFPLGdDQUFnQztJQUc1QyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVEsRUFBRSxLQUF3QjtRQUNqRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNoRCxPQUFPLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLFlBQVksRUFBRSxhQUFhO2lCQUMzQjthQUNELENBQUMsQ0FBQztZQUNILE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUM5RyxPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFPLFFBQXdFLENBQUMscUVBQXNFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUM5TCxPQUFPLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9