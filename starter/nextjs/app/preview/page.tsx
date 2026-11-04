"use client";

import { BlocklifyPreview, createStarterBlockMap } from "@blocklify/preview";

const blockMap = createStarterBlockMap({
    assetBaseUrl: process.env.NEXT_PUBLIC_BLOCKLIFY_API_URL,
});

export default function PreviewPage() {
    return (
        <BlocklifyPreview
            blockMap={blockMap}
            blocksFieldName="body"
            emptyMessage="Waiting for content from the Blocklify editor…"
        />
    );
}
