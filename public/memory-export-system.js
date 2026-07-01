// =============================================
// AI Companion — 记忆导出系统
// =============================================
// 数据所有权、完整导出、自由迁移
// =============================================

const MemoryExportSystem = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    appVersion: '0.3',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  };

  // ==================== 导出功能 ====================
  
  /**
   * 收集所有系统数据
   */
  function collectAllData(options = {}) {
    const {
      excludeApiKey = true,
      includeConfig = true,
      includeMemory = true,
      includeAffection = true,
      includeEmotionalDepth = true,
      includePrinciples = true,
      includePersonality = true,
      includeAntiAddiction = true,
    } = options;

    const data = {
      metadata: {
        version: CONFIG.version,
        exportDate: new Date().toISOString(),
        appVersion: CONFIG.appVersion,
        characterName: '',
        exportType: 'full',
        dataIntegrity: '',
      },
      config: null,
      memorySystem: null,
      affectionSystem: null,
      emotionalDepthSystem: null,
      aiPrinciplesSystem: null,
      personalityConsistencySystem: null,
      antiAddictionSystem: null,
    };

    // 配置数据
    if (includeConfig) {
      try {
        const config = JSON.parse(localStorage.getItem(STORAGE.CONFIG) || '{}');
        data.metadata.characterName = config.name || '未命名';
        
        // 处理 API Key
        if (excludeApiKey && config.apiKey) {
          config.apiKey = '[EXCLUDED_FOR_PRIVACY]';
        }
        
        data.config = config;
      } catch (err) {
        console.error('[Export] 读取配置失败:', err);
      }
    }

    // 记忆系统
    if (includeMemory) {
      try {
        const summaries = JSON.parse(localStorage.getItem(STORAGE.MEMORY.SUMMARIES) || '[]');
        const keyMemory = JSON.parse(localStorage.getItem(STORAGE.MEMORY.KEY_MEMORIES) || '[]');
        const mistakeTracker = JSON.parse(localStorage.getItem(STORAGE.MEMORY.MISTAKE_TRACKER) || '{}');
        
        data.memorySystem = {
          summaries,
          keyMemories: keyMemory,
          mistakeTracker,
          stats: {
            summaryCount: summaries.length,
            keyMemoryCount: keyMemory.length,
          },
        };
      } catch (err) {
        console.error('[Export] 读取记忆系统失败:', err);
      }
    }

    // 好感度系统
    if (includeAffection) {
      try {
        const affection = JSON.parse(localStorage.getItem(STORAGE.AFFECTION) || '{}');
        data.affectionSystem = affection;
      } catch (err) {
        console.error('[Export] 读取好感度系统失败:', err);
      }
    }

    // 情感深度系统
    if (includeEmotionalDepth) {
      try {
        const emotionalDepth = JSON.parse(localStorage.getItem(STORAGE.EMOTIONAL_DEPTH) || '{}');
        data.emotionalDepthSystem = emotionalDepth;
      } catch (err) {
        console.error('[Export] 读取情感深度系统失败:', err);
      }
    }

    // AI 原则系统
    if (includePrinciples) {
      try {
        const principles = JSON.parse(localStorage.getItem(STORAGE.AI_PRINCIPLES) || '{}');
        data.aiPrinciplesSystem = principles;
      } catch (err) {
        console.error('[Export] 读取 AI 原则系统失败:', err);
      }
    }

    // 人格一致性系统
    if (includePersonality) {
      try {
        const personality = JSON.parse(localStorage.getItem(STORAGE.PERSONALITY_CONSISTENCY) || '{}');
        data.personalityConsistencySystem = personality;
      } catch (err) {
        console.error('[Export] 读取人格一致性系统失败:', err);
      }
    }

    // 防沉迷系统
    if (includeAntiAddiction) {
      try {
        const antiAddiction = JSON.parse(localStorage.getItem(STORAGE.ANTI_ADDICTION) || '{}');
        data.antiAddictionSystem = antiAddiction;
      } catch (err) {
        console.error('[Export] 读取防沉迷系统失败:', err);
      }
    }

    // 生成数据完整性哈希（简化版，使用 JSON 长度）
    const dataStr = JSON.stringify(data);
    data.metadata.dataIntegrity = `length:${dataStr.length}`;

    return data;
  }

  /**
   * 生成导出摘要
   */
  function generateExportSummary(data) {
    const summary = {
      characterName: data.metadata.characterName,
      exportDate: new Date(data.metadata.exportDate).toLocaleString('zh-CN'),
      items: [],
    };

    if (data.memorySystem) {
      summary.items.push({
        name: '对话摘要',
        count: data.memorySystem.stats.summaryCount,
        icon: '💬',
      });
      summary.items.push({
        name: '关键记忆',
        count: data.memorySystem.stats.keyMemoryCount,
        icon: '🎯',
      });
    }

    if (data.affectionSystem) {
      const stage = data.affectionSystem.stage || '未知';
      const level = data.affectionSystem.affectionLevel || 0;
      summary.items.push({
        name: '好感度数据',
        value: `等级 ${level} (${stage})`,
        icon: '💕',
      });
    }

    if (data.emotionalDepthSystem) {
      const level = data.emotionalDepthSystem.level || 1;
      const interactions = data.emotionalDepthSystem.interactions || 0;
      summary.items.push({
        name: '情感深度',
        value: `等级 ${level}，互动 ${interactions} 次`,
        icon: '💗',
      });
    }

    if (data.aiPrinciplesSystem) {
      const health = data.aiPrinciplesSystem.relationshipHealth || 100;
      summary.items.push({
        name: 'AI 原则',
        value: `健康度 ${health}/100`,
        icon: '⚖️',
      });
    }

    if (data.personalityConsistencySystem) {
      const milestones = data.personalityConsistencySystem.relationship?.milestones?.length || 0;
      const jokes = data.personalityConsistencySystem.relationship?.insideJokes?.length || 0;
      summary.items.push({
        name: '人格一致性',
        value: `里程碑 ${milestones} 个，内部笑话 ${jokes} 个`,
        icon: '🌸',
      });
    }

    if (data.antiAddictionSystem) {
      const weekTotal = Object.values(data.antiAddictionSystem.week || {})
        .reduce((sum, day) => sum + (day.totalMinutes || 0), 0);
      const hours = (weekTotal / 60).toFixed(1);
      summary.items.push({
        name: '使用统计',
        value: `本周 ${hours} 小时`,
        icon: '⏱️',
      });
    }

    if (data.config && !data.config.apiKey.includes('EXCLUDED')) {
      summary.items.push({
        name: '用户配置',
        value: '包含 API Key',
        icon: '⚙️',
      });
    } else if (data.config) {
      summary.items.push({
        name: '用户配置',
        value: '不包含 API Key',
        icon: '⚙️',
      });
    }

    return summary;
  }

  /**
   * 导出数据到文件
   */
  function exportToFile(options = {}) {
    try {
      console.log('[Export] 开始导出数据...');
      
      // 收集数据
      const data = collectAllData(options);
      const summary = generateExportSummary(data);
      
      // 生成 JSON
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const fileSize = (blob.size / 1024).toFixed(2);
      
      console.log('[Export] 数据已收集，文件大小:', fileSize, 'KB');
      
      // 生成文件名
      const date = new Date().toISOString().split('T')[0];
      const fileName = `ai-companion-memory-${date}.json`;
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('[Export] 导出成功:', fileName);
      
      return {
        success: true,
        fileName,
        fileSize,
        summary,
      };
    } catch (err) {
      console.error('[Export] 导出失败:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  // ==================== 导入功能 ====================
  
  /**
   * 验证导入数据
   */
  function validateImportData(data) {
    const errors = [];
    const warnings = [];
    
    // 检查必需字段
    if (!data.metadata) {
      errors.push('缺少元数据 (metadata)');
    } else {
      if (!data.metadata.version) {
        warnings.push('缺少版本信息');
      }
      if (!data.metadata.exportDate) {
        warnings.push('缺少导出日期');
      }
    }
    
    // 检查版本兼容性
    if (data.metadata && data.metadata.version !== CONFIG.version) {
      warnings.push(`版本不同（导出: ${data.metadata.version}, 当前: ${CONFIG.version}）`);
    }
    
    // 检查数据完整性
    if (data.metadata && data.metadata.dataIntegrity) {
      const expectedLength = parseInt(data.metadata.dataIntegrity.split(':')[1]);
      const actualLength = JSON.stringify(data).length;
      
      // 允许 5% 的误差（因为重新序列化可能有小差异）
      if (Math.abs(actualLength - expectedLength) / expectedLength > 0.05) {
        warnings.push('数据完整性校验失败，文件可能已损坏');
      }
    }
    
    // 检查至少有一个系统的数据
    const hasData = !![
      data.memorySystem,
      data.affectionSystem,
      data.emotionalDepthSystem,
      data.aiPrinciplesSystem,
      data.personalityConsistencySystem,
      data.antiAddictionSystem,
    ].find(d => d);
    
    if (!hasData) {
      errors.push('文件中没有可导入的数据');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 生成导入摘要
   */
  function generateImportSummary(data) {
    const summary = {
      characterName: data.metadata?.characterName || '未知',
      exportDate: data.metadata?.exportDate ? new Date(data.metadata.exportDate).toLocaleString('zh-CN') : '未知',
      items: [],
    };

    if (data.memorySystem) {
      summary.items.push({
        name: '对话摘要',
        count: data.memorySystem.summaries?.length || 0,
        icon: '💬',
      });
      summary.items.push({
        name: '关键记忆',
        count: data.memorySystem.keyMemories?.length || 0,
        icon: '🎯',
      });
    }

    if (data.affectionSystem) {
      const stage = data.affectionSystem.stage || '未知';
      const level = data.affectionSystem.affectionLevel || 0;
      summary.items.push({
        name: '好感度数据',
        value: `等级 ${level} (${stage})`,
        icon: '💕',
      });
    }

    if (data.emotionalDepthSystem) {
      const level = data.emotionalDepthSystem.level || 1;
      const interactions = data.emotionalDepthSystem.interactions || 0;
      summary.items.push({
        name: '情感深度',
        value: `等级 ${level}，互动 ${interactions} 次`,
        icon: '💗',
      });
    }

    if (data.aiPrinciplesSystem) {
      const health = data.aiPrinciplesSystem.relationshipHealth || 100;
      summary.items.push({
        name: 'AI 原则',
        value: `健康度 ${health}/100`,
        icon: '⚖️',
      });
    }

    if (data.personalityConsistencySystem) {
      const milestones = data.personalityConsistencySystem.relationship?.milestones?.length || 0;
      const jokes = data.personalityConsistencySystem.relationship?.insideJokes?.length || 0;
      summary.items.push({
        name: '人格一致性',
        value: `里程碑 ${milestones} 个，内部笑话 ${jokes} 个`,
        icon: '🌸',
      });
    }

    if (data.antiAddictionSystem) {
      const weekTotal = Object.values(data.antiAddictionSystem.week || {})
        .reduce((sum, day) => sum + (day.totalMinutes || 0), 0);
      const hours = (weekTotal / 60).toFixed(1);
      summary.items.push({
        name: '使用统计',
        value: `本周 ${hours} 小时`,
        icon: '⏱️',
      });
    }

    return summary;
  }

  /**
   * 备份当前数据
   */
  function backupCurrentData() {
    try {
      const backup = collectAllData({ excludeApiKey: false });
      const backupKey = `ai-companion-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      console.log('[Import] 当前数据已备份:', backupKey);
      return backupKey;
    } catch (err) {
      console.error('[Import] 备份失败:', err);
      return null;
    }
  }

  /**
   * 从文件导入数据
   */
  async function importFromFile(file) {
    try {
      console.log('[Import] 开始导入数据...');
      
      // 检查文件大小
      if (file.size > CONFIG.maxFileSize) {
        throw new Error(`文件太大（${(file.size / 1024 / 1024).toFixed(2)} MB），最大支持 ${CONFIG.maxFileSize / 1024 / 1024} MB`);
      }
      
      // 读取文件
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 验证数据
      const validation = validateImportData(data);
      if (!validation.valid) {
        throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
      }
      
      // 生成摘要
      const summary = generateImportSummary(data);
      
      return {
        success: true,
        data,
        summary,
        validation,
      };
    } catch (err) {
      console.error('[Import] 读取文件失败:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * 恢复数据到 LocalStorage
   */
  function restoreData(data, options = {}) {
    const {
      restoreConfig = true,
      restoreMemory = true,
      restoreAffection = true,
      restoreEmotionalDepth = true,
      restorePrinciples = true,
      restorePersonality = true,
      restoreAntiAddiction = true,
    } = options;

    try {
      console.log('[Import] 开始恢复数据...');
      
      // 备份当前数据
      const backupKey = backupCurrentData();
      
      const restored = [];
      
      // 恢复配置
      if (restoreConfig && data.config) {
        localStorage.setItem(STORAGE.CONFIG, JSON.stringify(data.config));
        restored.push('用户配置');
      }
      
      // 恢复记忆系统
      if (restoreMemory && data.memorySystem) {
        if (data.memorySystem.summaries) {
          localStorage.setItem(STORAGE.MEMORY.SUMMARIES, JSON.stringify(data.memorySystem.summaries));
        }
        if (data.memorySystem.keyMemories) {
          localStorage.setItem(STORAGE.MEMORY.KEY_MEMORIES, JSON.stringify(data.memorySystem.keyMemories));
        }
        if (data.memorySystem.mistakeTracker) {
          localStorage.setItem(STORAGE.MEMORY.MISTAKE_TRACKER, JSON.stringify(data.memorySystem.mistakeTracker));
        }
        restored.push('记忆系统');
      }
      
      // 恢复好感度系统
      if (restoreAffection && data.affectionSystem) {
        localStorage.setItem(STORAGE.AFFECTION, JSON.stringify(data.affectionSystem));
        restored.push('好感度系统');
      }
      
      // 恢复情感深度系统
      if (restoreEmotionalDepth && data.emotionalDepthSystem) {
        localStorage.setItem(STORAGE.EMOTIONAL_DEPTH, JSON.stringify(data.emotionalDepthSystem));
        restored.push('情感深度系统');
      }
      
      // 恢复 AI 原则系统
      if (restorePrinciples && data.aiPrinciplesSystem) {
        localStorage.setItem(STORAGE.AI_PRINCIPLES, JSON.stringify(data.aiPrinciplesSystem));
        restored.push('AI 原则系统');
      }
      
      // 恢复人格一致性系统
      if (restorePersonality && data.personalityConsistencySystem) {
        localStorage.setItem(STORAGE.PERSONALITY_CONSISTENCY, JSON.stringify(data.personalityConsistencySystem));
        restored.push('人格一致性系统');
      }
      
      // 恢复防沉迷系统
      if (restoreAntiAddiction && data.antiAddictionSystem) {
        localStorage.setItem(STORAGE.ANTI_ADDICTION, JSON.stringify(data.antiAddictionSystem));
        restored.push('防沉迷系统');
      }
      
      console.log('[Import] 数据恢复成功:', restored.join(', '));
      
      return {
        success: true,
        restored,
        backupKey,
      };
    } catch (err) {
      console.error('[Import] 恢复数据失败:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  // ==================== 公开接口 ====================
  return {
    exportToFile,
    importFromFile,
    restoreData,
    generateExportSummary,
    generateImportSummary,
    validateImportData,
  };
})();
