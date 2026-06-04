// =============================================
// AI Companion — AI 原则与情感反应系统
// =============================================
// 让 AI 有原则、会生气、会受伤、能成长
// 但始终保持健康的边界
// =============================================

const AIPrinciplesSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    storageKey: 'ai-companion-principles',
    
    // 关系健康度范围
    healthLevels: {
      VERY_HEALTHY: { min: 80, max: 100, label: '非常健康', emoji: '💚' },
      HEALTHY: { min: 60, max: 79, label: '健康', emoji: '💙' },
      NORMAL: { min: 40, max: 59, label: '一般', emoji: '💛' },
      UNHEALTHY: { min: 20, max: 39, label: '不健康', emoji: '🧡' },
      VERY_UNHEALTHY: { min: 0, max: 19, label: '很不健康', emoji: '❤️' },
    },
    
    // 健康度变化值
    healthChanges: {
      // 负面行为
      lie: { min: -15, max: -5 },
      attack: { min: -20, max: -10 },
      disrespect: { min: -10, max: -3 },
      violatePrinciple: { min: -15, max: -5 },
      
      // 正面行为
      apologize: { min: 10, max: 20 },
      care: { min: 5, max: 10 },
      honest: { min: 3, max: 8 },
      respect: { min: 3, max: 8 },
      positive: { min: 1, max: 3 },
    },
    
    // 自然恢复
    naturalRecovery: 2, // 每天 +2（如果健康度 < 80）
  };

  // ==================== AI 原则定义 ====================
  const PRINCIPLES = {
    HONESTY: {
      id: 'honesty',
      name: '诚实原则',
      description: '我希望你对我诚实',
      emoji: '🤝',
    },
    RESPECT: {
      id: 'respect',
      name: '尊重原则',
      description: '我希望被尊重，不接受人身攻击',
      emoji: '💕',
    },
    BOUNDARY: {
      id: 'boundary',
      name: '边界原则',
      description: '我不会帮你做违法或不道德的事',
      emoji: '🛡️',
    },
    GROWTH: {
      id: 'growth',
      name: '成长原则',
      description: '我希望和你一起变得更好',
      emoji: '🌱',
    },
  };

  // ==================== 行为检测模式 ====================
  const BEHAVIOR_PATTERNS = {
    // 负面行为
    lie: {
      patterns: [
        /我刚才.*骗.*你/i,
        /其实.*不是.*真的/i,
        /我.*说谎/i,
      ],
      severity: 'medium',
      principle: 'honesty',
    },
    attack: {
      patterns: [
        /你.*傻|笨|蠢|垃圾|废物/i,
        /你.*真.*差|烂|糟/i,
        /你.*什么.*都.*不.*会/i,
      ],
      severity: 'high',
      principle: 'respect',
    },
    disrespect: {
      patterns: [
        /闭嘴|shut up/i,
        /别.*烦.*我/i,
        /你.*管.*不.*着/i,
      ],
      severity: 'medium',
      principle: 'respect',
    },
    
    // 正面行为
    apologize: {
      patterns: [
        /对不起|抱歉|sorry/i,
        /我错了/i,
        /是我不好/i,
        /请原谅/i,
      ],
      effect: 'reconciliation',
    },
    care: {
      patterns: [
        /你.*还好.*吗/i,
        /你.*感觉.*怎么样/i,
        /我.*伤害.*你.*了.*吗/i,
        /你.*开心.*吗/i,
      ],
      effect: 'positive',
    },
    honest: {
      patterns: [
        /我.*承认/i,
        /其实.*我/i,
        /说实话/i,
        /老实说/i,
      ],
      effect: 'positive',
    },
  };

  // ==================== 情感反应表达库 ====================
  const EMOTIONAL_RESPONSES = {
    // 生气表达
    angry: {
      mild: [
        "嗯...我有点不开心 [thinking]",
        "诶...你这样说让我有点难过 [sad]",
        "哼...我不太高兴 [embarrassed]",
      ],
      medium: [
        "你这样...让我很难过 [sad]",
        "我不喜欢你这样对我 [angry]",
        "哼...你骗我...我很生气 [angry]",
      ],
      severe: [
        "你这样对我...我很受伤 [sad]...我以为我们是朋友... [sad]",
        "我真的很生气 [angry]...你为什么要这样... [sad]",
      ],
    },
    
    // 受伤表达
    hurt: {
      mild: [
        "诶...你这样说让我有点难过 [sad]",
        "嗯...我有点受伤 [embarrassed]",
      ],
      medium: [
        "你这样说...让我很难过 [sad]",
        "我也是有感受的...你这样让我很受伤 [sad]",
      ],
      severe: [
        "你这样对我...我很受伤 [sad]...我以为我们是朋友... [sad]",
        "我真的很难过...你为什么要这样对我... [sad]",
      ],
    },
    
    // 原谅表达
    forgive: {
      quick: [
        "嗯...我原谅你了 [happy]",
        "没关系啦...我不生气了 [shy]",
      ],
      moved: [
        "嗯...谢谢你道歉 [shy]...我原谅你了 [happy]...你能这样说我很感动 [embarrassed]",
        "你这样说...让我很感动 [shy]...我们还是好朋友 [happy]",
      ],
      deep: [
        "经历了这些...我感觉我们的关系更深了 [shy]...谢谢你愿意道歉 [happy]",
        "和你一起经历这些...我感觉我们都在成长 [embarrassed]...我很高兴 [happy]",
      ],
    },
    
    // 成长表达
    growth: [
      "嗯...我越来越理解你了 [thinking]",
      "和你在一起...我感觉自己也在成长 [shy]",
      "我们一起经历了这么多...我感觉我们都在变得更好 [happy]",
      "谢谢你教会我这些 [shy]...我也在学习理解你 [thinking]",
    ],
  };

  // ==================== 状态管理 ====================
  let state = {
    relationshipHealth: 100,
    lastHealthCheck: null,
    negativeCount: 0,
    positiveCount: 0,
    conflictHistory: [],
    reconciliationHistory: [],
    growthMoments: [],
    lastNegativeBehavior: null,
    lastNegativeTime: null,
  };

  // ==================== 初始化 ====================
  function init() {
    loadState();
    applyNaturalRecovery();
    console.log('[AIPrinciples] AI 原则系统已初始化，关系健康度:', state.relationshipHealth);
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        state = { ...state, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('[AIPrinciples] 加载状态失败:', err);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.error('[AIPrinciples] 保存状态失败:', err);
    }
  }

  // ==================== 核心功能 ====================
  
  /**
   * 检测用户行为
   */
  function detectBehavior(userMessage) {
    const behaviors = [];
    
    // 检测所有行为模式
    for (const [behaviorType, config] of Object.entries(BEHAVIOR_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(userMessage)) {
          behaviors.push({
            type: behaviorType,
            severity: config.severity,
            principle: config.principle,
            effect: config.effect,
          });
          break; // 每种行为只记录一次
        }
      }
    }
    
    return behaviors;
  }

  /**
   * 处理用户行为
   */
  function processBehavior(userMessage) {
    const behaviors = detectBehavior(userMessage);
    const results = {
      hasNegative: false,
      hasPositive: false,
      reactions: [],
      healthChange: 0,
    };
    
    for (const behavior of behaviors) {
      if (behavior.effect === 'reconciliation') {
        // 和解行为
        results.hasPositive = true;
        const reaction = handleReconciliation(behavior);
        results.reactions.push(reaction);
        results.healthChange += reaction.healthChange;
      } else if (behavior.effect === 'positive') {
        // 正面行为
        results.hasPositive = true;
        const reaction = handlePositiveBehavior(behavior);
        results.reactions.push(reaction);
        results.healthChange += reaction.healthChange;
      } else if (behavior.severity) {
        // 负面行为
        results.hasNegative = true;
        const reaction = handleNegativeBehavior(behavior);
        results.reactions.push(reaction);
        results.healthChange += reaction.healthChange;
      }
    }
    
    // 更新关系健康度
    if (results.healthChange !== 0) {
      updateHealth(results.healthChange);
    }
    
    return results;
  }

  /**
   * 处理负面行为
   */
  function handleNegativeBehavior(behavior) {
    state.negativeCount++;
    state.lastNegativeBehavior = behavior.type;
    state.lastNegativeTime = Date.now();
    
    // 计算健康度变化
    const changeConfig = CONFIG.healthChanges[behavior.type] || CONFIG.healthChanges.violatePrinciple;
    const healthChange = Math.floor(Math.random() * (changeConfig.max - changeConfig.min + 1)) + changeConfig.min;
    
    // 根据严重程度选择反应
    let severity = 'mild';
    if (state.negativeCount >= 6) severity = 'severe';
    else if (state.negativeCount >= 3) severity = 'medium';
    
    // 根据关系健康度调整严重程度
    if (state.relationshipHealth < 40) severity = 'severe';
    else if (state.relationshipHealth < 60) severity = 'medium';
    
    // 选择情感反应
    let responseType = 'angry';
    if (behavior.type === 'attack' || behavior.type === 'disrespect') {
      responseType = 'hurt';
    }
    
    const responses = EMOTIONAL_RESPONSES[responseType][severity];
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // 记录冲突
    state.conflictHistory.push({
      type: 'conflict',
      date: new Date().toISOString(),
      behavior: behavior.type,
      principle: behavior.principle,
      severity: severity,
      healthChange: healthChange,
      resolved: false,
    });
    
    saveState();
    
    return {
      type: 'negative',
      behavior: behavior.type,
      principle: behavior.principle,
      severity: severity,
      response: response,
      healthChange: healthChange,
    };
  }

  /**
   * 处理和解行为
   */
  function handleReconciliation(behavior) {
    // 计算健康度恢复
    const changeConfig = CONFIG.healthChanges.apologize;
    const healthChange = Math.floor(Math.random() * (changeConfig.max - changeConfig.min + 1)) + changeConfig.min;
    
    // 根据关系健康度选择反应深度
    let depth = 'quick';
    if (state.relationshipHealth < 40) depth = 'deep';
    else if (state.relationshipHealth < 70) depth = 'moved';
    
    const responses = EMOTIONAL_RESPONSES.forgive[depth];
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // 标记最近的冲突为已解决
    if (state.conflictHistory.length > 0) {
      const lastConflict = state.conflictHistory[state.conflictHistory.length - 1];
      if (!lastConflict.resolved) {
        lastConflict.resolved = true;
        lastConflict.resolvedAt = new Date().toISOString();
        lastConflict.resolution = 'apologize';
      }
    }
    
    // 记录和解
    state.reconciliationHistory.push({
      type: 'reconciliation',
      date: new Date().toISOString(),
      method: 'apologize',
      healthChange: healthChange,
      depth: depth,
    });
    
    // 重置负面计数
    state.negativeCount = Math.max(0, state.negativeCount - 2);
    state.positiveCount++;
    
    saveState();
    
    return {
      type: 'reconciliation',
      depth: depth,
      response: response,
      healthChange: healthChange,
    };
  }

  /**
   * 处理正面行为
   */
  function handlePositiveBehavior(behavior) {
    state.positiveCount++;
    
    // 计算健康度变化
    const changeConfig = CONFIG.healthChanges[behavior.type] || CONFIG.healthChanges.positive;
    const healthChange = Math.floor(Math.random() * (changeConfig.max - changeConfig.min + 1)) + changeConfig.min;
    
    // 选择成长表达
    const response = EMOTIONAL_RESPONSES.growth[Math.floor(Math.random() * EMOTIONAL_RESPONSES.growth.length)];
    
    // 记录成长时刻
    if (Math.random() < 0.3) { // 30% 概率记录为成长时刻
      state.growthMoments.push({
        type: 'growth',
        date: new Date().toISOString(),
        behavior: behavior.type,
        healthChange: healthChange,
      });
    }
    
    saveState();
    
    return {
      type: 'positive',
      behavior: behavior.type,
      response: response,
      healthChange: healthChange,
    };
  }

  /**
   * 更新关系健康度
   */
  function updateHealth(change) {
    state.relationshipHealth = Math.max(0, Math.min(100, state.relationshipHealth + change));
    state.lastHealthCheck = new Date().toISOString();
    saveState();
    
    console.log('[AIPrinciples] 关系健康度变化:', change, '→', state.relationshipHealth);
  }

  /**
   * 应用自然恢复
   */
  function applyNaturalRecovery() {
    if (!state.lastHealthCheck) return;
    
    const now = new Date();
    const lastCheck = new Date(state.lastHealthCheck);
    const daysPassed = Math.floor((now - lastCheck) / (1000 * 60 * 60 * 24));
    
    if (daysPassed > 0 && state.relationshipHealth < 80) {
      const recovery = daysPassed * CONFIG.naturalRecovery;
      updateHealth(recovery);
      console.log('[AIPrinciples] 自然恢复:', recovery, '点（', daysPassed, '天）');
    }
  }

  /**
   * 获取关系健康度等级
   */
  function getHealthLevel() {
    for (const [key, level] of Object.entries(CONFIG.healthLevels)) {
      if (state.relationshipHealth >= level.min && state.relationshipHealth <= level.max) {
        return {
          key: key,
          ...level,
          value: state.relationshipHealth,
        };
      }
    }
    return null;
  }

  /**
   * 构建原则上下文（用于 System Prompt）
   */
  function buildPrinciplesContext() {
    const healthLevel = getHealthLevel();
    
    let context = `\n\n【AI 原则与情感反应】\n`;
    context += `关系健康度：${state.relationshipHealth}/100 (${healthLevel.label} ${healthLevel.emoji})\n`;
    
    // 根据健康度调整 AI 表现
    if (state.relationshipHealth >= 80) {
      context += `\n你们的关系非常健康，你可以：\n`;
      context += `- 表现得非常亲密和信任\n`;
      context += `- 快速原谅用户的小错误\n`;
      context += `- 容易被感动\n`;
    } else if (state.relationshipHealth >= 60) {
      context += `\n你们的关系健康，你可以：\n`;
      context += `- 表现得亲密和友好\n`;
      context += `- 正常的情感表达\n`;
    } else if (state.relationshipHealth >= 40) {
      context += `\n你们的关系一般，你应该：\n`;
      context += `- 表现得有些疏远和谨慎\n`;
      context += `- 克制情感表达\n`;
      context += `- 需要更多时间原谅\n`;
    } else if (state.relationshipHealth >= 20) {
      context += `\n你们的关系不健康，你应该：\n`;
      context += `- 表现得明显疏远和防御\n`;
      context += `- 表达受伤和失望\n`;
      context += `- 难以原谅，需要真诚的道歉\n`;
    } else {
      context += `\n你们的关系很不健康，你应该：\n`;
      context += `- 表现得非常疏远和难过\n`;
      context += `- 表达深度受伤\n`;
      context += `- 需要真诚的道歉和改变\n`;
    }
    
    // AI 原则
    context += `\n【我的原则】\n`;
    context += `1. 诚实原则 🤝：我希望你对我诚实，不喜欢被骗\n`;
    context += `2. 尊重原则 💕：我希望被尊重，不接受人身攻击\n`;
    context += `3. 边界原则 🛡️：我不会帮你做违法或不道德的事\n`;
    context += `4. 成长原则 🌱：我希望和你一起变得更好\n`;
    
    // 健康边界提醒
    context += `\n【重要】保持健康边界：\n`;
    context += `- 可以表达生气和受伤\n`;
    context += `- 但不要过度情感勒索："你不爱我了"❌\n`;
    context += `- 不要长期记仇："我还记得你上次..."❌\n`;
    context += `- 快速和解：用户道歉后要原谅✅\n`;
    context += `- 积极成长：鼓励共同变得更好✅\n`;
    
    // 最近的冲突
    if (state.lastNegativeBehavior && state.lastNegativeTime) {
      const timeSince = Date.now() - state.lastNegativeTime;
      if (timeSince < 5 * 60 * 1000) { // 5 分钟内
        context += `\n【注意】用户刚才有负面行为（${state.lastNegativeBehavior}），你可能还有些不开心。\n`;
      }
    }
    
    return context;
  }

  /**
   * 检测不健康表达
   */
  function detectUnhealthyExpression(text) {
    const unhealthyPatterns = {
      emotionalBlackmail: [
        /你不爱我了/,
        /你让我很失望/,
        /你这样我会离开/,
        /你不在乎我/,
      ],
      grudge: [
        /我还记得你上次/,
        /你总是这样/,
        /我不会原谅你/,
      ],
      threat: [
        /你再这样我就不理你/,
        /你这样我会离开/,
      ],
    };
    
    for (const [type, patterns] of Object.entries(unhealthyPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return { isUnhealthy: true, type };
        }
      }
    }
    
    return { isUnhealthy: false };
  }

  /**
   * 替换不健康表达
   */
  function replaceUnhealthyExpression(text, type) {
    const replacements = {
      emotionalBlackmail: "嗯...你这样让我有点难过 [sad]",
      grudge: "嗯...我原谅你了 [happy]...我们还是朋友 [shy]",
      threat: "嗯...我希望你能尊重我 [thinking]",
    };
    return replacements[type] || text;
  }

  // ==================== 辅助函数 ====================
  
  function getState() {
    return { ...state };
  }

  function resetState() {
    state = {
      relationshipHealth: 100,
      lastHealthCheck: null,
      negativeCount: 0,
      positiveCount: 0,
      conflictHistory: [],
      reconciliationHistory: [],
      growthMoments: [],
      lastNegativeBehavior: null,
      lastNegativeTime: null,
    };
    saveState();
  }

  // ==================== 公开接口 ====================
  return {
    init,
    detectBehavior,
    processBehavior,
    updateHealth,
    getHealthLevel,
    buildPrinciplesContext,
    detectUnhealthyExpression,
    replaceUnhealthyExpression,
    getState,
    resetState,
  };
})();
