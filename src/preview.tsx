"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { moveBlockInContent, toBlockPathSegment, type BlockPath } from "./block-path.js";
import { PREVIEW_EDITABLE_CSS, PREVIEW_FOCUS_BLINK_CLASS, PREVIEW_FOCUS_BLINK_MS } from "./preview-styles.js";
import { PreviewSortableTree, type RenderSortableBlock } from "./sortable-preview.js";
import type {
    BlocklifyBlock,
    BlocklifyBlockProps,
    BlockMap,
    BlockReorderPayload,
    RenderNestedBlocks,
} from "./types.js";

export type {
    BlocklifyBlock,
    BlocklifyBlockProps,
    BlockMap,
    BlockReorderPayload,
    RenderNestedBlocks,
} from "./types.js";
export type { BlockPath, BlockPathSegment } from "./block-path.js";

/**
 * Blocklify live-preview connector.
 * Editable outlines and drag handles are defined in PREVIEW_EDITABLE_CSS and sent from the admin
 * to the iframe via postMessage (`blocklify-preview-styles`).
 */

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

/** True when `BlocklifyEditable` props are the preview click-to-focus props, not an empty object. */
export function isPreviewEditable(editable: Record<string, unknown> | undefined): boolean {
    return editable != null && Object.keys(editable).length > 0;
}

function pulsePreviewBlock(el: HTMLElement) {
    el.classList.remove(PREVIEW_FOCUS_BLINK_CLASS);
    void el.offsetWidth;
    el.classList.add(PREVIEW_FOCUS_BLINK_CLASS);
    window.setTimeout(() => {
        el.classList.remove(PREVIEW_FOCUS_BLINK_CLASS);
    }, PREVIEW_FOCUS_BLINK_MS);
}

/**
 * Returns props to spread on the root element of a block so it becomes clickable in the preview iframe.
 * Sets data-blok-c and data-blok-uid. Only returns props when `onBlockClick` is set.
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
        onClick: (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.currentTarget instanceof HTMLElement) {
                pulsePreviewBlock(event.currentTarget);
            }
            onBlockClick(uid);
        },
        onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
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

function scrollPreviewBlockIntoView(uid: string) {
    if (typeof document === "undefined" || !uid) return;
    const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(uid) : uid;
    const el =
        document.querySelector(`[data-blok-uid="${escaped}"]`) ??
        document.querySelector(`[data-blocklify-uid="${escaped}"]`);
    if (!(el instanceof HTMLElement)) return;

    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const canScrollY =
            (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
            parent.scrollHeight > parent.clientHeight + 1;
        if (canScrollY) {
            const parentRect = parent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const delta = elRect.top - parentRect.top - parent.clientHeight / 2 + elRect.height / 2;
            parent.scrollBy({ top: delta, behavior: "smooth" });
            pulsePreviewBlock(el);
            return;
        }
        parent = parent.parentElement;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    pulsePreviewBlock(el);
}

export { PREVIEW_EDITABLE_CSS } from "./preview-styles.js";

function subscribeIsInIframe() {
    return () => {};
}

function getIsInIframeSnapshot() {
    return window.self !== window.top;
}

function getIsInIframeServerSnapshot() {
    return false;
}

function blocksFromContent(content: Record<string, unknown> | null, blocksFieldName: string): BlocklifyBlock[] {
    const rawBlocks = content?.[blocksFieldName];
    return Array.isArray(rawBlocks)
        ? (rawBlocks as BlocklifyBlock[]).filter(
              (block): block is BlocklifyBlock =>
                  block != null && typeof block === "object" && typeof block.type === "string"
          )
        : [];
}

function peerFocusCssFor(peers: Record<string, { name: string; color: string }>): string {
    return Object.entries(peers)
        .map(([uid, { color }]) => {
            const safeUid = uid.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            return `[data-blok-uid="${safeUid}"], [data-blocklify-uid="${safeUid}"] { outline-color: ${color} !important; box-shadow: 0 0 0 2px ${color} !important; }`;
        })
        .join("\n");
}

/**
 * Hook that connects your preview page to the Blocklify admin iframe:
 * - Listens for draft content via postMessage (type: "blocklify-draft").
 * - Sends block clicks back to the editor (type: "blocklify-block-click").
 * - `applyBlockReorder` updates the local draft immediately; the sortable renderer posts the reorder.
 */
