# 前后端打通完成文档

## ✅ 已完成的修改

### 1. App.tsx - 接入真实 API

#### 1.1 引入 API 模块
```typescript
// 引入 API 客户端和环境配置
import { env } from './src/config/env';
import { listSteels, getDefects } from './src/api/client';
import type { SteelItem, DefectItem } from './src/api/types';
```

#### 1.2 替换钢板列表为 API 加载
**修改前：**
```typescript
const [steelPlates] = useState<SteelPlate[]>([
  // 硬编码的模拟数据...
]);
```

**修改后：**
```typescript
const [steelPlates, setSteelPlates] = useState<SteelPlate[]>([]);
const [isLoadingSteels, setIsLoadingSteels] = useState(false);
const [steelsLoadError, setSteelsLoadError] = useState<string | null>(null);

// 加载钢板列表
useEffect(() => {
  const loadSteelPlates = async () => {
    setIsLoadingSteels(true);
    setSteelsLoadError(null);
    
    try {
      const items: SteelItem[] = await listSteels(50);
      
      // 将 API 返回的 SteelItem 转换为 SteelPlate 格式
      const mapped: SteelPlate[] = items.map(item => ({
        serialNumber: item.serialNumber,
        plateId: item.plateId,
        steelGrade: item.steelGrade,
        dimensions: item.dimensions,
        timestamp: item.timestamp,
        level: item.level,
        defectCount: item.defectCount,
      }));
      
      setSteelPlates(mapped);
      console.log(`✅ 成功加载 ${mapped.length} 条钢板记录 (${env.getMode()} 模式)`);
    } catch (error) {
      console.error('❌ 加载钢板列表失败:', error);
      setSteelsLoadError(error instanceof Error ? error.message : '加载失败');
      
      if (env.isProduction()) {
        setSteelPlates([]);
      }
    } finally {
      setIsLoadingSteels(false);
    }
  };

  loadSteelPlates();

  // 监听模式切换事件，重新加载数据
  const handleModeChange = () => {
    console.log('🔄 检测到模式切换，重新加载钢板列表...');
    loadSteelPlates();
  };

  window.addEventListener('app_mode_change', handleModeChange);
  return () => window.removeEventListener('app_mode_change', handleModeChange);
}, []);
```

#### 1.3 添加选中钢板时加载缺陷
```typescript
const [plateDefects, setPlateDefects] = useState<Defect[]>([]);
const [isLoadingDefects, setIsLoadingDefects] = useState(false);

// 当选中钢板时，加载该钢板的缺陷数据
useEffect(() => {
  if (!selectedPlateId) {
    setPlateDefects([]);
    return;
  }

  const loadPlateDefects = async () => {
    setIsLoadingDefects(true);
    
    try {
      const selectedPlate = steelPlates.find(p => p.plateId === selectedPlateId);
      if (!selectedPlate) {
        console.warn('未找到选中的钢板:', selectedPlateId);
        setPlateDefects([]);
        return;
      }

      const seqNo = parseInt(selectedPlate.serialNumber, 10);
      console.log(`🔍 加载钢板 ${selectedPlateId} (seq_no: ${seqNo}) 的缺陷数据...`);
      
      const defectItems: DefectItem[] = await getDefects(seqNo);
      
      // 将 DefectItem 转换为 Defect 格式
      const mapped: Defect[] = defectItems.map(item => ({
        id: item.defectId,
        type: item.defectType,
        severity: item.severity,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        confidence: item.confidence,
        surface: item.surface,
      }));
      
      setPlateDefects(mapped);
      console.log(`✅ 成功加载 ${mapped.length} 个缺陷 (${env.getMode()} 模式)`);
    } catch (error) {
      console.error('❌ 加载缺陷数据失败:', error);
      setPlateDefects([]);
    } finally {
      setIsLoadingDefects(false);
    }
  };

  loadPlateDefects();
}, [selectedPlateId, steelPlates]);
```

### 2. vite.config.ts - 配置代理

