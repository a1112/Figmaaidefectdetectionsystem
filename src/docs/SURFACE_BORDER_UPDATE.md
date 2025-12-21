# 表面边框绘制优化说明

## ✅ 完成的修改

### 1️⃣ 移除上下表面间隙

**修改前**：
```typescript
const gap = topRot.height > 0 && bottomRot.height > 0 ? 100 : 0;
```

**修改后**：
```typescript
// 上下表面中间无间隙
const gap = 0;
```

**影响**：
- ✅ 上下表面紧密贴合，无任何空隙
- ✅ 世界坐标系总高度 = topHeight + bottomHeight（无额外gap）
- ✅ bottom表面的 yOffset = topRot.height（而非 topRot.height + 100）

---

### 2️⃣ 简化表面判断逻辑

**修改前**：
```typescript
if (centerY < topRot.height && topRot.height > 0) {
  // top表面
} else if (centerY >= topRot.height + gap && bottomRot.height > 0) {
  // bottom表面
} else {
  // 间隙区域：绘制灰色占位网格
  ctx.fillStyle = "#f4f4f4";
  // ...
  return;
}
```

**修改后**：
```typescript
if (centerY < topRot.height && topRot.height > 0) {
  // top表面
} else if (centerY >= topRot.height && bottomRot.height > 0) {
  // bottom表面
} else {
  // 无有效表面数据
  return;
}
```

**优化点**：
- ✅ 移除间隙区域的灰色占位绘制
- ✅ 判断条件更简洁：`centerY >= topRot.height`（无需加gap）
- ✅ 上下表面无缝连接

---

### 3️⃣ 新增表面轮廓边框绘制

#### 架构改进：LargeImageViewer 组件

**新增 `renderOverlay` 回调**：
```typescript
interface LargeImageViewerProps {
  // ... 现有属性
  /**
   * 在所有瓦片绘制完成后调用，用于绘制额外的覆盖层（如边框、标注等）
   */
  renderOverlay?: (
    ctx: CanvasRenderingContext2D,
    scale: number
  ) => void;
}
```

**绘制流程**：
```typescript
// 1. 绘制所有瓦片
tiles.forEach(tile => {
  renderTile(ctx, tile, tileSize, scale);
});

// 2. 绘制覆盖层（边框、标注等）
if (renderOverlay) {
  renderOverlay(ctx, scale);
}

ctx.restore();
```

#### App.tsx 实现表面边框

**上表面边框（蓝色虚线）**：
```typescript
if (topRot.height > 0 && topRot.width > 0) {
  ctx.strokeStyle = "#0088ff";           // 蓝色
  ctx.lineWidth = 3 / scale;             // 固定3像素（不受缩放影响）
  ctx.setLineDash([10 / scale, 5 / scale]);  // 虚线样式
  ctx.strokeRect(0, 0, topRot.width, topRot.height);
  ctx.setLineDash([]);                   // 重置为实线
  
  // 标签："TOP SURFACE"
  ctx.fillStyle = "rgba(0, 136, 255, 0.9)";  // 蓝色半透明背景
  ctx.fillText("TOP SURFACE", 2, 0);         // 白色文字
}
```

**下表面边框（橙色虚线）**：
```typescript
if (bottomRot.height > 0 && bottomRot.width > 0) {
  const bottomY = topRot.height;        // 紧贴上表面下边缘
  ctx.strokeStyle = "#ff6600";          // 橙色
  ctx.lineWidth = 3 / scale;
  ctx.setLineDash([10 / scale, 5 / scale]);
  ctx.strokeRect(0, bottomY, bottomRot.width, bottomRot.height);
  ctx.setLineDash([]);
  
  // 标签："BOTTOM SURFACE"
  ctx.fillStyle = "rgba(255, 102, 0, 0.9)";  // 橙色半透明背景
  ctx.fillText("BOTTOM SURFACE", 2, 0);      // 白色文字
}
```

---

## 🎨 视觉效果

### 边框样式

| 属性 | 上表面 | 下表面 |
|------|--------|--------|
| 颜色 | 🔵 `#0088ff` (蓝色) | 🟠 `#ff6600` (橙色) |
| 线宽 | 3px（固定） | 3px（固定） |
| 线型 | 虚线 `[10, 5]` | 虚线 `[10, 5]` |
| 标签背景 | 蓝色半透明 | 橙色半透明 |
| 标签文字 | 白色粗体 | 白色粗体 |
| 标签位置 | 左上角 (10, 10) | 左上角 (10, bottomY+10) |

### 渲染顺序

