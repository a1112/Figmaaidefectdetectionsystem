export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export interface Tile {
  level: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const getVisibleTiles = (
  viewRect: Rect,
  tileSize: number,
  imageSize: Size,
  currentScale: number,
  forcedLevel?: number,
): Tile[] => {
  // 根据缩放比计算 LOD 等级，并限制在 0~2 级之间，仅保留 L0/L1/L2
  const maxLevel = Math.max(
    0,
    Math.ceil(Math.log2(Math.max(1, imageSize.width / tileSize))),
  );
  let level: number;
  if (typeof forcedLevel === 'number') {
    level = Math.min(Math.max(forcedLevel, 0), maxLevel);
  } else {
    level = Math.floor(Math.log2(1 / currentScale));
    if (level < 0) {
      level = 0;
    }
    if (level > maxLevel) {
      level = maxLevel;
    }
  }

  const virtualTileSize = tileSize * Math.pow(2, level);

  const startCol = Math.floor(Math.max(0, viewRect.x) / virtualTileSize);
  const startRow = Math.floor(Math.max(0, viewRect.y) / virtualTileSize);

  const maxCols = Math.ceil(imageSize.width / virtualTileSize);
  const maxRows = Math.ceil(imageSize.height / virtualTileSize);

  const viewEndCol = Math.floor((viewRect.x + viewRect.width) / virtualTileSize);
  const viewEndRow = Math.floor((viewRect.y + viewRect.height) / virtualTileSize);

  const endCol = Math.min(maxCols - 1, viewEndCol);
  const endRow = Math.min(maxRows - 1, viewEndRow);

  const tiles: Tile[] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const x = col * virtualTileSize;
      const y = row * virtualTileSize;

      const width = col === maxCols - 1 ? imageSize.width - x : virtualTileSize;
      const height = row === maxRows - 1 ? imageSize.height - y : virtualTileSize;

      tiles.push({
        level,
        row,
        col,
        x,
        y,
        width,
        height,
      });
    }
  }
  return tiles;
};
