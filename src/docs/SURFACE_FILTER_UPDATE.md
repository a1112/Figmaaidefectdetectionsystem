# 表面过滤器联动优化说明

## ✅ 完成的功能

实现了图像界面与表面过滤器的联动，使得：
- 点击 **"上表面"** 时，只渲染上表面及其缺陷
- 点击 **"下表面"** 时，只渲染下表面及其缺陷  
- 点击 **"全部"** 时，同时渲染上下两个表面及其缺陷

---

## 🎯 核心改动

### 1️⃣ 新增表面渲染控制变量

```typescript
// 🎯 根据 surfaceFilter 决定渲染哪些表面
const shouldRenderTop = surfaceFilter === "all" || surfaceFilter === "top";
const shouldRenderBottom = surfaceFilter === "all" || surfaceFilter === "bottom";
```

**状态说明**：
| surfaceFilter | shouldRenderTop | shouldRenderBottom |
|---------------|-----------------|-------------------|
| `"all"` | ✅ true | ✅ true |
| `"top"` | ✅ true | ❌ false |
| `"bottom"` | ❌ false | ✅ true |

---

### 2️⃣ 动态调整世界坐标系尺寸

**修改前**（固定渲染两个表面）：
```typescript
const worldLength = Math.max(topRot.width, bottomRot.width);
const worldWidth = topRot.height + bottomRot.height + gap;
```

**修改后**（根据过滤器动态调整）：
```typescript
const worldLength = Math.max(
  shouldRenderTop ? topRot.width : 0,
  shouldRenderBottom ? bottomRot.width : 0,
);
const worldWidth =
  (shouldRenderTop ? topRot.height : 0) +
  (shouldRenderBottom ? bottomRot.height : 0) +
  (shouldRenderTop && shouldRenderBottom ? gap : 0);
```

**效果**：
- **全部表面**：worldWidth = topHeight + bottomHeight
- **仅上表面**：worldWidth = topHeight
- **仅下表面**：worldWidth = bottomHeight

---

### 3️⃣ 修改瓦片表面判断逻辑

**新增有效顶部高度计算**：
```typescript
// 计算当前有效的顶部高度（根据过滤器）
const effectiveTopHeight = shouldRenderTop ? topRot.height : 0;

if (
  shouldRenderTop &&
  centerY < effectiveTopHeight &&
  topRot.height > 0
) {
  surface = "top";
  yOffset = 0;
  // ...
} else if (
  shouldRenderBottom &&
  centerY >= effectiveTopHeight &&
  bottomRot.height > 0
) {
  surface = "bottom";
  yOffset = effectiveTopHeight;
  // ...
} else {
  // 无有效表面数据或被过滤器隐藏
  return;
}
```

**关键点**：
- ✅ 增加 `shouldRenderTop` 和 `shouldRenderBottom` 前置检查
- ✅ 下表面的 yOffset 使用 `effectiveTopHeight`（当仅显示下表面时为0）
- ✅ 被过滤器隐藏的表面直接 return，不渲染瓦片

---

### 4️⃣ 边框绘制遵循过滤器

**上表面边框**：
```typescript
if (shouldRenderTop && topRot.height > 0 && topRot.width > 0) {
  // 绘制蓝色虚线边框和标签
}
```

**下表面边框**：
```typescript
if (shouldRenderBottom && bottomRot.height > 0 && bottomRot.width > 0) {
  const bottomY = shouldRenderTop ? topRot.height : 0;  // 动态调整位置
  // 绘制橙色虚线边框和标签
}
```

**位置计算**：
- **全部表面**：bottom起始Y = topRot.height
- **仅下表面**：bottom起始Y = 0（填充整个视图）

---

## 📐 坐标系变化示例

### 场景1：全部表面 (surfaceFilter = "all")

```
┏━━━━━━━━━━━━━━━━━━━━━┓
┃ [TOP SURFACE] 🔵    ┃  Y: 0 ~ 16384
┃                     ┃
┣━━━━━━━━━━━━━━━━━━━━━┫  
┃ [BOTTOM SURFACE] 🟠 ┃  Y: 16384 ~ 32768
┃                     ┃
┗━━━━━━━━━━━━━━━━━━━━━┛
worldWidth = 16384 + 16384 = 32768
effectiveTopHeight = 16384
```

---

### 场景2：仅上表面 (surfaceFilter = "top")

```
┏━━━━━━━━━━━━━━━━━━━━━┓
┃ [TOP SURFACE] 🔵    ┃  Y: 0 ~ 16384
┃                     ┃
┃                     ┃
┃                     ┃
┗━━━━━━━━━━━━━━━━━━━━━┛
worldWidth = 16384
effectiveTopHeight = 16384
（下表面不渲染，瓦片直接return）
```

---

### 场景3：仅下表面 (surfaceFilter = "bottom")

```
┏━━━━━━━━━━━━━━━━━━━━━┓
┃ [BOTTOM SURFACE] 🟠 ┃  Y: 0 ~ 16384
┃                     ┃
┃                     ┃
┃                     ┃
┗━━━━━━━━━━━━━━━━━━━━━┛
worldWidth = 16384
effectiveTopHeight = 0
bottomY = 0（边框从0开始）
（上表面不渲染，瓦片直接return）
```

