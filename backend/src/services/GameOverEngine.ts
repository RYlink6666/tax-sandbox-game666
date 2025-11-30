/**
 * 游戏结束引擎 - 判断游戏是否结束
 */

export interface GameOverResult {
  isGameOver: boolean;
  reason?: string;
  status?: 'completed' | 'bankrupt' | 'criminal';
  finalScore?: number;
}

class GameOverEngine {
  /**
   * 检查游戏是否结束
   */
  checkGameOver(
    year: number,
    position: number,
    cash: number,
    compliance: number,
    status: string
  ): GameOverResult {
    // 检查是否完成20年
    if (year >= 20 && position >= 120) {
      return {
        isGameOver: true,
        reason: '恭喜！成功完成20年经营！',
        status: 'completed',
        finalScore: this.calculateFinalScore(cash, compliance)
      };
    }

    // 检查是否破产
    if (cash < 0) {
      return {
        isGameOver: true,
        reason: '资金不足，企业破产！',
        status: 'bankrupt'
      };
    }

    // 检查是否触发刑事处罚
    if (compliance < 0) {
      return {
        isGameOver: true,
        reason: '合规意识过低，触发刑事责任！',
        status: 'criminal'
      };
    }

    // 游戏继续
    return {
      isGameOver: false
    };
  }

  /**
   * 计算最终得分
   */
  private calculateFinalScore(cash: number, compliance: number): number {
    // 现金权重40%，合规权重60%
    const cashScore = Math.max(0, Math.min(100, cash / 1000000 * 100));
    const complianceScore = Math.max(0, Math.min(100, compliance));

    return Math.round(cashScore * 0.4 + complianceScore * 0.6);
  }

  /**
   * 获取排名等级
   */
  getRankLevel(score: number): string {
    if (score >= 90) return 'S级 - 优秀';
    if (score >= 75) return 'A级 - 良好';
    if (score >= 60) return 'B级 - 中等';
    if (score >= 45) return 'C级 - 及格';
    return 'D级 - 不及格';
  }
}

export default new GameOverEngine();
