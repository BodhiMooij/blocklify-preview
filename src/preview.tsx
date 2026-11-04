"use client";

import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Blocklify live-preview connector. Editable wrapper styles (border, hover) are defined here (PREVIEW_EDITABLE_CSS)
 * and sent from the admin to the iframe via postMessage (blocklify-preview-styles). The other app only needs
 * to use this lib and listen for that message; it will receive and inject the same styles so no duplication.
 */

/** Block shape sent by Blocklify (draft content or API). Your block components receive this. */
export type BlocklifyBlock = { type: string; _uid?: string; [k: string]: unknown };

/** Props passed to block components: block, optional BlocklifyEditable (spread on root in iframe), optional blockMap (for nested blocks). */
export type BlocklifyBlockProps = {
    block: BlocklifyBlock;
    BlocklifyEditable?: Record<string, unknown>;
    blockMap?: BlockMap;
};

/** Map block type string → component that receives { block, BlocklifyEditable? }. Spread BlocklifyEditable on the root element for click-to-focus in the preview iframe. */
export type BlockMap = Record<string, React.ComponentType<BlocklifyBlockProps>>;

/** Storyblok-style payload for data-blok-c (JSON string). */
export type DataBlokCPayload = {
    name: string;
    uid: string;
    space?: string;
    id?: string;
};

/**
 * Builds the value for the data-blok-c attribute (Storyblok-style JSON string).
 * Use when you need to set data-blok-c yourself; otherwise BlocklifyEditable includes it.
 */
export function getDataBlokC(
    block: BlocklifyBlock,
    options?: { spaceId?: string; blockId?: string }
): string {
    const payload: DataBlokCPayload = {
        name: block.type,
        uid: block._uid ?? "",
        ...(options?.spaceId != null && options.spaceId !== "" && { space: options.spaceId }),
        ...((options?.blockId ?? (block as { id?: string }).id) != null &&
            (options?.blockId ?? (block as { id?: string }).id) !== "" && {
                id: String(options?.blockId ?? (block as { id?: string }).id),
            }),
    };
    return JSON.stringify(payload);
}

/**
 * Returns props to spread on the root element of a block so it becomes clickable in the preview iframe (like Storyblok’s storyblokEditable).
 * Sets data-blok-c (Storyblok-style JSON: name, uid, space?, id?) and data-blok-uid for compatibility.
 * Only returns non-empty when in iframe with onBlockClick; otherwise returns {} so components work unchanged outside preview.
 * Use in the preview renderer; components just spread the BlocklifyEditable prop they receive.
 * Clicks send the block's _uid so the editor can open the form for the correct block.
 */
export function BlocklifyEditable(
    block: BlocklifyBlock,
    index: number,
    onBlockClick: ((uid: string) => void) | undefined,
    options?: { spaceId?: string; blockId?: string }
): Record<string, unknown> {
    if (!onBlockClick) return {};
    const uid = block._uid ?? "";
    return {
        "data-blocklify-iframe-editable": true,
        "data-blok-c": getDataBlokC(block, options),
        ...(uid && { "data-blok-uid": uid }),
        role: "button",
        tabIndex: 0,
        title: "Click to focus in editor",
        "aria-label": `Edit block ${index + 1}, ${block.type}`,
        onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onBlockClick(uid);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onBlockClick(uid);
            }
        },
    };
}

const BLOCKLIFY_DRAFT = "blocklify-draft";
const BLOCKLIFY_BLOCK_CLICK = "blocklify-block-click";
/** Message type the admin sends to the iframe with editable wrapper CSS (single source of truth in Blocklify). */
export const BLOCKLIFY_PREVIEW_STYLES = "blocklify-preview-styles";
/** Message type the admin sends when peer-focused blocks change, so the preview can render colored borders. */
export const BLOCKLIFY_PEER_FOCUS = "blocklify-peer-focus";
/** Message type the admin sends to scroll a block into view in the preview iframe (e.g. when focusing a field in the editor). */
export const BLOCKLIFY_SCROLL_TO_BLOCK = "blocklify-scroll-to-block";

