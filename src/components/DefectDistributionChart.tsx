import { Defect } from '../App';

interface DefectDistributionChartProps {
  defects: Defect[];
  surface: 'all' | 'top' | 'bottom';
  defectColors?: { [key: string]: { bg: string; border: string; text: string } };
}

export function DefectDistributionChart({ defects, surface, defectColors }: DefectDistributionChartProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getDefectBorderColor = (type: string) => {
    if (defectColors && defectColors[type]) {
      // 从Tailwind类名中提取颜色
      const colorMatch = defectColors[type].border.match(/border-(\w+)-(\d+)/);
      if (colorMatch) {
        return `border-${colorMatch[1]}-${colorMatch[2]}`;
      }
    }
    return 'border-primary';
  };

  const getDefectTextColor = (type: string) => {
    if (defectColors && defectColors[type]) {
      return defectColors[type].text;
    }
    return 'text-primary';
  };

  // 模拟示例数据
  const sampleDefects: Defect[] = [
    { id: 'sample-1', type: '纵向裂纹', severity: 'high', confidence: 0.89, x: 120, y: 80, width: 25, height: 45, surface: 'top' },
    { id: 'sample-2', type: '划伤', severity: 'medium', confidence: 0.76, x: 220, y: 160, width: 35, height: 12, surface: 'top' },
    { id: 'sample-3', type: '辊印', severity: 'low', confidence: 0.82, x: 70, y: 220, width: 18, height: 28, surface: 'bottom' },
    { id: 'sample-4', type: '横向裂纹', severity: 'high', confidence: 0.92, x: 280, y: 100, width: 40, height: 8, surface: 'top' },
    { id: 'sample-5', type: '孔洞', severity: 'medium', confidence: 0.85, x: 150, y: 190, width: 15, height: 15, surface: 'bottom' },
  ];

  // 如果没有真实缺陷数据，使用示例数据
  const displayDefects = defects.length === 0 ? sampleDefects : defects;
  const filteredDefects = displayDefects.filter(d => 
    surface === 'all' || d.surface === surface
  );

  // 钢板尺寸（用于显示）
  const plateWidth = 320;
  const plateHeight = 240;

  return (
    <div className="h-full flex flex-col">
      {defects.length === 0 && (
        <div className="text-center text-[10px] text-muted-foreground/50 mb-2 py-1 border-b border-border/30">
          SHOWING SAMPLE DATA
        </div>
      )}
      
      <div className="flex-1 flex items-center justify-center p-4">
        {/* 钢板轮廓 */}
        <div 
          className="relative border-2 border-foreground/60 bg-muted/5"
          style={{ width: plateWidth, height: plateHeight }}
        >
          {/* 钢板标题 */}
          <div className="absolute -top-5 left-0 right-0 text-center text-[10px] text-muted-foreground/50 font-mono">
            {surface === 'top' ? 'TOP SURFACE' : surface === 'bottom' ? 'BOTTOM SURFACE' : 'ALL SURFACES'}
          </div>

          {/* 钢板参考网格 */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 9 }).map((_, i) => (
              <div 
                key={`h-${i}`} 
                className="absolute w-full border-t border-muted-foreground/30"
                style={{ top: `${(i + 1) * 10}%` }}
              />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <div 
                key={`v-${i}`} 
                className="absolute h-full border-l border-muted-foreground/30"
                style={{ left: `${(i + 1) * 10}%` }}
              />
            ))}
          </div>

          {/* 缺陷检测矩形 */}
          {filteredDefects.map((defect) => {
            // 将实际坐标映射到显示区域（假设原始图片是 400x300）
            const displayX = (defect.x / 400) * plateWidth;
            const displayY = (defect.y / 300) * plateHeight;
            const displayWidth = (defect.width / 400) * plateWidth;
            const displayHeight = (defect.height / 300) * plateHeight;

            const borderColor = getDefectBorderColor(defect.type);

            return (
              <div
                key={defect.id}
                className={`absolute border-2 ${borderColor} ${defects.length === 0 ? 'opacity-60' : ''}`}
                style={{
                  left: displayX,
                  top: displayY,
                  width: displayWidth,
                  height: displayHeight,
                }}
                title={`${defect.type} - ${defect.severity} (${Math.round(defect.confidence * 100)}%)`}
              >
                {/* 左上角标记点 */}
                <div className={`absolute -top-1 -left-1 w-2 h-2 rounded-full ${getSeverityColor(defect.severity)} border border-background`} />
                
                {/* 缺陷标签 */}
                <div className={`absolute -top-4 left-0 text-[8px] font-mono whitespace-nowrap ${getDefectTextColor(defect.type)}`}>
                  {defect.type.substring(0, 4)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-red-500"></div>
            <span className="text-muted-foreground">HIGH</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-yellow-500"></div>
            <span className="text-muted-foreground">MEDIUM</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-green-500"></div>
            <span className="text-muted-foreground">LOW</span>
          </div>
        </div>
        
        {filteredDefects.length > 0 && (
          <div className="text-center text-[10px] text-muted-foreground/50 mt-2">
            {filteredDefects.length} DEFECT{filteredDefects.length !== 1 ? 'S' : ''} DISPLAYED
          </div>
        )}
      </div>
    </div>
  );
}