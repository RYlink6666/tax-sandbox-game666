/**
 * 分析引擎 - 游戏数据分析
 */

export interface GameStatistics {
  totalDecisions: number;
  averageComplianceChange: number;
  averageRiskChange: number;
  totalCashGain: number;
  decisionsByType: Record<string, number>;
  riskTrend: number[];
}

class AnalyticsEngine {
  /**
   * 计算玩家统计
   */
  calculateStatistics(decisions: any[]): GameStatistics {
    if (!decisions || decisions.length === 0) {
      return {
        totalDecisions: 0,
        averageComplianceChange: 0,
        averageRiskChange: 0,
        totalCashGain: 0,
        decisionsByType: {},
        riskTrend: []
      };
    }

    const totalDecisions = decisions.length;
    const totalComplianceChange = decisions.reduce((sum, d) => sum + (d.compliance_change || 0), 0);
    const totalRiskChange = decisions.reduce((sum, d) => sum + (d.risk_change || 0), 0);
    const totalCashGain = decisions.reduce((sum, d) => sum + (d.cash_change || 0), 0);

    const decisionsByType: Record<string, number> = {};
    decisions.forEach((d) => {
      decisionsByType[d.grid_type] = (decisionsByType[d.grid_type] || 0) + 1;
    });

    const riskTrend = this.calculateRiskTrend(decisions);

    return {
      totalDecisions,
      averageComplianceChange: totalComplianceChange / totalDecisions,
      averageRiskChange: totalRiskChange / totalDecisions,
      totalCashGain,
      decisionsByType,
      riskTrend
    };
  }

  /**
   * 计算风险趋势
   */
  private calculateRiskTrend(decisions: any[]): number[] {
    const trend: number[] = [];
    let currentRisk = 50; // 初始风险值

    decisions.forEach((d) => {
      currentRisk += d.risk_change || 0;
      currentRisk = Math.max(0, Math.min(100, currentRisk));
      trend.push(currentRisk);
    });

    return trend;
  }

  /**
   * 比较多个玩家
   */
  comparePlayersStatistics(
    playersStats: Array<{ name: string; stats: GameStatistics }>
  ): any {
    return {
      players: playersStats,
      averageCashGain: playersStats.reduce((sum, p) => sum + p.stats.totalCashGain, 0) / playersStats.length,
      averageComplianceChange:
        playersStats.reduce((sum, p) => sum + p.stats.averageComplianceChange, 0) / playersStats.length,
      ranking: playersStats.sort((a, b) => b.stats.totalCashGain - a.stats.totalCashGain)
    };
  }

  /**
   * 生成洞察
   */
  generateInsights(stats: GameStatistics): string[] {
    const insights: string[] = [];

    if (stats.averageRiskChange > 5) {
      insights.push('⚠️ 你的决策倾向增加风险值');
    }

    if (stats.averageComplianceChange < -2) {
      insights.push('⚠️ 你的合规意识持续下降');
    }

    if (stats.totalCashGain > 500000) {
      insights.push('💰 你获得了大量现金收益');
    }

    if (Object.keys(stats.decisionsByType).length <= 2) {
      insights.push('💡 尝试更多不同类型的决策');
    }

    return insights;
  }
}

export default new AnalyticsEngine();