const PREVIEW_FOCUS_BLINK_CLASS = "blocklify-preview-focus-blink";
const PREVIEW_FOCUS_BLINK_MS = 550;

function pulsePreviewBlock(el: HTMLElement) {
    el.classList.remove(PREVIEW_FOCUS_BLINK_CLASS);
    void el.offsetWidth;
    el.classList.add(PREVIEW_FOCUS_BLINK_CLASS);
    window.setTimeout(() => {
        el.classList.remove(PREVIEW_FOCUS_BLINK_CLASS);
    }, PREVIEW_FOCUS_BLINK_MS);
}

function scrollPreviewBlockIntoView(uid: string) {
    if (typeof document === "undefined" || !uid) return;
    const escaped =
        typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(uid) : uid;
    const el =
        document.querySelector(`[data-blok-uid="${escaped}"]`) ??
        document.querySelector(`[data-blocklify-uid="${escaped}"]`);
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    pulsePreviewBlock(el);
}

/** Single source of truth for editable block styling in the preview iframe. Sent by the admin via postMessage so the other app doesn’t need to duplicate it. */
export const PREVIEW_EDITABLE_CSS = `
:root {
    --radius: 0.5rem;
}
[data-blocklify-iframe-editable],
[data-blok-uid] {
    cursor: pointer !important;
    border: 2px solid #2563eb !important;
    border-radius: var(--radius) !important;
    padding: 6px !important;
    margin-bottom: 10px !important;
    box-sizing: border-box !important;
    transition: border-color 0.2s ease, background-color 0.2s ease !important;
    position: relative !important;
    min-height: 24px !important;
}
[data-blocklify-iframe-editable]:hover,
[data-blok-uid]:hover {
    border-color: #1d4ed8 !important;
    background-color: rgba(37, 99, 235, 0.06) !important;
}
@keyframes blocklify-preview-focus-blink {
    0% {
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
        border-color: #2563eb !important;
    }
    35% {
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.45);
        border-color: #1d4ed8 !important;
    }
    100% {
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
        border-color: #2563eb !important;
    }
}
.${PREVIEW_FOCUS_BLINK_CLASS} {
    animation: blocklify-preview-focus-blink 0.55s ease-out 1 !important;
}
@media (prefers-reduced-motion: reduce) {
    .${PREVIEW_FOCUS_BLINK_CLASS} {
        animation: none !important;
    }
}
`;

function subscribeIsInIframe() {
    // iframe embedding does not change for the lifetime of the page.
    return () => {};
}

function getIsInIframeSnapshot() {
    return window.self !== window.top;
}

function getIsInIframeServerSnapshot() {
    return false;
}

/**
 * Hook that connects your preview page to the Blocklify admin iframe:
 * - Listens for draft content via postMessage (type: "blocklify-draft").
 * - Sends block clicks back to the editor (type: "blocklify-block-click").
 * Use this when your preview page is loaded inside the Blocklify admin iframe.
 */
