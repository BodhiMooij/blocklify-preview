export type BlockPathSegment = { field: string; index: number };

export type BlockPath = BlockPathSegment[];

export const DEFAULT_SORTABLE_BLOCKS_FIELDS = ["body", "blocks", "columns", "items"] as const;

export function getPathKey(path: BlockPath): string {
    if (path.length === 0) return "root";
    return path.map((segment) => `${segment.field}:${segment.index}`).join("/");
}

export function getSortableId(
    block: { type: string; _uid?: string },
    blockPath: BlockPath
): string {
    if (block._uid) return block._uid;
    if (blockPath.length === 0) return `orphan:${block.type}`;
    const parentPath = blockPath.slice(0, -1);
    const leaf = blockPath[blockPath.length - 1];
    return `${getPathKey(parentPath)}:${leaf.field}:${leaf.index}`;
}

export function isSortableBlocksField(fieldName: string, sortableFields: ReadonlySet<string>): boolean {
    return sortableFields.has(fieldName);
}

export function toBlockPathSegment(parentPath: BlockPath, fieldName: string, index: number): BlockPath {
    return [...parentPath, { field: fieldName, index }];
}

export function createSortableFieldsSet(fields?: readonly string[]): ReadonlySet<string> {
    return new Set(fields ?? DEFAULT_SORTABLE_BLOCKS_FIELDS);
}

export function getSortableContextId(parentPath: BlockPath, fieldName: string): string {
    return `${getPathKey(parentPath)}:${fieldName}`;
}

export function getBlocksFieldNameFromPath(path: BlockPath): string {
    if (path.length === 0) return "body";
    return path[path.length - 1].field;
}

function getListKeyForSegment(path: BlockPath, segmentIndex: number): string {
    const segment = path[segmentIndex];
    const parentPath = path.slice(0, segmentIndex);
    return getSortableContextId(parentPath, segment.field);
}

export function getBlocksListKey(blockPath: BlockPath): string {
    if (blockPath.length === 0) {
        return getSortableContextId([], "body");
    }
    const leaf = blockPath[blockPath.length - 1];
    const parentPath = blockPath.slice(0, -1);
    return getSortableContextId(parentPath, leaf.field);
}

export function isSameBlocksList(sourcePath: BlockPath, destinationPath: BlockPath): boolean {
    return getBlocksListKey(sourcePath) === getBlocksListKey(destinationPath);
}

export function adjustDestinationPathAfterRemoval(
    sourcePath: BlockPath,
    destinationPath: BlockPath
): BlockPath {
    const sourceListKey = getBlocksListKey(sourcePath);
    const sourceIndex = sourcePath[sourcePath.length - 1].index;

    return destinationPath.map((segment, segmentIndex) => {
        const listKey = getListKeyForSegment(destinationPath, segmentIndex);
        if (listKey === sourceListKey && segment.index > sourceIndex) {
            return { ...segment, index: segment.index - 1 };
        }
        return segment;
    });
}

export function isGridSortableField(fieldName: string): boolean {
    return fieldName === "columns" || fieldName === "items";
}

const NESTED_SORTABLE_CONTAINER_TYPES = new Set(["columns", "page"]);

/** Block types that stay on the page body and are not dropped into columns or items. */
const ROOT_ONLY_BLOCK_TYPES = new Set(["hero", "columns", "page"]);

export function isNestedSortableContainer(type: string): boolean {
    return NESTED_SORTABLE_CONTAINER_TYPES.has(type.toLowerCase());
}

export function isRootOnlyBlockType(type: string): boolean {
    return ROOT_ONLY_BLOCK_TYPES.has(type.toLowerCase());
}

export function canMoveBlockToDestination(
    blockType: string | undefined,
    sourcePath: BlockPath,
    destinationPath: BlockPath
): boolean {
    const sourceField = getBlocksFieldNameFromPath(sourcePath);
    if (isGridSortableField(sourceField)) {
        return isSameBlocksList(sourcePath, destinationPath);
    }

    if (!blockType) return true;
    const destField = getBlocksFieldNameFromPath(destinationPath);
    if (!isGridSortableField(destField)) return true;
    return !isRootOnlyBlockType(blockType);
}