创建了 `vite.config.ts` 文件，配置代理将前端请求转发到后端：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // 代理配置：将 /api 和 /health 请求转发到后端
    proxy: {
      '/api': {
        target: 'http://localhost:8120',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:8120',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

---

## 📋 需要手动完成的 UI 优化（可选）

为了提供更好的用户体验，建议在钢板列表中添加加载状态和错误提示：

### 在钢板面板中显示加载状态

在 App.tsx 的钢板列表渲染部分（约第 762 行），修改为：

```tsx
<div className="flex-1 overflow-auto p-2 space-y-1">
  {/* 加载状态 */}
  {isLoadingSteels && (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-xs">加载钢板数据中...</p>
    </div>
  )}
  
  {/* 错误提示 */}
  {steelsLoadError && !isLoadingSteels && (
    <div className="text-center py-8 text-destructive">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-xs">加载失败: {steelsLoadError}</p>
    </div>
  )}
  
  {/* 钢板列表 */}
  {!isLoadingSteels && !steelsLoadError && filteredSteelPlates.length === 0 ? (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-xs">没有找到匹配的钢板记录</p>
      <button onClick={() => { /* 清除筛选 */ }}>
        清除筛选条件
      </button>
    </div>
  ) : !isLoadingSteels && !steelsLoadError ? (
    filteredSteelPlates.map((plate) => (
      // 钢板卡片...
    ))
  ) : null}
</div>
```

---

## 🧪 测试步骤

### 1. 启动后端服务器
```bash
# 在后端项目目录
python run_server.bat
# 或
python main.py
```

确保后端运行在 `http://localhost:8120`

### 2. 启动前端开发服务器
```bash
npm run dev
```

前端将运行在 `http://localhost:3000`

### 3. 测试开发模式（Mock 数据）
1. 打开应用
2. 进入"系统设置"标签
3. 确保 API 模式是"开发模式"
4. 检查钢板列表是否显示 Mock 数据
5. 点击任意钢板，查看缺陷数据

打开浏览器控制台，应该看到：
```
✅ 成功加载 20 条钢板记录 (development 模式)
🔍 加载钢板 SP240001 (seq_no: 1) 的缺陷数据...
✅ 成功加载 8 个缺陷 (development 模式)
```

**不应该看到任何网络请求**（因为使用 Mock 数据）

### 4. 测试生产模式（真实 API）
1. 在"系统设置"中切换到"生产模式"
2. 页面会提示刷新，点击确认
3. 页面重新加载后，检查钢板列表

打开浏览器控制台，应该看到：
```
✅ 成功加载 X 条钢板记录 (production 模式)
🔍 加载钢板 XXX (seq_no: X) 的缺陷数据...
✅ 成功加载 X 个缺陷 (production 模式)
```

打开浏览器的 Network 标签，应该看到：
- ✅ `GET http://localhost:3000/api/ui/steels?limit=50` → 200 OK
- ✅ `GET http://localhost:3000/api/ui/defects/1` → 200 OK

### 5. 验证代理工作正常
在 Network 标签中，虽然请求显示是 `localhost:3000/api/...`，但实际上 Vite 已经将它代理到了 `localhost:8120/api/...`

后端控制台应该显示收到的请求：
```
INFO:     127.0.0.1:xxxx - "GET /api/ui/steels?limit=50 HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxx - "GET /api/ui/defects/1 HTTP/1.1" 200 OK
```

---

## 🎯 验证清单

- [x] ✅ 引入了 API 客户端模块
- [x] ✅ 钢板列表使用 `listSteels()` 从 API 加载
- [x] ✅ 选中钢板时使用 `getDefects()` 加载缺陷
- [x] ✅ 数据类型正确转换（SteelItem → SteelPlate, DefectItem → Defect）
- [x] ✅ 创建了 vite.config.ts 配置代理
- [x] ✅ 监听模式切换事件，自动重新加载数据
- [x] ✅ 添加了控制台日志，方便调试
- [ ] 🔧 （可选）添加了加载状态 UI
- [ ] 🔧 （可选）添加了错误提示 UI

---

## 🐛 常见问题排查

### 问题 1：生产模式下请求 404
**原因：** 后端没有运行或运行在不同端口

**解决：**
1. 确认后端运行在 `http://localhost:8120`
2. 检查 `vite.config.ts` 中的代理配置
3. 重启 Vite 开发服务器

### 问题 2：钢板列表为空
**原因：** 数据库中没有数据

**解决：**
1. 检查后端数据库是否有数据
2. 直接访问 `http://localhost:8120/api/ui/steels?limit=5` 验证后端
3. 查看浏览器控制台和后端控制台的错误信息

### 问题 3：CORS 错误
**原因：** 跨域配置问题

**解决：**
1. 确保使用 Vite 代理（不要直接访问 8120 端口）
2. 检查 `vite.config.ts` 的 `changeOrigin: true` 配置

### 问题 4：模式切换后数据不更新
**原因：** 事件监听器没有正确触发

**解决：**
1. 检查控制台是否有 "🔄 检测到模式切换" 的日志
2. 确保 `env.setMode()` 正确触发了 `app_mode_change` 事件
3. 尝试手动刷新页面

---

## 📊 数据流程图

```
开发模式 (Development):
  用户点击钢板 
    → listSteels() 
    → env.isDevelopment() = true 
    → mock.mockListSteels() 
    → 返回 Mock 数据
    → 无网络请求

生产模式 (Production):
  用户点击钢板 
    → listSteels() 
    → env.isProduction() = true 
    → fetch('/api/ui/steels?limit=50')
    → Vite 代理到 http://localhost:8120/api/ui/steels?limit=50
    → FastAPI 处理请求
    → 返回真实数据
```

---

## ✨ 下一步建议

1. **添加刷新按钮** - 允许用户手动刷新钢板列表
2. **分页加载** - 当钢板数量很多时，实现分页或无限滚动
3. **实时更新** - 使用 WebSocket 实时接收新的检测结果
4. **缓存优化** - 缓存已加载的钢板和缺陷数据
5. **错误重试** - API 请求失败时自动重试

---

📅 完成时间：2024-12-03
📝 完成人：AI Assistant
