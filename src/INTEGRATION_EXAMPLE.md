# 集成示例 - 如何在现有代码中使用 API

本文档展示如何将现有的 Mock 数据逻辑替换为新的 API 客户端。

---

## 📝 示例 1: 加载钢板列表

### 当前代码（Mock 数据）

```typescript
// App.tsx - 原来的方式
const [steelPlates, setSteelPlates] = useState<SteelPlate[]>([]);

useEffect(() => {
  // 生成随机钢板数据
  const mockPlates: SteelPlate[] = Array.from({ length: 30 }, (_, i) => ({
    serialNumber: String(100000 + i + 1).padStart(8, '0'),
    plateId: `SP${String(i + 1).padStart(6, '0')}`,
    steelGrade: steelGrades[Math.floor(Math.random() * steelGrades.length)],
    dimensions: {
      length: Math.floor(Math.random() * 3000) + 6000,
      width: Math.floor(Math.random() * 1000) + 1500,
      thickness: Math.floor(Math.random() * 30) + 10,
    },
    timestamp: new Date(Date.now() - (i * 3600000)),
    level: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)] as 'A' | 'B' | 'C' | 'D',
    defectCount: Math.floor(Math.random() * 15),
  }));
  
  setSteelPlates(mockPlates);
}, []);
```

### 新代码（使用 API 客户端）

```typescript
// App.tsx - 新的方式
import { listSteels } from './src/api/client';
import type { SteelItem } from './src/api/types';

// 注意：SteelItem 已经是前端格式，直接对应 SteelPlate
const [steelPlates, setSteelPlates] = useState<SteelItem[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadSteels = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await listSteels(30);
      setSteelPlates(data);
    } catch (err) {
      console.error('Failed to load steels:', err);
      setError('加载钢板数据失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  loadSteels();
}, []);
```

### UI 加载状态

```typescript
{isLoading && (
  <div className="flex items-center justify-center py-10">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)}

{error && (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 m-4">
    <p className="text-red-400 text-sm">{error}</p>
    <button 
      onClick={() => window.location.reload()} 
      className="mt-2 text-xs underline"
    >
      重新加载
    </button>
  </div>
)}

{!isLoading && !error && steelPlates.map(plate => (
  // 渲染钢板列表
))}
```

---

## 📝 示例 2: 加载缺陷数据

### 当前代码（Mock 数据）

```typescript
// App.tsx - 原来的方式
const handleUploadComplete = (imageUrl: string) => {
  setCurrentImage(imageUrl);
  setIsDetecting(true);
  
  setTimeout(() => {
    const defects = generateRandomDefects();
    const status = defects.length === 0 ? 'pass' : 
                   defects.some(d => d.severity === 'high') ? 'fail' : 'warning';
    
    const record: DetectionRecord = {
      id: Date.now().toString(),
      defectImageUrl: imageUrl,
      fullImageUrl: imageUrl,
      timestamp: new Date(),
      defects,
      status
    };
    
    setDetectionResult(record);
    setHistory(prev => [record, ...prev].slice(0, 50));
    setIsDetecting(false);
  }, 2000);
};
```

### 新代码（使用 API 客户端）

```typescript
// App.tsx - 新的方式
import { getDefects } from './src/api/client';
import type { DefectItem } from './src/api/types';

// 将 DefectItem 转换为 Defect（如果字段不同）
const convertDefect = (item: DefectItem): Defect => ({
  id: item.id,
  type: item.type,
  severity: item.severity,
  x: item.x,
  y: item.y,
  width: item.width,
  height: item.height,
  confidence: item.confidence,
  surface: item.surface,
});

const handlePlateSelect = async (plateId: string, seqNo: number) => {
  setSelectedPlateId(plateId);
  setIsDetecting(true);
  setError(null);
  
  try {
    // 加载缺陷数据
    const defectItems = await getDefects(seqNo);
    const defects = defectItems.map(convertDefect);
    
    // 加载图像（如果需要）
    const imageUrl = await getFrameImage('top', seqNo, 0);
    
    const status = defects.length === 0 ? 'pass' : 
                   defects.some(d => d.severity === 'high') ? 'fail' : 'warning';
    
    const record: DetectionRecord = {
      id: seqNo.toString(),
      defectImageUrl: imageUrl,
      fullImageUrl: imageUrl,
      timestamp: new Date(),
      defects,
      status
    };
    
    setDetectionResult(record);
    setHistory(prev => [record, ...prev].slice(0, 50));
  } catch (err) {
    console.error('Failed to load defects:', err);
    setError('加载缺陷数据失败');
  } finally {
    setIsDetecting(false);
  }
};
```

---

## 📝 示例 3: 系统诊断对话框

### 当前代码（静态数据）

```typescript
// SystemDiagnosticDialog.tsx - 原来的方式
<div className="text-xs">
  <div>状态: 在线</div>
  <div>响应时间: --</div>
  <div>数据库: 已连接</div>
</div>
```

