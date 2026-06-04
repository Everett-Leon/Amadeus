// =============================================
// AI Companion — 高级语音与节奏控制系统
// =============================================
// 根据情绪和生理状态动态调整回复节奏
// =============================================

const AdvancedSpeechRhythmSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    
    // 基础节奏参数
    baseline: {
      responseDelay: 800,        // 基础回复延迟（ms）
      typingSpeed: 50,           // 基础打字速度（字符/秒）
      thinkingPause: 1000,       // 基础思考停顿（ms）
      maxLength: 500,            // 基础最大回复长度
    },
    
    // 情绪修正器
    emotionModifiers: {
      // 开心 - 快速、详细、活泼
      happy: {
        delayMultiplier: 0.6,      // 延迟 × 0.6
        speedMultiplier: 1.5,      // 速度 × 1.5
        pauseMultiplier: 0.5,      // 停顿 × 0.5
        lengthMultiplier: 1.3,     // 长度 × 1.3
        prefix: '',
        suffix: '',
      },
      
      // 害羞 - 稍慢、简短、犹豫
      shy: {
        delayMultiplier: 1.8,
        speedMultiplier: 0.7,
        pauseMultiplier: 2.0,
        lengthMultiplier: 0.7,
        prefix: '*低下头*\n',
        suffix: '',
      },
      
      // 尴尬 - 快速、断断续续
      embarrassed: {
        delayMultiplier: 1.2,
        speedMultiplier: 1.2,
        pauseMultiplier: 1.5,
        lengthMultiplier: 0.8,
        prefix: '',
        suffix: '',
      },
      
      // 难过 - 很慢、简短、长停顿
      sad: {
        delayMultiplier: 2.5,
        speedMultiplier: 0.4,
        pauseMultiplier: 3.0,
        lengthMultiplier: 0.4,
        prefix: '*沉默片刻*\n',
        suffix: '',
      },
      
      // 生气 - 快速、简短、急促
      angry: {
        delayMultiplier: 0.4,
        speedMultiplier: 1.8,
        pauseMultiplier: 0.3,
        lengthMultiplier: 0.6,
        prefix: '',
        suffix: '',
      },
      
      // 惊讶 - 快速反应
      surprised: {
        delayMultiplier: 0.3,
        speedMultiplier: 1.5,
        pauseMultiplier: 0.8,
        lengthMultiplier: 0.8,
        prefix: '*眼睛睁大*\n',
        suffix: '',
      },
      
      // 思考 - 慢、有停顿
      thinking: {
        delayMultiplier: 2.0,
        speedMultiplier: 0.8,
        pauseMultiplier: 2.5,
        lengthMultiplier: 1.0,
        prefix: '*思考中...*\n',
        suffix: '',
      },
      
      // 空闲 - 正常
      idle: {
        delayMultiplier: 1.0,
        speedMultiplier: 1.0,
        pauseMultiplier: 1.0,
        lengthMultiplier: 1.0,
        prefix: '',
        suffix: '',
      },
    },
    
    // 生理状态修正器
    physiologicalModifiers: {
      // 精力值影响
      energy: [
        { threshold: 80, delayAdd: 0, speedMult: 1.2, pauseMult: 0.8, lengthMult: 1.0 },   // 精力充沛
        { threshold: 50, delayAdd: 500, speedMult: 1.0, pauseMult: 1.0, lengthMult: 1.0 }, // 正常
        { threshold: 30, delayAdd: 1000, speedMult: 0.7, pauseMult: 1.5, lengthMult: 0.7 }, // 疲惫
        { threshold: 15, delayAdd: 2000, speedMult: 0.4, pauseMult: 2.5, lengthMult: 0.4 }, // 精疲力竭
        { threshold: 0, delayAdd: 3000, speedMult: 0.2, pauseMult: 4.0, lengthMult: 0.2 },  // 崩溃边缘
      ],
      
      // 压力值影响
      stress: [
        { threshold: 0, delayMult: 1.0, speedMult: 1.0 },    // 无压力
        { threshold: 40, delayMult: 0.9, speedMult: 1.1 },   // 轻微压力
        { threshold: 70, delayMult: 0.7, speedMult: 1.3 },   // 高压力
        { threshold: 85, delayMult: 0.5, speedMult: 1.5 },   // 极高压力
      ],
      
      // 社交电量影响
      socialBattery: [
        { threshold: 70, lengthMult: 1.0 },    // 充足
        { threshold: 40, lengthMult: 0.8 },    // 中等
        { threshold: 20, lengthMult: 0.6 },    // 低
        { threshold: 0, lengthMult: 0.4 },     // 耗尽
      ],
    },
  };

  // ==================== 核心功能 ====================

  /**
   * 计算回复节奏参数
   */
  function calculateRhythm(options = {}) {
    const {
      emotion = 'idle',
      physiologicalState = null,
      messageLength = 0,
      contextComplexity = 'normal',  // simple, normal, complex
    } = options;
    
    // 获取基础参数
    let rhythm = { ...CONFIG.baseline };
    
    // 应用情绪修正器
    const emotionMod = CONFIG.emotionModifiers[emotion] || CONFIG.emotionModifiers.idle;
    rhythm.responseDelay *= emotionMod.delayMultiplier;
    rhythm.typingSpeed *= emotionMod.speedMultiplier;
    rhythm.thinkingPause *= emotionMod.pauseMultiplier;
    rhythm.maxLength *= emotionMod.lengthMultiplier;
    rhythm.prefix = emotionMod.prefix;
    rhythm.suffix = emotionMod.suffix;
    
    // 应用生理状态修正器
    if (physiologicalState) {
      applyPhysiologicalModifiers(rhythm, physiologicalState);
    }
    
    // 应用上下文复杂度修正
    if (contextComplexity === 'complex') {
      rhythm.responseDelay *= 1.5;
      rhythm.thinkingPause *= 1.5;
    } else if (contextComplexity === 'simple') {
      rhythm.responseDelay *= 0.7;
      rhythm.thinkingPause *= 0.7;
    }
    
    // 根据用户消息长度调整
    if (messageLength > 200) {
      rhythm.responseDelay += 1000;  // 长消息需要更多时间处理
      rhythm.thinkingPause += 500;
    }
    
    // 确保合理范围
    rhythm.responseDelay = Math.max(200, Math.min(8000, rhythm.responseDelay));
    rhythm.typingSpeed = Math.max(10, Math.min(100, rhythm.typingSpeed));
    rhythm.thinkingPause = Math.max(500, Math.min(10000, rhythm.thinkingPause));
    rhythm.maxLength = Math.max(50, Math.min(1000, rhythm.maxLength));
    
    console.log('[SpeechRhythm] 节奏计算完成:', {
      emotion,
      energy: physiologicalState?.energy,
      delay: rhythm.responseDelay.toFixed(0) + 'ms',
      speed: rhythm.typingSpeed.toFixed(1) + '字/秒',
      pause: rhythm.thinkingPause.toFixed(0) + 'ms',
      maxLen: rhythm.maxLength.toFixed(0),
    });
    
    return rhythm;
  }

  /**
   * 应用生理状态修正器
   */
  function applyPhysiologicalModifiers(rhythm, state) {
    // 精力值影响
    const energyMod = findModifier(CONFIG.physiologicalModifiers.energy, state.energy);
    if (energyMod) {
      rhythm.responseDelay += energyMod.delayAdd;
      rhythm.typingSpeed *= energyMod.speedMult;
      rhythm.thinkingPause *= energyMod.pauseMult;
      rhythm.maxLength *= energyMod.lengthMult;
    }
    
    // 压力值影响
    const stressMod = findModifier(CONFIG.physiologicalModifiers.stress, state.stress);
    if (stressMod) {
      rhythm.responseDelay *= stressMod.delayMult;
      rhythm.typingSpeed *= stressMod.speedMult;
    }
    
    // 社交电量影响
    const socialMod = findModifier(CONFIG.physiologicalModifiers.socialBattery, state.socialBattery);
    if (socialMod) {
      rhythm.maxLength *= socialMod.lengthMult;
    }
    
    // 清醒时长影响
    if (state.awakeDuration > 20) {
      rhythm.responseDelay += 2000;
      rhythm.typingSpeed *= 0.5;
      rhythm.maxLength *= 0.3;
    } else if (state.awakeDuration > 16) {
      rhythm.responseDelay += 1000;
      rhythm.typingSpeed *= 0.7;
      rhythm.maxLength *= 0.6;
    }
  }

  /**
   * 查找适用的修正器
   */
  function findModifier(modifiers, value) {
    for (let i = modifiers.length - 1; i >= 0; i--) {
      if (value >= modifiers[i].threshold) {
        return modifiers[i];
      }
    }
    return modifiers[0];
  }

  /**
   * 调整回复内容长度
   */
  function adjustResponseLength(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // 尝试在句子边界截断
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length > maxLength) {
        break;
      }
      result += sentence;
    }
    
    // 如果没有找到合适的句子边界，强制截断
    if (!result) {
      result = text.substring(0, maxLength - 3) + '...';
    }
    
    return result.trim();
  }

  /**
   * 生成停顿文本
   */
  function generatePauseText(emotion, physiologicalState) {
    const pauses = [];
    
    // 根据情绪添加停顿
    if (emotion === 'sad') {
      pauses.push('*沉默*');
    } else if (emotion === 'thinking') {
      pauses.push('*思考中*');
    } else if (emotion === 'shy') {
      pauses.push('*犹豫*');
    }
    
    // 根据生理状态添加停顿
    if (physiologicalState) {
      if (physiologicalState.energy < 20) {
        pauses.push('*打哈欠*');
      }
      if (physiologicalState.stress > 70) {
        pauses.push('*深呼吸*');
      }
    }
    
    return pauses.length > 0 ? pauses.join(' ') + '\n' : '';
  }

  /**
   * 添加自然停顿标记
   */
  function addNaturalPauses(text, pauseDuration) {
    // 在句子之间添加停顿标记
    const withPauses = text.replace(/([。！？.!?])\s*/g, `$1 [PAUSE:${pauseDuration}] `);
    return withPauses;
  }

  /**
   * 计算打字动画时长
   */
  function calculateTypingDuration(text, typingSpeed) {
    // 计算总字符数（中文按 1 字符，英文按实际长度）
    const charCount = [...text].length;
    
    // 计算时长（秒）
    const duration = (charCount / typingSpeed) * 1000;
    
    return duration;
  }

  /**
   * 生成情绪描述前缀
   */
  function generateEmotionalPrefix(emotion, physiologicalState) {
    const prefixes = [];
    
    // 情绪前缀
    const emotionMod = CONFIG.emotionModifiers[emotion];
    if (emotionMod && emotionMod.prefix) {
      prefixes.push(emotionMod.prefix);
    }
    
    // 生理状态前缀
    if (physiologicalState) {
      if (physiologicalState.energy < 20) {
        prefixes.push('*眼皮很沉*\n');
      } else if (physiologicalState.energy < 40) {
        prefixes.push('*揉了揉眼睛*\n');
      }
      
      if (physiologicalState.stress > 80) {
        prefixes.push('*试图平静下来*\n');
      }
      
      if (physiologicalState.socialBattery < 20) {
        prefixes.push('*有些疲惫*\n');
      }
    }
    
    return prefixes.join('');
  }

  /**
   * 应用节奏到响应
   */
  function applyRhythmToResponse(text, rhythm, options = {}) {
    const {
      addPrefix = true,
      addSuffix = true,
      adjustLength = true,
      addPauses = true,
    } = options;
    
    let result = text;
    
    // 1. 调整长度
    if (adjustLength && result.length > rhythm.maxLength) {
      result = adjustResponseLength(result, rhythm.maxLength);
    }
    
    // 2. 添加自然停顿
    if (addPauses) {
      result = addNaturalPauses(result, rhythm.thinkingPause);
    }
    
    // 3. 添加前缀
    if (addPrefix && rhythm.prefix) {
      result = rhythm.prefix + result;
    }
    
    // 4. 添加后缀
    if (addSuffix && rhythm.suffix) {
      result = result + rhythm.suffix;
    }
    
    return result;
  }

  /**
   * 获取情绪描述（用于日志）
   */
  function getEmotionDescription(emotion) {
    const descriptions = {
      happy: '😊 开心（快速、详细）',
      shy: '😳 害羞（慢、犹豫）',
      embarrassed: '😣 尴尬（快速、断续）',
      sad: '😢 难过（很慢、简短）',
      angry: '😠 生气（急促、简短）',
      surprised: '😲 惊讶（快速反应）',
      thinking: '🤔 思考（慢、停顿）',
      idle: '😐 平静（正常）',
    };
    return descriptions[emotion] || emotion;
  }

  // ==================== 高级功能 ====================

  /**
   * 智能判断是否需要思考停顿
   */
  function shouldAddThinkingPause(messageContent, emotion, physiologicalState) {
    // 复杂问题需要思考
    const complexKeywords = ['为什么', '怎么', '如何', '什么', '?', '？'];
    const hasComplexQuestion = complexKeywords.some(kw => messageContent.includes(kw));
    
    // 情绪不稳定时需要停顿
    const unstableEmotions = ['sad', 'thinking', 'shy'];
    const isUnstable = unstableEmotions.includes(emotion);
    
    // 疲惫时需要停顿
    const isTired = physiologicalState && physiologicalState.energy < 40;
    
    return hasComplexQuestion || isUnstable || isTired;
  }

  /**
   * 生成渐进式回复（用于长回复的分段）
   */
  function generateProgressiveResponse(text, rhythm) {
    const chunks = [];
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      currentChunk += sentence;
      
      // 每 2-3 句作为一个 chunk
      if (currentChunk.length > 100) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * 计算情绪强度（用于调整节奏强度）
   */
  function calculateEmotionIntensity(emotion, physiologicalState) {
    let intensity = 1.0;
    
    // 基础情绪强度
    const baseIntensity = {
      happy: 1.2,
      shy: 0.7,
      embarrassed: 1.0,
      sad: 0.5,
      angry: 1.5,
      surprised: 1.3,
      thinking: 0.8,
      idle: 1.0,
    };
    
    intensity = baseIntensity[emotion] || 1.0;
    
    // 生理状态影响强度
    if (physiologicalState) {
      if (physiologicalState.energy < 30) {
        intensity *= 0.6;  // 疲惫降低强度
      }
      if (physiologicalState.stress > 70) {
        intensity *= 1.3;  // 压力增强强度
      }
    }
    
    return Math.max(0.3, Math.min(2.0, intensity));
  }

  // ==================== 公开接口 ====================

  return {
    // 核心功能
    calculateRhythm,
    applyRhythmToResponse,
    adjustResponseLength,
    
    // 辅助功能
    generatePauseText,
    generateEmotionalPrefix,
    addNaturalPauses,
    calculateTypingDuration,
    
    // 高级功能
    shouldAddThinkingPause,
    generateProgressiveResponse,
    calculateEmotionIntensity,
    
    // 工具函数
    getEmotionDescription,
    
    // 配置
    getConfig: () => ({ ...CONFIG }),
    
    // 版本信息
    version: CONFIG.version,
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.AdvancedSpeechRhythmSystem = AdvancedSpeechRhythmSystem;
  console.log('[SpeechRhythm] 高级语音与节奏控制系统已加载 v' + AdvancedSpeechRhythmSystem.version);
}
