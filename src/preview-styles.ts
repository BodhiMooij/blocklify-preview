/** Class toggled on a block root to replay the focus blink. */
export const PREVIEW_FOCUS_BLINK_CLASS = "blocklify-preview-focus-blink";

export const PREVIEW_FOCUS_BLINK_MS = 400;

/**
 * Editable outline, click blink, and drag-handle styles for the preview iframe.
 * The admin sends this string to the iframe (`blocklify-preview-styles`). Themes do not import a CSS file.
 */
export const PREVIEW_EDITABLE_CSS = `
[data-blocklify-iframe-editable],
[data-blok-uid] {
    cursor: pointer;
    outline: 1px dashed color-mix(in srgb, var(--primary-800, #7a9618) 56%, transparent);
    outline-offset: 0;
    transition: outline-color 0.15s, box-shadow 0.2s ease;
}
[data-blocklify-iframe-editable]:hover,
[data-blok-uid]:hover {
    outline-color: var(--primary-800, #7a9618);
}
@keyframes blocklify-preview-focus-blink {
    0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-800, #7a9618) 50%, transparent);
        outline-color: color-mix(in srgb, var(--primary-800, #7a9618) 95%, transparent);
    }
    50% {
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary, #e8fc9f) 45%, transparent);
        outline-color: var(--primary-800, #7a9618);
    }
    100% {
        box-shadow: none;
        outline-color: color-mix(in srgb, var(--brand-mid, #2d5248) 55%, transparent);
    }
}
.${PREVIEW_FOCUS_BLINK_CLASS} {
    animation: blocklify-preview-focus-blink 0.4s ease;
}
@media (prefers-reduced-motion: reduce) {
    .${PREVIEW_FOCUS_BLINK_CLASS} {
        animation: none;
    }
}
.blocklify-editable--nested-interactive {
    pointer-events: none;
}
.blocklify-editable--nested-interactive > * {
    pointer-events: auto;
}
.blocklify-preview-non-interactive a,
.blocklify-preview-non-interactive button:not(.blocklify-drag-handle) {
    pointer-events: none;
    cursor: default;
}
.blocklify-sortable-row {
    position: relative;
    min-width: 0;
    width: 100%;
}
.blocklify-sortable-row--dragging {
    opacity: 0.5;
    z-index: 20;
}
.blocklify-sortable-row--dragging > .blocklify-sortable-row__content {
    pointer-events: none;
}
.blocklify-sortable-row--horizontal {
    touch-action: pan-y;
}
.blocklify-sortable-drop-zone {
    min-height: 0;
}
.blocklify-sortable-drop-zone--grid {
    display: contents;
}
.blocklify-sortable-row__content {
    position: relative;
    z-index: 0;
    min-width: 0;
    width: 100%;
    height: 100%;
}
.blocklify-sortable-row__content .blocklify-drag-handle {
    z-index: 30;
}
.blocklify-sortable-row > .blocklify-drag-handle {
    z-index: 40;
}
.blocklify-sortable-row > .blocklify-drag-handle--container {
    z-index: 45;
}
.blocklify-drag-handle {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    height: 1.75rem;
    width: 1.75rem;
    padding: 0;
    cursor: grab;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, var(--brand-mid, #2d5248) 14%, transparent);
    background: color-mix(in srgb, #ffffff 92%, var(--primary, #e8fc9f));
    color: color-mix(in srgb, var(--brand-mid, #2d5248) 72%, transparent);
    line-height: 0;
    box-shadow:
        0 1px 2px color-mix(in srgb, var(--brand-darker, #0f2320) 10%, transparent),
        0 0 0 1px color-mix(in srgb, #ffffff 70%, transparent) inset;
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 0.15s ease,
        transform 0.15s ease,
        color 0.15s ease,
        background-color 0.15s ease,
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}
.blocklify-drag-handle__icon {
    display: block;
    flex-shrink: 0;
}
.blocklify-sortable-row:hover > .blocklify-drag-handle,
.blocklify-sortable-row:focus-within > .blocklify-drag-handle,
.blocklify-sortable-row--dragging > .blocklify-drag-handle,
.blocklify-drag-handle:focus-visible {
    opacity: 1;
    pointer-events: auto;
}
.blocklify-sortable-row:hover > .blocklify-drag-handle {
    transform: scale(1.02);
}
.blocklify-drag-handle:hover {
    color: var(--brand-mid, #2d5248);
    background: var(--primary, #e8fc9f);
    border-color: color-mix(in srgb, var(--primary-800, #7a9618) 35%, transparent);
    box-shadow:
        0 2px 8px color-mix(in srgb, var(--brand-darker, #0f2320) 14%, transparent),
        0 0 0 1px color-mix(in srgb, #ffffff 80%, transparent) inset;
}
.blocklify-drag-handle:focus-visible {
    outline: 2px solid var(--primary-800, #7a9618);
    outline-offset: 2px;
}
.blocklify-drag-handle:active,
.blocklify-sortable-row--dragging > .blocklify-drag-handle {
    cursor: grabbing;
    color: var(--brand-dark, #1c3530);
    background: var(--primary-600, #ccee50);
    transform: scale(0.98);
}
html.dark .blocklify-drag-handle {
    border-color: color-mix(in srgb, var(--primary, #e8fc9f) 18%, transparent);
    background: color-mix(in srgb, var(--surface, #161a19) 88%, var(--brand-mid, #2d5248));
    color: color-mix(in srgb, var(--primary, #e8fc9f) 78%, transparent);
    box-shadow:
        0 1px 3px color-mix(in srgb, #000000 35%, transparent),
        0 0 0 1px color-mix(in srgb, #ffffff 6%, transparent) inset;
}
html.dark .blocklify-drag-handle:hover {
    color: var(--brand-darker, #0f2320);
    background: var(--primary, #e8fc9f);
    border-color: color-mix(in srgb, var(--primary, #e8fc9f) 55%, transparent);
}
html.dark .blocklify-drag-handle:active,
html.dark .blocklify-sortable-row--dragging > .blocklify-drag-handle {
    color: var(--brand-darker, #0f2320);
    background: var(--primary-600, #ccee50);
}
@media (hover: none) {
    .blocklify-drag-handle {
        opacity: 0.85;
        pointer-events: auto;
    }
}
.blocklify-drag-overlay {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 16rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border, #d4d4d8);
    background: var(--surface, #ffffff);
    color: var(--text, #18181b);
    box-shadow:
        0 10px 28px color-mix(in srgb, var(--brand-darker, #0f2320) 18%, transparent),
        0 0 0 1px color-mix(in srgb, var(--primary, #e8fc9f) 35%, transparent);
    cursor: grabbing;
    pointer-events: none;
}
.blocklify-drag-overlay__grip {
    flex-shrink: 0;
    color: var(--text-muted, #52525b);
}
.blocklify-drag-overlay__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
}
html.dark .blocklify-drag-overlay {
    border-color: var(--border, #2c3330);
    background: var(--surface, #161a19);
    color: var(--text, #f4f5f4);
}
`;
