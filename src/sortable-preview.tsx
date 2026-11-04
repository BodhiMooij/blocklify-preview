"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type Modifier,
} from "@dnd-kit/core";
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    canMoveBlockToDestination,
    createSortableFieldsSet,
    getBlocksFieldNameFromPath,
    getBlocksListKey,
    getPathKey,
    getSortableContextId,
    getSortableId,
    isGridSortableField,
    isNestedGridDropPath,
    isNestedSortableContainer,
    isPathInsideBlock,
    isDropIntoOwnNestedField,
    isSameBlocksList,
    isSortableBlocksField,
    isVirtualPreviewBlock,
    toBlockPathSegment,
    type BlockPath,
} from "./block-path.js";
import type { BlocklifyBlock, BlockReorderPayload, RenderNestedBlocks } from "./types.js";

export type RenderSortableBlock = (args: {
    block: BlocklifyBlock;
    blockPath: BlockPath;
    blockIndex: number;
    renderNestedBlocks: RenderNestedBlocks;
}) => ReactNode;

const BLOCKLIFY_BLOCK_REORDER = "blocklify-block-reorder";

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
    ...transform,
    y: 0,
});

function getSortableStrategy(fieldName: string) {
    // CSS grid columns/items need rect-based deltas so siblings slide left/right
    // (and wrap) instead of the 1D horizontal list heuristic.
    return isGridSortableField(fieldName) ? rectSortingStrategy : verticalListSortingStrategy;
}

/**
 * Column children only collide with siblings. Body blocks ignore nested cells
 * so they reorder around a columns block instead of dropping into it.
 */
const previewCollisionDetection: CollisionDetection = (args) => {
    const collisions = closestCenter(args);
    const activePath = args.active.data.current?.path as BlockPath | undefined;

    if (activePath && isGridSortableField(getBlocksFieldNameFromPath(activePath))) {
        const sourceListKey = getBlocksListKey(activePath);
        return collisions.filter((collision) => {
            const container = args.droppableContainers.find((entry) => entry.id === collision.id);
            const path = container?.data.current?.path as BlockPath | undefined;
            if (!path?.length) return false;
            return getBlocksListKey(path) === sourceListKey;
        });
    }

    return collisions.filter((collision) => {
        const container = args.droppableContainers.find((entry) => entry.id === collision.id);
        const path = container?.data.current?.path as BlockPath | undefined;
        if (!path?.length) return true;
        if (isNestedGridDropPath(path)) return false;
        if (activePath && isPathInsideBlock(path, activePath)) return false;
        return true;
    });
};

function emitBlockReorder(payload: BlockReorderPayload) {
    if (typeof window === "undefined" || window === window.parent) return;
    window.parent.postMessage({ type: BLOCKLIFY_BLOCK_REORDER, ...payload }, "*");
}

function GripIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="currentColor"
            aria-hidden
        >
            <circle cx="4.5" cy="3" r="1.15" />
            <circle cx="9.5" cy="3" r="1.15" />
            <circle cx="4.5" cy="7" r="1.15" />
            <circle cx="9.5" cy="7" r="1.15" />
            <circle cx="4.5" cy="11" r="1.15" />
            <circle cx="9.5" cy="11" r="1.15" />
        </svg>
    );
}

