# 生产模式接口适配 - 修改说明

## 📋 已完成的修改

### 1. 更新数据类型 (/App.tsx)

**添加了新的状态变量：**
```typescript
const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null); // 选中的缺陷ID
const [imageViewMode, setImageViewMode] = useState<'full' | 'single'>('full'); // 图像显示模式
```

**更新 Defect 接口：**
```typescript
export interface Defect {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  surface: 'top' | 'bottom';
  imageIndex?: number; // 新增：图像索引
}
```

### 2. 创建缺陷图像显示组件 (/components/DefectImageView.tsx)

**功能：**
- ✅ 支持两种显示模式：
  - 大图模式：显示完整钢板图像 + 缺陷框标注
  - 单缺陷模式：显示单个缺陷的裁剪图像
- ✅ 自动加载图像：
  - 大图：GET `/api/images/frame?surface={surface}&seq_no={seq_no}&image_index={index}`
  - 单缺陷：GET `/api/images/defect/{defect_id}?surface={surface}`
- ✅ 缺陷选中功能
- ✅ 加载状态和错误处理

### 3. 更新缺陷数据映射

**修改 App.tsx 中的数据映射：**
```typescript
const mapped: Defect[] = defectItems.map(item => ({
  id: item.id,           // 使用正确的字段名
  type: item.type,
  severity: item.severity,
  x: item.x,
  y: item.y,
  width: item.width,
  height: item.height,
  confidence: item.confidence,
  surface: item.surface,
  imageIndex: item.imageIndex,  // 新增
}));
```

---

## 🔧 需要手动完成的修改

### 步骤 1：在 App.tsx 中集成 DefectImageView 组件

**位置：** App.tsx，约第 1180-1210 行

**需要替换的区域：** 缺陷界面的主视图区域

**原代码结构：**
```tsx
<div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden border border-border/20 relative">
  {!currentImage ? (
    <div className="w-full h-full flex items-center justify-center p-8">
      <UploadZone onImageUpload={handleImageUpload} />
    </div>
  ) : (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
       <DetectionResult
          imageUrl={currentImage}
          defects={detectionResult?.defects || []}
          isDetecting={isDetecting}
        />
        // ...
    </div>
  )}
</div>
```

**新代码：**
```tsx
{/* 添加大图/单缺陷切换按钮（生产模式） */}
{!isMobileDevice && env.isProduction() && (
  <div className="absolute top-0 right-0 flex gap-1 p-1 z-10">
    <button
      onClick={() => setImageViewMode('full')}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        imageViewMode === 'full'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      }`}
    >
      大图
    </button>
    <button
      onClick={() => setImageViewMode('single')}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        imageViewMode === 'single'
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-accent'
      }`}
    >
      单缺陷
    </button>
  </div>
)}

<div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden border border-border/20 relative">
  {env.isProduction() ? (
    // 生产模式：显示API获取的缺陷数据
    isLoadingDefects ? (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm">加载缺陷数据中...</p>
      </div>
    ) : !selectedPlateId || plateDefects.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="w-16 h-16 opacity-50" />
        <p className="text-sm">{selectedPlateId ? '无缺陷数据' : '请选择钢板查看缺陷'}</p>
      </div>
    ) : (
      <DefectImageView 
        selectedPlate={steelPlates.find(p => p.plateId === selectedPlateId)}
        defects={plateDefects.filter(d => surfaceFilter === 'all' || d.surface === surfaceFilter)}
        surface={surfaceFilter}
        imageViewMode={imageViewMode}
        selectedDefectId={selectedDefectId}
        onDefectSelect={setSelectedDefectId}
      />
    )
  ) : (
    // 开发模式：保留原有上传功能
    !currentImage ? (
      <div className="w-full h-full flex items-center justify-center p-8">
        <UploadZone onImageUpload={handleImageUpload} />
      </div>
    ) : (
      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
         <DetectionResult
            imageUrl={currentImage}
            defects={detectionResult?.defects || []}
            isDetecting={isDetecting}
          />
          <button
            onClick={() => {
              setCurrentImage(null);
              setDetectionResult(null);
            }}
            className="absolute top-4 right-4 px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white text-xs rounded border border-white/10 backdrop-blur-md transition-colors z-20"
          >
            CLOSE FEED
          </button>
      </div>
    )
  )}
</div>
```

---

### 步骤 2：更新缺陷列表以支持选中功能