---

## 🎯 瓦片渲染逻辑

### 全部表面模式

**瓦片中心Y坐标判断**：
```
centerY = 5000  → surface = "top"   (centerY < 16384)
centerY = 20000 → surface = "bottom" (centerY >= 16384)
```

**瓦片请求**：
- Top表面：请求 `/api/images/frame?surface=top&...`
- Bottom表面：请求 `/api/images/frame?surface=bottom&...`

---

### 仅上表面模式

**瓦片中心Y坐标判断**：
```
centerY = 5000  → surface = "top"   (shouldRenderTop && centerY < 16384)
centerY = 20000 → return            (不满足任何条件，跳过)
```

**瓦片请求**：
- ✅ Top表面：请求 `/api/images/frame?surface=top&...`
- ❌ Bottom表面：不渲染，直接return

---

### 仅下表面模式

**瓦片中心Y坐标判断**：
```
centerY = 5000  → surface = "bottom" (shouldRenderBottom && centerY >= 0)
```

**瓦片请求**：
- ❌ Top表面：不渲染，直接return
- ✅ Bottom表面：请求 `/api/images/frame?surface=bottom&...`

**关键**：
- effectiveTopHeight = 0，所以 bottom 从 Y=0 开始填充整个视图
- yOffset = 0，mosaic坐标到世界坐标的转换无需偏移

---

## 🎨 缺陷绘制联动

### 自动过滤机制

缺陷绘制代码中已有表面过滤：
```typescript
const visibleDefects = defectsForDrawing.filter((d: Defect) => {
  if (d.surface !== surface) return false;  // ← 自动遵循表面过滤器
  // ...
});
```

**效果**：
- **全部表面**：绘制 top 和 bottom 表面的缺陷
- **仅上表面**：仅绘制 top 表面的缺陷
- **仅下表面**：仅绘制 bottom 表面的缺陷

---

## 🔄 用户交互流程

### 操作步骤

1️⃣ **用户点击表面过滤器按钮**
```
缺陷界面 → 表面过滤器：[全部] [上表面] [下表面]
               ↓
        setSurfaceFilter("top")
               ↓
        状态更新触发重渲染
```

2️⃣ **图像界面响应过滤器变化**
```
图像界面监听 surfaceFilter 变化
    ↓
重新计算：
  - shouldRenderTop
  - shouldRenderBottom
  - worldWidth
  - effectiveTopHeight
    ↓
重新渲染画布
```

3️⃣ **瓦片系统自动适配**
```
LargeImageViewer 重新计算可见瓦片
    ↓
renderTile() 逐瓦片判断表面
    ↓
- 符合过滤器：加载并绘制瓦片
- 不符合：直接 return 跳过
    ↓
renderOverlay() 绘制边框
```

---

## 📊 性能优化

### 按需渲染

**全部表面**：
- 瓦片数量：100%（上 + 下）
- 网络请求：100%

**仅上表面**：
- 瓦片数量：50%（仅上）
- 网络请求：50% ✅ 节省带宽

**仅下表面**：
- 瓦片数量：50%（仅下）
- 网络请求：50% ✅ 节省带宽

---

## 🎯 效果对比

### 修改前
```
表面过滤器：[全部] [上表面] [下表面]
                      ↓
            仅影响"缺陷界面"
            图像界面始终显示上下表面
```

### 修改后
```
表面过滤器：[全部] [上表面] [下表面]
                      ↓
            同时影响"缺陷界面"和"图像界面"
            图像界面动态显示选中的表面
```

**改进点**：
- ✅ **一致性**：缺陷界面和图像界面的表面过滤保持同步
- ✅ **性能**：仅渲染需要的表面，减少50%瓦片加载
- ✅ **可用性**：用户可以聚焦查看单个表面的图像和缺陷
- ✅ **灵活性**：随时切换表��查看模式，实时响应

---

## 🛠️ 技术亮点

### 响应式坐标系

**世界坐标系根据过滤器自适应**：
- 全部：32768px 高度（两个表面）
- 单表面：16384px 高度（一个表面）

**视口自动居中**：
- LargeImageViewer 的初始缩放和居中逻辑自动适配新的 worldWidth
- 用户切换表面时，视图平滑过渡

---

### 零配置联动

**无需额外UI控制**：
- 复用现有的 `surfaceFilter` 状态
- 图像界面自动监听并响应变化
- 无需添加重复的表面切换按钮

---

## 📝 总结

| 功能点 | 实现方式 | 效果 |
|--------|----------|------|
| 表面过滤联动 | `shouldRenderTop/Bottom` | 图像界面遵循过滤器 |
| 动态坐标系 | 按需计算 `worldWidth` | 视图尺寸自适应 |
| 瓦片过滤 | `effectiveTopHeight` | 被隐藏表面不渲染 |
| 边框适配 | 条件渲染 + 动态位置 | 边框仅绘制可见表面 |
| 缺陷过滤 | 现有逻辑自动生效 | 缺陷仅显示在对应表面 |
| 性能优化 | 按需加载瓦片 | 减少50%网络请求 |

现在图像界面可以灵活地显示单个或全部表面，与缺陷界面的表面过滤器完美联动！🎉
