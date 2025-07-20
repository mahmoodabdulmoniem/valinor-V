/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from "assert";
import * as sinon from "sinon";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../../base/test/common/utils.js";
import { TestStorageService } from "../../../../test/common/workbenchTestServices.js";
import { McpSamplingLog } from "../../common/mcpSamplingLog.js";
suite("MCP - Sampling Log", () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const fakeServer = {
        definition: { id: "testServer" },
        readDefinitions: () => ({
            get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
        }),
    };
    let log;
    let storage;
    let clock;
    setup(() => {
        storage = ds.add(new TestStorageService());
        log = ds.add(new McpSamplingLog(storage));
        clock = sinon.useFakeTimers();
        clock.setSystemTime(new Date("2023-10-01T00:00:00Z").getTime());
    });
    teardown(() => {
        clock.restore();
    });
    test("logs a single request", async () => {
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "test request" } }], "test response here", "foobar9000");
        // storage.testEmitWillSaveState(WillSaveStateReason.NONE);
        await storage.flush();
        assert.deepStrictEqual(storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */), [
            [
                "testServer",
                {
                    head: 19631,
                    bins: [1, 0, 0, 0, 0, 0, 0],
                    lastReqs: [
                        {
                            request: [{ role: "user", content: { type: "text", text: "test request" } }],
                            response: "test response here",
                            at: 1696118400000,
                            model: "foobar9000",
                        },
                    ],
                },
            ],
        ]);
    });
    test("logs multiple requests on the same day", async () => {
        // First request
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "first request" } }], "first response", "foobar9000");
        // Advance time by a few hours but stay on the same day
        clock.tick(5 * 60 * 60 * 1000); // 5 hours
        // Second request
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "second request" } }], "second response", "foobar9000");
        await storage.flush();
        const data = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bin for the current day has 2 requests
        assert.strictEqual(data.bins[0], 2);
        // Verify both requests are in the lastReqs array, with the most recent first
        assert.strictEqual(data.lastReqs.length, 2);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, "second request");
        assert.strictEqual(data.lastReqs[1].request[0].content.text, "first request");
    });
    test("shifts bins when adding requests on different days", async () => {
        // First request on day 1
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "day 1 request" } }], "day 1 response", "foobar9000");
        // Advance time to the next day
        clock.tick(24 * 60 * 60 * 1000);
        // Second request on day 2
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "day 2 request" } }], "day 2 response", "foobar9000");
        await storage.flush();
        const data = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins: day 2 should have 1 request, day 1 should have 1 request
        assert.strictEqual(data.bins[0], 1); // day 2
        assert.strictEqual(data.bins[1], 1); // day 1
        // Advance time by 5 more days
        clock.tick(5 * 24 * 60 * 60 * 1000);
        // Request on day 7
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "day 7 request" } }], "day 7 response", "foobar9000");
        await storage.flush();
        const updatedData = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify the bins have shifted correctly
        assert.strictEqual(updatedData.bins[0], 1); // day 7
        assert.strictEqual(updatedData.bins[5], 1); // day 2
        assert.strictEqual(updatedData.bins[6], 1); // day 1
    });
    test("limits the number of stored requests", async () => {
        // Add more than the maximum number of requests (Constants.SamplingLastNMessage = 30)
        for (let i = 0; i < 35; i++) {
            log.add(fakeServer, [{ role: "user", content: { type: "text", text: `request ${i}` } }], `response ${i}`, "foobar9000");
        }
        await storage.flush();
        const data = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify only the last 30 requests are kept
        assert.strictEqual(data.lastReqs.length, 30);
        assert.strictEqual(data.lastReqs[0].request[0].content.text, "request 34");
        assert.strictEqual(data.lastReqs[29].request[0].content.text, "request 5");
    });
    test("handles different content types", async () => {
        // Add a request with text content
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "text request" } }], "text response", "foobar9000");
        // Add a request with image content
        log.add(fakeServer, [{
                role: "user",
                content: {
                    type: "image",
                    data: "base64data",
                    mimeType: "image/png"
                }
            }], "image response", "foobar9000");
        // Add a request with mixed content
        log.add(fakeServer, [
            { role: "user", content: { type: "text", text: "text and image" } },
            {
                role: "assistant",
                content: {
                    type: "image",
                    data: "base64data",
                    mimeType: "image/jpeg"
                }
            }
        ], "mixed response", "foobar9000");
        await storage.flush();
        const data = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */)[0][1];
        // Verify all requests are stored correctly
        assert.strictEqual(data.lastReqs.length, 3);
        assert.strictEqual(data.lastReqs[0].request.length, 2); // Mixed content request has 2 messages
        assert.strictEqual(data.lastReqs[1].request[0].content.type, "image");
        assert.strictEqual(data.lastReqs[2].request[0].content.type, "text");
    });
    test("handles multiple servers", async () => {
        const fakeServer2 = {
            definition: { id: "testServer2" },
            readDefinitions: () => ({
                get: () => ({ collection: { scope: -1 /* StorageScope.APPLICATION */ } }),
            }),
        };
        log.add(fakeServer, [{ role: "user", content: { type: "text", text: "server1 request" } }], "server1 response", "foobar9000");
        log.add(fakeServer2, [{ role: "user", content: { type: "text", text: "server2 request" } }], "server2 response", "foobar9000");
        await storage.flush();
        const storageData = storage.getObject("mcp.sampling.logs", -1 /* StorageScope.APPLICATION */);
        // Verify both servers have their data stored
        assert.strictEqual(storageData.length, 2);
        assert.strictEqual(storageData[0][0], "testServer");
        assert.strictEqual(storageData[1][0], "testServer2");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdMb2cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFNhbXBsaW5nTG9nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR2hFLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUNyRCxNQUFNLFVBQVUsR0FBZTtRQUM5QixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFO1FBQ2hDLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsS0FBSyxtQ0FBMEIsRUFBRSxFQUFFLENBQUM7U0FDaEUsQ0FBQztLQUNLLENBQUM7SUFFVCxJQUFJLEdBQW1CLENBQUM7SUFDeEIsSUFBSSxPQUEyQixDQUFDO0lBQ2hDLElBQUksS0FBNEIsQ0FBQztJQUVqQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFDM0MsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFH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