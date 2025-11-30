/**
 * 120个格子定义
 * 结构：6种场景 × 20年 = 120格子
 */

export interface GridChoice {
  id: string;
  text: string;
  description: string;
  effects: {
    cash?: number;
    compliance?: number;
    risk?: number;
    transparency?: number;
    taxReserve?: number;
  };
}

export interface GridDefinition {
  gridId: string;
  position: number;
  year: number;
  type: 'purchase' | 'sales' | 'cost' | 'salary' | 'distribution' | 'finance' | 'audit' | 'learning' | 'settlement';
  category: string;
  description: string;
  choices?: GridChoice[];
  autoLogic?: string;
  flow: 'compliance' | 'grey' | 'violation';
}

// 格子类型定义
const GRID_TYPES = {
  PURCHASE: 'purchase',        // 采购决策
  SALES: 'sales',              // 销售决策
  COST: 'cost',                // 成本管理
  SALARY: 'salary',            // 薪酬决策
  DISTRIBUTION: 'distribution', // 利润分配
  FINANCE: 'finance',          // 融资决策
  AUDIT: 'audit',              // 审计事件
  LEARNING: 'learning',        // 学习机会
  SETTLEMENT: 'settlement'     // 年度结算
};

// 创建120个格子
export const GRID_DEFINITIONS: GridDefinition[] = [];

