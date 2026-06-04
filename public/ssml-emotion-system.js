// =============================================
// AI Companion — SSML 语音情感增强系统
// =============================================
// 为 TTS 添加呼吸声、停顿、语速变化等情感效果
// =============================================

const SSMLEmotionSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.1',
    
    // 参数缓存（性能优化）
    cache: {
      enabled: true,
      maxSize: 100,
      ttl: 300000, // 5 分钟
    },
    
    // 情绪 SSML 参数
    emotionParams: {
      // 开心 - 语速快、音调高、充满活力
      happy: {
        rate: '+15%',           // 语速提升 15%
        pitch: '+8Hz',          // 音调提高 8Hz
        volume: '+3dB',         // 音量略增
        prefix: '',             // 无前缀音效
        suffix: '',             // 无后缀音效
        breathingPattern: 'none', // 不需要呼吸声
      },
      
      // 害羞 - 语速慢、音量小、有停顿
      shy: {
        rate: '-12%',
        pitch: '-3Hz',
        volume: '-6dB',
        prefix: '<break time="500ms"/>',  // 停顿 500ms
        suffix: '<break time="800ms"/>',  // 结尾长停顿
        breathingPattern: 'light',        // 轻微呼吸
      },
      
      // 尴尬 - 断断续续、语速不稳定
      embarrassed: {
        rate: '+5%',
        pitch: '+2Hz',
        volume: '-3dB',
        prefix: '<break time="300ms"/>',
        suffix: '<break time="600ms"/>',
        breathingPattern: 'nervous',      // 紧张呼吸
      },
      
      // 难过 - 很慢、音调低、有叹气
      sad: {
        rate: '-25%',
        pitch: '-10Hz',
        volume: '-8dB',
        prefix: '<break time="1200ms"/>',  // 长停顿
        suffix: '<break time="1500ms"/>',
        breathingPattern: 'heavy',         // 沉重呼吸/叹气
      },
      
      // 生气 - 快速、音调高、音量大
      angry: {
        rate: '+20%',
        pitch: '+12Hz',
        volume: '+5dB',
        prefix: '',
        suffix: '',
        breathingPattern: 'rapid',         // 急促呼吸
      },
      
      // 惊讶 - 快速、音调急升
      surprised: {
        rate: '+18%',
        pitch: '+15Hz',
        volume: '+4dB',
        prefix: '',                        // 快速反应无停顿
        suffix: '<break time="400ms"/>',
        breathingPattern: 'gasp',          // 倒吸气
      },
      
      // 思考 - 慢、有长停顿
      thinking: {
        rate: '-8%',
        pitch: '0Hz',
        volume: '-2dB',
        prefix: '<break time="1000ms"/>',  // 思考停顿
        suffix: '<break time="800ms"/>',
        breathingPattern: 'contemplative', // 沉思呼吸
      },
      
      // 空闲 - 正常
      idle: {
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0dB',
        prefix: '',
        suffix: '',
        breathingPattern: 'none',
      },
    },
    
    // 生理状态 SSML 修正
    physiologicalParams: {
      // 精力值影响
      energy: [
        { threshold: 80, rate: '+8%', volume: '+0dB', breathing: 'none' },       // 精力充沛
        { threshold: 50, rate: '+0%', volume: '+0dB', breathing: 'none' },       // 正常
        { threshold: 30, rate: '-10%', volume: '-4dB', breathing: 'tired' },     // 疲惫
        { threshold: 15, rate: '-18%', volume: '-7dB', breathing: 'exhausted' }, // 精疲力竭
        { threshold: 0, rate: '-28%', volume: '-10dB', breathing: 'exhausted' }, // 崩溃边缘
      ],
      
      // 压力值影响
      stress: [
        { threshold: 0, rate: '+0%', pitch: '+0Hz' },    // 无压力
        { threshold: 40, rate: '+5%', pitch: '+3Hz' },   // 轻微压力
        { threshold: 70, rate: '+12%', pitch: '+8Hz' },  // 高压力
        { threshold: 85, rate: '+18%', pitch: '+12Hz' }, // 极高压力
      ],
    },
    
    // 呼吸音效模式（扩展到 15+ 种）
    breathingPatterns: {
      none: '',
      light: '<break time="200ms" strength="weak"/>',              // 轻微呼吸
      nervous: '<break time="150ms" strength="weak"/><break time="150ms" strength="weak"/>', // 紧张
      heavy: '<break time="800ms" strength="strong"/>',            // 沉重呼吸/叹气
      rapid: '<break time="100ms" strength="weak"/><break time="100ms" strength="weak"/>', // 急促
      gasp: '<break time="300ms" strength="medium"/>',             // 倒吸气
      contemplative: '<break time="600ms" strength="medium"/>',    // 沉思
      tired: '<break time="500ms" strength="medium"/>',            // 疲惫
      exhausted: '<break time="1000ms" strength="strong"/>',       // 精疲力竭
      // 新增模式
      gentle: '<break time="250ms" strength="x-weak"/>',           // 温柔呼吸
      anxious: '<break time="120ms" strength="weak"/><break time="180ms" strength="weak"/>', // 焦虑
      relieved: '<break time="700ms" strength="medium"/>',         // 释然
      excited: '<break time="80ms" strength="weak"/><break time="80ms" strength="weak"/><break time="80ms" strength="weak"/>', // 兴奋急促
      calm: '<break time="400ms" strength="weak"/>',               // 平静
      sleepy: '<break time="900ms" strength="strong"/>',           // 困倦
      startled: '<break time="50ms" strength="x-weak"/>',          // 惊吓
      meditative: '<break time="1200ms" strength="medium"/>',      // 冥想深呼吸
    },
  };

  // ==================== 核心功能 ====================

  // 参数缓存系统
  const paramCache = new Map();
  
  /**
   * 获取缓存的参数
   */
  function getCachedParams(key) {
    if (!CONFIG.cache.enabled) return null;
    
    const cached = paramCache.get(key);
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > CONFIG.cache.ttl) {
      paramCache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * 设置缓存参数
   */
  function setCachedParams(key, data) {
    if (!CONFIG.cache.enabled) return;
    
    // 限制缓存大小
    if (paramCache.size >= CONFIG.cache.maxSize) {
      const firstKey = paramCache.keys().next().value;
      paramCache.delete(firstKey);
    }
    
    paramCache.set(key, {
      data: data,
      timestamp: Date.now(),
    });
  }
  
  /**
   * 清空缓存
   */
  function clearCache() {
    paramCache.clear();
    console.log('[SSML] 参数缓存已清空');
  }

  /**
   * 生成 SSML 标记文本
   */
  /**
   * 生成 SSML 标记文本（性能优化版）
   */
  function generateSSML(text, options = {}) {
    const startTime = performance.now();
    
    const {
      emotion = 'idle',
      physiologicalState = null,
      voiceType = 'edge',  // 'edge' 或 'fish'
      addBreathing = true,
      addProsody = true,
      // 新增细粒度控制参数
      rateMultiplier = 1.0,    // 语速倍数
      pitchMultiplier = 1.0,   // 音调倍数
      volumeMultiplier = 1.0,  // 音量倍数
      customBreathing = null,  // 自定义呼吸模式
    } = options;
    
    // Fish Audio 不支持 SSML，直接返回纯文本
    if (voiceType === 'fish') {
      console.log('[SSML] Fish Audio 不支持 SSML，返回纯文本');
      return text;
    }
    
    // 尝试从缓存获取
    const cacheKey = `${emotion}_${JSON.stringify(physiologicalState)}_${rateMultiplier}_${pitchMultiplier}_${volumeMultiplier}`;
    let finalParams = getCachedParams(cacheKey);
    
    if (!finalParams) {
      // 获取情绪参数
      const emotionParam = CONFIG.emotionParams[emotion] || CONFIG.emotionParams.idle;
      
      // 应用生理状态修正
      let finalRate = emotionParam.rate;
      let finalPitch = emotionParam.pitch;
      let finalVolume = emotionParam.volume;
      let breathingPattern = emotionParam.breathingPattern;
      
      if (physiologicalState) {
        const physioMod = applyPhysiologicalModifiers(emotionParam, physiologicalState);
        finalRate = physioMod.rate;
        finalPitch = physioMod.pitch;
        finalVolume = physioMod.volume;
        breathingPattern = physioMod.breathing;
      }
      
      // 应用细粒度倍数调整
      if (rateMultiplier !== 1.0) {
        const rateVal = parsePercentage(finalRate);
        finalRate = formatPercentage(Math.round(rateVal * rateMultiplier));
      }
      if (pitchMultiplier !== 1.0) {
        const pitchVal = parseHz(finalPitch);
        finalPitch = formatHz(Math.round(pitchVal * pitchMultiplier));
      }
      if (volumeMultiplier !== 1.0) {
        const volVal = parseDb(finalVolume);
        finalVolume = formatDb(Math.round(volVal * volumeMultiplier));
      }
      
      // 自定义呼吸模式
      if (customBreathing) {
        breathingPattern = customBreathing;
      }
      
      finalParams = {
        rate: finalRate,
        pitch: finalPitch,
        volume: finalVolume,
        breathing: breathingPattern,
        prefix: emotionParam.prefix,
        suffix: emotionParam.suffix,
      };
      
      // 缓存参数
      setCachedParams(cacheKey, finalParams);
    }
    
    // 快速构建 SSML
    const parts = ['<speak>'];
    
    if (addBreathing && finalParams.prefix) {
      parts.push(finalParams.prefix);
    }
    
    if (addBreathing && finalParams.breathing !== 'none') {
      const breathingSSML = CONFIG.breathingPatterns[finalParams.breathing];
      if (breathingSSML) parts.push(breathingSSML);
    }
    
    if (addProsody) {
      parts.push(`<prosody rate="${finalParams.rate}" pitch="${finalParams.pitch}" volume="${finalParams.volume}">`);
      parts.push(escapeXML(text));
      parts.push('</prosody>');
    } else {
      parts.push(escapeXML(text));
    }
    
    if (addBreathing && finalParams.suffix) {
      parts.push(finalParams.suffix);
    }
    
    parts.push('</speak>');
    
    const ssml = parts.join('');
    const elapsed = performance.now() - startTime;
    
    console.log('[SSML] 生成成功（耗时 ' + elapsed.toFixed(2) + 'ms）:', {
      emotion,
      energy: physiologicalState?.energy,
      rate: finalParams.rate,
      pitch: finalParams.pitch,
      volume: finalParams.volume,
      breathing: finalParams.breathing,
      length: ssml.length,
      cached: !!getCachedParams(cacheKey),
    });
    
    return ssml;
  }

  /**
   * 应用生理状态修正到 SSML 参数
   */
  function applyPhysiologicalModifiers(baseParam, state) {
    const result = {
      rate: baseParam.rate,
      pitch: baseParam.pitch,
      volume: baseParam.volume,
      breathing: baseParam.breathingPattern,
    };
    
    // 精力值影响
    const energyMod = findModifier(CONFIG.physiologicalParams.energy, state.energy);
    if (energyMod) {
      result.rate = combineRateModifiers(result.rate, energyMod.rate);
      result.volume = combineVolumeModifiers(result.volume, energyMod.volume);
      result.breathing = energyMod.breathing;
    }
    
    // 压力值影响
    const stressMod = findModifier(CONFIG.physiologicalParams.stress, state.stress);
    if (stressMod) {
      result.rate = combineRateModifiers(result.rate, stressMod.rate);
      result.pitch = combinePitchModifiers(result.pitch, stressMod.pitch);
    }
    
    return result;
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
   * 组合语速修正器
   */
  function combineRateModifiers(rate1, rate2) {
    const val1 = parsePercentage(rate1);
    const val2 = parsePercentage(rate2);
    const combined = val1 + val2;
    return formatPercentage(Math.max(-50, Math.min(100, combined)));
  }

  /**
   * 组合音调修正器
   */
  function combinePitchModifiers(pitch1, pitch2) {
    const val1 = parseHz(pitch1);
    const val2 = parseHz(pitch2);
    const combined = val1 + val2;
    return formatHz(Math.max(-20, Math.min(30, combined)));
  }

  /**
   * 组合音量修正器
   */
  function combineVolumeModifiers(vol1, vol2) {
    const val1 = parseDb(vol1);
    const val2 = parseDb(vol2);
    const combined = val1 + val2;
    return formatDb(Math.max(-15, Math.min(10, combined)));
  }

  /**
   * 解析百分比
   */
  function parsePercentage(str) {
    const match = str.match(/([+-]?\d+)%/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 解析 Hz
   */
  function parseHz(str) {
    const match = str.match(/([+-]?\d+)Hz/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 解析 dB
   */
  function parseDb(str) {
    const match = str.match(/([+-]?\d+)dB/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 格式化百分比
   */
  function formatPercentage(val) {
    return (val >= 0 ? '+' : '') + val + '%';
  }

  /**
   * 格式化 Hz
   */
  function formatHz(val) {
    return (val >= 0 ? '+' : '') + val + 'Hz';
  }

  /**
   * 格式化 dB
   */
  function formatDb(val) {
    return (val >= 0 ? '+' : '') + val + 'dB';
  }

  /**
   * XML 转义
   */
  function escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 在文本中智能插入停顿
   */
  function insertSmartBreaks(text, emotion, physiologicalState) {
    // 在句子之间添加停顿
    let result = text;
    
    // 根据情绪和状态决定停顿时长
    let breakTime = 300;
    if (emotion === 'sad' || emotion === 'thinking') {
      breakTime = 600;
    }
    if (physiologicalState && physiologicalState.energy < 30) {
      breakTime += 400;
    }
    
    // 在句号、问号、感叹号后添加停顿
    result = result.replace(/([。！？])/g, `$1<break time="${breakTime}ms"/>`);
    
    // 在逗号后添加短停顿
    result = result.replace(/([，,])/g, `$1<break time="${breakTime / 2}ms"/>`);
    
    return result;
  }

  /**
   * 生成情感标记（用于调试和日志）
   */
  function generateEmotionTag(emotion, physiologicalState) {
    const tags = [emotion];
    
    if (physiologicalState) {
      if (physiologicalState.energy < 30) tags.push('疲惫');
      if (physiologicalState.stress > 70) tags.push('高压');
      if (physiologicalState.socialBattery < 30) tags.push('社交疲劳');
    }
    
    return tags.join(' + ');
  }

  /**
   * 检测是否支持 SSML
   */
  function isSSMLSupported(voiceType) {
    // Fish Audio 不支持 SSML
    if (voiceType === 'fish') return false;
    
    // Edge TTS 支持 SSML
    if (voiceType === 'edge') return true;
    
    return false;
  }

  /**
   * 从完整的回复文本中提取纯文本（移除情感标记）
   */
  function extractPlainText(text) {
    // 移除 [emotion:xxx] 标记
    let result = text.replace(/\[emotion:\w+\]/g, '').trim();
    
    // 移除动作描述
    result = result.replace(/\*[^*]+\*/g, '').trim();
    
    // 移除多余空白
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
  }

  /**
   * 优化 SSML 文本（移除冗余标记，优化性能）
   */
  function optimizeSSML(ssml) {
    // 移除连续的相同 break
    let optimized = ssml.replace(/(<break[^>]+\/>)\s*\1+/g, '$1');
    
    // 移除空 prosody
    optimized = optimized.replace(/<prosody[^>]*>\s*<\/prosody>/g, '');
    
    return optimized;
  }

  // ==================== 高级功能 ====================

  /**
   * 生成分段 SSML（用于长文本）
   */
  function generateSegmentedSSML(text, options = {}) {
    // 将长文本分成多个句子
    const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];
    
    const segments = sentences.map(sentence => {
      return generateSSML(sentence, options);
    });
    
    return segments;
  }

  /**
   * 动态调整 SSML 参数（根据对话历史）
   */
  function adjustSSMLDynamically(baseSSML, context = {}) {
    const {
      conversationLength = 0,    // 对话长度
      recentEmotion = 'idle',    // 最近的情绪
      transitionSpeed = 'normal', // 情绪转换速度
    } = context;
    
    // 长时间对话后，略微降低语速和音量（疲劳感）
    if (conversationLength > 50) {
      // 在现有 SSML 基础上再降低一些
      // 这里只是示例，实际可以更复杂的调整
      return baseSSML.replace(/rate="([^"]+)"/, (match, rate) => {
        const val = parsePercentage(rate);
        return `rate="${formatPercentage(val - 5)}"`;
      });
    }
    
    return baseSSML;
  }

  /**
   * 生成情绪转换 SSML（平滑过渡）
   */
  function generateTransitionSSML(fromEmotion, toEmotion, text) {
    // 在情绪转换时，使用过渡参数
    const fromParam = CONFIG.emotionParams[fromEmotion] || CONFIG.emotionParams.idle;
    const toParam = CONFIG.emotionParams[toEmotion] || CONFIG.emotionParams.idle;
    
    // 计算中间值
    const transitionRate = averageRates(fromParam.rate, toParam.rate);
    const transitionPitch = averagePitches(fromParam.pitch, toParam.pitch);
    const transitionVolume = averageVolumes(fromParam.volume, toParam.volume);
    
    let ssml = '<speak>';
    ssml += `<prosody rate="${transitionRate}" pitch="${transitionPitch}" volume="${transitionVolume}">`;
    ssml += escapeXML(text);
    ssml += '</prosody>';
    ssml += '</speak>';
    
    return ssml;
  }

  /**
   * 平均语速
   */
  function averageRates(rate1, rate2) {
    const val1 = parsePercentage(rate1);
    const val2 = parsePercentage(rate2);
    return formatPercentage(Math.round((val1 + val2) / 2));
  }

  /**
   * 平均音调
   */
  function averagePitches(pitch1, pitch2) {
    const val1 = parseHz(pitch1);
    const val2 = parseHz(pitch2);
    return formatHz(Math.round((val1 + val2) / 2));
  }

  /**
   * 平均音量
   */
  function averageVolumes(vol1, vol2) {
    const val1 = parseDb(vol1);
    const val2 = parseDb(vol2);
    return formatDb(Math.round((val1 + val2) / 2));
  }

  // ==================== 公开接口 ====================

  return {
    // 核心功能
    generateSSML,
    extractPlainText,
    isSSMLSupported,
    
    // 高级功能
    insertSmartBreaks,
    generateSegmentedSSML,
    adjustSSMLDynamically,
    generateTransitionSSML,
    optimizeSSML,
    
    // 工具函数
    generateEmotionTag,
    
    // 缓存管理
    clearCache,
    getCacheStats: () => ({
      size: paramCache.size,
      maxSize: CONFIG.cache.maxSize,
      enabled: CONFIG.cache.enabled,
    }),
    
    // 配置
    getConfig: () => ({ ...CONFIG }),
    
    // 版本信息
    version: CONFIG.version,
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.SSMLEmotionSystem = SSMLEmotionSystem;
  console.log('[SSML] SSML 语音情感增强系统已加载 v' + SSMLEmotionSystem.version + ' - 优化版');
  console.log('[SSML] 新增功能：参数缓存、细粒度控制、16种呼吸模式');
}
