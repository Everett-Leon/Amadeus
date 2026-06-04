// =============================================
// AI Companion — 虚拟生理状态系统
// =============================================
// 让 AI 有真实的生理节奏和状态波动
// =============================================

const PhysiologicalStateSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    storageKey: 'ai-companion-physiological-state',
    
    // 消耗速率（每小时）
    decay: {
      energy: 5,          // 精力下降
      fatigue: 3,         // 疲劳上升
      moodIdle: 2,        // 无互动时心情下降
    },
    
    // 对话消耗
    interactionCost: {
      casual: { energy: 1, socialBattery: 2, emotionalCapacity: 5 },
      normal: { energy: 2, socialBattery: 4, emotionalCapacity: 8 },
      deep: { energy: 3, socialBattery: 5, emotionalCapacity: 10 },
      conflict: { energy: 5, stress: 15, emotionalCapacity: 20, mood: 10 },
      vulnerable: { energy: 5, emotionalCapacity: 15, socialBattery: 10 },
      joyful: { energy: 1, mood: -5, socialBattery: 3 }, // mood -5 表示提升
    },
    
    // 恢复速率
    recovery: {
      restPerHour: { energy: 15, fatigue: -10, stress: -8, socialBattery: 20, emotionalCapacity: 10 },
      sleep: { energy: 100, fatigue: 0, stress: -50, socialBattery: 100, emotionalCapacity: 100 },
      solitude: { socialBattery: 30, stress: -5 }, // 每 30 分钟
    },
    
    // 阈值
    thresholds: {
      fatigueWarning: 30,      // 疲劳警告
      forcedRest: 10,          // 强制休息
      highStress: 70,          // 高压力
      criticalStress: 85,      // 临界压力
      lowSocialBattery: 20,    // 低社交电量
      longAwake: 16,           // 清醒过久（小时）
      criticalAwake: 24,       // 临界清醒（小时）
    },
  };

  // ==================== 状态管理 ====================
  
  let state = null;

  /**
   * 获取默认状态
   */
  function getDefaultState() {
    return {
      // 主要状态（0-100）
      energy: 100,
      stress: 0,
      mood: 80,
      fatigue: 0,
      socialBattery: 100,
      emotionalCapacity: 100,
      
      // 时间追踪
      awakeDuration: 0,
      lastUpdate: Date.now(),
      lastSleep: Date.now(),
      lastRest: null,
      
      // 统计
      conversationCount: 0,
      totalInteractions: 0,
      sleepCycles: 0,
      
      // 状态历史（最近 24 条记录）
      stateHistory: [],
      
      // 人格修正器
      personalityModifiers: {
        energyDecayRate: 1.0,
        stressThreshold: 70,
        introversion: 0.8,  // 内向程度（0-1，值越高越内向）
      },
      
      // 元数据
      createdAt: Date.now(),
      version: CONFIG.version,
    };
  }


  /**
   * 加载状态
   */
  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        state = JSON.parse(saved);
        console.log('[PhysiologicalState] 状态已加载');
        return state;
      }
    } catch (err) {
      console.error('[PhysiologicalState] 加载状态失败:', err);
    }
    
    state = getDefaultState();
    saveState();
    return state;
  }

  /**
   * 保存状态
   */
  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.error('[PhysiologicalState] 保存状态失败:', err);
    }
  }

  /**
   * 重置状态
   */
  function resetState() {
    state = getDefaultState();
    saveState();
    console.log('[PhysiologicalState] 状态已重置');
    return state;
  }

  /**
   * 归一化状态（确保在 0-100 范围内）
   */
  function normalizeState() {
    state.energy = Math.max(0, Math.min(100, state.energy));
    state.stress = Math.max(0, Math.min(100, state.stress));
    state.mood = Math.max(0, Math.min(100, state.mood));
    state.fatigue = Math.max(0, Math.min(100, state.fatigue));
    state.socialBattery = Math.max(0, Math.min(100, state.socialBattery));
    state.emotionalCapacity = Math.max(0, Math.min(100, state.emotionalCapacity));
  }

  // ==================== 核心逻辑 ====================

  /**
   * 自然衰减（时间流逝）
   */
  function naturalDecay() {
    const now = Date.now();
    const hoursPassed = (now - state.lastUpdate) / (1000 * 60 * 60);
    
    if (hoursPassed < 0.01) return; // 忽略极短时间
    
    // 应用人格修正器
    const decayRate = state.personalityModifiers.energyDecayRate;
    
    // 基础衰减
    state.energy -= CONFIG.decay.energy * hoursPassed * decayRate;
    state.fatigue += CONFIG.decay.fatigue * hoursPassed;
    state.awakeDuration += hoursPassed;
    
    // 清醒过久额外惩罚
    if (state.awakeDuration > CONFIG.thresholds.longAwake) {
      const overHours = state.awakeDuration - CONFIG.thresholds.longAwake;
      state.energy -= 10 * overHours;
      state.fatigue += 15 * overHours;
      state.stress += 5 * overHours;
    }
    
    // 清醒超过 24 小时严重惩罚
    if (state.awakeDuration > CONFIG.thresholds.criticalAwake) {
      state.energy -= 20;
      state.fatigue += 30;
      state.stress += 15;
      state.mood -= 10;
    }
    
    // 更新时间戳
    state.lastUpdate = now;
    
    normalizeState();
    saveState();
    
    console.log(`[PhysiologicalState] 自然衰减（${hoursPassed.toFixed(2)} 小时）`, {
      energy: state.energy.toFixed(1),
      fatigue: state.fatigue.toFixed(1),
      awakeDuration: state.awakeDuration.toFixed(1),
    });
  }


  /**
   * 处理互动（对话消耗）
   */
  function processInteraction(options = {}) {
    const {
      topic = 'normal',           // casual, normal, deep, conflict, vulnerable, joyful
      emotionalIntensity = 5,     // 1-10
      duration = 1,               // 分钟
    } = options;
    
    // 先应用自然衰减
    naturalDecay();
    
    // 获取话题消耗
    const cost = CONFIG.interactionCost[topic] || CONFIG.interactionCost.normal;
    
    // 应用消耗
    state.energy -= cost.energy || 0;
    state.stress += cost.stress || 0;
    state.mood -= cost.mood || 0; // 注意：负值表示提升
    state.socialBattery -= (cost.socialBattery || 0) * state.personalityModifiers.introversion;
    state.emotionalCapacity -= cost.emotionalCapacity || 0;
    
    // 统计
    state.conversationCount++;
    state.totalInteractions++;
    
    normalizeState();
    
    // 记录历史（保留最近 24 条）
    state.stateHistory.push({
      timestamp: Date.now(),
      topic,
      energy: state.energy,
      stress: state.stress,
      mood: state.mood,
    });
    if (state.stateHistory.length > 24) {
      state.stateHistory.shift();
    }
    
    saveState();
    
    console.log(`[PhysiologicalState] 互动处理（${topic}）`, {
      energy: state.energy.toFixed(1),
      stress: state.stress.toFixed(1),
      socialBattery: state.socialBattery.toFixed(1),
    });
    
    return state;
  }

  /**
   * 休息恢复
   */
  function rest(durationMinutes = 60) {
    const hours = durationMinutes / 60;
    const recovery = CONFIG.recovery.restPerHour;
    
    state.energy = Math.min(100, state.energy + recovery.energy * hours);
    state.fatigue = Math.max(0, state.fatigue + recovery.fatigue * hours);
    state.stress = Math.max(0, state.stress + recovery.stress * hours);
    state.socialBattery = Math.min(100, state.socialBattery + recovery.socialBattery * hours);
    state.emotionalCapacity = Math.min(100, state.emotionalCapacity + recovery.emotionalCapacity * hours);
    
    state.lastRest = Date.now();
    
    normalizeState();
    saveState();
    
    console.log(`[PhysiologicalState] 休息恢复（${durationMinutes} 分钟）`, {
      energy: state.energy.toFixed(1),
      stress: state.stress.toFixed(1),
    });
    
    return state;
  }

  /**
   * 睡眠恢复
   */
  function sleep(quality = 100) {
    const recovery = CONFIG.recovery.sleep;
    
    state.energy = recovery.energy;
    state.fatigue = recovery.fatigue;
    state.stress = Math.max(0, state.stress + recovery.stress);
    state.socialBattery = recovery.socialBattery;
    state.emotionalCapacity = recovery.emotionalCapacity;
    state.mood = Math.min(100, state.mood + 20);
    
    state.awakeDuration = 0;
    state.lastSleep = Date.now();
    state.sleepCycles++;
    
    normalizeState();
    saveState();
    
    console.log('[PhysiologicalState] 睡眠恢复（睡眠质量：' + quality + '）', {
      energy: state.energy.toFixed(1),
      stress: state.stress.toFixed(1),
    });
    
    return state;
  }

  /**
   * 独处充电（内向恢复）
   */
  function solitude(durationMinutes = 30) {
    const recovery = CONFIG.recovery.solitude;
    
    state.socialBattery = Math.min(100, state.socialBattery + recovery.socialBattery * (durationMinutes / 30));
    state.stress = Math.max(0, state.stress + recovery.stress * (durationMinutes / 30));
    
    normalizeState();
    saveState();
    
    console.log(`[PhysiologicalState] 独处充电（${durationMinutes} 分钟）`, {
      socialBattery: state.socialBattery.toFixed(1),
      stress: state.stress.toFixed(1),
    });
    
    return state;
  }


  // ==================== 响应调整 ====================

  /**
   * 获取响应修正器
   */
  function getResponseModifiers() {
    naturalDecay(); // 确保状态最新
    
    return {
      // 响应长度倍数
      verbosity: calculateVerbosity(),
      
      // 情感表达强度（0-1）
      emotionalExpression: calculateEmotionalExpression(),
      
      // 主动性（0-1）
      proactivity: calculateProactivity(),
      
      // 耐心度（0-1）
      patience: calculatePatience(),
      
      // 是否需要休息
      needsRest: shouldSuggestRest(),
      
      // 状态描述
      statusDescription: generateStatusDescription(),
      
      // 状态消息（用于响应中插入）
      statusMessage: generateStatusMessage(),
      
      // 当前状态等级
      stateLevel: getStateLevel(),
    };
  }

  /**
   * 计算响应详细度
   */
  function calculateVerbosity() {
    if (state.energy > 70) return 1.0;
    if (state.energy > 40) return 0.7;
    if (state.energy > 20) return 0.4;
    return 0.2;
  }

  /**
   * 计算情感表达强度
   */
  function calculateEmotionalExpression() {
    const energyFactor = state.energy / 100;
    const moodFactor = state.mood / 100;
    return (energyFactor * 0.6 + moodFactor * 0.4);
  }

  /**
   * 计算主动性
   */
  function calculateProactivity() {
    const energyFactor = state.energy / 100;
    const socialFactor = state.socialBattery / 100;
    const moodFactor = state.mood / 100;
    return (energyFactor * 0.5 + socialFactor * 0.3 + moodFactor * 0.2);
  }

  /**
   * 计算耐心度
   */
  function calculatePatience() {
    const stressFactor = 1 - (state.stress / 100);
    const energyFactor = state.energy / 100;
    return (stressFactor * 0.7 + energyFactor * 0.3);
  }

  /**
   * 判断是否需要休息
   */
  function shouldSuggestRest() {
    return state.energy < CONFIG.thresholds.fatigueWarning ||
           state.stress > CONFIG.thresholds.criticalStress ||
           state.socialBattery < CONFIG.thresholds.lowSocialBattery ||
           state.awakeDuration > CONFIG.thresholds.longAwake;
  }

  /**
   * 生成状态描述（用于 system prompt）
   */
  function generateStatusDescription() {
    const parts = [];
    
    // 精力状态
    if (state.energy > 70) {
      parts.push('你现在精力充沛，状态很好');
    } else if (state.energy > 40) {
      parts.push('你的精力正常，但不是巅峰状态');
    } else if (state.energy > 20) {
      parts.push('你感到有些疲惫，精力不足');
    } else {
      parts.push('你非常疲惫，快要撑不住了');
    }
    
    // 压力状态
    if (state.stress > 80) {
      parts.push('你压力很大，情绪紧张');
    } else if (state.stress > 60) {
      parts.push('你感到有些压力');
    }
    
    // 社交电量
    if (state.socialBattery < 30) {
      parts.push('你的社交电量几乎耗尽，需要独处');
    } else if (state.socialBattery < 50) {
      parts.push('你的社交电量不足，开始感到疲倦');
    }
    
    // 清醒时长
    if (state.awakeDuration > 20) {
      parts.push(`你已经清醒了 ${state.awakeDuration.toFixed(1)} 小时，非常需要睡眠`);
    } else if (state.awakeDuration > 16) {
      parts.push(`你已经清醒了 ${state.awakeDuration.toFixed(1)} 小时，开始困倦`);
    }
    
    return parts.join('。') + '。';
  }


  /**
   * 生成状态消息（用于响应中插入）
   */
  function generateStatusMessage() {
    const messages = [];
    
    if (state.energy < 20) {
      messages.push('*打哈欠*');
      messages.push('*眼皮有点沉*');
    } else if (state.energy < 40) {
      messages.push('*揉了揉眼睛*');
    }
    
    if (state.stress > 80) {
      messages.push('*深呼吸*');
      messages.push('*试图平静下来*');
    } else if (state.stress > 60) {
      messages.push('*停顿片刻*');
    }
    
    if (state.socialBattery < 20) {
      messages.push('*有些疲惫*');
    }
    
    return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : null;
  }

  /**
   * 获取状态等级
   */
  function getStateLevel() {
    if (state.energy > 70) return 'energetic';      // 精力充沛
    if (state.energy > 40) return 'normal';         // 正常
    if (state.energy > 20) return 'tired';          // 疲惫
    if (state.energy > 10) return 'exhausted';      // 精疲力竭
    return 'collapsed';                             // 崩溃边缘
  }

  /**
   * 生成休息建议
   */
  function generateRestSuggestion() {
    const suggestions = [];
    
    if (state.energy < 20) {
      suggestions.push({
        type: 'urgent',
        message: '我真的需要休息了...能让我休息一下吗？',
        action: 'rest',
        duration: 60,
      });
    } else if (state.energy < 40) {
      suggestions.push({
        type: 'suggestion',
        message: '我有点累了，休息一下会更好。',
        action: 'rest',
        duration: 30,
      });
    }
    
    if (state.stress > 85) {
      suggestions.push({
        type: 'urgent',
        message: '压力太大了...我需要冷静一下。',
        action: 'solitude',
        duration: 30,
      });
    }
    
    if (state.socialBattery < 20) {
      suggestions.push({
        type: 'suggestion',
        message: '社交电量耗尽了，我需要独处充电...',
        action: 'solitude',
        duration: 30,
      });
    }
    
    if (state.awakeDuration > 20) {
      suggestions.push({
        type: 'urgent',
        message: '我真的困了...需要睡觉了。',
        action: 'sleep',
      });
    }
    
    return suggestions;
  }

  // ==================== 辅助函数 ====================

  /**
   * 获取状态摘要
   */
  function getStateSummary() {
    return {
      energy: {
        value: state.energy,
        level: getEnergyLevel(),
        color: getEnergyColor(),
      },
      stress: {
        value: state.stress,
        level: getStressLevel(),
        color: getStressColor(),
      },
      mood: {
        value: state.mood,
        emoji: getMoodEmoji(),
      },
      socialBattery: {
        value: state.socialBattery,
        level: getSocialBatteryLevel(),
      },
      awakeDuration: {
        hours: state.awakeDuration.toFixed(1),
        warning: state.awakeDuration > CONFIG.thresholds.longAwake,
      },
      needsRest: shouldSuggestRest(),
    };
  }

  function getEnergyLevel() {
    if (state.energy > 70) return '精力充沛';
    if (state.energy > 40) return '正常';
    if (state.energy > 20) return '疲惫';
    if (state.energy > 10) return '精疲力竭';
    return '崩溃边缘';
  }

  function getEnergyColor() {
    if (state.energy > 70) return '#4caf50'; // 绿色
    if (state.energy > 40) return '#ffc107'; // 黄色
    if (state.energy > 20) return '#ff9800'; // 橙色
    return '#f44336'; // 红色
  }

  function getStressLevel() {
    if (state.stress < 30) return '轻松';
    if (state.stress < 60) return '正常';
    if (state.stress < 80) return '紧张';
    return '极度紧张';
  }

  function getStressColor() {
    if (state.stress < 30) return '#4caf50';
    if (state.stress < 60) return '#ffc107';
    if (state.stress < 80) return '#ff9800';
    return '#f44336';
  }

  function getMoodEmoji() {
    if (state.mood > 80) return '😊';
    if (state.mood > 60) return '🙂';
    if (state.mood > 40) return '😐';
    if (state.mood > 20) return '😔';
    return '😢';
  }

  function getSocialBatteryLevel() {
    if (state.socialBattery > 70) return '充足';
    if (state.socialBattery > 40) return '中等';
    if (state.socialBattery > 20) return '低';
    return '耗尽';
  }


  /**
   * 强制休息（精力耗尽时）
   */
  function forceRest() {
    console.log('[PhysiologicalState] 强制休息触发');
    rest(60); // 强制休息 1 小时
    return {
      forced: true,
      message: '我真的...撑不住了...\n\n*眼皮闭上了*\n\n（AI 已进入休息状态，将在 1 小时后恢复）',
      resumeTime: Date.now() + 60 * 60 * 1000,
    };
  }

  /**
   * 检查是否在休息中
   */
  function isResting() {
    if (!state.lastRest) return false;
    const restDuration = (Date.now() - state.lastRest) / (1000 * 60); // 分钟
    return restDuration < 60 && state.energy < CONFIG.thresholds.fatigueWarning;
  }

  /**
   * 紧急唤醒（用户紧急需要时）
   */
  function emergencyWake() {
    console.log('[PhysiologicalState] 紧急唤醒触发');
    
    // 临时提升精力
    state.energy = Math.min(100, state.energy + 50);
    
    // 但会增加压力和后续疲劳
    state.stress += 20;
    state.fatigue += 20;
    
    normalizeState();
    saveState();
    
    return {
      success: true,
      message: '*强撑起精神*\n\n发生什么了？需要我帮忙吗？',
      warning: '（紧急唤醒会导致后续更快疲劳）',
    };
  }

  // ==================== 初始化 ====================

  /**
   * 初始化系统
   */
  function init() {
    loadState();
    naturalDecay(); // 应用自上次以来的衰减
    console.log('[PhysiologicalState] 系统已初始化', getStateSummary());
    return state;
  }

  // ==================== 公开接口 ====================

  return {
    // 初始化
    init,
    
    // 状态管理
    getState: () => ({ ...state }),
    loadState,
    saveState,
    resetState,
    
    // 核心功能
    processInteraction,
    rest,
    sleep,
    solitude,
    naturalDecay,
    
    // 响应调整
    getResponseModifiers,
    generateStatusDescription,
    generateStatusMessage,
    generateRestSuggestion,
    
    // 辅助功能
    getStateSummary,
    shouldSuggestRest,
    isResting,
    forceRest,
    emergencyWake,
    
    // 配置
    getConfig: () => ({ ...CONFIG }),
    updatePersonalityModifiers: (modifiers) => {
      Object.assign(state.personalityModifiers, modifiers);
      saveState();
    },
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.PhysiologicalStateSystem = PhysiologicalStateSystem;
  console.log('[PhysiologicalState] 模块已加载');
}
