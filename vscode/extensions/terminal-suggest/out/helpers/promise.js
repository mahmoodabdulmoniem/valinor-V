"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutPromise = createTimeoutPromise;
function createTimeoutPromise(timeout, defaultValue) {
    return new Promise(resolve => setTimeout(() => resolve(defaultValue), timeout));
}
//# sourceMappingURL=promise.js.map