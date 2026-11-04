import type { ComponentType } from "react";
import type { BlocklifyBlock, BlocklifyBlockProps, BlockMap } from "./preview.js";

export type StarterBlockMapOptions = {
    /**
     * Blocklify origin, no trailing slash.
     * Used when an asset field is still an id (`/api/assets/{id}/file` is public).
     */
    assetBaseUrl?: string;
};

function textOf(block: BlocklifyBlock, key: string): string {
    const value = block[key];
    return typeof value === "string" ? value : "";
}

function absolutize(url: string, assetBaseUrl?: string): string {
    if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
    if (url.startsWith("/") && assetBaseUrl) {
        return `${assetBaseUrl.replace(/\/+$/, "")}${url}`;
    }
    return url;
}

/** URL for an asset field: expanded `{ url }`, an absolute/path string, or a bare asset id. */
export function blocklifyAssetUrl(value: unknown, assetBaseUrl?: string): string | null {
    if (value == null || value === "") return null;
    if (typeof value === "object") {
        const record = value as { url?: unknown; id?: unknown };
        if (typeof record.url === "string" && record.url !== "") {
            return absolutize(record.url, assetBaseUrl);
        }
        if (typeof record.id === "string" && record.id !== "") {
            return blocklifyAssetUrl(record.id, assetBaseUrl);
        }
        return null;
    }
    if (typeof value !== "string") return null;
    if (/^https?:\/\//i.test(value) || value.startsWith("/") || value.startsWith("data:")) {
        return absolutize(value, assetBaseUrl);
    }
    if (!assetBaseUrl) return null;
    return `${assetBaseUrl.replace(/\/+$/, "")}/api/assets/${encodeURIComponent(value)}/file`;
}

const sectionStyle = {
    padding: "4rem 1.5rem",
    maxWidth: "42rem",
    margin: "0 auto",
};

function HeroBlock({
    block,
    BlocklifyEditable = {},
    assetBaseUrl,
}: BlocklifyBlockProps & { assetBaseUrl?: string }) {
    const headline = textOf(block, "headline");
    const subheadline = textOf(block, "subheadline");
    const ctaText = textOf(block, "cta_text");
    const ctaLink = textOf(block, "cta_link") || "#";
    const imageSrc = blocklifyAssetUrl(block.image, assetBaseUrl);

    return (
        <section style={{ ...sectionStyle, textAlign: "center" }} {...BlocklifyEditable}>
            {imageSrc ? (
                // Themes install this package outside the Blocklify app, so they cannot use its Image component.
                <img
                    src={imageSrc}
                    alt={textOf(block, "alt") || headline}
                    style={{ width: "100%", borderRadius: 12, marginBottom: "1.5rem" }}
                />
            ) : null}
            {headline ? (
                <h1 style={{ fontSize: "2.5rem", lineHeight: 1.15, margin: 0 }}>{headline}</h1>
            ) : null}
            {subheadline ? (
                <p style={{ marginTop: "1rem", fontSize: "1.125rem", opacity: 0.75 }}>
                    {subheadline}
                </p>
            ) : null}
            {ctaText ? (
                <a
                    href={ctaLink}
                    style={{
                        display: "inline-block",
                        marginTop: "1.5rem",
                        padding: "0.75rem 1.5rem",
                        borderRadius: 999,
                        background: "#111",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                    }}
                >
                    {ctaText}
                </a>
            ) : null}
        </section>
    );
}

function TextBlock({ block, BlocklifyEditable = {} }: BlocklifyBlockProps) {
    const html = textOf(block, "content") || textOf(block, "text") || textOf(block, "html");
    return (
        <section style={sectionStyle} {...BlocklifyEditable}>
            {html ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
                <p style={{ fontStyle: "italic", opacity: 0.6 }}>Empty text block</p>
            )}
        </section>
    );
}

