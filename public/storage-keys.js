// =============================================
// AI Companion — 存储键统一管理
// =============================================
// 所有 localStorage key 集中定义，避免散落各处造成冲突
// 引用方式：STORAGE.CONFIG、STORAGE.MEMORY.SUMMARIES 等
// =============================================

const STORAGE = {
  // 用户配置
  CONFIG: 'ai-companion-cfg',
  
  // 记忆系统
  MEMORY: {
    SUMMARIES: 'ai-companion-summaries',
    KEY_MEMORIES: 'ai-companion-key-memory',
    MISTAKE_TRACKER: 'ai-companion-mistake-tracker',
  },
  
  // 好感度系统
  AFFECTION: 'ai-companion-affection',
  
  // 情感深度系统
  EMOTIONAL_DEPTH: 'ai-companion-emotional-depth',
  
  // AI 原则系统
  AI_PRINCIPLES: 'ai-companion-ai-principles',
  
  // 人格一致性系统
  PERSONALITY_CONSISTENCY: 'ai-companion-personality-consistency',
  
  // 防沉迷系统
  ANTI_ADDICTION: 'ai-companion-anti-addiction',
  
  // 重叠说话系统
  OVERLAP_SPEECH: 'ai-companion-overlap-speech',
  
  // 虚拟生理状态系统
  PHYSIOLOGICAL_STATE: 'ai-companion-physiological-state',
  
  // 记忆备份前缀（导入前的自动备份）
  MEMORY_BACKUP_PREFIX: 'ai-companion-backup-',
};

// 暴露到全局
if (typeof window !== 'undefined') {
  window.STORAGE = STORAGE;
}
