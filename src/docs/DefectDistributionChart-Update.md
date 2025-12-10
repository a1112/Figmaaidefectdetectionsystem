# 缺陷分布图优化 - 详细说明

## 📋 需求概述

优化缺陷分布图的显示效果，支持长钢板的横向滚动浏览，并添加刻度标记。

---

## ✅ 已完成的改进

### 1️⃣ 画布宽度动态计算

**计算公式**：
```typescript
宽度 = 高度 × (单图宽度 / 单图高度) × 图像数量
```

**实现代码**：
```typescript
const calculatePlateWidth = (meta: SurfaceImageInfo | undefined): number => {
  if (!meta) return 360; // 默认宽度
  const frameCount = meta.frame_count || 1;
  const imageWidth = meta.image_width || 1;
  const imageHeight = meta.image_height || 1;
  return (plateHeight * imageWidth / imageHeight) * frameCount;
};
```

**特点**：
- ✅ 固定高度120px
- ✅ 根据图像真实比例动态计算宽度
- ✅ 按帧数量等比例绘制
- ✅ 支持超长钢板的显示

---

### 2️⃣ 横向滚动支持

**容器修改**：
```typescript
// 修改前：垂直滚动
<div className="flex-1 overflow-y-auto overflow-x-hidden p-4">

// 修改后：横向滚动
<div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
```

**布局保持**：
```typescript
<div className="flex flex-col gap-0 h-full">
  {renderPlate("top", plateHeight)}
  {renderPlate("bottom", plateHeight)}
</div>
```

**效果**：
- ✅ 当画布宽度超过父容器时，自动显示横向滚动条
- ✅ 上下表面仍然垂直排列
- ✅ 无间隙显示

---

### 3️⃣ 右上角图像数量标签

**位置**：每个表面的右上角

**实现**：
```typescript
<div className="absolute -top-4 right-0 text-[10px] text-primary/80 font-mono bg-background/80 px-1.5 py-0.5 rounded">
  {frameCount} frames
</div>
```

**样式**：
- 字体：Monospace 10px
- 颜色：主题色/80% 透明度
- 背景：半透明背景
- 位置：绝对定位在右上角

---

### 4️⃣ 帧刻度线

**位置**：画布内部，垂直线

**实现**：
```typescript
<div className="absolute inset-0 opacity-20 pointer-events-none">
  {Array.from({ length: frameCount + 1 }).map((_, i) => {
    const position = (i / frameCount) * 100;
    return (
      <div
        key={`frame-${surf}-${i}`}
        className="absolute h-full border-l border-muted-foreground"
        style={{ left: `${position}%` }}
      />
    );
  })}
</div>
```

**特点**：
- ✅ 根据帧数量动态生成刻度线
- ✅ 等间距分布
- ✅ 半透明显示（20%）
- ✅ 不影响鼠标事件

---

### 5️⃣ 上下刻度尺

**位置**：
- **上刻度尺**：上表面上方
- **下刻度尺**：下表面下方

**实现**：
```typescript
const renderRuler = (position: "top" | "bottom") => (
  <div 
    className="relative w-full h-4 bg-muted/20 border-x-2 border-foreground/60"
    style={{ width: plateWidth }}
  >
    {Array.from({ length: frameCount + 1 }).map((_, i) => {
      const positionPercent = (i / frameCount) * 100;
      return (
        <div
          key={`ruler-${position}-${surf}-${i}`}
          className="absolute h-full border-l border-muted-foreground/40"
          style={{ left: `${positionPercent}%` }}
        >
          <div className={`absolute text-[9px] text-muted-foreground font-mono ${
            position === "top" ? "bottom-0" : "top-0"
          } left-0 transform -translate-x-1/2`}>
            {i}
          </div>
        </div>
      );
    })}
  </div>
);
```

**渲染条件**：
```typescript
{/* 上刻度尺 - 仅在上表面显示 */}
{surf === "top" && renderRuler("top")}

{/* 下刻度尺 - 仅在下表面显示 */}
{surf === "bottom" && renderRuler("bottom")}
```

