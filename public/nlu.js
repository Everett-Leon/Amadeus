// =============================================
// AI Companion — NLU 自然语言意图解析器
// =============================================
// 通过正则 + 关键词匹配识别用户输入的意图
// 为未来 3D 版本准备动作数据结构，2D 版本做占位展示
// =============================================

const NLU = (() => {
  'use strict';

  // ==================== 意图类型定义 ====================
  const INTENTS = {
    // 情绪类
    SHOW_EMOTION: 'show_emotion',       // "给我笑一个"、"我想看你难过的样子"

    // 动作类（为未来 3D 版本准备的数据结构）
    ACTION_SEQUENCE: 'action_sequence',  // "给我翻书讲个故事"、"给我唱首歌"
    SING: 'sing',                       // "唱首歌"
    DANCE: 'dance',                     // "跳个舞"
    WALK_AWAY: 'walk_away',             // "走开一下"
    COME_BACK: 'come_back',             // "回来"

    // 信息类
    ASK_ABOUT_MEMORY: 'ask_memory',     // "我们上次聊了什么"、"你还记得吗"
    TELL_STORY: 'tell_story',          // "给我讲个故事"

    // 通用
    CHITCHAT: 'chitchat',              // 普通聊天（无法识别为以上任何类型时）
  };

  // ==================== 情绪关键词映射 ====================
  const EMOTION_KEYWORDS = {
    happy: { keywords: ['笑一个', '笑一下', '开心', '高兴', '嘻嘻', '哈哈', 'happy'], emotion: 'happy' },
    shy: { keywords: ['害羞', '脸红', '羞涩', '不好意思', 'shy'], emotion: 'shy' },
    sad: { keywords: ['难过', '伤心', '哭', 'sad', '忧伤', '悲伤', '难过的样子'], emotion: 'sad' },
    angry: { keywords: ['生气', '愤怒', '哼', 'angry', '生气的样子'], emotion: 'angry' },
    surprised: { keywords: ['惊讶', '吃惊', 'surprised', '吓一跳', '惊讶的样子'], emotion: 'surprised' },
    thinking: { keywords: ['思考', '想一想', '想想', 'thinking', '思考的样子'], emotion: 'thinking' },
    embarrassed: { keywords: ['尴尬', 'embarrassed', '尴尬的样子'], emotion: 'embarrassed' },
  };

  // ==================== 动作关键词规则 ====================
  const ACTION_RULES = [
    {
      intent: INTENTS.SING,
      patterns: [/唱(首?)(歌|曲)/, /来(首?)(歌|曲)/, /唱歌/, /哼(首)?歌/],
      params: { action: 'sing', subAction: null, emotion: 'happy' },
      confidence: 0.85,
      description: '(🎵 她清了清嗓子…)',
    },
    {
      intent: INTENTS.DANCE,
      patterns: [/跳(个?)(舞|一支舞)/, /跳舞/, /跳一段/],
      params: { action: 'dance', subAction: null, emotion: 'happy' },
      confidence: 0.85,
      description: '(💃 她轻盈地转了个圈…)',
    },
    {
      intent: INTENTS.WALK_AWAY,
      patterns: [/走开/, /离开一下/, /出去一下/, /回避/],
      params: { action: 'walk_away', subAction: null, emotion: 'shy' },
      confidence: 0.8,
      description: '(🚶 她轻轻走开了…)',
    },
    {
      intent: INTENTS.COME_BACK,
      patterns: [/回来/, /过来/, /回到我身边/],
      params: { action: 'come_back', subAction: null, emotion: 'idle' },
      confidence: 0.8,
      description: '(🚶 她走了回来…)',
    },
    {
      intent: INTENTS.ACTION_SEQUENCE,
      patterns: [/翻书/, /(拿|打开)书/, /(读|讲)(个?)故事/, /讲故事/],
      params: { action: 'read_book', subAction: 'tell_story', emotion: 'thinking' },
      confidence: 0.85,
      description: '(📖 她翻开了一本书…)',
    },
    {
      intent: INTENTS.TELL_STORY,
      patterns: [/讲(个?)(故事|童话|笑话|段子)/, /说(个?)(故事|童话|笑话|段子)/, /给我讲/],
      params: { action: 'tell_story', subAction: null, emotion: 'thinking' },
      confidence: 0.85,
      description: null, // 不显示占位文字，通过 system prompt 修饰
    },
  ];

  // ==================== 记忆查询规则 ====================
  const MEMORY_RULES = [
    {
      intent: INTENTS.ASK_ABOUT_MEMORY,
      patterns: [
        /我们(上次|之前|昨天|前天)(聊了什么|说了什么|谈论了什么)/,
        /你还记得吗/,
        /记得我(之前|上次|曾经)(说过|讲过|提过|聊过)/,
        /你(还|不)记得/,
        /上次.*?(聊|说|谈|讲)/,
        /之前的对话/,
        /记忆/,
      ],
      confidence: 0.8,
    },
  ];

  // ==================== 核心解析函数 ====================

  /**
   * 解析用户输入的自然语言，返回结构化意图
   * @param {string} text - 用户原始输入
   * @returns {Object} 意图对象 { intent, confidence, params, rawText }
   */
  function parse(text) {
    if (!text || typeof text !== 'string') {
      return { intent: INTENTS.CHITCHAT, confidence: 0.1, params: {}, rawText: text || '' };
    }

    const trimmed = text.trim();

    // 优先级 1：情绪展示意图（"给我笑一个"、"看你不开心的样子"等）
    for (const [emotionId, rule] of Object.entries(EMOTION_KEYWORDS)) {
      // 匹配模式："给我XX的样子"、"看/让我看XX"、"给我XX"
      const showPatterns = [
        new RegExp(`(给我|让我|看|表演).*?(${rule.keywords.join('|')})`, 'i'),
        new RegExp(`(${rule.keywords.join('|')}).*?(一下|一个|的样子|看看|给我|表演)`, 'i'),
      ];
      for (const p of showPatterns) {
        if (p.test(trimmed)) {
          return {
            intent: INTENTS.SHOW_EMOTION,
            confidence: 0.9,
            params: { emotion: rule.emotion, trigger: 'explicit_request' },
            rawText: trimmed,
          };
        }
      }
    }

    // 优先级 2：记忆查询意图
    for (const rule of MEMORY_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          return {
            intent: INTENTS.ASK_ABOUT_MEMORY,
            confidence: rule.confidence,
            params: { query: trimmed },
            rawText: trimmed,
          };
        }
      }
    }

    // 优先级 3：动作指令
    for (const rule of ACTION_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          return {
            intent: rule.intent,
            confidence: rule.confidence,
            params: { ...rule.params },
            rawText: trimmed,
            _description: rule.description, // 内部用，2D 占位描述
          };
        }
      }
    }

    // 兜底：普通聊天
    return {
      intent: INTENTS.CHITCHAT,
      confidence: 0.5,
      params: {},
      rawText: trimmed,
    };
  }

  /**
   * 获取动作意图的占位描述文字（用于 2D 版本的 UI 展示）
   * @param {Object} intentObj - parse() 返回的对象
   * @returns {string|null} 描述文字，无占位返回 null
   */
  function getActionDescription(intentObj) {
    if (!intentObj) return null;
    // 从 ACTION_RULES 中查找对应的 description
    for (const rule of ACTION_RULES) {
      if (rule.intent === intentObj.intent && rule.description) {
        return rule.description;
      }
    }
    return null;
  }

  /**
   * 判断是否为特殊意图（非普通聊天）
   * @param {string} intent - 意图类型字符串
   * @returns {boolean}
   */
  function isSpecialIntent(intent) {
    return intent !== INTENTS.CHITCHAT;
  }

  /**
   * 构建故事讲述的 system prompt 修饰
   * @returns {string}
   */
  function getStoryPromptModifier() {
    return '\n\n【当前任务】请给用户讲一个有趣的故事。要求：情节生动、语言口语化、适当加入互动感（比如问用户"你想知道后来怎么样了吗？"）。故事长度控制在 5-8 句话左右。';
  }

  // ==================== 公开接口 ====================
  return {
    INTENTS,
    parse,
    getActionDescription,
    isSpecialIntent,
    getStoryPromptModifier,
  };
})();
