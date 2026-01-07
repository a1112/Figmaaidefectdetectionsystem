import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clamp, getVisibleTiles, Size, Point, Tile } from './utils';

interface LargeImageViewerProps {
  imageWidth: number;
  imageHeight: number;
  tileSize?: number;
  className?: string;
  maxLevel?: number;
  /**
   * 预加载视口外瓦片的距离（屏幕像素）。例如 400 表示在视口外 400px 内的瓦片也会被请求。
   */
  prefetchMargin?: number;
  /**
   * Initial zoom scale: use 'fit' to fit viewport (default), or a number (e.g. 1 for 100%).
   */
  initialScale?: number | 'fit';
  /**
   * 固定瓦片等级（0/1/2）；如果不传则根据缩放自动计算
   */
  fixedLevel?: number;
  /**
   * 当根据缩放计算出的推荐瓦片等级发生变化时回调（用于上层实现"双图层"或延迟切换 LOD）
   */
  onPreferredLevelChange?: (level: number) => void;
  renderTile?: (
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    tileSize: number,
    scale: number
  ) => void;
  /**
   * 在所有瓦片绘制完成后调用，用于绘制额外的覆盖层（如边框、标注等）
   */
  renderOverlay?: (
    ctx: CanvasRenderingContext2D,
    scale: number
  ) => void;
  /**
   * 聚焦目标：传入一个区域，视图会自动平移和缩放到该区域
   */
  focusTarget?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /**
   * 限制在图像边缘外还能多移动的像素（避免看见超出范围的区域）
   */
  /**
   * Pan Target - keep current zoom, only move the viewport center to the given world position.
   */
  centerTarget?: { x: number; y: number } | null;
  /**
   * Emits the current visible world-rect (for minimap / bird's-eye overlays).
   */
  onViewportChange?: (info: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  panMargin?: number;
  /**
   * 纵向布局时优先按照高度填充视口（避免将宽度过度压缩）
   */
  fitToHeight?: boolean;
  /**
   * 按容器宽度填充视口（锁定宽度比例）
   */
  fitToWidth?: boolean;
  /**
   * 是否锁定缩放（禁用缩放，仅允许平移）
   */
  lockScale?: boolean;
  /**
   * 鼠标滚轮行为：缩放或滚动
   */
  wheelMode?: "zoom" | "scroll";
  /**
   * 强制缩放比例（用于同步锁定）
   */
  forcedScale?: number | null;
  /**
   * 输出当前变换信息（缩放 + 偏移）
   */
  onTransformChange?: (info: { x: number; y: number; scale: number }) => void;
  /**
   * 传入鼠标指针样式（例如 pointer / grab）
   */
  cursor?: string;
  /**
   * 鼠标移动时输出世界坐标
   */
  onPointerMove?: (info: {
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    scale: number;
  }) => void;
  /**
   * 鼠标移出画布
   */
  onPointerLeave?: () => void;
  /**
   * 鼠标按下（返回 true 表示阻止拖拽）
   */
  onPointerDown?: (info: {
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    scale: number;
  }) => boolean | void;
}

export const LargeImageViewer: React.FC<LargeImageViewerProps> = ({
  imageWidth,
  imageHeight,
  tileSize = 256,
  className,
  maxLevel: maxLevelProp,
  prefetchMargin = 0,
  initialScale = 'fit',
  fixedLevel,
  onPreferredLevelChange,
  renderTile,
  renderOverlay,
  focusTarget,
  centerTarget,
  onViewportChange,
  panMargin,
  fitToHeight,
  fitToWidth,
  lockScale = false,
  wheelMode = "zoom",
  forcedScale,
  onTransformChange,
  cursor,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // 双 canvas：底层保留上一轮内容，顶层用于当前绘制（便于后续扩展双 LOD 图层）
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // State stored in refs for high-performance animation loop without re-renders
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef<Point>({ x: 0, y: 0 });
  
  // Container size state
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  
  // Force render for UI overlays (like zoom level text)
  const [, setTick] = useState(0);

  const didInitRef = useRef(false);
  const lastPreferredLevelRef = useRef<number | null>(null);
  const lastViewportRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const lastViewportEmitAtRef = useRef<number>(0);
  const lastTransformEmitAtRef = useRef<number>(0);
  const lastTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  const computePreferredLevel = useCallback(
    (scale: number) => {
      const computedMaxLevel = Math.max(
        0,
        Math.ceil(Math.log2(Math.max(1, imageWidth / tileSize))),
      );
      const maxLevel =
        typeof maxLevelProp === 'number'
          ? Math.max(0, Math.floor(maxLevelProp))
          : computedMaxLevel;
      let preferredLevel = Math.floor(Math.log2(1 / scale));
      if (preferredLevel < 0) preferredLevel = 0;
      if (preferredLevel > maxLevel) preferredLevel = maxLevel;
      return preferredLevel;
    },
    [imageWidth, tileSize, maxLevelProp],
  );

  const clampTransform = useCallback(
    (next: { x: number; y: number; scale: number }) => {
      if (
        panMargin == null ||
        containerSize.width === 0 ||
        containerSize.height === 0
      ) {
        return next;
      }

      const margin = panMargin;
      const cw = containerSize.width;
      const ch = containerSize.height;

      const minX = cw - (imageWidth + margin) * next.scale;
      const maxX = margin * next.scale;
      const minY = ch - (imageHeight + margin) * next.scale;
      const maxY = margin * next.scale;

      const clampRange = (value: number, lower: number, upper: number) => {
        if (lower > upper) {
          const mid = (lower + upper) / 2;
          lower = upper = mid;
        }
        return Math.min(Math.max(value, lower), upper);
      };

      return {
        scale: next.scale,
        x: clampRange(next.x, minX, maxX),
        y: clampRange(next.y, minY, maxY),
      };
    },
    [panMargin, containerSize, imageWidth, imageHeight],
  );

  // Calculate constraints
  const getConstraints = useCallback(() => {
    const cw = containerSize.width;
    const ch = containerSize.height;
    const fitScale = fitToWidth
      ? cw / imageWidth
      : fitToHeight
        ? ch / imageHeight
        : Math.min(cw / imageWidth, ch / imageHeight);
    if (lockScale) {
      return { minScale: fitScale, maxScale: fitScale };
    }
    const maxScale = 1.0;
    const minScale = Math.min(fitScale, maxScale);
    return { minScale, maxScale };
  }, [containerSize, imageWidth, imageHeight, fitToHeight, fitToWidth, lockScale]);

  const ensureInitialized = useCallback(() => {
    if (
      didInitRef.current ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const { minScale, maxScale } = getConstraints();
    const requestedScale = initialScale === 'fit' ? minScale : initialScale;
    const nextScale = clamp(requestedScale, minScale, maxScale);

    transform.current = clampTransform({
      scale: nextScale,
      x: (containerSize.width - imageWidth * nextScale) / 2,
      y: (containerSize.height - imageHeight * nextScale) / 2,
    });
    didInitRef.current = true;

    if (onPreferredLevelChange) {
      const preferredLevel = computePreferredLevel(nextScale);
      lastPreferredLevelRef.current = preferredLevel;
      onPreferredLevelChange(preferredLevel);
    }

    setTick(t => t + 1);
  }, [
    clampTransform,
    computePreferredLevel,
    containerSize,
    getConstraints,
    imageHeight,
    imageWidth,
    initialScale,
    onPreferredLevelChange,
  ]);

  // Main Draw Function
  const draw = useCallback(() => {
    const canvas = frontCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || containerSize.width === 0) return;

    // 透明背景：仅清除内容，不填充底色，让父容器背景透出
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ensureInitialized();

    const { x, y, scale } = transform.current;

    // 计算推荐等级（用于通知上层）
    const computedMaxLevel = Math.max(
      0,
      Math.ceil(Math.log2(Math.max(1, imageWidth / tileSize))),
    );
    const maxLevel =
      typeof maxLevelProp === 'number'
        ? Math.max(0, Math.floor(maxLevelProp))
        : computedMaxLevel;
    const preferredLevel = computePreferredLevel(scale);
    if (onPreferredLevelChange && lastPreferredLevelRef.current !== preferredLevel) {
      lastPreferredLevelRef.current = preferredLevel;
      onPreferredLevelChange(preferredLevel);
    }

    const visibleRect = {
      x: -x / scale,
      y: -y / scale,
      width: containerSize.width / scale,
      height: containerSize.height / scale,
    };

    if (onViewportChange) {
      const now = performance.now();
      const last = lastViewportRef.current;
      const shouldEmit =
        !last ||
        Math.abs(last.x - visibleRect.x) > 0.5 ||
        Math.abs(last.y - visibleRect.y) > 0.5 ||
        Math.abs(last.width - visibleRect.width) > 0.5 ||
        Math.abs(last.height - visibleRect.height) > 0.5;
      if (shouldEmit && now - lastViewportEmitAtRef.current > 80) {
        lastViewportRef.current = visibleRect;
        lastViewportEmitAtRef.current = now;
        onViewportChange(visibleRect);
      }
    }
    if (onTransformChange) {
      const now = performance.now();
      const current = transform.current;
      const last = lastTransformRef.current;
      const shouldEmit =
        !last ||
        Math.abs(last.x - current.x) > 0.5 ||
        Math.abs(last.y - current.y) > 0.5 ||
        Math.abs(last.scale - current.scale) > 0.0005;
      if (shouldEmit && now - lastTransformEmitAtRef.current > 80) {
        lastTransformRef.current = { ...current };
        lastTransformEmitAtRef.current = now;
        onTransformChange({ x: current.x, y: current.y, scale: current.scale });
      }
    }

    const safeScale = Math.max(scale, 1e-6);
    const extra = Math.max(0, prefetchMargin) / safeScale;
    const paddedVisibleRect = extra
      ? {
          x: visibleRect.x - extra,
          y: visibleRect.y - extra,
          width: visibleRect.width + extra * 2,
          height: visibleRect.height + extra * 2,
        }
      : visibleRect;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, imageWidth, imageHeight);

    const tiles = getVisibleTiles(
      paddedVisibleRect,
      tileSize,
      { width: imageWidth, height: imageHeight },
      scale,
      fixedLevel,
      maxLevel,
    );

    tiles.forEach(tile => {
      // Always fill background with dark theme color
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

      if (renderTile) {
        renderTile(ctx, tile, tileSize, scale);
      } else {



        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);

        ctx.fillStyle = '#666';

        ctx.save();
        ctx.translate(tile.x, tile.y);
        const textScale = 1 / scale;
        ctx.scale(textScale, textScale);
        ctx.font = '12px sans-serif';
        ctx.fillText(`L${tile.level} [${tile.col},${tile.row}]`, 8, 20);
        ctx.restore();
      }
    });

    // 在所有瓦片绘制完成后，绘制覆盖层（如表面边框）
    if (renderOverlay) {
      renderOverlay(ctx, scale);
    }

    ctx.restore();
  }, [
    computePreferredLevel,
    containerSize,
    ensureInitialized,
    fixedLevel,
    imageHeight,
    imageWidth,
    maxLevelProp,
    onPreferredLevelChange,
    onTransformChange,
    onViewportChange,
    prefetchMargin,
    renderOverlay,
    renderTile,
    tileSize,
  ]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw]);

  useEffect(() => {
    didInitRef.current = false;
    transform.current = { x: 0, y: 0, scale: 1 };
  }, [imageWidth, imageHeight, initialScale, fitToHeight]);

  // Initial centering
  useEffect(() => {
    if (
      didInitRef.current ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const { minScale, maxScale } = getConstraints();
    const requestedScale =
      initialScale === 'fit' ? minScale : initialScale;
    const nextScale = clamp(requestedScale, minScale, maxScale);

    transform.current = clampTransform({
      scale: nextScale,
      x: (containerSize.width - imageWidth * nextScale) / 2,
      y: (containerSize.height - imageHeight * nextScale) / 2,
    });
    didInitRef.current = true;
    setTick(t => t + 1);
  }, [containerSize, imageWidth, imageHeight, getConstraints, clampTransform, initialScale]);

  useEffect(() => {
    if (!lockScale || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }
    const { minScale } = getConstraints();
    const nextScale = minScale;
    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;
    const centerWorldX = (viewportCenterX - current.x) / current.scale;
    const centerWorldY = (viewportCenterY - current.y) / current.scale;
    const newX = viewportCenterX - centerWorldX * nextScale;
    const newY = viewportCenterY - centerWorldY * nextScale;
    transform.current = clampTransform({ x: newX, y: newY, scale: nextScale });
    setTick(t => t + 1);
  }, [lockScale, containerSize, getConstraints, clampTransform]);

  useEffect(() => {
    if (forcedScale == null || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }
    const nextScale = forcedScale;
    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;
    const centerWorldX = (viewportCenterX - current.x) / current.scale;
    const centerWorldY = (viewportCenterY - current.y) / current.scale;
    const newX = viewportCenterX - centerWorldX * nextScale;
    const newY = viewportCenterY - centerWorldY * nextScale;
    transform.current = clampTransform({ x: newX, y: newY, scale: nextScale });
    setTick(t => t + 1);
  }, [forcedScale, containerSize, clampTransform]);

  // Center Target - keep scale, only pan to a point
  useEffect(() => {
    if (
      !centerTarget ||
      containerSize.width === 0 ||
      containerSize.height === 0
    ) {
      return;
    }

    const current = transform.current;
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;

    const newX = viewportCenterX - centerTarget.x * current.scale;
    const newY = viewportCenterY - centerTarget.y * current.scale;
    transform.current = clampTransform({
      x: newX,
      y: newY,
      scale: current.scale,
    });
    setTick((t) => t + 1);
  }, [centerTarget, clampTransform, containerSize]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        if (backCanvasRef.current) {
          backCanvasRef.current.width = entry.contentRect.width;
          backCanvasRef.current.height = entry.contentRect.height;
        }
        if (frontCanvasRef.current) {
          frontCanvasRef.current.width = entry.contentRect.width;
          frontCanvasRef.current.height = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Interactions - 使用原生 wheel 事件避免被动监听限制
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { minScale, maxScale } = getConstraints();
    const current = transform.current;

    if (wheelMode === "scroll") {
      const next = clampTransform({
        scale: current.scale,
        x: current.x,
        y: current.y - e.deltaY,
      });
      transform.current = next;
      setTick(t => t + 1);
      return;
    }

    if (lockScale) {
      return;
    }

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const factor = Math.exp(delta);

    const newScale = clamp(current.scale * factor, minScale, maxScale);

    const rect = frontCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseVirtualX = (mouseX - current.x) / current.scale;
    const mouseVirtualY = (mouseY - current.y) / current.scale;

    const newX = mouseX - mouseVirtualX * newScale;
    const newY = mouseY - mouseVirtualY * newScale;

    transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
    setTick(t => t + 1);
  }, [getConstraints, clampTransform, wheelMode, lockScale]);

  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const wheelHandler = (event: WheelEvent) => {
      handleWheel(event);
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const resolvePointerInfo = useCallback((clientX: number, clientY: number) => {
    const rect = frontCanvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const current = transform.current;
    const worldX = (screenX - current.x) / current.scale;
    const worldY = (screenY - current.y) / current.scale;
    return {
      worldX,
      worldY,
      screenX,
      screenY,
      scale: current.scale,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const info = resolvePointerInfo(e.clientX, e.clientY);
    if (info && onPointerDown) {
      const handled = onPointerDown(info);
      if (handled) {
        return;
      }
    }
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  }, [onPointerDown, resolvePointerInfo]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    const current = transform.current;
    transform.current = clampTransform({
      scale: current.scale,
      x: current.x + dx,
      y: current.y + dy,
    });
  }, [clampTransform]);

  const handleHoverMove = useCallback(
    (e: React.MouseEvent) => {
      if (!onPointerMove || isDragging.current) return;
      const info = resolvePointerInfo(e.clientX, e.clientY);
      if (info) {
        onPointerMove(info);
      }
    },
    [onPointerMove, resolvePointerInfo],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<Point | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      lastTouchDistance.current = getTouchDistance(e.touches);
      const rect = frontCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        const center = getTouchCenter(e.touches);
        lastTouchCenter.current = { x: center.x - rect.left, y: center.y - rect.top };
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      const dx = e.touches[0].clientX - lastMousePosition.current.x;
      const dy = e.touches[0].clientY - lastMousePosition.current.y;
      lastMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const current = transform.current;
      transform.current = clampTransform({
        scale: current.scale,
        x: current.x + dx,
        y: current.y + dy,
      });
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const rect = frontCanvasRef.current?.getBoundingClientRect();
      if (!rect || lastTouchDistance.current === null || !lastTouchCenter.current) return;

      const { minScale, maxScale } = getConstraints();
      const current = transform.current;

      const factor = dist / lastTouchDistance.current;
      const newScale = clamp(current.scale * factor, minScale, maxScale);

      const centerScreen = getTouchCenter(e.touches);
      const centerX = centerScreen.x - rect.left;
      const centerY = centerScreen.y - rect.top;

      const mouseVirtualX = (centerX - current.x) / current.scale;
      const mouseVirtualY = (centerY - current.y) / current.scale;

      const newX = centerX - mouseVirtualX * newScale;
      const newY = centerY - mouseVirtualY * newScale;

      transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
      lastTouchDistance.current = dist;
      lastTouchCenter.current = { x: centerX, y: centerY };

      setTick(t => t + 1);
    }
  }, [getConstraints, clampTransform]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
  }, []);

  // Focus Target - 自动聚焦到指定区域
  useEffect(() => {
    if (!focusTarget || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }

    const { x, y, width, height } = focusTarget;
    const { minScale, maxScale } = getConstraints();

    // 计算使目标区域完整显示所需的缩放比例（留出10%的边距）
    const targetScaleX = (containerSize.width * 0.9) / width;
    const targetScaleY = (containerSize.height * 0.9) / height;
    const targetScale = Math.min(targetScaleX, targetScaleY);
    
    // 限制在允许的缩放范围内
    const newScale = clamp(targetScale, minScale, maxScale);

    // 计算目标区域的中心点（图像坐标）
    const targetCenterX = x + width / 2;
    const targetCenterY = y + height / 2;

    // 计算视口中心（屏幕坐标）
    const viewportCenterX = containerSize.width / 2;
    const viewportCenterY = containerSize.height / 2;

    // 计算平移量：使目标中心对齐视口中心
    // transform: screenX = imageX * scale + offsetX
    // 我们希望: targetCenterX * newScale + newOffsetX = viewportCenterX
    const newX = viewportCenterX - targetCenterX * newScale;
    const newY = viewportCenterY - targetCenterY * newScale;

    transform.current = clampTransform({ x: newX, y: newY, scale: newScale });
    setTick(t => t + 1);
  }, [focusTarget, containerSize, getConstraints]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full h-full bg-muted transition-colors duration-300 ${className ?? ''}`}
    >
      <canvas
        ref={backCanvasRef}
        className="absolute inset-0 block touch-none cursor-move"
      />
      <canvas
        ref={frontCanvasRef}
        className={`absolute inset-0 block touch-none ${cursor ? "" : "cursor-move"}`}
        style={cursor ? { cursor } : undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e);
          handleHoverMove(e);
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          if (onPointerLeave) onPointerLeave();
        }}
        onTouchStart={(e) => {
          if (e.cancelable && e.nativeEvent.cancelable) e.preventDefault();
          handleTouchStart(e);
        }}
        onTouchMove={(e) => {
          if (e.cancelable && e.nativeEvent.cancelable) e.preventDefault();
          handleTouchMove(e);
        }}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