export function useBlocklifyPreview(blocksFieldName: string = "body") {
    const [draftContent, setDraftContent] = useState<Record<string, unknown> | null>(null);
    /** CSS for editable wrappers: from parent (postMessage) or fallback to PREVIEW_EDITABLE_CSS. */
    const [receivedEditableCss, setReceivedEditableCss] = useState<string | null>(null);
    const [peerFocusedBlocks, setPeerFocusedBlocks] = useState<Record<string, { name: string; color: string }>>({});
    const isInIframe = useSyncExternalStore(
        subscribeIsInIframe,
        getIsInIframeSnapshot,
        getIsInIframeServerSnapshot
    );

    const [spaceId, setSpaceId] = useState<string | null>(null);

    useEffect(() => {
        if (!isInIframe) return;
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === BLOCKLIFY_DRAFT && event.data.content != null) {
                setDraftContent(event.data.content as Record<string, unknown>);
                setSpaceId(
                    typeof event.data.spaceId === "string" && event.data.spaceId.trim() !== ""
                        ? event.data.spaceId
                        : null
                );
            }
            if (
                event.data?.type === BLOCKLIFY_PREVIEW_STYLES &&
                typeof event.data.css === "string"
            ) {
                setReceivedEditableCss(event.data.css);
            }
            if (event.data?.type === BLOCKLIFY_PEER_FOCUS && event.data.peers != null) {
                setPeerFocusedBlocks(event.data.peers as Record<string, { name: string; color: string }>);
            }
            if (
                event.data?.type === BLOCKLIFY_SCROLL_TO_BLOCK &&
                typeof event.data.uid === "string" &&
                event.data.uid.trim() !== ""
            ) {
                // Wait a frame so draft content / DOM from a concurrent update can settle.
                requestAnimationFrame(() => {
                    scrollPreviewBlockIntoView(event.data.uid as string);
                });
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [isInIframe]);

    const onBlockClick = useCallback(
        (uid: string) => {
            if (typeof window === "undefined" || window === window.parent) return;
            window.parent.postMessage({ type: BLOCKLIFY_BLOCK_CLICK, uid, blocksFieldName }, "*");
        },
        [blocksFieldName]
    );

    const rawBlocks = draftContent?.[blocksFieldName];
    const blocks: BlocklifyBlock[] = Array.isArray(rawBlocks)
        ? (rawBlocks as BlocklifyBlock[]).filter(
              (b): b is BlocklifyBlock =>
                  b != null &&
                  typeof b === "object" &&
                  typeof (b as BlocklifyBlock).type === "string"
          )
        : [];

    const showEmptyMessage = isInIframe && blocks.length === 0 && draftContent === null;

    return {
        blocks,
        isInIframe,
        onBlockClick,
        showEmptyMessage,
        /** Space id from the draft message (for data-blok-c when admin sends spaceId). */
        spaceId,
        /** Use this when rendering editable wrappers: parent-sent CSS or PREVIEW_EDITABLE_CSS. */
        editableCss: receivedEditableCss ?? PREVIEW_EDITABLE_CSS,
        /** Peer-focused blocks: uid → { name, color }. Inject as colored borders to show who is editing what. */
        peerFocusedBlocks,
    };
}

type BlocklifyPreviewRendererProps = {
    blocks: BlocklifyBlock[];
    blockMap: BlockMap;
    onBlockClick?: (uid: string) => void;
    /** Space id for data-blok-c (Storyblok-style). Pass from useBlocklifyPreview().spaceId when admin sends it. */
    spaceId?: string | null;
    /** CSS for editable wrappers. When in iframe, pass editableCss from useBlocklifyPreview (from parent or default). */
    editableCss?: string;
    /** Optional: pass to each component so nested blocks (e.g. Page, Grid) can render. */
    blockMapForNested?: BlockMap;
};

/** Fallback when a block type has no component in the blockMap – never pass undefined to React. */
function UnknownBlockFallback({
    block,
    BlocklifyEditable = {},
}: {
    block: BlocklifyBlock;
    BlocklifyEditable?: Record<string, unknown>;
}) {
    return (
        <section
            style={{
                padding: "1rem 1.25rem",
                opacity: 0.9,
                border: "2px dashed #94a3b8",
                borderRadius: 8,
                backgroundColor: "rgba(148, 163, 184, 0.08)",
                color: "#64748b",
                fontSize: "0.875rem",
            }}
            {...BlocklifyEditable}
        >
            <strong style={{ color: "#475569" }}>
                Block type &quot;{block.type}&quot; not found.
            </strong>
            <p style={{ margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                Add a component for this block type to your project&apos;s blockMap (e.g. in your
                preview page) to render it here.
            </p>
        </section>
    );
}

/**
 * Renders blocks using your blockMap. Passes BlocklifyEditable (from BlocklifyEditable()) so components can spread it on their root for click-to-focus in the iframe.
 * Styles are injected from editableCss (sent by admin via postMessage). No wrapper div – components apply {...BlocklifyEditable} themselves.
 */
export function BlocklifyPreviewRenderer({
    blocks,
    blockMap,
    onBlockClick,
    spaceId,
    editableCss = PREVIEW_EDITABLE_CSS,
    blockMapForNested,
}: BlocklifyPreviewRendererProps) {
    const safeBlockMap = blockMap ?? ({} as BlockMap);
    const nestedMap = blockMapForNested ?? safeBlockMap;
    const resolveComponent = (type: string): React.ComponentType<BlocklifyBlockProps> =>
        safeBlockMap[type] ??
        (type.endsWith("_block") ? safeBlockMap[type.slice(0, -6)] : undefined) ??
        UnknownBlockFallback;

    return (
        <>
            <style
                id="blocklify-preview-editable-styles"
                dangerouslySetInnerHTML={{ __html: editableCss }}
            />
            {blocks.map((block, i) => {
                const Component = resolveComponent(block.type);
                const key = block._uid ?? i;
                const blocklifyEditable = BlocklifyEditable(block, i, onBlockClick, {
                    spaceId: spaceId ?? undefined,
                    blockId: (block as { id?: string }).id,
                });
                return (
                    <Component
                        key={key}
                        block={block}
                        BlocklifyEditable={blocklifyEditable}
                        {...(nestedMap && { blockMap: nestedMap })}
                    />
                );
            })}
        </>
    );
}

export type BlocklifyPreviewProps = {
    /** Map of block type → component that receives { block }. Define your blocks in your app and pass this. */
    blockMap: BlockMap;
    /** Key in draft content that holds the blocks array (default "body"). */
    blocksFieldName?: string;
    /** Message shown when the preview iframe has not received draft content yet. */
    emptyMessage?: string;
    /** Optional className for the root wrapper. */
    className?: string;
};

/**
 * Preview connector for Blocklify. Use this on your frontend’s preview page (e.g. /preview).
 * You only need to define your block components and a blockMap; this component handles:
 * - Receiving draft content from the Blocklify admin via postMessage
 * - Sending block clicks back to the editor
 * - Empty state message and editable borders when embedded in the admin iframe
 */
export function BlocklifyPreview({
    blockMap,
    blocksFieldName = "body",
    emptyMessage = "Waiting for content from editor…",
    className,
}: BlocklifyPreviewProps) {
    const { blocks, isInIframe, onBlockClick, showEmptyMessage, spaceId, editableCss, peerFocusedBlocks } =
        useBlocklifyPreview(blocksFieldName);

    const peerFocusCss = Object.entries(peerFocusedBlocks)
        .map(([uid, { color }]) =>
            `[data-blok-uid="${uid}"] { border-color: ${color} !important; box-shadow: 0 0 0 2px ${color} !important; }`
        )
        .join("\n");

    return (
        <div
            className={
                className ?? "min-h-screen bg-surface text-text blocklify-preview-non-interactive"
            }
        >
            <style>{`
                .blocklify-preview-non-interactive a,
                .blocklify-preview-non-interactive button {
                    pointer-events: none;
                    cursor: default;
                }
            `}</style>
            {peerFocusCss && (
                <style id="blocklify-peer-focus-styles">{peerFocusCss}</style>
            )}
            {showEmptyMessage && (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-sm text-text-muted">{emptyMessage}</p>
                </div>
            )}
            <BlocklifyPreviewRenderer
                blocks={blocks}
                blockMap={blockMap}
                onBlockClick={isInIframe ? onBlockClick : undefined}
                spaceId={spaceId}
                editableCss={editableCss}
                blockMapForNested={blockMap}
            />
        </div>
    );
}

/** Default export so both "import BlocklifyPreview from '...'" and "import { BlocklifyPreview } from '...'" work. */
export default BlocklifyPreview;
