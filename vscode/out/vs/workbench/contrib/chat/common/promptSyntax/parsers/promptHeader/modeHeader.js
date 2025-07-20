/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HeaderBase } from './headerBase.js';
import { PromptModelMetadata } from './metadata/model.js';
import { PromptToolsMetadata } from './metadata/tools.js';
/**
 * Header object for mode files.
 */
export class ModeHeader extends HeaderBase {
    handleToken(token) {
        // if the record might be a "tools" metadata
        // add it to the list of parsed metadata records
        if (PromptToolsMetadata.isToolsRecord(token)) {
            const metadata = new PromptToolsMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.tools = metadata;
            return true;
        }
        if (PromptModelMetadata.isModelRecord(token)) {
            const metadata = new PromptModelMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.model = metadata;
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZUhlYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21vZGVIZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBcUMsTUFBTSxpQkFBaUIsQ0FBQztBQUdoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQXNCMUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sVUFBVyxTQUFRLFVBQXlCO0lBQ3JDLFdBQVcsQ0FBQyxLQUF3QjtRQUN0RCw0Q0FBNEM7UUFDNUMsZ0RBQWdEO1FBQ2hELElBQUksbUJBQW1CLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksbUJBQW1CLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO1lBRTNCLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=