function blockLabel(block: BlocklifyBlock): string {
    const raw = block.type.replace(/_/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function BlockDragOverlayCard({ block }: { block: BlocklifyBlock }) {
    return (
        <div className="blocklify-drag-overlay">
            <GripIcon className="blocklify-drag-overlay__grip" />
            <span className="blocklify-drag-overlay__label">{blockLabel(block)}</span>
        </div>
    );
}

function SortableListDropZone({
    parentPath,
    fieldName,
    itemCount,
    gridLayout = false,
    children,
}: {
    parentPath: BlockPath;
    fieldName: string;
    itemCount: number;
    gridLayout?: boolean;
    children: ReactNode;
}) {
    const listId = getSortableContextId(parentPath, fieldName);
    const { setNodeRef } = useDroppable({
        id: `${listId}:drop-zone`,
        data: {
            path: toBlockPathSegment(parentPath, fieldName, itemCount),
        },
    });

    return (
        <div
            ref={setNodeRef}
            className={
                gridLayout
                    ? "blocklify-sortable-drop-zone blocklify-sortable-drop-zone--grid"
                    : "blocklify-sortable-drop-zone"
            }
        >
            {children}
        </div>
    );
}

function PreviewSortableBlock({
    block,
    blockPath,
    blockIndex,
    lockHorizontal = false,
    renderBlock,
    renderNestedBlocks,
}: {
    block: BlocklifyBlock;
    blockPath: BlockPath;
    blockIndex: number;
    lockHorizontal?: boolean;
    renderBlock: RenderSortableBlock;
    renderNestedBlocks: RenderNestedBlocks;
}) {
    const sortableId = getSortableId(block, blockPath);
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({
            id: sortableId,
            data: { path: blockPath, block },
        });
    // Translate only — rectSortingStrategy also returns scale, which distorts grid cells.
    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
              transition,
          }
        : undefined;
    const isContainer = isNestedSortableContainer(block.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={[
                "blocklify-sortable-row",
                isDragging ? "blocklify-sortable-row--dragging" : null,
                lockHorizontal ? "blocklify-sortable-row--horizontal" : null,
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                ref={setActivatorNodeRef}
                type="button"
                className={
                    isContainer
                        ? "blocklify-drag-handle blocklify-drag-handle--container"
                        : "blocklify-drag-handle"
                }
                {...listeners}
                {...attributes}
                aria-label={isContainer ? "Drag to reorder columns" : "Drag to reorder"}
                title={isContainer ? "Drag to reorder columns" : "Drag to reorder"}
            >
                <GripIcon className="blocklify-drag-handle__icon" />
            </button>
            <div className="blocklify-sortable-row__content">
                {renderBlock({ block, blockPath, blockIndex, renderNestedBlocks })}
            </div>
        </div>
    );
}

function renderBlockList(
    blocks: BlocklifyBlock[],
    parentPath: BlockPath,
    fieldName: string,
    sortableFields: ReadonlySet<string>,
    renderBlock: RenderSortableBlock,
    renderNestedBlocks: RenderNestedBlocks
): ReactNode {
    const pathKey = getPathKey(parentPath);
    const sortable = isSortableBlocksField(fieldName, sortableFields);

    if (!sortable) {
        return (
            <>
                {blocks.map((block, index) => {
                    const blockPath = toBlockPathSegment(parentPath, fieldName, index);
                    const key = block._uid ?? `${pathKey}:${fieldName}:${index}`;
                    return (
                        <div key={key}>
                            {renderBlock({ block, blockPath, blockIndex: index, renderNestedBlocks })}
                        </div>
                    );
                })}
            </>
        );
    }

    const sortableItems = blocks
        .map((block, index) => ({ block, path: toBlockPathSegment(parentPath, fieldName, index) }))
        .filter(({ block }) => !isVirtualPreviewBlock(block))
        .map(({ block, path }) => getSortableId(block, path));
    const gridLayout = isGridSortableField(fieldName);

    const renderedBlocks = blocks.map((block, index) => {
        const blockPath = toBlockPathSegment(parentPath, fieldName, index);
        const key = block._uid ?? `${pathKey}:${fieldName}:${index}`;
        if (isVirtualPreviewBlock(block)) {
            return (
                <div key={key}>{renderBlock({ block, blockPath, blockIndex: index, renderNestedBlocks })}</div>
            );
        }
        return (
            <PreviewSortableBlock
                key={key}
                block={block}
                blockPath={blockPath}
                blockIndex={index}
                lockHorizontal={gridLayout}
                renderBlock={renderBlock}
                renderNestedBlocks={renderNestedBlocks}
            />
        );
    });

    return (
        <SortableListDropZone
            parentPath={parentPath}
            fieldName={fieldName}
            itemCount={sortableItems.length}
            gridLayout={gridLayout}
        >
            <SortableContext
                id={getSortableContextId(parentPath, fieldName)}
                items={sortableItems}
                strategy={getSortableStrategy(fieldName)}
            >
                {renderedBlocks}
            </SortableContext>
        </SortableListDropZone>
    );
}

function resolveDropFromEvent(
    event: DragEndEvent | DragOverEvent
): { sourcePath: BlockPath; destinationPath: BlockPath } | null {
    const activePath = event.active.data.current?.path as BlockPath | undefined;
    let overPath = event.over?.data.current?.path as BlockPath | undefined;
    const activeBlock = event.active.data.current?.block as BlocklifyBlock | undefined;
    if (!event.over || !activePath || !overPath) return null;
    if (activePath.length === 0 || overPath.length === 0) return null;

    const sourceInGrid = isGridSortableField(getBlocksFieldNameFromPath(activePath));

    if (sourceInGrid) {
        if (!isSameBlocksList(activePath, overPath)) return null;
        if (isDropIntoOwnNestedField(activePath, overPath)) return null;
        return { sourcePath: activePath, destinationPath: overPath };
    }

    if (isNestedGridDropPath(overPath)) {
        const lifted = overPath.slice(0, -1);
        if (lifted.length === 0) return null;
        overPath = lifted;
    }

    if (!canMoveBlockToDestination(activeBlock?.type, activePath, overPath)) return null;
    if (isDropIntoOwnNestedField(activePath, overPath)) return null;
    return { sourcePath: activePath, destinationPath: overPath };
}

export function PreviewSortableTree({
    blocks,
    fieldName,
    sortableBlocksFields,
    renderBlock,
    onBlockReorder,
}: {
    blocks: BlocklifyBlock[];
    fieldName: string;
    sortableBlocksFields?: readonly string[];
    renderBlock: RenderSortableBlock;
    /** Updates local draft content. Return the moved uid when the move was applied. */
    onBlockReorder?: (payload: BlockReorderPayload) => string | null;
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const sortableFields = useMemo(
        () => createSortableFieldsSet(sortableBlocksFields),
        [sortableBlocksFields]
    );
    const lastCrossContainerMove = useRef<string | null>(null);
    const [activeBlock, setActiveBlock] = useState<BlocklifyBlock | null>(null);
    const [lockHorizontal, setLockHorizontal] = useState(false);

    const renderNestedBlocks = useCallback<RenderNestedBlocks>(
        function renderNestedBlocks(nestedBlocks, parentPath, nestedFieldName) {
            return renderBlockList(
                nestedBlocks,
                parentPath,
                nestedFieldName,
                sortableFields,
                renderBlock,
                renderNestedBlocks
            );
        },
        [renderBlock, sortableFields]
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const block = event.active.data.current?.block as BlocklifyBlock | undefined;
        const path = event.active.data.current?.path as BlockPath | undefined;
        setActiveBlock(block ?? null);
        setLockHorizontal(!!path && isGridSortableField(getBlocksFieldNameFromPath(path)));
    }, []);

    const clearActive = useCallback(() => {
        setActiveBlock(null);
        setLockHorizontal(false);
    }, []);

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            const resolved = resolveDropFromEvent(event);
            if (!resolved || !onBlockReorder) return;
            const { sourcePath, destinationPath } = resolved;
            if (isSameBlocksList(sourcePath, destinationPath)) {
                lastCrossContainerMove.current = null;
                return;
            }
            const moveKey = `${getBlocksListKey(sourcePath)}->${getBlocksListKey(destinationPath)}:${destinationPath
                .map((segment) => `${segment.field}:${segment.index}`)
                .join("/")}`;
            if (lastCrossContainerMove.current === moveKey) return;
            const movedUid = onBlockReorder({
                blocksFieldName: getBlocksFieldNameFromPath(sourcePath),
                movedUid: (event.active.data.current?.block as BlocklifyBlock | undefined)?._uid ?? "",
                sourcePath,
                destinationPath,
            });
            if (movedUid) lastCrossContainerMove.current = moveKey;
        },
        [onBlockReorder]
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            clearActive();
            lastCrossContainerMove.current = null;
            const resolved = resolveDropFromEvent(event);
            if (!resolved || !onBlockReorder) return;
            const { sourcePath, destinationPath } = resolved;
            const sourceLeaf = sourcePath[sourcePath.length - 1];
            const destLeaf = destinationPath[destinationPath.length - 1];
            if (isSameBlocksList(sourcePath, destinationPath) && sourceLeaf.index === destLeaf.index) {
                return;
            }
            const activeBlockData = event.active.data.current?.block as BlocklifyBlock | undefined;
            const payload: BlockReorderPayload = {
                blocksFieldName: getBlocksFieldNameFromPath(sourcePath),
                movedUid: activeBlockData?._uid ?? "",
                sourcePath,
                destinationPath,
            };
            const movedUid = onBlockReorder(payload);
            if (!movedUid) return;
            emitBlockReorder({ ...payload, movedUid });
        },
        [clearActive, onBlockReorder]
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={previewCollisionDetection}
            modifiers={lockHorizontal ? [restrictToHorizontalAxis] : undefined}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={clearActive}
        >
            {renderBlockList(blocks, [], fieldName, sortableFields, renderBlock, renderNestedBlocks)}
            <DragOverlay dropAnimation={null}>
                {activeBlock ? <BlockDragOverlayCard block={activeBlock} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
