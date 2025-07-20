/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../base/common/assert.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { TestId } from './testId.js';
export const ITestService = createDecorator('testService');
export const testCollectionIsEmpty = (collection) => !Iterable.some(collection.rootItems, r => r.children.size > 0);
export const getContextForTestItem = (collection, id) => {
    if (typeof id === 'string') {
        id = TestId.fromString(id);
    }
    if (id.isRoot) {
        return { controller: id.toString() };
    }
    const context = { $mid: 16 /* MarshalledId.TestItemContext */, tests: [] };
    for (const i of id.idsFromRoot()) {
        if (!i.isRoot) {
            const test = collection.getNodeById(i.toString());
            if (test) {
                context.tests.push(test);
            }
        }
    }
    return context;
};
/**
 * Ensures the test with the given ID exists in the collection, if possible.
 * If cancellation is requested, or the test cannot be found, it will return
 * undefined.
 */
export const expandAndGetTestById = async (collection, id, ct = CancellationToken.None) => {
    const idPath = [...TestId.fromString(id).idsFromRoot()];
    let expandToLevel = 0;
    for (let i = idPath.length - 1; !ct.isCancellationRequested && i >= expandToLevel;) {
        const id = idPath[i].toString();
        const existing = collection.getNodeById(id);
        if (!existing) {
            i--;
            continue;
        }
        if (i === idPath.length - 1) {
            return existing;
        }
        // expand children only if it looks like it's necessary
        if (!existing.children.has(idPath[i + 1].toString())) {
            await collection.expand(id, 0);
        }
        expandToLevel = i + 1; // avoid an infinite loop if the test does not exist
        i = idPath.length - 1;
    }
    return undefined;
};
/**
 * Waits for the test to no longer be in the "busy" state.
 */
const waitForTestToBeIdle = (testService, test) => {
    if (!test.item.busy) {
        return;
    }
    return new Promise(resolve => {
        const l = testService.onDidProcessDiff(() => {
            if (testService.collection.getNodeById(test.item.extId)?.item.busy !== true) {
                resolve(); // removed, or no longer busy
                l.dispose();
            }
        });
    });
};
/**
 * Iterator that expands to and iterates through tests in the file. Iterates
 * in strictly descending order.
 */
export const testsInFile = async function* (testService, ident, uri, waitForIdle = true, descendInFile = true) {
    const queue = new LinkedList();
    const existing = [...testService.collection.getNodeByUrl(uri)];
    queue.push(existing.length ? existing.map(e => e.item.extId) : testService.collection.rootIds);
    let n = 0;
    while (queue.size > 0) {
        for (const id of queue.pop()) {
            n++;
            const test = testService.collection.getNodeById(id);
            if (!test) {
                continue; // possible because we expand async and things could delete
            }
            if (!test.item.uri) {
                queue.push(test.children);
                continue;
            }
            if (ident.extUri.isEqual(uri, test.item.uri)) {
                yield test;
                if (!descendInFile) {
                    continue;
                }
            }
            if (ident.extUri.isEqualOrParent(uri, test.item.uri)) {
                if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                    await testService.collection.expand(test.item.extId, 1);
                }
                if (waitForIdle) {
                    await waitForTestToBeIdle(testService, test);
                }
                if (test.children.size) {
                    queue.push(test.children);
                }
            }
        }
    }
};
/**
 * Iterator that iterates to the top-level children of tests under the given
 * the URI.
 */
export const testsUnderUri = async function* (testService, ident, uri, waitForIdle = true) {
    const queue = [testService.collection.rootIds];
    while (queue.length) {
        for (const testId of queue.pop()) {
            const test = testService.collection.getNodeById(testId);
            // Expand tests with URIs that are parent of the item, add tests
            // that are within the URI. Don't add their children, since those
            // tests already encompass their children.
            if (!test) {
                // no-op
            }
            else if (test.item.uri && ident.extUri.isEqualOrParent(test.item.uri, uri)) {
                yield test;
            }
            else if (!test.item.uri || ident.extUri.isEqualOrParent(uri, test.item.uri)) {
                if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                    await testService.collection.expand(test.item.extId, 1);
                }
                if (waitForIdle) {
                    await waitForTestToBeIdle(testService, test);
                }
                queue.push(test.children.values());
            }
        }
    }
};
/**
 * Simplifies the array of tests by preferring test item parents if all of
 * their children are included.
 */
export const simplifyTestsToExecute = (collection, tests) => {
    if (tests.length < 2) {
        return tests;
    }
    const tree = new WellDefinedPrefixTree();
    for (const test of tests) {
        tree.insert(TestId.fromString(test.item.extId).path, test);
    }
    const out = [];
    // Returns the node if it and any children should be included. Otherwise
    // pushes into the `out` any individual children that should be included.
    const process = (currentId, node) => {
        // directly included, don't try to over-specify, and children should be ignored
        if (node.value) {
            return node.value;
        }
        assert(!!node.children, 'expect to have children');
        const thisChildren = [];
        for (const [part, child] of node.children) {
            currentId.push(part);
            const c = process(currentId, child);
            if (c) {
                thisChildren.push(c);
            }
            currentId.pop();
        }
        if (!thisChildren.length) {
            return;
        }
        // If there are multiple children and we have all of them, then tell the
        // parent this node should be included. Otherwise include children individually.
        const id = new TestId(currentId);
        const test = collection.getNodeById(id.toString());
        if (test?.children.size === thisChildren.length) {
            return test;
        }
        out.push(...thisChildren);
        return;
    };
    for (const [id, node] of tree.entries) {
        const n = process([id], node);
        if (n) {
            out.push(n);
        }
    }
    return out;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR25FLE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUkvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUlyQyxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFlLGFBQWEsQ0FBQyxDQUFDO0FBc0V6RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFVBQXFDLEVBQUUsRUFBRSxDQUM5RSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRWhFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsVUFBcUMsRUFBRSxFQUFtQixFQUFFLEVBQUU7SUFDbkcsSUFBSSxPQUFPLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM1QixFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMs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