import { useEffect, useState } from "react";
import {
    BlocklifyEntryView,
    createBlocklifyClient,
    createStarterBlockMap,
} from "@blocklify/preview";
import type { BlocklifyBlock } from "@blocklify/preview";

const blockMap = createStarterBlockMap({
    assetBaseUrl: import.meta.env.VITE_BLOCKLIFY_API_URL,
});

const client = createBlocklifyClient({
    baseUrl: import.meta.env.VITE_BLOCKLIFY_API_URL,
    accessToken: import.meta.env.VITE_BLOCKLIFY_ACCESS_TOKEN,
});

export default function App() {
    const [blocks, setBlocks] = useState<BlocklifyBlock[]>([]);

    useEffect(() => {
        let cancelled = false;
        client.getEntry("home").then((entry) => {
            if (!cancelled) setBlocks(entry?.content.body ?? []);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main>
            <BlocklifyEntryView blocks={blocks} blockMap={blockMap} />
        </main>
    );
}
