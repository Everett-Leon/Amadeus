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
        list.push({
          type: item.type || 'preference',
          content: item.content,
          createdAt: item.createdAt || new Date().toISOString(),
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

    // 注入所有关键记忆
    const keyMemories = getKeyMemory();
    if (keyMemories.length > 0) {
      const memoryLines = keyMemories.map(m => `- [${m.type}] ${m.content}`).join('\n');
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
  };
})();
