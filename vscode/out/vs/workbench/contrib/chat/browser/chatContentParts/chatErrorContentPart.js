/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ChatErrorLevel } from '../../common/chatService.js';
const $ = dom.$;
export class ChatErrorContentPart extends Disposable {
    constructor(kind, content, errorDetails, renderer) {
        super();
        this.errorDetails = errorDetails;
        this.domNode = this._register(new ChatErrorWidget(kind, content, renderer)).domNode;
    }
    hasSameContent(other) {
        return other.kind === this.errorDetails.kind;
    }
}
export class ChatErrorWidget extends Disposable {
    constructor(kind, content, renderer) {
        super();
        this.domNode = $('.chat-notification-widget');
        this.domNode.tabIndex = 0;
        let icon;
        let iconClass;
        switch (kind) {
            case ChatErrorLevel.Warning:
                icon = Codicon.warning;
                iconClass = '.chat-warning-codicon';
                break;
            case ChatErrorLevel.Error:
                icon = Codicon.error;
                iconClass = '.chat-error-codicon';
                break;
            case ChatErrorLevel.Info:
                icon = Codicon.info;
                iconClass = '.chat-info-codicon';
                break;
        }
        this.domNode.appendChild($(iconClass, undefined, renderIcon(icon)));
        const markdownContent = this._register(renderer.render(content));
        this.domNode.appendChild(markdownContent.element);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVycm9yQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRFcnJvckNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBSTdELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFaEIsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFHbkQsWUFDQyxJQUFvQixFQUNwQixPQUF3QixFQUNQLFlBQWtDLEVBQ25ELFFBQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFDO1FBSFMsaUJBQVksR0FBWixZQUFZLENBQXNCO1FBS25ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBMkI7UUFDekMsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO0lBQzlDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLFVBQVU7SUFHOUMsWUFDQyxJQUFvQixFQUNwQixPQUF3QixFQUN4QixRQUEwQjtRQUUxQixLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLElBQUksSUFBSSxDQUFDO1FBQ1QsSUFBSSxTQUFTLENBQUM7UUFDZCxRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxjQUFjLENBQUMsT0FBTztnQkFDMUIsSUFBSSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7Z0JBQ3ZCLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQztnQkFDcEMsTUFBTTtZQUNQLEtBQUssY0FBYyxDQUFDLEtBQUs7Z0JBQ3hCLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUNyQixTQUFTLEdBQUcscUJBQXFCLENBQUM7Z0JBQ2xDLE1BQU07WUFDUCxLQUFLLGNBQWMsQ0FBQyxJQUFJO2dCQUN2QixJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDcEIsU0FBUyxHQUFHLG9CQUFvQixDQUFDO2dCQUNqQyxNQUFNO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDRCJ9