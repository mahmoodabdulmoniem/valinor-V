/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObjectStream } from './objectStream.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
/**
 * Create new instance of the stream from a provided text model.
 */
export function objectStreamFromTextModel(model, cancellationToken) {
    return new ObjectStream(modelToGenerator(model), cancellationToken);
}
/**
 * Create a generator out of a provided text model.
 */
function modelToGenerator(model) {
    return (function* () {
        const totalLines = model.getLineCount();
        let currentLine = 1;
        while (currentLine <= totalLines) {
            if (model.isDisposed()) {
                return undefined;
            }
            yield VSBuffer.fromString(model.getLineContent(currentLine));
            if (currentLine !== totalLines) {
                yield VSBuffer.fromString(model.getEOL());
            }
            currentLine++;
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtRnJvbVRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3V0aWxzL29iamVjdFN0cmVhbUZyb21UZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUd6RTs7R0FFRztBQUNILE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMsS0FBaUIsRUFDakIsaUJBQXFDO0lBRXJDLE9BQU8sSUFBSSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLEtBQWlCO0lBQzFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDaEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3hDLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztRQUVwQixPQUFPLFdBQVcsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNsQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUN4QixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsTUFBTSxRQUFRLENBQUMsVUFBVSxDQUN4QixLQUFLLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUNqQyxDQUFDO1lBQ0YsSUFBSSxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FDeEIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUNkLENBQUM7WUFDSCxDQUFDO1lBRUQsV0FBVyxFQUFFLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNOLENBQUMifQ==