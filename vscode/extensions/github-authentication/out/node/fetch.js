"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetching = void 0;
let _fetch;
try {
    _fetch = require('electron').net.fetch;
}
catch {
    _fetch = fetch;
}
exports.fetching = _fetch;
//# sourceMappingURL=fetch.js.map