export function useBlocklifyPreview(blocksFieldName: string = "body") {
    const [draftContent, setDraftContent] = useState<Record<string, unknown> | null>(null);
    const draftRef = useRef<Record<string, unknown> | null>(null);
    /** CSS for editable wrappers: from parent (postMessage) or fallback to PREVIEW_EDITABLE_CSS. */
    const [receivedEditableCss, setReceivedEditableCss] = useState<string | null>(null);
    const [peerFocusedBlocks, setPeerFocusedBlocks] = useState<Record<string, { name: string; color: string }>>({});
    const isInIframe = useSyncExternalStore(
        subscribeIsInIframe,
        getIsInIframeSnapshot,
        getIsInIframeServerSnapshot
    );

    const [spaceId, setSpaceId] = useState<string | null>(null);

    const setDraft = useCallback((content: Record<string, unknown> | null) => {
        draftRef.current = content;
        setDraftContent(content);
    }, []);

    useEffect(() => {
        if (!isInIframe) return;
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === BLOCKLIFY_DRAFT && event.data.content != null) {
                setDraft(event.data.content as Record<string, unknown>);
                setSpaceId(
                    typeof event.data.spaceId === "string" && event.data.spaceId.trim() !== ""
                        ? event.data.spaceId
                        : null
                );
            }
            if (event.data?.type === BLOCKLIFY_PREVIEW_STYLES && typeof event.data.css === "string") {
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
                requestAnimationFrame(() => {
                    scrollPreviewBlockIntoView(event.data.uid as string);
                });
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [isInIframe, setDraft]);

    const onBlockClick = useCallback(
        (uid: string) => {
            if (typeof window === "undefined" || window === window.parent) return;
            window.parent.postMessage({ type: BLOCKLIFY_BLOCK_CLICK, uid, blocksFieldName }, "*");
        },
        [blocksFieldName]
    );

    const applyBlockReorder = useCallback((payload: BlockReorderPayload) => {
        const current = draftRef.current;
        if (!current) return null;
        const moved = moveBlockInContent(current, payload.sourcePath, payload.destinationPath);
        if (!moved || moved.movedUid !== payload.movedUid) return null;
        draftRef.current = moved.next;
        setDraftContent(moved.next);
        return moved.movedUid;
    }, []);

    const blocks = blocksFromContent(draftContent, blocksFieldName);
    const showEmptyMessage = isInIframe && blocks.length === 0 && draftContent === null;

    return {
        blocks,
        /** Full draft content object from the editor, including fields outside `blocksFieldName`. */
        content: draftContent,
        isInIframe,
        onBlockClick,
        showEmptyMessage,
        /** Space id from the draft message (for data-blok-c when admin sends spaceId). */
        spaceId,
        /** Use this when rendering editable wrappers: parent-sent CSS or PREVIEW_EDITABLE_CSS. */
        editableCss: receivedEditableCss ?? PREVIEW_EDITABLE_CSS,
        /** Peer-focused blocks: uid → { name, color }. */
        peerFocusedBlocks,
        /** CSS that paints peer outlines. Empty when nobody else is focused. */
        peerFocusCss: peerFocusCssFor(peerFocusedBlocks),
        /** Apply a drag reorder to the local draft. The sortable tree posts `blocklify-block-reorder` after this. */
        applyBlockReorder,
    };
}

const EMPTY_BLOCK_MAP: BlockMap = {};

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
    /** Field these blocks live on. Default "body". Nested columns use their own field name. */
    blocksFieldName?: string;
    /** Drag handles and reorder. Defaults to on when `onBlockClick` is set. */
    sortable?: boolean;
    /** Fields whose arrays can be reordered. Default: body, blocks, columns, items. */
    sortableBlocksFields?: readonly string[];
    /** Updates local draft content and returns the moved uid. */
    onBlockReorder?: (payload: BlockReorderPayload) => string | null;
    /** Inject PREVIEW_EDITABLE_CSS. Set false when a parent already injected it. */
    injectStyles?: boolean;
};

function resolveComponent(blockMap: BlockMap, type: string): React.ComponentType<BlocklifyBlockProps> {
    return (
        blockMap[type] ??
        (type.endsWith("_block") ? blockMap[type.slice(0, -6)] : undefined) ??
        UnknownBlockFallback
    );
}

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
            <strong style={{ color: "#475569" }}>Block type &quot;{block.type}&quot; not found.</strong>
            <p style={{ margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                Add a component for this block type to your project&apos;s blockMap (e.g. in your preview page) to
                render it here.
            </p>
        </section>
    );
}

