# 🚀 生产模式接口适配 - 集成指南

## ✅ 已完成的工作

### 1. 数据类型更新
- ✅ 在 `Defect` 接口中添加了 `imageIndex` 字段
- ✅ 添加了状态变量：`selectedDefectId`, `imageViewMode`
- ✅ 更新了缺陷数据映射逻辑

### 2. 新组件创建
- ✅ 创建了 `/components/DefectImageView.tsx` 组件
  - 支持大图/单缺陷两种显示模式
  - 自动从API加载图像
  - 支持缺陷选中功能
  - 完整的加载和错误状态处理

### 3. API 集成
- ✅ 集成了帧图像API: `/api/images/frame`
- ✅ 集成了缺陷裁剪API: `/api/images/defect/{id}`
- ✅ 使用现有的缺陷列表API: `/api/ui/defects/{seq_no}`

---

## 🔧 需要您完成的集成步骤

### 步骤 1：替换缺陷显示区域代码

**文件：** `App.tsx`
**位置：** 约第 1179-1212 行
**查找：** 包含 `<UploadZone onImageUpload={handleImageUpload} />` 的区域

**操作：**
1. 打开 `/DefectViewCode.tsx` 查看完整的替换代码
2. 在 App.tsx 中找到缺陷视图的容器 `<div className="flex-1 bg-card border border-border p-1 relative min-h-[300px] flex flex-col">`
3. 替换整个 div 的内容（包括子元素）为 DefectViewCode.tsx 中的代码

**识别标志：**
- 查找 `CAM-01 LIVE FEED` 标签
- 查找 `<UploadZone onImageUpload={handleImageUpload} />`
- 查找 `<DetectionResult`

---

### 步骤 2：更新缺陷列表组件

**文件：** `App.tsx`
**位置：** 约第 1248 行
**查找：** `<DefectList defects={filteredDefects}`

**原代码：**
```tsx
<DefectList 
  defects={filteredDefects} 
  isDetecting={isDetecting} 
  surface={surfaceFilter} 
  defectColors={defectColors} 
/>
```

**新代码：**
```tsx
<DefectList 
  defects={filteredDefects} 
  isDetecting={isDetecting} 
  surface={surfaceFilter} 
  defectColors={defectColors}
  selectedDefectId={selectedDefectId}
  onDefectSelect={setSelectedDefectId}
/>
```

---

### 步骤 3：更新 DefectList 组件使其可选中

**文件：** `/components/DefectList.tsx`

**3.1 更新接口定义：**
```typescript
interface DefectListProps {
  defects: Defect[];
  isDetecting: boolean;
  surface: string;
  defectColors: any;
  selectedDefectId?: string | null;        // 新增
  onDefectSelect?: (id: string) => void;   // 新增
}

export function DefectList({ 
  defects, 
  isDetecting, 
  surface, 
  defectColors,
  selectedDefectId,         // 新增
  onDefectSelect           // 新增
}: DefectListProps) {
```

**3.2 更新每个缺陷项：**

在缺陷列表中，找到每个缺陷项的渲染代码，添加点击事件和高亮样式：

```tsx
<div
  key={defect.id}
  onClick={() => onDefectSelect?.(defect.id)}    // 新增
  className={`p-2 border rounded transition-all cursor-pointer ${    // 修改
    selectedDefectId === defect.id                                   // 新增
      ? 'border-primary bg-primary/10 shadow-lg'                     // 新增
      : 'border-border hover:border-primary/50'                       // 新增
  }`}
>
  {/* 缺陷内容保持不变 */}
</div>
```

---

### 步骤 4：隐藏生产模式的上传按钮

**文件：** `App.tsx`
**位置：** 约第 840-890 行
**查找：** `上传缺陷图像` 和 `上传钢板图像` 按钮

**原代码：**
```tsx
<div className="p-2 bg-muted/20 border-t border-border space-y-1 shrink-0">
  <label className="block">
    {/* 上传缺陷图像 */}
  </label>
  <label className="block">
    {/* 上传钢板图像 */}
  </label>
</div>
```

**新代码：**
```tsx
{/* 上传按钮区域 - 仅在开发模式显示 */}
{!env.isProduction() && (
  <div className="p-2 bg-muted/20 border-t border-border space-y-1 shrink-0">
    <label className="block">
      {/* 上传缺陷图像 */}
    </label>
    <label className="block">
      {/* 上传钢板图像 */}
    </label>
  </div>
)}
```

---

### 步骤 5：更新 DefectList 组件中的数据来源（生产模式）

**文件：** `App.tsx`
**位置：** 约第 1243-1252 行

**原代码：**
```tsx
const filteredDefects = (detectionResult?.defects || []).filter(d => 
  (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
  selectedDefectTypes.includes(d.type)
);
```

**新代码：**
```tsx
const filteredDefects = (env.isProduction() ? plateDefects : (detectionResult?.defects || [])).filter(d => 
  (surfaceFilter === 'all' || d.surface === surfaceFilter) &&
  selectedDefectTypes.includes(d.type)
);
```

**说明：** 生产模式使用 `plateDefects`，开发模式使用 `detectionResult?.defects`

---

## 🧪 测试清单

### 开发模式测试
```bash
npm run dev
# 在应用中切换到「开发模式」
```

- [ ] 可以看到上传按钮
- [ ] 可以上传缺陷图像
- [ ] 可以上传钢板图像  
- [ ] 显示 UploadZone 拖放区域
- [ ] 显示 CAM-01 LIVE FEED 标签
- [ ] 缺陷列表显示上传图像的缺陷
- [ ] 缺陷类型过滤器工作正常

