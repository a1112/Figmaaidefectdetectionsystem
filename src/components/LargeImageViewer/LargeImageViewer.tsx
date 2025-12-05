import React, { useEffect, useRef, useState, useCallback } from 'react';
import { clamp, getVisibleTiles, Size, Point, Tile } from './utils';

interface LargeImageViewerProps {
  imageWidth: number;
  imageHeight: number;
  tileSize?: number;
  className?: string;
  renderTile?: (
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    tileSize: number,
    scale: number
  ) => void;
}

export const LargeImageViewer: React.FC<LargeImageViewerProps> = ({
  imageWidth,
  imageHeight,
  tileSize = 256,
  className,
  renderTile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State stored in refs for high-performance animation loop without re-renders
  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMousePosition = useRef<Point>({ x: 0, y: 0 });
  
  // Container size state
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  
  // Force render for UI overlays (like zoom level text)
  const [, setTick] = useState(0);

  // Calculate constraints
  const getConstraints = useCallback(() => {
    const cw = containerSize.width;
    const ch = containerSize.height;
    const fitScale = Math.min(cw / imageWidth, ch / imageHeight);
    const minScale = fitScale;
    const maxScale = 1.0;
    return { minScale, maxScale };
  }, [containerSize, imageWidth, imageHeight]);

  // Main Draw Function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || containerSize.width === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { x, y, scale } = transform.current;

    const visibleRect = {
      x: -x / scale,
      y: -y / scale,
      width: containerSize.width / scale,
      height: containerSize.height / scale,
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, imageWidth, imageHeight);

    const tiles = getVisibleTiles(visibleRect, tileSize, { width: imageWidth, height: imageHeight }, scale);

    tiles.forEach(tile => {
      if (renderTile) {
        renderTile(ctx, tile, tileSize, scale);
      } else {
        ctx.fillStyle = 'white';
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);

        ctx.fillStyle = '#000';

        ctx.save();
        ctx.translate(tile.x, tile.y);
        const textScale = 1 / scale;
        ctx.scale(textScale, textScale);
        ctx.font = '12px sans-serif';
        ctx.fillText(`L${tile.level} [${tile.col},${tile.row}]`, 8, 20);
        ctx.restore();
      }
    });

    ctx.restore();
  }, [containerSize, imageWidth, imageHeight, tileSize, renderTile]);

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

  // Initial centering
  useEffect(() => {
    if (containerSize.width > 0 && transform.current.scale === 1) {
      const { minScale } = getConstraints();
      transform.current = {
        scale: minScale,
        x: (containerSize.width - imageWidth * minScale) / 2,
        y: (containerSize.height - imageHeight * minScale) / 2,
      };
      setTick(t => t + 1);
    }
  }, [containerSize, imageWidth, imageHeight, getConstraints]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
        if (canvasRef.current) {
          canvasRef.current.width = entry.contentRect.width;
          canvasRef.current.height = entry.contentRect.height;
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

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const factor = Math.exp(delta);

    const newScale = clamp(current.scale * factor, minScale, maxScale);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseVirtualX = (mouseX - current.x) / current.scale;
    const mouseVirtualY = (mouseY - current.y) / current.scale;

    const newX = mouseX - mouseVirtualX * newScale;
    const newY = mouseY - mouseVirtualY * newScale;

    transform.current = { x: newX, y: newY, scale: newScale };
    setTick(t => t + 1);
  }, [getConstraints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheelHandler = (event: WheelEvent) => {
      handleWheel(event);
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
    transform.current.x += dx;
    transform.current.y += dy;
  }, []);

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
      const rect = canvasRef.current?.getBoundingClientRect();
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
      transform.current.x += dx;
      transform.current.y += dy;
    } else if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches);
      const rect = canvasRef.current?.getBoundingClientRect();
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

      transform.current = { x: newX, y: newY, scale: newScale };
      lastTouchDistance.current = dist;
      lastTouchCenter.current = { x: centerX, y: centerY };

      setTick(t => t + 1);
    }
  }, [getConstraints]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-100 w-full h-full ${className ?? ''}`}
    >
      <canvas
        ref={canvasRef}
        className="block touch-none cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
