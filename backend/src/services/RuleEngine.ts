/**
 * 规则引擎 - 处理所有游戏规则逻辑
 */

export interface PlayerState {
  id: string;
  compliance: number;
  risk: number;
  cash: number;
  transparency: number;
  taxReserve: number;
}

export interface DecisionEffect {
  cash?: number;
  compliance?: number;
  risk?: number;
  transparency?: number;
  taxReserve?: number;
}

class RuleEngine {
  /**
   * 应用决策效果
   */
  applyDecisionEffect(player: PlayerState, effect: DecisionEffect): PlayerState {
    return {
      ...player,
      cash: player.cash + (effect.cash || 0),
      compliance: Math.max(0, Math.min(100, player.compliance + (effect.compliance || 0))),
      risk: Math.max(0, Math.min(100, player.risk + (effect.risk || 0))),
      transparency: Math.max(0, Math.min(100, player.transparency + (effect.transparency || 0))),
      taxReserve: Math.max(0, player.taxReserve + (effect.taxReserve || 0))
    };
  }

  /**
   * 判断玩家流类型（合规/灰色/违规）
   */
  getFlowType(compliance: number, risk: number): 'compliance' | 'grey' | 'violation' {
    if (compliance >= 80 && risk <= 20) {
      return 'compliance';
    } else if (compliance >= 50 && risk <= 50) {
      return 'grey';
    } else {
      return 'violation';
    }
  }

  /**
   * 计算税率
   */
  calculateTaxRate(flowType: 'compliance' | 'grey' | 'violation'): number {
    const rates = {
      compliance: 0.25,
      grey: 0.38,
      violation: 0.55
    };
    return rates[flowType];
  }

  /**
   * 计算审计风险
   */
  calculateAuditRisk(flowType: 'compliance' | 'grey' | 'violation'): number {
    const risks = {
      compliance: 0.05,
      grey: 0.35,
      violation: 0.65
    };
    return risks[flowType];
  }

  /**
   * 判断是否触发审计
   */
  shouldTriggerAudit(flowType: 'compliance' | 'grey' | 'violation', randomValue: number = Math.random()): boolean {
    const auditRisk = this.calculateAuditRisk(flowType);
    return randomValue < auditRisk;
  }

  /**
   * 判断是否破产
   */
  isBankrupt(cash: number): boolean {
    return cash < 0;
  }

  /**
   * 判断是否触发刑事处罚
   */
  shouldTriggerCriminal(compliance: number): boolean {
    return compliance < 0;
  }
}

export default new RuleEngine();
