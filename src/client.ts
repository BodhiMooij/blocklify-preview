/**
 * Lightweight client for the Blocklify Content API.
 * Use from your website or app to fetch entries and components with an access token.
 *
 * @example
 * const client = createBlocklifyClient({
 *   baseUrl: process.env.BLOCKLIFY_API_URL!,
 *   accessToken: process.env.BLOCKLIFY_ACCESS_TOKEN!,
 * });
 * const entries = await client.getEntries({ published: true });
 * const home = await client.getEntry("home");
 */

export type BlocklifyClientConfig = {
    /** Blocklify app base URL (e.g. https://your-blocklify-app.com, no trailing slash) */
    baseUrl: string;
    /** Access token (from Admin → Access tokens). Prefix: blocklify_... */
    accessToken: string;
};

export type BlocklifyEntry = {
    id: string;
    spaceId: string;
    slug: string;
    name: string;
    content: Record<string, unknown> & {
        body?: Array<{ type: string; [k: string]: unknown }>;
        blocks?: Array<{ type: string; [k: string]: unknown }>;
        title?: string;
    };
    isPublished: boolean;
    publishedAt: string | null;
    contentType: { id: string; type: string; name?: string; schema?: string };
    createdAt: string;
    updatedAt: string;
};

export type BlocklifyComponent = {
    id: string;
    spaceId: string;
    name: string;
    type: string;
    schema: { fields?: Array<{ name: string; type: string; [k: string]: unknown }> };
    isRoot: boolean;
    isNestable: boolean;
};

export type BlocklifySiteAsset = {
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    alt: string | null;
};

export type BlocklifySiteSettings = {
    defaultPageTitle: string | null;
    favicon: BlocklifySiteAsset | null;
    logo: BlocklifySiteAsset | null;
    custom: Array<{ key: string; value: string }>;
};

function buildHeaders(accessToken: string): HeadersInit {
    return {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
    };
}

function ensureNoTrailingSlash(url: string): string {
    return url.replace(/\/+$/, "");
}

export function createBlocklifyClient(config: BlocklifyClientConfig) {
    const baseUrl = ensureNoTrailingSlash(config.baseUrl);
    const headers = buildHeaders(config.accessToken);

    async function request<T>(
        path: string,
        options?: { method?: string; searchParams?: Record<string, string> }
    ): Promise<T> {
        const url = new URL(path.startsWith("http") ? path : baseUrl + path);
        if (options?.searchParams) {
            Object.entries(options.searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
        }
        const res = await fetch(url.toString(), {
            method: options?.method ?? "GET",
            headers,
            cache: "no-store",
        });
        if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? `API error ${res.status}`);
        }
        return res.json() as Promise<T>;
    }

    return {
        /** List entries. Use published: true for production; omit for preview (drafts + published). */
        getEntries(options?: { published?: boolean; spaceId?: string }): Promise<BlocklifyEntry[]> {
            const searchParams: Record<string, string> = {};
            if (options?.published === true) searchParams.published = "true";
            if (options?.spaceId) searchParams.space = options.spaceId;
            return request<BlocklifyEntry[]>("/api/entries", { searchParams });
        },

        /** Get one entry by slug. Use for live preview. Returns null when entry is not found (404). */
        async getEntry(
            slug: string,
            options?: { spaceId?: string }
        ): Promise<BlocklifyEntry | null> {
            const searchParams: Record<string, string> = {};
            if (options?.spaceId) searchParams.space = options.spaceId;
            const query = new URLSearchParams(searchParams).toString();
            const path = `/api/entries/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
            const url = new URL(path.startsWith("http") ? path : baseUrl + path);
            const res = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" });
            if (res.status === 404) return null;
            if (!res.ok) {
                const err = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(err.error ?? `API error ${res.status}`);
            }
            return res.json() as Promise<BlocklifyEntry>;
        },

        /** List components (block definitions) for the space. */
        getComponents(options?: { spaceId?: string }): Promise<BlocklifyComponent[]> {
            const searchParams: Record<string, string> = {};
            if (options?.spaceId) searchParams.space = options.spaceId;
            return request<BlocklifyComponent[]>("/api/components", { searchParams });
        },

        /** Site settings (default title, favicon, logo, custom key–value pairs). */
        getSiteSettings(options?: { spaceId?: string }): Promise<BlocklifySiteSettings> {
            const searchParams: Record<string, string> = {};
            if (options?.spaceId) searchParams.space = options.spaceId;
            return request<BlocklifySiteSettings>("/api/site-settings", { searchParams });
        },
    };
}
