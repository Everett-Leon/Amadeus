// =============================================
// AI Companion — 重叠说话视觉增强系统
// =============================================
// 为重叠说话系统添加视觉反馈、统计图表和实时指示
// =============================================

const OverlapSpeechVisual = (() => {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    version: '1.0',
    
    // 视觉反馈
    feedback: {
      showRipple: true,              // 打断时显示波纹效果
      showIndicator: true,           // 显示状态指示器
      showToast: true,               // 显示打断提示
      showCounter: true,             // 显示打断计数器
      animationDuration: 600,        // 动画持续时间（ms）
    },
    
    // 颜色主题
    colors: {
      aiSpeaking: '#4ade80',         // AI 说话指示器颜色
      userInterrupt: '#ff6b9d',      // 用户打断颜色
      aiInterrupt: '#fbbf24',        // AI 打断颜色
      speech: '#60a5fa',             // 语音打断
      typing: '#a78bfa',             // 打字打断
      mic: '#f472b6',                // 麦克风打断
    },
  };

  // ==================== 状态管理 ====================
  let state = {
    initialized: false,
    indicators: {
      aiSpeaking: null,
      userInterrupt: null,
    },
    toastTimeout: null,
  };

  // ==================== 初始化 ====================

  /**
   * 初始化视觉系统
   */
  function init() {
    if (state.initialized) return;
    
    // 创建视觉元素
    createIndicators();
    createToastContainer();
    
    // 监听重叠说话事件
    setupEventListeners();
    
    state.initialized = true;
    console.log('[OverlapVisual] 视觉增强系统已初始化 v' + CONFIG.version);
  }

  /**
   * 创建状态指示器
   */
  function createIndicators() {
    // AI 说话指示器
    const aiIndicator = document.createElement('div');
    aiIndicator.id = 'overlap-ai-indicator';
    aiIndicator.className = 'overlap-indicator overlap-indicator-ai hidden';
    aiIndicator.innerHTML = `
      <span class="overlap-indicator-icon">🎙️</span>
      <span class="overlap-indicator-text">AI 正在说话</span>
      <span class="overlap-indicator-pulse"></span>
    `;
    
    // 用户打断指示器
    const userIndicator = document.createElement('div');
    userIndicator.id = 'overlap-user-indicator';
    userIndicator.className = 'overlap-indicator overlap-indicator-user hidden';
    userIndicator.innerHTML = `
      <span class="overlap-indicator-icon">✋</span>
      <span class="overlap-indicator-text">已打断 AI</span>
    `;
    
    // 添加到场景
    const scene = document.getElementById('scene');
    if (scene) {
      scene.appendChild(aiIndicator);
      scene.appendChild(userIndicator);
    }
    
    state.indicators.aiSpeaking = aiIndicator;
    state.indicators.userInterrupt = userIndicator;
  }

  /**
   * 创建提示消息容器
   */
  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'overlap-toast-container';
    container.className = 'overlap-toast-container';
    document.body.appendChild(container);
  }

  /**
   * 设置事件监听
   */
  function setupEventListeners() {
    // 监听全局打断事件（通过 window）
    window.addEventListener('overlapAISpeakStart', onAISpeakStart);
    window.addEventListener('overlapAISpeakEnd', onAISpeakEnd);
    window.addEventListener('overlapUserInterrupt', onUserInterrupt);
    window.addEventListener('overlapAIInterrupt', onAIInterrupt);
  }

  // ==================== 事件处理 ====================

  /**
   * AI 开始说话
   */
  function onAISpeakStart(event) {
    const { text } = event.detail || {};
    
    // 显示 AI 说话指示器
    if (state.indicators.aiSpeaking) {
      state.indicators.aiSpeaking.classList.remove('hidden');
      state.indicators.aiSpeaking.classList.add('visible');
    }
    
    console.log('[OverlapVisual] 显示 AI 说话指示器');
  }

  /**
   * AI 停止说话
   */
  function onAISpeakEnd(event) {
    const { reason } = event.detail || {};
    
    // 隐藏 AI 说话指示器
    if (state.indicators.aiSpeaking) {
      state.indicators.aiSpeaking.classList.remove('visible');
      setTimeout(() => {
        state.indicators.aiSpeaking.classList.add('hidden');
      }, 300);
    }
    
    console.log('[OverlapVisual] 隐藏 AI 说话指示器');
  }

  /**
   * 用户打断 AI
   */
  function onUserInterrupt(event) {
    const { source, aiText, aiDuration } = event.detail || {};
    
    // 显示打断波纹效果
    if (CONFIG.feedback.showRipple) {
      showRippleEffect();
    }
    
    // 显示用户打断指示器
    if (state.indicators.userInterrupt) {
      // 更新图标根据来源
      const icon = getSourceIcon(source);
      const iconEl = state.indicators.userInterrupt.querySelector('.overlap-indicator-icon');
      if (iconEl) iconEl.textContent = icon;
      
      // 显示指示器
      state.indicators.userInterrupt.classList.remove('hidden');
      state.indicators.userInterrupt.classList.add('visible');
      
      // 3 秒后隐藏
      setTimeout(() => {
        state.indicators.userInterrupt.classList.remove('visible');
        setTimeout(() => {
          state.indicators.userInterrupt.classList.add('hidden');
        }, 300);
      }, 3000);
    }
    
    // 显示提示消息
    if (CONFIG.feedback.showToast) {
      const sourceName = getSourceName(source);
      showToast(`通过${sourceName}打断了 AI`, 'user');
    }
    
    console.log('[OverlapVisual] 用户打断视觉反馈已显示');
  }

  /**
   * AI 打断用户
   */
  function onAIInterrupt(event) {
    const { reason } = event.detail || {};
    
    // 显示 AI 打断提示
    if (CONFIG.feedback.showToast) {
      showToast('AI 有紧急提醒', 'ai');
    }
    
    console.log('[OverlapVisual] AI 打断视觉反馈已显示');
  }

  // ==================== 视觉效果 ====================

  /**
   * 显示波纹效果
   */
  function showRippleEffect() {
    const scene = document.getElementById('scene');
    if (!scene) return;
    
    // 创建波纹元素
    const ripple = document.createElement('div');
    ripple.className = 'overlap-ripple';
    scene.appendChild(ripple);
    
    // 动画结束后移除
    setTimeout(() => {
      ripple.remove();
    }, CONFIG.feedback.animationDuration);
  }

  /**
   * 显示提示消息
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('overlap-toast-container');
    if (!container) return;
    
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = `overlap-toast overlap-toast-${type}`;
    
    const icon = type === 'user' ? '✋' : type === 'ai' ? '⚡' : 'ℹ️';
    toast.innerHTML = `
      <span class="overlap-toast-icon">${icon}</span>
      <span class="overlap-toast-text">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // 触发动画
    setTimeout(() => toast.classList.add('visible'), 10);
    
    // 3 秒后移除
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==================== 统计面板 ====================

  /**
   * 更新设置面板中的统计数据
   */
  function updateStatisticsPanel() {
    if (typeof OverlapSpeechSystem === 'undefined') return;
    
    const stats = OverlapSpeechSystem.getStatistics();
    const pattern = OverlapSpeechSystem.analyzeInterruptionPattern();
    
    // 更新总计数
    updateElement('overlap-stats-total', stats.total);
    updateElement('overlap-stats-user', stats.userInterrupts);
    updateElement('overlap-stats-ai', stats.aiInterrupts);
    
    // 更新按来源统计
    updateElement('overlap-stats-speech', stats.userBySource.speech);
    updateElement('overlap-stats-typing', stats.userBySource.typing);
    updateElement('overlap-stats-mic', stats.userBySource.mic);
    
    // 更新 AI 打断限制
    updateElement('overlap-stats-ai-count', stats.aiCurrentCount);
    updateElement('overlap-stats-ai-limit', stats.aiCountLimit);
    
    // 更新模式分析
    if (pattern.hasPattern) {
      updateElement('overlap-pattern-most-used', getSourceName(pattern.mostUsedSource));
      updateElement('overlap-pattern-avg-time', Math.round(pattern.avgInterruptTime) + ' ms');
    } else {
      updateElement('overlap-pattern-most-used', '数据不足');
      updateElement('overlap-pattern-avg-time', '-');
    }
    
    // 更新图表
    updateCharts(stats);
  }

  /**
   * 更新元素内容
   */
  function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /**
   * 更新统计图表
   */
  function updateCharts(stats) {
    // 更新来源饼图
    updateSourcePieChart(stats.userBySource);
  }

  /**
   * 更新来源饼图
   */
  function updateSourcePieChart(bySource) {
    const total = bySource.speech + bySource.typing + bySource.mic;
    if (total === 0) return;
    
    const speechPercent = (bySource.speech / total) * 100;
    const typingPercent = (bySource.typing / total) * 100;
    const micPercent = (bySource.mic / total) * 100;
    
    // 更新饼图（使用 CSS conic-gradient）
    const pieChart = document.getElementById('overlap-pie-chart');
    if (pieChart) {
      const gradient = `conic-gradient(
        ${CONFIG.colors.speech} 0% ${speechPercent}%,
        ${CONFIG.colors.typing} ${speechPercent}% ${speechPercent + typingPercent}%,
        ${CONFIG.colors.mic} ${speechPercent + typingPercent}% 100%
      )`;
      pieChart.style.background = gradient;
    }
    
    // 更新百分比文本
    updateElement('overlap-pie-speech-percent', Math.round(speechPercent) + '%');
    updateElement('overlap-pie-typing-percent', Math.round(typingPercent) + '%');
    updateElement('overlap-pie-mic-percent', Math.round(micPercent) + '%');
  }

  /**
   * 更新打断历史时间线
   */
  function updateHistoryTimeline() {
    if (typeof OverlapSpeechSystem === 'undefined') return;
    
    const history = OverlapSpeechSystem.getHistory({ limit: 20 });
    const container = document.getElementById('overlap-history-timeline');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    if (history.length === 0) {
      container.innerHTML = '<div class="overlap-history-empty">暂无打断记录</div>';
      return;
    }
    
    // 渲染历史记录
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = `overlap-history-item overlap-history-${item.type}`;
      
      const time = new Date(item.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      
      let content = '';
      if (item.type === 'user') {
        const sourceIcon = getSourceIcon(item.source);
        const sourceName = getSourceName(item.source);
        content = `
          <div class="overlap-history-time">${time}</div>
          <div class="overlap-history-icon">${sourceIcon}</div>
          <div class="overlap-history-text">
            <strong>用户打断</strong> (${sourceName})
            <div class="overlap-history-detail">AI 已说话 ${item.aiDuration} ms</div>
          </div>
        `;
      } else {
        content = `
          <div class="overlap-history-time">${time}</div>
          <div class="overlap-history-icon">⚡</div>
          <div class="overlap-history-text">
            <strong>AI 打断</strong>
            <div class="overlap-history-detail">原因: ${item.reason}</div>
          </div>
        `;
      }
      
      div.innerHTML = content;
      container.appendChild(div);
    });
  }

  // ==================== 工具函数 ====================

  /**
   * 根据来源获取图标
   */
  function getSourceIcon(source) {
    const icons = {
      speech: '🎤',
      typing: '⌨️',
      mic: '🎙️',
    };
    return icons[source] || '❓';
  }

  /**
   * 根据来源获取名称
   */
  function getSourceName(source) {
    const names = {
      speech: '语音',
      typing: '打字',
      mic: '麦克风点击',
    };
    return names[source] || '未知';
  }

  // ==================== 公开接口 ====================

  return {
    // 初始化
    init,
    
    // 更新统计面板
    updateStatisticsPanel,
    updateHistoryTimeline,
    
    // 手动触发效果
    showRippleEffect,
    showToast,
    
    // 配置
    getConfig: () => ({ ...CONFIG }),
    
    // 版本
    version: CONFIG.version,
  };
})();

// 自动初始化
if (typeof window !== 'undefined') {
  window.OverlapSpeechVisual = OverlapSpeechVisual;
  console.log('[OverlapVisual] 视觉增强模块已加载 v' + OverlapSpeechVisual.version);
}
