/**
 * 完整集成测试套件
 * 验证整个游戏流程的完整性
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sqlite3 from 'sqlite3';
import { GRID_DEFINITIONS, validateGridDefinitions } from '../data/gridDefinitions';

describe('完整游戏流程集成测试', () => {
  let db: sqlite3.Database;

  beforeAll(() => {
    // 初始化内存数据库用于测试
    db = new sqlite3.Database(':memory:');
  });

  afterAll(() => {
    db.close();
  });

  describe('格子定义验证', () => {
    it('应该加载120个格子', () => {
      expect(GRID_DEFINITIONS).toHaveLength(120);
    });

    it('所有格子应该有唯一ID', () => {
      const ids = GRID_DEFINITIONS.map((g) => g.gridId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(120);
    });

    it('Position编号应该从1到120连续', () => {
      const positions = GRID_DEFINITIONS.map((g) => g.position).sort((a, b) => a - b);
      expect(positions[0]).toBe(1);
      expect(positions[119]).toBe(120);
      
      for (let i = 0; i < 120; i++) {
        expect(positions[i]).toBe(i + 1);
      }
    });

    it('每年应该有6个格子', () => {
      for (let year = 1; year <= 20; year++) {
        const yearGrids = GRID_DEFINITIONS.filter((g) => g.year === year);
        expect(yearGrids).toHaveLength(6);
      }
    });

    it('格子定义验证应该通过', () => {
      const result = validateGridDefinitions();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该包含所有6大场景', () => {
      const scenes = new Set(
        GRID_DEFINITIONS.map((g) => g.sceneType)
      );
      expect(scenes.has('procurement')).toBe(true);
      expect(scenes.has('sales')).toBe(true);
      expect(scenes.has('cost')).toBe(true);
      expect(scenes.has('salary')).toBe(true);
      expect(scenes.has('dividend')).toBe(true);
      expect(scenes.has('financing')).toBe(true);
    });
  });

  describe('难度递增验证', () => {
    it('Year 1-5应该难度较低', () => {
      const grids = GRID_DEFINITIONS.filter((g) => g.year <= 5);
      grids.forEach((g) => {
        expect(g.difficulty).toBeLessThanOrEqual(1.5);
      });
    });

    it('Year 16-20应该难度较高', () => {
      const grids = GRID_DEFINITIONS.filter((g) => g.year >= 16);
      grids.forEach((g) => {
        expect(g.difficulty).toBeGreaterThanOrEqual(1.5);
      });
    });

    it('难度应该随年份单调递增', () => {
      const avgDifficultyByYear = new Map<number, number>();
      
      for (let year = 1; year <= 20; year++) {
        const grids = GRID_DEFINITIONS.filter((g) => g.year === year);
        const avgDiff = grids.reduce((sum, g) => sum + g.difficulty, 0) / grids.length;
        avgDifficultyByYear.set(year, avgDiff);
      }

      const diffArray = Array.from(avgDifficultyByYear.entries());
      for (let i = 1; i < diffArray.length; i++) {
        expect(diffArray[i][1]).toBeGreaterThanOrEqual(diffArray[i - 1][1]);
      }
    });
  });

  describe('选项和效果验证', () => {
    it('采购格应该有5个选项', () => {
      const procurementGrids = GRID_DEFINITIONS.filter(
        (g) => g.sceneType === 'procurement'
      );
      procurementGrids.forEach((g) => {
        if (g.choices) {
          expect(g.choices).toHaveLength(5);
        }
      });
    });

    it('销售格应该有6个选项', () => {
      const salesGrids = GRID_DEFINITIONS.filter(
        (g) => g.sceneType === 'sales'
      );
      salesGrids.forEach((g) => {
        if (g.choices) {
          expect(g.choices).toHaveLength(6);
        }
      });
    });

    it('每个选项应该有有效的效果值', () => {
      GRID_DEFINITIONS.forEach((grid) => {
        if (grid.choices) {
          grid.choices.forEach((choice) => {
            expect(choice.effects).toBeDefined();
            expect(typeof choice.effects.cash).toBe('number');
            expect(typeof choice.effects.compliance).toBe('number');
            expect(typeof choice.effects.risk).toBe('number');
          });
        }
      });
    });

    it('三层流选项应该有差异化效果', () => {
      GRID_DEFINITIONS.forEach((grid) => {
        if (grid.choices) {
          grid.choices.forEach((choice) => {
            if (choice.effects.gray && choice.effects.non_compliant) {
              // 违规流的风险应该更高
              expect(choice.effects.non_compliant.risk).toBeGreaterThanOrEqual(
                choice.effects.gray.risk
              );
              // 合规流的合规性应该更好
              if (choice.effects.compliant) {
                expect(choice.effects.compliant.compliance).toBeGreaterThanOrEqual(
                  choice.effects.gray.compliance
                );
              }
            }
          });
        }
      });
    });
  });

  describe('游戏流程模拟', () => {
    it('应该能模拟完整的1-20年游戏周期', () => {
      let position = 0;
      const gridsByPosition = new Map(
        GRID_DEFINITIONS.map((g) => [g.position, g])
      );

      // 模拟掷骰子20年
      for (let year = 1; year <= 20; year++) {
        for (let turn = 0; turn < 6; turn++) {
          const diceRoll = Math.floor(Math.random() * 6) + 1;
          position += diceRoll;
          
          // 超过120则循环到下一圈
          while (position > 120) {
            position -= 120;
          }

          const grid = gridsByPosition.get(position);
          expect(grid).toBeDefined();
          expect(grid?.year).toBeLessThanOrEqual(year);
        }
      }
    });

    it('应该正确处理格子位置换算', () => {
      const testCases = [
        { position: 1, expectedYear: 1 },
        { position: 6, expectedYear: 1 },
        { position: 7, expectedYear: 2 },
        { position: 60, expectedYear: 10 },
        { position: 120, expectedYear: 20 }
      ];

      testCases.forEach(({ position, expectedYear }) => {
        const grid = GRID_DEFINITIONS.find((g) => g.position === position);
        expect(grid?.year).toBe(expectedYear);
      });
    });
  });

  describe('数据一致性验证', () => {
    it('所有格子应该有有效的描述', () => {
      GRID_DEFINITIONS.forEach((grid) => {
        expect(grid.title).toBeTruthy();
        expect(grid.title.length).toBeGreaterThan(0);
        expect(grid.description).toBeTruthy();
      });
    });

    it('所有格子应该指定流类型', () => {
      GRID_DEFINITIONS.forEach((grid) => {
        expect(['compliant', 'gray', 'non_compliant', 'all']).toContain(grid.flow);
      });
    });

    it('难度值应该在有效范围内', () => {
      GRID_DEFINITIONS.forEach((grid) => {
        expect(grid.difficulty).toBeGreaterThanOrEqual(1);
        expect(grid.difficulty).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('统计分析', () => {
    it('应该能统计总选项数', () => {
      let totalChoices = 0;
      GRID_DEFINITIONS.forEach((grid) => {
        if (grid.choices) {
          totalChoices += grid.choices.length;
        }
      });
      // 120个格子 × 平均5个选项 = 600个
      expect(totalChoices).toBeGreaterThan(500);
      expect(totalChoices).toBeLessThan(750);
    });

    it('应该正确计算平均难度', () => {
      const avgDifficulty =
        GRID_DEFINITIONS.reduce((sum, g) => sum + g.difficulty, 0) /
        GRID_DEFINITIONS.length;
      // 平均难度应该在1.5-2.5之间
      expect(avgDifficulty).toBeGreaterThan(1);
      expect(avgDifficulty).toBeLessThan(3);
    });

    it('应该统计各场景的格子数', () => {
      const sceneStats: Record<string, number> = {};
      GRID_DEFINITIONS.forEach((grid) => {
        sceneStats[grid.sceneType] = (sceneStats[grid.sceneType] || 0) + 1;
      });

      // 每个场景应该有20个格子（20年）
      Object.values(sceneStats).forEach((count) => {
        expect(count).toBe(20);
      });
    });
  });
});

describe('性能测试', () => {
  it('应该快速加载所有格子', () => {
    const start = performance.now();
    const grids = GRID_DEFINITIONS;
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // 应该在100ms内
    expect(grids).toHaveLength(120);
  });

  it('应该快速查找单个格子', () => {
    const start = performance.now();
    const grid = GRID_DEFINITIONS.find((g) => g.gridId === 'Y10_G3_COST');
    const end = performance.now();

    expect(end - start).toBeLessThan(10);
    expect(grid).toBeDefined();
  });

  it('应该快速验证所有格子', () => {
    const start = performance.now();
    const result = validateGridDefinitions();
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
    expect(result.valid).toBe(true);
  });
});