### 生产模式测试
```bash
# 终端 1: 启动后端
python run_server.bat

# 终端 2: 启动前端
npm run dev
# 在应用中切换到「生产模式」
```

**基础功能：**
- [ ] 不显示上传按钮
- [ ] 显示「缺陷检测视图」标签
- [ ] 显示「大图/单缺陷」切换按钮
- [ ] 未选择钢板时显示提示「请选择钢板查看缺陷」

**钢板选择：**
- [ ] 选择一个有缺陷的钢板
- [ ] 自动加载缺陷列表
- [ ] 显示缺陷数量

**大图模式：**
- [ ] 点击「大图」按钮
- [ ] 显示完整的钢板图像
- [ ] 在图像上绘制缺陷框
- [ ] 缺陷框颜色根据严重程度显示
- [ ] 显示缺陷类型标签

**单缺陷模式：**
- [ ] 点击「单缺陷」按钮
- [ ] 自动选中第一个缺陷
- [ ] 显示裁剪后的缺陷图像
- [ ] 显示缺陷详细信息（类型、严重程度、位置、尺寸、置信度）

**缺陷列表交互：**
- [ ] 点击缺陷列表中的某个缺陷
- [ ] 该缺陷高亮显示（蓝色边框）
- [ ] 单缺陷模式下自动切换到该缺陷图像

**表面过滤：**
- [ ] 点击「上表」按钮
- [ ] 只显示上表面的缺陷
- [ ] 点击「下表」按钮
- [ ] 只显示下表面的缺陷
- [ ] 点击「ALL」按钮
- [ ] 显示所有表面的缺陷

---

## 📊 API 调用流程

### 1. 选择钢板
```
用户点击钢板 → setSelectedPlateId() 
  → useEffect 触发
  → getDefects(seq_no) 调用 API
  → GET /api/ui/defects/{seq_no}
  → 返回缺陷列表
  → setPlateDefects(mapped)
```

### 2. 加载图像（大图模式）
```
plateDefects 更新 → DefectImageView useEffect 触发
  → 构建图像 URL: /api/images/frame?surface=top&seq_no=123&image_index=0
  → setImageUrl(url)
  → <img src={imageUrl} /> 自动加载
```

### 3. 加载图像（单缺陷模式）
```
selectedDefectId 更新 → DefectImageView useEffect 触发
  → 构建图像 URL: /api/images/defect/{defect_id}?surface=top
  → setImageUrl(url)
  → <img src={imageUrl} /> 自动加载
```

### 4. 切换表面
```
用户点击「上表」 → setSurfaceFilter('top')
  → plateDefects.filter(d => d.surface === 'top')
  → 重新渲染缺陷列表和图像
```

---

## 🐛 常见问题排查

### 问题 1：图像无法加载

**症状：** 显示 "图像加载失败"

**检查：**
1. 后端是否运行？访问 `http://localhost:8120/health`
2. 查看浏览器控制台的网络请求
3. 确认图像 API 路径正确

**解决：**
```bash
# 启动后端
python run_server.bat

# 测试图像API
curl "http://localhost:8120/api/images/frame?surface=top&seq_no=1&image_index=0"
```

---

### 问题 2：缺陷列表为空

**症状：** 选择钢板后显示 "无缺陷数据"

**检查：**
1. 该钢板是否真的有缺陷？
2. 查看控制台日志
3. 确认 API 返回了数据

**解决：**
```bash
# 测试缺陷API
curl "http://localhost:8120/api/ui/defects/1"
```

---

### 问题 3：点击缺陷列表无反应

**症状：** 点击缺陷不会高亮或切换图像

**检查：**
1. 确认完成了步骤 2 和步骤 3
2. 确认 `selectedDefectId` 和 `onDefectSelect` props 已传递

**解决：**
- 检查 DefectList 组件的 props
- 检查 onClick 事件处理

---

## 📝 代码位置速查表

| 修改内容 | 文件 | 行号（约） |
|---------|------|-----------|
| 状态变量 | App.tsx | 107-109 |
| Defect 接口 | App.tsx | 53-64 |
| 缺陷数据映射 | App.tsx | 271-282 |
| 缺陷视图区域 | App.tsx | 1179-1212 |
| 缺陷列表调用 | App.tsx | 1248 |
| 上传按钮 | App.tsx | 840-890 |
| DefectList 组件 | /components/DefectList.tsx | 全文件 |

---

## ✨ 完成后的效果

### 开发模式
```
┌─────────────────────────────────────┐
│ CAM-01 LIVE FEED                   │
├─────────────────────────────────────┤
│                                     │
│    [拖放或点击上传图像]             │
│                                     │
│                                     │
└─────────────────────────────────────┘

侧边栏：
├ [上传缺陷图像]
└ [上传钢板图像]
```

### 生产模式
```
┌────────────────────── [大图][单缺陷]
│ 缺陷检测视图                        │
├─────────────────────────────────────┤
│                                     │
│    [显示钢板图像 + 缺陷框标注]      │
│    或                               │
│    [显示单个缺陷裁剪图]             │
│                                     │
└─────────────────────────────────────┘

侧边栏：
(无上传按钮)
缺陷列表（可点击选中）
```

---

📅 创建时间：2024-12-03
🎯 目标：完成生产模式的缺陷图像显示功能
✅ 状态：代码准备完成，等待集成

---

## 🚀 开始集成

按照步骤 1-5 依次完成修改，然后运行测试清单中的所有测试项。

如有问题，请参考：
- `/PRODUCTION_MODE_ADAPTATION.md` - 详细的修改说明
- `/DefectViewCode.tsx` - 完整的视图替换代码
- `/components/DefectImageView.tsx` - 新组件源码

祝集成顺利！🎉
