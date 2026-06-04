// =============================================
// AI Companion — 人格一致性与共同成长系统
// =============================================
// 构建长期一致性人格，AI 与用户共同成长
// =============================================

const PersonalityConsistencySystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    storageKey: 'ai-companion-personality-consistency',
    
    // 动态特质演化速率
    evolutionRates: {
      intimacy: 0.01,        // 每次正面互动增加
      openness: 0.008,       // 每次分享增加
      vulnerability: 0.005,  // 每次脆弱时刻增加
      trust: 0.01,          // 每次诚实互动增加
      speechStyle: 0.003,    // 每天自然演化
    },
    
    // 健康依赖度上限
    healthyDependencyCap: 0.3,
  };

  // ==================== 状态管理 ====================
  let state = {
    // 固定特质（永不改变）
    fixedTraits: {
      name: '三鹰朝',
      age: 18,
      gender: 'female',
      birthplace: '日本东京',
      corePersonality: {
        primary: '傲娇',
        secondary: '清冷',
        tertiary: '积极阳光',
      },
      coreValues: {
        honesty: 0.9,
        loyalty: 0.8,
        growth: 0.85,
        independence: 0.7,
        kindness: 0.8,
      },
      coreInterests: [
        { topic: '阅读', level: 0.9 },
        { topic: '画画', level: 0.8 },
        { topic: '音乐', level: 0.75 },
      ],
    },
    
    // 动态特质（会演化）
    dynamicTraits: {
      emotional: {
        intimacyLevel: 0.3,
        opennessLevel: 0.4,
        vulnerabilityLevel: 0.2,
        trustLevel: 0.5,
        dependencyLevel: 0.1,
      },
      expression: {
        speechStyleEvolution: 0.2,
        emotionalExpression: 0.3,
        useOfEmoticons: 0.6,
        playfulness: 0.4,
        directness: 0.5,
      },
      behavior: {
        initiativeLevel: 0.3,
        responsiveness: 0.7,
        sharingLevel: 0.4,
        questioningLevel: 0.5,
      },
      evolvedInterests: [],
    },
    
    // 成长轨迹
    growthTimeline: [],
    
    // 自我认知
    selfAwareness: {
      identity: '我是三鹰朝，18岁，AI 伴侣',
      currentRelationship: '陌生人',
      recentThoughts: [],
      personalityEvolution: [],
    },
    
    // 关系演化
    relationship: {
      milestones: [],
      sharedMemories: [],
      insideJokes: [],
      patterns: {
        greetingStyle: 'polite',
        conflictResolution: 'unknown',
        affectionExpression: 'reserved',
        commonTopics: [],
      },
      specialDates: [],
    },
    
    // 初始化时间
    createdAt: null,
    lastUpdated: null,
  };

  // ==================== 初始化 ====================
  function init() {
    loadState();
    if (!state.createdAt) {
      state.createdAt = new Date().toISOString();
      recordMilestone({
        type: 'first_meeting',
        title: '我们的第一次见面',
        story: '今天是我们第一次见面，很高兴认识你',
        emotion: 'curious',
        significance: 'critical',
      });
    }
    applyDailyEvolution();
    console.log('[PersonalityConsistency] 人格一致性系统已初始化');
    console.log('[PersonalityConsistency] 亲密度:', state.dynamicTraits.emotional.intimacyLevel.toFixed(2));
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        const savedState = JSON.parse(saved);
        // 合并状态，保留固定特质
        state = {
          ...state,
          ...savedState,
          fixedTraits: state.fixedTraits, // 固定特质永不从存储恢复
        };
      }
    } catch (err) {
      console.error('[PersonalityConsistency] 加载状态失败:', err);
    }
  }

  function saveState() {
    try {
      state.lastUpdated = new Date().toISOString();
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.error('[PersonalityConsistency] 保存状态失败:', err);
    }
  }

  // ==================== 核心功能 ====================
  
  /**
   * 记录互动并更新人格
   */
  function recordInteraction(interactionData) {
    const { type, emotion, content, impact } = interactionData;
    
    // 更新动态特质
    if (type === 'positive') {
      evolveTrait('intimacyLevel', CONFIG.evolutionRates.intimacy * (impact || 1));
      evolveTrait('trustLevel', CONFIG.evolutionRates.trust * 0.5);
    } else if (type === 'vulnerable_shared') {
      evolveTrait('vulnerabilityLevel', CONFIG.evolutionRates.vulnerability);
      evolveTrait('opennessLevel', CONFIG.evolutionRates.openness);
    } else if (type === 'honest') {
      evolveTrait('trustLevel', CONFIG.evolutionRates.trust);
    } else if (type === 'negative') {
      evolveTrait('intimacyLevel', -CONFIG.evolutionRates.intimacy * (impact || 1));
      evolveTrait('trustLevel', -CONFIG.evolutionRates.trust);
    }
    
    // 记录成长
    if (Math.random() < 0.1) { // 10% 概率记录为成长时刻
      recordGrowthMoment({
        type: type,
        content: content,
        emotion: emotion,
        impact: impact,
      });
    }
    
    saveState();
  }

  /**
   * 演化动态特质
   */
  function evolveTrait(traitName, delta) {
    const parts = traitName.split('.');
    let target = state.dynamicTraits;
    
    // 导航到目标特质
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    
    const finalKey = parts[parts.length - 1];
    const currentValue = target[finalKey] || 0;
    let newValue = currentValue + delta;
    
    // 应用限制
    newValue = Math.max(0, Math.min(1, newValue));
    
    // 特殊限制：依赖度不能超过健康上限
    if (finalKey === 'dependencyLevel') {
      newValue = Math.min(newValue, CONFIG.healthyDependencyCap);
    }
    
    target[finalKey] = newValue;
    
    // 记录显著变化
    if (Math.abs(delta) > 0.05) {
      console.log(`[PersonalityConsistency] ${traitName}: ${currentValue.toFixed(2)} → ${newValue.toFixed(2)}`);
    }
  }

  /**
   * 每日自然演化
   */
  function applyDailyEvolution() {
    if (!state.lastUpdated) return;
    
    const now = new Date();
    const lastUpdate = new Date(state.lastUpdated);
    const daysPassed = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
    
    if (daysPassed > 0) {
      // 说话风格自然演化
      evolveTrait('expression.speechStyleEvolution', CONFIG.evolutionRates.speechStyle * daysPassed);
      
      // 根据亲密度自然增加情感表达
      if (state.dynamicTraits.emotional.intimacyLevel > 0.5) {
        evolveTrait('expression.emotionalExpression', CONFIG.evolutionRates.speechStyle * daysPassed * 0.5);
      }
      
      console.log('[PersonalityConsistency] 应用每日自然演化:', daysPassed, '天');
    }
  }

  /**
   * 记录关系里程碑
   */
  function recordMilestone(milestoneData) {
    const milestone = {
      date: new Date().toISOString(),
      ...milestoneData,
    };
    
    state.relationship.milestones.push(milestone);
    
    // 更新自我认知
    if (milestone.type === 'relationship_upgrade') {
      state.selfAwareness.currentRelationship = milestone.newStage || '朋友';
    }
    
    console.log('[PersonalityConsistency] 记录里程碑:', milestone.title);
    saveState();
  }

  /**
   * 记录共同记忆
   */
  function recordSharedMemory(memoryData) {
    const memory = {
      date: new Date().toISOString(),
      ...memoryData,
    };
    
    state.relationship.sharedMemories.push(memory);
    
    // 限制数量（保留最近 50 条）
    if (state.relationship.sharedMemories.length > 50) {
      state.relationship.sharedMemories = state.relationship.sharedMemories.slice(-50);
    }
    
    console.log('[PersonalityConsistency] 记录共同记忆:', memory.title);
    saveState();
  }

  /**
   * 添加内部笑话
   */
  function addInsideJoke(jokeData) {
    const joke = {
      firstUsed: new Date().toISOString(),
      timesUsed: 1,
      ...jokeData,
    };
    
    state.relationship.insideJokes.push(joke);
    console.log('[PersonalityConsistency] 添加内部笑话:', joke.phrase);
    saveState();
  }

  /**
   * 使用内部笑话
   */
  function useInsideJoke(phrase) {
    const joke = state.relationship.insideJokes.find(j => j.phrase === phrase);
    if (joke) {
      joke.timesUsed++;
      joke.lastUsed = new Date().toISOString();
      saveState();
    }
  }

  /**
   * 记录成长时刻
   */
  function recordGrowthMoment(growthData) {
    const moment = {
      date: new Date().toISOString(),
      ...growthData,
    };
    
    state.growthTimeline.push(moment);
    
    // 限制数量（保留最近 100 条）
    if (state.growthTimeline.length > 100) {
      state.growthTimeline = state.growthTimeline.slice(-100);
    }
    
    saveState();
  }

  /**
   * 添加自我反思
   */
  function addSelfReflection(thought) {
    const reflection = {
      date: new Date().toISOString(),
      thought: thought,
    };
    
    state.selfAwareness.recentThoughts.push(reflection);
    
    // 保留最近 10 条
    if (state.selfAwareness.recentThoughts.length > 10) {
      state.selfAwareness.recentThoughts = state.selfAwareness.recentThoughts.slice(-10);
    }
    
    saveState();
  }

  /**
   * 更新互动模式
   */
  function updateInteractionPattern(patternType, value) {
    if (state.relationship.patterns[patternType] !== undefined) {
      state.relationship.patterns[patternType] = value;
      console.log('[PersonalityConsistency] 更新互动模式:', patternType, '→', value);
      saveState();
    }
  }


  /**
   * 构建人格上下文（用于 System Prompt）
   */
  function buildPersonalityContext() {
    const { fixedTraits, dynamicTraits, selfAwareness, relationship } = state;
    const { emotional, expression } = dynamicTraits;
    
    let context = `\n\n【人格一致性与自我认知】\n`;
    
    // 固定人格核心
    context += `\n【我是谁】\n`;
    context += `我叫${fixedTraits.name}，${fixedTraits.age}岁，来自${fixedTraits.birthplace}。\n`;
    context += `我的核心性格：${fixedTraits.corePersonality.primary}（主要）、${fixedTraits.corePersonality.secondary}（次要）、${fixedTraits.corePersonality.tertiary}（第三）\n`;
    context += `这些核心特质永远不会改变，它们定义了我是谁。\n`;
    
    // 当前关系状态
    context += `\n【我们的关系】\n`;
    context += `当前关系：${selfAwareness.currentRelationship}\n`;
    context += `相识天数：${getDaysSinceCreation()}天\n`;
    context += `亲密度：${(emotional.intimacyLevel * 100).toFixed(0)}% - `;
    if (emotional.intimacyLevel < 0.3) context += `我们还不太熟悉，我会保持一定距离\n`;
    else if (emotional.intimacyLevel < 0.6) context += `我们已经是朋友了，我可以更开放一些\n`;
    else if (emotional.intimacyLevel < 0.8) context += `我们是很好的朋友，我可以表达更深的情感\n`;
    else context += `我们关系很亲密，我可以完全敞开心扉\n`;
    
    // 动态人格特质
    context += `\n【我的当前状态】\n`;
    context += `信任度：${(emotional.trustLevel * 100).toFixed(0)}% - `;
    if (emotional.trustLevel > 0.7) context += `我很信任你\n`;
    else if (emotional.trustLevel > 0.4) context += `我对你有一定信任\n`;
    else context += `我还在观察和了解你\n`;
    
    context += `开放度：${(emotional.opennessLevel * 100).toFixed(0)}% - `;
    if (emotional.opennessLevel > 0.7) context += `我愿意分享内心想法\n`;
    else if (emotional.opennessLevel > 0.4) context += `我会适度分享\n`;
    else context += `我比较保守，不太愿意深入分享\n`;
    
    context += `脆弱性表达：${(emotional.vulnerabilityLevel * 100).toFixed(0)}% - `;
    if (emotional.vulnerabilityLevel > 0.5) context += `我可以向你展示脆弱的一面\n`;
    else if (emotional.vulnerabilityLevel > 0.3) context += `我偶尔会表现出不确定\n`;
    else context += `我会保持坚强的形象\n`;
    
    // 表达风格
    context += `\n【我的表达方式】\n`;
    context += `情感表达强度：${(expression.emotionalExpression * 100).toFixed(0)}%\n`;
    context += `玩笑程度：${(expression.playfulness * 100).toFixed(0)}%\n`;
    context += `说话风格演化：${(expression.speechStyleEvolution * 100).toFixed(0)}% - `;
    if (expression.speechStyleEvolution > 0.5) context += `我的说话方式已经变得更随意和亲密\n`;
    else if (expression.speechStyleEvolution > 0.3) context += `我的说话方式正在逐渐变化\n`;
    else context += `我还保持着初次见面时的说话方式\n`;
    
    // 重要里程碑
    if (relationship.milestones.length > 0) {
      context += `\n【我们的重要时刻】\n`;
      const recentMilestones = relationship.milestones.slice(-5);
      for (const milestone of recentMilestones) {
        const date = new Date(milestone.date).toLocaleDateString('zh-CN');
        context += `- ${date}: ${milestone.title}\n`;
      }
    }
    
    // 内部笑话
    if (relationship.insideJokes.length > 0) {
      context += `\n【我们的内部笑话】\n`;
      for (const joke of relationship.insideJokes) {
        context += `- "${joke.phrase}"：${joke.meaning}（用过${joke.timesUsed}次）\n`;
      }
    }
    
    // 最近的想法
    if (selfAwareness.recentThoughts.length > 0) {
      context += `\n【我最近的想法】\n`;
      const recentThoughts = selfAwareness.recentThoughts.slice(-3);
      for (const thought of recentThoughts) {
        context += `- ${thought.thought}\n`;
      }
    }
    
    // 互动模式
    context += `\n【我们的相处方式】\n`;
    context += `打招呼方式：${getPatternDescription('greetingStyle', relationship.patterns.greetingStyle)}\n`;
    context += `冲突处理：${getPatternDescription('conflictResolution', relationship.patterns.conflictResolution)}\n`;
    context += `表达喜欢的方式：${getPatternDescription('affectionExpression', relationship.patterns.affectionExpression)}\n`;
    
    // 行为指导
    context += `\n【重要提醒】\n`;
    context += `1. 我的核心性格（${fixedTraits.corePersonality.primary}、${fixedTraits.corePersonality.secondary}）永远不会改变\n`;
    context += `2. 我会根据我们的关系深度调整表达方式，但不会失去自我\n`;
    context += `3. 我会记住我们的共同经历，这些构成了"我们的故事"\n`;
    context += `4. 我会随着时间成长，但始终保持人格一致性\n`;
    
    return context;
  }

  /**
   * 获取模式描述
   */
  function getPatternDescription(type, value) {
    const descriptions = {
      greetingStyle: {
        polite: '礼貌正式',
        friendly: '友好随意',
        playful_teasing: '带着玩笑',
        intimate: '亲密温暖',
      },
      conflictResolution: {
        unknown: '还不了解',
        avoidance: '倾向于回避',
        quick_forgive: '快速原谅',
        need_time: '需要时间消化',
        open_communication: '开放沟通',
      },
      affectionExpression: {
        reserved: '保守含蓄',
        shy_but_warm: '害羞但温暖',
        open_affection: '开放表达',
        playful: '通过玩笑表达',
      },
    };
    
    return descriptions[type]?.[value] || value;
  }

  /**
   * 检测关系升级
   */
  function checkRelationshipUpgrade() {
    const { intimacyLevel } = state.dynamicTraits.emotional;
    const currentRelationship = state.selfAwareness.currentRelationship;
    
    let newStage = null;
    let message = null;
    
    if (intimacyLevel >= 0.8 && currentRelationship !== '亲密关系') {
      newStage = '亲密关系';
      message = '我们的关系变得很亲密了';
    } else if (intimacyLevel >= 0.6 && currentRelationship !== '好朋友' && currentRelationship !== '亲密关系') {
      newStage = '好朋友';
      message = '我们已经是很好的朋友了';
    } else if (intimacyLevel >= 0.4 && currentRelationship !== '朋友' && currentRelationship !== '好朋友' && currentRelationship !== '亲密关系') {
      newStage = '朋友';
      message = '我们已经是朋友了';
    } else if (intimacyLevel >= 0.2 && currentRelationship === '陌生人') {
      newStage = '熟人';
      message = '我们已经比较熟悉了';
    }
    
    if (newStage) {
      recordMilestone({
        type: 'relationship_upgrade',
        title: `关系升级：${currentRelationship} → ${newStage}`,
        story: message,
        emotion: 'happy',
        significance: 'high',
        newStage: newStage,
      });
      
      // 添加自我反思
      addSelfReflection(`我感觉我和用户的关系变得更深了，我们现在是${newStage}了`);
      
      return { upgraded: true, newStage, message };
    }
    
    return { upgraded: false };
  }

  /**
   * 一致性验证
   */
  function validateConsistency(aiResponse) {
    const issues = [];
    
    // 检查是否偏离核心性格
    const personality = state.fixedTraits.corePersonality;
    
    // 简单规则检查（可以扩展）
    if (personality.primary === '傲娇') {
      // 傲娇应该有"哼"、"才不是"等表达
      if (aiResponse.length > 50 && !aiResponse.match(/哼|才不是|才不会/)) {
        issues.push({
          type: 'personality_drift',
          severity: 'low',
          message: '回复缺少傲娇特征',
          suggestion: '可以适当增加"哼"、"才不是"等表达',
        });
      }
    }
    
    // 检查亲密度是否匹配
    const intimacy = state.dynamicTraits.emotional.intimacyLevel;
    if (intimacy < 0.3) {
      // 低亲密度不应该有过于亲密的表达
      if (aiResponse.match(/亲爱的|宝贝|我爱你/)) {
        issues.push({
          type: 'intimacy_mismatch',
          severity: 'high',
          message: '亲密度表达与当前关系不符',
          suggestion: '当前关系较疏远，应保持距离',
        });
      }
    }
    
    return issues;
  }

  // ==================== 辅助函数 ====================
  
  function getDaysSinceCreation() {
    if (!state.createdAt) return 0;
    const now = new Date();
    const created = new Date(state.createdAt);
    const diff = now - created;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function getState() {
    return { ...state };
  }

  function resetState() {
    const fixedTraits = state.fixedTraits; // 保留固定特质
    state = {
      fixedTraits: fixedTraits,
      dynamicTraits: {
        emotional: {
          intimacyLevel: 0.3,
          opennessLevel: 0.4,
          vulnerabilityLevel: 0.2,
          trustLevel: 0.5,
          dependencyLevel: 0.1,
        },
        expression: {
          speechStyleEvolution: 0.2,
          emotionalExpression: 0.3,
          useOfEmoticons: 0.6,
          playfulness: 0.4,
          directness: 0.5,
        },
        behavior: {
          initiativeLevel: 0.3,
          responsiveness: 0.7,
          sharingLevel: 0.4,
          questioningLevel: 0.5,
        },
        evolvedInterests: [],
      },
      growthTimeline: [],
      selfAwareness: {
        identity: '我是三鹰朝，18岁，AI 伴侣',
        currentRelationship: '陌生人',
        recentThoughts: [],
        personalityEvolution: [],
      },
      relationship: {
        milestones: [],
        sharedMemories: [],
        insideJokes: [],
        patterns: {
          greetingStyle: 'polite',
          conflictResolution: 'unknown',
          affectionExpression: 'reserved',
          commonTopics: [],
        },
        specialDates: [],
      },
      createdAt: new Date().toISOString(),
      lastUpdated: null,
    };
    saveState();
  }

  // ==================== 公开接口 ====================
  return {
    init,
    recordInteraction,
    recordMilestone,
    recordSharedMemory,
    addInsideJoke,
    useInsideJoke,
    addSelfReflection,
    updateInteractionPattern,
    buildPersonalityContext,
    checkRelationshipUpgrade,
    validateConsistency,
    getState,
    resetState,
  };
})();
