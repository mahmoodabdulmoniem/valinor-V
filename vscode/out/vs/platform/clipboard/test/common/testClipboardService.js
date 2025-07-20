/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TestClipboardService {
    constructor() {
        this.text = undefined;
        this.findText = undefined;
        this.resources = undefined;
    }
    readImage() {
        throw new Error('Method not implemented.');
    }
    triggerPaste() {
        return Promise.resolve();
    }
    async writeText(text, type) {
        this.text = text;
    }
    async readText(type) {
        return this.text ?? '';
    }
    async readFindText() {
        return this.findText ?? '';
    }
    async writeFindText(text) {
        this.findText = text;
    }
    async writeResources(resources) {
        this.resources = resources;
    }
    async readResources() {
        return this.resources ?? [];
    }
    async hasResources() {
        return Array.isArray(this.resources) && this.resources.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENsaXBib2FyZFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2NsaXBib2FyZC90ZXN0L2NvbW1vbi90ZXN0Q2xpcGJvYXJkU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLE9BQU8sb0JBQW9CO0lBQWpDO1FBT1MsU0FBSSxHQUF1QixTQUFTLENBQUM7UUFjckMsYUFBUSxHQUF1QixTQUFTLENBQUM7UUFVekMsY0FBUyxHQUFzQixTQUFTLENBQUM7SUFhbEQsQ0FBQztJQTNDQSxTQUFTO1FBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFNRCxZQUFZO1FBQ1gsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBWSxFQUFFLElBQWE7UUFDMUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBYTtRQUMzQixPQUFPLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFJRCxLQUFLLENBQUMsWUFBWTtRQUNqQixPQUFPLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQVk7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUlELEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBZ0I7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDRCJ9