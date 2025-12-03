# 后端开发者快速入门

欢迎！这份文档帮助您快速了解前端需要什么样的 API 接口。

---

## 🎯 目标

实现 4 个 REST API 接口，让前端可以：
1. 获取钢板列表
2. 获取指定钢板的缺陷信息
3. 获取缺陷图像
4. 提供健康检查

---

## 📋 接口清单

### 1️⃣ 获取钢板列表

**端点**: `GET /api/steels`

**查询参数**:
- `limit` (可选): 返回数量，默认 20

**响应示例**:
```json
{
  "steels": [
    {
      "seq_no": 1001,
      "steel_no": "SP001001",
      "steel_type": "Q235B",
      "length": 8000,
      "width": 2000,
      "thickness": 20,
      "timestamp": "2024-12-03T10:30:00Z",
      "level": "A",
      "defect_count": 5
    }
  ],
  "total": 1
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| seq_no | int | 流水号（唯一标识） |
| steel_no | string | 钢板号（8位） |
| steel_type | string | 钢种（5位） |
| length | int | 长度 (mm) |
| width | int | 宽度 (mm) |
| thickness | int | 厚度 (mm) |
| timestamp | string | ISO 8601 时间戳 |
| level | string | "A", "B", "C", "D" |
| defect_count | int | 缺陷数量 |

**注意事项**:
- 字段名必须是 **snake_case**（下划线命名）
- 按时间倒序排序（最新的在前）
- `level` 只能是 A/B/C/D 其中之一

---

### 2️⃣ 获取缺陷列表

**端点**: `GET /api/defects/{seq_no}`

**路径参数**:
- `seq_no`: 钢板流水号

**响应示例**:
```json
{
  "seq_no": 1001,
  "defects": [
    {
      "defect_id": "D1001-0",
      "defect_type": "纵向裂纹",
      "severity": "high",
      "x": 45.5,
      "y": 30.2,
      "width": 5.0,
      "height": 8.0,
      "confidence": 0.92,
      "surface": "top",
      "image_index": 0
    }
  ],
  "total_count": 1
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| defect_id | string | 缺陷唯一标识 |
| defect_type | string | 缺陷类型（见下表） |
| severity | string | "low", "medium", "high" |
| x | float | X 位置（百分比 0-100） |
| y | float | Y 位置（百分比 0-100） |
| width | float | 宽度（百分比） |
| height | float | 高度（百分比） |
| confidence | float | 置信度 (0.0-1.0) |
| surface | string | "top" 或 "bottom" |
| image_index | int | 关联的图像索引 |

**缺陷类型枚举**:
- 纵向裂纹
- 横向裂纹
- 异物压入
- 孔洞
- 辊印
- 压氧
- 边裂
- 划伤

**注意事项**:
- `severity` 只能是 low/medium/high
- `surface` 只能是 top/bottom
- `x`, `y`, `width`, `height` 是百分比值（0-100）
- `confidence` 是 0 到 1 之间的浮点数

---

### 3️⃣ 获取缺陷图像

**端点**: `GET /api/images/frame`

**查询参数**:
- `surface`: "top" 或 "bottom"
- `seq_no`: 钢板流水号
- `image_index`: 图像索引（0-N）

**响应**: 图像文件（JPEG 或 PNG）

**示例请求**:
```
GET /api/images/frame?surface=top&seq_no=1001&image_index=0
```

**响应头**:
```
Content-Type: image/jpeg
Content-Length: 123456
```

**注意事项**:
- 直接返回二进制图像数据，不是 JSON
- 建议使用 JPEG 格式（质量 85-90）
- 如果图像不存在，返回 404

---

### 4️⃣ 健康检查

**端点**: `GET /health`

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-03T10:30:00Z",
  "version": "v2.0.1",
  "database": {
    "connected": true,
    "latency_ms": 8.5
  }
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|-----|------|------|
| status | string | "healthy" 或 "unhealthy" |
| timestamp | string | ISO 8601 时间戳 |
| version | string | 可选，API 版本 |
| database.connected | boolean | 可选，数据库连接状态 |
| database.latency_ms | float | 可选，数据库延迟（毫秒） |

**注意事项**:
- 即使系统异常，也要返回 200 状态码（但 status 为 "unhealthy"）
- database 字段是可选的

---

## 🛠️ FastAPI 实现示例

### 基础结构

```python
from fastapi import FastAPI, Query, Path
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

app = FastAPI()

# CORS 配置（如果前后端分离）
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境请限制具体域名
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class SteelItem(BaseModel):
    seq_no: int
    steel_no: str
    steel_type: str
    length: int
    width: int
    thickness: int
    timestamp: str
    level: str  # "A", "B", "C", "D"
    defect_count: int

class DefectItem(BaseModel):
    defect_id: str
    defect_type: str
    severity: str  # "low", "medium", "high"
    x: float
    y: float
    width: float
    height: float
    confidence: float
    surface: str  # "top", "bottom"
    image_index: int

# 接口实现
@app.get("/api/steels")
async def list_steels(limit: int = Query(20, ge=1, le=100)):
    # TODO: 从数据库查询
    steels = []  # 查询逻辑
    return {"steels": steels, "total": len(steels)}

@app.get("/api/defects/{seq_no}")
async def get_defects(seq_no: int = Path(...)):
    # TODO: 从数据库查询
    defects = []  # 查询逻辑
    return {"seq_no": seq_no, "defects": defects, "total_count": len(defects)}

@app.get("/api/images/frame")
async def get_frame_image(
    surface: str = Query(..., regex="^(top|bottom)$"),
    seq_no: int = Query(...),
    image_index: int = Query(..., ge=0)
):
    # TODO: 构建图像路径
    image_path = f"./images/{surface}/{seq_no}_{image_index}.jpg"
    return FileResponse(image_path, media_type="image/jpeg")

@app.get("/health")
async def health_check():
    # TODO: 检查数据库连接
    db_connected = True  # 实际检查逻辑
    return {
        "status": "healthy" if db_connected else "unhealthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "v2.0.1",
        "database": {
            "connected": db_connected,
            "latency_ms": 5.0  # 实际测量延迟
        }
    }
```

---

## ✅ 自检清单

实现完成后，检查以下项目：

### 数据格式
- [ ] 所有字段名都是 snake_case
- [ ] 时间戳是 ISO 8601 格式（含时区）
- [ ] 枚举值拼写正确（level: A/B/C/D, severity: low/medium/high）
- [ ] surface 只有 top/bottom 两个值
- [ ] 缺陷类型是中文（纵向裂纹、横向裂纹...）

### 响应结构
- [ ] JSON 响应有正确的嵌套结构
- [ ] 数组字段命名正确（steels, defects）
- [ ] 图像接口返回二进制数据，不是 JSON

### 错误处理
- [ ] 不存在的 seq_no 返回 404
- [ ] 不存在的图像返回 404
- [ ] 参数错误返回 422
- [ ] 健康检查即使失败也返回 200（status: unhealthy）

### 性能
- [ ] 列表查询添加了 LIMIT
- [ ] 数据库查询有索引
- [ ] 图像响应有缓存头

---

## 🧪 测试方法

### 使用 curl 测试

```bash
# 1. 测试钢板列表
curl http://localhost:8000/api/steels?limit=5

# 2. 测试缺陷列表
curl http://localhost:8000/api/defects/1001

# 3. 测试图像（保存到文件）
curl http://localhost:8000/api/images/frame?surface=top&seq_no=1001&image_index=0 \
  -o test_image.jpg

# 4. 测试健康检查
curl http://localhost:8000/health
```

### 使用前端测试

1. 启动后端服务
2. 打开前端应用
3. 进入系统设置
4. 切换到「生产模式」
5. 刷新页面
6. 观察数据是否正确加载

---

## 🔍 常见问题

### Q: 字段名必须是下划线格式吗？

A: 是的！前端会自动转换 snake_case → camelCase。如果你用驼峰命名，转换会出错。

### Q: 时间格式必须是 ISO 8601 吗？

A: 是的。必须包含时区信息，推荐使用 UTC（以 Z 结尾）。

示例：
```python
datetime.utcnow().isoformat() + "Z"
# 输出: 2024-12-03T10:30:00.123456Z
```

### Q: 图像必须是 JPEG 吗？

A: 不必须，PNG 也可以。但要设置正确的 Content-Type：
- JPEG: `image/jpeg`
- PNG: `image/png`

### Q: 如何处理大量数据的分页？

A: 当前接口只支持 `limit`，建议：
- 默认 limit=20
- 最大 limit=100
- 未来可以添加 `offset` 参数实现分页

### Q: 缺陷的坐标是像素还是百分比？

A: **百分比**！范围是 0-100。

例如：`x: 45.5` 表示在图像宽度的 45.5% 位置。

这样做是为了适配不同分辨率的图像。

---

## 📊 数据库建议

### 钢板表 (steels)
```sql
CREATE TABLE steels (
    seq_no INT PRIMARY KEY AUTO_INCREMENT,
    steel_no VARCHAR(8) NOT NULL,
    steel_type VARCHAR(5) NOT NULL,
    length INT NOT NULL,
    width INT NOT NULL,
    thickness INT NOT NULL,
    timestamp DATETIME NOT NULL,
    level ENUM('A', 'B', 'C', 'D') NOT NULL,
    defect_count INT DEFAULT 0,
    INDEX idx_timestamp (timestamp DESC)
);
```

### 缺陷表 (defects)
```sql
CREATE TABLE defects (
    defect_id VARCHAR(50) PRIMARY KEY,
    seq_no INT NOT NULL,
    defect_type VARCHAR(20) NOT NULL,
    severity ENUM('low', 'medium', 'high') NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    surface ENUM('top', 'bottom') NOT NULL,
    image_index INT NOT NULL,
    FOREIGN KEY (seq_no) REFERENCES steels(seq_no),
    INDEX idx_seq_no (seq_no)
);
```

---

## 🚀 部署建议

### 开发环境
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 生产环境
```bash
# 使用 gunicorn + uvicorn workers
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Nginx 反向代理
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /health {
    proxy_pass http://127.0.0.1:8000/health;
}
```

---

## 📞 联系前端

实现完成后，通知前端：

1. ✅ 后端 API 已就绪
2. 📍 API 地址：`http://your-server:8000`
3. 🧪 提供测试数据（至少 3 条钢板记录）
4. 📝 说明任何与文档不同的地方

前端会：
1. 切换到生产模式
2. 验证数据加载
3. 反馈问题（如果有）

---

**需要前端配合？**  
→ 让前端查看 `API_INTEGRATION_GUIDE.md`  
→ 一起对照 `guidelines/Guidelines.md` 确认接口规范

**祝开发顺利！** 🎉
