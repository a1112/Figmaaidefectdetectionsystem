# 瓦片系统架构说明

## 📐 一、画布大小确定机制

### 1. 画布尺寸来源
```typescript
// 画布大小 = 容器大小（动态响应）
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    // 画布宽高直接等于容器的实际像素尺寸
    canvas.width = entry.contentRect.width;   // 例如：1920px
    canvas.height = entry.contentRect.height; // 例如：1080px
  }
});
```

**关键点**：
- ✅ 画布大小 ≠ 图像大小
- ✅ 画布大小 = 浏览器容器的实际渲染区域
- ✅ 使用 `ResizeObserver` 监听容器变化，自动调整画布尺寸
- ✅ 响应式设计：窗口调整时画布自动重新计算

---

## 🌍 二、坐标系统架构

### 1. 三层坐标系

```
┌─────────────────────────────────────────────────────┐
│ 屏幕坐标系（Screen Space）                            │
│ - 单位：CSS像素                                        │
│ - 范围：[0, containerWidth] × [0, containerHeight]   │
│ - 用途：鼠标事件、UI交互                               │
└─────────────────────────────────────────────────────┘
                    ↕️ transform (translate + scale)
┌─────────────────────────────────────────────────────┐
│ 世界坐标系（World Space）                             │
│ - 单位：虚拟像素                                       │
│ - 范围：[0, imageWidth] × [0, imageHeight]          │
│ - 用途：图像逻辑尺寸、缺陷坐标                          │
│ - 示例：worldLength=393216, worldWidth=32868        │
└─────────────────────────────────────────────────────┘
                    ↕️ 瓦片网格划分
┌─────────────────────────────────────────────────────┐
│ 瓦片坐标系（Tile Space）                              │
│ - 单位：瓦片索引 [col, row]                           │
│ - 范围：[0, maxCols-1] × [0, maxRows-1]             │
│ - 用途：瓦片请求、LOD级别管理                          │
└─────────────────────────────────────────────────────┘
```

### 2. 坐标转换公式

#### 屏幕坐标 → 世界坐标
```typescript
const visibleRect = {
  x: -transform.x / transform.scale,
  y: -transform.y / transform.scale,
  width: containerSize.width / transform.scale,
  height: containerSize.height / transform.scale,
};
```

#### 世界坐标 → 屏幕坐标
```typescript
ctx.save();
ctx.translate(transform.x, transform.y);  // 平移
ctx.scale(transform.scale, transform.scale);  // 缩放
// 此时绘制的世界坐标会自动映射到屏幕坐标
ctx.restore();
```

---

## 🧩 三、瓦片创建逻辑

### 1. LOD（Level of Detail）等级计算

```typescript
// 根据缩放比例自动计算瓦片等级
level = Math.floor(Math.log2(1 / scale));

// 缩放比例与等级对应关系：
// scale = 1.0    → level = 0  （原始分辨率）
// scale = 0.5    → level = 1  （缩小到50%）
// scale = 0.25   → level = 2  （缩小到25%）
// scale = 0.125  → level = 3  （如果支持）

// 限制等级范围：0-2
level = clamp(level, 0, 2);
```

### 2. 虚拟瓦片尺寸

```typescript
const virtualTileSize = tileSize * Math.pow(2, level);

// 示例：基础瓦片大小 tileSize = 1024
// L0: virtualTileSize = 1024 × 2^0 = 1024px  （高分辨率）
// L1: virtualTileSize = 1024 × 2^1 = 2048px  （中等分辨率）
// L2: virtualTileSize = 1024 × 2^2 = 4096px  （低分辨率）
```

**意义**：
- LOD 等级越高，虚拟瓦片越大，覆盖的世界区域越大
- 每个虚拟瓦片对应一张 1024×1024 的物理图像
- 通过调整虚拟尺寸实现远近景不同精度

### 3. 可见瓦片计算