export function isNestedGridDropPath(path: BlockPath): boolean {
    if (path.length === 0) return false;
    return isGridSortableField(path[path.length - 1].field);
}

/** True when the destination path is inside the block being dragged. */
export function isDropIntoOwnNestedField(sourcePath: BlockPath, destinationPath: BlockPath): boolean {
    if (destinationPath.length <= sourcePath.length) return false;
    for (let i = 0; i < sourcePath.length; i += 1) {
        if (
            sourcePath[i].field !== destinationPath[i].field ||
            sourcePath[i].index !== destinationPath[i].index
        ) {
            return false;
        }
    }
    return true;
}

export function isPathInsideBlock(path: BlockPath, blockPath: BlockPath): boolean {
    if (path.length <= blockPath.length) return false;
    for (let i = 0; i < blockPath.length; i += 1) {
        if (path[i].field !== blockPath[i].field || path[i].index !== blockPath[i].index) {
            return false;
        }
    }
    return true;
}

export function isVirtualPreviewBlock(block: { _uid?: string }): boolean {
    return typeof block._uid === "string" && block._uid.startsWith("virtual-");
}

function getParentArray(
    content: Record<string, unknown>,
    path: BlockPath
): Array<{ type: string; _uid?: string; [key: string]: unknown }> | null {
    if (path.length === 0) return null;
    let current: unknown = content;
    for (let i = 0; i < path.length - 1; i += 1) {
        const segment = path[i];
        if (!current || typeof current !== "object") return null;
        const container = (current as Record<string, unknown>)[segment.field];
        if (!Array.isArray(container) || segment.index < 0 || segment.index >= container.length) {
            return null;
        }
        current = container[segment.index];
    }
    if (!current || typeof current !== "object") return null;
    const leaf = path[path.length - 1];
    const parentArray = (current as Record<string, unknown>)[leaf.field];
    return Array.isArray(parentArray)
        ? (parentArray as Array<{ type: string; _uid?: string; [key: string]: unknown }>)
        : null;
}

/**
 * Move a block inside draft content.
 * Same-list inserts at the hovered index after removal (arrayMove).
 * Cross-list shifts ancestor indexes that sat after the removed source.
 * Returns null when the path or uid does not match.
 */
export function moveBlockInContent(
    content: Record<string, unknown>,
    sourcePath: BlockPath,
    destinationPath: BlockPath
): { next: Record<string, unknown>; movedUid: string } | null {
    if (sourcePath.length === 0 || destinationPath.length === 0) return null;
    const next = structuredClone(content) as Record<string, unknown>;
    const sourceParent = getParentArray(next, sourcePath);
    if (!sourceParent) return null;

    const sourceLeaf = sourcePath[sourcePath.length - 1];
    const sourceBlock = sourceParent[sourceLeaf.index];
    if (!sourceBlock || typeof sourceBlock !== "object") return null;
    const movedUid = sourceBlock._uid;
    if (typeof movedUid !== "string" || movedUid === "") return null;

    const [movedBlock] = sourceParent.splice(sourceLeaf.index, 1);
    if (!movedBlock) return null;

    const effectiveDestination = isSameBlocksList(sourcePath, destinationPath)
        ? destinationPath
        : adjustDestinationPathAfterRemoval(sourcePath, destinationPath);

    const targetParent = getParentArray(next, effectiveDestination);
    if (!targetParent) return null;
    const targetLeaf = effectiveDestination[effectiveDestination.length - 1];
    const clampedIndex = Math.max(0, Math.min(targetLeaf.index, targetParent.length));
    targetParent.splice(clampedIndex, 0, movedBlock);
    return { next, movedUid };
}
