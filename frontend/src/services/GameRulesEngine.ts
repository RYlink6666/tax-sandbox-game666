/**
 * 游戏规则引擎
 * 负责计算税务指标、审计逻辑、储备扣款等
 */

export interface PlayerState {
  currentPosition: number;
  currentYear: number;
  compliance: number;           // 合规意识 0-100
  risk: number;                 // 风险值 0-100+
  transparency: number;         // 财务透明度 0-100
  riskTolerance: number;        // 风险承受度 0-100
  cash: number;                 // 现金（万元）
  taxReserve: number;           // 税务资金储备（万元）
  annualProfit: number;         // 年度利润（万元）
  knowledge: number;            // 税务知识值 0-100
  auditHistory: AuditRecord[];  // 审计历史
}

export interface AuditRecord {
  year: number;
  triggered: boolean;
  reason: string;
  fine: number;                 // 罚款（万元）
  status: 'passed' | 'warning' | 'penalty' | 'criminal';
}

export interface DecisionEffect {
  cash?: number;
  compliance?: number;
  risk?: number;
  transparency?: number;
  riskTolerance?: number;
  knowledge?: number;
}

/**
 * 税务规则引擎
 */
export class GameRulesEngine {
  /**
   * 年度结算逻辑
   * 每年结束时（每6格）自动触发
   */
  static yearlySettlement(state: PlayerState): {
    newState: PlayerState;
    settlement: YearlySettlement;
  } {
    // 1. 计算年度利润和应缴税款
    const annualTaxRate = this.calculateTaxRate(state);
    const taxPayable = Math.max(0, state.annualProfit * annualTaxRate);
    
    // 2. 检查是否被审计
    const auditResult = this.checkAudit(state);
    let fine = 0;
    let auditStatus: AuditRecord['status'] = 'passed';
    
    if (auditResult.triggered) {
      const penaltyResult = this.calculatePenalty(state, auditResult);
      fine = penaltyResult.fine;
      auditStatus = penaltyResult.status;
    }
    
    // 3. 强制提取税务储备（从利润的5-15%）
    const reservePercentage = this.getReservePercentage(state);
    const reserveExtraction = Math.max(0, state.annualProfit * reservePercentage);
    
    // 4. 处理税款和罚款支付
    let newCash = state.cash - taxPayable;
    let newReserve = state.taxReserve + reserveExtraction;
    
    if (fine > 0) {
      // 先从储备中扣罚款
      const finePaid = Math.min(fine, newReserve);
      newReserve -= finePaid;
      const fineShortfall = Math.max(0, fine - finePaid);
      
      // 不足部分从现金扣
      newCash -= fineShortfall;
    }
    
    // 5. 检查破产条件
    const isBankrupt = newCash <= 0 || state.riskTolerance <= 0;
    
    // 6. 更新状态
    const newState: PlayerState = {
      ...state,
      cash: Math.max(0, newCash),
      taxReserve: Math.max(0, newReserve),
      annualProfit: 0, // 重置年度利润
    };
    
    return {
      newState,
      settlement: {
        year: state.currentYear,
        profit: state.annualProfit,
        taxRate: annualTaxRate,
        taxPayable,
        auditTriggered: auditResult.triggered,
        auditReason: auditResult.reason,
        fine,
        reserveExtraction,
        reserveBalance: newReserve,
        isBankrupt,
      }
    };
  }

  /**
   * 计算当年税率（根据三层棋盘）
   */
  static calculateTaxRate(state: PlayerState): number {
    // 规则：
    // 合规流：15% (税收优惠)
    // 灰色流：25-38%
    // 违规流：55%
    
    if (state.compliance > 80 && state.transparency > 85) {
      return 0.15; // 合规流
    }
    
    if (state.compliance >= 50 && state.compliance <= 79) {
      // 灰色流：根据风险值调整
      const baseRate = 0.25;
      const riskAdjustment = state.risk / 100 * 0.13; // 0-13%
      return Math.min(0.38, baseRate + riskAdjustment);
    }
    
    // 违规流或高风险
    return 0.55;
  }

