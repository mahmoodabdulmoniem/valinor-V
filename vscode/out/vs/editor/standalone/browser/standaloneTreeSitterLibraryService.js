/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StandaloneTreeSitterLibraryService {
    getParserClass() {
        throw new Error('getParserClass is not implemented in StandaloneTreeSitterLibraryService');
    }
    supportsLanguage(languageId, reader) {
        return false;
    }
    getLanguage(languageId, reader) {
        return undefined;
    }
    /**
     * Return value of null indicates that there are no injection queries for this language.
     * @param languageId
     * @param reader
     */
    getInjectionQueries(languageId, reader) {
        return null;
    }
    /**
     * Return value of null indicates that there are no highlights queries for this language.
     * @param languageId
     * @param reader
     */
    getHighlightingQueries(languageId, reader) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJMaWJyYXJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lVHJlZVNpdHRlckxpYnJhcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyxrQ0FBa0M7SUFHOUMsY0FBYztRQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMseUVBQXlFLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxNQUEyQjtRQUMvRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxXQUFXLENBQUMsVUFBa0IsRUFBRSxNQUEyQjtRQUMxRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0Q7Ozs7T0FJRztJQUNILG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsTUFBMkI7UUFDbEUsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0Q7Ozs7T0FJRztJQUNILHNCQUFzQixDQUFDLFVBQWtCLEVBQUUsTUFBMkI7UUFDckUsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QifQ==