```typescript
// 步骤1：计算可见区域在瓦片网格中的索引范围
const startCol = Math.floor(viewRect.x / virtualTileSize);
const startRow = Math.floor(viewRect.y / virtualTileSize);
const endCol = Math.floor((viewRect.x + viewRect.width) / virtualTileSize);
const endRow = Math.floor((viewRect.y + viewRect.height) / virtualTileSize);

// 步骤2：计算该等级下的最大瓦片数
const maxCols = Math.ceil(imageWidth / virtualTileSize);
const maxRows = Math.ceil(imageHeight / virtualTileSize);

// 步骤3：裁剪到有效范围
endCol = Math.min(maxCols - 1, endCol);
endRow = Math.min(maxRows - 1, endRow);

// 步骤4：生成瓦片对象
for (let row = startRow; row <= endRow; row++) {
  for (let col = startCol; col <= endCol; col++) {
    const x = col * virtualTileSize;
    const y = row * virtualTileSize;
    
    // 边界瓦片尺寸修正
    const width = (col === maxCols - 1) 
      ? imageWidth - x 
      : virtualTileSize;
    const height = (row === maxRows - 1) 
      ? imageHeight - y 
      : virtualTileSize;
    
    tiles.push({ level, row, col, x, y, width, height });
  }
}
```

---

## 📊 四、实际运行示例

### 场景：上表面图像
```
图像尺寸（世界坐标）：
- imageWidth = 393216px  （长度）
- imageHeight = 16384px  （宽度）

容器尺寸（屏幕坐标）：
- containerWidth = 1600px
- containerHeight = 800px

初始缩放：
- fitScale = min(1600/393216, 800/16384) 
           = min(0.00407, 0.0488) 
           = 0.00407
- 图像完整显示在容器中，自动居中
```

### Level 0（高缩放，scale = 0.5）

```
virtualTileSize = 1024px

可见区域（假设视口在图像中间）：
- viewRect = { x: 196608, y: 8192, width: 3200, height: 1600 }

瓦片计算：
- startCol = 196608 / 1024 = 192
- endCol = (196608 + 3200) / 1024 = 195
- startRow = 8192 / 1024 = 8
- endRow = (8192 + 1600) / 1024 = 9

生成瓦片：
- [192,8], [193,8], [194,8], [195,8]
- [192,9], [193,9], [194,9], [195,9]
- 共 8 个瓦片

后端请求：
- GET /api/images/tile?surface=top&seq_no=123&level=0&tile_x=192&tile_y=8&tile_size=1024
- GET /api/images/tile?surface=top&seq_no=123&level=0&tile_x=193&tile_y=8&tile_size=1024
- ...
```

### Level 2（低缩放，scale = 0.05）

```
virtualTileSize = 4096px

可见区域（全图缩略）：
- viewRect = { x: 0, y: 0, width: 393216, height: 16384 }

瓦片计算：
- maxCols = ceil(393216 / 4096) = 96
- maxRows = ceil(16384 / 4096) = 4
- 生成瓦片：[0,0] 到 [95,3]，共 384 个瓦片

优化：只请求可见区域内的瓦片
- 实际可见：全部 384 个瓦片
- 但每个瓦片覆盖更大区域，总请求数相同
```

---

## 🎯 五、等比例显示机制

### 1. 初始适配

```typescript
// 计算适应容器的最小缩放比例
const fitScale = Math.min(
  containerWidth / imageWidth,
  containerHeight / imageHeight
);

// 居中显示
transform.x = (containerWidth - imageWidth * fitScale) / 2;
transform.y = (containerHeight - imageHeight * fitScale) / 2;
transform.scale = fitScale;
```

### 2. 缩放约束

```typescript
const minScale = fitScale;  // 最小缩放 = 适应容器
const maxScale = 1.0;        // 最大缩放 = 1:1原始像素

// 用户缩放时限制范围
newScale = clamp(newScale, minScale, maxScale);
```

### 3. 瓦片紧密排列

