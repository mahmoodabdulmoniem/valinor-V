/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createSingleCallFunction } from '../../../../base/common/functional.js';
export class CustomEditorModelManager {
    constructor() {
        this._references = new Map();
    }
    async getAllModels(resource) {
        const keyStart = `${resource.toString()}@@@`;
        const models = [];
        for (const [key, entry] of this._references) {
            if (key.startsWith(keyStart) && entry.model) {
                models.push(await entry.model);
            }
        }
        return models;
    }
    async get(resource, viewType) {
        const key = this.key(resource, viewType);
        const entry = this._references.get(key);
        return entry?.model;
    }
    tryRetain(resource, viewType) {
        const key = this.key(resource, viewType);
        const entry = this._references.get(key);
        if (!entry) {
            return undefined;
        }
        entry.counter++;
        return entry.model.then(model => {
            return {
                object: model,
                dispose: createSingleCallFunction(() => {
                    if (--entry.counter <= 0) {
                        entry.model.then(x => x.dispose());
                        this._references.delete(key);
                    }
                }),
            };
        });
    }
    add(resource, viewType, model) {
        const key = this.key(resource, viewType);
        const existing = this._references.get(key);
        if (existing) {
            throw new Error('Model already exists');
        }
        this._references.set(key, { viewType, model, counter: 0 });
        return this.tryRetain(resource, viewType);
    }
    disposeAllModelsForView(viewType) {
        for (const [key, value] of this._references) {
            if (value.viewType === viewType) {
                value.model.then(x => x.dispose());
                this._references.delete(key);
            }
        }
    }
    key(resource, viewType) {
        return `${resource.toString()}@@@${viewType}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yTW9kZWxNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvY29tbW9uL2N1c3RvbUVkaXRvck1vZGVsTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUtqRixNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBRWtCLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBSWxDLENBQUM7SUFnRU4sQ0FBQztJQTlETyxLQUFLLENBQUMsWUFBWSxDQUFDLFFBQWE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQztRQUM3QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDbEIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM3QyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBQ00sS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFhLEVBQUUsUUFBZ0I7UUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FB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