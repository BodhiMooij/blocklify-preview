import { describe, expect, test } from "bun:test";
import { moveBlockInContent } from "./src/block-path.ts";

describe("moveBlockInContent", () => {
    test("reorders a body block without shifting the destination index", () => {
        const content = {
            body: [
                { type: "hero", _uid: "a" },
                { type: "text", _uid: "b" },
                { type: "image", _uid: "c" },
            ],
        };
        const moved = moveBlockInContent(
            content,
            [{ field: "body", index: 0 }],
            [{ field: "body", index: 2 }]
        );
        expect(moved?.movedUid).toBe("a");
        expect((moved?.next.body as { _uid: string }[]).map((block) => block._uid)).toEqual(["b", "c", "a"]);
    });

    test("reorders a column cell to the right", () => {
        const content = {
            body: [
                {
                    type: "columns",
                    _uid: "cols",
                    columns: [
                        { type: "text", _uid: "c0" },
                        { type: "text", _uid: "c1" },
                        { type: "text", _uid: "c2" },
                    ],
                },
            ],
        };
        const moved = moveBlockInContent(
            content,
            [
                { field: "body", index: 0 },
                { field: "columns", index: 0 },
            ],
            [
                { field: "body", index: 0 },
                { field: "columns", index: 2 },
            ]
        );
        const columns = (moved?.next.body as { columns: { _uid: string }[] }[])[0].columns;
        expect(columns.map((block) => block._uid)).toEqual(["c1", "c2", "c0"]);
    });
});
