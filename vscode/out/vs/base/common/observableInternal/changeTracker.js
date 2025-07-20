/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from './commonFacade/deps.js';
/**
 * Subscribes to and records changes and the last value of the given observables.
 * Don't use the key "changes", as it is reserved for the changes array!
*/
export function recordChanges(obs) {
    return {
        createChangeSummary: (_previousChangeSummary) => {
            return {
                changes: [],
            };
        },
        handleChange(ctx, changeSummary) {
            for (const key in obs) {
                if (ctx.didChange(obs[key])) {
                    changeSummary.changes.push({ key, change: ctx.change });
                }
            }
            return true;
        },
        beforeUpdate(reader, changeSummary) {
            for (const key in obs) {
                if (key === 'changes') {
                    throw new BugIndicatingError('property name "changes" is reserved for change tracking');
                }
                changeSummary[key] = obs[key].read(reader);
            }
        }
    };
}
/**
 * Subscribes to and records changes and the last value of the given observables.
 * Don't use the key "changes", as it is reserved for the changes array!
*/
export function recordChangesLazy(getObs) {
    let obs = undefined;
    return {
        createChangeSummary: (_previousChangeSummary) => {
            return {
                changes: [],
            };
        },
        handleChange(ctx, changeSummary) {
            if (!obs) {
                obs = getObs();
            }
            for (const key in obs) {
                if (ctx.didChange(obs[key])) {
                    changeSummary.changes.push({ key, change: ctx.change });
                }
            }
            return true;
        },
        beforeUpdate(reader, changeSummary) {
            if (!obs) {
                obs = getObs();
            }
            for (const key in obs) {
                if (key === 'changes') {
                    throw new BugIndicatingError('property name "changes" is reserved for change tracking');
                }
                changeSummary[key] = obs[key].read(reader);
            }
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2NoYW5nZVRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFtQjVEOzs7RUFHRTtBQUNGLE1BQU0sVUFBVSxhQUFhLENBQTRELEdBQVM7SUFHakcsT0FBTztRQUNOLG1CQUFtQixFQUFFLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUMvQyxPQUFPO2dCQUNOLE9BQU8sRUFBRSxFQUFFO2FBQ0osQ0FBQztRQUNWLENBQUM7UUFDRCxZQUFZLENBQUMsR0FBRyxFQUFFLGFBQWE7WUFDOUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzVCLGFBQWEsQ0FBQyxPQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDbEUsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxZQUFZLENBQUMsTUFBTSxFQUFFLGFBQWE7WUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO2dCQUN6RixDQUFDO2dCQUNELGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUM7QUFFRDs7O0VBR0U7QUFDRixNQUFNLFVBQVUsaUJBQWlCLENBQTRELE1BQWtCO0lBRzlHLElBQUksR0FBRyxHQUFxQixTQUFTLENBQUM7SUFDdEMsT0FBTztRQUNOLG1CQUFtQixFQUFFLENBQUMsc0JBQXNCLEVBQUUsRUFBRTtZQUMvQyxPQUFPO2dCQUNOLE9BQU8sRUFBRSxFQUFFO2FBQ0osQ0FBQztRQUNWLENBQUM7UUFDRCxZQUFZLENBQUMsR0FBRyxFQUFFLGFBQWE7WUFDOUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQztZQUNoQixDQUFDO1lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQzVCLGFBQWEsQ0FBQyxPQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDbEUsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxZQUFZLENBQUMsTUFBTSxFQUFFLGFBQWE7WUFDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQztZQUNoQixDQUFDO1lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3ZCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO2dCQUN6RixDQUFDO2dCQUNELGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQztBQUNILENBQUMifQ==