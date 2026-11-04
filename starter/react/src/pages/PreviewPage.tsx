import { BlocklifyPreview, createStarterBlockMap } from "@blocklify/preview";

const blockMap = createStarterBlockMap({
    assetBaseUrl: import.meta.env.VITE_BLOCKLIFY_API_URL,
});

export function PreviewPage() {
    return (
        <BlocklifyPreview
            blockMap={blockMap}
            blocksFieldName="body"
            emptyMessage="Waiting for content from the Blocklify editor…"
        />
    );
}
