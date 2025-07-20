/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from "assert";
import { DisposableStore } from "../../../../base/common/lifecycle.js";
import { derivedHandleChanges } from "../../../../base/common/observable.js";
import { ensureNoDisposablesAreLeakedInTestSuite } from "../../../../base/test/common/utils.js";
import { observableCodeEditor } from "../../../browser/observableCodeEditor.js";
import { Position } from "../../../common/core/position.js";
import { Range } from "../../../common/core/range.js";
import { withTestCodeEditor } from "../testCodeEditor.js";
suite("CodeEditorWidget", () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function withTestFixture(cb) {
        withEditorSetupTestFixture(undefined, cb);
    }
    function withEditorSetupTestFixture(preSetupCallback, cb) {
        withTestCodeEditor("hello world", {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            preSetupCallback?.(editor, disposables);
            const obsEditor = observableCodeEditor(editor);
            const log = new Log();
            const derived = derivedHandleChanges({
                changeTracker: {
                    createChangeSummary: () => undefined,
                    handleChange: (context) => {
                        const obsName = observableName(context.changedObservable, obsEditor);
                        log.log(`handle change: ${obsName} ${formatChange(context.change)}`);
                        return true;
                    },
                },
            }, (reader) => {
                const versionId = obsEditor.versionId.read(reader);
                const selection = obsEditor.selections.read(reader)?.map((s) => s.toString()).join(", ");
                obsEditor.onDidType.read(reader);
                const str = `running derived: selection: ${selection}, value: ${versionId}`;
                log.log(str);
                return str;
            });
            derived.recomputeInitiallyAndOnChange(disposables);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "running derived: selection: [1,1 -> 1,1], value: 1",
            ]);
            cb({ editor, viewModel, log, derived });
            disposables.dispose();
        });
    }
    test("setPosition", () => withTestFixture(({ editor, log }) => {
        editor.setPosition(new Position(1, 2));
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "handle change: editor.selections {\"selection\":\"[1,2 -> 1,2]\",\"modelVersionId\":1,\"oldSelections\":[\"[1,1 -> 1,1]\"],\"oldModelVersionId\":1,\"source\":\"api\",\"reason\":0}",
            "running derived: selection: [1,2 -> 1,2], value: 1"
        ]));
    }));
    test("keyboard.type", () => withTestFixture(({ editor, log }) => {
        editor.trigger("keyboard", "type", { text: "abc" });
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "handle change: editor.onDidType \"abc\"",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,1 -> 1,1]\",\"rangeLength\":0,\"text\":\"a\",\"rangeOffset\":0}],\"eol\":\"\\n\",\"versionId\":2,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,2 -> 1,2]\",\"rangeLength\":0,\"text\":\"b\",\"rangeOffset\":1}],\"eol\":\"\\n\",\"versionId\":3,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,3 -> 1,3]\",\"rangeLength\":0,\"text\":\"c\",\"rangeOffset\":2}],\"eol\":\"\\n\",\"versionId\":4,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.selections {\"selection\":\"[1,4 -> 1,4]\",\"modelVersionId\":4,\"oldSelections\":[\"[1,1 -> 1,1]\"],\"oldModelVersionId\":1,\"source\":\"keyboard\",\"reason\":0}",
            "running derived: selection: [1,4 -> 1,4], value: 4"
        ]));
    }));
    test("keyboard.type and set position", () => withTestFixture(({ editor, log }) => {
        editor.trigger("keyboard", "type", { text: "abc" });
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "handle change: editor.onDidType \"abc\"",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,1 -> 1,1]\",\"rangeLength\":0,\"text\":\"a\",\"rangeOffset\":0}],\"eol\":\"\\n\",\"versionId\":2,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,2 -> 1,2]\",\"rangeLength\":0,\"text\":\"b\",\"rangeOffset\":1}],\"eol\":\"\\n\",\"versionId\":3,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,3 -> 1,3]\",\"rangeLength\":0,\"text\":\"c\",\"rangeOffset\":2}],\"eol\":\"\\n\",\"versionId\":4,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
            "handle change: editor.selections {\"selection\":\"[1,4 -> 1,4]\",\"modelVersionId\":4,\"oldSelections\":[\"[1,1 -> 1,1]\"],\"oldModelVersionId\":1,\"source\":\"keyboard\",\"reason\":0}",
            "running derived: selection: [1,4 -> 1,4], value: 4"
        ]));
        editor.setPosition(new Position(1, 5), "test");
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "handle change: editor.selections {\"selection\":\"[1,5 -> 1,5]\",\"modelVersionId\":4,\"oldSelections\":[\"[1,4 -> 1,4]\"],\"oldModelVersionId\":4,\"source\":\"test\",\"reason\":0}",
            "running derived: selection: [1,5 -> 1,5], value: 4"
        ]));
    }));
    test("listener interaction (unforced)", () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log(">>> before get");
                derived.get();
                log.log("<<< after get");
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger("keyboard", "type", { text: "a" });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                ">>> before get",
                "<<< after get",
                "handle change: editor.onDidType \"a\"",
                "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,1 -> 1,1]\",\"rangeLength\":0,\"text\":\"a\",\"rangeOffset\":0}],\"eol\":\"\\n\",\"versionId\":2,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
                "handle change: editor.selections {\"selection\":\"[1,2 -> 1,2]\",\"modelVersionId\":2,\"oldSelections\":[\"[1,1 -> 1,1]\"],\"oldModelVersionId\":1,\"source\":\"keyboard\",\"reason\":0}",
                "running derived: selection: [1,2 -> 1,2], value: 2"
            ]));
        });
    });
    test("listener interaction ()", () => {
        let derived;
        let log;
        withEditorSetupTestFixture((editor, disposables) => {
            disposables.add(editor.onDidChangeModelContent(() => {
                log.log(">>> before forceUpdate");
                observableCodeEditor(editor).forceUpdate();
                log.log(">>> before get");
                derived.get();
                log.log("<<< after get");
            }));
        }, (args) => {
            const editor = args.editor;
            derived = args.derived;
            log = args.log;
            editor.trigger("keyboard", "type", { text: "a" });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                ">>> before forceUpdate",
                ">>> before get",
                "handle change: editor.versionId undefined",
                "running derived: selection: [1,2 -> 1,2], value: 2",
                "<<< after get",
                "handle change: editor.onDidType \"a\"",
                "handle change: editor.versionId {\"changes\":[{\"range\":\"[1,1 -> 1,1]\",\"rangeLength\":0,\"text\":\"a\",\"rangeOffset\":0}],\"eol\":\"\\n\",\"versionId\":2,\"detailedReasons\":[{\"metadata\":{\"source\":\"cursor\",\"kind\":\"type\",\"detailedSource\":\"keyboard\"}}],\"detailedReasonsChangeLengths\":[1]}",
                "handle change: editor.selections {\"selection\":\"[1,2 -> 1,2]\",\"modelVersionId\":2,\"oldSelections\":[\"[1,1 -> 1,1]\"],\"oldModelVersionId\":1,\"source\":\"keyboard\",\"reason\":0}",
                "running derived: selection: [1,2 -> 1,2], value: 2"
            ]));
        });
    });
});
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
function formatChange(change) {
    return JSON.stringify(change, (key, value) => {
        if (value instanceof Range) {
            return value.toString();
        }
        if (value === false ||
            (Array.isArray(value) && value.length === 0)) {
            return undefined;
        }
        return value;
    });
}
function observableName(obs, obsEditor) {
    switch (obs) {
        case obsEditor.selections:
            return "editor.selections";
        case obsEditor.versionId:
            return "editor.versionId";
        case obsEditor.onDidType:
            return "editor.onDidType";
        default:
            return "unknown";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci93aWRnZXQvb2JzZXJ2YWJsZUNvZGVFZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFlLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFMUQsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsZUFBZSxDQUN2QixFQUF5RztRQUV6RywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsMEJBQTBCLENBQ2xDLGdCQUVZLEVBQ1osRUFBeUc7UUFFekcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzFDLGdCQUFnQixFQUFFLENBQUMs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