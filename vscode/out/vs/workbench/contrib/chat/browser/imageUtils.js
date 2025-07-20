/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
/**
 * Resizes an image provided as a UInt8Array string. Resizing is based on Open AI's algorithm for tokenzing images.
 * https://platform.openai.com/docs/guides/vision#calculating-costs
 * @param data - The UInt8Array string of the image to resize.
 * @returns A promise that resolves to the UInt8Array string of the resized image.
 */
export async function resizeImage(data, mimeType) {
    const isGif = mimeType === 'image/gif';
    if (typeof data === 'string') {
        data = convertStringToUInt8Array(data);
    }
    return new Promise((resolve, reject) => {
        const blob = new Blob([data], { type: mimeType });
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if ((width <= 768 || height <= 768) && !isGif) {
                resolve(data);
                return;
            }
            // Calculate the new dimensions while maintaining the aspect ratio
            if (width > 2048 || height > 2048) {
                const scaleFactor = 2048 / Math.max(width, height);
                width = Math.round(width * scaleFactor);
                height = Math.round(height * scaleFactor);
            }
            const scaleFactor = 768 / Math.min(width, height);
            width = Math.round(width * scaleFactor);
            height = Math.round(height * scaleFactor);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const reader = new FileReader();
                        reader.onload = () => {
                            resolve(new Uint8Array(reader.result));
                        };
                        reader.onerror = (error) => reject(error);
                        reader.readAsArrayBuffer(blob);
                    }
                    else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                }, 'image/png');
            }
            else {
                reject(new Error('Failed to get canvas context'));
            }
        };
        img.onerror = (error) => {
            URL.revokeObjectURL(url);
            reject(error);
        };
    });
}
export function convertStringToUInt8Array(data) {
    const base64Data = data.includes(',') ? data.split(',')[1] : data;
    if (isValidBase64(base64Data)) {
        return Uint8Array.from(atob(base64Data), char => char.charCodeAt(0));
    }
    return new TextEncoder().encode(data);
}
// Only used for URLs
export function convertUint8ArrayToString(data) {
    try {
        const decoder = new TextDecoder();
        const decodedString = decoder.decode(data);
        return decodedString;
    }
    catch {
        return '';
    }
}
function isValidBase64(str) {
    // checks if the string is a valid base64 string that is NOT encoded
    return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && (() => {
        try {
            atob(str);
            return true;
        }
        catch {
            return false;
        }
    })();
}
export async function createFileForMedia(fileService, imagesFolder, dataTransfer, mimeType) {
    const exists = await fileService.exists(imagesFolder);
    if (!exists) {
        await fileService.createFolder(imagesFolder);
    }
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `image-${Date.now()}.${ext}`;
    const fileUri = joinPath(imagesFolder, filename);
    const buffer = VSBuffer.wrap(dataTransfer);
    await fileService.writeFile(fileUri, buffer);
    return fileUri;
}
export async function cleanupOldImages(fileService, logService, imagesFolder) {
    const exists = await fileService.exists(imagesFolder);
    if (!exists) {
        return;
    }
    const duration = 7 * 24 * 60 * 60 * 1000; // 7 days
    const files = await fileService.resolve(imagesFolder);
    if (!files.children) {
        return;
    }
    await Promise.all(files.children.map(async (file) => {
        try {
            const timestamp = getTimestampFromFilename(file.name);
            if (timestamp && (Date.now() - timestamp > duration)) {
                await fileService.del(file.resource);
            }
        }
        catch (err) {
            logService.error('Failed to clean up old images', err);
        }
    }));
}
function getTimestampFromFilename(filename) {
    const match = filename.match(/image-(\d+)\./);
    if (match) {
        return parseInt(match[1], 10);
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1hZ2VVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2ltYWdlVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUtoRTs7Ozs7R0FLRztBQUVILE1BQU0sQ0FBQyxLQUFLLFVBQVUsV0FBVyxDQUFDLElBQXlCLEVBQUUsUUFBaUI7SUFDN0UsTUFBTSxLQUFLLEdBQUcsUUFBUSxLQUFLLFdBQVcsQ0FBQztJQUV2QyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQStCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7UUFDeEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUVkLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ2pCLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekIsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxH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