**位置：** App.tsx，约第 1240-1255 行（DefectList 渲染位置）

**需要传递新的 props：**
```tsx
<DefectList 
  defects={filteredDefects} 
  isDetecting={isDetecting} 
  surface={surfaceFilter} 
  defectColors={defectColors}
  selectedDefectId={selectedDefectId}      // 新增
  onDefectSelect={setSelectedDefectId}     // 新增
/>
```

---

### 步骤 3：更新 DefectList 组件

**文件：** /components/DefectList.tsx

**添加 props：**
```typescript
interface DefectListProps {
  defects: Defect[];
  isDetecting: boolean;
  surface: string;
  defectColors: any;
  selectedDefectId?: string | null;        // 新增
  onDefectSelect?: (id: string) => void;   // 新增
}
```

**更新每个缺陷项，使其可点击：**
```tsx
<div
  key={defect.id}
  onClick={() => onDefectSelect?.(defect.id)}
  className={`p-2 border rounded transition-all cursor-pointer ${
    selectedDefectId === defect.id
      ? 'border-primary bg-primary/10 shadow-lg'
      : 'border-border hover:border-primary/50'
  }`}
>
  {/* 缺陷内容 */}
</div>
```

---

### 步骤 4：隐藏生产模式下的上传按钮

**位置：** App.tsx，侧边栏底部（约第 840-890 行）

**修改方式：**
```tsx
{/* 上传按钮区域 - 仅在开发模式显示 */}
{!env.isProduction() && (
  <div className="p-2 bg-muted/20 border-t border-border space-y-1 shrink-0">
    <label className="block">
      {/* 上传缺陷图像按钮 */}
    </label>
    <label className="block">
      {/* 上传钢板图像按钮 */}
    </label>
  </div>
)}
```

---

## 🧪 测试步骤

### 1. 开发模式测试
```bash
# 1. 启动前端
npm run dev

# 2. 在系统设置中确认是「开发模式」

# 3. 验证功能：
# ✅ 可以看到上传按钮
# ✅ 可以上传图像
# ✅ 使用 Mock 数据
# ✅ 显示 UploadZone
```

### 2. 生产模式测试
```bash
# 1. 启动后端
python run_server.bat

# 2. 验证后端
# 访问: http://localhost:8120/health

# 3. 在系统设置中切换到「生产模式」

# 4. 验证功能：
# ✅ 不显示上传按钮
# ✅ 选择钢板后自动加载缺陷
# ✅ 显示大图/单缺陷切换按钮
# ✅ 大图模式：显示完整图像 + 缺陷框
# ✅ 单缺陷模式：显示裁剪的缺陷图像
# ✅ 点击缺陷列表可选中对应缺陷
# ✅ 表面过滤（上表/下表/全部）工作正常
```

---

## 📊 API 接口对照

### 钢板列表
```
GET /api/ui/steels?limit=50
```

### 缺陷列表
```
GET /api/ui/defects/{seq_no}?surface=top  // 可选surface参数
```

### 帧图像（大图模式）
```
GET /api/images/frame?surface=top&seq_no=123&image_index=0
```

### 缺陷裁剪图像（单缺陷模式）
```
GET /api/images/defect/{defect_id}?surface=top
```

---

## ✅ 完成清单

- [x] 创建 DefectImageView 组件
- [x] 添加图像显示模式状态（full/single）
- [x] 添加缺陷选中状态
- [x] 更新 Defect 接口添加 imageIndex
- [x] 更新缺陷数据映射
- [ ] 在 App.tsx 中集成 DefectImageView
- [ ] 更新 DefectList 组件支持选中
- [ ] 隐藏生产模式的上传按钮
- [ ] 测试开发模式
- [ ] 测试生产模式

---

## 🎯 核心变化总结

### 开发模式 (Development)
- ✅ 显示上传按钮
- ✅ 使用 UploadZone
- ✅ 使用 Mock 数据
- ✅ 模拟缺陷检测

### 生产模式 (Production)
- ✅ **隐藏**上传按钮
- ✅ 使用真实 API 数据
- ✅ 显示大图/单缺陷切换
- ✅ 自动加载钢板图像
- ✅ 支持缺陷列表选中
- ✅ 表面过滤集成

---

📅 创建时间：2024-12-03
📝 状态：部分完成，需要手动集成到 App.tsx