```typescript
// 瓦片位置直接基于虚拟尺寸计算
const x = col * virtualTileSize;
const y = row * virtualTileSize;

// 边界瓦片自动裁剪到图像边界
const width = (col === maxCols - 1) 
  ? imageWidth - x   // 最后一列：填充到图像边缘
  : virtualTileSize;  // 其他列：标准尺寸

// 结果：所有瓦片紧密无缝拼接，无间隙无重叠
```

---

## 🔄 六、坐标转换实例：缺陷绘制

### 缺陷原始坐标
```typescript
const defect = {
  surface: "top",
  imageIndex: 5,      // 第5帧
  x: 2000,            // 帧内X坐标
  y: 300,             // 帧内Y坐标
  width: 100,
  height: 50
};
```

### 转换步骤

```typescript
// Step 1: Frame → Mosaic坐标
const frameWidth = 16384;
const frameHeight = 1024;
const mosaicX = defect.x;                           // 2000
const mosaicY = defect.imageIndex * frameHeight + defect.y;  
                                                     // 5 × 1024 + 300 = 5420

// Step 2: Mosaic → 世界坐标（逆时针旋转90度）
const worldX = mosaicY;     // 5420
const worldY = mosaicX;     // 2000
const worldW = defect.height;  // 50（宽高互换）
const worldH = defect.width;   // 100

// Step 3: 添加表面偏移（如果是bottom表面）
// const worldY = mosaicX + yOffset;  // yOffset = topHeight + gap

// Step 4: 绘制到Canvas（世界坐标自动转屏幕坐标）
ctx.save();
ctx.translate(transform.x, transform.y);
ctx.scale(transform.scale, transform.scale);
ctx.strokeRect(worldX, worldY, worldW, worldH);  // Canvas自动处理坐标转换
ctx.restore();
```

---

## ⚡ 七、性能优化策略

### 1. 按需加载
- ✅ 只请求可见区域内的瓦片
- ✅ LOD自动切换，远景使用低分辨率瓦片

### 2. 缓存机制
```typescript
const tileImageCache = new Map<string, HTMLImageElement>();
const cacheKey = `${surface}-${seqNo}-${level}-${tileX}-${tileY}`;
```

### 3. 去重加载
```typescript
const tileImageLoading = new Set<string>();
if (!tileImageLoading.has(cacheKey)) {
  tileImageLoading.add(cacheKey);
  // 发起请求...
}
```

### 4. 双Canvas架构
```typescript
// backCanvas: 保留上一帧内容（待扩展双LOD混合）
// frontCanvas: 绘制当前帧内容
// 优势：可实现平滑的LOD切换动画
```

---

## 📝 八、关键设计决策

| 问题 | 决策 | 原因 |
|------|------|------|
| 画布大小 | 等于容器大小 | 响应式设计，自动适应窗口 |
| 坐标系统 | 三层分离 | 清晰的职责划分，便于维护 |
| LOD等级 | 0-2三级 | 平衡性能与质量，避免过度细分 |
| 基础瓦片 | 1024×1024 | 符合后端生成规格，标准Web瓦片大小 |
| 缩放范围 | fitScale ~ 1.0 | 防止过度缩小或放大降低体验 |
| 瓦片生成 | 可见区域裁剪 | 减少不必要的请求和绘制 |
| 边界处理 | 自动裁剪到图像边缘 | 避免越界，保证拼接完美 |

---

## 🎓 总结

**瓦片系统核心逻辑**：
1. 📏 **画布 = 容器**：动态响应浏览器窗口
2. 🌍 **世界坐标 = 图像逻辑尺寸**：393216×16384 虚拟像素
3. 🔍 **LOD自动切换**：根据缩放比例选择合适精度
4. 🧩 **按需瓦片生成**：只创建可见区域的瓦片对象
5. 📐 **等比例显示**：fitScale保证初始完整显示
6. 🎯 **紧密排列**：虚拟尺寸计算确保无缝拼接
7. ⚡ **缓存优化**：避免重复加载相同瓦片

这种架构实现了**地图式缩放体验**，类似 Google Maps，但针对工业长带图像优化。
