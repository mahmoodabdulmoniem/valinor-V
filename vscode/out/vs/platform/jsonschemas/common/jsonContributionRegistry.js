/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { getCompressedContent } from '../../../base/common/jsonSchema.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../registry/common/platform.js';
export const Extensions = {
    JSONContribution: 'base.contributions.json'
};
function normalizeId(id) {
    if (id.length > 0 && id.charAt(id.length - 1) === '#') {
        return id.substring(0, id.length - 1);
    }
    return id;
}
class JSONContributionRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this.schemasById = {};
        this.schemaAssociations = {};
        this._onDidChangeSchema = this._register(new Emitter());
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this._onDidChangeSchemaAssociations = this._register(new Emitter());
        this.onDidChangeSchemaAssociations = this._onDidChangeSchemaAssociations.event;
    }
    registerSchema(uri, unresolvedSchemaContent, store) {
        const normalizedUri = normalizeId(uri);
        this.schemasById[normalizedUri] = unresolvedSchemaContent;
        this._onDidChangeSchema.fire(uri);
        if (store) {
            store.add(toDisposable(() => {
                delete this.schemasById[normalizedUri];
                this._onDidChangeSchema.fire(uri);
            }));
        }
    }
    registerSchemaAssociation(uri, glob) {
        const normalizedUri = normalizeId(uri);
        if (!this.schemaAssociations[normalizedUri]) {
            this.schemaAssociations[normalizedUri] = [];
        }
        if (!this.schemaAssociations[normalizedUri].includes(glob)) {
            this.schemaAssociations[normalizedUri].push(glob);
            this._onDidChangeSchemaAssociations.fire();
        }
        return toDisposable(() => {
            const associations = this.schemaAssociations[normalizedUri];
            if (associations) {
                const index = associations.indexOf(glob);
                if (index !== -1) {
                    associations.splice(index, 1);
                    if (associations.length === 0) {
                        delete this.schemaAssociations[normalizedUri];
                    }
                    this._onDidChangeSchemaAssociations.fire();
                }
            }
        });
    }
    notifySchemaChanged(uri) {
        this._onDidChangeSchema.fire(uri);
    }
    getSchemaContributions() {
        return {
            schemas: this.schemasById,
        };
    }
    getSchemaContent(uri) {
        const schema = this.schemasById[uri];
        return schema ? getCompressedContent(schema) : undefined;
    }
    hasSchemaContent(uri) {
        return !!this.schemasById[uri];
    }
    getSchemaAssociations() {
        return this.schemaAssociations;
    }
}
const jsonContributionRegistry = new JSONContributionRegistry();
platform.Registry.add(Extensions.JSONContribution, jsonContributionRegistry);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkNvbnRyaWJ1dGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9qc29uc2NoZW1hcy9jb21tb24vanNvbkNvbnRyaWJ1dGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsb0JBQW9CLEVBQWUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsVUFBVSxFQUFnQyxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRyxPQUFPLEtBQUssUUFBUSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixnQkFBZ0IsRUFBRSx5QkFBeUI7Q0FDM0MsQ0FBQztBQThDRixTQUFTLFdBQVcsQ0FBQyxFQUFVO0lBQzlCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsT0FBTyxFQUFFLENBQUM7QUFDWCxDQUFDO0FBSUQsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBQWpEOztRQUVrQixnQkFBVyxHQUFrQyxFQUFFLENBQUM7UUFDaEQsdUJBQWtCLEdBQWdDLEVBQUUsQ0FBQztRQUVyRCx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUNuRSxz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