### 新代码（使用健康检查 API）

```typescript
// SystemDiagnosticDialog.tsx - 新的方式
import { useState, useEffect } from 'react';
import { healthCheck } from '../src/api/client';
import { getApiStatus } from '../src/api/client';
import type { HealthResponse } from '../src/api/types';

export function SystemDiagnosticDialog({ open, onClose }: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const apiStatus = getApiStatus();
  
  useEffect(() => {
    if (open) {
      checkHealth();
    }
  }, [open]);
  
  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const result = await healthCheck();
      setHealth(result);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>系统诊断</DialogTitle>
        </DialogHeader>
        
        {/* 当前模式 */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-sm font-medium mb-2">运行模式</div>
          <div className="text-xs space-y-1">
            <div>模式: {apiStatus.mode === 'development' ? '开发模式' : '生产模式'}</div>
            <div>说明: {apiStatus.description}</div>
            <div>地址: {apiStatus.baseUrl}</div>
          </div>
        </div>
        
        {/* 健康检查结果 */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">健康状态</div>
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className="text-xs text-primary hover:underline"
            >
              {isChecking ? '检查中...' : '重新检查'}
            </button>
          </div>
          
          {health ? (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span>状态: {health.status === 'healthy' ? '正常' : '异常'}</span>
              </div>
              
              {health.version && (
                <div>版本: {health.version}</div>
              )}
              
              {health.database && (
                <>
                  <div>数据库: {health.database.connected ? '已连接' : '未连接'}</div>
                  {health.database.latency_ms && (
                    <div>延迟: {health.database.latency_ms.toFixed(1)} ms</div>
                  )}
                </>
              )}
              
              <div className="text-muted-foreground">
                检查时间: {new Date(health.timestamp).toLocaleTimeString('zh-CN')}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              暂无数据，点击"重新检查"
            </div>
          )}
        </div>
        
        {/* 开发模式提示 */}
        {apiStatus.mode === 'development' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="text-xs text-blue-200/90">
              当前为开发模式，健康检查结果为模拟数据。
              切换到生产模式可查看真实后端状态。
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 📝 示例 4: 图像加载

### 当前代码（使用 Unsplash）

```typescript
// DetectionResult.tsx - 原来的方式
<img src={record.fullImageUrl} alt="钢板图像" />
```

### 新代码（使用 API 图像）

```typescript
// DetectionResult.tsx - 新的方式
import { useState, useEffect } from 'react';
import { getFrameImage } from '../src/api/client';

interface ImageLoaderProps {
  seqNo: number;
  surface: 'top' | 'bottom';
  imageIndex: number;
  alt?: string;
}

function ApiImage({ seqNo, surface, imageIndex, alt }: ImageLoaderProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setError(false);
      
      try {
        const url = await getFrameImage(surface, seqNo, imageIndex);
        setImageUrl(url);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImage();
  }, [seqNo, surface, imageIndex]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-muted h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center bg-muted h-full">
        <div className="text-muted-foreground text-sm">图像加载失败</div>
      </div>
    );
  }
  
  return <img src={imageUrl} alt={alt || '钢板图像'} className="w-full h-full object-cover" />;
}

// 使用
<ApiImage seqNo={1001} surface="top" imageIndex={0} />
```

---

## 🔄 迁移步骤总结

### 步骤 1: 导入 API 客户端
```typescript
import { listSteels, getDefects, getFrameImage, healthCheck } from './src/api/client';
import type { SteelItem, DefectItem } from './src/api/types';
```

### 步骤 2: 添加状态管理
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 步骤 3: 替换数据获取逻辑
```typescript
// 删除旧的 Mock 生成代码
// 添加新的 async 函数调用
```

### 步骤 4: 添加错误处理
```typescript
try {
  // API 调用
} catch (err) {
  // 错误处理
}
```

### 步骤 5: 更新 UI 渲染
```typescript
// 添加加载状态
// 添加错误提示
// 保持原有的数据展示逻辑
```

---

## ✅ 检查清单

完成迁移后，检查以下项目：

- [ ] 导入了正确的 API 函数
- [ ] 添加了加载状态 (isLoading)
- [ ] 添加了错误处理 (try-catch)
- [ ] 添加了错误提示 UI
- [ ] 在两种模式下都测试过
- [ ] 数据格式正确（camelCase）
- [ ] 没有直接使用 fetch
- [ ] 没有硬编码 Mock 数据

---

## 💡 提示

1. **渐进式迁移**：一次迁移一个功能，不要全部一起改
2. **保留旧代码**：先注释掉，确认新代码工作后再删除
3. **测试两种模式**：开发模式和生产模式都要测试
4. **处理边界情况**：空数据、网络错误、超时等
5. **用户体验**：添加加载动画、错误重试、友好提示

---

**需要更多帮助？**  
→ 查看 `API_INTEGRATION_GUIDE.md` 了解完整 API 规范  
→ 查看 `QUICK_REFERENCE.md` 快速查找常用代码