  /**
   * 检查是否被审计
   */
  static checkAudit(state: PlayerState): { triggered: boolean; reason: string } {
    // 必然审计条件
    if (state.compliance <= 0) {
      return { triggered: true, reason: '合规意识≤0 (必然审计)' };
    }
    
    if (state.transparency < 20) {
      return { triggered: true, reason: '财务透明度<20 (必然审计)' };
    }
    
    // 高风险审计概率
    if (state.risk > 100) {
      const auditProb = (state.risk - 100) / 100; // 100→0%, 200→100%
      if (Math.random() < Math.min(auditProb, 0.8)) {
        return { triggered: true, reason: `风险值>${state.risk} (高风险审计)` };
      }
    }
    
    // 中等风险随机审计
    if (state.risk >= 50 && state.risk <= 100) {
      if (Math.random() < 0.35) { // 35%概率
        return { triggered: true, reason: `风险值=${state.risk} (随机审计)` };
      }
    }
    
    return { triggered: false, reason: '' };
  }

  /**
   * 计算罚款金额和处罚等级
   */
  static calculatePenalty(
    state: PlayerState,
    auditResult: { triggered: boolean; reason: string }
  ): { fine: number; status: AuditRecord['status'] } {
    if (!auditResult.triggered) {
      return { fine: 0, status: 'passed' };
    }
    
    // 根据合规意识和风险值判断处罚等级
    if (state.compliance < 0 || state.risk > 200) {
      // 刑事处罚
      return {
        fine: Math.max(state.annualProfit * 3, 50), // 利润的3倍或至少50万
        status: 'criminal'
      };
    }
    
    if (state.compliance < 30 || state.risk > 150) {
      // 严重违规：补缴税款 + 罚款(补缴的200%)
      const unpaidTax = state.annualProfit * 0.25; // 按25%估计
      const penalty = unpaidTax * 2;
      return {
        fine: unpaidTax + penalty,
        status: 'penalty'
      };
    }
    
    if (state.compliance < 50 || state.risk > 100) {
      // 一般违规：补缴税款 + 罚款(补缴的50%)
      const unpaidTax = state.annualProfit * 0.15;
      const penalty = unpaidTax * 0.5;
      return {
        fine: unpaidTax + penalty,
        status: 'warning'
      };
    }
    
    // 通过审计
    return { fine: 0, status: 'passed' };
  }

  /**
   * 获取强制储备提取比例
   */
  static getReservePercentage(state: PlayerState): number {
    // 基础比例：10%
    let percentage = 0.1;
    
    // 高风险时增加比例
    if (state.risk > 100) {
      percentage = 0.15; // 增加到15%
    }
    
    // 合规时可降低
    if (state.compliance > 80) {
      percentage = 0.05; // 降低到5%
    }
    
    return percentage;
  }

  /**
   * 应用决策效果
   */
  static applyDecisionEffect(state: PlayerState, effect: DecisionEffect): PlayerState {
    let newState = { ...state };
    
    if (effect.cash !== undefined) {
      newState.cash += effect.cash;
      newState.annualProfit += effect.cash;
    }
    
    if (effect.compliance !== undefined) {
      newState.compliance = Math.max(
        -100,
        Math.min(100, newState.compliance + effect.compliance)
      );
    }
    
    if (effect.risk !== undefined) {
      newState.risk = Math.max(
        0,
        newState.risk + effect.risk
      );
    }
    
    if (effect.transparency !== undefined) {
      newState.transparency = Math.max(
        0,
        Math.min(100, newState.transparency + effect.transparency)
      );
    }
    
    if (effect.riskTolerance !== undefined) {
      newState.riskTolerance = Math.max(
        0,
        newState.riskTolerance + effect.riskTolerance
      );
    }
    
    if (effect.knowledge !== undefined) {
      newState.knowledge = Math.max(
        0,
        Math.min(100, newState.knowledge + effect.knowledge)
      );
    }
    
    return newState;
  }

  /**
   * 检查游戏是否结束
   */
  static checkGameOver(state: PlayerState): {
    isOver: boolean;
    reason: string;
  } {
    if (state.cash <= 0) {
      return { isOver: true, reason: '现金≤0：破产出局' };
    }
    
    if (state.riskTolerance <= 0) {
      return { isOver: true, reason: '风险承受度≤0：承受不住罚款，破产' };
    }
    
    if (state.compliance < -50) {
      return { isOver: true, reason: '合规意识<-50：刑事处罚，企业清算' };
    }
    
    if (state.currentPosition >= 120) {
      return { isOver: true, reason: '完成20年，游戏结束' };
    }
    
    return { isOver: false, reason: '' };
  }
}

interface YearlySettlement {
  year: number;
  profit: number;
  taxRate: number;
  taxPayable: number;
  auditTriggered: boolean;
  auditReason: string;
  fine: number;
  reserveExtraction: number;
  reserveBalance: number;
  isBankrupt: boolean;
}
