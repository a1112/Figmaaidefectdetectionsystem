# 文件清单 - 需要复制到您的项目

以下是本次创建的所有文件，请确认这些文件已经在您的项目中：

## ✅ 核心代码文件（必需）

### 1. 配置层
- [ ] `src/config/env.ts` - 环境配置管理器

### 2. API 层
- [ ] `src/api/types.ts` - TypeScript 类型定义
- [ ] `src/api/mock.ts` - Mock 数据生成器
- [ ] `src/api/client.ts` - API 客户端

### 3. 组件层
- [ ] `components/ModeSwitch.tsx` - 模式切换UI组件

### 4. 主应用
- [ ] `App.tsx` - 已修改（添加了 ModeSwitch 导入和使用）

---

## 📚 文档文件（推荐）

### 总览文档
- [ ] `README_DEV_PROD_MODE.md` - 📌 **从这里开始**，总览文档

### 快速指南
- [ ] `DEV_PROD_MODE_README.md` - 快速开始指南
- [ ] `QUICK_REFERENCE.md` - 快速参考卡片

### 详细文档
- [ ] `API_INTEGRATION_GUIDE.md` - 完整的API集成指南
- [ ] `INTEGRATION_EXAMPLE.md` - 代码集成示例
- [ ] `BACKEND_QUICKSTART.md` - 后端开发者快速入门

### 原有文档
- [ ] `guidelines/Guidelines.md` - 后端接口规范（您已有）

---

## 🔍 如何验证文件是否存在

### 方法 1: 在项目根目录运行
```bash
# 检查核心文件
ls -la src/config/env.ts
ls -la src/api/types.ts
ls -la src/api/mock.ts
ls -la src/api/client.ts
ls -la components/ModeSwitch.tsx

# 检查文档文件
ls -la README_DEV_PROD_MODE.md
ls -la DEV_PROD_MODE_README.md
ls -la API_INTEGRATION_GUIDE.md
ls -la QUICK_REFERENCE.md
ls -la INTEGRATION_EXAMPLE.md
ls -la BACKEND_QUICKSTART.md
```

### 方法 2: 使用 find 命令
```bash
# 查找所有新建的文件
find . -name "env.ts" -o -name "types.ts" -o -name "mock.ts" -o -name "client.ts" -o -name "ModeSwitch.tsx"
find . -name "*DEV_PROD*" -o -name "*INTEGRATION*" -o -name "*BACKEND*" -o -name "QUICK_REFERENCE.md"
```

---

## 📦 如果文件缺失，请按以下步骤操作

### 步骤 1: 确认目录结构

确保以下目录存在：
```bash
mkdir -p src/config
mkdir -p src/api
mkdir -p components
```

### 步骤 2: 在 Figma Make 中查看文件

在当前的 Figma Make 界面中，这些文件都已经创建好了。

### 步骤 3: 复制文件内容

如果您在本地项目中看不到这些文件，可能是因为 Figma Make 的文件系统和您的 Git 仓库不同步。

**解决方案**：
1. 我可以逐个为您显示文件内容
2. 您手动创建文件并复制内容
3. 或者您可以使用 Figma Make 的导出功能

---

## 🚀 快速创建命令（如果文件丢失）

### Linux/Mac
```bash
# 创建目录结构
mkdir -p src/config src/api components

# 创建空文件（等待填充内容）
touch src/config/env.ts
touch src/api/types.ts
touch src/api/mock.ts
touch src/api/client.ts
touch components/ModeSwitch.tsx
touch README_DEV_PROD_MODE.md
touch DEV_PROD_MODE_README.md
touch API_INTEGRATION_GUIDE.md
touch QUICK_REFERENCE.md
touch INTEGRATION_EXAMPLE.md
touch BACKEND_QUICKSTART.md
```

### Windows (PowerShell)
```powershell
# 创建目录结构
New-Item -ItemType Directory -Force -Path src/config
New-Item -ItemType Directory -Force -Path src/api
New-Item -ItemType Directory -Force -Path components

# 创建空文件
New-Item -ItemType File -Path src/config/env.ts
New-Item -ItemType File -Path src/api/types.ts
New-Item -ItemType File -Path src/api/mock.ts
New-Item -ItemType File -Path src/api/client.ts
New-Item -ItemType File -Path components/ModeSwitch.tsx
New-Item -ItemType File -Path README_DEV_PROD_MODE.md
New-Item -ItemType File -Path DEV_PROD_MODE_README.md
New-Item -ItemType File -Path API_INTEGRATION_GUIDE.md
New-Item -ItemType File -Path QUICK_REFERENCE.md
New-Item -ItemType File -Path INTEGRATION_EXAMPLE.md
New-Item -ItemType File -Path BACKEND_QUICKSTART.md
```

---

## 📥 需要我帮您导出文件内容吗？

如果您确认文件不在您的项目中，我可以：

1. ✅ **逐个显示文件内容** - 您手动复制粘贴
2. ✅ **生成一个大的合并文件** - 包含所有代码，您再分拆
3. ✅ **创建安装脚本** - 自动创建所有文件

请告诉我您需要哪种方式！

---

## 🔧 推荐的验证流程

1. **克隆或拉取您的仓库**
   ```bash
   git clone <your-repo>
   # 或
   git pull origin main
   ```

2. **检查文件清单**
   ```bash
   # 在项目根目录运行
   ls -la src/config/
   ls -la src/api/
   ls -la components/ModeSwitch.tsx
   ls -la *.md
   ```

3. **如果文件缺失**
   - 告诉我具体缺少哪些文件
   - 我逐个为您显示内容
   - 您手动创建并复制

---

## 💡 重要提示

**Figma Make 是一个在线开发环境**，创建的文件存在于它的虚拟文件系统中。

要将这些文件同步到您的 Git 仓库，您需要：
1. 从 Figma Make 中导出/复制文件内容
2. 在本地项目中创建对应的文件
3. 提交到 Git

或者，如果 Figma Make 支持直接推送到 Git，使用其集成功能。

---

**需要帮助吗？** 请告诉我：
1. 您在本地项目中看到了哪些文件？
2. 缺少哪些文件？
3. 您希望我如何帮您导出内容？
