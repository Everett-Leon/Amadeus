// =============================================
// AI Companion — 重叠说话系统
// =============================================
// 支持用户打断 AI 和 AI 主动打断用户
// =============================================

const OverlapSpeechSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    
    // 用户打断检测
    userInterruption: {
      enabled: true,
      detectSpeechStart: true,      // 检测用户开始说话
      detectTyping: true,            // 检测用户开始打字
      detectMicClick: true,          // 检测用户点击麦克风
      gracePeriod: 500,              // 延迟检测（ms），避免误触
    },
    
    // AI 打断策略
    aiInterruption: {
      enabled: true,                 // 是否允许 AI 打断
      urgentOnly: true,              // 仅紧急情况打断
      maxInterruptionsPerHour: 3,    // 每小时最多打断次数
      urgentKeywords: [              // 紧急关键词
        '危险', '小心', '注意', '等等', '别',
        'danger', 'careful', 'wait', 'stop',
      ],
      emotionTriggers: ['angry', 'surprised'],  // 触发打断的情绪
    },
    
    // 打断反馈
    feedback: {
      showVisual: true,              // 显示视觉反馈
      playSound: false,              // 播放提示音（可选）
      recordHistory: true,           // 记录打断历史
      maxHistorySize: 50,            // 最大历史记录数
    },
    
    // 打断后行为
    postInterruption: {
      aiStopImmediately: true,       // AI 立即停止
      aiAcknowledge: true,           // AI 确认被打断
      aiResumable: false,            // 是否允许恢复（暂不实现）
      acknowledgePhrases: [          // 确认短语
        '嗯？',
        '你说？',
        '怎么了？',
        '诶？',
      ],
    },
  };

  // ==================== 状态管理 ====================
  let state = {
    // AI 说话状态
    aiSpeaking: false,
    aiStartTime: 0,
    aiCurrentText: '',
    
    // 用户打断状态
    userInterrupting: false,
    userInterruptTime: 0,
    
    // AI 打断状态
    aiInterrupting: false,
    aiInterruptTime: 0,
    
    // 打断历史
    interruptionHistory: [],
    
    // AI 打断次数（每小时）
    aiInterruptCount: 0,
    aiInterruptCountResetTime: Date.now(),
  };

  // ==================== 核心功能 ====================

  /**
   * 初始化系统
   */
  function init() {
    // 从 LocalStorage 加载历史
    loadState();
    
    // 每小时重置 AI 打断次数
    setInterval(() => {
      state.aiInterruptCount = 0;
      state.aiInterruptCountResetTime = Date.now();
      console.log('[OverlapSpeech] AI 打断次数已重置');
    }, 3600000); // 1 小时
    
    console.log('[OverlapSpeech] 重叠说话系统已初始化 v' + CONFIG.version);
  }

  /**
   * AI 开始说话
   */
  function onAISpeakStart(text) {
    state.aiSpeaking = true;
    state.aiStartTime = Date.now();
    state.aiCurrentText = text;
    
    console.log('[OverlapSpeech] AI 开始说话:', text.slice(0, 30) + '...');
    
    // 触发视觉事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('overlapAISpeakStart', {
        detail: { text },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * AI 停止说话
   */
  function onAISpeakEnd(reason = 'natural') {
    if (!state.aiSpeaking) return;
    
    const duration = Date.now() - state.aiStartTime;
    console.log(`[OverlapSpeech] AI 停止说话 (${reason}), 持续 ${duration}ms`);
    
    state.aiSpeaking = false;
    state.aiStartTime = 0;
    state.aiCurrentText = '';
    
    // 触发视觉事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('overlapAISpeakEnd', {
        detail: { reason, duration },
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 用户打断 AI
   */
  function onUserInterrupt(source = 'unknown') {
    if (!CONFIG.userInterruption.enabled) return false;
    if (!state.aiSpeaking) return false;
    
    // 检测源是否启用
    if (source === 'speech' && !CONFIG.userInterruption.detectSpeechStart) return false;
    if (source === 'typing' && !CONFIG.userInterruption.detectTyping) return false;
    if (source === 'mic' && !CONFIG.userInterruption.detectMicClick) return false;
    
    // 记录打断
    state.userInterrupting = true;
    state.userInterruptTime = Date.now();
    
    const interruption = {
      type: 'user',
      source: source,
      timestamp: Date.now(),
      aiText: state.aiCurrentText,
      aiDuration: Date.now() - state.aiStartTime,
    };
    
    addToHistory(interruption);
    
    console.log(`[OverlapSpeech] 用户打断 AI (${source})`, {
      aiDuration: interruption.aiDuration + 'ms',
      aiText: state.aiCurrentText.slice(0, 30) + '...',
    });
    
    // 触发打断事件（供主应用使用）
    if (window.onUserInterruptAI) {
      window.onUserInterruptAI(interruption);
    }
    
    // 触发视觉事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('overlapUserInterrupt', {
        detail: interruption,
      });
      window.dispatchEvent(event);
    }
    
    return true;
  }

  /**
   * 检测是否应该 AI 打断用户
   */
  function shouldAIInterrupt(userMessage, context = {}) {
    if (!CONFIG.aiInterruption.enabled) return false;
    
    const {
      emotion = 'idle',
      physiologicalState = null,
      conversationLength = 0,
    } = context;
    
    // 检查打断次数限制
    if (state.aiInterruptCount >= CONFIG.aiInterruption.maxInterruptionsPerHour) {
      console.log('[OverlapSpeech] AI 打断次数已达上限');
      return false;
    }
    
    // 仅紧急情况打断
    if (CONFIG.aiInterruption.urgentOnly) {
      // 检查紧急关键词
      const hasUrgentKeyword = CONFIG.aiInterruption.urgentKeywords.some(
        keyword => userMessage.includes(keyword)
      );
      
      // 检查情绪触发
      const hasEmotionTrigger = CONFIG.aiInterruption.emotionTriggers.includes(emotion);
      
      if (hasUrgentKeyword || hasEmotionTrigger) {
        console.log('[OverlapSpeech] 检测到紧急情况，AI 应该打断:', {
          hasUrgentKeyword,
          hasEmotionTrigger,
          emotion,
        });
        return true;
      }
    }
    
    return false;
  }

  /**
   * AI 打断用户
   */
  function onAIInterrupt(reason = 'urgent') {
    if (!CONFIG.aiInterruption.enabled) return false;
    
    // 检查打断次数限制
    if (state.aiInterruptCount >= CONFIG.aiInterruption.maxInterruptionsPerHour) {
      console.log('[OverlapSpeech] AI 打断次数已达上限，取消打断');
      return false;
    }
    
    state.aiInterrupting = true;
    state.aiInterruptTime = Date.now();
    state.aiInterruptCount++;
    
    const interruption = {
      type: 'ai',
      reason: reason,
      timestamp: Date.now(),
    };
    
    addToHistory(interruption);
    
    console.log('[OverlapSpeech] AI 打断用户:', {
      reason,
      count: state.aiInterruptCount,
      limit: CONFIG.aiInterruption.maxInterruptionsPerHour,
    });
    
    // 触发打断事件
    if (window.onAIInterruptUser) {
      window.onAIInterruptUser(interruption);
    }
    
    // 触发视觉事件
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('overlapAIInterrupt', {
        detail: interruption,
      });
      window.dispatchEvent(event);
    }
    
    return true;
  }

  /**
   * 生成 AI 打断确认短语
   */
  function getAIInterruptPhrase() {
    const phrases = CONFIG.postInterruption.acknowledgePhrases;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * 生成用户打断后的 AI 确认短语
   */
  function getUserInterruptAcknowledgePhrase() {
    if (!CONFIG.postInterruption.aiAcknowledge) return '';
    
    const phrases = CONFIG.postInterruption.acknowledgePhrases;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * 添加到打断历史
   */
  function addToHistory(interruption) {
    if (!CONFIG.feedback.recordHistory) return;
    
    state.interruptionHistory.push(interruption);
    
    // 限制历史大小
    if (state.interruptionHistory.length > CONFIG.feedback.maxHistorySize) {
      state.interruptionHistory.shift();
    }
    
    saveState();
  }

  /**
   * 获取打断历史
   */
  function getHistory(filter = {}) {
    const { type, limit = 20 } = filter;
    
    let history = [...state.interruptionHistory];
    
    // 过滤类型
    if (type) {
      history = history.filter(h => h.type === type);
    }
    
    // 倒序（最新的在前）
    history.reverse();
    
    // 限制数量
    if (limit) {
      history = history.slice(0, limit);
    }
    
    return history;
  }

  /**
   * 获取打断统计
   */
  function getStatistics() {
    const total = state.interruptionHistory.length;
    const userInterrupts = state.interruptionHistory.filter(h => h.type === 'user').length;
    const aiInterrupts = state.interruptionHistory.filter(h => h.type === 'ai').length;
    
    // 按来源统计用户打断
    const bySpeech = state.interruptionHistory.filter(h => h.type === 'user' && h.source === 'speech').length;
    const byTyping = state.interruptionHistory.filter(h => h.type === 'user' && h.source === 'typing').length;
    const byMic = state.interruptionHistory.filter(h => h.type === 'user' && h.source === 'mic').length;
    
    return {
      total,
      userInterrupts,
      aiInterrupts,
      userBySource: {
        speech: bySpeech,
        typing: byTyping,
        mic: byMic,
      },
      aiCurrentCount: state.aiInterruptCount,
      aiCountLimit: CONFIG.aiInterruption.maxInterruptionsPerHour,
    };
  }

  /**
   * 清除历史
   */
  function clearHistory() {
    state.interruptionHistory = [];
    saveState();
    console.log('[OverlapSpeech] 打断历史已清除');
  }

  /**
   * 检测用户是否在说话（语音识别活动）
   */
  function isUserSpeaking() {
    // 这个函数需要与主应用的语音识别状态集成
    return state.userInterrupting;
  }

  /**
   * 检测 AI 是否在说话
   */
  function isAISpeaking() {
    return state.aiSpeaking;
  }

  // ==================== 状态持久化 ====================

  /**
   * 保存状态到 LocalStorage
   */
  function saveState() {
    const data = {
      interruptionHistory: state.interruptionHistory,
      aiInterruptCount: state.aiInterruptCount,
      aiInterruptCountResetTime: state.aiInterruptCountResetTime,
      version: CONFIG.version,
    };
    
    try {
      localStorage.setItem('ai-companion-overlap-speech', JSON.stringify(data));
    } catch (err) {
      console.error('[OverlapSpeech] 保存状态失败:', err);
    }
  }

  /**
   * 从 LocalStorage 加载状态
   */
  function loadState() {
    try {
      const raw = localStorage.getItem('ai-companion-overlap-speech');
      if (!raw) return;
      
      const data = JSON.parse(raw);
      
      // 版本检查
      if (data.version !== CONFIG.version) {
        console.log('[OverlapSpeech] 版本不匹配，重置状态');
        return;
      }
      
      // 恢复状态
      state.interruptionHistory = data.interruptionHistory || [];
      state.aiInterruptCount = data.aiInterruptCount || 0;
      state.aiInterruptCountResetTime = data.aiInterruptCountResetTime || Date.now();
      
      // 检查是否需要重置打断次数（超过 1 小时）
      if (Date.now() - state.aiInterruptCountResetTime > 3600000) {
        state.aiInterruptCount = 0;
        state.aiInterruptCountResetTime = Date.now();
      }
      
      console.log('[OverlapSpeech] 状态已加载:', {
        historySize: state.interruptionHistory.length,
        aiInterruptCount: state.aiInterruptCount,
      });
    } catch (err) {
      console.error('[OverlapSpeech] 加载状态失败:', err);
    }
  }

  /**
   * 导出数据（用于记忆导出系统）
   */
  function exportData() {
    return {
      version: CONFIG.version,
      state: {
        interruptionHistory: state.interruptionHistory,
        aiInterruptCount: state.aiInterruptCount,
        aiInterruptCountResetTime: state.aiInterruptCountResetTime,
      },
      statistics: getStatistics(),
    };
  }

  /**
   * 导入数据（用于记忆导出系统）
   */
  function importData(data) {
    if (!data || !data.state) {
      console.error('[OverlapSpeech] 导入数据格式错误');
      return false;
    }
    
    try {
      state.interruptionHistory = data.state.interruptionHistory || [];
      state.aiInterruptCount = data.state.aiInterruptCount || 0;
      state.aiInterruptCountResetTime = data.state.aiInterruptCountResetTime || Date.now();
      
      saveState();
      console.log('[OverlapSpeech] 数据导入成功');
      return true;
    } catch (err) {
      console.error('[OverlapSpeech] 导入数据失败:', err);
      return false;
    }
  }

  // ==================== 高级功能 ====================

  /**
   * 分析打断模式（用于学习用户习惯）
   */
  function analyzeInterruptionPattern() {
    const history = state.interruptionHistory;
    if (history.length < 10) {
      return {
        hasPattern: false,
        message: '数据不足，需要至少 10 次打断记录',
      };
    }
    
    const userInterrupts = history.filter(h => h.type === 'user');
    
    // 分析用户最常使用的打断方式
    const sources = userInterrupts.reduce((acc, h) => {
      acc[h.source] = (acc[h.source] || 0) + 1;
      return acc;
    }, {});
    
    const mostUsedSource = Object.keys(sources).reduce((a, b) => 
      sources[a] > sources[b] ? a : b
    );
    
    // 分析用户打断的平均时机（AI 说话多久后）
    const avgDuration = userInterrupts.reduce((sum, h) => 
      sum + (h.aiDuration || 0), 0
    ) / userInterrupts.length;
    
    return {
      hasPattern: true,
      mostUsedSource: mostUsedSource,
      sourceStats: sources,
      avgInterruptTime: Math.round(avgDuration),
      totalUserInterrupts: userInterrupts.length,
    };
  }

  /**
   * 生成打断报告（用于设置面板）
   */
  function generateReport() {
    const stats = getStatistics();
    const pattern = analyzeInterruptionPattern();
    
    return {
      statistics: stats,
      pattern: pattern,
      recentHistory: getHistory({ limit: 10 }),
    };
  }

  // ==================== 公开接口 ====================

  return {
    // 核心功能
    init,
    onAISpeakStart,
    onAISpeakEnd,
    onUserInterrupt,
    shouldAIInterrupt,
    onAIInterrupt,
    
    // 确认短语
    getAIInterruptPhrase,
    getUserInterruptAcknowledgePhrase,
    
    // 状态查询
    isAISpeaking,
    isUserSpeaking,
    getHistory,
    getStatistics,
    clearHistory,
    
    // 高级功能
    analyzeInterruptionPattern,
    generateReport,
    
    // 数据导入导出
    exportData,
    importData,
    
    // 配置
    getConfig: () => ({ ...CONFIG }),
    getState: () => ({ ...state }),
    
    // 版本信息
    version: CONFIG.version,
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.OverlapSpeechSystem = OverlapSpeechSystem;
  console.log('[OverlapSpeech] 重叠说话系统已加载 v' + OverlapSpeechSystem.version);
}
