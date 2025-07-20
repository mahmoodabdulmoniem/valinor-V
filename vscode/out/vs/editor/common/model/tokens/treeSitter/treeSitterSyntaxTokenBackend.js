/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../../base/common/event.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { LineTokens } from '../../../tokens/lineTokens.js';
import { AbstractSyntaxTokenBackend } from '../abstractSyntaxTokenBackend.js';
import { autorun, derived, ObservablePromise } from '../../../../../base/common/observable.js';
import { TreeSitterTree } from './treeSitterTree.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TreeSitterTokenizationImpl } from './treeSitterTokenizationImpl.js';
import { ITreeSitterLibraryService } from '../../../services/treeSitter/treeSitterLibraryService.js';
let TreeSitterSyntaxTokenBackend = class TreeSitterSyntaxTokenBackend extends AbstractSyntaxTokenBackend {
    constructor(_languageIdObs, languageIdCodec, textModel, visibleLineRanges, _treeSitterLibraryService, _instantiationService) {
        super(languageIdCodec, textModel);
        this._languageIdObs = _languageIdObs;
        this._treeSitterLibraryService = _treeSitterLibraryService;
        this._instantiationService = _instantiationService;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        const parserClassPromise = new ObservablePromise(this._treeSitterLibraryService.getParserClass());
        const parserClassObs = derived(this, reader => {
            const parser = parserClassPromise.promiseResult?.read(reader)?.getDataOrThrow();
            return parser;
        });
        this._tree = derived(this, reader => {
            const parserClass = parserClassObs.read(reader);
            if (!parserClass) {
                return undefined;
            }
            const currentLanguage = this._languageIdObs.read(reader);
            const treeSitterLang = this._treeSitterLibraryService.getLanguage(currentLanguage, reader);
            if (!treeSitterLang) {
                return undefined;
            }
            const parser = new parserClass();
            reader.store.add(toDisposable(() => {
                parser.delete();
            }));
            parser.setLanguage(treeSitterLang);
            const queries = this._treeSitterLibraryService.getInjectionQueries(currentLanguage, reader);
            if (queries === undefined) {
                return undefined;
            }
            return reader.store.add(this._instantiationService.createInstance(TreeSitterTree, currentLanguage, undefined, parser, parserClass, /*queries, */ this._textModel));
        });
        this._tokenizationImpl = derived(this, reader => {
            const treeModel = this._tree.read(reader);
            if (!treeModel) {
                return undefined;
            }
            const queries = this._treeSitterLibraryService.getHighlightingQueries(treeModel.languageId, reader);
            if (!queries) {
                return undefined;
            }
            return reader.store.add(this._instantiationService.createInstance(TreeSitterTokenizationImpl, treeModel, queries, this._languageIdCodec, visibleLineRanges));
        });
        this._register(autorun(reader => {
            const tokModel = this._tokenizationImpl.read(reader);
            if (!tokModel) {
                return;
            }
            reader.store.add(tokModel.onDidChangeTokens((e) => {
                this._onDidChangeTokens.fire(e.changes);
            }));
            reader.store.add(tokModel.onDidChangeBackgroundTokenization(e => {
                this._backgroundTokenizationState = 2 /* BackgroundTokenizationState.Completed */;
                this._onDidChangeBackgroundTokenizationState.fire();
            }));
        }));
    }
    get tree() {
        return this._tree;
    }
    get tokenizationImpl() {
        return this._tokenizationImpl;
    }
    getLineTokens(lineNumber) {
        const model = this._tokenizationImpl.get();
        if (!model) {
            const content = this._textModel.getLineContent(lineNumber);
            return LineTokens.createEmpty(content, this._languageIdCodec);
        }
        return model.getLineTokens(lineNumber);
    }
    todo_resetTokenization(fireTokenChangeEvent = true) {
        if (fireTokenChangeEvent) {
            this._onDidChangeTokens.fire({
                semanticTokensApplied: false,
                ranges: [
                    {
                        fromLineNumber: 1,
                        toLineNumber: this._textModel.getLineCount(),
                    },
                ],
            });
        }
    }
    handleDidChangeAttached() {
        // TODO @alexr00 implement for background tokenization
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.todo_resetTokenization(false);
        }
        else {
            const model = this._tokenizationImpl.get();
            model?.handleContentChanged(e);
        }
        const treeModel = this._tree.get();
        treeModel?.handleContentChange(e);
    }
    forceTokenization(lineNumber) {
        const model = this._tokenizationImpl.get();
        if (!model) {
            return;
        }
        if (!model.hasAccurateTokensForLine(lineNumber)) {
            model.tokenizeEncoded(lineNumber);
        }
    }
    hasAccurateTokensForLine(lineNumber) {
        const model = this._tokenizationImpl.get();
        if (!model) {
            return false;
        }
        return model.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        // TODO @alexr00 determine what makes it cheap to tokenize?
        return true;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        // TODO @alexr00 implement once we have custom parsing and don't just feed in the whole text model value
        return 0 /* StandardTokenType.Other */;
    }
    tokenizeLinesAt(lineNumber, lines) {
        const model = this._tokenizationImpl.get();
        if (!model) {
            return null;
        }
        return model.tokenizeLinesAt(lineNumber, lines);
    }
    get hasTokens() {
        const model = this._tokenizationImpl.get();
        if (!model) {
            return false;
        }
        return model.hasTokens();
    }
};
TreeSitterSyntaxTokenBackend = __decorate([
    __param(4, ITreeSitterLibraryService),
    __param(5, IInstantiationService)
], TreeSitterSyntaxTokenBackend);
export { TreeSitterSyntaxTokenBackend };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclN5bnRheFRva2VuQmFja2VuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlbnMvdHJlZVNpdHRlci90cmVlU2l0dGVyU3ludGF4VG9rZW5CYWNrZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFLdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTNELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRzlGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsMEJBQTBCO0lBUTNFLFlBQ2tCLGNBQW1DLEVBQ3BELGVBQWlDLEVBQ2pDLFNBQW9CLEVBQ3BCLGlCQUFvRCxFQUN6Qix5QkFBcUUsRUFDekUscUJBQTZEO1FBRXBGLEtBQUssQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFQakIsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1FBSVIsOEJBQXlCLEdBQXpCLHlC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