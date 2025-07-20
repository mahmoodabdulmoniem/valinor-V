/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from "assert";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../../base/test/common/utils.js";
import { DirectedGraph } from "../../browser/model/graph.js";
suite("DirectedGraph", () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test("from - creates empty graph", () => {
        const graph = DirectedGraph.from([], () => []);
        assert.deepStrictEqual(graph.getOutgoing("a"), []);
    });
    test("from - creates graph with single node", () => {
        const graph = DirectedGraph.from(["a"], () => []);
        assert.deepStrictEqual(graph.getOutgoing("a"), []);
    });
    test("from - creates graph with nodes and edges", () => {
        const nodes = ["a", "b", "c"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b", "c"];
                case "b":
                    return ["c"];
                case "c":
                    return [];
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        assert.deepStrictEqual([...graph.getOutgoing("a")].sort(), ["b", "c"]);
        assert.deepStrictEqual(graph.getOutgoing("b"), ["c"]);
        assert.deepStrictEqual(graph.getOutgoing("c"), []);
    });
    test("from - handles duplicate edges", () => {
        const nodes = ["a", "b"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b", "b"]; // Duplicate edge
                case "b":
                    return [];
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        assert.deepStrictEqual(graph.getOutgoing("a"), ["b"]);
        assert.deepStrictEqual(graph.getOutgoing("b"), []);
    });
    test("removeCycles - no cycles", () => {
        const nodes = ["a", "b", "c"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b"];
                case "b":
                    return ["c"];
                case "c":
                    return [];
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        const result = graph.removeCycles();
        assert.deepStrictEqual(result.foundCycles, []);
        assert.deepStrictEqual(graph.getOutgoing("a"), ["b"]);
        assert.deepStrictEqual(graph.getOutgoing("b"), ["c"]);
        assert.deepStrictEqual(graph.getOutgoing("c"), []);
    });
    test("removeCycles - simple cycle", () => {
        const nodes = ["a", "b"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b"];
                case "b":
                    return ["a"]; // Creates cycle
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        const result = graph.removeCycles();
        assert.strictEqual(result.foundCycles.length, 1);
        assert.ok(result.foundCycles.includes("a") || result.foundCycles.includes("b"));
        // After removing cycles, one of the edges should be removed
        const aOutgoing = graph.getOutgoing("a");
        const bOutgoing = graph.getOutgoing("b");
        assert.ok((aOutgoing.length === 0 && bOutgoing.length === 1) ||
            (aOutgoing.length === 1 && bOutgoing.length === 0));
    });
    test("removeCycles - self loop", () => {
        const nodes = ["a"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["a"]; // Self loop
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        const result = graph.removeCycles();
        assert.deepStrictEqual(result.foundCycles, ["a"]);
        assert.deepStrictEqual(graph.getOutgoing("a"), []);
    });
    test("removeCycles - complex cycle", () => {
        const nodes = ["a", "b", "c", "d"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b"];
                case "b":
                    return ["c"];
                case "c":
                    return ["d", "a"]; // Creates cycle back to 'a'
                case "d":
                    return [];
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        const result = graph.removeCycles();
        assert.ok(result.foundCycles.length >= 1);
        // After removing cycles, there should be no path back to 'a' from 'c'
        const cOutgoing = graph.getOutgoing("c");
        assert.ok(!cOutgoing.includes("a"));
    });
    test("removeCycles - multiple disconnected cycles", () => {
        const nodes = ["a", "b", "c", "d"];
        const getOutgoing = (node) => {
            switch (node) {
                case "a":
                    return ["b"];
                case "b":
                    return ["a"]; // Cycle 1: a <-> b
                case "c":
                    return ["d"];
                case "d":
                    return ["c"]; // Cycle 2: c <-> d
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        const result = graph.removeCycles();
        assert.ok(result.foundCycles.length >= 2);
        // After removing cycles, each pair should have only one direction
        const aOutgoing = graph.getOutgoing("a");
        const bOutgoing = graph.getOutgoing("b");
        const cOutgoing = graph.getOutgoing("c");
        const dOutgoing = graph.getOutgoing("d");
        assert.ok((aOutgoing.length === 0 && bOutgoing.length === 1) ||
            (aOutgoing.length === 1 && bOutgoing.length === 0));
        assert.ok((cOutgoing.length === 0 && dOutgoing.length === 1) ||
            (cOutgoing.length === 1 && dOutgoing.length === 0));
    });
    test("getOutgoing - non-existent node", () => {
        const graph = DirectedGraph.from(["a"], () => []);
        assert.deepStrictEqual(graph.getOutgoing("b"), []);
    });
    test("with number nodes", () => {
        const nodes = [1, 2, 3];
        const getOutgoing = (node) => {
            switch (node) {
                case 1:
                    return [2, 3];
                case 2:
                    return [3];
                case 3:
                    return [];
                default:
                    return [];
            }
        };
        const graph = DirectedGraph.from(nodes, getOutgoing);
        assert.deepStrictEqual([...graph.getOutgoing(1)].sort(), [2, 3]);
        assert.deepStrictEqual(graph.getOutgoing(2), [3]);
        assert.deepStrictEqual(graph.getOutgoing(3), []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2dyYXBoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU3RCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLEtBQUss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Q0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUNsRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLFdBQVcsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO1lBQ3BDLFFBQVEsSUFBSSxFQUFFLENBQUM7Z0JBQ2QsS0FBSyxDQUFDO29CQUNMLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2YsS0FBSyxDQUFDO29CQUNMLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDWixLQUFLLENBQUM7b0JBQ0wsT0FBTyxFQUFFLENBQUM7Z0JBQ1g7b0JBQ0MsT0FBTyxFQUFFLENBQUM7WUFDWixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9