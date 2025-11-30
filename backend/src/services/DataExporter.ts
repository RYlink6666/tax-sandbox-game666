/**
 * 数据导出器 - 导出游戏数据
 */

class DataExporter {
  /**
   * 导出为CSV
   */
  exportToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    // 获取所有键
    const keys = Object.keys(data[0]);
    const headers = keys.join(',');

    // 生成行数据
    const rows = data.map((row) => {
      return keys
        .map((key) => {
          const value = row[key];
          // 处理特殊字符
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * 导出为JSON
   */
  exportToJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出为HTML报告
   */
  exportToHTML(playerName: string, gameData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${playerName}的游戏报告</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; }
    .stat { display: inline-block; margin: 10px 20px 10px 0; }
  </style>
</head>
<body>
  <h1>${playerName}的游戏报告</h1>
  <div class="stats">
    <div class="stat"><strong>最终现金:</strong> ¥${gameData.finalCash.toLocaleString()}</div>
    <div class="stat"><strong>合规意识:</strong> ${gameData.finalCompliance}%</div>
    <div class="stat"><strong>风险值:</strong> ${gameData.finalRisk}%</div>
    <div class="stat"><strong>完成年份:</strong> ${gameData.year}/20</div>
  </div>
  <h2>决策历史</h2>
  <table>
    <tr>
      <th>年份</th>
      <th>格子</th>
      <th>决策</th>
      <th>效果</th>
    </tr>
    <!-- 决策记录行 -->
  </table>
</body>
</html>
    `;
  }
}

export default new DataExporter();
