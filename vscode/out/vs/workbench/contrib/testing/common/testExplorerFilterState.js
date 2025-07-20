var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { MutableObservableValue } from './observableValue.js';
import { StoredValue } from './storedValue.js';
import { namespaceTestTag } from './testTypes.js';
export const ITestExplorerFilterState = createDecorator('testingFilterState');
const tagRe = /!?@([^ ,:]+)/g;
const trimExtraWhitespace = (str) => str.replace(/\s\s+/g, ' ').trim();
let TestExplorerFilterState = class TestExplorerFilterState extends Disposable {
    constructor(storageService) {
        super();
        this.focusEmitter = new Emitter();
        /**
         * Mapping of terms to whether they're included in the text.
         */
        this.termFilterState = {};
        /** @inheritdoc */
        this.globList = [];
        /** @inheritdoc */
        this.includeTags = new Set();
        /** @inheritdoc */
        this.excludeTags = new Set();
        /** @inheritdoc */
        this.text = this._register(new MutableObservableValue(''));
        this.reveal = observableValue('TestExplorerFilterState.reveal', undefined);
        this.onDidRequestInputFocus = this.focusEmitter.event;
        this.selectTestInExplorerEmitter = this._register(new Emitter());
        this.onDidSelectTestInExplorer = this.selectTestInExplorerEmitter.event;
        this.fuzzy = this._register(MutableObservableValue.stored(new StoredValue({
            key: 'testHistoryFuzzy',
            scope: 0 /* StorageScope.PROFILE */,
            target: 0 /* StorageTarget.USER */,
        }, storageService), false));
    }
    /** @inheritdoc */
    didSelectTestInExplorer(testId) {
        this.selectTestInExplorerEmitter.fire(testId);
    }
    /** @inheritdoc */
    focusInput() {
        this.focusEmitter.fire();
    }
    /** @inheritdoc */
    setText(text) {
        if (text === this.text.value) {
            return;
        }
        this.termFilterState = {};
        this.globList = [];
        this.includeTags.clear();
        this.excludeTags.clear();
        let globText = '';
        let lastIndex = 0;
        for (const match of text.matchAll(tagRe)) {
            let nextIndex = match.index + match[0].length;
            const tag = match[0];
            if (allTestFilterTerms.includes(tag)) {
                this.termFilterState[tag] = true;
            }
            // recognize and parse @ctrlId:tagId or quoted like @ctrlId:"tag \\"id"
            if (text[nextIndex] === ':') {
                nextIndex++;
                let delimiter = text[nextIndex];
                if (delimiter !== `"` && delimiter !== `'`) {
                    delimiter = ' ';
                }
                else {
                    nextIndex++;
                }
                let tagId = '';
                while (nextIndex < text.length && text[nextIndex] !== delimiter) {
                    if (text[nextIndex] === '\\') {
                        tagId += text[nextIndex + 1];
                        nextIndex += 2;
                    }
                    else {
                        tagId += text[nextIndex];
                        nextIndex++;
                    }
                }
                if (match[0].startsWith('!')) {
                    this.excludeTags.add(namespaceTestTag(match[1], tagId));
                }
                else {
                    this.includeTags.add(namespaceTestTag(match[1], tagId));
                }
                nextIndex++;
            }
            globText += text.slice(lastIndex, match.index);
            lastIndex = nextIndex;
        }
        globText += text.slice(lastIndex).trim();
        if (globText.length) {
            for (const filter of splitGlobAware(globText, ',').map(s => s.trim()).filter(s => !!s.length)) {
                if (filter.startsWith('!')) {
                    this.globList.push({ include: false, text: filter.slice(1).toLowerCase() });
                }
                else {
                    this.globList.push({ include: true, text: filter.toLowerCase() });
                }
            }
        }
        this.text.value = text; // purposely afterwards so everything is updated when the change event happen
    }
    /** @inheritdoc */
    isFilteringFor(term) {
        return !!this.termFilterState[term];
    }
    /** @inheritdoc */
    toggleFilteringFor(term, shouldFilter) {
        const text = this.text.value.trim();
        if (shouldFilter !== false && !this.termFilterState[term]) {
            this.setText(text ? `${text} ${term}` : term);
        }
        else if (shouldFilter !== true && this.termFilterState[term]) {
            this.setText(trimExtraWhitespace(text.replace(term, '')));
        }
    }
};
TestExplorerFilterState = __decorate([
    __param(0, IStorageService)
], TestExplorerFilterState);
export { TestExplorerFilterState };
export var TestFilterTerm;
(function (TestFilterTerm) {
    TestFilterTerm["Failed"] = "@failed";
    TestFilterTerm["Executed"] = "@executed";
    TestFilterTerm["CurrentDoc"] = "@doc";
    TestFilterTerm["OpenedFiles"] = "@openedFiles";
    TestFilterTerm["Hidden"] = "@hidden";
})(TestFilterTerm || (TestFilterTerm = {}));
const allTestFilterTerms = [
    "@failed" /* TestFilterTerm.Failed */,
    "@executed" /* TestFilterTerm.Executed */,
    "@doc" /* TestFilterTerm.CurrentDoc */,
    "@openedFiles" /* TestFilterTerm.OpenedFiles */,
    "@hidden" /* TestFilterTerm.Hidden */,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RFeHBsb3JlckZpbHRlclN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBdUIsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFvQixzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQStEbEQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUEyQixvQkFBb0IsQ0FBQyxDQUFDO0FBRXhHLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztBQUM5QixNQUFNLG1CQUFtQixHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUV4RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUE4QnRELFlB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