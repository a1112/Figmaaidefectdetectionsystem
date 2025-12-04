生产模式下，不再显示上传图像按钮，也不再显示 DRAG & DROP IMAGE，如果无缺陷，缺陷界面直接显示 无缺陷数据。
缺陷列表的获取url 是 ：GET /api/ui/defects/{seq_no}（同样可带 surface surface 只能是 top 或 bottom）

1. 最近钢板列表 /api/ui/steels?limit=…

- 返回体：

{
"steels": [
{
"seq_no": 123, // 序列号
"steel_no": "SP240001", // 钢板号/卷号
"steel_type": "SPCC", // 钢种
"length": 12000, // 长度（可能为空，单位 mm）
"width": 1500, // 宽度（可能为空，单位 mm）
"thickness": 20, // 厚度（可能为空，单位 mm）
"timestamp": "2023-11-13T13:12:19", // 检测时间
"level": "A|B|C|D", // 等级
"defect_count": 5 // 缺陷数量（可能为空）
}
// … 按 seq_no 降序/升序
],
"total": 50 // steels 数组长度
}

2. 缺陷列表 /api/ui/defects/{seq_no}（可选 ?surface=top/bottom）

- 返回体：

{
"seq_no": 123, // 对应的序列号
"defects": [
{
"defect_id": "10001", // 缺陷 ID
"defect_type": "纵向裂纹", // 缺陷类型（根据 defectClass 映射，未知则“未知缺陷”）
"severity": "low|medium|high", // 根据 grade 粗略映射
"x": 10, "y": 20, // 缺陷在图像中的左上角坐标（px）
"width": 30, "height": 40, // 缺陷框尺寸（px）
"confidence": 1.0, // 目前固定 1.0（无置信度字段）
"surface": "top|bottom", // 表面
"image_index": 0 // 图像索引（无则为 0）
}
// …
],
"total_count": 10 // defects 数组长度
}

3. 健康检查 /health

- 返回体：

{
"status": "healthy|unhealthy",
"timestamp": "2025-12-03T08:00:00.123456",
"version": "0.1.0",
"database": { "connected": true, "latency_ms": null }
}
4, 缺陷字典 /api/defect-classes - 返回体：
{
"num": 12,
"items": [
{
"class": 0,
"name": "noclass",
"tag": "N0",
"color": { "red": 0, "green": 255, "blue": 64 },
"desc": "未命名",
"parent": []
},
{
"class": 1, "name": "verCrack", "tag": "L0",
"color": { "red": 174, "green": 0, "blue": 0 },
"desc": "纵向裂纹", "parent": []
},
{
"class": 2, "name": "horCrack", "tag": "L1",
"color": { "red": 128, "green": 64, "blue": 64 },
"desc": "横向裂纹", "parent": []
},

• 获取缺陷对应图像有两种方式：

1. 直接按帧取图：
   GET /api/images/frame?surface={top|bottom}&seq_no={SEQ}&image_index={INDEX} // 获取大图 然后绘制缺陷矩形
   - surface: 上/下表面
   - seq_no: 序列号
   - image_index: 图像索引（在缺陷列表里通常能拿到）
   - 可选：width/height 缩放输出，view，fmt(默认 JPEG)。
2. 按缺陷裁剪：
   GET /api/images/defect/{defect_id}?surface={top|bottom}
   - 后端会找到对应缺陷，按缺陷框裁剪并返回图像；响应头会带 X-Seq-No、X-Image-Index 等元数据。
   - 可选：expand（扩框 px）、width/height 缩放输出，fmt(默认 JPEG)。

增加 缺陷界面 列表 选中，选中则 在 界面上显示对应的缺陷
增加 大图，单缺陷 的 显示切换