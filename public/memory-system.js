// =============================================
// AI Companion — 跨会话记忆系统（三层架构）
// =============================================
// 短期记忆：最近 N 条对话作为 context
// 摘要记忆：每次通话结束自动生成摘要，下次通话注入 system prompt
// 关键记忆：永久性关键信息提取（喜好、事件、承诺等）
// =============================================

const MemorySystem = (() => {
  'use strict';

  // ==================== 默认配置 ====================
  const DEFAULTS = {
    shortTermLimit: 50,      // 短期记忆条数上限
    summaryLimit: 5,         // 注入 system prompt 的摘要数量
    summariesKey: 'ai-companion-summaries',
    keyMemoryKey: 'ai-companion-key-memory',
  };

  // ==================== localStorage 操作 ====================

  /** 获取摘要列表 */
  function getSummaries() {
    try {
      const raw = localStorage.getItem(DEFAULTS.summariesKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** 追加一条摘要 */
  function addSummary(summary) {
    const list = getSummaries();
    list.push({
      date: new Date().toISOString().slice(0, 10),
      summary: summary,
      createdAt: new Date().toISOString(),
      // 新增字段
      weight: 50,
      importance: 'medium',
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
      decayRate: 0.05,
      isPermanent: false,
    });
    try { localStorage.setItem(DEFAULTS.summariesKey, JSON.stringify(list)); } catch {}
    return list;
  }

  /** 清空所有摘要 */
  function clearSummaries() {
    try { localStorage.removeItem(DEFAULTS.summariesKey); } catch {}
  }

  /** 获取最近 K 条摘要 */
  function getRecentSummaries(k = DEFAULTS.summaryLimit) {
    const list = getSummaries();
    return list.slice(-k);
  }

  /** 获取关键记忆列表 */
  function getKeyMemory() {
    try {
      const raw = localStorage.getItem(DEFAULTS.keyMemoryKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** 追加关键记忆（去重） */
  function addKeyMemories(items) {
    if (!Array.isArray(items)) items = [items];
    const list = getKeyMemory();
    for (const item of items) {
      // 基于内容做简单去重，避免重复记录相同信息
      const exists = list.some(m => m.content === item.content);
      if (!exists) {
        // 自动判断重要性和情感强度
        const importance = item.importance || detectImportance(item.content, item.emotionType);
        const emotionIntensity = item.emotionIntensity || detectEmotionIntensity(item.content, item.emotionType);
        const decayRate = getDecayRate(importance);
        const initialWeight = getInitialWeight(importance);
        
        list.push({
          type: item.type || 'preference',
          content: item.content,
          createdAt: item.createdAt || new Date().toISOString(),
          // 衰减与强化字段
          weight: initialWeight,
          importance: importance,
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          decayRate: decayRate,
          isPermanent: importance === 'critical',
          // 情感记忆字段
          emotionIntensity: emotionIntensity,
          emotionType: item.emotionType || 'idle',
          // 记忆不完美字段
          fuzzyLevel: 100 - initialWeight,
          correctedCount: 0,
          mistakeHistory: [],
        });
      }
    }
    try { localStorage.setItem(DEFAULTS.keyMemoryKey, JSON.stringify(list)); } catch {}
    return list;
  }

  /** 删除单条关键记忆 */
  function removeKeyMemory(index) {
    const list = getKeyMemory();
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      try { localStorage.setItem(DEFAULTS.keyMemoryKey, JSON.stringify(list)); } catch {}
    }
    return list;
  }

  /** 清空所有关键记忆 */
  function clearKeyMemory() {
    try { localStorage.removeItem(DEFAULTS.keyMemoryKey); } catch {}
  }

  // ==================== LLM 辅助调用 ====================

  /**
   * 通过 /api/chat 接口调用 LLM 执行特殊任务
   * @param {string} promptText - 发给 LLM 的完整提示
   * @param {object} apiConfig - { apiUrl, apiKey, model }
   * @returns {Promise<string>} LLM 回复文本
   */
  async function callLLM(promptText, apiConfig) {
    if (!apiConfig.apiUrl || !apiConfig.apiKey || !apiConfig.model) {
      throw new Error('API 配置不完整');
    }
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl: apiConfig.apiUrl,
        apiKey: apiConfig.apiKey,
        model: apiConfig.model,
        messages: [{ role: 'user', content: promptText }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // ==================== 核心功能 ====================

  /**
   * 从当前对话历史生成摘要
   * @param {Array} history - 对话历史数组 [{role, content}]
   * @param {object} apiConfig - API 配置
   * @returns {Promise<string|null>} 摘要文本，失败返回 null
   */
  async function generateSummary(history, apiConfig) {
    try {
      // 过滤出用户和助手的实际对话内容
      const dialogue = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.replace(/\[.*?\]/g, '').trim()}`)
        .join('\n');

      if (!dialogue.trim()) return null;

      const prompt = `请用一句话概括以下对话的主要内容（只输出摘要，不要其他文字）：

${dialogue}`;

      const result = await callLLM(prompt, apiConfig);
      const cleanSummary = result.trim().slice(0, 200); // 限制长度

      if (cleanSummary) {
        addSummary(cleanSummary);
      }
      return cleanSummary;
    } catch (err) {
      console.warn('[Memory] 摘要生成失败:', err.message);
      return null;
    }
  }

  /**
   * 从对话中提取关键信息（偏好、事件、承诺）
   * @param {Array} history - 对话历史数组
   * @param {object} apiConfig - API 配置
   * @returns {Promise<Array|null>} 提取的关键记忆数组，失败返回 null
   */
  async function extractKeyMemories(history, apiConfig) {
    try {
      const dialogue = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.replace(/\[.*?\]/g, '').trim()}`)
        .join('\n');

      if (!dialogue.trim()) return null;

      const prompt = `分析以下对话，提取其中的关键信息。以 JSON 数组格式输出，每个元素包含 type 和 content 字段：
- type 可选值: "preference"（用户偏好/喜好）、"event"（重要事件）、"promise"（承诺/约定）、"fact"（事实信息）
- content 是具体内容描述

只输出 JSON 数组，不要其他文字。

${dialogue}`;

      const result = await callLLM(prompt, apiConfig);

      // 尝试从回复中解析 JSON 数组
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        if (Array.isArray(items) && items.length > 0) {
          addKeyMemories(items);
          return items;
        }
      }
      return null;
    } catch (err) {
      console.warn('[Memory] 关键记忆提取失败:', err.message);
      return null;
    }
  }

  /**
   * 构建记忆上下文文本，用于注入 system prompt
   * @returns {string} 格式化的记忆文本
   */
  function buildMemoryContext() {
    const parts = [];

    // 注入最近 K 条摘要
    const recentSummaries = getRecentSummaries(DEFAULTS.summaryLimit);
    if (recentSummaries.length > 0) {
      const summaryLines = recentSummaries.map(s => `- [${s.date}] ${s.summary}`).join('\n');
      parts.push(`【过去的对话回忆】\n${summaryLines}`);
    }

    // 注入所有关键记忆（按权重排序，显示权重信息）
    const keyMemories = getKeyMemory();
    if (keyMemories.length > 0) {
      // 先应用衰减
      const decayedMemories = keyMemories.map(m => ({
        ...m,
        weight: applyDecay(m),
      }));
      
      // 按权重排序（高权重在前）
      decayedMemories.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      
      const memoryLines = decayedMemories.map(m => {
        const weight = Math.round(m.weight || 50);
        const importanceLabel = {
          critical: '🔥永久',
          high: '⭐重要',
          medium: '📌普通',
          low: '💭淡忘',
        }[m.importance] || '📌';
        
        // 根据权重添加记忆清晰度提示
        let clarityHint = '';
        if (weight < 30) clarityHint = '（记得不太清楚）';
        else if (weight < 50) clarityHint = '（可能记混细节）';
        
        return `- [${importanceLabel}|权重${weight}] ${m.content}${clarityHint}`;
      }).join('\n');
      
      parts.push(`【关于用户的重要记忆】\n${memoryLines}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : '';
  }

  /**
   * 搜索与关键词相关的记忆内容
   * @param {string} query - 搜索关键词
   * @returns {Array} 匹配的记忆项
   */
  function searchMemories(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    // 搜索摘要
    const summaries = getSummaries();
    summaries.forEach((s, i) => {
      if (s.summary.toLowerCase().includes(q)) {
        results.push({ source: 'summary', index: i, date: s.date, text: s.summary });
      }
    });

    // 搜索关键记忆
    const keyMemories = getKeyMemory();
    keyMemories.forEach((m, i) => {
      if (m.content.toLowerCase().includes(q)) {
        results.push({ source: 'key_memory', index: i, type: m.type, text: m.content, createdAt: m.createdAt });
      }
    });

    return results;
  }

  // ==================== 统计信息 ====================
  function getStats() {
    return {
      summaryCount: getSummaries().length,
      keyMemoryCount: getKeyMemory().length,
    };
  }

  // ==================== 记忆衰减与强化机制 ====================

  /**
   * 获取衰减速率
   * @param {string} importance - 重要性等级
   * @returns {number} 衰减速率
   */
  function getDecayRate(importance) {
    const rates = {
      critical: 0,      // 不衰减
      high: 0.01,       // 100天后衰减到 37%
      medium: 0.05,     // 20天后衰减到 37%
      low: 0.15,        // 7天后衰减到 37%
    };
    return rates[importance] || 0.05;
  }

  /**
   * 获取初始权重
   * @param {string} importance - 重要性等级
   * @returns {number} 初始权重
   */
  function getInitialWeight(importance) {
    const weights = {
      critical: 100,
      high: 80,
      medium: 50,
      low: 30,
    };
    return weights[importance] || 50;
  }

  /**
   * 计算距离某个日期的天数
   * @param {string} dateStr - ISO 日期字符串
   * @returns {number} 天数
   */
  function getDaysSince(dateStr) {
    // 注：new Date(非法字符串) 不会抛异常，只会得到 Invalid Date，
    // 后续用它做减法会得到 NaN——try/catch 完全拦不住这种情况，
    // 必须显式判断 isNaN(past.getTime())，否则 applyDecay() 会算出 NaN 权重。
    try {
      const past = new Date(dateStr);
      if (isNaN(past.getTime())) return 0;
      const now = new Date();
      const diff = now - past;
      return Math.max(0, diff / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  /**
   * 计算记忆衰减
   * @param {Object} memory - 记忆对象
   * @returns {number} 衰减后的权重
   */
  function applyDecay(memory) {
    // 永久记忆不衰减
    if (memory.isPermanent) return memory.weight || 100;
    
    // 计算距离上次访问的天数
    const daysPassed = getDaysSince(memory.lastAccessed || memory.createdAt);
    
    // 指数衰减公式
    const currentWeight = memory.weight || 50;
    const decayRate = memory.decayRate || 0.05;
    const newWeight = currentWeight * Math.exp(-decayRate * daysPassed);
    
    return Math.max(0, newWeight);
  }

  /**
   * 强化记忆
   * @param {Object} memory - 记忆对象
   * @param {string} reason - 强化原因：access/repeat/emotion/correction
   * @returns {Object} 强化后的记忆
   */
  function reinforceMemory(memory, reason = 'access') {
    const bonuses = {
      access: 10,           // 普通访问
      repeat: 15,           // 重复提及
      emotion: 20,          // 情感共鸣
      correction: 25,       // 用户纠正
    };
    
    const bonus = bonuses[reason] || 10;
    
    // 增加权重
    memory.weight = Math.min(100, (memory.weight || 50) + bonus);
    
    // 更新访问信息
    memory.accessCount = (memory.accessCount || 0) + 1;
    memory.lastAccessed = new Date().toISOString();
    
    // 更新模糊度
    memory.fuzzyLevel = 100 - memory.weight;
    
    // 访问次数多时升级重要性
    if (memory.accessCount >= 3 && memory.importance === 'medium') {
      memory.importance = 'high';
      memory.decayRate = getDecayRate('high');
    }
    
    // 检查是否应标记为永久
    if (shouldBePermanent(memory)) {
      memory.isPermanent = true;
      memory.weight = 100;
    }
    
    return memory;
  }

  /**
   * 判断是否应标记为永久记忆
   * @param {Object} memory - 记忆对象
   * @returns {boolean}
   */
  function shouldBePermanent(memory) {
    return (
      memory.importance === 'critical' ||
      (memory.importance === 'high' && (memory.accessCount || 0) >= 5) ||
      (memory.emotionIntensity || 0) >= 9
    );
  }

  /**
   * 批量应用衰减并清理低权重记忆
   * @param {Array} memories - 记忆数组
   * @returns {Array} 处理后的记忆数组
   */
  function batchApplyDecay(memories) {
    return memories
      .map(m => ({
        ...m,
        weight: applyDecay(m),
        fuzzyLevel: 100 - applyDecay(m),
      }))
      .filter(m => m.weight >= 10 || m.isPermanent); // 清理低权重记忆
  }

  /**
   * 自动判断记忆重要性
   * @param {string} text - 对话文本
   * @param {string} emotion - 情感类型
   * @returns {string} 重要性等级：critical/high/medium/low
   */
  function detectImportance(text, emotion = 'idle') {
    // Critical 关键词（永久记忆）
    const criticalKeywords = [
      '第一次', '初次', '我喜欢你', '我爱你', '在一起',
      '生日', '纪念日', '保证', '发誓', '一定会',
      '考上大学', '找到工作', '搬家', '结婚', '离职'
    ];
    
    // High 关键词（重要记忆）
    const highKeywords = [
      '喜欢', '讨厌', '最爱', '最讨厌',
      '考试', '面试', '旅行', '约好', '下次一起',
      '我妈妈', '我爸爸', '我朋友', '我同事', '我家人'
    ];
    
    // 检查关键词
    if (criticalKeywords.some(k => text.includes(k))) {
      return 'critical';
    }
    if (highKeywords.some(k => text.includes(k))) {
      return 'high';
    }
    
    // 根据情感强度判断
    if (['happy', 'surprised', 'sad'].includes(emotion)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * 检测情感强度
   * @param {string} text - 对话文本
   * @param {string} emotion - 情感类型
   * @returns {number} 情感强度（0-10）
   */
  function detectEmotionIntensity(text, emotion = 'idle') {
    // 根据情感类型设置基础强度
    const emotionBase = {
      happy: 6,
      surprised: 7,
      shy: 6,
      sad: 7,
      angry: 6,
      embarrassed: 5,
      thinking: 4,
      idle: 3,
    };
    let intensity = emotionBase[emotion] || 5;
    
    // 根据关键词调整
    if (text.includes('我爱你') || text.includes('我喜欢你')) intensity = 10;
    if (text.includes('第一次') || text.includes('初次')) intensity = 9;
    if (text.includes('永远') || text.includes('一直')) intensity = Math.min(10, intensity + 2);
    if (text.includes('！') || text.includes('...')) intensity = Math.min(10, intensity + 1);
    
    return intensity;
  }

  // ==================== 记忆不完美机制 ====================

  // 全局记错计数器
  const mistakeTracker = {
    lastMistakeTime: null,
    mistakeCount: 0,
    maxMistakesPerSession: 3,  // 每次通话最多记错3次
    minIntervalMinutes: 5,      // 两次记错至少间隔5分钟
  };

  /**
   * 判断是否可以记错（全局频率控制）
   * @returns {boolean}
   */
  function canMakeMistakeGlobally() {
    const now = Date.now();
    
    // 检查是否超过最大次数
    if (mistakeTracker.mistakeCount >= mistakeTracker.maxMistakesPerSession) {
      return false;
    }
    
    // 检查时间间隔
    if (mistakeTracker.lastMistakeTime) {
      const elapsed = (now - mistakeTracker.lastMistakeTime) / 1000 / 60;
      if (elapsed < mistakeTracker.minIntervalMinutes) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 记录一次记错
   */
  function recordMistake() {
    mistakeTracker.lastMistakeTime = Date.now();
    mistakeTracker.mistakeCount++;
  }

  /**
   * 重置记错计数器（新通话开始时调用）
   */
  function resetMistakeTracker() {
    mistakeTracker.lastMistakeTime = null;
    mistakeTracker.mistakeCount = 0;
  }

  /**
   * 判断是否应该记错
   * @param {Object} memory - 记忆对象
   * @returns {boolean}
   */
  function shouldMakeMistake(memory) {
    // 永久记忆的核心内容不会记错
    if (memory.isPermanent && memory.type === 'event') {
      return false;
    }
    
    // 计算模糊度
    const fuzzyLevel = memory.fuzzyLevel || (100 - (memory.weight || 50));
    
    // 根据模糊度计算记错概率
    let probability = 0;
    if (fuzzyLevel >= 70) probability = 0.4;
    else if (fuzzyLevel >= 50) probability = 0.2;
    else if (fuzzyLevel >= 30) probability = 0.1;
    else probability = 0.02;
    
    // 如果之前被纠正过，降低记错概率
    if ((memory.correctedCount || 0) > 0) {
      probability *= 0.5;
    }
    
    // 检查全局记错频率限制
    if (!canMakeMistakeGlobally()) {
      return false;
    }
    
    return Math.random() < probability;
  }

  /**
   * 检测用户是否在纠正 AI
   * @param {string} userMessage - 用户消息
   * @returns {boolean}
   */
  function detectCorrection(userMessage) {
    const correctionKeywords = [
      '不是', '不对', '错了', '是...啦', '是...呀',
      '应该是', '其实是', '记错了'
    ];
    
    return correctionKeywords.some(k => userMessage.includes(k));
  }

  /**
   * 处理用户纠正
   * @param {Object} memory - 记忆对象
   * @param {string} correctInfo - 正确信息
   * @returns {Object} 更新后的记忆
   */
  function handleCorrection(memory, correctInfo) {
    // 更新记忆内容
    const oldContent = memory.content;
    memory.content = correctInfo;
    
    // 记录纠正历史
    if (!memory.mistakeHistory) memory.mistakeHistory = [];
    memory.mistakeHistory.push({
      date: new Date().toISOString(),
      wrongContent: oldContent,
      correctContent: correctInfo,
    });
    
    // 大幅强化权重
    memory = reinforceMemory(memory, 'correction');
    
    // 记录纠正次数
    memory.correctedCount = (memory.correctedCount || 0) + 1;
    
    // 如果被纠正2次以上，升级重要性
    if (memory.correctedCount >= 2 && memory.importance !== 'critical') {
      memory.importance = 'high';
      memory.decayRate = getDecayRate('high');
    }
    
    return memory;
  }

  /**
   * 获取记错提示信息（用于 System Prompt）
   * @returns {string}
   */
  function getMistakeHint() {
    const remaining = mistakeTracker.maxMistakesPerSession - mistakeTracker.mistakeCount;
    if (remaining <= 0) {
      return '【记忆提示】本次通话已记错多次，请尽量准确回忆。';
    }
    return '';
  }

  // ==================== 记忆搜索与标签 ====================

  /**
   * 自动标签分类
   * @param {Object} memory - 记忆对象
   * @returns {Array} 标签数组
   */
  function autoTagMemory(memory) {
    const tags = [];
    const content = memory.content.toLowerCase();
    
    // 事件类型
    if (content.includes('第一次') || content.includes('初次')) tags.push('第一次');
    if (content.includes('生日') || content.includes('纪念日')) tags.push('特殊日期');
    if (content.includes('考试') || content.includes('面试')) tags.push('重要事件');
    if (content.includes('旅行') || content.includes('出游')) tags.push('旅行');
    
    // 人物类型
    if (content.includes('妈妈') || content.includes('母亲')) tags.push('家人');
    if (content.includes('爸爸') || content.includes('父亲')) tags.push('家人');
    if (content.includes('朋友') || content.includes('同学')) tags.push('朋友');
    if (content.includes('同事') || content.includes('老板')) tags.push('工作');
    
    // 地点类型
    if (content.includes('学校') || content.includes('大学')) tags.push('学校');
    if (content.includes('公司') || content.includes('办公室')) tags.push('工作');
    if (content.includes('家') || content.includes('住')) tags.push('家');
    
    // 情感类型
    if (content.includes('开心') || content.includes('高兴')) tags.push('积极情感');
    if (content.includes('难过') || content.includes('伤心')) tags.push('消极情感');
    if (content.includes('喜欢') || content.includes('爱')) tags.push('喜好');
    if (content.includes('讨厌') || content.includes('不喜欢')) tags.push('厌恶');
    
    // 承诺类型
    if (content.includes('约定') || content.includes('保证') || content.includes('答应')) tags.push('承诺');
    
    // 根据 type 添加标签
    if (memory.type === 'preference') tags.push('偏好');
    if (memory.type === 'event') tags.push('事件');
    if (memory.type === 'promise') tags.push('承诺');
    if (memory.type === 'fact') tags.push('事实');
    
    // 根据重要性添加标签
    if (memory.importance === 'critical') tags.push('永久记忆');
    if (memory.importance === 'high') tags.push('重要');
    
    return [...new Set(tags)]; // 去重
  }

  /**
   * 搜索记忆（支持关键词和标签）
   * @param {string} query - 搜索关键词
   * @param {Array} tags - 筛选标签（可选）
   * @returns {Array} 搜索结果
   */
  function searchMemoriesAdvanced(query = '', tags = []) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // 搜索关键记忆
    const keyMemories = getKeyMemory();
    keyMemories.forEach((memory, index) => {
      // 自动标签
      const autoTags = autoTagMemory(memory);
      memory.tags = autoTags;
      
      // 关键词匹配
      const matchQuery = !query || memory.content.toLowerCase().includes(lowerQuery);
      
      // 标签匹配
      const matchTags = tags.length === 0 || tags.some(tag => autoTags.includes(tag));
      
      if (matchQuery && matchTags) {
        results.push({
          source: 'key_memory',
          index,
          type: memory.type,
          content: memory.content,
          tags: autoTags,
          weight: memory.weight || 50,
          importance: memory.importance || 'medium',
          createdAt: memory.createdAt,
          accessCount: memory.accessCount || 0,
        });
      }
    });
    
    // 搜索摘要
    if (tags.length === 0) {  // 摘要不参与标签筛选
      const summaries = getSummaries();
      summaries.forEach((summary, index) => {
        if (!query || summary.summary.toLowerCase().includes(lowerQuery)) {
          results.push({
            source: 'summary',
            index,
            content: summary.summary,
            date: summary.date,
            createdAt: summary.createdAt,
          });
        }
      });
    }
    
    // 按权重和时间排序
    results.sort((a, b) => {
      if (a.source === 'key_memory' && b.source === 'key_memory') {
        return (b.weight || 0) - (a.weight || 0);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return results;
  }

  /**
   * 获取所有标签及其计数
   * @returns {Object} 标签统计
   */
  function getAllTags() {
    const tagCounts = {};
    
    const keyMemories = getKeyMemory();
    keyMemories.forEach(memory => {
      const tags = autoTagMemory(memory);
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return tagCounts;
  }

  /**
   * 记忆时间线可视化数据
   * @returns {Array} 时间线数据
   */
  function getMemoryTimeline() {
    const keyMemories = getKeyMemory();
    
    // 按创建时间排序
    const sorted = [...keyMemories].sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // 构建时间线
    const timeline = sorted.map(memory => ({
      date: new Date(memory.createdAt).toLocaleDateString('zh-CN'),
      content: memory.content,
      type: memory.type,
      importance: memory.importance,
      tags: autoTagMemory(memory),
      weight: memory.weight || 50,
    }));
    
    return timeline;
  }

  /**
   * 记忆关联分析
   * @param {number} memoryIndex - 记忆索引
   * @returns {Array} 关联的记忆列表
   */
  function findRelatedMemories(memoryIndex) {
    const keyMemories = getKeyMemory();
    if (memoryIndex < 0 || memoryIndex >= keyMemories.length) {
      return [];
    }
    
    const targetMemory = keyMemories[memoryIndex];
    const targetTags = autoTagMemory(targetMemory);
    const targetWords = targetMemory.content.toLowerCase().split(/\s+/);
    
    const related = [];
    
    keyMemories.forEach((memory, index) => {
      if (index === memoryIndex) return;  // 跳过自己
      
      const memoryTags = autoTagMemory(memory);
      const memoryWords = memory.content.toLowerCase().split(/\s+/);
      
      // 计算相似度
      let similarity = 0;
      
      // 标签重叠度（权重 60%）
      const commonTags = targetTags.filter(tag => memoryTags.includes(tag));
      similarity += (commonTags.length / Math.max(targetTags.length, 1)) * 0.6;
      
      // 关键词重叠度（权重 40%）
      const commonWords = targetWords.filter(word => memoryWords.includes(word) && word.length > 1);
      similarity += (commonWords.length / Math.max(targetWords.length, 1)) * 0.4;
      
      if (similarity > 0.2) {  // 相似度阈值
        related.push({
          index,
          memory,
          similarity,
          commonTags,
        });
      }
    });
    
    // 按相似度排序
    related.sort((a, b) => b.similarity - a.similarity);
    
    return related.slice(0, 5);  // 返回最相关的 5 条
  }

  // ==================== 公开接口 ====================
  return {
    DEFAULTS,

    // 摘要操作
    getSummaries,
    addSummary,
    clearSummaries,
    getRecentSummaries,

    // 关键记忆操作
    getKeyMemory,
    addKeyMemories,
    removeKeyMemory,
    clearKeyMemory,

    // 核心功能
    generateSummary,
    extractKeyMemories,
    buildMemoryContext,
    searchMemories,
    callLLM,

    // 统计
    getStats,

    // 衰减与强化
    applyDecay,
    reinforceMemory,
    batchApplyDecay,
    shouldBePermanent,
    detectImportance,
    detectEmotionIntensity,
    getDecayRate,
    getInitialWeight,
    getDaysSince,

    // 记忆不完美
    shouldMakeMistake,
    detectCorrection,
    handleCorrection,
    canMakeMistakeGlobally,
    recordMistake,
    resetMistakeTracker,
    getMistakeHint,
    
    // 记忆搜索与标签（新增）
    autoTagMemory,
    searchMemoriesAdvanced,
    getAllTags,
    getMemoryTimeline,
    findRelatedMemories,
  };
})();