**刻度标签**：
- 数字：0, 1, 2, ..., frameCount
- 字体：Monospace 9px
- 位置：居中于刻度线
- 对齐：上刻度在下方，下刻度在上方

---

## 🎨 视觉效果

### 布局结构
```
┌─────────────────────────────────────────┐
│  [滚动条如果需要]                        │
├─────────────────────────────────────────┤
│  ┌─ 上刻度尺 ──────────────────────┐   │
│  │ 0    1    2    3    4    5    6 │   │
│  └────────────────────────────────┘   │
│  ┌─ TOP SURFACE ────── [6 frames]─┐   │
│  │                                 │   │
│  │  [瓦片图像 + 缺陷标注]          │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  ┌─ BOTTOM SURFACE ─── [6 frames]─┐   │
│  │                                 │   │
│  │  [瓦片图像 + 缺陷标注]          │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  ┌─ 下刻度尺 ──────────────────────┐   │
│  │ 0    1    2    3    4    5    6 │   │
│  └────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🔧 技术细节

### 宽度计算示例

假设：
- `plateHeight` = 120px
- `imageWidth` = 1600px
- `imageHeight` = 400px
- `frameCount` = 10

计算：
```
plateWidth = 120 × (1600 / 400) × 10
          = 120 × 4 × 10
          = 4800px
```

**结果**：超过普通屏幕宽度，自动显示横向滚动条。

---

### 刻度位置计算

对于第 `i` 个刻度（i = 0 到 frameCount）：
```typescript
position = (i / frameCount) × 100%
```

示例（frameCount = 6）：
- 刻度 0: 0%
- 刻度 1: 16.67%
- 刻度 2: 33.33%
- 刻度 3: 50%
- 刻度 4: 66.67%
- 刻度 5: 83.33%
- 刻度 6: 100%

---

### 瓦片图像加载

**坐标转换**：
- 数据库存储：纵向堆叠（按帧向下）
- 显示方向：横向展开（按帧向右）

**映射关系**：
```typescript
// 长度方向（数据库Y → 显示X）
displayX = (y_global / totalLength) × plateWidth

// 宽度方向（数据库X → 显示Y，0点在左下）
displayY = (1 - x_normalized) × plateHeight
```

---

## 📊 对比总结

| 功能点 | 修改前 | 修改后 |
|--------|--------|--------|
| 画布宽度 | 固定360px | 动态计算（高度×比例×帧数） |
| 滚动方向 | 垂直 | 横向 |
| 图像数量标签 | 无 | 右上角显示 |
| 帧刻度线 | 10%网格 | 实际帧刻度 |
| 上刻度尺 | 无 | 有（上表面上方） |
| 下刻度尺 | 无 | 有（下表面下方） |
| 刻度标签 | 无 | 0, 1, 2, ... frameCount |

---

## 🎯 用户体验

### 短钢板（帧数少）
- 画布宽度适中
- 无需滚动即可查看全部
- 刻度标签清晰可见

### 长钢板（帧数多）
- 画布宽度超长
- 横向滚动条自动显示
- 刻度帮助定位当前位置
- 右上角标签显示总帧数

### 精确定位
- 通过刻度尺快速识别帧位置
- 缺陷位置对应刻度编号
- 方便记录和追踪

---

## 🔍 相关文件

- `/components/DefectDistributionChart.tsx` - 主组件
- `/components/pages/DefectsPage.tsx` - 页面集成
- `/components/DefectNavigationBar.tsx` - 导航控制栏
- `/src/api/types.ts` - 类型定义
- `/src/api/client.ts` - 瓦片图像加载

---

## ✨ 额外优化

### 性能优化
- ✅ 使用 `useMemo` 缓存过滤后的缺陷列表
- ✅ 限制绘制数量（最多1000个缺陷）
- ✅ 瓦片按需加载

### 响应式设计
- ✅ 固定高度保证一致性
- ✅ 动态宽度适应不同数据
- ✅ 滚动条自动显示/隐藏

### 可访问性
- ✅ 刻度数字清晰易读
- ✅ 图像数量一目了然
- ✅ 缺陷点击交互友好

---

📅 **更新时间**: 2025-12-09  
✅ **状态**: 已完成并测试