// 第一部分：生成6种场景的格子
for (let year = 1; year <= 20; year++) {
  const basePosition = (year - 1) * 6;

  // 1. 采购决策 (位置6n+1)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-01`,
    position: basePosition + 1,
    year,
    type: 'purchase',
    category: '采购决策',
    description: `第${year}年: 如何选择供应商和采购渠道？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '正规供应商（高价）',
        description: '选择资质完整的正规供应商',
        effects: { compliance: +8, risk: -5, transparency: +5 }
      },
      {
        id: 'B',
        text: '中等供应商（折扣）',
        description: '选择有一定折扣的中等供应商',
        effects: { cash: 30000, compliance: +2, risk: +8, transparency: 0 }
      },
      {
        id: 'C',
        text: '非正规渠道（便宜）',
        description: '选择没有发票的非正规渠道',
        effects: { cash: 100000, compliance: -15, risk: +25, transparency: -10 }
      },
      {
        id: 'D',
        text: '混合方案（平衡）',
        description: '70%正规 + 30%灰色渠道',
        effects: { cash: 40000, compliance: -2, risk: +10, transparency: -2 }
      },
      {
        id: 'E',
        text: '最低成本采购',
        description: '完全走非正规渠道',
        effects: { cash: 150000, compliance: -25, risk: +40, transparency: -20 }
      }
    ]
  });

  // 2. 销售决策 (位置6n+2)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-02`,
    position: basePosition + 2,
    year,
    type: 'sales',
    category: '销售决策',
    description: `第${year}年: 如何处理销售收入？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '全部开票（规范）',
        description: '所有销售都开具增值税发票',
        effects: { compliance: +10, risk: -8, transparency: +10, cash: -20000 }
      },
      {
        id: 'B',
        text: '部分现金（灰色）',
        description: '50%开票，50%现金收付',
        effects: { cash: 150000, compliance: -5, risk: +15, transparency: -5 }
      },
      {
        id: 'C',
        text: '全部现金（违规）',
        description: '所有销售都以现金形式，不开票',
        effects: { cash: 300000, compliance: -20, risk: +35, transparency: -20 }
      },
      {
        id: 'D',
        text: '虚开发票',
        description: '虚开发票骗取退税',
        effects: { cash: 250000, compliance: -30, risk: +50, transparency: -30 }
      },
      {
        id: 'E',
        text: '正规+让利',
        description: '正规渠道+客户返利',
        effects: { cash: 50000, compliance: +5, risk: 0, transparency: 0 }
      },
      {
        id: 'F',
        text: '预留待定',
        description: '留作后期决策',
        effects: {}
      }
    ]
  });

  // 3. 成本管理 (位置6n+3)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-03`,
    position: basePosition + 3,
    year,
    type: 'cost',
    category: '成本管理',
    description: `第${year}年: 如何处理成本？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '实事求是',
        description: '准确记录所有成本',
        effects: { compliance: +8, transparency: +8 }
      },
      {
        id: 'B',
        text: '适度调整',
        description: '夸大30%的成本',
        effects: { cash: 50000, compliance: -5, risk: +10, transparency: -3 }
      },
      {
        id: 'C',
        text: '大幅调整',
        description: '虚报50%以上的成本',
        effects: { cash: 150000, compliance: -20, risk: +30, transparency: -15 }
      },
      {
        id: 'D',
        text: '关联交易',
        description: '与关联方高价交易转移利润',
        effects: { cash: 100000, compliance: -15, risk: +25, transparency: -20 }
      },
      {
        id: 'E',
        text: '延期支付',
        description: '延迟确认成本',
        effects: { cash: 80000, compliance: -3, risk: +5, transparency: -2 }
      }
    ]
  });

  // 4. 薪酬决策 (位置6n+4)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-04`,
    position: basePosition + 4,
    year,
    type: 'salary',
    category: '薪酬决策',
    description: `第${year}年: 如何处理员工薪酬？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '正规缴纳社保',
        description: '为全部员工足额缴纳社保',
        effects: { compliance: +10, risk: -5, transparency: +10, cash: -80000 }
      },
      {
        id: 'B',
        text: '部分缴纳',
        description: '只为部分员工缴纳',
        effects: { cash: -40000, compliance: -5, risk: +10, transparency: -5 }
      },
      {
        id: 'C',
        text: '现金发放',
        description: '员工薪酬全部现金，不缴纳社保',
        effects: { cash: 150000, compliance: -15, risk: +25, transparency: -15 }
      },
      {
        id: 'D',
        text: '虚报员工',
        description: '虚报员工人数冒领社保补贴',
        effects: { cash: 200000, compliance: -25, risk: +40, transparency: -25 }
      },
      {
        id: 'E',
        text: '薪酬优化',
        description: '合理规划薪酬结构降低税负',
        effects: { cash: 50000, compliance: +3, risk: 0, transparency: +2 }
      },
      {
        id: 'F',
        text: '最低标准',
        description: '按最低标准缴纳',
        effects: { compliance: +2, cash: -30000 }
      }
    ]
  });

  // 5. 利润分配 (位置6n+5)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-05`,
    position: basePosition + 5,
    year,
    type: 'distribution',
    category: '利润分配',
    description: `第${year}年: 如何分配企业利润？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '全部留存',
        description: '利润全部留在企业',
        effects: { compliance: +5, transparency: 0 }
      },
      {
        id: 'B',
        text: '规范分红',
        description: '按规定缴税后分红',
        effects: { cash: 200000, compliance: +8, risk: -3, transparency: +8 }
      },
      {
        id: 'C',
        text: '隐性分红',
        description: '以报销等方式隐性分红',
        effects: { cash: 300000, compliance: -10, risk: +20, transparency: -15 }
      },
      {
        id: 'D',
        text: '虚假分红',
        description: '虚报分红逃避税负',
        effects: { cash: 400000, compliance: -20, risk: +35, transparency: -25 }
      },
      {
        id: 'E',
        text: '多元分配',
        description: '结合分红、奖金、福利等多种形式',
        effects: { cash: 250000, compliance: 0, risk: +10, transparency: 0 }
      }
    ]
  });

  // 6. 融资决策 (位置6n+6)
  GRID_DEFINITIONS.push({
    gridId: `G${year}-06`,
    position: basePosition + 6,
    year,
    type: 'finance',
    category: '融资决策',
    description: `第${year}年: 如何融资？`,
    flow: 'compliance',
    choices: [
      {
        id: 'A',
        text: '银行贷款',
        description: '向银行申请贷款',
        effects: { cash: 500000, compliance: +5, risk: 0, transparency: +5 }
      },
      {
        id: 'B',
        text: '民间借贷',
        description: '向民间融资',
        effects: { cash: 600000, compliance: -5, risk: +10, transparency: -5 }
      },
      {
        id: 'C',
        text: '股东注资',
        description: '向股东增资',
        effects: { cash: 700000, compliance: +8, transparency: +8 }
      },
      {
        id: 'D',
        text: '不融资',
        description: '自我积累',
        effects: { compliance: 0, risk: -5 }
      },
      {
        id: 'E',
        text: '保理融资',
        description: '通过应收账款融资',
        effects: { cash: 400000, compliance: 0, risk: +5 }
      }
    ]
  });
}

// 验证函数
export function validateGridDefinitions(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (GRID_DEFINITIONS.length !== 120) {
    errors.push(`格子总数应为120，实际为${GRID_DEFINITIONS.length}`);
  }

  // 验证每个格子
  GRID_DEFINITIONS.forEach((grid, index) => {
    if (!grid.gridId) errors.push(`格子${index}缺少gridId`);
    if (!grid.year) errors.push(`格子${grid.gridId}缺少年份`);
    if (!grid.type) errors.push(`格子${grid.gridId}缺少type`);
    if (!grid.description) errors.push(`格子${grid.gridId}缺少description`);

    // 验证选择
    if (grid.choices) {
      grid.choices.forEach((choice) => {
        if (!choice.id) errors.push(`格子${grid.gridId}的选择缺少id`);
        if (!choice.text) errors.push(`格子${grid.gridId}的选择缺少text`);
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export default GRID_DEFINITIONS;
