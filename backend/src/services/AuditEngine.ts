/**
 * 审计引擎 - 处理所有审计相关逻辑
 */

export interface AuditRecord {
  id: string;
  playerId: string;
  year: number;
  reason: string;
  findings: any;
  penalty: number;
  status: 'passed' | 'light_violation' | 'serious_violation' | 'criminal';
}

class AuditEngine {
  /**
   * 执行审计
   */
  executeAudit(
    playerId: string,
    year: number,
    compliance: number,
    risk: number,
    income: number
  ): AuditRecord {
    const id = `audit_${playerId}_${year}_${Date.now()}`;
    let status: AuditRecord['status'] = 'passed';
    let penalty = 0;

    // 根据合规意识和风险值判断审计结果
    if (compliance < 20) {
      status = 'criminal';
      penalty = income * 1.5; // 罚款150%的收入
    } else if (compliance < 40) {
      status = 'serious_violation';
      penalty = income * 0.5; // 罚款50%的收入
    } else if (compliance < 70) {
      status = 'light_violation';
      penalty = income * 0.2; // 罚款20%的收入
    }

    return {
      id,
      playerId,
      year,
      reason: this.getAuditReason(compliance, risk),
      findings: {
        compliance,
        risk,
        income,
        detectedIssues: this.detectIssues(compliance, risk)
      },
      penalty,
      status
    };
  }

  /**
   * 获取审计原因
   */
  private getAuditReason(compliance: number, risk: number): string {
    if (compliance < 20) {
      return '严重合规违规，涉嫌刑事责任';
    } else if (compliance < 40) {
      return '存在严重违规行为';
    } else if (compliance < 70) {
      return '发现轻微违规行为';
    } else if (risk > 70) {
      return '高风险提示，需要审计';
    } else {
      return '常规审计检查';
    }
  }

  /**
   * 检测具体问题
   */
  private detectIssues(compliance: number, risk: number): string[] {
    const issues: string[] = [];

    if (risk > 70) issues.push('现金流异常');
    if (compliance < 40) issues.push('税务不规范');
    if (risk > 50) issues.push('成本虚报嫌疑');
    if (compliance < 60) issues.push('薪酬社保问题');

    return issues.length > 0 ? issues : ['审计通过'];
  }

  /**
   * 计算罚款金额
   */
  calculatePenalty(
    status: AuditRecord['status'],
    taxAmount: number,
    unpaidTax: number
  ): number {
    const penalties = {
      passed: 0,
      light_violation: unpaidTax * 0.5, // 罚款50%
      serious_violation: unpaidTax * 1.5, // 罚款150%
      criminal: unpaidTax * 2 // 罚款200%
    };
    return penalties[status];
  }
}

export default new AuditEngine();
