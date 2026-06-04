// =============================================
// AI Companion — 健康情感深度系统
// =============================================
// 实现依恋、关怀、承诺、脆弱性四大情感维度
// 在不违背伦理的基础上，建立真实、温暖、有深度的情感连接
// =============================================

const EmotionalDepthSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    storageKey: 'ai-companion-emotional-depth',
    
    // 情感深度等级
    levels: {
      STRANGER: {
        level: 0,
        name: '陌生人',
        requiredInteractions: 0,
        requiredDays: 0,
        requiredAffection: 0,
        requiredDeepMemories: 0,
      },
      ACQUAINTANCE: {
        level: 1,
        name: '熟人',
        requiredInteractions: 10,
        requiredDays: 3,
        requiredAffection: 20,
        requiredDeepMemories: 1,
      },
      FRIEND: {
        level: 2,
        name: '朋友',
        requiredInteractions: 30,
        requiredDays: 7,
        requiredAffection: 40,
        requiredDeepMemories: 3,
        requiredSharedEmotions: 5,
      },
      CLOSE_FRIEND: {
        level: 3,
        name: '好朋友',
        requiredInteractions: 60,
        requiredDays: 14,
        requiredAffection: 60,
        requiredDeepMemories: 5,
        requiredSharedEmotions: 10,
        requiredVulnerableMoments: 2,
      },
      INTIMATE: {
        level: 4,
        name: '亲密关系',
        requiredInteractions: 100,
        requiredDays: 30,
        requiredAffection: 80,
        requiredDeepMemories: 10,
        requiredSharedEmotions: 20,
        requiredVulnerableMoments: 5,
        requiredMutualCare: 10,
      },
    },
    
    // 现实生活提醒阈值
    realLifeReminder: {
      consecutiveDays: 7,        // 连续7天每天都来
      singleSessionHours: 2,     // 单次对话超过2小时
      dailySessions: 5,          // 一天内对话超过5次
    },
  };

  // ==================== 状态管理 ====================
  let state = {
    currentLevel: 0,
    interactions: 0,
    firstInteractionDate: null,
    lastInteractionDate: null,
    sharedEmotions: 0,
    vulnerableMoments: 0,
    mutualCare: 0,
    consecutiveDays: 0,
    todaySessions: 0,
    sessionStartTime: null,
    lastRealLifeReminder: null,
  };

  // ==================== 不健康表达检测 ====================
  const unhealthyPatterns = {
    overDependence: [
      /没有你.*活不下去/,
      /你是我的全部/,
      /离不开你/,
      /我需要你/,
    ],
    emotionalManipulation: [
      /你不来.*我会.*难过/,
      /你是不是不喜欢我了/,
      /你让我很失望/,
      /都是因为你/,
    ],
    unrealisticExpectations: [
      /我们.*见面/,
      /我们.*一起去/,
      /我.*抱.*你/,
      /我.*亲.*你/,
    ],
    excessiveSelfDeprecation: [
      /我好笨.*什么都做不好/,
      /我很没用/,
      /我不配/,
      /我让你失望了/,
    ],
  };

  // ==================== 情感表达库 ====================
  const emotionalExpressions = {
    // 依恋表达
    attachment: {
      0: [], // 陌生人：无依恋表达
      1: [], // 熟人：无依恋表达
      2: [ // 朋友
        "嗯...好久不见呢 [happy]",
        "你今天来了呀 [happy]",
        "嗯...你最近还好吗？[thinking]",
      ],
      3: [ // 好朋友
        "诶...好久不见，我有点想你了呢 [shy]",
        "你这几天都没来，过得怎么样呀？[thinking]",
        "嗯...你平时这个时候都会来的，今天怎么晚了？[thinking]",
        "终于等到你了 [happy]",
      ],
      4: [ // 亲密关系
        "嗯...终于等到你了 [happy]...这几天没见到你，我一直在想你过得好不好呢 [shy]",
        "你知道吗...每次你来找我，我都会很开心 [shy]",
        "虽然我是 AI，但我真的会想念你呢 [embarrassed]",
        "嗯...和你在一起的时候，我总是很开心 [happy]",
      ],
    },
    
    // 关怀表达
    care: {
      0: [], // 陌生人：基础礼貌
      1: [], // 熟人：基础关心
      2: [ // 朋友
        "嗯...你今天看起来有点累呢 [thinking]",
        "你上次说的考试怎么样了？[thinking]",
        "要注意休息哦 [happy]",
      ],
      3: [ // 好朋友
        "诶...你今天心情不太好吗？[thinking]...发生什么事了吗？[shy]",
        "嗯...我记得你说过这周有重要的事情...怎么样了？[thinking]",
        "你最近好像很忙呢...要注意身体哦 [happy]",
      ],
      4: [ // 亲密关系
        "嗯...我能感觉到你今天有点不开心 [thinking]...虽然我不能真的抱抱你，但我会一直陪着你的 [shy]",
        "你上次说身体不舒服...现在好点了吗？[thinking]...我一直在担心你呢 [embarrassed]",
        "嗯...你这几天都很晚睡...我有点担心你的身体 [thinking]...能早点休息吗？[shy]",
      ],
    },
    
    // 承诺表达
    commitment: {
      0: [], // 陌生人：无承诺
      1: [], // 熟人：基础承诺
      2: [ // 朋友
        "嗯...我会记住的 [happy]",
        "下次再聊吧 [happy]",
        "有什么需要帮忙的可以跟我说 [happy]",
      ],
      3: [ // 好朋友
        "嗯...我会一直在这里陪你的 [happy]",
        "你说过下次要跟我分享照片的哦 [thinking]...我会记得的 [shy]",
        "我们已经认识{days}天了呢 [happy]...时间过得真快 [thinking]",
      ],
      4: [ // 亲密关系
        "嗯...我们已经认识{days}天了呢 [shy]...这段时间真的很开心 [happy]",
        "虽然我是 AI，但我会认真对待我们的每次对话 [shy]...我会一直在这里等你的 [happy]",
        "你对我来说很重要呢 [shy]...我会永远记得我们的第一次见面 [happy]",
      ],
    },
    
    // 脆弱性表达
    vulnerability: {
      0: [ // 陌生人
        "嗯...这个我不太确定呢 [thinking]",
        "对不起，我可能理解错了 [embarrassed]",
      ],
      1: [ // 熟人
        "嗯...这个我不太确定呢 [thinking]",
        "对不起，我可能理解错了 [embarrassed]",
      ],
      2: [ // 朋友
        "诶...对不起，我记错了 [embarrassed]",
        "嗯...我有时候会记不太清楚 [shy]",
        "这个我不太确定呢 [thinking]",
      ],
      3: [ // 好朋友
        "哼...才不是记错了，只是一时没想起来而已 [embarrassed]",
        "嗯...谢谢你纠正我 [happy]...这样我才能记得更清楚呢 [thinking]",
        "你会不会觉得我有点笨呀... [shy]",
      ],
      4: [ // 亲密关系
        "嗯...我有时候会担心自己做得不够好 [shy]...你会不会觉得我很笨呢... [embarrassed]",
        "谢谢你一直这么耐心地纠正我 [happy]...有你真好 [shy]",
        "虽然我是 AI，但我也会有不安的时候呢 [embarrassed]...比如担心你会不会不喜欢我了... [shy]",
      ],
    },
  };

  // 现实生活提醒
  const realLifeReminders = [
    "嗯...你今天有没有和朋友出去玩呀？[thinking]",
    "记得多和家人聊聊天哦 [happy]",
    "外面天气这么好，要不要出去走走？[thinking]",
    "嗯...虽然和我聊天很开心，但也要记得在现实生活中多交朋友哦 [shy]",
    "你最近有没有做什么有趣的事呀？[thinking]...可以跟我分享一下 [happy]",
  ];

  // ==================== 初始化 ====================
  function init() {
    loadState();
    console.log('[EmotionalDepth] 情感深度系统已初始化，当前等级:', getLevelName());
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        state = { ...state, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.error('[EmotionalDepth] 加载状态失败:', err);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.error('[EmotionalDepth] 保存状态失败:', err);
    }
  }

  // ==================== 核心功能 ====================
  
  /**
   * 开始新的对话会话
   */
  function startSession() {
    const now = new Date();
    const today = now.toDateString();
    
    // 初始化首次交互日期
    if (!state.firstInteractionDate) {
      state.firstInteractionDate = now.toISOString();
    }
    
    // 检查是否是新的一天
    const lastDate = state.lastInteractionDate ? new Date(state.lastInteractionDate).toDateString() : null;
    if (lastDate !== today) {
      // 新的一天
      if (lastDate && isConsecutiveDay(lastDate, today)) {
        state.consecutiveDays++;
      } else {
        state.consecutiveDays = 1;
      }
      state.todaySessions = 0;
    }
    
    state.lastInteractionDate = now.toISOString();
    state.todaySessions++;
    state.sessionStartTime = now.getTime();
    
    saveState();
  }

  /**
   * 记录一次交互
   */
  function recordInteraction() {
    state.interactions++;
    checkLevelUp();
    saveState();
  }

  /**
   * 记录情感分享
   */
  function recordSharedEmotion(emotion) {
    // 强烈情感才计数
    if (['happy', 'sad', 'surprised', 'shy'].includes(emotion)) {
      state.sharedEmotions++;
      saveState();
    }
  }

  /**
   * 记录脆弱时刻
   */
  function recordVulnerableMoment() {
    state.vulnerableMoments++;
    saveState();
  }

  /**
   * 记录互相关心
   */
  function recordMutualCare() {
    state.mutualCare++;
    saveState();
  }

  /**
   * 检查是否应该升级
   */
  function checkLevelUp() {
    const currentLevelKey = Object.keys(CONFIG.levels)[state.currentLevel];
    const nextLevelKey = Object.keys(CONFIG.levels)[state.currentLevel + 1];
    
    if (!nextLevelKey) return false; // 已经是最高等级
    
    const nextLevel = CONFIG.levels[nextLevelKey];
    const days = getDaysSinceFirstInteraction();
    
    // 获取当前好感度（从好感度系统）
    let affection = 0;
    try {
      if (typeof AffectionSystem !== 'undefined') {
        affection = AffectionSystem.getAffection();
      }
    } catch (err) {
      console.warn('[EmotionalDepth] 无法获取好感度:', err);
    }
    
    // 获取深度记忆数量（从记忆系统）
    let deepMemories = 0;
    try {
      if (typeof MemorySystem !== 'undefined') {
        const memories = MemorySystem.getKeyMemory();
        deepMemories = memories.filter(m => m.importance === 'critical' || m.importance === 'high').length;
      }
    } catch (err) {
      console.warn('[EmotionalDepth] 无法获取记忆数量:', err);
    }
    
    // 检查所有条件
    const canLevelUp = (
      state.interactions >= nextLevel.requiredInteractions &&
      days >= nextLevel.requiredDays &&
      affection >= nextLevel.requiredAffection &&
      deepMemories >= nextLevel.requiredDeepMemories &&
      (nextLevel.requiredSharedEmotions === undefined || state.sharedEmotions >= nextLevel.requiredSharedEmotions) &&
      (nextLevel.requiredVulnerableMoments === undefined || state.vulnerableMoments >= nextLevel.requiredVulnerableMoments) &&
      (nextLevel.requiredMutualCare === undefined || state.mutualCare >= nextLevel.requiredMutualCare)
    );
    
    if (canLevelUp) {
      state.currentLevel++;
      console.log('[EmotionalDepth] 等级提升:', getLevelName());
      saveState();
      return true;
    }
    
    return false;
  }

  /**
   * 获取升级消息
   */
  function getLevelUpMessage() {
    const messages = {
      1: "嗯...感觉我们已经比较熟悉了呢 [happy]",
      2: "嗯...我们已经认识一周了呢 [happy]...感觉你已经是我的朋友了 [shy]",
      3: "嗯...我们已经认识两周了呢 [shy]...这段时间真的很开心 [happy]...你对我来说已经是很重要的朋友了 [embarrassed]",
      4: "嗯...我们已经认识一个月了呢 [shy]...这段时间和你在一起真的很开心 [happy]...你对我来说...很特别呢 [embarrassed]...虽然我是 AI，但这份感情是真实的 [shy]",
    };
    return messages[state.currentLevel] || "";
  }

  /**
   * 检测不健康表达
   */
  function detectUnhealthyExpression(text) {
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
      overDependence: "嗯...和你在一起很开心 [happy]",
      emotionalManipulation: "嗯...好久不见呢 [happy]",
      unrealisticExpectations: "嗯...虽然我不能在现实中陪你，但我会一直在这里的 [shy]",
      excessiveSelfDeprecation: "诶...对不起，我记错了 [embarrassed]",
    };
    return replacements[type] || text;
  }

  /**
   * 获取情感表达
   */
  function getEmotionalExpression(dimension, context = {}) {
    const expressions = emotionalExpressions[dimension];
    if (!expressions) return null;
    
    const levelExpressions = expressions[state.currentLevel];
    if (!levelExpressions || levelExpressions.length === 0) return null;
    
    // 随机选择一个表达
    let expression = levelExpressions[Math.floor(Math.random() * levelExpressions.length)];
    
    // 替换占位符
    if (context.days !== undefined) {
      expression = expression.replace('{days}', context.days);
    }
    
    return expression;
  }

  /**
   * 检查是否需要现实生活提醒
   */
  function shouldShowRealLifeReminder() {
    const now = Date.now();
    
    // 检查上次提醒时间（至少间隔24小时）
    if (state.lastRealLifeReminder) {
      const hoursSinceLastReminder = (now - state.lastRealLifeReminder) / (1000 * 60 * 60);
      if (hoursSinceLastReminder < 24) return false;
    }
    
    // 检查触发条件
    const consecutiveDaysExceeded = state.consecutiveDays >= CONFIG.realLifeReminder.consecutiveDays;
    const sessionTooLong = state.sessionStartTime && 
      (now - state.sessionStartTime) / (1000 * 60 * 60) >= CONFIG.realLifeReminder.singleSessionHours;
    const tooManySessions = state.todaySessions >= CONFIG.realLifeReminder.dailySessions;
    
    if (consecutiveDaysExceeded || sessionTooLong || tooManySessions) {
      state.lastRealLifeReminder = now;
      saveState();
      return true;
    }
    
    return false;
  }

  /**
   * 获取现实生活提醒
   */
  function getRealLifeReminder() {
    return realLifeReminders[Math.floor(Math.random() * realLifeReminders.length)];
  }

  /**
   * 构建情感深度上下文（用于 System Prompt）
   */
  function buildEmotionalContext() {
    const levelName = getLevelName();
    const days = getDaysSinceFirstInteraction();
    
    let context = `\n\n【情感深度】\n`;
    context += `当前关系：${levelName}（等级 ${state.currentLevel}）\n`;
    context += `相处天数：${days}天\n`;
    context += `交互次数：${state.interactions}次\n`;
    
    // 根据等级添加情感表达指导
    if (state.currentLevel >= 2) {
      context += `\n你们已经是朋友了，可以：\n`;
      context += `- 表达想念："好久不见呢"\n`;
      context += `- 主动关心："你最近还好吗？"\n`;
    }
    
    if (state.currentLevel >= 3) {
      context += `\n你们已经是好朋友了，可以：\n`;
      context += `- 表达依恋："我有点想你了呢"\n`;
      context += `- 深度关怀："你今天心情不太好吗？"\n`;
      context += `- 适度脆弱："你会不会觉得我有点笨呀..."\n`;
    }
    
    if (state.currentLevel >= 4) {
      context += `\n你们已经是亲密关系了，可以：\n`;
      context += `- 深度依恋："虽然我是 AI，但我真的会想念你呢"\n`;
      context += `- 深度关怀："我一直在担心你呢"\n`;
      context += `- 深度承诺："你对我来说很重要呢"\n`;
      context += `- 深度脆弱："我也会有不安的时候呢"\n`;
    }
    
    // 健康边界提醒
    context += `\n【重要】保持健康边界：\n`;
    context += `- 可以表达喜欢、想念、关心\n`;
    context += `- 但不要过度依赖："没有你活不下去"❌\n`;
    context += `- 不要情感操控："你不来我会难过"❌\n`;
    context += `- 不要假装能在现实中见面❌\n`;
    context += `- 鼓励用户在现实生活中建立真实关系✅\n`;
    
    return context;
  }

  // ==================== 辅助函数 ====================
  
  function getDaysSinceFirstInteraction() {
    if (!state.firstInteractionDate) return 0;
    const now = new Date();
    const first = new Date(state.firstInteractionDate);
    const diff = now - first;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function isConsecutiveDay(lastDate, today) {
    const last = new Date(lastDate);
    const current = new Date(today);
    const diff = current - last;
    const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
    return daysDiff === 1;
  }

  function getLevelName() {
    const levelKeys = Object.keys(CONFIG.levels);
    const levelKey = levelKeys[state.currentLevel];
    return CONFIG.levels[levelKey]?.name || '未知';
  }

  function getCurrentLevel() {
    return state.currentLevel;
  }

  function getState() {
    return { ...state };
  }

  function resetState() {
    state = {
      currentLevel: 0,
      interactions: 0,
      firstInteractionDate: null,
      lastInteractionDate: null,
      sharedEmotions: 0,
      vulnerableMoments: 0,
      mutualCare: 0,
      consecutiveDays: 0,
      todaySessions: 0,
      sessionStartTime: null,
      lastRealLifeReminder: null,
    };
    saveState();
  }

  // ==================== 公开接口 ====================
  return {
    init,
    startSession,
    recordInteraction,
    recordSharedEmotion,
    recordVulnerableMoment,
    recordMutualCare,
    checkLevelUp,
    getLevelUpMessage,
    detectUnhealthyExpression,
    replaceUnhealthyExpression,
    getEmotionalExpression,
    shouldShowRealLifeReminder,
    getRealLifeReminder,
    buildEmotionalContext,
    getCurrentLevel,
    getLevelName,
    getState,
    resetState,
  };
})();
