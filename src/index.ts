/**
 * @blocklify/preview — install in your frontend / theme to fetch content and enable live preview.
 *
 * @example
 * import {
 *   BlocklifyPreview,
 *   createBlocklifyClient,
 *   type BlocklifyBlockProps,
 * } from "@blocklify/preview";
 */

export {
    createBlocklifyClient,
    type BlocklifyClientConfig,
    type BlocklifyComponent,
    type BlocklifyEntry,
    type BlocklifySiteAsset,
    type BlocklifySiteSettings,
} from "./client.js";

export {
    BlocklifyEditable,
    BlocklifyPreview,
    BlocklifyPreviewRenderer,
    BLOCKLIFY_PEER_FOCUS,
    BLOCKLIFY_PREVIEW_STYLES,
    BLOCKLIFY_SCROLL_TO_BLOCK,
    getDataBlokC,
    PREVIEW_EDITABLE_CSS,
    useBlocklifyPreview,
    type BlocklifyBlock,
    type BlocklifyBlockProps,
    type BlocklifyPreviewProps,
    type BlockMap,
    type DataBlokCPayload,
} from "./preview.js";

export { default } from "./preview.js";

export {
    BlocklifyEntryView,
    blocklifyAssetUrl,
    createStarterBlockMap,
    starterBlockMap,
    type StarterBlockMapOptions,
} from "./starter.js";
