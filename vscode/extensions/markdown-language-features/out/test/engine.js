"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewMarkdownEngine = createNewMarkdownEngine;
const vscode = __importStar(require("vscode"));
const markdownEngine_1 = require("../markdownEngine");
const markdownExtensions_1 = require("../markdownExtensions");
const slugify_1 = require("../slugify");
const nulLogging_1 = require("./nulLogging");
const emptyContributions = new class {
    constructor() {
        this.extensionUri = vscode.Uri.file('/');
        this.contributions = markdownExtensions_1.MarkdownContributions.Empty;
        this._onContributionsChanged = new vscode.EventEmitter();
        this.onContributionsChanged = this._onContributionsChanged.event;
    }
    dispose() {
        this._onContributionsChanged.dispose();
    }
};
function createNewMarkdownEngine() {
    return new markdownEngine_1.MarkdownItEngine(emptyContributions, slugify_1.githubSlugifier, nulLogging_1.nulLogger);
}
//# sourceMappingURL=engine.js.map