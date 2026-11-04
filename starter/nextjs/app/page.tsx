import {
    BlocklifyEntryView,
    createBlocklifyClient,
    createStarterBlockMap,
} from "@blocklify/preview";

const blockMap = createStarterBlockMap({
    assetBaseUrl: process.env.BLOCKLIFY_API_URL,
});

const client = createBlocklifyClient({
    baseUrl: process.env.BLOCKLIFY_API_URL!,
    accessToken: process.env.BLOCKLIFY_ACCESS_TOKEN!,
});

export default async function HomePage() {
    const entry = await client.getEntry("home");
    const body = entry?.content.body ?? [];

    return (
        <main>
            <BlocklifyEntryView blocks={body} blockMap={blockMap} />
        </main>
    );
}