function ImageBlock({
    block,
    BlocklifyEditable = {},
    assetBaseUrl,
}: BlocklifyBlockProps & { assetBaseUrl?: string }) {
    const src = blocklifyAssetUrl(block.image, assetBaseUrl);
    const caption = textOf(block, "caption");
    const alt = textOf(block, "alt") || caption;
    return (
        <figure
            style={{ ...sectionStyle, paddingTop: "1.5rem", paddingBottom: "1.5rem" }}
            {...BlocklifyEditable}
        >
            {src ? (
                <img src={src} alt={alt} style={{ width: "100%", borderRadius: 12 }} />
            ) : (
                <div
                    style={{
                        padding: "3rem 1rem",
                        textAlign: "center",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 12,
                        opacity: 0.7,
                    }}
                >
                    No image selected
                </div>
            )}
            {caption ? (
                <figcaption
                    style={{
                        marginTop: "0.5rem",
                        textAlign: "center",
                        fontSize: "0.875rem",
                        opacity: 0.7,
                    }}
                >
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

function CtaBlock({ block, BlocklifyEditable = {} }: BlocklifyBlockProps) {
    const headline = textOf(block, "headline");
    const subtext = textOf(block, "subtext");
    const buttonText = textOf(block, "button_text");
    const buttonLink = textOf(block, "button_link") || "#";
    return (
        <section style={{ ...sectionStyle, textAlign: "center" }} {...BlocklifyEditable}>
            {headline ? <h2 style={{ fontSize: "1.75rem", margin: 0 }}>{headline}</h2> : null}
            {subtext ? <p style={{ marginTop: "0.75rem", opacity: 0.75 }}>{subtext}</p> : null}
            {buttonText ? (
                <a
                    href={buttonLink}
                    style={{
                        display: "inline-block",
                        marginTop: "1.5rem",
                        padding: "0.75rem 1.5rem",
                        borderRadius: 999,
                        background: "#65a30d",
                        color: "#fff",
                        textDecoration: "none",
                    }}
                >
                    {buttonText}
                </a>
            ) : null}
        </section>
    );
}

function withAssetBase(
    Component: ComponentType<BlocklifyBlockProps & { assetBaseUrl?: string }>,
    assetBaseUrl?: string
): ComponentType<BlocklifyBlockProps> {
    function StarterBlock(props: BlocklifyBlockProps) {
        return <Component {...props} assetBaseUrl={assetBaseUrl} />;
    }
    StarterBlock.displayName = Component.displayName ?? Component.name;
    return StarterBlock;
}

/**
 * Theme components for a starter Blocklify space: hero, text, image, and cta.
 * Also registers the `*_block` aliases.
 */
export function createStarterBlockMap(options?: StarterBlockMapOptions): BlockMap {
    const assetBaseUrl = options?.assetBaseUrl;
    const hero = withAssetBase(HeroBlock, assetBaseUrl);
    const text = TextBlock;
    const image = withAssetBase(ImageBlock, assetBaseUrl);
    const cta = CtaBlock;
    return {
        hero,
        hero_block: hero,
        text,
        text_block: text,
        image,
        image_block: image,
        cta,
    };
}

/** Starter map without an asset origin. Expanded `{ url }` fields still render. */
export const starterBlockMap = createStarterBlockMap();

function resolveBlock(
    blockMap: BlockMap,
    type: string
): ComponentType<BlocklifyBlockProps> | undefined {
    return blockMap[type] ?? (type.endsWith("_block") ? blockMap[type.slice(0, -6)] : undefined);
}

/** Renders an entry body with a block map. Use on the public site, outside the preview iframe. */
export function BlocklifyEntryView({
    blocks,
    blockMap = starterBlockMap,
}: {
    blocks?: BlocklifyBlock[] | null;
    blockMap?: BlockMap;
}) {
    if (!blocks?.length) return null;
    return (
        <>
            {blocks.map((block, index) => {
                const Component = resolveBlock(blockMap, block.type);
                if (!Component) return null;
                return (
                    <Component
                        key={block._uid ?? `${block.type}-${index}`}
                        block={block}
                        blockMap={blockMap}
                    />
                );
            })}
        </>
    );
}
