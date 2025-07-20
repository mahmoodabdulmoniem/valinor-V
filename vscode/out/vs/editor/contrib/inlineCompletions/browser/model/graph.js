/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class DirectedGraph {
    constructor() {
        this._nodes = new Set();
        this._outgoingEdges = new Map();
    }
    static from(nodes, getOutgoing) {
        const graph = new DirectedGraph();
        for (const node of nodes) {
            graph._nodes.add(node);
        }
        for (const node of nodes) {
            const outgoing = getOutgoing(node);
            if (outgoing.length > 0) {
                const outgoingSet = new Set();
                for (const target of outgoing) {
                    outgoingSet.add(target);
                }
                graph._outgoingEdges.set(node, outgoingSet);
            }
        }
        return graph;
    }
    /**
     * After this, the graph is guaranteed to have no cycles.
     */
    removeCycles() {
        const foundCycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const toRemove = [];
        const dfs = (node) => {
            visited.add(node);
            recursionStack.add(node);
            const outgoing = this._outgoingEdges.get(node);
            if (outgoing) {
                for (const neighbor of outgoing) {
                    if (!visited.has(neighbor)) {
                        dfs(neighbor);
                    }
                    else if (recursionStack.has(neighbor)) {
                        // Found a cycle
                        foundCycles.push(neighbor);
                        toRemove.push({ from: node, to: neighbor });
                    }
                }
            }
            recursionStack.delete(node);
        };
        // Run DFS from all unvisited nodes
        for (const node of this._nodes) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }
        // Remove edges that cause cycles
        for (const { from, to } of toRemove) {
            const outgoingSet = this._outgoingEdges.get(from);
            if (outgoingSet) {
                outgoingSet.delete(to);
            }
        }
        return { foundCycles };
    }
    getOutgoing(node) {
        const outgoing = this._outgoingEdges.get(node);
        return outgoing ? Array.from(outgoing) : [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvZ3JhcGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFDa0IsV0FBTSxHQUFHLElBQUksR0FBRyxFQUFLLENBQUM7UUFDdEIsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO0lBMEV4RCxDQUFDO0lBeEVPLE1BQU0sQ0FBQyxJQUFJLENBQUksS0FBbUIsRUFBRSxXQUFzQztRQUNoRixNQUFNLEtBQUssR0FBRyxJQUFJLGFBQWEsRUFBSyxDQUFDO1FBRXJDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUVELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQztnQkFDakMsS0FBSyxNQUFNLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekIsQ0FBQztnQkFDRCxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDN0MsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVk7UUFDWCxNQUFNLFdBQVcsR0FBUSxFQUFFLENBQUM7UUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUssQ0FBQztRQUM3QixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBSyxDQUFDO1FBQ3BDLE1BQU0sUUFBUSxHQUE4QixFQUFFLENBQUM7UUFFL0MsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFPLEVBQVEsRUFBRTtZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0MsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxLQUFLLE1BQU0sUUFBUSxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO3dCQUM1QixHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ2YsQ0FBQzt5QkFBTSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFDekMsZ0JBQWdCO3dCQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztvQkFDN0MsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDO1FBRUYsbUNBQW1DO1FBQ25DLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNYLENBQUM7UUFDRixDQUFDO1FBRUQsaUNBQWlDO1FBQ2pDLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRCxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBTztRQUNsQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzdDLENBQUM7Q0FDRCJ9