function PlainBlockList({
    blocks,
    parentPath,
    fieldName,
    renderBlock,
}: {
    blocks: BlocklifyBlock[];
    parentPath: BlockPath;
    fieldName: string;
    renderBlock: RenderSortableBlock;
}) {
    const renderNestedBlocks = useCallback<RenderNestedBlocks>(
        (nestedBlocks, nestedParentPath, nestedFieldName) => (
            <PlainBlockList
                blocks={nestedBlocks}
                parentPath={nestedParentPath}
                fieldName={nestedFieldName}
                renderBlock={renderBlock}
            />
        ),
        [renderBlock]
    );

    return (
        <>
            {blocks.map((block, index) => {
                const blockPath = toBlockPathSegment(parentPath, fieldName, index);
                const key = block._uid ?? `${block.type}-${index}`;
                return (
                    <React.Fragment key={key}>
                        {renderBlock({ block, blockPath, blockIndex: index, renderNestedBlocks })}
                    </React.Fragment>
                );
            })}
        </>
    );
}

/**
 * Renders blocks using your blockMap. Passes BlocklifyEditable so components can spread it on their root.
 * In the preview iframe, wraps sortable lists with drag handles and posts `blocklify-block-reorder`.
 */
export function BlocklifyPreviewRenderer({
    blocks,
    blockMap,
    onBlockClick,
    spaceId,
    editableCss = PREVIEW_EDITABLE_CSS,
    blockMapForNested,
    blocksFieldName = "body",
    sortable,
    sortableBlocksFields,
    onBlockReorder,
    injectStyles = true,
}: BlocklifyPreviewRendererProps) {
    const safeBlockMap = blockMap ?? EMPTY_BLOCK_MAP;
    const nestedMap = blockMapForNested ?? safeBlockMap;
    const enableSort = sortable ?? Boolean(onBlockClick);

    const renderBlock = useCallback<RenderSortableBlock>(
        ({ block, blockPath, blockIndex, renderNestedBlocks }) => {
            const Component = resolveComponent(safeBlockMap, block.type);
            const blocklifyEditable = BlocklifyEditable(block, blockIndex, onBlockClick, {
                spaceId: spaceId ?? undefined,
                blockId: (block as { id?: string }).id,
            });
            return (
                <Component
                    block={block}
                    BlocklifyEditable={blocklifyEditable}
                    blockMap={nestedMap}
                    blockIndex={blockIndex}
                    blockPath={blockPath}
                    renderNestedBlocks={renderNestedBlocks}
                />
            );
        },
        [nestedMap, onBlockClick, safeBlockMap, spaceId]
    );

    return (
        <>
            {injectStyles ? (
                <style id="blocklify-preview-editable-styles" dangerouslySetInnerHTML={{ __html: editableCss }} />
            ) : null}
            {enableSort ? (
                <PreviewSortableTree
                    blocks={blocks}
                    fieldName={blocksFieldName}
                    sortableBlocksFields={sortableBlocksFields}
                    renderBlock={renderBlock}
                    onBlockReorder={onBlockReorder}
                />
            ) : (
                <PlainBlockList blocks={blocks} parentPath={[]} fieldName={blocksFieldName} renderBlock={renderBlock} />
            )}
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
    /** Fields whose arrays can be reordered. Default: body, blocks, columns, items. */
    sortableBlocksFields?: readonly string[];
};

/**
 * Preview connector for Blocklify. Use this on your frontend’s preview page (e.g. /preview).
 * You only need to define your block components and a blockMap; this component handles:
 * - Receiving draft content from the Blocklify admin via postMessage
 * - Sending block clicks back to the editor
 * - Dashed outlines, a click blink, and drag-and-drop reorder when embedded in the admin iframe
 */
export function BlocklifyPreview({
    blockMap,
    blocksFieldName = "body",
    emptyMessage = "Waiting for content from editor…",
    className,
    sortableBlocksFields,
}: BlocklifyPreviewProps) {
    const {
        blocks,
        isInIframe,
        onBlockClick,
        showEmptyMessage,
        spaceId,
        editableCss,
        peerFocusCss,
        applyBlockReorder,
    } = useBlocklifyPreview(blocksFieldName);

    return (
        <div className={className ?? "min-h-screen bg-surface text-text blocklify-preview-non-interactive"}>
            {peerFocusCss ? <style id="blocklify-peer-focus-styles">{peerFocusCss}</style> : null}
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
                blocksFieldName={blocksFieldName}
                sortable={isInIframe}
                sortableBlocksFields={sortableBlocksFields}
                onBlockReorder={applyBlockReorder}
            />
        </div>
    );
}

/** Default export so both "import BlocklifyPreview from '...'" and "import { BlocklifyPreview } from '...'" work. */
export default BlocklifyPreview;