```
1. 清除画布
2. 绘制外部边框（imageWidth × imageHeight 的整体边框）
3. 逐瓦片绘制：
   ├── 瓦片图像
   ├── 瓦片边框
   ├── 瓦片信息面板
   └── 瓦片内的缺陷标注
4. 🆕 绘制表面轮廓（renderOverlay）
   ├── 上表面蓝色虚线边框 + 标签
   └── 下表面橙色虚线边框 + 标签
```

**关键点**：
- ✅ 边框在最上层，不会被瓦片覆盖
- ✅ 线宽和虚线间距根据缩放比例调整，保持视觉一致性
- ✅ 标签文字大小不受缩放影响（使用 `1/scale` 反向缩放）

---

## 📐 坐标计算

### 上表面
```typescript
位置：(0, 0)
尺寸：topRot.width × topRot.height
边框矩形：strokeRect(0, 0, topRot.width, topRot.height)
```

### 下表面
```typescript
位置：(0, topRot.height)  ← 紧贴上表面，无gap
尺寸：bottomRot.width × bottomRot.height
边框矩形：strokeRect(0, topRot.height, bottomRot.width, bottomRot.height)
```

### 示例数据
```
上表面（top）：
  - worldWidth = 393216px
  - worldHeight = 16384px
  - 边框：(0, 0) → (393216, 16384)

下表面（bottom）：
  - worldWidth = 393216px
  - worldHeight = 16384px
  - 边框：(0, 16384) → (393216, 32768)

总高度：16384 + 16384 = 32768px（无gap）
```

---

## 🔍 缩放适配

**线宽和虚线的缩放不变性**：
```typescript
ctx.lineWidth = 3 / scale;               // scale=0.1 → 30px; scale=1.0 → 3px
ctx.setLineDash([10 / scale, 5 / scale]); // scale=0.1 → [100, 50]; scale=1.0 → [10, 5]
```

**原理**：
- 当用户缩小（scale < 1）时，世界坐标系变大，需要更粗的线宽才能在屏幕上保持可见
- 通过 `value / scale` 计算，确保边框在任何缩放级别下都保持 3 像素的视觉效果

---

## 🎯 效果对比

### 修改前
```
┌─────────────────────────────────┐
│     Top Surface (16384px)       │
│                                 │
└─────────────────────────────────┘
▓▓▓▓▓▓▓▓▓▓▓ 100px 灰色间隙 ▓▓▓▓▓▓▓▓
┌─────────────────────────────────┐
│   Bottom Surface (16384px)      │
│                                 │
└─────────────────────────────────┘
```

### 修改后
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [TOP SURFACE] 🔵               ┃
┃     Top Surface (16384px)      ┃
┃                                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫ ← 无间隙，紧密贴合
┃ [BOTTOM SURFACE] 🟠            ┃
┃   Bottom Surface (16384px)     ┃
┃                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**改进点**：
- ✅ 上下表面直接连接，无100px灰色间隙
- ✅ 蓝色虚线框清晰标识上表面边界
- ✅ 橙色虚线框清晰标识下表面边界
- ✅ 标签帮助快速识别表面类型
- ✅ 颜色与缺陷绘制的严重程度颜色体系保持一致

---

## 🛠️ 扩展性

**renderOverlay 回调的设计优势**：
1. ✅ **职责分离**：瓦片绘制与覆盖层绘制解耦
2. ✅ **易于扩展**：可以轻松添加更多覆盖层元素
   - 比例尺
   - 缺陷统计热力图
   - 测量工具
   - 坐标网格
3. ✅ **性能友好**：覆盖层在瓦片绘制完成后统一绘制，避免重复计算
4. ✅ **灵活配置**：可以通过props控制是否显示边框、边框样式等

**未来可扩展的覆盖层示例**：
```typescript
const renderOverlay = (ctx, scale) => {
  // 1. 表面轮廓
  drawSurfaceBorders(ctx, scale);
  
  // 2. 坐标网格
  if (showGrid) {
    drawCoordinateGrid(ctx, scale);
  }
  
  // 3. 比例尺
  if (showScale) {
    drawScaleBar(ctx, scale);
  }
  
  // 4. 测量工具
  if (measurementPoints.length > 0) {
    drawMeasurements(ctx, scale, measurementPoints);
  }
};
```

---

## 📊 总结

| 改进项 | 技术实现 | 视觉效果 |
|--------|----------|----------|
| 移除间隙 | `gap = 0` | 上下表面紧密贴合 |
| 简化逻辑 | 移除间隙区域判断 | 代码更简洁清晰 |
| 表面边框 | `renderOverlay` 回调 | 蓝色/橙色虚线边框 |
| 表面标签 | 左上角半透明标签 | 快速识别表面类型 |
| 缩放适配 | `value / scale` 计算 | 任何缩放级别保持清晰 |

现在图像界面可以清晰地展示上下表面的完整轮廓，同时保持紧凑的布局！🎉
