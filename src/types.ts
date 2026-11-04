import type { ComponentType, ReactNode } from "react";
import type { BlockPath } from "./block-path.js";

/** Block shape sent by Blocklify (draft content or API). Your block components receive this. */
export type BlocklifyBlock = { type: string; _uid?: string; [k: string]: unknown };

export type RenderNestedBlocks = (
    nestedBlocks: BlocklifyBlock[],
    parentPath: BlockPath,
    fieldName: string
) => ReactNode;

/**
 * Props passed to block components.
 * Spread `BlocklifyEditable` on the root element for click-to-focus in the preview iframe.
 * `renderNestedBlocks` is set while preview drag-and-drop is active so columns and pages can reorder children.
 */
export type BlocklifyBlockProps = {
    block: BlocklifyBlock;
    BlocklifyEditable?: Record<string, unknown>;
    blockMap?: BlockMap;
    blockIndex?: number;
    blockPath?: BlockPath;
    renderNestedBlocks?: RenderNestedBlocks;
};

/** Map block type string → component that receives `{ block, BlocklifyEditable? }`. */
export type BlockMap = Record<string, ComponentType<BlocklifyBlockProps>>;

/** Payload posted to the editor as `blocklify-block-reorder`. */
export type BlockReorderPayload = {
    blocksFieldName: string;
    movedUid: string;
    sourcePath: BlockPath;
    destinationPath: BlockPath;
};
